# Autenticação e acesso — implementação incremental

Atualizado em 10 de novembro de 2026. Hash e criação local do primeiro ADM foram
concluídos no commit `0513188`; a persistência de autenticação, no `dd7c6cf`.
Login adulto, consulta da sessão e logout foram concluídos no commit `9690612`.
O incremento atual implementa cadastro profissional pelo ADM, reemissão e
ativação de acesso em 24 h na API; telas e recuperação continuam para outras etapas.
Nenhuma conta real foi criada nos testes; nenhuma nova dependência ou migration
foi necessária para os endpoints.

## Estado atual e direção

O backend possui `accounts` com papéis `administrator`, `professional` e `child`,
estados `pending`, `active` e `suspended`, username único normalizado e campo
de hash excluído das seleções padrão. Há proteção e verificação local de senha
e comando para o primeiro ADM. Há login adulto, sessões revogáveis, proteção
de rotas e limites compartilhados, habilitados explicitamente por configuração.
A ativação profissional já existe na API; recuperação e telas ainda estão pendentes. `/health`
continua público.

Implementação: credenciais locais protegidas por Argon2id e sessões opacas revogáveis
no MySQL. O servidor consulta o papel e o estado atuais; não recebe autoridade
de um campo livre no corpo da requisição. ADM cadastra profissionais, mas não
ganha acesso automático aos dados clínicos ou infantis.

O acesso adulto será entregue primeiro. O fluxo infantil será preservado e
protegido em etapa própria; não aceitar automaticamente o código curto antigo
como segredo forte nem disponibilizar login infantil pelo endpoint adulto.

## 1. Senhas e primeiro ADM — implementado e validado

Usar `crypto.argon2('argon2id', ...)` assíncrono, presente no Node 24.21.0
instalado. Não é necessário instalar uma biblioteca de hash nesta etapa.

Perfil implementado: memória 64 MiB, três passagens, paralelismo um, salt
aleatório de 16 bytes e hash de 32 bytes. Armazenar formato PHC com algoritmo,
versão, parâmetros, salt e hash, dentro dos 255 caracteres já disponíveis.
Validar estritamente esse formato e os custos aceitos antes de verificar um
hash; dados malformados não podem solicitar custos arbitrários. Comparação
com `timingSafeEqual` após validar comprimentos. Rehash futuro será explícito.

Uma medição exploratória com três senhas sintéticas nesse computador retornou
78, 71 e 70 ms. Não é teste de carga nem prova para produção. O login usa
limite compartilhado de requisições e limite local de concorrência antes do cálculo caro; não basta
usar uma API assíncrona para controlar consumo de CPU e memória.

Política implementada: 15–128 pontos de código Unicode válidos, com suporte a
frases e Unicode; limite adicional de 512 bytes UTF-8, sem truncamento, trim ou transformação da
senha. Permitir colar e usar gerenciadores; não exigir composição artificial
ou troca periódica sem motivo. A política de senhas comuns/comprometidas será
definida antes de uma implantação pública, sem enviar a senha a serviços externos.

Criar o primeiro ADM por comando Yarn local interativo:

1. Solicitar nome, username e senha com confirmação, ocultando a senha no TTY.
2. Recusar senha em argumento, variável de ambiente, arquivo de seed ou stdin
   não interativo. Não imprimir senha, hash ou entradas privadas nos erros.
3. Usar a conta de dados da API; nenhuma permissão adicional de DDL é necessária.
4. Adquirir bloqueio no MySQL e criar a conta em transação. Recusar se já
   existir qualquer ADM, inclusive suspenso ou pendente. Evitar duas criações
   concorrentes; soltar o bloqueio e fechar conexões também em falhas.
5. Criar somente uma conta ativa com papel ADM, sem profissional/criança de
   demonstração e sem endpoint público de criação de administradores.

Esse comando não será executado pelo agente com uma senha escolhida por ele.
A desenvolvedora fará a entrada da credencial quando o comando estiver revisado
e validado. Recuperar um ADM perdido terá procedimento separado, não uma opção
para contornar o bloqueio de criação do primeiro ADM.

