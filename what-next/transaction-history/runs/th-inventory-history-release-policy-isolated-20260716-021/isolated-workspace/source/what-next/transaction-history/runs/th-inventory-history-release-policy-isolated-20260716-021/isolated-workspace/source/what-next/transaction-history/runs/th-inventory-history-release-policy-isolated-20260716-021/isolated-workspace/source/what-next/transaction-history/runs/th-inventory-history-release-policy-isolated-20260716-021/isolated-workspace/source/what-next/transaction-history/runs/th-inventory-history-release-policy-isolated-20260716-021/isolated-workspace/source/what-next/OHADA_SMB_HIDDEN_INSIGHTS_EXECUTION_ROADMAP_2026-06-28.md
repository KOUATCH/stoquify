# OHADA SMB Hidden Insights Execution Roadmap

Source analysis: `what-next/OHADA_SMB_HIDDEN_INSIGHTS_ANALYSIS_2026-06-28.md`

## Executive Direction

Build one daily operating habit, not a collection of shiny dashboards.

The best product route is to make AqStoqFlow's first dashboard viewport answer:

> Can I trust today's business numbers, what is blocking trust, and what should each role do next?

That means the roadmap should prioritize proof-backed command elements over broad module pages. The platform already has useful foundations: dashboard read models, BI primitives, cash command, daily digest, manager action center, owner war room, stock-to-cash, payment reconciliation services, AP controls, close assurance, compliance evidence, payroll evidence, and assurance services. The execution plan below keeps those surfaces connected instead of bloating the app.

## Non-Bloat Product Rules

Use these gates before approving any new dashboard or dashboard element:

1. **It must answer a daily operating question.** If the user cannot act on it today, keep it out of the first viewport.
2. **It must have a server-owned read model.** Do not compute business truth in React components.
3. **It must show trust state.** Every meaningful number needs evidence grade, freshness, source scope, and blocker state.
4. **It must route to action.** Cards without next actions are secondary reporting, not command-center material.
5. **It must open proof.** Important claims need a proof drawer, source links, audit/event trace, or explicit unavailable reason.
6. **It must respect RBAC and redaction.** Payroll, fiscal, provider, customer, and audit data must be role-aware.
7. **It must reuse an existing route when possible.** Add subroutes or panels only when the workflow needs dedicated space.
8. **It must avoid duplicate dashboards.** Prefer one command brief plus drill-through workbenches over separate one-off dashboards.

## Global Prerequisites

Complete these before or during Phase 0. They apply to every proposal.

| Prerequisite | Why it matters | Best route |
|---|---|---|
| Confirm target environment and pilot tenant | The source report found likely seed/demo data. Production claims need a real tenant scope. | Add a `what-next` pilot note naming environment, tenant, date range, and unavailable sources. |
| Define dashboard evidence states | Prevent overclaiming "trusted" or "certified" when data is only operational. | Reuse evidence-grade language from existing BI/evidence components and services. |
| Keep tenant/RBAC/redaction boundaries explicit | The roadmap touches payroll, fiscal, provider, audit, and financial data. | Use server actions and services only; never expose raw provider/fiscal/payroll payloads to UI. |
| Establish product usage telemetry separately from audit logs | Audit logs are noisy and permission-heavy; product usage needs a different taxonomy. | Add a minimal product event plan before treating usage as evidence. |
| Choose freshness SLAs by domain | Daily command surfaces become dangerous when stale. | Define freshness thresholds for payments, AP, inventory, close, compliance, payroll, and assurance. |
| Use existing command-center primitives | Avoid UI bloat and inconsistent surfaces. | Build with `components/bi/*`, `components/dashboard/primitives/*`, and existing dashboard shell patterns. |
| Validate service-owned read models first | Prevent client-side business logic and fragile joins. | Extend `services/snapshots/*`, `services/manager-action-center/*`, `services/owner-war-room/*`, and domain services. |

