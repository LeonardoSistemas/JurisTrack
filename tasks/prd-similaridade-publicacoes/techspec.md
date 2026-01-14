# Tech Spec - Similaridade de Publicações

## 1. Visão Técnica e Objetivos
Garantir que o novo endpoint aceite lotes de publicações enviados pelo front (após o fluxo do N8N) e retorne um array com o status de duplicidade e os dados do modal para cada item, usando apenas Node.js e mantendo consumo de memória e CPU previsível mesmo para volumes elevados.

## 2. Arquitetura e Componentes

### 2.1 Backend (Node.js/Express)
- **Rota**: `src/routes/publicacoesRoutes.js` expõe um novo `POST /api/publicacoes/similaridade` protegido pelos middlewares existentes (`traceMiddleware`, `tenantContextMiddleware`, `requestLogger`).
- **Controller**: Adicionar handler em `publicacaoController.js` que:
  - valida o payload (array min/max length, campos obrigatórios);
  - calcula `batchSize` e `maxConcurrency` a partir de variáveis de ambiente ou config padrão (ex.: 500 itens por batch, 10 operações assíncronas).
  - invoca o service e retorna o array completo ou um erro padronizado.
- **Service**: `publicacaoDuplicidadeService.js` abriga a lógica:
  - normaliza texto via `utils/normalizarTexto.js`;
  - calcula hash e chama comparações semânticas existentes;
  - mantém um pool de concorrência simples (pode usar `p-limit` ou implementação caseira) para limitar promises paralelas;
  - processa as publicações em blocos, acumulando resultados.
- **Dependências internas**:
  - `embeddingService` (se já existir) para semântica;
  - `hash`/`utils` para verificação rápida.

### 2.2 Front (HTML/JS)
- O front já existente (invocado pelo fluxo N8N) faz `fetch` para o novo endpoint e:
  - agrupa o array de resposta por `status`;
  - mostra cards por status em modal/listagem (quantidade e botão para abrir modal);
  - cada modal lista `numero_processo`, `data_publicacao`, `texto` e `similarity`.
  - Caso o payload seja muito grande, o front pode exibir feedback de processamento em andamento baseada em métricas enviadas pelo backend (e.g., total processado até o momento).

## 3. Endpoints de API

### 3.1 `POST /api/publicacoes/similaridade`
- **Request**: array de objetos enviados pelo front com `{ numero_processo, tenant_id, data_publicacao, texto }`.
- **Validation**: obrigatórios `publicacaoId` + texto; `batchSize` opcional para override; tamanho máximo configurável.
- **Response**: array na mesma ordem com `{ publicacaoId, status, similarity, numero_processo, texto, data_publicacao }`, onde `publicacaoId` é resolvido internamente (pode ser nulo se for uma publicação nova).
- **Erros**:
  - `400` se payload inválido;
  - `503` se o sistema identificar excesso de carga (ex.: mais de X items e a fila já cheia);
  - `500` com log detalhado em caso de falha no serviço.

## 4. Modelo de Dados e Lógica
- Cada publicação segue: normalizar texto → hash → comparar com registros hash existentes → se não duplicado, calcular similaridade semântica e classificar como `NOVO`/`POSSIVEL_DUPLICADO`/`DUPLICADO_SEMANTICO`.
- O resultado guarda também `numero_processo`, `texto` e `data_publicacao` para o modal.
- Se o texto estiver vazio, a publicação retorna `NOVO` com `similarity: 0` e log de warning.
- Os dados de comparação (hashes e embeddings) já existentes devem ser consultados em memória/local (sem cache externo), garantindo que cada batch só carrega o essencial.

## 5. Fluxo e Concorrência
- O service divide o array em batches (`batchSize` configurável, default 500) e processa cada batch sequencialmente para controlar memória.
- Dentro de cada batch, operações assíncronas (ex.: semântica) são limitadas por `maxConcurrency` (ex.: 10). Implementar um `queue` simples com `Promise.allSettled` + `next()` para evitar saturar o event loop.
- Se o tempo total do batch exceder um limiar (ex.: 20s), o service retorna `503` com `retryAfter` sugerido para o front.
- Status `REQUEST_LIMITED` (opcional) pode ser adicionado no futuro para sinalizar sobrecarga sem falha total.

## 6. Observabilidade e Logs
- Logs estruturados contendo:
  - `tenantId`, `totalItems`, `batchSize`, `maxConcurrency`, `durationMs`.
  - `batchIndex` atualizado a cada bloco processado.
  - Eventuais erros específicos (semântica, hash) com stack trace reduzido.
- Métricas customizadas (via `observability/sentry` ou similar) para: tempo médio por batch, percentil 95, número de batches por request.
- Exportar headers com `X-Processing-Time` e `X-Items-Processed` para diagnóstico rápido.

## 7. Estratégia de Testes
- **Unitários**:
  - Cobrir a normalização, cálculo de `status` e montagem do objeto final no `publicacaoDuplicidadeService`.
  - Testar limites de `batchSize`/`maxConcurrency` (mockar delays).
- **Integração**:
  - Mockar o controller para garantir que o endpoint retorna `200` com array esperado, `400` para payload inválido e `503` para carga elevada.
  - Simular front chamando o endpoint e validar agrupamento por status.
- **Contract**:
  - Garantir que o schema de resposta (`status`, `publicacaoId`, `similarity`, `numero_processo`, `texto`, `data_publicacao`) permaneça constante.
- **Performance (manual)**:
  - Testar lotes progressivos (1k, 10k, 100k) controlando `batchSize` para verificar consumo de memória.
  - Medir tempo total e por batch para calibrar `batchSize`/`maxConcurrency`.

## 8. Riscos e Mitigações
- **Volume extremo (5 milhões)**: processar tudo de uma vez estoura memória. *Mitigação*: usar batches sequenciais e limitar concorrência; se necessário, negociar chunking no front em múltiplas chamadas.
- **Dependência de semântica pesada**: cálculo de embeddings pode ser lento. *Mitigação*: cache em memória simples dos últimos embeddings, usar `Promise.race` com timeout e fallback para `NOVO`.
- **Falha parcial do batch**: se um item em lote falhar, não jogar tudo fora. *Mitigação*: usar `Promise.allSettled` e marcar esse item como erro documentado (status `ERRO_PROCESSAMENTO` com campo `erro`).

## 9. Configuração de limites e headers
- Variáveis de ambiente: `BATCH_SIZE` (default 500), `MAX_CONCURRENCY` (default 10), `MAX_ITEMS` (default 5000), `PROCESSING_TIMEOUT_MS` (default 20000) e `SIMILARIDADE_RETRY_AFTER_SECONDS` (default 60).
- Respostas de sobrecarga: quando exceder `MAX_ITEMS` ou `PROCESSING_TIMEOUT_MS`, retornar `503` com `retryAfterSeconds` no corpo e header `Retry-After`.
- Headers de diagnóstico: `X-Processing-Time`, `X-Items-Processed`, `X-Batches` e `X-Request-Duration` expostos pelo controller para uso de front/monitoramento.

