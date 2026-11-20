import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoredImageBytes1793520003000 implements MigrationInterface {
  readonly name = 'AddStoredImageBytes1793520003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`stored_image_bytes\` (
  \`file_id\` varchar(36) NOT NULL,
  \`image_bytes\` MEDIUMBLOB NOT NULL,
  PRIMARY KEY (\`file_id\`),
  CONSTRAINT \`fk_stored_image_bytes_file\` FOREIGN KEY (\`file_id\`) REFERENCES \`files\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT \`ck_stored_image_bytes_size\` CHECK (OCTET_LENGTH(\`image_bytes\`) BETWEEN 1 AND 5242880)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `stored_image_bytes` LIMIT 1',
    );
    if (rows.length > 0) {
      throw new Error('A tabela contém imagens. A reversão foi interrompida.');
    }
    await queryRunner.query('DROP TABLE `stored_image_bytes`');
  }
}