## Roadmap Overview

| Phase | Proposal | Priority | Primary outcome | Create new dashboard? |
|---:|---|---|---|---|
| 0 | Command-center readiness contract | P0 | Shared evidence, freshness, action, and proof contract | No |
| 1 | Daily Business Confidence Brief | P0 | First viewport for owners/managers/accountants | No, enhance dashboard front door |
| 2 | Payment Reconciliation Proof Loop | P0 | Cash truth and settlement proof | No, strengthen finance reconciliation and cash command |
| 3 | AP Exposure and Three-Way Match Loop | P0 | Received-not-invoiced and supplier payment control | No, deepen purchases/payables |
| 4 | Close Confidence Layer | P1 | Posted ledger becomes close-ready confidence | No, deepen accounting close/control center |
| 5 | Stock-to-Cash and Count Confidence | P1 | Stock movement tied to cash and physical count proof | Minimal subroute only if needed |
| 6 | Cash Drawer and Refund Leakage Queue | P1 | Daily cashier/cash exception review | No, integrate cash command |
| 7 | Compliance and Payroll Pressure Cards | P2 | Statutory proof without bloating payroll/compliance dashboards | No, add cards and drill-throughs |
| 8 | Runtime Workflow Assurance | P2 | Static gates become owner-routed incidents | No, strengthen assurance control tower/action center |
| 9 | Offline POS Readiness | P2/P3 | Replay/conflict proof for weak-connectivity stores | Dedicated route only after pilot data exists |
| 10 | Security Posture Mini-Brief | P2 | Risky access and denied attempts visible to admins/owners | No, extend settings/security and daily brief |

## Phase 0: Command-Center Readiness Contract

**Goal:** Create the shared contract that prevents every later feature from becoming a standalone dashboard.

### Prerequisites

- Confirm pilot tenant and environment.
- Confirm the canonical evidence-grade vocabulary: raw, operational, posted, reconciled, certified, blocked.
- Confirm RBAC claims and module entitlements required for cash, AP, close, payroll, compliance, and assurance.
- Confirm redaction rules for provider references, payroll data, fiscal payloads, customer balances, and audit details.

### Best Route

1. Inspect:
   - `services/snapshots/*`
   - `services/bi/bi-evidence-adapter.service.ts`
   - `services/manager-action-center/manager-action-center.service.ts`
   - `services/owner-war-room/owner-war-room.service.ts`
   - `services/daily-habit/daily-habit-digest.service.ts`
   - `components/bi/*`
   - `components/dashboard/primitives/*`
2. Define one shared command-card contract:
   - metric label
   - value
   - scope
   - evidence grade
   - freshness
   - blockers
   - redactions
   - proof subject
   - action route
   - required permission
3. Save the contract as a short design note in `what-next/`.
4. Add tests only around pure mapping utilities or service composition; avoid UI churn.

### Useful Dashboard Elements

- Evidence-grade badge row.
- Freshness indicator.
- Blocker count.
- Redaction badge.
- Action CTA.
- Proof drawer trigger.

### Avoid

- New visual chart library.
- New dashboard shell.
- Client-side SQL-like joins.
- Generic "insights" cards without proof/action.

## Phase 1: Daily Business Confidence Brief

**Goal:** Make the main dashboard first viewport the daily trust-and-action front door.

### Prerequisites

- Phase 0 command-card contract.
- Existing dashboard read model still loads safely.
- Existing `Today's Operating Truth` model remains the style and behavior anchor.
- Payment, AP, close, stock, compliance, payroll, and security cards must support unavailable/partial states.

### Best Route

1. Extend server-side composition first:
   - `services/snapshots/tenant-operating-snapshot.service.ts`
   - `services/snapshots/payment-truth-snapshot.service.ts`
   - `services/snapshots/inventory-cash-snapshot.service.ts`
   - `services/snapshots/close-readiness-snapshot.service.ts`
   - `services/manager-action-center/manager-action-center.service.ts`
   - `services/owner-war-room/owner-war-room.service.ts`
