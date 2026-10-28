# AqStoqFlow HR/Payroll Operator Execution Gate Execution Report

Date: 2026-07-01
Scope: payroll setup proof-backfill operator route/action hardening
Decision: slice complete; full HR/payroll production readiness remains gated by pilot reconciliation, broader statutory/adapters evidence, concurrency/closed-period/provider-chaos checks, and final release signoff.

## What Changed

- Split payroll proof-backfill execution into two protected action paths:
  - `validate` remains read-gated and does not require fresh authentication.
  - `execute` is write-gated, requires fresh authentication, and forwards only `ctx.freshAuth.lastAuthAt` from verified session claims.
- Forced validate mode to ignore client-provided mutation approval flags.
- Added explicit forwarding of `executionMutationApproved` only on the execute path, preserving the service-side default-deny execution contract.
- Added a compact operator panel on `/dashboard/payroll/setup` for proof validation and approved execution inputs.
- The operator panel submits to the service-backed server action and surfaces success/denied states without exposing tenant IDs, payroll person data, salary data, or provider payloads.

## Files Changed

- `actions/payroll/payroll-setup.actions.ts`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`
- `components/payroll/PayrollSetupControlPlane.tsx`
- `components/payroll/PayrollProofBackfillExecutionPanel.tsx`
- `components/payroll/__tests__/PayrollSetupControlPlane.test.tsx`
- `components/payroll/__tests__/PayrollProofBackfillExecutionPanel.test.tsx`

## Evidence

### Focused Regression Tests

Passed:

```text
npx jest actions/payroll/__tests__/payroll-setup.actions.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx components/payroll/__tests__/PayrollProofBackfillExecutionPanel.test.tsx --runInBand
Test Suites: 3 passed, 3 total
Tests: 14 passed, 14 total
```

Coverage added:

- Validate mode uses the read gate and does not call fresh-auth.
- Execute mode returns a client-safe fresh-auth denial before permission/service execution when step-up auth is missing.
- Execute mode forwards verified `lastAuthAt` from the protected action context.
- Operator panel submits validate payloads without mutation approval.
- Operator panel submits approved execute payloads with signoff evidence.
- Operator panel renders server-denied fresh-auth state.

### Type and Boundary Gates

Passed:

```text
npm run typecheck
npm run service:boundary:fail
npm run policy:gates
```

Policy gate result included:

- Inventory boundary: pass
- Service boundary: pass
- Workflow assurance runtime: pass
- Payroll immutability runtime: pass
- Hard-delete gate: pass
- Regulatory hardcode gate: pass
- Demo/report trust gate: pass
- Raw-error boundary gate: pass

### Authenticated Browser Smoke

Passed targeted setup route smoke:

```text
node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3000 --timeout-ms 60000 --require-screenshots --route payroll-setup --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-operator-execution --out what-next/payroll/AQSTOQFLOW_PAYROLL_OPERATOR_EXECUTION_UI_ROUTE_SMOKE_BROWSER.json
```

Result:

- `what-next/payroll/AQSTOQFLOW_PAYROLL_OPERATOR_EXECUTION_UI_ROUTE_SMOKE_BROWSER.json`
- Tablet screenshot: `what-next/payroll/screenshots/payroll-operator-execution/payroll-setup-tablet.png`
- Desktop screenshot: `what-next/payroll/screenshots/payroll-operator-execution/payroll-setup-desktop.png`

## Production Readiness Impact

Closed for this slice:

- The proof-backfill execute action is no longer exposed through the same read-style action posture as validation.
- Client input can no longer provide trusted fresh-auth evidence.
- Operator execution input now exists on the setup route and is backed by the service-owned proof-backfill executor.
- Validate, execute, and fresh-auth-denied states are covered by regression tests.
- The modified setup route passed authenticated browser smoke.

Still blocked for full production:

- A controlled pilot payroll cycle must reconcile cleanly from calculation to register, payment, declarations, accounting posting, and close readiness.
- Full payroll route browser smoke should be rerun across every payroll route after the remaining workflow slices are complete.
- Tenant isolation, double-submit/concurrency, closed-period, provider failure/chaos, and amendment rejection scenarios still need release-gate evidence.
- Authority/payment adapters still need real jurisdiction/provider payload mapping evidence before unrestricted automation claims.
- Accounting/security/operations signoff remains required after the final readiness rerun.

## Go/No-Go

Go for controlled pilot use of the implemented proof-backfill operator gate.

No-go for unrestricted full HR/payroll production rollout until the remaining release gates and pilot reconciliation evidence are closed.