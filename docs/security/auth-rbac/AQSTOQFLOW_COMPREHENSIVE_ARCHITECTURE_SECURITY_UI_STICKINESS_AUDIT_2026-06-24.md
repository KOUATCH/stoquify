# AqStoqFlow Comprehensive Architecture, Security, UI, and Stickiness Audit

Date: 2026-06-24
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: report-only architecture and implementation planning run

## Executive Verdict

AqStoqFlow has moved from a broad prototype surface into a credible controlled platform. The strongest evidence is that the service-boundary and policy gates now pass in strict fail mode, the proof/evidence spine has real payment transaction support, the dashboard command surfaces are becoming server-truth driven, and workflow assurance runtime tables are present and checkable.

The system is not yet release-complete. The remaining work is less about inventing new concepts and more about closing governance gaps around module enforcement, authenticated smoke evidence, public/API access hardening, close invalidation coverage, provider run operations, and production build reliability. The right next move is a short sequence of narrow implementation passes, each ending in a measurable gate or saved evidence artifact.

## Evidence Base

This audit reviewed the 2026-06-23 and 2026-06-24 reports under `what-next/` and `innovation/`, including the gap plan, enterprise SMB OS inspection, HR/payroll readiness assessment, service-boundary promotion report, workflow assurance recovery report, dashboard no-data audit, module-driven platform analysis, dashboard experience prompts, stock-to-cash, close readiness, daily habit, cash command, owner war room, payment proof, and release-gate reports.

It also used the existing graph output in `graphify-out/`. The available graph report is a single project-wide graph, not the older component-specific files referenced by local instructions. It reports 4,121 nodes, 5,321 edges, and major hubs around locale routing, monitoring, notifications, resilient database operations, tenant defense, ledger-first posting, RBAC, and server action security.

Fresh local verification performed during this run:

| Command | Result | Meaning |
| --- | --- | --- |
| `npm run prisma:validate` | Passed | Prisma schema validates. |
| `npm run typecheck` | Passed | TypeScript slice is currently clean. |
| `npm run policy:gates` | Passed | Inventory, service-boundary, hard-delete, demo-trust, and raw-error gates pass in fail mode. |
| `npm run workflow:assurance:runtime-check` | Passed | Runtime tables and migration markers are ready. |
| `npm run build:app` | Timed out after about 304 seconds | Production build remains an unresolved release blocker. |

The repository shape is large enough to require governance gates, not manual inspection alone: roughly 894 files across `app`, `actions`, `components`, `services`, `lib`, `config`, `hooks`, and `prisma`; 99 dashboard pages; 129 action files; 253 service files; and 134 tests in the inspected source/test areas.

## What Is Working

### 1. Boundary and Release Gates Are Finally Meaningful

The runtime service-boundary baseline has been promoted to zero active violations, and `policy:gates` now includes strict fail-mode checks. This is the correct governance posture for a platform with many routes, actions, and services.

Key anchors:

- `package.json:18` defines `service:boundary:fail`.
- `package.json:28` wires `policy:gates` through strict boundary and trust checks.
- The fresh gate run reported zero active service-boundary violations while preserving allowed test/mock findings.

Why this matters: AqStoqFlow can now prevent old architectural drift from silently returning. That is a major maturation point.

### 2. The Service Action Security Pattern Is Solid

The shared protection wrapper gives server actions a consistent path for permission checks, fresh-auth checks, tenant input guards, audit context, and safe error shaping.

Key anchors:

- `services/_shared/protect.ts:29` exports `protect`.
- `services/_shared/protect.ts:31` to `services/_shared/protect.ts:35` define permission, audit, fresh-auth, and tenant-guard options.
- `services/_shared/protect.ts:46`, `services/_shared/protect.ts:49`, and `services/_shared/protect.ts:54` enforce fresh auth, permission, and tenant input checks.
- `services/_shared/protect.ts:59` converts failures into safe action errors.

Why this matters: this is the right base for enterprise-grade tenant isolation and auditable operations.

### 3. Payment Evidence Has Real Transaction-Level Proof

The payment proof spine now supports `payment.transaction`, maps it to `payments.reconciliation.read`, dispatches it through the proof-trail action/service, and exposes it in Cash Command.

