# Kontava Workflow Assurance Prerequisites Report

Date: 2026-06-21
Scope: Architectural, structural, data, workflow, security, operational, UI, testing, and release prerequisites required before installing the Kontava Workflow Assurance Engine.
Source prompts and reports:
- `workflow efficiency/KONTAVA_WORKFLOW_ASSURANCE_ENGINE_PROMPT_2026-06-21.md`
- `workflow efficiency/KONTAVA_WORKFLOW_ASSURANCE_PREREQUISITES_PROMPT_2026-06-21.md`
- `security/KONTAVA_MISSION_CRITICAL_WORKFLOW_RISK_REPORT_2026-06-21.md`

## Executive Verdict

Kontava is ready for a Workflow Assurance Engine as a structured platform initiative, but not as a single thin dashboard. The codebase already has many of the hard foundations: business events, outbox records, ledger posting batches, accounting source links, fiscal documents, compliance submissions, payment exceptions, suspense items, close findings, audit logs, evidence-grade contracts, proof trails, snapshots, business signals, Manager Action Center, Owner War Room, RBAC protection, fresh-auth controls, and dashboard semantic tokens.

The main missing prerequisite is a durable assurance spine: persistent check definitions, check runs, normalized incidents, incident event history, alert delivery history, ownership/escalation, waivers, reopen rules, and release gates. Today, several domains can detect blockers, but those blockers live in separate concepts: payment exceptions, suspense items, close findings, snapshot blockers, notification queues, and in-memory/service-level business signals. The assurance engine should normalize these into one auditable control layer without weakening the existing domain-owned workflows.

The recommended installation strategy is:

1. Do not replace domain controls.
2. Add a central assurance registry and incident model.
3. Let domain services remain the source of business truth.
4. Let assurance checks read evidence, ledger, business events, snapshots, and exceptions.
5. Create incidents only when an invariant is broken or a domain blocker needs cross-workflow visibility.
6. Route incidents through Manager Action Center and Control Tower with evidence-grade drill-through.

## Language Locked

- Workflow Assurance Engine: the server-side system that registers invariant checks, executes them, records check runs, creates or updates incidents, and exposes auditable anomaly state.
- Assurance Check: a versioned rule that verifies one invariant such as "posted journal has source link" or "supplier payment is blocked while bank change is pending".
- Incident: a durable, tenant-scoped anomaly record created from a failed check or domain blocker. It has severity, owner, source workflow, evidence links, status, audit history, and action route.
- Control Tower: the admin/manager surface for open incidents, assurance health, check run status, escalations, and workflow drill-through.
- Evidence Grade: the existing Kontava language of `raw`, `operational`, `posted`, `reconciled`, `certified`, and `blocked`.

## Current Codebase Anchors

The following foundations already exist or are strongly represented:

| Area | Existing Anchor | Readiness |
| --- | --- | --- |
| Business events and outbox | `BusinessEvent`, `BusinessEventOutbox`, `recordBusinessEventInTx`, payload hashes, idempotency conflict handling | Strong foundation |
| Ledger truth | `LedgerPostingBatch`, `JournalEntry`, `JournalEntryLine`, `AccountingSourceLink`, posting rules, reconciliation services | Strong foundation |
| Domain blockers | `PaymentException`, `SuspenseItem`, `CloseAssuranceFinding`, stock reconciliation blockers, compliance retry/rejection states | Strong but fragmented |
| Evidence language | `services/evidence/evidence-contracts.ts`, `evidence-grade.service.ts`, `ProofTrailDrawer`, `EvidenceGradeBadge` | Strong foundation |
| BI trust contracts | `services/bi/bi-contracts.ts`, `bi-evidence-adapter.service.ts`, BI blockers/redactions/action links | Strong foundation |
| Snapshots | tenant, branch, payment truth, inventory cash, close readiness snapshots and rebuild bundle | Strong foundation |
| Business signals/action queue | `BusinessSignal` contracts, action queue builder, notification preferences, Manager Action Center | Partial because not durable incident storage |
| Manager/admin surface | Manager Action Center and Owner War Room services/actions/components | Strong entry point |
| RBAC/fresh auth | `protect`, `requirePermission`, `freshAuth`, permission risk catalog, tenant guard tests | Strong foundation |
| Notification semantics | Dashboard `--dash-*` tokens exist; finance pages use them | Partial because shared notification popups/dialog defaults still need alignment |
| Background work | Compliance submission leasing and processing exists | Partial because there is no general assurance job runner/check scheduler |
| Release gates | Moat release gate scripts and ADRs exist | Partial because assurance-specific gates are not yet defined |

