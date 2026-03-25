/*
 * -------------------------------------------------------
 * MSSP Tenant Schema — Vantage Portal
 * Migration: 20260325000000_mssp_tenant_schema.sql
 *
 * Establishes the multi-tenant MSSP data model:
 *   - service_tier enum (starter → sovereign)
 *   - client_status enum
 *   - accounts_extensions (MSSP metadata per account)
 *   - clients table (managed clients per MSSP account)
 *
 * RLS enforced at PostgreSQL layer. No application-level
 * tenant filtering is a substitute for these policies.
 * -------------------------------------------------------
 */

-- =====================================================
-- EXTENSIONS
-- =====================================================

create extension if not exists "pgcrypto";
create extension if not exists "ltree";

-- =====================================================
-- ENUMS
-- =====================================================

create type public.service_tier as enum (
  'starter',
  'professional',
  'enterprise',
  'sovereign'
);

create type public.client_status as enum (
  'active',
  'suspended',
  'terminated'
);

-- =====================================================
-- ACCOUNTS EXTENSIONS
-- Extends the base accounts table with MSSP-specific
-- metadata without modifying the core MakerKit schema.
-- =====================================================

create table if not exists public.accounts_extensions (
  id             uuid        primary key default gen_random_uuid(),
  account_id     uuid        not null references public.accounts(id) on delete cascade,
  service_tier   public.service_tier not null default 'starter',
  mssp_metadata  jsonb       not null default '{}',
  max_clients    integer     not null default 10,
  max_endpoints  integer     not null default 100,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint accounts_extensions_account_id_unique unique (account_id)
);

comment on table public.accounts_extensions is
  'MSSP-specific metadata for accounts: service tier, endpoint limits, and custom config.';

-- =====================================================
-- CLIENTS TABLE
-- Managed clients belonging to an MSSP account.
-- Each MSSP account can manage N clients (capped by max_clients).
-- =====================================================

create table if not exists public.clients (
  id             uuid        primary key default gen_random_uuid(),
  account_id     uuid        not null references public.accounts(id) on delete cascade,
  name           text        not null,
  slug           text        not null,
  service_tier   public.service_tier not null default 'starter',
  status         public.client_status not null default 'active',
  metadata       jsonb       not null default '{}',
  -- ltree path for future sub-client hierarchy: e.g. 'mssp1.clientA.siteB'
  org_path       ltree,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- slug unique within an MSSP account
  constraint clients_account_slug_unique unique (account_id, slug)
);

create index if not exists clients_account_id_idx on public.clients(account_id);
create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_org_path_gist on public.clients using gist(org_path);

comment on table public.clients is
  'Managed clients belonging to an MSSP account. '
  'Isolated per account via RLS. org_path supports ltree-based hierarchy.';

-- =====================================================
-- UPDATED_AT TRIGGERS
-- Immutable audit: updated_at auto-managed by trigger.
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_extensions_updated_at
  before update on public.accounts_extensions
  for each row execute function public.set_updated_at();

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- All tenant isolation enforced at the DB layer.
-- =====================================================

alter table public.accounts_extensions enable row level security;
alter table public.clients enable row level security;

-- accounts_extensions: only accessible by members of the owning account
create policy "accounts_extensions_select"
  on public.accounts_extensions
  for select
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "accounts_extensions_insert"
  on public.accounts_extensions
  for insert
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "accounts_extensions_update"
  on public.accounts_extensions
  for update
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "accounts_extensions_delete"
  on public.accounts_extensions
  for delete
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

-- clients: only accessible by members of the owning MSSP account
create policy "clients_select"
  on public.clients
  for select
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "clients_insert"
  on public.clients
  for insert
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "clients_update"
  on public.clients
  for update
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "clients_delete"
  on public.clients
  for delete
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );
