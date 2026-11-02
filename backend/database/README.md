# Esquema do Emotions — unificação em `activity_results`

O esquema inicial e a segunda migration foram aplicados e validados. Conforme
aprovação da desenvolvedora, realização e desfecho ficam na tabela única
`activity_results`, com as respostas individuais em `activity_attempts`.
As permissões temporárias foram revogadas após a aplicação; a conta de migrations
voltou a SELECT, INSERT, CREATE e REFERENCES. O banco antigo permanece preservado.

A inspeção confirmou zero registros em `activity_results`, `activity_executions`
e `activity_attempts`. A segunda migration repete essa verificação antes de
qualquer DDL e interrompe se houver dados. Ela não é uma migração genérica de
históricos existentes: não deve ser adaptada para descartar registros reais.

## Organização

- `src/modules/<funcionalidade>/entities/`: interfaces e schemas TypeORM tipados.
- `src/database/record-columns.ts`: UUID e datas de auditoria comuns.
- `src/database/database-entities.ts`: registro explícito das nove entidades.
- `src/database/migrations/`: SQL congelado e versionado, independente de
  futuras alterações nos schemas das entidades.
- `src/database/migration-options.ts`: configuração separada de migrations.
- `database/setup/`: administração manual do ambiente local.

Usamos `EntitySchema`, recurso nativo do TypeORM: interfaces TypeScript descrevem
os registros e os schemas declaram os tipos e vínculos de persistência, sem
depender da emissão de metadados de decorators. Não há controllers, endpoints,
serviços de negócio ou repositórios genéricos vazios nesta etapa.

## Tabelas e campos

Todas as tabelas têm UUID em `id` (`varchar(36)`, gerado pelo TypeORM),
`created_at` e `updated_at` (`datetime(6)`). Cada conexão do pool configura
somente seu próprio fuso para UTC antes das demais consultas; isso também
cobre os defaults SQL de auditoria, sem mudar o fuso global do servidor.
Datas civis de nascimento são strings `YYYY-MM-DD` na aplicação, sem fuso.
O driver usa `dateStrings: ['DATE']` para impedir que a data civil seja
convertida em um horário e deslocada pelo fuso do processo. DATETIME continua
sendo tratado como horário de evento em UTC.

| Tabela | Campos específicos |
| --- | --- |
| `accounts` | Nome, usuário único, hash protegido, papel ADM/profissional/criança, estado de acesso e último login |
| `professionals` | Conta profissional, conta ADM que a cadastrou e arquivamento |
| `children` | Profissional obrigatório, conta infantil, tratamento ativo, grau informado, nascimento, responsável, observações, foto e arquivamento |
| `files` | Profissional dono, chave interna única, nome original, tipo, tamanho, texto alternativo e arquivamento |
| `activities` | Criança, profissional derivado desse vínculo, nome, emoção, imagem, estado de conteúdo, imagem/mensagem de acolhimento e arquivamento |
| `activity_options` | Atividade, posição, texto e indicador de alternativa correta |
| `rewards` | Atividade única, profissional do contexto, imagem e mensagem |
| `activity_results` | Atividade, profissional que libera, sequência, estado, início, conclusão, desfecho opcional enquanto aberta, realização anterior e identificador de reset |
| `activity_attempts` | `result_id`, atividade, alternativa escolhida, número, identificador de reenvio, início, resposta, duração, origem da medição e acerto |

O executor do TypeORM criará também `schema_migrations`, para seu histórico
técnico, e `typeorm_metadata`, para as expressões das duas colunas geradas.
O esquema atual tem **nove tabelas de domínio e duas técnicas**, sem cadastros ou atividades
demonstrativas. A migration registra somente os dois metadados técnicos;
nenhum dado de criança ou conta é inserido.

### Correspondência com todos os campos antigos

