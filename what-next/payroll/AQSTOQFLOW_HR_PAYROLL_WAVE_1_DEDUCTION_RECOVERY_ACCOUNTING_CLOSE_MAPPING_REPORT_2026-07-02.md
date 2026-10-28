# AqStoqFlow HR/Payroll Wave 1 - Deduction Recovery Accounting Close Mapping Report

Date: 2026-07-02
Skill: aqstoqflow-payroll-accounting-close
Phase: Phase 7 - payroll accounting and close-assurance integration
Executable slice: bind deduction/recovery payroll proof into accounting posting metadata and certified-close data-trust blockers.

## Decision

This slice advances the full-production HR/payroll roadmap by making deduction/recovery payroll components visible to the accounting close backbone. It does not add statutory formulas, legal constants, or a new posting-rule enum. It keeps the current balanced payroll posting rule intact and adds evidence-backed mapping proof so certified close cannot pass when a posted payroll run has deduction/recovery evidence but lacks matched deduction/recovery ledger-mapping proof.

## What Changed

- Payroll component mapping now carries deduction/recovery accounting proof:
  - deduction/recovery amount
  - source proof hash and proof-hash list
  - matched/missing/not-applicable ledger-mapping status
  - ledger-mapping proof hash
  - mapping key list currently bound to `PAYROLL_WITHHOLDING_PAYABLE`
  - clearing role `EMPLOYEE_DEDUCTION_RECOVERY_CLEARING`
- Payroll posting metadata now propagates the deduction/recovery ledger-mapping proof into:
  - ledger posting batch metadata
  - payroll journal line metadata for the withholding/deduction line
  - accounting source-link metadata through the existing posting metadata bundle
  - payroll run metadata after approval/posting
  - business-event payloads through existing component mapping payloads
- Accountant data-trust now detects posted/paid payroll runs with deduction/recovery line evidence but missing matched ledger-mapping proof.
- Certified trust-pack readiness now blocks with:
  - blocker id: `payroll-deduction-recovery-ledger-mapping-missing`
  - gate: `payroll.accounting.deduction-recovery-ledger-mapping`
  - severity: critical
- Payroll module evidence now exposes `Deduction/recovery ledger mapping gaps` for accountant/close operators.

## Files Changed In This Slice

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` and `.json` were refreshed by `npm run policy:gates`.

Note: these files already contain other in-progress payroll wave changes in the current worktree. This report covers only the deduction/recovery accounting-close mapping slice.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - 2 suites passed
  - 43 tests passed
- `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
  - 1 suite passed
  - 8 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run service:boundary:fail`
  - active violations: 0
- `npm run regulatory:hardcode:fail`
  - active findings: 0
- `npm run policy:gates`
  - inventory boundary: pass
  - service boundary: pass
  - workflow assurance runtime: ready
  - payroll immutability runtime: ready
  - hard-delete gate: pass
  - regulatory hardcode gate: pass
  - demo/report trust gate: pass
  - raw error boundary gate: pass
- `npm run lint -- --quiet`
  - 0 errors
  - 4 pre-existing warnings remain in unrelated image/default-export files

## Assurance Notes

- Tenant scope is preserved because all reads/writes remain inside existing organization-scoped payroll/accounting service methods.
- Accounting source-link semantics are preserved; no client-side or POS/sales-owned payroll truth was introduced.
- The change is evidence-backed and redaction-safe: it propagates hashes/statuses and proof metadata, not employee salary details or bank data.
- Certified close now fails closed for deduction/recovery mapping gaps rather than allowing generic component proof to hide recovery-specific accounting ambiguity.
- No posted payroll run, emitted payslip, released payment batch, submitted declaration, or archived evidence is mutated outside the existing lifecycle metadata path.

## Residual Risk

This slice does not introduce a distinct `PostingRuleAmountSource` for deduction/recovery amounts and does not split recovery clearing into a separate balanced journal line. It binds recovery proof to the current employee deduction/withholding payable posting path. A later schema/migration slice can add a dedicated amount source and posting-rule lines if the product decision is to require separate recovery clearing accounts in the ledger.

## Next Recommended Slice

Continue with `aqstoqflow-payroll-accounting-close`: add a dedicated payroll auditor proof pack/read model that exports redacted payroll close evidence across payroll run, component mapping, source links, payments, declarations, and data-trust blockers.