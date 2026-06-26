# Kontava Dashboard Experience Innovation Run Report

Date: 2026-06-22  
Skill run: `dashboard-experience-innovation`  
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Executive Summary

Yes, these dashboard experience ideas can be applied to Kontava from the first serious BI screen. The best path is not to create prettier metric dashboards, but to reframe Kontava's BI surfaces as a daily business command environment: a place where owners and managers immediately see what changed, what matters, what is risky, what is proven, and what to do next.

Kontava already has unusually strong foundations for this direction:

- BI contracts in `services/bi/**`.
- KPI, evidence, empty-state, and state badge primitives in `components/bi/**`.
- Snapshot/read-model foundations in `services/snapshots/**`.
- Business signals and action queue services in `services/signals/**`.
- Proof-trail, evidence-grade, redaction, RBAC, and module entitlement concepts.
- Owner War Room and Manager Action Center routes already built as read-only, permission-filtered, evidence-backed control surfaces.
- Shared dashboard color semantics through `dashboard-landing-theme`, `dashboard-glass-panel`, and `--dash-*` CSS tokens in `app/globals.css`.

The current implementation is already more mature than a normal SMB dashboard, but the experience still often begins with familiar KPI cards, summary tiles, and lists. The next leap should be an information-architecture change: start every major BI surface with a decision narrative, then let the user drill into evidence, actions, flows, and raw data.

## Source Areas Inspected

Primary files inspected during this run:

- `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `services/owner-war-room/owner-war-room-contracts.ts`
- `services/owner-war-room/owner-war-room.service.ts`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx`
- `components/manager-action-center/ManagerActionCenterDashboard.tsx`
- `services/manager-action-center/manager-action-center-contracts.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- `services/bi/bi-contracts.ts`
- `services/bi/bi-evidence-adapter.service.ts`
- `components/bi/BIKpiCard.tsx`
- `components/bi/BIEvidenceBadgeRow.tsx`
- `components/bi/BIStateBadge.tsx`
- `services/snapshots/snapshot-contracts.ts`
- `services/signals/business-signal-contracts.ts`
- `services/signals/action-queue.service.ts`
- `services/evidence/evidence-contracts.ts`
- `components/finance/finance-dashboard-theme.ts`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/finance/PaymentReconciliationWorkbench.tsx`
- `components/accounting/AccountingControlCenter.tsx`
- `components/assurance/AssuranceControlTowerDashboard.tsx`
- `app/[locale]/(dashboard)/dashboard/analytics/page.tsx`
- `components/analytics/CompleteIntegratedDailySalesDashboard.tsx`
- `components/analytics/dashboard/analytics-dashboard-theme.ts`
- `components/analytics/dashboard/dashboard-header.tsx`
- `app/globals.css`

Older planning report reads were attempted but were blocked by the Windows sandbox helper. This report is therefore grounded mainly in live code inspection and the installed skill instructions.

## Current BI And Dashboard UX Assessment

### What Already Works Well

The Owner War Room is directionally correct. It already uses a read-only posture, evidence-backed badges, proof trail access, action queue visibility, module observe state, redaction counts, stale/blocked states, and tenant/permission context. This is a strong product foundation.

The Manager Action Center is also correctly positioned. It uses BI KPI cards, evidence rows, business signals, permission filtering, action links, due-state logic, assurance incident blending, and role assignment concepts. It has the beginnings of the "daily work cockpit" Kontava needs.

The finance and reconciliation workbenches are data-rich and operationally useful. They expose cash, payments, receivables, payables, suspense, certification, signing, export, and reconciliation concepts that can feed a more powerful Cash Command view.

The assurance and accounting surfaces are serious and control-oriented. They already communicate readiness, blockers, sensitive actions, incident routing, proof state, engine health, and audit/control concerns.

The visual semantics are largely reusable. The `--dash-*` palette gives a professional dark command surface with brand, success, info, gold, warning, danger, spruce, muted, panel, filter, button, and control tokens. This should be preserved.

### What Still Feels Ordinary

Many first screens still begin with the standard pattern: page title, subtitle, status badges, four or five KPI cards, then a grid of panels. This is clear, but not yet unforgettable.