2. Map the resulting state into existing dashboard primitives:
   - `components/dashboard/todays-operating-truth.ts`
   - `components/dashboard/EnhancedEnterpriseDashboard.tsx`
   - `components/bi/BIKpiCard.tsx`
   - `components/bi/BIActionPriorityBoard.tsx`
   - `components/bi/BIProofDrawerHost.tsx`
3. Keep the first viewport to five elements:
   - confidence header
   - KPI strip
   - urgent action queue
   - evidence/proof timeline
   - role-aware shortcuts
4. Route drill-through to existing workbenches:
   - `/dashboard/finance/cash-command`
   - `/dashboard/finance/reconciliation`
   - `/dashboard/purchases/payables`
   - `/dashboard/accounting/close`
   - `/dashboard/finance/stock-to-cash`
   - `/dashboard/compliance`
   - `/dashboard/payroll`
   - `/dashboard/settings/security`

### Useful Dashboard Elements

| Element | Why it belongs | Data source |
|---|---|---|
| Business confidence header | Gives the owner a single daily trust state | Tenant operating snapshot |
| Cash truth card | Highest daily anxiety and highest proof gap | Payment truth snapshot |
| AP exposure card | Converts receiving into working-capital risk | Purchase orders, receipts, invoices |
| Close confidence card | Prevents "posted" being mistaken for close-ready | Ledger, source links, close runs |
| Stock-to-cash card | Connects inventory movement to cash and ledger | Inventory, sales, payments, ledger |
| Urgent action queue | Turns insight into action | Manager action center and signals |
| Proof drawer | Makes trust inspectable | Evidence/source/audit/proof services |

### Success Criteria

- First viewport answers the daily trust question without scrolling.
- Every card has `ready`, `partial`, `blocked`, `stale`, or `unavailable` state.
- Every high-severity state routes to a workbench or proof drawer.
- No card claims certification without server-side evidence.

## Phase 2: Payment Reconciliation Proof Loop

**Goal:** Turn internal payments into reconciled cash truth.

### Prerequisites

- Provider account and payment rail setup.
- Statement import or provider event ingestion path.
- Idempotency and duplicate reference policy.
- Suspense and exception ownership rules.
- RBAC for provider identifiers and reconciliation approval.
- Ledger posting and close-impact behavior for payment corrections.

### Best Route

1. Start with service readiness:
   - `services/payments/provider-operations.service.ts`
   - `services/payments/provider-event.service.ts`
   - `services/payments/statement-import.service.ts`
   - `services/payments/payment-reconciliation.service.ts`
   - `services/reconciliation/payment-reconciliation-run.service.ts`
   - `services/reconciliation/payment-suspense-workflow.service.ts`
   - `services/reconciliation/payment-reconciliation-certification.service.ts`
2. Build or harden server actions for:
   - provider account setup
   - statement import
   - run reconciliation
   - propose/approve match
   - assign suspense
   - sign certificate
3. Use existing routes first:
   - `/dashboard/finance/reconciliation`
   - `/dashboard/finance/cash-command`
4. Add subroutes only after the workflow needs them:
   - `/dashboard/finance/reconciliation/runs/[runId]`
   - `/dashboard/finance/reconciliation/exceptions`
5. Feed summary state into the Daily Business Confidence Brief.

### Dashboard Elements To Add

- Cash truth card: internal collected, external matched, suspense, exceptions.
- Reconciliation freshness badge.
- Suspense aging strip.
- Certificate status.
- "Open proof" drawer for matched transaction, statement line, and ledger posting.

### Do Not Build Yet

- Broad cash analytics dashboard.
- Provider marketplace UI.
- Complex forecasting.
- Mobile-money fee optimization beyond showing fees and mismatch risk.

### Verification

