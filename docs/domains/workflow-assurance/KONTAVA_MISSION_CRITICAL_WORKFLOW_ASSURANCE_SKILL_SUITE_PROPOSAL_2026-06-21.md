# Kontava Mission-Critical Workflow Assurance Skill Suite Proposal

Date: 2026-06-21

Source:

- `workflow efficiency/KONTAVA_MISSION_CRITICAL_WORKFLOW_RISK_REPORT_2026-06-21.md`

Purpose:

Turn the Kontava Mission-Critical Workflow Risk Report into an executable Codex skill suite that can guide implementation, verification, and rollout of end-to-end Workflow Assurance for AqStoqFlow/Kontava.

## Executive Recommendation

Build a composable suite, not one oversized skill.

The core Workflow Assurance foundations already exist or have active skill coverage:

- `kontava-workflow-assurance-orchestrator`
- `kontava-assurance-registry-foundation`
- `kontava-assurance-incident-spine`
- `kontava-assurance-routing-control-tower`
- `kontava-assurance-scheduler-release-gates`
- `kontava-ledger-event-assurance-checks`
- `kontava-domain-assurance-pack`
- `kontava-assurance-evidence-redaction`

The proposed suite should therefore do two things:

1. Create a mission-critical workflow assurance layer that composes the existing foundation skills.
2. Add one focused skill for each risk-report workflow so POS, offline POS, payments, purchasing/AP, supplier bank risk, inventory class 3, payroll, fiscal compliance, close trust, and ledger posting can be hardened independently.

All skills must preserve this doctrine:

- observe-mode first
- tenant-scoped
- ledger-aware
- evidence-backed
- source-hash/fingerprint based
- role-aware
- redacted by default
- direct action links
- test-gated before enforce-mode
- saved implementation report under `what-next/`

## Skill-Suite Map

| Order | Skill | Type | Dependency | Primary Outcome |
| --- | --- | --- | --- | --- |
| 1 | `kontava-workflow-risk-orchestrator` | Core orchestration | Existing assurance reports and current repo state | Chooses safe next slice and prevents enforce-mode shortcuts |
| 2 | `kontava-workflow-assurance-registry` | Core foundation | Existing registry foundation | Check definitions, versions, run contracts, persistence |
| 3 | `kontava-workflow-incident-control-plane` | Core foundation | Registry | Incidents, lifecycle, alert rows, waivers, audit history |
| 4 | `kontava-workflow-notification-routing` | Core routing/UI | Incident control plane | Notifications, Manager Action Center, Control Tower, dashboard tokens |
| 5 | `kontava-workflow-scheduler-release-gates` | Core operations | Registry, incidents, routing | Scheduler policy, release gates, stale-run controls |
| 6 | `kontava-ledger-posting-gateway-assurance` | Workflow | Registry, incidents | Ledger invariants and source-link truth |
| 7 | `kontava-payment-reconciliation-assurance` | Workflow | Ledger gateway | Provider ingestion, matching, suspense, signoff |
| 8 | `kontava-pos-sale-truth-assurance` | Workflow | Ledger, payments, fiscal, inventory | Sale/payment/receipt/stock/journal truth |
| 9 | `kontava-offline-pos-replay-assurance` | Workflow | POS sale truth | Device trust, hash chain, conflict quarantine, replay once |
| 10 | `kontava-purchasing-ap-assurance` | Workflow | Ledger, inventory, payments | PO/receipt/invoice/AP/ledger evidence chain |
| 11 | `kontava-supplier-bank-payment-risk-assurance` | Workflow | Purchasing/AP, payments, RBAC | Bank-change maker-checker and payment release blockers |
| 12 | `kontava-inventory-class3-assurance` | Workflow | Inventory kernel, ledger | Count/write-off/valuation/class 3 reconciliation |
| 13 | `kontava-payroll-statutory-assurance` | Workflow | Ledger, payments, country packs | Attendance, payroll posting, payments, declarations |
| 14 | `kontava-fiscal-compliance-outbox-assurance` | Workflow | Fiscal docs, compliance, ledger | Legal delivery, certification outbox, authority evidence |
| 15 | `kontava-close-trust-pack-assurance` | Workflow | All domain checks | Close readiness, trust pack, source-hash drift invalidation |

