import supabase from "../config/supabase.js";
import {
  ConflictError,
  NotFoundError,
  RepositoryError,
  ValidationError,
} from "../utils/authErrors.js";
import {
  assertEmail,
  assertRole,
  assertStatus,
  nowIsoString,
} from "../utils/authUtils.js";
import { injectTenant, withTenantFilter } from "./tenantScope.js";

const BASE_COLUMNS =
  "id, email, nome, role, status, tenant_id, created_at, updated_at, password_hash";

export async function findUserByEmail(rawEmail) {
  const email = assertEmail(rawEmail);

  const { data, error } = await supabase
    .from("users")
    .select(BASE_COLUMNS)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "Erro ao buscar usuário por e-mail.",
      500,
      "repository",
      error
    );
  }

  return data ?? null;
}

export async function findUserById(id) {
  if (!id) throw new ValidationError("id do usuário é obrigatório.");

  const { data, error } = await supabase
    .from("users")
    .select(BASE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "Erro ao buscar usuário por id.",
      500,
      "repository",
      error
    );
  }

  return data ?? null;
}

export async function listUsersByTenant({ tenantId, status }) {
  if (!tenantId) throw new ValidationError("tenantId é obrigatório.");

  let query = withTenantFilter("users", tenantId)
    .select("id, email, nome, role, status, tenant_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (status) {
    const normalizedStatus = assertStatus(status);
    query = query.eq("status", normalizedStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new RepositoryError(
      "Erro ao listar usuários por tenant.",
      500,
      "repository",
      error
    );
  }

  return data ?? [];
}

export async function createUser({
  nome, 
  email,
  passwordHash,
  role,
  tenantId,
  status = "ativo",
}) {
  const normalizedEmail = assertEmail(email);
  const normalizedRole = assertRole(role);
  const normalizedStatus = assertStatus(status);

  if (!passwordHash) {
    throw new ValidationError("passwordHash é obrigatório.");
  }
  if (!tenantId) {
    throw new ValidationError("tenantId é obrigatório.");
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new ConflictError("E-mail já cadastrado.");
  }

  const timestamp = nowIsoString();

  const { data, error } = await supabase
    .from("users")
    .insert([
      injectTenant(
        {
          nome,
          email: normalizedEmail,
          password_hash: passwordHash,
          role: normalizedRole,
          status: normalizedStatus,
          created_at: timestamp,
          updated_at: timestamp,
        },
        tenantId
      ),
    ])
    .select("id, nome,email, role, status, tenant_id, created_at, updated_at")
    .single();

  if (error) {
    throw new RepositoryError(
      "Erro ao criar usuário.",
      500,
      "repository",
      error
    );
  }

  return data;
}

export async function updateUser(id, { role, status, passwordHash }, tenantId) {
  if (!id) throw new ValidationError("id do usuário é obrigatório.");
  if (!tenantId) throw new ValidationError("tenantId é obrigatório.");

  const payload = {};
  if (role !== undefined) {
    payload.role = assertRole(role);
  }
  if (status !== undefined) {
    payload.status = assertStatus(status);
  }
  if (passwordHash !== undefined) {
    payload.password_hash = passwordHash;
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError("Nada para atualizar.");
  }

  payload.updated_at = nowIsoString();

  const { data, error } = await withTenantFilter("users", tenantId)
    .update(payload)
    .eq("id", id)
    .select("id, email, role, status, tenant_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "Erro ao atualizar usuário.",
      500,
      "repository",
      error
    );
  }

  if (!data) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  return data;
}

