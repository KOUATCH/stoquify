# AqStoqFlow Ordered Implementation Chunks And Skill Suite

Date: 2026-06-14

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

Status: Graph-grounded execution blueprint for turning the platform technical specification into ordered, implementable work packages and reusable Codex skills.

Source artifacts:

- `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `what-next/AQSTOQFLOW_90_DAY_FEATURE_MODULE_IMPLEMENTATION_ACTION_PLAN_2026-06-13.md`
- `graphify-out/GRAPH_REPORT.md`

Fresh graph baseline:

- Rebuilt on 2026-06-14 from the full repository.
- Corpus: 1,163 supported files and about 1,671,348 words.
- Graph: 4,121 nodes, 5,321 edges, and 135 report-level communities.
- Key graph hubs: `localizePath()`, `pickLocale()`, `SystemMonitor`, `useNotifications()`, the ordered implementation blueprint, the OHADA SMB technical spec, the 90-day action plan, `ResilientDatabase`, the next implementation sequence, and the payment reconciliation blueprint.
- Key hyperedges to respect: tenant defense in depth, ledger-first operational posting, enterprise error handling safety stack, ledger-first OHADA operating spine, server action security stack, ledger-backed compliance control plane, enterprise POS delivery flow, and fraud-resistant RBAC authorization.

This document is engineering guidance. Legal, tax, payroll, social-security, and fiscal-submission behavior still requires qualified expert validation before production claims.

## 1. Does The Prompt Make Sense?

Yes. The prompt makes sense if it is treated as an execution-system request, not just a roadmap request.

The correct reading is:

> Break the OHADA SMB platform into ordered implementation chunks, define reusable skills for executing each chunk, and require gates for architecture, service boundaries, accounting integrity, typed errors, user notifications, audit evidence, tests, and release readiness so the product grows coherently instead of becoming a pile of modules.

The prompt is strong because it asks for:

- Order, not random feature work.
- Skills, not one-off coding.
- Gates, not hopeful completion.
- Error and notification handling, not happy-path screens.
- Moats, not generic ERP features.
- OHADA SMB pain relief, not abstract enterprise software.

The only refinement needed is to make "complete" mean "accepted through gates." A feature should not be considered done when the UI exists. It is done when the event, service, ledger, audit trail, exception handling, notifications, tests, and operational dashboard all work together.

## 2. Refined Master Prompt

Use this as the canonical prompt for this program:

```text
Transform the AqStoqFlow OHADA SMB technical specification into an ordered implementation program. Break the platform into dependency-aware chunks that can be implemented one by one without breaking tenant isolation, accounting truth, POS integrity, inventory valuation, payment reconciliation, payroll correctness, compliance evidence, or user experience.

For each chunk, define:
- what it builds;
- why it must come at that point in the sequence;
- the code surfaces it touches;
- the business events it introduces or hardens;
- the database and service invariants;
- the RBAC, step-up, and segregation-of-duties controls;
- the typed errors and retry/fallback semantics;
- the user and operator notifications;
- the audit, evidence, and observability requirements;
- the tests, static checks, and acceptance gates;
- the reusable Codex skill that should execute or review it.

