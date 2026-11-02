# Migração do Emotions

## Forma de trabalho

Cada etapa termina com revisão do diff, validação técnica e explicação do
resultado. O commit depende da aprovação da desenvolvedora. Dependências novas
ou atualizadas também precisam de aprovação antes da instalação.

O diretório `_old/` é uma referência temporária. Suas funcionalidades serão
migradas por responsabilidade, com correções de segurança e acessibilidade.
Não se deve copiar automaticamente a implementação anterior.

## Progresso

- [x] Arquivar o código anterior preservando as alterações locais.
- [x] Criar o frontend com Vite, React e TypeScript.
- [x] Habilitar TypeScript estrito e verificações de acessibilidade no Oxlint.
- [x] Validar o build e o lint da base e visualizar o template no Chrome.
- [x] Criar a apresentação do Emotions e a base de rotas públicas.
- [x] Preparar o backend NestJS/TypeScript modular com configuração por ambiente.
- [ ] Revisar o modelo de dados, as permissões e a integração de persistência.
- [ ] Implementar autenticação e autorização no servidor.
- [ ] Migrar os formulários de acesso e integrar as sessões.
- [ ] Migrar cadastro, listagem, edição e exclusão de crianças.
- [ ] Migrar atividades, alternativas e recompensas.
- [ ] Migrar uploads e entrega protegida de imagens.
- [ ] Migrar execução das atividades e registro de resultados.
- [ ] Migrar administração e revisar permissões por perfil.
- [ ] Validar os fluxos completos e retirar as referências ao código antigo.
- [ ] Remover `_old/` com aprovação explícita.

As etapas podem ser subdivididas em commits menores conforme a implementação.
Alterações de estrutura ou dados do banco exigem autorização específica.

## Página inicial e base de navegação — concluída

- Página em português, com marca e ilustração SVG próprias.
- Tema inspirado nas conexões entre peças e nas diferentes emoções.
- CSS nativo, sem animações automáticas ou fontes remotas.
- Atalho para o conteúdo, hierarquia de títulos e foco visível.
- React Router 8.5.1: página inicial em `/` e fallback para URLs desconhecidas.
- Título e foco atualizados nas mudanças de página.
- Login e integração com a API permanecem para as próximas etapas.

Validações realizadas: TypeScript e build de produção, Oxlint, revisão de diff,
contrastes principais e inspeção no Chrome. No navegador, foram verificados o
atalho de conteúdo, navegação por teclado, página não encontrada, retorno ao
início e layout em 375 × 667. A auditoria do frontend reportou zero
vulnerabilidades conhecidas entre 93 dependências.

Não foi realizada avaliação com leitor de tela nem uma auditoria completa de
acessibilidade. O código antigo continua sujeito às limitações abaixo.

Commit aprovado: `b2aa361fe`.

## Base do backend — concluída

- Template NestJS criado com ESM, Express, Vitest e Oxlint.
- Módulo `Health` com `GET /health`, sem acesso ao banco.
- Ambiente validado, com endereço padrão `127.0.0.1` e porta `3000`.
- Configuração HTTP compartilhada entre servidor e testes.
- JSON limitado a 16 KB, sem aceitar corpos comprimidos.
- Respostas de erro padronizadas, sem detalhes internos.
- Cabeçalhos básicos de proteção e remoção de identificação do Express.
- 19 testes de ambiente e 10 testes HTTP passaram.
- Verificação de tipos, lint com análise de tipos e build passaram.
- `/health` conferido no Chrome usando o servidor compilado.

A auditoria inicial reportou 24 ocorrências: 8 altas, 11 moderadas e 5 baixas.
Os caminhos apontam para `@nestjs/mau` (23) e `@nestjs/cli > minimatch` (1).
Com aprovação da desenvolvedora, Mau e seu script de deploy foram removidos.
A dependência da CLI recebeu a resolução seletiva `minimatch@11.0.3`.
A auditoria final reportou zero vulnerabilidades conhecidas entre 351 dependências.

A resolução cruza uma versão principal e produz um aviso explícito do Yarn.
Build, geração simulada de módulo e padrões de glob usados pela CLI foram
verificados. A resolução deve ser reavaliada quando a CLI incorporar a correção.
Não foi comprovada compatibilidade com todos os comandos possíveis da CLI.

