import supabase from "../config/supabase.js";
import { RepositoryError, ValidationError } from "../utils/authErrors.js";

export async function findTenantById(tenantId) {
  if (!tenantId) {
    throw new ValidationError("tenantId é obrigatório.");
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("id, nome, status, openai_api_key, created_at, updated_at")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "Erro ao buscar tenant por id.",
      500,
      "repository",
      error
    );
  }

  return data ?? null;
}

export async function findActiveTenantById(tenantId) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) return null;
  return tenant.status === "ativo" ? tenant : null;
}