Responsabilidades desse primeiro incremento:

- `backend/src/modules/auth/services/password.service.ts` e testes.
- `backend/src/modules/accounts/services/create-first-admin.service.ts`: regra, bloqueio e transação.
- `backend/src/modules/accounts/commands/admin-input.ts`: leitura privada e cancelamento, com testes.
- `backend/src/modules/accounts/commands/create-first-admin.ts`: configuração, recursos e mensagens seguras.
- Testes unitários e integração no MySQL com fixtures revertidas.
- `backend/package.json`: comando Yarn para criar o primeiro ADM, sem novas dependências.
- READMEs e roadmap: execução, limitações e validações.

O hash e o comando usam a estrutura existente, sem migration. Execute
`yarn admin:create-first` dentro de `backend/`, em terminal local, com Node 24.21.0
ou versão posterior compatível com essa API. O comando usa `DB_USER`, não o
usuário de migrations. Senhas não são lidas do ambiente nem de argumentos.
A criação efetiva do ADM é uma escrita de dados e exige autorização própria
após a revisão do comando.

## 2. Cadastro e ativação implementados; recuperação planejada

Fluxo aprovado: entrega manual do link pelo ADM, por um canal confiável.
Cadastro, reemissão e consumo já estão implementados na API. O
[contrato de cadastro e primeiro acesso](professional-onboarding.md) descreve
as rotas, regras, preservação de histórico e testes de concorrência. A URL usa
a futura tela `/activate-account`; a interface ainda não existe neste incremento.

| Operação | Fluxo proposto |
| --- | --- |
| Cadastro | ADM autenticado informa nome e username; conta e perfil são criados em transação no estado pendente |
| Primeiro acesso | ADM entrega um link de uso único por um canal confiável; o titular define a própria senha |
| Ativação | Consumir o token em transação, gravar o hash e ativar a conta; exigir login normal depois |
| Recuperação | ADM valida a identidade do profissional e emite outro link; nunca conhece ou consulta a senha anterior |
| Troca de senha | Usuário autenticado confirma sua senha atual; trocar hash e revogar sessões em transação |
| ADM sem acesso | Procedimento local separado, com acesso operacional verificado e rastreabilidade; não usar recuperação pública de profissional |

Alternativa: entrega automática por e-mail. Isso exige coletar e verificar o
endereço, definir provedor e tratamento de entrega e aprovar as dependências
ou integração. O cadastro atual não tem e-mail; não adicionar esse campo ou
enviar mensagens automaticamente sem essa decisão.

Tokens propostos: 32 bytes aleatórios; guardar somente digest SHA-256, finalidade,
conta, emissor, expiração e consumo/revogação. Validades aprovadas: ativação
24 horas e recuperação 30 minutos. Esses prazos serão aplicados pelos serviços.
Uma emissão revoga links anteriores da mesma finalidade. O consumo deve ser
atômico e permitir somente um uso, mesmo sob concorrência.

Links não entram em logs. O frontend receberá o segredo no fragmento da URL,
removerá o fragmento após carregá-lo e enviará o token no corpo da requisição.
As telas não terão recursos de terceiros e usarão política de referências
restrita. Link expirado terá ação para solicitar outro ao ADM.

## 3. Sessões e HTTP — concluídos (`9690612`)

Os prazos adultos foram aprovados: 30 minutos de inatividade e oito horas de
validade absoluta, sem sessão permanente. O servidor usa o relógio UTC do MySQL,
renova o prazo de inatividade nas requisições autenticadas e o limita ao prazo absoluto.
O cookie dura no máximo oito horas; não substitui a validação dos prazos no banco.

Cada login válido gera 32 bytes aleatórios em base64url canônico e grava somente
o digest SHA-256. Se a requisição traz uma sessão anterior válida, ela é revogada
na mesma transação que cria a nova. Outras sessões em dispositivos diferentes
continuam independentes. Logout revoga a sessão atual e limpa o cookie.

