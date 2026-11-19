# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Shared project rules: read [AGENTS.md](AGENTS.md), [docs/ecc/WORKFLOW.md](docs/ecc/WORKFLOW.md) and [docs/ecc/skill-routing.md](docs/ecc/skill-routing.md). For UI changes, start at [design-system/stoquify/MASTER.md](design-system/stoquify/MASTER.md). Use the active harness's available tools; neither a `Task` API nor a particular slash command is guaranteed.

---

## Commands

```bash
# Development
npm run dev              # Start dev server on :3000 (also runs prisma generate)
npm run dev:turbopack    # Same, faster with Turbopack

# Build & verify
npm run agent:workflow:check # Read-only workflow/command-reference validation
npm run agent:workflow:test  # Isolated workflow-contract fixture tests
npm run build            # Secrets preflight + database migration + linted build
npm run build:linted     # Lint + build wrapper (may clean stale build output)
npm run typecheck        # tsc --noEmit; incremental metadata may be written
npm run lint             # ESLint
npm run verify:repo      # Prisma validation, types, lint, integration gates, build, tests
npm run verify:ci        # Includes database migration; use isolated CI database

# Database
npm run seed             # Seed with comprehensive data
npm run reset            # prisma migrate reset + seed
npx prisma db push       # Push schema changes (no migration file)
npx prisma migrate dev   # Create and apply migration

# Tests
npm test                              # All tests
npm run test:watch                    # Watch mode
npm test -- --runTestsByPath path/to/file.test.ts # Select a file; inspect setup first
npm run test:coverage                 # With coverage report
```

Before selecting a command, read [docs/ecc/command-registry.json](docs/ecc/command-registry.json) and inspect its current scripts/helpers. Build, seed, reset and broad verification are not read-only checks. [docs/ecc/test-lanes.md](docs/ecc/test-lanes.md) separates mocked unit evidence from real PostgreSQL and browser evidence.

### Default seed accounts
- Admin: `admin@admin.com` / `Admin@2025`
- User: `user@user.com` / `User@2025`

---

## Environment variables

Copy `.example.env` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon or local) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Better Auth secret; the second name is a compatibility fallback in `lib/auth.ts` |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_BASE_URL` | App base URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_SECRET` | GitHub OAuth |
| `RESEND_API_KEY` | Transactional email |
| `UPLOADTHING_TOKEN` | File uploads |
| `MFA_ENCRYPTION_KEY` | Encrypts TOTP secrets at rest |

---

## Architecture

### What this is

Stoquify is a **multi-tenant SaaS** POS / inventory / financial management system targeting Central African businesses (including XAF currency and OHADA accounting). Tenant-owned data must be scoped to the authenticated organization. Global catalog/identity models differ; check the schema and trusted server context rather than assuming every model has `organizationId`.

### URL routing

```
app/
  [locale]/           # Always present — /en/... or /fr/...
    (auth)/           # login, register, forgot-password, verify
    (dashboard)/      # protected — requires auth + organizationId
    (home)/           # public landing
  api/                # Route handlers (UploadThing, auth, etc.)
```

Locale is **always prefixed** (`localePrefix: "always"`). Use helpers from `i18n/navigation.ts` for locale-aware `<Link>` and `redirect()`. Never hard-code `/en/` or `/fr/`.

### Authentication (`lib/auth.ts`, `lib/security/rbac.ts`, `middleware.ts`)

- **Better Auth** with the Prisma PostgreSQL adapter. Email/password sign-in uses `lib/password.ts`; Google OAuth is conditional on configured credentials.
- Email verification, password limits and password-reset session revocation are configured in `lib/auth.ts`.
- General session reads may use the cookie cache. `requireRbacContext()` disables that cache for authorization and reads the active user, organization and current role permissions.
- Middleware uses cookie presence for optimistic routing; protected server layouts/actions perform authoritative checks. Cookie presence or navigation visibility never authorizes a mutation.
- Use existing sensitive-action/step-up and MFA controls for the relevant domain; do not introduce a second authentication/session implementation.

**Server-side auth helpers** (`lib/auth-server.ts`):
```ts
const user = await getAuthenticatedUser()   // redirects to /login if not authed
await checkPermission(PERMISSIONS.READ_ITEMS) // throws on missing permission
```

**Client-side** (`lib/auth-client.ts`, `hooks/usePermission`):
```ts
const { hasPermission } = usePermission()
hasPermission("READ_ITEMS")
```

### RBAC (`lib/permissions.ts`)

