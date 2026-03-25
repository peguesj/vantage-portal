/*
 * -------------------------------------------------------
 * SOC Schema — Vantage Portal
 * Migration: 20260325000003_soc_schema.sql
 *
 * Establishes the Security Operations Center data model:
 *   - incident_severity, incident_status, incident_category enums
 *   - alert_severity, alert_status enums
 *   - security_incidents table
 *   - alerts table (optionally linked to incidents)
 *
 * Depends on:
 *   20260325000000_mssp_tenant_schema.sql  (accounts_extensions, clients, set_updated_at)
 *   20260325000001_rbac_schema.sql         (mssp_role enum, account_role_assignments)
 *   20260325000002_rls_audit.sql           (RLS policies)
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
  create type public.incident_severity as enum (
    'critical',
    'high',
    'medium',
    'low',
    'info'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.incident_status as enum (
    'detected',
    'investigating',
    'contained',
    'eradicating',
    'recovering',
    'resolved',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.incident_category as enum (
    'malware',
    'phishing',
    'data_breach',
    'ddos',
    'unauthorized_access',
    'insider_threat',
    'vulnerability',
    'compliance_violation',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_severity as enum (
    'critical',
    'high',
    'medium',
    'low',
    'info'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_status as enum (
    'open',
    'acknowledged',
    'investigating',
    'resolved',
    'false_positive',
    'suppressed'
  );
exception when duplicate_object then null;
end $$;

-- =====================================================
-- SECURITY_INCIDENTS TABLE
-- One incident per security event (may span clients).
-- client_id is nullable: MSSP-level incidents have no
-- specific client association.
-- =====================================================

create table if not exists public.security_incidents (
  id                uuid                       primary key default gen_random_uuid(),
  account_id        uuid                       not null references public.accounts(id) on delete cascade,
  client_id         uuid                       references public.clients(id) on delete set null,
  title             text                       not null,
  description       text,
  severity          public.incident_severity   not null default 'medium',
  status            public.incident_status     not null default 'detected',
  category          public.incident_category   not null default 'other',
  mitre_tactics     text[]                     not null default '{}',
  mitre_techniques  text[]                     not null default '{}',
  affected_systems  text[]                     not null default '{}',
  assigned_to       uuid                       references auth.users(id) on delete set null,
  resolved_at       timestamptz,
  sla_deadline      timestamptz,
  metadata          jsonb                      not null default '{}',
  created_at        timestamptz                not null default now(),
  updated_at        timestamptz                not null default now()
);

comment on table public.security_incidents is
  'Security incidents managed by an MSSP account. '
  'client_id is nullable to support MSSP-level (cross-client) incidents. '
  'MITRE ATT&CK tactics and techniques stored as text arrays.';

create index if not exists security_incidents_account_id_idx  on public.security_incidents(account_id);
create index if not exists security_incidents_status_idx      on public.security_incidents(status);
create index if not exists security_incidents_severity_idx    on public.security_incidents(severity);
create index if not exists security_incidents_client_id_idx   on public.security_incidents(client_id);
create index if not exists security_incidents_assigned_to_idx on public.security_incidents(assigned_to);

-- =====================================================
-- ALERTS TABLE
-- Raw alerts ingested from sources (Tactical RMM, NATS,
-- manual entry). Optionally promoted to incidents.
-- =====================================================

create table if not exists public.alerts (
  id               uuid                    primary key default gen_random_uuid(),
  account_id       uuid                    not null references public.accounts(id) on delete cascade,
  client_id        uuid                    references public.clients(id) on delete set null,
  incident_id      uuid                    references public.security_incidents(id) on delete set null,
  title            text                    not null,
  description      text,
  severity         public.alert_severity   not null default 'medium',
  status           public.alert_status     not null default 'open',
  source           text,
  raw_payload      jsonb                   not null default '{}',
  mitre_technique  text,
  acknowledged_by  uuid                    references auth.users(id) on delete set null,
  acknowledged_at  timestamptz,
  resolved_at      timestamptz,
  metadata         jsonb                   not null default '{}',
  created_at       timestamptz             not null default now(),
  updated_at       timestamptz             not null default now()
);

comment on table public.alerts is
  'Raw security alerts ingested from Tactical RMM, NATS subjects, or manual entry. '
  'Alerts may be promoted to security_incidents via incident_id linkage. '
  'source examples: ''tactical-rmm'', ''nats'', ''manual''.';

create index if not exists alerts_account_id_idx  on public.alerts(account_id);
create index if not exists alerts_status_idx      on public.alerts(status);
create index if not exists alerts_severity_idx    on public.alerts(severity);
create index if not exists alerts_incident_id_idx on public.alerts(incident_id);
create index if not exists alerts_client_id_idx   on public.alerts(client_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- Reuse set_updated_at() defined in 20260325000000.
-- =====================================================

create trigger security_incidents_updated_at
  before update on public.security_incidents
  for each row execute function public.set_updated_at();

create trigger alerts_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- All tenant isolation enforced at the DB layer via
-- accounts_memberships. No application-level filtering
-- is a substitute for these policies.
-- =====================================================

alter table public.security_incidents enable row level security;
alter table public.alerts             enable row level security;

-- -------------------------------------------------------
-- security_incidents policies
-- -------------------------------------------------------

create policy "security_incidents_select"
  on public.security_incidents
  for select
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "security_incidents_insert"
  on public.security_incidents
  for insert
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "security_incidents_update"
  on public.security_incidents
  for update
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  )
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "security_incidents_delete"
  on public.security_incidents
  for delete
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- alerts policies
-- -------------------------------------------------------

create policy "alerts_select"
  on public.alerts
  for select
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "alerts_insert"
  on public.alerts
  for insert
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "alerts_update"
  on public.alerts
  for update
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  )
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy "alerts_delete"
  on public.alerts
  for delete
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );
