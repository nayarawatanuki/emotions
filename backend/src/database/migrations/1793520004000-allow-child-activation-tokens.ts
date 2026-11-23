import type { MigrationInterface, QueryRunner } from 'typeorm';

const professionalTokens =
  "(account_role = 'professional' AND issued_by_role = 'administrator')";
const childActivation =
  "(account_role = 'child' AND issued_by_role = 'professional' AND purpose = 'activation')";

export class AllowChildActivationTokens1793520004000 implements MigrationInterface {
  readonly name = 'AllowChildActivationTokens1793520004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE account_tokens
      DROP CHECK ck_account_tokens_roles,
      ADD CONSTRAINT ck_account_tokens_roles CHECK (${professionalTokens} OR ${childActivation})`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown[] = await queryRunner.query(
      "SELECT 1 FROM account_tokens WHERE account_role = 'child' LIMIT 1",
    );
    if (rows.length > 0) {
      throw new Error(
        'Existem convites infantis. A reversão foi interrompida.',
      );
    }
    await queryRunner.query(`ALTER TABLE account_tokens
      DROP CHECK ck_account_tokens_roles,
      ADD CONSTRAINT ck_account_tokens_roles CHECK (${professionalTokens})`);
  }
}