Key anchors:

- `services/evidence/evidence-contracts.ts:16` includes `payment.transaction`.
- `services/evidence/evidence-contracts.ts:109` maps it to the reconciliation read permission.
- `actions/evidence/proof-trail.actions.ts:88` protects proof retrieval with the mapped permission.
- `services/evidence/proof-trail.service.ts:653` builds the payment transaction proof trail.
- `services/evidence/proof-trail.service.ts:723` to `services/evidence/proof-trail.service.ts:805` model blockers and redactions.
- `services/cash-command/cash-command.service.ts:154` and `services/cash-command/cash-command.service.ts:251` connect Cash Command to the proof subject.
- `components/cash-command/CashCommandDashboard.tsx:233` to `components/cash-command/CashCommandDashboard.tsx:249` host the proof drawer.

Why this matters: the product has moved beyond summary dashboards into explorable assurance. That is a competitive moat.

### 4. Dashboard State Primitives Exist

The platform has reusable no-data, partial-data, permission-denied, module-unavailable, and safe-error surfaces.

Key anchors:

- `components/bi/BIStateSurface.tsx:43`, `components/bi/BIStateSurface.tsx:47`, and `components/bi/BIStateSurface.tsx:51` model denied, unavailable, and safe-error states.
- `components/dashboard/DashboardRouteState.tsx:6` models dashboard route states including empty and partial.
- `components/dashboard/DashboardErrorState.tsx:10` gives a default safe fallback message.

Why this matters: a consistent enterprise UI depends on reliable empty/error states, not only on happy-path cards.

### 5. Workflow Assurance Runtime Readiness Is Real

The workflow assurance runtime check now passes with runtime tables and migration markers present.

Why this matters: this creates the foundation for moving workflow assurance from observe-mode reporting to enforced operational controls.

### 6. Stock-to-Cash, Close Readiness, and Daily Habit Surfaces Are Emerging as Sticky Daily Workflows

The platform now has service-backed surfaces for daily operator loops.

Key anchors:

- `services/stock-to-cash/stock-to-cash-flow.service.ts:55` exposes stock-to-cash data.
- `services/stock-to-cash/stock-to-cash-flow.service.ts:77` composes the read model.
- `services/stock-to-cash/stock-to-cash-flow.service.ts:94` builds proof subjects.
- `services/stock-to-cash/stock-to-cash-flow.service.ts:104` to `services/stock-to-cash/stock-to-cash-flow.service.ts:218` map the flow across purchasing, inventory, POS, reconciliation, accounting, and close assurance modules.
- `components/stock-to-cash/StockToCashFlowDashboard.tsx:173` renders proof subjects.
- `services/daily-habit/daily-habit-digest.service.ts:235` exposes daily habit digest data.
- `services/daily-habit/daily-habit-digest.service.ts:260` composes the digest.
- `components/daily-habit/DailyHabitDigestDashboard.tsx:50` renders the digest dashboard.
- `components/accounting/CloseReadinessJourneyPanel.tsx:51` renders the close readiness journey panel.

Why this matters: these are not decorative dashboards. They are daily operating surfaces that can create product stickiness if tied to actions, evidence, and accountability.

### 7. Redaction and Moat Guard Concepts Are Present

The security layer already models sensitive categories, module-aware redaction, export safety, and action gating.

Key anchors:

- `services/security/redaction-policy.service.ts:6` to `services/security/redaction-policy.service.ts:16` define sensitive redaction categories.
- `services/security/redaction-policy.service.ts:71` to `services/security/redaction-policy.service.ts:172` define domain policies.
- `services/security/redaction-policy.service.ts:207` redacts when module decisions would block access.
- `services/security/moat-guard.service.ts:114` evaluates module access when a module slug exists.
- `services/security/moat-guard.service.ts:167` to `services/security/moat-guard.service.ts:196` handle export safety, actions, and redactions.

Why this matters: this gives the system a path toward commercial packaging and data minimization, but it still needs enforcement maturity.

## What Is Not Working Yet

### 1. Production Build Evidence Is Missing

`npm run build:app` timed out after about 304 seconds during this run. Earlier reports also recorded build failure/timeout without a stable stack. This blocks a confident release decision even though typecheck and gates pass.

