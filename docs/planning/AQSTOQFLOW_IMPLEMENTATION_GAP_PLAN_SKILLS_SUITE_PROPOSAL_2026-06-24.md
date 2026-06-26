# AqStoqFlow Implementation Gap Plan Skills Suite Proposal

Date: 2026-06-24

Source of truth: `what-next/AQSTOQFLOW_JUNE_23_24_IMPLEMENTATION_GAP_PLAN_2026-06-24.md`

## Purpose

This proposal converts the June 23-24 Implementation Gap Plan into a systematic skills suite. The suite is designed to complete every remaining proposal in the plan without reopening completed work, without creating mock-only dashboards, and without promoting observe-mode controls before the repository has migration, smoke, proof, rollback, and release-gate evidence.

The recommended shape is one orchestrator skill plus eight execution skills, aligned to the plan's Slice 0 through Slice 7. Each skill should save a short run report under `what-next/`, update the source coverage matrix, and stop if it cannot verify the slice truthfully.

## Executive Recommendation

Build the suite in this order:

1. `aqstoqflow-gap-plan-orchestrator`
2. `aqstoqflow-release-verification-foundation`
3. `aqstoqflow-reconciliation-proof-launcher`
4. `aqstoqflow-close-invalidation-completion`
5. `aqstoqflow-workflow-assurance-observe-pilot`
6. `aqstoqflow-access-boundary-hardener`
7. `aqstoqflow-provider-health-recon-ops`
8. `aqstoqflow-dashboard-daily-habit-completion`
9. `aqstoqflow-narrow-enforce-external-readiness`

Start implementation with the orchestrator and Slice 0. Do not start broad module hard enforcement, provider/bank external-readiness claims, or statutory certification claims until the release verification foundation and at least one proof loop are working through authenticated route smoke.

## Suite Operating Rules

- Treat the Implementation Gap Plan as the canonical backlog until a newer dated gap plan supersedes it.
- Preserve audit, proof-trail, business-event, stale-metadata, RBAC, locale, redaction, OHADA, and dashboard semantic-token conventions.
- Keep done areas closed unless a current regression is reproduced.
- Prefer surgical repairs and small adapters before rebuilds.
- Do not introduce mock-only or misleading dashboard data.
- Every skill must declare its source reports, touched routes/services/actions/components, verification commands, and remaining risks.
- Every skill must produce a `what-next/` run report with diagnosis, changes, tests, and next steps.
- Enforcement skills must prove rollback and tenant-ring scope before any hard gate is promoted.

## Skill 0 - `aqstoqflow-gap-plan-orchestrator`

Purpose: keep the whole program sequenced, evidence-based, and source-aligned.

Use when: starting any work derived from the Implementation Gap Plan, resuming after a partial slice, or deciding which skill should run next.

Responsibilities:

- Read the current Implementation Gap Plan and the latest run reports under `what-next/`, `innovation/`, `moat proposals/`, and `platform insights/` only when they are directly relevant to the slice.
- Maintain a coverage matrix for all nine remaining gaps and all eight execution slices.
- Detect when a requested change would reopen completed work without regression evidence.
- Decide whether the next step is surgical repair, refactor, rebuild, bridge/adapter, or no-op because the source plan already marks it done.
- Require each execution skill to save a run report under `what-next/`.

Inputs:

- Implementation Gap Plan.
- Latest slice run reports.
- `graphify-out/` architecture reports when route, component, service, hook, or action relationships need impact tracing.

Outputs:

- Updated suite status section in each run report.
- Next-skill recommendation with blockers and evidence required.

Verification:

- Confirm the selected next skill maps to a specific gap or slice.
- Confirm no completed proposal is reopened without current reproduction evidence.
- Confirm the skill reports include files changed, tests run, and residual risk.

Completion criteria:

- The suite can always answer: what is next, why it is next, what it depends on, and what evidence will prove it done.

## Skill 1 - `aqstoqflow-release-verification-foundation`

Maps to: Slice 0 - Release Verification Foundation.

Purpose: make later implementation slices verifiable through migration checks, authenticated browser smoke, and full build evidence.

Responsibilities:

- Fix Prisma schema-engine or migrate-status reliability where feasible.
- If Prisma tooling remains unreliable locally, add a repo-owned fallback checker that validates required workflow assurance tables.
- Add an authenticated smoke harness for:
  - `/en/dashboard/finance/reconciliation`
  - `/en/dashboard/accounting/close`
  - `/en/dashboard/owner-war-room`
  - `/en/dashboard/manager-action-center`
  - finance submenu pages including Cash Command
