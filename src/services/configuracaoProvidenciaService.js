import supabase from "../config/supabase.js";
import { injectTenant, withTenantFilter } from "../repositories/tenantScope.js";

const DEFAULT_DEPENDENCIES = {
  supabase,
  withTenantFilter,
  injectTenant,
};

function resolveDependencies(dependencies) {
  return { ...DEFAULT_DEPENDENCIES, ...(dependencies || {}) };
}

export const listProvidencias = async ({ tenantId, dependencies } = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  return [];
};

export const createProvidencia = async ({ tenantId, payload, dependencies } = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  void injectTenantPayload;
  void tenantId;
  void payload;
  return { ok: true };
};

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
