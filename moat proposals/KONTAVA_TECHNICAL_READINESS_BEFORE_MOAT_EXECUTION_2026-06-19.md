# Kontava Technical Readiness Before Moat Execution

Date: 2026-06-19

Source document: `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`

## 1. Executive Summary

Kontava should not start the cross-boundary innovation roadmap by building the largest visible features first. The first move should be a dedicated foundation sprint that makes every future feature safe, explainable, performant, and enforceable.

The most important readiness conclusion is:

```text
Build the evidence, entitlement, snapshot, and release-gate foundation first.
```

The first execution layer should not be AI, fintech APIs, full risk scoring, or a large Owner War Room. It should be:

1. Canonical module vocabulary.
2. Evidence grade taxonomy.
3. Proof Trail MVP contract.
4. Read-only cross-module snapshot contracts.
5. Business signal contract.
6. RBAC plus module entitlement guard design.
7. Sensitive-data redaction policy.
8. Seed/demo evidence scenarios.
9. Release gates for tenant isolation, RBAC, evidence grade correctness, direct URL denial, export safety, and snapshot performance.

Only after these exist should Kontava implement Owner War Room, Cash Leakage Radar, Business Evidence Graph, Stock-to-Cash Twin, Partner Evidence API, or AI Copilot.

## 2. Current Readiness Assessment

Kontava already has meaningful foundations for the proposal, but they are not yet organized into a shared cross-boundary innovation platform.

### 2.1 Strong Foundations Already Present

The current system already contains the beginnings of the required operating spine:

| Foundation | Current State | Readiness |
|---|---|---|
| Tenant isolation | Organization-scoped models, RBAC context, shared protection wrappers, tenant guard tests. | Strong, but must be applied consistently to new cross-module APIs. |
| RBAC | Canonical dot-style permissions, legacy permission aliases, permission risk classification, wildcard support, tests. | Strong, but module entitlements are not yet a separate enforcement layer. |
| Fresh auth and sensitive actions | Sensitive-action service covers close, reconciliation, payroll, supplier bank, exports, and maker-checker patterns. | Strong, reusable for high-risk innovation workflows. |
| Ledger-first accounting | Journal entries, ledger posting batches, posting rules, source links, periods, close gates, tests. | Strong, should become the source of financial truth. |
| Accounting source links | `AccountingSourceLink` and source trace services exist. | Strong, but not yet generalized into a product-wide proof trail. |
| Business events | Durable business event service with payload hashes and outbox behavior exists. | Strong, but adoption must be standardized across modules. |
| Payment reconciliation | Provider events, statements, match records, suspense, reconciliation runs, certification, tests. | Strong, can power cash truth and leakage signals. |
| Close assurance | Close runs, checklist items, findings, evidence items, pack exports, close blocker tests. | Strong, can become Close Autopilot foundation. |
| Dashboard read model | Existing dashboard read-model service and tests. | Useful, but not yet cross-boundary evidence-grade snapshots. |
| Accountant trust/data trust | Data trust service calculates trust levels, blockers, source-link coverage, and export readiness. | Very useful, but evidence grades should be standardized across all modules. |
| Compliance evidence | Compliance evidence services and fiscal document paths exist. | Useful, but country-pack readiness and radar need stronger contracts. |
| Offline POS | Offline certificates and close blockers are represented in the system. | Useful for branch certification, but should not be expanded before proof trail and close gates are stable. |

### 2.2 Important Gaps

The proposal names several foundations that do not yet appear as durable first-class models or shared services:

| Missing Foundation | Why It Matters |
|---|---|
| Evidence read model | Prevents expensive live graph traversal across POS, payments, inventory, payroll, purchasing, accounting, close, and compliance. |
| Evidence grade service | Prevents UI and analytics from overstating weak or incomplete facts. |
| Business signal service | Converts facts into owner/accountant action, without hardcoding logic into dashboards. |
| Risk case management | Turns anomalies into auditable workflows instead of one-off alerts. |
| Module entitlement control plane | Makes module-based SaaS enforceable without relying only on sidebar visibility. |
| Analytics snapshots | Keeps Owner War Room and Cash Leakage Radar fast and stable. |
| Action queue | Gives owners and accountants a single daily work queue instead of many scattered alerts. |
| Partner consent and export contracts | Required before fintech/lender/accountant evidence APIs. |
| AI evidence boundary | Required before AI can safely summarize or advise on business state. |

