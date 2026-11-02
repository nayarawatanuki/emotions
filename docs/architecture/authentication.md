# Autenticação e acesso — implementação incremental

Consulta técnica: 2 de novembro de 2026. O primeiro incremento, aprovado pela
desenvolvedora, implementa hash e criação local do primeiro ADM. Nenhuma conta
real foi criada, nenhuma dependência foi adicionada e nenhuma estrutura de
banco foi alterada.
O desenho de persistência e a entrega manual dos links pelo ADM foram aprovados.
A terceira migration foi aplicada e validada no MySQL local. Login HTTP, convites
e recuperação ainda não estão implementados.

## Estado atual e direção

O backend possui `accounts` com papéis `administrator`, `professional` e `child`,
estados `pending`, `active` e `suspended`, username único normalizado e campo
de hash excluído das seleções padrão. Há proteção e verificação local de senha
e comando para o primeiro ADM. Ainda não há login HTTP, sessão, proteção de
rotas ou recuperação. `/health` continua público.

Proposta: credenciais locais protegidas por Argon2id e sessões opacas revogáveis
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
78, 71 e 70 ms. Não é teste de carga nem prova para produção. Login precisará
de limite de requisições e de concorrência antes do cálculo caro; não basta
usar uma API assíncrona para controlar consumo de CPU e memória.

Política implementada: 15–128 pontos de código Unicode válidos, com suporte a
frases e Unicode; limite adicional de 512 bytes UTF-8, sem truncamento, trim ou transformação da
senha. Permitir colar e usar gerenciadores; não exigir composição artificial
ou troca periódica sem motivo. A política de senhas comuns/comprometidas será
definida antes de expor o login, sem enviar a senha a serviços externos.

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

## 2. Cadastro, ativação e recuperação do profissional

Fluxo aprovado: entrega manual do link pelo ADM, por um canal confiável.

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

## 3. Sessões e HTTP

Criar identificador aleatório de 32 bytes e persistir somente seu digest no
servidor. Proposta adulta: inatividade de 30 minutos e duração absoluta de oito
horas, sem opção de sessão permanente nesta primeira versão. Renovar o
identificador ao autenticar; logout e recuperação revogam sessões no servidor.
Conta suspensa e profissional arquivado perdem acesso, mesmo com cookie antigo.

Cookie de produção: `__Host-emotions_session`, `HttpOnly`, `Secure`, `SameSite=Lax`,
`Path=/`, sem `Domain`. Desenvolvimento HTTP local terá nome distinto e exceção
restrita ao loopback; configuração insegura não pode ser usada em produção.
HTTPS e proxy confiável precisam ser definidos para implantação.

Operações de escrita autenticadas exigirão proteção CSRF vinculada à sessão,
origem permitida e corpo JSON. Não usar GET para modificar dados, nem liberar
CORS genérico. Em desenvolvimento, a integração poderá usar proxy `/api` no
Vite para manter a navegação na mesma origem, sem tokens em localStorage.

O frontend receberá apenas identidade mínima e permissões necessárias. Senhas,
hashes, cookies, tokens e detalhes do banco não entram nos DTOs ou logs. Mensagens
de falha de login não revelarão se o username existe, está suspenso ou pendente;
contas inexistentes também precisam de trabalho de hash comparável.

Limites de login devem atuar por origem confiável e identificador, com janela
finita e armazenamento compartilhado. Proposta inicial para avaliação: cinco
falhas por par origem/username em 15 minutos e limite global por origem, sem
bloqueio permanente da conta. Não confiar em X-Forwarded-For arbitrário.
Definir também teto de hashes simultâneos, fila limitada e resposta 429.

O timeout de sessão não registra erro, não consome tentativa e não reinicia uma
atividade. A realização e suas tentativas ficam preservadas para retomada.
Os prazos infantis de acesso serão tratados em sua etapa, respeitando esse requisito.

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
  rejeitar uso expirado e consumir somente uma vez exige transação no serviço.
- `auth_rate_limits`: escopo, digest da chave, janela, contador unsigned e bloqueio
  temporário. Uma chave tem um contador por escopo; escopos iniciais são
  `login_origin`, `login_origin_account` e `token_redemption`. Não há IP nem username
  em texto simples. Atualização atômica, limites e resposta 429 ainda serão implementados.
- `accounts.password_hash`: agora anulável no modelo. O CHECK permite
  ausência somente enquanto a conta não está ativa e rejeita hash vazio. Uma conta
  suspensa pode continuar sem senha, inclusive se suspensa antes da ativação.
  Contas ativas precisam de valor não vazio; o serviço continua responsável por
  produzir e verificar um hash criptográfico válido.

Todos os novos registros usam UUID e datas UTC, sem exclusão em cascata.
Digests de 64 caracteres usam ASCII com comparação binária e `select: false`.
O modelo não guarda o segredo original nem fornece DTOs públicos. O tamanho no
banco não substitui a validação hexadecimal pelo serviço.

Sessões e links usarão SHA-256 de segredos aleatórios de 32 bytes. Para limites
baseados em IP/username, a direção é HMAC-SHA-256 com chave própria compartilhada
entre instâncias; um hash simples de identificadores previsíveis não os protege
adequadamente. Essa configuração ainda não foi criada, e a retenção/limpeza dos
registros será definida antes de expor os endpoints. Os índices de expiração
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

## 5. Sequência de implementação e validação

1. Hash e criação do primeiro ADM concluídos no commit `0513188`.
2. Persistência e entrega manual aprovadas; migration aplicada e restrições
   reais validadas. Commit da etapa aguarda revisão. Avaliar
   parsing de cookies, validação e limites e apresentar qualquer dependência
   com versão exata antes de instalar.
3. Implementar login, consulta da sessão, logout e guards; testar revogação,
   expiração, sessão falsa, fixação, CSRF, enumeração e limites concorrentes.
4. Implementar cadastro profissional exclusivo do ADM e convites, com testes
   reais de transação, token expirado/usado, duplo consumo e rollback.
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
