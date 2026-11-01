# AGENTS.md — Emotions

## 1. Diretrizes fundamentais — Prioridade máxima

Este projeto deve seguir padrões elevados de qualidade de software, segurança, acessibilidade, organização e manutenção.

As diretrizes desta seção têm precedência sobre preferências de implementação e convenções antigas do projeto.

### 1.1. Clean Code e qualidade

- Aplicar princípios de Clean Code, SOLID quando pertinente, DRY, KISS e separação de responsabilidades.
- Não introduzir gambiarras, soluções temporárias injustificadas, código duplicado ou abstrações desnecessárias.
- Utilizar nomes claros, consistentes e semanticamente adequados.
- Evitar funções extensas, responsabilidades misturadas e complexidade acidental.
- Remover código morto e implementações obsoletas dentro do escopo autorizado.
- Priorizar legibilidade, previsibilidade, testabilidade e facilidade de manutenção.
- Não preservar código ruim apenas para evitar mudanças trabalhosas.
- Não refatorar código que não tenha relação com a etapa atual sem autorização.

**Qualidade técnica é obrigatória. Complexidade desnecessária não é qualidade.**

### 1.2. Semântica e acessibilidade

Seguir como referências obrigatórias:

- ABNT NBR 17225:2025.
- WCAG 2.2, níveis A e AA.
- Boas práticas de HTML semântico e acessibilidade em React.

Considerar:

- Estrutura semântica e hierarquia de títulos.
- Navegação por teclado e gerenciamento de foco.
- Labels, nomes e descrições acessíveis.
- Contraste, estados e feedback visual.
- Mensagens dinâmicas acessíveis.
- Compatibilidade com tecnologias assistivas.
- Responsividade e diferentes formas de interação.

Preferir elementos HTML nativos. Utilizar ARIA quando necessário, sem substituir indevidamente a semântica nativa.

Validar acessibilidade com ferramentas automatizadas e testes manuais pertinentes. Não declarar conformidade integral apenas com resultados de Lighthouse.

### 1.3. Dependências e atualização tecnológica

- Priorizar versões estáveis, atuais, mantidas e recomendadas oficialmente.
- Consultar compatibilidade, documentação e requisitos antes de escolher versões.
- Não manter dependências obsoletas apenas para evitar refatorações.
- Aceitar migrações significativas quando tecnicamente justificadas.
- Não instalar pacotes desnecessários.
- Preferir soluções nativas quando forem adequadas.
- Utilizar Yarn como gerenciador de dependências do projeto, respeitando a versão e a configuração existentes até que uma migração seja aprovada.

**Antes de instalar, remover ou atualizar qualquer dependência, solicitar autorização explícita.**

Apresentar previamente o motivo, a versão recomendada, os impactos, os riscos e as alterações necessárias.

Não modificar dependências ou lockfiles sem aprovação.

### 1.4. Segurança

A meta é manter zero vulnerabilidades conhecidas nas dependências e no código, dentro das verificações disponíveis.

- Executar auditorias de dependências quando pertinente.
- Investigar e corrigir vulnerabilidades identificadas.
- Evitar bibliotecas abandonadas ou sem manutenção adequada.
- Validar entradas e tratar erros adequadamente.
- Considerar autenticação, autorização e controle de acesso.
- Proteger dados sensíveis, credenciais e variáveis de ambiente.
- Aplicar boas práticas contra XSS, SQL Injection, CSRF e demais riscos relevantes.
- Avaliar riscos em uploads, armazenamento e exposição de arquivos.
- Não desabilitar verificações de segurança para fazer uma implementação funcionar.
- Não ocultar vulnerabilidades ou classificá-las como irrelevantes sem análise.

Relatar vulnerabilidades identificadas, limitações das verificações e riscos residuais.

Não afirmar que um projeto é absolutamente seguro apenas porque uma auditoria não encontrou problemas.

### 1.5. Explicação e autorização

Antes de implementar alterações relevantes:

1. Analisar o código existente.
2. Explicar o problema identificado.
3. Apresentar a solução recomendada.
4. Informar os arquivos e comportamentos que serão afetados.
5. Solicitar esclarecimentos quando houver dúvidas que possam alterar a decisão técnica.

Após implementar:

1. Explicar o que foi modificado.
2. Justificar as decisões relevantes.
3. Informar como a solução foi validada.
4. Apontar limitações ou pendências.

Não tomar decisões arquiteturais importantes presumindo preferências da desenvolvedora.

### 1.6. Testes e validação

Ao concluir cada etapa aplicável:

- Executar testes automatizados existentes e verificações estáticas pertinentes.
- Verificar erros de compilação, lint e execução.
- Testar a funcionalidade no Google Chrome.
- Verificar comportamento visual, responsividade, navegação e acessibilidade.
- Testar cenários de sucesso, erro e estados intermediários relevantes.
- Conferir se funcionalidades anteriores continuam funcionando.

Quando houver acesso a ferramentas de automação de navegador, utilizá-las de forma apropriada.

