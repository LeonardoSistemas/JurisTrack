import { PublicacaoDuplicidadeService } from '../services/publicacaoDuplicidadeService.js';
import { gerarEmbedding } from '../services/embeddingService.js';
import { logError, logInfo } from '../utils/logger.js';
import { saveSimilaridadeResultado } from '../services/similaridadeResultadoService.js';

const DEFAULT_BATCH_SIZE = Number(process.env.BATCH_SIZE) || 500;
const DEFAULT_MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY) || 10;
const MAX_ITEMS = Number(process.env.MAX_ITEMS) || 5000;
const DEFAULT_PROCESSING_TIMEOUT_MS =
  Number(process.env.PROCESSING_TIMEOUT_MS) || 20_000;
const DEFAULT_RETRY_AFTER_SECONDS =
  Number(process.env.SIMILARIDADE_RETRY_AFTER_SECONDS) || 60;

export class PublicacaoController {
  static async verificarDuplicidade(req, res) {
    try {
      const {
        tenant_id,
        numero_processo,
        data_publicacao,
        texto
      } = req.body;

      const tenantId = req.tenantId ?? tenant_id;

      // Validação mínima
      if (!tenantId || !data_publicacao || !texto) {
        return res.status(400).json({
          error: 'tenant_id, data_publicacao e texto são obrigatórios'
        });
      }

      // 1. Gera embedding
      const embedding = await gerarEmbedding(texto, tenantId);

      // 2. Chama o service
      const resultado = await PublicacaoDuplicidadeService.verificar({
        tenant_id: tenantId,
        numero_processo,
        data_publicacao,
        texto,
        embedding
      });

      // 3. Retorna resposta
      return res.json(resultado);

    } catch (error) {
      console.error('Erro ao verificar duplicidade:', error);
      return res.status(500).json({
        error: 'Erro interno ao verificar duplicidade'
      });
    }
  }

  static async verificarSimilaridadeEmLote(req, res) {
    const requestStartedAt = Date.now();
    const rawBody = req.body;
    const rawPayload = Array.isArray(rawBody) ? rawBody : rawBody?.itens;
    const uploadId =
      rawBody?.uploadId ??
      (Array.isArray(rawPayload) ? rawPayload?.[0]?.uploadId : rawBody?.itens?.[0]?.uploadId);
    console.log('payload', rawPayload);
    try {
      if (!Array.isArray(rawPayload) || rawPayload.length === 0) {
        return res.status(400).json({
          error: 'Payload deve ser um array com ao menos um item'
        });
      }

      if (rawPayload.length > MAX_ITEMS) {
        res.set('Retry-After', String(DEFAULT_RETRY_AFTER_SECONDS));
        return res.status(503).json({
          error: 'Lote acima do limite configurado',
          maxItems: MAX_ITEMS,
          retryAfterSeconds: DEFAULT_RETRY_AFTER_SECONDS
        });
      }

      const tenantId = req.tenantId;

      const payload = rawPayload.map((item) => ({
        ...item,
        data_publicacao:
          item?.data_publicacao ??
          item?.dataPublicacao ??
          item?.nova_movimentacao ??
          item?.novaMovimentacao ??
          null,
        texto:
          item?.texto ??
          item?.texto_integral ??
          item?.textoIntegral ??
          item?.text ??
          null,
      }));

      const invalidItemIndex = payload.findIndex((item) => {
        return !item?.data_publicacao || !item?.texto;
      });

      if (invalidItemIndex !== -1) {
        return res.status(400).json({
          error: 'Cada item deve conter data_publicacao (ou nova_movimentacao) e texto',
          invalidIndex: invalidItemIndex
        });
      }

      const batchSize = DEFAULT_BATCH_SIZE > 0 ? DEFAULT_BATCH_SIZE : 500;
      const maxConcurrency =
        DEFAULT_MAX_CONCURRENCY > 0 ? DEFAULT_MAX_CONCURRENCY : 10;

      const { results, metrics } = await PublicacaoDuplicidadeService.verificarEmLote({
        itens: payload,
        tenantId,
        batchSize,
        maxConcurrency,
        processingTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS,
        retryAfterSeconds: DEFAULT_RETRY_AFTER_SECONDS
      });

      res.set('X-Processing-Time', String(metrics.processingTimeMs));
      res.set('X-Items-Processed', String(metrics.itemsProcessed));
      res.set('X-Batches', String(metrics.batchesCount ?? 0));
      res.set('X-Request-Duration', String(Date.now() - requestStartedAt));

      logInfo(
        'publicacao.lote.response',
        'Similaridade em lote respondida',
        {
          tenantId,
          totalItems: payload.length,
          batchSize,
          maxConcurrency,
          ...metrics
        }
      );

      if (uploadId) {
        try {
          await saveSimilaridadeResultado({
            uploadId,
            tenantId,
            resultadoJson: { results, metrics },
            itens: payload
          });
        } catch (persistError) {
          logError(
            'publicacao.lote.persist_error',
            'Erro ao salvar resultado de similaridade',
            {
              error: persistError,
              tenantId,
              uploadId,
              message: persistError?.message,
              code: persistError?.code,
              details: persistError?.details,
              hint: persistError?.hint,
            }
          );
          return res.status(500).json({
            error: 'Erro ao salvar resultado de similaridade'
          });
        }
      }

      return res.status(200).json(results);
    } catch (error) {
      if (error?.code === 'PROCESSING_TIMEOUT') {
        const retryAfterSeconds =
          error?.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(503).json({
          error: 'Tempo de processamento excedido, tente novamente mais tarde',
          retryAfterSeconds
        });
      }

      logError('publicacao.lote.error', 'Erro ao processar similaridade em lote', {
        error,
        tenantId: req.tenantId ?? payload?.[0]?.tenant_id,
        totalItems: Array.isArray(payload) ? payload.length : undefined
      });
      return res.status(500).json({
        error: 'Erro interno ao processar similaridade em lote'
      });
    }
  }
}
