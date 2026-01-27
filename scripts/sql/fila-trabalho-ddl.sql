-- DDL for work queue tables.
-- Execute in Supabase SQL (idempotent when possible).

create extension if not exists "pgcrypto";

create table if not exists public.aux_status (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dominio text not null,
  ativo boolean not null default true,
  cor_hex text
);

-- Seed initial statuses for work queue lifecycle.
insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'Aguardando', 'tarefa_fila_trabalho', true, '#9e9e9e'
where not exists (
  select 1
  from public.aux_status
  where nome = 'Aguardando'
    and dominio = 'tarefa_fila_trabalho'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'Em Elaboração', 'tarefa_fila_trabalho', true, '#2196f3'
where not exists (
  select 1
  from public.aux_status
  where nome = 'Em Elaboração'
    and dominio = 'tarefa_fila_trabalho'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'Em Revisão', 'tarefa_fila_trabalho', true, '#9c27b0'
where not exists (
  select 1
  from public.aux_status
  where nome = 'Em Revisão'
    and dominio = 'tarefa_fila_trabalho'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'Pronto para Protocolo', 'tarefa_fila_trabalho', true, '#ff9800'
where not exists (
  select 1
  from public.aux_status
  where nome = 'Pronto para Protocolo'
    and dominio = 'tarefa_fila_trabalho'
);

insert into public.aux_status (nome, dominio, ativo, cor_hex)
select 'Protocolado', 'tarefa_fila_trabalho', true, '#4caf50'
where not exists (
  select 1
  from public.aux_status
  where nome = 'Protocolado'
    and dominio = 'tarefa_fila_trabalho'
);

create table if not exists public.tarefa_fila_trabalho (
  id uuid primary key default gen_random_uuid(),
  processo_id integer not null references public.processos(idprocesso) on delete cascade,
  evento_id uuid not null references public.evento_processual(id) on delete restrict,
  providencia_id uuid not null references public.providencia_juridica(id) on delete restrict,
  responsavel_id uuid not null references public.users(id) on delete restrict,
  revisor_id uuid references public.users(id) on delete set null,
  status_id uuid not null references public.aux_status(id) on delete restrict,
  data_limite date not null,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tarefa_checklist_item (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefa_fila_trabalho(id) on delete cascade,
  titulo text not null,
  ordem int not null default 0,
  concluido boolean not null default false,
  obrigatorio boolean not null default true,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tarefa_fila_trabalho_tenant_idx
  on public.tarefa_fila_trabalho (tenant_id);

create index if not exists tarefa_fila_trabalho_responsavel_idx
  on public.tarefa_fila_trabalho (tenant_id, responsavel_id);

create index if not exists tarefa_fila_trabalho_data_limite_idx
  on public.tarefa_fila_trabalho (tenant_id, data_limite);

create index if not exists tarefa_checklist_item_tenant_tarefa_idx
  on public.tarefa_checklist_item (tenant_id, tarefa_id);

alter table public.tarefa_fila_trabalho enable row level security;
alter table public.tarefa_checklist_item enable row level security;

create policy tarefa_fila_trabalho_tenant_select
  on public.tarefa_fila_trabalho
  for select
  using (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_fila_trabalho_tenant_insert
  on public.tarefa_fila_trabalho
  for insert
  with check (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_fila_trabalho_tenant_update
  on public.tarefa_fila_trabalho
  for update
  using (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  )
  with check (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_fila_trabalho_tenant_delete
  on public.tarefa_fila_trabalho
  for delete
  using (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_checklist_item_tenant_select
  on public.tarefa_checklist_item
  for select
  using (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_checklist_item_tenant_insert
  on public.tarefa_checklist_item
  for insert
  with check (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_checklist_item_tenant_update
  on public.tarefa_checklist_item
  for update
  using (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  )
  with check (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );

create policy tarefa_checklist_item_tenant_delete
  on public.tarefa_checklist_item
  for delete
  using (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId')::uuid
    or auth.role() = 'service_role'
  );
