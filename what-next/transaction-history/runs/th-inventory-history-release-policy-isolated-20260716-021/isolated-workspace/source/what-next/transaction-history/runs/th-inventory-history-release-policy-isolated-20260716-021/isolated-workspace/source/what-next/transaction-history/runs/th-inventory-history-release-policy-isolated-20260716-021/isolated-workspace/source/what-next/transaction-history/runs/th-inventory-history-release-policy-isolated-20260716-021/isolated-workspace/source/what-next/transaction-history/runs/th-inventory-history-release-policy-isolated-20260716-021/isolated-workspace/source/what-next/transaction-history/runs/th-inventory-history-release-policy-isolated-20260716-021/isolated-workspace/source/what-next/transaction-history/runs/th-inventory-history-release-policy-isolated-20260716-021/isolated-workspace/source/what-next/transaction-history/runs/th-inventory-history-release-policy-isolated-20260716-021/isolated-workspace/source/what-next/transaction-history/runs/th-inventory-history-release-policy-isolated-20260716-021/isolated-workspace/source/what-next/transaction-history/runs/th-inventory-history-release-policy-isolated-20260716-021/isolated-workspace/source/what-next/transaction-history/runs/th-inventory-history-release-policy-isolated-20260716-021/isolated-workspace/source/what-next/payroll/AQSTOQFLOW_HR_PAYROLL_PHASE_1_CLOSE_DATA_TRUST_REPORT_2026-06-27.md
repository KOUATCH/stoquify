# AqStoqFlow HR/Payroll Phase 1 Prompt 18 Close Data-Trust Report

Date: 2026-06-27
Prompt: 18 - Close Assurance And Data-Trust Expansion
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Executive Summary

Prompt 18 was already substantially present: close assurance knew about payroll run posting, payroll payment release/reconciliation, declaration lifecycle changes, certified close invalidation, and data-trust payroll blockers for register, payslip, declaration, payment, ledger, and source-link evidence.

This pass closed a proof-quality gap introduced by making Prompt 16 and Prompt 17 stricter. Data-trust now blocks certified close readiness when payroll declaration evidence or payroll settlement evidence exists but does not carry the source payroll register hash.

The close/data-trust chain now evaluates:

```text
payroll register hash -> declaration/payment evidence -> payroll close blockers -> certified trust-pack eligibility
```

No duplicate close service, dashboard-only metric, client-computed payroll truth, new UI route, or unjustified close invalidation source was added.

## Source And Skill Notes

Skill applied: `aqstoqflow-hrpayroll-18-close-data-trust`

The skill's listed source prompt-suite path under `what-next/payroll/` is stale. The current source suite remains:

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Reports read:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYMENT_RECONCILIATION_REPORT_2026-06-27.md`

## Prerequisite Gate

Status: passed for a close/data-trust proof-quality hardening slice.

- Payroll register tie-out exists.
- Declaration lifecycle exists and now requires source register proof.
- Payment reconciliation exists and now requires source register proof.
- Payroll close-impact source codes already exist for run posting, payment release/reconciliation, and declaration lifecycle transitions.
- Certified close invalidation is already emitted by payroll run, payment, and declaration workflows.
- Runtime payroll immutability checks pass.

## What Was Present

Existing close assurance/data-trust implementation included:

- close impact source definitions for payroll run posting;
- close impact source definitions for payroll payment release and reconciliation;
- close impact source definitions for declaration prepared, submitted, accepted, rejected, payment due, paid, reconciled, and amended states;
- data-trust source table coverage for payroll runs, run lines, payslips, declarations, declaration evidence, payment batches, and payment allocations;
- payroll data-trust blockers for missing declaration lifecycle evidence;
- payroll data-trust blockers for unsettled or evidence-incomplete payment batches;
- payroll data-trust blockers for missing payslip proof, payment allocations, ledger postings, and accounting source links;
- accountant trust-pack export blocking when payroll high/critical gates fail.

## Change Made

### Register-Proof Data-Trust Gates

File: `services/accounting/data-trust.service.ts`

Data-trust now counts and blocks:

- close-impacting payroll declaration evidence missing `sourceRegisterHash`;
- settled or partially settled payroll payment batches missing `metadata.latestSettlementSourceRegisterHash`.

New blockers:

- `payroll-declaration-register-proof-missing`
- `payroll-payment-settlement-register-proof-missing`

New module facts:

- `Declaration register proof gaps`
- `Payment register proof gaps`

The certified evidence description now explicitly names payroll settlement register proof and declaration lifecycle register proof.

### Test Coverage

File: `services/accounting/__tests__/data-trust.service.test.ts`

Coverage now asserts:

- the payroll close data-trust evidence scan names register-proof checks;
- declaration evidence missing register proof becomes a high-severity blocker;
- settlement evidence missing register proof becomes a high-severity blocker;
- payroll module evidence surfaces both register-proof gap counts;
- existing payroll ledger, register, payslip, declaration, payment, and source-link blockers still behave.

## Security And Privacy Decisions

- Data-trust continues to consume service-owned payroll facts only.
- No salary/person amounts were added to the accountant data-trust surface.
- The new checks use proof hashes, not payroll personal data.
- No client-provided payroll facts or browser-computed close metrics were introduced.

## Accounting And Finance Decisions

- Certified trust-pack export can no longer remain eligible when declaration/payment evidence lacks payroll register proof.
- Existing close invalidation sources were not expanded because run posting, payment release/reconciliation, and declaration lifecycle transitions already stale certified close evidence.
- Register export itself was not treated as a close-impacting mutation; it is evidence over service-owned facts, not a new accounting fact.
- Settlement and declaration proof quality is enforced at the data-trust gate, which is the correct place for certified close eligibility.

## UI/UX Decisions

No UI changed.

Existing and future close/accountant surfaces should render the server-owned blockers and module facts. They should not recompute payroll settlement truth, declaration state, register proof, or close readiness in the browser.

## Verification

Passed:

```text
npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run policy:gates
npm run lint -- --quiet
git diff --check
```

Results:

- Focused data-trust tests: 1 suite passed, 10 tests passed.
- Close/data-trust/payroll evidence regression tests: 6 suites passed, 39 tests passed.
- Typecheck: passed.
- Prisma schema validation: passed.
- Policy gates: passed.
- Service boundary gate: 0 active violations.
- Regulatory hardcode gate: passed, 0 active findings.
- Payroll runtime immutability: 8/8 triggers present, 12/12 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.
- Lint: 0 errors, 5 existing unrelated warnings.
- Diff check: passed with line-ending normalization warnings only.

Skipped:

- `npm run prisma:generate`: no schema or Prisma client change was made.
- Browser smoke: no UI or route behavior changed in this slice.

## Files Changed

- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CLOSE_DATA_TRUST_REPORT_2026-06-27.md`

## Prompt 18 Status

Status: completed for the Prompt 18 close/data-trust proof-quality hardening pass.

Close and data-trust gates are ready for assurance/chaos validation over the implemented payroll scope. Full production remains blocked by the broader roadmap items already documented: statutory breadth, production authority adapters, production seed/backfill approval, role-specific operator routes, and full browser/accessibility validation.

Next safe slice: Prompt 19 assurance, chaos, browser smoke, and release gates.