## Core Skills

### 1. `kontava-workflow-risk-orchestrator`

Purpose:
Sequence the full mission-critical workflow hardening program and select the next safe implementation slice.

When to use:
Use for broad Workflow Assurance requests, suite execution planning, risk-report follow-up, deciding next skill, or reviewing enforce-mode readiness.

Risk-report sections solved:
Executive Summary, Ranked Risk Register, Cross-Cutting Failure Precursors, Diagnosis Playbook, Foundational Hardening Roadmap.

Business problem eliminated:
Prevents scattered fixes that make one module look safe while the cross-workflow chain remains fragile.

Repo anchors to inspect:

- `workflow efficiency/KONTAVA_MISSION_CRITICAL_WORKFLOW_RISK_REPORT_2026-06-21.md`
- `workflow efficiency/KONTAVA_WORKFLOW_ASSURANCE_PREREQUISITES_REPORT_2026-06-21.md`
- `what-next/KONTAVA_*ASSURANCE*_RUN_REPORT_2026-06-21.md`
- `services/assurance/*`
- `actions/assurance/*`
- `components/assurance/*`
- `scripts/workflow-assurance-release-gate.js`

Expected outputs:
Phase classification, next skill recommendation, blocked/deferred phases, verification plan, and saved report under `what-next/`.

Acceptance criteria:
The orchestrator names exactly one next implementation slice, states prerequisites, lists deferred work, and refuses enforce-mode unless gates and live verification pass.

Dependencies:
Reads all other suite outputs.

Deferred:
No schema or app code unless explicitly asked to execute a selected slice.

### 2. `kontava-workflow-assurance-registry`

Purpose:
Maintain the check definition registry, deterministic result contract, versioning, and check-run persistence.

When to use:
Use when adding, updating, or auditing Workflow Assurance check definitions or run contracts.

Risk-report sections solved:
Foundational Hardening Roadmap and all workflow invariant definitions.

Business problem eliminated:
Stops assurance checks from becoming undocumented service logic with no history, owner, action route, or evidence contract.

Repo anchors to inspect:

- `prisma/schema.prisma` models `WorkflowAssuranceCheckDefinition` and `WorkflowAssuranceCheckRun`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `actions/assurance/workflow-assurance.actions.ts`
- `services/assurance/__tests__/assurance-registry*.test.ts`
- `scripts/workflow-assurance-release-gate.js`

Expected outputs:
Check definitions, typed results, source hash/fingerprint rules, run persistence, focused Jest, release-gate report.

Acceptance criteria:
Every check has key, version, owner, severity, execution mode, source tables, action route, required permission, tests, and observe-mode default.

Dependencies:
Can run after orchestrator. Required before all workflow-specific skills.

Deferred:
No alert fan-out or enforce-mode unless incident/routing/release gates are ready.

### 3. `kontava-workflow-incident-control-plane`

Purpose:
Create and manage durable incidents, status lifecycle, alert delivery rows, waivers, audit history, dedupe, reopen rules, and sensitive transition controls.

When to use:
Use when failed checks need actionable incident records, waiver handling, assignment, resolution, suppression, or audit proof.

Risk-report sections solved:
Cross-Cutting Failure Precursors, Diagnosis Playbook, Workflow-To-Notification Contract.

Business problem eliminated:
Stops anomalies from being hidden in separate exception queues with no shared lifecycle or manager ownership.

Repo anchors to inspect:

- `WorkflowAssuranceIncident`, `WorkflowAssuranceIncidentEvent`, `WorkflowAssuranceAlertDelivery`, `WorkflowAssuranceWaiver`
- `services/assurance/assurance-incident.service.ts`
- `actions/assurance/workflow-assurance-incident.actions.ts`
- `components/assurance/AssuranceIncidentActions.tsx`
- audit log and fresh-auth/RBAC helpers

Expected outputs:
Incident upsert/dedupe/reopen behavior, alert delivery history, waiver maker-checker controls, tests, saved run report.

Acceptance criteria:
Every incident can prove what failed, source hash, evidence grade, who saw it, who acted, what changed, and whether it was resolved, waived, suppressed, or reopened.