`yarn run verify` reúne tipos, lint, testes unitários, testes HTTP e build.
O nome evita colisão com o comando nativo `yarn check` do Yarn Classic.

O backend ainda não oferece autenticação, autorização, persistência ou uploads.

Commit aprovado: `d04fd3aa0`.

## Modelo de dados e permissões — proposta em revisão

A desenvolvedora confirmou: um profissional acompanha várias crianças e cada
criança pertence a exatamente um profissional.

Também confirmou:

- Somente o ADM cadastra os profissionais.
- O profissional cria as atividades especialmente para cada criança, sem
  atividades prontas fornecidas pelo sistema.
- Cada atividade possui exatamente uma recompensa e permite até três tentativas por execução.
- O profissional pode resetar a atividade, liberando uma nova execução sem apagar
  os registros anteriores, somente quando a última execução estiver finalizada,
  com acerto ou após três erros. Tentativas, tempo e resultado pertencem a cada execução.
- Após três erros, a criança recebe uma imagem carinhosa e mensagem de incentivo.
- Todas as tentativas têm seu tempo contabilizado, sem limite de tempo ou
  pressão por velocidade no fluxo infantil.

O fluxo antigo foi conferido: a recompensa aparece no ramo de acerto, mas não
existe encerramento após três erros. O contador pode ser reiniciado e a chamada
que atualizaria o estado da atividade está comentada. A proposta documenta essas
lacunas. O desfecho definido é encerrar a execução após o terceiro erro com imagem
e mensagem de acolhimento, preservando o resultado e impedindo reinício automático.
O reset é uma ação explícita do profissional, somente após a finalização e sem
execução aberta. Não interrompe nem zera tentativas em andamento.
A recompensa de acerto e o feedback de acolhimento são distintos. A proposta
registra duração por tentativa e total, sem tempo máximo para responder.

- `docs/architecture/data-model.md`: relações, tipos, integridade, escopo de
  autorização, correspondência com o código antigo e decisões pendentes.
- `docs/architecture/persistence-options.md`: comparação de integrações MySQL,
  recomendação preliminar e critérios antes de instalar ou migrar.

Nenhuma entidade persistida, dependência, migration ou dado do banco foi alterado.
Propostas ainda não confirmadas estão identificadas como recomendações.

## Base de conexão TypeORM/MySQL — aprovada para commit

- Pacotes aprovados e instalados: `@nestjs/typeorm@12.0.2`, `typeorm@1.1.2`
  e `mysql2@3.24.6`, com versões exatas e lockfile atualizado pelo Yarn.
- Configuração de banco validada, conexão desativada por padrão e testes HTTP
  independentes de um servidor MySQL.
- TLS com verificação de certificado; conexão sem TLS somente em loopback
  fora de produção. Credenciais obrigatórias e rejeição do usuário `root`.
- Pool de até cinco conexões, timeout de conexão de cinco segundos, UTC,
  `utf8mb4`, números grandes como strings e múltiplas instruções desativadas.
- Sincronização, remoção de esquema, migrations automáticas e logs SQL desativados.
- Tipos, lint, 55 testes unitários, 10 testes HTTP e build passaram.
- API compilada conferida no Chrome: `/health` retorna `{"status":"ok"}`.
- Falha de conexão conferida com porta local indisponível e credenciais fictícias:
  inicialização encerrada com código 1, sem expor detalhes privados do driver.
- Auditoria reportou zero vulnerabilidades conhecidas entre 377 dependências.
  Permanecem os avisos documentados de Yarn Classic e da resolução de minimatch.

Nenhum banco, usuário, tabela, migration ou dado foi criado ou alterado.
Ainda falta validar conexão real e TLS no ambiente isolado, após aprovação
do provisionamento; a base de conexão não equivale à persistência do domínio.
Não houve mudança no frontend. Commit e push desta etapa foram autorizados
pela desenvolvedora após a revisão das alterações e validações.

## Esquema completo — aplicado, validado e aprovado para commit

A desenvolvedora solicitou preservar todos os campos e fluxos do banco antigo,
acrescentando as definições confirmadas, em vez de criar uma base mínima.

- Conferidos os cinco models, cinco migrations e formulários de criança/atividade.
- Nome da tabela de resultados ajustado para `activity_results`, conforme preferência da desenvolvedora.
- Dez schemas TypeORM tipados, distribuídos por funcionalidade: contas,
  profissionais, crianças, arquivos, atividades, alternativas, recompensas,
  execuções, tentativas e resultados.
