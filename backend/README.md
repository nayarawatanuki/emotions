# Emotions — backend

API NestJS com TypeScript e Express, organizada por módulos de funcionalidade.

## Ambiente e comandos

Use Node.js 24.21.0 ou posterior compatível e Yarn Classic 1.22.22. Dentro de `backend/`:

```sh
yarn install --frozen-lockfile
yarn start:dev
```

O padrão é `http://127.0.0.1:3000`. O frontend continua na porta 5173.
Copie `.env.example` para `.env` se precisar personalizar o ambiente. O arquivo
real é ignorado pelo Git. Os scripts de execução carregam `.env` pelo suporte
nativo do Node, sem sobrescrever variáveis já definidas no processo.

| Variável | Padrão | Valores aceitos |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, `production` |
| `HOST` | `127.0.0.1` | Endereço IP ou `localhost` |
| `PORT` | `3000` | Inteiro entre 1 e 65535 |

O endereço padrão limita o acesso à própria máquina. Configure explicitamente
outro endereço somente no ambiente de execução em que isso for necessário.

```sh
yarn typecheck
yarn lint
yarn test
yarn test:e2e
yarn build
yarn start:prod
```

`yarn run verify` executa as cinco verificações em sequência. Testes HTTP abrem portas
locais temporárias; um ambiente restrito pode exigir permissão para isso.

## Estrutura

```text
src/
├── common/
│   ├── filters/http-exception.filter.ts
│   └── middlewares/security-headers.middleware.ts
├── config/
│   ├── configure-app.ts
│   ├── database-environment.ts
│   ├── database-environment.spec.ts
│   ├── environment.ts
│   └── environment.spec.ts
├── database/
│   ├── database-entities.ts
│   ├── database-entities.spec.ts
│   ├── database-options.ts
│   ├── database-options.spec.ts
│   ├── database.module.ts
│   ├── database.module.spec.ts
│   ├── migration-options.ts
│   ├── migration-options.spec.ts
│   ├── migration-lock.ts
│   ├── migration-lock.spec.ts
│   ├── migration-status.ts
│   ├── migrations/1793520000000-initial-domain-schema.ts
│   ├── migrations/1793520001000-unify-activity-results.ts
│   ├── migrations/unify-activity-results.spec.ts
│   ├── mysql-driver.ts
│   ├── mysql-driver.spec.ts
│   ├── record-columns.ts
│   └── run-migrations.ts
├── modules/
│   ├── auth/
│   │   ├── services/password.service.ts
│   │   └── entities/
│   │       ├── auth-session.entity.ts
│   │       ├── account-token.entity.ts
│   │       └── auth-rate-limit.entity.ts
│   ├── accounts/
│   │   ├── entities/account.entity.ts
│   │   ├── services/create-first-admin.service.ts
│   │   └── commands/
│   │       ├── admin-input.ts
│   │       └── create-first-admin.ts
│   ├── professionals/entities/professional.entity.ts
│   ├── children/entities/child.entity.ts
│   ├── files/entities/stored-file.entity.ts
│   ├── activities/entities/
│   │   ├── activity.entity.ts
│   │   ├── activity-option.entity.ts
│   │   └── reward.entity.ts
│   ├── results/entities/
│   │   ├── activity-result.entity.ts
│   │   └── activity-attempt.entity.ts
│   └── health/
│       ├── health.controller.ts
│       └── health.module.ts
├── app.module.ts
└── main.ts
test/
├── app.e2e-spec.ts
└── domain-schema.integration-spec.ts
```

- `main.ts`: valida o ambiente, cria a aplicação e inicia o servidor.
- `configure-app.ts`: controles HTTP compartilhados pela aplicação e pelos testes.
- `AppModule`: compõe os módulos da aplicação.
- `HealthModule`: oferece somente a verificação de funcionamento do processo.
- `DatabaseModule`: cria a conexão TypeORM/MySQL quando explicitamente habilitada;
  o Nest gerencia seu encerramento. As entidades estão registradas sem sincronização;
  migrations só podem ser executadas por comando separado e autorizado.
- `common/`: comportamentos compartilhados, sem regras de negócio dos módulos.