## 3. What Must Be Put In Place First

The first technical foundation should be a small but durable `Moat Execution Foundation`.

It should include eight elements.

### 3.1 Canonical Module Vocabulary

Before module entitlements, dashboards, Owner War Room cards, or upgrade prompts are built, Kontava needs a single module catalog vocabulary.

Required decisions:

| Area | Recommendation |
|---|---|
| Module slug style | Use stable lowercase slugs: `pos`, `inventory`, `purchasing`, `accounting`, `finance`, `payments`, `reconciliation`, `payroll`, `compliance`, `close`, `analytics`, `controls`, `partners`. |
| Module ownership | Every route, server action, service, report, export, job, and navigation item should map to one owning module and optional dependent modules. |
| Dependencies | Example: `payment-reconciliation` depends on `payments`, `finance`, and `accounting`; `close` depends on accounting and evidence-producing modules. |
| Backward compatibility | Keep existing `requestedModules` registration data, but normalize it into canonical slugs. |
| Enforcement state | Start with observe mode only. Log what would be hidden or blocked before enforcing. |

Why first:

- Module gating can break workflows if added late and aggressively.
- The Owner War Room must know which modules a tenant actually has.
- Cross-boundary intelligence must not recommend unavailable workflows.
- Admin wildcard permissions must not bypass subscription/module boundaries.

### 3.2 Evidence Grade Taxonomy

Define one shared evidence-grade vocabulary before any dashboard claims business truth.

Recommended grades:

| Grade | Meaning | Example |
|---|---|---|
| Raw | Captured but not validated or posted. | Imported statement line, draft sale, received provider event. |
| Operational | Valid operational record exists. | Completed POS sale, goods receipt, payroll run draft. |
| Posted | Ledger impact exists and balances. | Journal entry posted through a ledger batch. |
| Reconciled | External/internal evidence agrees. | Payment matched to provider/bank statement. |
| Certified | Explicit sign-off/export/certification workflow completed. | Signed reconciliation certificate, close pack export. |
| Blocked | Evidence cannot be trusted until blocker is resolved. | Open suspense, missing source link, failed business event. |

Why first:

- It prevents marketing dashboards from overstating operational facts as certified facts.
- It gives the UI a professional language of trust.
- It lets accountants, owners, and auditors understand what the system knows and what it does not know.
- It becomes the basis for Proof Trail, Owner War Room, Business Evidence Graph, Close Autopilot, and AI Copilot.

### 3.3 Proof Trail Contract

Before building a full Business Evidence Graph, build a narrow proof trail API.

First supported entities:

1. POS sale.
2. Payment.
3. Purchase order.
4. Goods receipt.
5. Journal entry.
6. Ledger posting batch.
7. Reconciliation run.
8. Fiscal document.
9. Close run.

The contract should return:

| Field | Purpose |
|---|---|
| `subject` | The record being inspected. |
| `evidenceGrade` | Raw, Operational, Posted, Reconciled, Certified, or Blocked. |
| `nodes` | Source records connected to the subject. |
| `edges` | Relationships such as created, posted, reconciled, certified, reversed, blocked. |
| `blockers` | Missing or failed proof requirements. |
| `sensitiveFieldsRedacted` | Whether RBAC redaction affected the result. |
| `nextActions` | Safe action links, filtered by permission and module entitlement. |
| `generatedAt` | Snapshot/trace generation time. |

Why first:

- It gives a visible product difference quickly.
- It uses existing source links, business events, ledger batches, reconciliation, and close evidence.
- It avoids building a large graph database or AI layer too early.

### 3.4 Read-Only Snapshot Layer

Owner War Room and Cash Leakage Radar should not be powered by heavy live joins.

Create snapshot contracts before UI:

