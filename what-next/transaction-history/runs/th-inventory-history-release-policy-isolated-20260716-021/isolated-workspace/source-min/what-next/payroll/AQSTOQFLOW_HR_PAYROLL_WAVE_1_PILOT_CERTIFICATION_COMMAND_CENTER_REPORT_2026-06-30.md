# AqStoqFlow HR/Payroll Wave 1 Pilot Certification Command Center Report

Date: 2026-06-30

Status: PASS for this slice. The controlled pilot-cycle certificate is now visible in the payroll command/read model and command center without adding unsupported signing or release actions.

## Decision

The previous slice created `AQSTOQFLOW_PAYROLL_CONTROLLED_PILOT_CYCLE_CERTIFICATE`. This slice wires its persisted audit evidence into operator visibility:

- `services/payroll/command-read-model.service.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`

## What Changed

- Added `pilotCertification` to command readiness.
- Added `pilotCertification` to command evidence.
- Read the latest persisted `PayrollPilotCycleCertification` audit log for the latest payroll run.
- Surfaced certificate status:
  - `NOT_EVALUATED`
  - `BLOCKED`
  - `READY_FOR_SIGNOFF`
  - `CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW`
- Added command blockers for:
  - missing pilot-cycle certificate;
  - blocked pilot-cycle certificate;
  - required signoffs.
- Added a proof drawer subject for pilot certification.
- Added a compact command-center metric for pilot certificate state.

## Guardrails

- No new mutation path.
- No signing button.
- No production release button.
- No client-side payroll truth.
- No salary/person/payment/provider payload exposure.
- The UI only renders the persisted certificate status, hash, blocker codes, missing signoff roles, release-gate count, and redaction policy.

## Validation

Passed:

```bash
npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand
npm run typecheck
```

Coverage added:

- missing persisted pilot-cycle certificate produces command readiness/action-required evidence;
- persisted certified pilot-cycle audit evidence marks pilot certification as ready;
- command center renders pilot certification state and opens proof-drawer certificate details.

## Roadmap Impact

The final production go/no-go standard now has an operator-visible path:

1. pilot certificate not evaluated;
2. pilot certificate blocked by evidence gaps;
3. pilot certificate ready for signoff;
4. pilot certificate certified for production release review.

This connects the service-owned certification gate to the daily command center while preserving the existing control spine:

HR source data -> contracts/compensation/attendance -> payroll run -> immutable register -> payslips/payments/declarations -> close assurance/data trust -> controlled pilot certification -> final release review.

## Remaining Limits

This does not complete unrestricted production readiness. Remaining work still includes:

- statutory breadth for all production legal claims;
- live authority/provider credentials and external adapter behavior;
- tenant-by-tenant production migration execution approval;
- browser visual/accessibility validation across implemented routes;
- finance/BI replacement of estimates with payroll register/payment/declaration/ledger facts;
- actual pilot cycle execution and final accounting/security/operations signoff.

## Next Recommended Slice

Add a final release-readiness pack/read model that consumes:

- setup readiness;
- adapter chaos gate;
- proof-backfill reconciliation;
- pilot-cycle certification;
- browser validation evidence;
- policy gates;
- close/data-trust evidence.

It should remain read-only until signoff workflow authority is explicitly approved.