Dependencies:
Requires registry. Supports notification routing and all domain packs.

Deferred:
No automatic blocking until false-positive and false-negative fixtures pass.

### 4. `kontava-workflow-notification-routing`

Purpose:
Route incidents to the right role, Manager Action Center, Control Tower, and notification provider using dashboard color semantics.

When to use:
Use when turning incidents into manager-actionable workflows, adding direct links, improving notification text, or validating UI color semantics.

Risk-report sections solved:
Notification And Dialog Color Semantics Audit and Workflow-To-Notification Contract.

Business problem eliminated:
Prevents critical anomalies from becoming noisy, ambiguous, or visually disconnected alerts that managers ignore.

Repo anchors to inspect:

- `components/notifications/NotificationSystem.tsx`
- `components/notifications/NotificationProvider.tsx`
- `components/assurance/*`
- `services/manager-action-center/*`
- `components/manager-action-center/*`
- `components/finance/finance-dashboard-theme.ts`
- `app/globals.css`

Expected outputs:
Role-aware routing, safe notification copy, action links, Control Tower summaries, Manager Action Center items, dashboard token usage, tests, smoke report.

Acceptance criteria:
Severity leads color. Category refines icon only. Every alert has a safe message, owner role, proof/action link, and dedupe key.

Dependencies:
Requires incidents. Should run before manager pilot.

Deferred:
External channels such as SMS, email, WhatsApp, or webhooks until in-app delivery is proven.

### 5. `kontava-workflow-scheduler-release-gates`

Purpose:
Define scheduler modes, tenant cursors, stale-run detection, engine-health incidents, seeded failure fixtures, release gates, and enforce-mode readiness.

When to use:
Use when operationalizing checks beyond manual runs, adding scheduled scans, or preparing enforce-mode pilots.

Risk-report sections solved:
Foundational Hardening Roadmap and Acceptance Criteria For Future Implementation.

Business problem eliminated:
Prevents slow, stale, noisy, or untested assurance jobs from giving false confidence.

Repo anchors to inspect:

- `services/assurance/assurance-scheduler.service.ts`
- `services/assurance/assurance-scheduler-contracts.ts`
- `services/assurance/__tests__/assurance-scheduler.service.test.ts`
- `scripts/workflow-assurance-release-gate.js`
- `what-next/WORKFLOW_ASSURANCE_RELEASE_GATE_STATIC_REPORT_2026-06-21.md`

Expected outputs:
Scheduler plan, cursor rules, lease/backoff guidance, engine-health checks, release-gate output, tests, saved report.

Acceptance criteria:
Release gate blocks enforce-mode when checks lack owner, route, proof/source evidence, source hash, tests, or scheduler health.

Dependencies:
Requires registry, incidents, routing.

Deferred:
Fraud scoring and enforce-mode until seeded tests and live tenant-volume smoke pass.

## Mission-Critical Workflow Skills

### 6. `kontava-pos-sale-truth-assurance`

Purpose:
Assure every POS sale has aligned sale, payment, receipt, stock, fiscal, and ledger proof.

When to use:
Use for POS completion checks, sale finalization hardening, receipt proof, drawer/payment proof, stock movement proof, and journal source-link proof.

Risk-report section solved:
Section 1: POS Sale, Payment, Receipt, Stock, And Ledger Posting.

Business problem eliminated:
Prevents cash captured without receipt, stock moved without ledger, or revenue posted without payment truth.

Repo anchors:

- POS sale/refund/void services and actions
- `services/pos/*`
- drawer dashboard services
- fiscal document services
- inventory movement services
- ledger posting batches and source links
- `/dashboard/pos`
- POS tests and offline replay tests

Required behavior:
Observe-mode scheduled checks first. Synchronous guards only for duplicate tender, closed shift, missing terminal context, and obviously unsafe fiscal delivery.

Expected outputs:
Checks for completed sale payment, receipt delivery state, stock movement, posting batch, source link, and idempotency hash.

Acceptance criteria:
Every completed sale is classified as complete, pending explicit blocker, or incident with direct link to POS/source proof.

Dependencies:
Registry, incident control plane, ledger gateway, payment reconciliation, fiscal compliance, inventory class 3.

