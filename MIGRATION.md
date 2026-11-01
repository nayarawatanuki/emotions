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
- [ ] Preparar o backend TypeScript com MVC e configuração por ambiente.
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

## Página inicial e base de navegação — aguardando revisão

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