Graph context: `graphify-out/GRAPH_REPORT.md` identifies payment reconciliation, POS, RBAC, accounting control, and what-next architecture artifacts as cross-community areas. That supports treating assurance as a cross-boundary control plane rather than a feature inside one module.

## Installation Spine

The assurance engine should be installed as a server-side module with these boundaries:

- State: durable check definitions, check runs, incidents, incident events, alert deliveries, waivers, and escalation state in Prisma.
- Data model: incidents link to organization, workflow, source module, source type/id, evidence grade, source hash, business event, posting batch, journal entry, payment exception, suspense item, close finding, fiscal document, or snapshot blocker.
- Contract: every check returns deterministic output: pass, warn, fail, blocked, skipped, or error; evidence links; severity; recommended action; source hash; idempotency key.
- Trust boundary: only server-side services create incidents. Users can assign, acknowledge, resolve, waive, or reopen through guarded server actions.
- Sync model: synchronous checks for invariants that must block mutation; after-commit validators for event/outbox/posting completeness; scheduled scans for aging/drift; pre-close checks for certification; snapshot checks for BI surfaces.
- Failure handling: assurance engine failure must be visible as its own incident, never silently interpreted as "all clear".

## Prerequisite Matrix

| ID | Prerequisite | Status Today | Complexity | Dependency Order | Category |
| --- | --- | --- | --- | --- | --- |
| P0 | Canonical assurance vocabulary and rule registry | Missing | Medium | First | Strategic foundation |
| P1 | Durable incident/anomaly model | Missing | Medium-high | First | Strategic foundation |
| P2 | Check run and result persistence | Missing | Medium | First | Strategic foundation |
| P3 | Evidence-link normalization | Partial | Medium | Before incident UI | Medium-depth |
| P4 | Alert routing and escalation model | Partial | Medium | After incident model | Medium-depth |
| P5 | Domain check modules for 10 workflows | Partial | High | After registry/model | Strategic foundation |
| P6 | Scheduler/worker and event-driven validators | Partial | High | After P0-P2 | Strategic foundation |
| P7 | Manager Action Center and Control Tower integration | Partial | Medium | After P1-P4 | Medium-depth |
| P8 | Security, RBAC, fresh-auth, redaction, waiver controls | Partial | Medium-high | Cross-cutting | Strategic foundation |
| P9 | Performance/index/read-model plan | Partial | Medium | Before broad rollout | Medium-depth |
| P10 | Test/release gates for false positives/negatives | Partial | Medium | Before enforce mode | Strategic foundation |

## 1. Workflow Assurance Architecture

What must be built or verified:
- A `WorkflowAssuranceCheck` registry that defines check id, version, workflow, module, invariant, severity default, execution mode, required permissions, source tables, and action route.
- Domain check modules under a clear service boundary, for example `services/assurance/checks/pos.ts`, `payments.ts`, `inventory.ts`, `payroll.ts`, `compliance.ts`, `close.ts`, `ledger.ts`.
- A deterministic result contract:
  - `passed`
  - `warning`
  - `failed`
  - `blocked`
  - `skipped`
  - `error`
- Execution modes:
  - synchronous guard
  - after-commit validator
  - scheduled scan
  - pre-close/pre-certification gate
  - snapshot/BI generation guard
- A single incident upsert strategy using `organizationId + checkId + sourceType + sourceId + fingerprint`.

Why required:
- Without a registry, rules will be scattered across dashboards, services, and reports.
- Without deterministic results, the engine will create alert fatigue and conflicting interpretations.
- Without execution modes, expensive checks may run in hot paths or blocking checks may run too late.

Existing connections:
- `services/events/business-event.service.ts`
- `services/accounting/reconciliations.service.ts`
- `services/evidence/evidence-grade.service.ts`
- `services/snapshots/*`
- `services/signals/*`
- `actions/snapshots/snapshot.actions.ts`
- `actions/manager-action-center/manager-action-center.actions.ts`

