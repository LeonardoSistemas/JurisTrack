-- DDL para login multi-tenant (tenants e users)
-- Executar no Supabase SQL (idempotente sempre que possível).

-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  openai_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compat: garante coluna mesmo se tabela já existir
alter table public.tenants
  add column if not exists openai_api_key text;

create index if not exists idx_tenants_status on public.tenants (status);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text not null,
  password_hash text not null,
  role text not null check (role in ('advogado','admin')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce e-mail sempre minúsculo
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_email_lowercase_chk') then
    alter table public.users
      add constraint users_email_lowercase_chk check (email = lower(email));
  end if;
end$$;

-- Unicidade global de e-mail (case-insensitive)
create unique index if not exists users_email_unique_lower on public.users (lower(email));

-- Índice para consultas por tenant
create index if not exists idx_users_tenant on public.users (tenant_id);

