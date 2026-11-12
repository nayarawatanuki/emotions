# Cadastro profissional e primeiro acesso

API concluída no commit `39fd85e`, de 10 de novembro de 2026. O fluxo
usa as tabelas existentes; nenhuma migration, permissão ou dependência foi alterada.

## Fluxo e contrato HTTP

| Endpoint | Autorização e entrada | Resultado |
| --- | --- | --- |
| `GET /professionals?after=<UUID>` | ADM com sessão; cursor opcional UUID v4 | 200 com até 25 identidades mínimas e `nextCursor` |
| `POST /professionals` | ADM com sessão e CSRF; JSON somente `name` e `username` | 201 com identidade administrativa mínima do profissional e link de ativação |
| `POST /professionals/:id/activation` | ADM com sessão e CSRF; UUID do perfil e JSON `{}` | 201 com um novo link, invalidando os anteriores ainda não consumidos |
| `POST /auth/activate` | Token de ativação e nova senha em JSON; origem e cabeçalho customizado | 204, sem login automático nem cookie novo |

Escritas seguem o contrato comum: `Origin` igual a `AUTH_ORIGIN`,
`Content-Type: application/json` e `X-Emotions-Request: 1`. As duas rotas do ADM
exigem também `X-CSRF-Token`. Papéis, estado, senha inicial e conta de destino não
podem ser fornecidos pelo cliente. Entradas extras são recusadas. Um profissional
ou visitante não pode cadastrar ou reemitir convites.

O username é aparado e convertido para minúsculas; nome é aparado sem mudar sua
capitalização. Ambos aceitam até 255 pontos de código Unicode válidos, sem
controles. Senhas mantêm a política existente: 15–128 pontos de código e até
512 bytes UTF-8, sem trim, normalização ou truncamento. O ADM não define a senha
profissional. Username duplicado gera 409 sem retornar o registro existente.

```mermaid
sequenceDiagram
    participant ADM
    participant API
    participant MySQL
    participant Profissional
    ADM->>API: Cadastro com sessão, CSRF, nome e usuário
    API->>MySQL: Transação: conta pendente + perfil + digest do token
    API-->>ADM: Identidade mínima e link com validade de 24 h
    ADM-->>Profissional: Entrega manual por canal confiável
    Profissional->>API: Token e senha escolhida
    API->>API: Argon2id fora da transação, com capacidade limitada
    API->>MySQL: Transação: revalidar, consumir token e ativar conta
    API-->>Profissional: 204; fazer login normal
```

## Diretório e interface administrativa

Incremento de 12 de novembro de 2026: o ADM usa `/workspace` para cadastrar,
listar e reemitir convites. A listagem é exclusiva do ADM, sem CSRF em leitura,
com `no-store` e verificação de sessão/origem pelo guard. Retorna somente
`id`, `accountId`, `name`, `username`, `status` e `archived`; nunca senha,
digest, sessão, convite ou identidade do ADM criador. Os estados ativo,
suspenso e arquivado são visíveis, mas não oferecem reemissão na interface.
A API continua verificando a elegibilidade no momento da escrita.

A paginação usa cursor UUID v4 em `after`, consulta parametrizada, ordenação
crescente pelo ID do perfil e 25 itens por página. Lê no máximo 26 linhas para
informar se existe outra página. A resposta é `{ items, nextCursor }`; `null`
encerra a navegação. Não há contagem total, busca, filtro ou ordenação por nome
neste incremento. Campos extras, cursor vazio/duplicado e valores inválidos
retornam 400. Inserções durante a navegação podem ficar antes do cursor; usar
Atualizar lista reinicia o percurso. Cadastro/reemissão também o reiniciam.

O cadastro solicita somente nome e usuário. A interface normaliza conforme o
contrato da API, trata duplicidade e recusa duplo envio enquanto há escrita em
andamento. Não repete POST automaticamente: em falha de rede, orienta conferir
a lista, pois a escrita pode ter sido concluída sem resposta ao navegador.

O convite é exibido em campo somente leitura, com destinatário, usuário,
validade no fuso do dispositivo e cópia explícita. Se Clipboard API não estiver
disponível/autorizada, o campo é selecionado para cópia manual. Não há envio
externo automático, storage ou recuperação de token pelo diretório. A página
mantém apenas o último convite em memória; ocultá-lo não revoga o token nem
limpa a área de transferência do dispositivo. Uma nova emissão substitui a
exibição anterior. Sair, recarregar ou perder autorização descarta a exibição.

A reemissão pede confirmação num `dialog` HTML nativo: mostra o destinatário,
informa a invalidação do anterior e a nova validade de 24 h. Foco inicial no
cancelamento, Escape cancela quando não há escrita e o foco retorna ao botão
original. Uma tentativa de rotação remove o segredo anterior da exibição,
pois uma falha de rede não garante que ele ainda seja válido. Conflitos por
ativação/arquivamento entre a listagem e a confirmação são tratados sem
sobrescrever senha ou histórico.

A sessão foi extraída para um hook usado na área protegida. Na revalidação,
o painel fica oculto e sem interação, mantendo seus componentes montados para
não perder um convite ao voltar à aba. Se a conferência falhar, a sessão e o
painel são removidos. Diálogo/escrita bloqueiam operações concorrentes da tela;
a expiração continua sendo observada e as permissões são autoritativas na API.

## Conta, perfil e histórico dos convites

O cadastro grava juntos `accounts` no estado `pending`, com `password_hash=NULL`,
`professionals` vinculado ao ADM criador e um `account_tokens` de finalidade
`activation`. Não insere dados de criança, atividade ou recompensa. Uma falha
em qualquer escrita reverte a conta, o perfil e o token da operação.

O ADM é conferido novamente na transação, inclusive sua sessão, revogação e
prazos. O guard inicial não substitui essa conferência. Na reemissão, as duas
contas são travadas por ordem de UUID antes de perfil, sessão e tokens. As mesmas
contas são travadas na mesma ordem pela ativação para serializar as disputas.

Somente conta profissional pendente, sem senha, com perfil não arquivado recebe
um novo link. A reemissão preserva os registros anteriores, marcando como revogados
os tokens de ativação não consumidos; tokens consumidos não são alterados.
Contas ativas ou suspensas e perfis arquivados não podem usar a reemissão como
recuperação de senha. Se a inserção do novo token falhar, a revogação anterior é
revertida junto: o link anterior conserva seu estado.

## Token e consumo único

O token tem 32 bytes de aleatoriedade nativa, em base64url canônico; somente seu
digest SHA-256 é persistido e excluído das seleções padrão. O segredo aparece no
fragmento do link, em `/activate-account#token=...`, somente na resposta de emissão
para o ADM. A origem é a configuração validada `AUTH_ORIGIN`, sem usar o cabeçalho
Host recebido. O segredo não é recuperável pelo servidor; uma nova emissão gera
outro token. Não há envio automático por e-mail ou serviço externo.

O endereço aponta para `/activate-account` no frontend. A tela implementa escolha
e confirmação de senha, consumo na API e orientação para login após sucesso.
O fragmento é removido antes de montar o roteador e o token fica somente em
memória. Recarregar exige reabrir o link original completo. Não há recursos de
terceiros nessa página nem persistência em localStorage/sessionStorage. O
[README do frontend](../../frontend/README.md) detalha proxy, execução e validação.

O prazo é exatamente 24 horas a partir do relógio UTC do MySQL. O serviço procura
um token válido antes do cálculo caro e revalida, sob locks, finalidade, prazo,
revogação, consumo, conta e perfil antes de gravar. O ADM emissor precisa continuar
ativo; se suspenso, o link não ativa a conta. Outro ADM ativo poderá reemitir o
convite no procedimento de administração correspondente, preservando o criador
original do perfil.

Senha e consumo são gravados na mesma transação. Um token pode ser consumido
somente uma vez, inclusive com duas conexões concorrentes. Tokens desconhecidos,
expirados, revogados, consumidos ou de recuperação recebem o mesmo 400 genérico.
A ativação não substitui a senha de uma conta já ativa. Após sucesso, outros
tokens não consumidos e eventuais sessões antigas dessa conta são revogados.
Não há autenticação automática: o titular faz login com sua senha nova.

Se a gravação do consumo falhar, a senha e o estado são revertidos, preservando
o link para outra tentativa. Não existe confirmação ou alteração por GET.

