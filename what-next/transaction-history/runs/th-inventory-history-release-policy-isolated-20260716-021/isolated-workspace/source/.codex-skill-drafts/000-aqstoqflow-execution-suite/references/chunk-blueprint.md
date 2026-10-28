# AqStoqFlow Execution Suite Blueprint

Skill: `000-aqstoqflow-execution-suite`

Summary: Run the full numbered AqStoqFlow OHADA SMB implementation suite, select the next skill, enforce gates, and resume safely.

## Source Blueprint Section

### 8.1 Suite Executor Skill

Name:

- `000-aqstoqflow-execution-suite`

Use when:

- Running the full AqStoqFlow/OHADA build sequence.
- Resuming work after a pause.
- Deciding the next numbered skill to load.
- Enforcing cross-skill gates before advancing.

Core behavior:

- Read this blueprint, the technical spec, and the current graph report.
- Determine the first incomplete or unsafe chunk.
- Load the required numbered skill or use the chunk instructions as the fallback if that skill has not been installed yet.
- Apply universal gates before and after the chunk.
- Stop on CRITICAL/HIGH invariant failures and return a repair order.

## 9. Skill Creation Order

Create skills in this order:

0. `000-aqstoqflow-execution-suite`
1. `001-aqstoqflow-program-orchestrator`
2. `002-aqstoqflow-control-plane`
3. `003-aqstoqflow-error-notification-foundation`
4. `004-aqstoqflow-business-event-gateway`
5. `005-aqstoqflow-accounting-control-center`
6. `006-aqstoqflow-country-pack-factory`
7. `007-aqstoqflow-pos-ledger-controls`
8. `008-aqstoqflow-compliance-center`
9. `009-aqstoqflow-payment-reconciliation-moat`
10. `010-aqstoqflow-inventory-valuation-kernel`
11. `011-aqstoqflow-purchasing-ap-controls`
12. `012-aqstoqflow-payroll-presence-engine`
13. `013-aqstoqflow-data-trust-accountant-portal`
14. `014-aqstoqflow-offline-pos-sync`
15. `015-aqstoqflow-country-adapter-pilot`
16. `016-aqstoqflow-ai-copilot-guardrails`
17. `017-aqstoqflow-enterprise-release-gate`

Reason:

- The `00` suite skill is the runner and resumption controller.
- The first six numbered skills create the rules of the road.
- The next skills execute domain modules in dependency order.
- The release gate skill prevents optimistic "done" claims from bypassing evidence.

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