Deferred:
Full enforce-mode for sale completion until seeded partial-failure tests cover payment, receipt, stock, ledger, refund, and void paths.

### 7. `kontava-offline-pos-replay-assurance`

Purpose:
Assure offline POS envelopes are device-trusted, hash-chain valid, replayed exactly once, or quarantined with visible conflict proof.

When to use:
Use for offline device sync, sequence validation, conflict queues, replay adapters, provisional receipt blockers, and replay incident routing.

Risk-report section solved:
Section 2: Offline POS Sync And Replay.

Business problem eliminated:
Prevents duplicate sales, missing sales, broken branch cash, and untrusted device data.

Repo anchors:

- offline device/event/conflict models
- `services/pos/offline-sync.service.ts`
- offline replay services
- POS sync actions and tests
- accountant data-trust blockers
- `/dashboard/pos`

Required behavior:
Replay must pass through normal POS sale finalization; no direct ledger, stock, drawer, payment, or fiscal mutation from offline sync.

Expected outputs:
Hash-chain checks, sequence-gap checks, duplicate replay checks, pending replay SLA checks, conflict incident links.

Acceptance criteria:
Each offline envelope is accepted, replayed exactly once, pending with SLA, or quarantined as an incident.

Dependencies:
POS sale truth, incident control plane, scheduler.

Deferred:
Automatic replay enforce-mode until device conflict fixtures and replay idempotency tests pass.

### 8. `kontava-payment-reconciliation-assurance`

Purpose:
Assure provider ingestion, statement import, matching, suspense, exceptions, and signoff remain explainable.

When to use:
Use for payment provider reliability, unmatched funds, suspense aging, reconciliation certificate drift, and signed reconciliation checks.

Risk-report section solved:
Section 3: Payment Ingestion, Reconciliation, Suspense, And Signoff.

Business problem eliminated:
Prevents bank/mobile-money truth from diverging from ledger, customer balances, and supplier balances.

Repo anchors:

- provider events
- statement imports
- reconciliation runs
- suspense and exception models
- `services/reconciliation/*`
- `services/payments/*`
- `/dashboard/finance/reconciliation`

Required behavior:
Every cash movement must be matched, suspended, excepted, or signed. Unresolved stale amounts become incidents.

Expected outputs:
Checks for unmatched provider events, suspense owner, exception SLA, unsigned reconciliation, provider drift, certificate stale hash.

Acceptance criteria:
Finance managers can open one route and explain each cash movement state with evidence grade.

Dependencies:
Ledger gateway, incident control plane, notification routing.

Deferred:
Provider rail scoring until ingestion and signoff checks are stable.

### 9. `kontava-purchasing-ap-assurance`

Purpose:
Assure PO approval, receiving, supplier invoice, stock update, AP balance, and ledger posting form one evidence chain.

When to use:
Use for PO/GRN/invoice matching, AP posting failures, duplicate invoices, over-receipts, and payment allocation proof.

Risk-report section solved:
Section 4: Purchasing, Receiving, Supplier Invoice, And AP Posting.

Business problem eliminated:
Prevents unreliable inventory value, supplier debt, and expense recognition.

Repo anchors:

- purchasing/AP services
- PO workflow actions
- supplier invoice/payment models
- inventory receiving
- ledger posting batches
- `/dashboard/finance/payables`
- `/dashboard/purchases/*`

Required behavior:
Observe-mode checks for chain completeness, duplicate supplier reference, receipt/invoice mismatch, AP posting state, and source links.

Expected outputs:
3-way match assurance, AP ledger proof, duplicate invoice incident, partial/over-receipt blockers.

Acceptance criteria:
Every AP obligation is traceable from PO to receipt to invoice to AP balance to ledger proof.

Dependencies:
Ledger gateway, inventory class 3, supplier bank payment risk.

Deferred:
Strict 3-way match enforce-mode until line-level tolerances and country/accounting policy are configured.

### 10. `kontava-supplier-bank-payment-risk-assurance`

Purpose:
Assure supplier bank changes and payment releases cannot bypass evidence, maker-checker, role boundaries, or fraud-risk controls.