| Snapshot | Purpose |
|---|---|
| `TenantDailyOperatingSnapshot` | Owner-level summary across cash, stock, payroll, AP, reconciliation, close. |
| `BranchDailyOperatingSnapshot` | Branch/terminal/cashier variance and operating health. |
| `PaymentTruthSnapshot` | Cash, bank, mobile money, provider settlement, suspense, duplicate references. |
| `InventoryCashSnapshot` | Stock value, dead stock, margin exposure, reorder affordability. |
| `CloseReadinessSnapshot` | Period close blockers and evidence domains. |

Initial implementation can be service-owned read models without persistent tables, but the contract should be stable enough to persist later.

Why first:

- Prevents slow dashboards.
- Makes tests deterministic.
- Allows observe-mode rollout without changing workflows.
- Lets the team label data freshness clearly.

### 3.5 Business Signal Contract

Do not start with an open-ended alert system. Define a typed signal contract first.

Recommended fields:

| Field | Purpose |
|---|---|
| `signalType` | Cash leakage, reconciliation exception, stock risk, close blocker, payroll exposure, supplier risk. |
| `severity` | Info, warning, high, critical. |
| `evidenceGrade` | Trust level of the signal. |
| `sourceModule` | Module that produced the signal. |
| `affectedModules` | Other modules impacted. |
| `subjectType` and `subjectId` | Record the signal is about. |
| `reason` | Short human-readable explanation. |
| `recommendedAction` | What the owner/accountant should do next. |
| `actionHref` | Permission-aware route. |
| `generatedAt` and `expiresAt` | Freshness control. |
| `dedupeKey` | Prevents alert spam. |

Why first:

- Owner War Room should be an action system, not a wall of charts.
- Cash Leakage Radar should generate explainable signals before risk cases.
- Risk Case Manager can later promote selected signals into workflow cases.

### 3.6 RBAC Plus Entitlement Guard

The platform already has RBAC, permission aliases, risk classification, and wildcard permissions. The missing part is a separate module entitlement rule.

Required rule:

```text
Permission does not imply module entitlement.
Module entitlement does not imply permission.
Admin wildcard does not bypass module subscription or compliance boundaries.
```

Before module-based innovation features are launched, implement a shared guard design for:

1. Navigation visibility.
2. Page access.
3. Server actions.
4. API routes.
5. Service-level operations.
6. Background jobs.
7. Reports and exports.
8. Partner APIs.

Start in observe mode:

```text
allow request, record wouldBlock decision, report drift.
```

Then move to staged enforcement:

```text
warn -> owner/admin upgrade prompt -> hard block for non-entitled normal users -> full backend enforcement.
```

Why first:

- The proposal depends on module orientation.
- Sidebar hiding is not security.
- Cross-boundary dashboards must not leak unavailable or sensitive module data.

### 3.7 Redaction And Sensitive Field Policy

Cross-module intelligence can easily expose sensitive payroll, supplier bank, reconciliation, and partner data.

Before dashboards:

| Data Type | Default Readiness Rule |
|---|---|
| Payroll amount/person-level data | Redact unless payroll permission and entitlement pass. |
| Supplier bank data | Redact unless AP/bank approval permissions pass. |
| Payment provider references | Mask unless reconciliation/payment permissions pass. |
| Close certification evidence | Show summary unless audit/close permissions pass. |
| Partner evidence exports | Require consent, fresh auth, scope, watermark, audit, revocation. |
| AI outputs | Source-cited and RBAC-filtered; no hidden source use. |

Why first:

- A single leaked payroll or bank-detail field can destroy trust.
- Dashboards are read-heavy and easy to underestimate as security surfaces.

### 3.8 Release Gates And Verification Harness

Before executing the recommendations, define what cannot regress.

Minimum gates:

1. Tenant isolation test for every new read model.
2. RBAC denial test for every protected surface.
3. Module entitlement observe-mode test.
4. Direct URL access denial test.
5. Evidence grade unit tests.
6. Proof trail completeness tests.
7. Snapshot performance budget.
8. Sensitive field redaction tests.
9. Export watermark/audit tests.
10. Background job idempotency tests.
11. Seed scenario verification.
12. Rollback plan for every migration.

Why first:

- The innovation roadmap touches many domains.
- Without gates, the platform can become impressive but fragile.
- Enterprise trust depends on proof that the control layer works.

## 4. Execution Sequencing

### 4.1 Do Not Start Yet

The following should wait:

| Recommendation | Why It Should Wait |
|---|---|
| Full Business Evidence Graph | Needs evidence grade taxonomy, proof trail contract, read model strategy, and performance limits. |
| Full Owner War Room | Needs stable snapshot contracts and redaction policy. |
| Cash Leakage Radar beyond MVP | Needs payment truth, cash drawer variance, event quality, and signal dedupe. |
| Risk Case Manager | Needs BusinessSignal service first. Cases without signals become manual ticketing noise. |
| Stock-to-Cash Twin | Needs inventory valuation confidence, purchasing/AP exposure, and snapshot consistency. |
| Fintech Partner Evidence API | Needs consent grants, export scopes, watermarking, revocation, audit, and legal review. |
| Compliance Readiness Radar | Needs versioned country-pack obligations and evidence-grade mapping. |
| AI Operating Copilot | Must consume trusted evidence; it should not become the evidence source. |

### 4.2 First Safe Implementation Slice

The first safe slice should be:

```text
Evidence Grade + Proof Trail MVP + Read-Only Owner Snapshot Contract
```

This gives visible product value without enforcing disruptive workflow changes.

Scope:

1. Define evidence grades.
2. Add an evidence-grade service.
3. Build proof trail read API for POS sale, payment, journal entry, source link, reconciliation run, and close evidence.
4. Build read-only owner snapshot service from existing services.
5. Add evidence badges and a proof-trail drawer to one or two controlled UI surfaces.
6. Add tests and release gates.

Why this slice:

- It uses existing infrastructure.
- It is mostly read-only.
- It proves the thesis that Kontava shows why a number can be trusted.
- It prepares the Owner War Room without making it a large dashboard project.

### 4.3 Correct Order Of Operations

| Order | Foundation | Unlocks |
|---|---|---|
| 1 | Module vocabulary and ownership map | Safe module entitlements, navigation, roadmap scoping. |
| 2 | Evidence grade taxonomy | Shared product language for trust. |
| 3 | Proof trail read contract | Evidence-backed UX and future graph. |
| 4 | Snapshot contracts | Fast Owner War Room and Cash Leakage Radar. |
| 5 | BusinessSignal contract | Actionable owner/accountant command queues. |
| 6 | Entitlement observe mode | Module SaaS rollout without breaking tenants. |
| 7 | Redaction policy | Safe cross-module dashboards and exports. |
| 8 | Seed/demo evidence scenario | Repeatable sales demos and test coverage. |
| 9 | Owner War Room MVP | First daily-use control surface. |
| 10 | Cash Leakage Radar MVP | First high-value problem solution. |
| 11 | Close Autopilot and Accountant Trust Pack refinement | Professional accounting and trust surface. |
| 12 | Risk Case Manager | Workflow layer for repeated/high-risk signals. |
| 13 | Stock-to-Cash Twin, Supplier Trust Shield, Offline Branch Certification | Medium-risk cross-boundary expansion. |
| 14 | Partner Evidence API, Compliance Radar, AI Copilot | Advanced moat features. |

## 5. Architecture Readiness

### 5.1 Standardize Service Boundaries

Before innovation work, each new feature should follow this boundary:

```text
Route/Page -> Server Action/API -> Service -> Read Model/Repository -> Prisma
```

Rules:

1. No dashboard should query raw Prisma directly for cross-module intelligence.
2. No server action should compute evidence grades inline.
3. No UI should decide whether evidence is certified.
4. No background job should bypass tenant, entitlement, or permission context.
5. No export should reuse dashboard DTOs without export-specific redaction and audit.

### 5.2 Required Shared Services

| Service | First Responsibility |
|---|---|
| `evidence-grade.service.ts` | Determine evidence grade for a supported subject. |
| `proof-trail.service.ts` | Return proof nodes, edges, blockers, evidence grade, and redaction metadata. |
| `module-catalog.service.ts` | Define canonical modules, dependencies, ownership, and slugs. |
| `module-entitlement.service.ts` | Observe/enforce tenant module access separately from RBAC. |
| `business-signal.service.ts` | Produce typed, deduped, evidence-linked signals. |
| `owner-snapshot.service.ts` | Produce read-only owner cards from existing service data. |
| `redaction-policy.service.ts` | Apply permission and entitlement-aware field masking. |
| `release-gate fixtures` | Provide reusable tests for tenant/RBAC/entitlement/evidence behavior. |

### 5.3 Shared Contracts

Every new cross-boundary read should return:

1. `organizationId`.
2. `generatedAt`.
3. `freshness`.
4. `evidenceGrade`.
5. `sourceModules`.
6. `permissionsApplied`.
7. `entitlementsApplied`.
8. `redactions`.
9. `blockers`.
10. `nextActions`.

This makes the platform explainable and safe by default.

## 6. Data Readiness

### 6.1 Trusted Data Classes

Kontava should explicitly classify data:

| Class | Meaning | UI Treatment |
|---|---|---|
| Trusted certified | Signed/certified/exported with audit evidence. | Can power certificates and formal packs. |
| Trusted reconciled | Matched against external or ledger evidence. | Can power owner/accountant decisions. |
| Trusted posted | Ledger-posted and balanced. | Can power financial dashboards, with close caveats. |
| Operational | Valid workflow record exists but not fully reconciled or posted. | Can power operational dashboards, not certification. |
| Partial | Some evidence exists, but blockers remain. | Show warning and next action. |
| Stale | Data exists but snapshot or source is outdated. | Show freshness warning. |
| Inferred | Derived estimate, not proof. | Label as estimate, exclude from certified exports. |
| Unsafe | Missing tenant scope, missing source, failed event, or unresolved contradiction. | Block from trust dashboards and exports. |

### 6.2 Historical Backfill Needed

Before broad rollout:

1. Backfill source-link coverage metrics for posted journal entries.
2. Identify records with business events but no ledger/source link.
3. Identify ledger postings without complete source trace.
4. Mark old operational records as `Operational` or `Partial`, not `Certified`.
5. Backfill reconciliation evidence status from existing runs, matches, suspense, provider statements, and certificates.
6. Backfill close evidence status from close runs, findings, and pack exports.
7. Produce an audit report of unsupported historical records.

### 6.3 Seed And Demo Data

Create a deliberate demo tenant set:

| Tenant | Purpose |
|---|---|
| Full evidence tenant | Clean POS-to-payment-to-ledger-to-reconciliation-to-close chain. |
| Cash leakage tenant | Drawer variance, refund spike, duplicate provider reference, unresolved suspense. |
| Inventory cash tenant | Dead stock, low stock, supplier obligation, margin variance. |
| Payroll exposure tenant | Payroll approved but unpaid, payroll posted but close not complete. |
| Accountant tenant | Multiple clients with trust grades and close blockers. |
| Limited-module tenant | Only selected modules visible and usable. |
| Suspended/read-only tenant | Validate entitlement and read-only behavior. |
| Partner consent tenant | Validate evidence export consent and revocation later. |

These tenants prove the platform story before production enforcement.

## 7. Security And Compliance Readiness

### 7.1 Required Enforcement Model

Every protected read or action should pass:

```text
authenticated session
tenant scope
module entitlement
RBAC permission
sensitive-action policy if applicable
redaction policy
audit/event logging where trust-sensitive
```

### 7.2 Admin Wildcard Rule

The current wildcard permission is useful for superuser/admin flows, but it must not bypass:

1. Tenant isolation.
2. Module subscription/entitlement rules.
3. Partner consent.
4. Sensitive field redaction where legal separation is required.
5. Fresh-auth requirements.
6. Maker-checker separation.
7. Country-pack certification rules.

Recommended implementation principle:

```text
Wildcard may satisfy RBAC permission checks.
Wildcard must not automatically satisfy entitlement, consent, certification, or segregation-of-duty checks.
```

### 7.3 Export Safety

Before any accountant, close, compliance, partner, or fintech export expansion:

1. Scope each export to tenant and module entitlement.
2. Require fresh auth for high-risk exports.
3. Apply redaction before serialization.
4. Watermark the export.
5. Log export metadata and actor.
6. Include evidence grade and freshness.
7. Make partner exports revocable and consent-bound.

## 8. UX And Product Readiness

### 8.1 Required UI Primitives

Before Owner War Room:

| UI Primitive | Purpose |
|---|---|
| Evidence-grade badge | Shows Raw, Operational, Posted, Reconciled, Certified, or Blocked. |
| Proof Trail drawer | Shows why a number or record is trusted. |
| Redaction chip | Explains hidden sensitive data without leaking it. |
| Freshness label | Shows when a snapshot was generated. |
| Next-action queue | Converts insight into work. |
| Module unavailable state | Explains entitlement without exposing hidden module detail to normal users. |
| Upgrade/request surface | Lets owners request modules without confusing staff. |
| Close blocker list | Shows blockers, owner, severity, and evidence. |

### 8.2 Product Language To Standardize

Use:

- Proof.
- Evidence.
- Readiness.
- Risk.
- Blocker.
- Reconciled.
- Certified.
- Source-linked.
- Posted.
- Freshness.
- Next action.

Avoid:

- "AI says".
- "Guaranteed".
- "Certified" when only operational.
- "Real-time" when snapshot-based.
- Generic status labels like "ok" for financial truth.

## 9. Operational Readiness

### 9.1 Release Governance

Before building the recommendations, create a release checklist:

1. Feature flag or observe mode for new cross-module capabilities.
2. Migration rollback plan.
3. Seed verification.
4. Tenant isolation tests.
5. RBAC tests.
6. Module entitlement tests.
7. Sensitive redaction tests.
8. Performance budget.
9. Error and notification behavior.
10. Support diagnostics.
11. Documentation for owners/admins/accountants.

### 9.2 Observability

Add structured logging/metrics for:

1. Evidence grade generation.
2. Proof trail generation time.
3. Snapshot generation time.
4. Signal generation count by severity.
5. Entitlement would-block events.
6. Redaction events.
7. Export creation.
8. Direct URL/API denial.
9. Background job retries.
10. Stale snapshot warnings.

### 9.3 Rollback Strategy

Start with read-only foundations and observe mode so rollback is simple:

| Phase | Rollback |
|---|---|
| Evidence grade service | Hide badges and fall back to existing statuses. |
| Proof trail MVP | Disable drawer and retain normal record pages. |
| Snapshot contracts | Fall back to existing dashboard read model. |
| Module entitlement observe mode | Stop logging would-blocks; no user-facing impact. |
| Business signals | Disable signal generation and action queue. |
| Risk cases | Keep cases read-only, stop automatic case creation. |

## 10. Dependency Map

```text
Module vocabulary
  -> module ownership map
  -> entitlement observe mode
  -> navigation/page/action/report guards

Evidence grade taxonomy
  -> proof trail API
  -> evidence badges
  -> owner snapshots
  -> business signals
  -> risk cases
  -> AI and partner exports later

Source links + business events + ledger batches
  -> proof trail
  -> close readiness
  -> accountant trust pack
  -> partner evidence API later

Payment reconciliation + cash drawer + audit logs
  -> payment truth snapshot
  -> cash leakage radar
  -> risk cases
  -> close blockers

Inventory valuation + purchasing/AP + finance
  -> inventory cash snapshot
  -> stock-to-cash twin
  -> supplier trust shield

RBAC + fresh auth + sensitive action service
  -> safe dashboards
  -> safe exports
  -> partner consent
  -> AI redaction
```

## 11. Risk Register

| Risk | Severity | Readiness Mitigation |
|---|---:|---|
| Cross-module dashboards leak payroll/supplier/payment data | Critical | Redaction policy plus RBAC and entitlement tests before UI. |
| Module gating breaks existing tenant workflows | Critical | Observe mode, default entitlements, staged enforcement, audit reports. |
| Evidence grades are inconsistent across modules | High | Central evidence-grade service and test fixtures. |
| Owner War Room becomes slow | High | Snapshot contracts, performance budget, indexes, background rebuild plan. |
| Old data is treated as certified | High | Historical backfill report and conservative `Partial`/`Operational` labels. |
| Too many alerts cause fatigue | Medium | BusinessSignal dedupe keys, severity thresholds, digest mode. |
| AI explains facts it cannot see | Critical | AI last, source-cited, RBAC-filtered, read-only, no hidden data. |
| Partner API leaks tenant data | Critical | Consent grants, scoped credentials, revocation, watermarking, audit logs. |
| Close/compliance claims overreach | High | Country-pack effective dating and certification-only wording. |
| Developers bypass service boundaries | High | Shared service contracts and release gate tests. |

