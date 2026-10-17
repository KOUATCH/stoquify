Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P14 — Verify and complete the pilot daily operating loop

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Finish the connected sale-to-stock-to-money-to-shift review path for the pilot’s exact operations and correction cases.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 31–60**; roadmap mapping: **R02/R04; M2/M3**.
- Accountable role: **Domain/backend and QA leads**. This is a responsibility, not an assigned person.
- Indicative effort: **4–7 engineer-days per selected gap set; low confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P05](05_CHECKOUT_UNCERTAINTY_RECOVERY.md), [P06](06_OFFLINE_REPLAY_FIRST_SLICE.md), [P08](08_CASHIER_MANAGER_USABILITY.md), [P12](12_DAY_30_CHECKPOINT.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/pos/pos.service.ts`
- `services/purchase-order/purchase-order.service.ts`
- `services/purchasing/payment-release.service.ts`
- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/inventory/inventory-stock-event.service.ts`
- `services/daily-habit/daily-habit-digest.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Build an end-to-end fixture from P13 opening positions through sale, return/void, adjustment, partial receipt, invoice difference, transfer if included, payment evidence, reconciliation and shift review.
2. Repair concrete gaps in existing owners; preserve money/quantity conservation, maker-checker, period controls and downstream close invalidation.
3. Verify uncertain commit, retries, concurrent actors, partial failures and delayed offline/provider evidence across the chain, not only isolated service mocks.
4. Expose actionable manager discrepancies with source, owner and permitted resolution; preserve unresolved items rather than clearing them to finish the day.

## Acceptance criteria

- [ ] M2 proves recoverable operations with no duplicate/missing effects across the declared fixture.
- [ ] M3 manager task resolves a controlled discrepancy with evidence and reviewer decision retained.
- [ ] Receiving proof is not misreported as AP payment-release proof; recording payment evidence is not labeled transfer execution.
- [ ] Unsupported tenders/devices/operations remain explicit.

## Verification steps

1. V1/V2 scoped domain tests; V3 financial/stock commit, receiving, release/reconciliation and correction rollback/concurrency checks.
2. V4 supported cashiers/managers, FR/EN and device/connectivity states. If no safe runtime target exists, retain PARTIAL status; do not certify M2/M3.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P14/RESULT.md`
- `docs/retention/execution/P14/DAILY_LOOP_TIE_OUT.md`
- `docs/retention/execution/P14/DISCREPANCY_RESOLUTION_EVIDENCE.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P14's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md), [P17](17_RECOVERY_AND_SERVICE_READINESS.md), [P18](18_PILOT_ENTRY_GATE.md), [P20](20_ONE_PROVIDER_INTEGRATION.md)

## Risk controls, data impact and non-goals

No provider initiation, new tender, inventory rewrite or unrelated purchasing expansion. Correct posted records through controlled domain operations, not deletions.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
