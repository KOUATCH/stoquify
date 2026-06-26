# StockFlow — architecture

> Last updated: 2026-05-23. This is the canonical "how it's built today" document. Plans, history, and superseded ideas live in [`archive/`](archive/README.md).

## What this is

Multi-tenant retail/POS SaaS. Each customer is an `Organization`; users belong to one org; data is segmented per org at the schema level (every domain table has `organizationId`). Live for ~6 months with ~50 paying orgs.

## Stack

| Layer | Tool | Notes |
|---|---|---|
| App framework | Next.js 15 (App Router) + React 19 | Edge middleware + Node server actions |
| Language | TypeScript 5, `strict: true` | `target: ES2022` |
| ORM | Prisma 6 + `@prisma/extension-accelerate` | Org-scope extension layered on (`lib/prisma/extensions/org-scope.ts`) |
| Database | Postgres | Provisioned externally (Neon / Supabase / managed) |
| Auth | Auth.js v4 (`next-auth@4.24`) with Prisma adapter | Credentials + Google + GitHub providers |
| Email | Resend | Enqueued via Inngest |
| Background jobs | Inngest | Functions in `lib/inngest/functions/` |
| Rate limiting | Upstash Ratelimit (REST) | In-memory fallback in dev |
| Observability | Sentry | `@sentry/nextjs`; AsyncLocalStorage-bound `user.id`/`tags.orgId`/`tags.request_id` |
| Logging | Pino | JSON in prod, pretty in dev; secrets redacted; error+fatal forwarded to Sentry |
| File uploads | UploadThing | |
| i18n | `next-intl` | URL-segment routing (`/en/*`, `/fr/*`) |
| Testing | Vitest (unit + integration) + Playwright (E2E) | Three separate runners |
| Lint/format | ESLint flat config + Prettier + jsx-a11y | `--max-warnings 0` in CI |

## Folder map

```
actions/         # "use server" exports (114+ files; mid-migration to services/)
app/             # Next.js App Router: routes, layouts, API handlers
components/     # React UI components (Radix UI primitives + Tailwind)
config/          # auth options, permission catalog, sidebar config
docs/            # this file, runbooks, ADRs, backlog, audits
hooks/           # client-side React Query hooks
i18n/            # next-intl config + messages
lib/             # framework adapters, utilities, infra:
  audit/         #   recordAuditEvent
  context.ts     #   AsyncLocalStorage RequestContext
  env.ts         #   Zod-validated env
  inngest/       #   Inngest client + functions registry
  logger.ts      #   Pino + Sentry forwarder
  permissions.ts #   can(), Permission union
  prisma/        #   prisma client extensions (org-scope)
  security/      #   rate-limit, audit-log, password-utils
messages/        # next-intl translation JSON
middleware.ts    # auth + rate-limit + CSP + request-ID
prisma/          # schema.prisma, migrations, seed, db client
schemas/         # Zod schemas for server-action inputs
scripts/         # dev/install scripts + CI sweep checks
services/        # domain logic (the canonical layer per ADR-0001)
  _shared/       #   protect(), parseInput, requireOrg, ActionResponse helpers
  auth/          #   MFA service
  <domain>/      #   one service per domain (item, category, ...)
tests/
  e2e/           # Playwright specs
  integration/   # Vitest + real Postgres specs
types/           # shared TS types
```

## Multi-tenant model

Every tenant-scoped table has `organizationId FK Organization(id) ON DELETE CASCADE`. There are three layers of defence against cross-tenant leaks:

1. **Action-level filters** — every server action that touches tenant data calls `where: { organizationId: ctx.orgId }`.
2. **`protect()` wrapper** (`services/_shared/protect.ts`) — every new action is wrapped; the wrapper resolves `ctx` from session, checks the permission, runs the handler.
3. **Org-scope Prisma extension** (`lib/prisma/extensions/org-scope.ts`) — automatic `organizationId` injection on every `findMany`/`update`/etc. for tenant models, when called inside `withRequestContext()`. Catches the next action that forgets a filter.

