import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyActivityResults1793520001000 implements MigrationInterface {
  readonly name = 'UnifyActivityResults1793520001000';
  readonly transaction = false;

  private async assertEmpty(
    queryRunner: Pick<QueryRunner, 'query'>,
    tables: readonly string[],
  ): Promise<void> {
    // The identifiers are fixed literals supplied only by up/down, never user input.
    // Abort before DDL if any affected table contains records.
    for (const table of tables) {
      const rows: unknown = await queryRunner.query(
        `SELECT COUNT(*) AS total FROM \`${table}\``,
      );
      const row: unknown = Array.isArray(rows) ? rows[0] : undefined;
      if (
        !row ||
        typeof row !== 'object' ||
        !('total' in row) ||
        (row.total !== 0 && row.total !== '0')
      ) {
        throw new Error(
          'Unificação exige tabelas afetadas vazias; nenhum DDL foi iniciado.',
        );
      }
    }
  }

  async up(queryRunner: Pick<QueryRunner, 'query'>): Promise<void> {
    await this.assertEmpty(queryRunner, [
      'activity_results',
      'activity_attempts',
      'activity_executions',
    ]);
    await queryRunner.query(`DROP TABLE \`activity_results\``);
    await queryRunner.query(
      `ALTER TABLE \`activity_attempts\` DROP FOREIGN KEY \`fk_attempts_execution_activity\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_executions\` DROP FOREIGN KEY \`fk_executions_repeat_activity\`, DROP FOREIGN KEY \`fk_executions_activity_owner\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_executions\` DROP CHECK \`ck_executions_sequence\`, DROP CHECK \`ck_executions_timestamps\`, DROP CHECK \`ck_executions_repeat\``,
    );
    await queryRunner.query(`ALTER TABLE \`activity_executions\` RENAME TO \`activity_results\`,
  RENAME COLUMN \`repeat_of_execution_id\` TO \`repeat_of_result_id\`,
  ADD COLUMN \`outcome\` enum('correct','attempts_exhausted') NULL`);
    await queryRunner.query(`ALTER TABLE \`activity_results\` RENAME INDEX \`uq_executions_id_activity\` TO \`uq_activity_results_id_activity\`,
  RENAME INDEX \`uq_executions_sequence\` TO \`uq_activity_results_sequence\`,
  RENAME INDEX \`uq_executions_one_open\` TO \`uq_activity_results_one_open\`,
  RENAME INDEX \`uq_executions_reset_operation\` TO \`uq_activity_results_reset_operation\`,
  RENAME INDEX \`uq_executions_repeat_source\` TO \`uq_activity_results_repeat_source\`,
  RENAME INDEX \`ix_executions_activity_owner\` TO \`ix_activity_results_activity_owner\`,
  RENAME INDEX \`ix_executions_repeat_activity\` TO \`ix_activity_results_repeat_activity\``);
    await queryRunner.query(`ALTER TABLE \`activity_results\` ADD CONSTRAINT \`ck_activity_results_sequence\` CHECK (sequence >= 1),
  ADD CONSTRAINT \`ck_activity_results_timestamps\` CHECK ((status = 'ready' AND started_at IS NULL AND completed_at IS NULL) OR (status = 'in_progress' AND started_at IS NOT NULL AND completed_at IS NULL) OR (status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at)),
  ADD CONSTRAINT \`ck_activity_results_repeat\` CHECK ((sequence = 1 AND repeat_of_result_id IS NULL AND reset_operation_id IS NULL) OR (sequence > 1 AND repeat_of_result_id IS NOT NULL AND reset_operation_id IS NOT NULL)),
  ADD CONSTRAINT \`ck_activity_results_outcome\` CHECK ((status = 'completed' AND outcome IS NOT NULL) OR (status <> 'completed' AND outcome IS NULL))`);
    await queryRunner.query(`ALTER TABLE \`activity_results\` ADD CONSTRAINT \`fk_activity_results_activity_owner\` FOREIGN KEY (\`activity_id\`, \`professional_id\`) REFERENCES \`activities\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT \`fk_activity_results_repeat_activity\` FOREIGN KEY (\`repeat_of_result_id\`, \`activity_id\`) REFERENCES \`activity_results\` (\`id\`, \`activity_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
    await queryRunner.query(
      `ALTER TABLE \`activity_attempts\` RENAME COLUMN \`execution_id\` TO \`result_id\``,
    );
    await queryRunner.query(`ALTER TABLE \`activity_attempts\` RENAME INDEX \`uq_attempts_execution_number\` TO \`uq_attempts_result_number\`,
  DROP INDEX \`uq_attempts_execution_id\`,
  RENAME INDEX \`ix_attempts_execution_activity\` TO \`ix_attempts_result_activity\``);
    await queryRunner.query(
      `ALTER TABLE \`activity_attempts\` ADD CONSTRAINT \`fk_attempts_result_activity\` FOREIGN KEY (\`result_id\`, \`activity_id\`) REFERENCES \`activity_results\` (\`id\`, \`activity_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`,
    );
    await queryRunner.query(
      'UPDATE `typeorm_metadata` SET `table` = ? WHERE `schema` = DATABASE() AND `type` = ? AND `table` = ? AND `name` = ?',
      [
        'activity_results',
        'GENERATED_COLUMN',
        'activity_executions',
        'open_activity_id',
      ],
    );
  }

  async down(queryRunner: Pick<QueryRunner, 'query'>): Promise<void> {
    await this.assertEmpty(queryRunner, [
      'activity_results',
      'activity_attempts',
    ]);
    await queryRunner.query(
      `ALTER TABLE \`activity_attempts\` DROP FOREIGN KEY \`fk_attempts_result_activity\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_results\` DROP FOREIGN KEY \`fk_activity_results_repeat_activity\`, DROP FOREIGN KEY \`fk_activity_results_activity_owner\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_results\` DROP CHECK \`ck_activity_results_sequence\`, DROP CHECK \`ck_activity_results_timestamps\`, DROP CHECK \`ck_activity_results_repeat\`, DROP CHECK \`ck_activity_results_outcome\``,
    );
    await queryRunner.query(`ALTER TABLE \`activity_results\` DROP COLUMN \`outcome\`,
  RENAME COLUMN \`repeat_of_result_id\` TO \`repeat_of_execution_id\`,
  RENAME TO \`activity_executions\``);
    await queryRunner.query(`ALTER TABLE \`activity_executions\` RENAME INDEX \`uq_activity_results_id_activity\` TO \`uq_executions_id_activity\`,
  RENAME INDEX \`uq_activity_results_sequence\` TO \`uq_executions_sequence\`,
  RENAME INDEX \`uq_activity_results_one_open\` TO \`uq_executions_one_open\`,
  RENAME INDEX \`uq_activity_results_reset_operation\` TO \`uq_executions_reset_operation\`,
  RENAME INDEX \`uq_activity_results_repeat_source\` TO \`uq_executions_repeat_source\`,
  RENAME INDEX \`ix_activity_results_activity_owner\` TO \`ix_executions_activity_owner\`,
  RENAME INDEX \`ix_activity_results_repeat_activity\` TO \`ix_executions_repeat_activity\``);
    await queryRunner.query(`ALTER TABLE \`activity_executions\` ADD CONSTRAINT \`ck_executions_sequence\` CHECK (sequence >= 1),
  ADD CONSTRAINT \`ck_executions_timestamps\` CHECK ((status = 'ready' AND started_at IS NULL AND completed_at IS NULL) OR (status = 'in_progress' AND started_at IS NOT NULL AND completed_at IS NULL) OR (status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at)),
  ADD CONSTRAINT \`ck_executions_repeat\` CHECK ((sequence = 1 AND repeat_of_execution_id IS NULL AND reset_operation_id IS NULL) OR (sequence > 1 AND repeat_of_execution_id IS NOT NULL AND reset_operation_id IS NOT NULL))`);
    await queryRunner.query(`ALTER TABLE \`activity_executions\` ADD CONSTRAINT \`fk_executions_activity_owner\` FOREIGN KEY (\`activity_id\`, \`professional_id\`) REFERENCES \`activities\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT \`fk_executions_repeat_activity\` FOREIGN KEY (\`repeat_of_execution_id\`, \`activity_id\`) REFERENCES \`activity_executions\` (\`id\`, \`activity_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
    await queryRunner.query(
      `ALTER TABLE \`activity_attempts\` RENAME COLUMN \`result_id\` TO \`execution_id\``,
    );
    await queryRunner.query(`ALTER TABLE \`activity_attempts\` RENAME INDEX \`uq_attempts_result_number\` TO \`uq_attempts_execution_number\`,
  ADD UNIQUE KEY \`uq_attempts_execution_id\` (\`execution_id\`, \`id\`),
  RENAME INDEX \`ix_attempts_result_activity\` TO \`ix_attempts_execution_activity\``);
    await queryRunner.query(
      `ALTER TABLE \`activity_attempts\` ADD CONSTRAINT \`fk_attempts_execution_activity\` FOREIGN KEY (\`execution_id\`, \`activity_id\`) REFERENCES \`activity_executions\` (\`id\`, \`activity_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`,
    );
    await queryRunner.query(`CREATE TABLE \`activity_results\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`execution_id\` varchar(36) NOT NULL,
  \`final_attempt_id\` varchar(36) NOT NULL,
  \`attempt_count\` tinyint UNSIGNED NOT NULL,
  \`total_duration_seconds\` bigint UNSIGNED NOT NULL,
  \`outcome\` enum('correct','attempts_exhausted') NOT NULL,
  \`completed_at\` datetime(6) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_activity_results_execution\` (\`execution_id\`),
  KEY \`ix_activity_results_final_attempt\` (\`execution_id\`, \`final_attempt_id\`),
  CONSTRAINT \`fk_activity_results_execution\` FOREIGN KEY (\`execution_id\`) REFERENCES \`activity_executions\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_activity_results_final_attempt\` FOREIGN KEY (\`execution_id\`, \`final_attempt_id\`) REFERENCES \`activity_attempts\` (\`execution_id\`, \`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_activity_results_attempt_count\` CHECK (attempt_count BETWEEN 1 AND 3),
  CONSTRAINT \`ck_activity_results_exhausted_count\` CHECK (outcome <> 'attempts_exhausted' OR attempt_count = 3)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(
      'UPDATE `typeorm_metadata` SET `table` = ? WHERE `schema` = DATABASE() AND `type` = ? AND `table` = ? AND `name` = ?',
      [
        'activity_executions',
        'GENERATED_COLUMN',
        'activity_results',
        'open_activity_id',
      ],
    );
  }
}
