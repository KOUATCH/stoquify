# AqStoqFlow Raw Error Boundary Gate Report

Generated: 2026-06-17T09:30:08.218Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: `report`
Scan directories: `actions`, `app/api`, `services`, `lib/error-handling`

## Summary

- Active unsafe raw-error findings: 0
- Allowed classified findings: 35
- Total raw-error callsites scanned: 35

## Active Counts

- No active unsafe raw-error findings.

## Active Findings

No active unsafe raw-error findings remain in the scanned runtime boundaries.

## Allowed Classification Counts

- ALLOWED_CONTROL_FLOW: 3
- INTERNAL_LOGGING_ONLY: 30
- TEST_ONLY: 2

## Migration Order

1. Migrate role, user, and auth action boundaries.
2. Migrate unit, tax-rate, location, supplier, and customer management actions.
3. Migrate upload, receipt, and remaining App Router API routes.
4. Replace POS raw service errors with typed domain errors.
5. Replace purchase-order raw service errors with typed domain errors.
6. Keep this gate in report mode until active client-boundary leakage reaches zero or has reviewed allowlist entries.

## Enforcement Ladder

- `report`: classify current raw-error findings without blocking development.
- `warn`: exit 0 while surfacing active unsafe raw-error findings in logs.
- `fail`: exit non-zero when active unsafe findings remain, or when a baseline ratchet gets worse.

