-- ==============================================================================
-- MIGRAÇÃO SUPABASE: Tabela de Pessoas / Mapeamento Corporativo Multi-Contatos
-- Permite cadastrar múltiplos contatos por empresa, títulos, setores, chave mestra
-- e relatórios gerenciais com segurança RLS e índices otimizados.
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Criação da Tabela de Pessoas (Contatos Vinculados por Empresa)
create table if not exists public.pessoas (
  id text primary key,
  codigo_unico_pessoa text unique not null, -- Chave única da pessoa (ex: PES-0042)
  codigo_unico text not null,               -- Chave mestra da empresa vinculada
  empresa text not null,                    -- Razão social ou nome fantasia da empresa
  nome text not null,                       -- Nome completo da pessoa
  titulo text,                              -- Cargo / Título profissional (ex: Diretor de Compras)
  setor text,                               -- Setor / Área de atuação (ex: Manutenção, Compras, TI)
  email text,                               -- E-mail corporativo ou direto
  whatsapp text,                            -- WhatsApp formatado com DDD
  telefone text,                            -- Telefone fixo, celular ou ramal
  decisor text default 'nao',               -- Papel decisório ('sim', 'influenciador', 'tecnico', 'operacional', 'nao')
  status text not null default 'ativo',     -- 'ativo' ou 'inativo'
  observacoes text,                         -- Observações sobre perfil, setor e negociações
  usuario_id uuid references public.profiles(id), -- Vendedor ou responsável
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices de Alta Performance para Buscas, Agrupamentos e Relatórios
create index if not exists idx_pessoas_codigo_unico on public.pessoas(codigo_unico);
create index if not exists idx_pessoas_codigo_unico_pessoa on public.pessoas(codigo_unico_pessoa);
create index if not exists idx_pessoas_empresa on public.pessoas(empresa);
create index if not exists idx_pessoas_setor on public.pessoas(setor);
create index if not exists idx_pessoas_titulo on public.pessoas(titulo);
create index if not exists idx_pessoas_decisor on public.pessoas(decisor);
create index if not exists idx_pessoas_usuario on public.pessoas(usuario_id);
create index if not exists idx_pessoas_created_at on public.pessoas(created_at desc);

-- 3. Trigger para manter updated_at sempre atualizado
create or replace function public.set_pessoas_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_pessoas_updated_at on public.pessoas;
create trigger trigger_set_pessoas_updated_at
  before update on public.pessoas
  for each row execute function public.set_pessoas_updated_at();

-- 4. Habilitação de Segurança por Linha (Row Level Security - RLS)
alter table public.pessoas enable row level security;

-- Políticas de RLS: Usuários autenticados no CRM podem visualizar e gerenciar pessoas
drop policy if exists pessoas_select on public.pessoas;
create policy pessoas_select on public.pessoas
  for select to authenticated
  using (true);

drop policy if exists pessoas_insert on public.pessoas;
create policy pessoas_insert on public.pessoas
  for insert to authenticated
  with check (true);

drop policy if exists pessoas_update on public.pessoas;
create policy pessoas_update on public.pessoas
  for update to authenticated
  using (true)
  with check (true);

drop policy if exists pessoas_delete on public.pessoas;
create policy pessoas_delete on public.pessoas
  for delete to authenticated
  using (
    public.is_admin() 
    or usuario_id = auth.uid() 
    or usuario_id is null
  );

-- Comentários descritivos da tabela
comment on table public.pessoas is 'Armazena as pessoas e contatos de cada empresa com cargos, setores, observações e chaves mestras para relatórios do CRM';
