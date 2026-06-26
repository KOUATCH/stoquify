# Kontava Moat Foundation Execution Roadmap

Date: 2026-06-19

Source documents:

1. `moat proposals/KONTAVA_TECHNICAL_READINESS_BEFORE_MOAT_EXECUTION_2026-06-19.md`
2. `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`

Purpose: define the logical, technical, execution-ready roadmap for putting in place the required foundations for Kontava's moat-oriented inter-module, cross-branch operating system before advanced recommendations such as Owner War Room, Business Evidence Graph, Cash Leakage Radar, Stock-to-Cash Twin, Close Autopilot, Accountant Trust Pack, Partner Evidence API, Compliance Readiness Radar, and AI Operating Copilot are implemented at scale.

## 1. Executive Summary

Kontava should execute the moat roadmap by first building a small but durable foundation layer, not by starting with the most visible dashboards or AI features.

The first foundation to build is:

```text
Module vocabulary + evidence grades + proof trails + snapshots + entitlement observe mode + business signals + redaction + release gates.
```

This foundation makes the future moat features safe because it answers five questions consistently:

1. Which module owns this workflow?
2. Can this tenant use this module?
3. Can this user see this data?
4. How trusted is this business fact?
5. What action should happen next?

The roadmap should be executed in eight phases:

| Phase | Name | Main Outcome |
|---:|---|---|
| 0 | Foundation Governance And Vocabulary | Shared language, module map, ADRs, and delivery rules. |
| 1 | Evidence And Proof Trail Foundation | Every key fact can show source, grade, blockers, and next action. |
| 2 | Snapshot And Read-Model Foundation | Fast cross-module owner, branch, payment, inventory, and close summaries. |
| 3 | Module Entitlement And Control Plane Foundation | Module subscriptions are visible, observable, and ready for safe enforcement. |
| 4 | Business Signal And Action Queue Foundation | Cross-module facts become deduped, evidence-linked actions. |
| 5 | Security, Redaction, And Sensitive Action Foundation | Sensitive dashboards, exports, and workflows become safe by default. |
| 6 | Demo, Seed, Migration, And Backfill Foundation | Data proves the new foundation before production enforcement. |
| 7 | First Safe Product Surface | Owner War Room MVP, Proof Trail drawer, Evidence badges, Cash Leakage Radar MVP. |

The first buildable implementation slice should be:

```text
Evidence-grade service + Proof-trail service + read-only owner snapshot contract.
```

The advanced moat features should wait until these foundations are verified:

1. Full Business Evidence Graph.
2. Partner Evidence API.
3. Compliance Readiness Radar.
4. AI Operating Copilot.
5. Hard module enforcement.

## 2. Foundation Objective

### 2.1 What Foundation Are We Building?

The foundation is a shared trust and control layer across accounting, POS, inventory, purchasing, payroll, finance, reconciliation, compliance, close assurance, users, RBAC, audit logs, and tenant module entitlements.

It should introduce:

1. Canonical module vocabulary.
2. Evidence-grade taxonomy.
3. Proof-trail service.
4. Read-only operating snapshots.
5. Module entitlement observe mode.
6. Business signal service.
7. Action queue.
8. Sensitive-data redaction policy.
9. Release gates and verification harness.

### 2.2 Why It Must Exist Before Moat Features

Without this foundation:

- Owner War Room can become a slow dashboard that overstates weak data.
- Cash Leakage Radar can produce noisy alerts without proof.
- Business Evidence Graph can become expensive and inconsistent.
- Partner Evidence API can leak or over-share tenant data.
- Compliance Readiness Radar can make claims that are not backed by country-pack evidence.
- AI Copilot can summarize data it should not see or facts that are not trusted.
- Module-based SaaS can become sidebar hiding instead of backend enforcement.

### 2.3 Problems It Solves

| Problem | Foundation Answer |
|---|---|
| Fragmented module facts | Proof trail and evidence nodes connect operational records to ledger, reconciliation, audit, and close evidence. |
| Dashboard trust | Evidence grades distinguish Raw, Operational, Posted, Reconciled, Certified, and Blocked. |
| Cross-branch scale | Snapshots avoid live cross-module joins and make dashboards fast. |
| Subscription safety | Entitlement observe mode detects what would be hidden or blocked before enforcement. |
| Sensitive data leakage | Redaction policy masks payroll, supplier bank, provider, partner, and export-sensitive data. |
| Alert fatigue | Business signals dedupe, score, expire, and assign action items. |
| Enterprise quality | Release gates make tenant isolation, RBAC, entitlement, evidence, and export behavior testable. |

## 3. Current System Baseline

### 3.1 Reusable Existing Foundations

The current codebase already has important primitives that should be reused rather than rebuilt.

| Area | Reusable Surface |
|---|---|
| Tenant scope | `Organization`, organization-scoped Prisma models, `assertCanUseOrganization`, `protect`, tenant guard tests. |
| Auth and RBAC | `lib/security/rbac.ts`, `lib/security/rbac-permissions.ts`, `components/dashboard/useShellPermissions.ts`, `config/sidebar.ts`. |
| Fresh auth | `lib/security/auth-session.ts`, `requireFreshAuth`, `services/_shared/protect.ts`. |
| Sensitive controls | `services/controls/sensitive-action.service.ts`, maker-checker, export control, fresh-auth rules. |
| Accounting source links | `AccountingSourceLink`, `services/accounting/source-link.service.ts`. |
| Ledger | `LedgerPostingBatch`, `JournalEntry`, posting services, period close preflight, posting rule tests. |
| Business events | `BusinessEvent`, `BusinessEventOutbox`, `services/events/business-event.service.ts`. |
| Data trust | `services/accounting/data-trust.service.ts`, trust levels, blockers, source-link coverage, accountant pack export. |
| Payment reconciliation | Reconciliation runs, match records, suspense items, provider events, statements, payment workbench services and tests. |
| Close assurance | Close runs, checklist items, findings, evidence items, close evidence graph, close pack exports. |
| Dashboard read model | `services/dashboard/dashboard-read-model.service.ts`, dashboard read-model tests. |
| Compliance evidence | `services/compliance/evidence.service.ts`, fiscal document and country-pack direction. |
| Registration module inputs | `Organization.requestedModules`, auth/register requested module flow. |

### 3.2 What Must Be Standardized Or Extended

| Gap | Required Work |
|---|---|
| No canonical module catalog | Add `ModuleCatalog`, ownership map, dependency map, and module route/service/action mapping. |
| `requestedModules` is not entitlement | Normalize registration choices into entitlements, but keep observe mode first. |
| Trust levels are accounting-centric | Add platform-wide evidence grades and map existing accounting trust levels into them. |
| Proof trail is partial | Generalize source links, business events, close evidence, reconciliation evidence, and ledger batches into one read contract. |
| Dashboards use mixed read models | Add stable owner, branch, payment truth, inventory cash, and close readiness snapshot contracts. |
| No business signal service | Add typed, evidence-linked signals before action queues and risk cases. |
| Sidebar permission filtering is not entitlement security | Add page/action/API/report/job entitlement guards. |
| Wildcard permissions can satisfy RBAC | Ensure wildcard does not bypass entitlement, consent, fresh auth, maker-checker, or certification rules. |
| Redaction is not centralized | Add a shared policy for payroll, supplier bank, payment provider, close, partner, and export data. |

## 4. Language Locked

| Term | Meaning |
|---|---|
| Module | A commercial and operational capability such as POS, inventory, purchasing, accounting, finance, payroll, reconciliation, compliance, close, analytics, controls, or partners. |
| Entitlement | Tenant-level right to access a module or module feature. It is separate from user RBAC. |
| Permission | User or role-level authorization to perform an action or view a resource. |
| Evidence grade | Trust status of a fact: Raw, Operational, Posted, Reconciled, Certified, or Blocked. |
| Proof trail | Read-only chain connecting a business record to source links, business events, ledger entries, reconciliation records, close evidence, audit logs, and blockers. |
| Snapshot | Precomputed or contract-stable read model used by dashboards and command centers. |
| Business signal | Evidence-linked, deduped, severity-scored message that recommends an owner/accountant/admin action. |
| Action queue | Work surface that turns signals into assigned tasks. |
| Observe mode | Non-breaking entitlement mode that logs would-block decisions without denying access. |

## 5. Spine Of The Foundation

| Dimension | Decision |
|---|---|
| State | Operational truth remains in existing modules; cross-boundary truth is derived through proof trails and snapshots. |
| Data model | Add small foundation models for modules, entitlements, evidence snapshots, signals, and action items. |
| Contract | Every cross-module read returns evidence grade, freshness, source modules, blockers, redactions, and next actions. |
| Trust boundary | Auth, tenant scope, RBAC, entitlements, redaction, and sensitive-action checks happen server-side. |
| Sync model | Start request/response read-only, then add scheduled/background snapshot rebuilds. |
| Failure handling | Fallback to existing dashboards if snapshots fail; label stale/partial data instead of hiding uncertainty. |
| Rollout | Observe mode first, feature flags, default legacy entitlements, staged enforcement. |

## 6. Phase 0: Foundation Governance And Vocabulary

### 6.1 Objective

Create the shared vocabulary, ownership map, technical rules, and delivery gates that every later phase must follow.

### 6.2 Technical Tasks

1. Create a module vocabulary ADR.
2. Define canonical module slugs:
   - `pos`
   - `inventory`
   - `purchasing`
   - `accounting`
   - `finance`
   - `payments`
   - `reconciliation`
   - `payroll`
   - `compliance`
   - `close`
   - `analytics`
   - `controls`
   - `partners`
3. Create a module ownership map for:
   - Routes.
   - Sidebar links.
   - Server actions.
   - Services.
   - Reports.
   - Exports.
   - Background jobs.
   - Seed scenarios.
4. Define evidence grade taxonomy:
   - Raw.
   - Operational.
   - Posted.
   - Reconciled.
   - Certified.
   - Blocked.
5. Define product language rules:
   - Use "Certified" only after explicit server-side certification/sign-off.
   - Use "Reconciled" only after matching or reconciliation evidence.
   - Use "Posted" only after ledger posting.
   - Use "Operational" for completed module records not yet posted or reconciled.
   - Use "Blocked" when contradictions, missing source links, failed events, or open suspense exist.
6. Create implementation ADRs:
   - ADR: Evidence grade service.
   - ADR: Proof trail contract.
   - ADR: Module entitlement observe mode.
   - ADR: Snapshot strategy.
   - ADR: Redaction and sensitive data policy.
   - ADR: Release gates.

### 6.3 Deliverables Matrix

| Deliverable | Detail |
|---|---|
| Schemas/models | None required yet; draft model names and invariants. |
| Services | Draft interfaces for module catalog, evidence grade, proof trail, snapshots, entitlements, signals. |
| Actions/API | None yet. |
| Hooks/read models | None yet. |
| UI | None yet, but define labels and badges. |
| Permissions | Define future permission names and risk levels. |
| Audit events | Define future event names. |
| Tests | ADR acceptance checklist and route/action ownership inventory check. |
| Seed data | Define scenario list. |
| Migration/backfill | None. |
| Release gates | Architecture sign-off, security sign-off, product language sign-off. |
| Rollback | Documentation-only. |
| Business outcome | Team stops debating language and can build in one direction. |

### 6.4 Definition Of Done

Phase 0 is complete when:

1. Every module slug has a description, owner, dependencies, and examples.
2. Every evidence grade has an allowed meaning and forbidden misuse.
3. Every future cross-module feature has an owning module and dependent modules.
4. Product, engineering, security, QA, and design accept the same vocabulary.

## 7. Phase 1: Evidence And Proof Trail Foundation

### 7.1 Objective

Build the first technical trust layer. A user should be able to inspect a record and see why it is Raw, Operational, Posted, Reconciled, Certified, or Blocked.

