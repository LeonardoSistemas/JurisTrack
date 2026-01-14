# PRD - Serviço de Similaridade de Publicações

## 1. Visão Geral e Objetivos
Reduzir duplicidade e o retrabalho manual da equipe que valida publicações, entregando uma resposta automatizada com status de similaridade para cada publicação enviada, de forma rápida e previsível dentro da stack Node.js atual.

## 2. Escopo
- **Incluso**:
    - Endpoint interno chamado pelo front logo após o retorno do fluxo do `N8N`, recebendo um array de publicações e retornando um array de resultados.
    - Cada resultado usa o contrato existente (`status`, `publicacaoId`, `similarity`), abrangendo `NOVO`, `POSSIVEL_DUPLICADO`, `DUPLICADO_HASH` e `DUPLICADO_SEMANTICO`.
    - Validação e normalização do texto da publicação antes de aplicar comparações (hash e semântica).
    - Processamento em lotes/concorrência controlada para evitar estouro de memória com entradas muito grandes (até ~5 milhões de itens).
    - Logs de execução e métricas simples de tempo por lote para facilitar ajuste de desempenho.
- **Não Incluso**:
    - Cache distribuído ou mecanismos de mensageria (Kafka, Redis, etc.).
    - Exposição pública dessa rota; será usada apenas por usuários internos.
    - Interface gráfica para consumir o array de resposta; o foco é a API.

## 3. Usuários e Histórias de Usuário
- **Analista de Dados Interno**: "Como analista, preciso enviar um lote de publicações e receber imediatamente um array com o status de duplicidade de cada item, para que eu possa priorizar a revisão sem abrir cada publicação manualmente."

## 4. Requisitos Funcionais (RF)
1. **RF1 - Entrada em lote**: A API deve receber um array de objetos de publicação, cada um contendo pelo menos o `publicacaoId` e o texto.
2. **RF2 - Saída consistente**: A resposta deve ser um array com a mesma ordem das entradas e conter `status`, `publicacaoId`, `similarity` e os dados necessários para o modal (`numeroProcesso`, `textoPublicacao`, `dataPublicacao`), permitindo que o front agrupe e exiba os detalhes sem buscar novamente no backend.
3. **RF3 - Tipos de status**: Implementar os status atuais (`NOVO`, `POSSIVEL_DUPLICADO`, `DUPLICADO_HASH`, `DUPLICADO_SEMANTICO`) e garantir que cada item receba o mais relevante.
4. **RF4 - Análise textual**: Para cada publicação deve-se normalizar o texto (remoção de acentos/pontos, trim) antes do hash e da comparação semântica.
5. **RF5 - Lotes controlados**: A lógica deve iterar pelas publicações em blocos (`batch`) e processar cada bloco sequencialmente para manter o uso de memória previsível.
6. **RF6 - Concorrência limitada**: Operações assíncronas (ex.: cálculo de similaridade semântica) devem respeitar um limite configurável de concorrência para não saturar o Node.js.
7. **RF7 - Feedback parcial (opcional)**: Em caso de carga extrema, o endpoint deve devolver um erro claro e um timestamp sugerido para retry em vez de travar.

## 5. Requisitos Não Funcionais (RNF)
1. **RNF1 - Performance**: Tempo médio de resposta proporcional ao tamanho do lote processado, com métricas de tempo por bloco para monitorar gargalos.
2. **RNF2 - Escalabilidade vertical**: O serviço deve rodar apenas com Node.js, sem dependências externas à stack atual (sem cache/mensageria/DB adicional).
3. **RNF3 - Uso de memória**: Limitar o tamanho do batch e manter, no máximo, as estruturas de dados essenciais em memória para evitar estouros ao processar grandes volumes.
4. **RNF4 - Observabilidade**: Emitir logs estruturados com tempo de processamento e contagem de itens por batch para facilitar tuning de `batchSize` e `concurrency`.

## 6. Modelo de Dados e Lógica
- As publicações serão comparadas a índices históricos internos (hashes e embeddings já existentes) para determinar o status.
- O pipeline por publicação segue: normalizar texto → computar hash → verificar duplicata exacta → calcular semântica → classificar status e similarity.
- Lotes são definidos por `batchSize` configurável; cada lote processado chama a mesma função de avaliação da publicação.
- O retorno deve manter o `publicacaoId` original para garantir correlação com o cliente.

## 7. Métricas de Sucesso
- Rota processando 100% das entradas válidas em até `N` segundos por lote (ajustar `N` após testes iniciais).
- Menos de X% de requisições com erro 5xx ou timeout quando processando >10k registros.
- Redução mensurável no tempo gasto pelo time (“validadores”) para decidir sobre duplicidades após implantação.

## 8. UX e Apresentação
- O front deve agrupar as publicações retornadas por `status` em cards, cada card mostrando a quantidade de itens daquele status (NOVO, POSSÍVEL_DUPLICADO, etc.).
- Ao clicar num card, um modal é exibido listando os detalhes de cada publicação filtrada: número do processo, texto da publicação, data e `similarity`.
- Essa interface é acionada imediatamente após o front chamar o endpoint pós-N8N, dando ao usuário interno uma visão rápida do resultado da análise sem precisar abrir cada publicação.

## 9. Questões em Aberto
- Qual é o limite máximo de items que o cliente espera enviar em uma única chamada?
- Precisamos definir o valor inicial de `batchSize` e `concurrency` (ex.: 1000 e 10)? Solicitar validação após testes.
- Devo documentar algum contrato adicional para status `DUPLICADO_SEMANTICO`?

