# MySQL local — provisionamento e validação

Estes arquivos são roteiros manuais de administração para desenvolvimento.
Não são migrations, não são importados pela API e não são executados no startup.
O provisionamento foi aprovado pela desenvolvedora. A inspeção foi executada
no Workbench com uma consulta equivalente: MySQL 8.0.46, porta 3306,
`partial_revokes = 0`, sem conflitos de banco ou conta.

O banco `emotions_development` foi criado e verificado: `utf8mb4`,
`utf8mb4_0900_ai_ci` e zero tabelas. O banco legado não foi alterado.
A conta foi criada pela desenvolvedora no Workbench. A conexão real via TCP
foi validada com TypeORM: `emotions_app@localhost`, banco `emotions_development`,
servidor MySQL 8.0.46 e zero tabelas. O SHOW GRANTS da própria conta confirmou
SELECT, INSERT, UPDATE e DELETE no nome exato do banco, além de USAGE global.
Nenhuma permissão administrativa ou de alteração de tabelas foi encontrada.

As variáveis foram configuradas somente em `backend/.env`, ignorado pelo Git
e com permissões locais 600. A API compilada iniciou com a conexão habilitada;
`/health` respondeu no Chrome. O servidor temporário de validação foi encerrado.
Não execute novamente CREATE DATABASE ou CREATE USER neste ambiente.

## Escopo proposto

- Criar somente o banco vazio `emotions_development` com `utf8mb4`.
- Criar a conta local `emotions_app`, com senha aleatória gerada pelo MySQL.
- Conceder SELECT, INSERT, UPDATE e DELETE somente no novo banco.
- Preservar o banco legado `emotions` e suas contas, tabelas e registros.
- Não criar tabelas, popular dados ou conceder privilégios de administração,
  criação, alteração ou exclusão de tabelas ao usuário da API.

Em outros ambientes, execute primeiro a inspeção e obtenha a autorização
específica antes de aplicar o roteiro de provisionamento completo.

## 1. Inspeção e aprovação

No Workbench, use uma conexão administrativa com o servidor local e abra
`inspect-development.sql` em uma **nova aba**, preservando consultas já abertas.
Execute somente essa inspeção, que consulta metadados e não lê dados do legado.

Confirme o servidor, a porta e a versão. Os resultados para o banco e para a
conta proposta devem estar vazios. Se já existirem, pare para revisar; não apague,
não reaproveite e não troque senhas automaticamente.

O roteiro de provisionamento exige `partial_revokes = 0`. Nessa configuração,
nomes de banco em grants interpretam sublinhados como curingas, por isso o
grant utiliza `emotions\_development`. Se `partial_revokes = 1`, pare para
adequar o roteiro à semântica literal desse modo; não altere a variável global.

Após a inspeção, obtenha aprovação específica para criar o banco, a conta e
as permissões descritas. Não execute todo o diretório automaticamente.

## 2. Provisionamento autorizado

Abra `provision-development.sql` em outra aba. Execute as instruções na ordem
indicada, parando em qualquer erro. No Workbench, desative "Continue On Error"
antes de executar. Não use "IF NOT EXISTS": conflitos precisam ficar visíveis.

O CREATE USER retorna a senha gerada. Essa parte deve ser executada pela
desenvolvedora no Workbench, mantendo a senha sob seu controle. Guarde-a em
um gerenciador de senhas e não a envie pelo chat. Nenhum segredo é necessário
no SQL versionado. Não salve ou compartilhe a grade que contém a senha.

As instruções não formam uma transação reversível. Se houver falha, pode existir
um banco vazio ou uma conta ainda sem permissões. Pare e revise o estado com
a inspeção antes de decidir a recuperação; não repita ou remova recursos às cegas.

Confira o SHOW GRANTS: deve haver apenas os privilégios de dados no banco
exato, além do USAGE global sem privilégios administrativos. Políticas globais,
roles obrigatórias e contas já existentes também podem afetar o acesso efetivo.

## 3. Configuração privada e validação real

Copie `backend/.env.example` para `backend/.env` somente se o arquivo privado
ainda não existir; caso exista, preserve as configurações e altere apenas as
variáveis desta etapa. Preencha localmente a senha gerada. Não a coloque na
linha de comando nem versione o arquivo. Restrinja as permissões locais do
arquivo ao seu usuário (`chmod 600 backend/.env`). Use o formato entre aspas adequado
ao `.env` do Node para preservar caracteres especiais da senha.

Para esse ambiente local, configure `DB_ENABLED=true`, `DB_HOST=127.0.0.1`,
`DB_PORT=3306`, `DB_NAME=emotions_development`, `DB_USER=emotions_app` e
`DB_TLS=false`. A conta `localhost` deve ser validada com a conexão TCP usada
pela API; não amplie o host da conta para `%` em caso de falha.

Depois de autorizado e configurado, validar (concluído neste ambiente):

1. Conexão do driver com as variáveis privadas e consulta de metadados:
   `SELECT DATABASE(), CURRENT_USER(), VERSION()`.
2. Banco novo ainda vazio, sem tabelas criadas pela inicialização.
3. Permissões efetivas restritas ao novo banco, sem concessões administrativas.
4. Inicialização real do backend e `/health` no Chrome. Nesta validação foi
   usado o código compilado, com `node --env-file=.env dist/main.js` e porta
   temporária 3100; para desenvolvimento, o comando é `yarn start:dev`.
5. Tipos, lint, testes HTTP e build, preservando testes independentes do banco.

O `/health` é liveness, não comprova sozinho disponibilidade do banco.
TLS com certificado permanece uma validação separada: esta conexão local
sem TLS não comprova o comportamento de uma conexão remota protegida.
A [migration inicial](../README.md) foi aplicada com aprovação e validada com
29 testes reais. O usuário e os privilégios próprios estão documentados em
`provision-migrator.sql`. Não repita os comandos de criação de conta no ambiente
já provisionado; novos ambientes exigem sua própria revisão e autorização.

## Referências

- [Senhas aleatórias do MySQL](https://dev.mysql.com/doc/refman/8.0/en/password-management.html).
- [CREATE USER](https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/create-user.html).
- [GRANT e nomes de banco](https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/grant.html).
