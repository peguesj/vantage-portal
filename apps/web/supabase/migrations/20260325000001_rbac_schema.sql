/*
 * -------------------------------------------------------
 * MSSP RBAC Schema — Vantage Portal
 * Migration: 20260325000001_rbac_schema.sql
 *
 * Depends on: 20260325000000_mssp_tenant_schema.sql
 *
 * Establishes the RBAC model for the MSSP platform:
 *   - mssp_role enum (20 platform roles)
 *   - roles table (role registry with metadata)
 *   - permissions table (role → resource × action matrix)
 *   - account_role_assignments table (user ↔ role per account)
 *
 * RLS enforced at PostgreSQL layer. Admin operations are
 * gated behind a check_mssp_admin_role() helper that
 * inspects account_role_assignments directly.
 * -------------------------------------------------------
 */

-- =====================================================
-- ENUM: mssp_role
-- All 20 platform roles. Order reflects privilege level
-- from highest (platform_owner) to lowest (report_viewer).
-- =====================================================

create type public.mssp_role as enum (
  'platform_owner',
  'mssp_admin',
  'mssp_operator',
  'mssp_analyst',
  'mssp_billing',
  'client_admin',
  'client_user',
  'client_read_only',
  'api_service',
  'rmm_agent',
  'soc_tier1',
  'soc_tier2',
  'soc_tier3',
  'soc_lead',
  'compliance_auditor',
  'billing_manager',
  'support_l1',
  'support_l2',
  'support_l3',
  'report_viewer'
);

-- =====================================================
-- TABLE: roles
-- System registry of all MSSP roles with human-readable
-- metadata. Seeded by this migration; rarely mutated.
-- =====================================================

create table if not exists public.roles (
  id              uuid          primary key default gen_random_uuid(),
  name            public.mssp_role unique not null,
  display_name    text          not null,
  description     text,
  is_system_role  boolean       not null default true,
  created_at      timestamptz   not null default now()
);

comment on table public.roles is
  'Registry of all MSSP platform roles. System roles are seeded by migration '
  'and should not be deleted; custom roles may set is_system_role = false.';

comment on column public.roles.name is
  'Machine identifier matching the mssp_role enum value.';

comment on column public.roles.is_system_role is
  'When true this role is platform-defined and protected from deletion by policy.';

-- =====================================================
-- TABLE: permissions
-- Maps a role to a resource + action pair, with an
-- optional JSONB conditions document for attribute-based
-- constraints (e.g. { "own_account_only": true }).
-- =====================================================

create table if not exists public.permissions (
  id          uuid          primary key default gen_random_uuid(),
  role        public.mssp_role not null,
  resource    text          not null,
  action      text          not null,
  conditions  jsonb         not null default '{}',
  created_at  timestamptz   not null default now(),
  constraint permissions_role_resource_action_unique unique (role, resource, action)
);

create index if not exists permissions_role_idx      on public.permissions(role);
create index if not exists permissions_resource_idx  on public.permissions(resource);

comment on table public.permissions is
  'Role-to-resource-action permission matrix. conditions allows optional '
  'attribute-based constraints evaluated at the application layer.';

-- =====================================================
-- TABLE: account_role_assignments
-- Associates a user with a role within a specific account
-- (tenant). A user may hold multiple roles across
-- different accounts or even within the same account.
-- expires_at enables time-boxed privilege grants.
-- =====================================================

create table if not exists public.account_role_assignments (
  id          uuid          primary key default gen_random_uuid(),
  account_id  uuid          not null references public.accounts(id) on delete cascade,
  user_id     uuid          not null references auth.users(id) on delete cascade,
  role        public.mssp_role not null,
  granted_by  uuid,
  granted_at  timestamptz   not null default now(),
  expires_at  timestamptz,
  constraint account_role_assignments_unique unique (account_id, user_id, role)
);

create index if not exists ara_account_id_idx on public.account_role_assignments(account_id);
create index if not exists ara_user_id_idx    on public.account_role_assignments(user_id);
create index if not exists ara_role_idx       on public.account_role_assignments(role);

comment on table public.account_role_assignments is
  'Maps authenticated users to mssp_role values within a specific account (tenant). '
  'expires_at = NULL means the assignment does not expire.';

comment on column public.account_role_assignments.granted_by is
  'auth.users.id of the administrator who created this assignment. '
  'NULL is permitted for system-generated seed assignments.';

comment on column public.account_role_assignments.expires_at is
  'Optional expiry for time-boxed privilege grants. '
  'Application layer must check this; DB does not auto-revoke.';

-- =====================================================
-- HELPER FUNCTION: check_mssp_admin_role()
-- Returns TRUE when the calling user holds platform_owner
-- or mssp_admin on ANY non-expired account_role_assignment.
-- Used in RLS policies for roles and permissions tables.
-- Defined as SECURITY DEFINER so it can read
-- account_role_assignments without exposing raw table access.
-- =====================================================

create or replace function public.check_mssp_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_role_assignments ara
    where ara.user_id = auth.uid()
      and ara.role in ('platform_owner', 'mssp_admin')
      and (ara.expires_at is null or ara.expires_at > now())
  );
$$;

comment on function public.check_mssp_admin_role() is
  'Returns true if the current user holds platform_owner or mssp_admin on any '
  'non-expired account_role_assignment. Used by RLS policies.';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.roles                  enable row level security;
alter table public.permissions            enable row level security;
alter table public.account_role_assignments enable row level security;

-- --------------------------------------------------
-- roles policies
-- All authenticated users may read the role registry.
-- Only platform_owner / mssp_admin may mutate it.
-- --------------------------------------------------

