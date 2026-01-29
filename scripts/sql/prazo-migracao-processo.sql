-- Migration for Prazo to link by process (phased).
-- Execute in Supabase SQL.

-- Phase 1: Structure (nullable columns)
alter table "Prazo"
  add column if not exists processoid uuid,
  add column if not exists status_id uuid;

-- If processoid was created with the wrong type, fix it
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Prazo'
      and column_name = 'processoid'
      and data_type <> 'uuid'
  ) then
    alter table "Prazo"
      alter column processoid type uuid
      using processoid::uuid;
  end if;
end $$;

-- Phase 2: Backfill
-- Fill processoid from Publicacao
update "Prazo" p
set processoid = pub.processoid
from "Publicacao" pub
where p.processoid is null
  and p.publicacaoid = pub.id;

-- Fill status_id with the 'pendente' status
with pendente as (
  select id
  from public.aux_status
  where nome = 'pendente'
    and dominio = 'prazo'
  limit 1
)
update "Prazo" p
set status_id = pendente.id
from pendente
where p.status_id is null;

-- Log orphan records (no processoid) before removal
create table if not exists public.prazo_orfaos_migracao (
  prazo_id uuid primary key,
  publicacaoid uuid,
  detected_at timestamptz not null default now()
);

insert into public.prazo_orfaos_migracao (prazo_id, publicacaoid)
select p.id, p.publicacaoid
from "Prazo" p
where p.processoid is null
on conflict (prazo_id) do nothing;

-- Remove orphan records
delete from "Prazo"
where processoid is null;

-- Phase 3: Cleanup
alter table "Prazo"
  alter column processoid set not null,
  alter column status_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prazo_processoid_fkey'
  ) then
    alter table "Prazo"
      add constraint prazo_processoid_fkey
      foreign key (processoid)
      references public.processos (idprocesso);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prazo_status_id_fkey'
  ) then
    alter table "Prazo"
      add constraint prazo_status_id_fkey
      foreign key (status_id)
      references public.aux_status (id);
  end if;
end $$;

-- Drop indexes tied to publicacaoid
do $$
declare
  idx record;
begin
  for idx in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and lower(tablename) = 'prazo'
      and indexdef ilike '%publicacaoid%'
  loop
    execute format('drop index if exists public.%I', idx.indexname);
  end loop;
end $$;

alter table "Prazo"
  drop column if exists publicacaoid;

create index if not exists prazo_tenant_processoid_idx
  on "Prazo" (tenant_id, processoid);
