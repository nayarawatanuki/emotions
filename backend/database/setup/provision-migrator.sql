-- PROPOSTA. Não executar antes da aprovação do esquema e do provisionamento.
-- MySQL local, partial_revokes = 0. Pare se a conta já existir.
SELECT User, Host FROM mysql.user WHERE User = 'emotions_migrator';

-- Execute separadamente e guarde a senha gerada fora do Git/chat.
CREATE USER 'emotions_migrator'@'localhost' IDENTIFIED BY RANDOM PASSWORD;

-- Apenas o necessário para criar este esquema inicial e registrar a migration.
-- A conta da API continua sem CREATE, ALTER, DROP ou REFERENCES.
GRANT SELECT, INSERT, CREATE, REFERENCES
  ON `emotions\_development`.*
  TO 'emotions_migrator'@'localhost';

SHOW GRANTS FOR 'emotions_migrator'@'localhost';
