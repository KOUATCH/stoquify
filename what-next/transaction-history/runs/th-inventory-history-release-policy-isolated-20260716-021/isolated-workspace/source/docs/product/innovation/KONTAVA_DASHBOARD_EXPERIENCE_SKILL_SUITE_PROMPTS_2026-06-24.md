# Kontava Dashboard Experience Skill Suite Prompts

Date: 2026-06-24  
Primary source: `innovation/KONTAVA_DASHBOARD_EXPERIENCE_EXECUTION_BLUEPRINT_2026-06-22.md`  
Purpose: convert the dashboard experience blueprint into an ordered suite of SKILL.md-ready implementation prompts with prerequisite gates, anti-bloat controls, and single-source-of-truth enforcement.

## Executive Verdict

Use a staged skill suite. Do not install or execute all dashboard work as one broad redesign. The blueprint becomes safe and valuable only when every skill treats dashboards as command surfaces over trusted system truth, not as new sources of truth.

The suite should be executed in this order:

1. `kontava-bi-command-foundation`
2. `kontava-bi-command-primitives`
3. `kontava-owner-morning-brief`
4. `kontava-manager-daily-run-sheet`
5. `kontava-cash-truth-map`
6. `kontava-business-pulse-analytics`
7. `kontava-proof-evidence-timeline`
8. `kontava-stock-to-cash-flow-view`
9. `kontava-close-readiness-journey`
10. `kontava-daily-habit-digest`
11. `kontava-dashboard-release-gates`

Each skill must run its prerequisite gate first. If a gate fails, the skill must stop and write a blocker report instead of forcing implementation.

## Suite-Wide Single Source Of Truth Contract

Dashboards must render trusted system truth. They must not invent or duplicate it.

Ownership boundaries:

- `services/snapshots/**` owns snapshot and read-model truth.
- `services/accounting/**` owns ledger, close, posting, export, and accounting truth.
- `services/evidence/**` owns proof, evidence, evidence grade, and proof trail truth.
- `services/signals/**` owns business signals, action queues, urgency, and suggested actions.
- `services/modules/**` owns module entitlement and observe/enforce state.
- `services/security/**` owns RBAC, redaction, audit, and safe access guardrails.
- `services/bi/**` owns shared BI command contracts, state vocabulary, and normalizers.
- `components/bi/**` owns reusable command UI primitives.
- Dashboard routes and dashboard components render server-provided command data only.

Hard prohibitions:

- Do not compute business truth in client components.
- Do not add dashboard-specific duplicate metrics when a source service already owns the fact.
- Do not create parallel dashboard-only services that bypass snapshots, evidence, signals, modules, security, accounting, or domain services.
- Do not create one-off UI systems per dashboard.
- Do not duplicate BI primitives with slightly different names or behavior.
- Do not add decorative dashboard effects without decision value.
- Do not add AI narration before proof, redaction, and audit maturity.
- Do not persist digest/review state before read-only value is proven.
- Do not add new data warehouses or broad schema changes unless a prerequisite gate proves they are needed.
- Do not add workflow automation before read-only command surfaces are stable.

## Universal Prerequisite Gate

Every skill must perform this gate before implementation:

1. Inspect the primary source blueprint and the current code paths listed by the skill.
2. Confirm that prerequisite skills are already implemented or explicitly not needed because equivalent code exists.
3. Identify the source-of-truth owner for every metric, status, action, proof link, redaction, permission, and module state the skill will touch.
4. Confirm no duplicate component, contract, service, route, snapshot, proof subject, or action queue already exists under another name.
5. Confirm the implementation can remain read-only unless the skill explicitly requires a mutation and names the existing mutation boundary.
6. Confirm tests exist or define focused tests before changing product behavior.
7. If any condition fails, stop and create a blocker report with: blocker, affected phase, missing prerequisite, source files inspected, recommended remediation, and safe next skill.

## Skill Manifest

