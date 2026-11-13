# Cadastro e consulta de crianças

Cadastro e consulta concluídos no commit `43f996b`, edição no `b6e2720a6`.
Arquivamento reversível implementado em 13 de novembro de 2026, em revisão. Usa as
entidades existentes `accounts`, `professionals` e `children`, sem migration,
dependência, importação de dados antigos ou alteração de privilégios.

## Escopo e referência antiga

As referências são `_old/src/backend/routes/Kids.js`, `KidController.js` e a
página `PsycAcess/addKid`. Foram preservados nome, usuário, nascimento,
responsável, acompanhamento ativo, nível informado e observações. A listagem
antiga não filtrava por profissional e o código de acesso era comparado sem
proteção adequada. Esses comportamentos não foram copiados.

O vínculo é obrigatório: um profissional acompanha várias crianças e cada
criança pertence a um único profissional. O ADM gerencia contas profissionais,
mas não recebe acesso clínico. O usuário identifica a futura conta infantil;
esta etapa não cria código de acesso, senha, convite ou sessão infantil.
Foto, transferência e acesso infantil continuam separados. Arquivamento reversível
é uma operação própria aprovada, descrita abaixo.
Nenhum endpoint de exclusão foi acrescentado.

## Contrato HTTP

| Endpoint | Papel | Resultado |
| --- | --- | --- |
| `POST /children` | Profissional ativo | 201: ficha criada com identidade infantil pendente |
| `GET /children?after=<UUID>&archived=true/false` | Profissional ativo | 200: até 25 resumos próprios e `nextCursor` |
| `PATCH /children/:id` | Profissional ativo e proprietário | 200: ficha atualizada, com nova revisão; 409 se houve conflito |
| `PATCH /children/:id/archive` | Profissional ativo e proprietário | 200: estado de arquivamento atualizado; 409 se revisão/estado conflitante |
| `GET /children/:id` | Profissional ativo e proprietário | 200: ficha própria; 404 se ausente ou de outro profissional |

Autenticação deve estar habilitada. Sem ela, os módulos privados não são
carregados e as rotas retornam 404. O guard exige sessão adulta válida, conta
ativa, perfil profissional não arquivado e origem permitida. Escrita exige
JSON, `Origin` exata, `X-Emotions-Request: 1` e CSRF. As respostas da API usam
`no-store`, sem stack, SQL, observações ou identidade em mensagens de erro.

### Entrada de cadastro

O JSON tem exatamente estes campos:

| Campo | Regra |
| --- | --- |
| `name` | Texto obrigatório aparado, até 255 pontos de código válidos |
| `username` | Obrigatório, aparado e convertido para minúsculas; até 255 pontos de código |
| `dateOfBirth` | Data civil real `YYYY-MM-DD`, de 1000-01-01 até a data UTC atual do MySQL |
| `guardianName` | Texto obrigatório aparado, até 255 pontos de código |
| `treatmentActive` | Booleano estrito; não aceita strings como `on`, `off` ou `true` |
| `reportedLevel` | Texto opcional aparado, até 255 pontos de código, ou `null` |
| `notes` | Texto opcional aparado, até 2.000 pontos de código, ou `null` |

Campos opcionais são enviados como `null` quando vazios. Campos de identidade
não aceitam controles ou surrogates isolados. Observações permitem quebra de
linha e tabulação, mas recusam os demais controles e surrogates isolados. Não
há normalização clínica, diagnóstico automático ou categoria obrigatória para
o nível informado. Observações são texto, renderizado pelo React sem HTML.

O servidor recusa campos extras, incluindo `professionalId`, `accountId`, papel,
senha e referência de foto. O profissional é resolvido pela sessão, nunca pelo
corpo da requisição. Duplicidade de usuário, inclusive com outra classe de
conta, retorna 409 genérico sem revelar a identidade existente.

## Transação e separação por proprietário

O cadastro trava a conta do profissional, seu perfil e a sessão, nessa ordem;
reconfere papel, estado, arquivamento e prazos dentro da transação. Só então
cria a conta `child/pending/password_hash=NULL` e a ficha vinculada ao perfil.
Nenhuma senha fictícia é gravada. `photo_file_id` e `archived_at` começam nulos.
Falha na gravação da ficha reverte também a identidade.

Listagem e detalhe incluem o filtro de proprietário na própria consulta,
relacionando `children.professional_id` ao perfil cujo `account_id` corresponde
à sessão. Não buscam primeiro todas as crianças para filtrar no frontend.
A consulta de um ID alheio responde exatamente como um ID inexistente: 404.
ADM e visitantes recebem 403/401 antes de ler dados clínicos.

A paginação usa o validador UUID v4 agora compartilhado com o diretório de
profissionais. Ordena pelo ID da criança e lê no máximo 26 linhas para produzir
uma página de 25. `nextCursor=null` indica o fim. `after` vazio, duplicado,
inválido ou acompanhado por campos extras é recusado. Não há busca, ordenação
por nome ou contagem total. Cadastros durante uma navegação podem ficar antes
do cursor; Atualizar lista reinicia o percurso.