Contas ativas dos papéis ADM e profissional podem entrar; profissionais precisam
de perfil não arquivado. Crianças são recusadas nesta rota. Falhas de credencial,
conta inexistente, pendência e suspensão têm a mesma resposta 401. Hashes ausentes
ou malformados usam uma verificação fictícia de custo equivalente. Há no máximo
dois cálculos de senha simultâneos por processo, compartilhados com a ativação, sem fila; excesso recebe 429.
A conta, o hash e o perfil são conferidos novamente sob lock depois da verificação
cara. Isso impede criar uma sessão usando um estado que mudou durante o cálculo.

A cada acesso, o guard lê papel e estado atuais, confere perfil e sessão e revoga
a sessão observada se a conta perdeu elegibilidade ou o prazo terminou. Futuras
operações de suspensão, arquivamento, troca de senha e mudança de papel deverão
revogar **todas** as sessões da conta na mesma transação. Essa operação de domínio
não foi implementada nesta etapa. Rotas precisam declarar `@AllowedRoles(...)`;
sem declaração são negadas quando o módulo está ativo. `@PublicRoute()` é reservado
a rotas deliberadamente públicas. ADM não herda permissão de profissional.
Autorização sobre crianças/atividades específicas continua nos futuros serviços.

### Contrato HTTP

| Método e rota | Entrada | Resultado |
| --- | --- | --- |
| `POST /auth/login` | JSON com somente `username` e `password` | Cookie e identidade mínima, CSRF e prazos; HTTP 200 |
| `GET /auth/session` | Cookie válido | Identidade atual, CSRF vinculado à sessão e prazos atualizados |
| `POST /auth/logout` | Cookie, CSRF e JSON `{}` | Revoga a sessão, limpa o cookie; HTTP 204 |

A identidade pública contém somente `id`, `name` e `role`. O token da sessão
não entra no JSON. O token CSRF é uma credencial distinta, derivada por HMAC com
contexto próprio e vinculada ao identificador aleatório da sessão. Deve ficar
apenas em memória no cliente; a consulta de sessão permite recuperá-lo após
recarregar a página. A comparação usa `timingSafeEqual` e formato canônico.

Escritas exigem `Origin` exatamente igual a `AUTH_ORIGIN`, `Content-Type:
application/json` e `X-Emotions-Request: 1`. Logout e futuras escritas autenticadas
exigem também `X-CSRF-Token`. Login tem proteção contra CSRF por origem, JSON e
cabeçalho customizado, antes de existir uma sessão. Pedidos explicitamente de
outra origem por `Origin` ou Fetch Metadata são recusados. Não há CORS liberado.
A leitura aceita o cookie somente no formato canônico de 32 bytes, recusa
ocorrências duplicadas e não faz percent-decoding nem parsing genérico de cookies.

Cookie HTTPS: `__Host-emotions_session`, `HttpOnly`, `Secure`, `SameSite=Lax`,
`Path=/`, sem `Domain`. Desenvolvimento HTTP usa `emotions_session_local`,
somente com origem e bind de loopback e fora de produção. Requisições inseguras
são recusadas quando Secure é exigido. `trust proxy=false`; não confiar em
`X-Forwarded-For` ou `X-Forwarded-Proto`. A configuração de HTTPS/proxy real ainda
precisa de etapa própria antes de implantação; ela não foi validada por testes
locais HTTP. O proxy `/api` do Vite e as telas serão integrados separadamente.

### Limites e armazenamento compartilhado

A janela inicial é de 15 minutos: até **5 solicitações por origem/username** e
**30 por origem**, incluindo solicitações bem-sucedidas. Isso reserva capacidade
antes do hash, sem usar o resultado da senha para decidir se a solicitação custa
uma tentativa. Não há bloqueio permanente da conta; o prazo não é prorrogado por
novas solicitações rejeitadas. Respostas 429 incluem `Retry-After`. O endereço é
o peer TCP; limites por IP terão que ser revistos na implantação atrás de proxy.

Os contadores usam HMAC-SHA-256 com contextos distintos e transações MySQL:
upsert, lock e consumo em ordem estável. A recusa acontece depois do commit,
preservando o bloqueio. Quando a origem já está bloqueada, não são criados
contadores para novos usernames. O pool tem cinco conexões e fila de até 25;
esgotar essa fila falha de forma fechada, com erro interno genérico.