Se não for possível executar o Chrome, informar explicitamente essa limitação e fornecer instruções para validação manual.

**Uma etapa não deve ser considerada validada sem evidências dos testes realizados.**

### 1.7. Alterações incrementais e Git

Organizar o desenvolvimento em etapas pequenas, coerentes e verificáveis.

- Cada etapa deve representar uma responsabilidade técnica bem delimitada.
- Evitar misturar correções, refatorações, atualizações de dependências e mudanças visuais sem necessidade.
- Planejar alterações para permitir commits atômicos e descritivos.
- Verificar o diff antes de concluir cada etapa.
- Não modificar arquivos fora do escopo aprovado.
- Não descartar alterações locais.
- Não executar commit, push, merge, reset ou clean sem autorização explícita.
- Não trocar de branch sem autorização.

Ao finalizar uma etapa, apresentar:

- Resumo das alterações.
- Arquivos modificados.
- Testes realizados e resultados.
- Pendências, caso existam.
- Sugestão de mensagem de commit seguindo Conventional Commits, quando apropriado.

**Não iniciar automaticamente a próxima etapa. Aguardar aprovação.**

---

## 2. Contexto do projeto

Emotions é um projeto acadêmico de conclusão de curso (TCC), atualmente em modernização para integrar o portfólio pessoal My Golden Code Garden.

O objetivo é construir uma aplicação funcional, moderna, segura, acessível e tecnicamente consistente.

O projeto pode passar por modernizações profundas quando justificadas. Não deve ser tratado como legado intocável.

### Stack conhecida

- Frontend: React, Vite e TypeScript.
- Backend: Node.js, NestJS, Express e TypeScript.
- Banco de dados: MySQL.
- Persistência e uploads: migração e integração serão definidas nas etapas aprovadas; o código arquivado usa Sequelize e Multer.
- Gerenciamento de dependências: Yarn.

Confirmar versões, estrutura e configurações nos arquivos reais antes de recomendar mudanças.

---

## 3. Arquitetura

### Frontend

Adotar organização inspirada em Atomic Design, com pragmatismo.

- Separar componentes por responsabilidades reais.
- Preservar e melhorar componentes genéricos reutilizáveis.
- Criar componentes filhos quando houver ganho de organização.
- Evitar fragmentação excessiva.
- Manter mappings fora da pasta de componentes, respeitando a estrutura atual.
- Separar apresentação, transformação de dados e regras de negócio quando apropriado.
- Não reorganizar estilos apenas por preferência pessoal.
- Preservar funcionalidades e comportamentos existentes, salvo alteração aprovada.

### Backend

Manter a separação de responsabilidades do MVC, com o backend organizado em módulos de funcionalidade do NestJS, conforme decisão aprovada pela desenvolvedora.

- Usar módulos para agrupar funcionalidades, controllers para receber requisições e serviços para regras de negócio; manter modelos e persistência separados.
- Centralizar configurações em `src/config/` e comportamentos compartilhados em `src/common/`, sem criar abstrações ou pastas sem necessidade.
- Evitar regras de negócio diretamente nas rotas.
- Manter validações e tratamento de erros consistentes.
- Na migração da persistência, respeitar as convenções do ORM aprovado e revisar a compatibilidade com os modelos e migrations existentes.
- Não modificar estrutura ou dados do banco sem autorização.

---

## 4. Fluxo de trabalho obrigatório

Para cada solicitação:

1. **Analisar:** compreender a implementação atual e o escopo.
2. **Propor:** explicar a abordagem recomendada.
3. **Confirmar:** solicitar autorização quando houver decisões relevantes, dúvidas ou alterações de dependências.
4. **Implementar:** modificar apenas o necessário para a etapa aprovada.
5. **Validar:** executar verificações técnicas e testar no Chrome quando aplicável.
6. **Revisar:** inspecionar o diff e possíveis regressões.
7. **Documentar:** explicar alterações e sugerir o commit.
8. **Aguardar:** não avançar para outra etapa sem aprovação.

---

## 5. Comunicação

- Responder em português brasileiro.
- Ser técnico, objetivo, didático e transparente.
- Explicar decisões de forma que a desenvolvedora aprenda durante o processo.
- Não apresentar soluções improvisadas como definitivas.
- Não concordar automaticamente com propostas tecnicamente inadequadas.
- Recomendar alternativas melhores quando houver justificativa.
- Perguntar quando houver ambiguidades relevantes.
- Evitar respostas extensas quando uma explicação objetiva for suficiente.

---

## 6. Princípio final

O Emotions deve representar uma evolução técnica real.

Não buscamos apenas código que execute, mas código bem projetado, seguro, acessível, compreensível, testável e sustentável.

**Clean Code, segurança, acessibilidade e qualidade não são etapas opcionais de acabamento: fazem parte de cada implementação.**

Nenhuma melhoria justifica perder o controle sobre as alterações, comprometer funcionalidades existentes ou introduzir complexidade sem benefício concreto.