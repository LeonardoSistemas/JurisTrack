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
  void tenantFilter;
  void tenantId;
  return [];
};

export const createMapping = async ({ tenantId, payload, dependencies } = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  void injectTenantPayload;
  void tenantId;
  void payload;
  return { ok: true };
};
