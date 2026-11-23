import { EntitySchema } from 'typeorm';
import { createRequire } from 'node:module';
import { ExplicitMetadataDataSource } from './explicit-metadata-data-source.js';
import { createDatabaseOptions } from './database-options.js';
import { createMigrationOptions } from './migration-options.js';

class InspectionSource extends ExplicitMetadataDataSource {
  async inspect() {
    await this.buildMetadatas();
    return {
      entities: this.entityMetadatas.length,
      migrations: this.migrations.length,
    };
  }
}
const options = () =>
  createDatabaseOptions({
    host: '127.0.0.1',
    port: 3306,
    username: 'fixture',
    password: 'synthetic-not-used',
    database: 'emotions_development',
    tls: false,
  });
const message =
  'A persistência exige referências importadas, sem descoberta por caminhos ou padrões.';

describe('explicit metadata discovery without globs', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['entities', 'migrations', 'subscribers'] as const)(
    'rejects %s file patterns before connecting',
    async (field) => {
      const source = new InspectionSource({
        ...options(),
        [field]: ['synthetic-missing/*.js'],
      });
      const connect = vi.spyOn(source.driver, 'connect');
      await expect(source.initialize()).rejects.toThrow(message);
      expect(connect).not.toHaveBeenCalled();
    },
  );

  it('also rejects record-based path lists and does not disclose their contents', async () => {
    const source = new InspectionSource({
      ...options(),
      entities: { private: 'synthetic-private-path/*.js' },
    });
    await expect(source.initialize()).rejects.toThrow(new Error(message));
  });

  it('rejects a pattern injected through setOptions before metadata is built', async () => {
    const source = new InspectionSource(options());
    source.setOptions({ subscribers: ['synthetic-missing/*.js'] });
    await expect(source.inspect()).rejects.toThrow(message);
  });

  it('accepts imported entity schemas and classes, with no file scanning', async () => {
    const source = new InspectionSource({
      ...options(),
      entities: [
        new EntitySchema({
          name: 'Synthetic',
          columns: { id: { type: Number, primary: true } },
        }),
      ],
    });
    await expect(source.inspect()).resolves.toEqual({
      entities: 1,
      migrations: 0,
    });
  });

  it('builds the real API and migration metadata while the ORM glob loader is blocked', async () => {
    const require = createRequire(import.meta.url);
    // Use TypeORM's own resolved CommonJS instance, not an unrelated test copy.
    const ormRequire = createRequire(require.resolve('typeorm'));
    const glob: { globSync: (...args: unknown[]) => unknown } =
      ormRequire('tinyglobby');
    const sentinel = new Error('Synthetic glob interception');
    const scan = vi.spyOn(glob, 'globSync').mockImplementation(() => {
      throw sentinel;
    });
    await expect(new InspectionSource(options()).inspect()).resolves.toEqual({
      entities: 12,
      migrations: 0,
    });
    const migrationOptions = createMigrationOptions({
      DB_ENABLED: 'true',
      DB_HOST: '127.0.0.1',
      DB_NAME: 'emotions_development',
      DB_USER: 'fixture_app',
      DB_PASSWORD: 'synthetic-not-used',
      MIGRATION_DB_USER: 'fixture_migrator',
      MIGRATION_DB_PASSWORD: 'synthetic-not-used',
    });
    await expect(
      new InspectionSource(migrationOptions).inspect(),
    ).resolves.toEqual({ entities: 12, migrations: 5 });
    expect(scan).not.toHaveBeenCalled();
    // Positive control: the upstream loader really calls this intercepted function.
    const { DataSource } = await import('typeorm');
    class UnsafeSource extends DataSource {
      async inspect() {
        await this.buildMetadatas();
      }
    }
    await expect(
      new UnsafeSource({
        ...options(),
        entities: ['synthetic-missing/*.js'],
      }).inspect(),
    ).rejects.toBe(sentinel);
    expect(scan).toHaveBeenCalledOnce();
  });
});