- Unit tests for provider ingestion, statement import, matching, suspense, and certification services.
- Reconciliation workbench tests.
- Route smoke for `/dashboard/finance/reconciliation` and `/dashboard/finance/cash-command`.

## Phase 3: AP Exposure and Three-Way Match Loop

**Goal:** Turn received stock into controlled AP liability and payment proof.

### Prerequisites

- Confirm canonical purchase receiving path.
- Supplier invoice lifecycle must be service-owned.
- Three-way match tolerance rules must be explicit.
- Supplier bank account approval must be maker-checker.
- Supplier payments must have idempotency, approved destination, ledger posting, and evidence.
- AP data must feed close blockers and Daily Business Confidence Brief.

### Best Route

1. Use existing AP control service as the backbone:
   - `services/purchasing/ap-control.service.ts`
   - `services/purchasing/ap-control.schemas.ts`
   - `app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx`
2. Build in this order:
   - received-not-invoiced read model
   - supplier invoice create/review/post flow
   - three-way match detail
   - variance ownership queue
   - supplier payment release evidence
   - supplier bank-change queue
3. Add only narrow subroutes:
   - `/dashboard/purchases/payables/invoices`
   - `/dashboard/purchases/payables/matches`
   - `/dashboard/purchases/payables/payments`
   - `/dashboard/purchases/payables/bank-changes`
4. Feed one AP exposure card into the Daily Business Confidence Brief.

### Dashboard Elements To Add

- Received-not-invoiced amount/count.
- Three-way match exceptions.
- Supplier payment awaiting evidence.
- Bank-change approval risk.
- AP aging by SLA, not as a full accounting report yet.

### Do Not Build Yet

- Full procurement analytics suite.
- Supplier performance scorecards.
- Contract management.
- Vendor portal.

### Verification

- AP control service tests.
- Payables route smoke.
- Permission and maker-checker tests for bank changes and payment release.

## Phase 4: Close Confidence Layer

**Goal:** Make "posted" accounting visibly different from "close-ready" accounting.

### Prerequisites

- Accounting periods and fiscal year setup.
- Source links and ledger audit events populated.
- Payment reconciliation and AP exposure blockers available, even if partial.
- Close finding ownership and waiver rules.
- Close certification and invalidation rules.

### Best Route

1. Use existing close services:
   - `services/accounting/close-assurance.service.ts`
   - `services/accounting/close-assurance-pack.service.ts`
   - `services/accounting/control-center.service.ts`
   - `services/accounting/data-trust.service.ts`
2. Strengthen routes:
   - `/dashboard/accounting/close`
   - `/dashboard/accounting/close/[periodId]`
   - `/dashboard/accounting/control-center`
   - `/dashboard/accounting/accountant-portal`
3. Build close read model fields:
   - readiness score
   - evidence coverage
   - critical blockers
   - unresolved payment/AP/inventory issues
   - source-link coverage
   - certification/invalidation state
4. Feed one close confidence card into the Daily Business Confidence Brief.

### Dashboard Elements To Add

- Close readiness score.
- Critical blocker list.
- Source-link coverage.
- Evidence graph drawer.
- Close pack export status.
- Invalidation warning after close-impacting changes.

### Do Not Build Yet

- Full statutory reporting redesign.
- General ledger visualization overhaul.
- Accountant collaboration suite beyond blocker comments/reviews.

### Verification

- Close assurance service tests.
- Close pack tests.
- Route smoke for close and control center.
- Regression test that certified/close-ready labels are not shown without server evidence.

## Phase 5: Stock-to-Cash and Count Confidence

**Goal:** Show whether stock movement, sale, cash, ledger, and physical count evidence agree.

### Prerequisites

- Inventory transaction references must stay complete.
- Stock count service/action path must exist or be completed.
- Stock adjustment/write-off posting must emit evidence and close-impact events.
- Payment truth does not need to be perfect, but unavailable reconciliation must be explicit.

### Best Route