## Edição e proteção contra sobrescrita

O detalhe e a resposta do cadastro incluem `revision`, uma impressão SHA-256
calculada com os dados da ficha, ID e timestamps existentes de criança/conta,
lidos com a precisão de microssegundos do MySQL. Não é senha, token de acesso,
contador persistido ou trilha de auditoria. Não foi criada coluna ou migration.
A autorização continua independente dessa revisão. O diretório mínimo não a inclui.

`PATCH /children/:id` exige os sete campos do cadastro e a `revision` recebida,
com exatamente 64 caracteres hexadecimais minúsculos. A interpretação do PATCH
é atualizar esse conjunto editável; proprietário, arquivamento, foto, papel,
estado e senha não podem ser enviados. O usuário pode ser alterado, respeitando
a unicidade global. O papel e o estado pendente da conta infantil permanecem.

Primeiro é resolvida somente a identidade técnica de um registro próprio.
Na transação, todas as contas envolvidas são travadas em ordem de UUID, depois
perfil, sessão e criança. Papel/estado/prazos, vínculo atual e arquivamento são
revalidados. A revisão atual é calculada após os locks, com o mesmo manager da
transação. Uma revisão diferente retorna 409 sem gravar. A atualização de nome/
usuário e dos campos de acompanhamento é atômica; falha na segunda escrita
reverte a primeira. Contas ou fichas de outro profissional não podem ser editadas.

A tela reaproveita o formulário, preenchendo os dados atuais e mantendo o
rascunho em memória. Salvar mostra a ficha retornada; Cancelar edição descarta
o rascunho sem gravar. Conflito ou falha de rede mantém o texto digitado. Como
409 também pode representar usuário duplicado ou ficha arquivada, a mensagem
não afirma uma causa única nem sobrescreve dados automaticamente.

Após erro, a ação explícita **Descartar rascunho e consultar ficha atual** busca
a ficha antes de substituir a exibição. Se a consulta falhar, o rascunho continua
preservado; falha de autorização continua removendo a área protegida. Não há
repetição automática de PATCH. A consulta explícita é a forma de obter a versão
atual após um conflito; cancelar sozinho volta à informação antes carregada.
Sair ou recarregar a página descarta rascunhos, sem persistência no navegador.

Este incremento altera o estado atual da ficha. Não guarda cópias anteriores
para restauração ou auditoria clínica; isso exige desenho e aprovação próprios.
Atividades, tentativas, recompensas e resultados não são alterados pela edição.

## Arquivamento reversível

A operação substitui a exclusão física do sistema antigo. Somente o proprietário
pode arquivar/desarquivar, após confirmação explícita. O corpo tem exatamente
`archived` booleano e `revision` de 64 hexadecimais minúsculos, sem campos de
proprietário, conta, acompanhamento ou timestamp. Usa a mesma transação da edição:
locks ordenados de contas, perfil e sessão, depois ficha; propriedade, papel,
estado, prazo e revisão conferidos antes da alteração. Revisão antiga ou estado
já solicitado retorna 409. Não há repetição automática nem exclusão em cascata.

`GET /children` e `archived=false` mostram apenas não arquivadas; `archived=true`
mostra apenas arquivadas. O filtro combina com `after`, recusa duplicidade,
valores não canônicos e campos extras. Os dois grupos têm a mesma projeção,
isolamento, limite e cursor. Trocar de grupo reinicia o percurso na interface.
A ficha arquivada permanece acessível no detalhe próprio, com aviso e sem edição.

Arquivar define `archived_at`, suspende conta infantil que esteja ativa e revoga
suas sessões ainda não revogadas, tudo atomicamente. Pendentes/suspensas mantêm
o estado; senha e nome de usuário são preservados. Desarquivar apenas limpa o
arquivo da ficha: não reativa credenciais nem sessões e não altera
`treatmentActive`, proprietário, foto, atividades, tentativas ou resultados.
A suspensão de acesso é independente da informação clínica de acompanhamento.

A autenticação infantil continua pendente e recusada no login adulto. Tokens do
esquema atual são exclusivos de profissionais, sem tokens infantis a reemitir ou
revogar. Futuros fluxos infantis deverão conferir `archived_at` na transação antes
de ativar credenciais, criar sessão ou executar atividades; o presente incremento
não implementa esses fluxos nem um desbloqueio automático após desarquivamento.

O diálogo HTML nativo recebe nome/descrição, mantém foco inicial em Cancelar e
bloqueia confirmação/cancelamento durante envio. Quando a sessão é revalidada,
o diálogo fecha enquanto o painel está oculto e reabre se o acesso for confirmado.
Erro/conflito oferece Consultar ficha atual; a resposta atual substitui a ficha e
fecha o diálogo, exigindo nova abertura/confirmação para repetir a escrita.
Se a leitura falhar, o diálogo permanece. Cancelar não grava nem refaz consultas.