- Correspondência de todos os campos antigos documentada em `backend/database/README.md`.
- Migration inicial congelada preparada com FKs, índices, checks e colunas
  geradas para unicidade de alternativa correta e execução aberta.
- Roteiros separados para status somente de leitura e execução explícita com
  usuário de migrations próprio, bloqueio concorrente e erros sem detalhes privados.
- Nenhuma dependência instalada ou lockfile alterado; apenas novos scripts Yarn.
- UTC conferido em três conexões reais; nenhum fuso global do servidor alterado.
- Migration aplicada com `emotions_migrator`, com privilégios próprios no banco novo.
- Dez tabelas de domínio e duas técnicas criadas. Nenhum registro antigo importado.
- Tipos, lint, 82 testes unitários, 10 testes HTTP, 29 testes reais de integridade
  e build passaram. As fixtures sintéticas foram revertidas; tabelas de domínio vazias.
- Segunda execução aplicou zero migrations; status confirmou a primeira aplicada.
- Comparação do esquema com os mapeamentos não apontou mudanças pendentes.
- Corrigidos retorno textual de GET_LOCK e leitura de DATE sem deslocamento de fuso,
  com testes de regressão. Exclusividade do bloqueio conferida em duas conexões.
- API compilada com as novas entidades conferida no Chrome: `/health` responde.

Aplicação do SQL, provisionamento da conta de migrations e testes reais das
constraints foram concluídos com autorização. A estrutura cobre o domínio,
mas seus serviços transacionais e endpoints ainda não estão implementados.
Nenhum registro ou arquivo antigo será migrado automaticamente.

## Unificação da realização e desfecho — aplicada e aprovada para commit

- A desenvolvedora aprovou uma tabela única chamada `activity_results`.
- O registro acompanha liberação, andamento e finalização, com desfecho nulo
  enquanto aberto. Cada repetição cria outro registro e preserva os anteriores.
- Tentativas permanecem em `activity_attempts`, vinculadas por `result_id`;
  quantidade e tempo total são derivados, sem colunas de totais duplicados.
- Novo mapeamento com nove entidades e segunda migration versionada, preservando
  a primeira já aplicada. O ajuste interrompe antes do DDL se houver dados.
- As três tabelas afetadas foram inspecionadas e estavam vazias.
- A segunda migration foi aplicada com as permissões temporárias autorizadas,
  que foram revogadas ao terminar. A conta da API permaneceu intacta.
- Tipos, lint, 85 testes unitários, 10 testes HTTP, 29 testes reais e build passaram.
- Esquema com nove tabelas de domínio e duas técnicas, sem diferenças para os
  mapeamentos. Reexecutar o runner aplicou zero migrations; as duas constam no status.
- Fixtures revertidas; o banco antigo não foi alterado.
- Commit e push desta etapa foram aprovados após a revisão do esquema unificado
  e dos resultados das verificações.

## Persistência de autenticação — aplicada e validada, aguardando commit

- Aprovados entrega manual de links pelo ADM, ativação em 24 h e recuperação em 30 min.
- Adicionadas entidades de sessões, tokens profissionais e contadores por escopo;
  digests privados, índices de expiração e restrições de datas e papéis.
- Preparado hash anulável para contas não ativas, com CHECK para hash não vazio
  em contas ativas. O serviço continua responsável pela validade criptográfica.
- Terceira migration congelada aplicada com autorização, preflights e reversão
  protegida. ALTER temporário apenas em accounts, já revogado. Nenhum dado real
  foi criado ou modificado; snapshot prévio somente da estrutura salvo localmente.
- Tipos, lint, build, 134 testes unitários, 10 HTTP e 43 MySQL passaram.
  As doze tabelas da aplicação continuaram vazias após rollback das fixtures.
- Todas as CHECKs mapeadas ENFORCED, zero diferenças de esquema, três migrations
  aplicadas e zero mudanças ao repetir o runner após revogar o ALTER temporário.
- API inicializada com MySQL; Chrome confirmou `/health` com `{"status":"ok"}`.
  A instância temporária foi encerrada. O down não foi executado no MySQL.
- Nenhuma dependência ou lockfile alterado; login HTTP e emissão/consumo de links
  continuam para etapas posteriores.

## Critérios de validação