### 7.2 Proposed Models

Start with service contracts first. Add durable tables only after the contract stabilizes.

First durable model candidates:

```text
EvidenceSnapshot
EvidenceSnapshotNode
EvidenceSnapshotEdge
EvidenceGradeOverride
```

Suggested fields:

| Model | Key Fields |
|---|---|
| `EvidenceSnapshot` | `id`, `organizationId`, `subjectType`, `subjectId`, `evidenceGrade`, `freshness`, `generatedAt`, `sourceHash`, `blockerCount`, `redactionCount`, `metadata`. |
| `EvidenceSnapshotNode` | `id`, `snapshotId`, `nodeType`, `nodeId`, `label`, `moduleSlug`, `evidenceGrade`, `sourceTable`, `available`, `redacted`, `metadata`. |
| `EvidenceSnapshotEdge` | `id`, `snapshotId`, `fromNodeId`, `toNodeId`, `edgeType`, `label`, `evidenceGrade`, `metadata`. |
| `EvidenceGradeOverride` | `id`, `organizationId`, `subjectType`, `subjectId`, `grade`, `reason`, `approvedById`, `createdAt`, `expiresAt`. |

Do not add overrides in the MVP unless there is a clear control reason. They introduce governance complexity.

### 7.3 Services To Build

| Service | Responsibility |
|---|---|
| `services/evidence/evidence-grade.service.ts` | Compute evidence grade for supported subjects. |
| `services/evidence/proof-trail.service.ts` | Return nodes, edges, blockers, redactions, and next actions. |
| `services/evidence/evidence-contracts.ts` | Shared DTOs and grade enums. |
| `services/evidence/evidence-redaction.service.ts` | Apply field-level masking to proof trail results. |
| `services/evidence/evidence-blockers.service.ts` | Reusable blocker creation and severity mapping. |

### 7.4 Supported Subject Types

Start with:

1. `pos.sale`
2. `payment.transaction`
3. `purchase.order`
4. `goods.receipt`
5. `journal.entry`
6. `ledger.posting.batch`
7. `reconciliation.run`
8. `close.run`
9. `fiscal.document`

Delay:

1. Payroll run proof trails.
2. Supplier bank proof trails.
3. Partner export proof trails.
4. AI-generated explanations.

### 7.5 Integration Rules

| Source | Integration |
|---|---|
| Accounting source links | Use `services/accounting/source-link.service.ts` to prove posting source relationships. |
| Business events | Use `services/events/business-event.service.ts` and `BusinessEvent` status/payload hash. |
| Ledger batches | Use `LedgerPostingBatch.status` and journal entry balance checks. |
| Reconciliation | Use `ReconciliationRun`, match records, suspense items, provider statement evidence, certificate state. |
| Close assurance | Use close checklist, findings, evidence items, and close pack exports. |
| Audit logs | Attach relevant audit events to proof trails where available. |

### 7.6 Server Actions Or API Routes

Recommended first route:

```text
GET /api/evidence/proof-trail?subjectType=...&subjectId=...
```

Recommended server action:

```text
getProofTrailAction(input)
```

Guarding:

1. `requireSession`.
2. Tenant scope resolved server-side.
3. Module entitlement observe check.
4. RBAC permission per subject.
5. Redaction policy.
6. Audit access for sensitive proof trails.

### 7.7 UI Components

| Component | Purpose |
|---|---|
| `EvidenceGradeBadge` | Displays Raw, Operational, Posted, Reconciled, Certified, Blocked. |
| `ProofTrailDrawer` | Side panel that shows nodes, edges, blockers, redactions, and next actions. |
| `EvidenceBlockerList` | Shows unresolved blockers. |
| `EvidenceNodeTimeline` | Compact operational-to-ledger timeline. |
| `RedactionChip` | Explains hidden fields. |

### 7.8 Permissions

Proposed permissions:

```text
evidence.proof.read
evidence.proof.read_sensitive
evidence.grade.read
evidence.snapshot.rebuild
```

Map existing permissions initially:

| Subject | Required Existing Permission |
|---|---|
| POS sale | `sales.read` or legacy sales order read permission. |
| Payment | `payments.reconciliation.read` or finance read. |
| Journal entry | `accounting.journal.read`. |
| Close run | `accounting.close.read`. |
| Accountant trust evidence | `accounting.audit.read`. |

### 7.9 Audit Events

| Event | When |
|---|---|
| `evidence.proof_trail.viewed` | Sensitive or certified proof trail accessed. |
| `evidence.grade.generated` | Optional debug/audit for grade generation in admin mode. |
| `evidence.proof_trail.redacted` | Sensitive fields redacted. |
| `evidence.proof_trail.blocked` | User denied by permission or entitlement. |

### 7.10 Tests

1. Unit tests for every grade transition.
2. Service tests for proof trails:
   - Sale only equals Operational.
   - Sale plus posted ledger equals Posted.
   - Payment plus signed reconciliation equals Reconciled or Certified depending on state.
   - Failed business event equals Blocked.
   - Missing source link equals Blocked or Partial equivalent.
3. RBAC denial tests.
4. Tenant isolation tests.
5. Redaction tests.
6. Performance test with large node counts.

### 7.11 Release Gate

Phase 1 cannot ship until:

1. Proof trails never read records outside the session organization.
2. Evidence grade tests cover all six grades.
3. Direct URL/API calls are denied without permission.
4. Sensitive data redaction is tested.
5. Proof trail generation meets the agreed performance budget.

### 7.12 Rollback

Disable proof-trail drawer and badges via feature flag. Existing pages continue working.

### 7.13 Business Outcome

Kontava can demonstrate the first moat:

```text
Every important number can show its proof.
```

## 8. Phase 2: Snapshot And Read-Model Foundation

### 8.1 Objective

Make future Owner War Room, Cash Leakage Radar, Stock-to-Cash Twin, and Close Autopilot fast and stable.

### 8.2 Proposed Models

