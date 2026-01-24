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

export const listProvidencias = async ({
  tenantId,
  search,
  status,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  let query = tenantFilter("providencia_juridica", tenantId)
    .select("id, nome, descricao, exige_peticao, ativo, created_at, updated_at")
    .order("nome", { ascending: true });

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
};

export const createProvidencia = async ({ tenantId, payload, dependencies } = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const nome = normalizeText(payload.nome);
  if (!nome) {
    throw new ValidationError("Nome da providência é obrigatório.");
  }

  const descricao = normalizeText(payload.descricao) || null;
  const exigePeticao =
    normalizeBoolean(payload.exige_peticao, { allowNull: true }) ?? false;
  const ativo = normalizeStatus(payload.ativo, { allowNull: true }) ?? true;

  const providenciaPayload = injectTenantPayload(
    {
      nome,
      descricao,
      exige_peticao: exigePeticao,
      ativo,
      updated_at: nowIsoString(),
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("providencia_juridica")
    .insert([providenciaPayload])
    .select("id, nome, descricao, exige_peticao, ativo, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Providência já cadastrada para este tenant.");
    }
    throw error;
  }

  return data;
};

export const updateProvidencia = async ({
  tenantId,
  providenciaId,
  payload,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!providenciaId) {
    throw new ValidationError("providenciaId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const updatePayload = {};

  if (payload.nome !== undefined) {
    const nome = normalizeText(payload.nome);
    if (!nome) {
      throw new ValidationError("Nome da providência é obrigatório.");
    }
    updatePayload.nome = nome;
  }

  if (payload.descricao !== undefined) {
    const descricao = normalizeText(payload.descricao);
    updatePayload.descricao = descricao || null;
  }

  if (payload.exige_peticao !== undefined) {
    updatePayload.exige_peticao = normalizeBoolean(payload.exige_peticao);
  }

  if (payload.ativo !== undefined) {
    updatePayload.ativo = normalizeStatus(payload.ativo);
  }

  if (!Object.keys(updatePayload).length) {
    throw new ValidationError("Nada para atualizar.");
  }

  updatePayload.updated_at = nowIsoString();

  const { data, error } = await tenantFilter("providencia_juridica", tenantId)
    .update(updatePayload)
    .eq("id", providenciaId)
    .select("id, nome, descricao, exige_peticao, ativo, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Providência já cadastrada para este tenant.");
    }
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Providência não encontrada.");
  }

  return data;
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
  if (normalized === "inativo" || normalized === "false" || normalized === "0")
    return false;
  throw new ValidationError("Status inválido. Use ativo|inativo.");
}

function normalizeBoolean(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : undefined;
  }
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "sim")
    return true;
  if (normalized === "false" || normalized === "0" || normalized === "nao")
    return false;
  throw new ValidationError("Valor booleano inválido.");
}

export const listChecklistItems = async ({
  tenantId,
  providenciaId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  void providenciaId;
  return [];
};

export const createChecklistItem = async ({
  tenantId,
  providenciaId,
  payload,
  dependencies,
} = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  void injectTenantPayload;
  void tenantId;
  void providenciaId;
  void payload;
  return { ok: true };
};

export const updateChecklistItem = async ({
  tenantId,
  checklistItemId,
  payload,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  void checklistItemId;
  void payload;
  return { ok: true };
};

export const deleteChecklistItem = async ({
  tenantId,
  checklistItemId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  void checklistItemId;
  return { ok: true };
};

export const listProvidenciaModels = async ({
  tenantId,
  providenciaId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  void providenciaId;
  return [];
};

export const addProvidenciaModel = async ({
  tenantId,
  providenciaId,
  payload,
  dependencies,
} = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  void injectTenantPayload;
  void tenantId;
  void providenciaId;
  void payload;
  return { ok: true };
};

export const removeProvidenciaModel = async ({
  tenantId,
  providenciaId,
  modeloId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  void providenciaId;
  void modeloId;
  return { ok: true };
};
