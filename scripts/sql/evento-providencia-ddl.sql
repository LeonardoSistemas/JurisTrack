-- DDL para amarracao de eventos processuais, providencias e auditoria
-- Executar no Supabase SQL (idempotente sempre que possivel).

create extension if not exists "pgcrypto";

create table if not exists public.evento_processual (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.andamento_evento (
  id uuid primary key default gen_random_uuid(),
  andamento_descricao text not null,
  evento_id uuid not null references public.evento_processual(id) on delete restrict,
  tipo_match text not null check (tipo_match in ('exato', 'contem')),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.providencia_juridica (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  exige_peticao boolean not null default false,
  ativo boolean not null default true,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evento_providencia (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.evento_processual(id) on delete restrict,
  providencia_id uuid not null references public.providencia_juridica(id) on delete restrict,
  prioridade int not null default 1,
  gera_prazo boolean not null default false,
  prazo_dias int,
  tipo_prazo text check (tipo_prazo in ('util', 'corrido', 'data_fixa')),
  padrao boolean not null default false,
  observacao_juridica text,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (not gera_prazo)
    or (prazo_dias is not null and prazo_dias > 0 and tipo_prazo is not null)
  )
);

-- A tabela "Modelos_Peticao" ja existe no banco.
-- Ajustes para suportar o fluxo de providencias e templates.
alter table public."Modelos_Peticao"
  add column if not exists providencia_id uuid references public.providencia_juridica(id) on delete restrict,
  add column if not exists variaveis jsonb,
  add column if not exists ativo boolean not null default true;

create table if not exists public.auditoria_sugestao (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null,
  evento_sugerido_id uuid references public.evento_processual(id) on delete restrict,
  providencia_sugerida_id uuid references public.providencia_juridica(id) on delete restrict,
  prazo_sugerido jsonb,
  decisao_final_json jsonb,
  usuario_id uuid references public.users(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists evento_processual_tenant_nome_unique
  on public.evento_processual (tenant_id, nome);

create unique index if not exists providencia_juridica_tenant_nome_unique
  on public.providencia_juridica (tenant_id, nome);

create unique index if not exists andamento_evento_tenant_desc_match_unique
  on public.andamento_evento (tenant_id, andamento_descricao, tipo_match);

create unique index if not exists evento_providencia_tenant_evento_providencia_unique
  on public.evento_providencia (tenant_id, evento_id, providencia_id);

create unique index if not exists modelos_peticao_tenant_providencia_titulo_unique
  on public."Modelos_Peticao" (tenant_id, providencia_id, titulo);

create unique index if not exists evento_providencia_padrao_unique
  on public.evento_providencia (tenant_id, evento_id)
  where padrao = true;

create index if not exists andamento_evento_tenant_idx
  on public.andamento_evento (tenant_id, evento_id);

create index if not exists evento_providencia_tenant_evento_idx
  on public.evento_providencia (tenant_id, evento_id);

create index if not exists evento_providencia_tenant_providencia_idx
  on public.evento_providencia (tenant_id, providencia_id);

create index if not exists modelos_peticao_tenant_providencia_idx
  on public."Modelos_Peticao" (tenant_id, providencia_id);

create index if not exists auditoria_sugestao_tenant_idx
  on public.auditoria_sugestao (tenant_id);

create index if not exists auditoria_sugestao_publicacao_idx
  on public.auditoria_sugestao (publicacao_id);

create index if not exists auditoria_sugestao_created_at_idx
  on public.auditoria_sugestao (created_at);
