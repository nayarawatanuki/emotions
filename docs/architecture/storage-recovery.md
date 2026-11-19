# ☁️ Armazenamento de produção e recuperação

## 🌷 Contexto

O MySQL guarda a associação entre ficha, profissional e chave privada do WebP.
O armazenamento local recusa configuração em produção. A rota autenticada
já entrega o arquivo ao profissional responsável. Fotos vinculadas a fichas
arquivadas voltam a ficar acessíveis quando a ficha é restaurada.

## 🧩 Direção de produção

O [card geral da migração](https://github.com/nayarawatanuki/emotions/issues/2)
prevê substituir o armazenamento de imagens no AWS S3. A proposta parte de
um volume privado persistente para os WebPs e mantém o MySQL para o vínculo
entre ficha, profissional e arquivo. A entrega segue pela API, com
autorização a cada leitura.

Para uma implantação inicial de instância única, manter o volume fora da
raiz pública e acessível apenas à conta do processo. Confirmar que os arquivos
sobrevivem a reinícios e novas versões da aplicação. Dimensionar o espaço,
monitorar a capacidade e manter uma cópia de backup independente do host,
com acesso restrito e restauração testada. A hospedagem e o destino das
cópias serão escolhidos depois do ensaio local.

Registrar os identificadores dos dois backups como um par. Para o primeiro
ensaio, suspender gravações, aguardar operações em andamento e capturar
banco e arquivos durante a mesma janela. A clínica define a perda máxima
aceitável de dados e o tempo máximo de recuperação. Medir ambos no ambiente
escolhido.

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