### Autenticação — hash e criação do primeiro ADM concluídos (`0513188`)

- Revisados os campos e estados atuais de `accounts` e o cadastro profissional.
- Implementados Argon2id assíncrono nativo do Node 24.21.0 e comando interativo
  `yarn admin:create-first`, sem pacote adicional.
- Comando cria o primeiro ADM ativo em transação sob bloqueio MySQL e recusa qualquer
  ADM existente. Entrada de senha oculta, com confirmação e cancelamento.
- Nenhum ADM real foi criado pelo agente; fixtures de teste são revertidas.
- Documentados primeiro acesso, recuperação, sessões revogáveis, CSRF, limites,
  futuras alterações de banco e etapas de implementação em
  `docs/architecture/authentication.md`.
- Entrega manual dos links pelo ADM aprovada na preparação da persistência
  de autenticação, sem coleta de e-mail nesta etapa.
- Medição exploratória nativa com dados sintéticos: 78, 71 e 70 ms por hash com
  64 MiB, três passagens e paralelismo um. Não representa teste de carga.
- Nenhuma dependência, endpoint, migration ou estrutura de banco foi alterada.
- Tipos, lint, 118 testes unitários, 10 HTTP, 33 de MySQL e build passaram.
  Os testes MySQL incluem criação do primeiro ADM dentro de savepoint, hash verificável e
  disputa de bloqueio por conexões diferentes, com transação externa revertida.
- Terminal real: senha permaneceu oculta, Ctrl+C cancelou antes da conexão e
  entrada redirecionada foi recusada. Chrome: `/health` retornou `{"status":"ok"}`.

### Provisionamento MySQL local — aprovado para commit

- Inspeção no Workbench: MySQL 8.0.46 na porta 3306, `partial_revokes=0`,
  sem conflito com o banco ou a conta propostos.
- Banco vazio `emotions_development` criado com autorização, usando
  `utf8mb4` e `utf8mb4_0900_ai_ci`. O banco legado foi preservado.
- Usuário `emotions_app@localhost` criado pela desenvolvedora; conexão TCP
  real validada via TypeORM, com credenciais somente no `.env` ignorado pelo Git.
- SHOW GRANTS da conta confirmou apenas SELECT, INSERT, UPDATE e DELETE
  no nome exato do banco, além de USAGE global. Nenhuma tabela foi criada.
- API compilada iniciou com banco habilitado e `/health` respondeu no Chrome.
- Tipos, lint, 55 testes unitários, 10 testes HTTP e build passaram novamente.
- Roteiros de inspeção e provisionamento e instruções de recuperação parcial
  preparados em `backend/database/setup/`, sem senhas versionadas.
- Na conclusão dessa etapa de provisionamento, entidades e migrations ainda eram
  pendentes; foram implementadas e validadas na etapa de esquema completo acima.
  TLS remoto e serviços de persistência do domínio continuam pendentes.

### Verificações gerais

- TypeScript e lint sem erros; build de produção funcionando.
- Cenários de sucesso, erro e carregamento avaliados em cada funcionalidade.
- Testes automatizados para regras e integrações relevantes.
- Verificação no Chrome, incluindo navegação por teclado e responsividade.
- Revisão semântica, foco, nomes acessíveis, mensagens e contraste.
- Auditoria de dependências e revisão dos controles de segurança aplicáveis.
- Limitações registradas, sem tratar verificações parciais como conformidade.

## Condições para remover `_old/`

- Todos os fluxos necessários foram migrados e validados.
- O novo código e os comandos de execução não dependem de `_old/`.
- Migrations e seeders necessários têm um destino definido no novo backend.
- Uploads locais têm um destino definido sem publicação de dados pessoais.
- A documentação explica instalação, configuração, execução e validação.
- A remoção foi revisada e aprovada antes de executar qualquer exclusão.

## Limitações conhecidas do arquivo antigo

O backend arquivado não oferece autenticação e autorização adequadas. Senhas
eram armazenadas em texto simples e o seeder contém credenciais demonstrativas.
Ele não deve ser disponibilizado publicamente. A troca da senha fixa por
`DB_PASSWORD` no arquivo arquivado não remove a credencial do histórico Git.

Os uploads e `db.js.local` continuam somente no disco, ignorados pelo Git.
Não devem ser apagados junto com `_old/` sem uma decisão sobre sua preservação.
