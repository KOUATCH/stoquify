# Kontava Two-Group Moat Action Plan

Generated: 2026-06-20

Primary source: `moat proposals/KONTAVA_CROSS_BOUNDARY_PROPOSAL_TO_EXECUTION_ANALYSIS_2026-06-20.md`

Purpose: separate what Kontava must stabilize first from what should be built afterward, so the Cross-Boundary Innovation and Moat Proposal can be executed comprehensively without bloating the platform or weakening the current ledger-first, tenant-safe foundation.

## Executive Summary

Kontava should execute the moat proposal in two groups:

1. Required foundations before comprehensive execution.
2. Concrete build order to reach full proposal value.

The current system is ready for the next controlled execution slice because the core foundation services exist and the release gate is green:

- Evidence, proof trail, snapshots, module control, business signals, redaction/security, and Owner War Room services are present.
- Release gate result: ready, 0 blockers, 0 critical blockers.
- Seed scenarios: 8/8 ready.
- Backfill checks: 6/6 ready.
- Release gates: 8/8 ready.

However, the platform should not jump straight to full Business Evidence Graph, Partner Evidence API, AI Copilot, hard module enforcement, or predictive fraud scoring. Those would add risk and bloat before the daily operating value is proven.

The first concrete build should be:

`BI Baseline Contract + Manager Daily Action Center + Cash Command Intelligence MVP`

This gives the highest value with the least platform bloat because it reuses existing snapshots, evidence grades, action queue, module observe mode, and Owner War Room foundations.

## Language Locked

- Foundation: shared capability required by multiple future features, such as evidence grades, snapshots, module guards, redaction, BI contracts, or release gates.
- Build step: a concrete product/technical phase that delivers visible value after the foundation is ready.
- Anti-bloat: the discipline of building only what proves SMB value, reusing existing services, keeping risky features read-only first, and delaying heavy models until usage justifies them.
- Full proposal goal: a unified OHADA SMB operating system where operations become evidence-backed cash, stock, payroll, compliance, reconciliation, and ledger truth.

## Group 1: Required Foundations Before Comprehensive Execution

### 1. BI Baseline Contract

Why required:

Kontava cannot become a BI-driven operating system if each dashboard invents its own KPI shape, evidence labels, drill-through behavior, and permission rules. A shared BI contract prevents dashboard sprawl.

Current capability:

- Analytics services exist.
- Financial report provenance exists in parts of `services/analytics`.
- Owner War Room already composes snapshots and action queue.

Missing or incomplete:

- No unified `BIKpiCard`, `BISection`, `ManagerAction`, or `MoatDrillThrough` contract.
- Existing analytics surfaces are not consistently evidence-graded, redacted, module-aware, or action-linked.

Technical work:

- Add `services/bi/bi-contracts.ts`.
- Define `BIKpiCard`, `BIKpiGroup`, `BIInsight`, `BIBlocker`, `BIDrillThrough`, `BIProvenance`, `BIActionLink`.
- Add `services/bi/bi-evidence-adapter.service.ts` to map snapshots, analytics reports, proof trails, and source links into one KPI contract.
- Add guarded server actions under `actions/bi`.
- Add reusable UI components: `BIKpiCard`, `BIEvidenceBadgeRow`, `BIDrillThroughButton`, `BIBlockedState`, `BIRedactedState`.

Security and compliance:

- Every KPI must include `organizationId`, required permission, module slug, evidence grade, source modules, freshness, blockers, and redactions.
- No client-side KPI should compute trust.
- Ledger-sensitive KPIs must declare whether they are operational, posted, reconciled, certified, or blocked.

Verification:

- Unit tests for KPI contract normalization.
- Service tests proving every KPI has evidence metadata.
- Server action tests for tenant/RBAC/module checks.
- UI tests for empty, stale, blocked, redacted, and permission-denied states.

Risk if skipped:

Kontava will accumulate beautiful but disconnected dashboards. That creates bloat, weak trust, inconsistent UX, and higher maintenance cost.

### 2. Evidence Grade and Proof Trail Hardening

Why required:

Every moat feature depends on honest trust language. If weak facts look certified, the entire product loses credibility.

Current capability:

- `services/evidence` exists.
- `EvidenceGradeBadge` and `ProofTrailDrawer` exist.
- Proof trail supports journal entry, reconciliation run, and close run.

Missing or incomplete:

- More subject types are needed: sale, payment, stock movement, purchase order, supplier invoice, payroll run, fiscal document, compliance submission.
- Full graph persistence is not yet present.

Technical work:

- Extend subject type registry.
- Add resolver services per subject type.
- Add proof trail redaction tests for new subjects.
- Add source route mapping and drill-through metadata.
- Add optional persisted `EvidenceSnapshot`, `EvidenceNode`, and `EvidenceEdge` later, only when graph history/performance requires it.

Security and compliance:

- Subject-level permission map.
- Module entitlement check per subject.
- Redaction before payload leaves service.
- Audit sensitive proof access.

Verification:

- Proof trails never cross tenant boundaries.
- Redacted proof trail does not leak hidden IDs.
- Evidence grades cover raw, operational, posted, reconciled, certified, blocked.

Risk if skipped:

BI, AI, partner APIs, and accountant views will be built on unverifiable claims.

### 3. Snapshot and Read-Model Expansion

Why required:

Owner War Room, BI, Cash Leakage Radar, Stock-to-Cash Twin, and Close Autopilot must not be powered by expensive live cross-module joins.

Current capability:

- Tenant operating snapshot.
- Branch operating snapshot.
- Payment truth snapshot.
- Inventory cash snapshot.
- Close readiness snapshot.
- Snapshot rebuild service.

Missing or incomplete:

- Receivables snapshot.
- Payables/AP risk snapshot.
- Payroll profitability snapshot.
- Compliance readiness snapshot.
- Cash command snapshot.
- Manager action center snapshot or durable queue.

Technical work:

- Add snapshot contracts before tables.
- Add services first, then persist only hot/high-value snapshots.
- Add `sourceHash`, freshness, blockers, redactions, and source modules to every snapshot.
- Add background rebuild strategy for expensive snapshots.

Security and compliance:

- Snapshot service must be tenant-scoped.
- Sensitive fields must be summarized or redacted.
- Stale/partial states must be visible.

Verification:

- Snapshot freshness tests.
- Snapshot rebuild idempotency tests.
- Performance budget for each snapshot.
- Fallback behavior when one source module fails.

Risk if skipped:

Command centers become slow, fragile, and unreliable as tenants grow.

### 4. Manager Action Center and Durable Action Queue

Why required:

The proposal's highest value is not more charts. It is telling owners and managers what to do next.

Current capability:

- `BusinessSignal` and `ActionQueueResult` contracts exist.
- Business signal rules exist.
- Owner War Room consumes action queue.

Missing or incomplete:

- No durable `BusinessSignal`, `ActionItem`, or `ActionItemEvent` tables yet.
- No assignment workflow.
- No digest/preferences workflow.
- No manager-focused route yet.

Technical work:

- Start with read-only Manager Action Center from existing signal service.
- Add durable action models only after action usage is proven.
- Add assignment, status, comments, and digest later.
- Add module-aware action filtering.

Security and compliance:

- Actions must be permission-filtered.
- Sensitive actions must not execute from the action center unless guarded services exist.
- No destructive action should be one-click from BI.

Verification:

- Permission-filtered action tests.
- Dedupe tests.
- Expired/stale signal tests.
- Role-specific visibility tests.

Risk if skipped:

BI remains passive. Owners will admire charts but not develop a daily habit.

### 5. Module Entitlement Observe and Enforcement Readiness

Why required:

Kontava's module-based SaaS model must be enforced in services, actions, reports, exports, jobs, and APIs, not just in navigation.

Current capability:

- Module catalog.
- Module entitlement decisions.
- Observe mode.
- Module control center.
- Admin wildcard rule preserved.

Missing or incomplete:

- Broad guard adoption across all routes/actions/reports/exports/jobs.
- Plan/subscription persistence.
- Hard enforcement staged rollout.
- Upgrade request workflow.

Technical work:

- Keep observe mode during all early moat phases.
- Build module guard helper for BI/report/action surfaces.
- Add would-block reports by module.
- Add module unavailable state and upgrade request panel.
- Delay hard enforcement until direct URL/action/API/export/job coverage is proven.

Security and compliance:

- RBAC does not imply entitlement.
- Wildcard RBAC must not bypass module rules.
- Suspended/read-only tenants must remain safe.

Verification:

- Direct URL denial in enforce-mode test fixtures.
- Would-block logs.
- Read-only tenant behavior.
- Export/job guard tests.

Risk if skipped:

Kontava becomes a full-suite product with hidden menus, not a professional module SaaS platform.

### 6. Redaction and Sensitive-Surface Policy

Why required:

Cross-module dashboards combine payroll, supplier bank, provider, close, partner, and export-sensitive data. One leak would damage trust.

Current capability:

- Redaction policy service.
- Export safety service.
- Moat guard service.
- Tests exist.

Missing or incomplete:

- Redaction not yet applied uniformly across future BI and moat surfaces.
- Sensitive-surface registry should be expanded.
- E2E redaction checks should be added.

Technical work:

- Define `SensitiveSurfacePolicy` contract.
- Apply policy to BI, Owner War Room, Cash Radar, AP Shield, Payroll Profitability, Partner API.
- Add fresh-auth and maker-checker metadata where applicable.

Security and compliance:

- Payroll person-level values redacted outside payroll permission.
- Supplier bank and provider identifiers redacted by default.
- Close certification evidence shown only with close/audit permission.
- Partner data never shown without consent.

Verification:

- Payload redaction tests.
- UI redaction chips.
- Fresh-auth required tests.
- Export safety tests.

Risk if skipped:

The very feature that makes Kontava powerful, cross-module visibility, becomes a liability.

### 7. Drill-Through and Proof Drawer Standardization

Why required:

Every KPI and signal should answer: where did this number come from?

Current capability:

- Proof Trail drawer exists.
- Some source/provenance support exists in reports.

Missing or incomplete:

- Standard drill-through contract.
- Mapping from BI KPI to proof subject or source route.
- Consistent unsupported-proof state.

Technical work:

- Add `MoatDrillThrough` contract.
- Add source route registry.
- Add proof availability checks.
- Add disabled state when no supported proof exists.

Security and compliance:

- Drill-through target must repeat RBAC/module/tenant guard.
- No direct raw ID exposure for sensitive records.

Verification:

- Drill-through route tests.
- Proof drawer disabled/enabled tests.
- Cross-tenant proof denial.

Risk if skipped:

Users see numbers but cannot trust or explain them.

### 8. Data Quality, Source Links, and Business Event Consistency

Why required:

The moat depends on operational facts becoming evidence. Weak source links and inconsistent business events create weak intelligence.

Current capability:

- `AccountingSourceLink`, `BusinessEvent`, `BusinessEventOutbox`, `AuditLog` models exist.
- Release gate reports source-link and business event readiness.

Missing or incomplete:

- Not every workflow may consistently emit source links/business events.
- Legacy data classification/backfill needs controlled rules.

Technical work:

- Map all major workflows to source-link/event requirements.
- Add service tests for missing source links.
- Add backfill classification: trusted, partial, stale, inferred, blocked.
- Add source-link coverage reports.

Security and compliance:

- Backfill must never mark unsupported legacy facts as certified.
- Audit all automated reclassification.

Verification:

- Source-link coverage gate.
- Business event quality gate.
- Backfill idempotency tests.

Risk if skipped:

Advanced features will produce confident-looking but incomplete conclusions.

### 9. Seed, Demo, and Backfill Readiness

Why required:

The team needs realistic data to prove the moat story and prevent regressions.

Current capability:

- Release gate reports 8/8 seed scenarios ready.
- Seed/backfill report exists.

Missing or incomplete:

- More scenario-specific demo tenants are needed for BI, Cash Radar, AP Shield, Payroll Profitability, Accountant Portal, Partner API.

Technical work:

- Add demo cases per build phase.
- Keep seeds idempotent.
- Add scenario markers.
- Add backfill runners only after schema is approved.

Security and compliance:

- Demo data must not weaken tenant isolation.
- No production reset/reseed as part of normal feature work.

Verification:

- Seed scenario gate.
- Backfill dry-run report.
- Rollback report.

Risk if skipped:

Features look good only on developer data and fail in real SMB workflows.

### 10. Testing, Release Gates, Observability, and Rollback

Why required:

Cross-boundary features can break silently if only UI is tested.

Current capability:

- Static moat release gate exists.
- Focused service/action tests exist.

Missing or incomplete:

- More E2E tests.
- Observability for snapshot generation, signal generation, redaction, module decisions.
- Phase-specific release gates.

Technical work:

- Add per-phase gate entries.
- Add support diagnostics pages or reports.
- Add structured logs/metrics for snapshot rebuilds, proof access, signal generation, module would-block decisions.

Security and compliance:

- Audit denied sensitive actions.
- Audit partner/export access.
- Audit close certification and override workflows.

Verification:

- Gate must pass before phase promotion.
- Rollback instructions per phase.

Risk if skipped:

Kontava can become impressive but brittle.

### 11. Dashboard and BI UX Primitives

Why required:

The user experience must be consistent, not a pile of dashboards.

Current capability:

- Dashboard theme tokens exist.
- Evidence badge and proof drawer exist.
- Owner War Room MVP exists.

Missing or incomplete:

- Reusable BI card suite.
- Standard action cards.
- Module unavailable/upgrade states across BI.
- Accessibility and i18n coverage for all new surfaces.

Technical work:

- Create shared BI components.
- Use existing `dashboard-landing-theme` and dashboard tokens.
- Standardize loading, empty, stale, blocked, redacted, permission denied, module unavailable, safe error.

Security and compliance:

- UI never hides a server failure as success.
- UI must label operational vs ledger-backed vs certified.

Verification:

- Component tests.
- Accessibility smoke tests.
- Locale formatting checks.

Risk if skipped:

The platform feels fragmented and less enterprise-grade.

### 12. Performance Budgets and Background Rebuild Strategy

Why required:

The proposal depends on cross-module intelligence. Live joins will not scale.

Current capability:

- Snapshot services and rebuild service exist.

Missing or incomplete:

- Formal performance budgets.
- Background job scheduling.
- Persisted snapshot tables for hot paths.
- Graph query budgets.

Technical work:

- Define max response times per snapshot/BI endpoint.
- Add background rebuild runner.
- Add idempotency keys and source hashes.
- Persist only high-value/hot read models.

Security and compliance:

- Background jobs must run tenant-scoped.
- Failed jobs must not publish partial facts as trusted.

Verification:

- Performance tests.
- Rebuild retry tests.
- Stale-state UI tests.

Risk if skipped:

The system becomes slow exactly when the moat starts working.

## Group 2: Concrete Build Order To Reach The Proposal Goal

### Phase 1: BI Baseline and Manager Daily Action Center

What to build:

- `services/bi/bi-contracts.ts`
- `services/bi/manager-action-center.service.ts`
- `actions/bi/manager-action-center.actions.ts`
- BI KPI card components with evidence metadata.
- Replace static analytics quick actions with real Manager Actions.

Why first:

It gives immediate daily value and reuses existing signals/action queue.

Advances:

- BI baseline.
- Owner War Room.
- Cash Command Intelligence.
- Cash Leakage Radar later.
- Close Autopilot later.

Depends on:

- Evidence grades.
- Business signals.
- Snapshots.
- RBAC/module observe.
- Redaction policy.

MVP:

- Read-only manager actions generated from existing BusinessSignal rules.
- Action cards with severity, evidence grade, source module, permission, due date, next action.

Production-grade:

- Durable `ActionItem` persistence.
- Assignment, status, comments, digest preferences.

Exclude to prevent bloat:

- No chat assistant.
- No advanced workflow automation.
- No one-click sensitive actions.

Business value:

Creates a daily habit loop.

Moat value:

Turns Kontava from reporting software into an operating assistant.

Release gate:

- Every manager action is tenant-scoped, permission-filtered, evidence-graded, and redaction-safe.

### Phase 2: Cash Command Intelligence

What to build:

- `services/bi/cash-command-intelligence.service.ts`
- Cash position, payment truth, open suspense, supplier commitments, payroll exposure, tax/close readiness.
- Cash command cards for Owner War Room and analytics.

Why now:

Cash is the owner pain with the clearest willingness to pay.

Advances:

- Cash Command Intelligence.
- Owner War Room.
- Payment Truth.
- Cash Leakage Radar.

Depends on:

- BI contract.
- Payment truth snapshot.
- Tenant operating snapshot.
- Redaction policy.

MVP:

- Read-only cash command cards and blockers.

Production-grade:

- Cash forecast, receivable/payable timing, branch cash drill-through.

Exclude:

- No predictive cash forecasting until historical data quality is proven.

Business value:

Owners know if they can meet obligations.

Moat value:

Combines POS, payments, purchasing, payroll, reconciliation, close, and ledger evidence.

Release gate:

- No cash KPI without source, freshness, blockers, and proof/drill-through.

### Phase 3: Owner War Room Expansion

What to build:

- Extend current Owner War Room with BI baseline and Cash Command cards.
- Add proof/drill-through coverage.
- Add module-aware upgrade prompts.
- Add manager action center panel.

Why now:

The MVP exists and should become the visible daily operating surface.

Advances:

- Owner War Room.
- Manager Action Center.
- Module Intelligence.
- Cash Command.

Depends on:

- BI baseline.
- Cash Command.
- Existing Owner War Room service.

MVP:

- Read-only extension with no new mutations.

Production-grade:

- User preferences, digest, role-specific layouts.

Exclude:

- No custom dashboard builder.
- No AI.
- No partner widgets.

Business value:

One screen for what owners need today.

Moat value:

Makes cross-module evidence visible and memorable.

Release gate:

- E2E test for route, cards, redactions, proof drawer, permission denial.

### Phase 4: Cash Leakage Radar MVP

What to build:

- Cash risk signal rules from drawer variance, open suspense, critical exceptions, duplicate provider references, refund/void spikes.
- Radar surface by branch, payment method, terminal where data exists.

Why here:

It builds naturally from Cash Command and Manager Actions.

Advances:

- Cash Leakage Radar.
- Fraud Case Manager later.
- Payment Truth.

Depends on:

- Signals.
- Payment truth.
- Cash drawer/POS data.
- Redaction policy.

MVP:

- Read-only radar with "why flagged" evidence.

Production-grade:

- Assign/resolve investigation actions.

Exclude:

- No predictive staff fraud scoring.
- No public accusations.

Business value:

Reduces cash loss and owner anxiety.

Moat value:

Uses integrated POS, payment, reconciliation, audit, and ledger evidence.

Release gate:

- Every flag has evidence and safe wording.

### Phase 5: OHADA Close Autopilot MVP

What to build:

- Close blocker queue.
- Close readiness domains.
- Owner/accountant action cards.
- Proof links to close evidence.

Why now:

Close readiness already has strong data foundation and high accountant value.

Advances:

- OHADA Close Autopilot.
- Accountant Trust Pack.
- Compliance Radar.

Depends on:

- Close readiness snapshot.
- Proof trail.
- Source links.
- Manager Action Center.

MVP:

- Read-only close blocker dashboard and action cards.

Production-grade:

- Assignment, waiver workflow, close task workflow.

Exclude:

- No auto-certification.
- No close reopening automation.

Business value:

Less month-end chaos.

Moat value:

Turns daily operations into close-ready evidence.

Release gate:

- No certified claims unless close controls prove certification.

### Phase 6: Payment Truth and Suspense Autopilot

What to build:

- Guided suspense resolution.
- Match proposal workflow.
- Exception assignment.
- Reconciliation proof coverage.

Why here:

Payment truth is central to cash, close, accountant trust, partner evidence, and owner confidence.

Advances:

- Payment Truth and Suspense Autopilot.
- Cash Leakage Radar.
- Close Autopilot.
- Partner Evidence later.

Depends on:

- Payment reconciliation foundation.
- Fresh auth/maker-checker for sensitive operations.

MVP:

- Read-only suspense queue and suggested next actions.

Production-grade:

- Match approval, suspense posting, signoff.

Exclude:

- No automatic posting without approval.

Business value:

Finance teams close cash faster.

Moat value:

Deep payment evidence across cash, bank, mobile money, card, POS, invoices, and ledger.

Release gate:

- Override/sign/post operations require fresh auth and audit.

### Phase 7: Stock-to-Cash Digital Twin

What to build:

- Inventory capital dashboard.
- Dead stock and stockout risk.
- Reorder affordability.
- Supplier commitment links.

Why here:

It needs Cash Command and inventory snapshots to avoid becoming a generic stock report.

Advances:

- Stock-to-Cash Digital Twin.
- Supplier AP Risk Shield.
- Owner War Room.

Depends on:

- Inventory cash snapshot.
- Purchasing commitments.
- BI contract.

MVP:

- Read-only inventory cash exposure and reorder risk.

Production-grade:

- Scenario planning and affordability recommendations.

Exclude:

- No automatic purchase generation.

Business value:

Owners see where cash is trapped in stock.

Moat value:

Connects inventory, purchasing, cash, sales, and ledger evidence.

Release gate:

- Valuation and stock states must be accurate and stale-aware.

### Phase 8: Supplier Trust and AP Risk Shield

What to build:

- Supplier commitments.
- Delayed receiving.
- Duplicate invoice/payment risk.
- Bank-change risk.
- AP exception dashboard.

Why here:

Supplier risk needs purchasing, AP, and cash context.

Advances:

- Supplier Trust and AP Risk Shield.
- Stock-to-Cash.
- Cash Command.

Depends on:

- Purchasing/AP services.
- Cash command.
- Redaction and maker-checker.

MVP:

- Read-only supplier/AP risk dashboard.

Production-grade:

- Bank-change approval, payment approval, duplicate resolution workflows.

Exclude:

- No payment release from dashboard until maker-checker is proven.

Business value:

Prevents supplier payment loss and AP close blockers.

Moat value:

Combines supplier, receiving, invoice, payment, ledger, and audit evidence.

Release gate:

- Supplier bank fields are redacted and fresh-auth protected.

### Phase 9: Payroll-to-Profitability Engine

What to build:

- Aggregated payroll exposure.
- Labor cost by branch/period.
- Payroll-to-ledger status.
- Labor-adjusted profitability where source quality supports it.

Why here:

Payroll is sensitive and should come after redaction and BI discipline are mature.

Advances:

- Payroll-to-Profitability.
- Owner War Room.
- Cash Command.

Depends on:

- Payroll foundation.
- Redaction policy.
- BI contract.

MVP:

- Redacted payroll exposure and branch-level aggregate ratios.

Production-grade:

- Labor-adjusted margin by branch/product/production batch.

Exclude:

- No person-level pay outside payroll permissions.

Business value:

Owners understand labor impact without invading payroll privacy.

Moat value:

Connects payroll, attendance, sales, production, finance, and ledger.

Release gate:

- Payload tests prove employee pay is redacted.

### Phase 10: Accountant Trust Pack

What to build:

- Accountant review workspace.
- Evidence pack preview.
- Close/reconciliation/source-link review.
- Evidence requests.

Why here:

The system needs enough evidence depth before external collaboration.

Advances:

- Accountant Trust Pack.
- Close Autopilot.
- Evidence Graph.
- Partner Evidence later.

Depends on:

- Proof trails.
- Close/reconciliation evidence.
- Access grants.

MVP:

- Internal read-only accountant trust pack preview.

Production-grade:

- Scoped accountant access, comments, evidence requests, revocation.

Exclude:

- No broad external access until consent/scopes exist.

Business value:

Accountants spend less time cleaning chaos.

Moat value:

Creates accountant-led adoption.

Release gate:

- External access is scoped, audited, and revocable.

### Phase 11: Compliance Readiness Radar

What to build:

- Fiscal sequence warnings.
- Compliance submission blockers.
- Payroll declaration readiness.
- Country-pack evidence gaps.

Why here:

Compliance radar needs close/accountant/evidence foundations.

Advances:

- Compliance Readiness Radar.
- OHADA Close Autopilot.
- Accountant Trust Pack.

Depends on:

- Country packs.
- Fiscal docs.
- Payroll declarations.
- Close evidence.

MVP:

- Read-only blocker dashboard by period/country pack.

Production-grade:

- Guided remediation and authority adapter status.

Exclude:

- No regulator-facing claims before legal review.

Business value:

Avoids late tax/compliance surprises.

Moat value:

Encodes OHADA and country-specific operational knowledge.

Release gate:

- No compliance claim without evidence and jurisdiction context.

### Phase 12: Offline Branch Certification

What to build:

- Offline replay certificate viewer.
- Sync trust status.
- Conflict evidence and branch trust state.

Why here:

It is valuable, but not the first daily owner habit unless multi-branch/offline usage is proven.

Advances:

- Offline Branch Certification.
- Business Evidence Graph.
- Close evidence.

Depends on:

- Offline POS replay foundation.
- Hash chains.
- Audit.

MVP:

- Read-only certificate view.

Production-grade:

- Conflict workflow and branch certification pack.

Exclude:

- No complex offline command center until usage proves need.

Business value:

Trust branch activity after disconnection.

Moat value:

Hard-to-copy branch evidence.

Release gate:

- Replay idempotency and hash verification pass.

### Phase 13: Fraud and Controls Case Manager

What to build:

- Control case candidate workflow.
- Case board.
- Evidence timeline.
- Assignment and resolution.

Why here:

It depends on Cash Leakage Radar, signals, and safe evidence language.

Advances:

- Fraud and Controls Case Manager.
- Cash Leakage Radar.
- Supplier/AP Risk.

Depends on:

- Manager actions.
- Cash radar.
- Redaction.
- Audit.

MVP:

- Read-only case candidates from severe signals.

Production-grade:

- Case workflow with status, comments, owner, SLA.

Exclude:

- No predictive fraud allegations.
- No black-box risk scoring.

Business value:

Turns exceptions into controlled investigations.

Moat value:

Makes enterprise controls accessible to SMBs.

Release gate:

- Every case has evidence and safe wording.

### Phase 14: Business Evidence Graph

What to build:

- Persisted evidence graph snapshots.
- Graph explorer.
- Node/edge API.
- Graph-backed drill-through from KPIs and documents.

Why here:

It is high-moat but expensive; build only after proof trails and usage patterns show what users inspect.

Advances:

- Business Evidence Graph.
- Accountant Trust Pack.
- Partner API.
- AI Copilot.

Depends on:

- Proof trail expansion.
- BI drill-through.
- Source-link coverage.
- Performance budgets.

MVP:

- Limited graph for sale/payment/journal/reconciliation/close.

