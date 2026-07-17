# AqStoqFlow HR/Payroll Pilot Certification Operator Panel Execution Report

Date: 2026-07-01
Status: PASSED for this execution slice
Release posture: still CONTROLLED PILOT / LIMITED RELEASE until final production blockers are closed with evidence.

## Purpose

This slice connects the controlled pilot-cycle certification gate to the payroll command center so operators can evaluate and persist pilot certification from service-owned proof inputs. The intent is to remove one of the remaining operational gaps between backfilled proof evidence, payroll register truth, adapter chaos proof, and production-readiness signoff.

## Implemented Scope

1. Service-owned pilot certification inputs are now exposed by the command read model.
   - `services/payroll/command-read-model.service.ts:209` adds `evidence.pilotCertificationInput` to the read-model contract.
   - `services/payroll/command-read-model.service.ts:284` extracts the persisted proof-backfill certificate payload from audit evidence.
   - `services/payroll/command-read-model.service.ts:312` selects the adapter chaos release-gate hash from certified authority/provider proof.
   - `services/payroll/command-read-model.service.ts:328` builds the exact pilot certification input bundle, including missing-input blockers.
   - `services/payroll/command-read-model.service.ts:663` loads the latest pilot certification audit and latest proof-backfill reconciliation certificate audit together.
   - `services/payroll/command-read-model.service.ts:687` binds latest run evidence, adapter chaos proof, and proof-backfill certificate evidence into the command read model.
   - `services/payroll/command-read-model.service.ts:964` returns the input bundle under `evidence`.

2. The command center now renders the pilot certification operator panel.
   - `components/payroll/PayrollCommandCenter.tsx:32` imports the panel.
   - `components/payroll/PayrollCommandCenter.tsx:795` mounts it in the payroll command center after the readiness rail.

3. Operators can evaluate or persist a pilot certification certificate from the command center.
   - `components/payroll/PayrollPilotCertificationPanel.tsx:67` submits the service-owned input bundle to `certifyPayrollPilotCycleAction`.
   - `components/payroll/PayrollPilotCertificationPanel.tsx:100` renders the pilot certification gate, current run, status, and input readiness.
   - `components/payroll/PayrollPilotCertificationPanel.tsx:151` captures the required signoff bundle.
   - `components/payroll/PayrollPilotCertificationPanel.tsx:192` evaluates without persistence.
   - `components/payroll/PayrollPilotCertificationPanel.tsx:201` persists the certificate through the fresh-auth protected action path.

4. Regression coverage was added for read-model input propagation and operator behavior.
   - `services/payroll/__tests__/payroll-command-read-model.service.test.ts:433` verifies missing proof-backfill certificate input blocks readiness.
   - `services/payroll/__tests__/payroll-command-read-model.service.test.ts:524` verifies proof-backfill and adapter chaos hashes make the input complete.
   - `components/payroll/__tests__/PayrollCommandCenter.test.tsx:359` adds the command-center fixture input bundle.
   - `components/payroll/__tests__/PayrollPilotCertificationPanel.test.tsx:71` covers the new panel render, evaluate, persist, and fresh-auth denial paths.

## Verification Evidence

Passed:

- `npx jest services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx components/payroll/__tests__/PayrollPilotCertificationPanel.test.tsx --runInBand`
  - Result: 3 suites passed, 9 tests passed.
- `npx jest actions/payroll/__tests__/payroll-pilot-certification.actions.test.ts services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts --runInBand`
  - Result: 2 suites passed, 9 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run service:boundary:fail`
  - Result: passed, 0 active service-boundary violations.
- `npm run policy:gates`
  - Result: passed, including inventory boundary, service boundary, workflow assurance runtime table check, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.
- Authenticated browser route smoke:
  - Command: `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3000 --timeout-ms 60000 --require-screenshots --route payroll --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-pilot-certification --out what-next/payroll/AQSTOQFLOW_PAYROLL_PILOT_CERTIFICATION_UI_ROUTE_SMOKE_BROWSER.json`
  - Result: `UI route smoke: ok`
  - Route: `/en/dashboard/payroll`
  - Artifact: `what-next/payroll/AQSTOQFLOW_PAYROLL_PILOT_CERTIFICATION_UI_ROUTE_SMOKE_BROWSER.json`
  - Screenshots:
    - `what-next/payroll/screenshots/payroll-pilot-certification/payroll-tablet.png`
    - `what-next/payroll/screenshots/payroll-pilot-certification/payroll-desktop.png`

## Design Decision

The panel does not ask the operator to manually invent proof hashes. It consumes the latest service-owned command read-model facts: payroll register evidence hash, adapter chaos release-gate hash, and persisted proof-backfill reconciliation certificate hash. That keeps POS, sales, BI, and UI surfaces out of payroll truth ownership and preserves the roadmap rule that payroll production readiness must be evidence-backed, tenant-safe, redacted, and audited.

## Production-Readiness Impact

This closes an operator-surface gap for controlled pilot certification. It makes the pilot certification gate visible and actionable from the payroll command center and wires persistence through the existing protected server action.

This does not by itself make HR/payroll full-production ready. Full production still requires the final go/no-go evidence chain: at least one controlled pilot payroll cycle reconciled cleanly, persisted signoffs under fresh auth, final accounting/security/operations signoff, and closure of the remaining statutory, migration, provider, and release-gate blockers documented in the roadmap/readiness reports.

## Remaining Next Work

1. Run an end-to-end controlled pilot payroll cycle on tenant data and persist the pilot certificate with all four signoff roles.
2. Confirm the certificate participates in final readiness and close-pack blockers exactly as production signoff requires.
3. Re-run Prompt 19/21 release gates after the pilot cycle is persisted.
4. Keep closing country-pack breadth, provider/authority adapter production credentials, settlement receipts, declaration receipts, and tenant migration/backfill signoff before unrestricted rollout.