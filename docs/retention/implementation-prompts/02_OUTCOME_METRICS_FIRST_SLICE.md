Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P02 — Implement a minimal outcome-measurement slice

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Define activation and repeated-work outcomes, then implement the smallest reliable measurement slice for completed sales using existing event/read-model infrastructure.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R01**.
- Accountable role: **Product/analytics engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **2–3 engineer-days; low-to-medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/pos/pos.service.ts`
- `services/onboarding/master-data-import.service.ts`
- `services/daily-habit/daily-habit-digest.service.ts`
- `prisma/schema.prisma`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Trace how finalized business operations, retries, reversals and organization identity are recorded. Reuse existing telemetry or durable business events before adding storage or a new analytics service.
2. Specify versioned organization-level activation definitions for retailer, multi-location and finance workflows. Mark unknown baseline values as unknown. Distinguish registration date, data-ready date, trading calendar and first eligible close.
3. Implement a narrow source-backed projection or adapter for completed sale outcomes with organization, operation ID, role, location, occurrence time and evidence quality. Make retries idempotent and automated/demo traffic distinguishable. Instrumentation failure must not change financial outcomes; use an existing durable source/recovery mechanism where available.
4. Create synthetic examples of Week-1/4/8/12 cohorts showing eligible denominators, missing telemetry and immature cohorts. Provide a query/read-model contract for future reporting, not an unrelated dashboard rewrite.

## Acceptance criteria

- [ ] A repeated finalized operation counts once; a reversal is explicit; a failed or uncertain operation is not reported as completed.
- [ ] Cross-tenant reads are denied; no sensitive customer/payroll/provider payload enters analytics.
- [ ] Demo/jobs are excluded from human adoption; missing or immature observations never become inferred churn.
- [ ] One working measurement slice and documented remaining instrumentation exist, or a concrete architecture blocker is recorded without building a speculative warehouse.

## Verification steps

1. V1; V2 focused tests for deduplication, isolation, demo exclusion, reversal and missing/immature observations. Use an inspected existing runner, adding a narrow test lane only when necessary.
2. If persistence or queries change, require V3 for uniqueness and real query results before claiming runtime correctness. Without a disposable target, save implementation plus an explicit DB verification blocker.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P02/RESULT.md`
- `docs/retention/execution/P02/METRIC_CONTRACT.md`
- `docs/retention/execution/P02/SYNTHETIC_COHORT_EXPECTATIONS.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P02's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P12](12_DAY_30_CHECKPOINT.md), [P18](18_PILOT_ENTRY_GATE.md), [P22](22_REPEATED_TEAM_VALUE.md)

## Risk controls, data impact and non-goals

Own the outcome projection/adapter and focused tests discovered through current source. Schema changes require a written minimal migration/replay plan; no production reads or analytics export. Do not backfill historical customer data.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
