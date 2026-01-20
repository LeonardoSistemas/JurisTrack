import pool from "../config/postgresClient.js";
import { withTenantFilter } from "../repositories/tenantScope.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";
import { logWarn, logError } from "../utils/logger.js";
import { buildPrazoSuggestion } from "./prazoService.js";

const EVENTO_NAO_CLASSIFICADO = "EVENTO_NAO_CLASSIFICADO";

function normalizePrazo(prazo) {
  if (!prazo) return null;
  if (typeof prazo === "string") {
    return { data_vencimento: prazo };
  }
  if (typeof prazo !== "object") return null;
  return {
    dias: prazo.dias ?? null,
    tipo: prazo.tipo ?? null,
    data_vencimento: prazo.data_vencimento ?? null,
  };
}

function buildAuditoriaPayload({ sugestao, decisaoFinal }) {
  const sugestaoPrazo = normalizePrazo(sugestao?.providencia_padrao?.prazo_sugerido);
  const decisaoPrazo = normalizePrazo(decisaoFinal?.prazo_final);

  const sugestaoOriginal = {
    evento_id: sugestao?.evento?.id ?? null,
    providencia_id: sugestao?.providencia_padrao?.id ?? null,
    prazo_sugerido: sugestaoPrazo,
    modelo_id: sugestao?.providencia_padrao?.modelo_sugerido?.id ?? null,
  };

  const decisaoSnapshot = {
    evento_id: decisaoFinal?.evento_id ?? null,
    providencia_id: decisaoFinal?.providencia_id ?? null,
    prazo_final: decisaoPrazo,
    modelo_id: decisaoFinal?.modelo_id ?? null,
    observacao: decisaoFinal?.observacao ?? null,
  };

  const diff = {
    evento_alterado: sugestaoOriginal.evento_id !== decisaoSnapshot.evento_id,
    providencia_alterada:
      sugestaoOriginal.providencia_id !== decisaoSnapshot.providencia_id,
    prazo_alterado: JSON.stringify(sugestaoPrazo) !== JSON.stringify(decisaoPrazo),
    modelo_alterado: sugestaoOriginal.modelo_id !== decisaoSnapshot.modelo_id,
  };

  return {
    sugestao_original: sugestaoOriginal,
    decisao_final: decisaoSnapshot,
    diff,
  };
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
    const error = new Error("Item já analisado.");
    error.statusCode = 409;
    throw error;
  }
}

export function normalizeAndamentoText(text) {
  if (!text || typeof text !== "string") return null;
  return normalizarTexto(text);
}

export function matchAndamentoByRules({ tipoAndamento, regrasExatas = [], regrasContem = [] }) {
  const normalizedTipo = normalizeAndamentoText(tipoAndamento);
  if (!normalizedTipo) return null;

  const exactMatch = regrasExatas.find((regra) => {
    const normalizedRegra = normalizeAndamentoText(regra?.andamento_descricao);
    return normalizedRegra && normalizedRegra === normalizedTipo;
  });

  if (exactMatch) return exactMatch;

  const contemMatches = regrasContem
    .map((regra) => ({
      regra,
      normalizedRegra: normalizeAndamentoText(regra?.andamento_descricao),
    }))
    .filter(({ normalizedRegra }) => normalizedRegra && normalizedTipo.includes(normalizedRegra))
    .sort((a, b) => b.normalizedRegra.length - a.normalizedRegra.length);

  return contemMatches.length ? contemMatches[0].regra : null;
}

async function fetchNaoClassificado(tenantId) {
  const { data, error } = await withTenantFilter("evento_processual", tenantId)
    .select("id, nome, descricao")
    .eq("nome", EVENTO_NAO_CLASSIFICADO)
    .maybeSingle();

  if (error) {
    logWarn("evento.nao_classificado.fetch_error", "Erro ao buscar evento não classificado", {
      error,
      tenantId,
    });
  }

  if (!data) {
    return {
      id: null,
      nome: EVENTO_NAO_CLASSIFICADO,
      descricao: "Evento não classificado",
    };
  }

  return data;
}

