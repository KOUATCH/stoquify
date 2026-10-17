Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P21 — Deliver one independently reviewed local capability

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Implement one demanded, independently reviewed accounting/tax/payroll capability for a defined effective period; preserve unsupported-case controls.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Months 4–6; conditional**; roadmap mapping: **R10**.
- Accountable role: **Country/domain engineer with qualified reviewer**. This is a responsibility, not an assigned person.
- Indicative effort: **4–8 engineer-weeks for bounded increment; review lead time separate**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md), [P19](19_PILOT_OBSERVATION_AND_PAID_GATE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/registry.ts`
- `services/payroll/payroll-production-admission.ts`
- `services/payroll/authority-adapter-worker.service.ts`
- `services/accounting/accounting-settings.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Use P11’s support matrix and real demand to select one increment. Obtain or identify qualified rule-review evidence and current primary sources before changing authoritative calculations or production admission.
2. Version applicability, effective periods, provenance, reviewer and unsupported cases. Preserve historical rule results and correction pathways.
3. Implement the bounded change with independently supplied expected-result fixtures, privacy, approval separation, payment-evidence/accounting tie-outs and close invalidation as applicable.
4. Prepare safe suspension/manual-expert fallback. Treat authority submission as a distinct capability requiring independent adapter/authority evidence.

## Acceptance criteria

- [ ] No rule becomes supported merely because its registry status changed.
- [ ] Normal/edge/correction/period-transition cases match reviewed expectations; unsupported cases remain denied.
- [ ] Historical records retain their effective rule/provenance and are not silently recomputed.
- [ ] Qualified review, real-DB/UI and authority operation have distinct outcomes.

## Verification steps

1. V1/V2 independent rule cases; V3 persistence/immutability/replay/migration where touched; V4 role/privacy/correction workflow.
2. V6 qualified review and separately authorized provider/authority checks; missing review blocks production admission.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P21/RESULT.md`
- `docs/retention/execution/P21/CAPABILITY_SUPPORT_PACKET.md`
- `docs/retention/execution/P21/INDEPENDENT_RULE_VERIFICATION.md`
- `docs/retention/execution/P21/COUNTRY_CAPABILITY_ROLLOUT.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P21's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: Follow-up sequence produced by this prompt; no automatic execution.

## Risk controls, data impact and non-goals

No broad OHADA-compliance claim, blanket payroll enablement, real payslip/filing operation or unreviewed rate update. Stop the dependent rule change if authority is missing; finish the review packet.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
