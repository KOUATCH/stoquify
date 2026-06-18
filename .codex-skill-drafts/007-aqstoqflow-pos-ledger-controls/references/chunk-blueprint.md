# POS Ledger Controls Blueprint

Skill: `007-aqstoqflow-pos-ledger-controls`

Summary: Connect POS sales, refunds, voids, cash drawer sessions, receipts, stock movements, and Z reports to ledger controls.

## Source Blueprint Section

### Chunk 06: POS Sale, Refund, Void, And Cash Drawer To Ledger

Purpose:

- Make the highest-volume SMB workflow safe: checkout, tenders, refunds, voids, drawers, stock, postings, and receipt trace.

Build:

- Verify and harden `commitPOSSale`.
- Ensure sale/payment/drawer/stock/posting/source link audit commit together.
- Refund and void compensating-event workflow.
- Tender evidence fields for cash, mobile money, card, bank, on-account, and mixed payments.
- POS trace drawer from receipt to sale, payment, posting batch, journal, source link, and audit.
- Cash close/Z report blockers and variance posting.

Touches:

- `services/pos/pos.service.ts`
- `services/accounting/postings/post-sale.ts`
- `services/accounting/postings/post-payment.ts`
- `services/accounting/postings/post-refund.ts`
- `services/accounting/postings/post-void.ts`
- `actions/pos/*`
- `hooks/posHooks/*`
- `components/pos/*`
- `dashboard/pos/*`

Business events:

- `POS_SALE_FINALIZED`
- `POS_PAYMENT_CAPTURED`
- `POS_REFUND_APPROVED`
- `POS_VOIDED`
- `CASH_DRAWER_CLOSED`
- `CASH_VARIANCE_POSTED`

Typed errors:

- `INSUFFICIENT_STOCK`
- `PERIOD_CLOSED`
- `IDEMPOTENCY_CONFLICT`
- `APPROVAL_REQUIRED`
- `SOD_VIOLATION`
- `UNBALANCED_RECIPE`
- `INVALID_ACCOUNT_MAP`

Notifications:

- Cashier: sale completed, queued receipt, insufficient stock, closed period, duplicate tender reference.
- Manager: refund approval required, drawer variance, void request, close blocked.
- Accountant: posting failure, source-link gap, cash variance.

Gates:

- Duplicate checkout replay creates one sale and one posting.
- Posting failure rolls back sale/payment/stock/drawer.
- Finalized ticket cannot be deleted.
- Refund cannot exceed original sale quantity/payment.
- Closed POS session cannot be reopened.
- Z report ties to ledger buckets.

Skill candidate:

- `007-aqstoqflow-pos-ledger-controls`

Moat:

- The platform becomes operationally reliable at the cashier desk while preserving accounting and audit truth.

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