When to use:
Use for supplier bank approvals, payment release blockers, same-actor detection, suspicious amount checks, and recent bank-change risk.

Risk-report section solved:
Section 5: Supplier Bank Change And Supplier Payment Release.

Business problem eliminated:
Prevents fraud, misdirected payments, and reputational loss.

Repo anchors:

- supplier bank change models
- supplier payment release services
- AP controls
- RBAC and fresh-auth helpers
- audit logs
- payment transactions
- `/dashboard/purchases/suppliers`
- `/dashboard/finance/payables`

Required behavior:
Payment release checks should be candidates for early enforce-mode after seeded tests pass because blocking risky payment is safer than allowing it.

Expected outputs:
Checks for pending bank change, same-actor release, missing evidence, unusual amount, over-allocation, missing payment transaction, missing ledger/recon link.

Acceptance criteria:
No supplier payment can be released to unresolved bank evidence without a visible incident or approved waiver.

Dependencies:
Purchasing/AP, incident control plane, RBAC/fresh-auth.

Deferred:
Advanced supplier dependency/fraud scoring until base bank and payment proof gates pass.

### 11. `kontava-inventory-class3-assurance`

Purpose:
Assure stock counts, adjustments, write-offs, valuation movements, and class 3 ledger reconciliation remain aligned.

When to use:
Use for stock projection drift, high-risk write-offs, class 3 reconciliation, stale counts, valuation movement proof, and close blockers.

Risk-report section solved:
Section 6: Inventory Count, Adjustment, Write-Off, And Class 3 Reconciliation.

Business problem eliminated:
Prevents stock value, gross margin, and OHADA inventory balances from becoming fiction.

Repo anchors:

- inventory adjustment/count/write-off services
- stock movements and projections
- valuation services
- class 3 ledger accounts
- inventory dashboards
- `/dashboard/inventory/movements`
- close assurance services

Required behavior:
Scheduled and pre-close checks for movement evidence, projection drift, write-off maker-checker, valuation movement, and ledger variance.

Expected outputs:
Class 3 reconciliation check, stale count warning, high-risk write-off incident, valuation movement proof.

Acceptance criteria:
Inventory quantity and value are both explainable or explicitly blocked before close.

Dependencies:
Ledger gateway, close trust pack, POS/purchasing integrations.

Deferred:
Strict close blocking until class 3 mapping rules and seeded reconciliation fixtures are complete.

### 12. `kontava-payroll-statutory-assurance`

Purpose:
Assure attendance freeze, payroll calculation, posting, payment evidence, and declarations remain compliant and reconciled.

When to use:
Use for payroll run approval, posting failures, payment release proof, statutory declaration readiness, and country-pack drift.

Risk-report section solved:
Section 7: Payroll Attendance, Run Posting, Payments, And Declarations.

Business problem eliminated:
Prevents employee trust failures, statutory payroll exposure, and inaccurate cash planning.

Repo anchors:

- payroll run/payment/declaration models
- payroll control service
- attendance/presence models
- ledger posting batches
- payment reconciliation links
- country packs
- `/dashboard/payroll`

Required behavior:
Checks must protect salary/person data through redaction and role boundaries.

Expected outputs:
Frozen attendance hash check, payroll run idempotency check, posting proof, payment evidence, declaration due-date assurance, country-pack provenance drift warning.

Acceptance criteria:
Payroll manager and accountant can explain payroll state without exposing protected salary/payment details to unauthorized roles.

Dependencies:
Ledger gateway, payment reconciliation, evidence redaction, country-pack/compliance.

Deferred:
Enforce-mode for declarations until local statutory rules and country-pack expert review are complete.

### 13. `kontava-fiscal-compliance-outbox-assurance`

Purpose:
Assure fiscal documents are created, certified/queued/rejected correctly, legal delivery is gated, and authority evidence is retained.

When to use:
Use for fiscal document certification, compliance submission outbox, legal receipt delivery, authority outage differentiation, and country-pack readiness.

Risk-report section solved:
Section 8: Fiscal Document Creation And Compliance Certification Outbox.

Business problem eliminated:
Prevents unsafe legal receipt/invoice delivery and unverifiable statutory compliance.

Repo anchors:

