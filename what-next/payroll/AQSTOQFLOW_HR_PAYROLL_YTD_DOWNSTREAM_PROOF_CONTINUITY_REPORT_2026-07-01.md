# AqStoqFlow HR/Payroll YTD Downstream Proof Continuity Report

Date: 2026-07-01
Status: Implemented and evidence-gated for this slice
Roadmap slice: Wave 1 payroll engine/register truth hardening, downstream proof continuity

## Decision

This slice closes a downstream traceability gap: year-to-date accumulator proof is now preserved after calculation/register generation through posting, payslip emission, payment release, declaration preparation, and payment settlement evidence.

This does not make the full HR/payroll module production-ready by itself. The final production blockers remain statutory breadth, authority adapters, production migration/backfill, service-backed operator routes, browser/accessibility certification, and deeper finance/BI surfaces.

## Source Context Used

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- Recent payroll evidence reports under `what-next/payroll/*2026-07-01.md`

## Implementation Summary

- Added reusable YTD proof metadata extraction in `services/payroll/payroll-control.service.ts`.
- Propagated `yearToDatePolicy`, `yearToDatePolicyHash`, and sorted `yearToDateAccumulatorHashes` into payroll posting metadata, payslip hash payloads, payslip metadata, posted run events, released payment batch metadata, payment allocation metadata, payment ledger posting metadata, declaration payloads, declaration metadata, declaration events, and audit payloads.
- Extended outbound payroll payment reconciliation proof metadata so settlement evidence receives the same YTD proof bundle.
- Extended `services/payroll/payment-reconciliation.service.ts` so provider settlement evidence and replay metadata retain YTD proof from the released payment batch.
- Updated focused payroll control and payment reconciliation tests to require YTD proof in declaration/payment/settlement proof surfaces.
- Refreshed payroll immutability runtime evidence through the policy gate.

## Files Touched

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification

- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand` - passed, 33 tests.
- `npm run typecheck` - passed.
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand` - passed, 54 tests.
- `npm run regulatory:hardcode:fail` - passed, 0 active findings.
- `npm run service:boundary:fail` - passed, 0 active service-boundary violations.
- `npm run prisma:validate` - passed.
- `npm run policy:gates` - passed, including inventory boundary, service boundary, workflow assurance runtime check, payroll immutability runtime check, hard-delete gate, regulatory hardcode gate, demo/report trust gate, and raw error boundary gate.

## Remaining Full-Production Blockers

- Complete statutory country-pack breadth with reviewed formulas, golden fixtures, caps, allowances, IRPP/income tax, employer/employee contributions, benefits, leave/overtime, corrections, and jurisdiction expansion.
- Build real authority declaration adapters with payload mappings, response mappings, rejection/amendment handling, credentials, retries, idempotency, and receipts.
- Build real payment provider adapters and settlement-proof ingestion for production automation claims.
- Complete service-backed operator routes for payroll runs, payments, and declarations, including proof drawers, denied states, redaction, and fresh-auth actions.
- Complete production migration/backfill with tenant dry runs, rollback/correction strategy, signoff, and post-migration reconciliation.
- Certify full release with authenticated browser smoke, accessibility, mobile/dark/light checks, tenant isolation, concurrency/double-submit tests, closed-period tests, provider-failure tests, and Prompt 19/21 release gates.

## Next Recommended Slice

Continue Wave 1 by hardening statutory country-pack breadth and payroll calculation coverage before expanding operator UI or BI. The best next execution target is formula fixture expansion plus register/export proof for tax, benefits, leave, overtime, and correction cases, all from versioned country-pack configuration rather than hardcoded legal logic.