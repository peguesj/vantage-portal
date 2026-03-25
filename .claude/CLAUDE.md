# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Platform Vision

**Vantage Portal** is a full MSSP (Managed Security Service Provider) platform for managing clients, security operations, RMM, billing, compliance, and support. The current codebase is the Next.js 15 frontend/portal layer built on MakerKit. The broader platform will add an **Elixir/Phoenix backend** for real-time event processing (alerts, RMM agent communication) over **NATS**, while this repo serves as the client-facing portal and admin interface.

The WHMCS integration packages (`@kit/whmcs`, `@kit/billing`, `@kit/domains`) were a **stopgap** during platform development and will be superseded by native MSSP modules.

### Source of Truth for Design Intent
- `/Users/jeremiah/Developer/vantage-iso` — POC with full schema, RBAC matrix, compliance framework mapping, and API spec
- `/Users/jeremiah/Developer/vantage_v2.1.5.1` — POC with strategy doc, billing models, agentic plan, and realm-based architecture
- `specs/` in this repo — module specs for current implementation phase

---

## Commands

```bash
# Development
pnpm install                    # Install all workspace dependencies
pnpm run dev                    # Start Next.js dev server (port 3000)
pnpm run supabase:web:start     # Start local Supabase (Docker required)
pnpm run supabase:web:reset     # Reset local DB and re-run all migrations
pnpm run supabase:web:typegen   # Regenerate apps/web/lib/database.types.ts

# Quality gates — ALL required before marking work complete
pnpm run typecheck              # TypeScript strict validation (npx tsc --noEmit)
pnpm run lint                   # ESLint
pnpm run lint:fix               # Auto-fix ESLint issues
pnpm run format:fix             # Prettier formatting

# Build
pnpm run build                  # Turborepo production build (all packages + app)

# Testing
pnpm run test                   # Unit tests (all packages)
pnpm --filter e2e test          # Playwright E2E (requires dev server running)
pnpm --filter e2e test:ui       # Playwright interactive UI mode

# Database (run from apps/web/)
cd apps/web
pnpm supabase db reset          # Reset + seed
pnpm supabase migration new <name>  # Create timestamped migration file
pnpm supabase db push           # Push migrations to remote
```

---

## Monorepo Architecture

**Turborepo + pnpm workspaces**. Packages are in `packages/`, the main app is `apps/web/`, E2E tests are `apps/e2e/`.

### Apps

| App | Purpose |
|-----|---------|
| `apps/web` | Next.js 15 App Router — portal UI + API routes |
| `apps/e2e` | Playwright E2E test suite |

### Package Layers

```
packages/
  features/         # Business logic — auth, accounts (per-feature packages)
  ui/               # shadcn/ui + MakerKit components (@kit/ui)
  supabase/         # Supabase client factories + generated types (@kit/supabase)
  shared/           # Logger, hooks, event system (@kit/shared)
  next/             # Next.js server actions, route utilities (@kit/next)
  i18n/             # i18next config, server+client instances (@kit/i18n)
  admin/            # Admin panel components (@kit/admin)
  whmcs/            # WHMCS API client — stopgap, to be superseded (@kit/whmcs)
  billing/          # Invoicing + payments (@kit/billing)
  domains/          # Domain management (@kit/domains)
  scribe/           # AI-powered step-by-step guide creator (@kit/scribe)
tooling/
  eslint/           # Shared ESLint config
  prettier/         # Shared Prettier config
  typescript/       # Shared tsconfig base
```

### Adding a New Package

1. Copy structure from `packages/features/accounts`
2. Set correct `name` in `package.json` (use `@kit/<name>` convention)
3. Add subpath exports for each public surface in `package.json#exports`
4. Add to consuming app's `dependencies` and `next.config.mjs#transpilePackages`
5. Run `pnpm install` from root

---

## Next.js App Structure (`apps/web`)

### Route Groups

| Group | URL Pattern | Access |
|-------|-------------|--------|
| `(marketing)/` | `/`, `/pricing`, `/blog` | Public |
| `auth/` | `/auth/sign-in`, `/auth/sign-up`, etc. | Unauthenticated only |
| `home/` | `/home/**` | Authenticated + MFA-verified |
| `guides/` | `/guides/share/**` | Public (shared guides) |

### Middleware (`middleware.ts`)

Order of operations: CSRF check → Supabase auth session → Route pattern matching → MFA enforcement for `/home/**` → Auth redirect for protected routes.

CSRF is enforced via `@edge-csrf/nextjs`. Do not bypass.

### Path Aliases

```
~/         → app/
~/config/* → config/
~/components/* → components/
~/lib/*    → lib/
```

### Config Files

