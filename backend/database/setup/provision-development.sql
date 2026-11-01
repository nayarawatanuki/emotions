-- REVISAR E APROVAR ANTES DE EXECUTAR. Somente para desenvolvimento local.
-- Primeiro execute inspect-development.sql e confirme:
-- MySQL 8.0.18+, partial_revokes = 0 e nenhum banco/usuário em conflito.
-- Não execute com "continuar após erro" habilitado nem repita após falha parcial.
-- DDL e comandos de contas não são revertidos por ROLLBACK.

CREATE DATABASE `emotions_development`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- O resultado contém a senha gerada. Guarde-a em um gerenciador de senhas.
-- Não compartilhe esse resultado, nem o inclua em prints ou arquivos do Git.
CREATE USER 'emotions_app'@'localhost'
  IDENTIFIED BY RANDOM PASSWORD;

-- Em partial_revokes = 0, escape os sublinhados para restringir o grant
-- ao nome exato do banco, em vez de um padrão com curingas.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON `emotions\_development`.*
  TO 'emotions_app'@'localhost';

SHOW GRANTS FOR 'emotions_app'@'localhost';
