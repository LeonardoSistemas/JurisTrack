-- Rollback da reestruturacao de peticoes.
-- Remove a tabela de vinculo criada.

do $$
begin
  execute 'drop table if exists public.peticionamento_providencia';
end
$$;
