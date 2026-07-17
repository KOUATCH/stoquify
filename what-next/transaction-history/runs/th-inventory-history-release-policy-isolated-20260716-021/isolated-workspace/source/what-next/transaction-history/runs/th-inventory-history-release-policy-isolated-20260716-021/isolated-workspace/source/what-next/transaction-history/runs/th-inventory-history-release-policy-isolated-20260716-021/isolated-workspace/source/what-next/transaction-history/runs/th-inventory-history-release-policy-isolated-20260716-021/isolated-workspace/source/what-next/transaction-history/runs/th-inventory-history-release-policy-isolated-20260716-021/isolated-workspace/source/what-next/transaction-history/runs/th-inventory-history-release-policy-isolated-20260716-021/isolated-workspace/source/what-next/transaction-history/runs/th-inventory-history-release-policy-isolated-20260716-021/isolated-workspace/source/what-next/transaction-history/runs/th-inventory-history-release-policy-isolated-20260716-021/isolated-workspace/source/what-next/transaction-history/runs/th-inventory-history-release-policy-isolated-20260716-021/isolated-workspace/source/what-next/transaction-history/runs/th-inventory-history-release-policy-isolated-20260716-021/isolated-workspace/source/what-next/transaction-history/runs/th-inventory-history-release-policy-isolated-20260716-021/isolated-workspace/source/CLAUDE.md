# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Development
npm run dev              # Start dev server on :3000 (also runs prisma generate)
npm run dev:turbopack    # Same, faster with Turbopack

# Build & verify
npm run build            # Production build (lint skipped)
npm run build:linted     # Production build with lint
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run verify:repo      # prisma validate + typecheck

# Database
npm run seed             # Seed with comprehensive data
npm run reset            # prisma migrate reset + seed
npx prisma db push       # Push schema changes (no migration file)
npx prisma migrate dev   # Create and apply migration

# Tests
npm test                              # All tests
npm run test:watch                    # Watch mode
npm test -- --testPathPattern=path    # Single file or pattern
npm run test:coverage                 # With coverage report
```

### Default seed accounts
- Admin: `admin@admin.com` / `Admin@2025`
- User: `user@user.com` / `User@2025`

---

## Environment variables

Copy `.example.env` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon or local) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | NextAuth JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_BASE_URL` | App base URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_SECRET` | GitHub OAuth |
| `RESEND_API_KEY` | Transactional email |
| `UPLOADTHING_TOKEN` | File uploads |
| `MFA_ENCRYPTION_KEY` | Encrypts TOTP secrets at rest |

---

## Architecture

### What this is

StockFlow is a **multi-tenant SaaS** POS / inventory / financial management system targeting Central African businesses (XAF currency, OHADA accounting). Every model is scoped to an `organizationId`; all Prisma queries must filter by it.

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

### Authentication (`auth.ts`, `middleware.ts`)

- **NextAuth v5** with JWT session strategy (8h, refresh every 1h)
- Credentials provider: email + Argon2id password. Google OAuth also supported.
- Account locking: 5 failed attempts → 30-min lockout
- Permissions stored in JWT (capped at 10 for cookie size). For full permission checks, always use server-side helpers.
- MFA: TOTP via `speakeasy`; secret encrypted at rest with `MFA_ENCRYPTION_KEY`; backup codes stored as hashes
- Revocable sessions: every JWT has a `jti` tracked in `AuthSession` table; middleware rejects revoked JTIs

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
- Wildcard `"*"` permission = super admin (bypasses all checks)
- `can(user, action)` handles legacy role-matrix-based PO workflow permissions
- Server component guard pattern: `PermissionGate` component (from README example)

### Database (`prisma/schema.prisma`)

Key design decisions that affect every query:

| Concern | Implementation |
|---|---|
| Multi-tenancy | All models have `organizationId`; compound indexes start with it |
| Soft deletes | `deletedAt` on financial entities — always filter `deletedAt: null` for active records |
| Bilingual | `nameEn` (required) + `nameFr` (optional) on all user-facing translatable fields |
| POS concurrency | `InventoryLevel.version` (optimistic locking) — increment and check on every stock update |
| Payment idempotency | `Payment.idempotencyKey` — deduplicate mobile money retry storms |
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
- `npm run build` skips lint; use `npm run build:linted` to catch issues pre-deploy.

---

## Skills Integration

### graphify
When the user types `/graphify`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run graphify skill"`, and `prompt: "Execute the graphify skill on the current directory following the instructions in ~/.claude/skills/graphify/SKILL.md"` before doing anything else.

### test-gen
When the user types `/test-gen`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run test-gen skill"`, and `prompt: "Execute the test-gen skill on the current directory or specified files following the instructions in ~/.claude/skills/test-gen/SKILL.md. Generate comprehensive unit tests for the selected code."` before doing anything else.

### enterprise-error-handling
When the user types `/enterprise-error-handling`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run enterprise error handling skill"`, and `prompt: "Execute the enterprise error handling skill following the instructions in ~/.claude/skills/enterprise-error-handling/SKILL.md."` before doing anything else.

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
