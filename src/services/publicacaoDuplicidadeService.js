//import { pool } from '../db/postgres.js';
import pool from '../config/postgresClient.js';
import { normalizarTexto } from '../utils/normalizarTexto.js';
import { normalizarData } from '../utils/normalizarData.js';
import { gerarHashPublicacao } from '../utils/hash.js';
import { gerarEmbedding } from './embeddingService.js';
import { logError, logInfo, logWarn } from '../utils/logger.js';

const DEFAULT_BATCH_SIZE = Number(process.env.BATCH_SIZE) || 500;
const DEFAULT_MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY) || 10;
const DEFAULT_PROCESSING_TIMEOUT_MS =
  Number(process.env.PROCESSING_TIMEOUT_MS) || 20_000;
const DEFAULT_RETRY_AFTER_SECONDS =
  Number(process.env.SIMILARIDADE_RETRY_AFTER_SECONDS) || 60;

function toPgVector(embeddingArray) {
  if (!Array.isArray(embeddingArray)) {
    throw new Error('Embedding inválido: esperado array de números');
  }
  return `[${embeddingArray.join(',')}]`;
}

async function runWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  const executing = new Set();
  let index = 0;

  async function enqueue() {
    if (index >= items.length) return;
    const currentIndex = index++;
    const promise = Promise.resolve()
      .then(() => worker(items[currentIndex], currentIndex))
      .then((result) => {
        results[currentIndex] = result;
        executing.delete(promise);
      })
      .catch((error) => {
        results[currentIndex] = {
          status: 'ERRO_PROCESSAMENTO',
          error: error?.message ?? 'Erro ao processar publicação'
        };
        executing.delete(promise);
      });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }

    await enqueue();
  }

  const starters = Array.from({ length: Math.min(limit, items.length) }, () =>
    enqueue()
  );

  await Promise.all(starters);
  await Promise.all(executing);
  return results;
}

function calculatePercentile(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor(percentile * (sorted.length - 1))
  );
  return sorted[index];
}

export class PublicacaoDuplicidadeService {
  static async verificar({
    tenant_id,
    numero_processo,
    data_publicacao,
    texto,
    embedding // array de números
  }) {
    const embeddingValue = embedding || await gerarEmbedding(texto, tenant_id);
    return this.avaliarPublicacao({
      tenant_id,
      numero_processo,
      data_publicacao,
      texto,
      embedding: embeddingValue
    });
  }

  static async verificarEmLote({
    itens,
    tenantId,
    batchSize = DEFAULT_BATCH_SIZE,
    maxConcurrency = DEFAULT_MAX_CONCURRENCY,
    processingTimeoutMs = DEFAULT_PROCESSING_TIMEOUT_MS,
    retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS
  }) {
    if (!Array.isArray(itens)) {
      throw new Error('Payload inválido: esperado array');
    }

    const safeBatchSize = batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE;
    const safeConcurrency =
      maxConcurrency > 0 ? maxConcurrency : DEFAULT_MAX_CONCURRENCY;
    const safeTimeoutMs =
      Number.isFinite(processingTimeoutMs) && processingTimeoutMs >= 0
        ? processingTimeoutMs
        : DEFAULT_PROCESSING_TIMEOUT_MS;
    const safeRetryAfterSeconds =
      retryAfterSeconds > 0 ? retryAfterSeconds : DEFAULT_RETRY_AFTER_SECONDS;

    const startedAt = Date.now();
    const results = [];
    const batchDurations = [];

    logInfo(
      'publicacao.lote.start',
      'Iniciando processamento em lote de similaridade',
      {
        tenantId,
        totalItems: itens.length,
        batchSize: safeBatchSize,
        maxConcurrency: safeConcurrency
      }
    );

    for (let index = 0; index < itens.length; index += safeBatchSize) {
      const batch = itens.slice(index, index + safeBatchSize);
      const batchStartedAt = Date.now();

      const batchResults = await runWithConcurrency(
        batch,
        async (item) => {
          const resolvedTenant = item?.tenant_id ?? tenantId;

          if (!resolvedTenant || !item?.data_publicacao || !item?.texto) {
            return {
              status: 'ERRO_PROCESSAMENTO',
              error: 'Campos obrigatórios ausentes (tenant_id, data_publicacao, texto)',
              numero_processo: item?.numero_processo,
              data_publicacao: item?.data_publicacao,
              texto: item?.texto
            };
          }

          try {
            const embedding = await gerarEmbedding(item.texto, resolvedTenant);
            return await this.avaliarPublicacao({
              tenant_id: resolvedTenant,
              numero_processo: item.numero_processo,
              data_publicacao: item.data_publicacao,
              texto: item.texto,
              embedding
            });
          } catch (error) {
            logError('publicacao.lote.item_error', 'Erro ao processar item de similaridade', {
              error,
              numero_processo: item?.numero_processo,
              tenantId: resolvedTenant
            });
            return {
              status: 'ERRO_PROCESSAMENTO',
              error: error?.message ?? 'Erro ao processar item',
              numero_processo: item?.numero_processo,
              data_publicacao: item?.data_publicacao,
              texto: item?.texto
            };
          }
        },
        safeConcurrency
      );

      results.push(...batchResults);
      const batchDurationMs = Date.now() - batchStartedAt;
      batchDurations.push(batchDurationMs);

      logInfo(
        'publicacao.lote.processado',
        'Batch de similaridade processado',
        {
          batchSize: batch.length,
          batchIndex: Math.floor(index / safeBatchSize),
          totalItems: itens.length,
          tenantId,
          durationMs: batchDurationMs,
          maxConcurrency: safeConcurrency
        }
      );

      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs > safeTimeoutMs) {
        logWarn(
          'publicacao.lote.timeout_warning',
          'Tempo de processamento de similaridade excedido',
          {
            tenantId,
            totalItems: itens.length,
            batchIndex: Math.floor(index / safeBatchSize),
            elapsedMs,
            timeoutMs: safeTimeoutMs,
            retryAfterSeconds: safeRetryAfterSeconds
          }
        );
        const timeoutError = new Error('Tempo de processamento excedido');
        timeoutError.code = 'PROCESSING_TIMEOUT';
        timeoutError.retryAfterSeconds = safeRetryAfterSeconds;
        throw timeoutError;
      }
    }

    const processingTimeMs = Date.now() - startedAt;
    const batchesCount = batchDurations.length;
    const batchDurationMsAvg = batchesCount
      ? Math.round(
          batchDurations.reduce((acc, cur) => acc + cur, 0) / batchesCount
        )
      : 0;
    const batchDurationMsP95 = batchesCount
      ? calculatePercentile(batchDurations, 0.95)
      : 0;
    const metrics = {
      processingTimeMs,
      itemsProcessed: results.length,
      batchSize: safeBatchSize,
      maxConcurrency: safeConcurrency,
      batchesCount,
      batchDurationMsAvg,
      batchDurationMsP95
    };

    logInfo(
      'publicacao.lote.completed',
      'Processamento de similaridade concluído',
      {
        tenantId,
        ...metrics
      }
    );

    return { results, metrics };
  }

  static async avaliarPublicacao({
    tenant_id,
    numero_processo,
    data_publicacao,
    texto,
    embedding
  }) {
    const textoNormalizado = normalizarTexto(texto);
    const dataNormalizada = normalizarData(data_publicacao);

    const hash = gerarHashPublicacao({
      tenant_id,
      numero_processo,
      data_publicacao,
      texto
    });

    const hashCheck = await pool.query(
      `
      select id
      from public."Publicacao" as p
      inner join
      public."processos" as proc on p."processoid" = proc.idprocesso
      where p.tenant_id = $1
        and proc.numprocesso = $2
        and hash_publicacao = $3
      limit 1
      `,
      [tenant_id, numero_processo, hash]
    );

    if (hashCheck.rowCount > 0) {
      return {
        status: 'DUPLICADO_HASH',
        publicacaoId: hashCheck.rows[0].id,
        similarity: 1,
        embedding,
        numero_processo,
        data_publicacao: dataNormalizada,
        texto
      };
    }

    const embeddingVector = toPgVector(embedding);

    const vectorCheck = await pool.query(
      `
      select
        publicacao_id,
        1 - (embedding <=> $4::vector) as similarity
      from publicacao_embeddings
      inner join "Publicacao" as p on publicacao_embeddings.publicacao_id = p.id
      where publicacao_embeddings.tenant_id = $1
        and publicacao_embeddings.numero_do_processo = $2
        and p.data_publicacao = $3
      order by embedding <=> $4::vector
      limit 1
      `,
      [tenant_id, numero_processo, dataNormalizada, embeddingVector]
    );

    if (vectorCheck.rowCount > 0) {
      const { similarity, publicacao_id } = vectorCheck.rows[0];

      if (similarity >= 0.95) {
        return {
          status: 'DUPLICADO_SEMANTICO',
          publicacaoId: publicacao_id,
          similarity,
          embedding,
          numero_processo,
          data_publicacao: dataNormalizada,
          texto
        };
      }

      if (similarity >= 0.9) {
        return {
          status: 'POSSIVEL_DUPLICADO',
          publicacaoId: publicacao_id,
          similarity,
          embedding,
          numero_processo,
          data_publicacao: dataNormalizada,
          texto
        };
      }
    }

    return {
      status: 'NOVO',
      similarity: 0,
      hash,
      embedding,
      textoNormalizado,
      numero_processo,
      data_publicacao: dataNormalizada,
      texto
    };
  }
}
