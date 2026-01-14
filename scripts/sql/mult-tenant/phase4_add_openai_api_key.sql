-- Fase 4 multi-tenant: adiciona chave OpenAI por tenant
-- Idempotente: coluna opcional para ser populada posteriormente.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS openai_api_key text;
