# Disposable business dataset — 2026-10-28

## Scope and baseline

User-authorized execution: realistic synthetic history spanning twelve months, at least three organizations, multiple branches, a NEW disposable PostgreSQL database. Existing application database and unrelated working-tree changes are out of scope. No deployment or PR is requested.

Current source: 242 Prisma models, 120 migrations; substantial pre-existing uncommitted work. Historical action graph dated 2026-08-09 is discovery evidence only. Existing comprehensive seeds hardcode two organizations and directly create posted financial data; do not reuse these as workflow proof. Workflow contract passed on initial inspection.

## Execution steps and dependency order

1. **Isolation and migration replay.** Own `scripts/disposable-business-dataset.cjs` and `docs/engineering/database/disposable-dataset-2026-10-28/`. Reuse inspected local database creation and migration certification. Pin every connection to a new `stoquify_replay_dataset_*` database, refuse existing targets, retain sanitized logs. Exit: replay twice and current-schema certification pass. Failure: retain disposable target and evidence; do not bypass drift or edit historical migrations.
2. **Inventory and blueprint.** Depend on source inspection; physical inventory depends on step 1. Record every model, implicit join, FK, trigger, dependency and scenario disposition. Exit: no unaccounted tables; distinguish pending coverage from intentional emptiness. Review by ECC blueprint subagent before data writes.
3. **Reference data and personas.** Depend on 1–2. Reuse reviewed reference helpers, explicit organization IDs only; three synthetic organizations, branches, currency/country config and distinct maker/checker personas. Credentials in ignored dataset-specific directory. Exit: authentication and tenant scope verified.
4. **Twelve-month domain histories.** Depend on 3. Use fixed reference date 2026-10-28 and November 2025–October 2026 periods. Use actual domain transitions for controlled writes. Cover purchasing, stock, sales, ledger, HRIS, payroll and implemented supporting modules. Exit: independently reconciled histories and documented current work. Do not manufacture proof or choose arbitrary valid enums merely to fill tables.
5. **Verification and recovery.** Depend on each implemented phase. Independent SQL checks, service flows, deterministic rerun, injected rollback failure, role/tenant denials. Exit: separately reported unit/PostgreSQL/integration evidence; no duplicate effects.
6. **Application walkthrough and handoff.** Depend on 3–5. Isolated app environment and build output; browser roles/routes/EN/FR evidence; runbook, manifest, scenario and coverage reports. Exit: actual rendered checks and remaining limitations recorded honestly.

Steps 1 and source-level inventory can proceed independently; domain phases remain ordered by prerequisites. No shared application files are owned by this task without a concrete need. Rollback consists of retaining failed disposable state for diagnosis and, only under explicit target guards, creating a fresh disposable attempt; never resetting the application DB.

## Verification command policy

Inspect definitions and `docs/ecc/command-registry.json` before package commands. New runner is a reviewed mutation lane, not an audit-allowlisted command. It creates only a named new local database, executes migration CLI against that target, and writes owned artifacts. No application startup, jobs or provider calls during bootstrap. Record exact commands and exit codes. Migration failure blocks data seeding, but not source inventory or implementation of safe orchestration/tests.

## Review and status

ECC blueprint adversarial reviewer: `seed_plan_review`; early findings incorporated (hardcoded org/date assumptions, direct financial inserts, explicit org scopes). Execution status and artifacts live under the owned evidence directory.

## Retained execution outcome

New local target: `stoquify_replay_dataset_20261028_01`. Migration replay and schema certification passed. Reference, accounting, purchase receiving/invoicing, POS, supplier payment and HRIS observation scenarios executed through services. Independent database checks, rollback/concurrency probes and deterministic business-count/ledger-total replay passed. Browser owner sign-in and EN/FR dashboard plus French HRIS directory/profile were exercised.

This plan is not complete. Payroll is blocked by missing reviewed regulatory prerequisites for the requested period; all-table/full-system scenario coverage is still partial. The evidence README and per-table inventory retain the actual limits. No synthetic expert approval, production-data reset or constraint disabling was used.

