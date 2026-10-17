Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P18 — Evaluate Gate A and prepare a supervised pilot packet

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Determine whether the current candidate qualifies for a bounded supervised pilot; prepare the packet without deploying or contacting customers.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 31–60**; roadmap mapping: **Gate A; M1–M3**.
- Accountable role: **Product/engineering gate owners with accountant**. This is a responsibility, not an assigned person.
- Indicative effort: **0.5–1 engineer-day; evidence-dependent**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P02](02_OUTCOME_METRICS_FIRST_SLICE.md), [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md), [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md), [P16](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md), [P17](17_RECOVERY_AND_SERVICE_READINESS.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `docs/ecc/test-lanes.md`
- `docs/retention/STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Validate evidence freshness against candidate source, dependency changes and exact pilot scope.
2. Evaluate reconciled setup, recovery, manager tasks, access/privacy, restore, usable authorized data retrieval, support ownership and unsupported-feature exclusions.
3. Create a pilot task schedule, consent/data-handling checklist, assistance log and metric capture protocol for the named roles. Draft communications but do not send.
4. Publish pass/fail/blocker decisions with accountable owner review requirements; list any external authority or environment still missing.

## Acceptance criteria

- [ ] Gate A is PASS only with required S/M/D/B and applicable expert/operational evidence; unknown or skipped required checks block it.
- [ ] No provider or payroll capability enters the envelope without its own evidence.
- [ ] Pilot packet has task scripts, stopping conditions, recovery contacts/roles and data-access plan.
- [ ] Gate decision does not claim pilot execution or authorize deployment/customer contact by itself.

## Verification steps

1. V1/V6 source-to-evidence review. Re-run only affected focused cases where provenance is stale.
2. Cross-check all unresolved items and service promises; mark human approval pending when absent.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P18/RESULT.md`
- `docs/retention/execution/P18/GATE_A_DECISION.md`
- `docs/retention/execution/P18/SUPERVISED_PILOT_PACKET.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P18's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P19](19_PILOT_OBSERVATION_AND_PAID_GATE.md)

## Risk controls, data impact and non-goals

Evidence review and packet only. No release, real-data onboarding, provider operations or customer messages.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
