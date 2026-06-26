# AqStoqFlow HR/Payroll Prerequisite Implementation Prompt Suite

Date: 2026-06-25

Source roadmap:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`

Purpose: provide execution-ready prompts that can be run one by one, in order, to implement the HR/Payroll prerequisites safely and comprehensively.

Mode of this document: prompt-suite creation only. No production code was implemented by creating this file.

## How To Use This Suite

Run the prompts in numeric order. Do not skip ahead when a hard prerequisite fails. Every prompt must:

- Read the source roadmap first.
- Inspect the current repo before assumptions.
- Run its prerequisite gate before implementation.
- Preserve service-owned HR/payroll truth.
- Stop and produce a blocker report when a prerequisite gate fails.
- Save a dated execution report under `what-next/payroll/`.
- Run the release gate requested by that prompt before handoff.

## Global Architecture Rules For Every Prompt

Every prompt in this suite must preserve these rules:

- Services own HR/payroll business truth.
- Server actions expose protected workflows and derive tenant/actor context server-side.
- Dashboards render trusted server-provided data.
- RBAC governs user capability.
- Module entitlement governs tenant/module access.
- Salary/person-data reads are audited and redacted where required.
- No client-computed payroll truth.
- No duplicated payroll metrics.
- No dashboard-specific payroll shadow services.
- No speculative bloat.
- No production route for an unfinished workflow.
- No mutation of finalized payroll evidence in place.
- No statutory legal certainty without expert-reviewed country-pack provenance.
- No broad implementation if an earlier gate fails.

## Global Blocker Report Format

When a prerequisite gate fails, save a report under `what-next/payroll/` with:

- Prompt name.
- Phase and source prerequisite IDs.
- Failed prerequisite.
- Why it blocks the current slice.
- Evidence inspected.
- Files/systems affected.
- Risks if forced.
- Exact next action.
- Tests or checks already run.
- Decision: `blocked`.

## Global Release Gate Menu

Use the smallest relevant subset for the slice, and explain any skipped command:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm run service:boundary:fail
npm run policy:gates
npm run typecheck
```

If Prisma engine generation is blocked locally, use:

```powershell
npx prisma generate --no-engine
```

## Prompt 00: Master Orchestrator

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md` as the source of truth.

Purpose:
Orchestrate the HR/Payroll prerequisite implementation suite in strict order. Do not implement broad HR/payroll functionality directly unless the current selected prompt requires it and its prerequisite gate passes.

Source prerequisite IDs:
P0.01, P0.02, P0.03, P0.04, P0.05, P0.33, P0.34, all downstream phase dependencies.

Inspect first:
- `what-next/payroll/`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `services/payroll/`
- `actions/payroll/`
- `hooks/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `lib/security/`
- `services/modules/`
- `services/accounting/`
- `services/regulatory/`
- `services/assurance/`
- Existing payroll tests and recent payroll reports.

Prerequisite gate:
1. Confirm the roadmap exists and is readable.
2. Confirm the requested phase is the next safe phase.
3. Confirm all earlier hard blockers have a passed report or are structurally satisfied and revalidated.
4. If any earlier blocker is unresolved, stop and save a blocker report.

Implementation scope:
- Select the next appropriate prompt from this suite.
- Run only that slice.
- Require a phase report before moving to the next prompt.
- Maintain a dependency ledger of completed, blocked, and deferred prerequisites.

Do not implement:
- Payroll UI expansion.
- Payslip/self-service.
- Statutory declaration automation.
- Payment release UI.
- Dashboard metrics.
- Any production code outside the selected prompt.

Required tests and gates:
- Use the global release gate menu relevant to the selected prompt.
- Require a saved execution report before handoff.

Stop conditions:
- Missing source roadmap.
- Missing required earlier report.
- Failed hard prerequisite.
- Failed release gate that affects the current slice.

Expected deliverables:
- A dated orchestration report under `what-next/payroll/`.
- Current prompt selected.
- Prerequisites passed/blocked/deferred.
- Next recommended prompt.

Handoff criteria:
- Handoff only to the next numbered prompt whose prerequisite gate passes.
```

## Prompt 01: Phase 0 Governance, Inventory, And Source-Of-Truth Map

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Implement the Phase 0 governance foundation: blueprint-first execution, stop-on-blocker behavior, phase release gate discipline, current-state inventory, and HR/payroll source-of-truth ownership map.

Source prerequisite IDs:
P0.01, P0.02, P0.03, P0.04, P0.05.

Inspect first:
- `what-next/payroll/`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `services/payroll/`
- `actions/payroll/`
- `hooks/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `lib/security/`
- `services/modules/`
- `services/accounting/`
- `services/regulatory/`
- `services/assurance/`
- Existing payroll tests.

Prerequisite gate:
- The roadmap must exist.
- The current task must be Phase 0 readiness, not feature implementation.
- If any source files cannot be inspected, stop and save a blocker report.

Implementation scope:
- Create a dated Phase 0 inventory report.
- Create a source-of-truth ownership map for employee data, contracts, compensation, salary changes, attendance, calculations, payslips, payments, declarations, ledger postings, close evidence, redaction, and command read models.
- Define a standard blocker-report structure.
- Define a standard release-gate checklist for all later prompts.

Do not implement:
- Schema migrations.
- Runtime trigger tests.
- HR source-data services.
- UI expansion.
- Payroll calculations.

Likely files/systems:
- `what-next/payroll/`
- All inspected source surfaces listed above.