What happens if missing:
- Anomalies remain hidden in module-specific views.
- BI surfaces may show operational data as trusted.
- Managers get notifications without proof or action path.

Acceptance criteria:
- Every critical workflow invariant has a registered check id and owner.
- Every check returns a typed result with evidence links and severity.
- Re-running the same check with the same source state is idempotent.
- Check results can be queried by tenant, workflow, severity, status, and source id.

## 2. Data Model Foundations

What must be built:

Recommended Prisma models:

```text
WorkflowAssuranceCheckDefinition
- id
- checkKey
- version
- workflow
- moduleSlug
- invariantName
- executionMode
- defaultSeverity
- requiredPermission
- ownerRole
- enabled
- enforceMode
- metadata
- createdAt
- updatedAt

WorkflowAssuranceCheckRun
- id
- organizationId
- checkDefinitionId
- runType
- status
- startedAt
- completedAt
- sourceType
- sourceId
- sourceHash
- periodId
- locationId
- actorId
- scannedCount
- passedCount
- warningCount
- failedCount
- blockedCount
- errorCount
- durationMs
- metadata

WorkflowAssuranceIncident
- id
- organizationId
- checkDefinitionId
- workflow
- moduleSlug
- sourceType
- sourceId
- incidentFingerprint
- title
- detail
- severity
- status
- evidenceGrade
- sourceHash
- businessEventId
- postingBatchId
- journalEntryId
- paymentExceptionId
- suspenseItemId
- closeFindingId
- fiscalDocumentId
- complianceSubmissionId
- stockAdjustmentId
- payrollRunId
- supplierPaymentId
- assignedRole
- ownerId
- dueAt
- firstDetectedAt
- lastDetectedAt
- resolvedAt
- reopenedAt
- suppressedUntil
- actionHref
- metadata

WorkflowAssuranceIncidentEvent
- id
- organizationId
- incidentId
- eventType
- actorId
- fromStatus
- toStatus
- reason
- evidenceHash
- metadata
- createdAt

WorkflowAssuranceAlertDelivery
- id
- organizationId
- incidentId
- channel
- recipientUserId
- recipientRole
- status
- sentAt
- acknowledgedAt
- deliveryError
- metadata

WorkflowAssuranceWaiver
- id
- organizationId
- incidentId
- requestedById
- approvedById
- reason
- expiresAt
- status
- createdAt
- approvedAt
```

Why required:
- Existing payment exceptions, suspense items, and close findings are domain-specific. Assurance needs one cross-domain incident contract.
- Check-run history is necessary to prove that the engine ran and to diagnose engine outages.
- Alert delivery history is necessary to prove who was notified and when.

Existing connections:
- `PaymentException`, `SuspenseItem`, `CloseAssuranceFinding`, `BusinessEvent`, `LedgerPostingBatch`, `AccountingSourceLink`, `FiscalDocument`, `ComplianceSubmission`, `ComplianceEvidence`, `AuditLog`.
- Business signal/action queue contracts can be downstream readers of assurance incidents.

What happens if missing:
- The system can detect anomalies but cannot prove detection, assignment, acknowledgement, or resolution.
- The Manager Action Center remains a composed read model, not a durable control history.

Complexity:
- Medium-high because schema migration, seed/backfill, and route/action integration are required.

Acceptance criteria:
- Incidents are tenant scoped and indexed by `organizationId`, status, severity, workflow, owner, dueAt, and source.
- Duplicate check results update the existing incident instead of creating noise.
- Resolved incidents reopen when the same invariant fails against a newer source hash.
- Waivers require reason, expiry, fresh auth for high-risk cases, and maker-checker for compliance-critical incidents.

## 3. Business Event And Ledger Foundations

What must be verified:
- Every economic workflow emits or links to a typed business event.
- Every event has idempotency key and payload hash.
- Every final economic state has ledger posting evidence or a visible blocker.
- Every posted journal has a source link.
- Every source document has a hash.
- Period state gates posting and finalization.

Existing strengths:
- `BusinessEvent` and `BusinessEventOutbox` exist with idempotency and payload hash.
- `recordBusinessEventInTx` rejects same key with different payload hash.
- `LedgerPostingBatch`, `JournalEntry`, `JournalEntryLine`, and `AccountingSourceLink` exist.
- Business event service and tests cover duplicate replay behavior.

