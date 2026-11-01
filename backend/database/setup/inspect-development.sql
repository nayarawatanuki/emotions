-- Somente leitura. Execute em uma conexão administrativa local.
SELECT VERSION() AS server_version,
       @@hostname AS server_hostname,
       @@port AS server_port,
       @@GLOBAL.partial_revokes AS partial_revokes;

-- Ambos os resultados devem estar vazios antes do provisionamento.
SELECT SCHEMA_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'emotions_development';

SELECT User, Host
FROM mysql.user
WHERE User = 'emotions_app';