```text
TenantDailyOperatingSnapshot
BranchDailyOperatingSnapshot
PaymentTruthSnapshot
InventoryCashSnapshot
CloseReadinessSnapshot
SnapshotBuildRun
```

Suggested shared fields:

```text
id
organizationId
locationId nullable
periodStart
periodEnd
snapshotDate
status
freshness
sourceHash
generatedAt
generatedByJobId nullable
metrics Json
blockers Json
evidenceGrade
metadata Json
createdAt
updatedAt
```

### 8.3 Snapshot Contracts

| Snapshot | Inputs | Output |
|---|---|---|
| Tenant daily operating | `organizationId`, date range | Cash risk, stock risk, payroll exposure, AP exposure, close readiness, reconciliation exceptions. |
| Branch daily operating | `organizationId`, `locationId`, date | Sales, cash variance, terminal/cashier anomalies, offline status. |
| Payment truth | `organizationId`, date range, optional provider | Sales captured, provider events, bank/mobile statements, suspense, duplicates, signed runs. |
| Inventory cash | `organizationId`, date range, location | Stock value, dead stock, reorder pressure, margin exposure, supplier obligations. |
| Close readiness | `organizationId`, period | Accounting, payment, inventory, payroll, compliance, offline, and data-trust blockers. |

### 8.4 Services To Build

| Service | Responsibility |
|---|---|
| `services/snapshots/snapshot-contracts.ts` | Shared DTOs and freshness vocabulary. |
| `services/snapshots/tenant-operating-snapshot.service.ts` | Tenant-wide operating view. |
| `services/snapshots/branch-operating-snapshot.service.ts` | Branch and terminal view. |
| `services/snapshots/payment-truth-snapshot.service.ts` | Reconciliation and payment truth view. |
| `services/snapshots/inventory-cash-snapshot.service.ts` | Stock value and cash pressure view. |
| `services/snapshots/close-readiness-snapshot.service.ts` | Close blockers and evidence summary. |
| `services/snapshots/snapshot-build.service.ts` | Rebuild orchestration and idempotency. |

### 8.5 Reuse Existing Services

1. `services/dashboard/dashboard-read-model.service.ts`
2. `services/reconciliation/payment-reconciliation-dashboard.service.ts`
3. `services/payments/payment-reconciliation-workbench.service.ts`
4. `services/accounting/close-assurance.service.ts`
5. `services/accounting/data-trust.service.ts`
6. Inventory valuation/reconciliation services.
7. Purchase order service.
8. Payroll services.

### 8.6 Performance Budget

| Read Model | Target |
|---|---:|
| Tenant snapshot fetch | Under 500 ms after persisted. |
| Branch snapshot fetch | Under 500 ms after persisted. |
| Payment truth snapshot fetch | Under 800 ms after persisted. |
| Live preview fallback | Under 2.5 seconds for one tenant/date range. |
| Rebuild job | Idempotent; safe to retry. |

### 8.7 Indexing Requirements

Plan indexes around:

1. `organizationId`.
2. `locationId`.
3. `snapshotDate`.
4. `periodStart`, `periodEnd`.
5. `status`.
6. `generatedAt`.
7. Unique keys for `organizationId + snapshotDate + scope`.

### 8.8 Fallback Behavior

If snapshot is stale or missing:

1. Show stale label.
2. Allow live preview only for owners/admins.
3. Queue rebuild if supported.
4. Never show stale data as certified.
5. Do not block existing dashboards.

### 8.9 Tests

1. Empty tenant snapshot.
2. Multi-branch tenant snapshot.
3. Stale snapshot label.
4. Snapshot rebuild idempotency.
5. Tenant isolation.
6. Performance budget.
7. Fallback to existing read model.

### 8.10 Release Gate

No Owner War Room work should start until snapshot contracts exist and at least Tenant, Payment Truth, and Close Readiness snapshots are testable.

### 8.11 Business Outcome

Kontava can build command centers without turning the database into a slow reporting engine.

## 9. Phase 3: Module Entitlement And Control Plane Foundation

### 9.1 Objective

Prepare Kontava for module-based SaaS where tenants see and use only subscribed modules, while avoiding sudden breakage.

### 9.2 Proposed Models

```text
ModuleCatalog
ModuleDependency
SubscriptionPlan
PlanModule
TenantModuleEntitlement
ModuleUsageSignal
ModuleEntitlementDecisionLog
```

### 9.3 Model Details

| Model | Required Fields |
|---|---|
| `ModuleCatalog` | `slug`, `name`, `description`, `status`, `owner`, `riskLevel`, `createdAt`, `updatedAt`. |
| `ModuleDependency` | `moduleSlug`, `dependsOnSlug`, `dependencyType`, `reason`. |
| `SubscriptionPlan` | `slug`, `name`, `status`, `billingCadence`, `metadata`. |
| `PlanModule` | `planSlug`, `moduleSlug`, `limits`, `included`, `metadata`. |
| `TenantModuleEntitlement` | `organizationId`, `moduleSlug`, `status`, `source`, `startsAt`, `endsAt`, `readOnly`, `trial`, `metadata`. |
| `ModuleUsageSignal` | `organizationId`, `moduleSlug`, `signalType`, `count`, `lastSeenAt`, `metadata`. |
| `ModuleEntitlementDecisionLog` | `organizationId`, `userId`, `moduleSlug`, `surface`, `decision`, `wouldBlock`, `reason`, `createdAt`. |

### 9.4 Services

| Service | Responsibility |
|---|---|
| `services/modules/module-catalog.service.ts` | Catalog and dependencies. |
| `services/modules/module-entitlement.service.ts` | Tenant entitlement decisions. |
| `services/modules/module-observe.service.ts` | Would-block logging and drift reports. |
| `services/modules/module-route-map.ts` | Route to module ownership. |
| `services/modules/module-action-map.ts` | Server action/API/job/export ownership. |
| `services/modules/module-upgrade.service.ts` | Upgrade request surface for owners/admins. |

### 9.5 Enforcement Order

