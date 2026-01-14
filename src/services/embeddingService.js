import OpenAI from "openai";
import { findTenantById } from "../repositories/tenantRepository.js";

const clientCache = new Map();

function getOpenAIClient(apiKey) {
  if (!apiKey) {
    throw new Error("Chave da OpenAI não configurada para o tenant.");
  }

  if (clientCache.has(apiKey)) {
    return clientCache.get(apiKey);
  }

  const instance = new OpenAI({ apiKey });
  clientCache.set(apiKey, instance);
  return instance;
}

async function resolveTenantApiKey(tenantId) {
  if (!tenantId) {
    throw new Error("tenantId é obrigatório para gerar embedding.");
  }

  const tenant = await findTenantById(tenantId);

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  if (tenant.status !== "ativo") {
    throw new Error("Tenant inativo ou bloqueado.");
  }

  if (!tenant.openai_api_key) {
    throw new Error("Tenant sem chave OpenAI configurada.");
  }

  return tenant.openai_api_key;
}

export async function gerarEmbedding(texto, tenantId) {
  if (!texto) {
    throw new Error("Texto é obrigatório para gerar embedding.");
  }

  const apiKey = await resolveTenantApiKey(tenantId);
  const client = getOpenAIClient(apiKey);

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texto,
  });

  return response.data[0].embedding;
}