| Order | Skill | Purpose | Depends On | Prerequisite Gate | Main Output | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `kontava-bi-command-foundation` | Shared command contracts and normalizers | None | Current BI/snapshot/signal/evidence/module contracts understood | `services/bi/**` contract additions | Typecheck, lint, focused BI tests |
| 2 | `kontava-bi-command-primitives` | Shared command UI primitives | Skill 1 | Contracts stable, dashboard tokens verified | `components/bi/**` primitives | Component tests, typecheck, lint |
| 3 | `kontava-owner-morning-brief` | Owner War Room as flagship command surface | Skills 1-2 | Owner data sources verified | Owner War Room service/UI recomposition | Owner service/component tests, route check |
| 4 | `kontava-manager-daily-run-sheet` | Manager action-first daily run sheet | Skills 1-2 | Action queue and assurance incident sources verified | Manager Action Center service/UI recomposition | Manager/action queue tests, route check |
| 5 | `kontava-cash-truth-map` | Finance cash trust command surface | Skills 1-2, partial 3 | Payment truth and reconciliation sources verified | Cash truth map/read-only cash command | Payment/reconciliation/cash tests |
| 6 | `kontava-business-pulse-analytics` | Analytics as movement/risk/proof/action surface | Skills 1-2 | Analytics source services verified | Analytics command first viewport | Analytics tests, route check |
| 7 | `kontava-proof-evidence-timeline` | Safe proof subject and timeline expansion | Skills 1-2, domain prerequisites | Proof access, RBAC, redaction verified per domain | Proof builders/timeline components | Proof/evidence/redaction tests |
| 8 | `kontava-stock-to-cash-flow-view` | Read-only inventory-to-cash flow | Skills 1-2, 7 where proof is used | Inventory, PO, POS, payment, ledger links verified | Flow contracts/adapters/UI | Inventory/PO/payment/source-link tests |
| 9 | `kontava-close-readiness-journey` | Close and assurance journey surface | Skills 1-2, 7 | Close, accounting, assurance proof sources verified | Close journey UI/read model mapping | Close/assurance tests |
| 10 | `kontava-daily-habit-digest` | Read-only role-specific daily/weekly digests | Skills 1-6, 9 | Review value proven; redaction safe | Digest contracts and read-only panels | Signal/digest/redaction tests |
| 11 | `kontava-dashboard-release-gates` | Verify every dashboard command phase | Any phase | Touched phase identified | Release readiness report | Typecheck, lint, focused tests, route/security checks |

## Suite Prompts

The following prompts are SKILL.md-ready source material. When converting each prompt into an installed skill, keep the final SKILL.md concise and move long checklists into references if needed.

### 1. `kontava-bi-command-foundation`