1. Observe mode only.
2. Sidebar filtering for normal users.
3. Page-level unavailable states.
4. Server action guards.
5. API route guards.
6. Report/export guards.
7. Background job guards.
8. Hard enforcement after validation.

### 9.6 Guard Rule

Every protected surface should pass:

```text
session -> tenant -> module entitlement -> RBAC permission -> redaction -> sensitive action if needed
```

### 9.7 Admin Wildcard Rule

Wildcard may satisfy RBAC, but must not automatically satisfy:

1. Module entitlement.
2. Partner consent.
3. Fresh auth.
4. Maker-checker separation.
5. Country-pack certification.
6. Legal redaction boundaries.

### 9.8 UI Components

| Component | Purpose |
|---|---|
| `ModuleControlCenter` | Owner/admin view of enabled modules, trials, read-only modules, dependencies, usage signals. |
| `ModuleUnavailableState` | Normal user view when a module is not available. |
| `ModuleUpgradeRequestPanel` | Owner/admin request path. |
| `ModuleDependencyWarning` | Explains required dependency before activation. |
| `ModuleObserveReport` | Admin report of would-block decisions. |

### 9.9 Tests

1. Direct URL denial.
2. Server action bypass denial.
3. API bypass denial.
4. Export bypass denial.
5. Background job entitlement test.
6. Wildcard cannot bypass entitlement.
7. Read-only entitlement blocks mutation.
8. Trial entitlement expires safely.
9. Suspended tenant remains read-only.

### 9.10 Release Gate

No hard enforcement until:

1. Existing tenants get legacy/default entitlements.
2. Observe-mode logs are reviewed.
3. Would-block reports show no critical current workflow breakage.
4. Owners/admins have upgrade/request paths.

### 9.11 Business Outcome

Kontava becomes commercially modular without becoming technically fragmented.

## 10. Phase 4: Business Signal And Action Queue Foundation

### 10.1 Objective

Convert cross-module facts into clear action. This is the foundation for Owner War Room, Cash Leakage Radar, risk cases, Close Autopilot, and Accountant Trust Pack.

### 10.2 Proposed Models

```text
BusinessSignal
BusinessSignalAssignment
BusinessSignalRule
ActionItem
ActionItemEvent
NotificationPreference
```

### 10.3 BusinessSignal Fields

| Field | Purpose |
|---|---|
| `organizationId` | Tenant scope. |
| `locationId` | Optional branch scope. |
| `signalType` | Cash leakage, payment exception, stock risk, close blocker, payroll exposure, supplier risk. |
| `severity` | Info, warning, high, critical. |
| `evidenceGrade` | Trust state of the signal. |
| `sourceModule` | Module that produced it. |
| `affectedModules` | Cross-module impact. |
| `subjectType`, `subjectId` | Linked record. |
| `dedupeKey` | Prevent duplicates. |
| `reason` | Human-readable explanation. |
| `recommendedAction` | What to do next. |
| `actionHref` | Permission-aware route. |
| `status` | Open, assigned, snoozed, resolved, expired. |
| `expiresAt` | Freshness limit. |

### 10.4 Signal Types For MVP

Start with:

1. Open payment suspense.
2. Duplicate provider reference.
3. Cash drawer variance over threshold.
4. Refund/void spike.
5. Close blocker.
6. Low stock with pending PO.
7. Payroll payment unreconciled.

Delay:

1. Supplier risk score.
2. Payroll-to-profitability anomalies.
3. Fintech risk signals.
4. AI-generated signals.

### 10.5 Services

| Service | Responsibility |
|---|---|
| `services/signals/business-signal.service.ts` | Create, dedupe, expire, and resolve signals. |
| `services/signals/business-signal-rules.service.ts` | Rule evaluation and thresholds. |
| `services/signals/action-queue.service.ts` | Assignment, status changes, and action item events. |
| `services/signals/signal-notification.service.ts` | Notification integration and digest mode. |

### 10.6 UI Components

| Component | Purpose |
|---|---|
| `OwnerActionQueue` | Owner/admin daily work queue. |
| `SignalCard` | One signal, evidence grade, severity, next action. |
| `SignalInboxTable` | Sortable exceptions list. |
| `SignalAssignmentControl` | Assign owner, accountant, finance, stockkeeper, or HR. |
| `SignalFreshnessChip` | Shows stale or expired signals. |

### 10.7 Tests

1. Signal dedupe.
2. Signal expiry.
3. Signal assignment audit.
4. Permission-filtered action links.
5. Notification preference behavior.
6. No cross-tenant signal leakage.
7. Redacted sensitive signal payloads.

### 10.8 Release Gate

No Risk Case Manager until BusinessSignal is stable for at least the MVP signal types.

### 10.9 Business Outcome

Kontava becomes an operating assistant: it does not just show data; it tells the team what needs attention and why.

## 11. Phase 5: Security, Redaction, And Sensitive Action Foundation

### 11.1 Objective

Make every cross-module surface safe before it becomes broad, exportable, or AI-readable.

### 11.2 Required Redaction Policy

| Data | Default Rule |
|---|---|
| Payroll person-level amounts | Redact unless payroll entitlement and permission pass. |
| Supplier bank details | Redact unless supplier-bank permission and fresh auth pass. |
| Payment provider references | Mask unless payment/reconciliation permission passes. |
| Reconciliation suspense detail | Redact unless reconciliation exception permission passes. |
| Close certification evidence | Show summary unless close/audit permission passes. |
| Partner data | Require consent, scope, watermark, revocation, and audit. |
| Export data | Require export permission, fresh auth, watermark, audit event. |

### 11.3 Services

| Service | Responsibility |
|---|---|
| `services/security/redaction-policy.service.ts` | Central redaction and masking decisions. |
| `services/security/export-safety.service.ts` | Scope, watermark, audit, fresh auth, consent hooks. |
| `services/security/moat-guard.service.ts` | Composite auth, tenant, entitlement, RBAC, redaction guard. |
| Extend `services/controls/sensitive-action.service.ts` | Add new actions for evidence exports, partner consent, module entitlement mutation. |

