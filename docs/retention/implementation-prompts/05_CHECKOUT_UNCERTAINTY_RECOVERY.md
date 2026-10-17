Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P05 — Fix one bounded checkout uncertainty/replay path

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Make uncertain checkout outcomes safely recoverable while preserving sale, stock, payment evidence and ledger idempotency.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R02; M2 first slice**.
- Accountable role: **POS/backend engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **3–4 engineer-days; medium confidence after reproduction**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `actions/pos/tender.actions.ts`
- `actions/pos/commit-recovery.actions.ts`
- `services/pos/checkout.service.ts`
- `services/pos/checkout-state.ts`
- `services/pos/pos.service.ts`
- `services/pos/__tests__/checkout-lifecycle.service.test.ts`
- `services/pos/__tests__/checkout-lifecycle.postgres.test.ts`
- `services/pos/__tests__/pos-full-commit.postgres.test.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Trace prepare/commit/recover and client request retention through current source. Build a failure matrix for timeout before commit, response loss after commit, same-key retry, changed-payload retry and concurrent retry.
2. Reproduce the highest-risk uncovered case. Implement the smallest fix in its existing owner and add regression tests. If all scenarios are already correct, retain that evidence and fill only missing verification rather than rewriting checkout.
3. Verify that recovered results preserve original operation identity, amounts and related effects. Preserve financial review, period controls, authorization and stock constraints.
4. Expose a truthful recovery contract for P08: confirmed, pending/unknown, rejected and retry-safe states. Do not announce success before confirmed server evidence.

## Acceptance criteria

- [ ] Identical replay produces one set of financial/stock effects and returns the original confirmed outcome.
- [ ] Changed payload and unauthorized tenant/location attempts are rejected consistently.
- [ ] Uncertain state remains recoverable without duplicate sale or forced cart reset.
- [ ] Mocks and actual transaction/concurrency evidence are reported separately; the zero-tax fixture does not certify tax behavior.

## Verification steps

1. V1 and V2-P. Inspect and run focused commit-recovery tests using their actual safe configuration.
2. Use V3-POS lifecycle and full-commit routes only with their explicit disposable prerequisites. Record each failure-injection/concurrency case; skipped tests are not passed.
3. V4: recover from an interrupted response in the supported browser fixture; if browser access is unavailable, preserve the script and mark the rendered claim pending.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P05/RESULT.md`
- `docs/retention/execution/P05/CHECKOUT_FAILURE_MATRIX.md`
- `docs/retention/execution/P05/RECOVERY_STATE_CONTRACT.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P05's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P06](06_OFFLINE_REPLAY_FIRST_SLICE.md), [P08](08_CASHIER_MANAGER_USABILITY.md), [P12](12_DAY_30_CHECKPOINT.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md)

## Risk controls, data impact and non-goals

Own checkout/recovery service-action logic and focused tests; coordinate any shared POS edits with other work. No new payment provider, tender type, stock kernel, or blanket POS refactor.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
