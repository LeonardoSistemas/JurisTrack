-- Tabela para armazenar resultados de similaridade por upload
create table if not exists similaridade_resultados (
  id uuid default gen_random_uuid() primary key,
  upload_documento_id bigint not null,
  tenant_id text not null,
  resultado_json jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- FK para uploads (ajuste o nome da tabela/coluna se divergir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_similaridade_upload'
      AND conrelid = 'similaridade_resultados'::regclass
  ) THEN
    ALTER TABLE similaridade_resultados
      ADD CONSTRAINT fk_similaridade_upload
        FOREIGN KEY (upload_documento_id)
        REFERENCES upload_Documentos(id);
  END IF;
END$$;

-- Índice por upload para buscas rápidas
-- Para upsert por upload_documento_id + tenant_id é necessário índice único
create unique index if not exists uq_similaridade_upload_tenant
  on similaridade_resultados (upload_documento_id, tenant_id);

-- Índice opcional por tenant
create index if not exists idx_similaridade_tenant
  on similaridade_resultados (tenant_id);


