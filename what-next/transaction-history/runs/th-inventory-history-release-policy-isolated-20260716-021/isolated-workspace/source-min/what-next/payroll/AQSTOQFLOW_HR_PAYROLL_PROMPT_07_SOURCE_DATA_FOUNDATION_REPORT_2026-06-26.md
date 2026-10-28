# Aqstoqflow HR/Payroll Prompt 07 Source-Data Foundation Report

Date: 2026-06-26  
Skill: `aqstoqflow-hrpayroll-07-source-data-foundation`  
Prompt phase: Prompt 07, HR Source-Data Foundation  
Source suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`  
Decision: passed for the narrow service-owned HR source-data foundation slice.

## Expert Lenses Applied

- Domain architecture and service-boundary design.
- Payroll operations and employee source-data ownership.
- Cybersecurity, RBAC, tenant isolation, and payroll privacy.
- Audit, evidence, and immutable-event discipline.
- Accounting/finance readiness for later payroll calculation, posting, payment, and register workflows.

## Source Prerequisite IDs

P1.01, P1.02, P1.08, P1.09.

## Files And Reports Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-07-source-data-foundation\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_03_COUNTRY_PACK_GATE_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_04_ACCESS_PRIVACY_ACTIONS_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_05_ACCOUNTING_CLOSE_GATE_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SEED_BACKFILL_ADMIN_SETUP_PLAN_2026-06-25.md`
- `prisma/schema.prisma`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/events/business-event.service.ts`
- `services/events/business-event.schemas.ts`
- `services/security/redaction-policy.service.ts`
- `services/_shared/protect.ts`
- `actions/payroll/payroll-control.actions.ts`
- `lib/security/rbac-permissions.ts`

## Prerequisite Gate Result

| Gate | Status | Evidence |
| --- | --- | --- |
| Phase 0 hard blockers resolved or explicitly bounded | Passed | Prompt 01 inventory/source-of-truth report passed. |
| Runtime immutability proof exists | Passed | Prompt 02 report proves 7/7 triggers and 9/9 forbidden mutations blocked in a dedicated non-production DB. |
| Country-pack/legal boundary exists | Passed | Prompt 03 report passed and blocks unsupported statutory claims. |
| Access/privacy gate exists | Passed | Prompt 04 report passed for current payroll route/actions/read model. |
| Accounting/close gate exists | Passed | Prompt 05 report passed for current payroll finance/close foundations. |
| Seed/backfill boundary exists | Passed with caveat | Prompt 06 plan allows Prompt 07 around `PayrollEmployee` and `PayrollContract`, but production mutation remains blocked until dry-run/setup readiness gates exist. |
| Source-of-truth ownership map exists | Passed | Prompt 01 ownership map names employee and contract data as future HR source-data service truth. |
| Persona/RBAC matrix exists | Passed for this slice | Prompt 04 persona matrix covers current payroll surface and permissions exist for `payroll.employees.read` and `payroll.employees.manage`. |

## Implementation Summary

Added `services/payroll/employee.service.ts` as the service-owned HR source-data foundation.

Implemented:

- `getPayrollEmployeeSourceData`
  - Tenant-scoped employee source-data read model.
  - Requires payroll employee read permission.
  - Reads trusted server-side `PayrollEmployee`, `PayrollContract`, user mapping, and frozen attendance snapshot facts.
  - Returns readiness blockers for missing user mapping, inactive employee state, missing active contract, missing contract evidence, missing frozen attendance, and missing payment destination evidence.
  - Does not expose base salary, raw bank account, raw mobile money phone, raw tax identifier, or raw social identifier.
  - Masks linked user email and returns only readiness/evidence booleans and hashes.
  - Audits salary-sensitive source-data reads through the existing redaction policy.

- `upsertPayrollEmployeeSourceProfile`
  - Permission-gated employee profile upsert.
  - Validates organization scope.
  - Validates linked user belongs to the same tenant.
  - Detects duplicate employee-number/user mappings before writes.
  - Stores only controlled HR source reference metadata and evidence hashes.
  - Records a business event and audit log entry.
  - Keeps idempotency tied to request payload hash.

- `attachPayrollEmployeeEvidenceReferences`
  - Permission-gated HR evidence reference attachment.
  - Appends deduplicated evidence references by type and document hash.
  - Stores hashes/references only, not document payloads.
  - Records business event and audit log evidence.

Added focused tests in `services/payroll/__tests__/payroll-employee.service.test.ts`.

Also made a release-gate cleanup in adjacent existing payroll setup/backfill services:

- Replaced raw `new Error(...)` throws with `BusinessRuleError` in `services/payroll/payroll-setup-readiness.service.ts`.
- Replaced raw `new Error(...)` throws with `BusinessRuleError` in `services/payroll/payroll-seed-backfill-plan.service.ts`.

Those adjacent files were already untracked in the worktree and were only touched because `npm run error:boundary:fail` flagged them.

## Security And Privacy Decisions

- Every new source-data service entry point requires payroll permissions.
- Employee-user mapping is tenant-bound and rejects cross-tenant user linkage.
- The read model avoids raw salary, bank, mobile money, tax, and social identifier exposure.
- Evidence handling stores references and hashes only.
- Read/write operations write audit records.
- Source-data writes record business events and mark them applied.
- No client-owned HR/payroll truth was introduced.

## Accounting And Finance Decisions

- Prompt 07 does not calculate payroll, post ledger entries, release payments, prepare declarations, or make statutory claims.
- Source-data readiness now exposes blockers needed before later payroll calculation/posting/payment/register phases.
- Active contract readiness is represented without exposing base salary.
- Payment destination readiness is represented as evidence presence only; payment destination approval workflow remains Prompt 10.

## UI/UX Decisions

- No new UI, route, sidebar item, broad HR screen, command center, payslip surface, or self-service surface was added.
- The source-data foundation is service-first so later UI can render trusted server-provided facts only.

## Files Changed

- `services/payroll/employee.service.ts`
- `services/payroll/__tests__/payroll-employee.service.test.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `package.json`
- `scripts/with-payroll-immutability-test-db.js`
- `scripts/__tests__/with-payroll-immutability-test-db.test.js`
- `scripts/__tests__/policy-gates.test.js`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_07_SOURCE_DATA_FOUNDATION_REPORT_2026-06-26.md`

## Validation

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee.service.test.ts --runInBand
```