Likely reason: the app is now broad enough that production build can expose slow static generation, route-level data access, bundling bloat, environment assumptions, or an unreported hang. The next step should be build diagnosis, not unrelated lint cleanup.

### 2. Authenticated Browser Smoke Is Still Missing

Multiple reports call out that authenticated route smoke evidence has not been completed. This is important because many of the valuable surfaces are protected, tenant-scoped, and role-dependent. Unit and policy gates cannot prove the app actually works in a browser session.

Likely reason: test users, seeded tenants, and route smoke fixtures are not yet packaged into a repeatable harness.

### 3. Module Governance Is Still Observe-Mode

The module platform is not yet truly module-driven.

Key anchors:

- `services/modules/module-control-contracts.ts:1` sets `MODULE_CONTROL_MODE = "observe"`.
- `services/modules/module-control-contracts.ts:72` defines a `TenantModuleEntitlement` type, but recent reports state there is no durable Prisma entitlement lifecycle.
- `services/modules/module-entitlement.service.ts:86` allows access in observe mode even when it would block.
- `services/modules/module-entitlement.service.ts:111` and `services/modules/module-entitlement.service.ts:175` report hard enforcement disabled.
- `services/_shared/protect.ts:31` to `services/_shared/protect.ts:35` do not include module metadata in the action protection contract.

Likely reason: the team correctly avoided flipping enforcement before route-to-module inventory and catalog drift are solved. Enforcement without inventory would break legitimate routes.

### 4. Reconciliation Workbench Does Not Yet Expose the New Proof Where Users Need It

The payment transaction proof exists and Cash Command can open it, but the Reconciliation Workbench still lacks a direct row-level launcher.

Key anchors:

- `components/finance/PaymentReconciliationWorkbench.tsx:165` includes the payment trust banner.
- `components/finance/PaymentReconciliationWorkbench.tsx:327` uses the workbench hook.
- `components/finance/PaymentReconciliationWorkbench.tsx:440` has safe dashboard error fallback.
- `components/finance/PaymentReconciliationWorkbench.tsx:558` renders the trust banner.
- No proof drawer host or `payment.transaction` proof launch pattern was found in this component.

Likely reason: the proof capability was launched first in Cash Command as a safer narrow surface. The workbench now needs the same proof affordance at the transaction row where operators actually investigate mismatches.

### 5. Close Invalidation Coverage Is Partial

Payment, ledger, and inventory close invalidation are present, but payroll, compliance, country-pack, permission/module, and some operational status changes are not yet fully connected.

Key anchors:

- `services/accounting/close-assurance-pack.service.ts:906` records close certification invalidation.
- `services/accounting/close-assurance-pack.service.ts:978` records invalidations in transaction scope.
- `services/accounting/posting.service.ts:335` and `services/accounting/posting.service.ts:506` connect ledger posting/reversal to invalidation.
- `services/inventory/inventory-close-invalidation.service.ts:19` connects inventory source invalidation.
- Scans of payroll and compliance services did not find equivalent close invalidation calls.

Likely reason: each business source needs its own safe transaction boundary. Payroll and compliance are higher-risk, so they were not casually wired into close invalidation without a domain-specific design.

### 6. Public Receipt and Item API Access Need Hardening

Public receipts and organization item APIs are still sensitive surfaces.

Key anchors:

- `app/api/receipts/[receiptId]/route.ts:13` calls public receipt retrieval by receipt id.
- `services/pos/receipt.service.ts:522` exposes `getPublicSalesReceipt`.
- `services/pos/receipt.service.ts:524` looks up the sales receipt by id.
- `app/api/v1/organisations/[id]/items/route.ts:12` uses `requireApiSessionForOrg`.
- `app/api/v1/organisations/[id]/briefItems/route.ts:12` uses `requireApiSessionForOrg`.
- `lib/security/server-authz.ts:39` defines organization-scoped API session authorization.

Likely reason: these APIs started as practical integration/public surfaces. They now need explicit permission, token, and data-minimization policy because the rest of the platform has matured.

### 7. Payroll Is Strong but Not Enterprise Complete