Owner War Room has strong data but the first view does not yet behave like a daily intelligence brief. It shows important cards, but not a "this is today's business truth" story.

Manager Action Center puts summaries and KPIs before the user's work rhythm. For a manager, the primary first question is not "how many KPIs exist?" but "what must I handle before the day goes wrong?"

Analytics is the most conventional surface. It uses the system theme, but it still reads like a common financial analytics page with title, live badge, KPI stats, revenue chart, top products, cashier performance, quick actions, alerts, and transactions.

Finance Command Center is useful but broad. It has filters, metric cards, movement panels, assurance, aging, payments, and method breakdowns, but it does not yet begin with cash truth, cash risk, and the next best finance action.

Proof is present but often spatially separate from the insight. The ideal experience should let the user move from insight to proof drawer to source record without losing context.

## Core Recommendation

Build Kontava's BI experience around one primary concept:

## Kontava Daily Command Environment

This should become the parent experience pattern for Owner War Room, Manager Action Center, Cash Command, Analytics, Accounting, Assurance, and future moat dashboards.

Every command surface should answer five questions in order:

1. What changed since the last review?
2. What matters most right now?
3. What money, stock, compliance, or workflow risk is exposed?
4. What is proven, stale, partial, redacted, or blocked?
5. What should I do next?

This creates a user experience that feels unlike ordinary dashboards because it is not organized around charts. It is organized around daily business judgment.

## Recommended First-Screen Structure

### 1. Command Brief Strip

A compact top band that replaces generic page headers on BI surfaces.

It should show:

- Organization and period.
- Freshness and source hash status.
- Evidence trust state.
- Mode switcher: `Brief`, `Command`, `Investigate`.
- "Last reviewed" and "What changed" timestamp.
- One sentence summary: "Cash is trustworthy", "Cash is blocked by suspense", "Stock is tying up too much cash", or "Close cannot be certified yet".

Expected effect:

- Users understand the page before reading cards.
- The dashboard feels intelligent and alive.
- Trust state becomes visible from the first second.

Technical prerequisites:

- Extend `BIProvenance` and `BIFreshness` usage across all BI sections.
- Add a reusable `BICommandBriefHeader` under `components/bi/**`.
- Require every command surface to provide `generatedAt`, `periodStart`, `periodEnd`, `trustState`, `evidenceGrade`, `freshness`, `sourceModules`, and `blockingReason`.

### 2. What Changed Since Last Review

A compact timeline or ranked list showing important deltas since the previous daily review.

Examples:

- Suspense increased by XAF 430,000.
- Three purchase orders passed expected receiving date.
- Payroll run moved from approved to paid.
- Two high-severity assurance incidents were generated.
- Close readiness dropped from 82% to 64%.

Expected effect:

- The experience feels alive.
- Owners and managers get a reason to return daily.
- Kontava moves from reporting what exists to explaining what moved.

Technical prerequisites:

- Store or compute previous review snapshots.
- Add a lightweight `BIChangeEvent` contract.
- Add snapshot-to-change comparison helpers.
- Add review timestamps per user or per role.

### 3. What Needs Action Today

The daily action queue should be visually promoted above generic KPIs.

It should show:

- Critical/overdue items first.
- Money impact when known.
- Due state.
- Owner role.
- Evidence grade.
- Blocked/redacted/stale state.
- One primary action button.

Expected effect:

- Managers see Kontava as a workday operating surface, not a passive dashboard.
- Owners see that the system translates data into business control.

Technical prerequisites:

- Use `services/signals/action-queue.service.ts` as the base.
- Add durable action status if not already persisted for production use.
- Add a reusable `BIActionPriorityBoard`.
- Ensure server-side permission filtering remains the source of truth.

### 4. Business Truth Zones

Instead of a flat KPI grid, each BI surface should group intelligence into zones:

- Cash Truth.
- Stock-to-Cash.
- Close Readiness.
- Supplier Pressure.
- Payroll Exposure.
- Branch Health.
- Compliance Risk.
- Module/Access State.

Each zone should have:

- One main business question.
- One strongest metric.
- One change indicator.
- One trust label.
- One action or drill-through.

