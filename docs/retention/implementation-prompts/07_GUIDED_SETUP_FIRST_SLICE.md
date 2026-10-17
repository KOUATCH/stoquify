Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P07 — Connect master import to opening-readiness guidance

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Deliver the shortest truthful setup path from staged masters to reviewed opening readiness, without turning the master importer into a ledger engine.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R03/R04; M1 preparation**.
- Accountable role: **Onboarding/full-stack engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **2–3 engineer-days; medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P03](03_OPENING_POSITION_FIXTURES.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/onboarding/master-data-import.service.ts`
- `actions/onboarding/master-data-onboarding.actions.ts`
- `services/onboarding/__tests__/master-data-control-boundary.test.ts`
- `services/onboarding/__tests__/master-data-import-guards.test.ts`
- `services/inventory/inventory-stock-event.service.ts`
- `design-system/stoquify/MASTER.md`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Discover existing onboarding routes/components and page contract. Trace current staged import, preview, validation, approval and commit states with the P03 synthetic fixture.
2. Add a service-owned cutover-readiness view linking existing completed master steps and outstanding opening-stock/AR/AP/ledger requirements. Show missing or unsupported steps explicitly; never infer balances from imported masters.
3. Implement the minimal FR/EN setup surface and navigation to existing domain-owned workflows. Preserve maker-checker, duplicate handling, rejection and retry behavior.
4. Make imported/proposed/reviewed/posted states distinguishable. Retain source identifiers and explain the next required action without exposing implementation jargon.

## Acceptance criteria

- [ ] A user can import synthetic masters and see the exact remaining opening-position steps.
- [ ] Masters success does not mark opening stock, AR/AP or accounting complete.
- [ ] Wrong-tenant and unauthorized/reviewer-self-approval attempts are denied according to current controls.
- [ ] FR/EN and loading/empty/error/recovery states are usable in the tested view.

## Verification steps

1. V1; V2 existing import guard/control-boundary tests plus the new readiness state cases.
2. V4 using a separately reviewed fixture target/configuration. The package onboarding E2E wrapper invokes migrations; do not run it blindly. V3 is required for any new persisted behavior.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P07/RESULT.md`
- `docs/retention/execution/P07/SETUP_JOURNEY.md`
- `docs/retention/execution/P07/OPENING_READINESS_STATES.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P07's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P08](08_CASHIER_MANAGER_USABILITY.md), [P12](12_DAY_30_CHECKPOINT.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md)

## Risk controls, data impact and non-goals

Own onboarding read model/action/UI and narrow tests only. No generic history import, new opening postings, broad accounting UI rewrite or package migration command.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