async function fetchEventoById(eventoId, tenantId) {
  const { data, error } = await withTenantFilter("evento_processual", tenantId)
    .select("id, nome, descricao")
    .eq("id", eventoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchEventosAtivos(tenantId) {
  const { data, error } = await withTenantFilter("evento_processual", tenantId)
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function fetchAndamentoRules(tenantId, tipoMatch) {
  const { data, error } = await withTenantFilter("andamento_evento", tenantId)
    .select("id, andamento_descricao, evento_id, tipo_match")
    .eq("tipo_match", tipoMatch);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function fetchModeloSugerido(providenciaId, tenantId) {
  const { data, error } = await withTenantFilter("Modelos_Peticao", tenantId)
    .select("id, titulo")
    .eq("providencia_id", providenciaId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  if (!Array.isArray(data) || !data.length) return null;
  return { id: data[0].id, nome: data[0].titulo };
}

async function buildProvidenciaSugestao(rule, dataPublicacao, tenantId) {
  const providencia = rule?.providencia_juridica;
  if (!providencia || providencia.ativo === false) {
    return null;
  }

  const prazoSugerido = rule?.gera_prazo
    ? await buildPrazoSuggestion({
        dataPublicacao,
        prazoDias: rule?.prazo_dias,
        tipoPrazo: rule?.tipo_prazo,
      })
    : null;

  let modeloSugerido = null;
  if (providencia.exige_peticao) {
    modeloSugerido = await fetchModeloSugerido(providencia.id, tenantId);
  }

  return {
    id: providencia.id,
    nome: providencia.nome,
    descricao: providencia.descricao,
    exige_peticao: providencia.exige_peticao,
    prazo_sugerido: prazoSugerido,
    modelo_sugerido: modeloSugerido,
    observacao_juridica: rule?.observacao_juridica ?? null,
  };
}

async function fetchProvidenciasByEvento(eventoId, dataPublicacao, tenantId) {
  const { data, error } = await withTenantFilter("evento_providencia", tenantId)
    .select(
      `id,
      prioridade,
      gera_prazo,
      prazo_dias,
      tipo_prazo,
      padrao,
      observacao_juridica,
      providencia_id,
      providencia_juridica (
        id,
        nome,
        descricao,
        exige_peticao,
        ativo
      )`
    )
    .eq("evento_id", eventoId)
    .order("prioridade", { ascending: true });

  if (error) {
    throw error;
  }

  const rules = Array.isArray(data) ? data : [];
  if (!rules.length) {
    return { padrao: null, alternativas: [] };
  }

  const sorted = [...rules].sort((a, b) => {
    if (a.padrao && !b.padrao) return -1;
    if (!a.padrao && b.padrao) return 1;
    return (a.prioridade ?? 0) - (b.prioridade ?? 0);
  });

  const sugestoes = await Promise.all(
    sorted.map((rule) => buildProvidenciaSugestao(rule, dataPublicacao, tenantId))
  );

  const validSugestoes = sugestoes.filter(Boolean);
  if (!validSugestoes.length) {
    return { padrao: null, alternativas: [] };
  }

  const [padrao, ...alternativas] = validSugestoes;
  return { padrao, alternativas };
}

export async function findEventoByTipoAndamento({ tipoAndamento, tenantId }) {
  try {
    const regrasExatas = await fetchAndamentoRules(tenantId, "exato");
    const matchExact = matchAndamentoByRules({
      tipoAndamento,
      regrasExatas,
      regrasContem: [],
    });

    if (matchExact) {
      const evento = await fetchEventoById(matchExact.evento_id, tenantId);
      return evento ?? (await fetchNaoClassificado(tenantId));
    }

    const regrasContem = await fetchAndamentoRules(tenantId, "contem");
    const matchContem = matchAndamentoByRules({
      tipoAndamento,
      regrasExatas: [],
      regrasContem,
    });

    if (matchContem) {
      const evento = await fetchEventoById(matchContem.evento_id, tenantId);
      return evento ?? (await fetchNaoClassificado(tenantId));
    }

    logWarn("evento.match.miss", "Tipo de andamento sem match", {
      tipoAndamento,
      tenantId,
    });

    return await fetchNaoClassificado(tenantId);
  } catch (error) {
    logError("evento.match.error", "Erro ao resolver evento para andamento", {
      error,
      tipoAndamento,
      tenantId,
    });
    throw error;
  }
}

export async function getSugestaoEventoProvidencia({ itemId, tenantId, eventoId }) {
  if (!itemId || !tenantId) {
    const error = new Error("itemId e tenantId são obrigatórios para sugerir evento.");
    error.statusCode = 400;
    throw error;
  }

  const { data: item, error } = await withTenantFilter("similaridade_itens", tenantId)
    .select("id, tipo_andamento, data_publicacao")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!item) {
    const error = new Error("Item de similaridade não encontrado para o tenant.");
    error.statusCode = 404;
    throw error;
  }

  const eventos = await fetchEventosAtivos(tenantId);

  let evento = null;
  if (eventoId) {
    evento = await fetchEventoById(eventoId, tenantId);
    if (!evento) {
      const error = new Error("Evento não encontrado.");
      error.statusCode = 404;
      throw error;
    }
  } else {
    evento = await findEventoByTipoAndamento({
      tipoAndamento: item.tipo_andamento,
      tenantId,
    });
  }

  if (!evento?.id) {
    return {
      eventos,
      evento,
      providencia_padrao: null,
      alternativas: [],
    };
  }

  const { padrao, alternativas } = await fetchProvidenciasByEvento(
    evento.id,
    item.data_publicacao,
    tenantId
  );

  return {
    eventos,
    evento,
    providencia_padrao: padrao,
    alternativas,
  };
}

export async function confirmarAnaliseEventoProvidencia({
  itemId,
  eventoId,
  providenciaId,
  prazoFinal,
  modeloId,
  observacao,
  tenantId,
  userId,
}) {
  if (!itemId || !tenantId || !userId) {
    const error = new Error("itemId, tenantId e userId são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  if (!eventoId || !providenciaId) {
    const error = new Error("eventoId e providenciaId são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  const sugestao = await getSugestaoEventoProvidencia({ itemId, tenantId });
  const decisaoFinal = {
    idItem: itemId,
    evento_id: eventoId,
    providencia_id: providenciaId,
    prazo_final: prazoFinal ?? null,
    modelo_id: modeloId ?? null,
    observacao: observacao ?? null,
  };

  return withTransaction(async (client) => {
    const item = await fetchItemForUpdate(client, itemId, tenantId);
    ensureItemIsPendente(item);

    const auditoriaPayload = buildAuditoriaPayload({ sugestao, decisaoFinal });
    const prazoSugestaoJson = sugestao?.providencia_padrao?.prazo_sugerido
      ? JSON.stringify(sugestao.providencia_padrao.prazo_sugerido)
      : null;

    await client.query(
      `
        insert into auditoria_sugestao
          (publicacao_id, evento_sugerido_id, providencia_sugerida_id, prazo_sugerido, decisao_final_json, usuario_id, tenant_id, created_at)
        values ($1, $2, $3, $4, $5, $6, $7, now())
      `,
      [
        itemId,
        sugestao?.evento?.id ?? null,
        sugestao?.providencia_padrao?.id ?? null,
        prazoSugestaoJson,
        JSON.stringify(auditoriaPayload),
        userId,
        tenantId,
      ]
    );

    await client.query(
      `
        update similaridade_itens
        set status_decisao = 'analisado',
            updated_at = now()
        where id = $1
          and tenant_id = $2
      `,
      [itemId, tenantId]
    );

    return { message: "Decisão registrada com sucesso." };
  });
}