Expected effect:

- The product feels strategic rather than just statistical.
- SMB owners can understand business state without reading a report.

Technical prerequisites:

- Add `BICommandZone` and `BICommandSection` contracts.
- Reuse `BIKpiCard`, `BIEvidenceBadgeRow`, and `BIStateBadge`.
- Avoid creating one-off dashboard structures for every module.

### 5. Proof Drawer And Evidence Timeline

A proof drawer should be available from every serious KPI, signal, and action.

It should show:

- Source modules.
- Evidence grade.
- Freshness.
- Nodes and edges.
- Blockers.
- Redactions.
- Next actions.
- Audit access status.

Expected effect:

- Accountants and auditors trust the intelligence.
- Owners learn that numbers are not just estimates.
- Enterprise buyers see control maturity.

Technical prerequisites:

- Expand `PROOF_TRAIL_SUBJECT_TYPES` beyond `journal.entry`, `reconciliation.run`, and `close.run`.
- Add proof subjects for payment transaction, POS sale, stock movement, purchase order, payroll run, supplier payment, action item, and assurance incident.
- Standardize proof drawer hosting across BI surfaces.

## Innovative Presentation Concepts

### Owner Morning Brief

What the user sees first:

- A short command brief: "Cash truth is partial. 4 actions need owner attention. Close is blocked by missing reconciliation proof."
- A ranked list of today's three business risks.
- A "changed since yesterday" strip.

Business question:

- "Can I trust my business position today, and what must I act on?"

Stakeholders:

- Owner, CEO, managing director, investor/operator.

Why it captures attention:

- It starts with a business conclusion, not a chart.

Data required:

- Tenant operating snapshot, payment truth snapshot, inventory cash snapshot, close readiness snapshot, business signals, action queue, proof trail summaries.

Anti-gimmick rule:

- Keep it brief and proof-backed. Do not add decorative charts that do not change decisions.

### Manager Daily Run Sheet

What the user sees first:

- "Do these first" queue grouped by overdue, critical, due today, blocked, waiting on other role.

Business question:

- "What must my team complete today to keep operations clean?"

Stakeholders:

- Branch manager, operations manager, stock supervisor, finance supervisor.

Data required:

- Action queue, assignment candidates, due state, role ownership, severity score, evidence grade, blockers, redactions.

Expected effect:

- Turns Kontava into a daily work control surface.

### Cash Truth Map

What the user sees first:

- Cash collected, pending, suspense, exceptions, reconciliation status, and certified cash in one horizontal flow.

Business question:

- "How much cash can I trust, and what part is not yet proven?"

Stakeholders:

- Owner, finance, accountant, cashier supervisor, fintech partner.

Data required:

- Payment truth snapshot, payment reconciliation workbench, suspense items, provider transactions, ledger postings, reconciliation runs.

Expected effect:

- Strong pricing power and trust because cash visibility is a daily pain.

### Risk And Opportunity Radar

What the user sees first:

- A ranked radar list, not a decorative circular chart: cash leakage, stockout risk, dead stock cash exposure, receiving delays, payroll exposure, close blockers.

Business question:

- "Where can the business lose money or regain control today?"

Stakeholders:

- Owner, manager, accountant, finance team.

Data required:

- Business signal severity score, money impact, freshness, evidence grade, action status.

Expected effect:

- Makes the dashboard feel intelligent without pretending to be AI.

### Evidence-Backed Insight Timeline

What the user sees first:

- A time-ordered narrative of important business changes: sale posted, reconciliation run blocked, stock adjustment created, PO overdue, close finding opened.

Business question:

- "What happened, in what order, and what evidence supports it?"

Stakeholders:

- Accountant, auditor, owner, finance lead.

Data required:

- Business events, source links, ledger postings, proof edges, audit records.

Expected effect:

- Kontava becomes an evidence system, not only an accounting/POS system.

### Stock-to-Cash Flow View

What the user sees first:

- Stock purchased, received, held, sold, paid, reconciled, and posted as a flow.

Business question:

- "Where is money trapped between purchase, stock, sale, and cash?"

