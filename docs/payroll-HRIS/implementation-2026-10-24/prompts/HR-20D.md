Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# HR-20D — Validate declarations, settlement evidence and accounting tie-out

**Phase:** Conditional live payroll. **Planning status:** PLANNED. **Accountable delivery role:** Payroll integration engineer, finance controller and country specialist. **Relative effort:** L (not a time commitment). **Direct dependencies:** [HR-20C](HR-20C.md)

## Mission

Demonstrate that accepted payroll totals reach outputs and evidence through the existing controlled lifecycle without duplicate effects.

Execute only this slice under the [shared execution contract](../EXECUTION_CONTRACT.md), including its review lenses, controls, evidence classes and status rules. Read the [master plan](../README.md) first. Confirm dependency evidence before dependent integration or activation; safe preparation may proceed with missing runtime evidence explicitly open.

## Current evidence and crosswalk

Declaration, payment and accounting controls exist; complete current country/runtime acceptance is not established by historical internal completion.

Crosswalk: Blueprint 11/14; existing payments/declarations/accounting controls. These are assessment-era observations, not a substitute for current reproduction. Inspect the [assessment](../../hris-assessment-ohada-1-200-2026-10-24.md) and current implementations before changing code.

## Evidence and candidate owned surfaces

- [services/payroll](<../../../../services/payroll>)
- [services/accounting](<../../../../services/accounting>)
- [actions/payroll](<../../../../actions/payroll>)
- [services/payroll/authority-adapter-worker.service.ts](<../../../../services/payroll/authority-adapter-worker.service.ts>)
- [docs/HRIS-Payroll/payroll-trust-spine-execution/EXECUTION_REGISTER.md](<../../../../docs/HRIS-Payroll/payroll-trust-spine-execution/EXECUTION_REGISTER.md>)

Trace relevant callers, schemas, tests and graph relationships. Declare the actual narrow owned-file set; a listed directory does not authorize editing every module. Preserve unrelated working-tree changes.

## Ordered execution checklist

1. Reconcile current authority output formats, required fields, payment instructions and deadlines to HR-20A contracts.
2. Tie employee/component/register totals to declaration totals, settlement obligations and balanced accounting entries with explicit rounding reconciliation.
3. Exercise queued/retried/timeout outcomes using fake providers and authorized test endpoints; keep exact committed replay recovery after pack retirement.
4. Distinguish prepared/exported/submitted/accepted/paid/reconciled states with evidence, identity and timestamps.
5. Verify rejection/correction, payment-return and close-readiness invalidation paths; split output/settlement/accounting child slices if required.
6. Run the reviewed verification lanes below, record each acceptance result, review rollback, and save the required artifacts. Do not claim completion from source inspection alone.

## Acceptance criteria

- **HR-20D-AC01:** Every declared or posted amount reconciles to immutable accepted payroll sources; discrepancies block finalization.
- **HR-20D-AC02:** Duplicate job delivery or timeout retry produces no duplicate payment/declaration/posting.
- **HR-20D-AC03:** A successful export is not labelled authority acceptance; payment initiation is not labelled settled.
- **HR-20D-AC04:** Paid/rejected/returned/corrected outcomes update reconciliation and close readiness with preserved history.
- **HR-20D-AC05:** Current admission, tenant access, maker-checker and exact-replay recovery pass end-to-end tests.

Every criterion needs PASS/FAIL/NOT_RUN with a concrete artifact or explanation. A missing mandatory test/review remains open. Use not applicable only with a defensible scope reason; do not use it to evade the criterion.

## Verification commands and evidence

Read the current script/config/setup and command registry before executing commands. Start with `npm run agent:workflow:check` after inspection. Follow the [contract's command recipes and separated test lanes](../EXECUTION_CONTRACT.md). Select focused tests from the current source ownership and save their exact commands/exit codes.

- Format/schema fixtures and control regression tests.
- Real-database orchestration, reconciliation and rollback tests; authorized provider sandbox tests reported separately.
- Domain reviewer accepts test artifacts; real filing/payment needs explicit separate operational authorization.

No application .env database fallback, unreviewed reset/seed command, live provider effect or fabricated qualified approval. Source, mocked tests, real-database tests, provider tests and browser checks must be reported separately.

## Data, release and rollback

- **Data/migration:** Preserve existing ledgers/evidence owners. No production posting, bank action, filing or status promotion under this development prompt.
- **Release boundary:** Candidate live-payroll acceptance for HR-21; no automatic activation.
- **Rollback/recovery:** Pause new effects and workers safely; reconcile ambiguous provider outcomes before retry; never erase ledger evidence.
- **Decision or external dependency:** Authority/provider test access and qualified acceptance are required where applicable; unavailable evidence stays an open gate.

## Required artifacts and completion

1. The bounded implementation, focused tests and any necessary reviewed migration/runbook; no unrelated refactor.
2. `what-next/hris-implementation-2026-10-24/HR-20D/RESULT.md` with current baseline, owned files, acceptance matrix, distinct verification results, review lenses, unresolved items and next eligible slice.
3. `what-next/hris-implementation-2026-10-24/HR-20D/evidence.json` with baseline/file hashes, commands, results, timestamps and actual artifact paths; exclude secrets and personal data.
4. A dated follow-up status/evidence entry in `docs/ecc/cameroon-blueprint-execution-2026-10-07.md`, preserving existing program history. Do not mark older work packages incomplete or completed merely because this slice exists.

Use VERIFIED only when every applicable criterion has current evidence. Otherwise report IMPLEMENTED_PENDING_VERIFICATION or the precise BLOCKED condition after completing safe work. Stop after this slice unless a larger sequence was explicitly requested.

## Non-goals

Do not create a parallel employee master, approval engine or generic platform rewrite; do not weaken tenant scope, maker-checker, immutable evidence, country admission or exact-replay recovery. Do not fix unrelated lint, redesign unrelated pages, enable unsupported countries, deploy, commit, file declarations, make payments or send external messages without applicable authorization. Apply the selected mission narrowly.