| File | Purpose |
|------|---------|
| `config/app.config.ts` | App name, URL, theme, production flag |
| `config/paths.config.ts` | All route path constants — import from here, never hardcode |
| `config/navigation.config.tsx` | Sidebar/nav structure |

---

## Data Layer

### Supabase Multi-Tenancy

All tenant isolation is enforced at the **PostgreSQL RLS layer**, not application layer. Every new table requires:
1. `account_id` (or equivalent tenant FK) column
2. RLS policy referencing `auth.uid()` or an account membership check
3. No application-level tenant filtering is a substitute for RLS

### Database Migrations

Location: `apps/web/supabase/migrations/`
Naming: `YYYYMMDDHHMMSS_description.sql`

After every migration:
```bash
cd apps/web && pnpm supabase db reset && pnpm supabase:web:typegen
```

### Type Generation

Generated types live at `apps/web/lib/database.types.ts`. Never edit this file manually — regenerate after schema changes.

---

## Code Conventions

### Package Structure (reference `@kit/features/accounts`)

```
packages/<name>/
  src/
    server/       # Server actions, services, DB queries
    components/   # React components
    hooks/        # Client-side hooks
    schemas/      # Zod validation schemas
    types.ts      # TypeScript type exports
  index.ts        # Re-exports (prefer explicit subpath exports)
  package.json
```

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `InvoiceList.tsx` |
| Hooks | camelCase + `use` prefix | `useInvoices.ts` |
| Services/utilities | kebab-case | `invoice-service.ts` |
| Schemas | kebab-case | `billing.ts` |
| Server actions | kebab-case | `create-invoice.ts` |

### TypeScript

- `strict: true`, `noUncheckedIndexAccess: true` — no exceptions
- Zod for all runtime validation at system boundaries (API routes, server actions, form submissions)
- Export types from package `types.ts`, re-export via subpath exports

---

## MSSP Platform Architecture (Planned)

### Backend Services (Elixir/Phoenix + NATS)

The portal (this repo) will connect to Elixir microservices via:
- **NATS JetStream** for real-time event routing (alerts, RMM agent heartbeats, incident state changes)
- **Phoenix Channels** exposed via WebSocket for live SOC dashboard updates
- Subject namespace: `alerts.{tenant_id}.{severity}.{category}`

Each tenant's processing pipeline runs as an isolated OTP process tree — a fault in one tenant cannot cascade to others.

### Tactical RMM Integration

White-label Tactical RMM with MeshCentral for remote control. Integration points:
- REST API for device/policy CRUD
- NATS for real-time agent communication
- Webhook events mapped to internal `alert.*` subject namespace

### Compliance Targets

Platform must be designed for SOC 2 Type II + ISO 27001:2022 from day one:
- Immutable audit logs on all tenant-scoped tables
- RLS at DB layer (not just app)
- NIST CSF 2.0 six-function mapping: Govern, Identify, Protect, Detect, Respond, Recover
- CIS Controls v8.1 IG2 minimum

### Licensing Engine

This software is **closed source** with a built-in licensing engine. Requirements:
- License key validation on startup and periodically at runtime
- License tied to: tenant domain, seat/endpoint count, feature tier
- Keys stored encrypted; validation logic in a tamper-resistant module
- Test license bank maintained in `packages/licensing/test-fixtures/`

---

## Development Strategy

### Worktrees

Use git worktrees for all feature branches. Name sessions and worktrees verbosely:
```bash
git worktree add ../vantage-portal-<feature-name> -b feat/<feature-name>
```

### Atomic Commits

One logical change per commit. Commit format:
```
type(scope): short description

Body (optional): why, not what

# No AI attribution in commit messages — see Attribution Policy
```

### Plane PM Conventions

Project: **Vantage Portal MSSP Platform**
- URL: `https://plane.lgtm.build/lgtm/projects/2ad86675-d04f-4fb8-b30e-b7c1fb864020/`
- Identifier: `MSSP`
- Use `/drtw` agile standard for issue management
- Tag all git-related issues: `git:<commit-hash|branch|PR>`
- Issue types: `epic`, `story`, `task`, `bug`, `spike`
- Update issues as work progresses with maximal detail
- Run `/plane-pm align` to enforce referential integrity after each work session

### Quality Gates (mandatory before merge)

```bash
pnpm run typecheck   # must pass
pnpm run lint        # must pass
pnpm run build       # must pass
pnpm run test        # must pass
```

---

## Tooling & Services

### CCEM APM

- **Dashboard**: http://localhost:3031
- **Config**: `/Users/jeremiah/Developer/vantage-portal/apm/apm_config.json`
- **Port**: 3031
- Always running as background service; communicate session start/end via `/ccem apm`

### OpsDoc / Showcase

Standalone always-on daemon server. Run as background task. Implements:
- AG-UI protocol for chat-based session interface
- Prototype dev tools panel
- UAT tools
- Persistence hook for session continuity