### 11.4 New Sensitive Actions

```text
evidence.snapshot.rebuild
evidence.proof.export
module.entitlement.change
partner.consent.grant
partner.consent.revoke
partner.evidence.export
owner.war_room.export
business_signal.bulk_resolve
```

### 11.5 Test Matrix

| Test | Required |
|---|---|
| Payroll redaction by role | Yes |
| Supplier bank redaction by role | Yes |
| Provider reference masking | Yes |
| Export fresh-auth requirement | Yes |
| Wildcard cannot bypass entitlement | Yes |
| Wildcard cannot bypass consent | Yes |
| Maker-checker separation | Yes |
| Audit event on denied sensitive action | Yes |
| Redacted proof trail does not leak hidden IDs | Yes |

### 11.6 Release Gate

No broad Owner War Room or Partner API until the redaction policy and composite guard are test-covered.

### 11.7 Business Outcome

Kontava can safely show enterprise-grade cross-module intelligence without exposing the wrong data to the wrong person.

## 12. Phase 6: Demo, Seed, Migration, And Backfill Foundation

### 12.1 Objective

Prove the foundation with realistic tenants, controlled legacy classification, and rollback-safe migration strategy.

### 12.2 Seed Tenants

| Tenant | Scenario |
|---|---|
| Full evidence chain | Sale -> payment -> ledger -> reconciliation -> close -> trust pack. |
| Cash leakage | Drawer variance, duplicate provider reference, refund spike, open suspense. |
| Inventory cash risk | Dead stock, low stock, supplier obligation, reorder affordability. |
| Payroll exposure | Payroll approved, posted, but unreconciled or unpaid. |
| Accountant multi-client | Accountant sees several tenants with trust grades and close blockers. |
| Limited modules | Tenant has POS + inventory only; finance/payroll hidden. |
| Suspended/read-only | Tenant can read allowed history but cannot mutate. |
| Partner consent | Future lender/fintech export consent and revocation scenario. |

### 12.3 Backfill Work

1. Classify existing records by evidence grade.
2. Backfill source-link coverage summary.
3. Identify posted ledger entries with missing source links.
4. Identify business events with failed/rejected status.
5. Identify payments without provider/statement/reconciliation evidence.
6. Identify close runs and close evidence coverage.
7. Produce tenant-level data quality report.
8. Mark old/unsupported records as Operational or Partial, not Certified.

### 12.4 Migration Strategy

1. Add nullable foundation tables first.
2. Run seed against dev database.
3. Backfill in batches.
4. Generate validation report.
5. Keep observe mode enabled.
6. Avoid hard blocks until validation is clean.
7. Add rollback SQL for every migration.

### 12.5 Rollback Strategy

| Change | Rollback |
|---|---|
| Foundation tables | Keep unused; no runtime dependency until flags enabled. |
| Backfill jobs | Stop jobs; keep legacy reads. |
| Snapshot writes | Disable rebuild; fallback to live existing read model. |
| Entitlement observe logs | Stop logging; no user impact. |
| Seed changes | Reset/reseed dev only, never production destructive reset. |

### 12.6 Tests

1. Seed smoke test.
2. Backfill idempotency.
3. Legacy record classification.
4. Data quality report correctness.
5. Migration rollback rehearsal.
6. No tenant data mixed across scenarios.

### 12.7 Business Outcome

Sales, QA, design, and engineering all get reliable demo and verification scenarios that prove Kontava's moat story.

## 13. Phase 7: First Safe Product Surface

### 13.1 Objective

Expose the foundation through a small, safe, professional product surface that demonstrates value without destabilizing workflows.

### 13.2 First Product Surface

Build:

1. Owner War Room MVP.
2. Proof Trail drawer.
3. Evidence-grade badges.
4. Read-only action cards.
5. Cash Leakage Radar MVP.
6. Close Autopilot first slice.
7. Module Control Center observe-mode UI.

### 13.3 Owner War Room MVP Cards

| Card | Data Source | Required Grade |
|---|---|---|
| Cash at risk | Payment truth snapshot, drawer variance, suspense | Operational or higher, with blockers visible. |
| Reconciliation exceptions | Reconciliation dashboard/workbench | Raw/Operational with exception evidence. |
| Stock cash exposure | Inventory cash snapshot | Operational, Posted if ledger-linked. |
| Supplier commitments | Purchase orders/AP | Operational, Posted when AP ledger-linked. |
| Payroll exposure | Payroll runs/payment batches | Operational or Posted. |
| Close readiness | Close readiness snapshot | Posted/Reconciled/Certified where possible. |
| Action queue | Business signals | Evidence-linked. |

### 13.4 Cash Leakage Radar MVP

Start with:

1. Cash drawer variance.
2. Duplicate provider references.
3. Refund/void spikes.
4. Open suspense.
5. Missing provider evidence for electronic payments.

Delay:

1. Predictive fraud.
2. Staff risk scoring.
3. AI-generated fraud commentary.

### 13.5 UX States

Every card or view must support:

1. Loading.
2. Empty.
3. Partial.
4. Stale.
5. Blocked.
6. Redacted.
7. Permission denied.
8. Module unavailable.
9. Upgrade/request.
10. Error with safe message.

### 13.6 UI Components

| Component | Purpose |
|---|---|
| `OwnerWarRoomDashboard` | First owner/admin command center. |
| `EvidenceGradeBadge` | Trust label. |
| `ProofTrailDrawer` | Source chain. |
| `OwnerActionCard` | Read-only signal summary and next action. |
| `CashLeakageRadarPanel` | Variance and payment risk overview. |
| `CloseAutopilotStrip` | Close blockers and readiness. |
| `ModuleObservePanel` | Shows module would-blocks and upgrade prompts to owners. |

### 13.7 Accessibility And Localization

1. All badges must have text labels, not color-only meaning.
2. Redaction explanations must be readable by screen readers.
3. French and English strings must be added together.
4. Dates, money, percentages, and branch labels must use locale-aware formatting.
5. Action cards must be keyboard reachable.