Treat the platform as a ledger-first, country-pack-driven, multi-tenant OHADA SMB operating system. Do not advance to regulated features until the prerequisite gates pass. Do not trust client totals, mutable finalized facts, unverified country rules, hidden logs, or operational-table reports that claim statutory truth.
```

## 3. Language Locked

- Chunk: an implementation package with one clear scope, dependencies, files, tests, and exit gate.
- Skill: a reusable Codex instruction package that executes or audits a repeatable chunk of work.
- Gate: a mandatory acceptance checkpoint that blocks the next chunk if the platform cannot prove the required invariant.
- Business event: an append-only economic fact that drives postings, projections, audit, outbox, notifications, and evidence.
- Painkiller workflow: a workflow that removes a recurring business risk for OHADA SMBs, such as unreconciled mobile money, stock drift, payroll uncertainty, fiscal-document rejection, or accountant panic at close.

## 4. Program Spine

The ordered spine is:

```text
Baseline and skill system
-> platform controls and error foundation
-> business event envelope
-> accounting and close blockers
-> country packs
-> POS to ledger to fiscal documents
-> compliance center
-> payment reconciliation
-> inventory valuation
-> purchasing and AP
-> payroll and presence
-> statutory reports and accountant portal
-> offline sync
-> country adapter pilots
-> controlled AI and advanced automation
```

The reason for this order is simple: regulated automation must stand on proven business events, ledger postings, country-pack rules, immutable evidence, and operational exception queues.

Graph-grounded implementation anchors:

- `requireOrg()` is a cross-community bridge, so every chunk must inspect tenant-scoped service/action paths before writing code.
- `useNotifications()` is a top graph hub, so every user-facing chunk must use the existing notification surface instead of inventing a parallel toast/error pattern.
- `ErrorHandler`, `createStockFlowActionWrapper`, `normalizeActionError`, `withErrorHandling`, `ApplicationError`, and `toSafeActionError` are graph-visible foundations; the error chunk must consolidate around them.
- `SystemMonitor`, `ResilientDatabase`, and `CircuitBreaker` are graph-visible reliability primitives; external authority, payment, report, and worker chunks should reuse or align with these instead of adding a new resilience stack.
- Accounting, POS, payment reconciliation, compliance, and what-next planning documents are already strongly connected in the graph; the first implementation slices should strengthen those bridges rather than opening isolated payroll/offline/AI work too early.

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

## 7. Ordered Implementation Chunks

### Chunk 00: Program Baseline And Skill System

Purpose:

- Convert the technical spec into a trackable execution system and define the skill suite before large code changes.

Build:

- This ordered chunk blueprint.
- A skill inventory with proposed new/refined skills.
- A chunk tracker with status, gates, owners, and verification commands.
- A "do not advance" rule for regulated modules.

Touches:

- `what-next/*`
- future `skills/*` or `C:\Users\J COMPUTER\.codex\skills\*`

Errors and notifications:

- No runtime errors yet.
- Planning output must classify blockers as `READY`, `BLOCKED`, or `REQUIRES_EXPERT_REVIEW`.

Gate:

- The user confirms the chunk order and skill suite before installing new skills or starting code work.

Skill candidate:

- `0001-aqstoqflow-program-orchestrator`

Exit criteria:

- Ordered chunks are saved.
- Skill candidates are named.
- First implementation slice is unambiguous.

### Chunk 01: Platform Control Plane

Purpose:

- Make tenant, organization, country, module, RBAC, step-up, and audit foundations explicit and reusable.

Build:

- Organization readiness profile.
- Module gate service.
- Sensitive-action policy service.
- Fresh-auth/step-up control for high-risk actions.
- Permission matrix for POS, inventory, accounting, finance, compliance, purchasing, HR, payroll, reports, and settings.
- Audit envelope helper for services.

Touches:

- `services/_shared/*`
- `services/controls/*`
- `actions/settings/*`
- `app/[locale]/(dashboard)/dashboard/settings/*`
- `messages/fr.json`
- `messages/en.json`

Business events:

- `MODULE_GATE_CHANGED`
- `SENSITIVE_POLICY_CHANGED`
- `ROLE_PERMISSION_CHANGED`
- `ORG_REGULATORY_PROFILE_UPDATED`

Typed errors:

- `FORBIDDEN`
- `STEP_UP_REQUIRED`
- `APPROVAL_REQUIRED`
- `SOD_VIOLATION`
- `TENANT_SCOPE_VIOLATION`

Notifications:

- User: "Permission denied", "Fresh authentication required", "Change saved".
- Operator: policy changes, module disabled attempts, repeated forbidden attempts.

Gates:

- Tenant scope test.
- RBAC denial test.
- Step-up required test.
- Audit log test for policy changes.

Skill candidate:

- `0002-aqstoqflow-control-plane`

Why this comes early:

- Every later module depends on consistent tenant, role, module, and sensitive-action behavior.

### Chunk 02: Enterprise Error, Notification, And Observability Foundation

Purpose:

- Give every action, service, and UI a safe failure contract before financial workflows expand.

Build:

- Shared error primitives or alignment with existing `ErrorHandler`, action wrappers, and notification helpers.
- Server action wrapper for safe result unions.
- Prisma error classifier.
- Correlation ID helper.
- Notification mapping helper.
- Client boundary and fallback conventions for dashboard modules.
- Structured logging contract.

Touches:

- existing error-handling utilities found by graph communities:
  - `ErrorHandler`
  - `createStockFlowActionWrapper`
  - `normalizeActionError`
  - `withErrorHandling`
  - `useNotifications`
  - `createErrorNotification`
- `lib/error*`
- `actions/*`
- `components/*error*`

Business events:

- none required, but high-severity failures should emit audit/operator events where schema supports it.

Typed errors:

- full shared taxonomy.

Notifications:

- standardized user messages.
- standardized operator queues for critical categories.

Gates:

- Unknown thrown error becomes safe response.
- Prisma unique/foreign-key/not-found errors map correctly.
- Authorization errors are not shown as system crashes.
- Production-mode response leaks no stack, SQL, token, or secret.

Skill candidate:

- `0003-aqstoqflow-error-notification-foundation`

Why this comes early:

- Without this, every later feature invents its own failure behavior and the product feels incoherent.

### Chunk 03: Universal Business Event Envelope And Outbox

Purpose:

- Create the append-only event layer that binds POS, payments, stock, payroll, purchasing, compliance, and accounting into one operating system.

Build:

- `BusinessEvent`
- `BusinessEventOutbox`
- `BusinessEventAudit`
- `BusinessEventAnomaly`
- idempotency and payload-hash conflict service.
- outbox lease/retry service.
- anomaly signal service.
- event spec template.

Touches:

- `prisma/schema.prisma`
- `services/events/*`
- `services/_shared/idempotency*`
- `services/_shared/outbox*`
- `services/_shared/audit*`
- tests under `services/events/__tests__/*`

Business events:

- all later events use this envelope.

Typed errors:

- `IDEMPOTENCY_CONFLICT`
- `DUPLICATE_KEY_CONFLICT`
- `MISSING_DOCUMENT`
- `SYSTEM_ERROR`

Notifications:

- Duplicate payload conflict becomes operator-visible if sensitive.
- Outbox retry backlog appears in readiness dashboard.

Gates:

- Same idempotency key and same payload returns original result.
- Same idempotency key and different payload rejects and audits.
- Worker retry is bounded and visible.
- Event, audit, and outbox commit atomically with domain mutation.

Skill candidate:

- `0004-aqstoqflow-business-event-gateway`

Why this comes before regulated modules:

- It prevents each module from inventing its own version of idempotency, audit, and side effects.

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

- `0005-aqstoqflow-accounting-control-center`

Why this comes now:

- Fiscal documents, reconciliation, payroll, and statutory reports are not credible until accounting truth is visible.

### Chunk 05: Country-Pack Factory And Regulatory Parameter Gate

Purpose:

- Turn country-specific legal behavior into versioned, effective-dated, validated configuration.

Build:

- Country-pack schema extensions for VAT, payroll, social, fiscalization, filing, payments, and labels.
- Verification statuses:
  - `DRAFT`
  - `REQUIRES_EXPERT_REVIEW`
  - `VERIFIED`
  - `EXPERT_APPROVED`
  - `UNSUPPORTED`
- Golden fixtures and validation service.
- Hardcode detector for country-specific rates/endpoints/deadlines outside packs.
- Country capability matrix UI.

Touches:

- `services/regulatory/country-packs/*`
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/*validation*`
- `components/regulatory/*`
- `dashboard/settings/regulatory/*`

Business events:

- `COUNTRY_PACK_VERSION_ACTIVATED`
- `REGULATORY_PARAMETER_CHANGED`
- `COUNTRY_PACK_VALIDATION_FAILED`

Typed errors:

- `VALIDATION_FAILED`
- `AUTHORITY_UNAVAILABLE`
- `SYSTEM_ERROR`
- `FORBIDDEN`

Notifications:

- Unsupported behavior blocks automation with a clear reason.
- Pack activation creates operator and audit notification.
- Expert-review blockers appear on readiness dashboards.

Gates:

- No tax/payroll/fiscal behavior hardcoded in POS/accounting/compliance services.
- Production-impacting values require effective date and verification status.
- Unsupported country behavior cannot silently reuse another country.

Skill candidate:

- `0006-aqstoqflow-country-pack-factory`

Moat:

- This is one of the hardest assets for competitors to emulate because it combines law, fixtures, provenance, versioning, and product gating.

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

- `0007-aqstoqflow-pos-ledger-controls`

Moat:

- The platform becomes operationally reliable at the cashier desk while preserving accounting and audit truth.

### Chunk 07: Fiscal Document And Compliance Center Kernel

Purpose:

- Turn posted business events into immutable fiscal documents, submissions, evidence, and compliance queues.

Build:

- Fiscal document service.
- Fiscal sequence service.
- Compliance submission outbox.
- Adapter contract and fake sandbox adapter.
- Compliance evidence service.
- Compliance obligation/reminder service.
- Certification queue, rejection queue, and document trace UI.

Touches:

- `prisma/schema.prisma`
- `services/compliance/*`
- `actions/compliance/*`
- `hooks/complianceHooks/*`
- `components/compliance/*`
- `dashboard/compliance/*`

Business events:

- `FISCAL_DOCUMENT_CREATED`
- `FISCAL_DOCUMENT_CERTIFICATION_QUEUED`
- `FISCAL_DOCUMENT_CERTIFIED`
- `FISCAL_DOCUMENT_REJECTED`
- `MANUAL_FALLBACK_APPROVED`

Typed errors:

- `MISSING_DOCUMENT`
- `SEQUENCE_CONFLICT`
- `AUTHORITY_UNAVAILABLE`
- `AUTHORITY_REJECTED`
- `PERIOD_CLOSED`
- `FORBIDDEN`

Notifications:

- User: document queued, certified, rejected, fallback required.
- Operator: adapter unhealthy, queue aging, sequence conflict, rejection reason.
- Accountant: evidence ready, filing blocker.

Gates:

- Fiscal document requires posted source event and source link.
- Sequence allocation is serialized and unique by legal scope.
- Certified document fields are immutable.
- Authority outage retries through outbox without duplicate submission.
- Rejections appear in UI, not just logs.

Skill candidate:

- `0008-aqstoqflow-compliance-center`

Moat:

- Competitors can create invoices; fewer can prove the full chain from sale to ledger to fiscal evidence.

### Chunk 08: Payment Reconciliation And Treasury Moat

Purpose:

- Prove money collected equals provider/bank/cash evidence and ledger postings.

Build:

- Provider account setup UI.
- Adapter registry for mobile money, card, bank CSV, cash, and future instant rails.
- Immutable provider events and statement files.
- Matching engine with exact, fuzzy, batch, and manual-match workflows.
- Suspense posting through ledger gateway.
- Daily reconciliation certificate.
- Close blocker integration.

Touches:

- `services/payments/*`
- `services/accounting/reconciliations.service.ts`
- `actions/payments/*`
- `hooks/payments/*`
- `components/payments/*`
- `dashboard/finance/reconciliation/*`

Business events:

- `PROVIDER_EVENT_CAPTURED`
- `STATEMENT_IMPORTED`
- `PAYMENT_MATCHED`
- `SUSPENSE_CREATED`
- `SUSPENSE_RESOLVED`
- `PAYMENT_RECONCILIATION_SIGNED`

Typed errors:

- `PROVIDER_SIGNATURE_INVALID`
- `RECONCILIATION_DRIFT`
- `IDEMPOTENCY_CONFLICT`
- `APPROVAL_REQUIRED`
- `SOD_VIOLATION`

Notifications:

- Operator: unmatched payment, duplicate provider ID, statement import failed, reconciliation signed, suspense aging.
- Accountant: day cannot close, provider balance mismatch, signed certificate ready.

Gates:

- Forged/replayed provider callbacks produce no posting.
- Statement hash is stored and immutable.
- Suspense totals reconcile to suspense ledger account.
- Manual match above threshold requires maker-checker.
- Period close blocks on unsigned critical reconciliation days.

Skill candidate:

- `0009-aqstoqflow-payment-reconciliation-moat`

Moat:

- Three-leg proof across internal payment, provider evidence, and ledger is a deep SMB painkiller in mobile-money-heavy markets.

### Chunk 09: Inventory Movement, Valuation, Count, And Production Kernel

Purpose:

- Make stock quantity and stock value trustworthy across sales, purchases, transfers, counts, losses, and production.

Build:

- Immutable inventory movements.
- Inventory valuation layers or weighted average/FIFO service.
- Stock count and variance workflow.
- Transfer and adjustment approval workflow.
- Production recipe consumption and finished goods.
- Ledger tie-out for stock value.

Touches:

- `services/inventory/*`
- `services/production/*`
- `actions/inventory/*`
- `hooks/inventoryHooks/*`
- `components/inventory/*`
- `dashboard/inventory/*`

Business events:

- `STOCK_RECEIVED`
- `STOCK_TRANSFERRED`
- `STOCK_ADJUSTMENT_APPROVED`
- `STOCK_COUNT_SIGNED`
- `STOCK_VARIANCE_POSTED`
- `PRODUCTION_BATCH_COMPLETED`

Typed errors:

- `INSUFFICIENT_STOCK`
- `APPROVAL_REQUIRED`
- `SOD_VIOLATION`
- `INVALID_ACCOUNT_MAP`
- `PERIOD_CLOSED`

Notifications:

- Stockkeeper: transfer pending, count variance, negative stock blocked.
- Manager: adjustment approval required, shrinkage spike.
- Accountant: inventory valuation drift, variance posted.

Gates:

- No service directly updates stock balance as source truth.
- Count variance posts with source evidence.
- Stock projection rebuild matches movement history.
- Inventory value reconciles to class 3 ledger.
- Production consumes ingredients and creates output in one transaction.

Skill candidate:

- `0010-aqstoqflow-inventory-valuation-kernel`

Moat:

- The platform can explain stock in physical, operational, and accounting terms.

### Chunk 10: Purchasing, Supplier Invoices, AP, And Supplier Payment Controls

Purpose:

- Make purchasing and supplier liabilities controlled, matched, and fraud-resistant.

Build:

- Requisition and purchase order lifecycle.
- Goods receipt posting.
- Supplier invoice posting.
- Three-way match service.
- Supplier bank account change request and dual approval.
- Supplier payment release, posting, and reconciliation.

Touches:

- `services/purchasing/*`
- `services/suppliers/*`
- `services/payments/*`
- `actions/purchasing/*`
- `hooks/purchasingHooks/*`
- `components/purchasing/*`
- `dashboard/purchases/*`

Business events:

- `PURCHASE_ORDER_APPROVED`
- `GOODS_RECEIVED`
- `SUPPLIER_INVOICE_POSTED`
- `SUPPLIER_BANK_CHANGE_APPROVED`
- `SUPPLIER_PAYMENT_RELEASED`

Typed errors:

- `APPROVAL_REQUIRED`
- `SOD_VIOLATION`
- `DUPLICATE_KEY_CONFLICT`
- `INVALID_ACCOUNT_MAP`
- `RECONCILIATION_DRIFT`

Notifications:

- Buyer: PO approved/rejected, receipt mismatch.
- Manager: supplier bank change pending, payment approval required.
- Accountant: 3-way match exception, AP aging risk.

Gates:

- Received quantity cannot exceed ordered quantity.
- Supplier invoice duplicate detection works.
- Payment is blocked if supplier bank change is pending or unapproved.
- Goods receipt, invoice, AP, and payment reconcile to ledger.

Skill candidate:

- `0011-aqstoqflow-purchasing-ap-controls`

Moat:

- Supplier fraud controls plus 3-way match are a powerful enterprise-grade differentiator for SMBs.

### Chunk 11: HR, Presence, Payroll, Payslips, And Payroll Payments

Purpose:

- Build OHADA-zone payroll as an evidence-backed workflow tied to attendance, contracts, country packs, ledger postings, and payments.

Build:

- Employee and contract model.
- Attendance, leave, overtime, correction workflow.
- Payroll period and run lifecycle.
- Country-pack-backed calculation engine.
- Calculation snapshot.
- Payslip archive.
- Payroll posting.
- Payroll payment batch.
- Payroll declaration read model.
- Employee self-service.

Touches:

- `services/hr/*`
- `services/presence/*`
- `services/payroll/*`
- `services/regulatory/country-packs/*`
- `actions/payroll/*`
- `hooks/payrollHooks/*`
- `components/payroll/*`
- `dashboard/hr/*`
- `dashboard/payroll/*`

Business events:

- `EMPLOYEE_CONTRACT_ACTIVATED`
- `ATTENDANCE_SIGNED`
- `ATTENDANCE_CORRECTED`
- `PAYROLL_RUN_CALCULATED`
- `PAYROLL_RUN_APPROVED`
- `PAYSLIP_EMITTED`
- `PAYROLL_PAYMENT_RELEASED`
- `PAYROLL_DECLARATION_PREPARED`

Typed errors:

- `VALIDATION_FAILED`
- `APPROVAL_REQUIRED`
- `SOD_VIOLATION`
- `PERIOD_CLOSED`
- `INVALID_ACCOUNT_MAP`
- `REQUIRES_EXPERT_REVIEW`

Notifications:

- HR: attendance anomaly, missing contract, payroll ready for review.
- Manager: payroll approval required, correction request.
- Employee: payslip available, leave decision.
- Accountant: payroll posting failed, declaration blocker.

Gates:

- Payroll run pins country pack version.
- Approved payslip cannot be recalculated in place.
- Attendance edits after payroll create corrections.
- Payroll posting equals payroll totals.
- Ghost employee and duplicate bank/phone flags surface.

Skill candidate:

- `0012-aqstoqflow-payroll-presence-engine`

Moat:

- Payroll is sticky and hard to copy when it combines country packs, presence evidence, payslips, accounting, payments, and declarations.

### Chunk 12: Ledger-Backed Reports, Data Trust, And Accountant Portal

Purpose:

- Give owners and accountants traceable statutory and management reporting.

Build:

- Ledger-backed reports:
  - livre-journal;
  - grand livre;
  - balance generale;
  - bilan;
  - compte de resultat;
  - TFT;
  - VAT declaration;
  - payroll/tax/social liabilities;
  - inventory book.
- Data-trust badges with source, period, as-of timestamp, pack version, and confidence.
- Accountant firm and client access/consent.
- Accountant portfolio dashboard.
- Export evidence hashes.

Touches:

- `services/accounting/reports/*`
- `services/compliance/portfolio.service.ts`
- `services/reports/*`
- `actions/reports/*`
- `hooks/reportHooks/*`
- `components/reports/*`
- `dashboard/reports/*`
- `dashboard/compliance/portfolio/*`

Business events:

- `REPORT_EXPORT_CREATED`
- `ACCOUNTANT_ACCESS_GRANTED`
- `ACCOUNTANT_ACCESS_REVOKED`
- `FILING_DRAFT_PREPARED`

Typed errors:

- `FORBIDDEN`
- `STEP_UP_REQUIRED`
- `MISSING_DOCUMENT`
- `RECONCILIATION_DRIFT`
- `PERIOD_CLOSED`

Notifications:

- Owner: accountant access granted/revoked, report export ready.
- Accountant: client exception queue, missing evidence, filing draft ready.
- Operator: statutory report unavailable due to source blockers.

Gates:

- Statutory reports read ledger balances, not operational estimates.
- Every exported report has filter, source, period, pack version, and hash.
- Accountant access requires explicit consent, expiry, role, and audit.
- Tenant isolation test proves cross-client access is blocked.

Skill candidate:

- `0013-aqstoqflow-data-trust-accountant-portal`

Moat:

- Accountants become distribution partners because the platform gives them traceable portfolio control.

### Chunk 13: Offline POS And Device Sync

Purpose:

- Make the platform usable in real SMB conditions where internet loss is normal, while preserving fiscal and accounting integrity.

Build:

- Local immutable event queue.
- Device sequence and hash chain.
- Provisional receipts only unless country pack explicitly permits final offline fiscal numbering.
- Server sync dedupe and conflict queue.
- Offline status UX.
- Sync replay tests.

Touches:

- `services/pos/offline*`
- `services/events/*`
- `actions/pos/sync*`
- `components/pos/offline*`
- POS routes and device settings.

Business events:

- `OFFLINE_EVENT_CAPTURED`
- `OFFLINE_EVENT_SYNCED`
- `OFFLINE_SYNC_CONFLICT`
- `DEVICE_SEQUENCE_GAP_DETECTED`

Typed errors:

- `IDEMPOTENCY_CONFLICT`
- `SEQUENCE_CONFLICT`
- `AUTHORITY_UNAVAILABLE`
- `SYSTEM_ERROR`

Notifications:

- Cashier: offline mode active, sync pending, conflict requires manager.
- Manager: device sequence gap, duplicate sync, unresolved offline events.
- Accountant: provisional receipts pending certification.

Gates:

- Offline event replay cannot duplicate sale or posting.
- Device cannot assign final fiscal number unless country policy permits.
- Sync conflict is visible and auditable.
- Server remains source of final legal truth.

Skill candidate:

- `0014-aqstoqflow-offline-pos-sync`

Moat:

- Offline-first fiscal-safe POS is difficult and deeply valuable in the OHADA operating environment.

### Chunk 14: Real Country Adapter Pilot

Purpose:

- Move from fake/sandbox compliance adapter to one validated real country path only when official specs and expert review are available.

Build:

- Country-specific adapter under compliance adapter contract.
- Official spec reference storage.
- Sandbox fixtures.
- Credential storage and redaction.
- Adapter health dashboard.
- Pilot runbook.

Touches:

- `services/compliance/adapters/<country>/*`
- `services/regulatory/country-packs/<country>*`
- `services/compliance/evidence.service.ts`
- `dashboard/compliance/adapter-health/*`

Business events:

- `AUTHORITY_SUBMISSION_SENT`
- `AUTHORITY_SUBMISSION_ACCEPTED`
- `AUTHORITY_SUBMISSION_REJECTED`
- `AUTHORITY_CREDENTIAL_ROTATED`

Typed errors:

- `AUTHORITY_UNAVAILABLE`
- `AUTHORITY_REJECTED`
- `EXTERNAL_TIMEOUT`
- `FORBIDDEN`
- `STEP_UP_REQUIRED`

Notifications:

- Operator: adapter degraded, rejection received, credentials expiring, queue age.
- Accountant: certified artifacts ready or filing blocked.

Gates:

- Official spec version/date recorded.
- Expert validation status recorded.
- Sandbox acceptance and rejection fixtures pass.
- Credentials are not stored in country packs or logs.
- Adapter can be disabled per tenant without breaking POS posting.

Skill candidate:

- `0015-aqstoqflow-country-adapter-pilot`

Moat:

- Real adapter credibility plus generic adapter architecture lets the product expand country by country without risky rewrites.

### Chunk 15: Controlled AI Copilot And Advanced Automation

Purpose:

- Add AI only after data trust exists, and keep it inside strict accounting/compliance guardrails.

Build:

- Read-only assistant first.
- Source-cited answers from reports, source links, fiscal docs, and ledger views.
- Proposal mode for actions, never autonomous posting/filing/payment/reversal.
- Human confirmation, step-up, and audit for any workflow transition proposal.
- Hallucination and unsafe-action tests.

Touches:

- future `services/ai/*`
- `services/reports/*`
- `services/accounting/*`
- `components/copilot/*`
- `dashboard/*`

Business events:

- `AI_ANALYSIS_REQUESTED`
- `AI_ACTION_PROPOSAL_CREATED`
- `AI_ACTION_PROPOSAL_ACCEPTED`
- `AI_ACTION_PROPOSAL_REJECTED`

Typed errors:

- `FORBIDDEN`
- `STEP_UP_REQUIRED`
- `MISSING_DOCUMENT`
- `SYSTEM_ERROR`

Notifications:

- User: proposal created, source missing, action requires approval.
- Operator: unsafe request blocked, repeated sensitive attempts.

Gates:

- AI cannot post, pay, approve, reverse, certify, submit, or change credentials autonomously.
- Every answer cites source, period, tenant, and as-of state.
- Unsafe-action prompts are blocked and audited.

Skill candidate:

- `0016-aqstoqflow-ai-copilot-guardrails`

Moat:

- A safe copilot becomes useful only because the underlying evidence graph is trustworthy.

## 8. Proposed Reusable Skill Suite

The skill suite should avoid one huge monolithic skill. Use a suite executor, a conductor skill, foundation skills, domain skills, and a release-gate skill.

### 8.1 Suite Executor Skill

Name:

- `0000-aqstoqflow-execution-suite`

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

### 8.2 Conductor Skill

Name:

- `0001-aqstoqflow-program-orchestrator`

Use when:

- Starting or sequencing any platform chunk.
- Deciding which domain skill to run.
- Checking whether gates allow the next chunk.

Core behavior:

- Read this blueprint and the technical spec.
- Identify the active chunk.
- Load the relevant domain skill.
- Enforce universal gates.
- Refuse to advance on CRITICAL/HIGH invariant failures.
- Produce a completion report with files changed, tests, risks, and next chunk.

### 8.3 Foundation Skills

- `0002-aqstoqflow-control-plane`
- `0003-aqstoqflow-error-notification-foundation`
- `0004-aqstoqflow-business-event-gateway`
- `0005-aqstoqflow-accounting-control-center`
- `0006-aqstoqflow-country-pack-factory`

These must be created/refined before heavy domain execution.

### 8.4 Domain Execution Skills

- `0007-aqstoqflow-pos-ledger-controls`
- `0008-aqstoqflow-compliance-center`
- `0009-aqstoqflow-payment-reconciliation-moat`
- `0010-aqstoqflow-inventory-valuation-kernel`
- `0011-aqstoqflow-purchasing-ap-controls`
- `0012-aqstoqflow-payroll-presence-engine`
- `0013-aqstoqflow-data-trust-accountant-portal`
- `0014-aqstoqflow-offline-pos-sync`
- `0015-aqstoqflow-country-adapter-pilot`
- `0016-aqstoqflow-ai-copilot-guardrails`

### 8.5 Review Skill

Name:

- `0017-aqstoqflow-enterprise-release-gate`

Use when:

- A chunk is claimed complete.
- A module is being promoted from draft to usable.
- A regulated workflow is being prepared for release.

Core behavior:

- Audit tenant scope, RBAC, event pipeline, ledger, immutability, errors, notifications, tests, UI states, and observability.
- Return `APPROVED`, `APPROVED WITH REQUIRED FIXES`, or `REJECTED`.

## 9. Skill Creation Order

Create skills in this order:

0. `0000-aqstoqflow-execution-suite`
1. `0001-aqstoqflow-program-orchestrator`
2. `0002-aqstoqflow-control-plane`
3. `0003-aqstoqflow-error-notification-foundation`
4. `0004-aqstoqflow-business-event-gateway`
5. `0005-aqstoqflow-accounting-control-center`
6. `0006-aqstoqflow-country-pack-factory`
7. `0007-aqstoqflow-pos-ledger-controls`
8. `0008-aqstoqflow-compliance-center`
9. `0009-aqstoqflow-payment-reconciliation-moat`
10. `0010-aqstoqflow-inventory-valuation-kernel`
11. `0011-aqstoqflow-purchasing-ap-controls`
12. `0012-aqstoqflow-payroll-presence-engine`
13. `0013-aqstoqflow-data-trust-accountant-portal`
14. `0014-aqstoqflow-offline-pos-sync`
15. `0015-aqstoqflow-country-adapter-pilot`
16. `0016-aqstoqflow-ai-copilot-guardrails`
17. `0017-aqstoqflow-enterprise-release-gate`

Reason:

- The `00` suite skill is the runner and resumption controller.
- The first six numbered skills create the rules of the road.
- The next skills execute domain modules in dependency order.
- The release gate skill prevents optimistic "done" claims from bypassing evidence.

## 10. Chunk Tracker Template

Use this for every chunk:

```markdown
## Chunk XX: Name

Status: NOT_STARTED | IN_PROGRESS | BLOCKED | READY_FOR_REVIEW | APPROVED | REJECTED

Owner:

Source docs:

Dependencies:

Files expected:

Business events:

Schema changes:

Service changes:

Actions/hooks/UI changes:

Typed errors:

Notifications:

Audit/evidence:

Tests:

Static checks:

Gate result:

Remaining risk:

Next chunk allowed:
```

## 11. Do-Not-Advance Rules

Do not move to the next chunk when any of these are true:

- A financial/stock/payroll event can commit without an event envelope.
- A posted journal can be edited or deleted.
- A finalized fiscal document can be mutated.
- A sensitive action can be self-approved.
- A provider webhook lacks signature or replay protection.
- A country-pack value used in production is unverified.
- A report claims statutory truth from operational estimates.
- A user-facing screen has no error or permission-denied state.
- A critical exception is only logged and not visible to operators.
- A test or static check required by the chunk was skipped without a documented blocker.

## 12. First Recommended Execution Slice

Start with:

1. Install/use `0000-aqstoqflow-execution-suite`.
2. Create/refine `0001-aqstoqflow-program-orchestrator`.
3. Create/refine `0002-aqstoqflow-control-plane`.
4. Create/refine `0003-aqstoqflow-error-notification-foundation`.
5. Create/refine `0004-aqstoqflow-business-event-gateway`.
6. Implement or harden the shared action/error/notification contract.
7. Implement or verify business event envelope and outbox.
8. Build Accounting Control Center and close blocker read model.

Why:

- This creates the execution discipline and the runtime foundation before expanding regulated workflows.

## 13. Competitive Moats By Chunk

| Moat | Built by chunks | Why hard to emulate |
| --- | --- | --- |
| Country-pack library | 05, 11, 14 | Requires legal provenance, versioning, fixtures, expert review, and production gates. |
| Ledger-first event gateway | 03, 04 | Requires coherent accounting, idempotency, source links, audit, outbox, and tests. |
| POS-to-fiscal evidence chain | 06, 07 | Requires checkout speed plus immutable fiscal and accounting truth. |
| Payment reconciliation | 08 | Requires provider evidence, matching, suspense, ledger tie-out, and close blockers. |
| Inventory valuation trust | 09 | Requires stock movement history, valuation layers, counts, production, and ledger reconciliation. |
| Payroll and presence | 11 | Requires country rules, attendance evidence, payslips, liabilities, payments, and corrections. |
| Accountant portal | 12 | Requires tenant consent, portfolio queues, data trust, and audit/export evidence. |
| Offline fiscal-safe POS | 13 | Requires device events, sequence gaps, provisional receipt policy, sync conflict handling, and compliance rules. |
| Safe AI | 15 | Requires source-cited data trust and action guardrails before automation. |

## 14. Final Operating Principle

AqStoqFlow should not be built as separate modules that happen to share a sidebar. It should be built as one evidence-producing operating system.

The product becomes a true OHADA SMB painkiller when every user action answers:

- What happened?
- Who did it?
- Was it allowed?
- Which period owns it?
- Which source document proves it?
- Which ledger entry records it?
- Which country rule applied?
- Which exceptions remain?
- What must be done next?

That is the difference between a feature-rich app and a platform that SMBs, accountants, and regulators can trust.
