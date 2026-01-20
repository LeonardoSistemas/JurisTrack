import pool from "../config/postgresClient.js";
import { gerarEmbedding } from "./embeddingService.js";
import { logError, logWarn, logInfo } from "../utils/logger.js";

function toPgVector(embeddingArray) {
  if (!Array.isArray(embeddingArray)) return null;
  return `[${embeddingArray.join(",")}]`;
}

function normalizeEmbeddingValue(raw) {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    return toPgVector(raw);
  }

  if (ArrayBuffer.isView(raw)) {
    return toPgVector(Array.from(raw));
  }

  if (typeof raw === "object") {
    if (Array.isArray(raw?.values)) {
      return toPgVector(raw.values);
    }
    if (Array.isArray(raw?.data)) {
      return toPgVector(raw.data);
    }
  }

  if (typeof raw === "string") {
    return raw;
  }

  return null;
}

async function resolveEmbeddingForInsert(item, textoFallback, tenantId) {
  const rawEmbedding = item?.embedding ?? item?.dados_originais?.embedding;
  const normalized = normalizeEmbeddingValue(rawEmbedding);

  if (normalized) {
    return normalized;
  }

  if (textoFallback) {
    logWarn(
      "conciliacao.embedding.fallback",
      "Embedding ausente no item; gerando novamente a partir do texto",
      { itemId: item?.id }
    );
    const generated = await gerarEmbedding(textoFallback, tenantId);
    const generatedVector = toPgVector(generated) ?? normalizeEmbeddingValue(generated);
    if (generatedVector) return generatedVector;
  }

  const error = new Error("Item sem embedding para cadastro.");
  error.statusCode = 400;
  throw error;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function fetchItemForUpdate(client, itemId, tenantId) {
  const { rows } = await client.query(
    `
      select *
      from similaridade_itens
      where id = $1
        and tenant_id = $2
      for update
    `,
    [itemId, tenantId]
  );

  return rows?.[0];
}

function ensureItemIsPendente(item) {
  if (!item) {
    const error = new Error("Item não encontrado para o tenant.");
    error.statusCode = 404;
    throw error;
  }

  if (item.status_decisao && item.status_decisao !== "pendente") {
    const error = new Error("Item já conciliado.");
    error.statusCode = 409;
    throw error;
  }
}

async function ensureProcesso(client, { numero_processo, tenantId }) {
  const existing = await client.query(
    `
      select idprocesso
      from processos
      where tenant_id = $1
        and numprocesso = $2
      limit 1
    `,
    [tenantId, numero_processo]
  );

  if (existing.rowCount > 0) {
    return existing.rows[0].idprocesso;
  }

  const inserted = await client.query(
    `
      insert into processos (numprocesso, tenant_id)
      values ($1, $2)
      returning idprocesso
    `,
    [numero_processo, tenantId]
  );

  return inserted.rows[0].idprocesso;
}

export async function cadastrarItem({ itemId, tenantId, userId }) {
  if (!itemId || !tenantId) {
    throw new Error("itemId e tenantId são obrigatórios.");
  }

  return withTransaction(async (client) => {
    const item = await fetchItemForUpdate(client, itemId, tenantId);
    ensureItemIsPendente(item);

    if (!item.numero_processo) {
      const error = new Error("Item sem número de processo para cadastro.");
      error.statusCode = 400;
      throw error;
    }

    const processoId = await ensureProcesso(client, {
      numero_processo: item.numero_processo,
      tenantId,
    });

    const textoPublicacao =
      item.texto_publicacao ??
      item.texto ??
      item.dados_originais?.texto ??
      item.dados_originais?.texto_publicacao ??
      "Publicação cadastrada via similaridade";

    const publicacao = await client.query(
      `
        insert into "Publicacao" (processoid, data_publicacao, texto_integral, hash_publicacao, tenant_id)
        values ($1, $2, $3, $4, $5)
        returning id
      `,
      [
        processoId,
        item.data_publicacao ?? null,
        textoPublicacao,
        item.hash_publicacao ?? null,
        tenantId,
      ]
    );

    const publicacaoId = publicacao.rows[0]?.id;

    const embeddingValue = await resolveEmbeddingForInsert(
      item,
      textoPublicacao,
      tenantId
    );

    await client.query(
      `
        insert into publicacao_embeddings
          (publicacao_id, numero_do_processo, texto, embedding, tenant_id)
        values ($1, $2, $3, $4, $5)
      `,
      [publicacaoId, item.numero_processo, textoPublicacao, embeddingValue, tenantId]
    );

    await client.query(
      `
        insert into "Andamento" ("processoId", descricao, data_evento, tenant_id)
        values ($1, $2, $3, $4)
      `,
      [
        processoId,
        "Cadastro automático via similaridade",
        item.data_publicacao ?? new Date().toISOString(),
        tenantId,
      ]
    );

    await client.query(
      `
        insert into similaridade_item_publicacao
          (item_similaridade_id, publicacao_id, tenant_id)
        values ($1, $2, $3)
      `,
      [itemId, publicacaoId, tenantId]
    );

    await client.query(
      `
        update similaridade_itens
        set status_decisao = 'cadastrado_sem_prazo',
            updated_at = now()
        where id = $1
      `,
      [itemId]
    );

    logInfo("conciliacao.cadastrar.sucesso", "Item conciliado com cadastro", {
      tenantId,
      userId,
      itemId,
      processoId,
      publicacaoId,
    });

    return {
      message: "Item cadastrado com sucesso",
      processoId,
      publicacaoId,
    };
  });
}

export async function cancelarItem({ itemId, tenantId, userId, motivo }) {
  if (!itemId || !tenantId) {
    throw new Error("itemId e tenantId são obrigatórios.");
  }

  return withTransaction(async (client) => {
    const item = await fetchItemForUpdate(client, itemId, tenantId);
    ensureItemIsPendente(item);

    await client.query(
      `
        insert into similaridade_descartes_auditoria
          (item_similaridade_id, tenant_id, dados_descartados, motivo)
        values ($1, $2, $3, $4)
      `,
      [itemId, tenantId, item, motivo || "Descartado pelo usuário na conciliação"]
    );

    await client.query(
      `
        update similaridade_itens
        set status_decisao = 'cancelado',
            updated_at = now()
        where id = $1
      `,
      [itemId]
    );

    logInfo("conciliacao.cancelar.sucesso", "Item cancelado com auditoria", {
      tenantId,
      userId,
      itemId,
    });

    return { message: "Item cancelado e auditado com sucesso" };
  });
}

export async function listarPendentesPorUpload({ uploadId, tenantId }) {
  if (!uploadId || !tenantId) {
    throw new Error("uploadId e tenantId são obrigatórios.");
  }

  const { rows } = await pool.query(
    `
      select *
      from similaridade_itens
      where upload_documento_id = $1
        and tenant_id = $2
        and status_decisao = 'pendente'
      order by created_at asc
    `,
    [uploadId, tenantId]
  );

  return rows;
}