create policy "roles_select"
  on public.roles
  for select
  to authenticated
  using (true);

create policy "roles_insert"
  on public.roles
  for insert
  to authenticated
  with check (public.check_mssp_admin_role());

create policy "roles_update"
  on public.roles
  for update
  to authenticated
  using (public.check_mssp_admin_role())
  with check (public.check_mssp_admin_role());

create policy "roles_delete"
  on public.roles
  for delete
  to authenticated
  using (public.check_mssp_admin_role() and is_system_role = false);

-- --------------------------------------------------
-- permissions policies
-- Same access model as roles.
-- --------------------------------------------------

create policy "permissions_select"
  on public.permissions
  for select
  to authenticated
  using (true);

create policy "permissions_insert"
  on public.permissions
  for insert
  to authenticated
  with check (public.check_mssp_admin_role());

create policy "permissions_update"
  on public.permissions
  for update
  to authenticated
  using (public.check_mssp_admin_role())
  with check (public.check_mssp_admin_role());

create policy "permissions_delete"
  on public.permissions
  for delete
  to authenticated
  using (public.check_mssp_admin_role());

-- --------------------------------------------------
-- account_role_assignments policies
-- Users may SELECT their own assignments.
-- platform_owner / mssp_admin may INSERT/UPDATE/DELETE.
-- --------------------------------------------------

create policy "ara_select_own"
  on public.account_role_assignments
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "ara_select_admin"
  on public.account_role_assignments
  for select
  to authenticated
  using (public.check_mssp_admin_role());

create policy "ara_insert"
  on public.account_role_assignments
  for insert
  to authenticated
  with check (public.check_mssp_admin_role());

create policy "ara_update"
  on public.account_role_assignments
  for update
  to authenticated
  using (public.check_mssp_admin_role())
  with check (public.check_mssp_admin_role());

create policy "ara_delete"
  on public.account_role_assignments
  for delete
  to authenticated
  using (public.check_mssp_admin_role());

-- =====================================================
-- SEED DATA: roles
-- One row per mssp_role enum value. All are system roles.
-- display_name and description chosen for operational clarity.
-- =====================================================

insert into public.roles (name, display_name, description, is_system_role) values
  (
    'platform_owner',
    'Platform Owner',
    'Unrestricted platform super-admin. Manages the Vantage installation itself, licensing, and global configuration.',
    true
  ),
  (
    'mssp_admin',
    'MSSP Administrator',
    'Full administrative control within an MSSP account: manages clients, operators, billing, and platform settings.',
    true
  ),
  (
    'mssp_operator',
    'MSSP Operator',
    'Day-to-day operational access: manages client configurations, deploys policies, and responds to escalated alerts.',
    true
  ),
  (
    'mssp_analyst',
    'MSSP Security Analyst',
    'Security operations analyst with read/triage access to alerts, incidents, and threat intelligence across all clients.',
    true
  ),
  (
    'mssp_billing',
    'MSSP Billing Specialist',
    'Access to invoices, payment records, and service agreements. Cannot view security telemetry.',
    true
  ),
  (
    'client_admin',
    'Client Administrator',
    'Administrative access scoped to a single managed client: manages users, configurations, and views all client data.',
    true
  ),
  (
    'client_user',
    'Client User',
    'Standard access for a client-side user: views dashboards, opens tickets, and manages own profile.',
    true
  ),
  (
    'client_read_only',
    'Client Read-Only',
    'Read-only access to client-scoped dashboards and reports. Cannot take any write actions.',
    true
  ),
  (
    'api_service',
    'API Service Account',
    'Machine identity for system-to-system integrations (e.g. webhooks, internal microservices). Not for human users.',
    true
  ),
  (
    'rmm_agent',
    'RMM Agent',
    'Machine identity for Tactical RMM / MeshCentral agents reporting endpoint telemetry. Minimal, write-specific access.',
    true
  ),
  (
    'soc_tier1',
    'SOC Analyst — Tier 1',
    'First-line SOC responder: monitors alert queues, performs initial triage, and escalates confirmed incidents.',
    true
  ),
  (
    'soc_tier2',
    'SOC Analyst — Tier 2',
    'Intermediate SOC analyst: investigates escalated incidents, performs containment actions, and coordinates with Tier 3.',
    true
  ),
  (
    'soc_tier3',
    'SOC Analyst — Tier 3',
    'Senior SOC analyst: handles complex investigations, malware analysis, threat hunting, and post-incident reviews.',
    true
  ),
  (
    'soc_lead',
    'SOC Lead',
    'SOC team lead: manages analyst assignments, approves response playbooks, and owns incident closure.',
    true
  ),
  (
    'compliance_auditor',
    'Compliance Auditor',
    'Read-only access to audit logs, compliance reports, and evidence packages. Cannot modify any data.',
    true
  ),
  (
    'billing_manager',
    'Billing Manager',
    'Manages billing configurations, pricing rules, and invoicing across all client accounts within an MSSP.',
    true
  ),
  (
    'support_l1',
    'Support Engineer — L1',
    'First-line support: handles user-facing tickets, password resets, and basic configuration questions.',
    true
  ),
  (
    'support_l2',
    'Support Engineer — L2',
    'Intermediate support: resolves escalated tickets, performs log analysis, and coordinates with engineering.',
    true
  ),
  (
    'support_l3',
    'Support Engineer — L3',
    'Senior support / escalation engineering: root-cause analysis, hotfix coordination, and vendor liaison.',
    true
  ),
  (
    'report_viewer',
    'Report Viewer',
    'Access to pre-generated reports and dashboards only. No access to raw security data or configuration.',
    true
  )
on conflict (name) do nothing;