1. Extend existing service:
   - `services/stock-to-cash/stock-to-cash-flow.service.ts`
   - `services/inventory/inventory-reconciliation.service.ts`
   - `services/inventory/inventory-count.service.ts`
   - `services/inventory/inventory-adjustment.service.ts`
2. Use existing route:
   - `/dashboard/finance/stock-to-cash`
3. Add inventory subroutes only if the workflow requires real operator screens:
   - `/dashboard/inventory/counts`
   - `/dashboard/inventory/adjustments`
   - `/dashboard/inventory/reconciliation`
4. Feed one stock-to-cash card into Daily Business Confidence Brief.

### Dashboard Elements To Add

- Stock-to-cash chain status.
- Count coverage by stock value.
- Variance awaiting approval.
- Negative or stale stock indicator.
- Proof chain: receipt -> inventory transaction -> sale -> payment -> ledger.

### Do Not Build Yet

- Full inventory BI dashboard.
- Demand forecasting.
- Complex warehouse analytics.
- New item dashboards beyond existing inventory surfaces.

### Verification

- Inventory count, adjustment, reconciliation, and stock-to-cash service tests.
- Smoke for stock-to-cash route.
- Tests for blocked state when count evidence is missing.

## Phase 6: Cash Drawer and Refund Leakage Queue

**Goal:** Give managers a daily review loop for cash adjustments, refunds, and drawer anomalies.

### Prerequisites

- Drawer transactions and POS sessions available.
- Refund/void events must be auditable.
- Manager permissions and fresh-auth rules for sensitive actions.
- Redaction rules for cashier/operator details where needed.

### Best Route

1. Extend:
   - `services/cash-command/cash-command.service.ts`
   - `components/cash-command/CashCommandDashboard.tsx`
   - POS payment/refund/void services as needed
2. Use existing route:
   - `/dashboard/finance/cash-command`
3. Add a dashboard queue, not a new dashboard:
   - unusual cash-in
   - refund amount
   - drawer close mismatch
   - missing reconciliation proof
   - repeated operator corrections

### Dashboard Elements To Add

- Cash drawer risk strip.
- Refund review queue.
- Cash-in/cash-out exception list.
- Drawer proof drawer.
- Hidden-actions notice for insufficient permission.

### Do Not Build Yet

- Cashier performance leaderboard.
- Fraud scoring model.
- Advanced anomaly ML.

### Verification

- Cash command service tests.
- Cash command component tests.
- Permission behavior for hidden actions.

## Phase 7: Compliance and Payroll Pressure Cards

**Goal:** Surface statutory pressure without turning payroll/compliance into cluttered first-viewport dashboards.

### Prerequisites

- Compliance adapter state must distinguish sandbox vs production.
- Payroll data must be redacted and role-filtered.
- Declaration and payment statuses must be server-owned.
- Country-pack provenance must be visible but not overclaimed.

### Best Route

1. Compliance:
   - `services/compliance/compliance-center.service.ts`
   - `services/compliance/evidence.service.ts`
   - `/dashboard/compliance`
2. Payroll:
   - `services/payroll/command-read-model.service.ts`
   - `services/payroll/declaration-lifecycle.service.ts`
   - `services/payroll/payment-reconciliation.service.ts`
   - `/dashboard/payroll`
3. Add only compact pressure cards to Daily Business Confidence Brief:
   - fiscal submissions pending/rejected/stale
   - payroll declarations due/prepared/submitted
   - payroll payment released but not reconciled
4. Route to existing module pages for details.

### Dashboard Elements To Add

- Compliance submission status card.
- Evidence archive link.
- Payroll declaration due card.
- Payroll payment reconciliation state.
- Redaction badges.

### Do Not Build Yet

- Full country-pack administration dashboard unless compliance operations require it.
- Payroll analytics dashboard.
- Employee-level cards on owner first viewport.

### Verification

- Compliance center tests.
- Payroll command read model tests.
- Redaction and permission tests.