Final adversarial source/evidence review found and prompted fixes for full connection identity pinning, incomplete POS cart recovery, invoice replay after payment progression, and conditional report wording. The reviewer rechecked those fixes and found no remaining must-fix issue within that narrow scope. This is not independent database/browser execution or full-system acceptance.

## Authorized continuation: monthly trading and additional scenarios

The user explicitly requested completion of twelve months of purchasing and sales and an exact payroll-unblock handoff. `prisma/disposable-history.ts` uses normal approval/receipt/checkout services with a Date-only clock inside the guarded child. Intended coverage is 36 organization/month combinations, 108 historical purchases and 432 sales, with independent checks for actual business dates and deterministic baskets. Existing October fixtures remain. This is a monthly scenario dataset, not daily production-volume history.

`prisma/disposable-scenarios.ts` extends catalogue links, organizational units, cash-evidence review, customer credit and collections, transfers, physical-count variances, supplier returns/credits, leave/time corrections and future salary reviews. Stock writers run sequentially. An actual serialization failure was recovered using retained checkout state and the original idempotency key; a subsequent host interruption resumes through the same guards.

Review findings corrected: attendance leave must match a separately approved 420/60 correction; credit-note instant must follow the return instant; salary request replay must reuse and verify the retained request; cash reconciliation must assert its expected current state; exact org/location and scenario existence checks prevent vacuous passing results; additional document hashes are verified; chronological valuation evidence explicitly depends on constant unit costs and a stated same-timestamp ordering.

The final evidence generator now distinguishes complete monthly trading, successful supported additional scenarios, the 18 expected 2025 invoice country-pack blockers, and payroll/full-system limits. Payroll handoff is documented in `docs/engineering/database/disposable-dataset-2026-10-28/PAYROLL-UNBLOCK.md`, including authentic review/publication requirements and the separate YTD/adjustment integration gap. Positions, employment assignments, reporting and manager delegations now have explicitly synthetic reference fixtures with existing read-service scope tests. Authoring UI/API workflows remain untested; their absence does not block reference seeding.

The continuation also includes completed delivery reservation/issue/billing and synthetic bank payment/statement reconciliation. Bank reference configuration is clearly labelled; independent financial posting, evidence admission, matching and application sign-off use existing services. All three runs reached SIGNED with retained canonical certificate bytes and current-source checks. No live settlement or provider signature is asserted. Adversarial review corrected the HR advisory-lock return type and moved retained funding-journal checks before posting.

Completion gate for this continuation: history and additional scenario commands finish; current schema inventory has no missing models; independent PostgreSQL verification passes; a baseline captured after extension remains stable after replay; scoped types and guard tests pass. Do not treat that as completion of blocked payroll, live provider settlement or every optional platform lifecycle.

Final continuation evidence, 2026-10-29: all 36 organization-month histories and 36 additional scenario executions passed; 108 historical purchases and 432 historical sales are present. All 1,081 independent database assertions passed. Historical and additional runners were replayed sequentially after the final baseline, with no changed business counts, ledger totals or component fingerprints. Four guard tests passed; scoped source checking returned zero owned/imported diagnostics. Final inventory accounts for all 242 models and 247 physical tables, with 111 populated and 131 pending scenario coverage. The 18 expected 2025 invoice blockers and payroll prerequisites remain explicit. No added browser coverage is claimed.

## Authorized continuation: every remaining table

The user subsequently requested all autonomously feasible scenarios for the 131 pending tables and updated PDFs in docs/database-seed. Four disjoint helper lanes cover commerce/public/offline/payment exceptions; HR/payroll/onboarding; firm/accountant/opening/close; and platform/agent/module/assurance workflows. Each lane records every assigned table, actual scenario result or exact source-backed dependency. Root executes the helpers sequentially through the existing manifest/schema guards, retains the original histories, verifies constraints/accounting and new lineage, then establishes a new replay baseline. Reference fixtures are explicitly synthetic; controlled financial operations use current services; no external messages, transfers or invented regulatory reviews are permitted. A missing authoring API alone does not prevent safe synthetic reference setup. The final per-table assessment must eliminate unexplained pending entries, while actual blocked/conditional tables remain visibly unpopulated. Update Markdown and PDFs from the verified results.
