-- 1. Tabela de itens normalizada para controle individual
-- Extensão necessária para colunas do tipo vector (embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS similaridade_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_documento_id bigint NOT NULL,
  tenant_id text NOT NULL,
  status_verificacao text, -- NOVO, POSSIVEL_DUPLICADO, etc.
  status_decisao text DEFAULT 'pendente', -- pendente, cadastrado, cancelado
  similaridade_score decimal,
  numero_processo text,
  texto_publicacao text,
  data_publicacao date,
  prazo_dias integer,
  data_vencimento date,
  hash_publicacao text,
  embedding vector(1536),
  dados_originais jsonb, -- Guarda o objeto completo vindo do N8N
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_item_upload FOREIGN KEY (upload_documento_id) REFERENCES "upload_Documentos"(id)
);

-- Ajuste idempotente das novas colunas quando a tabela já existe
ALTER TABLE similaridade_itens
  ADD COLUMN IF NOT EXISTS numero_processo text,
  ADD COLUMN IF NOT EXISTS texto_publicacao text,
  ADD COLUMN IF NOT EXISTS data_publicacao date,
  ADD COLUMN IF NOT EXISTS prazo_dias integer,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS hash_publicacao text,
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 2. Tabela de Auditoria de Descartes
CREATE TABLE IF NOT EXISTS similaridade_descartes_auditoria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_similaridade_id uuid,
  tenant_id text NOT NULL,
  dados_descartados jsonb,
  motivo text DEFAULT 'Descartado pelo usuário na conciliação',
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_sim_itens_upload ON similaridade_itens(upload_documento_id);
CREATE INDEX IF NOT EXISTS idx_sim_itens_tenant ON similaridade_itens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sim_itens_processo ON similaridade_itens(numero_processo);
CREATE INDEX IF NOT EXISTS idx_sim_itens_status ON similaridade_itens(status_decisao);