Stakeholders:

- Owner, stockkeeper, purchasing, finance, branch supervisor.

Data required:

- Inventory cash snapshot, purchase orders, stock levels, sales, payments, reconciliation, ledger source links.

Expected effect:

- Differentiates Kontava from simple inventory tools because it explains cash trapped in stock.

### Close Readiness Journey

What the user sees first:

- A journey/checkpoint view from operational data to reconciled cash to posted ledger to certified close.

Business question:

- "Can we close the period confidently, and what blocks certification?"

Stakeholders:

- Accountant, owner, auditor, finance team.

Data required:

- Close readiness snapshot, close findings, reconciliation runs, journal entries, fiscal documents, proof trail.

Expected effect:

- Makes OHADA close readiness understandable to non-accountants while preserving accounting rigor.

## Role-Specific User Journeys

### Owner

1. Opens Owner War Room.
2. Sees Morning Brief with cash trust, biggest change, and top three risks.
3. Reviews Action Priority Board.
4. Opens proof drawer for any disputed number.
5. Approves, delegates, or follows the route to the source workflow.

Design emphasis:

- Mobile-friendly brief.
- Low reading burden.
- Strong trust labels.
- Money impact first.

### Manager

1. Opens Manager Action Center.
2. Sees Daily Run Sheet grouped by urgency.
3. Filters by branch, role, or due state.
4. Opens a task, handles the operational workflow, and returns to the queue.
5. End-of-day review shows resolved, blocked, carried-forward actions.

Design emphasis:

- Dense desktop mode.
- Fast scanning.
- Due-state sorting.
- Fewer abstract KPIs.

### Accountant

1. Opens Accountant Trust Review or Close Readiness Journey.
2. Sees evidence grade distribution and close blockers.
3. Drills into proof trail and source links.
4. Exports or prepares evidence pack only when release gates pass.

Design emphasis:

- Proof-first.
- Ledger trust labels.
- Redaction clarity.
- Export safety.

### Finance

1. Opens Cash Truth Map.
2. Sees trusted cash, pending cash, suspense, exceptions, and reconciliation runs.
3. Works suspense or provider issues.
4. Signs or prepares reconciliation evidence.

Design emphasis:

- Flow view over chart view.
- Suspense aging.
- Provider evidence.
- Reconciliation status.

### Stockkeeper

1. Opens Stock-to-Cash Flow View.
2. Sees stockout risk, dead stock cash exposure, receiving delays, transfer blockers.
3. Works receiving, adjustments, or transfers.

Design emphasis:

- Item exceptions, not full catalog first.
- Money tied in stock.
- Action route to inventory workflows.

## Component And Layout Recommendations

Create these reusable primitives under `components/bi/**` before redesigning multiple pages:

- `BICommandBriefHeader`
- `BICommandModeTabs` with `Brief`, `Command`, `Investigate`
- `BIWhatChangedStrip`
- `BIActionPriorityBoard`
- `BIRiskOpportunityRadar`
- `BIBusinessTruthZone`
- `BICashTruthMap`
- `BIStockToCashFlow`
- `BIEvidenceTimeline`
- `BIProofDrawerHost`
- `BITrustLegend`
- `BIReviewStatus`
- `BIRedactedSurface`
- `BIBlockedSurface`
- `BIStaleSurface`
- `BIModuleUnavailableSurface`
- `BIDailyDigestPanel`

These should reuse:

- `BIKpiCard`
- `BIEvidenceBadgeRow`
- `BIStateBadge`
- `BIEmptyState`
- `EvidenceGradeBadge`
- `ProofTrailDrawer`
- `dashboardPanelClass`
- `dashboardRowClass`
- `dashboardToneClass`
- `dashboardSeverityClass`
- `dashboardStatStyle`

Do not create separate visual systems for Owner War Room, Manager Action Center, Analytics, Finance, Accounting, and Assurance. The moat is a unified command language.

## Technical And Data Prerequisites

### BI Contract Expansion

Add contracts for:

- `BICommandBrief`
- `BICommandMode`
- `BICommandZone`
- `BIChangeEvent`
- `BIReviewState`
- `BIDailyDigest`
- `BIFlowStep`
- `BIRiskRank`
- `BIProofDrawerSubject`

