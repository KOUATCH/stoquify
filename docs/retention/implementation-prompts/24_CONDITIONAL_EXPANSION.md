Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P24 — Evaluate one country or sector expansion and Gate D

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Choose at most one evidence-supported country or sector expansion and produce a new bounded implementation sequence; do not implement speculative country coverage.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Months 7–12; conditional**; roadmap mapping: **R12; Gate D**.
- Accountable role: **Product/programme lead with local domain expertise**. This is a responsibility, not an assigned person.
- Indicative effort: **2–4 engineer-weeks discovery; implementation not yet estimated**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P23](23_WIDER_ROLLOUT_GATE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/regulatory/country-packs/registry.ts`
- `docs/retention/STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Compare deeper value in the current segment with one proposed expansion using authorized demand and service-capacity evidence. Retain current-segment work if expansion lacks support.
2. Map customer jobs, accounting regime, national rules, currency/rounding, language, privacy/retention, provider access, migration and support. Verify material jurisdiction claims with current primary sources and qualified review.
3. Classify every capability reusable, adapted, unsupported or excluded. Identify actual code ownership and dependencies rather than copying country names into the registry.
4. Produce narrowly scoped follow-up prompts with estimates, migration impacts, verification and repeat Gates A–C for the changed envelope. Require Gate D owner/expert decisions before regulated implementation.

## Acceptance criteria

- [ ] Only one expansion envelope is analyzed; no blanket all-OHADA assumption.
- [ ] Demand, expert review and current-customer service capacity have explicit evidence or blockers.
- [ ] New prompt sequence is dependency-ordered and does not claim that existing-country tests certify the new scope.
- [ ] No registry or production capability flag changes occur during discovery.

## Verification steps

1. V1/V6 source, primary-reference, gap and dependency review; no runtime certification claimed for a country not implemented.
2. Validate generated prompt links/coverage and capture the Gate D decision and outstanding human review.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P24/RESULT.md`
- `docs/retention/execution/P24/EXPANSION_GAP_MATRIX.md`
- `docs/retention/execution/P24/GATE_D_DECISION.md`
- `docs/retention/execution/P24/NEXT_COUNTRY_OR_SECTOR_PROMPTS.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P24's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: Follow-up sequence produced by this prompt; no automatic execution.

## Risk controls, data impact and non-goals

Planning only. No country rollout, legal certification, customer/provider contact or simultaneous multiple-country programme.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
