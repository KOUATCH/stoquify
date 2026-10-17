Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P03 — Map cutover ownership and build reconciled synthetic fixtures

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Specify and test a reconciled opening-position contract before adding import or posting behavior.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R03; M1 preparation**.
- Accountable role: **Onboarding/domain engineer with accountant reviewer**. This is a responsibility, not an assigned person.
- Indicative effort: **1.5–2.5 engineer-days; medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/onboarding/master-data-import.service.ts`
- `services/inventory/inventory-stock-event.service.ts`
- `services/inventory/inventory-reconciliation.service.ts`
- `services/accounting/customer-receivable-backfill.service.ts`
- `services/accounting/accounting-settings.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Trace masters, opening stock, valuation, AR, AP and ledger ownership. Confirm postOpeningStock and its ledger-review boundary. Identify actual external opening AR/AP paths; do not treat legacy sales-order backfill as a general importer.
2. Build synthetic fixtures for two locations, two items, an outstanding receivable/payable, and a balanced opening ledger. Include source identifiers, units, monetary precision, reviewer decisions, rejected rows and reconciliation expectations. Use an explicitly non-statutory fixture where tax is irrelevant.
3. Create independently computed totals and checks for duplicate source IDs, quantity/value discrepancies, wrong location/tenant, unbalanced entries, and double posting between stock and ledger opening paths.
4. Document rehearsal, cutover date, approval, corrections and retained source files. Identify which adapter/read model P07 can safely build now and which posting gaps must wait for P13.

## Acceptance criteria

- [ ] Fixture source counts, quantities, values and control totals reconcile with no unexplained difference.
- [ ] Tests expose a duplicated opening posting and a ledger imbalance rather than making the generated expected values mirror implementation.
- [ ] The ownership map names existing services, missing paths and explicit reviewer requirements; it does not invent approved accounting mappings.

## Verification steps

1. V1; V2 pure fixture/contract tests and focused existing inventory/import boundary tests after runner review.
2. Document V3 cases for opening-stock replay and AR/AP/ledger transactions; real DB execution is not required to call the fixture contract prepared, and is not claimed.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P03/RESULT.md`
- `docs/retention/execution/P03/OPENING_POSITION_CONTRACT.md`
- `docs/retention/execution/P03/FIXTURE_MANIFEST.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P03's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P07](07_GUIDED_SETUP_FIRST_SLICE.md), [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P12](12_DAY_30_CHECKPOINT.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md)

## Risk controls, data impact and non-goals

Own synthetic fixtures, focused contract tests and evidence only. No ledger writes, historical import, schema migration or real customer records in this prompt.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
