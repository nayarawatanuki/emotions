# ☁️ Armazenamento de produção e recuperação

## 🌷 Contexto

O MySQL guarda a associação entre ficha, profissional e chave privada do WebP.
O armazenamento local recusa configuração em produção. A rota autenticada
já entrega o arquivo ao profissional responsável. Fotos vinculadas a fichas
arquivadas voltam a ficar acessíveis quando a ficha é restaurada.

## 🧩 Alternativas ao S3 e ao disco da aplicação

O [card geral da migração](https://github.com/nayarawatanuki/emotions/issues/2)
prevê substituir o AWS S3. Para o portfólio, o objetivo é manter o fluxo
completo sem contratar um serviço de imagens e permitir que a aplicação
rode sem depender de um diretório persistente próprio.

| Opção | Implicação para o Emotions |
| --- | --- |
| MySQL com `MEDIUMBLOB` | Reutiliza o banco atual. Permite gravar os bytes e a associação à ficha na mesma transação. Aumenta o tamanho do banco e dos backups. |
| Supabase Storage privado | Acrescenta um serviço para os bytes e mantém o vínculo no MySQL. O plano gratuito consultado oferece 1 GB e pode pausar o projeto por inatividade. O provedor informa que envia aviso ao proprietário cerca de uma semana antes da pausa e uma confirmação depois. |
| Cloudinary | Oferece plano gratuito com créditos de uso. Exige uma integração de entrega autenticada e a conciliação com o MySQL. O fornecedor informa uso de S3 e Google Cloud para armazenamento. |

### ☁️ MySQL para as fotos — aprovado

Guardar os WebPs normalizados no MySQL, em tabela separada dos metadados,
vinculada por chave estrangeira a `files`. Manter o limite atual de 5 MiB,
verificar o tamanho de pacote de cliente e servidor e deixar os bytes fora
das consultas de diretório. A leitura continua pela mesma rota da API, com
autorização no servidor. Uma transação deve gravar os bytes, registrar o
arquivo e atualizar o vínculo com a ficha. A política de arquivamento
continua aplicável.

Essa opção elimina a necessidade de contratar armazenamento adicional para
a execução local completa. A demonstração pública pode continuar estática,
com dados sintéticos. Uma eventual demo pública com backend ainda depende
de hospedagem compatível com MySQL e dos limites disponíveis.

A quarta migration cria `stored_image_bytes` com um `MEDIUMBLOB` por
registro de `files` e limite de 5 MiB imposto pelo banco. O esquema é aditivo.
A reversão exige a tabela vazia e a API parada. O upload e a leitura ainda
usam o armazenamento local. A integração futura exige testes de autorização,
concorrência e rollback, medição do tamanho do banco e um novo ensaio de
restauração. Inventariar os WebPs existentes antes de qualquer migração de
dados. O ensaio abaixo registra o modelo anterior de banco e diretório separado.

- [MySQL: tipos binários](https://dev.mysql.com/doc/refman/8.0/en/string-type-syntax.html)
- [MySQL: limites de pacote](https://dev.mysql.com/doc/refman/8.0/en/packet-too-large.html)
- [Supabase: cotas](https://supabase.com/docs/guides/platform/billing-on-supabase) e [pausa por inatividade](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Cloudinary: planos](https://cloudinary.com/documentation/billing_and_plans) e [infraestrutura de armazenamento](https://cloudinary.com/pricing/compare-plans)

## 🧪 Ensaio local com dados sintéticos

1. Preparar origem e destino isolados, cada qual com banco, diretório e
   configuração próprios. O destino começa vazio e escuta apenas em loopback.
2. Na origem, criar dois profissionais e fichas sintéticas. Enviar uma
   foto, substituí-la por outra com bytes diferentes e arquivar outra ficha
   que também tenha foto. Guardar os hashes dos WebPs de referência.
3. Parar a API de origem, capturar o banco e os arquivos e registrar a
   versão do esquema e os checksums das cópias.
4. Restaurar o par no destino. Usar segredo e cookies próprios do ensaio
   e sessões novas. Antes de expor qualquer ambiente recuperado, invalidar
   sessões e convites vindos do backup.
5. Conferir o vínculo entre profissional, ficha e foto, o hash da foto atual
   e a preservação da foto substituída no armazenamento.
6. Pela API restaurada, confirmar leitura pelo responsável, recusa sem sessão
   e para o outro profissional, indisponibilidade da foto da ficha arquivada
   e leitura após restaurar essa ficha. Retirar uma cópia de arquivo apenas
   no destino e confirmar que a inspeção detecta a falta e que a API recusa
   a entrega.
7. Registrar os resultados, o tempo de recuperação e as limitações. A
   restauração só passa se cada verificação prevista produzir o resultado
   esperado. O ensaio local valida o procedimento e o aplicativo. A
   implantação exige repetir a verificação com a infraestrutura escolhida.

## 🧪 Resultado do ensaio local — 19/11/2026

O ensaio executou a API real e o MySQL 8.0.46 em loopback. Uma instância
descartável hospedou dois esquemas isolados. A origem recebeu as três
migrations e os dados sintéticos. Com a API de origem parada, o MySQL foi
copiado via `mysqldump` e os WebPs foram copiados como arquivos. O destino
recebeu esse par em um esquema vazio e um diretório privado próprio.

| Verificação | Resultado observado |
| --- | --- |
| Esquema e integridade | Três migrations registradas, checksum SHA-256 do dump conferido e três WebPs restaurados com os hashes esperados |
| Foto atual | HTTP 200 para o profissional responsável e hash idêntico ao da foto que substituiu a anterior |
| Acesso sem sessão ou com a sessão da origem | HTTP 401 nos dois casos |
| Outro profissional | HTTP 404 |
| Foto da ficha arquivada | HTTP 404 antes do desarquivamento e HTTP 200 com o hash esperado depois |
| Foto substituída | WebP anterior preservado e um registro de arquivo arquivado |
| Arquivo retirado do diretório de destino | HTTP 404 e inspeção com um registro sem arquivo |

A restauração e as verificações principais pela API levaram 1,38 s neste
ensaio, antes da simulação de arquivo ausente. A amostra teve três imagens
sintéticas e os dois esquemas compartilharam uma instância descartável.
A revogação foi aplicada a sessões restauradas; o ensaio não criou um
convite para verificar sua invalidação. Ainda é preciso medir o tempo e
a perda máxima de dados em infraestrutura representativa, com os destinos
de backup e restauração escolhidos para produção.

## 🎓 Portfólio com custo zero

O objetivo atual é apresentar a evolução do Emotions como TCC e projeto de
portfólio, com dados sintéticos e sem contratar infraestrutura. Priorizar uma
apresentação pública com capturas, vídeo ou demonstração estática, acompanhada
de instruções para executar o fluxo completo localmente. Se houver interesse
em publicar uma versão interativa, avaliar opções gratuitas na época e
verificar a persistência dos dados e os limites antes de escolher.

## 🌷 Preservação da versão original

Antes de substituir o ambiente que está em produção:

1. Confirmar o endereço e o serviço da implantação atual e identificar o
   código efetivamente implantado. Usar `_old/` como referência e conferir
   o que difere na versão em execução.
2. Criar uma cópia privada recuperável do ambiente atual, sob um nome como
   `emotions-legacy`. Inventariar o código, o banco, os arquivos e
   as configurações necessárias. Guardar dados, cópias e credenciais em
   armazenamento privado fora do Git. Registrar no projeto apenas instruções
   sem segredos.
3. Validar a abertura da cópia em ambiente isolado e conferir os fluxos
   representativos antes de alterar a implantação original.
4. Preparar uma versão de demonstração separada com dados sintéticos. Publicar
   a comparação entre original e modernizado com capturas, vídeo ou demo
   estática. Preservar o visual e os fluxos relevantes da versão original.

O ensaio de recuperação da versão modernizada já foi validado localmente.
A cópia da implantação original será feita quando o ambiente atual tiver sido
identificado e houver acesso autorizado. A hospedagem com dados clínicos fica
fora do escopo atual do portfólio.
