# Accounting Control Center Blueprint

Skill: `005-aqstoqflow-accounting-control-center`

Summary: Build the OHADA accounting backbone, chart of accounts, fiscal periods, journal controls, close blockers, and provenance.

## Source Blueprint Section

### Chunk 04: Accounting Backbone And Close Blocker Engine

Purpose:

- Make ledger truth, period locks, source links, posting batches, and close readiness enforceable and visible.

Build:

- Accounting readiness service.
- Posting rule/account mapping completeness service.
- Close blocker read model.
- Journal/source-link trace viewer service.
- Accounting Control Center UI.
- Posting rollback tests for existing POS/payment flows.

Touches:

- `services/accounting/*`
- `actions/accounting/*`
- `hooks/accountingHooks/*`
- `components/accounting/*`
- `app/[locale]/(dashboard)/dashboard/accounting/control-center/*`

Business events:

- `ACCOUNT_MAP_CHANGED`
- `JOURNAL_POSTED`
- `POSTING_FAILED`
- `PERIOD_CLOSED`
- `PERIOD_CLOSE_BLOCKED`

Typed errors:

- `PERIOD_CLOSED`
- `UNBALANCED_RECIPE`
- `INVALID_ACCOUNT_MAP`
- `MISSING_DOCUMENT`
- `TENANT_SCOPE_VIOLATION`

Notifications:

- User: missing mapping, closed period, posting failed, close blocked.
- Operator: unposted source, orphan source link, unbalanced attempt, missing document hash.

Gates:

- Posted journal entries cannot update/delete.
- Posting into closed period fails.
- Unbalanced journal fails.
- Financial reports and close readiness use ledger/source links.
- Accounting Control Center displays provenance and as-of metadata.

Skill candidate:

- `005-aqstoqflow-accounting-control-center`

Why this comes now:

- Fiscal documents, reconciliation, payroll, and statutory reports are not credible until accounting truth is visible.

## Universal Gates

## 5. Universal Gates For Every Chunk

Every chunk must pass these gates before it is marked complete.

### Gate A: Architecture And Context

- Read relevant graph report, schema, services, actions, hooks, and existing route patterns.
- Confirm the chunk belongs in the canonical path:
  - `prisma/schema.prisma`
  - `services/<domain>`
  - `actions/<domain>`
  - `hooks/<domain>`
  - `components/<domain>`
  - `app/[locale]/(dashboard)/dashboard/<domain>`
- Confirm no UI imports Prisma or provider adapters.

### Gate B: Tenant, RBAC, And Module Control

- Tenant scope is present on every read, write, aggregate, uniqueness rule, and worker job.
- Service boundary enforces permission and module gate.
- Sensitive actions enforce fresh auth, step-up, and segregation of duties.
- Denials return typed errors, not crashes or silent empty states.

### Gate C: Event And Ledger Integrity

- Every money, stock, tax, payroll, supplier, customer, cash, or fiscal event has an event spec.
- The service uses idempotency key and payload hash.
- The event posts balanced journal entries when it has accounting impact.
- Source link, document hash, audit log, anomaly signal, and outbox are created in the same transaction where applicable.
- Corrections use compensating events, not mutation of finalized facts.

### Gate D: Error And Notification Contract

- Server actions return a stable discriminated union:
  - `{ ok: true, data }`
  - `{ ok: false, error }`
- Errors use stable codes, categories, severity, retryability, and correlation IDs.
- User notifications are safe and actionable.
- Operator notifications expose exception queues, not hidden logs.
- Sensitive error logs redact secrets, tokens, PII, raw provider payloads, and SQL.

### Gate E: UX Completeness

Every UI surface includes:

- loading state;
- empty state;
- validation error state;
- permission-denied state;
- partial/degraded state;
- stale/as-of state;
- retry state where meaningful;
- bilingual French-first strings;
- dark and light theme behavior;
- accessible labels, focus states, and keyboard path.

### Gate F: Evidence And Observability

- Audit records include actor, tenant, action, source, reason, timestamp, and relevant hashes.
- Logs include operation, correlation ID, tenant, severity, and redacted metadata.
- Metrics expose queue age, exception count, posting failures, reconciliation drift, and country-pack blockers where relevant.
- Close blockers and exception queues are visible to operators.

### Gate G: Verification

At minimum, each chunk needs:

- focused service tests;
- typed error tests;
- tenant rejection test;
- RBAC rejection test;
- idempotency or duplicate test when event-based;
- rollback test for financial/stock/payroll mutations;
- static scan for banned patterns;
- typecheck after contract/schema changes.

Suggested baseline commands, adjusted to the actual scripts:

```powershell
npm run prisma:validate
npm run typecheck
npm test -- services/accounting
npm test -- services/pos
npm test -- services/payments
npm test -- services/regulatory
npm test -- services/compliance
```

## Shared Error And Notification Taxonomy

## 6. Shared Error And Notification Taxonomy

Use a stable taxonomy across the platform.

### Error Shape

```ts
type AppErrorCode =
  | "TENANT_SCOPE_VIOLATION"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "STEP_UP_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "SOD_VIOLATION"
  | "VALIDATION_FAILED"
  | "PERIOD_CLOSED"
  | "IDEMPOTENCY_CONFLICT"
  | "DUPLICATE_KEY_CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "UNBALANCED_RECIPE"
  | "INVALID_ACCOUNT_MAP"
  | "SEQUENCE_CONFLICT"
  | "MISSING_DOCUMENT"
  | "AUTHORITY_UNAVAILABLE"
  | "AUTHORITY_REJECTED"
  | "PROVIDER_SIGNATURE_INVALID"
  | "RECONCILIATION_DRIFT"
  | "EXTERNAL_TIMEOUT"
  | "SYSTEM_ERROR"

type AppErrorResponse = {
  code: AppErrorCode
  category:
    | "validation"
    | "authentication"
    | "authorization"
    | "business_rule"
    | "accounting"
    | "inventory"
    | "payment"
    | "compliance"
    | "payroll"
    | "external"
    | "system"
  severity: "low" | "medium" | "high" | "critical"
  retryable: boolean
  userMessageKey: string
  operatorMessage?: string
  correlationId: string
  fieldErrors?: Record<string, string[]>
}
```

### Notification Types

- `success`: operation completed and evidence exists.
- `warning`: operation completed but has follow-up risk.
- `error`: operation failed and user can act.
- `critical`: operation failed and blocks close, posting, certification, payroll, or payment.
- `info`: background status, queued work, or read-only provenance.

### Notification Destinations

- User toast for immediate workflow feedback.
- Inbox/task item for work requiring follow-up.
- Exception queue for accounting, compliance, reconciliation, payroll, or stock issues.
- Audit log for control evidence.
- Operator metric or alert for repeated/high-severity failures.
