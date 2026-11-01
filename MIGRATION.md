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

## Critérios de validação

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