The HR/payroll readiness report correctly identifies the payroll backend as promising but incomplete. Missing pieces include HR employee/contract lifecycle, richer statutory breadth, payslip product, declaration adapters, stronger database immutability, self-service workflows, and broader tenant escape tests.

Likely reason: payroll is a product domain, not a feature. The current kernel cannot be declared enterprise-complete until it has full workflow surfaces and statutory operations.

### 8. Provider Health and Run Operations Are Partial

Reports identify provider health/readiness, reconciliation run dedupe, and runbooks as incomplete.

Likely reason: run operations require durable event semantics and operator procedures, not just dashboard widgets.

### 9. Finance Read-Model Minimization and Partial-Data Envelopes Are Not Complete

The dashboard architecture is moving toward server-truth command surfaces, but the reports still flag finance read-model minimization and partial-data envelopes as incomplete.

Likely reason: existing dashboards likely evolved at different times. Some already use the new BI primitives, while older surfaces still need convergence.

### 10. Vocabulary Drift Still Exists

Recent reports flag module slug drift between proof/evidence concepts and commercial module slugs. For example, evidence and dashboards sometimes use operational words such as payments, reconciliation, controls, or close while catalog-oriented code uses slugs such as `payment_reconciliation` and `close_assurance`.

Likely reason: proof subjects, UI modules, commercial modules, and engineering domains were created at different stages. The platform needs one canonical vocabulary map before enforcement.

## Why the Important Points Were Not Done Yet

The main blockers are sequencing blockers, not lack of ideas.

1. Build and authenticated smoke need a deterministic environment. Without that, full release evidence stays unstable.
2. Module enforcement needs inventory first. Hard enforcement before route/action/API coverage would risk breaking real tenants.
3. Reconciliation proof launch depends on UX placement. The proof exists, but the workbench needs a careful row-level pattern that does not clutter the operator workflow.
4. Close invalidation requires domain-specific transaction safety. Payroll and compliance invalidations must be wired where the source-of-truth mutation commits.
5. Public/API access hardening can break integrations. It should be introduced through compatibility-aware gates, tokens, and deprecation windows.
6. Payroll enterprise completion is larger than a patch. It needs a product slice: HR records, statutory declarations, payslips, controls, and evidence.
7. Dashboard consistency is a migration problem. Reusable states exist, but every route needs to opt into them.

## System Architect Assessment

The architecture is strongest where it has three layers together:

1. A tenant-scoped service/read model.
2. A protected action/API boundary.
3. A dashboard surface with proof, state, and action semantics.

The best current examples are Cash Command, stock-to-cash flow, payment proof, close readiness, and daily habit digest. The weakest areas are the ones where one layer is missing: module enforcement has contracts without persistence/enforcement, public receipt access has service behavior without modern hardening, and reconciliation workbench has operational data without the newest proof launcher.

Recommended architectural direction:

- Make the module catalog the platform vocabulary source, but keep business services domain-owned.
- Require every protected action to declare permission, audit resource, and eventually module slug.
- Require every dashboard route to use a shared state envelope: `ready`, `empty`, `partial`, `permission_denied`, `module_unavailable`, `safe_error`.
- Keep business truth server-side. UI should render command models, not calculate accounting or control truth.
- Promote new gates in report mode first, then fail mode once active violations reach zero.

## Cyber-Security Assessment

The security posture is improving quickly. The strongest parts are permission checks, safe action errors, tenant guards, redaction policy, and strict boundary gates. The main residual risks are public links, API item endpoints, module observe-mode, export surfaces, and missing authenticated smoke coverage.

Priority security changes:

1. Public receipt hardening:
   - Replace raw id-only public lookup with signed, scoped, expiring receipt access.
   - Keep the response redacted and minimal.
   - Add audit logging for public receipt opens.

2. Item API hardening:
   - Require explicit inventory read permission or scoped API token capability, not only organization membership.
   - Return minimal fields by default.
   - Add contract tests for unauthorized org, missing permission, disabled module, and revoked token.

3. Module enforcement readiness:
   - Add report-mode coverage for route/action/API/module mapping.
   - Fix slug drift.
   - Only then pilot enforcement on one low-risk module.

4. Export and evidence redaction:
   - Keep export safety policy centralized.
   - Add tests that prove sensitive payroll, provider, fiscal, and close-pack data is redacted when module/permission context requires it.