Required architecture rules:
- Services own truth.
- Reports must identify the owning service for every future workflow.
- Dashboards must not be listed as truth owners.

Required tests and validation:
- No production tests required unless existing docs/scripts are changed.
- Validate the report by checking it names files inspected, pass/fail status, blockers, and next prompt.

Stop conditions:
- Missing roadmap.
- Unable to inspect core payroll service/action/schema files.
- Existing reports conflict and cannot be reconciled.

Expected deliverables:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_<date>.md`

Handoff criteria:
- Inventory complete.
- Ownership map complete.
- Next prompt is Prompt 02.
```

## Prompt 02: Runtime DB Immutability Proof

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Prove the payroll immutability migration protects finalized payroll evidence at runtime, not only as migration text.

Source prerequisite IDs:
P0.06, P0.07, P0.08, P0.09, P0.10.

Inspect first:
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- Existing Prisma/test database configuration.
- Recent Phase 0 inventory report.

Prerequisite gate:
- Prompt 01 report must exist or equivalent inventory must be current.
- Tenant-scoped payroll core models must exist.
- Immutability migration must exist.
- If no safe test database path exists, stop and save a blocker report rather than guessing.

Implementation scope:
- Verify migration ordering and Prisma schema compatibility.
- Add or improve runtime DB trigger tests that apply migrations and attempt forbidden updates/deletes.
- Test protected records: posted/archived runs, run lines, emitted/corrected/voided payslips, payslip lines, released/settled payment batches, allocations, and declaration payload content.
- Confirm allowed lifecycle metadata updates remain allowed where the migration explicitly permits them.
- Define correction workflow boundaries only as needed to test immutability; do not build correction product surfaces.

Do not implement:
- Payslip UI.
- Payment UI.
- Declaration lifecycle UI.
- Broad correction workflow UI.
- Any bypass of service-owned mutation rules.

Likely files/systems:
- `prisma/migrations/`
- `services/payroll/__tests__/`
- Test database setup.

Required architecture rules:
- Finalized evidence is immutable.
- Changes must use correction/reversal/amendment workflows, not in-place mutation.

Required tests and validation:
- `npm run prisma:validate`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`
- Runtime DB trigger test command if available.

Stop conditions:
- Migration absent.
- Test DB unavailable and no safe alternative exists.
- Trigger behavior cannot be proven.

Expected deliverables:
- Runtime immutability tests or a blocker report.
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_<date>.md`

Handoff criteria:
- Runtime immutability proof passes or blocker report states the exact missing test infrastructure.
- Next prompt is Prompt 03.
```

## Prompt 03: Payroll Hardcode And Legal Boundary Gate

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Formalize and run a payroll-specific statutory hardcode gate and enforce expert-review/legal boundary behavior.

Source prerequisite IDs:
P0.26, P0.27, P3.01, P3.03, P3.04.

Inspect first:
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/country-packs/`
- `services/payroll/payroll-control.service.ts`
- Payroll tests under `services/payroll/__tests__/`
- Country-pack tests.
- Prompt 01 and Prompt 02 reports.

Prerequisite gate:
- Phase 0 inventory must be current.
- Payroll kernel files must be inspectable.
- If country-pack provenance is missing for any production statutory value, stop or scope the work to a blocker report.

Implementation scope:
- Create or refine a payroll-specific scan that flags payroll rates, caps, deadlines, legal values, and formulas hardcoded outside country packs or approved config.
- Ensure fixture/test values are distinguishable from production logic.
- Add release-gate checks for expert-review, unsupported, and fallback states.
- Ensure unsupported/expert-review outputs cannot be presented as legal truth.

Do not implement:
- New statutory formulas.
- Declaration submission adapters.
- Payslip product changes.
- UI claims that a country pack is legally production-ready.

