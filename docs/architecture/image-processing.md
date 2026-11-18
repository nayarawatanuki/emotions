# Processamento de imagens

Estado em 17 de novembro de 2026: processador isolado implementado, em revisão,
na branch `chore/typescript-migration`. A desenvolvedora aprovou explicitamente
Sharp 0.35.5 após discutir dependências nativas e manutenção. O incremento é o
primeiro passo da base de arquivos; não é o fluxo completo de upload protegido.

## Problema e fronteira

O código antigo publica diretórios de uploads e confia no MIME enviado pelo
cliente; o limite de tamanho aparece comentado. A implementação não foi copiada.
Nenhuma imagem antiga ou dado clínico real foi lido, importado ou modificado.

`ImageProcessorService.normalize(Buffer)` trabalha somente com bytes. Não recebe
URL, nome ou caminho, nem conhece autenticação, Nest controllers, banco ou disco.
Retorna `{ bytes, mediaType: 'image/webp', width, height }`. Tipos do Sharp ficam
dentro do serviço/testes; sua substituição exige preservar o contrato e os testes,
sem espalhar chamadas da biblioteca pelas funcionalidades clínicas.

O serviço ainda não é carregado por módulos/rotas da aplicação. Não foram criados
endpoints, pastas de armazenamento ou associações à tabela `files`. Seu consumo
será integrado na etapa de upload, como singleton. Isso permite validar a parte
nativa antes de acrescentar persistência, limpeza e autorização de entrega.

## Política

| Limite ou decisão | Comportamento |
| --- | --- |
| Formatos | JPEG, PNG, WebP estáticos; SVG/GIF e demais formatos recusados |
| Entrada | Até 5 MiB, 12.000.000 pixels, 8192 pixels por lado |
| Saída | WebP lossless, até 5 MiB e 2048 pixels por lado |
| Geometria | Orientação EXIF aplicada, proporção mantida, sem corte ou ampliação |
| Metadados | EXIF/XMP/ICC originais descartados; nenhuma opção de retenção |
| Transparência | Preservada, validada por comparação de pixels RGBA |
| Concorrência | Dois trabalhos por instância, sem fila; futura integração singleton |
| Prazo | Timeout nativo configurado em 5 s de processamento, não prazo HTTP total |
| Falhas | Erros próprios com mensagens estáveis; nenhum erro nativo/arquivo em logs |

Assinaturas restringem os formatos antes de chamar o decodificador. Metadados
confirmam formato, dimensões e ausência de animação. PNG com `acTL` é recusado
explicitamente: libpng pode ler apenas o primeiro quadro de APNG. A imagem aceita
é realmente decodificada e codificada novamente, sem reutilizar o arquivo original.
Não há fetch externo. Não há API que aceite SVG para renderização.

A saída lossless evita perda adicional pela codificação; redimensionamento e
conversão de cor ainda podem alterar pixels. Imagens que ultrapassem o teto de
saída são recusadas, sem baixar qualidade silenciosamente. Erros do decodificador,
inclusive limites rejeitados por ele antes da leitura de dimensões, são traduzidos
para `invalid_image`; tamanho comprimido/lado/saída têm `image_too_large` quando
identificados pelo serviço. Capacidade esgotada usa `image_capacity`.

Esses limites reduzem consumo, mas não são um sandbox nativo nem garantia contra
falhas da biblioteca/processo. O orçamento de saída é conferido após a codificação;
o buffer pode ocupar mais que 5 MiB temporariamente. O timeout não limita fila de
libuv, todo o tempo de leitura de metadados ou duração HTTP. Capacidade não é
compartilhada entre instâncias/processos. Antes de exposição, são necessários
limites do corpo HTTP, autenticação/CSRF/origem, taxa, quota de armazenamento,
fila/concurrency operacional e revisão dos limites na hospedagem real.

## Instalação e manutenção

Instalação aprovada: `yarn add --exact sharp@0.35.5`. O pacote requer Node >=20.9.0;
execução local verificada com Node 24.21.0, macOS ARM64 e libvips 8.18.7. Não foi
validada implantação Linux/Windows. As entradas opcionais no lockfile representam
as plataformas suportadas; não significam que todos os binários foram carregados.

O processamento local não consulta um serviço de imagens. Instalação/reinstalação
pode depender do registro/cache de pacotes. Atualizações de Node, sistema,
biblioteca ou hospedagem devem passar por instalação, testes reais e auditoria.
A versão fixa e o lockfile evitam adotar nova versão automaticamente; não dispensam
acompanhar correções. Não há pacote de tipos separado ou ferramenta extra instalada.

## Validação realizada

- Tipos, lint com análise de tipos e build aprovados.
- 287 testes unitários, dos quais 22 específicos do serviço; 12 HTTP aprovados.
- JPEG/PNG/WebP reais gerados em memória, sem arquivos clínicos ou serviços externos.
- Transparência por comparação de pixels, orientação antes da remoção de metadados,
  limite de bytes de entrada e saída, resolução/pixels, arquivos corrompidos,
  formatos fora da lista, APNG, WebP animado, saturação e liberação de capacidade.
- Falha do encoder nativo simulada, com erro saneado e operação seguinte aceita.
  Isso não simula crash do processo nativo nem comprova SLA de timeout.
- Chrome: saída WebP sintética renderizada e comparada à entrada PNG, preservando
  aparência, proporção e transparência. Sem mudança de tela/fluxo no produto.
- MySQL e testes frontend não executados neste incremento: não há alteração neles.

## Pendência real da auditoria