5. Browser smoke:
   - Add authenticated Playwright smoke for the highest-risk command surfaces.
   - Include permission-denied and no-data states.

## Front-End and UI Specialist Assessment

The best UI direction in the repo is the shift from generic dashboards to command surfaces: Cash Command, Owner War Room, Manager Action Center, Stock-to-Cash Flow, Close Readiness Journey, and Daily Habit Digest. These surfaces give users a reason to return because they answer "what changed, what matters, what do I do now?"

What should change:

- Standardize no-data/error/partial/module-unavailable surfaces across all dashboard routes, using the existing state primitives.
- Put proof launchers at the point of work. Reconciliation transaction rows should open `payment.transaction` proof directly.
- Keep dense enterprise layouts. Avoid decorative hero or marketing composition inside operational dashboards.
- Make daily habits role-specific: owner, manager, accountant, cashier, payroll admin, compliance officer.
- Add action completion feedback loops: assigned, due, blocked, resolved, proof attached, escalated.
- Use the same color semantics across siblings: risk, blocked, ready, partial, evidence, cash, inventory, close.

## Business Logic Assessment

The business logic has a credible ledger-first/OHADA-aware core, but it needs stronger closure around operational side effects.

What works:

- Ledger posting and reversal are connected to close invalidation.
- Inventory invalidation is present.
- Payment reconciliation proof is now transaction-aware.
- Stock-to-cash creates a cross-domain operating view.
- Daily habit digest composes role-driven action and risk surfaces.

What needs work:

- Payroll mutations that affect closed periods should invalidate close readiness.
- Fiscal/compliance mutations that affect close packs should invalidate close readiness.
- Provider/reconciliation runs need dedupe and runbook-backed readiness states.
- API read models should be minimized and permission-scoped.
- Module decisions should eventually affect actions, API, reports, exports, and navigation consistently.

## Efficient Implementation Plan

### Phase 0 - Release Evidence Stabilization

Goal: make release evidence repeatable before adding more scope.

Tasks:

1. Diagnose `npm run build:app` timeout.
2. Add a build profiling command or narrow route isolation if Next build hangs.
3. Create authenticated smoke harness for critical routes.
4. Save evidence under `what-next/` after each run.

Done condition:

- `npm run build:app` completes or produces a precise failing stack.
- Authenticated smoke covers dashboard, cash command, reconciliation workbench, stock-to-cash, close readiness, and daily habit surfaces.

### Phase 1 - Module Surface Inventory Gate

Goal: prepare module enforcement without breaking tenants.

Tasks:

1. Generate route/action/API/report/export to module inventory.
2. Compare all slugs against `COMMERCIAL_MODULE_SLUGS`.
3. Add module metadata to protected actions in report mode.
4. Save a drift report.
5. Keep enforcement in observe mode until active drift reaches zero.

Done condition:

- Every protected route/action/API/report/export has a known module mapping or an explicit platform exemption.

### Phase 2 - Reconciliation Workbench Proof Launcher

Goal: put transaction proof where payment operators work.

Tasks:

1. Add proof drawer state to `PaymentReconciliationWorkbench`.
2. Add a row-level proof button for eligible payment transaction rows.
3. Reuse `getProofTrailAction` and `ProofTrailDrawer`.
4. Preserve permission and safe-error behavior.
5. Add targeted tests or at least a focused typecheck and UI smoke.

Done condition:

- A reconciliation operator can open `payment.transaction` proof directly from the workbench row.

### Phase 3 - Public and API Access Hardening

Goal: remove avoidable data exposure from public/API surfaces.

Tasks:

1. Replace public receipt raw id access with signed scoped access or explicit share tokens.
2. Add expiration and audit events for receipt opens.
3. Require explicit item-read permission or token capability on item APIs.
4. Add minimal DTO tests.
5. Add a report-mode scan for public route access patterns.

Done condition:

- Public receipts and item APIs are tenant-safe, permission-safe, and data-minimized.

### Phase 4 - Close Invalidation Completion

Goal: make close readiness stale whenever any material source changes.

Tasks:

1. Wire payroll posting, payment release, and statutory declaration mutations to close invalidation.
2. Wire fiscal/compliance document status changes that affect close packs.
3. Wire country-pack and module/permission changes if they affect certification validity.
4. Add focused transaction-scope tests.

Done condition:

- Payment, ledger, inventory, payroll, compliance, country-pack, and module/permission source changes can mark close certification stale when appropriate.

### Phase 5 - Provider Health and Run Operations

Goal: make payment/reconciliation operations supportable.

Tasks:

1. Add provider health state model.
2. Add run dedupe key and idempotency policy.
3. Add operator runbook links for stuck/degraded providers.
4. Show provider readiness in Cash Command and Reconciliation Workbench.

Done condition:

- Operators can see whether a provider is healthy, degraded, delayed, duplicated, or blocked before trusting reconciliation results.

### Phase 6 - Payroll Product Hardening

Goal: convert the payroll kernel into an enterprise payroll workflow.

Tasks:

1. Add employee/contract lifecycle surfaces.
2. Add payslip generation and controlled employee/self-service access.
3. Add declaration adapters and country-pack mapping.
4. Add DB-level immutability or append-only guarantees for approved payroll artifacts.
5. Add close invalidation and proof trails for payroll events.

Done condition:

- Payroll can be operated, audited, closed, and explained without manual backend-only steps.

### Phase 7 - Dashboard State and Read-Model Convergence

Goal: make all dashboards behave consistently.

Tasks:

1. Reuse dashboard route states for no-data, partial-data, permission-denied, module-unavailable, and safe-error.
2. Move finance and operational metrics into server read models.
3. Add partial-data envelopes where external provider, module, or permission constraints reduce visibility.
4. Add smoke tests for no-data routes.

Done condition:

- Dashboard routes show consistent state surfaces and do not compute business truth on the client.

### Phase 8 - Narrow Enforcement Pilots

Goal: start turning observe-mode controls into enforcement safely.

Tasks:

1. Pick one low-risk module for enforcement pilot.
2. Enable enforcement behind a tenant/module flag.
3. Measure would-block history before flipping.
4. Add rollback and audit evidence.
5. Expand only after zero false positives.

Done condition:

- At least one commercial module is hard-enforced for selected tenants without breaking authorized work.

## Sticky Platform Feature Proposals

These should be built only on top of the governance and read-model work above.

1. Owner Morning Brief v2:
   - Daily "what changed, what matters, what to do now" summary.
   - Pulls from cash, stock, receivables, payables, close, payroll, compliance, and incidents.

2. Manager Daily Run Sheet:
   - Role-specific task list for store/branch/finance managers.
   - Includes due actions, blockers, proof links, and escalation state.

3. Reconciliation Proof Inbox:
   - Queue of payment transactions with missing proof, provider mismatch, stale run, or high suspense impact.

4. Stock-to-Cash Leakage Radar:
   - Shows where money gets stuck between purchase, stock, sale, payment, reconciliation, ledger, and close.

5. Close Readiness Journey Plus:
   - Adds stale-source drawer, invalidation timeline, and "what changed since last certified close."

6. Provider Health Center:
   - One place for mobile money, bank, card, and payment providers: degraded state, last sync, run dedupe, outage notes, and runbook.

7. Payroll Command Center:
   - Payroll readiness, approval, payslip, statutory declaration, payment batch, and employee self-service status in one workflow.

8. Accountant Trust Pack Assistant:
   - Generates accountant-facing evidence packs with redaction, source links, close status, and unresolved blockers.

9. Assurance Incident SLA Board:
   - Converts findings into tracked incidents with owner, due date, recurrence, proof requirement, and escalation policy.

10. Module Admin Control Center:
   - Shows enabled modules, dependencies, would-block history, disabled navigation, and enforcement readiness.

11. Action Nudges and Follow-Ups:
   - System-generated reminders tied to evidence, not generic notifications.
   - Example: "Provider MTN has been degraded for 3 hours; reconcile run is stale; assign finance owner."

12. Weekly Trust Digest:
   - Role-based digest for owner, accountant, manager, and compliance user.
   - Includes only trusted server-side facts and direct action links.

## Better Way To Approach Future Solutions

1. Start with the control plane, not the page.
   - Define permission, module, tenant, audit, proof, redaction, and state behavior before UI.

