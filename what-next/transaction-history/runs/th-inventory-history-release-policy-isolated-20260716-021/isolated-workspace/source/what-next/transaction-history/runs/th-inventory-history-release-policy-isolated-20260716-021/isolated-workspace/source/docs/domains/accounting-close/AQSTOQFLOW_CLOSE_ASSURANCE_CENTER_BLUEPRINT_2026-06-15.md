# AqStoqFlow Close & Assurance Center Blueprint

Date: 2026-06-15
Status: Architecture blueprint for skill-suite realization
Target audience: AqStoqFlow product leadership, implementation agents, accountants, finance operators, and enterprise reviewers

## Executive Summary

The Close & Assurance Center should become the accountant-grade trust layer of AqStoqFlow.

Its core promise is simple:

> AqStoqFlow can tell an SMB owner and their accountant whether the month can be trusted, what blocks close, what evidence supports the numbers, and what package can be signed, exported, reviewed, and retained.

This is not just another dashboard. It is a close-readiness, evidence, exception, reconciliation, and accountant-review workflow that turns operational activity into accountable books. It makes the platform more attractive to accountants because it reduces their highest-friction work: chasing missing documents, reconciling payments, explaining suspense, validating ledger traceability, checking cut-off, and producing a reviewable monthly package.

## Product Positioning

Recommended product name:

**AqStoqFlow Close & Assurance Center**

Recommended positioning:

> The SMB operating system that gives accountants clean, reconciled, evidence-backed books every month.

The product should not claim to replace a qualified accountant or statutory audit. It should claim to organize, reconcile, prove, and package accounting evidence so an accountant can review faster and with more confidence.

## Current Platform Fit

The current platform appears ready for this next layer because the schema and services now include durable accounting and payment evidence foundations:

- Provider evidence: `ProviderEvent`.
- Statement evidence: `StatementLine` and statement import services.
- Reconciliation evidence: `ReconciliationRun`, match records, certificate signing, and certificate export.
- Suspense and exception evidence: `SuspenseItem`, `PaymentException`, suspense workflow services.
- Accounting backbone: `FiscalYear`, `AccountingPeriod`, `ChartOfAccount`, `Journal`, `JournalEntry`, `JournalEntryLine`, `LedgerPostingBatch`, `AccountingSourceLink`, and `LedgerAuditEvent`.
- Period close preflight already blocks on draft entries, failed posting batches, unlinked posted entries, open reconciliation exceptions, open suspense, unsigned reconciliation runs, and trial-balance issues.

This means the Close & Assurance Center should not duplicate payment reconciliation or ledger logic. It should orchestrate and expose it as a professional close workflow.

## Language Lock

- **Close Readiness**: a computed status for an accounting period. It indicates whether the period can safely proceed to close. It does not close the period by itself.
- **Assurance Pack**: an exportable evidence bundle for accountant review. It is a system evidence pack, not a legal audit opinion.
- **Evidence**: immutable or traceable records that support figures and close decisions: journals, posting batches, source links, provider events, statement lines, reconciliation certificates, suspense records, fiscal documents, and audit logs.
- **Suspense**: itemized unresolved money held in a controlled waiting account workflow. Suspense is never a quiet adjustment or hidden variance.
- **Certification**: system trust certification and sign-off workflow. It must not be marketed as statutory certification unless validated by qualified experts and jurisdictional requirements.
- **Accountant Review**: a controlled read/comment/approve-recommend workflow for external or internal accountants. It should never bypass system invariants.

## Strategic Outcome

The center should let an accountant answer these questions quickly:

1. Are the books balanced for this period?
2. Are posted entries traceable to source evidence?
3. Are payments reconciled by rail and provider account?
4. Are suspense items itemized, owned, and within SLA?
5. Are all reconciliation days signed or intentionally voided?
6. Are AR, AP, inventory valuation, cash drawer, tax/VAT, and payroll/payment exposures ready?
7. What blocks close, who owns it, and what is the next action?
8. Can I export a hash-backed evidence package for review and retention?

## Architecture Spine

### State

`AccountingPeriod` remains the source of truth for period status. Close & Assurance records should be derived from or attached to an accounting period.

The new system should add a durable assessment layer:

