import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDomainSchema1793520000000 implements MigrationInterface {
  readonly name = 'InitialDomainSchema1793520000000';
  readonly transaction = false;

  async up(queryRunner: Pick<QueryRunner, 'query'>): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`accounts\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`name\` varchar(255) NOT NULL,
  \`username\` varchar(255) COLLATE utf8mb4_0900_as_ci NOT NULL,
  \`password_hash\` varchar(255) NOT NULL,
  \`role\` enum('administrator','professional','child') NOT NULL,
  \`status\` enum('pending','active','suspended') NOT NULL DEFAULT 'pending',
  \`last_signed_in_at\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_accounts_username\` (\`username\`),
  UNIQUE KEY \`uq_accounts_id_role\` (\`id\`, \`role\`),
  CONSTRAINT \`ck_accounts_normalized_username\` CHECK (CAST(username AS BINARY) = CAST(LOWER(TRIM(username)) AS BINARY) AND CHAR_LENGTH(username) > 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`professionals\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`account_id\` varchar(36) NOT NULL,
  \`account_role\` enum('administrator','professional','child') NOT NULL DEFAULT 'professional',
  \`created_by_account_id\` varchar(36) NOT NULL,
  \`created_by_role\` enum('administrator','professional','child') NOT NULL DEFAULT 'administrator',
  \`archived_at\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_professionals_account\` (\`account_id\`),
  KEY \`ix_professionals_created_by\` (\`created_by_account_id\`, \`created_by_role\`),
  CONSTRAINT \`fk_professionals_account_role\` FOREIGN KEY (\`account_id\`, \`account_role\`) REFERENCES \`accounts\` (\`id\`, \`role\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_professionals_created_by_admin\` FOREIGN KEY (\`created_by_account_id\`, \`created_by_role\`) REFERENCES \`accounts\` (\`id\`, \`role\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_professionals_role\` CHECK (account_role = 'professional'),
  CONSTRAINT \`ck_professionals_creator_role\` CHECK (created_by_role = 'administrator')
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`files\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`professional_id\` varchar(36) NOT NULL,
  \`storage_key\` varchar(255) NOT NULL,
  \`original_name\` varchar(255) NULL,
  \`media_type\` varchar(100) NOT NULL,
  \`size_bytes\` bigint UNSIGNED NOT NULL,
  \`alternative_text\` varchar(255) NULL,
  \`archived_at\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_files_storage_key\` (\`storage_key\`),
  UNIQUE KEY \`uq_files_id_owner\` (\`id\`, \`professional_id\`),
  KEY \`ix_files_owner\` (\`professional_id\`),
  CONSTRAINT \`fk_files_professional\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professionals\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_files_positive_size\` CHECK (size_bytes > 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`children\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`professional_id\` varchar(36) NOT NULL,
  \`account_id\` varchar(36) NOT NULL,
  \`account_role\` enum('administrator','professional','child') NOT NULL DEFAULT 'child',
  \`treatment_active\` tinyint NOT NULL DEFAULT 0,
  \`reported_level\` varchar(255) NULL,
  \`date_of_birth\` date NOT NULL,
  \`guardian_name\` varchar(255) NOT NULL,
  \`notes\` text NULL,
  \`photo_file_id\` varchar(36) NULL,
  \`archived_at\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_children_account\` (\`account_id\`),
  UNIQUE KEY \`uq_children_id_owner\` (\`id\`, \`professional_id\`),
  KEY \`ix_children_owner\` (\`professional_id\`),
  KEY \`ix_children_photo_owner\` (\`photo_file_id\`, \`professional_id\`),
  CONSTRAINT \`fk_children_professional\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professionals\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_children_account_role\` FOREIGN KEY (\`account_id\`, \`account_role\`) REFERENCES \`accounts\` (\`id\`, \`role\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_children_photo_owner\` FOREIGN KEY (\`photo_file_id\`, \`professional_id\`) REFERENCES \`files\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_children_role\` CHECK (account_role = 'child'),
  CONSTRAINT \`ck_children_treatment_boolean\` CHECK (treatment_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`activities\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`child_id\` varchar(36) NOT NULL,
  \`professional_id\` varchar(36) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`emotion\` varchar(255) NOT NULL,
  \`image_file_id\` varchar(36) NOT NULL,
  \`status\` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  \`support_image_file_id\` varchar(36) NULL,
  \`support_message\` text NULL,
  \`archived_at\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_activities_id_owner\` (\`id\`, \`professional_id\`),
  KEY \`ix_activities_child_owner\` (\`child_id\`, \`professional_id\`),
  KEY \`ix_activities_image_owner\` (\`image_file_id\`, \`professional_id\`),
  KEY \`ix_activities_support_owner\` (\`support_image_file_id\`, \`professional_id\`),
  CONSTRAINT \`fk_activities_child_owner\` FOREIGN KEY (\`child_id\`, \`professional_id\`) REFERENCES \`children\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_activities_image_owner\` FOREIGN KEY (\`image_file_id\`, \`professional_id\`) REFERENCES \`files\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_activities_support_owner\` FOREIGN KEY (\`support_image_file_id\`, \`professional_id\`) REFERENCES \`files\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`activity_options\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`activity_id\` varchar(36) NOT NULL,
  \`position\` tinyint UNSIGNED NOT NULL,
  \`label\` varchar(255) NOT NULL,
  \`is_correct\` tinyint NOT NULL DEFAULT 0,
  \`correct_activity_id\` varchar(36) GENERATED ALWAYS AS (CASE WHEN is_correct = 1 THEN activity_id ELSE NULL END) STORED,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_options_activity_position\` (\`activity_id\`, \`position\`),
  UNIQUE KEY \`uq_options_activity_id\` (\`activity_id\`, \`id\`),
  UNIQUE KEY \`uq_options_one_correct\` (\`correct_activity_id\`),
  CONSTRAINT \`fk_options_activity\` FOREIGN KEY (\`activity_id\`) REFERENCES \`activities\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_options_position\` CHECK (position BETWEEN 1 AND 3),
  CONSTRAINT \`ck_options_correct_boolean\` CHECK (is_correct IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`rewards\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`activity_id\` varchar(36) NOT NULL,
  \`professional_id\` varchar(36) NOT NULL,
  \`image_file_id\` varchar(36) NOT NULL,
  \`message\` text NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_rewards_activity\` (\`activity_id\`),
  KEY \`ix_rewards_activity_owner\` (\`activity_id\`, \`professional_id\`),
  KEY \`ix_rewards_image_owner\` (\`image_file_id\`, \`professional_id\`),
  CONSTRAINT \`fk_rewards_activity_owner\` FOREIGN KEY (\`activity_id\`, \`professional_id\`) REFERENCES \`activities\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_rewards_image_owner\` FOREIGN KEY (\`image_file_id\`, \`professional_id\`) REFERENCES \`files\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`activity_executions\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`activity_id\` varchar(36) NOT NULL,
  \`professional_id\` varchar(36) NOT NULL,
  \`sequence\` int UNSIGNED NOT NULL,
  \`status\` enum('ready','in_progress','completed') NOT NULL DEFAULT 'ready',
  \`started_at\` datetime(6) NULL,
  \`completed_at\` datetime(6) NULL,
  \`repeat_of_execution_id\` varchar(36) NULL,
  \`reset_operation_id\` varchar(36) NULL,
  \`open_activity_id\` varchar(36) GENERATED ALWAYS AS (CASE WHEN status IN ('ready', 'in_progress') THEN activity_id ELSE NULL END) STORED,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_executions_id_activity\` (\`id\`, \`activity_id\`),
  UNIQUE KEY \`uq_executions_sequence\` (\`activity_id\`, \`sequence\`),
  UNIQUE KEY \`uq_executions_one_open\` (\`open_activity_id\`),
  UNIQUE KEY \`uq_executions_reset_operation\` (\`activity_id\`, \`reset_operation_id\`),
  UNIQUE KEY \`uq_executions_repeat_source\` (\`repeat_of_execution_id\`),
  KEY \`ix_executions_activity_owner\` (\`activity_id\`, \`professional_id\`),
  KEY \`ix_executions_repeat_activity\` (\`repeat_of_execution_id\`, \`activity_id\`),
  CONSTRAINT \`fk_executions_activity_owner\` FOREIGN KEY (\`activity_id\`, \`professional_id\`) REFERENCES \`activities\` (\`id\`, \`professional_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_executions_repeat_activity\` FOREIGN KEY (\`repeat_of_execution_id\`, \`activity_id\`) REFERENCES \`activity_executions\` (\`id\`, \`activity_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_executions_sequence\` CHECK (sequence >= 1),
  CONSTRAINT \`ck_executions_timestamps\` CHECK ((status = 'ready' AND started_at IS NULL AND completed_at IS NULL) OR (status = 'in_progress' AND started_at IS NOT NULL AND completed_at IS NULL) OR (status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= started_at)),
  CONSTRAINT \`ck_executions_repeat\` CHECK ((sequence = 1 AND repeat_of_execution_id IS NULL AND reset_operation_id IS NULL) OR (sequence > 1 AND repeat_of_execution_id IS NOT NULL AND reset_operation_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
    await queryRunner.query(`CREATE TABLE \`activity_attempts\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`execution_id\` varchar(36) NOT NULL,
  \`activity_id\` varchar(36) NOT NULL,
  \`selected_option_id\` varchar(36) NOT NULL,
  \`attempt_number\` tinyint UNSIGNED NOT NULL,
  \`operation_id\` varchar(36) NOT NULL,
  \`started_at\` datetime(6) NOT NULL,
  \`answered_at\` datetime(6) NOT NULL,
  \`duration_seconds\` bigint UNSIGNED NOT NULL,
  \`timing_source\` enum('server_elapsed','client_active') NOT NULL,
  \`is_correct\` tinyint NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_attempts_execution_number\` (\`execution_id\`, \`attempt_number\`),
  UNIQUE KEY \`uq_attempts_operation\` (\`execution_id\`, \`operation_id\`),
  UNIQUE KEY \`uq_attempts_execution_id\` (\`execution_id\`, \`id\`),
  KEY \`ix_attempts_execution_activity\` (\`execution_id\`, \`activity_id\`),
  KEY \`ix_attempts_activity_option\` (\`activity_id\`, \`selected_option_id\`),
  CONSTRAINT \`fk_attempts_execution_activity\` FOREIGN KEY (\`execution_id\`, \`activity_id\`) REFERENCES \`activity_executions\` (\`id\`, \`activity_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`fk_attempts_selected_option\` FOREIGN KEY (\`activity_id\`, \`selected_option_id\`) REFERENCES \`activity_options\` (\`activity_id\`, \`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_attempts_number\` CHECK (attempt_number BETWEEN 1 AND 3),
  CONSTRAINT \`ck_attempts_dates\` CHECK (answered_at >= started_at),
  CONSTRAINT \`ck_attempts_correct_boolean\` CHECK (is_correct IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
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
    // Preserve the native TypeORM metadata used to inspect generated columns.
    await queryRunner.query(
      'INSERT INTO `typeorm_metadata` (`type`, `schema`, `table`, `name`, `value`) VALUES (?, DATABASE(), ?, ?, ?)',
      [
        'GENERATED_COLUMN',
        'activity_options',
        'correct_activity_id',
        'CASE WHEN is_correct = 1 THEN activity_id ELSE NULL END',
      ],
    );
    await queryRunner.query(
      'INSERT INTO `typeorm_metadata` (`type`, `schema`, `table`, `name`, `value`) VALUES (?, DATABASE(), ?, ?, ?)',
      [
        'GENERATED_COLUMN',
        'activity_executions',
        'open_activity_id',
        "CASE WHEN status IN ('ready', 'in_progress') THEN activity_id ELSE NULL END",
      ],
    );
  }

  async down(queryRunner: Pick<QueryRunner, 'query'>): Promise<void> {
    await queryRunner.query(
      'DELETE FROM `typeorm_metadata` WHERE `type` = ? AND `schema` = DATABASE() AND `table` IN (?, ?)',
      ['GENERATED_COLUMN', 'activity_options', 'activity_executions'],
    );
    await queryRunner.query('DROP TABLE `activity_results`');
    await queryRunner.query('DROP TABLE `activity_attempts`');
    await queryRunner.query('DROP TABLE `activity_executions`');
    await queryRunner.query('DROP TABLE `rewards`');
    await queryRunner.query('DROP TABLE `activity_options`');
    await queryRunner.query('DROP TABLE `activities`');
    await queryRunner.query('DROP TABLE `children`');
    await queryRunner.query('DROP TABLE `files`');
    await queryRunner.query('DROP TABLE `professionals`');
    await queryRunner.query('DROP TABLE `accounts`');
  }
}