Production-grade:

- Persisted graph snapshots and indexed queries.

Exclude:

- No full visual graph for every object immediately.

Business value:

Trust every number and document.

Moat value:

Creates proprietary operating evidence competitors cannot copy quickly.

Release gate:

- Large graph performance and tenant isolation pass.

### Phase 15: Module Intelligence and Entitlement Control Plane Maturity

What to build:

- Module usage signals.
- Upgrade recommendations.
- Enforcement coverage reports.
- Staged hard enforcement.

Why here:

Observe mode should collect evidence before enforcement.

Advances:

- Module Intelligence.
- Module-oriented SaaS.
- Pricing and packaging.

Depends on:

- Module observe data.
- Route/action/report/export/job guard coverage.

MVP:

- Usage and would-block reports.

Production-grade:

- Staged enforcement with rollback.

Exclude:

- No sudden module hiding for legacy tenants.

Business value:

Supports modular subscriptions and upsell.

Moat value:

Product grows around actual SMB pain.

Release gate:

- Enforcement dry-run clean for target tenants.

### Phase 16: Fintech Partner Evidence API

What to build:

- Consent grants.
- Partner credentials.
- Scoped evidence exports.
- Revocation and watermarking.

Why late:

This is high-risk external data sharing.

Advances:

- Fintech Partner Evidence API.
- Data moat.
- Financing partnerships.

Depends on:

- Evidence Graph.
- Accountant Trust Pack.
- Consent/export security.

MVP:

- Internal consent/export design and watermarked pack preview.

Production-grade:

- Scoped partner API with audit and revocation.

Exclude:

- No open API before legal/security review.

Business value:

Helps SMBs access financing and better payment services.

Moat value:

Turns Kontava data into partner infrastructure.

Release gate:

- Revoked credentials cannot access anything.

### Phase 17: AI Operating Copilot with Accounting Guardrails

What to build:

- Source-cited read-only AI.
- Evidence retrieval.
- RBAC/module/redaction filtered answers.
- Answer audit.

Why last:

AI is only trustworthy after evidence graph, BI contracts, redaction, and citations are mature.

Advances:

- AI Operating Copilot.
- Owner productivity.
- Accountant guidance.

Depends on:

- Evidence Graph.
- BI baseline.
- Proof trails.
- Redaction.

MVP:

- Read-only question answering over safe evidence with citations.

Production-grade:

- Draft action recommendations, never automatic sensitive execution.

Exclude:

- No mutation execution.
- No certified claims without evidence.
- No uncited answers.

Business value:

Makes Kontava easier to understand and operate.

Moat value:

AI becomes evidence-bound, not generic.

Release gate:

- Prompt injection, citation, RBAC, and redaction tests pass.

## Anti-Bloat Principles

1. Build action before visualization.
2. Build read-only before mutation.
3. Reuse existing services before adding schema.
4. Persist only hot, historical, or expensive read models.
5. Do not create a new dashboard if the Owner War Room or BI shell can host the surface.
6. Do not add AI before proof and citation exist.
7. Do not add partner APIs before consent and revocation exist.
8. Do not hard-enforce modules before observe reports are clean.
9. Do not claim certification without close/compliance evidence.
10. Do not expose person-level payroll, supplier bank, or provider identifiers in cross-module views.
11. Delay custom scoring until users trust the underlying evidence.
12. Prefer one unified operating system shell over disconnected mini-apps.

## Prioritization Matrix

| Rank | Work | SMB pain | Reuse | Revenue | Owner usage | Moat | Risk | Bloat risk |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | BI Baseline + Manager Action Center | Very high | Very high | High | Very high | High | Low | Low |
| 2 | Cash Command Intelligence | Very high | High | High | Very high | High | Medium | Low |
| 3 | Owner War Room Expansion | Very high | High | High | Very high | High | Medium | Medium |
| 4 | Cash Leakage Radar MVP | High | High | High | High | High | Medium | Medium |
| 5 | Close Autopilot MVP | High | High | High | Medium | High | Medium | Medium |
| 6 | Payment Truth Autopilot | High | High | High | Medium | Very high | High | Medium |
| 7 | Stock-to-Cash Twin | High | Medium | Medium | High | High | Medium | Medium |
| 8 | Supplier/AP Risk Shield | High | Medium | Medium | Medium | High | High | Medium |
| 9 | Payroll-to-Profitability | Medium | Medium | Medium | Medium | High | High | Medium |
| 10 | Accountant Trust Pack | High | Medium | High | Medium | Very high | High | Medium |
| 11 | Compliance Radar | High | Medium | High | Medium | Very high | High | Medium |
| 12 | Offline Branch Certification | Medium | Medium | Medium | Medium | High | Medium | Medium |
| 13 | Fraud Case Manager | Medium | Medium | Medium | Medium | High | High | High |
| 14 | Business Evidence Graph | Very high | Medium | High | Medium | Very high | High | High |
| 15 | Module Intelligence Maturity | High | High | Very high | Medium | High | High | Medium |
| 16 | Fintech Partner API | Medium | Low | Very high | Low | Very high | Very high | High |
| 17 | AI Copilot | Medium | Low | Medium | Medium | High | Very high | High |

