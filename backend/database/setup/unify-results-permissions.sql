-- Somente após aprovação específica. Não executar todo o arquivo de uma vez.
-- Conexão administrativa local, partial_revokes = 0.
-- A conta da API não é alterada. Nenhuma senha é modificada.

-- 1. Concessões temporárias para a migration de unificação.
GRANT ALTER, DROP ON `emotions\_development`.*
  TO 'emotions_migrator'@'localhost';
-- CREATE já existe no banco; sua repetição aqui permite provisionar o grant
-- específico também em instalações novas, antes de existir a tabela técnica.
GRANT CREATE, UPDATE ON `emotions_development`.`typeorm_metadata`
  TO 'emotions_migrator'@'localhost';

-- 2. Execute a migration pelo comando Yarn e valide o esquema.
-- 3. Revogue as concessões temporárias, inclusive se a execução falhar.
REVOKE ALTER, DROP ON `emotions\_development`.*
  FROM 'emotions_migrator'@'localhost';
REVOKE CREATE, UPDATE ON `emotions_development`.`typeorm_metadata`
  FROM 'emotions_migrator'@'localhost';

SHOW GRANTS FOR 'emotions_migrator'@'localhost';
