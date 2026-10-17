Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P11 — Define reviewed country scope and provider prerequisites

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Convert country and integration assumptions into a dated support matrix and a precise implementation prerequisite packet.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R09/R10/R12**.
- Accountable role: **Country/domain and integration leads**. This is a responsibility, not an assigned person.
- Indicative effort: **0.5–1 engineer-day plus external review lead time**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md), [P03](03_OPENING_POSITION_FIXTURES.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/regulatory/country-packs/registry.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/payroll/payroll-production-admission.ts`
- `services/payroll/authority-adapter-worker.service.ts`
- `services/payments/adapters/mobile-money-hmac.adapter.ts`
- `services/accounting/accounting-settings.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Verify current capability flags and source provenance. Separate shared OHADA accounting, applicable accounting regime, national tax/payroll, privacy/retention, payment and authority-submission support.
2. Use current official primary sources only for material legal/provider assertions. Record effective dates, applicability and reviewer questions; do not compute new statutory rates or self-certify compliance.
3. Prepare a qualified-accountant review packet for the pilot’s opening and close scope. Keep unsupported CNPS/IRPP/payroll/authority behavior gated according to current source.
4. Rank provider candidates only when tender-volume evidence exists; otherwise retain an explicit hypothesis. Specify one possible provider job, required official documentation, sample evidence, credentials, contracting and support responsibilities for P20.

## Acceptance criteria

- [ ] Implemented, tested, expert-reviewed and live-supported statuses remain separate for every capability.
- [ ] Accounting regime and national obligations are unresolved until appropriate review exists.
- [ ] Generic HMAC ingestion is not labeled a native live connector; sandbox is not labeled production.
- [ ] The packet names missing inputs and owners without contacting providers, authorities or customers.

## Verification steps

1. V1; source/flag comparisons, source-date/applicability checks and primary-source links.
2. No live provider, payroll calculation certification or statutory filing tests in this preparation prompt. Save planned independent expected-result cases for P21.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P11/RESULT.md`
- `docs/retention/execution/P11/COUNTRY_SUPPORT_MATRIX.md`
- `docs/retention/execution/P11/EXPERT_REVIEW_PACKET.md`
- `docs/retention/execution/P11/PROVIDER_PREREQUISITES.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P11's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P12](12_DAY_30_CHECKPOINT.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md), [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md), [P18](18_PILOT_ENTRY_GATE.md), [P20](20_ONE_PROVIDER_INTEGRATION.md), [P21](21_REVIEWED_COUNTRY_CAPABILITY.md), [P24](24_CONDITIONAL_EXPANSION.md)

## Risk controls, data impact and non-goals

Own research/evidence documents only. No credentials, onboarding applications, rate changes, production flag changes or external submissions.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
