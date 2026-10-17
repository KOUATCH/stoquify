Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P06 — Verify and harden one offline recovery envelope

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Harden offline replay for one named browser/device envelope without expanding the supported offline promise.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R02/R04; M2 preparation**.
- Accountable role: **Offline/POS engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **2–3 engineer-days; low-to-medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P05](05_CHECKOUT_UNCERTAINTY_RECOVERY.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/pos/offline-sync.service.ts`
- `services/pos/offline-sync.schemas.ts`
- `services/pos/__tests__/offline-sync.service.test.ts`
- `services/pos/pos.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Discover the actual client queue/persistence owner and server replay contract. Record supported browser/device assumptions, policy expiry, device identity, sequence, signature and reference-age checks.
2. Create controlled cases for reconnect, interrupted replay, repeated replay, lost acknowledgement, changed payload, revoked device, expired policy and stale references. Separate persistence durability from server idempotency.
3. Fix only reproduced missing behavior; retain pending evidence and actionable operator recovery. Ensure unresolved offline work is visible to shift/period readiness where required.
4. Provide an explicit unsupported-state message and recovery path; do not silently discard a queue or accept stale authority to clear it.

## Acceptance criteria

- [ ] Replay into sale commit cannot double-post; changed payload/invalid authority is denied.
- [ ] Restart/reconnect preserves pending operations on the tested device and makes unknown status visible.
- [ ] Expired/revoked policy has a defined operator path; no silent drop or false paid state.
- [ ] Supported envelope and untested combinations are documented.

## Verification steps

1. V1; V2 focused offline tests after inspecting the test/imports and configuration; the ECC pilot list does not automatically include offline-sync.
2. V3 for replay concurrency/transaction effects; V4 for actual persistence, tab/browser restart and network interruption. If unavailable, label those claims unverified and retain the fixture protocol.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P06/RESULT.md`
- `docs/retention/execution/P06/OFFLINE_ENVELOPE.md`
- `docs/retention/execution/P06/OFFLINE_FAILURE_MATRIX.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P06's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P12](12_DAY_30_CHECKPOINT.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md)

## Risk controls, data impact and non-goals

Own the discovered offline queue/replay path and its focused tests. No new storage framework, broad PWA rewrite, remote device administration or deletion of customer queues.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
