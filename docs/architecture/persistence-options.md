# Persistência MySQL — avaliação inicial

Data da consulta: 1 de novembro de 2026.
Status: TypeORM aprovado; provisionamento local e conexão real validados.
Esquema completo e migration inicial aprovados, aplicados e validados com
29 testes de integridade em MySQL real. Migração de dados e serviços do domínio
continuam pendentes.

A unificação posterior em `activity_results` foi aprovada, aplicada e validada
em uma segunda migration, preservando a primeira. O modelo final tem nove
tabelas de domínio; os privilégios temporários foram revogados.

## Decisão e limites da primeira integração

Instalados com versões exatas: `@nestjs/typeorm@12.0.2`, `typeorm@1.1.2` e
`mysql2@3.24.6`. Os peers da integração aceitam Nest 12 e TypeORM 1.x;
o requisito de Node do TypeORM aceita o Node 24.21.0 utilizado no projeto.
Tipos, lint, testes e build verificam a base ESM. A conexão real local foi
validada com MySQL 8.0.46, banco separado vazio e usuário próprio sem privilégios
administrativos. TLS remoto ainda não foi validado.

A API só tenta conectar com `DB_ENABLED=true`, exige credenciais próprias e
TLS remoto, e não executa sincronização, remoção de esquema ou migrations
automaticamente. Os detalhes estão no [README do backend](../../backend/README.md).
Nenhum banco antigo foi acessado ou alterado. A comparação abaixo registra
a avaliação que orientou a escolha, sem significar aprovação de todo o esquema.

## Requisitos do Emotions

- MySQL, NestJS modular, TypeScript e ESM.
- Chaves estrangeiras reais, índices, restrições únicas e transações.
- Histórico de execuções por atividade, com reset autorizado, teto de três
  tentativas por execução e proteção contra resets concorrentes. O reset exige
  finalização prévia e não pode interromper uma execução aberta.
- Migrations versionadas, revisáveis e executadas por comando explícito.
- Consultas com escopo do profissional e valores parametrizados.
- Integração testável, com testes de integridade no MySQL.
- Versões publicadas e mantidas; não adotar alpha, beta ou release candidate
  apenas por terem um número principal maior.

O ORM não decide as permissões e não garante que uma consulta inclua o
profissional autenticado. Esse requisito pertence às regras da aplicação.

## Opções verificadas

| Opção     | Situação e integração                                                                              | Consequência para o projeto                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeORM   | Release 1.1.2 publicada; integração Nest documentada, com entidades por decorators e repositories. | Combina com a organização escolhida; exige revisar compatibilidade de versões, ESM, metadados e migrations.                                     |
| Drizzle   | Suporte MySQL com `mysql2`; releases 0.45.x e linha 1.0 em RC; integração documentada no Nest.     | Esquema e consultas próximos de SQL e tipos inferidos; avaliar o custo da transição de 0.x para 1.x, sem selecionar RC para esta base.          |
| Sequelize | A política oficial lista v6 como current e v7 como alpha. O Nest documenta integração.             | Continuidade com o código antigo, mas o esquema atual precisa ser redesenhado de qualquer modo. Não chamar a v6 de descontinuada sem evidência. |
| Prisma    | A documentação atual apresenta v8 como RC e sem MySQL; indica v7 para esse banco.                  | Não executar instalação genérica de `latest`. A linha e o conector corretos precisariam de avaliação específica.                                |

## Recomendação preliminar

Avaliar primeiro **TypeORM com MySQL**, porque a aplicação já adotou módulos,
controllers e serviços do Nest, e a integração de repositories é documentada.
Essa é uma recomendação de adequação ao projeto, não uma afirmação de
superioridade universal ou de que as demais bibliotecas foram abandonadas.

Drizzle é uma alternativa válida se a prioridade for declarar o esquema em
TypeScript e manter consultas mais próximas de SQL. A evolução para a linha
1.0 precisa entrar no custo de manutenção, em vez de ser ignorada.

Antes de aprovar a integração, conferir as versões exatas de TypeORM,
`@nestjs/typeorm` e `mysql2`, incluindo suas faixas de compatibilidade com o
Nest instalado. Fazer uma prova pequena e isolada de conexão, migration,
transação e restrição de escopo. Não instalar todos os ORMs para comparar.

Uma escolha de ORM não autoriza trocar o banco, descartar registros antigos
ou reorganizar a aplicação inteira em torno da biblioteca.

## Critérios de aceitação da próxima etapa

1. Pacotes, versões, impactos e auditoria apresentados para aprovação.
2. Versão e disponibilidade do MySQL conhecidas; credenciais fora do código.
3. Banco de teste isolado, separado do banco antigo.
4. Configuração sem sincronização automática do esquema em produção.
5. Migration inicial inspecionada antes de qualquer execução autorizada.
6. Testes de referência obrigatória da criança ao profissional e de isolamento.
   Testar também reset sem perda de histórico, rejeição antes da finalização
   e unicidade da execução aberta.
7. Plano explícito para registros antigos sem profissional identificado.
8. Documentação dos comandos Yarn, incluindo geração, aplicação e recuperação
   de falhas. Não prometer reversão sem perda de dados apenas porque existe `down`.

Não é necessário instalar ou executar migrations para aprovar este documento.

## Fontes primárias

- [Integrações de banco no NestJS](https://docs.nestjs.com/techniques/database).
- [TypeORM 1.1.2](https://github.com/typeorm/typeorm/releases/tag/1.1.2).
- [Configuração de migrations do TypeORM](https://typeorm.io/docs/migrations/setup/).
- [Drizzle com MySQL](https://orm.drizzle.team/docs/get-started/mysql-new).
- [Releases do Drizzle](https://github.com/drizzle-team/drizzle-orm/releases).
- [Política de versões do Sequelize](https://sequelize.org/releases/).
- [Estado atual do Prisma ORM](https://www.prisma.io/docs/orm).

As versões e a documentação deverão ser reconferidas antes da instalação.
