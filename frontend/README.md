# Emotions — frontend

React, TypeScript e Vite, com CSS nativo e verificações pelo Oxlint.

## Executar

Use Node.js 24 e Yarn Classic 1.22.22. Dentro de `frontend/`:

```sh
yarn install --frozen-lockfile
yarn dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

```sh
yarn lint
yarn build
yarn preview
```

O build verifica os tipos e gera `dist/`. Preview serve o build localmente.

## Organização

- `src/pages/`: páginas da aplicação e seus estilos.
- `src/components/`: componentes reutilizáveis, separados por responsabilidade.
- `src/index.css`: estilos globais e foco de teclado.
- `src/App.tsx`: composição da aplicação.

## Etapa atual

A página inicial apresenta a identidade visual e o propósito do projeto.
Os links internos levam à seção de apresentação. Login e integração com a API
ainda não estão implementados.

## Navegação

React Router 8.5.1 é usado no modo declarativo com `BrowserRouter`.

- `/`: página inicial.
- Outros caminhos: página não encontrada, com retorno ao início.

O título do documento acompanha a rota. Ao mudar de página sem recarregar o
documento, o foco vai para o conteúdo principal. Os links de seção continuam
usando âncoras HTML nativas.

Na hospedagem, URLs da aplicação precisam ser reescritas para `index.html`.
A página não encontrada é renderizada pelo cliente; essa configuração estática
não produz, por si só, um status HTTP 404 para URLs desconhecidas.

A interface usa HTML semântico, foco visível e ilustrações decorativas ocultas
das tecnologias assistivas. Não usa animações automáticas, fontes remotas nem
serviços externos. Essas escolhas não equivalem a uma declaração de
conformidade integral de acessibilidade.

O roteiro e os critérios para retirar `_old/` estão em `../MIGRATION.md`.