Os schemas de persistência ficam em `src/modules/<funcionalidade>/entities/`.
A [revisão completa do esquema](database/README.md) descreve todas as tabelas,
o destino dos campos antigos e as regras que exigem serviços transacionais.
Serviços, controllers e DTOs entrarão junto com as funcionalidades que os utilizam.

## Base de conexão MySQL

O [roteiro de provisionamento local](database/setup/README.md) registra o progresso:
banco e usuários próprios provisionados com autorização; esquema inicial aplicado
e validado com testes reais. As tabelas de domínio permanecem sem registros.
O ajuste aprovado unifica realização e desfecho em `activity_results` e foi
aplicado na segunda migration, mantendo nove tabelas de domínio e duas técnicas.
O banco legado permanece preservado.

Pacotes aprovados: `@nestjs/typeorm@12.0.2`, `typeorm@1.1.2` e `mysql2@3.24.6`.
A conexão está desativada por padrão (`DB_ENABLED=false`), inclusive em produção:
esta base ainda não está pronta para uso com dados reais. Os testes HTTP usam
explicitamente esse modo e não dependem de um MySQL instalado.

| Variável | Padrão | Regra quando a conexão está habilitada |
| --- | --- | --- |
| `DB_ENABLED` | `false` | Somente `true` ou `false` |
| `DB_HOST` | Sem padrão | IP ou hostname, sem protocolo ou porta |
| `DB_PORT` | `3306` | Inteiro entre 1 e 65535 |
| `DB_NAME` | Sem padrão | Até 64 letras, números ou sublinhados; começa com letra |
| `DB_USER` | Sem padrão | Usuário próprio da aplicação; `root` é rejeitado |
| `DB_PASSWORD` | Sem padrão | Obrigatória; nunca deve ser versionada |
| `DB_TLS` | `true` | `false` permitido somente em loopback fora de produção |

O `.env.example` usa os nomes `emotions_development` e `emotions_app`, já
provisionados neste ambiente local; em outro ambiente, precisam de criação autorizada.
O exemplo usa `DB_TLS=false` para desenvolvimento em `127.0.0.1`; ao mudar
para um servidor remoto ou produção, configure `DB_TLS=true`. Nesse modo o
certificado deve ser válido e confiável para o Node, sem desativar sua verificação.
Se houver uma autoridade certificadora privada, será necessário planejar a
configuração de confiança antes de conectar.

Não reutilize credenciais administrativas nem as credenciais do código antigo.
Rejeitar o nome `root` não comprova os privilégios: o usuário deverá ser provisionado
com permissões mínimas para o novo banco. Um usuário separado deverá executar
migrations futuras; o usuário da API não deve receber permissões de DDL.

Ao habilitar `DB_ENABLED=true`, a API valida as variáveis e tenta conectar antes
de escutar HTTP. Falhas impedem a inicialização e recebem uma mensagem genérica,
sem reproduzir credenciais ou erros do driver. Há uma tentativa de conexão,
com timeout de conexão de 5 segundos e pool de até cinco conexões.

Controles definidos: `synchronize=false`, `dropSchema=false`, `migrationsRun=false`,
com entidades registradas e migrations apenas no runner explícito, sem logs de SQL e sem múltiplas instruções
por consulta. A conexão usa `utf8mb4`, datas em UTC e números grandes como strings
para evitar perda de precisão. Esses controles não substituem autorização,
consultas parametrizadas e validações nas funcionalidades futuras.

Após aprovação do provisionamento, o banco local `emotions_development` e
o usuário `emotions_app@localhost` foram criados; a conexão TCP via TypeORM,
as permissões e a ausência de tabelas foram conferidas. O banco antigo não foi
alterado. As duas migrations e o mapeamento final de nove entidades foram validados.
Os testes usam transações e revertem todas as fixtures sintéticas. TLS remoto ainda precisa
ser validado em ambiente próprio. `/health` permanece uma verificação de liveness;
não monitora a conexão após a inicialização.

`yarn migration:status` consulta o estado sem criar tabelas. `yarn migration:run`
fica reservado à aplicação explicitamente autorizada com credenciais próprias;
nunca é executado pelos comandos de inicialização da API. Consulte a revisão
do esquema antes de provisionar a conta de migrations ou aplicar SQL.