## First 30, 60, 90, and 180 Days

### First 30 Days

- Build BI baseline contracts.
- Build Manager Action Center MVP.
- Add BI KPI evidence metadata.
- Add proof/drill-through standard.
- Add tests for BI contract, action queue, redaction, permissions.
- Keep all new surfaces read-only.

### First 60 Days

- Build Cash Command Intelligence.
- Extend Owner War Room with BI and cash command panels.
- Add E2E smoke tests for Owner War Room, Manager Action Center, proof drawer, redaction.
- Add snapshot performance budget.
- Add module-aware BI unavailable states.

### First 90 Days

- Build Cash Leakage Radar MVP.
- Build Close Autopilot MVP.
- Expand proof subject types.
- Start Payment Truth guided suspense work.
- Add durable ActionItem only if read-only action usage is proven.

### First 180 Days

- Build Stock-to-Cash Twin MVP.
- Build Supplier/AP Risk Shield MVP.
- Build Payroll-to-Profitability MVP.
- Build Accountant Trust Pack internal preview.
- Design persisted Evidence Graph and Partner Consent models, but do not expose public API yet.

## Release Gates

Before each phase ships:

- Typecheck passes.
- Focused unit/service/action tests pass.
- Tenant isolation tests pass.
- RBAC tests pass.
- Module observe/enforcement tests pass where relevant.
- Redaction payload tests pass.
- Proof/drill-through tests pass.
- Snapshot freshness/performance checks pass.
- No certified/compliance/partner claim without evidence.
- Rollback path is documented.

## Team Responsibilities

| Team | Responsibilities |
| --- | --- |
| Product | Prioritize SMB pain, define acceptance criteria, keep anti-bloat discipline. |
| Design | BI cards, action center, proof drawer, states, accessibility, dashboard consistency. |
| Engineering | Contracts, services, server actions, guards, snapshots, jobs, tests. |
| Security | RBAC, tenant isolation, redaction, fresh auth, maker-checker, export safety. |
| Accounting/Compliance | Ledger-first rules, OHADA claims, close evidence, country-pack correctness. |
| QA | Release gates, E2E, regression, seed scenario validation. |
| Sales/Partnerships | Package value story, module bundles, accountant/fintech readiness after foundations. |

## What To Build First

Build first:

`BI Baseline Contract + Manager Daily Action Center + Cash Command Intelligence MVP`

Why:

- It gives immediate owner value.
- It reuses existing foundations.
- It improves Owner War Room without bloat.
- It prepares Cash Leakage Radar, Close Autopilot, Evidence Graph, and Accountant Trust Pack.
- It can remain read-only while proving daily usage.

## What To Delay

Delay:

- Full Business Evidence Graph.
- Partner Evidence API.
- AI Copilot.
- Hard module enforcement.
- Predictive fraud scoring.
- External accountant access.
- Custom dashboard builder.
- Automatic financial posting from intelligence surfaces.

## What Should Never Be Built Unless Proven Necessary

- Disconnected mini-app dashboards that duplicate existing modules.
- Black-box staff fraud scoring.
- AI answers without citations.
- Partner exports without consent and revocation.
- Hard module enforcement without observe-mode evidence.
- Certified compliance claims without close/compliance proof.
- Heavy data warehouse work before BI contract usage proves need.

## Final Recommendation

Kontava should not execute the moat proposal as a giant feature bundle. It should execute it as a lean operating-system progression:

1. Standardize evidence-backed BI.
2. Turn BI into daily action.
3. Strengthen Owner War Room and cash control.
4. Add targeted radar/autopilot surfaces.
5. Expand into graph, accountant, compliance, partner, and AI only after the trust foundation proves value.

This path keeps the platform lean, avoids premature bloat, and creates the highest practical SMB value while preserving the moat: tenant evidence, ledger-first accounting, OHADA compliance, module intelligence, RBAC, auditability, redaction, and trusted cross-module workflows.

Blueprint ready.
