# AqStoqFlow HR/Payroll Kernel Rounding Policy Evidence Report - 2026-07-01

## Decision

Status: IMPLEMENTED FOR CONTROLLED PILOT / LIMITED RELEASE SCOPE.

This slice hardens payroll calculation/register reproducibility by making rounding policy explicit, tenant-resolved, hash-backed, and propagated from payroll calculation into posting, payslip, payment, and declaration evidence metadata where available. It does not make the whole HR/payroll system production-ready; statutory breadth, authority automation, migration/backfill, finance/BI depth, and final release gates remain open.

## Selected Skill And Phase

- Skill: `aqstoqflow-payroll-kernel-hardener`
- Phase: Phase 0 payroll kernel hardening
- Executable slice: payroll rounding policy evidence continuity

## What Changed

- Added `PayrollRoundingPolicy` evidence to the payroll kernel.
- Resolved rounding policy from `OrganizationAccountingSettings.roundingMode` and `roundingScale`.
- Preserved current numeric behavior by allowing only certified `HALF_UP`, scale-2 rounding for now.
- Fail-closed when a tenant configures an unsupported rounding mode or scale.
- Added `roundingPolicy` and `roundingPolicyHash` to:
  - resolved payroll country-pack status,
  - country-pack resolution hash inputs,
  - payroll line calculation snapshots,
  - payroll line rule provenance,
  - payroll run document hash inputs,
  - correction evidence hash inputs,
  - payroll run metadata,
  - payroll calculated business-event payloads,
  - payroll posting ledger metadata, payslip hashes, payslip metadata, and posted business-event payloads when present,
  - payment/declaration metadata propagation paths where source run proof exists.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - 1 suite, 24 tests.
- `npm run typecheck`
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand`
  - 4 suites, 54 tests.
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run prisma:validate`
- `npm run policy:gates`

Policy gate highlights:

- Service boundary: 0 active violations.
- Regulatory hardcode gate: pass, 0 active findings.
- Payroll immutability runtime: ready; 9/9 triggers present, 14/14 forbidden mutations blocked, 3/3 allowed lifecycle checks passed.
- Hard-delete gate: 0 active unsafe findings.
- Demo/report trust gate: 0 active production trust findings.
- Raw error boundary gate: 0 active unsafe findings.

## Production Meaning

The payroll register is now more reproducible because every newly calculated run carries the explicit rounding policy and policy hash that governed the scale-2 amount outputs. Posting, payslips, payment, and declaration workflows can preserve that proof instead of relying on implicit application behavior.

This directly supports the full HR/payroll roadmap requirement for a clear rounding policy and stronger locked-register evidence.

## Residual Risks

- Only `HALF_UP`, scale 2 is certified in this slice. Additional rounding modes or currency scales must be explicitly reviewed, implemented, fixture-backed, and released behind tests before use.
- Existing historical runs without rounding metadata remain tolerated for continuity; production migration/backfill should attach or reconcile rounding proof tenant-by-tenant.
- Broader YTD, multi-period statutory history, IRPP breadth, retro-correction fixtures, and accounting tie-out expansion remain unfinished full-production blockers.

## Next Recommended Slice

Continue payroll kernel hardening with YTD and multi-period statutory history evidence:

1. Add service-owned YTD accumulator proof for taxable base, income tax withheld, employee contributions, employer liabilities, net pay, and statutory payable amounts.
2. Include YTD proof in calculation snapshots, run metadata, declaration payload metadata, and register export proof.
3. Add golden fixtures for ordinary run plus correction run that changes YTD and declaration liability without mutating original registers.