## Phase 8: Runtime Workflow Assurance

**Goal:** Convert static release gates into daily operational incidents and action routing.

### Prerequisites

- Define a small initial check set. Do not activate every possible gate at once.
- Define severity, owner, SLA, action route, suppression, waiver, and evidence source.
- Ensure incidents are tenant-scoped and deduplicated.

### Best Route

1. Start with three runtime checks:
   - payment reconciliation stale or missing
   - AP received-not-invoiced over SLA
   - close critical blocker unresolved
2. Use:
   - `services/assurance/assurance-registry.service.ts`
   - `services/assurance/assurance-scheduler.service.ts`
   - `services/assurance/assurance-incident.service.ts`
   - `/dashboard/assurance/control-tower`
   - `/dashboard/manager-action-center`
3. Feed only critical/high incidents into Daily Business Confidence Brief.

### Dashboard Elements To Add

- Assurance incident count.
- Oldest unresolved incident.
- Owner/SLA badge.
- Direct action route.

### Do Not Build Yet

- Massive control tower expansion.
- Cross-tenant benchmarking.
- Automated enforcement before observe-mode confidence.

### Verification

- Assurance registry/scheduler/incident tests.
- Manager action center tests.
- Incident dedupe tests.

## Phase 9: Offline POS Readiness

**Goal:** Prove that weak-connectivity stores can keep selling safely and replay later.

### Prerequisites

- Real or seeded offline device data.
- Replay certificate model populated.
- Conflict resolution workflow.
- Fiscal eligibility rules for offline sales.
- Payment reconciliation integration for replayed payments.

### Best Route

1. Do not start with a big offline dashboard.
2. First add a readiness card to cash command or manager action center:
   - devices active
   - unresolved conflicts
   - replay batches pending
   - certificate status
3. Only then build:
   - `/dashboard/pos/offline-sync`
4. Use existing POS offline services/actions/hooks where possible.

### Dashboard Elements To Add

- Offline device health.
- Pending replay count.
- Conflict queue.
- Replay certificate proof.

### Do Not Build Yet

- Complex offline operations console before device/event data exists.
- Offline analytics.
- Store network health monitoring beyond POS readiness.

### Verification

- POS offline sync service tests.
- Route smoke only after route exists.
- Proof that offline events do not bypass ledger/payment/fiscal controls.

## Phase 10: Security Posture Mini-Brief

**Goal:** Make access risk visible without bloating security into a separate operations product.

### Prerequisites

- Audit logs filtered away from noisy permission-granted events.
- Role and permission read models.
- Fresh-auth/MFA/sensitive-action rules.
- Owner/admin-only visibility.

### Best Route

1. Extend:
   - `/dashboard/settings/security`
   - `services/security/*`
   - role and audit services
2. Add one small Daily Business Confidence Brief card:
   - denied attempts
   - failed login clusters
   - locked accounts
   - risky permissions
   - pending sensitive approvals

### Dashboard Elements To Add

- Security posture card.
- Denied/failed event trend.
- Risky permission count.
- Last sensitive action proof.

### Do Not Build Yet

- Full SIEM-style dashboard.
- Threat intelligence.
- Cross-tenant admin analytics.

### Verification

- Security/redaction tests.
- Settings/security route smoke.
- Permission tests for owner/admin-only visibility.

## Recommended Dashboard Architecture

Keep the platform to these primary command surfaces:

| Surface | Role | Should contain | Should not contain |
|---|---|---|---|
| Main dashboard first viewport | Everyone, role-filtered | Daily confidence, top KPIs, urgent actions, evidence timeline | Deep tables, charts, module workbench details |
| Daily digest | Owner/manager/accountant | Morning summary and action list | Long analytics exploration |
| Owner war room | Owner | Trust-grade business truth and blocked money | Operational data entry |
| Manager action center | Manager/operator | Assigned actions and incidents | Financial statement reporting |
| Cash command | Cash operator/accountant | Cash proof, drawer risk, suspense, refunds | Generic finance metrics |
| Finance reconciliation | Accountant/cash lead | Provider matching, suspense, certificates | POS selling or AP invoice capture |
| Purchases/payables | Accountant/purchasing | AP exposure, invoices, three-way match, payments | Supplier CRM analytics |
| Accounting close/control center | Accountant/owner | Close readiness, blockers, source links, close packs | Generic dashboard charts |
| Stock-to-cash | Owner/inventory/accountant | Proof chain and stock/cash blockers | Full inventory catalog management |
| Compliance | Compliance/accountant | Fiscal submission and evidence archive | Legal rule authoring without expert review |
| Payroll | Payroll/accountant | Payroll run, declaration, payment proof | Employee-level owner cards |
| Assurance control tower | Admin/accountant/manager | Runtime incidents and waivers | Every static gate by default |

## Proposal Backlog, Ranked

| Priority | Proposal | Build now? | Reason |
|---:|---|---|---|
| P0 | Daily Business Confidence Brief | Yes | It unifies everything and creates daily habit. |
| P0 | Payment Reconciliation Proof Loop | Yes | Biggest proof gap against populated internal payments. |
| P0 | AP Exposure and Three-Way Match Loop | Yes | Clear received-not-invoiced gap and strong SMB cash impact. |
| P1 | Close Confidence Layer | Yes, after P0 starts | Ledger/source links exist; close confidence is a high-trust moat. |
| P1 | Stock-to-Cash and Count Confidence | Yes, after brief shell | Good operational data; physical count proof is missing. |
| P1 | Cash Drawer and Refund Leakage Queue | Yes, as cash-command extension | Useful daily control, low dashboard bloat. |
| P2 | Compliance Pressure Card | Yes, compact only | Important but current data is tiny/sandbox. |
| P2 | Payroll Pressure Card | Yes, compact only | Valuable but sensitive and low local data volume. |
| P2 | Runtime Workflow Assurance | Yes, limited pilot | Converts controls into work routing. |
| P2 | Security Posture Mini-Brief | Yes, compact only | Useful, but avoid SIEM bloat. |
| P3 | Offline POS Readiness | Later | Important field story, but local data is empty. |
| P3 | Customer receivables drift | Later | Useful, but less core than cash/AP/close/stock proof. |
| P3 | Supplier concentration analytics | Later | Wait until AP payments and bank data are populated. |

## Step-by-Step Execution Sequence

### Sprint 1: Contract and First Viewport Skeleton

1. Confirm pilot tenant/environment and record it in `what-next/`.
2. Define command-card contract.
3. Extend tenant operating snapshot with placeholder states for payment/AP/close/stock/compliance/payroll/security.
4. Update `Today's Operating Truth` to render the compact confidence brief.
5. Add tests for unavailable/partial/blocked states.

### Sprint 2: Payment Truth Pilot

1. Configure payment rail/provider account setup.
2. Implement or harden statement/provider ingestion.
3. Create reconciliation run summary and suspense/exception queue.
4. Feed cash truth card into Daily Business Confidence Brief.
5. Add proof drawer for reconciliation evidence.

### Sprint 3: AP Exposure Pilot

1. Build received-not-invoiced read model.
2. Add supplier invoice and three-way match workflow.
3. Add variance ownership and SLA state.
4. Feed AP exposure card into Daily Business Confidence Brief.
5. Add payables workbench drill-through.

### Sprint 4: Close Confidence

1. Generate close runs from posted/source-linked ledger state.
2. Add close blockers from payment/AP/inventory gaps.
3. Add evidence coverage and critical blocker summary.
4. Feed close confidence card into Daily Business Confidence Brief.
5. Validate no "certified" language appears without certification evidence.

### Sprint 5: Stock-to-Cash and Count Proof