- 1 suite passed.
- 6 tests passed.

```powershell
npm run prisma:validate
```

- Prisma schema is valid.

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee.service.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
```

- 3 suites passed.
- 12 tests passed.

```powershell
npm run service:boundary:fail
```

- Active service-boundary violations: 0.

```powershell
npm run typecheck
```

- Passed after tightening the evidence reference JSON timestamp type.

```powershell
npm run hard-delete:fail
npm run regulatory:hardcode:fail
npm run demo:trust:fail
npm run error:boundary:fail
```

- Hard-delete gate passed.
- Regulatory hardcode gate passed.
- Demo/report trust gate passed.
- Raw-error boundary gate passed after converting adjacent setup/backfill raw errors to typed `BusinessRuleError`.

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand
```

- 2 suites passed.
- 5 tests passed.

```powershell
npm test -- --runTestsByPath scripts/__tests__/with-payroll-immutability-test-db.test.js scripts/__tests__/payroll-immutability-runtime-check.test.js scripts/__tests__/policy-gates.test.js --runInBand
```

- 3 suites passed.
- 16 tests passed.

```powershell
npm run policy:gates
```

- Passed end to end after routing `payroll:immutability:runtime` through `scripts/with-payroll-immutability-test-db.js`.
- Payroll immutability runtime status: `ready`.
- Runtime database: `stockflow_immutability_test` on `localhost`; secret URL values were not printed.
- Required triggers present: 7/7.
- Forbidden mutation checks blocked: 9/9.
- Allowed lifecycle checks passed: 3/3.
- Policy blockers: 0.

Skipped or caveated:

- `npm run prisma:generate` was not run because Prompt 07 did not change the Prisma schema.
- No route smoke or browser test was run because no route or UI changed.

## Source-Of-Truth Risks Avoided

- Avoided client-computed payroll truth.
- Avoided a dashboard-specific HR/payroll shadow service.
- Avoided raw salary/payment/person identifier exposure.
- Avoided speculative payroll UI routes.
- Avoided self-service before employee-user mapping and own-data controls are complete.
- Avoided payroll calculation before contracts, frozen attendance, country-pack, and finance gates are ready.
- Avoided treating seed/backfill output as production HR truth.

## Remaining Boundaries

- Prompt 07 does not complete the full contract lifecycle. Prompt 08 must build dedicated employee identity and contract workflow services/actions.
- Prompt 07 does not implement compensation/rubrique, salary changes, payment destination approvals, payslip/self-service, command center UX, register, declarations, or payment reconciliation.
- Employee source-data can be read and upserted through the service, but no UI/action surface was added in this prompt.
- The aggregate policy gate now derives a dedicated local immutability test DB URL for `stockflow_immutability_test` through `scripts/with-payroll-immutability-test-db.js`.

## Handoff Decision

Decision: Prompt 07 passed for the narrow service-owned source-data foundation.

Prompt 08 may proceed to employee identity and contract workflow only if it preserves these boundaries:

- Use `services/payroll/employee.service.ts` as the employee source-data foundation.
- Keep employee-user mapping tenant-bound and duplicate-safe.
- Add protected server actions before any UI route.
- Keep contract salary/person data permissioned, audited, and redacted.
- Do not add self-service until own-data restriction and payslip/archive gates pass.
- Do not calculate payroll from HR source data until active contracts, frozen attendance, country-pack support, and accounting readiness are proven.
