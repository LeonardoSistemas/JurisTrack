-- DDL para reestruturar peticoes com vinculo a tarefas/processos.
-- Executar no Supabase SQL (Postgres).

create extension if not exists "pgcrypto";

do $$
declare
  target_name text;
  processo_doc_table text;
begin
  target_name := 'public.peticionamento_providencia';

  execute '
    create table if not exists public.peticionamento_providencia (
      id uuid primary key default gen_random_uuid(),
      tarefa_id uuid,
      processo_id integer,
      processo_doc_id uuid,
      status_id uuid,
      caminho_arquivo text,
      created_at timestamptz not null default now()
    )
  ';

  if to_regclass('public.tarefa_fila_trabalho') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'peticao_vinculo_tarefa_id_fkey'
    ) then
      execute format(
        'alter table %s add constraint peticao_vinculo_tarefa_id_fkey
         foreign key (tarefa_id) references public.tarefa_fila_trabalho(id) on delete set null',
        target_name
      );
    end if;
  end if;

  if to_regclass('public.processos') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'peticao_vinculo_processo_id_fkey'
    ) then
      execute format(
        'alter table %s add constraint peticao_vinculo_processo_id_fkey
         foreign key (processo_id) references public.processos(idprocesso) on delete set null',
        target_name
      );
    end if;
  end if;

  if to_regclass('public.aux_status') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'peticao_vinculo_status_id_fkey'
    ) then
      execute format(
        'alter table %s add constraint peticao_vinculo_status_id_fkey
         foreign key (status_id) references public.aux_status(id) on delete set null',
        target_name
      );
    end if;
  end if;

  if to_regclass('public."processo_Doc"') is not null then
    processo_doc_table := 'public."processo_Doc"';
  elsif to_regclass('public.processo_doc') is not null then
    processo_doc_table := 'public.processo_doc';
  end if;

  if processo_doc_table is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'peticao_vinculo_processo_doc_id_fkey'
    ) then
      execute format(
        'alter table %s add constraint peticao_vinculo_processo_doc_id_fkey
         foreign key (processo_doc_id) references %s(id) on delete set null',
        target_name,
        processo_doc_table
      );
    end if;
  end if;
end
$$;
