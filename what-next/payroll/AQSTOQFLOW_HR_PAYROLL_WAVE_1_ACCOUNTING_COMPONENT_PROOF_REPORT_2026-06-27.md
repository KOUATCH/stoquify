# AqStoqFlow HR/Payroll Wave 1 Accounting Component Proof Report

Date: 2026-06-27
Status: Implemented and verified for the focused payroll accounting/close component-proof slice.

## Scope

This slice extends the payroll register component proof into accounting and close-readiness evidence. The aim is to make payroll posting, ledger source links, register tie-out, and data-trust blockers consume the same service-owned payroll component truth.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `scripts/seed-payroll-e2e-user.js` (untracked fixture script scanned by the regulatory hardcode gate)

## Implemented Behavior

- Payroll approve/post now builds a statutory component register proof before ledger posting.
- Payroll posting is blocked if component proof is missing or mismatched.
- Payroll ledger batch metadata, journal line metadata, source-link metadata, business-event payloads, and payroll-run metadata now carry component register proof hash/status/count evidence.
- Payroll register read model now ties component mapping to:
  - payroll calculation components,
  - payroll declaration liability,
  - payroll ledger posting line mapping keys,
  - ledger component mapping hashes.
- Register hash includes component mapping proof so ledger mapping changes affect the immutable register proof.
- Data-trust now blocks certified readiness when posted/paid payroll runs lack component register proof in accounting evidence.
- Demo seed provider literals were centralized behind an environment-overridable fixture constant to keep the regulatory hardcode gate green.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/data-trust.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 3 suites passed, 27 tests passed.

```powershell
npm run typecheck
```

Result: TypeScript passed. The first run timed out; rerun with a longer timeout passed.

```powershell
npm run regulatory:hardcode:fail
```

Result: passed, 0 active findings.

## Production Impact

This closes another accounting-backbone gap: payroll journal evidence is no longer just balanced by aggregate source amounts. It now carries proof that the statutory component register was matched before posting, and close/data-trust can block when that proof is absent.

This still does not claim full unrestricted HR/payroll production readiness. It moves the product closer by linking calculation truth, register proof, ledger postings, declaration liability, and close readiness.

## Next Recommended Slice

Continue with payroll payment/declaration adapter hardening:
- ensure payment settlement evidence carries the source register hash and component proof hash,
- ensure declaration payloads/amendments carry component mapping hash,
- add rejection/amendment/idempotency adapter tests,
- preserve tenant-safe audit and redaction behavior.