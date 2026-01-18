import { withTenantFilter } from "../repositories/tenantScope.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";
import { logWarn, logError } from "../utils/logger.js";
import { buildPrazoSuggestion } from "./prazoService.js";

const EVENTO_NAO_CLASSIFICADO = "EVENTO_NAO_CLASSIFICADO";

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
  const { data, error } = await withTenantFilter("modelo_peticao", tenantId)
    .select("id, nome")
    .eq("providencia_id", providenciaId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length ? data[0] : null;
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

export async function getSugestaoEventoProvidencia({ itemId, tenantId }) {
  if (!itemId || !tenantId) {
    throw new Error("itemId e tenantId são obrigatórios para sugerir evento.");
  }

  const { data: item, error } = await withTenantFilter("similaridade_itens", tenantId)
    .select("id, tipo_andamento, data_publicacao")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!item) {
    throw new Error("Item de similaridade não encontrado para o tenant.");
  }

  const evento = await findEventoByTipoAndamento({
    tipoAndamento: item.tipo_andamento,
    tenantId,
  });

  if (!evento?.id) {
    return {
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
    evento,
    providencia_padrao: padrao,
    alternativas,
  };
}
