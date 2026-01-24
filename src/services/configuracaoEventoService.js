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
