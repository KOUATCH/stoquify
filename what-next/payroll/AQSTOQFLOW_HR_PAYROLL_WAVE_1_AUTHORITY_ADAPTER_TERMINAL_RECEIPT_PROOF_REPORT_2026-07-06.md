# AqStoqFlow HR/Payroll Wave 1 Authority Adapter Terminal Receipt Proof Report - 2026-07-06

## Slice

Selected skills: `aqstoqflow-payroll-declaration-compliance`, `aqstoqflow-payroll-payment-recon`.

Roadmap area: authority adapter and declaration/payment proof hardening.

This slice closes a production-readiness gap in the live authority adapter outcome path. A declaration authority callback that moves payroll toward accepted, payment-due, or amendment-required readiness now must carry live terminal receipt proof. Duplicate terminal callbacks must replay the exact terminal proof rather than only matching status and response hash.

## Change Summary

- Added terminal outcome proof enforcement in `services/payroll/authority-adapter-execution.service.ts`.
- Accepted, payment-due, and amendment-required live authority outcomes now fail closed without an outcome receipt hash.
- Duplicate terminal authority callbacks now require exact authority reference and exact receipt proof for close-grade terminal states.
- Kept rejected and failed outcomes response-hash based, so rejected declarations still cannot count as accepted proof and failed callbacks do not invent receipt proof.
- Preserved immutable declaration evidence rows; only declaration execution metadata and redacted business events are updated through the service-owned path.

## Files Changed

- `services/payroll/authority-adapter-execution.service.ts`
- `services/payroll/__tests__/authority-adapter-execution.service.test.ts`

## Evidence Gates

- `npx jest services/payroll/__tests__/authority-adapter-execution.service.test.ts --runInBand`
  - Passed: 1 suite, 13 tests.
- `npx jest services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - Passed: 3 suites, 36 tests.
- `npm run typecheck`
  - Passed.
- `npm run regulatory:hardcode:fail`
  - Passed: 0 active findings.
- `npm run service:boundary:fail`
  - Passed: 0 active service-boundary violations.
- `npx prisma validate`
  - Passed: Prisma schema valid.

## Production Readiness Impact

This does not make HR/Payroll fully production-ready by itself. It removes one release blocker class: partial live authority callbacks can no longer become close-grade terminal declaration proof. The authority adapter path is now stricter about receipts and idempotent terminal replay, which strengthens statutory declarations, payment handoff, close readiness, and pilot evidence.

## Remaining Roadmap Work

Next recommended slice: apply the same terminal-proof exactness to provider settlement and payroll payment reconciliation, especially retry/idempotency proof, provider settlement receipts, duplicate callbacks, suspense exceptions, and net-pay/statutory payment clearing tie-out.

After that, continue statutory country-pack breadth and payroll engine hardening before expanding operator routes or BI surfaces.