- Rerun full application build with a longer timeout or warmed cache.
- Save the smoke and build evidence in a dated run report.

Primary target areas:

- Prisma schema and migration validation scripts.
- Existing test/smoke infrastructure.
- Dashboard auth/session fixture setup.
- Critical tenant dashboard routes.

Verification:

```powershell
npx prisma validate
npx prisma migrate status
npm run typecheck
npm run build:app
```

If `npx prisma migrate status` remains blocked by local tooling, the skill must run the fallback checker and explain exactly what it validates.

Completion criteria:

- Critical authenticated routes load, deny access truthfully, or show explicit empty/error states.
- Build evidence exists after the latest owner, manager, finance, and accounting close repairs.
- Later skills can reuse the same smoke harness.

Risk controls:

- Do not fake authenticated smoke with unauthenticated redirect probes.
- Do not mark migration readiness green if only manual SQL was applied.

## Skill 2 - `aqstoqflow-reconciliation-proof-launcher`

Maps to: Slice 1 - Put Existing Proof Where Operators Work.

Purpose: expose the already-built `payment.transaction` proof timeline from the reconciliation workbench where payment operators actually resolve issues.

Responsibilities:

- Add a proof launch action from transaction rows in `components/finance/PaymentReconciliationWorkbench.tsx`.
- Reuse the existing proof drawer and action contract from Cash Command where possible.
- Respect `payments.reconciliation.read`.
- Preserve redaction and proof unavailable states.
- Add drawer loading, error, permission-denied, and empty states.

Primary target areas:

- `components/finance/PaymentReconciliationWorkbench.tsx`
- Evidence contracts/actions/services for `payment.transaction`
- Cash Command proof drawer patterns
- Reconciliation permissions and redaction helpers

Verification:

```powershell
npm test -- --runTestsByPath services/evidence/__tests__/proof-trail.service.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand
npm run typecheck
```

Add or update focused tests for:

- successful proof launch
- unavailable proof
- redacted proof fields
- permission-denied state
- drawer loading and error states

Completion criteria:

- A reconciliation transaction can open truthful payment proof without inventing a new proof domain.
- The workbench remains usable when proof is unavailable or partially redacted.

Risk controls:

- Do not broaden proof subject support beyond the existing `payment.transaction` contract in this slice.
- Do not require run permission for read-only proof viewing.

## Skill 3 - `aqstoqflow-close-invalidation-completion`

Maps to: Slice 2 - Close The Remaining Invalidation Rings.

Purpose: complete the close invalidation mesh beyond the already-done payment, ledger, and inventory rings.

Responsibilities:

- Add typed invalidation source entries for:
  - payroll run approval
  - payroll posting
  - payroll payment release
  - compliance/fiscal submission status changes
  - country-pack or statutory-rule version changes
  - permission/module entitlement changes that affect certify/export authority
- Wire the least risky hooks first, using existing close invalidation service patterns.
- Preserve certified-close audit, business-event, and stale metadata semantics.
- Add a compact close stale-source drawer grouped by invalidation source code.

Primary target areas:

- Close assurance invalidation contracts/services.
- Payroll approval/posting/payment services.
- Compliance/fiscal submission services.
- Country-pack/statutory-rule registry services.
- Module entitlement or certification authority surfaces.
- Accounting close dashboard stale-source UI.

Verification:

```powershell
npm run typecheck
npm run service:boundary:fail
npm run policy:gates
```

Add focused tests for:

- certified close invalidated by payroll approval/posting/payment release
- certified close invalidated by compliance/fiscal submission changes
- certified close invalidated by country-pack/statutory-rule changes
- certified close invalidated by permission/module entitlement changes affecting certifiers/exporters
- grouped stale-source drawer rendering

Completion criteria:

- Previously certified close evidence becomes stale when any listed source changes.
- Operators can see why the close is stale, grouped by source code.

Risk controls:

- Do not alter close pack export semantics except to mark stale evidence truthfully.
- Do not flatten legally sensitive payroll/compliance changes into generic stale states.

## Skill 4 - `aqstoqflow-workflow-assurance-observe-pilot`

Maps to: Slice 3 - Workflow Assurance Live Observe Pilot.

Purpose: prove workflow assurance produces real tenant incidents before any enforcement promotion.

Responsibilities:

- Seed or register current assurance definitions in the target environment.
- Run the assurance scheduler/registry in observe mode.
- Persist at least one seeded incident per selected critical check.
- Add a release gate that fails when Prisma models exist but runtime assurance registry or incident tables are missing.
- Surface incident examples in Control Tower and Manager Action Center without crashing or misleading users.

