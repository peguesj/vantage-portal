/*
 * -------------------------------------------------------
 * Billing Schema — Vantage Portal
 * Migration: 20260325000004_billing_schema.sql
 *
 * Establishes the invoicing and payment data model:
 *   - invoice_status, payment_status, billing_period enums
 *   - invoices table
 *   - invoice_line_items table
 *   - payments table
 *
 * Depends on:
 *   20260325000000_mssp_tenant_schema.sql  (accounts, clients, set_updated_at)
 *   20260325000001_rbac_schema.sql         (mssp_role enum, account_role_assignments)
 *   20260325000002_rls_audit.sql           (RLS policies)
 *   20260325000003_soc_schema.sql          (soc schema)
 *
 * RLS enforced at PostgreSQL layer. Every table scoped to
 * accounts_memberships — no application-level tenant
 * filtering is a substitute for these policies.
 * -------------------------------------------------------
 */

-- =====================================================
-- ENUMS
-- =====================================================

do $$ begin
  create type public.invoice_status as enum (
    'draft',
    'pending',
    'sent',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'cancelled',
    'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.billing_period as enum (
    'monthly',
    'quarterly',
    'annual',
    'one_time'
  );
exception when duplicate_object then null;
end $$;

-- =====================================================
-- INVOICES
-- =====================================================

create table if not exists public.invoices (
  id                   uuid           primary key default gen_random_uuid(),
  account_id           uuid           not null references public.accounts(id) on delete cascade,
  client_id            uuid           references public.clients(id) on delete set null,
  invoice_number       text           not null,
  status               public.invoice_status not null default 'draft',
  period               public.billing_period not null default 'monthly',
  subtotal             numeric(12,2)  not null default 0,
  tax_amount           numeric(12,2)  not null default 0,
  total                numeric(12,2)  not null default 0,
  currency             text           not null default 'USD',
  due_date             date,
  paid_at              timestamptz,
  sent_at              timestamptz,
  notes                text,
  stripe_invoice_id    text,
  metadata             jsonb          not null default '{}',
  created_at           timestamptz    not null default now(),
  updated_at           timestamptz    not null default now(),
  constraint invoices_invoice_number_unique unique (invoice_number)
);

comment on table public.invoices is
  'MSSP invoices issued by an account to a client, with Stripe sync support.';
comment on column public.invoices.stripe_invoice_id is
  'Optional Stripe Invoice ID for payment gateway synchronisation.';
comment on column public.invoices.metadata is
  'Arbitrary key-value store for integration-specific fields.';

create index if not exists invoices_account_id_idx    on public.invoices (account_id);
create index if not exists invoices_client_id_idx     on public.invoices (client_id);
create index if not exists invoices_status_idx        on public.invoices (status);
create index if not exists invoices_invoice_number_idx on public.invoices (invoice_number);
create index if not exists invoices_due_date_idx      on public.invoices (due_date);

-- =====================================================
-- INVOICE LINE ITEMS
-- =====================================================

create table if not exists public.invoice_line_items (
  id             uuid           primary key default gen_random_uuid(),
  invoice_id     uuid           not null references public.invoices(id) on delete cascade,
  description    text           not null,
  quantity       numeric(10,4)  not null default 1,
  unit_price     numeric(12,2)  not null default 0,
  tax_rate       numeric(5,2)   default 0,
  amount         numeric(12,2)  not null default 0,
  service_type   text,
  period_start   date,
  period_end     date,
  metadata       jsonb          not null default '{}',
  created_at     timestamptz    not null default now()
);

comment on table public.invoice_line_items is
  'Individual line items on an invoice. amount = (quantity * unit_price) plus any applicable tax.';
comment on column public.invoice_line_items.service_type is
  'Categorises the billed service, e.g. endpoint_monitoring, soc_service, consulting.';
comment on column public.invoice_line_items.amount is
  'Pre-computed total for this line: quantity * unit_price + (quantity * unit_price * tax_rate / 100).';