### 13.8 Release Gate

Owner War Room MVP cannot ship until:

1. Every card uses a service/read-model contract.
2. Every card passes RBAC and entitlement checks.
3. Sensitive values are redacted by role.
4. Proof trail drawer works for at least three subject types.
5. Snapshot stale state is visible.
6. Direct URL access is tested.

### 13.9 Business Outcome

Kontava can demo its moat in one screen:

```text
Cash, stock, payroll, purchasing, reconciliation, close, and evidence are connected.
```

## 14. Dependency Map

```text
Phase 0 vocabulary
  -> module ownership map
  -> entitlement model
  -> route/action/report/job guards

Evidence grade taxonomy
  -> evidence-grade service
  -> proof-trail service
  -> proof-trail drawer
  -> Owner War Room trust labels
  -> AI source rules later

Proof trail service
  -> Business Evidence Graph later
  -> Accountant Trust Pack improvements
  -> Partner Evidence API later

Snapshot contracts
  -> Owner War Room MVP
  -> Cash Leakage Radar MVP
  -> Stock-to-Cash Twin later

Module entitlement observe mode
  -> Module Control Center
  -> safe navigation filtering
  -> staged backend enforcement

Business signals
  -> action queue
  -> Cash Leakage Radar workflow
  -> Risk Case Manager

Redaction policy
  -> safe dashboards
  -> safe proof trails
  -> safe exports
  -> Partner Evidence API
  -> AI Copilot

Seed/backfill foundation
  -> reliable QA
  -> reliable demos
  -> migration confidence
```

## 15. Schema, Service, API, UI, And Test Matrix

| Phase | Schemas/Models | Services | Actions/API | UI | Tests |
|---|---|---|---|---|---|
| 0 | None yet; ADR definitions | Draft interfaces | None | None | Architecture checklist |
| 1 | Optional `EvidenceSnapshot*` later | Evidence grade, proof trail, redaction, blockers | `getProofTrailAction`, `/api/evidence/proof-trail` | Evidence badge, proof drawer | Grade, trail, RBAC, tenant, redaction |
| 2 | Snapshot models | Snapshot services, rebuild service | Snapshot read actions | Snapshot freshness chips | Snapshot, stale, perf, rebuild |
| 3 | Module catalog, plans, entitlements, logs | Catalog, entitlement, observe | Guards and module admin actions | Module Control Center | Direct URL, action/API/export/job bypass |
| 4 | BusinessSignal, ActionItem | Signal, action queue, notification | Signal read/update actions | Owner action queue | Dedupe, expiry, assignment, audit |
| 5 | Export/consent extensions later | Redaction, export safety, composite guard | Export/consent guarded APIs | Redaction chips | Masking, fresh auth, wildcard, consent |
| 6 | Seed/backfill support | Backfill and validation services | Admin validation actions | Data quality admin report | Backfill, idempotency, migration |
| 7 | No new core models if prior phases complete | Owner War Room services | Dashboard actions | Owner War Room, Radar MVP | E2E, accessibility, i18n, role-state |

## 16. Testing And Verification Plan

### 16.1 Unit Tests

1. Evidence-grade transitions.
2. Module dependency resolution.
3. Entitlement decision logic.
4. Redaction rules.
5. Business signal severity and dedupe.
6. Snapshot freshness logic.
7. Sensitive-action policy additions.

### 16.2 Service Tests

1. Proof trail for each supported subject.
2. Tenant snapshot generation.
3. Payment truth snapshot generation.
4. Module entitlement observe-mode logging.
5. Business signal creation and resolution.
6. Export safety and watermarking.
7. Backfill idempotency.

### 16.3 Server Action And API Tests

1. Protected proof trail action.
2. Snapshot read action.
3. Module Control Center action.
4. Signal assignment action.
5. Export/consent actions when built.
6. Direct URL/API bypass denial.

### 16.4 E2E Tests

1. Owner opens Owner War Room.
2. Owner opens Proof Trail drawer.
3. Finance user sees reconciliation signals.
4. Cashier cannot see payroll card.
5. Accountant sees trust and close evidence for allowed tenant only.
6. Limited-module tenant cannot access unavailable module route.
7. Suspended/read-only tenant cannot mutate.

### 16.5 Security Tests

1. Cross-tenant read denial.
2. Cross-tenant action denial.
3. Wildcard cannot bypass entitlement.
4. Wildcard cannot bypass consent.
5. Fresh auth required for exports and entitlement mutation.
6. Maker-checker preserved for sensitive flows.
7. Redacted data does not leak in JSON payloads.

### 16.6 Performance Tests

1. Snapshot fetch under target budget.
2. Proof trail under target node count.
3. Large tenant action queue paging.
4. Snapshot rebuild retry idempotency.

### 16.7 Regression Gates

Do not release if:

1. Existing accounting close tests fail.
2. Reconciliation certification tests fail.
3. RBAC permission tests fail.
4. Source-link tests fail.
5. Business event idempotency tests fail.
6. Dashboard read-model tests fail.
7. Sensitive action tests fail.

## 17. Risk Register

| Risk | Phase | Severity | Mitigation |
|---|---:|---:|---|
| Foundation becomes overbuilt before value appears | 0-2 | High | Keep first slice read-only and limited to proof trail plus snapshots. |
| Evidence grades conflict with existing trust levels | 1 | High | Map existing T0-T4 trust levels to new grades through one service. |
| Proof trails become slow | 1 | High | Use bounded subject types first and persist snapshots later. |
| Cross-module snapshots go stale | 2 | Medium | Freshness labels, rebuild runs, stale fallback. |
| Entitlement enforcement breaks tenants | 3 | Critical | Observe mode, default legacy entitlements, would-block reports. |
| Wildcard bypasses module subscription | 3-5 | Critical | Separate RBAC from entitlement, test wildcard denial. |
| Sensitive data leaks in Owner War Room | 5-7 | Critical | Redaction policy, JSON payload tests, role-based E2E. |
| Signal spam overwhelms owners | 4-7 | Medium | Dedupe keys, severity thresholds, expiry, digest mode. |
| Backfill marks old data as certified | 6 | High | Default old unsupported records to Operational or Partial, never Certified. |
| Partner/AI work starts too early | 7+ | Critical | Gate advanced features behind proof, entitlement, redaction, consent. |