Every BI output should declare:

- `organizationId`
- `moduleSlug`
- `requiredPermission`
- `evidenceGrade`
- `trustState`
- `freshness`
- `redactions`
- `blockers`
- `sourceModules`
- `drillThrough`
- `actionLink`

### Snapshot Expansion

Current snapshot kinds are strong but limited:

- `tenant.operating`
- `branch.operating`
- `payment.truth`
- `inventory.cash`
- `close.readiness`

Future dashboard experiences need additional snapshot/read-model coverage:

- Receivables health.
- Payables and supplier risk.
- Payroll exposure/profitability.
- Branch health.
- Stock-to-cash flow.
- Compliance readiness.
- Action queue durability.
- Review/digest state.

Persist only hot, high-value snapshots. Contract-only should remain the default until performance or history proves persistence is necessary.

### Proof Trail Expansion

Current proof subjects cover:

- `journal.entry`
- `reconciliation.run`
- `close.run`

Future command surfaces need proof support for:

- POS sale.
- Payment provider transaction.
- Suspense item.
- Purchase order.
- Goods receipt.
- Stock movement.
- Inventory count.
- Payroll run.
- Supplier payment.
- Fiscal document.
- Business signal.
- Action item.
- Assurance incident.

### Business Signal Expansion

Current business signal types include cash, payment suspense, provider duplicates, refund/void spikes, stockout, dead stock, receiving delay, payroll exposure, and close blockers.

Add signals for:

- Supplier overdependence.
- AP due pressure.
- Receivable collection risk.
- Branch cash variance.
- Price/margin leakage.
- Negative inventory after sale.
- Unposted operational source links.
- Compliance certification delay.
- Repeated manager dismissals.
- Reopened assurance incidents.

### Security Requirements

All dashboard intelligence must remain server-trusted:

- UI must not compute trust state.
- UI must not infer hidden data from redacted values.
- Permission-denied and module-unavailable states must be explicit and safe.
- Admin wildcard permissions must not bypass module entitlements or redaction policy.
- Proof drawer access must be audited when sensitive.
- Exports must use export-safety checks.
- Payroll, supplier bank, payment provider, close, and proof-trail data require redaction policies.

## Anti-Bloat Guidance

Do not build a BI data warehouse yet.

Do not build animated visual novelty before the command primitives exist.

Do not build separate mini-apps for Owner War Room, Manager Action Center, Cash Command, and Analytics. Build a shared BI command grammar.

Do not persist every dashboard card. Persist only snapshots that are hot, expensive, or historically important.

Do not introduce AI-generated decisions until evidence grades, proof trails, redaction, and stale/blocked semantics are consistent.

Do not make dashboards decorative. Every visual element must answer a decision question.

Do not hide complexity by removing trust labels. Kontava's moat is that it tells the truth about what is known, partial, stale, blocked, redacted, or certified.

## Prioritized Implementation Roadmap

### Phase 0: BI Command UX Foundation

Objective:

- Standardize the command experience primitives before redesigning pages.

Build:

- `BICommandBriefHeader`
- `BICommandModeTabs`
- `BIWhatChangedStrip`
- `BIActionPriorityBoard`
- `BITrustLegend`
- `BIProofDrawerHost`
- `BICommandZone` contract
- `BIChangeEvent` contract

Validation:

- Component renders all states: ready, stale, partial, blocked, redacted, permission denied, module unavailable.
- Mobile and desktop screenshots show no text overlap.
- No dashboard computes trust in the client.

### Phase 1: Owner War Room Recomposition

Objective:

- Turn the Owner War Room from evidence-backed cards into the flagship Owner Morning Brief.

Build:

- Morning Brief first screen.
- What Changed Since Last Review strip.
- Top three owner risks.
- Cash truth, stock-to-cash, close readiness, and module state zones.
- Contextual proof drawer buttons inside each zone.

Keep:

- Existing service data and card calculations.
- Read-only posture.
- Existing proof trail drawer.
- Module observe mode.

Delay:

- AI copilot.
- Full evidence graph.
- Complex branch map.