- fiscal document models
- compliance submissions
- compliance services
- country-pack metadata
- evidence records
- outbox
- `/dashboard/compliance`

Required behavior:
Separate internal validation failure from retryable authority outage, and avoid corrupting posted ledger truth.

Expected outputs:
Checks for missing fiscal document, uncertified legal delivery, stuck outbox, authority rejection, missing final hash, stale country-pack provenance.

Acceptance criteria:
Every legal document is certified, safely queued, rejected with evidence, or blocked with a manager-visible incident.

Dependencies:
Ledger gateway, POS sale truth, notification routing, close trust pack.

Deferred:
Statutory production claims until country-pack expert validation and provider integration are complete.

### 14. `kontava-close-trust-pack-assurance`

Purpose:
Assure close readiness, accountant trust pack, certified exports, and source-hash drift invalidation remain reliable.

When to use:
Use for month-end readiness, close blockers, stale evidence, certified pack invalidation, accountant handoff, and BI trust downgrades.

Risk-report section solved:
Section 9: Close Assurance, Accountant Trust Pack, And Stale Evidence Invalidation.

Business problem eliminated:
Prevents month-end confidence collapse and stale certified reports.

Repo anchors:

- close assurance services
- close pack certification
- accountant portal/trust pack
- evidence graph
- snapshot services
- BI blockers
- `/dashboard/accounting/close`

Required behavior:
Close certification must depend on unresolved incidents and source hashes. Certification must become stale if source evidence changes.

Expected outputs:
Checks for unresolved blockers, missing evidence graph, stale certified pack, changed annex hash, unsigned/reopened incidents, BI trust downgrade.

Acceptance criteria:
Close pack can only be treated as trusted when source evidence and domain incidents support it.

Dependencies:
All domain workflow skills, evidence redaction, scheduler.

Deferred:
Enforce-mode close block until every high-risk workflow has seeded violation tests.

### 15. `kontava-ledger-posting-gateway-assurance`

Purpose:
Assure accounting posting gateway, journal source links, period guards, balanced entries, posting batches, reversals, and ledger invariants.

When to use:
Use for ledger source-link gaps, unbalanced journals, posting failures, closed-period posting attempts, source mismatch, and reversal proof.

Risk-report section solved:
Section 10: Accounting Posting Gateway, Journal Source Links, And Ledger Invariants.

Business problem eliminated:
Prevents every BI and management number from becoming questionable.

Repo anchors:

- `LedgerPostingBatch`
- `JournalEntry`
- `JournalEntryLine`
- `AccountingSourceLink`
- accounting posting services
- reconciliation services
- audit logs
- `/dashboard/accounting/journals`
- `/dashboard/accounting/control-center`

Required behavior:
Ledger invariants should have the clearest path to enforce-mode, but only after source-link, posting failure, closed-period, and reversal tests pass.

Expected outputs:
Checks for balanced journals, source links, posting batch journal entry, closed-period guard, failed posting visibility, source hash mismatch, reversal evidence.

Acceptance criteria:
Every financial mutation is balanced, source-linked, period-valid, auditable, and visible when failed.

Dependencies:
Registry, incident control plane, notification routing.

Deferred:
Broad blocking of all posting flows until legacy bypasses and service-boundary gates are clean.

## Phased Rollout Plan

### Phase 0: Readiness And Risk Mapping

Install or update the orchestrator. Map report sections to current Prisma models, services, actions, dashboards, tests, incidents, and release gates.

Deliverables:

- risk-to-skill map
- current coverage report
- list of existing checks and missing checks
- enforce-mode blocker list

### Phase 1: Registry And Check-Run Foundation

Use or update `kontava-workflow-assurance-registry`.

Deliverables:

- complete check catalog
- deterministic result contract
- versioning rules
- source-hash/fingerprint standards
- check-run persistence tests

### Phase 2: Incidents, Alerts, Waivers, Manager Action Center

Use or update incident and notification routing skills.

Deliverables:

- incident lifecycle
- assignment/resolution/suppression/waiver/reopen flow
- in-app alert delivery
- Manager Action Center adapter
- Control Tower action links
- notification color semantics

### Phase 3: Workflow-Specific Invariant Packs