Prerequisite work:
- Define assurance checks over the existing event/ledger spine:
  - business event recorded but not applied
  - business event applied but missing posting batch when expected
  - posting batch posted but missing journal entry
  - posted journal missing source link
  - failed posting batch not assigned to a manager
  - final document missing document hash
  - outbox message stuck beyond SLA

Why required:
- The engine must not rely on operational tables alone for financial truth.
- OHADA/SYSCOHADA readiness requires balanced double entry, supporting evidence, immutability, and audit trace.

What happens if missing:
- Assurance may certify dashboards that are operationally complete but ledger-incomplete.
- False confidence is worse than no alert.

Acceptance criteria:
- Ledger invariant check returns zero critical failures on seeded clean data.
- Seeded orphan posting batch, orphan journal, missing source link, and closed-period posting attempts create incidents.
- Financial BI snapshots downgrade to `blocked` when ledger checks fail.

## 4. Evidence And Proof Foundations

What must be built or verified:
- Evidence-grade decisions remain server-controlled.
- Proof trail subjects cover the assurance incident sources.
- Incident evidence links normalize to existing proof trail nodes.
- Redaction rules apply before incident details reach UI or notifications.
- Every incident carries evidence grade and proof link.

Existing strengths:
- Evidence grades are already defined as `raw`, `operational`, `posted`, `reconciled`, `certified`, and `blocked`.
- Proof trail contracts include blockers, redactions, next actions, source modules, freshness, and audit hints.
- BI evidence adapter already maps snapshots/signals into trust-rich KPI contracts.

Prerequisite work:
- Add `workflow.assurance.incident` as a proof-trail subject type or map incidents to their underlying source subject.
- Expand evidence-grade service to classify incidents:
  - `blocked` when the incident blocks trust.
  - `operational` when anomaly is a non-financial workflow warning.
  - `posted`, `reconciled`, or `certified` only when the incident is resolved with server-side proof.
- Require source hash on incident creation.
- Add stale-evidence reopening rules.

What happens if missing:
- Incidents can become detached from proof.
- Users may see a scary alert without understanding what evidence failed.
- Sensitive details can leak in alerts.

Acceptance criteria:
- Each incident can open a proof trail or source workflow detail.
- Sensitive payloads, provider account identifiers, supplier bank data, payroll destination data, and raw authority payloads are redacted by default.
- Evidence grade is never client-submitted.

## 5. Workflow Coverage Prerequisites

The assurance engine must start with checks that validate the 10 mission-critical workflows.

| Workflow | Must Verify | Existing Anchors | Missing/Weak Prerequisite |
| --- | --- | --- | --- |
| POS sale/payment/receipt/stock/ledger | Sale has payment, stock movement, fiscal/receipt status, posting batch, source link, business event | POS services, receipt service, posting services, finance dashboards | Unified POS assurance checks and incident upsert |
| Offline POS replay | Device event sequence/hash, replay status, duplicate protection, conflict visibility | Offline sync service, device/event/conflict models | Scheduled stale replay/conflict incident generator |
| Payment reconciliation | Provider events, statement lines, matches, suspense, exceptions, signed runs | Reconciliation services/actions, exceptions, suspense | Cross-domain incident mapping and alert escalation |
| Purchasing/AP | PO approval, receipt, stock, invoice duplicate, 3-way match, AP posting | PO service, AP control service, supplier invoices/payments | Unified AP assurance dashboard and cross-workflow incidents |
| Supplier bank/payment | Pending bank change blocks release, SoD, destination hash, payment allocation | Supplier bank models, payment release controls | Fraud scoring and payment-risk incident normalization |
| Inventory count/write-off/class 3 | Frozen snapshot, evidence, adjustment posting, projection drift, class 3 reconciliation | Stock count/adjustment/reconciliation services | Class 3 drift incident mapped to close and BI |
| Payroll | Frozen attendance, run posting, payslip emission, payment release, declarations | Payroll control service, payment batches, declarations | Payroll assurance incidents and role-sensitive redaction |
| Fiscal compliance | Posted source, fiscal document, submission, retries/rejections, evidence | Fiscal docs, compliance submissions/evidence, outbox | Compliance queue SLA and certification incident model |
| Close assurance | Findings, checklist, pack export, certification, stale evidence | Close services, close findings/evidence/pack exports | Assurance-to-close blocker bridge |
| Accounting gateway | Balanced journal, source link, period guard, posting batch state | Ledger models and reconciliation service | Global ledger invariant monitor |

Acceptance criteria:
- Each workflow has at least one quick-win check, one blocking invariant, and one pre-close gate.
- Each check has direct route/action link.
- Each check has owner role and required permission.

## 6. Alerting And Notification Foundations

What must be built or verified:
- Severity taxonomy aligned to assurance results:
  - `info`: queued, imported, generated, monitoring.
  - `warning`: aging, pending evidence, moderate variance, stale snapshot.
  - `high`: failed posting, unresolved exception, significant variance, SoD risk.
  - `blocking`: cannot trust workflow outcome until resolved.
  - `compliance-critical`: fiscal/close/statutory claim unsafe.
- Role routing:
  - cashier for POS operational corrections.
  - branch manager for drawer/offline/location incidents.
  - finance manager for reconciliation, suspense, cash, receivables, payables.
  - inventory manager for counts, adjustments, valuation, stock drift.
  - payroll lead for payroll and declaration incidents.
  - accountant for ledger, close, tax, certification.
  - admin/support for engine failures, stuck jobs, integration outages.
- Direct action links in every alert.
- Quiet hours/digest rules for low severity.
- Immediate delivery for critical, compliance-critical, fraud, and engine outage incidents.

Existing strengths:
- `NotificationProvider` centralizes notification methods.
- Business signal notification preferences exist.
- Dashboard semantic tokens exist.
- Finance pages already use token-based severity classes.

Prerequisite gap:
- Notification popups still use independent gradients instead of dashboard `--dash-*` semantics.
- Notification queue is currently session/browser oriented in the settings surface; assurance needs durable delivery history.

Required color semantics:
- success = `--dash-success`
- warning = `--dash-gold`
- danger/blocking = `--dash-danger`
- info/queued = `--dash-info`
- primary proof/action = `--dash-brand`

Acceptance criteria:
- Every incident alert records delivery status.
- Alert dedupe prevents repeated noise for unchanged source hash.
- Critical incidents bypass digest and route to configured admins/managers.
- UI popups and dialogs use dashboard semantic tokens.

## 7. Security, Permissions, And Governance

What must be built or verified:
- New permissions:
  - `assurance.incidents.read`
  - `assurance.incidents.assign`
  - `assurance.incidents.resolve`
  - `assurance.incidents.waive`
  - `assurance.incidents.admin`
  - `assurance.checks.run`
  - `assurance.checks.configure`
  - `assurance.control_tower.read`
- Fresh auth for:
  - waiving blocking/compliance-critical incident
  - suppressing repeated incident
  - changing check enforcement mode
  - resolving incident tied to payment, supplier bank, payroll, close, or fiscal document.
- Maker-checker for:
  - waiver approval
  - compliance-critical suppression
  - closing fraud-risk incident when the actor caused the underlying workflow.
- Tenant isolation for every incident/check run query.
- Redaction by role for payroll, supplier bank, provider account, raw authority payload, and sensitive audit metadata.
- Admin/support boundary so support can inspect metadata without seeing unnecessary sensitive payloads.

Existing strengths:
- `protect` supports permission checks, tenant guard, audit resource, and fresh auth.
- RBAC permission risk mapping exists.
- Sensitive action service exists.
- Redaction ADR and proof trail redactions exist.

What happens if missing:
- Assurance becomes a privileged cross-module data leak.
- Admin wildcard could suppress or waive business truth without dual control.
- Users may resolve incidents they caused.

Acceptance criteria:
- Tests prove caller-supplied `organizationId` cannot read another tenant's incidents.
- Tests prove support/admin cannot bypass redaction or module entitlement.
- Tests prove same actor cannot request and approve waiver for sensitive incidents.

## 8. Performance And Scalability Prerequisites

What must be built:
- Check scheduling policy by domain:
  - hot checks: synchronous or immediate after-commit.
  - frequent checks: every 5-15 minutes for stuck outbox, failed postings, suspense.
  - daily checks: aging, supplier bank/payment risk, inventory drift, payroll readiness.
  - monthly/pre-close checks: close pack, fiscal period, class 3, certified exports.