`AUTH_SECRET` tem 32 bytes aleatórios em hexadecimal, guardados somente no `.env`
privado/ambiente seguro e compartilhados entre instâncias. Ele protege CSRF e
identificadores dos contadores por contextos HMAC separados. Rotacioná-lo não
revoga automaticamente os digests de sessão existentes: em comprometimento,
revogar as sessões também será parte do procedimento operacional.

Contadores expirados são reiniciados ao reutilizar a chave. A limpeza de chaves
antigas e sessões expiradas ainda não é automática. Antes de implantação pública,
definir e validar tarefa de retenção/limpeza, trilha de eventos mínimos, avaliação
de senhas comprometidas, recuperação do ADM e MFA. Esta etapa valida o acesso
adulto local; não declara operação clínica ou implantação pública pronta.

Nenhuma expiração de sessão altera atividades ou consome tentativas infantis.
Os prazos de acesso infantil continuam para sua etapa específica.

## 4. Persistência aplicada e validada

| Alteração aplicada | Finalidade |
| --- | --- |
| `auth_sessions` | Conta, digest único da sessão, datas de início/atividade/expiração/revogação |
| `account_tokens` | Ativação e recuperação com finalidade, digest único, emissor, prazo e consumo |
| `auth_rate_limits` | Contadores/janelas compartilhados entre processos, sem depender da memória de uma instância |
| `accounts.password_hash` | Permitir ausência enquanto pendente; exigir hash para conta ativa por CHECK |

### Estrutura aplicada

- `auth_sessions`: conta, digest único da sessão, última atividade, expiração
  por inatividade, expiração absoluta e revogação. CHECKs conferem a ordem das
  datas e impedem que a expiração por inatividade ultrapasse a absoluta.
- `account_tokens`: finalidade `activation` ou `password_reset`, conta profissional,
  ADM emissor, digest único, expiração, consumo e revogação. FKs compostas e CHECK
  restringem os papéis; consumo e revogação são mutuamente exclusivos. O consumo
  registrado precisa estar dentro da validade. Isso não verifica o relógio atual:
  o serviço de ativação já rejeita uso expirado e serializa o consumo em transação.
- `auth_rate_limits`: escopo, digest da chave, janela, contador unsigned e bloqueio
  temporário. Uma chave tem um contador por escopo; escopos iniciais são
  `login_origin`, `login_origin_account` e `token_redemption`. Não há IP nem username
  em texto simples. Atualização atômica, limites de login e resposta 429 estão implementados; o
  escopo de consumo de links já limita a ativação.
- `accounts.password_hash`: agora anulável no modelo. O CHECK permite
  ausência somente enquanto a conta não está ativa e rejeita hash vazio. Uma conta
  suspensa pode continuar sem senha, inclusive se suspensa antes da ativação.
  Contas ativas precisam de valor não vazio; o serviço continua responsável por
  produzir e verificar um hash criptográfico válido.

Todos os novos registros usam UUID e datas UTC, sem exclusão em cascata.
Digests de 64 caracteres usam ASCII com comparação binária e `select: false`.
O modelo não guarda o segredo original nem fornece DTOs públicos. O tamanho no
banco não substitui a validação hexadecimal pelo serviço.

Sessões e links de ativação usam SHA-256 de segredos aleatórios de 32 bytes. Limites de login já usam HMAC-SHA-256 com chave compartilhada
entre instâncias e configuração própria. A retenção/limpeza dos registros será
validada antes de implantação pública. Os índices de expiração
preparam as consultas de limpeza, sem executar exclusões automáticas nesta etapa.

### Migration e limites da validação

`1793520002000-add-authentication-persistence.ts` contém SQL congelado, sem
reescrever as migrations já aplicadas. Antes do DDL, verifica contas incompatíveis
com o novo CHECK e colisão com os nomes das três tabelas. Não altera valores de
contas nem importa dados antigos. MySQL faz commit implícito de DDL: uma falha
intermediária exige inspeção antes de qualquer nova execução, sem repetição cega.