- Permissions are **strings** stored in `Role.permissions[]`
- `PERMISSIONS` const exports all permission names
- `ROLE_TEMPLATES` has 7 predefined roles: SUPER_ADMIN → ADMIN → MANAGER → SUPERVISOR → EMPLOYEE → CASHIER → VIEWER
- Wildcard `"*"` participates in permission evaluation; it does not bypass cross-organization, active-account or domain evidence checks. See `lib/security/rbac.ts`.
- `can(user, action)` handles legacy role-matrix-based PO workflow permissions
- Server component guard pattern: `PermissionGate` component (from README example)

### Database (`prisma/schema.prisma`)

Key design decisions that affect every query:

| Concern | Implementation |
|---|---|
| Multi-tenancy | Bind tenant-owned queries and related-resource lookups to trusted server organization context; inspect each model's keys |
| Soft deletes | `deletedAt` on financial entities — always filter `deletedAt: null` for active records |
| Bilingual | `nameEn` (required) + `nameFr` (optional) on all user-facing translatable fields |
| Stock concurrency | Use `services/inventory/inventory-stock-event.service.ts` and existing version/availability predicates; do not add direct quantity writers |
| Payment/POS idempotency | Preserve each domain's scoped identity, payload/revision checks and retained execution evidence; see POS checkout and purchasing payment-release services |
| Document numbers | Per-org unique (not globally unique): `@@unique([organizationId, orderNumber])` |

**Prisma client** is at `prisma/db.ts`. Use `prisma/db-edge.ts` only for Edge Runtime contexts.

### Server actions (`actions/`)

Organized by domain. Pattern: each file exports one or a few async server actions. Key domains:

- `actions/users/` — user CRUD, invite flow, password reset
- `actions/item/`, `actions/itemsShow/` — product catalog (split: list vs. detail mutations)
- `actions/inventory/` — stock movements, adjustments
- `actions/pos/` — catalog lookup, cart, session, payment tender
- `actions/purchaseOrderWorkflow/` — PO lifecycle + goods receipt
- `actions/customers/`, `actions/suppliers/` — CRM
- `actions/analytics/`, `actions/finance/` — reporting
- `actions/roles/` — RBAC management
- `actions/auth.ts` — register/login server actions

### Key libraries

| Library | Purpose |
|---|---|
| `next-intl` v4 | i18n — messages in `messages/en.json` and `messages/fr.json` |
| shadcn/ui + Radix | UI primitives (configured in `components.json`) |
| `react-hook-form` + `zod` | Forms and validation (`validations/`) |
| `@tanstack/react-table` | Data tables |
| `@tanstack/react-query` | Server state / caching |
| `zustand` | Client UI state |
| `recharts` | Charts and dashboards |
| `UploadThing` | File / image uploads |
| `Resend` + `@react-email` | Transactional email |
| `jspdf` + `xlsx` | PDF and Excel export |
| `TipTap` | Rich text editor |

### Build notes

- `argon2` is **server-only**. It's listed in `serverExternalPackages` and excluded from client bundles via webpack. Never import it in client components.
- Build uses `output: 'standalone'` — self-contained for Docker deployment.
- `npm run build` runs secrets preflight, migration deployment and the linted build. Select checks through the shared command contract; do not use it as a default audit command.

---

## Skills Integration

### graphify
Resolve `/graphify` through the current skill catalog and follow the availability/fallback rules in AGENTS.md. Use existing graphs as discovery aids and verify current source.

### test-gen
Resolve `/test-gen` through the current catalog. If unavailable, disclose that fact and use the existing repository test patterns within the requested scope.

### enterprise-error-handling
Resolve the installed enterprise-error-handling skill through the current catalog. Reuse existing safe-action errors, correlation, transactions and worker recovery. Use only delegation tools exposed by the active harness when delegation is authorized.

---

## Code Architecture Analysis

When answering questions about code architecture, dependencies, file relationships, component structure, or system design patterns:

1. **Check for existing knowledge graphs** in `graphify-out/` directory
2. **Read relevant graph files** to enhance architectural insights:
   - `graph_components.json` - UI components architecture
   - `graph_actions.json` - Server actions & business logic
   - `graph_app.json` - Next.js routes & pages
   - `graph_hooks.json` - React hooks & data fetching
   - `graph_types.json` - TypeScript type definitions
3. **Reports available:** `GRAPH_REPORT_components.md`, `GRAPH_REPORT_actions.md`, `GRAPH_REPORT_app.md`, `GRAPH_REPORT_hooks.md`, `GRAPH_REPORT_types.md`
