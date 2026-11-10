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

A base pública oferece liveness em `/health`; esse endpoint não verifica o banco.
Existe uma base de conexão TypeORM/MySQL, desativada por padrão.
O esquema inicial foi aplicado e validado, sem dados reais.
A unificação em nove entidades, com `activity_results` acompanhando realização
e desfecho, foi aplicada e validada. Permissões temporárias foram revogadas.
Hash Argon2id nativo e criação local do primeiro ADM estão implementados.
Nenhum ADM real foi criado na validação; os testes usam fixtures revertidas.
Login adulto HTTP, sessões, CSRF, guard por papel e limites compartilhados estão
implementados, habilitados por AUTH_ENABLED e configuração validada. Os prazos
aprovados são 30 min de inatividade e 8 h absolutas. Cadastro profissional pelo
ADM, reemissão e ativação em 24 h estão implementados na API, sem nova migration.
Recuperação, frontend, acesso infantil e serviços de atividades continuam pendentes.
Login e ativação compartilham dois cálculos de senha simultâneos; a ativação tem
limite próprio por origem. Testes concorrentes de onboarding usam fixtures
sintéticas confirmadas, manifesto privado sem segredos e limpeza por IDs exatos.
Nenhum ADM real foi criado nos testes; contadores sintéticos de concorrência são
removidos por suas chaves específicas. Não carregar módulos privados quando a
autenticação estiver desativada.
A terceira migration foi aplicada e validada: sessões, tokens, limites e hash
anulável para contas não ativas. Existem doze tabelas da aplicação e duas
técnicas, sem dados reais. O ALTER temporário em accounts foi revogado.
A entrega de links pelo ADM e os prazos de ativação (24 h) e recuperação (30 min) foram aprovados.
As migrations usam credenciais separadas das da API e exigem execução explícita.
Não habilitar a conexão ou provisionar bancos sem autorização específica.