Primary target areas:

- Workflow assurance registry.
- Incident spine and incident actions.
- Scheduler/runner service.
- Release-gate scripts.
- Control Tower and Manager Action Center incident surfaces.
- Prisma model/table presence checks.

Verification:

```powershell
npm run typecheck
npm run policy:gates
node scripts/kontava-moat-release-gate.js --mode fail
```

Add focused tests for:

- registry definition loading
- observe-mode incident persistence
- seeded failure fixture per selected check
- missing-table release gate failure
- incident route/action/proof metadata

Completion criteria:

- Observe mode produces real incidents for seed data.
- Dashboard routes load with incident examples.
- Missing assurance tables fail a release gate instead of becoming a runtime dashboard crash.

Risk controls:

- Do not promote enforce mode in this skill.
- Do not rely on manual SQL as the only migration proof.

## Skill 5 - `aqstoqflow-access-boundary-hardener`

Maps to: Slice 4 - Access Boundary Hardening.

Purpose: close direct access risks before external expansion.

Responsibilities:

- Move public receipt access from raw ID lookup to signed, expiring, revocation-ready access.
- Preserve a compatibility path for existing receipt links where needed.
- Add explicit `inventory.items.read` permission checks to item API routes that currently rely on organization membership.
- Harmonize API route behavior with safer action-based item read patterns.

Primary target areas:

- `app/api/receipts/[receiptId]/route.ts`
- Public receipt service helpers.
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- API auth/session/RBAC helpers.

Verification:

```powershell
npm run typecheck
```

Add focused tests for:

- valid receipt token
- expired receipt token
- tampered receipt token
- revoked or missing receipt access
- legacy receipt compatibility decision
- item API membership-only denied
- item API with `inventory.items.read` allowed

Completion criteria:

- Public receipt links no longer depend only on raw IDs.
- Item API reads enforce item read permission, not just organization membership.

Risk controls:

- Do not break existing receipt links without an explicit migration or compatibility report.
- Do not overcorrect by requiring unrelated inventory write permissions for read routes.

## Skill 6 - `aqstoqflow-provider-health-recon-ops`

Maps to: Slice 5 - Provider Health And Reconciliation Operations.

Purpose: turn provider evidence into operational readiness across reconciliation and Cash Command.

Responsibilities:

- Add a provider health/readiness read model covering:
  - statement freshness
  - callback lag
  - credential/setup state
  - active/inactive state
  - unresolved exceptions
  - settlement account status
- Add provider health cards to reconciliation and Cash Command.
- Add reconciliation run dedupe/concurrency controls.
- Add runbooks for:
  - provider outage
  - duplicate statement
  - replay/tamper
  - stale source
  - high-volume import
  - certificate drift
  - suspense rollback
- Add settlement/bank tie-out where provider or bank closing balance equals ledger treasury plus suspense.

Primary target areas:

- Payment reconciliation services.
- Provider event and statement import services.
- Cash Command service and components.
- Reconciliation workbench.
- Runbook/reporting docs.
- Workflow assurance checks for provider health.

Verification:

```powershell
npm run typecheck
npm run policy:gates
```

Add focused tests for:

- provider health read model states
- stale provider statement
- callback lag warning
- duplicate run prevention
- concurrent reconciliation run guard
- outage/duplicate/replay/tamper fixtures
- provider health cards in reconciliation and Cash Command

Completion criteria:

- Operators can distinguish healthy, stale, degraded, and unavailable provider accounts.
- Duplicate or concurrent reconciliation runs are controlled.
- Support runbooks exist for realistic provider failure modes.

Risk controls:

- Do not claim external bank readiness without credentials, statement, settlement, and runbook evidence.
- Do not let a slow provider health source crash the whole dashboard.

## Skill 7 - `aqstoqflow-dashboard-daily-habit-completion`

Maps to: Slice 6 - Dashboard Daily Habit Completion and Gap 9 finance read-model minimization.

Purpose: finish the user-facing operating loop after proof, invalidation, provider health, and smoke foundations are stable.

Responsibilities:

- Implement or complete:
  - `kontava-stock-to-cash-flow-view`
  - `kontava-close-readiness-journey`
  - `kontava-daily-habit-digest`
- Add shared partial-data envelopes for command dashboards.
- Minimize finance route read models per view.
- Preserve role redaction, stale states, proof drill-through, and dashboard semantic tokens.
- Keep owner, manager, finance, and accounting close surfaces truthful under empty, loading, error, partial-data, and permission-denied states.

Primary target areas:

- Owner War Room.
- Manager Action Center.
- Cash Command.
- Finance dashboards/submenu pages.
- Accounting close readiness journey.
- Dashboard shell and semantic-token primitives.
- Route-specific finance read-model services.

Verification:

```powershell
npm run typecheck
```

Add focused tests for:

- stock-to-cash flow view data states
- close readiness journey stale/proof states
- daily digest role-specific content
- partial-data envelopes
- finance route read-model minimization
- role redaction and permission-denied states
- authenticated route smoke for owner, manager, finance, and accounting close

Completion criteria:

- The dashboards load with real or truthfully unavailable data.
- One slow or failing non-critical source cannot blank an entire command surface.
- Daily operating habit surfaces are connected to proof, stale-source, and provider-health evidence.

Risk controls:

- Do not build decorative dashboard cards disconnected from real read models.
- Do not introduce broad shared payloads that expose data beyond a route's role and permission needs.

## Skill 8 - `aqstoqflow-narrow-enforce-external-readiness`

Maps to: Slice 7 - Narrow Enforce Pilots And External Readiness.

Purpose: promote only proven controls, one tenant ring and one surface at a time.

Responsibilities:

- Select one workflow assurance check for a tenant-ring enforce pilot.
- Select one module entitlement surface for a hard-enforcement pilot.
- Add seeded failure, owner, proof/source evidence, corrective route, rollback, and browser-smoke evidence.
- Begin external readiness only where provider, bank, or statutory evidence is complete.
- Document rollback paths and stop conditions.

Primary target areas:

- Workflow assurance enforcement toggle.
- Module entitlement hard-enforcement path.
- Release-gate scripts.
- Tenant-ring configuration.
- External readiness reports for provider/bank/statutory surfaces.

Verification:

```powershell
npm run typecheck
npm run policy:gates
node scripts/kontava-moat-release-gate.js --mode fail
```

Add focused tests for:

- enforce pilot allows scoped tenants only
- seeded failure blocks or routes correctly
- rollback restores observe behavior
- module entitlement hard gate denies only the intended pilot surface
- browser smoke proves the corrective route and denial state

Completion criteria:

- One workflow assurance check is enforce-ready in a narrow tenant ring.
- One module entitlement surface is hard-enforced with rollback proof.
- External claims are limited to domains with complete evidence.

Risk controls:

- Do not globally enable module hard enforcement.
- Do not promote enforce mode without rollback and authenticated browser evidence.
- Do not market provider, bank, or statutory readiness beyond proven domains.

## Dependency Map

| Order | Skill | Depends On | Unlocks |
| --- | --- | --- | --- |
| 0 | `aqstoqflow-gap-plan-orchestrator` | Current gap plan | Source discipline, coverage tracking, slice selection |
| 1 | `aqstoqflow-release-verification-foundation` | Orchestrator | All later proof, dashboard, enforcement, and release claims |
| 2 | `aqstoqflow-reconciliation-proof-launcher` | Release verification | Operator proof loop in reconciliation |
| 3 | `aqstoqflow-close-invalidation-completion` | Release verification | Close readiness journey, stale-source truth, certification integrity |
| 4 | `aqstoqflow-workflow-assurance-observe-pilot` | Release verification | Enforce pilot, manager/owner incident confidence |
| 5 | `aqstoqflow-access-boundary-hardener` | Release verification | Safer external receipt/API exposure |
| 6 | `aqstoqflow-provider-health-recon-ops` | Proof launcher, release verification | Payment/provider production readiness and cash dashboard trust |
| 7 | `aqstoqflow-dashboard-daily-habit-completion` | Proof launcher, close invalidation, provider health | Complete owner/manager/finance operating habit |
| 8 | `aqstoqflow-narrow-enforce-external-readiness` | Observe pilot, access hardening, provider health, dashboard smoke | Scoped enforcement and external readiness claims |

## Gap Coverage Matrix