2. Build server read models first.
   - Dashboards should display business truth from services, not calculate it in React.

3. Put proof where work happens.
   - Every high-risk number or finding should have a nearby proof trail launcher.

4. Promote gates gradually.
   - Use report mode until active violations are zero, then fail mode.

5. Keep vocabulary canonical.
   - Create one module slug map and stop introducing ad hoc names.

6. Prefer narrow pilots.
   - Enforce one module, one route family, or one action family at a time.

7. Save evidence after every gate.
   - Every implementation run should leave a short `what-next/` report with commands, results, remaining blockers, and next step.

## Next Implementation Prompts

Use these in order.

### Prompt 1 - Build and Authenticated Smoke Stabilization

In `E:\ohada saas\newStockFlow\aqstoqflow`, diagnose the `npm run build:app` timeout without touching unrelated lint warnings. Add the smallest useful build evidence or isolation step, create or repair an authenticated smoke harness for the critical protected dashboards, run the relevant verification commands, and save a concise report under `what-next/`.

### Prompt 2 - Module Surface Inventory Gate

In `E:\ohada saas\newStockFlow\aqstoqflow`, implement a report-mode module surface inventory that maps dashboard routes, server actions, API routes, reports, exports, and jobs to the canonical commercial module slugs. Detect unmapped surfaces and slug drift, keep enforcement in observe mode, run focused checks, and save the inventory report under `what-next/`.

### Prompt 3 - Reconciliation Workbench Payment Proof Launcher

In `E:\ohada saas\newStockFlow\aqstoqflow`, add a direct `payment.transaction` proof launcher to the Reconciliation Workbench transaction rows using the existing proof-trail action and drawer patterns. Preserve permission checks, safe errors, and current workbench behavior. Run typecheck and focused boundary checks, then save a short implementation report under `what-next/`.

### Prompt 4 - Public Receipt and Item API Access Hardening

In `E:\ohada saas\newStockFlow\aqstoqflow`, harden public receipt access and organization item APIs. Replace or gate raw public receipt lookup with signed/scoped access, add explicit item-read permission or token capability for item endpoints, keep DTOs data-minimized, add focused tests, run relevant gates, and save a report under `what-next/`.

### Prompt 5 - Close Invalidation Completion

In `E:\ohada saas\newStockFlow\aqstoqflow`, extend close certification invalidation from payment, ledger, and inventory to payroll, compliance/fiscal, country-pack, and module/permission changes where they can affect a close pack. Wire invalidation only at safe committed mutation boundaries, add focused tests, run typecheck and policy gates, and save a report under `what-next/`.

## Recommended 5-Day Execution Order

Day 1:
- Build timeout diagnosis.
- Authenticated smoke harness foundation.

Day 2:
- Module surface inventory report mode.
- Slug drift cleanup plan.

Day 3:
- Reconciliation Workbench proof launcher.
- Payment proof browser smoke.

Day 4:
- Public receipt and item API hardening.
- Data minimization tests.

Day 5:
- Payroll/compliance close invalidation pilot.
- Provider health/run dedupe design slice if time remains.

## Success Criteria

The proposals can be considered fulfilled when:

1. Production build completes or fails with a precise actionable stack.
2. Authenticated smoke evidence covers critical protected dashboards.
3. Module surface inventory reaches zero unmapped critical surfaces.
4. Reconciliation Workbench opens `payment.transaction` proof directly.
5. Public receipt and item APIs are permission/token scoped and minimized.
6. Close invalidation covers all material close-affecting domains.
7. Provider readiness and run dedupe have a visible operator model.
8. Daily surfaces use shared state envelopes and server-side truth.
9. At least one module enforcement pilot runs with no false positives.
10. Every run leaves a dated `what-next/` evidence report.

## Final Recommendation

Do not start by adding more dashboards. The platform already has enough promising surfaces. The highest-leverage work is to turn those surfaces into a trusted operating system: stable build evidence, authenticated smoke, module inventory, proof launch at the point of work, access hardening, close invalidation coverage, and role-based daily action loops.

Once those are in place, the sticky features become much easier to build and much harder for competitors to copy, because they will sit on top of tenant-safe services, evidence trails, redaction policy, and daily operational accountability.
