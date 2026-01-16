-- Adiciona coluna tipo_andamento na tabela similaridade_itens
ALTER TABLE similaridade_itens 
ADD COLUMN IF NOT EXISTS tipo_andamento TEXT;

-- Comentário para documentação
COMMENT ON COLUMN similaridade_itens.tipo_andamento IS 'Tipo de andamento processado pela IA para auxiliar na conciliação';