Auth tables (`User`, `Account`, `Session`, `VerificationToken`) are deliberately excluded from auto-scoping — OAuth flows need cross-tenant access. Super-admin tools use `dbUnscoped` (the un-extended client) explicitly.

## Authn / authz

- **Authentication** — Auth.js v4 + Prisma adapter. Credentials (Argon2id) + Google + GitHub providers. JWT sessions. MFA scaffolding in `services/auth/mfa.ts` (TOTP via otplib); see [`runbooks/016-mfa-rollout.md`](runbooks/016-mfa-rollout.md) for the deployment plan.
- **Authorization** — RBAC via `Role.permissions String[]`. Permissions are dot-style strings (`users.read`, `pos.create`, …); the canonical list is in `config/permissions.ts` and the `Permission` union in `lib/permissions.ts`. `can(user, "users.delete")` is the central check; middleware uses it for route gating; `protect()` uses it for server actions.

## Audit logging

Every mutation worth tracking calls `recordAuditEvent({ entityType, entityId, action, orgId, userId, changes })`. Writes never throw — failure logs to Sentry as `fatal` for critical entity types (User / Role / Invite / Organization) and as `error` otherwise. A daily Inngest function (`lib/inngest/functions/audit-integrity-check.ts`) watches for volume drops vs the 7-day baseline and pages on >50% drop.

## Observability

- **Errors** → Sentry (server + client + edge), tagged with `user.id`, `tags.organizationId`, `tags.request_id` from the request context.
- **Logs** → Pino (JSON in prod), with secret redaction. `logger.error` / `logger.fatal` auto-forward to Sentry.
- **Request correlation** — middleware generates `X-Request-Id`; downstream code reads via `getRequestContext()`.
- **Audit log** → `AuditLog` table; durable record of mutations.

## Background jobs

Inngest. Functions registered in `lib/inngest/functions/index.ts`:
- `sendEmail` — transactional email dispatch via Resend
- `generateDailySalesReport` — scheduled report compilation
- `auditIntegrityCheck` — daily anomaly detection on the audit log

The Inngest webhook lives at `/api/inngest` and is HMAC-verified by the SDK.

## Deployment

- **Host** — Vercel. Production deploy runs `npm run vercel-build` which generates Prisma client, applies pending migrations (`prisma migrate deploy`), then `next build`.
- **DB migrations** — Prisma migration files in `prisma/migrations/` (committed). `vercel-build` runs `prisma migrate deploy` automatically on every prod deploy.
- **Secrets** — Vercel project env. Validated at boot by `lib/env.ts` (Zod); missing required vars (`DATABASE_URL`, `NEXTAUTH_SECRET`) crash startup loudly.
- **Backups** — provider-managed (Neon/Supabase point-in-time recovery). Off-host snapshot strategy in [`RUNBOOK.md`](RUNBOOK.md#backups).

## Testing

Three layers:
- **Unit** (`vitest.config.ts`) — `npm test`. Default include excludes integration + e2e.
- **Integration** (`vitest.integration.config.ts`) — `npm run test:integration`. Spins up against a real Postgres; each test wrapped in BEGIN/ROLLBACK. Factories in `tests/integration/factories.ts`.
- **E2E** (`playwright.config.ts`) — `npm run test:e2e`. Chromium-only; reuses the dev server locally.

CI runs lint → typecheck → unit + build + audit + integration in parallel after the quality gate. Playwright lands as a separate gated job once auth fixtures are in place.

## Known shape of the code

- `actions/` (114 files) is mid-migration to `services/`. See [ADR-0001](adr/0001-actions-vs-services.md).
- Some pre-existing TypeScript errors (~441 at last count) are tracked separately; the project did not enable `strict` from day one.
- `cmdk@1.0.0` pins react 18 as a peer; the rest of the app is on react 19. `npm install` requires `--legacy-peer-deps`. Revisit when cmdk catches up.
