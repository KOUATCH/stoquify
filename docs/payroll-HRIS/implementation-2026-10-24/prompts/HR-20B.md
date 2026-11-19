Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# HR-20B — Close contribution, tax, rounding and year-to-date computation gaps

**Phase:** Conditional live payroll. **Planning status:** PLANNED. **Accountable delivery role:** Payroll engineer and independent payroll reviewer. **Relative effort:** L (not a time commitment). **Direct dependencies:** [HR-20A](HR-20A.md)

## Mission

Make the current calculator meet the reviewed HR-20A examples and full-run reconciliation contract.

Execute only this slice under the [shared execution contract](../EXECUTION_CONTRACT.md), including its review lenses, controls, evidence classes and status rules. Read the [master plan](../README.md) first. Confirm dependency evidence before dependent integration or activation; safe preparation may proceed with missing runtime evidence explicitly open.

## Current evidence and crosswalk

Existing engines and controls must be retained; this plan does not assert every historical calculation gap still exists.

Crosswalk: Blueprint 07/08/09; calculation acceptance follow-up. These are assessment-era observations, not a substitute for current reproduction. Inspect the [assessment](../../hris-assessment-ohada-1-200-2026-10-24.md) and current implementations before changing code.

## Evidence and candidate owned surfaces

- [services/payroll](<../../../../services/payroll>)
- [prisma/schema.prisma](<../../../../prisma/schema.prisma>)

Trace relevant callers, schemas, tests and graph relationships. Declare the actual narrow owned-file set; a listed directory does not authorize editing every module. Preserve unrelated working-tree changes.

## Ordered execution checklist

1. Reproduce remaining gaps against current source before edits; inventory per-component bases, exemptions, ceilings, rates and employer/employee shares.
2. Implement only approved rules with explicit monetary precision, rounding stage and deterministic ordering.
3. Resolve period/YTD context including prior runs, same-pay-date runs, reversals and adjustments without double counting.
4. Preserve immutable calculation snapshots, source provenance and admission checks; prohibit in-place mutation of paid/frozen results.
5. Split by contribution bases, tax/YTD and other charges into ordered child slices if the change exceeds one reviewable unit.
6. Run the reviewed verification lanes below, record each acceptance result, review rollback, and save the required artifacts. Do not claim completion from source inspection alone.

## Acceptance criteria

- **HR-20B-AC01:** All HR-20A independently reviewed examples reconcile per component and at full-run gross/deductions/net/employer-cost totals.
- **HR-20B-AC02:** Rerunning identical certified inputs and pack version produces identical outputs.
- **HR-20B-AC03:** Prior-run/reversal/same-date cases preserve correct YTD balances and explain the included history.
- **HR-20B-AC04:** Unsupported, stale or unreviewed rules fail before financial effects.
- **HR-20B-AC05:** Existing immutable/replay/tenant protections pass relevant regression checks.

Every criterion needs PASS/FAIL/NOT_RUN with a concrete artifact or explanation. A missing mandatory test/review remains open. Use not applicable only with a defensible scope reason; do not use it to evade the criterion.

## Verification commands and evidence

Read the current script/config/setup and command registry before executing commands. Start with `npm run agent:workflow:check` after inspection. Follow the [contract's command recipes and separated test lanes](../EXECUTION_CONTRACT.md). Select focused tests from the current source ownership and save their exact commands/exit codes.

- Pure calculation tests against independent expected values, not values generated by the implementation under test.
- Database historical-context and adjustment tests; no real bank/tax submissions.

No application .env database fallback, unreviewed reset/seed command, live provider effect or fabricated qualified approval. Source, mocked tests, real-database tests, provider tests and browser checks must be reported separately.

## Data, release and rollback

- **Data/migration:** Additive calculation context/provenance only if required; legacy recomputation requires a separate approved correction plan.
- **Release boundary:** Shadow comparison with accepted payroll reference; live activation remains blocked until HR-20D and HR-21.
- **Rollback/recovery:** Stop new calculations using the affected version; retain historical snapshots and apply controlled corrections.
- **Decision or external dependency:** No speculative rates or tax formulas. A difference with the reference is investigated, not automatically assigned to either system.

## Required artifacts and completion

1. The bounded implementation, focused tests and any necessary reviewed migration/runbook; no unrelated refactor.
2. `what-next/hris-implementation-2026-10-24/HR-20B/RESULT.md` with current baseline, owned files, acceptance matrix, distinct verification results, review lenses, unresolved items and next eligible slice.
3. `what-next/hris-implementation-2026-10-24/HR-20B/evidence.json` with baseline/file hashes, commands, results, timestamps and actual artifact paths; exclude secrets and personal data.
4. A dated follow-up status/evidence entry in `docs/ecc/cameroon-blueprint-execution-2026-10-07.md`, preserving existing program history. Do not mark older work packages incomplete or completed merely because this slice exists.

Use VERIFIED only when every applicable criterion has current evidence. Otherwise report IMPLEMENTED_PENDING_VERIFICATION or the precise BLOCKED condition after completing safe work. Stop after this slice unless a larger sequence was explicitly requested.

## Non-goals

Do not create a parallel employee master, approval engine or generic platform rewrite; do not weaken tenant scope, maker-checker, immutable evidence, country admission or exact-replay recovery. Do not fix unrelated lint, redesign unrelated pages, enable unsupported countries, deploy, commit, file declarations, make payments or send external messages without applicable authorization. Apply the selected mission narrowly.
