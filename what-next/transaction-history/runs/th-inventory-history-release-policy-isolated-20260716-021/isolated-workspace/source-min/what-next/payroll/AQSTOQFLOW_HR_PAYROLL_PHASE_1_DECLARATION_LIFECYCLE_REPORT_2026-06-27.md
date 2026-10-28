# AqStoqFlow HR/Payroll Phase 1 Prompt 16 Declaration Lifecycle Report

Date: 2026-06-27
Prompt: 16 - Declaration Lifecycle And Adapter Foundation
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Executive Summary

Prompt 16 was already implemented for the safe manual authority-evidence slice. The service blocks production authority adapters, records append-only declaration evidence, emits business events, stales close evidence for close-impacting declaration transitions, and keeps automation explicitly marked as blocked.

This pass hardened the declaration lifecycle evidence contract after the Prompt 15 register tie-out revalidation. New declaration lifecycle evidence now requires a `sourceRegisterHash`, persists it, and carries it into sensitive-action metadata, business-event payloads, and audit changes.

The result is a stronger auditor chain:

```text
payroll register hash -> declaration lifecycle evidence -> business event -> close invalidation/audit
```

No production authority automation, API submission adapter, legal filing claim, or UI route was added.

## Source And Skill Notes

Skill applied: `aqstoqflow-hrpayroll-16-declaration-lifecycle`

The skill's listed source prompt-suite path under `what-next/payroll/` is stale. The current source suite remains:

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Reports read:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_16_DECLARATION_LIFECYCLE_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_REGISTER_TIEOUT_REPORT_2026-06-27.md`

## Prerequisite Gate

Status: passed for a manual authority-evidence hardening slice.

- Statutory hardcode gate passes with 0 active production findings.
- Country-pack unsupported/expert-review boundaries remain in place.
- Prompt 15 register tie-out is present and verified.
- Runtime immutability checks pass for declaration and declaration-evidence records.
- Production submission adapters remain blocked because reviewed authority mappings are not present.

## Change Made

### Register Proof Required

File: `services/payroll/declaration-lifecycle.service.ts`

Manual declaration lifecycle evidence now requires `sourceRegisterHash`.

The service now:

- rejects declaration lifecycle evidence when the source payroll register hash is missing;
- includes `sourceRegisterHash` in sensitive action metadata;
- persists `sourceRegisterHash` on `PayrollDeclarationEvidence`;
- includes `sourceRegisterHash` in the declaration lifecycle business event payload;
- includes `sourceRegisterHash` in audit-log changes.

### Test Coverage

File: `services/payroll/__tests__/declaration-lifecycle.service.test.ts`

Coverage now asserts:

- happy-path manual submission stores `sourceRegisterHash`;
- missing source register proof blocks lifecycle evidence;
- existing manual-only production-adapter block still fires;
- maker-checker, transition order, and idempotent replay behavior remain intact.

## Security And Privacy Decisions

- Tenant/actor context remains action-derived.
- Fresh auth remains enforced by the protected declaration evidence action.
- Sensitive action policy evaluation now receives the register hash as part of the evidence metadata.
- No salary/person data was added to logs or reports.
- No declaration payload or authority credential data is exposed.

## Accounting And Finance Decisions

- Declaration lifecycle evidence now ties explicitly to the payroll register proof that supports the authority-facing declaration record.
- Close invalidation still uses approved close-impact source codes for submitted, accepted, rejected, payment due, paid, reconciled, and amended states.
- Register, declaration, payment, ledger, and close relationships remain service-owned.
- No electronic submission, payment reconciliation UI, or unsupported statutory adapter was introduced.

## UI/UX Decisions

No UI changed.

Future declaration UI must supply trusted server-provided register proof and must continue to display manual evidence and automation-blocked states honestly.

## Verification

Passed:

```text
npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts scripts/__tests__/regulatory-hardcode-gate.test.js services/payroll/__tests__/payroll-immutability-migration.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
npm run regulatory:hardcode:fail
npm run policy:gates
npm run typecheck
npm run lint -- --quiet
npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand
git diff --check
```

Results:

- Core Prompt 16 tests: 4 suites passed, 26 tests passed.
- Wider prerequisite tests: 6 suites passed, 37 tests passed.
- Final touched-file test: 1 suite passed, 6 tests passed.
- Prisma schema validation: passed.
- Service boundary gate: 0 active violations.
- Regulatory hardcode gate: passed, 0 active findings.
- Policy gates: passed.
- Payroll runtime immutability: 8/8 triggers present, 12/12 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.
- Typecheck: passed.
- Lint: 0 errors, 5 existing unrelated warnings.
- Diff check: passed with line-ending normalization warnings only.

Skipped:

- `npm run prisma:generate`: no schema or Prisma client change was made.
- Browser smoke: no UI or route behavior changed in this slice.

## Files Changed

- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_DECLARATION_LIFECYCLE_REPORT_2026-06-27.md`

## Prompt 16 Status

Status: completed for the Prompt 16 manual evidence hardening pass.

Declaration lifecycle evidence is now better tied to register proof and remains safely manual-only. Production authority adapter automation is still intentionally blocked until expert-reviewed payload mappings, response mappings, amendment rules, credential policy, and close-impact rules exist.

Next safe slice: Prompt 17 payroll payment reconciliation revalidation/hardening.
