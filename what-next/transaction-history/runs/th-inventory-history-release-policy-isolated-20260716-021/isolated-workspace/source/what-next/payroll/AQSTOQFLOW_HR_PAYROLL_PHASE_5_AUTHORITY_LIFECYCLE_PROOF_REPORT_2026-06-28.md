# AqStoqFlow HR/Payroll Phase 5 Authority Lifecycle Proof Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-declaration-compliance`
Status: PASS for this implementation slice
Production decision: still NOT full-production ready; this closes an authority declaration lifecycle proof gap and preserves the controlled-pilot posture until the full roadmap blockers are evidence-closed.

## Selected phase and executable slice

Phase 5: declaration compliance evidence hardening.

Executable slice: persist authority lifecycle contract proof for payroll declaration evidence and make missing lifecycle proof a data-trust close blocker.

## What changed

- `services/payroll/declaration-lifecycle.service.ts`
  - Wired `resolvePayrollAuthorityLifecycleContract` into declaration evidence creation.
  - Added authority lifecycle metadata: contract hash, lifecycle status, close impact, next action, and redacted lifecycle contract.
  - Propagated lifecycle proof through immutable evidence payload, evidence metadata, sensitive-action metadata, declaration latest metadata, business event payload/metadata, outbox lifecycle summary, and audit after-state.
  - Rejected authority evidence now records `REJECTED_REQUIRES_CORRECTION` with `BLOCK_CLOSE_UNTIL_CORRECTED`.

- `services/accounting/data-trust.service.ts`
  - Added `payroll-declaration-authority-lifecycle-proof-missing` blocker.
  - Added `Declaration lifecycle proof gaps` module evidence fact.
  - Updated certified pack evidence wording to require declaration lifecycle register/lifecycle-contract proof.

- Tests
  - `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
    - Submission evidence now asserts lifecycle proof on evidence metadata, evidence payload, declaration metadata, and business events.
    - Added rejection lifecycle test proving authority rejection is close-blocking correction evidence.
  - `services/accounting/__tests__/data-trust.service.test.ts`
    - Added lifecycle-proof blocker/fact expectations and updated evidence wording.

## Files changed

- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by `npm run policy:gates`

## Gates passed

- `npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - 2 suites passed, 17 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - 3 suites passed, 23 tests passed.
- `npm run typecheck`
  - passed.
- `npm run regulatory:hardcode:fail`
  - passed, active findings 0.
- `npm run service:boundary:fail`
  - passed, active service-boundary violations 0.
- `npm run policy:gates`
  - passed.
  - Inventory boundary: active violations 0.
  - Service boundary: active violations 0.
  - Workflow assurance runtime: ready, blockers 0.
  - Payroll immutability runtime: required triggers 8/8, forbidden mutation checks blocked 12/12, allowed lifecycle checks 3/3, blockers 0.
  - Hard-delete gate: active unsafe findings 0.
  - Regulatory hardcode gate: active findings 0.
  - Demo/report trust gate: active findings 0.
  - Raw-error boundary gate: active unsafe findings 0.

## Gates blocked

None for this slice.

## Verification result

Authority declaration lifecycle proof is now close-consumable and evidence-backed. Data-trust certification now blocks close readiness when close-impacting declaration evidence lacks lifecycle contract hash, lifecycle status, or close-impact proof.

## Residual risks

- This does not certify automated filing. Authority adapters remain manual/expert-review blocked unless reviewed payload mappings, response mappings, credentials, sandbox/live receipts, retry/idempotency evidence, and amendment/rejection response contracts are implemented.
- Historical tenant data with older declaration evidence may need a migration/backfill dry run to attach lifecycle proof or explicitly mark evidence as uncertified.
- Full HR/payroll production remains blocked until country-pack breadth, payroll engine hardening, operator workflows, BI/finance integration, migration/backfill, and full release certification complete with evidence.

## Next recommended skill or slice

Next slice: production migration/backfill readiness for existing payroll declarations and payments. Build tenant-by-tenant dry-run evidence for legacy declaration/payment records that predate lifecycle proof, including redacted gap reports, idempotent backfill strategy, rollback/correction plan, and accounting/security/operations signoff hooks.