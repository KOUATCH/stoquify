# Finance Command Surfaces Smoke Rerun Note

Date: 2026-06-26

Scope: Extended the minimal authenticated dashboard command smoke harness to cover `/dashboard/finance/cash-command` and `/dashboard/finance/stock-to-cash`.

Verification run:

```powershell
npm test -- __tests__/authenticated-dashboard-command-surfaces.smoke.test.tsx --runInBand
```

Result: Passed. Jest reported 1 test suite passed, 9 tests passed, 0 snapshots.

Coverage added: tenant session service calls, route shell render assertions, shared finance loading/error states, and permission-denied access gating for both finance command routes.