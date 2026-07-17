# AqStoqFlow HR/Payroll Wave 1 Pilot Component Mapping Review Gate Report - 2026-07-01

## Decision

This slice tightens controlled pilot certification, but it does not make HR/Payroll fully production-ready by itself. It prevents a known unsafe release-review path: a payroll run with component mapping proof that still requires expert review can no longer certify as clean pilot evidence.

## Scope

Focus: controlled pilot payroll cycle certification.

The change stays inside the payroll service layer and does not add statutory formulas, legal rates, account numbers, UI routes, or client-computed payroll truth.

## What Changed

`services/payroll/payroll-pilot-cycle-certification.service.ts` now blocks certification when payroll component mapping metadata exists but is not explicitly `REVIEWED`.

New blocker:

- `PILOT_COMPONENT_MAPPING_NOT_REVIEWED`

The blocker is critical, belongs to the register domain, and carries redacted evidence showing the mapping status that prevented certification.

## Why This Matters

Before this change, pilot certification required `payrollComponentMappingHash` and `payrollComponentMappingStatus` to be present, but did not require the status to be reviewed. A run with `BLOCKED_REQUIRES_EXPERT_REVIEW` could therefore pass pilot certification if the rest of the proof chain was clean.

That is not acceptable for full HR/payroll production because statutory component mapping is one of the deepest product-claim blockers. The pilot cycle should not become release-review material until payroll component mapping is reviewed.

## Regression Coverage

`services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts` now covers a run whose metadata contains:

- `payrollComponentMappingHash`
- `payrollComponentMappingStatus: BLOCKED_REQUIRES_EXPERT_REVIEW`

Expected result:

- certificate status: `BLOCKED`
- blocker present: `PILOT_COMPONENT_MAPPING_NOT_REVIEWED`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts --runInBand`
  - 1 suite passed
  - 5 tests passed
- `npm run typecheck`
  - `tsc --noEmit --pretty false` passed
- `npm run policy:gates`
  - inventory boundary: passed
  - service boundary: passed
  - workflow assurance runtime check: ready, blockers 0
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked, blockers 0
  - hard-delete gate: passed
  - regulatory hardcode gate: passed
  - demo/report trust gate: passed
  - raw-error boundary gate: passed

Generated/updated gate evidence:

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Remaining Production Work

Full production readiness still requires:

- reviewed statutory country-pack breadth across supported jurisdictions;
- golden fixture breadth for allowances, benefits, IRPP/income tax, contributions, leave, overtime, YTD, and corrections;
- one controlled pilot payroll cycle reconciled end to end;
- payment/provider and authority adapter proof under production-like failure modes;
- production migration/backfill signoff;
- authenticated browser, accessibility, mobile, tenant isolation, concurrency, close-period, and release-gate evidence.

## Next Best Slice

Continue with statutory country-pack fixture breadth or payment/declaration adapter proof certification, because those remain core blockers before an unrestricted production rollout.