| Origem | Destino / tratamento |
| --- | --- |
| Todos: `id`, `createdAt`, `updatedAt` | UUID e datas de auditoria UTC; importação exigirá mapa explícito de IDs |
| `Admin.name`, `Admin.user`, `Admin.password` | `accounts.name`, `username`, `password_hash`; nunca copiar senha em texto simples |
| `Kid.name`, `Kid.user`, `Kid.code` | Conta infantil em `accounts`; código também vira hash, sem aceitar automaticamente códigos curtos como segredo forte |
| `Kid.treatment` | `children.treatment_active`, booleano; não concede permissão de login |
| `Kid.rate` | `children.reported_level`, texto opcional, sem traduzir automaticamente para diagnóstico ou nível clínico |
| `Kid.birth` | `children.date_of_birth`, DATE obrigatório |
| `Kid.parent` | `children.guardian_name`, até 255 caracteres, obrigatório |
| `Kid.note` | `children.notes`, texto opcional |
| `Kid.key`, `Kid.photo` | Referência `children.photo_file_id` e metadados em `files`; não copiar URL pública para o novo modelo |
| `Task.kid_id` | `activities.child_id` e FK composta que confere o profissional responsável |
| `Task.name`, `Task.emotion` | `activities.name`, `emotion` |
| `Task.response1`, `response2`, `response3` | Três linhas ordenadas em `activity_options`, com uma correta ao publicar |
| `Task.image` | `activities.image_file_id`, arquivo do mesmo profissional |
| `Task.status` | Estado do conteúdo em `activities` e estado separado por execução; não converter “realizada” em permissão de reset |
| `Reward.task_id`, `photo`, `message` | `rewards.activity_id` único, `image_file_id`, `message`; imagem reutilizável no próprio escopo |
| `Result.task_id` | Cada realização fica em `activity_results.activity_id`, preservando repetições |
| `Result.response` | Alternativa referenciada pela última tentativa daquele `result_id`; não duplicar texto divergente |
| `Result.tries`, `time` | Contagem e soma numérica derivadas de `activity_attempts` por `result_id`, sem duplicar totais |
| `Result.kid_id` somente no model | Criança obtida por `activity_results` → atividade; elimina a divergência entre model e migration antiga |

As imagens antigas continuam preservadas em `_old`, sem serem publicadas ou
copiadas automaticamente. A futura importação terá que conferir datas inválidas,
usuários duplicados e profissionais responsáveis, sem inventar vínculos.

## Integridade no banco

- FKs obrigatórias e sem exclusões/atualizações em cascata.
- Contas profissionais e infantis referenciadas com o papel correto por FK
  composta e CHECK; o criador de um profissional precisa ser uma conta ADM.
- Um profissional por criança. Atividades, imagens e recompensas têm FKs
  compostas que impedem misturar profissionais, incluindo foto infantil.
- Username armazenado em minúsculas e sem espaços nas pontas; índice único
  com collation explícita `utf8mb4_0900_as_ci`, sem diferenciar maiúsculas.
  Um único namespace abrange ADM, profissionais e crianças. Importação precisa
  revisar colisões antes de inserir; não há conversão automática de credenciais.
- Hashes e chaves de armazenamento excluídos das seleções padrão. Isso não
  substitui DTOs de saída, autorização ou uma política de credenciais.
- Posições de alternativas limitadas a 1–3, sem posição duplicada por atividade;
  coluna gerada e índice único permitem no máximo uma alternativa correta.
- No máximo uma recompensa por atividade.
- Realizações numeradas em `activity_results`, uma aberta por atividade, operação de reset
  única e uma repetição direta por registro de origem.
- Tentativas numeradas 1–3 e únicas por `result_id`, impedindo uma quarta linha.
  Referências compostas impedem uma tentativa de misturar registros de `activity_results`,
  atividades ou alternativas incompatíveis.
- Cada realização e seu desfecho compartilham a mesma linha de `activity_results`. O
  desfecho deve ser nulo enquanto aberta e obrigatório quando concluída.
- Durações `BIGINT UNSIGNED` retornam como strings, preservando precisão;
  não há limite de desempenho nem expiração do exercício no esquema.
- Datas coerentes com os estados e duração não negativa, sem apagar histórico
  ao liberar uma repetição.

### Regras que exigem serviços transacionais

FKs e índices não demonstram que o ator da requisição tem autorização. Essa
verificação continua obrigatória em cada endpoint, inclusive para ADM.
Antes de liberar o fluxo, os serviços ainda precisam garantir:

- Criação de atividade e sua recompensa na mesma transação: a chave única
  garante no máximo uma, mas sozinha não garante a existência de uma recompensa.
- Exatamente três alternativas e uma correta ao publicar; a correta deve ser
  coerente com a emoção cadastrada. Não expor o indicador à criança.
- Reset somente da última execução concluída, com bloqueio da atividade,
  sequência correta, checagem de desfecho e preservação dos registros anteriores.
- Avaliação no servidor, sequência das tentativas, parada no acerto ou terceiro
  erro e finalização de `activity_results` na mesma transação. `attempts_exhausted` exige
  três erros conferidos pelo serviço; uma CHECK não conta linhas em outra tabela.
- Quantidade e tempo total são derivados por COUNT e SUM das tentativas do mesmo
  `result_id`. A última tentativa identifica a resposta final, sem uma FK circular
  ou cópia de texto. Não há campos persistidos de total ou quantidade em `activity_results`.
- Imutabilidade do conteúdo e do histórico após início, controle de arquivos
  órfãos, arquivamento e política de exclusão. RESTRICT não torna uma linha
  isolada imutável nem implementa sozinho uma política de retenção.
- Feedback carinhoso obrigatório no encerramento sem acerto. Os campos opcionais
  permitem configurá-lo sem decidir automaticamente sua origem ou biblioteca.
