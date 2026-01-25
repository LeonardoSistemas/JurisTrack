-- DDL para checklists de providencias e vinculo com modelos de peticao.
-- Executar no Supabase SQL (idempotente sempre que possivel).

create extension if not exists "pgcrypto";

create table if not exists public.providencia_checklist (
  id uuid primary key default gen_random_uuid(),
  providencia_id uuid not null references public.providencia_juridica(id) on delete cascade,
  ordem int not null,
  titulo text not null,
  descricao text,
  obrigatorio boolean not null default true,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.providencia_modelo (
  id uuid primary key default gen_random_uuid(),
  providencia_id uuid not null references public.providencia_juridica(id) on delete cascade,
  modelo_id uuid not null references public."Modelos_Peticao"(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (providencia_id, modelo_id, tenant_id)
);

create index if not exists providencia_checklist_providencia_idx
  on public.providencia_checklist (tenant_id, providencia_id);