- Incremental validation using source `updatedAt`, event id, source hash, and check cursor.
- Indexes for incidents:
  - `organizationId, status, severity, detectedAt`
  - `organizationId, workflow, status`
  - `organizationId, ownerId, status, dueAt`
  - `organizationId, sourceType, sourceId`
  - `organizationId, checkDefinitionId, sourceHash`
- Read models for Control Tower summary.
- Engine health metrics:
  - last run by check
  - failed checks
  - stale checks
  - incident creation rate
  - false positive count
  - notification delivery failures.

Existing strengths:
- Snapshot services already use source hash/freshness/blockers.
- Schema already uses many organization-scoped indexes.
- Compliance submission leasing can guide worker design.

What happens if missing:
- Scheduled scans become expensive full-table scans.
- Managers may see stale assurance status.
- Engine failure can be mistaken for a clean system.

Acceptance criteria:
- Each scheduled check can run incrementally per tenant.
- Control Tower loads from summary/read models rather than scanning all incidents synchronously.
- Engine outage creates an assurance-health incident.

## 9. UI And Workflow Prerequisites

What must be built:
- Admin Control Tower:
  - open incidents by severity/workflow/owner
  - check run health
  - overdue incidents
  - suppressed/waived incidents
  - engine failures
  - drill-through to proof/source workflow
- Incident detail page:
  - what failed
  - why it matters
  - evidence missing
  - source workflow
  - source hash
  - affected BI/close/compliance claim
  - timeline
  - assignment/resolution/waiver actions
- Manager Action Center integration:
  - incidents become action items
  - action items preserve evidence grade, severity, due state, route, and required permission.
- Proof Trail panel integration.
- Notification/dialog semantic alignment.
- Close assurance bridge:
  - blocking incidents can become close findings or pre-close blockers.

Existing strengths:
- Manager Action Center exists.
- Owner War Room exists.
- ProofTrailDrawer and EvidenceGradeBadge exist.
- Close Assurance Center exists.

What happens if missing:
- Incidents exist but managers cannot act.
- Alerts become noise because they lack workflow context.
- Control teams cannot prove who resolved what.

Acceptance criteria:
- A manager can move from alert to incident to source workflow in two clicks.
- A resolved incident records reason and evidence.
- A waived incident displays expiry, approver, and risk notice.
- Control Tower never shows sensitive details to unauthorized roles.

## 10. Testing And Release Prerequisites

Required tests:
- Unit tests for each check function.
- Service tests for incident upsert, dedupe, reopen, resolve, waive, suppress.
- Integration tests for after-commit validators.
- Scheduler tests for incremental cursor behavior.
- RBAC tests for tenant isolation and permission filtering.
- Redaction tests for payroll, supplier bank, provider, and compliance payloads.
- Notification tests for severity mapping and delivery dedupe.
- False-positive tests with legitimate in-progress states.
- False-negative tests with seeded broken invariants.
- Performance tests for large tenant scans.
- Release gate static checks for:
  - every registered check has owner, severity, execution mode, action route, and tests.
  - no critical financial workflow lacks at least one assurance invariant.

Existing strengths:
- Jest service tests exist across payment reconciliation, payroll, AP, snapshots, signals, proof trail, and close assurance.
- Release gate scripts already exist for moat readiness.

Acceptance criteria:
- Seeded violations create expected incidents.
- Clean seeded tenant creates no high/blocking false positives.
- `npm test` focused assurance suite passes.
- Release gate blocks enforce mode if check definitions are missing tests or action links.

## Domain-Specific First Checks

These are the recommended first assurance checks because they are high value and easy to explain:

