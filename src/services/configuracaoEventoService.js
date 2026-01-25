import supabase from "../config/supabase.js";
import { injectTenant, withTenantFilter } from "../repositories/tenantScope.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/authErrors.js";
import { nowIsoString } from "../utils/authUtils.js";

const DEFAULT_DEPENDENCIES = {
  supabase,
  withTenantFilter,
  injectTenant,
};

function resolveDependencies(dependencies) {
  return { ...DEFAULT_DEPENDENCIES, ...(dependencies || {}) };
}

export const listEvents = async ({
  tenantId,
  search,
  status,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  let query = tenantFilter("evento_processual", tenantId)
    .select("id, nome, descricao, ativo, created_at, updated_at")
    .order("nome", { ascending: true });

  return await executeEventListQuery(query, { search, status });
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : undefined;
  }
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "ativo" || normalized === "true" || normalized === "1") return true;
  if (normalized === "inativo" || normalized === "false" || normalized === "0") return false;
  throw new ValidationError("Status inválido. Use ativo|inativo.");
}

const ALLOWED_MATCH_TYPES = new Set(["exato", "contem"]);
const ALLOWED_PRAZO_TYPES = new Set(["util", "corrido", "data_fixa"]);

function normalizeMatchType(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    throw new ValidationError("Tipo de match é obrigatório.");
  }
  if (!ALLOWED_MATCH_TYPES.has(normalized)) {
    throw new ValidationError("Tipo de match inválido. Use exato|contem.");
  }
  return normalized;
}

function normalizeBoolean(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : undefined;
  }
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "sim") return true;
  if (normalized === "false" || normalized === "0" || normalized === "nao") return false;
  throw new ValidationError("Valor booleano inválido.");
}

function normalizePositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} deve ser um número inteiro maior que zero.`);
  }
  return parsed;
}

function normalizePrazoType(value, { allowNull = false } = {}) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    if (allowNull) return null;
    throw new ValidationError("Tipo de prazo é obrigatório.");
  }
  if (!ALLOWED_PRAZO_TYPES.has(normalized)) {
    throw new ValidationError("Tipo de prazo inválido. Use util|corrido|data_fixa.");
  }
  return normalized;
}

async function executeEventListQuery(query, { search, status } = {}) {
  const normalizedSearch = normalizeText(search);
  if (normalizedSearch) {
    query = query.or(
      `nome.ilike.%${normalizedSearch}%,descricao.ilike.%${normalizedSearch}%`
    );
  }

  const normalizedStatus = normalizeStatus(status, { allowNull: true });
  if (normalizedStatus !== null && normalizedStatus !== undefined) {
    query = query.eq("ativo", normalizedStatus);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export const createEvent = async ({ tenantId, payload, dependencies } = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const nome = normalizeText(payload.nome);
  if (!nome) {
    throw new ValidationError("Nome do evento é obrigatório.");
  }

  const descricao = normalizeText(payload.descricao) || null;
  const ativo = normalizeStatus(payload.ativo, { allowNull: true }) ?? true;

  const eventPayload = injectTenantPayload(
    {
      nome,
      descricao,
      ativo,
      updated_at: nowIsoString(),
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("evento_processual")
    .insert([eventPayload])
    .select("id, nome, descricao, ativo, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Evento já cadastrado para este tenant.");
    }
    throw error;
  }

  return data;
};

export const updateEvent = async ({
  tenantId,
  eventId,
  payload,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!eventId) {
    throw new ValidationError("eventId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const updatePayload = {};

  if (payload.nome !== undefined) {
    const nome = normalizeText(payload.nome);
    if (!nome) {
      throw new ValidationError("Nome do evento é obrigatório.");
    }
    updatePayload.nome = nome;
  }

  if (payload.descricao !== undefined) {
    const descricao = normalizeText(payload.descricao);
    updatePayload.descricao = descricao || null;
  }

  if (payload.ativo !== undefined) {
    updatePayload.ativo = normalizeStatus(payload.ativo);
  }

  if (!Object.keys(updatePayload).length) {
    throw new ValidationError("Nada para atualizar.");
  }

  updatePayload.updated_at = nowIsoString();

  const { data, error } = await tenantFilter("evento_processual", tenantId)
    .update(updatePayload)
    .eq("id", eventId)
    .select("id, nome, descricao, ativo, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Evento já cadastrado para este tenant.");
    }
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Evento não encontrado.");
  }

  return data;
};

export const listMappings = async ({ tenantId, dependencies } = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  const { data, error } = await tenantFilter("andamento_evento", tenantId)
    .select(
      "id, andamento_descricao, tipo_match, evento_id, created_at, updated_at, evento_processual (id, nome)"
    )
    .order("andamento_descricao", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const createMapping = async ({ tenantId, payload, dependencies } = {}) => {
  const { injectTenant: injectTenantPayload, withTenantFilter: tenantFilter } =
    resolveDependencies(dependencies);

  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const andamentoDescricao = normalizeText(payload.andamento_descricao);
  if (!andamentoDescricao) {
    throw new ValidationError("Descrição do andamento é obrigatória.");
  }

  const eventoId = normalizeText(payload.evento_id);
  if (!eventoId) {
    throw new ValidationError("Evento é obrigatório.");
  }

  const tipoMatch = normalizeMatchType(payload.tipo_match);

  const { data: eventData, error: eventError } = await tenantFilter(
    "evento_processual",
    tenantId
  )
    .select("id")
    .eq("id", eventoId)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!eventData) {
    throw new ValidationError("Evento inválido para o tenant informado.");
  }

  const mappingPayload = injectTenantPayload(
    {
      andamento_descricao: andamentoDescricao,
      evento_id: eventoId,
      tipo_match: tipoMatch,
      updated_at: nowIsoString(),
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("andamento_evento")
    .insert([mappingPayload])
    .select("id, andamento_descricao, tipo_match, evento_id, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Mapeamento já cadastrado para este tenant.");
    }
    throw error;
  }

  return data;
};

export const updateMapping = async ({
  tenantId,
  mappingId,
  payload,
  dependencies,
} = {}) => {
  const { injectTenant: injectTenantPayload, withTenantFilter: tenantFilter } =
    resolveDependencies(dependencies);

  if (!mappingId) {
    throw new ValidationError("mappingId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const andamentoDescricao = normalizeText(payload.andamento_descricao);
  if (!andamentoDescricao) {
    throw new ValidationError("Descrição do andamento é obrigatória.");
  }

  const eventoId = normalizeText(payload.evento_id);
  if (!eventoId) {
    throw new ValidationError("Evento é obrigatório.");
  }

  const tipoMatch = normalizeMatchType(payload.tipo_match);

  const { data: eventData, error: eventError } = await tenantFilter(
    "evento_processual",
    tenantId
  )
    .select("id")
    .eq("id", eventoId)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!eventData) {
    throw new ValidationError("Evento inválido para o tenant informado.");
  }

  const mappingPayload = injectTenantPayload(
    {
      andamento_descricao: andamentoDescricao,
      evento_id: eventoId,
      tipo_match: tipoMatch,
      updated_at: nowIsoString(),
    },
    tenantId
  );

  const { data, error } = await tenantFilter("andamento_evento", tenantId)
    .update(mappingPayload)
    .eq("id", mappingId)
    .select("id, andamento_descricao, tipo_match, evento_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Mapeamento já cadastrado para este tenant.");
    }
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Mapeamento não encontrado.");
  }

  return data;
};

export const deleteMapping = async ({ tenantId, mappingId, dependencies } = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!mappingId) {
    throw new ValidationError("mappingId é obrigatório.");
  }

  const { data, error } = await tenantFilter("andamento_evento", tenantId)
    .delete()
    .eq("id", mappingId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new NotFoundError("Mapeamento não encontrado.");
  }

  return { ok: true };
};

export const listEventoProvidencias = async ({
  tenantId,
  eventoId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  let query = tenantFilter("evento_providencia", tenantId)
    .select(
      `id,
      evento_id,
      providencia_id,
      prioridade,
      gera_prazo,
      prazo_dias,
      tipo_prazo,
      padrao,
      observacao_juridica,
      created_at,
      updated_at,
      evento_processual (id, nome),
      providencia_juridica (id, nome, ativo)`
    )
    .order("prioridade", { ascending: true });

  const normalizedEventoId = normalizeText(eventoId);
  if (normalizedEventoId) {
    query = query.eq("evento_id", normalizedEventoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const createEventoProvidencia = async ({
  tenantId,
  payload,
  dependencies,
} = {}) => {
  const { injectTenant: injectTenantPayload, withTenantFilter: tenantFilter } =
    resolveDependencies(dependencies);

  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const eventoId = normalizeText(payload.evento_id);
  if (!eventoId) {
    throw new ValidationError("Evento é obrigatório.");
  }

  const providenciaId = normalizeText(payload.providencia_id);
  if (!providenciaId) {
    throw new ValidationError("Providência é obrigatória.");
  }

  const prioridade = normalizePositiveInt(payload.prioridade, "Prioridade") ?? 1;
  const geraPrazo =
    normalizeBoolean(payload.gera_prazo, { allowNull: true }) ?? false;
  const prazoDias = normalizePositiveInt(payload.prazo_dias, "Dias");
  const tipoPrazo = normalizePrazoType(payload.tipo_prazo, { allowNull: true });
  const padrao = normalizeBoolean(payload.padrao, { allowNull: true }) ?? false;
  const observacaoJuridica = normalizeText(payload.observacao_juridica) || null;

  if (geraPrazo && (!prazoDias || !tipoPrazo)) {
    throw new ValidationError("Dias e tipo de prazo são obrigatórios.");
  }

  const { data: eventData, error: eventError } = await tenantFilter(
    "evento_processual",
    tenantId
  )
    .select("id")
    .eq("id", eventoId)
    .maybeSingle();
  if (eventError) throw eventError;
  if (!eventData) {
    throw new ValidationError("Evento inválido para o tenant informado.");
  }

  const { data: providenciaData, error: providenciaError } = await tenantFilter(
    "providencia_juridica",
    tenantId
  )
    .select("id")
    .eq("id", providenciaId)
    .maybeSingle();
  if (providenciaError) throw providenciaError;
  if (!providenciaData) {
    throw new ValidationError("Providência inválida para o tenant informado.");
  }

  if (padrao) {
    const { error: resetError } = await tenantFilter(
      "evento_providencia",
      tenantId
    )
      .update({ padrao: false, updated_at: nowIsoString() })
      .eq("evento_id", eventoId)
      .eq("padrao", true);
    if (resetError) throw resetError;
  }

  const regraPayload = injectTenantPayload(
    {
      evento_id: eventoId,
      providencia_id: providenciaId,
      prioridade,
      gera_prazo: geraPrazo,
      prazo_dias: geraPrazo ? prazoDias : null,
      tipo_prazo: geraPrazo ? tipoPrazo : null,
      padrao,
      observacao_juridica: observacaoJuridica,
      updated_at: nowIsoString(),
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("evento_providencia")
    .insert([regraPayload])
    .select(
      "id, evento_id, providencia_id, prioridade, gera_prazo, prazo_dias, tipo_prazo, padrao, observacao_juridica, created_at, updated_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Regra já cadastrada para este evento e providência.");
    }
    throw error;
  }

  return data;
};

export const updateEventoProvidencia = async ({
  tenantId,
  regraId,
  payload,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!regraId) {
    throw new ValidationError("regraId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const { data: currentRule, error: currentError } = await tenantFilter(
    "evento_providencia",
    tenantId
  )
    .select("id, evento_id, providencia_id, gera_prazo, prazo_dias, tipo_prazo, padrao")
    .eq("id", regraId)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!currentRule) {
    throw new NotFoundError("Regra não encontrada.");
  }

  const updatePayload = {};

  if (payload.evento_id !== undefined) {
    const eventoId = normalizeText(payload.evento_id);
    if (!eventoId) throw new ValidationError("Evento é obrigatório.");
    updatePayload.evento_id = eventoId;
  }

  if (payload.providencia_id !== undefined) {
    const providenciaId = normalizeText(payload.providencia_id);
    if (!providenciaId) throw new ValidationError("Providência é obrigatória.");
    updatePayload.providencia_id = providenciaId;
  }

  if (payload.prioridade !== undefined) {
    const prioridade = normalizePositiveInt(payload.prioridade, "Prioridade");
    if (!prioridade) {
      throw new ValidationError("Prioridade é obrigatória.");
    }
    updatePayload.prioridade = prioridade;
  }

  if (payload.gera_prazo !== undefined) {
    const geraPrazo = normalizeBoolean(payload.gera_prazo);
    if (geraPrazo === undefined) {
      throw new ValidationError("Gera prazo inválido.");
    }
    updatePayload.gera_prazo = geraPrazo;
  }

  if (payload.prazo_dias !== undefined) {
    updatePayload.prazo_dias = normalizePositiveInt(payload.prazo_dias, "Dias");
  }

  if (payload.tipo_prazo !== undefined) {
    updatePayload.tipo_prazo = normalizePrazoType(payload.tipo_prazo, {
      allowNull: true,
    });
  }

  if (payload.padrao !== undefined) {
    const padrao = normalizeBoolean(payload.padrao);
    if (padrao === undefined) {
      throw new ValidationError("Padrão inválido.");
    }
    updatePayload.padrao = padrao;
  }

  if (payload.observacao_juridica !== undefined) {
    updatePayload.observacao_juridica =
      normalizeText(payload.observacao_juridica) || null;
  }

  if (!Object.keys(updatePayload).length) {
    throw new ValidationError("Nada para atualizar.");
  }

  const eventoIdToUse = updatePayload.evento_id ?? currentRule.evento_id;
  const providenciaIdToUse =
    updatePayload.providencia_id ?? currentRule.providencia_id;

  const { data: eventData, error: eventError } = await tenantFilter(
    "evento_processual",
    tenantId
  )
    .select("id")
    .eq("id", eventoIdToUse)
    .maybeSingle();
  if (eventError) throw eventError;
  if (!eventData) {
    throw new ValidationError("Evento inválido para o tenant informado.");
  }

  const { data: providenciaData, error: providenciaError } = await tenantFilter(
    "providencia_juridica",
    tenantId
  )
    .select("id")
    .eq("id", providenciaIdToUse)
    .maybeSingle();
  if (providenciaError) throw providenciaError;
  if (!providenciaData) {
    throw new ValidationError("Providência inválida para o tenant informado.");
  }

  const finalGeraPrazo =
    updatePayload.gera_prazo ?? currentRule.gera_prazo ?? false;
  const finalPrazoDias =
    updatePayload.prazo_dias ?? currentRule.prazo_dias ?? null;
  const finalTipoPrazo =
    updatePayload.tipo_prazo ?? currentRule.tipo_prazo ?? null;

  if (finalGeraPrazo) {
    if (!finalPrazoDias || !finalTipoPrazo) {
      throw new ValidationError("Dias e tipo de prazo são obrigatórios.");
    }
  } else {
    updatePayload.prazo_dias = null;
    updatePayload.tipo_prazo = null;
  }

  if (updatePayload.padrao) {
    const { error: resetError } = await tenantFilter(
      "evento_providencia",
      tenantId
    )
      .update({ padrao: false, updated_at: nowIsoString() })
      .eq("evento_id", eventoIdToUse)
      .eq("padrao", true)
      .neq("id", regraId);
    if (resetError) throw resetError;
  }

  updatePayload.updated_at = nowIsoString();

  const { data, error } = await tenantFilter("evento_providencia", tenantId)
    .update(updatePayload)
    .eq("id", regraId)
    .select(
      "id, evento_id, providencia_id, prioridade, gera_prazo, prazo_dias, tipo_prazo, padrao, observacao_juridica, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Regra já cadastrada para este evento e providência.");
    }
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Regra não encontrada.");
  }

  return data;
};

export const deleteEventoProvidencia = async ({
  tenantId,
  regraId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!regraId) {
    throw new ValidationError("regraId é obrigatório.");
  }

  const { data, error } = await tenantFilter("evento_providencia", tenantId)
    .delete()
    .eq("id", regraId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new NotFoundError("Regra não encontrada.");
  }

  return { ok: true };
};