- `CloseRun`: one assessment run for an organization and accounting period.
- `CloseChecklistItem`: normalized checklist results for close requirements.
- `CloseAssuranceFinding`: blockers, warnings, and informational findings.
- `CloseEvidenceItem`: evidence references and hashes included in the close view or pack.
- `ClosePackExport`: generated export metadata, watermark, hash, and row counts.
- `AccountantReview`: accountant review session and decision.
- `AccountantComment`: threaded accountant/operator comments on findings, evidence, or period.
- Optional `CloseCertification`: signed final system certification record after all gates pass.

### Data Model Principles

Every close-assurance model must be:

- Organization-scoped.
- Period-scoped where applicable.
- Append-only for signed/certified/exported records.
- Hash-backed for exported packs and evidence snapshots.
- Linked to actor IDs and audit events.
- Safe for multi-tenant accountant access.

Suggested enums:

- `CloseRunStatus`: `DRAFT`, `RUNNING`, `READY`, `BLOCKED`, `CERTIFIED`, `EXPORTED`, `VOIDED`.
- `CloseFindingSeverity`: `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `CloseFindingStatus`: `OPEN`, `ASSIGNED`, `IN_REVIEW`, `RESOLVED`, `WAIVED_WITH_APPROVAL`, `REOPENED`.
- `CloseEvidenceType`: `JOURNAL_ENTRY`, `POSTING_BATCH`, `SOURCE_LINK`, `FISCAL_DOCUMENT`, `PROVIDER_EVENT`, `STATEMENT_LINE`, `RECONCILIATION_CERTIFICATE`, `SUSPENSE_ITEM`, `PAYMENT_EXCEPTION`, `AUDIT_LOG`, `REPORT_EXPORT`.
- `CloseChecklistStatus`: `PASSED`, `FAILED`, `WARNING`, `NOT_APPLICABLE`, `UNAVAILABLE`.
- `AccountantReviewStatus`: `OPEN`, `CHANGES_REQUESTED`, `READY_TO_CLOSE`, `APPROVED_FOR_CLOSE`, `REJECTED`, `CANCELLED`.

### Contracts

All server actions should use the existing protected action pattern:

- Parse input with Zod.
- Resolve authenticated organization from session.
- Enforce server-side permissions.
- Require fresh authentication for close, certify, waive, and export actions.
- Call a server-only service.
- Return the established safe protected response shape.
- Log unexpected failures with correlation IDs.
- Never return Prisma internals, SQL, stack traces, provider secrets, or raw provider payloads.

### Trust Boundary

The client may request:

- run close readiness,
- refresh assessment,
- assign findings,
- comment,
- request waiver,
- review evidence,
- export a pack,
- certify a close.

The server decides:

- which period is valid,
- whether close is blocked,
- whether evidence is sufficient,
- whether a waiver is allowed,
- whether a user can approve,
- whether export/certification can happen.

### Sync Model

Phase 1 should be request-driven:

- Operator opens period.
- Server computes close readiness.
- Dashboard displays live assessment.
- Accountant reviews and comments.
- Operator resolves findings.
- System re-runs readiness.
- Certifier signs and exports.

Phase 2 can add scheduled jobs:

- Daily close preflight for active period.
- Month-end close reminders.
- SLA escalation for findings.
- Accountant invitation notifications.

## Core User Experience

### 1. Close Command Center

Primary route proposal:

`/dashboard/accounting/close`

Alternate finance route:

`/dashboard/finance/close-assurance`

Recommended first placement: accounting, because the close authority is `AccountingPeriod`. Finance dashboards can link to it.

The page should show:

- Current period selector.
- Close readiness status: `Ready`, `Blocked`, `Needs Review`, `Certified`.
- Readiness score by domain.
- Critical blockers.
- Payment reconciliation sign-off coverage.
- Suspense exposure.
- Ledger balance status.
- Evidence coverage.
- Accountant review status.
- Last run, as-of timestamp, and correlation ID.

### 2. Close Checklist

Checklist groups:

- Accounting period and ledger.
- Payment reconciliation.
- Suspense and exceptions.
- Cash drawers and bank/mobile money.
- Sales, AR, and customer balances.
- Purchases, AP, and supplier balances.
- Inventory valuation and stock adjustments.
- VAT/tax evidence.
- Payroll/payment batches where enabled.
- Audit trail and user approvals.

Each checklist item needs:

- status,
- severity,
- source service,
- evidence count,
- blocker reason,
- next action link,
- owner,
- SLA or deadline where applicable.

### 3. Evidence Graph

This is the mind-blowing accountant feature.

For a figure or close item, show:

`financial figure -> ledger lines -> journal entry -> posting batch -> source link -> source document/payment/provider statement -> audit events -> export hash`

For payment reconciliation:

`PaymentTransaction -> ProviderEvent -> StatementLine -> MatchRecord -> ReconciliationRun -> certificate hash -> ledger posting batch`

For suspense:

`SuspenseItem -> evidence refs -> 47x mapping -> proposed resolution -> approval -> correction posting`

This makes the platform feel trustworthy because every number becomes explainable.

### 4. Exception Resolution Board

Close blockers should not be hidden in prose. They should become assignable work.

Finding domains:

- `LEDGER`
- `PAYMENT_RECONCILIATION`
- `SUSPENSE`
- `CASH_DRAWER`
- `INVENTORY_VALUATION`
- `AR`
- `AP`
- `TAX`
- `PAYROLL`
- `MASTER_DATA`
- `SECURITY_CONTROL`

Allowed actions:

- assign owner,
- add comment,
- link evidence,
- re-run check,
- open source record,
- request waiver,
- approve waiver,
- mark resolved only when source condition is fixed.

Disallowed actions:

- edit provider evidence,
- delete statement lines,
- mutate posted journals,
- mark blocker resolved without fixing or approved waiver,
- export certified pack while critical blockers remain.

### 5. Accountant Portal

The accountant view should be read-first and evidence-focused.

Capabilities:

- View close dashboard.
- View checklist and findings.
- View evidence references and hashes.
- Comment and ask questions.
- Mark review status.
- Download approved assurance packs.
- Recommend close readiness.

Restrictions:

- No direct journal mutation unless the accountant also has explicit accounting permissions.
- No suspense resolution without proper role and controls.
- No provider evidence mutation.
- No self-approval where segregation of duties applies.

### 6. Assurance Pack Export

Start with JSON export because it is deterministic and testable. Add PDF/XLSX later.

Pack contents:

- Organization and period metadata.
- Close readiness summary.
- Checklist results.
- Trial balance summary.
- Ledger reconciliation failures or clean status.
- Signed payment reconciliation run list.
- Reconciliation certificate references and hashes.
- Suspense register.
- Open/closed payment exception summary.
- AR/AP aging summaries.
- Inventory valuation summary where available.
- Cash drawer and bank/mobile money coverage.
- VAT/tax evidence summary where available.
- Audit log excerpt for close-sensitive actions.
- Accountant comments and review decision.
- Export watermark.
- Export content hash.
- Correlation ID.
- Redaction note.

Export rule:

- Block certified export when critical blockers remain.
- Allow draft export with clear `DRAFT_NOT_CERTIFIED` watermark.
- Always audit exports.

## Close Readiness Engine

Proposed service:

`services/accounting/close-assurance.service.ts`

Primary functions:

- `runCloseAssurance(organizationId, input, control)`
- `getCloseAssuranceDashboard(organizationId, periodId)`
- `getCloseEvidenceGraph(organizationId, input)`
- `assignCloseFinding(...)`
- `commentOnCloseFinding(...)`
- `requestCloseWaiver(...)`
- `approveCloseWaiver(...)`
- `certifyCloseRun(...)`
- `exportClosePack(...)`

The engine should compose existing services:

- `getPeriodClosePreflight`
- `reconcileLedger`
- payment reconciliation dashboard/certification services
- suspense workflow services
- finance dashboard services
- accounting reports services
- inventory reconciliation/valuation services where available
- audit log services

The engine should not:

- write journal entries directly,
- resolve suspense directly,
- trust client-computed totals,
- generate provider evidence,
- close a period unless all close gates pass and explicit close action is invoked.

## Readiness Domains And Gates

### Accounting Ledger

Pass conditions:

- No draft journal entries for the period.
- No pending or failed posting batches.
- No posted entries missing source/posting trace.
- Trial balance balances by currency.
- Period is open and belongs to organization.

Blockers:

- unbalanced trial balance,
- unlinked posted entry,
- missing source link,
- failed posting batch,
- posting into closed period.

### Payment Reconciliation

Pass conditions:

- Required provider accounts are mapped.
- Provider/statement evidence exists where applicable.
- Reconciliation runs are signed or intentionally voided.
- Open critical payment exceptions are zero.
- Open suspense items are zero or approved with close-safe resolution plan.

Blockers:

- unsigned reconciliation runs,
- open high/critical exceptions,
- duplicate provider references,
- statement/provider evidence gaps,
- unmatched money outside itemized suspense.

### Suspense

Pass conditions:

- Every suspense amount is itemized.
- 47x mapping exists.
- Owner and SLA are set.
- Critical/past-SLA items are resolved before close.

Blockers:

- open critical suspense,
- past-SLA suspense without approved plan,
- suspense not linked to evidence,
- suspense not posted through approved gateway.

### Inventory Valuation

Pass conditions:

- Stock movements and valuation entries reconcile where inventory valuation exists.
- Adjustments/write-offs are approved and posted.
- Negative stock or valuation anomalies are flagged.

Blockers:

- unapproved stock adjustments affecting value,
- valuation mismatch,
- inventory movement without posting/evidence.

### AR/AP

Pass conditions:

- Customer/supplier balances reconcile to control accounts where implemented.
- Payments and allocations have traceability.
- Supplier bank changes and payments respect approval controls.

Blockers:

- unapplied payments,
- unreconciled supplier payments,
- stale unmatched receivables/payables,
- missing supplier payment evidence.

### Tax/VAT

Pass conditions:

- Tax/VAT report data is ledger-backed or explicitly operational/draft.
- Rates are effective-dated configuration.
- Missing tax setup is surfaced.

Blockers:

- hardcoded or missing rates for the period,
- tax report without provenance,
- fiscal documents missing required evidence.

### Payroll/Disbursements

Pass conditions:

- Approved payroll runs are posted.
- Payment batches are reconciled where enabled.
- No edited finalized payroll records without correction event.

Blockers:

- approved payroll not posted,
- payroll payment batch unreconciled,
- payroll exceptions unresolved.

## Permissions

Recommended permission set:

- `accounting.close.read`
- `accounting.close.run`
- `accounting.close.finding.assign`
- `accounting.close.finding.comment`
- `accounting.close.waiver.request`
- `accounting.close.waiver.approve`
- `accounting.close.certify`
- `accounting.close.export`
- `accounting.close.accountant.review`
- `accounting.close.accountant.comment`
- `accounting.close.accountant.invite`

Sensitive actions requiring fresh authentication:

- approve waiver,
- certify close,
- export certified close pack,
- invite accountant,
- close period,
- reopen/void close run if allowed.

Segregation of duties:

- Creator of a critical waiver cannot approve it.
- User responsible for a finding should not be sole certifier.
- Cashier should not approve their own unexplained variance.
- Payment initiator should not resolve its high-risk exception alone.

## Notifications

Notification events:

- close readiness run completed,
- close blocked,
- critical blocker created,
- blocker assigned,
- blocker due soon,
- suspense past SLA,
- reconciliation run ready for sign-off,
- accountant comment added,
- waiver requested,
- waiver approved/rejected,
- close certified,
- close pack exported.

Notification channels should initially use the existing in-app notification provider and later support email or accountant portal digests.

## Error Handling Design

Use the existing protected action wrapper and safe application errors.

Recommended domain errors:

- `CloseRunNotFound`
- `CloseBlocked`
- `EvidenceMissing`
- `UnbalancedLedger`
- `OpenSuspenseBlocksClose`
- `UnsignedReconciliationBlocksClose`
- `UnresolvedExceptionBlocksClose`
- `ExportRequiresCertification`
- `DraftExportOnly`
- `SoDViolation`
- `FreshAuthRequired`
- `RecertificationRequired`

Operational rules:

- Unknown errors become safe internal errors with correlation ID.
- Expected close blockers become actionable business-rule errors.
- Export failures never create a successful export record.
- Certification and export writes must be transactional.
- Failed close runs should persist enough diagnostic metadata to support operators, without storing secrets or raw provider payloads.

## Data Trust And Provenance

Every financial figure on the Close & Assurance Center must show:

- provenance: posted, estimated, unavailable, or operational draft,
- as-of timestamp,
- period status,
- source tables or services,
- method if estimated,
- reason if unavailable.

Rules:

- Missing data must not render as zero.
- Estimated and posted values must not be mixed into one trusted total.
- Production paths must not use mock data.
- Exports must include provenance metadata.
- Cache keys must include tenant, period, role/permission context, provenance, and as-of where cached.

## OHADA/SYSCOHADA Guardrails

The center must enforce these principles:

- One ledger source of financial truth.
- Balanced double-entry journal entries.
- Posted/finalized records are append-only.
- Corrections use reversal or adjustment records.
- Closed periods reject postings.
- Supporting evidence is linked and hash-backed.
- Audit trails capture actor, action, time, reason, and source.
- National tax/social values are configuration-driven, not hardcoded.
- Suspense is itemized and close-blocking when unresolved.

The system may produce an evidence pack, but statutory filing/legal claims require expert validation.

## Proposed Routes

- `/dashboard/accounting/close`
- `/dashboard/accounting/close/[periodId]`
- `/dashboard/accounting/close/[periodId]/evidence`
- `/dashboard/accounting/close/[periodId]/findings`
- `/dashboard/accounting/close/[periodId]/pack`
- `/dashboard/accounting/close/accountant`

Optional finance shortcuts:

- `/dashboard/finance/close-assurance`
- link cards from `/dashboard/finance` and `/dashboard/finance/reconciliation`.

## Proposed Files

Server:

- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance.schemas.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/close-assurance-evidence.service.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `services/accounting/__tests__/close-assurance-pack.service.test.ts`

Actions:

- `actions/accounting/close-assurance.actions.ts`
- `actions/accounting/__tests__/close-assurance.actions.test.ts`

Hooks:

- `hooks/accounting/useCloseAssurance.ts`
- `hooks/accounting/useCloseAssurancePack.ts`

UI:

- `components/accounting/close/CloseAssuranceCenter.tsx`
- `components/accounting/close/CloseReadinessSummary.tsx`
- `components/accounting/close/CloseChecklist.tsx`
- `components/accounting/close/CloseFindingsBoard.tsx`
- `components/accounting/close/CloseEvidenceGraph.tsx`
- `components/accounting/close/AccountantReviewPanel.tsx`
- `components/accounting/close/ClosePackExportPanel.tsx`

Routes:

- `app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx`

## Skill Suite For Complete Realization

### 01-close-assurance-readiness-audit

Purpose:
Audit the current platform before building.

Responsibilities:

- Inspect schema, migrations, accounting services, payment reconciliation services, close preflight, permissions, actions, hooks, notifications, and dashboard conventions.
- Confirm available evidence models and missing close models.
- Produce a gap report and implementation gate.
- Refuse to proceed if ledger or reconciliation foundations are absent.

Verification:

- `npm run prisma:validate`
- targeted `rg` checks for models and services
- existing tests inventory
- saved readiness report

### 02-close-assurance-schema-contracts

Purpose:
Add durable close-assurance schema and contracts.

Responsibilities:

- Add Prisma models/enums for close runs, checklist items, findings, evidence, exports, reviews, and comments.
- Add permissions.
- Add Zod schemas and DTOs.
- Add domain error codes.
- Add migration.

Verification:

- `npm run prisma:validate`
- `npm run typecheck`
- schema-focused tests if model helpers exist

### 03-close-assurance-engine

Purpose:
Build the server-only close readiness and evidence engine.

Responsibilities:

- Compose existing period close preflight, ledger reconciliation, payment reconciliation, suspense, and finance/accounting report services.
- Produce readiness score, checklist, blocker groups, evidence refs, and provenance.
- Persist `CloseRun` snapshots and findings.
- Add tests for blocker detection and fail-closed behavior.

Verification:

- focused Jest tests for clean period, blocked ledger, open suspense, unsigned reconciliation, missing evidence, and cross-tenant denial
- `npm run typecheck`

### 04-close-assurance-dashboard-portal

Purpose:
Build the enterprise UI, hooks, server actions, notifications, and accountant review workflow.

Responsibilities:

- Add protected server actions.
- Add TanStack Query hooks following local patterns.
- Build dashboard using the system dashboard semantics.
- Add accountant review/comment panels.
- Add assignment and notification flows.
- Add loading, empty, error, permission-denied, and partial-data states.

Verification:

- `npm run typecheck`
- route smoke checks
- focused action tests
- UI readback for dashboard token usage

### 05-close-assurance-pack-certification

Purpose:
Build close pack export, certification, hashes, watermarks, and recertification gates.

Responsibilities:

- Generate deterministic JSON close pack first.
- Include evidence hashes, export hash, watermark ID, row counts, redaction note, and correlation ID.
- Add certification record and export audit.
- Block certified export when critical blockers remain.
- Support draft export with clear watermark.

Verification:

- pack hash determinism test
- certified export blocked with critical findings
- draft export watermark test
- permission/fresh-auth tests
- `npm run typecheck`

### close-assurance-center-suite

Purpose:
Orchestrate all five skills in order.

Responsibilities:

- Run 01 through 05.
- Stop on critical non-compliance.
- Verify each gate.
- Produce final implementation report.
- State compliance level: partial, operator-ready, accountant-review-ready, or certified-system-ready.

## Suggested Timeline

### Phase 1: Readiness Audit - 1 to 2 days

Deliverables:

- Current-state map.
- Gap report.
- Build/no-build gate.
- Skill 01 output report.

### Phase 2: Schema And Contracts - 2 to 4 days

Deliverables:

- Prisma migration.
- Permissions.
- DTOs and schemas.
- Error taxonomy.
- Basic tests.

### Phase 3: Close Engine - 4 to 7 days

Deliverables:

- Close readiness service.
- Evidence graph service.
- Finding generation.
- Close run persistence.
- Jest coverage for main blockers.

### Phase 4: Dashboard And Accountant Portal - 4 to 6 days

Deliverables:

- Enterprise dashboard.
- Findings board.
- Accountant review panel.
- Comments.
- Notifications.
- Hooks and actions.

### Phase 5: Pack Export And Certification - 3 to 5 days

Deliverables:

- JSON close pack.
- Hashes and watermark.
- Certification workflow.
- Export audit.
- Recertification rules.

### Phase 6: Hardening And Launch Gate - 2 to 3 days

Deliverables:

- Typecheck and test pass.
- Route smoke checks.
- Data-trust certificate.
- OHADA compliance review notes.
- Accountant demo script.
- Final launch report.

Estimated total: 16 to 27 focused implementation days depending on test depth, export formats, and accountant portal scope.

## Acceptance Criteria

The Close & Assurance Center is acceptable when:

- A period can be assessed without closing it.
- Close blockers match actual service invariants.
- Critical blockers prevent certification and certified export.
- Every financial figure has provenance and as-of metadata.
- Missing data renders unavailable with reason, not zero.
- Reconciliation and suspense status are included in readiness.
- Evidence references trace from close summary to source records.
- Accountant comments and reviews are audited.
- Certified pack export is hashed and watermarked.
- Draft pack export is clearly marked not certified.
- Fresh authentication protects close, certify, waiver approval, and export.
- Segregation of duties prevents self-approval of sensitive actions.
- Focused tests cover clean, blocked, missing evidence, open suspense, unsigned reconciliation, permission denial, and export hash determinism.

## Compliance Status Target

Initial delivery target:

**Accountant-review-ready, not statutory-certified.**

Meaning:

- The system can provide strong operational assurance and evidence packaging.
- It can help accountants review books faster.
- It can block obvious unsafe close scenarios.
- It should not claim legal audit certification.

Future certified target:

**System-certified close evidence pack.**

Requires:

- T4 data-trust level on close surfaces and exports.
- Expanded automated regression gates.
- Accountant/legal validation for jurisdiction-specific statutory claims.
- Immutable export retention policy.

## Final Recommendation

Build this as the next major accountant-attractive moat after payment reconciliation.

Payment reconciliation proves money movement. The Close & Assurance Center proves the month.

Together, they turn AqStoqFlow into more than an SMB operating app. They make it an accountant-trust platform.
