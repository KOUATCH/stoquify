# AqStoqFlow HR/Payroll Wave 1 Authority Mapping Certification and Duplicate Replay Report - 2026-06-30

Status: READY FOR CONTROLLED PILOT EVIDENCE SCOPE.

## Selected Skills

- aqstoqflow-payroll-declaration-compliance: Phase 5 authority declaration automation.
- aqstoqflow-payroll-country-pack-engine: Phase 3 statutory provenance boundary.
- aqstoqflow-payroll-assurance-chaos: Phase 9 duplicate response and failure evidence hardening.

## Executable Slice

Deepen certified authority adapter readiness so automated filing remains blocked unless reviewed country-pack-scoped mappings, code maps, duplicate replay proof, outage proof, receipt proof, and legal review proof are present. Add duplicate terminal authority-response replay behavior so repeated accepted/rejected/payment-due/amendment/failed responses do not create duplicate execution evidence.

## Implemented

- Added authority harness provenance fields: country code, country-pack version, country-pack resolution hash, declaration type, and mapping schema version.
- Added reviewed authority status code map and payment-due mapping proof requirements.
- Added duplicate terminal authority response replay fixture proof requirement.
- Included the new mapping and provenance proofs in authority certification certificates.
- Kept certification blocker-driven: missing country-pack/mapping proofs block certificate issuance instead of throwing schema errors.
- Added terminal duplicate authority response replay handling in processPayrollAuthorityAdapterExecution.
- Duplicate terminal responses with the same status, response hash, and receipt hash now return the existing execution as idempotent and do not write metadata, audit logs, or business events.
- Duplicate terminal responses with conflicting proof still fail closed.

## Files Changed

- services/payroll/payroll-adapter-certification-harness.service.ts
- services/payroll/authority-adapter-execution.service.ts
- services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts
- services/payroll/__tests__/authority-adapter-execution.service.test.ts

## Verification

- npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts --runInBand
  - Passed: 2 suites, 15 tests.
- npm test -- --runTestsByPath services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-adapter-registry.service.test.ts --runInBand
  - Passed: 4 suites, 30 tests.
- npm run typecheck
  - Passed.
- npx eslint services/payroll/payroll-adapter-certification-harness.service.ts services/payroll/authority-adapter-execution.service.ts services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts
  - Passed.
- npx prettier --write touched authority mapping certification files
  - Passed.
- npm run service:boundary:fail
  - Passed with 0 active service-boundary violations.
- npm run policy:gates
  - Passed, including inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw error boundary gates.

## Production Readiness Impact

This closes another authority automation claim gap. A production authority adapter certificate now has to prove that payload/response behavior is scoped to a specific country pack and declaration type, includes reviewed status/rejection/amendment/payment-due code maps, and includes duplicate terminal-response replay evidence. The execution service now behaves safely when an authority sends the same terminal response twice.

This still does not approve unrestricted automated legal filing. The platform still needs real country-specific adapter implementations, live/sandbox credential provisioning, browser-smoked operator amendment/payment-due workflows, and a clean controlled pilot payroll cycle.

## Residual Risks

- Certification certificates are proof contracts; they still depend on external legal/regulatory review producing the referenced hashes.
- The sandbox adapter can rehearse outcomes, but real authority adapters still need implementation-specific payload builders and parsers.
- Duplicate terminal replay is covered at the execution service boundary; concurrent lease racing should still be stress-tested with persistence-level worker contention.
- Provider payment automation still needs equivalent duplicate terminal settlement replay and reversal/partial-settlement chaos depth.

## Next Recommended Slice

Continue with real adapter implementation contracts: build country-specific authority adapter payload/response fixture runners that consume these harness proofs, then add concurrency/lease-race chaos tests for duplicate authority callbacks and payment provider settlement callbacks.