create index if not exists invoice_line_items_invoice_id_idx on public.invoice_line_items (invoice_id);

-- =====================================================
-- PAYMENTS
-- =====================================================

create table if not exists public.payments (
  id                        uuid           primary key default gen_random_uuid(),
  account_id                uuid           not null references public.accounts(id) on delete cascade,
  invoice_id                uuid           references public.invoices(id) on delete set null,
  amount                    numeric(12,2)  not null,
  currency                  text           not null default 'USD',
  status                    public.payment_status not null default 'pending',
  stripe_payment_intent_id  text,
  stripe_charge_id          text,
  payment_method            text,
  failure_reason            text,
  processed_at              timestamptz,
  metadata                  jsonb          not null default '{}',
  created_at                timestamptz    not null default now(),
  updated_at                timestamptz    not null default now()
);

comment on table public.payments is
  'Payment records linked to invoices. Supports Stripe payment intent and charge IDs.';
comment on column public.payments.payment_method is
  'Payment method identifier, e.g. card, ach, wire, check.';
comment on column public.payments.stripe_payment_intent_id is
  'Optional Stripe PaymentIntent ID.';
comment on column public.payments.stripe_charge_id is
  'Optional Stripe Charge ID populated after successful capture.';

create index if not exists payments_account_id_idx  on public.payments (account_id);
create index if not exists payments_invoice_id_idx  on public.payments (invoice_id);
create index if not exists payments_status_idx      on public.payments (status);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- Reuse set_updated_at() defined in 20260325000000.
-- =====================================================

create or replace trigger set_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create or replace trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.invoices          enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments          enable row level security;

-- -----------------------------------------------------------------
-- invoices: scoped to accounts_memberships
-- -----------------------------------------------------------------

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete" on public.invoices;

create policy "invoices_select"
  on public.invoices
  for select
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "invoices_insert"
  on public.invoices
  for insert
  to authenticated
  with check (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "invoices_update"
  on public.invoices
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

create policy "invoices_delete"
  on public.invoices
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
-- invoice_line_items: access granted when the parent invoice is accessible
-- -----------------------------------------------------------------

drop policy if exists "invoice_line_items_select" on public.invoice_line_items;
drop policy if exists "invoice_line_items_insert" on public.invoice_line_items;
drop policy if exists "invoice_line_items_update" on public.invoice_line_items;
drop policy if exists "invoice_line_items_delete" on public.invoice_line_items;

create policy "invoice_line_items_select"
  on public.invoice_line_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      join public.accounts_memberships am on am.account_id = i.account_id
      where i.id = invoice_line_items.invoice_id
        and am.user_id = auth.uid()
    )
  );

create policy "invoice_line_items_insert"
  on public.invoice_line_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.invoices i
      join public.accounts_memberships am on am.account_id = i.account_id
      where i.id = invoice_line_items.invoice_id
        and am.user_id = auth.uid()
    )
  );

create policy "invoice_line_items_update"
  on public.invoice_line_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      join public.accounts_memberships am on am.account_id = i.account_id
      where i.id = invoice_line_items.invoice_id
        and am.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.invoices i
      join public.accounts_memberships am on am.account_id = i.account_id
      where i.id = invoice_line_items.invoice_id
        and am.user_id = auth.uid()
    )
  );

create policy "invoice_line_items_delete"
  on public.invoice_line_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      join public.accounts_memberships am on am.account_id = i.account_id
      where i.id = invoice_line_items.invoice_id
        and am.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------
-- payments: scoped to accounts_memberships
-- -----------------------------------------------------------------

drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
drop policy if exists "payments_update" on public.payments;
drop policy if exists "payments_delete" on public.payments;

create policy "payments_select"
  on public.payments
  for select
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "payments_insert"
  on public.payments
  for insert
  to authenticated
  with check (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "payments_update"
  on public.payments
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

create policy "payments_delete"
  on public.payments
  for delete
  to authenticated
  using (
    account_id in (
      select account_id
      from public.accounts_memberships
      where user_id = auth.uid()
    )
  );
