# Cadastro profissional e primeiro acesso

API concluída no commit `39fd85e`, de 10 de novembro de 2026. O fluxo
usa as tabelas existentes; nenhuma migration, permissão ou dependência foi alterada.

## Fluxo e contrato HTTP

| Endpoint | Autorização e entrada | Resultado |
| --- | --- | --- |
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

Validação deste incremento: tipos, lint e build passaram, com 207 testes
unitários, 10 HTTP independentes de banco e 94 testes com MySQL (311 no total).
A auditoria de 377 dependências não encontrou vulnerabilidades. No Chrome,
`/health` respondeu e `/auth/session` recusou acesso sem autenticação. Após os
testes, as doze tabelas de aplicação ficaram vazias, as três migrations
permaneceram aplicadas e a comparação do esquema não apontou alterações.

Cadastro visual pelo ADM, recuperação de senha, MFA, limpeza/retenção, HTTPS e proxy
de produção continuam em etapas próprias. A implementação local não declara
prontidão clínica, conformidade legal ou segurança absoluta. Tempos de atividade
e tentativas de crianças não são alterados por esse fluxo.

## Referências

A aleatoriedade, o armazenamento protegido, a finalidade e o uso único seguem
as direções do [OWASP para tokens de acesso/recuperação](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
O escopo e o compartilhamento explícito dos providers seguem os
[módulos do NestJS](https://docs.nestjs.com/modules). A validade de 24 h e a entrega
manual foram aprovadas para este projeto; não são valores universais das fontes.
