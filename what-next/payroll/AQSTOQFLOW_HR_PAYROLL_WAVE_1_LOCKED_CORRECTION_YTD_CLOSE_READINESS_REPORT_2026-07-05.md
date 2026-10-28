# AqStoqFlow HR/Payroll Wave 1 Locked Correction YTD Close Readiness Report

Date: 2026-07-05

## Decision

Implemented a focused payroll kernel hardening slice for locked correction runs.

Full HR/payroll production readiness remains blocked, but close readiness now fails closed when a posted, paid, or archived correction run is missing the immutable correction/YTD proof bundle needed to trust the register across periods.

## Skills Applied

- `aqstoqflow-payroll-kernel-hardener`
- `aqstoqflow-payroll-country-pack-engine`

## Scope

This slice targeted service-owned payroll truth only:

- Locked correction run close blockers.
- Original-run proof continuity.
- Correction evidence hash continuity.
- Year-to-date policy and accumulator proof continuity.
- Workbench/read-model blocker evidence for finance, close, and operators.

No operator routes, BI surfaces, authority adapters, payment adapters, statutory constants, or production migration/backfill mutations were added.

## What Changed

- Added a locked correction close-proof bundle gate in `services/payroll/payroll-control.service.ts`.
- The gate now requires:
  - `originalRunId`
  - `originalRunDocumentHash`
  - `originalRunEvidenceHash`
  - `originalCalculationHash`
  - `correctionEvidenceHash`
  - `yearToDatePolicyHash`
  - non-empty `yearToDateAccumulatorHashes`
- Added blocker `PAYROLL_CORRECTION_CLOSE_PROOF_BUNDLE_MISSING` with the missing proof fields listed in the detail message.
- Preserved the existing `PAYROLL_CORRECTION_EVIDENCE_HASH_MISSING` blocker for the narrower missing correction-hash case.
- Added a public workbench test proving an otherwise close-ready posted correction run is blocked when only YTD accumulator proof is missing.

## Verification

Passed:

- `npm test -- services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - 1 suite passed
  - 31 tests passed
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
  - Active findings: 0
- `npm run prisma:validate`
- `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- `npm run payroll:immutability:runtime`
  - Status: ready
  - Required triggers present: 9/9
  - Forbidden mutation checks blocked: 14/14
  - Allowed lifecycle checks passed: 3/3
  - Blockers: 0
- Scoped `git diff --check` for touched payroll files and regenerated immutability evidence.

## Residual Risks

- This is a close-readiness blocker, not a replacement for expert-reviewed statutory formula breadth.
- Full production still requires reviewed country-pack coverage for IRPP/income tax, caps, allowances, benefits, leave/overtime, employer/employee contribution breadth, YTD regularization, retro corrections, and jurisdiction expansion.
- Authority declaration automation, payment adapter automation, production backfill, service-backed operator route completion, browser/accessibility gates, and pilot-cycle reconciliation remain open roadmap items.

## Next Slice

Continue Wave 1 by adding golden fixture coverage for retro corrections and YTD replay across ordinary/correction runs, then tie those fixture outputs to register, payslip, declaration, payment, and ledger proof surfaces.