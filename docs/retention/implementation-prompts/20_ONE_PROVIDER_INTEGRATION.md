Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P20 — Implement one evidence-backed provider capability

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Implement one explicitly selected provider job using current official contracts and P11 prerequisites; keep unsupported provider effects outside scope.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Months 4–6; conditional**; roadmap mapping: **R09**.
- Accountable role: **Integration engineer and provider-operations owner**. This is a responsibility, not an assigned person.
- Indicative effort: **5–9 engineer-weeks for full bounded capability; external lead time separate**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md), [P19](19_PILOT_OBSERVATION_AND_PAID_GATE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/payments/adapters/mobile-money-hmac.adapter.ts`
- `actions/payments/reconciliation.actions.ts`
- `services/reconciliation/payment-reconciliation-run.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Confirm customer-volume evidence, chosen job, official specification/version, country availability, contracting status and authorized test access. Missing production prerequisites permit a contract/synthetic adapter slice, not a live-ready claim.
2. Implement the native boundary behind existing ingestion/reconciliation services: signatures, immutable source IDs, status mapping, pagination/cursors if relevant, retries, late/out-of-order events, reversals, fees and settlement differences.
3. Add sandbox/contract fixtures, credential-rotation and outage runbooks, conservative matching and manual fallback. Separate collection initiation, status lookup, statement ingestion and payout execution.
4. Break the full capability into sequential bounded adapters/contracts/verification slices if it exceeds one run; save exact continuation scope, retaining one provider and one job.

## Acceptance criteria

- [ ] Duplicates and delayed/reversed events cannot fabricate paid status or double-allocate evidence.
- [ ] Raw evidence/provenance and manual exceptions remain available under proper privacy controls.
- [ ] Sandbox, provider approval and live reconciliation statuses are separate; only performed checks are credited.
- [ ] A failed provider dependency can be paused without losing replay evidence or disabling core manual workflows.

## Verification steps

1. V1/V2 adapter contracts; V3 persisted matching/replay; V4 operating exceptions.
2. V6 provider sandbox/live work only with explicit authority and scope. Required live proof compares actual settlement evidence; without it mark production support blocked.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P20/RESULT.md`
- `docs/retention/execution/P20/PROVIDER_CONTRACT.md`
- `docs/retention/execution/P20/PROVIDER_VERIFICATION.md`
- `docs/retention/execution/P20/PROVIDER_OPERATIONS_RUNBOOK.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P20's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: Follow-up sequence produced by this prompt; no automatic execution.

## Risk controls, data impact and non-goals

No credential acquisition, provider application, real transfer, live webhook reconfiguration or native-integration claim without authority/evidence. Do not implement several providers at once.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
