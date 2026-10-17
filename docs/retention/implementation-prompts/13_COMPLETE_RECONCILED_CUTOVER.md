Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P13 — Complete the bounded opening-position journey

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Implement the missing domain-owned opening-stock/AR/AP/ledger connections needed for the agreed pilot, using P03’s contract and reviewed accounting decisions.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 31–60**; roadmap mapping: **R03; M1**.
- Accountable role: **Onboarding/domain engineer with accountant**. This is a responsibility, not an assigned person.
- Indicative effort: **3–6 engineer-days per agreed slice; low confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P03](03_OPENING_POSITION_FIXTURES.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P07](07_GUIDED_SETUP_FIRST_SLICE.md), [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P12](12_DAY_30_CHECKPOINT.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/onboarding/master-data-import.service.ts`
- `services/inventory/inventory-stock-event.service.ts`
- `services/inventory/inventory-reconciliation.service.ts`
- `services/accounting/customer-receivable-backfill.service.ts`
- `services/accounting/accounting-settings.service.ts`
- `prisma/schema.prisma`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Select the smallest missing path from P12; inspect existing producers and mappings before adding one. Keep stock, receivable/payable and ledger ownership explicit.
2. Implement preview, independent approval, idempotent commit, reconciliation and correction behavior with source provenance. Avoid duplicate ledger effects between opening stock and balances.
3. Connect the P07 readiness surface to actual reviewed/posted results. Preserve unsupported cases as blockers rather than fake completion.
4. Author minimal schema changes only when unavoidable; document replay, migration safety, rollback/forward correction and narrow release scope.

## Acceptance criteria

- [ ] M1 fixtures reconcile quantities, valuation, AR/AP control totals and balanced ledger with zero unexplained differences.
- [ ] Duplicate/retry/concurrent requests cannot double-post; changed payload and self-approval are denied.
- [ ] Rejected rows can be repaired and retried without corrupting accepted rows; original source provenance remains.
- [ ] Applicable accounting mappings have qualified review for live use; missing review blocks that claim.

## Verification steps

1. V1/V2 focused posting/import/correction regressions; V3 real transaction, concurrency, rollback and migration/replay cases where applicable.
2. V4 full cutover rehearsal including denied, repair and recovery states; V6 accountant review evidence is separate.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P13/RESULT.md`
- `docs/retention/execution/P13/CUTOVER_REHEARSAL.md`
- `docs/retention/execution/P13/OPENING_TIE_OUT.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P13's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md), [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md), [P16](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md), [P18](18_PILOT_ENTRY_GATE.md)

## Risk controls, data impact and non-goals

Own only agreed opening paths and setup integration. No automatic historic transaction migration, destructive correction or real tenant cutover.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