- Algoritmo e parâmetros de hash, ativação/recuperação, bootstrap do primeiro
  ADM e segurança da sessão. Não existem contas ou senhas padrão/seeds.
- Política de pausas: `timing_source` distingue tempo decorrido do servidor e
  tempo ativo informado pelo cliente, sem escolher automaticamente um deles.

Esta etapa prepara a estrutura completa; não declara essas funcionalidades
implementadas nem representa os registros como comprovação de evolução clínica.

## Comandos Yarn e execução autorizada

Dentro de `backend/`:

```sh
yarn migration:status
```

Esse comando compila e consulta somente metadados com a conta da API.
Não chama `showMigrations()` do TypeORM porque, nesta versão, essa operação
pode criar a tabela de controle. O comando local informa migrations pendentes
sem criar tabelas. Status não comprova a integridade de uma aplicação parcial.

Após revisão do esquema e autorização específica para a execução:

1. Revisar e provisionar `emotions_migrator@localhost` com
   `setup/provision-migrator.sql`; a desenvolvedora executa a geração da senha.
2. Preencher somente no `.env` privado `MIGRATION_DB_USER` e
   `MIGRATION_DB_PASSWORD`. Nunca reutilizar a conta ou senha da API.
3. Conferir `DB_NAME=emotions_development`; esta primeira ferramenta recusa
   qualquer outro banco, inclusive `emotions`.
4. Executar `yarn migration:run`. O runner usa a mesma conexão para o bloqueio
   nomeado de execução e o executor nativo do TypeORM, sem registrar SQL ou
   detalhes privados dos erros. Uma execução concorrente é rejeitada.
5. Conferir tabelas, constraints, histórico técnico e status; testar os cenários
   de integridade no MySQL real antes de considerar a etapa validada.

O usuário de migration proposto recebe SELECT, INSERT, CREATE e REFERENCES
no banco novo, suficientes para o esquema inicial. A segunda migration exige
ALTER e DROP temporários no mesmo banco e UPDATE em `typeorm_metadata`; o roteiro
`setup/unify-results-permissions.sql` inclui as concessões e revogações. O CREATE
repetido no grant de metadados permite preparar instalações novas antes da tabela
existir; o privilégio já existe no banco e sua concessão por tabela também é revogada. A API permanece
com SELECT, INSERT, UPDATE e DELETE. Nenhum comando altera esses privilégios
automaticamente ou concede acesso ao banco antigo.

**MySQL DDL faz commit implícito.** A migration usa `transaction=false` e
`migrationsTransactionMode=none`; não promete atomicidade ou recuperação por
ROLLBACK. Em erro, pode haver tabelas criadas sem o registro final da migration.
Pare, inspecione o estado e planeje recuperação; não repita nem use `--fake`
para encobrir inconsistências.

As migrations aplicadas não são reescritas. A primeira cria o desenho anterior;
a segunda o unifica sem apagar o histórico técnico. O `down` da segunda desfaz
o ajuste somente com `activity_results` e tentativas vazias, sem descartar históricos novos.
Depois dessa reversão, o `down` da primeira remove as dez tabelas originais e
seus dados, preservando as tabelas técnicas do TypeORM. Não há comando Yarn de
reversão automática: qualquer reversão exige revisão, autorização e permissões
adequadas. DDL continua sujeito a commits implícitos e falhas parciais.

## Validação e estado atual

Antes da unificação: migration inicial aplicada, 82 testes unitários, 10 HTTP
e 29 testes de integridade passaram; suas fixtures foram revertidas. A correção
de DATE mantém nascimento civil e a leitura do bloqueio aceita apenas 1 ou '1'.

Após a unificação, tipos, lint, 85 testes unitários, 10 testes HTTP, 29 testes
de integração e build passaram. Os testes do modelo unificado incluem
finalização com desfecho, ausência de desfecho enquanto aberto, repetição que
preserva o histórico e contagem/soma derivadas das tentativas.

A comparação do esquema real com os mapeamentos não apontou alterações pendentes.
Reexecutar o runner aplicou zero migrations, com os privilégios temporários já
revogados. O status confirmou as duas migrations aplicadas. `yarn test:database`
exige `emotions_development` sem registros de domínio, usa transações e confirma
que todas as fixtures foram revertidas. Não usa arquivos nem consulta o legado.
O `down` do ajuste tem proteção testada contra dados existentes; seu SQL de
reversão não foi executado no MySQL e não é apresentado como reversão validada.

Autenticação, autorização HTTP, serviços transacionais, política de pausas,
TLS remoto e importação do legado continuam pendentes. A existência das tabelas
não implementa essas funcionalidades.

Referências: [EntitySchema](https://typeorm.io/docs/entity/separating-entity-definition/),
[migrations](https://typeorm.io/docs/migrations/setup/) e
[CHECK no MySQL](https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/create-table-check-constraints.html).