## Limites e organização

Ativação permite dez solicitações por peer TCP em 15 minutos, incluindo sucesso,
com contador compartilhado no escopo existente `token_redemption`. A chave usa
HMAC com contexto próprio, sem IP ou token em texto simples. Cabeçalhos de proxy
arbitrários continuam sem confiança. Respostas 429 informam `Retry-After`.

Login e ativação compartilham a mesma capacidade de no máximo dois cálculos
Argon2 simultâneos por processo, sem fila. Tokens desconhecidos, expirados,
revogados, consumidos ou de outra finalidade são recusados antes do hash.
O estado da conta e do perfil é revalidado depois do cálculo, sob locks.
Nenhum lock de conta/perfil/token é mantido durante o cálculo de senha.

`ProfessionalsModule` importa explicitamente a mesma instância dinâmica do
`AuthModule` criada na raiz. A autenticação exporta o serviço de ativação; não
foram tornados globais configuração, segredo ou providers por conveniência.
O teste confere que existe um único provider de capacidade. Os módulos privados
só são carregados quando a autenticação está habilitada.

## Validação e limites

Testes HTTP reais com MySQL cobrem permissões, CSRF, estado pendente, identidade,
digest privado, prazo, consumo único, reemissão, rollback, mudança de estado e
limites. Usam contas e sessões em transação externa com savepoints e rollback.

As disputas de consumo, cadastro duplicado e reemissão usam transações
independentes, com fixtures sintéticas temporariamente confirmadas. Os testes
exigem o banco local `emotions_development` vazio, removem somente seus IDs e
chaves HMAC exatos e conferem as doze tabelas vazias ao final. Um manifesto privado
no diretório temporário guarda apenas IDs e usernames sintéticos para recuperação
em interrupção; não guarda senha, token ou credenciais de banco e é removido após
a limpeza bem-sucedida. Nunca executar essas suítes em banco com dados reais.

Validação da API de ativação (`39fd85e`): tipos, lint e build passaram, com 207 testes
unitários, 10 HTTP independentes de banco e 94 testes com MySQL (311 no total).
A auditoria de 377 dependências não encontrou vulnerabilidades. No Chrome,
`/health` respondeu e `/auth/session` recusou acesso sem autenticação. Após os
testes, as doze tabelas de aplicação ficaram vazias, as três migrations
permaneceram aplicadas e a comparação do esquema não apontou alterações.

Edição/suspensão de contas, recuperação de senha, MFA, limpeza/retenção, HTTPS e proxy
de produção continuam em etapas próprias. A implementação local não declara
prontidão clínica, conformidade legal ou segurança absoluta. Tempos de atividade
e tentativas de crianças não são alterados por esse fluxo.

## Referências

A aleatoriedade, o armazenamento protegido, a finalidade e o uso único seguem
as direções do [OWASP para tokens de acesso/recuperação](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
O escopo e o compartilhamento explícito dos providers seguem os
[módulos do NestJS](https://docs.nestjs.com/modules). A validade de 24 h e a entrega
manual foram aprovadas para este projeto; não são valores universais das fontes.

## Validação do diretório e da interface administrativa

- Backend: tipos, lint, build, 215 testes unitários, 10 HTTP e 97 com MySQL.
- Frontend: tipos/build, lint, 32 testes nativos e integração real pelo proxy.
- A integração cobre login do ADM, listagem, cadastro, reemissão, recusa do
  convite anterior, ativação, conflito em conta ativa, sessão e logout.
- Chrome: cadastro, cópia, reemissão, cancelamento/Escape/retorno de foco,
  duplicidade, estados sem convite, logout, desktop e largura de 320 pixels.
- Inspeção visual usa fixtures em transação externa, com requisições serializadas
  nessa conexão de demonstração; não representa teste de carga. A suíte MySQL
  de concorrência já usa conexões independentes. Tudo foi revertido no final.
- Auditorias sem vulnerabilidades reportadas: 93 dependências no frontend e
  377 no backend. Nenhum pacote, lockfile, migration ou privilégio foi alterado.

A cópia nativa segue a [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
A consulta usa [QueryBuilder parametrizado do TypeORM](https://typeorm.io/docs/query-builder/select-query-builder/).
