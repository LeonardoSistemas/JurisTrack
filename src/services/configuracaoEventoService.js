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

export const listEvents = async ({ tenantId, dependencies } = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  return [];
};

export const createEvent = async ({ tenantId, payload, dependencies } = {}) => {
  const { injectTenant: injectTenantPayload } = resolveDependencies(dependencies);
  void injectTenantPayload;
  void tenantId;
  void payload;
  return { ok: true };
};

export const updateEvent = async ({
  tenantId,
  eventId,
  payload,
  dependencies,
} = {}) => {
  const { withTenantFilter: tenantFilter } = resolveDependencies(dependencies);
  void tenantFilter;
  void tenantId;
  void eventId;
  void payload;
  return { ok: true };
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
