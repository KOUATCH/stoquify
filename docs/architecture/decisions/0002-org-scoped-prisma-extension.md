# ADR-0002: org-scoped Prisma client extension as cross-tenant defence

**Status**: Accepted, 2026-05-23

## Context

Multi-tenant data leaks are the worst class of bug stockflow can ship. The codebase has 114 server actions, 30+ models with `organizationId`, and a history of cross-tenant defects (see `docs/security-findings/STOCKFLOW-VULNS-2026-05.md` for the audit that surfaced them). Action-level `where: { organizationId }` filters work, but they rely on every author remembering to write one — every time, in every Prisma call, including the ones added by tomorrow's contributor.

## Decision

Layer a Prisma client extension (`lib/prisma/extensions/org-scope.ts`) on top of the raw client. The extension automatically injects `organizationId = ctx.orgId` into every `findMany`, `findFirst`, `count`, `updateMany`, `deleteMany`, `create` call for tenant-scoped models, when running inside `withRequestContext()`.

- The `db` export is the extended client. Server actions use it.
- The `dbUnscoped` export is the raw client. Auth callbacks, audit-log analytics, scheduled jobs that legitimately operate across tenants use it explicitly.
- `TENANT_MODELS` lists every model that gets auto-scoping. Auth tables (`User`, `Account`, `Session`, `VerificationToken`), `Organization` itself, and `AuditLog` are excluded — they need cross-tenant access by design.
- `create` calls with `data.organizationId !== ctx.orgId` throw — silent tenant-assignment corruption becomes a loud error.

## Consequences

- The bar for "we don't have cross-tenant bugs" raises from "we audit hard" to "the query layer makes them impossible (inside `withRequestContext`)".
- Action-level filters become defence-in-depth, not the only defence.
- A new bug shape becomes possible: a service method that uses `dbUnscoped` when it should have used `db`. Code review needs to spot this; the variable name is intentionally awkward to make it visible.
- AsyncLocalStorage doesn't propagate across all runtime boundaries (Edge runtime, some worker scenarios). Code running outside a context falls back to the un-extended behaviour. Background jobs that operate per-tenant must `withRequestContext({ orgId, ... }, ...)` explicitly.

## Alternatives considered

- **Postgres RLS (Row-Level Security).** Strictly stronger guarantee — the DB itself enforces it, not the app. Considered. Rejected for now: requires every connection to set a session variable for the active org, the Prisma + RLS story is workable but adds a layer of operational complexity. Re-evaluate when the team is large enough to invest in it.
- **Don't fix the layer; just be more careful.** Rejected — the audit found real cross-tenant defects; "be careful" doesn't scale to 114 actions and a moving team.
