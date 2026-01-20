-- 1. Tabela de vínculo entre item de similaridade e publicação
CREATE TABLE IF NOT EXISTS similaridade_item_publicacao (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_similaridade_id uuid NOT NULL REFERENCES similaridade_itens(id),
  publicacao_id uuid NOT NULL REFERENCES "Publicacao"(id),
  tenant_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (item_similaridade_id, publicacao_id)
);

-- 2. Auditoria de sugestão no prazo
ALTER TABLE "Prazo"
  ADD COLUMN IF NOT EXISTS auditoria_sugestao_id uuid REFERENCES auditoria_sugestao(id);

-- 3. Atualização de status_decisao (constraint CHECK)
DO $$
DECLARE
  existing_constraint_name text;
BEGIN
  SELECT con.conname
    INTO existing_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
  WHERE rel.relname = 'similaridade_itens'
    AND con.contype = 'c'
    AND att.attname = 'status_decisao'
  LIMIT 1;

  IF existing_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE similaridade_itens DROP CONSTRAINT %I', existing_constraint_name);
  END IF;
END $$;

-- Normaliza valores legados para evitar violação do CHECK
UPDATE similaridade_itens
SET status_decisao = CASE
  WHEN status_decisao IS NULL THEN 'pendente'
  WHEN lower(status_decisao) = 'cadastrado' THEN 'analisado_com_prazo'
  WHEN lower(status_decisao) IN ('pendente', 'cadastrado_sem_prazo', 'analisado_com_prazo', 'cancelado') THEN lower(status_decisao)
  ELSE 'pendente'
END
WHERE status_decisao IS NULL
   OR lower(status_decisao) NOT IN ('pendente', 'cadastrado_sem_prazo', 'analisado_com_prazo', 'cancelado');

ALTER TABLE similaridade_itens
  ADD CONSTRAINT similaridade_itens_status_decisao_check
  CHECK (status_decisao IN ('pendente', 'cadastrado_sem_prazo', 'analisado_com_prazo', 'cancelado'));