| Check Key | Workflow | Invariant | Execution |
| --- | --- | --- | --- |
| `ledger.posted_source_link.required` | Accounting | Posted journal entries require posting batch and source link | scheduled + pre-close |
| `business_event.applied_or_visible` | Cross-module | Final business events cannot stay recorded/failed without visible incident | scheduled |
| `payment.exceptions.overdue` | Payments | Open high/critical exceptions past SLA create manager incident | scheduled |
| `payment.suspense.aging` | Payments | Suspense items over SLA require owner and action | scheduled |
| `offline_pos.replay.stale_or_conflicted` | POS | Accepted offline sales must replay or block visibly | scheduled |
| `supplier_payment.bank_change_pending` | Purchasing/AP | Payment release cannot proceed while bank change pending | synchronous + scheduled |
| `inventory.class3.drift` | Inventory | Stock value must reconcile to class 3 ledger | scheduled + pre-close |
| `payroll.payment_requires_posted_run` | Payroll | Payroll payment release requires posted run, payslips, and payment evidence | synchronous + scheduled |
| `fiscal_document.certification_sla` | Compliance | Queued/submitted fiscal documents beyond SLA require incident | scheduled |
| `close.certification_stale_evidence` | Close | Certified close pack must invalidate or reopen if source evidence changes | pre-close + scheduled |

## Phased Roadmap

### Phase 0: Readiness Audit And Gap Map

Deliverables:
- Inventory all existing domain blockers and map them to assurance incident types.
- Map all 10 mission-critical workflows to source models, routes, services, permissions, and proof-trail subjects.
- Confirm canonical check keys, severity taxonomy, owner roles, evidence-grade usage, and dashboard color semantics.
- Add an ADR for Workflow Assurance Engine architecture.

Exit criteria:
- Every check has owner, source table, execution mode, severity, action route, and test plan.
- No schema change yet unless approved.

### Phase 1: Minimum Viable Assurance Engine

Deliverables:
- Add check registry and typed result contract.
- Add durable `WorkflowAssuranceCheckRun`.
- Implement ledger/source-link and business-event/outbox checks.
- Run checks manually through guarded server action in observe mode.

Exit criteria:
- Engine can run without creating noisy user alerts.
- Check run history proves what ran and when.

### Phase 2: Incident Model, Alert Routing, And Manager Action Center Integration

Deliverables:
- Add durable incident, incident event, alert delivery, and waiver models.
- Incident upsert/dedupe/reopen service.
- Role-aware alert routing.
- Manager Action Center adapter.
- Dashboard-token notification mapping.

Exit criteria:
- Incidents appear as action items with evidence grade and direct workflow link.
- Resolved/waived/reopened history is auditable.

### Phase 3: Domain-Specific Invariant Checks

Deliverables:
- POS/offline checks.
- Payment reconciliation/suspense checks.
- Supplier/AP checks.
- Inventory/class 3 checks.
- Payroll checks.
- Compliance outbox checks.
- Close certification checks.

Exit criteria:
- Each mission-critical workflow has at least one blocking invariant and one manager-actionable warning.

### Phase 4: Control Tower And Evidence-Grade BI

Deliverables:
- Admin Control Tower.
- Incident detail page.
- Proof trail integration.
- Control Tower read models.
- BI snapshot gating from incident status.
- Close assurance bridge.

Exit criteria:
- Managers/admins can diagnose, assign, resolve, waive, or escalate anomalies from one surface.
- BI surfaces show blocked evidence state when assurance incidents affect trust.

### Phase 5: Advanced Anomaly Detection, Fraud Signals, And Enterprise Self-Verification

Deliverables:
- Fraud signal scoring: supplier bank changes before payments, repeated threshold-adjacent adjustments, write-off clustering, late-period journals, offline replay anomalies.
- Engine health monitoring and incident creation for stale checks.
- Support/accountant incident reconstruction pack.
- Release gates that prevent new financial workflows without assurance checks.

Exit criteria:
- Kontava can claim self-verifying operations for supported workflows in observe/enforce mode.
- Critical workflows have seeded violation tests and runbook coverage.

## Do Not Install In Enforce Mode Until

- The incident model is durable and tenant-scoped.
- Check runs are persisted.
- High-risk waivers require fresh auth and maker-checker approval.
- Alerts are deduped by source hash.
- Manager Action Center can route incidents to action links.
- Proof trails can explain each incident.
- Redaction rules are applied server-side.
- Scheduler/worker failure is visible.
- Focused tests prove false positives and false negatives for seeded workflows.

## Final Blueprint

Kontava should install the Workflow Assurance Engine as a cross-module control plane that reads existing domain truth, not as another reporting dashboard. The first build should be observe-mode, ledger-first, evidence-aware, and incident-driven. The engine should normalize existing blockers into durable incidents, route those incidents into Manager Action Center and Control Tower, and use proof trails plus evidence grades to explain trust.

Blueprint ready.

