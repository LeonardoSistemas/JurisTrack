-- DDL and seed for prazo status and audit table.
-- Execute in Supabase SQL (idempotent when possible).

create extension if not exists "pgcrypto";

-- Seed prazo status domain.
insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'pendente', 'prazo', true, null
where not exists (
  select 1
  from public.aux_status
  where nome = 'pendente'
    and dominio = 'prazo'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'concluido', 'prazo', true, null
where not exists (
  select 1
  from public.aux_status
  where nome = 'concluido'
    and dominio = 'prazo'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'cancelado', 'prazo', true, null
where not exists (
  select 1
  from public.aux_status
  where nome = 'cancelado'
    and dominio = 'prazo'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'em atraso', 'prazo', true, null
where not exists (
  select 1
  from public.aux_status
  where nome = 'em atraso'
    and dominio = 'prazo'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'suspenso', 'prazo', true, null
where not exists (
  select 1
  from public.aux_status
  where nome = 'suspenso'
    and dominio = 'prazo'
);

-- Audit table for prazo status changes.
create table if not exists public.prazo_auditoria (
  id uuid primary key default gen_random_uuid(),
  prazo_id uuid not null references "Prazo"(id) on delete cascade,
  status_anterior_id uuid references public.aux_status(id) on delete restrict,
  status_novo_id uuid not null references public.aux_status(id) on delete restrict,
  usuario_id uuid not null references public.users(id) on delete restrict,
  data_alteracao timestamptz not null default now()
);