Run workflow skills in dependency order:

1. ledger
2. payments
3. POS
4. offline POS
5. purchasing/AP
6. supplier bank risk
7. inventory class 3
8. payroll
9. fiscal compliance
10. close trust pack

Deliverables:

- at least one quick-win check per workflow
- at least one blocking-grade invariant per workflow
- at least one pre-close or BI trust gate per workflow
- direct action routes
- seeded violation tests

### Phase 4: Control Tower, Proof Trails, BI Trust Gates

Unify incidents into manager-grade surfaces.

Deliverables:

- Control Tower summaries
- incident detail proof
- evidence redaction
- BI trust downgrade for affected KPIs
- close readiness bridge

### Phase 5: Scheduler Hardening, Seeded Failure Tests, Release Gates, Enforce-Mode Pilots

Operationalize.

Deliverables:

- tenant cursors
- stale-run incidents
- retry/backoff
- seeded false-positive and false-negative fixtures
- release gates
- narrow enforce-mode pilots

## Recommended Installation Order

1. `kontava-workflow-risk-orchestrator`
2. `kontava-workflow-assurance-registry`
3. `kontava-workflow-incident-control-plane`
4. `kontava-workflow-notification-routing`
5. `kontava-workflow-scheduler-release-gates`
6. `kontava-ledger-posting-gateway-assurance`
7. `kontava-payment-reconciliation-assurance`
8. `kontava-pos-sale-truth-assurance`
9. `kontava-offline-pos-replay-assurance`
10. `kontava-purchasing-ap-assurance`
11. `kontava-supplier-bank-payment-risk-assurance`
12. `kontava-inventory-class3-assurance`
13. `kontava-payroll-statutory-assurance`
14. `kontava-fiscal-compliance-outbox-assurance`
15. `kontava-close-trust-pack-assurance`

## Recommended Execution Order

1. Run the orchestrator.
2. Verify registry, incident, notification, and scheduler foundations against the current repo.
3. Run ledger and payment skills first because they support nearly every other workflow.
4. Run POS and offline POS.
5. Run purchasing/AP and supplier bank risk.
6. Run inventory class 3.
7. Run payroll and fiscal compliance.
8. Run close trust pack last because it aggregates evidence from all workflows.
9. Re-run scheduler/release gates.
10. Pilot enforce-mode only for narrow, proven synchronous guards.

## Exact First Three Skills To Run

1. `kontava-workflow-risk-orchestrator`
2. `kontava-ledger-posting-gateway-assurance`
3. `kontava-payment-reconciliation-assurance`

Reason:
The registry, incident, routing, and scheduler foundations already exist in the current codebase. The next value comes from deepening the domain packs, starting with ledger and payments because they determine whether managers can trust cash and financial truth.

## Enforce-Mode Blockers That Must Never Be Bypassed

Do not enable enforce-mode unless all are true:

- check definition is versioned
- check run is persisted
- incident creation is durable and tenant-scoped
- alert delivery is deduped by fingerprint and source hash
- action route exists
- proof/source evidence exists
- redaction is server-side
- owner role and required permission are defined
- waiver has reason, expiry, fresh auth, and maker-checker where sensitive
- scheduler failure is visible
- seeded false-positive and false-negative tests pass
- browser smoke passes for Control Tower and Manager Action Center
- release gate reports zero blockers

## How This Suite Solves The Problem Entirely

The risk report shows that Kontava's most dangerous failures are partial workflow completions: cash without receipt, stock without ledger, supplier payment without bank approval, payroll without payment proof, compliance without certification, or close packs with stale evidence.

This suite solves that full problem by converting each risk into a machine-checkable invariant, each failed invariant into a durable incident, each incident into a role-routed action, and each resolution into audit/evidence history.

The result is not a dashboard-only product. It becomes an operating assurance layer:

- workflows prove their outcomes
- managers see what needs action
- accountants see evidence and blockers
- support can reconstruct what happened
- BI surfaces can downgrade trust when proof is missing
- close readiness can rely on source hashes and incident state
- enforce-mode can be introduced only where the system has earned it

That is the path from generic SMB software to an enterprise-grade, OHADA-friendly, manager-ready, hard-to-replace operating reference.
