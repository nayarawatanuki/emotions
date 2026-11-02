# Autenticação e acesso — implementação incremental

Consulta técnica: 2 de novembro de 2026. O primeiro incremento, aprovado pela
desenvolvedora, implementa hash e criação local do primeiro ADM. Nenhuma conta
real foi criada, nenhuma dependência foi adicionada e nenhuma estrutura de
banco foi alterada.
As seções seguintes continuam como propostas; o canal de entrega do primeiro
acesso ainda aguarda confirmação.

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

## 1. Senhas e primeiro ADM — implementado, aguardando revisão

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

Recomendação inicial, aguardando confirmação do canal de entrega:

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
conta, emissor, expiração e consumo/revogação. Proposta de validade: ativação
24 horas e recuperação 30 minutos. São valores de produto a aprovar.
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

## 4. Persistência que será necessária — ainda não criada

| Alteração proposta | Finalidade |
| --- | --- |
| `auth_sessions` | Conta, digest único da sessão, datas de início/atividade/expiração/revogação |
| `account_tokens` | Ativação e recuperação com finalidade, digest único, emissor, prazo e consumo |
| `auth_rate_limits` | Contadores/janelas compartilhados entre processos, sem depender da memória de uma instância |
| `accounts.password_hash` | Permitir ausência enquanto pendente; exigir hash para conta ativa por CHECK |

Uma conta pendente ainda não tem senha definida. Não gravar hash fictício ou
senha escondida apenas para satisfazer NOT NULL. A mudança de nulidade só será
necessária na etapa de convites, com migration revisada e executada separadamente.
As contas ativas continuam exigindo credencial protegida.

Planejar índices, retenção e limpeza de sessões/tokens/limites expirados junto
com essa migration. Identificadores de limite não devem expor username ou IP
em texto simples; a estratégia de pseudonimização e sua chave serão revisadas.
Eventos de segurança terão logs estruturados com dados mínimos, sem telemetria
externa; sua retenção precisa ser definida antes da implantação.

## 5. Sequência de implementação e validação

1. Aprovar hash e criação do primeiro ADM; implementar, testar, revisar e aprovar seu commit.
2. Aprovar ativação/recuperação, tabelas e políticas; preparar a migration antes
   de aplicá-la. Avaliar parsing de cookies, validação e limites e apresentar
   qualquer dependência com versão exata antes de instalar.
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