### Formation Deploys

`/formation deploy` — always run as a background task. Return status only on completion.

---

## Recovery Checkpoints

| Tag | Description |
|-----|-------------|
| `checkpoint-pre-whmcs-port-20260123-144206` | Clean MakerKit state before any WHMCS work |

```bash
git checkout -b recovery-branch checkpoint-pre-whmcs-port-20260123-144206
```

---

## Implementation Checkpoints

### Sprint 1: MSSP Platform Foundation (feat/mssp-foundation-sprint1)

**Wave 1** (independent, run concurrently):
- [x] **CP-1**: MSSP tenant schema migration — accounts_extensions + clients table (US-001) [MSSP-8]
- [x] **CP-2**: GitHub Actions CI/CD pipeline — quality gates (US-002) [MSSP-9]
- [x] **CP-3**: Terraform workspace init — Azure resource group + remote state (US-003) [MSSP-10]
- [x] **CP-7**: MSSP paths and navigation config — portal section routing (US-007) [MSSP-11]
- After Wave 1: `pnpm run typecheck` must pass

**Wave 2** (depends on Wave 1):
- [x] **CP-4**: RBAC schema migration — mssp_role enum and permissions matrix (US-004) [MSSP-12] _depends: US-001_
- [x] **CP-5**: Licensing engine package — @kit/licensing with HMAC-SHA256 validation (US-005) [MSSP-13]
- After Wave 2: `pnpm run typecheck` must pass

**Wave 3** (depends on Wave 2):
- [x] **CP-6**: Multi-tenant RLS policies — comprehensive account isolation audit (US-006) [MSSP-14] _depends: US-001, US-004_
- After Wave 3: `pnpm run typecheck && pnpm run lint` must pass

**Wave 4** (depends on Wave 3):
- [x] **CP-8**: Client management server actions — createClient, listClients, updateClient (US-008) [MSSP-15] _depends: US-001, US-006_
- [x] **CP-9**: MSSP home dashboard — portal section overview page (US-009) [MSSP-16] _depends: US-007_
- After Wave 4: `pnpm run typecheck && pnpm run lint && pnpm run build` must pass

**Branch**: `feat/mssp-foundation-sprint1`
**Plane Project**: [MSSP](https://plane.lgtm.build/lgtm/projects/2ad86675-d04f-4fb8-b30e-b7c1fb864020/)

---

### Sprint 2: MSSP Portal Sections (feat/mssp-sprint2-portal-sections)

**Wave 1** — DB migrations (independent):
- [x] **CP-10**: SOC schema — security_incidents + alerts tables, full RLS, enums
- [x] **CP-11**: Billing schema — invoices table with Stripe fields and RLS
- [x] **CP-12**: Support schema — departments + tickets + ticket_replies with RLS

**Wave 2** — Server actions (depends on Wave 1):
- [x] **CP-13**: SOC server actions — createIncident, listIncidents, updateIncident, listAlerts, acknowledgeAlert, getIncidentStats
- [x] **CP-14**: Billing server actions — createInvoice, listInvoices, updateInvoice, getBillingStats
- [x] **CP-15**: Support server actions — createTicket, listTickets, replyToTicket, getTicketStats

**Wave 3** — Portal pages (depends on Wave 2):
- [x] **CP-16**: SOC portal page — 4 KPI cards, Active Incidents table, Recent Alerts
- [x] **CP-17**: Compliance portal page — 4 framework cards (SOC 2 Type II, ISO 27001, NIST CSF 2.0, CIS Controls v8.1) with progress bars
- [x] **CP-18**: RMM portal page — 4 KPI cards, endpoint inventory empty state
- [x] **CP-19**: Clients portal page — 4 KPI cards, client table, Add Client CTA
- [x] **CP-20**: Billing portal page — 4 KPI cards, invoice list
- [x] **CP-21**: Admin portal page — platform status, 6 admin section cards
- [x] **CP-22**: Support portal page — 4 KPI cards, ticket queue

**Bonus** — Infrastructure:
- [x] **CP-23**: Docker containerization — multi-stage Dockerfile, docker-compose, Nginx, NATS JetStream
- [x] **CP-24**: Supabase MCP — .mcp.json configured for local DB

**Branch**: `feat/mssp-sprint2-portal-sections`
**PR**: https://github.com/makerkit/nextjs-saas-starter-kit-lite/pull/30
**Quality gates**: typecheck 16/16, lint 14/14, build pass, 10 tests pass
**Live tested**: All 8 routes verified via Puppeteer

---

## Attribution Policy

Never include AI attribution in any externally submitted content:
- Commit messages
- PR titles or bodies
- Issue comments
- GitHub/GitLab submissions

This is a hard rule with no exceptions.
