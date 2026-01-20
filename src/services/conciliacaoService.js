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

function ensureItemIsCadastradoSemPrazo(item) {
  if (!item) {
    const error = new Error("Item não encontrado para o tenant.");
    error.statusCode = 404;
    throw error;
  }

  if (item.status_decisao !== "cadastrado_sem_prazo") {
    const error = new Error("Item não está pronto para análise.");
    error.statusCode = 409;
    throw error;
  }
}

function normalizePrazoDays(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizePrazoFinal(prazoFinal) {
  if (!prazoFinal) return null;
  if (typeof prazoFinal === "string") {
    return { data_vencimento: prazoFinal };
  }
  if (typeof prazoFinal !== "object") return null;
  return {
    data_vencimento: prazoFinal.data_vencimento ?? prazoFinal.data_limite ?? null,
    dias: normalizePrazoDays(prazoFinal.dias),
    descricao: prazoFinal.descricao ?? null,
  };
}

async function ensurePublicacaoLink({
  client,
  itemId,
  publicacaoId,
  tenantId,
}) {
  const { rows } = await client.query(
    `
      select publicacao_id
      from similaridade_item_publicacao
      where item_similaridade_id = $1
        and tenant_id = $2
      limit 1
    `,
    [itemId, tenantId]
  );

  if (!rows?.length) {
    const error = new Error("Vínculo com publicação não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const linkedPublicacaoId = rows[0]?.publicacao_id;
  if (linkedPublicacaoId !== publicacaoId) {
    const error = new Error("Publicação não corresponde ao item informado.");
    error.statusCode = 409;
    throw error;
  }

  return linkedPublicacaoId;
}

async function ensurePublicacaoExists(client, publicacaoId, tenantId) {
  const { rowCount } = await client.query(
    `
      select id
      from "Publicacao"
      where id = $1
        and tenant_id = $2
      limit 1
    `,
    [publicacaoId, tenantId]
  );

  if (!rowCount) {
    const error = new Error("Publicação não encontrada para o tenant.");
    error.statusCode = 404;
    throw error;
  }
}

function normalizeAuditoriaPayload(decisaoFinalJson) {
  if (decisaoFinalJson == null) return null;
  if (typeof decisaoFinalJson === "string") return decisaoFinalJson;
  return JSON.stringify(decisaoFinalJson);
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

export async function buscarPublicacaoVinculada({ itemId, tenantId }) {
  if (!itemId || !tenantId) {
    throw new Error("itemId e tenantId são obrigatórios.");
  }

  const { rows } = await pool.query(
    `
      select publicacao_id
      from similaridade_item_publicacao
      where item_similaridade_id = $1
        and tenant_id = $2
      limit 1
    `,
    [itemId, tenantId]
  );

  if (!rows?.length) {
    const error = new Error("Vínculo com publicação não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  return { publicacaoId: rows[0].publicacao_id };
}

export async function confirmarAnaliseSimilaridade({
  itemSimilaridadeId,
  publicacaoId,
  prazoFinal,
  decisaoFinalJson,
  tenantId,
  userId,
}) {
  if (!itemSimilaridadeId || !publicacaoId || !tenantId || !userId) {
    const error = new Error(
      "itemSimilaridadeId, publicacaoId, tenantId e userId são obrigatórios."
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedPrazo = normalizePrazoFinal(prazoFinal);
  if (!normalizedPrazo?.data_vencimento) {
    const error = new Error("prazo_final com data_vencimento é obrigatório.");
    error.statusCode = 400;
    throw error;
  }

  const auditoriaPayload = normalizeAuditoriaPayload(decisaoFinalJson);
  if (!auditoriaPayload) {
    const error = new Error("decisao_final_json é obrigatório.");
    error.statusCode = 400;
    throw error;
  }

  return withTransaction(async (client) => {
    const item = await fetchItemForUpdate(client, itemSimilaridadeId, tenantId);
    ensureItemIsCadastradoSemPrazo(item);

    await ensurePublicacaoLink({
      client,
      itemId: itemSimilaridadeId,
      publicacaoId,
      tenantId,
    });
    await ensurePublicacaoExists(client, publicacaoId, tenantId);

    const auditoriaResult = await client.query(
      `
        insert into auditoria_sugestao
          (publicacao_id, decisao_final_json, usuario_id, tenant_id, created_at)
        values ($1, $2, $3, $4, now())
        returning id
      `,
      [publicacaoId, auditoriaPayload, userId, tenantId]
    );

    const auditoriaSugestaoId = auditoriaResult.rows?.[0]?.id;
    if (!auditoriaSugestaoId) {
      const error = new Error("Falha ao criar auditoria da sugestão.");
      error.statusCode = 500;
      throw error;
    }

    const descricaoPrazo = normalizedPrazo.descricao || "Prazo definido na análise";

    await client.query(
      `
        insert into "Prazo"
          (descricao, data_inicio, data_limite, dias, publicacaoid, tenant_id, auditoria_sugestao_id)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        descricaoPrazo,
        item?.data_publicacao ?? null,
        normalizedPrazo.data_vencimento,
        normalizedPrazo.dias,
        publicacaoId,
        tenantId,
        auditoriaSugestaoId,
      ]
    );

    await client.query(
      `
        update similaridade_itens
        set status_decisao = 'analisado_com_prazo',
            updated_at = now()
        where id = $1
          and tenant_id = $2
      `,
      [itemSimilaridadeId, tenantId]
    );

    logInfo("conciliacao.confirmar.sucesso", "Análise confirmada com prazo.", {
      tenantId,
      userId,
      itemSimilaridadeId,
      publicacaoId,
      auditoriaSugestaoId,
    });

    return {
      message: "Análise confirmada com criação de prazo.",
      auditoriaSugestaoId,
    };
  });
}
