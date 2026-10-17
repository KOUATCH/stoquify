Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P08 — Improve cashier recovery and manager discrepancy work

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Remove concrete task friction in two existing journeys: cashier checkout recovery and manager discrepancy review.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R04/R11; M3 first slice**.
- Accountable role: **Frontend/workflow designer**. This is a responsibility, not an assigned person.
- Indicative effort: **2–3 engineer-days; medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P05](05_CHECKOUT_UNCERTAINTY_RECOVERY.md), [P07](07_GUIDED_SETUP_FIRST_SLICE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `design-system/stoquify/MASTER.md`
- `design-system/stoquify/pages/pos.md`
- `services/daily-habit/daily-habit-digest.service.ts`
- `services/daily-habit/daily-habit-signal-presentation.ts`
- `app/[locale]/(dashboard)/dashboard/pos/page.tsx`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Use the P05 state contract and P07 setup findings. Inspect the approved design system/page contracts and actual client owners before editing.
2. Implement at most the two highest-impact confirmed obstacles: clear recovery wording/action, source-linked discrepancy next step, focus/keyboard behavior, or FR/EN terminology. Reuse existing primitives and truthful service read models.
3. Preserve unknown/stale/unavailable data as distinct from zero and confirmed success. Check role/location visibility and readable mobile/low-bandwidth states.
4. Save repeatable cashier/manager task scripts for later customer observation. A developer walkthrough is not customer satisfaction evidence.

## Acceptance criteria

- [ ] Cashier can find and execute the supported recovery action without losing the operation identity.
- [ ] Manager can trace a discrepancy to its source and next permitted action; source unavailability is explicit.
- [ ] No unauthorized action is exposed by optimistic UI; all mutations remain server-authorized.
- [ ] Record actual FR/EN renderings, keyboard/focus and representative viewport behavior; list untested accessibility claims.

## Verification steps

1. V1; V2 targeted state/component/route-access tests after inspecting their setup.
2. V4 with screenshots/traces for pending, error, empty, recovered and denied states. Measure the actual environment if testing latency; the proposed 3-second p95 budget is not an achieved result.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P08/RESULT.md`
- `docs/retention/execution/P08/TASK_SCRIPTS.md`
- `docs/retention/execution/P08/UI_STATE_EVIDENCE.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P08's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P12](12_DAY_30_CHECKPOINT.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md), [P22](22_REPEATED_TEAM_VALUE.md)

## Risk controls, data impact and non-goals

Own only the selected cashier and manager surfaces and focused tests. No redesign, recoloring, framework upgrade, new task platform or notification campaign.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