`yarn test:database` executa os testes de integridade em MySQL real com a conta
da API e exige `emotions_development` com todas as tabelas de domínio vazias.
As fixtures são revertidas ao final de cada teste. Esse comando é separado de
`yarn run verify`, que continua independente de banco. Nunca apontar os testes
para dados reais ou alterar a verificação de banco vazio para fazê-los passar.

Referências: [integrações do Nest](https://docs.nestjs.com/techniques/database)
e [driver MySQL do TypeORM](https://typeorm.io/docs/drivers/mysql/).

## Contrato atual

```http
GET /health
200 OK
Content-Type: application/json

{"status":"ok"}
```

`/health` indica que a aplicação responde. Não verifica disponibilidade do banco,
integrações ou capacidade de atender às funcionalidades futuras.
A rota `/` e endereços desconhecidos retornam 404:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Recurso não encontrado."
  }
}
```

Erros são padronizados sem reproduzir mensagens de exceções ou stack traces.
O servidor registra apenas um aviso genérico quando ocorre um erro interno.
Uma estratégia de logs com diagnóstico e remoção de dados sensíveis será
avaliada conforme as próximas funcionalidades forem implementadas.

## Persistência de autenticação — aplicada e validada

O desenho aprovado acrescenta `auth_sessions`, `account_tokens` e
`auth_rate_limits`, com digests privados, índices e restrições. O hash de senha
passa a aceitar NULL em contas não ativas; uma CHECK exige valor não vazio em
contas ativas. Os serviços continuam responsáveis por produzir hashes válidos.
Links profissionais serão entregues pelo ADM, com validade de 24 h para ativação
e 30 min para recuperação, sem envio automático nesta etapa.

A terceira migration foi aplicada e validada: são doze tabelas da aplicação
e duas técnicas. O ALTER temporário, restrito a `accounts`, já foi revogado. Não execute `migration:run`
sem a revisão e a autorização específicas. MySQL DDL não tem rollback
transacional; a operação requer uma janela sem escritores e inspeção em falhas.

A suíte `test/authentication-schema.integration-spec.ts` exige a terceira
migration aplicada e passou com fixtures revertidas. Os 43 testes de banco
passaram; as doze tabelas da aplicação ficaram vazias, com CHECKs conferidas
e sem diferenças entre o esquema e os modelos. Os caminhos de reversão
continuam validados somente offline, sem execução de down no MySQL.
Detalhes e limites estão no [desenho de autenticação](../docs/architecture/authentication.md).

## Login adulto na API

O módulo é habilitado explicitamente com `AUTH_ENABLED=true` e exige o banco
atualizado. O padrão mantém somente a base pública. Os testes não criam um ADM
permanente; a desenvolvedora define sua própria credencial com `admin:create-first`.

| Configuração | Regra |
| --- | --- |
| `AUTH_ENABLED` | `false` por padrão; `true` exige `DB_ENABLED=true` |
| `AUTH_ORIGIN` | Origem exata do cliente, sem barra final, caminho ou credenciais |
| `AUTH_SECRET` | 32 bytes aleatórios em 64 caracteres hexadecimais minúsculos, privados e compartilhados entre instâncias |

A configuração local ganhou uma chave privada no `.env`, com modo 600 e sem
alterar as credenciais MySQL; o valor não foi exibido nem versionado. Em outros
ambientes, gerar uma chave própria com `crypto.randomBytes(32)` e guardá-la no
ambiente seguro. Não copiar chaves de teste. O módulo permanece desativado por
padrão; para executar a API local com o módulo após a revisão:

```sh
AUTH_ENABLED=true yarn start:dev
```

Mantenha o host/origem coerentes: HTTP é aceito apenas com bind e origem de
loopback fora de produção. HTTPS exige cookie Secure e requisição reconhecida
como segura. O proxy permanece não confiável; a implantação de HTTPS/proxy tem
revisão própria e ainda não foi validada em ambiente de produção.

| Endpoint | Contrato |
| --- | --- |
| `POST /auth/login` | JSON com somente `username` e `password`; retorna cookie, identidade mínima, CSRF e prazos |
| `GET /auth/session` | Exige cookie válido; consulta estado atual e renova o prazo de inatividade |
| `POST /auth/logout` | Exige cookie, CSRF e JSON; revoga a sessão atual, limpa o cookie e retorna 204 |

Escritas exigem `Origin: <AUTH_ORIGIN>`, `Content-Type: application/json` e
`X-Emotions-Request: 1`. Logout exige também `X-CSRF-Token`, obtido no login ou
na consulta de sessão e mantido somente em memória. O cookie é HttpOnly, Path=/,
SameSite=Lax e, em HTTPS, Secure com prefixo `__Host-`. Não há CORS liberado;
a integração por proxy Vite e as telas de acesso ficam para outra etapa.

A sessão expira após 30 minutos de inatividade ou oito horas absolutas. Login
válido troca o identificador e revoga o cookie anterior recebido. O guard global
consulta papel/estado atual e exige `@AllowedRoles(...)` em cada rota protegida;
rotas deliberadamente públicas usam `@PublicRoute()`. Profissional precisa de
perfil não arquivado; ADM não herda permissão de profissional; crianças não usam
essa rota. Novos módulos privados só devem ser carregados junto da autenticação.

Os limites iniciais contam solicitações, inclusive bem-sucedidas: cinco por
origem/username e trinta por origem em 15 minutos. O peer TCP é usado sem confiar
em X-Forwarded-For. Os contadores MySQL são consumidos atomicamente e 429 informa
Retry-After. Duas verificações Argon2 podem ocorrer ao mesmo tempo por processo,
sem fila; o pool MySQL permite cinco conexões e até 25 esperas.

A validação de login usa dados desconhecidos, rejeita campos extras e preserva
os bytes da senha. Erros não revelam existência ou estado da conta. A conta e o
perfil são revalidados em transação depois do hash. Nenhuma alteração em sessões
consome tentativas ou altera resultados de atividades.

Os testes HTTP com MySQL usam transações externas e savepoints; contas e sessões
sintéticas são revertidas. Os testes concorrentes de contadores usam transações
independentes, para validar serialização real, e removem exclusivamente suas
chaves HMAC sintéticas ao terminar. Ambos exigem o banco local vazio. O script
`test:database` continua separado da verificação sem banco.

A limpeza de contadores antigos e sessões expiradas ainda não é automática;
retenção, tarefa operacional de limpeza, eventos de segurança, avaliação de
senhas comprometidas, MFA e recuperação do ADM precisam de revisão antes de
implantação pública. A autorização sobre crianças específicas ainda será
implementada nos respectivos serviços. Veja o [contrato e as limitações](../docs/architecture/authentication.md).

## Cadastro profissional e primeiro acesso — API

O incremento usa o mesmo `AUTH_ENABLED`, origem, sessão e CSRF do login. Nenhuma
migration ou configuração nova é necessária. Somente ADM autenticado pode criar
profissionais pendentes, sem senha inicial, e reemitir links.

| Endpoint | Corpo JSON | Resultado |
| --- | --- | --- |
| `GET /professionals?after=<UUID>` | Cursor UUID v4 opcional | 200: até 25 identidades mínimas e `nextCursor` |
| `POST /professionals` | `name`, `username` | 201: identidade mínima e link de ativação |
| `POST /professionals/:id/activation` | `{}` | 201: novo link, invalidando o anterior não consumido |
| `POST /auth/activate` | `token`, `password` | 204: senha protegida, conta ativa e token consumido |

As duas primeiras rotas exigem sessão de ADM, origem exata, JSON,
`X-Emotions-Request: 1` e `X-CSRF-Token`. A ativação é autorizada pelo próprio token,
com origem/JSON/cabeçalho customizado, sem login automático. Um profissional não
pode cadastrar outro ou escolher papel/estado/conta de destino no corpo.

O link vale 24 horas, contém 32 bytes aleatórios no fragmento da URL e somente
seu digest é gravado. Ele é devolvido apenas ao ADM na emissão e não pode ser
recuperado em texto simples. Conta e perfil são gravados na mesma transação;
senha e consumo do token também. A reemissão preserva histórico e não redefine
senha de conta ativa. Links inválidos/usados/expirados/revogados têm erro 400
genérico. Cadastro de username duplicado retorna 409.

A URL `/activate-account#token=...` abre a tela de primeiro acesso do frontend,
que remove o fragmento antes do roteador e envia o consumo à API. Configure
`AUTH_ORIGIN` com a origem exata do frontend. Consulte as instruções de integração
em [frontend/README.md](../frontend/README.md).