A auditoria completa encontrou **4 ocorrências altas**, todas relacionadas ao
`picomatch@4.0.7` (408 pacotes auditados). Caminhos apresentados: Vite e CLI do Nest
via Angular Devkit. O recorte `yarn audit --groups dependencies --summary` encontrou
**1 ocorrência alta em 161 pacotes**, pelo caminho TypeORM → tinyglobby → picomatch.
A contagem é de caminhos reportados; não são cinco vulnerabilidades distintas.

O aviso [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf),
revisado/atualizado em 17/11/2026, descreve ReDoS por padrões extglob maliciosos,
afeta versões até 4.0.7 e informa ausência de versão corrigida. A versão 4.0.7
já estava no commit anterior; a instalação do Sharp não atualizou esse pacote.
Os caminhos reportados não são dependências do Sharp. Isso não equivale a uma
auditoria integral de libvips ou de todas as bibliotecas nativas incluídas.

A configuração atual do TypeORM usa entidades explícitas (`databaseEntities`),
sem glob fornecido por usuário. Não foi encontrado uso direto de picomatch/glob
nos fontes da aplicação. Essa análise delimita o uso atual, mas não demonstra
inexplorabilidade transitiva nem elimina o achado. Não há exceção/aceite implícito,
downgrade ou patch local aplicado. A meta de zero ocorrências não foi atingida.

Reavaliar publicação de correção e alternativas oficiais em etapa de segurança,
com autorização antes de mudar dependências. Não expor ferramentas de desenvolvimento
publicamente. Não propor atualização aleatória como correção de um aviso sem patch.

### Análise complementar do alcance e alternativas

A versão oficial mais recente conferida em 17/11/2026 continua sendo 4.0.7.
O recorte do frontend também reportou duas ocorrências altas em 93 pacotes:
Vite → picomatch e Vite → tinyglobby → picomatch. A conclusão anterior sobre
backend não deve ser interpretada como ausência do mesmo pacote no frontend.
Os caminhos do frontend pertencem às ferramentas de desenvolvimento/build;
a configuração do Vite está vinculada a 127.0.0.1. Isso não é prova de que todas
as formas de exploração das ferramentas foram descartadas.

Foi executado um ensaio sem banco usando os builders compilados atuais da API
e das migrations e a versão instalada do ORM. A chamada `tinyglobby.globSync`
foi substituída temporariamente por um sentinela que conta e interrompe chamadas,
restaurado em finally. O TypeORM montou 12 entidades/0 migrations na configuração
da API e 12 entidades/3 migrations na configuração de migrations, sem chamar
esse glob. Um controle positivo com diretório sintético de entidades foi
interceptado exatamente uma vez, antes de executar glob. Nenhum padrão malicioso
ou operação de banco foi executado. Roteiro temporário:
`/tmp/emotions-picomatch-reachability.mjs`.

Esse ensaio cobre a descoberta de metadados nessas configurações, não toda a
execução da aplicação, da CLI ou do Vite. Não altera a classificação do aviso e
não justifica uma exclusão de auditoria. Uma futura troca para strings/globs de
entidades/subscribers/migrations exigirá nova análise.

Alternativas avaliadas:

| Alternativa | Avaliação |
| --- | --- |
| Correção oficial publicada | Preferida; ainda não disponível na release conferida. Requer nova auditoria e testes quando existir. |
| Downgrade | Não resolve: o aviso inclui todas as versões até 4.0.7. |
| Trocar TypeORM, Vite ou Nest | Mudança arquitetural ampla; não demonstrou eliminar todos os caminhos. Não recomendada só por este aviso. |
| Substituir picomatch por glob nativo | Não é substituição compatível de API/semântica para as dependências consumidoras. Exigiria alterações e regressão próprias. |
| Fork/patch local | Acrescenta responsabilidade de manter código de terceiro e verificar a correção. Não foi aplicado; PR aberto não equivale a correção estável revisada. |
| Continuar desenvolvimento local com pendência explícita | Possível decisão temporária, mantendo o achado aberto e sem declarar meta de zero atingida. Decisão autorizada posteriormente pela desenvolvedora, com advertência e mitigação; não é aceite para produção clínica. |

Decisão posterior: a desenvolvedora autorizou manter o pacote com advertência e
aplicar proteções viáveis. A mitigação fica documentada na etapa de segurança
do picomatch; o aviso não foi corrigido ou suprimido.

Recomendação: preservar o processador de imagens, registrar o achado com evidências
e acompanhar a correção oficial. Se a condição de zero ocorrências for obrigatória
antes de qualquer commit, o commit permanece pendente; não há atualização oficial
verificada que possa ser instalada para satisfazer essa condição agora. Não foi
criado ignore, filtro para esconder o aviso ou substituição não autorizada.

## Etapas seguintes

1. Manter a advertência e reavaliar a pendência de auditoria nas próximas etapas,
   conforme decisão explícita da desenvolvedora, sem considerá-la resolvida.
2. Implementar armazenamento privado, configuração e limpeza de falhas/órfãos.
3. Receber upload somente após autenticação/origem/CSRF, com limites de corpo e taxa.
4. Associar arquivos ao mesmo profissional em transação e entregar bytes após
   autorização; evitar diretório público e URLs permanentes sem controle de acesso.
5. Integrar a foto infantil e, depois, imagens de atividades/recompensas, com texto
   alternativo pertinente ao contexto e validação no Chrome.

Cada incremento exige revisão e aprovação do commit. Retenção, backups,
armazenamento de produção e acesso infantil continuam decisões próprias.

## Referências

- [Instalação do Sharp](https://sharp.pixelplumbing.com/install/).
- [Construtor e limites](https://sharp.pixelplumbing.com/api-constructor/).
- [Saída e metadados](https://sharp.pixelplumbing.com/api-output/).
- [Aviso de segurança do picomatch](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
