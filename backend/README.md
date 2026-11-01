# Emotions — backend

API NestJS com TypeScript e Express, organizada por módulos de funcionalidade.

## Ambiente e comandos

Use Node.js 24 LTS e Yarn Classic 1.22.22. Dentro de `backend/`:

```sh
yarn install --frozen-lockfile
yarn start:dev
```

O padrão é `http://127.0.0.1:3000`. O frontend continua na porta 5173.
Copie `.env.example` para `.env` se precisar personalizar o ambiente. O arquivo
real é ignorado pelo Git. Os scripts de execução carregam `.env` pelo suporte
nativo do Node, sem sobrescrever variáveis já definidas no processo.

| Variável | Padrão | Valores aceitos |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, `production` |
| `HOST` | `127.0.0.1` | Endereço IP ou `localhost` |
| `PORT` | `3000` | Inteiro entre 1 e 65535 |

O endereço padrão limita o acesso à própria máquina. Configure explicitamente
outro endereço somente no ambiente de execução em que isso for necessário.

```sh
yarn typecheck
yarn lint
yarn test
yarn test:e2e
yarn build
yarn start:prod
```

`yarn run verify` executa as cinco verificações em sequência. Testes HTTP abrem portas
locais temporárias; um ambiente restrito pode exigir permissão para isso.

## Estrutura

```text
src/
├── common/
│   ├── filters/http-exception.filter.ts
│   └── middlewares/security-headers.middleware.ts
├── config/
│   ├── configure-app.ts
│   ├── environment.ts
│   └── environment.spec.ts
├── modules/
│   └── health/
│       ├── health.controller.ts
│       └── health.module.ts
├── app.module.ts
└── main.ts
test/
└── app.e2e-spec.ts
```

- `main.ts`: valida o ambiente, cria a aplicação e inicia o servidor.
- `configure-app.ts`: controles HTTP compartilhados pela aplicação e pelos testes.
- `AppModule`: compõe os módulos da aplicação.
- `HealthModule`: oferece somente a verificação de funcionamento do processo.
- `common/`: comportamentos compartilhados, sem regras de negócio dos módulos.

Serviços, modelos e DTOs entrarão junto com as funcionalidades que os utilizam.

## Contrato atual

```http
GET /health
200 OK
Content-Type: application/json

{"status":"ok"}
```

`/health` indica que a aplicação responde. Não verifica disponibilidade do banco,
integrações ou capacidade de atender às funcionalidades futuras.
A rota `/` e endereços desconhecidos retornam 404:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Recurso não encontrado."
  }
}
```

Erros são padronizados sem reproduzir mensagens de exceções ou stack traces.
O servidor registra apenas um aviso genérico quando ocorre um erro interno.
Uma estratégia de logs com diagnóstico e remoção de dados sensíveis será
avaliada conforme as próximas funcionalidades forem implementadas.

## Controles e limites desta etapa

- JSON limitado a 16 KB; corpos comprimidos não são aceitos.
- Cabeçalhos `nosniff`, proibição de enquadramento, política de referências e
  de conteúdo restrita e resposta sem cache.
- Cabeçalhos de identificação do Express e ETag desativados.
- Configurações inválidas impedem a inicialização.
- Encerramento de aplicação habilitado nos sinais de parada pelo Nest.
- Não há CORS liberado, arquivos estáticos ou telemetria externa configurados.

Esta base não contém autenticação, autorização, controle de tentativas,
persistência, validação de DTOs ou processamento de uploads. Não deve ser
apresentada como pronta para atender dados de crianças. HTTPS e configuração
de proxy serão definidos para o ambiente de implantação; não se deve presumir
que estes cabeçalhos substituam esses controles.

## Ferramentas do template

O gerador instalou Nest 12.3.2, Express 5.3.0, TypeScript 6.0.3, Vitest 4.1.12
e Oxlint 1.90.0. As ferramentas do template foram mantidas, com dois ajustes de segurança
aprovados após a auditoria inicial:

- Remoção de `@nestjs/mau` e do script `deploy`, não utilizados no projeto.
- Resolução seletiva `@nestjs/cli/minimatch: 11.0.3` em `package.json`.

A CLI 12.0.11 fixa minimatch 10.2.6, afetado por
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
A resolução usa uma versão principal diferente da solicitada pela CLI, e o Yarn
emite um aviso de incompatibilidade. Esse aviso não foi suprimido. Foram
verificados build, geração de módulo em modo simulado e o uso do helper de glob
da CLI com padrões, exclusões e diretório inexistente. Isso não demonstra
compatibilidade com todos os comandos ou configurações possíveis da CLI.

Reavaliar a resolução quando a CLI incorporar uma versão corrigida na própria
dependência. A resolução é um ajuste rastreável de segurança, não uma mudança
na API do Emotions. A auditoria após os ajustes reportou zero vulnerabilidades
conhecidas entre 351 dependências; isso não garante ausência de falhas no código.

Nenhum serviço de hospedagem ou telemetria externa foi configurado.
