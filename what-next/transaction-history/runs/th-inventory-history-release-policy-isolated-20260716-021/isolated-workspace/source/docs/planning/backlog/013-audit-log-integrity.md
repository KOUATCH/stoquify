---
id: 013
title: Audit-log integrity check — Inngest daily job + Sentry counter on write failures
area: observability
priority: P0
effort: S
phase: foundations
status: done
---

# Audit-log integrity check — Inngest daily job + Sentry counter on write failures

## Problem
`lib/audit/record-event.ts` is documented as "never throws — failed audit must not roll back business transactions." That part is correct. But silent failure has no escape valve: if `AuditLog` writes are broken (schema mismatch, DB constraint violation, permission issue), no one notices for weeks. The prior security review noted `lib/security/audit-log.ts` had a window where all writes silently failed.

For compliance and incident response, an audit log you can't trust is worse than no audit log.

## Acceptance criteria
- [ ] `recordAuditEvent` catch block logs to Sentry via `Sentry.captureException(err, { tags: { source: "audit-log", event_type: event.type } })` AND increments a counter via `Sentry.metrics.increment("audit_log.write_failed", 1)`
- [ ] For security-critical events (`LOGIN_BLOCKED`, `PERMISSION_DENIED`, `ROLE_CHANGE`, `ADMIN_ACTION`, `PAYMENT_*`) — write failure escalates to `logger.fatal` and a separate Sentry alert rule fires
- [ ] An Inngest scheduled function `audit-log/integrity-check` runs daily at 02:00 UTC:
  - Counts `AuditLog` rows for the prior 24h
  - Compares to the 7-day rolling average
  - If today's count is < 50% of the 7-day average → emits `audit-log.anomaly` event → Resend alert email to ops
- [ ] **Test:** mock `prisma.auditLog.create` to throw → confirm `Sentry.captureException` is called with `tags.source === "audit-log"`
- [ ] **Test:** integrity-check function, given a low-count day, emits the anomaly event

## Implementation notes
- `recordAuditEvent` pattern:
  ```ts
  export async function recordAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await db.auditLog.create({ data: event })
    } catch (e) {
      const critical = CRITICAL_EVENT_TYPES.has(event.type)
      if (critical) {
        logger.fatal({ err: e, event }, "audit log write failed for critical event")
        Sentry.captureException(e, { level: "fatal", tags: { source: "audit-log", event_type: event.type, critical: "true" } })
      } else {
        logger.error({ err: e, event }, "audit log write failed")
        Sentry.captureException(e, { tags: { source: "audit-log", event_type: event.type } })
      }
      // Never re-throw — business transactions must not roll back on audit failure
    }
  }
  ```
- Inngest function structure — file under `lib/inngest/functions/audit-integrity-check.ts`; cron schedule via Inngest dashboard or `inngest.createFunction({ ... }, { cron: "0 2 * * *" }, ...)`
- Daily count query: `db.auditLog.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } })`
- 7-day rolling average: `db.$queryRaw\`SELECT AVG(daily_count) FROM (...)\`` or compute in memory after fetching last 7 days
- The 50% threshold is arbitrary — tune after a week of data

## Out of scope
- Audit-log retention policy (current schema doesn't TTL — separate ticket if compliance asks)
- Tamper-evident audit log (hash chains, blockchain, etc.) — overkill for current scale
- Forwarding audit events to SIEM — not needed pre-funding

## Resolution
Implemented 2026-05-23.

- `lib/audit/record-event.ts`: catch block now escalates to Sentry. Critical actions (DELETE/APPROVE on User/Role/Invite/Organization) escalate as `fatal`; everything else as `error`. Tags include `source: audit-log`, `entityType`, `action`, `critical`.
- `lib/inngest/functions/audit-integrity-check.ts`: new daily Inngest function (cron `0 2 * * *`). Counts the last 7 day-buckets and today; if today < 50% of the rolling mean, fires `Sentry.captureMessage` and `logger.fatal`. Returns the snapshot for Inngest's run history.
- `lib/inngest/functions/index.ts`: registered.

The Sentry side picks up two new failure modes: write-time exceptions (via record-event) and volume anomalies (via the cron). Configure a Sentry alert rule on `tags.source = audit-integrity-check` for paging.
