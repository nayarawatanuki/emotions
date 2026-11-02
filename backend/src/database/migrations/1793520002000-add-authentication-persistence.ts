import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthenticationPersistence1793520002000 implements MigrationInterface {
  readonly name = 'AddAuthenticationPersistence1793520002000';
  readonly transaction = false;

  private async requireZero(
    queryRunner: Pick<QueryRunner, 'query'>,
    sql: string,
    parameters: unknown[] = [],
  ): Promise<void> {
    const rows: unknown = await queryRunner.query(sql, parameters);
    const row: unknown = Array.isArray(rows) ? rows[0] : undefined;
    if (
      !row ||
      typeof row !== 'object' ||
      !('total' in row) ||
      (row.total !== 0 && row.total !== '0')
    ) {
      throw new Error(
        'Estado incompatível com a migration de autenticação; nenhum DDL foi iniciado.',
      );
    }
  }

  async up(queryRunner: Pick<QueryRunner, 'query'>): Promise<void> {
    await this.requireZero(
      queryRunner,
      "SELECT COUNT(*) AS total FROM accounts WHERE (status = 'active' AND password_hash IS NULL) OR (password_hash IS NOT NULL AND CHAR_LENGTH(password_hash) = 0)",
    );
    await this.requireZero(
      queryRunner,
      'SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?, ?)',
      ['auth_sessions', 'account_tokens', 'auth_rate_limits'],
    );
    // MySQL DDL commits implicitly. Preflight is fail-closed, but does not make DDL transactional.
    await queryRunner.query(`ALTER TABLE \`accounts\` MODIFY COLUMN \`password_hash\` varchar(255) NULL,
      ADD CONSTRAINT \`ck_accounts_password_state\` CHECK ((password_hash IS NULL AND status <> 'active') OR (password_hash IS NOT NULL AND CHAR_LENGTH(password_hash) > 0))`);
    await queryRunner.query(`CREATE TABLE \`auth_sessions\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`account_id\` varchar(36) NOT NULL,
  \`session_digest\` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  \`last_seen_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`idle_expires_at\` datetime(6) NOT NULL,
  \`expires_at\` datetime(6) NOT NULL,
  \`revoked_at\` datetime(6) NULL,
  UNIQUE INDEX \`uq_auth_sessions_digest\` (\`session_digest\`),
  INDEX \`ix_auth_sessions_account\` (\`account_id\`),
  INDEX \`ix_auth_sessions_expiry\` (\`expires_at\`),
  INDEX \`ix_auth_sessions_idle_expiry\` (\`idle_expires_at\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_auth_sessions_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`accounts\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_auth_sessions_digest_length\` CHECK (CHAR_LENGTH(session_digest) = 64),
  CONSTRAINT \`ck_auth_sessions_times\` CHECK (last_seen_at >= created_at AND idle_expires_at > last_seen_at AND idle_expires_at <= expires_at AND expires_at > created_at AND (revoked_at IS NULL OR revoked_at >= created_at))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`account_tokens\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`account_id\` varchar(36) NOT NULL,
  \`account_role\` enum ('administrator', 'professional', 'child') NOT NULL DEFAULT 'professional',
  \`issued_by_account_id\` varchar(36) NOT NULL,
  \`issued_by_role\` enum ('administrator', 'professional', 'child') NOT NULL DEFAULT 'administrator',
  \`purpose\` enum ('activation', 'password_reset') NOT NULL,
  \`token_digest\` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  \`expires_at\` datetime(6) NOT NULL,
  \`consumed_at\` datetime(6) NULL,
  \`revoked_at\` datetime(6) NULL,
  UNIQUE INDEX \`uq_account_tokens_digest\` (\`token_digest\`),
  INDEX \`ix_account_tokens_account_purpose\` (\`account_id\`, \`account_role\`, \`purpose\`),
  INDEX \`ix_account_tokens_issuer\` (\`issued_by_account_id\`, \`issued_by_role\`),
  INDEX \`ix_account_tokens_expiry\` (\`expires_at\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_account_tokens_professional\` FOREIGN KEY (\`account_id\`, \`account_role\`) REFERENCES \`accounts\` (\`id\`, \`role\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_account_tokens_issuer\` FOREIGN KEY (\`issued_by_account_id\`, \`issued_by_role\`) REFERENCES \`accounts\` (\`id\`, \`role\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_account_tokens_roles\` CHECK (account_role = 'professional' AND issued_by_role = 'administrator'),
  CONSTRAINT \`ck_account_tokens_digest_length\` CHECK (CHAR_LENGTH(token_digest) = 64),
  CONSTRAINT \`ck_account_tokens_times\` CHECK (expires_at > created_at AND (consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at <= expires_at)) AND (revoked_at IS NULL OR revoked_at >= created_at) AND (consumed_at IS NULL OR revoked_at IS NULL))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`auth_rate_limits\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`scope\` enum ('login_origin', 'login_origin_account', 'token_redemption') NOT NULL,
  \`key_digest\` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  \`window_started_at\` datetime(6) NOT NULL,
  \`window_expires_at\` datetime(6) NOT NULL,
  \`attempt_count\` int UNSIGNED NOT NULL DEFAULT '0',
  \`blocked_until\` datetime(6) NULL,
  UNIQUE INDEX \`uq_auth_rate_limits_scope_key\` (\`scope\`, \`key_digest\`),
  INDEX \`ix_auth_rate_limits_expiry\` (\`window_expires_at\`),
  INDEX \`ix_auth_rate_limits_blocked_until\` (\`blocked_until\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`ck_auth_rate_limits_digest_length\` CHECK (CHAR_LENGTH(key_digest) = 64),
  CONSTRAINT \`ck_auth_rate_limits_times\` CHECK (window_expires_at > window_started_at AND (blocked_until IS NULL OR blocked_until >= window_started_at))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
  }

  async down(queryRunner: Pick<QueryRunner, 'query'>): Promise<void> {
    // Fixed table names; refuse before the first DROP if any authentication record would be lost.
    for (const table of [
      'auth_sessions',
      'account_tokens',
      'auth_rate_limits',
    ]) {
      await this.requireZero(
        queryRunner,
        `SELECT COUNT(*) AS total FROM \`${table}\``,
      );
    }
    await this.requireZero(
      queryRunner,
      'SELECT COUNT(*) AS total FROM accounts WHERE password_hash IS NULL',
    );
    await queryRunner.query('DROP TABLE `auth_rate_limits`');
    await queryRunner.query('DROP TABLE `account_tokens`');
    await queryRunner.query('DROP TABLE `auth_sessions`');
    await queryRunner.query(
      'ALTER TABLE `accounts` DROP CHECK `ck_accounts_password_state`, MODIFY COLUMN `password_hash` varchar(255) NOT NULL',
    );
  }
}
