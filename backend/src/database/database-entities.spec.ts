import { DataSource } from 'typeorm';
import type { EntityMetadata } from 'typeorm';
import { databaseEntities } from './database-entities.js';

class MetadataDataSource extends DataSource {
  async inspect(): Promise<EntityMetadata[]> {
    await this.buildMetadatas();
    return this.entityMetadatas;
  }
}

describe('domain persistence metadata', () => {
  let entities: EntityMetadata[];

  beforeAll(async () => {
    entities = await new MetadataDataSource({
      type: 'mysql',
      database: 'emotions_development',
      entities: databaseEntities,
    }).inspect();
  });

  function entity(table: string): EntityMetadata {
    const found = entities.find((metadata) => metadata.tableName === table);
    if (!found) throw new Error(`Missing entity: ${table}`);
    return found;
  }

  it('resolves all references without a database connection', () => {
    expect(entities.map((item) => item.tableName).sort()).toEqual(
      [
        'accounts',
        'auth_sessions',
        'account_tokens',
        'auth_rate_limits',
        'professionals',
        'children',
        'files',
        'activities',
        'activity_options',
        'rewards',
        'activity_attempts',
        'activity_results',
      ].sort(),
    );
    for (const metadata of entities) {
      expect(metadata.primaryColumns).toHaveLength(1);
      expect(
        metadata.generatedColumns.some(
          (column) => column.generationStrategy === 'uuid',
        ),
      ).toBe(true);
      for (const key of metadata.foreignKeys) {
        expect(key.onDelete).toBe('RESTRICT');
        expect(key.onUpdate).toBe('RESTRICT');
        expect(key.columns).toHaveLength(key.referencedColumns.length);
      }
    }
  });

  it('does not select password hashes or storage keys by default', () => {
    expect(
      entity('accounts').columns.find(
        (column) => column.propertyName === 'passwordHash',
      )?.isSelect,
    ).toBe(false);
    expect(
      entity('files').columns.find(
        (column) => column.propertyName === 'storageKey',
      )?.isSelect,
    ).toBe(false);
  });

  it('requires each child to belong to one professional and binds photos to that owner', () => {
    expect(
      entity('children').columns.find(
        (column) => column.propertyName === 'professionalId',
      )?.isNullable,
    ).toBe(false);
    const key = entity('children').foreignKeys.find(
      (item) => item.name === 'fk_children_photo_owner',
    );
    expect(key?.columns.map((column) => column.databaseName)).toEqual([
      'photo_file_id',
      'professional_id',
    ]);
    expect(key?.referencedEntityMetadata.tableName).toBe('files');
  });

  it('keeps birth dates civil and duration totals precise', () => {
    expect(
      entity('children').columns.find(
        (column) => column.propertyName === 'dateOfBirth',
      )?.type,
    ).toBe('date');
    expect(
      entity('activity_attempts').columns.find(
        (column) => column.propertyName === 'durationSeconds',
      )?.type,
    ).toBe('bigint');
    expect(
      entity('activity_results').columns.some(
        (column) => column.propertyName === 'totalDurationSeconds',
      ),
    ).toBe(false);
  });

  it('uses database-generated markers to enforce at most one open execution and one correct option', () => {
    for (const [table, indexName] of [
      ['activity_results', 'uq_activity_results_one_open'],
      ['activity_options', 'uq_options_one_correct'],
    ]) {
      if (!table || !indexName) throw new Error();
      const index = entity(table).indices.find(
        (item) => item.name === indexName,
      );
      expect(index?.isUnique).toBe(true);
      expect(index?.columns[0]?.generatedType).toBe('STORED');
      expect(index?.columns[0]?.isInsert).toBe(false);
      expect(index?.columns[0]?.isUpdate).toBe(false);
    }
  });

  it('binds attempts and selected options to their own result and activity', () => {
    const selected = entity('activity_attempts').foreignKeys.find(
      (key) => key.name === 'fk_attempts_selected_option',
    );
    expect(selected?.columns.map((column) => column.databaseName)).toEqual([
      'activity_id',
      'selected_option_id',
    ]);
    const result = entity('activity_attempts').foreignKeys.find(
      (key) => key.name === 'fk_attempts_result_activity',
    );
    expect(result?.referencedEntityMetadata.tableName).toBe('activity_results');
    expect(result?.columns.map((column) => column.databaseName)).toEqual([
      'result_id',
      'activity_id',
    ]);
  });

  it('keeps authentication digests private and indexed without storing raw credentials', () => {
    for (const [table, property] of [
      ['auth_sessions', 'sessionDigest'],
      ['account_tokens', 'tokenDigest'],
      ['auth_rate_limits', 'keyDigest'],
    ] as const) {
      const metadata = entity(table);
      const digest = metadata.columns.find(
        (column) => column.propertyName === property,
      );
      expect(digest).toMatchObject({
        isSelect: false,
        type: 'char',
        length: '64',
        charset: 'ascii',
        collation: 'ascii_bin',
      });
      expect(
        metadata.indices.some(
          (index) => index.isUnique && index.columns.includes(digest!),
        ),
      ).toBe(true);
      expect(
        metadata.columns.some((column) =>
          ['token', 'sessionToken', 'ipAddress', 'username'].includes(
            column.propertyName,
          ),
        ),
      ).toBe(false);
    }
  });

  it('permits pending accounts without a password but defines the active account constraint', () => {
    expect(
      entity('accounts').columns.find(
        (column) => column.propertyName === 'passwordHash',
      )?.isNullable,
    ).toBe(true);
    expect(
      entity('accounts').checks.find(
        (check) => check.name === 'ck_accounts_password_state',
      )?.expression,
    ).toBe(
      "(password_hash IS NULL AND status <> 'active') OR (password_hash IS NOT NULL AND CHAR_LENGTH(password_hash) > 0)",
    );
  });

  it('binds professional access tokens to an administrator issuer', () => {
    const tokens = entity('account_tokens');
    expect(
      tokens.foreignKeys.map((key) => key.referencedEntityMetadata.tableName),
    ).toEqual(['accounts', 'accounts']);
    expect(tokens.foreignKeys.every((key) => key.columns.length === 2)).toBe(
      true,
    );
    expect(
      tokens.checks.find((check) => check.name === 'ck_account_tokens_roles')
        ?.expression,
    ).toBe(
      "account_role = 'professional' AND issued_by_role = 'administrator'",
    );
  });
});
