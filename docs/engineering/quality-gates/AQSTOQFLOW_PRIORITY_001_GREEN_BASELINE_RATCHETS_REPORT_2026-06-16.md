# AqStoqFlow Priority 001 Green Baseline Ratchets Report

Date: 2026-06-16

Skill: `priority-001-green-baseline-ratchets`

## Status

Baseline captured with blockers.

Priority 001 was run in baseline-preservation mode only. No application code was refactored, no service boundaries were changed, and no legacy paths were migrated in this pass.

## Source Reports And Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\priority-001-green-baseline-ratchets\SKILL.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `package.json`
- `scripts/inventory-boundary-gate.js`
- `scripts/service-boundary-gate.js`

## Current Priority Status Before Changes

The enterprise examination report defines Priority 0 as preserving the current green baseline before continuing broader modernization. The current baseline is mostly healthy but not fully green:

- Prisma schema validation passes.
- TypeScript typecheck passes.
- Inventory boundary fail gate passes with zero active stock-mutation violations.
- Service-boundary gate runs in report mode and still reports known legacy service-boundary debt.
- Full Jest baseline is currently blocked by AP and payroll action tests.

## Files Changed

- `what-next/AQSTOQFLOW_PRIORITY_001_GREEN_BASELINE_RATCHETS_REPORT_2026-06-16.md`

No application source code was changed.

## Services Added Or Reused

None. This was a baseline run only.

## Actions, Routes, Hooks, Or UI Callers Migrated

None. Migration is deferred to later priority skills after the baseline blockers are handled or explicitly accepted.

## Controls Added

No new controls were added in this pass.

Existing controls confirmed:

- inventory boundary gate is available and enforceable in fail mode;
- service-boundary gate is available in report mode;
- Prisma schema validation is available;
- TypeScript typecheck is available.

## Static And Boundary Gates Run

### Prisma Validate

Command:

```powershell
npm run prisma:validate
```

Result: passed.

Non-blocking warning:

- `package.json#prisma` configuration is deprecated and should move to a Prisma config file before Prisma 7.

### Typecheck

Command:

```powershell
npm run typecheck
```

Result: passed.

### Inventory Boundary

Command:

```powershell
npm run inventory:boundary:fail
```

Result: passed.

Observed summary:

- Active violations: 0
- Allowed kernel/test findings: 22
- Total stock mutation callsites scanned: 22

### Service Boundary

Command:

```powershell
node scripts\service-boundary-gate.js --mode report
```

Result: passed in report mode.

Observed summary:

- Active service-boundary violations: 283
- Allowed test/mock/service findings: 5
- Total callsites scanned: 288

Active counts:

- `ACTION_OWNED_ECONOMIC_MUTATION`: 14
- `ACTION_OWNED_MUTATION`: 38
- `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 143
- `DIRECT_PRISMA_DB_IMPORT`: 53
- `PRISMA_CLIENT_BOUNDARY_COUPLING`: 35

This remains expected Priority 002 and later migration work, not a Priority 001 code change.

## Full Jest Baseline

Command:

```powershell
npm test -- --runInBand
```

Result: failed.

Summary:

- Test suites: 2 failed, 55 passed, 57 total
- Tests: 5 failed, 257 passed, 262 total

Failing suites:

- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`

Failing tests:

- `payroll control actions > derives payroll payment tenant and release actor fields from the authenticated context`
- `payroll control actions > derives declaration preparer from the authenticated context`
- `AP control actions > derives supplier invoice tenant and actor fields from the authenticated context`
- `AP control actions > injects approver and releaser IDs for supplier payment release`
- `AP control actions > injects the requester ID for supplier bank change requests`

Common observed failure:

- Each failing test expected `result.success` to be `true`, but received `false`.

## Remaining Blockers

1. Resolve or explicitly defer the five failing AP/payroll action tests before treating the full repo baseline as green.
2. Keep service-boundary gate in report mode until the 283 active findings are migrated or placed behind reviewed expiring allowlist entries.
3. Migrate deprecated `package.json#prisma` configuration to a Prisma config file before Prisma 7 readiness work.

## Next Priority Skill

Do not advance blindly while the full Jest baseline is red.

Recommended next action:

1. Run a narrow repair pass for the AP/payroll action test failures.
2. Re-run:

```powershell
npm test -- actions/payroll/__tests__/payroll-control.actions.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts --runInBand
npm test -- --runInBand
```

3. After the baseline is green or the failures are explicitly accepted as known blockers, continue with `priority-002-service-boundary-ratchets`.

## Resolution Addendum

Date: 2026-06-16

The AP/payroll Jest baseline blocker was resolved in a follow-up repair pass.

Files changed:

- `actions/payroll/payroll-control.actions.ts`
- `actions/purchasing/ap-control.actions.ts`

Resolution:

- AP and payroll protected action wrappers that rebuild service input from authenticated `ctx.orgId` and `ctx.userId` now opt out of the pre-handler caller-supplied tenant guard with `tenantGuard: false`.
- The global `protect` tenant guard remains enabled by default for ordinary protected actions.
- The affected AP/payroll handlers continue to discard caller-supplied `organizationId`, approval actor, release actor, and preparer fields before calling services.

Verification after repair:

```powershell
npm test -- actions/payroll/__tests__/payroll-control.actions.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts --runInBand
npm test -- --runInBand
npm run service:boundary:ratchet
npm run inventory:boundary:fail
npm run typecheck
npm run prisma:validate
```

Results:

- AP/payroll targeted tests: 2 suites passed, 10 tests passed.
- Full Jest baseline: 57 suites passed, 264 tests passed.
- Service-boundary ratchet: passed with 283 baseline findings, 283 current findings, 0 new findings, 0 worsened classifications.
- Inventory boundary: passed with 0 active violations.
- Typecheck: passed.
- Prisma validation: passed with the existing Prisma 7 deprecation warning for `package.json#prisma`.
