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
  const normalizedProvidenciaId = normalizeText(providenciaId);
  if (!normalizedProvidenciaId) {
    throw new ValidationError("providenciaId é obrigatório.");
  }

  const { data, error } = await tenantFilter("providencia_checklist", tenantId)
    .select(
      "id, providencia_id, ordem, titulo, descricao, obrigatorio, created_at, updated_at"
    )
    .eq("providencia_id", normalizedProvidenciaId)
    .order("ordem", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const createChecklistItem = async ({
  tenantId,
  providenciaId,
  payload,
  dependencies,
} = {}) => {
  const { injectTenant: injectTenantPayload, withTenantFilter: tenantFilter } =
    resolveDependencies(dependencies);

  const normalizedProvidenciaId = normalizeText(providenciaId);
  if (!normalizedProvidenciaId) {
    throw new ValidationError("providenciaId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  await ensureProvidenciaExists({
    tenantFilter,
    tenantId,
    providenciaId: normalizedProvidenciaId,
  });

  const titulo = normalizeText(payload.titulo);
  if (!titulo) {
    throw new ValidationError("Título do checklist é obrigatório.");
  }

  const descricao = normalizeText(payload.descricao) || null;
  const obrigatorio =
    normalizeBoolean(payload.obrigatorio, { allowNull: true }) ?? true;
  let ordem = normalizeOrder(payload.ordem, { allowNull: true });

  if (!ordem) {
    ordem = await fetchNextChecklistOrder({
      tenantFilter,
      tenantId,
      providenciaId: normalizedProvidenciaId,
    });
  }

  const checklistPayload = injectTenantPayload(
    {
      providencia_id: normalizedProvidenciaId,
      ordem,
      titulo,
      descricao,
      obrigatorio,
      updated_at: nowIsoString(),
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("providencia_checklist")
    .insert([checklistPayload])
    .select(
      "id, providencia_id, ordem, titulo, descricao, obrigatorio, created_at, updated_at"
    )
    .single();

  if (error) throw error;
  return data;
};

export const updateChecklistItem = async ({
  tenantId,
  checklistItemId,
  payload,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!checklistItemId) {
    throw new ValidationError("checklistItemId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const { data: existingItem, error: existingError } = await tenantFilter(
    "providencia_checklist",
    tenantId
  )
    .select("id, providencia_id, ordem")
    .eq("id", checklistItemId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingItem) {
    throw new NotFoundError("Item de checklist não encontrado.");
  }

  const updatePayload = {};
  let newOrder = null;

  if (payload.titulo !== undefined) {
    const titulo = normalizeText(payload.titulo);
    if (!titulo) {
      throw new ValidationError("Título do checklist é obrigatório.");
    }
    updatePayload.titulo = titulo;
  }

  if (payload.descricao !== undefined) {
    const descricao = normalizeText(payload.descricao);
    updatePayload.descricao = descricao || null;
  }

  if (payload.obrigatorio !== undefined) {
    updatePayload.obrigatorio = normalizeBoolean(payload.obrigatorio);
  }

  if (payload.ordem !== undefined) {
    newOrder = normalizeOrder(payload.ordem);
  }

  if (!Object.keys(updatePayload).length && newOrder === null) {
    throw new ValidationError("Nada para atualizar.");
  }

  if (newOrder !== null) {
    await reorderChecklistItems({
      tenantFilter,
      tenantId,
      providenciaId: existingItem.providencia_id,
      targetId: existingItem.id,
      targetOrder: newOrder,
    });
  }

  if (Object.keys(updatePayload).length) {
    updatePayload.updated_at = nowIsoString();
    const { data, error } = await tenantFilter("providencia_checklist", tenantId)
      .update(updatePayload)
      .eq("id", checklistItemId)
      .select(
        "id, providencia_id, ordem, titulo, descricao, obrigatorio, created_at, updated_at"
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new NotFoundError("Item de checklist não encontrado.");
    }
    return data;
  }

  const { data, error } = await tenantFilter("providencia_checklist", tenantId)
    .select(
      "id, providencia_id, ordem, titulo, descricao, obrigatorio, created_at, updated_at"
    )
    .eq("id", checklistItemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new NotFoundError("Item de checklist não encontrado.");
  }
  return data;
};

export const deleteChecklistItem = async ({
  tenantId,
  checklistItemId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  if (!checklistItemId) {
    throw new ValidationError("checklistItemId é obrigatório.");
  }

  const { data: existingItem, error: existingError } = await tenantFilter(
    "providencia_checklist",
    tenantId
  )
    .select("id, providencia_id")
    .eq("id", checklistItemId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingItem) {
    throw new NotFoundError("Item de checklist não encontrado.");
  }

  const { data, error } = await tenantFilter("providencia_checklist", tenantId)
    .delete()
    .eq("id", checklistItemId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new NotFoundError("Item de checklist não encontrado.");
  }

  await resequenceChecklistItems({
    tenantFilter,
    tenantId,
    providenciaId: existingItem.providencia_id,
  });

  return { ok: true };
};

export const listProvidenciaModels = async ({
  tenantId,
  providenciaId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  const normalizedProvidenciaId = normalizeText(providenciaId);
  if (!normalizedProvidenciaId) {
    throw new ValidationError("providenciaId é obrigatório.");
  }

  const { data, error } = await tenantFilter("providencia_modelo", tenantId)
    .select(
      "id, providencia_id, modelo_id, created_at, modelo:Modelos_Peticao (id, titulo, descricao, tags)"
    )
    .eq("providencia_id", normalizedProvidenciaId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const addProvidenciaModel = async ({
  tenantId,
  providenciaId,
  payload,
  dependencies,
} = {}) => {
  const { injectTenant: injectTenantPayload, withTenantFilter: tenantFilter } =
    resolveDependencies(dependencies);

  const normalizedProvidenciaId = normalizeText(providenciaId);
  if (!normalizedProvidenciaId) {
    throw new ValidationError("providenciaId é obrigatório.");
  }
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Payload inválido.");
  }

  const modeloId = normalizeText(payload.modelo_id);
  if (!modeloId) {
    throw new ValidationError("modelo_id é obrigatório.");
  }

  await ensureProvidenciaExists({
    tenantFilter,
    tenantId,
    providenciaId: normalizedProvidenciaId,
  });

  const { data: modeloData, error: modeloError } = await tenantFilter(
    "Modelos_Peticao",
    tenantId
  )
    .select("id")
    .eq("id", modeloId)
    .maybeSingle();

  if (modeloError) throw modeloError;
  if (!modeloData) {
    throw new ValidationError("Modelo inválido para o tenant informado.");
  }

  const linkPayload = injectTenantPayload(
    {
      providencia_id: normalizedProvidenciaId,
      modelo_id: modeloId,
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("providencia_modelo")
    .insert([linkPayload])
    .select("id, providencia_id, modelo_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("Modelo já vinculado à providência.");
    }
    throw error;
  }

  return data;
};

export const removeProvidenciaModel = async ({
  tenantId,
  providenciaId,
  modeloId,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  const normalizedProvidenciaId = normalizeText(providenciaId);
  const normalizedModeloId = normalizeText(modeloId);
  if (!normalizedProvidenciaId) {
    throw new ValidationError("providenciaId é obrigatório.");
  }
  if (!normalizedModeloId) {
    throw new ValidationError("modeloId é obrigatório.");
  }

  const { data, error } = await tenantFilter("providencia_modelo", tenantId)
    .delete()
    .eq("providencia_id", normalizedProvidenciaId)
    .eq("modelo_id", normalizedModeloId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new NotFoundError("Vínculo não encontrado.");
  }

  return { ok: true };
};

function normalizeOrder(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    throw new ValidationError("Ordem deve ser um número inteiro maior que zero.");
  }
  return parsed;
}

async function ensureProvidenciaExists({ tenantFilter, tenantId, providenciaId }) {
  const { data, error } = await tenantFilter("providencia_juridica", tenantId)
    .select("id")
    .eq("id", providenciaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ValidationError("Providência inválida para o tenant informado.");
  }
}

async function fetchNextChecklistOrder({ tenantFilter, tenantId, providenciaId }) {
  const { data, error } = await tenantFilter("providencia_checklist", tenantId)
    .select("ordem")
    .eq("providencia_id", providenciaId)
    .order("ordem", { ascending: false })
    .limit(1);

  if (error) throw error;
  const lastOrder = Array.isArray(data) && data.length ? Number(data[0].ordem) : 0;
  return Number.isFinite(lastOrder) ? lastOrder + 1 : 1;
}

async function reorderChecklistItems({
  tenantFilter,
  tenantId,
  providenciaId,
  targetId,
  targetOrder,
}) {
  const { data, error } = await tenantFilter("providencia_checklist", tenantId)
    .select("id, ordem")
    .eq("providencia_id", providenciaId)
    .order("ordem", { ascending: true });

  if (error) throw error;
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return;

  const filtered = items.filter((item) => item.id !== targetId);
  const clampedOrder = Math.min(Math.max(targetOrder, 1), filtered.length + 1);
  filtered.splice(clampedOrder - 1, 0, { id: targetId });

  for (const [index, item] of filtered.entries()) {
    const { error: updateError } = await tenantFilter(
      "providencia_checklist",
      tenantId
    )
      .update({ ordem: index + 1, updated_at: nowIsoString() })
      .eq("id", item.id);

    if (updateError) throw updateError;
  }
}

async function resequenceChecklistItems({ tenantFilter, tenantId, providenciaId }) {
  const { data, error } = await tenantFilter("providencia_checklist", tenantId)
    .select("id, ordem")
    .eq("providencia_id", providenciaId)
    .order("ordem", { ascending: true });

  if (error) throw error;
  const items = Array.isArray(data) ? data : [];

  for (const [index, item] of items.entries()) {
    const { error: updateError } = await tenantFilter(
      "providencia_checklist",
      tenantId
    )
      .update({ ordem: index + 1, updated_at: nowIsoString() })
      .eq("id", item.id);

    if (updateError) throw updateError;
  }
}