Likely files/systems:
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/country-packs/*`
- `services/payroll/payroll-control.service.ts`
- Regulatory and payroll tests.

Required architecture rules:
- Legal values belong in country packs or reviewed config.
- Expert-review outputs must remain blocked/labeled.

Required tests and validation:
- Regulatory hardcode tests.
- Country-pack validation tests.
- Focused payroll tests if payroll calculation code is touched.
- `npm run policy:gates` if it includes or can include the scan.

Stop conditions:
- Unresolved production hardcodes.
- Unsupported states cannot be distinguished from supported states.
- No safe way to run or validate the gate.

Expected deliverables:
- Hardcode gate implementation or blocker report.
- Dated hardcode/legal-boundary report under `what-next/payroll/`.

Handoff criteria:
- Payroll hardcode gate passes.
- Expert-review boundary is documented.
- Next prompt is Prompt 04.
```

## Prompt 04: Module Entitlement, RBAC, Privacy, And Action Protection Gate

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Prove that payroll access is governed by module entitlement, RBAC, fresh auth, maker-checker controls, salary/person-data permission separation, protected server actions, and redaction policy.

Source prerequisite IDs:
P0.12, P0.14, P0.15, P0.16, P0.17, P0.18, P0.19, P0.20, P0.21, P0.29, P0.30, P0.32.

Inspect first:
- `actions/payroll/`
- `services/_shared/protect.ts`
- `lib/security/rbac-permissions.ts`
- `lib/permissions.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `config/sidebar.ts`
- `services/security/redaction-policy.service.ts`
- Payroll/action/security/sidebar tests.

Prerequisite gate:
- Phase 0 inventory exists.
- Current payroll route/action/read model exists.
- If current payroll access cannot be tested, stop and save a blocker report.

Implementation scope:
- Define or update the payroll persona/RBAC matrix.
- Prove current actions derive tenant/actor context server-side.
- Prove disabled payroll module behavior blocks or redacts current payroll route/action/read model.
- Prove salary/person-level values require proper permissions and are audited/redacted.
- Classify future critical actions requiring fresh auth and maker-checker.
- Keep sidebar honest: no route link without service/action/test backing.

Do not implement:
- New HR subroutes unless they are already backed by services and tests.
- Payslip self-service.
- Payment release UI.
- Command center redesign.

Likely files/systems:
- Files inspected above.
- `services/payroll/__tests__/payroll-privacy.service.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `config/__tests__/sidebar.test.ts`
- `services/security/__tests__/redaction-policy.service.test.ts`

Required architecture rules:
- RBAC controls capability.
- Module entitlement controls tenant/module access.
- Server actions derive tenant and actor.
- Salary reads are audited and redacted.

Required tests and validation:
- Payroll action tests.
- Redaction policy tests.
- Sidebar tests.
- Protect wrapper tests if touched.
- Tenant escape tests where relevant.

Stop conditions:
- Payroll route/actions bypass module entitlement.
- Salary data leaks without permission.
- Client-supplied tenant/actor can influence server workflow.

Expected deliverables:
- RBAC/module/privacy gate changes if needed.
- Dated gate report under `what-next/payroll/`.

Handoff criteria:
- Current payroll access path is protected, redacted, and module-aware.
- Next prompt is Prompt 05.
```

## Prompt 05: Accounting Setup And Close-Impact Gate

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Verify payroll accounting setup, SYSCOHADA posting readiness, run close invalidation, and close-impact classification for payment release, declaration transitions, and correction workflows.

Source prerequisite IDs:
P0.22, P0.23, P0.24, P0.25, P5.04.

Inspect first:
- `services/accounting/default-posting-rules.ts`
- `services/accounting/default-posting-rules.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/payroll/payroll-control.service.ts`
- Payroll and accounting tests.
- Recent close invalidation reports under `what-next/payroll/`.

Prerequisite gate:
- Prompts 01 through 04 must be complete or explicitly satisfied.
- Payroll run close invalidation must be inspectable.
- Accounting posting rules must be inspectable.

Implementation scope:
- Confirm tenant accounting setup requirements for payroll run and payroll payment posting.
- Revalidate `PAYROLL_RUN_POSTED` close invalidation.
- Produce a source-impact decision table for payment release, declaration transitions, and correction writes.
- Wire close invalidation only for sources that truly stale certified close evidence.
- Add data-trust blockers/facts only through service-owned accounting/payroll truth.

Do not implement:
- Payment reconciliation product UI.
- Declaration adapters.
- Payroll register UI.
- Broad close assurance redesign.

Likely files/systems:
- Accounting services and tests.
- Payroll service tests.
- Close-assurance pack tests.

Required architecture rules:
- No payroll posting without balanced source-linked SYSCOHADA entries.
- Close evidence must be truthful and stale when source facts change.

Required tests and validation:
- Payroll control service tests.
- Close-assurance pack tests.
- Default posting rule tests if posting rules change.
- Data-trust tests if facts/blockers change.
- `npm run service:boundary:fail`

Stop conditions:
- Payroll posting can be unbalanced.
- Close-impact source cannot be classified.
- Certified close evidence can remain falsely fresh.

Expected deliverables:
- Accounting/close-impact gate report under `what-next/payroll/`.
- Tests or blocker report.

Handoff criteria:
- Posting readiness and close-impact decisions are recorded.
- Next prompt is Prompt 06.
```

## Prompt 06: Migration, Seed, Backfill, And Payroll Admin Setup

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Prepare migration, seed/backfill, and admin setup readiness for tenant payroll rollout.

Source prerequisite IDs:
P0.35, P0.36, P1.01, P1.03.

Inspect first:
- `prisma/schema.prisma`
- `prisma/migrations/`
- Seed scripts and setup scripts.
- Accounting setup services.
- Module catalog and entitlement services.
- Payroll service setup assumptions.
- Existing tenant/demo data patterns.

Prerequisite gate:
- Phase 0 inventory and accounting setup gate must exist.
- Do not write backfill scripts until source mapping is known.
- If existing employee/user data sources are unclear, stop with a data-mapping blocker report.

Implementation scope:
- Design idempotent seed/backfill for payroll periods, posting rules, employees, contracts, salary/privacy defaults, module entitlements, and payment destination placeholders where appropriate.
- Define payroll setup/admin readiness checks for journal, posting accounts, country pack, payroll frequency, periods, roles, and module entitlement.
- Produce a dry-run plan before any data mutation.

Do not implement:
- Blind production data migrations.
- Employee self-service.
- Payment release UI.
- Statutory formulas.

Likely files/systems:
- Seed/backfill scripts.
- `prisma/`
- Accounting setup services.
- Module services.
- Future payroll setup routes/services.

Required architecture rules:
- Data migration must preserve tenant scope.
- Backfilled evidence must be hashable and auditable.
- Admin setup must validate service truth, not UI assumptions.

Required tests and validation:
- Dry-run report.
- Idempotency tests for seed/backfill.
- Prisma validation.
- Tenant fixture checks.

Stop conditions:
- Employee/user mapping unclear.
- Backfill cannot be made idempotent.
- Accounting setup cannot support payroll posting.

Expected deliverables:
- Seed/backfill/admin setup plan under `what-next/payroll/`.
- Optional implementation only if safe and explicitly scoped.

Handoff criteria:
- Phase 1 can rely on known source-data setup boundaries.
- Next prompt is Prompt 07.
```

## Prompt 07: HR Source-Data Foundation

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build the foundational HR source-data model and services before expanding payroll workflows.

Source prerequisite IDs:
P1.01, P1.02, P1.08, P1.09.

Inspect first:
- `prisma/schema.prisma`
- `services/payroll/`
- Existing user/membership/employee-like models.
- Document/upload services.
- Presence/attendance services.
- Audit/business-event services.
- Reports from Prompts 01 through 06.

Prerequisite gate:
- Phase 0 hard blockers must be resolved or explicitly satisfied.
- Source-of-truth ownership map must exist.
- Persona/RBAC matrix must exist.
- If employee-user mapping is unresolved, scope employee identity work to Prompt 08.

Implementation scope:
- Add or refine schema and services for employee profile, HR documents/evidence references, leave/attendance source integration, and service-owned HR source-data boundaries.
- Ensure tenant scope, audit, business events, redaction, and future self-service readiness.
- Keep routes minimal until services/actions/tests exist.

Do not implement:
- Full employee self-service.
- Contract UI beyond source-data readiness.
- Compensation/rubrique engine.
- Payroll command center.
- Payslip UI.

Likely files/systems:
- `prisma/schema.prisma`
- Future HR/payroll migrations.
- `services/payroll/employee.service.ts`
- Document/evidence services.
- Attendance/presence services.
- Payroll tests.

Required architecture rules:
- Services own HR source truth.
- No UI writes directly to payroll models.
- Every read/write is tenant-scoped.

Required tests and validation:
- Prisma validation/generate.
- Service tests.
- Tenant-boundary tests.
- Audit/event tests.
- Redaction tests for sensitive fields.

Stop conditions:
- Source data cannot be mapped to tenants.
- Existing schema conflicts with required HR data.
- Required evidence/audit services are unavailable.

Expected deliverables:
- HR source-data services/migrations/tests or blocker report.
- Dated Phase 1 source-data report.

Handoff criteria:
- Employee source-data foundation exists enough for Prompt 08.
```

## Prompt 08: Employee Identity And Contract Workflow

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build employee identity, duplicate-risk handling, employee-user mapping, and contract lifecycle workflow.

Source prerequisite IDs:
P1.03, P1.04, P4.01.

Inspect first:
- HR source-data services from Prompt 07.
- User/membership/auth models.
- Existing payroll employee/contract models.
- RBAC/persona matrix.
- Tenant escape tests.

Prerequisite gate:
- Prompt 07 must pass.
- Employee source ownership must be clear.
- If employee-user mapping cannot be proven, do not implement self-service or payslip access.

Implementation scope:
- Build employee master-data workflow with duplicate detection.
- Build reliable employee-user mapping.
- Build contract create/update/terminate/history service and protected actions.
- Add UI routes only when backed by services/actions/tests.

Do not implement:
- Payslip self-service.
- Salary change approval.
- Payment destination approval.
- Command center route expansion beyond links to implemented routes.

Likely files/systems:
- `prisma/schema.prisma`
- `services/payroll/employee.service.ts`
- `services/payroll/contract.service.ts`
- `actions/payroll/*`
- Future `/dashboard/payroll/employees` and `/dashboard/payroll/contracts` routes.

Required architecture rules:
- Employee identity is tenant-scoped.
- Employees cannot access other employees' data.
- Contract truth lives in services.

Required tests and validation:
- Mapping reconciliation tests.
- Duplicate-risk tests.
- Contract service tests.
- Action RBAC/fresh-auth tests where needed.
- Cross-employee denial tests.
- Route smoke for implemented routes.

Stop conditions:
- Employee-user mapping ambiguous.
- Contract history cannot be preserved.
- Cross-tenant employee reads are possible.

Expected deliverables:
- Employee/contract implementation or blocker report.
- Dated employee/contract workflow report.

Handoff criteria:
- Employee and contract source truth exists for compensation and salary workflows.
- Next prompt is Prompt 09.
```

## Prompt 09: Compensation, Rubrique, And Salary Change Approval

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build compensation/rubrique foundation and maker-checker salary change workflow.

Source prerequisite IDs:
P1.05, P1.06, P0.16, P0.17, P0.18, P0.26, P3.02.

Inspect first:
- Employee/contract services from Prompt 08.
- Country-pack resolver and hardcode gate.
- Redaction policy.
- Audit/business-event services.
- Existing payroll calculation service.

Prerequisite gate:
- Employee and contract workflows must be service-backed and tested.
- Payroll hardcode gate must pass.
- RBAC/persona matrix and salary permission separation must exist.

Implementation scope:
- Build compensation/rubrique catalog and employee assignment service.
- Add taxable/social base metadata and country-pack interaction boundaries.
- Build salary change request/approval workflow with maker-checker, fresh auth where required, audit, evidence, effective dates, redaction, and correction semantics.

Do not implement:
- Full statutory formulas beyond interfaces required for rubrique metadata.
- Payslip product surfaces.
- Command center redesign.

Likely files/systems:
- Payroll schema/migrations.
- Compensation/rubrique services.
- Salary change service/actions.
- Redaction policy.
- Country-pack resolver.
- Tests.

Required architecture rules:
- Compensation truth lives in services.
- Legal values remain in country packs.
- Salary changes require protected workflows.

Required tests and validation:
- Prisma validation/generate.
- Rubrique service tests.
- Salary change SoD tests.
- Fresh-auth tests.
- Salary redaction/audit tests.
- Calculation fixture tests where impacted.

Stop conditions:
- Rubrique model cannot express statutory source/provenance safely.
- Salary changes can be approved by the same maker where prohibited.
- Salary data leaks without permission.

Expected deliverables:
- Compensation/rubrique and salary change implementation or blocker report.
- Dated report.

Handoff criteria:
- Compensation source data is ready for payment destination, command read models, and statutory expansion.
```

## Prompt 10: Payment Destination, HR Evidence, And Attendance Readiness

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build payment destination approval, HR evidence references, and leave/attendance readiness needed before payment release UX and payroll command workflows.

Source prerequisite IDs:
P1.07, P1.08, P1.09, P5.03.

Inspect first:
- Employee/contract/compensation services.
- Payment release service.
- Document/evidence services.
- Attendance/presence services.
- Audit/redaction policy.

Prerequisite gate:
- Employee-user mapping exists.
- Maker-checker and salary/privacy rules exist.
- Payment release service controls are inspectable.

Implementation scope:
- Build employee payment destination create/change workflow with approval state, evidence hash, redaction, audit, and maker-checker.
- Add HR document/evidence references for contracts, salary changes, identifiers, and payment details.
- Define leave/attendance source-to-payroll freeze contract and drift detection.

Do not implement:
- Payment release UI.
- Payroll payment reconciliation workbench.
- Payslip self-service.
- Full command center wizard.

Likely files/systems:
- Employee/payment profile service.
- Payroll payment release service.
- Document/upload services.
- Attendance/presence services.
- Tests.

Required architecture rules:
- No payroll payment release without approved payment destination evidence.
- Evidence and attendance truth must be service-owned.

Required tests and validation:
- Payment destination approval tests.
- Payment release blocker tests.
- Attendance freeze/drift tests.
- Redaction tests.
- Tenant-boundary tests.

Stop conditions:
- Payment destination evidence cannot be verified.
- Attendance source data is unstable or not tenant-scoped.

Expected deliverables:
- Payment destination/evidence/attendance implementation or blocker report.
- Dated report.

Handoff criteria:
- HR source data is ready for command read models.
- Next prompt is Prompt 11.
```

## Prompt 11: Payroll Command Read Model

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build a service-owned payroll command read model before any command center UI expansion.

Source prerequisite IDs:
P0.13, P2.01, P2.02, P2.05.

Inspect first:
- Current payroll workbench action/service/component.
- HR source-data services.
- RBAC/persona matrix.
- Redaction policy.
- Module entitlement behavior.
- Evidence/audit services.

Prerequisite gate:
- Phase 1 source data needed by the read model must exist.
- Redaction and salary-read audit gates must pass.
- Module disablement behavior must be tested.

Implementation scope:
- Build a service-owned read model for current payroll period, blockers, readiness, next actions, evidence, freshness, role scope, redaction, and trusted counts.
- Expose through protected server action.
- Keep UI render-only.

Do not implement:
- Command center visual redesign until this read model is tested.
- Client-computed payroll totals.
- Dashboard-only services.

Likely files/systems:
- `services/payroll/*`
- `actions/payroll/*`
- `components/payroll/PayrollControlWorkbench.tsx`
- BI/evidence adapters if used.
- Tests.

Required architecture rules:
- Services own command truth.
- Dashboards render server data only.
- No duplicated payroll metrics.

Required tests and validation:
- Read-model contract tests.
- Redaction tests.
- Salary-read audit tests.
- Module entitlement tests.
- Action RBAC tests.

Stop conditions:
- Any metric must be computed in UI because service data is missing.
- Salary values cannot be redacted safely.
- Module-disabled behavior is unclear.

Expected deliverables:
- Command read model implementation or blocker report.
- Dated read-model report.

Handoff criteria:
- Command read model is trusted and ready for UI.
- Next prompt is Prompt 12.
```

## Prompt 12: Payroll Command Center UX And Proof Drawer

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Recompose the payroll workbench into a role-aware command center only after the service-owned command read model exists.

Source prerequisite IDs:
P2.03, P2.04, P2.05, P2.06, P0.20, P0.34.

Inspect first:
- Command read model from Prompt 11.
- Current payroll workbench component/route.
- Sidebar config and tests.
- Proof/evidence adapter patterns.
- Existing dashboard UI conventions.

Prerequisite gate:
- Prompt 11 must pass.
- Every route/action linked from UI must exist and be tested.
- If a workflow is not implemented, show a blocker state or no link rather than a fake route.

Implementation scope:
- Build first-viewport command brief, action board, blocker-first flow, line-level review shell only where data exists, proof drawer links, role-specific navigation, and route links to implemented workflows.
- Preserve mobile/desktop usability and no overlapping UI.

Do not implement:
- Fake run wizard steps not backed by actions.
- Payslip self-service.
- Declaration automation.
- Payment release UI without payment destination and reconciliation readiness.
- UI-derived payroll totals.

Likely files/systems:
- Payroll components.
- Payroll routes.
- Sidebar config/tests.
- Command read model actions.
- Proof drawer/evidence components.

Required architecture rules:
- UI is render/action shell only.
- No unsupported route links.
- No one-off UI system.

Required tests and validation:
- Component tests where present.
- Route/browser smoke for implemented routes.
- Sidebar tests.
- Action gate tests.
- Visual/manual check for no overlapping text or broken controls.

Stop conditions:
- UI needs data not present in read model.
- Proof links cannot be resolved safely.
- Sidebar would expose unimplemented workflows.

Expected deliverables:
- Command center UX implementation or blocker report.
- Dated command center report.

Handoff criteria:
- Command center can show statutory, payslip, payment, and declaration blockers without pretending those workflows are complete.
- Next prompt is Prompt 13.
```

## Prompt 13: Statutory Country-Pack Expansion

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Expand country-pack-driven payroll calculation with expert-reviewed statutory provenance and fixture gates.

Source prerequisite IDs:
P3.01, P3.02, P3.03, P3.04.

Inspect first:
- Payroll calculation service.
- Compensation/rubrique services.
- Country-pack resolver/validation.
- Cameroon country pack.
- Regulatory tests.
- Hardcode gate report.

Prerequisite gate:
- Compensation/rubrique foundation exists.
- Hardcode gate passes.
- Expert-reviewed inputs are available for any production formula.
- If expert-reviewed inputs are not available, implement only blocked/fallback states and a blocker report.

Implementation scope:
- Expand country-pack-driven calculation mechanisms for supported statutory areas.
- Attach country, pack version, schema version, capability, resolution hash, and legal provenance to run/line/payslip/declaration evidence.
- Add golden fixtures and unsupported-state gates.

Do not implement:
- Legal claims for unreviewed formulas.
- Declaration submission adapters.
- UI that hides expert-review required states.

Likely files/systems:
- `services/payroll/payroll-control.service.ts`
- `services/regulatory/country-packs/*`
- `services/regulatory/country-packs/validation.ts`
- Payroll/regulatory tests.

Required architecture rules:
- Country packs own statutory values.
- Unsupported states block production legal certainty.

Required tests and validation:
- Payroll calculation tests.
- Country-pack validation tests.
- Golden statutory fixtures.
- Hardcode scan.
- Typecheck if touched.

Stop conditions:
- Required legal inputs are not expert-reviewed.
- Hardcoded statutory values are found.
- Existing payroll controls regress.

Expected deliverables:
- Statutory expansion implementation or blocker report.
- Dated statutory gate report.

Handoff criteria:
- Payslip/register work can rely on stable calculation provenance.
- Next prompt is Prompt 14.
```

## Prompt 14: Payslip, Archive, Export, And Employee Self-Service

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build immutable payslip product surfaces, archive/export evidence, and employee self-service only after identity, redaction, immutability, and statutory gates are ready.

Source prerequisite IDs:
P4.01, P4.02, P4.03, P0.08, P0.16, P0.30, P3.04.

Inspect first:
- Employee-user mapping.
- Payslip models/service paths.
- Immutability proof report.
- Redaction policy and salary-read audit.
- Country-pack provenance.
- Document/archive/export services.

Prerequisite gate:
- Employee-user mapping and own-data restriction must pass.
- Runtime immutability must be proven.
- Salary redaction and audit must pass.
- Unsupported statutory states must be visible.

Implementation scope:
- Build immutable payslip viewer/read model.
- Add archive/PDF/export evidence with hashes, actor, purpose, redaction state, and source links.
- Build employee self-service limited to own payslips and permitted own profile subset.
- Require fresh auth for sensitive export or high-risk self-service changes.

Do not implement:
- Cross-employee self-service access.
- Export without audit.
- Legal payslip claims for unsupported statutory calculations.
- Payroll register until payslip/archive is stable.

Likely files/systems:
- Payslip services/actions/routes/components.
- Archive/export/document systems.
- Redaction/audit services.
- Tests.

Required architecture rules:
- Payslip truth comes from emitted immutable payroll records.
- Self-service uses own-data resolver only.
- Exports are audited and redacted.

Required tests and validation:
- Own-data negative tests.
- Redaction tests.
- Salary-read audit tests.
- Export permission/fresh-auth/audit tests.
- Archive hash tests.
- Browser smoke for implemented routes.

Stop conditions:
- Employee-user mapping is ambiguous.
- Payslip evidence can be mutated.
- Export path cannot audit/redact.

Expected deliverables:
- Payslip/self-service/archive implementation or blocker report.
- Dated report.

Handoff criteria:
- Payslip product is ready for register tie-out.
- Next prompt is Prompt 15.
```

## Prompt 15: Payroll Register And Livre De Paie Tie-Out

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build a service-owned payroll register/livre de paie tie-out across payslips, run totals, ledger entries, payments, declarations, and close evidence.

Source prerequisite IDs:
P4.04, P2.02, P3.04, P4.02, P4.03.

Inspect first:
- Command read model.
- Payslip/archive services.
- Payroll posting/source links.
- Payment batch models/services.
- Declaration models/services.
- Close-assurance/data-trust services.

Prerequisite gate:
- Payslip/archive/self-service gate must pass.
- Statutory unsupported-state gates must pass.
- Payroll run posting/source links must be available.

Implementation scope:
- Build a service-owned payroll register read model.
- Tie payslips to run totals, ledger entries, payments, declarations, and close evidence.
- Add export path with redaction/audit.

Do not implement:
- Declaration submission adapters.
- Payment reconciliation product UI.
- Client-computed tie-outs.

Likely files/systems:
- Payroll reporting service.
- Payroll/accounting services.
- Export/archive services.
- Tests.

Required architecture rules:
- Register truth is service-owned.
- No duplicated totals in UI.
- Exports are audited and redacted.

Required tests and validation:
- Tie-out service tests.
- Export audit tests.
- Redaction tests.
- Accounting source-link tests.

Stop conditions:
- Ledger/payment/declaration links are insufficient.
- Register totals would need client computation.

Expected deliverables:
- Payroll register implementation or blocker report.
- Dated register tie-out report.

Handoff criteria:
- Register is ready for declaration, payment, and close assurance expansion.
- Next prompt is Prompt 16.
```

## Prompt 16: Declaration Lifecycle And Adapter Prompt

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build declaration lifecycle and authority adapter foundations without presenting unreviewed outputs as legal truth.

Source prerequisite IDs:
P5.01, P5.02, P3.03, P3.04, P0.10, P0.25, P0.28.

Inspect first:
- `preparePayrollDeclarations`
- Country-pack declaration metadata.
- Compliance services.
- Payroll register/read models.
- Close-impact decision table.
- Audit/evidence services.

Prerequisite gate:
- Statutory fixture and unsupported-state gates must pass.
- Expert-reviewed adapter inputs must exist for any production submission.
- Correction/amendment boundaries must be defined.

Implementation scope:
- Build declaration state machine: prepare, submit, accept, reject, pay, reconcile, archive, amend.
- Add authority evidence capture and immutable source hashes.
- Build adapter contracts with fallback/expert-review states.
- Wire close/data-trust behavior only according to approved close-impact classification.

Do not implement:
- Authority automation for unreviewed adapters.
- UI that hides fallback/expert-review status.
- In-place mutation of submitted declarations.

Likely files/systems:
- Payroll declaration service.
- Regulatory country packs.
- Compliance services.
- Close/data-trust services.
- Tests.

Required architecture rules:
- Declarations are service-owned and evidence-backed.
- Expert-review outputs are blocked/labeled.
- Submitted declarations use amendment/correction paths.

Required tests and validation:
- Adapter contract tests.
- Authority evidence tests.
- Status transition tests.
- Close-impact tests.
- Blocked unsupported-state tests.

Stop conditions:
- Expert-reviewed adapter mappings are unavailable.
- Declaration status transitions are unsafe.
- Close-impact behavior is undecided.

Expected deliverables:
- Declaration lifecycle/adapter implementation or blocker report.
- Dated declaration report.

Handoff criteria:
- Declarations can feed register, data-trust, close, and payment workflows safely.
- Next prompt is Prompt 17.
```

## Prompt 17: Payroll Payment Reconciliation

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build payroll payment reconciliation product foundations after payment destination approval, posting setup, close-impact classification, and archive evidence are ready.

Source prerequisite IDs:
P5.03, P1.07, P0.23, P0.25, P4.03.

Inspect first:
- `releasePayrollPaymentBatch`
- Payment destination approval workflow.
- Payment/reconciliation services.
- Data-trust service.
- Payroll payment posting rules.
- Archive/export evidence services.

Prerequisite gate:
- Payment destination approval is implemented and tested.
- Payroll payment posting setup is ready.
- Close-impact decision for payment release exists.
- Archive/export evidence is ready.

Implementation scope:
- Build payment batch detail and reconciliation read model.
- Add provider/file references, matching, exception handling, settlement state, retry workflow, and evidence links.
- Ensure payment state feeds data-trust and close assurance where required.

Do not implement:
- Payment release UI that bypasses approved destinations.
- Reconciliation metrics computed in UI.
- Cash movement claims without provider/file evidence.

Likely files/systems:
- Payroll service.
- Payment/reconciliation services.
- Data-trust service.
- Payment batch routes/components.
- Tests.

Required architecture rules:
- Payment truth is service-owned.
- No release without approved destination evidence.
- Reconciliation evidence must be auditable.

Required tests and validation:
- Reconciliation service tests.
- Exception/retry tests.
- Payment batch drillthrough smoke.
- Close/data-trust tests where affected.

Stop conditions:
- Payment destination evidence missing.
- Provider settlement state cannot be modeled.
- Data-trust/close impact unclear.

Expected deliverables:
- Payroll payment reconciliation implementation or blocker report.
- Dated payment reconciliation report.

Handoff criteria:
- Payment state can feed close assurance and final release gates.
- Next prompt is Prompt 18.
```

## Prompt 18: Close Assurance And Data-Trust Expansion

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Complete payroll close assurance and data-trust expansion for payments, declarations, corrections, register tie-out, and certified close evidence.

Source prerequisite IDs:
P5.04, P0.25, P4.04, P5.01, P5.03.

Inspect first:
- Close-assurance pack service.
- Data-trust service.
- Payroll register.
- Declaration lifecycle service.
- Payment reconciliation service.
- Payroll correction boundaries.

Prerequisite gate:
- Register tie-out exists.
- Declaration lifecycle exists or is blocked with known limitation.
- Payment reconciliation exists or is blocked with known limitation.
- Close-impact decision table exists.

Implementation scope:
- Add close-impact sources, stale evidence metadata, data-trust facts, blockers, and certified close pack integration where required.
- Ensure payroll payments, declarations, corrections, and register tie-out are represented truthfully in close readiness.

Do not implement:
- Duplicate close services.
- Dashboard-only close/payroll metrics.
- Close invalidation for non-impacting sources without justification.

Likely files/systems:
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/data-trust.service.ts`
- Payroll services.
- Accounting tests.

Required architecture rules:
- Certified close evidence must become stale when close-impacting payroll facts change.
- Data-trust consumes service-owned payroll facts.

Required tests and validation:
- Close invalidation tests.
- Data-trust tests.
- Close pack tests.
- Payroll register tie-out tests.

Stop conditions:
- Source impact cannot be justified.
- Close evidence can remain falsely fresh.
- Register/payment/declaration evidence is incomplete.

Expected deliverables:
- Close/data-trust implementation or blocker report.
- Dated close assurance report.

Handoff criteria:
- Close and data-trust gates are ready for assurance/chaos testing.
- Next prompt is Prompt 19.
```

## Prompt 19: Assurance, Chaos, Browser Smoke, And Release Gates

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Build the final assurance, chaos, tenant, export, self-service, browser, and release validation matrix.

Source prerequisite IDs:
P0.31, P0.32, P0.33, P6.01, P6.02.

Inspect first:
- All reports from Prompts 01 through 18.
- Payroll service/action tests.
- Self-service/export tests.
- Close/data-trust tests.
- Implemented payroll routes/components.
- Playwright or route smoke infrastructure if present.

Prerequisite gate:
- Prompts 01 through 18 must be passed or intentionally blocked with a clear scope boundary.
- Do not create browser smoke tests for routes that do not exist.

Implementation scope:
- Add full tenant escape matrix for list/read/write/export/self-service.
- Add chaos tests for rollback, double-submit, concurrent approval, closed-period posting, correction integrity, payment/declaration edge cases.
- Add browser/route smoke tests for implemented routes only.
- Run phase release gates and save evidence.

Do not implement:
- New business features.
- UI routes just to satisfy smoke tests.
- Tests that assert fake workflows.

Likely files/systems:
- Payroll tests.
- Action tests.
- Export/self-service tests.
- Close tests.
- Browser smoke tests.
- Package scripts.

Required architecture rules:
- Tests verify service-owned truth and protected actions.
- No test should bless client-computed payroll truth.

Required tests and validation:
- Full relevant test matrix.
- Global release gate menu.
- Browser/route smoke for implemented routes.
- Static scan for unfinished production surfaces.

Stop conditions:
- Hard gate fails.
- Route exists without service/action backing.
- Tenant escape or salary leak discovered.

Expected deliverables:
- Assurance/chaos/browser release report under `what-next/payroll/`.
- Test changes or blocker report.

Handoff criteria:
- Validation evidence is ready for observability/runbooks and final readiness decision.
- Next prompt is Prompt 20.
```

## Prompt 20: Observability, Incident Handling, And Runbooks

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Add or document operational readiness for payroll failures, blocked postings, failed payments, declaration failures, privacy incidents, stale close evidence, and operator runbooks.

Source prerequisite IDs:
P6.03, P6.04.

Inspect first:
- Assurance/incident services.
- Notification/action routing services.
- Error handling patterns.
- Reports from earlier prompts.
- Implemented payroll workflows.

Prerequisite gate:
- Core workflows must exist or have explicit blocked scope.
- Assurance/chaos report must exist.

Implementation scope:
- Add alert/action routing and incident categories for payroll-critical failures where appropriate.
- Create runbooks for payroll operation, correction, payment failure, declaration fallback, country-pack review, export, self-service privacy, and close evidence.
- Save operational docs under `what-next/payroll/` or the repo's docs/runbook area.

Do not implement:
- New payroll business workflows.
- New UI unless required by existing operational incident surfaces.
- Legal claims beyond proven scope.

Likely files/systems:
- Error handling services.
- Assurance registry/incident services.
- Notification/action services.
- `what-next/payroll/`
- Docs/runbooks.

Required architecture rules:
- Operational signals must reference service-owned facts.
- Incidents must not leak salary/person data.

Required tests and validation:
- Incident tests.
- Alert/action routing tests.
- Runbook review checklist.
- Redaction tests if incident payloads include payroll data.

Stop conditions:
- Incident payloads leak sensitive data.
- Runbooks contradict implemented workflows.
- Operational routing cannot reference service-owned truth.

Expected deliverables:
- Observability/runbook implementation or documentation.
- Dated operational readiness report.

Handoff criteria:
- Final production readiness decision can be evaluated.
- Next prompt is Prompt 21.
```

## Prompt 21: Final Production Readiness Report

```text
Read `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`.

Purpose:
Produce the final production readiness decision report for the HR/Payroll prerequisite implementation program.

Source prerequisite IDs:
P6.05 and all P0 through P6 gates.

Inspect first:
- All prompt reports from this suite.
- Current git diff or changed files summary.
- Test outputs from release gates.
- Remaining blocker reports.
- Implemented HR/payroll routes, services, actions, tests, and docs.

Prerequisite gate:
- Every hard blocker must be either passed or explicitly listed as unresolved.
- If any production-critical hard blocker remains unresolved, the final decision must be `not production-ready`.

Implementation scope:
- Summarize completed prerequisites.
- Summarize unresolved blockers.
- List tests/gates run and status.
- List files changed by the implementation program.
- List source-of-truth risks avoided or remaining.
- Define approved production scope and explicit non-production scope.
- Recommend the next action.

Do not implement:
- Production code.
- Last-minute feature fixes.
- UI changes.
- Scope expansion.

Likely files/systems:
- `what-next/payroll/`
- Test outputs.
- Reports from Prompts 01 through 20.

Required architecture rules:
- Do not claim production readiness from the payroll workbench alone.
- Do not hide unresolved statutory, privacy, tenant, close, or payment blockers.

Required tests and validation:
- Validate that all report links/files exist.
- Validate no hard blocker is omitted.
- Validate final decision matches evidence.

Stop conditions:
- Missing phase reports.
- Missing test evidence.
- Unclear production scope.

Expected deliverables:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_<date>.md`

Handoff criteria:
- None. This closes the prerequisite implementation program or declares it blocked.
```