| Gap From Plan | Primary Skill | Supporting Skill | Done Definition |
| --- | --- | --- | --- |
| Authenticated browser smoke and full build evidence | `aqstoqflow-release-verification-foundation` | Orchestrator | Critical routes smoke authenticated and `build:app` rerun |
| Reconciliation workbench direct proof launcher | `aqstoqflow-reconciliation-proof-launcher` | Release verification | Workbench transaction rows open `payment.transaction` proof with truthful states |
| Close invalidation mesh partial | `aqstoqflow-close-invalidation-completion` | Dashboard daily habit | Payroll, compliance, country-pack, and entitlement changes stale certified closes |
| Workflow assurance observe-mode only | `aqstoqflow-workflow-assurance-observe-pilot` | Narrow enforce readiness | Seeded tenant incidents persist and missing tables fail a gate |
| Module entitlement hard enforcement | `aqstoqflow-narrow-enforce-external-readiness` | Access hardening | One scoped pilot hard-enforces with rollback proof |
| Public receipt and API item access hardening | `aqstoqflow-access-boundary-hardener` | Release verification | Receipt access signed/expiring and item APIs require item read permission |
| Provider health/readiness, run dedupe, runbooks | `aqstoqflow-provider-health-recon-ops` | Workflow observe pilot | Provider health model, cards, dedupe, and runbooks are tested |
| Dashboard experience phases 8-10 | `aqstoqflow-dashboard-daily-habit-completion` | Proof launcher, provider health | Stock-to-cash, close journey, and digest surfaces load truthfully |
| Finance read-model minimization and partial-data envelopes | `aqstoqflow-dashboard-daily-habit-completion` | Provider health | Finance routes use smaller view contracts and partial-data envelopes |

## Recommended Execution Cadence

Phase 0: Suite setup and verification foundation.

- Install or draft the orchestrator skill.
- Implement Slice 0.
- Produce authenticated smoke and build evidence.

Phase 1: Highest-value operator proof.

- Run `aqstoqflow-reconciliation-proof-launcher`.
- Prove the reconciliation workbench can launch existing payment proof.

Phase 2: Close and assurance truth.

- Run `aqstoqflow-close-invalidation-completion`.
- Run `aqstoqflow-workflow-assurance-observe-pilot`.
- Keep both in observe/stale-state truth, not enforcement.

Phase 3: Security and provider operations.

- Run `aqstoqflow-access-boundary-hardener`.
- Run `aqstoqflow-provider-health-recon-ops`.

Phase 4: Dashboard habit completion.

- Run `aqstoqflow-dashboard-daily-habit-completion`.
- Re-smoke owner, manager, finance, cash, and accounting close routes.

Phase 5: Narrow promotion.

- Run `aqstoqflow-narrow-enforce-external-readiness`.
- Promote only one workflow check and one module entitlement surface with rollback evidence.

## Standard Verification Ladder

Each skill should run the narrowest relevant tests first. When the slice reaches release shape, run:

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

For dashboard or route-facing slices, also run the authenticated smoke harness introduced by Slice 0.

## Handoff Contract Between Skills

Every execution skill should leave:

- A dated `what-next/` run report.
- A list of files changed.
- Focused tests added or updated.
- Commands run and exact failures, if any.
- New evidence objects, source codes, or stale metadata introduced.
- Any changes to permissions, proof subjects, route smoke fixtures, or release gates.
- A next-skill handoff note explaining what is now unlocked and what remains blocked.

## Risk Register

| Risk | Where It Can Hurt | Mitigation |
| --- | --- | --- |
| Auth smoke remains unauthenticated only | False confidence in dashboard recovery | Slice 0 must create a real authenticated tenant fixture |
| Prisma local tooling remains unreliable | Workflow assurance table drift | Add fallback table checker and keep Prisma failure visible |
| Dashboard polish outruns truth data | Misleading owner/manager/finance surfaces | Require proof/stale/provider/read-model contracts before visual completion |
| Broad module enforcement locks tenants out | Access failures and support incidents | Enforce only one scoped pilot with rollback |
| Provider health becomes another fragile dashboard dependency | Cash/reconciliation routes fail on slow providers | Use partial-data envelopes and degraded states |
| Receipt token migration breaks existing links | Customer-facing receipt failures | Include explicit compatibility path and tests |
| Close invalidation overreaches | False stale close packs | Use typed source codes and focused domain tests |

## What Should Not Be Reopened Without Regression Evidence

- Service-boundary runtime gate.
- Payment reconciliation read/run split.
- Payment trust banner.
- First close invalidation rings for statement import, provider events, suspense posting, reconciliation certificate export/hash drift, ledger post/reversal, and inventory valuation writes.
- Payment transaction proof subject for Cash Command.
- PO receive canonical permission.
- Owner/manager/cash dashboard recovery slices.
- Accounting close layout real estate repair.
- Workflow assurance incident table crash fix.

## Final Recommendation

Create the orchestrator and Slice 0 skills first, then immediately run the reconciliation proof launcher. This follows the source plan's highest-value path: prove the app can be verified end to end, then put existing proof where operators work. After that, finish the remaining close invalidation rings and workflow assurance observe pilot before attempting enforcement or broad dashboard completion.