1. Extend stock-to-cash flow data with physical count coverage.
2. Add stock count and variance approval workflow if missing.
3. Add count coverage and variance blockers to inventory-cash snapshot.
4. Feed stock-to-cash card into Daily Business Confidence Brief.
5. Add proof chain from receipt to ledger.

### Sprint 6: Daily Control Polish

1. Add cash drawer/refund queue to cash command.
2. Add compact compliance and payroll pressure cards.
3. Add security posture mini-card.
4. Add limited runtime assurance incidents for P0 workflows.
5. Run smoke tests and save release evidence under `what-next/`.

## Verification Commands

Use focused checks, not full-repo verification unless the touched surface is broad enough to justify it.

```powershell
npm test -- --runTestsByPath components/dashboard/__tests__/todays-operating-truth.test.ts --runInBand
npm test -- --runTestsByPath components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/bi/__tests__/bi-command-primitives.test.tsx --runInBand
npm test -- --runTestsByPath services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts --runInBand
npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts --runInBand
npm test -- --runTestsByPath services/payments/__tests__/statement-import.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/payments/__tests__/payment-reconciliation-workbench.service.test.ts --runInBand
npm test -- --runTestsByPath services/purchasing/__tests__/ap-control.service.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm test -- --runTestsByPath services/inventory/__tests__/inventory-reconciliation.service.test.ts services/inventory/__tests__/inventory-count.service.test.ts services/inventory/__tests__/inventory-adjustment.service.test.ts --runInBand
```

Route smoke checks should target only routes touched in the sprint. A protected-route redirect to login is acceptable when running without an authenticated browser session, but authenticated smoke should be added for final release gates.

## Reusable Execution Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise daily command-center architecture team:
- Senior enterprise software architect: preserve dashboard, BI, payment reconciliation, AP, close assurance, stock-to-cash, and evidence-service boundaries.
- Structural UI/UX design expert: build workflow-first, role-aware, ergonomic command surfaces only after service-owned read models and state contracts exist.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, maker-checker where appropriate, audit trails, redaction, and safe error handling.
- Business logic expert: protect correctness, traceability, approval history, source-of-truth records, evidence links, and lifecycle state transitions.
- Enterprise finance and controls expert: ensure every dashboard element integrates correctly with ledger posting, reconciliation, close assurance, control evidence, approval flows, and release gates where applicable.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, accounting, and regulatory configuration separated from code. Require expert-reviewed provenance where legal or accounting rules are involved.
- SaaS modularity specialist: ensure every element is module-entitled, tenant-safe, scalable, observable, and not implemented as a standalone dashboard-only feature.

Mission:

Execute the next phase from `what-next/OHADA_SMB_HIDDEN_INSIGHTS_EXECUTION_ROADMAP_2026-06-28.md` for `E:\ohada saas\newStockFlow\aqstoqflow`.

Rules:

- Inspect the roadmap, source hidden-insights analysis, related services, routes, components, tests, and graphify output first.
- Keep changes surgical and phase-scoped.
- Prefer service-owned read models before UI.
- Use existing dashboard/BI primitives and command surfaces.
- Do not create a new dashboard unless the roadmap explicitly allows it.
- Preserve tenant isolation, RBAC, redaction, payroll privacy, provider evidence, fiscal data sensitivity, and module entitlement.
- Separate confirmed data from unavailable, partial, stale, or hypothetical states.
- Save implementation notes and verification output under `what-next/`.

Expected artifacts:

- Code changes only for the selected phase.
- Focused tests for touched services/components/routes.
- A short saved run report under `what-next/`.
- Clear unresolved blockers with source paths and next action.

Success criteria:

- The selected phase produces a useful daily command element or workbench improvement.
- Every metric has evidence grade, freshness, blockers, and route/proof behavior.
- No platform bloat: no duplicated dashboard shell, no broad unrelated refactors, no generic cards without actions.
- Verification commands pass or blockers are documented with exact failure context.

