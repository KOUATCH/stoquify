# AqStoqFlow Priority 002 Service Boundary Ratchets Report

Date: 2026-06-16

Skill: `priority-002-service-boundary-ratchets`

## Status

Completed the service-boundary ratchet slice.

This pass did not migrate domain call sites. Priority 001 left a full-Jest blocker in AP/payroll action tests, so Priority 002 was kept to scanner and release-ratchet hardening only.

## Source Reports And Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\priority-002-service-boundary-ratchets\SKILL.md`
- `what-next/AQSTOQFLOW_PRIORITY_001_GREEN_BASELINE_RATCHETS_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- `scripts/service-boundary-gate.js`
- `scripts/__tests__/service-boundary-gate.test.js`
- `package.json`

## Current Priority Status Before Changes

The service-boundary scanner already identified legacy debt and reported:

- Active service-boundary violations: 283
- `ACTION_OWNED_ECONOMIC_MUTATION`: 14
- `ACTION_OWNED_MUTATION`: 38
- `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 143
- `DIRECT_PRISMA_DB_IMPORT`: 53
- `PRISMA_CLIENT_BOUNDARY_COUPLING`: 35

The missing control was a ratchet mode that can fail only when the current legacy debt gets worse against a saved baseline.

## Files Changed

- `scripts/service-boundary-gate.js`
- `scripts/__tests__/service-boundary-gate.test.js`
- `package.json`
- `what-next/AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- `what-next/AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_RATCHET_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_RATCHET_REPORT_2026-06-16.json`
- `what-next/AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_RATCHETS_REPORT_2026-06-16.md`

## Services Added Or Reused

None. This was a boundary-gate and policy-ratchet implementation slice.

## Actions, Routes, Hooks, Or UI Callers Migrated

None. Domain migration remains for Priority 004 and later skills.

## Controls Added

Added baseline-aware ratchet support to `scripts/service-boundary-gate.js`:

- new `--baseline <json-report>` argument;
- compares current active findings against a prior JSON report;
- fails when active violation count increases;
- fails when a classification count worsens;
- fails when new active findings appear;
- reports resolved active findings without failing;
- includes a `Baseline Ratchet` section in markdown output;
- writes ratchet details into JSON output;
- preserves the existing zero-finding `--mode fail` behavior when no baseline is supplied.

Added package script:

```json
"service:boundary:ratchet": "node scripts/service-boundary-gate.js --mode fail --baseline what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json"
```

No allowlist exceptions were added. Current active findings remain debt, not approved exceptions.

## Tests Added Or Changed

Updated `scripts/__tests__/service-boundary-gate.test.js` with baseline-ratchet coverage:

- ratchet passes when active findings do not get worse;
- ratchet fails when new active findings are introduced.

## Static And Boundary Gates Run

### Syntax Check

Command:

```powershell
node --check scripts\service-boundary-gate.js
```

Result: passed.

### Focused Scanner Tests

Command:

```powershell
npm test -- scripts/__tests__/service-boundary-gate.test.js --runInBand
```

Result: passed.

Observed:

- Test suites: 1 passed
- Tests: 5 passed

### Service Boundary Report

Command:

```powershell
node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_PRIORITY_002_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json
```

Result: passed.

Observed summary:

- Active service-boundary violations: 283
- Allowed test/mock/service findings: 5
- Total callsites scanned: 288

### Service Boundary Ratchet

Command:

```powershell
npm run service:boundary:ratchet
```

Result: passed.

Observed ratchet summary:

- Baseline active violations: 283
- Current active violations: 283
- Active violation delta: 0
- New active findings: 0
- Resolved active findings: 0
- Worsened classifications: 0
- Ratchet status: passed

### Typecheck

Command:

```powershell
npm run typecheck
```

Result: passed.

## Remaining Blockers

1. Full Jest baseline remains red from Priority 001:
   - `actions/payroll/__tests__/payroll-control.actions.test.ts`
   - `actions/purchasing/__tests__/ap-control.actions.test.ts`
   - 5 tests expecting `result.success === true` currently receive `false`.
2. Active service-boundary debt remains at 283 findings and must be migrated domain by domain.
3. `service:boundary:fail` still intentionally fails until active findings reach zero.
4. No active findings were allowlisted in this pass; current report mode remains the migration inventory.

## Next Priority Skill

Recommended next action is still to repair the AP/payroll baseline test blockers from Priority 001 before broad domain migration.

After that, continue with:

- `priority-003-tenant-rbac-maker-checker`

The first domain migration cluster after tenant/RBAC hardening remains:

- `priority-004-inventory-item-action-migrator`
