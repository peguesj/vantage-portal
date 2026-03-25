/*
 * -------------------------------------------------------
 * Support Ticketing Schema — Vantage Portal
 * Migration: 20260325000005_support_schema.sql
 *
 * Establishes the MSSP support ticketing data model:
 *   - ticket_status, ticket_priority enums
 *   - departments table (routing and organisation)
 *   - support_tickets table
 *   - ticket_replies table (public replies + internal notes)
 *
 * Depends on:
 *   20260325000000_mssp_tenant_schema.sql  (accounts, clients, set_updated_at)
 *   20260325000001_rbac_schema.sql         (mssp_role enum, account_role_assignments)
 *   20260325000002_rls_audit.sql           (RLS policies)
 *   20260325000003_soc_schema.sql          (soc schema)
 *   20260325000004_billing_schema.sql      (billing schema)
 *
 * RLS enforced at PostgreSQL layer. Every table is scoped
 * to accounts_memberships — no application-level tenant
 * filtering is a substitute for these policies.
 * -------------------------------------------------------
 */

-- =====================================================
-- ENUMS
-- =====================================================

do $$ begin
  create type public.ticket_status as enum (
    'open',
    'pending',
    'on_hold',
    'resolved',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ticket_priority as enum (
    'low',
    'medium',
    'high',
    'urgent'
  );
exception when duplicate_object then null;
end $$;

-- =====================================================
-- DEPARTMENTS
-- =====================================================

create table if not exists public.departments (
  id           uuid        primary key default gen_random_uuid(),
  account_id   uuid        not null references public.accounts(id) on delete cascade,
  name         text        not null,
  description  text,
  email        text,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint departments_account_name_unique unique (account_id, name)
);

comment on table public.departments is
  'Support departments used for ticket routing and organisation within an MSSP account.';
comment on column public.departments.email is
  'Optional inbound email address for routing tickets directly to this department.';

-- Add columns that may not exist if the table was created by an earlier migration
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'departments'
      and column_name  = 'is_active'
  ) then
    alter table public.departments add column is_active boolean not null default true;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'departments'
      and column_name  = 'account_id'
  ) then
    alter table public.departments add column account_id uuid references public.accounts(id) on delete cascade;
  end if;
end $$;

comment on column public.departments.is_active is
  'Soft-disable a department without deleting it; inactive departments are hidden from routing.';

-- =====================================================
-- SUPPORT TICKETS
-- =====================================================

create table if not exists public.support_tickets (
  id             uuid                   primary key default gen_random_uuid(),
  account_id     uuid                   not null references public.accounts(id) on delete cascade,
  client_id      uuid                   references public.clients(id) on delete set null,
  department_id  uuid                   references public.departments(id) on delete set null,
  subject        text                   not null,
  status         public.ticket_status   not null default 'open',
  priority       public.ticket_priority not null default 'medium',
  submitter_id   uuid                   references auth.users(id) on delete set null,
  assigned_to    uuid                   references auth.users(id) on delete set null,
  resolved_at    timestamptz,
  closed_at      timestamptz,
  sla_deadline   timestamptz,
  metadata       jsonb                  not null default '{}',
  created_at     timestamptz            not null default now(),
  updated_at     timestamptz            not null default now()
);

comment on table public.support_tickets is
  'MSSP support tickets raised by or on behalf of clients, managed by agents within an account.';
comment on column public.support_tickets.submitter_id is
  'The authenticated user who opened the ticket; nullable to support system-generated tickets.';
comment on column public.support_tickets.assigned_to is
  'The agent currently responsible for resolving this ticket.';
comment on column public.support_tickets.sla_deadline is
  'SLA response or resolution deadline; computed by the application tier based on priority and contract.';
comment on column public.support_tickets.metadata is
  'Arbitrary key-value store for integration-specific fields, e.g. external CRM IDs.';

create index if not exists support_tickets_account_id_idx    on public.support_tickets (account_id);
create index if not exists support_tickets_status_idx        on public.support_tickets (status);
create index if not exists support_tickets_priority_idx      on public.support_tickets (priority);
create index if not exists support_tickets_client_id_idx     on public.support_tickets (client_id);
create index if not exists support_tickets_assigned_to_idx   on public.support_tickets (assigned_to);
create index if not exists support_tickets_department_id_idx on public.support_tickets (department_id);