## 18. Execution Governance

### 18.1 Feature Flags

Use flags for:

1. `evidenceProofTrail`.
2. `ownerWarRoomMvp`.
3. `moduleEntitlementObserve`.
4. `moduleEntitlementEnforce`.
5. `businessSignals`.
6. `cashLeakageRadarMvp`.
7. `partnerEvidenceApi`.
8. `aiOperatingCopilot`.

### 18.2 Observe Mode

Observe mode logs:

1. User.
2. Tenant.
3. Module.
4. Surface.
5. Required entitlement.
6. Required permission.
7. Would-block decision.
8. Current fallback behavior.

### 18.3 QA Gates

Each phase needs:

1. Test checklist complete.
2. Seed scenario verified.
3. Security review complete.
4. Product language review complete.
5. Rollback plan rehearsed where migrations exist.

### 18.4 Support Diagnostics

Add diagnostics for:

1. Why a module is hidden.
2. Why a proof trail is blocked.
3. Why a field is redacted.
4. Why a snapshot is stale.
5. Why a signal was generated.
6. Why an export was denied.

### 18.5 Progress Tracking

Track each phase with:

1. ADR accepted.
2. Schema merged.
3. Service built.
4. Server action/API guarded.
5. UI state implemented.
6. Tests green.
7. Seed scenario verified.
8. Release gate passed.

## 19. Team Responsibility Map

| Team | Responsibilities |
|---|---|
| Product | Module vocabulary, evidence-grade language, prioritization, acceptance criteria, rollout communication. |
| Design | Evidence badges, proof drawer, Owner War Room, empty/stale/blocked/redacted states, accessibility. |
| Engineering Backend | Schemas, services, guards, snapshots, signals, migrations, backfills, performance. |
| Engineering Frontend | UI components, hooks, pages, localization, permission-aware states. |
| Security | RBAC, entitlement, redaction, fresh auth, maker-checker, export safety, threat model. |
| QA | Test matrix, seed scenarios, E2E coverage, regression gates. |
| DevOps | Feature flags, migration windows, observability, rollback, job scheduling. |
| Sales/Partnerships | Demo story, module packaging, partner evidence narrative after foundation is safe. |
| Support | Diagnostics, known states, permission/module troubleshooting scripts. |

## 20. First 30, 60, 90, And 180 Days

### First 30 Days

Focus:

```text
Governance + evidence contracts + first proof trail service.
```

Deliver:

1. Module vocabulary ADR.
2. Evidence-grade ADR.
3. Module ownership map.
4. Proof-trail DTO contract.
5. Evidence-grade service MVP.
6. Proof-trail service MVP for 3 subject types:
   - Journal entry.
   - Reconciliation run.
   - Close run.
7. Initial `EvidenceGradeBadge`.
8. Tests for grade transitions, tenant scope, RBAC denial.

Do not build:

1. AI.
2. Partner API.
3. Full Owner War Room.
4. Hard module enforcement.

### First 60 Days

Focus:

```text
Proof trail expansion + snapshot contracts + entitlement observe mode.
```

Deliver:

1. Proof trail support for POS sale, payment, purchase order, goods receipt.
2. Proof Trail drawer MVP.
3. Tenant daily operating snapshot contract.
4. Payment truth snapshot contract.
5. Close readiness snapshot contract.
6. Module catalog and entitlement models in observe mode.
7. Would-block logging.
8. Redaction policy MVP.
9. Seed full evidence and blocked evidence tenants.

### First 90 Days

Focus:

```text
Owner War Room MVP + Cash Leakage Radar MVP + action queue foundation.
```

Deliver:

1. Owner War Room MVP read-only cards.
2. Cash Leakage Radar MVP.
3. BusinessSignal service MVP.
4. Action queue MVP.
5. Module Control Center observe UI.
6. Snapshot rebuild job.
7. More seed tenants:
   - Cash leakage.
   - Inventory cash risk.
   - Payroll exposure.
   - Limited modules.
8. Role-based E2E tests.

### First 180 Days

Focus:

```text
Risk cases + Stock-to-Cash Twin + Accountant Trust Pack expansion + staged entitlement enforcement.
```

Deliver:

1. Risk Case Manager from business signals.
2. Stock-to-Cash Twin first slice.
3. Supplier Trust/AP Shield first slice.
4. Accountant Trust Pack workflow expansion.
5. Offline Branch Certification UI.
6. Entitlement enforcement for selected low-risk modules.
7. Partner consent model design.
8. Compliance Readiness Radar design, not broad release.
9. AI Copilot architecture guardrails, not broad release.

## 21. Final Recommendation

The first execution move should be:

```text
Build the evidence-grade service, proof-trail service, and read-only snapshot contracts before building large dashboards or advanced automation.
```

The first visible product result should be:

```text
Evidence-grade badges and a Proof Trail drawer on a narrow set of high-trust records.
```

The first moat-facing dashboard should be:

```text
Owner War Room MVP with read-only, evidence-graded cards and no hidden sensitive data leaks.
```

The first commercial control-plane result should be:

```text
Module entitlement observe mode and Module Control Center for owners/admins.
```

Delay until the foundation is stable:

1. AI Operating Copilot.
2. Fintech Partner Evidence API.
3. Full Business Evidence Graph.
4. Full module hard enforcement.
5. Compliance Readiness Radar by country pack.

This sequence gives Kontava the strongest chance to build a defensible inter-module, cross-branch moat without breaking accounting, POS, inventory, purchasing, payroll, finance, compliance, reconciliation, RBAC, tenant isolation, auditability, or ledger-first workflows.