Ativação limita dez solicitações por peer TCP em 15 minutos, usando HMAC e o
escopo existente `token_redemption`. A capacidade de dois cálculos de senha é
compartilhada com o login. A conta e a sessão do ADM são conferidas novamente
sob lock antes de emitir o convite. A ativação também exige emissor ativo,
conta ainda pendente e perfil não arquivado.

As suítes de HTTP usam rollback de fixtures; a concorrência real usa commits
sintéticos temporários e limpeza por IDs exatos, com manifesto privado de
recuperação sem segredos. Ambas exigem banco local vazio. Detalhes estão no
[desenho de cadastro e ativação](../docs/architecture/professional-onboarding.md).

## Primeiro administrador — comando local

Após revisar esta etapa e configurar a conexão da aplicação no `.env`, execute
**dentro de `backend/`, em um terminal local**:

```sh
yarn admin:create-first
```

O comando compila o backend e pede nome, usuário, senha e confirmação. A senha
fica oculta e deve ter 15–128 pontos de código Unicode válidos, até 512 bytes.
Espaços são preservados na senha; nome e usuário são aparados, e o usuário é
convertido para minúsculas. Não informe senha por argumento, variável de
ambiente ou redirecionamento. Ctrl+C cancela a entrada e restaura o terminal.

É criada somente uma conta ativa com papel `administrator`. O comando recusa
qualquer ADM existente, incluindo pendente ou suspenso, e não redefine senhas.
Usa a conexão `DB_USER` existente, sem DDL nem credenciais de migration. Um
bloqueio nomeado por banco e uma transação na mesma conexão protegem a criação
contra execuções simultâneas. A conexão é encerrada ao terminar ou falhar.

