# Picomatch — advertência e mitigação

## Decisão em 17/11/2026

A desenvolvedora autorizou manter o picomatch com advertência e aplicar proteções
viáveis enquanto aguarda uma correção. Essa decisão permite continuidade do
desenvolvimento; não transforma o aviso em falso positivo nem é aprovação para
produção clínica. Não há prazo prometido para a correção de terceiros.

Aviso aberto: [GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
A release oficial conferida é 4.0.7; o aviso inclui versões <=4.0.7 e não informa
versão corrigida. O risco descrito é bloqueio do event loop por padrões extglob
maliciosos (ReDoS). Não se trata de uma falha específica do processamento de fotos.

## Ocorrências observadas

| Recorte da auditoria | Resultado | Caminhos reportados |
| --- | --- | --- |
| Backend completo | 4 altas / 408 pacotes | Vite e CLI Nest via Angular Devkit |
| Backend produção | 1 alta / 161 pacotes | TypeORM → tinyglobby → picomatch |
| Frontend completo | 2 altas / 93 pacotes | Vite → picomatch; Vite → tinyglobby → picomatch |

Essas contagens são caminhos reportados do mesmo aviso, não sete falhas distintas.
A versão 4.0.7 já constava no lockfile anterior à inclusão do Sharp. Não foi
aplicado ignore, downgrade, fork, patch de node_modules ou substituição de pacote.
As auditorias continuam falhando por esse aviso; não declarar zero vulnerabilidades.
O resultado de Yarn/npm também não substitui análise de bibliotecas nativas.

## Proteções aplicadas

### Descoberta de metadados do backend

`ExplicitMetadataDataSource` exige arrays de referências importadas para entidades,
migrations e subscribers. Strings, globs e listas em formato de objeto são recusados.
Entidades aceitam EntitySchema reconhecido pelo próprio TypeORM ou classes;
migrations/subscribers aceitam classes. Não há inferência de caminho por entrada.

A checagem ocorre antes de initialize conectar e novamente antes de buildMetadatas,
incluindo alterações por setOptions. Erros não exibem caminhos/padrões informados.
A API, o comando do primeiro ADM e as ferramentas de status/execução de migrations
usam essa classe. Isso não altera migrations, dados ou permissões do banco.

Os testes montam os metadados reais da API (12 entidades) e migrations (12 entidades,
3 migrations) com o glob loader do ORM interceptado. Nenhum glob é chamado. Um
controle positivo separado confirma a interceptação do comportamento upstream.
Testes negativos confirmam recusa antes da conexão e rechecagem após setOptions.
Não executam padrões maliciosos nem precisam abrir banco para esses cenários.

Esse é um controle de configuração da aplicação, não um sandbox para código
malicioso de dependências. Outras conexões criadas fora dessa classe não ficam
automaticamente protegidas. Reavaliar ao adicionar ferramentas ou inicializações.
Não cobre todas as funções transitivas do ORM e não corrige o matcher vulnerável.

### Ferramentas de desenvolvimento do frontend

Vite dev e preview usam loopback e CORS desativado. Um plugin local verifica a
configuração resolvida, já com sobrescritas da CLI, e recusa hosts fora de
127.0.0.1/localhost/::1, host booleano e qualquer configuração CORS diferente de
false. Não basta manter um valor padrão seguro que `--host` possa sobrescrever.

Os testes usam o resolvedor real do Vite. Comandos reais `yarn dev --host 0.0.0.0`
e `yarn preview --host 0.0.0.0` foram recusados antes de abrir servidor. A execução
normal em loopback, proxy, build, integração e navegação no Chrome passaram.
Não há mudança na política de origem/CSRF da API e nenhum CORS foi aberto nela.

Essas ferramentas não são o servidor de publicação. Os controles reduzem exposição
acidental, mas não tornam seguro processar projetos/padrões não confiáveis. Acesso
local, DNS/proxy, túneis, configuração de containers e futuras alterações de plugins
precisam de avaliação própria; loopback não é garantia de isolamento absoluto.

## Validação da entrega conjunta

- Backend: 294 unitários, 134 MySQL e 12 HTTP, tipos/lint/build aprovados.
- Frontend: 52 testes nativos e 1 integração real Vite/API/MySQL, lint/build aprovados.
- Total: 493 testes; os 22 casos de imagem permanecem incluídos nos unitários.
- Chrome: página inicial e acesso carregaram normalmente pelo Vite restrito.
- Conferência final: 12 tabelas da aplicação vazias, 3 migrations e 0 alterações
  de esquema pendentes. Servidores temporários de teste encerrados.
- Nenhum ADM real criado, nenhuma foto/ficha real usada e `_old/` preservado.

## Manutenção e risco residual

Rever este aviso nas auditorias das próximas etapas, antes de atualizar Vite,
TypeORM/Nest/CLI e antes de qualquer implantação. Não há monitoramento automático
ou tarefa agendada configurada. A decisão temporária deve ser reavaliada se o uso
do pacote mudar, surgir evidência de exploração ou uma correção ficar disponível.

Quando houver versão oficialmente corrigida, analisar compatibilidade, pedir a
aprovação de dependência, atualizar pelo Yarn e repetir tipos, lint, build, testes,
auditorias e os controles de exposição. Não remover a advertência apenas porque
uma ferramenta mudou a contagem; verificar os caminhos e o aviso correspondente.