```markdown
---
name: kontava-bi-command-foundation
description: Establish shared Kontava BI command contracts, state vocabulary, normalizers, and single-source-of-truth guardrails before dashboard redesigns. Use when adding or changing command dashboard contracts, dashboard truth semantics, BI normalizers, review state, digest contracts, flow steps, risk ranks, or proof drawer subjects.
---

# Kontava BI Command Foundation

## Mission

Establish the shared BI command contract foundation for Kontava's Daily Command Environment before any page redesign. Dashboards must render trusted server-side truth, not create their own truth.

## Required Inspection

Inspect:

- `innovation/KONTAVA_DASHBOARD_EXPERIENCE_EXECUTION_BLUEPRINT_2026-06-22.md`
- `services/bi/**`
- `services/snapshots/**`
- `services/signals/**`
- `services/evidence/**`
- `services/modules/**`
- `services/security/**`
- `components/bi/**`

## Prerequisite Gate

Before implementation:

1. Inventory existing BI contracts and normalizers.
2. Confirm existing fields for evidence grade, trust state, freshness, provenance, blockers, redactions, tenant scope, permissions, module entitlement, and action links.
3. Confirm each proposed contract maps to an existing source-of-truth owner.
4. Search for duplicate or near-duplicate command contracts.
5. If duplication or unclear ownership exists, stop and write a blocker report.

## Implementation Scope

Add or refine contract-only TypeScript types for:

- `BICommandBrief`
- `BICommandMode`
- `BICommandZone`
- `BICommandSection`
- `BIChangeEvent`
- `BIReviewState`
- `BIDailyDigest`
- `BIFlowStep`
- `BIRiskRank`
- `BIProofDrawerSubject`

Add lightweight normalizers only when they reuse existing BI, snapshot, signal, evidence, module, or security contracts.

## Single Source Rules

- Source facts from existing services and snapshots.
- Preserve existing `BIKpiCard`, `BIInsight`, `BIFreshness`, `BIProvenance`, `BIDrillThrough`, `BIActionLink`, evidence grade, trust state, blockers, redactions, tenant scope, RBAC, module entitlement, and ledger-first semantics.
- Do not add page-specific metrics to `services/bi/**`.
- Do not add dashboard-owned business logic.

## Anti-Bloat Rules

- Do not redesign pages.
- Do not add database migrations.
- Do not create a BI warehouse.
- Do not add a contract unless at least two command surfaces can reuse it or the blueprint requires it as a shared foundation.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Focused BI contract/normalizer tests

## Completion Criteria

Complete only when shared command contracts compile, preserve existing consumers, have focused tests, and can be used by Owner War Room and Manager Action Center without page-specific special cases.
```

### 2. `kontava-bi-command-primitives`

```markdown
---
name: kontava-bi-command-primitives
description: Build reusable Kontava BI command dashboard UI primitives using existing theme semantics and server-provided command contracts. Use when creating or changing shared dashboard command components, proof drawer hosts, state surfaces, command headers, action boards, risk radars, or truth zones.
---

# Kontava BI Command Primitives

## Mission

Build reusable, enterprise-grade BI command UI primitives that make Kontava dashboards action-first, evidence-backed, and visually consistent without creating a new visual system.

## Required Inspection

Inspect:

- `components/bi/**`
- `services/bi/**`
- `components/evidence/ProofTrailDrawer.tsx`
- `components/finance/finance-dashboard-theme.ts`
- `app/globals.css`
- Existing Owner War Room, Manager Action Center, and Cash Command dashboards if present

## Prerequisite Gate

Before implementation:

1. Confirm `kontava-bi-command-foundation` is complete or equivalent contracts already exist.
2. Confirm dashboard theme tokens exist and should be reused.
3. Confirm no existing BI primitive already solves the requested surface.
4. Confirm every component receives trust, freshness, redaction, evidence, permission, and module state from server-provided data.
5. If any UI would compute business truth on the client, stop and write a blocker report.

## Implementation Scope

Create or refine reusable components such as:

- `BICommandBriefHeader`
- `BICommandModeTabs`
- `BIWhatChangedStrip`
- `BIActionPriorityBoard`
- `BIBusinessTruthZone`
- `BIRiskOpportunityRadar`
- `BIProofDrawerHost`
- `BITrustLegend`
- `BIStateSurface`

## Single Source Rules

- Components render command data only.
- Components may format and arrange data, but must not calculate business truth.
- Proof drawer access must respect server-side subject availability.
- Redacted, permission-denied, stale, partial, blocked, and module-unavailable states must be explicit.

## Anti-Bloat Rules

- Do not create page-specific copies of shared components.
- Do not introduce decorative dashboard effects.
- Do not use cards inside cards or oversized marketing hero layouts.
- Preserve text fit and responsive density.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Focused component tests for all primitives

## Completion Criteria

Complete only when primitives can be adopted by Owner War Room and Manager Action Center without special-case UI and all safe states render consistently.
```

### 3. `kontava-owner-morning-brief`

```markdown
---
name: kontava-owner-morning-brief
description: Recompose Kontava Owner War Room into the flagship Owner Morning Brief command surface. Use when changing owner war room services, contracts, actions, first viewport UX, owner risks, proof access, action priorities, or business truth zones.
---

# Kontava Owner Morning Brief

## Mission

Transform Owner War Room into Kontava's flagship owner command surface while preserving read-only, evidence-backed, permission-filtered behavior.

## Required Inspection

Inspect:

- `components/owner-war-room/**`
- `services/owner-war-room/**`
- `actions/owner-war-room/**`
- `components/bi/**`
- `services/bi/**`
- `services/snapshots/**`
- `services/signals/**`
- `services/modules/**`
- `services/evidence/**`
- `services/security/**`
- `config/sidebar.ts`

## Prerequisite Gate

Before implementation:

1. Confirm BI command contracts and primitives exist.
2. Confirm owner facts come from tenant operating, payment truth, inventory cash, close readiness, module control, proof subjects, and action queue sources.
3. Confirm all owner actions use existing action links and permissions.
4. Confirm no owner-specific metric duplicates snapshot or service truth.
5. Confirm proof subjects are available or have safe unavailable states.
6. If any owner truth lacks a source owner, stop and write a blocker report.

## Implementation Scope

Add or refine:

- Command brief
- Top owner risks
- What changed strip
- Action priority board
- Business truth zones
- Contextual proof drawer access
- Explicit stale, blocked, partial, redacted, permission-denied, and module-unavailable states

## Single Source Rules

- Owner War Room composes source services; it does not own cross-module truth.
- Keep snapshots and action queue as source inputs.
- Keep proof access in evidence services/actions.
- Keep module observe/enforce state in module services.

## Anti-Bloat Rules

- Do not add mutations from Owner War Room in MVP.
- Do not add AI narration.
- Do not build a full evidence graph or branch map in MVP.
- Do not duplicate Cash Command, Manager Action Center, or Close Journey surfaces.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Owner War Room service tests
- Owner War Room component tests
- Manual route check: `/en/dashboard/owner-war-room`

## Completion Criteria

Complete only when the first viewport tells the owner what changed, what matters, what is risky, what is proven, and what to do next.
```

### 4. `kontava-manager-daily-run-sheet`

```markdown
---
name: kontava-manager-daily-run-sheet
description: Recompose Kontava Manager Action Center into an action-first daily run sheet. Use when changing manager action center data, urgency groups, action queue presentation, assurance incident blending, due-state logic, or manager dashboard UX.
---

# Kontava Manager Daily Run Sheet

## Mission

Turn Manager Action Center into a daily operational run sheet that prioritizes work managers can act on today.

## Required Inspection

Inspect:

- `components/manager-action-center/**`
- `services/manager-action-center/**`
- `actions/manager-action-center/**`
- `services/signals/**`
- `services/assurance/**`
- `components/bi/**`
- `services/bi/**`
- `services/security/**`

## Prerequisite Gate

Before implementation:

1. Confirm BI command contracts and primitives exist.
2. Confirm action queue, due state, assignment, severity, blockers, and assurance incident sources.
3. Confirm server-side permission filtering already protects manager actions.
4. Confirm urgency groups can be derived without client-computed truth.
5. If priority, permission, or source ownership is unclear, stop and write a blocker report.

## Implementation Scope

Add or refine:

- Manager command brief
- Urgency groups: overdue, critical, due today, blocked, waiting, assigned, routine
- Action priority board above generic KPIs
- Assurance incident blending
- Evidence, freshness, redaction, blocker, and module state display

## Single Source Rules

- Manager UI renders action queue and assurance service truth.
- Do not compute permission-filtered actions on the client.
- Preserve action routes and required permissions.

## Anti-Bloat Rules

- Do not create a separate manager task system.
- Do not duplicate Owner Morning Brief or Cash Command components.
- Do not add manager mutations outside existing action boundaries.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Manager Action Center tests
- Action queue tests
- Manual route check: `/en/dashboard/manager-action-center`

## Completion Criteria

Complete only when managers see a daily run sheet with correct priority, trust, proof, redaction, and next action.
```

### 5. `kontava-cash-truth-map`

```markdown
---
name: kontava-cash-truth-map
description: Build read-only Cash Truth Map and Cash Command surfaces from payment truth, reconciliation, cash drawer, close, and ledger sources. Use when changing finance cash confidence, payment truth, reconciliation command views, suspense visibility, or cash proof links.
---

# Kontava Cash Truth Map

## Mission

Implement a read-only, evidence-backed cash command surface for finance, reconciliation, and owner cash confidence.

## Required Inspection

Inspect:

- `components/finance/**`
- `app/[locale]/(dashboard)/dashboard/finance/**`
- `components/cash-command/**`
- `services/cash-command/**`
- `services/finance/**`
- `services/snapshots/payment-truth-snapshot.service.ts`
- `services/reconciliation/**`
- `services/payments/**`
- `services/pos/drawer-dashboard.service.ts`
- `actions/payments/**`
- `components/bi/**`
- `services/evidence/**`

## Prerequisite Gate

Before implementation:

1. Confirm BI command contracts and primitives exist.
2. Confirm payment truth snapshot is the source for suspense, reconciliation, and payment trust state.
3. Confirm cash drawer service is the source for drawer confidence and variance.
4. Confirm ledger/close proof links exist or render unavailable proof states.
5. Confirm every action link uses existing routes and permissions.
6. If cash facts require new provider adapters or untrusted joins, stop and write a blocker report.

## Implementation Scope

Build or refine:

- Cash collected to pending, suspense, exception, reconciled, posted, certified flow
- Suspense aging and provider risk visibility
- Drawer confidence and variance risk
- Cash action board
- Cash proof links where subjects exist

## Single Source Rules

- Payment truth comes from payment truth snapshots.
- Reconciliation state comes from reconciliation services.
- Drawer state comes from cash drawer services.
- Ledger proof comes from accounting/evidence source links.

## Anti-Bloat Rules

- Do not add new provider adapters in MVP.
- Do not add partner APIs.
- Do not add automated resolution.
- Do not duplicate payment reconciliation workbench behavior.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Payment truth snapshot tests
- Reconciliation tests
- Payment workbench tests
- Cash Command service/component tests when present

## Completion Criteria

Complete only when finance users can see how much cash is trusted, what blocks trust, and which existing workflow resolves the blocker.
```

### 6. `kontava-business-pulse-analytics`

```markdown
---
name: kontava-business-pulse-analytics
description: Reframe Kontava analytics from generic KPI charts into a Business Pulse command surface centered on movement, risk, proof, freshness, and action. Use when changing analytics dashboards, analytics BI cards, sales pulse views, or analytics first viewport UX.
---

# Kontava Business Pulse Analytics

## Mission

Transform analytics from a conventional KPI/chart page into a Business Pulse command surface.

## Required Inspection

Inspect:

- `app/[locale]/(dashboard)/dashboard/analytics/**`
- `components/analytics/**`
- `actions/analytics/**`
- `services/analytics/**`
- `components/bi/**`
- `services/bi/**`
- `services/snapshots/**`
- `services/signals/**`

## Prerequisite Gate

Before implementation:

1. Confirm BI command contracts and primitives exist.
2. Confirm analytics metrics map to existing analytics services or snapshots.
3. Confirm freshness, evidence, and source provenance can be shown honestly.
4. Confirm charts can move into command or investigate sections without losing existing behavior.
5. If analytics facts are demo-only, hard-coded, or client-computed, stop and write a blocker report.

## Implementation Scope

Add or refine:

- Command brief
- What changed strip
- Risk and opportunity radar
- Evidence and freshness labels
- Command/investigate sections for charts, top products, cashier performance, quick actions, alerts, and transactions

## Single Source Rules

- Analytics services own analytics metrics.
- BI components render movement and trust state.
- Do not create duplicate sales or finance calculations in UI.

## Anti-Bloat Rules

- Do not add predictive analytics.
- Do not add AI insights.
- Do not add decorative charts.
- Do not add hard-coded goals or demo data.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Focused analytics tests
- Manual route check: `/en/dashboard/analytics`

## Completion Criteria

Complete only when analytics starts with movement, risk, proof, and action instead of ordinary metric cards.
```

### 7. `kontava-proof-evidence-timeline`

```markdown
---
name: kontava-proof-evidence-timeline
description: Safely expand Kontava proof subjects and evidence timeline usage for command dashboards one domain at a time. Use when adding proof drawer subjects, proof builders, evidence timeline components, source-link proof, or BI proof drill-through.
---

# Kontava Proof Evidence Timeline

## Mission

Expand proof drawer and evidence timeline capabilities so serious KPIs, signals, actions, and flow steps can drill into proof safely.

## Required Inspection

Inspect:

- `services/evidence/**`
- `actions/evidence/**`
- `components/evidence/**`
- `components/bi/**`
- `services/accounting/source-link.service.ts`
- `services/events/business-event.service.ts`
- `services/security/**`
- Domain services for the proposed proof subject

## Prerequisite Gate

Before implementation:

1. Pick exactly one proof domain for the slice.
2. Confirm subject type, subject id, source tables, required permission, redaction policy, audit behavior, and tenant isolation.
3. Confirm direct access denial tests can be written before enabling UI access.
4. Confirm dashboard surfaces can show unavailable proof states safely.
5. If proof ownership, permission, or redaction is unclear, stop and write a blocker report.

## Implementation Scope

Add proof subjects incrementally, starting with high-value domains such as:

- Payment transaction
- Suspense item
- Purchase order
- Stock movement
- Assurance incident

Add proof builders and timeline components only as needed by the active domain.

## Single Source Rules

- Evidence services own proof truth.
- Domain services own source record truth.
- Security services own access/redaction.
- BI surfaces only open approved proof subjects.

## Anti-Bloat Rules

- Do not build a full graph UI.
- Do not build partner APIs.
- Do not add AI explanation layers.
- Do not expand multiple proof domains in one slice.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Proof trail tests
- Evidence action tests
- Redaction tests
- Direct access denial tests

## Completion Criteria

Complete only when the new proof subject can be opened safely from command dashboards while preserving tenant, RBAC, redaction, and audit rules.
```

### 8. `kontava-stock-to-cash-flow-view`

```markdown
---
name: kontava-stock-to-cash-flow-view
description: Build a read-only Stock-to-Cash Flow View using existing inventory, purchasing, POS, payment, reconciliation, and ledger source links. Use when connecting stock, purchase orders, receiving, POS sales, payments, reconciliation, and ledger posting into BI flow surfaces.
---

# Kontava Stock-To-Cash Flow View

## Mission

Implement a read-only flow view that explains where money is trapped across purchasing, receiving, inventory, POS sales, payments, reconciliation, and ledger posting.

## Required Inspection

Inspect:

- `services/snapshots/inventory-cash-snapshot.service.ts`
- `services/inventory/**`
- `services/purchase-order/**`
- `services/purchasing/**`
- `services/pos/**`
- `services/payments/**`
- `services/reconciliation/**`
- `services/accounting/source-link.service.ts`
- `components/bi/**`

## Prerequisite Gate

Before implementation:

1. Confirm BI command contracts and primitives exist.
2. Confirm inventory cash snapshot exists and is trustworthy for inventory value/exposure.
3. Confirm purchase order, receiving, POS, payment, reconciliation, and ledger links can be represented without inventing source facts.
4. Confirm proof links exist only where evidence subjects are supported.
5. If end-to-end links are incomplete, build only a partial flow with explicit unavailable states or stop with a blocker report.

## Implementation Scope

Start with:

- `BIFlowStep`-based read-only contracts
- Source adapters that map existing service outputs to flow steps
- Flow UI using existing BI primitives
- Proof drill-through only where supported

## Single Source Rules

- Inventory services own stock truth.
- Purchasing/PO services own procurement truth.
- POS services own sale truth.
- Payments/reconciliation services own payment truth.
- Accounting source links own ledger trace truth.

## Anti-Bloat Rules

- Do not build forecasting.
- Do not build automated replenishment.
- Do not build a full digital twin.
- Do not duplicate module source data.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Inventory snapshot tests
- Inventory event tests
- Purchase order tests
- Payment/reconciliation/source-link tests where touched

## Completion Criteria

Complete only when the view explains stock cash exposure with evidence, blockers, and honest source trust without duplicating module data.
```

### 9. `kontava-close-readiness-journey`

```markdown
---
name: kontava-close-readiness-journey
description: Reframe accounting, close assurance, and assurance control surfaces as a Close Readiness Journey with evidence grades, blockers, proof links, redactions, and next actions. Use when changing close readiness, accounting control, accountant portal, assurance control tower, or close command UX.
---

# Kontava Close Readiness Journey

## Mission

Reframe accounting, close assurance, and workflow assurance as a journey from operational source data to reconciled cash, posted ledger, close findings, certification, and safe export.

## Required Inspection

Inspect:

- `components/accounting/**`
- `components/assurance/**`
- `services/accounting/**`
- `services/assurance/**`
- `actions/accounting/**`
- `actions/assurance/**`
- `components/bi/**`
- `services/evidence/**`
- `services/security/**`

## Prerequisite Gate

Before implementation:

1. Confirm BI command contracts and primitives exist.
2. Confirm close readiness, accounting control, assurance incident, certification, and export safety sources.
3. Confirm proof links and unavailable proof states for close/ledger/assurance domains.
4. Confirm sensitive actions remain protected by existing server actions and permissions.
5. If close readiness lacks trusted source data, stop and write a blocker report.

## Implementation Scope

Add or refine journey checkpoints for:

- Operational readiness
- Reconciliation proof
- Ledger posting
- Close findings
- Certification
- Export readiness

Preserve existing checklists in investigate mode.

## Single Source Rules

- Accounting services own ledger and close truth.
- Assurance services own assurance incident truth.
- Evidence services own proof truth.
- BI components render journey state only.

## Anti-Bloat Rules

- Do not add auto-close mutation workflows.
- Do not add broad compliance radar in MVP.
- Do not bypass sensitive action controls.
- Do not duplicate accounting control center logic.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Close assurance tests
- Accounting control tests
- Assurance control tower tests
- Redaction/proof tests where touched

## Completion Criteria

Complete only when users understand what blocks certified close and how to resolve it without weakening OHADA, ledger, audit, or export safety.
```

### 10. `kontava-daily-habit-digest`

```markdown
---
name: kontava-daily-habit-digest
description: Build read-only role-specific daily and weekly digest surfaces after command dashboards prove useful. Use when adding owner, manager, finance, accountant, stockkeeper, end-of-day, or weekly digest panels, review state, or digest notification readiness.
---

# Kontava Daily Habit Digest

## Mission

Make Kontava a daily go-to platform by building read-only, role-specific digest surfaces before automation.

## Required Inspection

Inspect:

- `services/bi/**`
- `services/signals/**`
- `services/snapshots/**`
- `services/signals/signal-notification.service.ts`
- `components/notifications/**`
- `components/bi/**`
- Implemented Owner, Manager, Cash, Analytics, Close command surfaces

## Prerequisite Gate

Before implementation:

1. Confirm Owner Morning Brief, Manager Daily Run Sheet, and Cash Truth Map are stable or explicitly out of scope.
2. Confirm digest content can be derived from existing snapshots, signals, and command briefs.
3. Confirm no persistent review state is needed for the first slice.
4. Confirm redaction and notification safety for every role.
5. If digest value is not proven by read-only command surfaces, stop and write a blocker report.

## Implementation Scope

Add or refine:

- `BIReviewState` and `BIDailyDigest` contracts
- Read-only owner morning digest
- Manager run sheet summary
- Finance cash truth review
- Accountant close readiness review
- Stockkeeper stock-risk review
- End-of-day pulse
- Weekly digest panel

## Single Source Rules

- Digest content composes existing command/snapshot/signal data.
- Digest panels do not create new business truth.
- Notification routing remains separate until redaction-safe.

## Anti-Bloat Rules

- Do not add email automation in the first slice.
- Do not add AI commentary.
- Do not persist review state unless explicitly justified by proven usage.
- Do not create separate digest-specific metrics.

## Tests

Run:

- `npm run typecheck`
- `npm run lint`
- Signal notification tests
- Digest contract/component tests
- Redaction and permission tests

## Completion Criteria

Complete only when each role can return daily to a useful, safe, evidence-backed summary without new duplicated truth or noisy automation.
```

### 11. `kontava-dashboard-release-gates`

```markdown
---
name: kontava-dashboard-release-gates
description: Verify and harden each Kontava dashboard command phase before release. Use before merging or releasing dashboard command contracts, BI primitives, Owner Morning Brief, Manager Daily Run Sheet, Cash Truth Map, Business Pulse Analytics, proof timelines, stock-to-cash, close journey, or digest surfaces.
---

# Kontava Dashboard Release Gates

## Mission

Verify and harden every Kontava dashboard command phase before release.

## Required Inspection

Inspect:

- `scripts/kontava-moat-release-gate.js`
- `scripts/workflow-assurance-release-gate.js`
- `package.json`
- Touched service/action/component tests
- Relevant dashboard routes and server actions
- Relevant security, proof, redaction, and module entitlement files

## Prerequisite Gate

Before verification:

1. Identify the exact dashboard phase under review.
2. Identify touched source files and affected source-of-truth owners.
3. Confirm expected test suites and route checks.
4. Confirm rollback strategy or feature flag/observe-mode strategy.
5. If scope is unclear, stop and write a blocker report.

## Verification Scope

Run the narrowest complete release gate for the phase:

- Typecheck
- Lint
- Focused service tests
- Focused action tests
- Focused component tests
- Proof/redaction/module entitlement checks
- Route checks
- Screenshot checks where available
- Release gate scripts where applicable

## Single Source Rules

- Verify dashboards consume trusted service outputs.
- Verify direct URL, API, server action, export, and proof drawer access is protected server-side.
- Verify redaction and module entitlement states are rendered, not bypassed.

## Anti-Bloat Rules

- Do not broaden the release gate into unrelated refactors.
- Do not remove legacy dashboard layouts without staged approval.
- Do not hide blockers by skipping tests.

## Output

Produce a saved release readiness report with:

- Phase reviewed
- Files inspected
- Tests run
- Pass/fail status
- Blockers
- Bloat/repetition risks
- Single-source-of-truth risks
- Security/redaction/module risks
- Rollback guidance
- Recommended next phase

## Completion Criteria

Complete only when the phase is either release-ready or clearly blocked with exact remediation steps.
```

## Bloat And Repetition Risk Matrix

| Risk | Severity | Where It Can Appear | Prevention |
| --- | --- | --- | --- |
| Dashboard-specific truth | Critical | Owner, manager, finance, analytics recompositions | Require source-owner mapping before implementation |
| Duplicate BI components | High | Command headers, action boards, proof hosts, state surfaces | Reuse `components/bi/**`; block one-off primitives |
| Duplicate metrics | High | Analytics, cash, owner, stock-to-cash | Use services/snapshots/domain services only |
| Client-computed permissions | Critical | Proof buttons, action links, role views | Server-side permission filtering only |
| Redaction leaks | Critical | Payroll, supplier, payments, proof drawers | Redaction tests and explicit safe states |
| Decorative redesign | Medium | Analytics, owner first viewport, future digests | Require decision value for every visual element |
| Premature persistence | Medium | Daily digest/review state | Read-only MVP first |
| Too many proof subjects | High | Evidence timeline expansion | One domain at a time |
| Cross-module joins bypass snapshots | High | Stock-to-cash and cash truth | Prefer snapshots/source links; mark unavailable where incomplete |
| Broad automation too early | High | Cash resolution, close, digest notifications | Keep MVP read-only and action-linked |

## Single-Source Enforcement Checklist

Before each phase merges:

- [ ] Every displayed fact has a named source owner.
- [ ] No business truth is computed in a client component.
- [ ] No duplicated metric service was added under a dashboard folder.
- [ ] Existing BI contracts/primitives were reused where possible.
- [ ] Snapshot/source-link/proof/freshness state is preserved.
- [ ] RBAC and module entitlement are enforced server-side.
- [ ] Redactions are preserved and visible.
- [ ] Proof subjects are unavailable-safe when unsupported.
- [ ] Action links point to existing workflows and permissions.
- [ ] Tests cover stale, partial, blocked, redacted, permission-denied, and module-unavailable states where relevant.

## Blocker Report Format

When a prerequisite gate fails, the skill must stop and write:

```markdown
# Dashboard Command Skill Blocker Report

Skill:
Phase:
Date:

## Blocker

## Why Implementation Stopped

## Source Files Inspected

## Missing Prerequisite

## Single-Source-Of-Truth Risk

## Bloat Or Repetition Risk

## Safe Remediation

## Recommended Next Skill
```

## Recommended Execution Policy

Execute one skill at a time. After each skill, run `kontava-dashboard-release-gates` for that phase before moving forward. If a phase is already implemented, the skill should verify it and produce a short pass/blocker report rather than rewriting it.

The suite should make Kontava feel like a daily business command center while keeping one trusted system truth as the implementation spine.
