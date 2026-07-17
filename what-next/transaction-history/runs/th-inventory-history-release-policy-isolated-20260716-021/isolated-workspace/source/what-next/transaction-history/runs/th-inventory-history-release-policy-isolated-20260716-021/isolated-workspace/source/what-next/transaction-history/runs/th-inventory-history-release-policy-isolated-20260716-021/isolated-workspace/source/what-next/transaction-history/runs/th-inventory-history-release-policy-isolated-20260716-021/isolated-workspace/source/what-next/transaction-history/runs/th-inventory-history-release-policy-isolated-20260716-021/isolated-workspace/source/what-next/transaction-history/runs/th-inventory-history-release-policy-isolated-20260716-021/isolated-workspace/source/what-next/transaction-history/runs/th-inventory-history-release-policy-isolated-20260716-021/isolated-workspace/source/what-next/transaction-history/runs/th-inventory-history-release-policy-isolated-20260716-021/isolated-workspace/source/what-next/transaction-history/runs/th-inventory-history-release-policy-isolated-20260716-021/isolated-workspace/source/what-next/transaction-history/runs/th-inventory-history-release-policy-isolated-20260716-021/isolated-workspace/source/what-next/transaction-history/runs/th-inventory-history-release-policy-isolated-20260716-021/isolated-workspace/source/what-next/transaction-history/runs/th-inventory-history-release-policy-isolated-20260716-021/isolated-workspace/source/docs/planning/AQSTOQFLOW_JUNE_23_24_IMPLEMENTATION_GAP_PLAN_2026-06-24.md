# AqStoqFlow June 23-24 Implementation Gap Plan

Date: 2026-06-24

## Scope

Reviewed the June 23 and June 24 reports/proposals under `what-next/`, `innovation/`, `moat proposals/`, and `platform insights/`, then cross-checked the recurring proposals against the current repository state.

The goal was not to implement another slice. The goal was to verify which important proposals are already done, which remain partial, why they have not been completed yet, and the most efficient implementation sequence from here.

## Source Set Reviewed

Reviewed reports/proposals dated 2026-06-23 and 2026-06-24:

- `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_PAYMENT_RECON_TRUTH_SYSTEM_REFINEMENT_REPORT_2026-06-23.md`
- `what-next/AQSTOQFLOW_CLOSE_PAYMENT_TRUTH_PHASE_1_RUN_REPORT_2026-06-23.md`
- `what-next/AQSTOQFLOW_CLOSE_PAYMENT_TRUTH_SYSTEM_EXECUTION_ROADMAP_2026-06-23.md`
- `what-next/AQSTOQFLOW_CLOSE_PAYMENT_TRUTH_SYSTEM_SYNTHESIS_AND_SKILL_SUITE_2026-06-23.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SMB_OS_ARCHITECTURE_INSPECTION_REPORT_2026-06-23.md`
- `what-next/AQSTOQFLOW_FIRST_RING_CLOSE_INVALIDATION_MESH_RUN_REPORT_2026-06-23.md`
- `what-next/AQSTOQFLOW_ACCOUNTING_CLOSE_LAYOUT_REAL_ESTATE_REPORT_2026-06-24.md`
- `what-next/AQSTOQFLOW_CLOSE_INVALIDATION_MESH_CONTINUATION_RUN_REPORT_2026-06-24.md`
- `what-next/AQSTOQFLOW_OWNER_MANAGER_FINANCE_LOAD_RECOVERY_REPORT_2026-06-24.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_FAIL_MODE_PROMOTION_REPORT_2026-06-24.md`
- `what-next/AQSTOQFLOW_WORKFLOW_ASSURANCE_INCIDENTS_DASHBOARD_RECOVERY_REPORT_2026-06-24.md`
- `innovation/LEGACY_SERVICE_BOUNDARY_FULL_BURNDOWN_RUN_REPORT_2026-06-23.md`
- `innovation/LEGACY_SERVICE_BOUNDARY_MODERNIZATION_RUN_REPORT_2026-06-23.md`
- `innovation/OWNER_MORNING_BRIEF_SLICE_2026-06-23.md`
- `innovation/CASH_COMMAND_INTELLIGENCE_MVP_IMPLEMENTATION_REPORT_2026-06-24.md`
- `innovation/DASHBOARD_ERROR_STATE_STANDARDIZATION_REPORT_2026-06-24.md`
- `innovation/KONTAVA_DASHBOARD_EXPERIENCE_SKILL_SUITE_INSTALL_EXECUTION_REPORT_2026-06-24.md`
- `innovation/KONTAVA_DASHBOARD_EXPERIENCE_SKILL_SUITE_PROMPTS_2026-06-24.md`
- `innovation/KONTAVA_DASHBOARD_RELEASE_GATE_PAYMENT_TRANSACTION_PROOF_TIMELINE_2026-06-24.md`
- `innovation/KONTAVA_PAYMENT_TRANSACTION_PROOF_TIMELINE_MOAT_RELEASE_GATE_2026-06-24.md`
- `innovation/KONTAVA_PAYMENT_TRANSACTION_PROOF_TIMELINE_WORKFLOW_ASSURANCE_GATE_2026-06-24.md`
- `innovation/KONTAVA_PROOF_EVIDENCE_TIMELINE_PAYMENT_TRANSACTION_RUN_REPORT_2026-06-24.md`
- `innovation/OWNER_WAR_ROOM_MANAGER_ACTION_CENTER_RECOVERY_REPORT_2026-06-24.md`
- `innovation/SIDEBAR_ENTERPRISE_NAVIGATION_MODERNIZATION_REPORT_2026-06-24.md`
- `moat proposals/KONTAVA_CLOSE_ASSURANCE_PAYMENT_RECON_TRUTH_SYSTEM_ROADMAP_PROMPT_2026-06-23.md`
- `platform insights/KONTAVA_PLATFORM_VALUE_MOAT_AUDIT_RUN_2026-06-23.md`