O hash Argon2id usa a API nativa do Node: 64 MiB, três passagens, paralelismo um,
salt aleatório de 16 bytes e resultado de 32 bytes, serializado em PHC. A
verificação aceita somente esse perfil de custo e formato canônico. Buffers com senha e chave derivada
são apagados pelo serviço após o uso; strings JavaScript não têm
apagamento garantido da memória.

Nenhuma conta real foi criada na validação automatizada. Os testes de MySQL
exigem banco local `emotions_development` vazio, executam o serviço dentro de
savepoints e revertem a transação externa. Também verificam o bloqueio entre
duas conexões e a exclusão do hash das consultas padrão. A suíte é separada:

```sh
yarn test:database
```

Esse comando prepara a credencial do primeiro ADM. O login adulto já existe
na API; recuperação e telas de acesso serão implementadas em etapas próprias. Veja o
[plano de autenticação](../docs/architecture/authentication.md).

## Controles e limites desta etapa

- JSON limitado a 16 KB; corpos comprimidos não são aceitos.
- Cabeçalhos `nosniff`, proibição de enquadramento, política de referências e
  de conteúdo restrita e resposta sem cache.
- Cabeçalhos de identificação do Express e ETag desativados.
- Configurações inválidas impedem a inicialização.
- Encerramento de aplicação habilitado nos sinais de parada pelo Nest.
- Não há CORS liberado, arquivos estáticos ou telemetria externa configurados.

Esta base oferece login adulto, sessões revogáveis, CSRF, papéis e limites
de login. Recuperação, acesso infantil, serviços de atividades
e processamento de uploads continuam pendentes. Não deve ser
apresentada como pronta para atender dados de crianças. HTTPS e configuração
de proxy serão definidos para o ambiente de implantação; não se deve presumir
que estes cabeçalhos substituam esses controles.

## Ferramentas do template

O gerador instalou Nest 12.3.2, Express 5.3.0, TypeScript 6.0.3, Vitest 4.1.12
e Oxlint 1.90.0. As ferramentas do template foram mantidas, com dois ajustes de segurança
aprovados após a auditoria inicial:

- Remoção de `@nestjs/mau` e do script `deploy`, não utilizados no projeto.
- Resolução seletiva `@nestjs/cli/minimatch: 11.0.3` em `package.json`.

A CLI 12.0.11 fixa minimatch 10.2.6, afetado por
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
A resolução usa uma versão principal diferente da solicitada pela CLI, e o Yarn
emite um aviso de incompatibilidade. Esse aviso não foi suprimido. Foram
verificados build, geração de módulo em modo simulado e o uso do helper de glob
da CLI com padrões, exclusões e diretório inexistente. Isso não demonstra
compatibilidade com todos os comandos ou configurações possíveis da CLI.

Reavaliar a resolução quando a CLI incorporar uma versão corrigida na própria
dependência. A resolução é um ajuste rastreável de segurança, não uma mudança
na API do Emotions. A auditoria após os ajustes reportou zero vulnerabilidades
conhecidas entre 351 dependências; isso não garante ausência de falhas no código.

Nenhum serviço de hospedagem ou telemetria externa foi configurado.

### Diretório administrativo

`GET /professionals` usa sessão exclusiva do ADM, verificação de origem e
`no-store`; leituras não exigem CSRF. Retorna ID de perfil/conta, nome, usuário,
status e indicador de arquivamento, sem senha, digest ou convite. Cursor opcional
`after` aceita somente UUID v4; campos extras/duplicados são recusados. A consulta
parametrizada ordena pelo ID do perfil, com página de 25 e leitura de 26 linhas
para produzir `nextCursor`. Novos cadastros durante a navegação exigem atualizar
para reiniciar a listagem. Não há mudança de schema ou índice neste incremento.

## Crianças — cadastro e consulta por profissional

`POST /children`, `GET /children?after=<UUID>` e `GET /children/:id` exigem
sessão de profissional ativo. O ADM não recebe acesso clínico. A propriedade
vem da sessão; consultas alheias retornam 404. O cadastro cria conta infantil
pendente e ficha na mesma transação, sem senha nem foto. A lista tem 25 resumos
por página, sem responsável ou observações; o detalhe é restrito ao proprietário.
Nome, usuário, nascimento, responsável, acompanhamento, nível e observações
seguem validação estrita. Escritas exigem origem/JSON/cabeçalho customizado/CSRF.
Confira [contrato e validação completos](../docs/architecture/child-registration.md).
Acesso infantil e uploads continuam para outras etapas.

### Edição de fichas infantis

`PATCH /children/:id` exige sessão do profissional proprietário, CSRF, origem
válida, os sete campos editáveis e a `revision` do detalhe. Essa revisão é uma
impressão dos dados/timestamps existentes, sem nova coluna. Sob locks ordenados,
o servidor recusa revisão antiga, ficha arquivada, alteração alheia e campos de
privilégio. Identidade e acompanhamento são atualizados na mesma transação;
conflito retorna 409 sem sobrescrever. Não há histórico de versões restauráveis.

### Arquivamento reversível

`PATCH /children/:id/archive` recebe exatamente `{ archived: boolean, revision: string }`.
Exige o profissional proprietário e os mesmos controles de escrita. Conta, perfil,
sessão, vínculo e revisão são revalidados sob locks; mudança concorrente ou estado
já solicitado retorna 409. Não há DELETE. A transação preserva dados vinculados.
Arquivar suspende uma conta infantil ativa e revoga suas sessões; pendentes e
suspensas mantêm o estado. Desarquivar não ativa contas nem recupera sessões.
Acompanhamento informado (`treatmentActive`) permanece independente do arquivo.

`GET /children` mostra não arquivadas; `?archived=true` mostra somente arquivadas.
`archived=false` é explícito equivalente ao padrão. O filtro aceita somente essas
strings, pode ser combinado com `after` UUID e mantém 25 itens por página.
O detalhe próprio continua consultável nos dois estados; edição arquivada é 409.
Retenção, exclusão definitiva e trilha de eventos não fazem parte desta operação.
Os futuros serviços de acesso infantil devem verificar arquivamento antes de
ativar credenciais ou permitir atividades. Tokens atuais são só de profissionais;
nenhum mecanismo infantil de ativação ou recuperação é liberado nesta etapa.
