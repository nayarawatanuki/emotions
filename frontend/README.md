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
pela desenvolvedora com `yarn admin:create-first` no backend. A interface de
cadastro/reemissão profissional e a recuperação de senha ainda não foram migradas.

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
Cria fixtures temporárias e remove somente seus IDs, usernames e chaves de
contador exatos, conferindo as doze tabelas vazias no final. Antes das escritas,
gera manifesto privado `emotions-frontend-fixture-*.json` no diretório temporário
com identidades sintéticas e digests de contadores, sem senha/token/segredo. Se
interrompido, preserve esse manifesto para recuperação pontual; não apague dados
por nome genérico nem use limpeza total do banco. A API deve usar o mesmo segredo
do `.env` que o teste carrega. `FRONTEND_TEST_ORIGIN` permite outra porta IPv4 local.

## Organização e navegação

- `src/pages/`: Home, Login, ActivateAccount, Workspace e NotFound.
- `src/components/`: Brand, layout de acesso e campo de senha reutilizável.
- `src/features/auth/`: contrato da API, token de convite e política de senha.
- `src/services/`: transporte HTTP e erros públicos seguros.
- `src/index.css`: estilos globais e foco de teclado.
- `test/`: testes nativos sem banco e integração opcional.

| Rota | Comportamento |
| --- | --- |
| `/` | Apresentação e link de entrada |
| `/login` | Login adulto, validação e feedback |
| `/activate-account#token=...` | Leitura do convite e escolha/confirmação da senha |
| `/workspace` | Consulta obrigatória da sessão, identificação e saída |
| Outros caminhos | Página não encontrada com retorno ao início |

A área interna é uma base de acesso; não entrega ainda cadastros visuais,
atividades ou dados de crianças. A API continua sendo a autoridade de permissões.
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