## What Is Already Done

These proposals should not be reopened unless regression evidence appears:

| Area | Status | Evidence |
| --- | --- | --- |
| Service-boundary runtime gate | Done | Active runtime baseline promoted from 76 to 0 and `policy:gates` now uses the strict fail-mode path. Boundary, ratchet, policy, and moat release gates passed. |
| Payment reconciliation read/run split | Done | Finance reconciliation sidebar and workbench access moved from `payments.reconciliation.run` to `payments.reconciliation.read`. |
| Payment trust banner | Done | Phase 1 added provider evidence, statement evidence, signed run, suspense, exception, close-blocker, freshness, and bilingual labels. |
| First close invalidation rings | Done for payment/ledger/inventory | Statement import, reconciliation certificate export/hash drift, provider events, suspense posting, ledger post/reversal, and inventory valuation writes invalidate certified close evidence. |
| Payment transaction proof subject | Done for Cash Command | `payment.transaction` exists in proof contracts/actions/service/tests and Cash Command prefers it for provider proof. |
| PO receive canonical permission | Done | `purchases.orders.receive` exists and legacy aliases are denied in RBAC tests. |
| Owner/manager/cash dashboard recovery | Done as component/service slices | Owner War Room, Manager Action Center, Cash Command, sidebar IA, and dashboard error states now have focused tests and typecheck/lint evidence in their reports. |
| Accounting close layout real estate | Done | Close readiness, certification controls, and export rail layout were repaired without changing close/export semantics. |
| Workflow assurance table crash | Fixed locally | Missing incident tables were applied manually and the owner/manager/control-tower load path stopped crashing. |

## Important Gaps Still Not Done

### 1. Authenticated Browser Smoke And Full Build Evidence

Status: not done enough for release confidence.

What is missing:

- Authenticated route smoke for `/en/dashboard/finance/reconciliation`.
- Authenticated route smoke for `/en/dashboard/accounting/close`.
- Authenticated route smoke for `/en/dashboard/owner-war-room`.
- Authenticated route smoke for `/en/dashboard/manager-action-center`.
- Authenticated route smoke for the finance submenu including Cash Command.
- A full `npm run build:app` rerun with a longer timeout or warmed cache after the owner/manager/finance repairs.

Why it likely remains undone:

- The reports repeatedly note missing Playwright/browser automation or no authenticated session fixture.
- One route probe only confirmed unauthenticated redirect behavior for Cash Command, not the real tenant dashboard.
- Earlier full build evidence timed out or was limited to a narrower owner route.

Why this matters:

The June 23 truth-system reports use browser smoke as a prerequisite for promoting any observe-mode or release-gate claim. Without it, the system has good service/component proof but weaker end-to-end operator proof.

### 2. Reconciliation Workbench Direct Proof Launcher

Status: not done.

What is missing:

- Transaction rows in `components/finance/PaymentReconciliationWorkbench.tsx` should open the same `payment.transaction` proof timeline that Cash Command already exposes.
- The launch should respect `payments.reconciliation.read`, redaction, unavailable proof states, and drawer error/loading states.

Repo evidence:

- `services/evidence/evidence-contracts.ts` includes `payment.transaction`.
- `actions/evidence/proof-trail.actions.ts` dispatches `payment.transaction`.
- `services/evidence/proof-trail.service.ts` builds payment transaction proof.
- `services/cash-command/cash-command.service.ts` wires the subject into Cash Command.
- No equivalent proof launcher is visible in `components/finance/PaymentReconciliationWorkbench.tsx`.

Why it likely remains undone:

- The proof phase deliberately stayed scoped to Cash Command to avoid broad proof graph expansion.
- The follow-up was called out explicitly in both the proof run report and dashboard release gate report.

Why this matters:

Operators resolving payment issues usually work in the reconciliation workbench, not only Cash Command. Proof is implemented, but not available where many users need it most.

### 3. Close Invalidation Mesh Is Still Partial

Status: partially done.

Done:

- Payment statement import.
- Payment provider event capture.
- Payment suspense posting.
- Reconciliation certificate export/hash drift.
- Ledger journal post/reversal.
- Inventory valuation writes.

Still missing:

- Payroll run approval/posting/payment release invalidation hooks.
- Compliance/fiscal submission invalidation hooks.
- Country-pack or statutory-rule changes that alter close readiness.
- Permission/module entitlement changes that affect who can certify/export.
- A compact close stale-source drawer grouped by invalidation source code.

Why it likely remains undone:

- The continuation run intentionally stopped after the first cross-domain rings.
- Payroll, compliance, country-pack, and module-control hooks are more sensitive because they touch legal/payroll/entitlement semantics and need their own focused tests.

Why this matters:

The system can still certify or export close evidence that is stale relative to later payroll/compliance/module changes. The reports correctly avoid claiming a universal invalidation mesh.

### 4. Workflow Assurance Is Operational But Still Observe-Mode

Status: foundation exists, enforcement not promoted.

What exists:

- Registry definitions, runner service, incident spine, incident actions, control tower surfaces, release-gate scripts, and database models exist.
- The June 24 recovery restored missing incident tables locally.

What is still missing:

- Confirmation that the target database is migrated through normal Prisma tooling without manual SQL.
- Seeded/real tenant check runs and incident examples for the current environment.
- Per-check seeded failure fixtures before any enforce-mode promotion.
- A release gate that fails when Prisma models exist but the runtime database lacks the assurance registry/incident tables.
- A narrow tenant-ring enforce pilot with owner, action route, proof/source hash, rollback, and browser smoke.

Why it likely remains undone:

- `enforceMode` remains false across the static reports by design.
- The June 24 database recovery notes that Prisma schema-engine/migrate status/deploy remained unreliable locally.
- The prior reports intentionally treat static readiness as separate from live operational enforcement.

Why this matters:

Workflow Assurance can explain and route failures, but it should not be marketed as a hard operational control until one narrow check is proven end to end in a tenant ring.

### 5. Module Entitlement Hard Enforcement

Status: not done by design.

Repo evidence:

- `services/modules/module-control-contracts.ts` sets `MODULE_CONTROL_MODE = "observe"`.
- `services/modules/module-entitlement.service.ts` allows observe-mode access while recording would-block decisions.
- `hardEnforcementEnabled` remains false in current decisions.

Why it likely remains undone:

- Reports consistently require would-block cleanup, seeded failure evidence, rollback, and browser smoke before hard enforcement.
- Broad hard enforcement could lock valid tenants out if entitlement data is incomplete.

Why this matters:

Module control is currently a visibility and audit layer, not a hard subscription/security boundary.

### 6. Public Receipt And API Item Access Hardening

Status: not done.

What is missing:

- Public receipt access should move from raw ID lookup to signed, expiring, optionally revocable access.
- API item routes should add explicit item read permission checks, not only organization membership.

Repo evidence:

- `app/api/receipts/[receiptId]/route.ts` passes `receiptId` to `getPublicSalesReceipt`.
- `app/api/v1/organisations/[id]/items/route.ts` and `briefItems/route.ts` use `requireApiSessionForOrg`.
- Action-based item reads already use `inventory.items.read`, so the API route can be harmonized with the safer internal pattern.

Why it likely remains undone:

- The June 23 architecture report was an inspection/audit, not a security-hardening run.
- These changes need compatibility decisions for existing receipt links and external API consumers.

Why this matters:

These are direct access-boundary gaps. They should be handled before stronger external claims or broader API exposure.

### 7. Provider Health/Readiness, Run Dedupe, And Ingestion Runbooks

Status: partial.

What exists:

- Payment reconciliation, statement import, provider event capture, stale statement checks, and Cash Command provider-risk display exist.
- Accountant trust already blocks stale/missing provider statement evidence in older slices.

What is still missing:

- A first-class `ProviderAccountHealth` or equivalent read model.
- Provider health cards on reconciliation/cash surfaces.
- Reconciliation run dedupe/concurrency controls.
- Provider outage, duplicate statement, replay, tamper, stale, and high-volume import runbooks.
- Settlement/bank tie-out: provider/bank closing balance equals ledger treasury plus suspense.

Why it likely remains undone:

- The recent work prioritized operator trust banners and proof timelines before external rail hardening.
- Provider health needs more operational semantics than a dashboard card: credential lifecycle, callback lag, import freshness, settlement accounts, retry/replay, and support runbooks.

Why this matters:

This is the difference between internal evidence-grade cash truth and production-grade provider/bank truth.

### 8. Dashboard Experience Suite Phases 8-10

Status: not started after the original suite run; prerequisite proof phase is now partly unblocked.

Missing phases:

- `kontava-stock-to-cash-flow-view`
- `kontava-close-readiness-journey`
- `kontava-daily-habit-digest`

Why it likely remains undone:

- The dashboard suite stopped when the proof domain was not yet selected.
- Payment transaction proof has now been implemented for one domain, but the remaining phases still need a focused implementation pass.

Why this matters:

Owner/manager/cash surfaces are stronger now, but the daily operating habit is incomplete without stock-to-cash flow, close readiness journey, and role-specific digest surfaces.

### 9. Finance Read-Model Minimization And Partial-Data Envelopes

Status: not done.

What is missing:

- Minimize finance route read models per view instead of sharing broad dashboard-level payloads.
- Add shared timeout/partial-data envelopes for non-critical command sources so one slow slice does not break the whole command dashboard.

Why it likely remains undone:

- The June 24 recovery focused on stopping crashes and restoring truthful route states.
- It was intentionally not a broad data-contract refactor.

Why this matters:

It reduces blast radius, latency risk, and permission overexposure in the command surfaces.

## Efficient Implementation Plan

### Slice 0 - Release Verification Foundation

Goal: make every later slice verifiable without manual guessing.

Implement:

- Fix the local Prisma schema-engine/migrate status/deploy failure or add a repo-owned fallback checker that validates required workflow assurance tables.
- Add an authenticated smoke harness for the critical tenant routes.
- Rerun full build with a longer timeout or warmed cache.

Verification:

- `npx prisma validate`
- `npx prisma migrate status` or the new guarded fallback checker
- `npm run typecheck`
- `npm run build:app`
- Authenticated smoke for finance reconciliation, accounting close, owner war room, manager action center, and cash command.

Why first:

Most reports block enforcement on browser smoke and migration reliability. This slice makes later promotions credible.

### Slice 1 - Put Existing Proof Where Operators Work

Goal: reuse implemented proof rather than building new proof domains first.

Implement:

- Add `payment.transaction` proof launch from reconciliation transaction rows.
- Reuse the existing proof drawer/action contract from Cash Command where possible.
- Add unavailable, loading, error, redaction, and permission states.

Verification:

- `npm test -- --runTestsByPath services/evidence/__tests__/proof-trail.service.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand`
- Focused ESLint on touched evidence/finance files.
- Authenticated reconciliation route smoke.

Why second:

The proof engine already exists. This is the highest-value low-risk completion of an explicitly repeated follow-up.

### Slice 2 - Close The Remaining Invalidation Rings

Goal: move from first-ring invalidation to a credible universal close invalidation mesh.

Implement:

- Add typed invalidation source entries for payroll, compliance/fiscal submission, country-pack/statutory-rule changes, and permission/module entitlement changes.
- Wire the least risky hooks first: payroll approval/posting/payment release, compliance submission status change, country-pack registry version change.
- Add the compact close stale-source drawer grouped by source code.

Verification:

- Close assurance pack/service tests.
- Payroll/compliance/country-pack focused tests.
- Accounting close component test for grouped stale sources.
- `npm run service:boundary:fail`
- `npm run policy:gates`

