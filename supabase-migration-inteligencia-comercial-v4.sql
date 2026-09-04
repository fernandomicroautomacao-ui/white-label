-- ============================================================
-- V4 — CATEGORIAS DE PRODUTOS E INTELIGÊNCIA COMERCIAL
-- Aplicar após as migrations existentes. Todas as tabelas são novas
-- e não alteram nem removem as entidades atuais do CRM.
-- ============================================================

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  clientes_alvo text[] not null default '{}',
  segmentos text[] not null default '{}',
  cnaes text[] not null default '{}',
  palavras_chave text[] not null default '{}',
  ativo boolean not null default true,
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.product_categories(id) on delete cascade,
  nome text not null,
  descricao text default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_subsubcategories (
  id uuid primary key default gen_random_uuid(),
  subcategoria_id uuid not null references public.product_subcategories(id) on delete cascade,
  nome text not null,
  descricao text default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  subsubcategoria_id uuid not null references public.product_subsubcategories(id) on delete cascade,
  nome text not null,
  descricao text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.company_classifications (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  segmento text default '',
  cnae_principal text default '',
  cnaes_secundarios text[] not null default '{}',
  tipo_industria text default '',
  mercado_atendido text default '',
  processo_produtivo text default '',
  produtos_fabricados text default '',
  porte_empresa text default '',
  perfil_comercial text default '',
  classificacao_estrategica text default '',
  observacoes_comerciais text default '',
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id)
);

create table if not exists public.recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.product_categories(id) on delete cascade,
  tipo text not null check (tipo in ('cliente_alvo','segmento','cnae','palavra_chave','processo','produto_fabricado')),
  valor text not null,
  peso integer not null default 10,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.company_product_recommendations (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  categoria_id uuid references public.product_categories(id) on delete set null,
  subcategoria_id uuid references public.product_subcategories(id) on delete set null,
  subsubcategoria_id uuid references public.product_subsubcategories(id) on delete set null,
  produto_id uuid references public.products(id) on delete set null,
  score numeric(5,2) not null default 0,
  potencial text not null default 'sem_potencial',
  motivos jsonb not null default '[]'::jsonb,
  status text not null default 'recomendado' check (status in ('recomendado','apresentado','interesse','oportunidade','convertido','vendido','descartado','sem_interesse')),
  observacoes text default '',
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_commercial_analysis (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  resumo text default '',
  oportunidades jsonb not null default '[]'::jsonb,
  proxima_acao text default '',
  calculado_em timestamptz not null default now(),
  usuario_id uuid references public.profiles(id),
  unique (empresa_id)
);

create index if not exists idx_product_subcategories_categoria on public.product_subcategories(categoria_id);
create index if not exists idx_product_subsubcategories_subcategoria on public.product_subsubcategories(subcategoria_id);
create index if not exists idx_products_subsubcategoria on public.products(subsubcategoria_id);
create index if not exists idx_company_classifications_empresa on public.company_classifications(empresa_id);
create index if not exists idx_recommendations_empresa on public.company_product_recommendations(empresa_id);
create index if not exists idx_recommendations_status on public.company_product_recommendations(status);

alter table public.product_categories enable row level security;
alter table public.product_subcategories enable row level security;
alter table public.product_subsubcategories enable row level security;
alter table public.products enable row level security;
alter table public.company_classifications enable row level security;
alter table public.recommendation_rules enable row level security;
alter table public.company_product_recommendations enable row level security;
alter table public.company_commercial_analysis enable row level security;

-- A aplicação atual trabalha com fallback local; estas políticas permitem
-- que usuários autenticados compartilhem a base comercial da própria conta.
drop policy if exists product_categories_access on public.product_categories;
create policy product_categories_access on public.product_categories for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);
drop policy if exists product_subcategories_access on public.product_subcategories;
create policy product_subcategories_access on public.product_subcategories for all to authenticated using (exists (select 1 from public.product_categories c where c.id = categoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null))) with check (exists (select 1 from public.product_categories c where c.id = categoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null)));
drop policy if exists product_subsubcategories_access on public.product_subsubcategories;
create policy product_subsubcategories_access on public.product_subsubcategories for all to authenticated using (exists (select 1 from public.product_subcategories s join public.product_categories c on c.id = s.categoria_id where s.id = subcategoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null))) with check (exists (select 1 from public.product_subcategories s join public.product_categories c on c.id = s.categoria_id where s.id = subcategoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null)));
drop policy if exists products_access on public.products;
create policy products_access on public.products for all to authenticated using (exists (select 1 from public.product_subsubcategories ss join public.product_subcategories s on s.id = ss.subcategoria_id join public.product_categories c on c.id = s.categoria_id where ss.id = subsubcategoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null))) with check (exists (select 1 from public.product_subsubcategories ss join public.product_subcategories s on s.id = ss.subcategoria_id join public.product_categories c on c.id = s.categoria_id where ss.id = subsubcategoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null)));
drop policy if exists company_classifications_access on public.company_classifications;
create policy company_classifications_access on public.company_classifications for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);
drop policy if exists recommendation_rules_access on public.recommendation_rules;
create policy recommendation_rules_access on public.recommendation_rules for all to authenticated using (exists (select 1 from public.product_categories c where c.id = categoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null))) with check (exists (select 1 from public.product_categories c where c.id = categoria_id and (public.is_admin() or c.usuario_id = auth.uid() or c.usuario_id is null)));
drop policy if exists recommendations_access on public.company_product_recommendations;
create policy recommendations_access on public.company_product_recommendations for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);
drop policy if exists commercial_analysis_access on public.company_commercial_analysis;
create policy commercial_analysis_access on public.company_commercial_analysis for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);
