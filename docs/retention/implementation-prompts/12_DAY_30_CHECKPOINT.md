Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P12 — Evaluate the first-month checkpoint and order the next slices

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Audit actual first-month outputs and publish an honest M0 decision and constrained days-31–60 backlog.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **M0; R01–R10**.
- Accountable role: **Programme/product lead with engineering and QA**. This is a responsibility, not an assigned person.
- Indicative effort: **0.5–1 engineer-day; medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md), [P02](02_OUTCOME_METRICS_FIRST_SLICE.md), [P03](03_OPENING_POSITION_FIXTURES.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P05](05_CHECKOUT_UNCERTAINTY_RECOVERY.md), [P06](06_OFFLINE_REPLAY_FIRST_SLICE.md), [P07](07_GUIDED_SETUP_FIRST_SLICE.md), [P08](08_CASHIER_MANAGER_USABILITY.md), [P09](09_PORTABILITY_CONTRACT.md), [P10](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md), [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `docs/ecc/test-lanes.md`
- `docs/retention/STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Read each predecessor RESULT and changed-source evidence. Validate source revision/fingerprints; stale or missing proof is not accepted merely because a prompt was run.
2. Compare the pilot envelope, source-to-ledger map, metric contract, access/recovery prerequisites, failure fixtures, setup slice, archive contract and policy decisions against M0.
3. List open P05/P06 real-DB/browser checks and every external authority gap. Distinguish completed local implementation from runtime verification and customer readiness.
4. Re-estimate remaining effort against actual capacity. Order P13–P18 by unresolved critical path and identify independent work, respecting shared-file ownership.

## Acceptance criteria

- [ ] Every first-month acceptance item is PASS, PARTIAL, BLOCKED or NOT_RUN with evidence and owner.
- [ ] M0 passes only if its required scope/baseline/fixture/owner artifacts exist and unresolved limitations are explicit.
- [ ] No Gate A or paid-launch claim is made from a preparation checkpoint.
- [ ] Each unfinished task has the exact next action and dependency; no silent carryover or optimistic calendar assumption.

## Verification steps

1. V1 and V6. Re-run only focused checks made stale by changed code; do not rerun broad suites as ceremony.
2. Verify document links and status consistency. If predecessors are incomplete, produce a PARTIAL checkpoint with remediation order rather than inventing completion.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P12/RESULT.md`
- `docs/retention/execution/P12/DAY_30_CHECKPOINT.md`
- `docs/retention/execution/P12/DAYS_31_60_EXECUTION_ORDER.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P12's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P13](13_COMPLETE_RECONCILED_CUTOVER.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md), [P17](17_RECOVERY_AND_SERVICE_READINESS.md)

## Risk controls, data impact and non-goals

Read-only application review plus owned evidence/register updates. Do not implement outstanding features or waive trust gates inside this checkpoint.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