-- =====================================================
-- TICKET REPLIES
-- =====================================================

create table if not exists public.ticket_replies (
  id          uuid        primary key default gen_random_uuid(),
  ticket_id   uuid        not null references public.support_tickets(id) on delete cascade,
  author_id   uuid        references auth.users(id) on delete set null,
  body        text        not null,
  is_internal boolean     not null default false,
  attachments jsonb       not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.ticket_replies is
  'Replies and internal notes on a support ticket. is_internal=true marks agent-only notes.';

-- Add columns that may not exist if the table was created by an earlier migration
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'ticket_replies'
      and column_name  = 'is_internal'
  ) then
    alter table public.ticket_replies add column is_internal boolean not null default false;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'ticket_replies'
      and column_name  = 'author_id'
  ) then
    alter table public.ticket_replies add column author_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

comment on column public.ticket_replies.is_internal is
  'When true this reply is an internal agent note, not visible to the client submitter.';
comment on column public.ticket_replies.attachments is
  'JSON array of attachment metadata objects, e.g. [{name, url, size, mime_type}].';

create index if not exists ticket_replies_ticket_id_idx on public.ticket_replies (ticket_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- Reuse set_updated_at() defined in 20260325000000.
-- =====================================================

create or replace trigger set_departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

create or replace trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create or replace trigger set_ticket_replies_updated_at
  before update on public.ticket_replies
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.departments    enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_replies  enable row level security;

-- -----------------------------------------------------------------
-- departments: scoped to accounts_memberships
-- -----------------------------------------------------------------

drop policy if exists "departments_select" on public.departments;
drop policy if exists "departments_insert" on public.departments;
drop policy if exists "departments_update" on public.departments;
drop policy if exists "departments_delete" on public.departments;

create policy "departments_select"
  on public.departments
  for select
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "departments_insert"
  on public.departments
  for insert
  to authenticated
  with check (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "departments_update"
  on public.departments
  for update
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  )
  with check (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "departments_delete"
  on public.departments
  for delete
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------
-- support_tickets: scoped to accounts_memberships
-- -----------------------------------------------------------------

drop policy if exists "support_tickets_select" on public.support_tickets;
drop policy if exists "support_tickets_insert" on public.support_tickets;
drop policy if exists "support_tickets_update" on public.support_tickets;
drop policy if exists "support_tickets_delete" on public.support_tickets;

create policy "support_tickets_select"
  on public.support_tickets
  for select
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "support_tickets_insert"
  on public.support_tickets
  for insert
  to authenticated
  with check (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "support_tickets_update"
  on public.support_tickets
  for update
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  )
  with check (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "support_tickets_delete"
  on public.support_tickets
  for delete
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------
-- ticket_replies: access granted when the parent ticket is accessible
-- -----------------------------------------------------------------

drop policy if exists "ticket_replies_select" on public.ticket_replies;
drop policy if exists "ticket_replies_insert" on public.ticket_replies;
drop policy if exists "ticket_replies_update" on public.ticket_replies;
drop policy if exists "ticket_replies_delete" on public.ticket_replies;

create policy "ticket_replies_select"
  on public.ticket_replies
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      join public.accounts_memberships am on am.account_id = t.account_id
      where t.id = ticket_replies.ticket_id
        and am.user_id = auth.uid()
    )
  );

create policy "ticket_replies_insert"
  on public.ticket_replies
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.support_tickets t
      join public.accounts_memberships am on am.account_id = t.account_id
      where t.id = ticket_replies.ticket_id
        and am.user_id = auth.uid()
    )
  );

create policy "ticket_replies_update"
  on public.ticket_replies
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      join public.accounts_memberships am on am.account_id = t.account_id
      where t.id = ticket_replies.ticket_id
        and am.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.support_tickets t
      join public.accounts_memberships am on am.account_id = t.account_id
      where t.id = ticket_replies.ticket_id
        and am.user_id = auth.uid()
    )
  );

create policy "ticket_replies_delete"
  on public.ticket_replies
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      join public.accounts_memberships am on am.account_id = t.account_id
      where t.id = ticket_replies.ticket_id
        and am.user_id = auth.uid()
    )
  );
