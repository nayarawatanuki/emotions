# Diretrizes do backend Emotions

Seguir integralmente `../.codex/agents.md` e as instruções da desenvolvedora.

## Arquitetura

- NestJS com TypeScript e Express, organizado por módulos de funcionalidade.
- Controllers recebem requisições; serviços concentram regras de negócio.
- Configurações ficam em `src/config/`; recursos compartilhados, em `src/common/`.
- Criar modelos e serviços quando houver uma responsabilidade real para eles.
- Não colocar regras de negócio no arquivo de inicialização ou em controllers.
- Não alterar banco, migrations, dependências ou lockfiles sem aprovação.

## Validação e segurança

- Usar `yarn typecheck`, `yarn lint`, `yarn test`, `yarn test:e2e` e `yarn build`.
- Configuração de inicialização e de testes HTTP deve compartilhar os mesmos controles.
- Nunca retornar stack traces, credenciais ou detalhes internos nas respostas.
- Não registrar dados pessoais ou credenciais em logs.
- Não ativar serviços externos de telemetria sem autorização explícita.
- Cada commit deve ser revisado e aprovado pela desenvolvedora.

## Estado atual

A base oferece somente liveness em `/health`; esse endpoint não verifica o banco.
Existe uma base de conexão TypeORM/MySQL, desativada por padrão.
O esquema inicial foi aplicado e validado, sem dados reais.
A unificação em nove entidades, com `activity_results` acompanhando realização
e desfecho, foi aplicada e validada. Permissões temporárias foram revogadas.
Autenticação, autorização e serviços transacionais do domínio não estão implementados.
As migrations usam credenciais separadas das da API e exigem execução explícita.
Não habilitar a conexão ou provisionar bancos sem autorização específica.
