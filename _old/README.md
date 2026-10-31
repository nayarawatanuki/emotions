# Emotions

Aplicação para atividades de reconhecimento de emoções. O frontend usa React
com Vite; a API usa Express, Sequelize e MySQL.

## Ambiente

- Node.js 24 LTS.
- Yarn Classic 1.22.22.
- MySQL para os fluxos que dependem da API.

## Comandos

```sh
yarn install --frozen-lockfile
yarn dev
```

O frontend abre em `http://localhost:5173`. Em outro terminal, `yarn startBack`
inicia a API na porta 3000. O banco precisa estar configurado previamente;
iniciar a API não executa migrations.

```sh
yarn typecheck
yarn build
yarn preview
```

`typecheck` verifica os arquivos TypeScript. `build` executa essa verificação
e gera o frontend em `dist/`. `preview` serve esse build para inspeção local;
não substitui um servidor de produção.

## Migração para TypeScript

A migração é incremental. A entrada está em `src/index.tsx`; arquivos React
ainda não convertidos usam `.jsx`. Os estilos e demais módulos JavaScript
permanecem com `.js` até sua etapa de conversão.

A configuração usa `strict: true` para TypeScript e permite importar JavaScript.
Os arquivos JavaScript ainda não têm verificação de tipos (`checkJs: false`).
Portanto, o sucesso de `typecheck` não significa que toda a aplicação esteja
tipada. O backend também permanece em JavaScript nesta etapa.

Ainda não há suíte de testes automatizados configurada. A substituição do
Create React App não corrige as falhas funcionais, de segurança e de
acessibilidade identificadas no diagnóstico; elas exigem etapas próprias.

`Comandos.txt` contém anotações históricas anteriores à migração. Para executar
o projeto atual, use os comandos deste README.