Arquivar não define retenção, exclusão definitiva ou histórico de quem fez a
mudança. O campo existente guarda apenas o estado/timestamp atual; políticas de
retenção e auditoria precisam de desenho próprio antes de uso clínico real.

## Retorno mínimo e interface

A lista retorna somente `id`, `name`, `username`, `dateOfBirth`,
`treatmentActive` e `archived`. Responsável, nível e observações só são retornados
no detalhe próprio ou nas respostas de cadastro/edição. Hash, ID da conta, proprietário,
referência de arquivo e dados de sessão não integram o DTO clínico.

Em `/workspace`, o profissional vê cadastro, lista e consulta. O ADM continua
vendo o painel administrativo. A ficha abre numa seção com foco no título;
Fechar informações retorna o foco à lista. O formulário usa labels, fieldset,
checkbox e data nativos; valida no cliente e no servidor, com feedback acessível.
Nascimento é preservado como data civil, sem conversão para o dia anterior no
fuso do dispositivo. O frontend exibe datas com calendário em UTC apenas para
formatar o mesmo dia armazenado.

Nenhum POST é repetido automaticamente. Se a resposta do cadastro for perdida,
a mensagem pede conferir a lista antes de repetir. A API assegura unicidade.
Dados da ficha permanecem somente em memória; não há localStorage,
sessionStorage, envio externo, telemetria ou registro de observações em logs.
Na revalidação da sessão, o painel fica oculto; falha de autorização remove a
área protegida. Isso reutiliza o controle já implementado na etapa anterior.

Os estilos comuns de layout e botões foram movidos para seus componentes reais
(`AccessLayout.css` e `Workspace.css`), para a área profissional não depender
implicitamente do CSS administrativo. O visual anterior permanece preservado.

## Validação

- Backend: tipos, lint e build; 265 testes unitários, 12 HTTP e 134 com MySQL.
- Frontend: tipos/build e lint; 39 testes nativos e 1 integração pelo proxy real.
- Total: 451 testes aprovados.
- Testes específicos cobrem vínculo pela sessão, entrada forjada, data inválida
  ou futura, unicidade, criação sem senha, rollback e mudança de estado entre
  guard e escrita (suspensão, perfil arquivado ou sessão revogada).
- Paginação cobre 26 crianças próprias e uma de outro profissional, sem vazamento
  ou repetição. O DTO resumido não contém observações, nível nem responsável.
- A integração real usa dois profissionais: um cadastra/consulta; o outro recebe
  lista vazia e 404; o ADM recebe 403. A simulação de cookies remove o cookie de
  sessão ao receber a expiração no logout, como o navegador.
- Edição: recusa revisão antiga, campos privilegiados e alterações alheias;
  testa atomicidade, unicidade e mudanças de acesso após o guard. A integração
  real disputa duas gravações com a mesma revisão: uma salva e a outra recebe 409.
- Arquivamento: rollback da suspensão/revogação, proprietário/ADM/visitante,
  estados após guard, CSRF/origem, filtros e paginação de ambos os grupos,
  edição bloqueada e restauração sem reativação. Comparação antes/depois confirma
  preservação de foto, atividade, alternativas, recompensa, resultado e tentativa.
- Integração real: edição versus arquivamento com a mesma revisão aceita uma só
  gravação. Chrome: cancelar/Escape, arquivar, lista separada, consulta, desarquivar,
  foco, conflito/consulta atual, logout e largura de 320 pixels.
- Chrome da edição: formulário preenchido, cancelamento, salvamento, conflito
  provocado por outra solicitação, texto mantido e consulta explícita da versão
  atual, foco, logout e 320 pixels.
- Chrome do cadastro (`43f996b`): formulário vazio, preenchimento sintético, nascimento em ano bissexto,
  acompanhamento, observações, cadastro, consulta pela lista, foco e retorno,
  logout, desktop e largura de 320 pixels.
- Auditorias atuais sem vulnerabilidades reportadas: 93 dependências no
  frontend e 377 no backend, sem alteração de pacote ou lockfile.
- Pós-teste: doze tabelas vazias, três migrations aplicadas, nenhuma divergência
  de esquema e nenhum manifesto de fixture pendente.
- A demonstração visual usa transação externa com requisições serializadas numa
  única conexão e rollback final; não é teste de carga nem uso de dados reais.

## Limites

A conta infantil permanece pendente e não pode usar o login adulto. O cadastro
não libera atividades nem entrega credenciais. Histórico de alterações, transferência, foto, retenção/exclusão definitiva,
autenticação infantil e atividades precisam de etapas próprias.
Não foi feita auditoria completa com leitor de tela nem validação de produção,
retenção clínica ou conformidade legal. `_old/` continua necessário como referência.

Referências técnicas: [input de data nativo](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date)
e [transações do TypeORM](https://typeorm.io/docs/advanced-topics/transactions/).

Referência da edição: [método PATCH](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/PATCH).