A reversão recusa, antes de qualquer DROP, tabelas novas com registros ou qualquer
conta com hash nulo. Não preenche senha fictícia para restaurar o NOT NULL.
Concorrência operacional exige janela de manutenção e ausência de escritores;
o bloqueio de migrations não bloqueia serviços comuns da API.

O banco aplicado tem doze tabelas da aplicação e duas técnicas, alinhadas às
doze entidades. `synchronize`, `migrationsRun` e `dropSchema` permanecem
desativados. A aplicação usou ALTER temporário restrito a `accounts`, já
revogado; a conta da API permaneceu sem DDL. Um snapshot local privado somente
da estrutura foi salvo antes da operação, sem exportação de dados.

Os dez testes reais novos passaram, cobrindo contas sem senha, digests privados,
FKs dos papéis, digests únicos, datas e contadores por escopo. A suíte verifica
primeiro se a migration está aplicada e exige banco local vazio, com fixtures
em transações revertidas. Os 43 testes MySQL passaram; as doze tabelas da
aplicação continuaram vazias. As CHECKs mapeadas foram conferidas como ENFORCED,
e o ORM não encontrou diferenças de esquema. As três migrations constam como
aplicadas; uma nova execução aplicou zero mudanças, já sem o ALTER temporário.
A reversão não foi executada no MySQL; seus preflights foram testados offline.

### Validação do incremento HTTP

Tipos, lint, build e 181 testes unitários passaram. Os 10 testes HTTP de base e
67 testes com MySQL passaram; a auditoria reportou zero vulnerabilidades conhecidas
em 377 dependências, sem suprimir os avisos preexistentes da resolução minimatch
e da ferramenta Yarn. São 258 testes distintos no conjunto executado.

A suíte adulta usa contas/sessões em transação externa revertida e exercícios
reais de hash, login, papéis, troca de identificador, expiração, suspensão,
arquivamento, CSRF, campos extras e cabeçalhos de proxy falsos. A suíte concorrente
de contadores usa commits independentes e remove somente suas chaves HMAC
sintéticas. Exige banco vazio; não é destinada a bancos com dados reais.

A conferência final confirmou as doze tabelas da aplicação vazias, três migrations
aplicadas e nenhuma diferença de esquema. Chrome abriu a rota de sessão e exibiu
a resposta de autenticação necessária; a instância local temporária foi encerrada.
A configuração privada mantém o módulo desativado por padrão, e nenhum ADM real
foi criado. Frontend, HTTPS/proxy de implantação e limpeza operacional ainda não
foram validados neste incremento.

## 5. Sequência de implementação e validação

1. Hash e criação do primeiro ADM concluídos no commit `0513188`.
2. Persistência e entrega manual aprovadas; migration aplicada e restrições
   reais validadas, concluídas no commit `dd7c6cf`.
3. Login adulto, consulta da sessão, logout, guard e limites concluídos no
   commit `9690612`.
4. Cadastro profissional exclusivo do ADM, reemissão e ativação implementados
   na API; testes de transação, prazo, consumo único, concorrência e rollback
   preparados para revisão do incremento. Recuperação permanece separada.
5. Integrar telas acessíveis no frontend e validar no Chrome, sem expor conteúdo
   infantil por uma sessão ou papel indevido.

Não habilitar publicamente etapas incompletas. MFA e recuperação operacional
do ADM precisam de avaliação antes de implantação com dados reais; esta proposta
não declara a aplicação pronta para uso clínico nem define conformidade legal.

## Fontes primárias

- [Argon2 no Node 24.21.0](https://nodejs.org/download/release/v24.21.0/docs/api/crypto.html#cryptoargon2algorithm-parameters-callback).
- [OWASP: armazenamento de senhas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [OWASP: autenticação](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- [OWASP: sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [OWASP: recuperação de senha](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
- [OWASP: CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Custos, prazos, nomes de tabelas e a divisão dos incrementos são recomendações
específicas para o Emotions, não valores universais impostos pelas fontes.
