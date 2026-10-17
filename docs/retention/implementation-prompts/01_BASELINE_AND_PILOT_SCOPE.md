Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P01 — Establish the source baseline and bounded pilot scope

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Establish the fixed, reviewable baseline and scope that all later prompts use. Perform repository research and create the execution register; do not implement application features.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R01–R12; M0**.
- Accountable role: **Product and engineering leads**. This is a responsibility, not an assigned person.
- Indicative effort: **0.5–1 engineer-day; scope decisions may take longer**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: None; start here.
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `AGENTS.md`
- `docs/ecc/WORKFLOW.md`
- `docs/ecc/skill-routing.md`
- `docs/ecc/command-registry.json`
- `docs/ecc/test-lanes.md`
- `package.json`
- `graphify-out/manifest.json`
- `graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Record HEAD, dirty/untracked file inventory, relevant content hashes and actual installed/locked versions. Distinguish the local candidate from any deployed release; deployment identity is unknown unless supported by authorized evidence. Never reset the checkout to make it clean.
2. Create a PROPOSED pilot envelope for Cameroon retail/distribution, two to five locations, cashier/manager/accountant roles, FR/EN, named supported tenders/devices and explicit payroll/provider exclusions. Discover existing billing, analytics, support, deployment and backup arrangements from repository evidence; label unknowns.
3. Record the roadmap’s staffing and capacity assumptions. Define owners as roles, not invented people; list decisions requiring a real business/domain owner. Safe defaults permit local fixture work, not live launch.
4. Create an execution status register containing all P01–P24 with dependencies, evidence state, owner role and blockers. All unexecuted prompts remain NOT_RUN. Capture relevant recent what-next/ and innovation/ findings only after checking them against current source.

## Acceptance criteria

- [ ] The baseline identifies the exact checkout and relevant local modifications without leaking secrets.
- [ ] The pilot scope distinguishes proposed, confirmed, unsupported and unresolved entries; external approvals are not fabricated.
- [ ] All 24 prompts and roadmap R01–R12 are accounted for in a dependency-aware register; no deployment or customer-readiness claim is made.

## Verification steps

1. Run V0 and V1 from VERIFICATION_GUIDE.md after current command-chain review. Validate every evidence link and recorded hash against the current checkout.
2. Document graph freshness and at least the existing sale/stock/close node references; do not regenerate graphs.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P01/RESULT.md`
- `docs/retention/execution/P01/BASELINE.md`
- `docs/retention/execution/P01/PILOT_SCOPE.md`
- `docs/retention/execution/P01/DECISIONS.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P01's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P02](02_OUTCOME_METRICS_FIRST_SLICE.md), [P03](03_OPENING_POSITION_FIXTURES.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P05](05_CHECKOUT_UNCERTAINTY_RECOVERY.md), [P09](09_PORTABILITY_CONTRACT.md), [P10](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md), [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P12](12_DAY_30_CHECKPOINT.md)

## Risk controls, data impact and non-goals

Own only the P01 evidence folder and initial execution/STATUS.md. Do not write product code, change package versions, edit environment files, or contact prospective pilots.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