Why third:

The close invalidation architecture is already in place. Finishing the missing domains converts a repeated caveat into product truth.

### Slice 3 - Workflow Assurance Live Observe Pilot

Goal: prove the assurance system produces real tenant incidents before enforcing anything.

Implement:

- Seed/register current assurance definitions in the target environment.
- Run the scheduler/registry in observe mode.
- Persist at least one seeded incident per selected critical check.
- Add a release gate that detects missing registry/incident tables when Prisma models exist.

Verification:

- Assurance registry, incident, scheduler, and release-gate tests.
- Manual or scripted observe run against seed data.
- Control Tower and Manager Action Center authenticated smoke with incident examples.

Why fourth:

The code foundation exists, but the June 24 recovery shows runtime database state can drift. Observe-mode live proof should precede enforcement.

### Slice 4 - Access Boundary Hardening

Goal: close direct access risks before external expansion.

Implement:

- Signed, expiring public receipt token flow with revocation-ready data shape.
- Explicit `inventory.items.read` permission checks in item API routes.
- Compatibility path for existing receipt links if needed.

Verification:

- Receipt public access tests for valid, expired, tampered, revoked/missing, and legacy compatibility cases.
- API item route tests for membership-only denied and item-read allowed.
- Focused ESLint and typecheck.

Why fifth:

This is smaller than provider rail hardening and reduces access-boundary risk quickly.

### Slice 5 - Provider Health And Reconciliation Operations

Goal: turn provider evidence from passive data into operational readiness.

Implement:

- Provider health/readiness read model with statement freshness, callback lag, credential/setup state, active/inactive state, unresolved exceptions, and settlement account status.
- Provider health cards in reconciliation and Cash Command.
- Reconciliation run dedupe/concurrency guard.
- Runbooks for outage, duplicate statement, replay/tamper, stale source, certificate drift, and suspense rollback.

Verification:

- Provider health service tests.
- Reconciliation workbench/Cash Command component tests.
- Duplicate/replay/stale/outage fixtures.
- Workflow Assurance observe report for provider health checks.

Why sixth:

This is necessary for production payment truth, but it is wider and benefits from the proof, smoke, and access-hardening slices being stable first.

### Slice 6 - Dashboard Daily Habit Completion

Goal: complete the dashboard experience suite where it now has proof/trust foundations.

Implement:

- Stock-to-cash flow view.
- Close readiness journey surface.
- Role-specific daily/weekly digest.
- Partial-data envelopes for command dashboards.
- Finance read-model minimization per route.

Verification:

- Service/action/component tests for each dashboard.
- Role redaction and stale-state tests.
- Authenticated smoke for owner, manager, finance, accounting close.

Why seventh:

The user-facing operating loop becomes stronger after proof, invalidation, and provider health are in place. This avoids building attractive dashboards on incomplete trust states.

### Slice 7 - Narrow Enforce Pilots And External Readiness

Goal: promote only proven controls.

Implement:

- Select one workflow assurance check for tenant-ring enforce pilot.
- Select one module entitlement surface for hard enforcement pilot.
- Add seeded failure, owner, proof/source evidence, corrective route, rollback, and browser-smoke evidence.
- Begin external readiness for provider/bank/statutory claims only where credentials, statements, runbooks, and reconciliation proof exist.

Verification:

- Workflow assurance release gate in fail mode.
- Moat release gate in fail mode.
- Policy gates.
- Tenant-ring rollback test or documented rollback run.

Why last:

The reports are clear: enforce-mode without seeded failures, proof/action route, rollback, and browser smoke would be premature.

## Recommended Next Slice

Start with Slice 0, then Slice 1.

Slice 0 removes the biggest verification blind spot: authenticated browser proof and database migration reliability. Slice 1 then delivers an operator-visible win by connecting the already-built `payment.transaction` proof timeline to the reconciliation workbench.

Do not begin broad module enforcement, provider/bank external-readiness claims, or statutory certification claims until the smoke/migration/proof-loop evidence is in place.

## Commands To Rerun After Each Slice

Use focused tests first, then these gates as the slice reaches release shape:

```powershell
npm run typecheck
npm run service:boundary:fail
npm run policy:gates
node scripts/kontava-moat-release-gate.js --mode fail
```

For release-candidate slices, also run:

```powershell
npm run build:app
```

Add the authenticated smoke command once Slice 0 introduces the harness.
