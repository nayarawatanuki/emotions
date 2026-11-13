# Emotions — frontend

React, TypeScript, React Router e Vite, com CSS nativo e Oxlint. Use Node.js 24
e Yarn Classic 1.22.22. Não há biblioteca de formulários ou de autenticação.

## Executar

Dentro de `frontend/`:

```sh
yarn install --frozen-lockfile
yarn dev
```

O endereço é **http://127.0.0.1:5173**. A porta é fixa: se ocupada, o Vite recusa
iniciar para evitar mudar a origem esperada pela API silenciosamente. Um processo
Vite antigo precisa ser reiniciado para receber a configuração de proxy nova.
Não misture `localhost` e `127.0.0.1` no mesmo fluxo.

Para login e ativação, MySQL e o backend novo devem estar ativos. No terminal
separado de `backend/`, com `.env` privado já configurado:

```sh
AUTH_ENABLED=true AUTH_ORIGIN=http://127.0.0.1:5173 yarn start:dev
```

O proxy do Vite encaminha `/api/*` para `http://127.0.0.1:3000`, removendo `/api`.
Preserva `Origin` e `Host`; não habilita CORS nem reescreve uma origem recusada.
`AUTH_ORIGIN` deve corresponder ao frontend, pois também gera o link de ativação.
Para uma API temporária em outra porta, use `EMOTIONS_API_PORT=3100 yarn dev`.
Essa variável só configura o servidor local, sem expor credenciais ao bundle.

Nenhuma conta real é criada automaticamente. O primeiro ADM continua sendo criado
pela desenvolvedora com `yarn admin:create-first` no backend. O ADM já pode cadastrar profissionais, listar contas e reemitir convites em
`/workspace`. A recuperação de senha ainda não foi migrada.

## Verificar

```sh
yarn lint
yarn test
yarn build
yarn preview
```

`yarn test` usa o runner nativo do Node, sem banco. O build verifica os tipos e gera
`dist/`. Preview serve o build em `http://127.0.0.1:4173`, com o mesmo proxy; para
testar autenticação nele, a API deve usar exatamente essa `AUTH_ORIGIN`.

A integração real é **opcional** e exige banco local `emotions_development` vazio,
backend compilado e dois processos temporários. Nunca executar com dados reais.

```sh
# Terminal em backend/, depois de yarn build:
AUTH_ENABLED=true AUTH_ORIGIN=http://127.0.0.1:5174 PORT=3100 yarn start:prod
# Outro terminal em frontend/:
EMOTIONS_API_PORT=3100 yarn dev --port 5174
# Terceiro terminal em frontend/:
yarn test:integration
```

O teste usa o cliente real pelo proxy: ativa um profissional sintético, recusa
segundo consumo, faz login, lê a sessão, sai e confere o bloqueio de outra origem.
O teste também entra como ADM, cadastra/lista um profissional, reemite o convite,
recusa o link anterior e recusa reemissão após a ativação. Cria fixtures temporárias e remove somente seus IDs, usernames e chaves de
contador exatos, conferindo as doze tabelas vazias no final. Antes das escritas,
gera manifesto privado `emotions-frontend-fixture-*.json` no diretório temporário
com identidades sintéticas, usuário planejado para o cadastro e digests de
contadores, sem senha/token/segredo. Se
interrompido, preserve esse manifesto para recuperação pontual; não apague dados
por nome genérico nem use limpeza total do banco. A API deve usar o mesmo segredo
do `.env` que o teste carrega. `FRONTEND_TEST_ORIGIN` permite outra porta IPv4 local.

## Organização e navegação

- `src/pages/`: páginas públicas, Workspace e composição das áreas Administration/ProfessionalCare.
- `src/components/`: marca, layout, senha, cadastro, diretório, convite e confirmação.
- `src/features/auth/`: contrato da API, token, política de senha e hook de sessão.
- `src/features/professionals/`: contratos, validação de respostas/entradas e situações.
- `src/services/`: transporte HTTP e erros públicos seguros.
- `src/index.css`: estilos globais e foco de teclado.
- `test/`: testes nativos sem banco e integração opcional.

| Rota | Comportamento |
| --- | --- |
| `/` | Apresentação e link de entrada |
| `/login` | Login adulto, validação e feedback |
| `/activate-account#token=...` | Leitura do convite e escolha/confirmação da senha |
| `/workspace` | Sessão, saída e painel de profissionais exclusivo do ADM |
| Outros caminhos | Página não encontrada com retorno ao início |

A área do ADM inclui cadastro, listagem paginada de profissionais e reemissão
com confirmação. A área profissional oferece cadastro, lista paginada e consulta das próprias
crianças; edição, fotos, acesso infantil e atividades continuam pendentes. A API continua sendo a autoridade de permissões.
O título acompanha a rota e o foco vai ao conteúdo em navegações internas.