## 12. Prioritized Foundation Roadmap

### Phase 0: Preconditions Before Innovation Work

Duration: 1-2 weeks.

Deliverables:

1. Module vocabulary and ownership map.
2. Evidence grade taxonomy ADR.
3. Proof Trail MVP contract.
4. Snapshot contract definitions.
5. BusinessSignal contract.
6. Redaction policy.
7. Entitlement observe-mode design.
8. Release gate checklist.

Validation gates:

1. Architecture review.
2. Security review.
3. Product language review.
4. Test plan approved.

### Phase 1: First Safe Implementation Slice

Duration: 2-4 weeks.

Build:

1. Evidence-grade service.
2. Proof-trail service for POS sale, payment, journal entry, source link, reconciliation run, close evidence.
3. Evidence badges and proof-trail drawer on limited surfaces.
4. Read-only owner snapshot service contract.
5. Seed tenant that demonstrates a full proof chain and a blocked proof chain.

Validation gates:

1. Tenant isolation tests.
2. RBAC denial tests.
3. Evidence grade tests.
4. Proof trail blocker tests.
5. Sensitive redaction tests.
6. Snapshot performance budget.

### Phase 2: Low-Risk Product Surface

Duration: 4-8 weeks.

Build:

1. Owner War Room MVP with read-only cards.
2. Cash Leakage Radar MVP from cash drawer, payment exceptions, refund/void spikes, and unresolved suspense.
3. Close Autopilot improvements that surface reconciliation, inventory, payroll, and fiscal blockers.
4. Module Control Center observe mode for owners/admins.

Validation gates:

1. Direct URL denial tests.
2. Module entitlement would-block reports.
3. Redaction tests by role.
4. Snapshot rebuild tests.
5. Alert dedupe tests.

### Phase 3: Medium-Risk Consolidation

Duration: 8-16 weeks.

Build:

1. BusinessSignal service.
2. Risk Case Manager.
3. Accountant Trust Pack workflow expansion.
4. Stock-to-Cash Twin.
5. Supplier Trust and AP Risk Shield.
6. Offline Branch Certification UI.

Validation gates:

1. Case audit trail tests.
2. Maker-checker tests.
3. Close blocker regression tests.
4. Job idempotency tests.
5. Downgrade/read-only behavior tests.

### Phase 4: Advanced Moat Features

Duration: after Phase 3 is stable.

Build:

1. Partner Evidence API.
2. Compliance Readiness Radar by country pack.
3. AI Operating Copilot with accounting guardrails.

Validation gates:

1. Partner consent tests.
2. API scope and credential tests.
3. Export watermark/audit tests.
4. Country-pack regression suite.
5. AI permission leakage evaluations.
6. AI source citation evaluations.

## 13. Clear Recommendation

The first thing to put in place is not a new dashboard. It is the cross-boundary trust foundation:

```text
Module vocabulary + evidence grade taxonomy + proof trail contract + read-only snapshots + RBAC/entitlement/redaction gates.
```

The first build should be:

```text
Evidence Grade and Proof Trail MVP, supported by read-only owner snapshot contracts.
```

The first user-facing product surface should be:

```text
A small Owner War Room MVP that shows evidence-graded, permission-filtered, read-only cards and next actions.
```

Delay:

1. AI Copilot.
2. Partner Evidence API.
3. Full Business Evidence Graph.
4. Full module enforcement.
5. Compliance Readiness Radar.
6. Risk Case Manager beyond basic signal handoff.

These delayed features are valuable, but they depend on trusted evidence, stable entitlements, redaction, consent, and repeatable release gates.

## 14. Blueprint Ready

The execution spine is:

```text
trust language -> proof contract -> read model -> entitlement guard -> owner surface -> signal workflow -> advanced moat features
```

Blueprint ready.
