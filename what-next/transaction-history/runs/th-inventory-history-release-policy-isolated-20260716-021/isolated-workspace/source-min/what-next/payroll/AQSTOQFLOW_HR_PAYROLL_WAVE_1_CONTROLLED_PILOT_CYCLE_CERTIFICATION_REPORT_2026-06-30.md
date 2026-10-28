# AqStoqFlow HR/Payroll Wave 1 Controlled Pilot Cycle Certification Report

Date: 2026-06-30

Status: PASS for this slice. Full unrestricted HR/payroll production readiness remains gated by the broader roadmap, but the controlled-pilot go/no-go requirement is now represented as a service-owned, redacted, evidence-backed certificate.

## Decision

This slice turns the final readiness standard, "one controlled pilot payroll cycle reconciles cleanly and receives accounting/security/operations signoff," into an executable payroll release-gate service:

- `services/payroll/payroll-pilot-cycle-certification.service.ts`
- `services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts`

The service does not calculate payroll, release payments, file declarations, mutate close state, or claim a pilot happened. It certifies only the evidence available for a tenant/payroll run.

## What Changed

- Added `certifyPayrollPilotCycle`.
- Added a redacted certificate kind:
  - `AQSTOQFLOW_PAYROLL_CONTROLLED_PILOT_CYCLE_CERTIFICATE`
- Added pilot status outcomes:
  - `BLOCKED`
  - `READY_FOR_SIGNOFF`
  - `CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW`
- Required source-owned payroll proof for:
  - posted/paid/archived payroll run state;
  - payroll run document, evidence, calculation, and attendance hashes;
  - ledger batch, journal entry, and accounting source-link proof;
  - matched statutory component register proof;
  - payroll component mapping proof;
  - emitted/corrected payslip tie-out for every run line;
  - reconciled/archived declaration lifecycle evidence;
  - declaration source register proof, authority adapter proof, lifecycle proof, and adapter chaos release-gate proof;
  - settled payment batch evidence, transaction, reconciliation status, payment allocations, ledger posting, provider adapter proof, lifecycle proof, and adapter chaos release-gate proof;
  - proof-backfill reconciliation certificate readiness;
  - close assurance run status `READY` or `CERTIFIED`;
  - payroll admin, accounting controller, security/privacy, and operations-owner signoffs.

## Proof Continuity

The certificate carries only redacted references, counts, statuses, and hashes. It links the pilot evidence pack across:

- payroll register/source-register proof;
- declaration lifecycle and authority adapter evidence;
- payment settlement and provider adapter evidence;
- proof-backfill/data-trust certificate readiness;
- close assurance readiness;
- accounting/security/operations signoff.

## Guardrails

- No raw person data.
- No raw salary data.
- No raw payment-destination data.
- No raw provider payloads.
- No raw authority payloads.
- No client-computed payroll truth.
- No new production mutation path.

## Validation

Passed:

```bash
npm test -- --runTestsByPath services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts --runInBand
npm run typecheck
npm test -- --runTestsByPath services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand
```

Coverage added:

- clean pilot evidence pack produces `CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW`;
- missing declaration/payment adapter chaos proof blocks certification;
- clean evidence without the four required signoffs returns `READY_FOR_SIGNOFF`;
- mocked employee/payment/provider sensitive strings are excluded from the certificate.

## Roadmap Impact

This closes a concrete release-gate gap in the final readiness report: the pilot-cycle requirement is no longer only a manual note. It is now a payroll-owned certificate that can be attached to the final Prompt 19/21 release pack.

It also connects the previous adapter chaos and proof-backfill continuity slices to the full production go/no-go path.

## Remaining Limits

This does not finish unrestricted production rollout. Remaining blockers still include:

- statutory country-pack breadth across all production legal claims;
- live authority/provider credentials and external adapter settlement behavior;
- tenant-by-tenant production migration execution approval;
- full browser visual/accessibility validation on all implemented payroll routes;
- finance/BI replacement of estimated facts with register/payment/declaration/ledger facts;
- final accounting, security, operations, and product signoff after an actual pilot cycle.

## Next Recommended Slice

Wire the pilot-cycle certificate into the payroll command/read model and final readiness/reporting surface so operators can see whether a payroll run is:

- blocked by missing proof;
- ready for signoff;
- certified for production release review.

That should remain a read-model/reporting integration first. Avoid adding new action buttons until the signoff authority and fresh-auth workflow are explicitly approved.