### Phase 2: Manager Action Center Recomposition

Objective:

- Make Manager Action Center feel like a daily operating run sheet.

Build:

- "Do first" queue.
- Group by overdue, critical, due today, blocked, waiting.
- Role/branch mode where data supports it.
- End-of-day review summary.

Keep:

- Existing `buildActionQueue`.
- Existing `ManagerActionCenterAction`.
- Existing permission filtering.

Add carefully:

- Durable action status and event history only if persistence is not already complete.

### Phase 3: Cash Command Intelligence

Objective:

- Replace finance's broad first impression with cash truth and reconciliation confidence.

Build:

- Cash Truth Map.
- Suspense aging lane.
- Provider evidence lane.
- Posted/reconciled/certified cash labels.
- Finance action board.

Reuse:

- Payment truth snapshot.
- Reconciliation workbench.
- Payment reconciliation services.
- Finance theme.

### Phase 4: Analytics Repositioning

Objective:

- Move analytics from chart dashboard to Business Pulse and What Changed.

Build:

- Business Pulse View.
- What Changed Since Yesterday.
- Risk and Opportunity Radar.
- Drill-through from revenue/product/cashier insights to proof/source where possible.

Fix:

- Remove hard-coded or demo-like goals from daily sales surfaces unless backed by real configuration.
- Replace generic "real-time insights" language with evidence and freshness language.

### Phase 5: Accounting, Assurance, And Close Journey

Objective:

- Make accounting and assurance understandable as a close/control journey.

Build:

- Close Readiness Journey.
- Evidence-backed Insight Timeline.
- Assurance incident proof drawer.
- Control maturity strip.

Reuse:

- Accounting Control Center.
- Close Assurance Center.
- Assurance Control Tower.
- Proof trail services.

### Phase 6: Daily Habit Loops

Objective:

- Make Kontava a daily go-to surface.

Build:

- Owner Morning Brief.
- Manager Daily Run Sheet.
- Finance Cash Truth Review.
- Accountant Close Readiness Review.
- Stockkeeper Stock Risk Review.
- End-of-Day Business Pulse.
- Weekly Intelligence Digest.

Require:

- Review state.
- Change events.
- Digest preferences.
- Notification routing.
- Audit-safe summary generation.

## First Build Recommendation

Start with `BICommandBriefHeader`, `BIWhatChangedStrip`, and `BIActionPriorityBoard`, then apply them to the Owner War Room first.

Why Owner War Room first:

- It already has the broadest cross-module service composition.
- It already has evidence, proof subjects, action queue, module control, redaction, stale, and blocked states.
- It is the best demonstration surface for the Kontava moat.
- It can remain read-only, reducing implementation risk.

The first visible result should be:

- Owner opens the page and instantly sees a business conclusion.
- The top three risks are visible without scanning a card grid.
- The next action is next to the insight.
- Every important number declares trust and freshness.
- Proof is available in context.

## Release Gates

Before shipping the redesigned BI command pattern:

- `npm run typecheck`
- `npm run lint`
- Focused service tests for BI command contracts.
- Focused component tests for all BI states.
- Server action tests for tenant/RBAC/module/redaction checks.
- E2E tests for Owner War Room and Manager Action Center.
- Mobile and desktop screenshot checks for layout, text overflow, and state visibility.
- Direct URL and permission denial checks.
- Proof drawer audit and redaction checks.
- Performance budget check for command surfaces.
- `node scripts/kontava-moat-release-gate.js --mode fail` if available and current in the repo.

## Final Position

Kontava can absolutely make its dashboards feel unlike ordinary business apps from the beginning, but the innovation should come from command intelligence, not visual decoration.

The product should feel like:

- A morning business brief for owners.
- A daily run sheet for managers.
- A cash truth map for finance.
- A proof journey for accountants.
- A risk radar for operators.
- A close readiness pathway for compliance and audit.

The current system has enough foundations to begin safely. The next move is to build shared BI command primitives, recombine the Owner War Room first, then carry the same pattern into Manager Action Center, Cash Command, Analytics, Accounting, and Assurance without fragmenting the platform.
