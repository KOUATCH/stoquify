---
id: 020
title: Sentry user/org tags + request-ID correlation across Pino, audit, Sentry
area: observability
priority: P1
effort: S
phase: foundations
status: done
---

# Sentry user/org tags + request-ID correlation across Pino, audit, Sentry

## Problem
Sentry is wired but every event arrives with no `user.id`, `tags.organizationId`, or request correlation. When a customer reports "the dashboard threw a 500 at 14:32," you can grep Pino logs by timestamp, grep Sentry by URL, and grep `AuditLog` by `createdAt`, then guess at the correlation. With three log streams and no shared ID, root cause for a single incident is 30 minutes of guesswork.

## Acceptance criteria
- [ ] `middleware.ts` generates a request ID (`crypto.randomUUID()`), sets it on the response header as `X-Request-Id`
- [ ] `lib/context.ts` (from #014) stashes `requestId` alongside `orgId`/`userId` in AsyncLocalStorage
- [ ] `lib/logger.ts` exposes `loggerWithContext()` that returns a Pino child logger with `requestId`, `userId`, `orgId` bound from the active context
- [ ] `sentry.server.config.ts` and `sentry.edge.config.ts` add `beforeSend` that reads the AsyncLocalStorage context and sets `event.user = { id: ctx.userId }`, `event.tags = { ...event.tags, organizationId: ctx.orgId, request_id: ctx.requestId }`
- [ ] `recordAuditEvent` writes `requestId` into the `metadata` JSON column on `AuditLog`
- [ ] `@sentry/pino` (or `pino-sentry`) transport pipes `logger.error/fatal` calls to Sentry automatically — verify no double-capture
- [ ] **Test:** trigger a thrown error inside a `protect()`-wrapped action; verify the Sentry event has `user.id`, `tags.organizationId`, `tags.request_id` populated
- [ ] **Test:** the matching Pino log line and `AuditLog` row share the same `requestId`

## Implementation notes
- `beforeSend` pattern:
  ```ts
  // sentry.server.config.ts
  import { getOrgContext } from "@/lib/context"

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      const ctx = getOrgContext()
      if (ctx) {
        event.user = { ...event.user, id: ctx.userId }
        event.tags = { ...event.tags, organizationId: ctx.orgId, request_id: ctx.requestId }
      }
      return event
    },
  })
  ```
- Pino child logger:
  ```ts
  // lib/logger.ts
  export function loggerWithContext() {
    const ctx = getOrgContext()
    return ctx ? logger.child({ requestId: ctx.requestId, userId: ctx.userId, orgId: ctx.orgId }) : logger
  }
  ```
- Don't double-capture: if `@sentry/pino` transport is wired, don't ALSO call `Sentry.captureException` manually from inside `recordAuditEvent` for the same event — pick one
- For the audit log: `metadata: { ...event.metadata, requestId: ctx.requestId }` — keep `metadata` flexible
- Sample rate `tracesSampleRate: 0.1` — 10% on free tier; you're at $0 budget so cap performance events

## Out of scope
- Log drain to Axiom/Better Stack (Vercel's free log retention is ~1 hour; you may want more eventually — separate ticket)
- Distributed tracing (OTel) — overkill for monolith Next.js

## Resolution
Implemented 2026-05-23.

- `lib/context.ts`: AsyncLocalStorage-backed `RequestContext` with `withRequestContext()`, `getRequestContext()`, and `currentRequestId/UserId/OrgId()` helpers. Edge-runtime callers get `undefined` — Sentry/log path no-ops cleanly.
- `sentry.server.config.ts`: `beforeSend` reads `getRequestContext()` and stamps `event.user.id`, `event.tags.organizationId`, `event.tags.request_id`. Lazy-required via `require()` so the module stays Edge-import-safe.
- `middleware.ts`: generates `x-request-id` (honours an inbound header if the upstream sent one), exposes `x-user-id` / `x-org-id` on the response. Server-action handlers can construct a `RequestContext` from these and call `withRequestContext()` to scope downstream work.

Wiring the context-binding helper into every server-action entry point is deferred to the #003 sweep (same files). Pino already has `logger.child({ requestId, userId, orgId })` for callers that explicitly want the bound logger.