## Sessão e convite

O navegador mantém o cookie HttpOnly, SameSite e Secure em HTTPS, emitido pela
API. O frontend não lê esse cookie e não persiste sessão, senha ou token em
localStorage/sessionStorage. CSRF e identidade ficam apenas na memória da área
protegida. A sessão é revalidada ao abrir essa área e ao retornar à aba/janela;
o vencimento local esconde o conteúdo e pede login. Não há polling de manutenção
da sessão, renovação infinita ou repetição automática de escritas.

O fragmento é removido **antes de montar o roteador**. O token fica em memória e
é descartado do estado após sucesso ou recusa de convite. Recarregar a página
exige reabrir o link completo original; isso não revoga o convite no banco. Uma
formatação válida apenas mostra o formulário: a validade real é decidida na API
ao enviar. A senha não é aparada, normalizada ou truncada; sua confirmação é local.
Ativação não faz login automático. Uma falha de rede pode ocorrer depois da
ativação: a mensagem orienta tentar o login, sem reenviar automaticamente.

## Hospedagem e acessibilidade

O proxy do Vite é local, não uma solução de produção. A hospedagem deve fornecer
HTTPS, servir `/api/*` pela mesma origem com o prefixo removido e preservar as
verificações de origem, cookies e headers. Deve reescrever rotas de páginas para
`index.html`, sem converter erros de `/api` em HTML. Configurar cache/no-store das
páginas sensíveis e headers de segurança da hospedagem exige validação própria.
Uma SPA não produz sozinha status HTTP 404 para rotas desconhecidas.

A interface usa labels HTML, autocomplete, foco visível, link de pular conteúdo,
feedback acessível, controles nativos e layout responsivo. Sem animações
obrigatórias, fontes remotas ou terceiros na página de ativação. A política de
referrer do documento e das requisições é `no-referrer`. O favicon reutiliza a
marca em SVG local. Revisão no Chrome não equivale a conformidade integral com
WCAG/ABNT; leitores de tela e implantação pública exigem validações adicionais.

Referências: [proxy do Vite](https://vite.dev/config/server-options.html#server-proxy),
[efeitos e limpeza no React](https://react.dev/reference/react/useEffect) e
[BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter).
O roteiro para retirar `_old/` está em `../MIGRATION.md`.

## Administração de profissionais

Após login como ADM, informe nome e usuário; a conta será criada pendente e o
convite ficará visível para entrega manual. O link é sensível: copie somente
para o destinatário correto. Ocultar convite remove a exibição, sem revogar
nem limpar a área de transferência. Não há envio automático ou persistência
no navegador. Apenas o último convite permanece disponível nessa página.

A listagem tem até 25 itens por página, com anterior/próxima e atualização desde
o início. A ordenação interna é por ID, não por nome ou data de cadastro.
Profissional pendente com perfil não arquivado tem Reemitir convite. O diálogo
informa que o anterior deixará de funcionar, abre com foco em Cancelar e pode
ser fechado por Escape antes da escrita. Contas ativas, suspensas ou arquivadas
não recebem essa ação; a API também valida o estado atual na confirmação.

Se o navegador perder a resposta de um cadastro, confira a lista antes de
repetir. Se perder uma reemissão, pode ser necessário gerar outro convite;
o anterior já pode ter sido invalidado. Nenhum POST é repetido automaticamente.
Na conferência da sessão o painel fica oculto, preservando o convite em memória;
falha de autorização, logout ou recarga removem o painel e o segredo exibido.

## Crianças na área profissional

O profissional autenticado vê Cadastrar criança e Suas crianças em `/workspace`.
Informe nome, usuário reservado, nascimento, responsável e acompanhamento ativo;
nível informado e observações são opcionais. Não há definição de senha nesta
etapa: a conta infantil fica pendente. O vínculo com o profissional é automático.

A lista tem 25 resumos por página. Ver cadastro consulta a ficha própria, com
responsável e observações; Fechar informações retorna o foco à lista. O ADM não
vê essas telas e também não pode consultar os endpoints clínicos. Os dados ficam
somente em memória, sem storage ou envio externo. Datas civis preservam o dia.

A integração opcional também cadastra uma criança sintética, consulta seu detalhe,
confere a projeção mínima da lista e entra como outro profissional para comprovar
lista vazia/404. O manifesto inclui o usuário infantil planejado; a limpeza remove
somente as identidades e o vínculo dessa fixture. A simulação de cookies remove
o cookie quando o backend o expira no logout.

[Contrato e limites do cadastro infantil](../docs/architecture/child-registration.md).
