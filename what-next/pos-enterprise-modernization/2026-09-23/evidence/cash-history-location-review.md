# Cash/payment history: provenance review and location correction

Reviewed and corrected 2026-09-24. Only `services/pos/cash-payment-history.service.ts` and its corresponding test were edited for this correction. Other source and owner reports were not changed.

## Baseline attribution

Comparison with the run's original `evidence/baseline/services/pos/` found two existing changes whose author and timing cannot be established from the files:

- The result now includes authenticated organization/actor scope, matching the current workbench hook's stale-scope rejection.
- Summary queries now use `groupBy(type)` and `groupBy(method,status)` with Decimal sums and event counts, instead of loading all matching rows. Tests cover scope, counts rather than group counts, decimal/outflow totals, foreign cursors, empty results, and excluded lanes.

These changes align with the POS review's scope-isolation and performance objectives, but must be recorded as observed changes of unknown provenance rather than attributed to a worker. Both were preserved. The pre-correction current files and SHA-256 hashes are saved in `cash-history-location-baseline/`. Their focused service suite passed **1 suite / 6 tests**, exit 0 (`cash-history-before-tests.log`, `cash-history-before-test-exit.json`).

The aggregation arithmetic preserves the existing model: both amount columns use `Decimal(14,2)`, and cash-impact transformations are linear by transaction type. This assessment is not a database performance benchmark.

## Defect and correction

**Medium: requested location did not constrain payment history.** `cashBaseWhere` included `filters.locationId`; `paymentBaseWhere` did not. Requesting one store therefore restricted cash rows but could return other stores' payments and include their values in payment totals. This defect is present in the original baseline and was not introduced by the scope/aggregation changes.

The shared payment predicate now restricts both paginated rows and grouped summaries to the requested location. It follows the existing displayed-location rule:

1. A linked sale's location is authoritative.
2. Without a linked sale, use the purchase order's location.
3. A payment linked to neither has no location. Exclude it from a location-filtered request; retain it in unfiltered history.

`SalesOrder.locationId` and `PurchaseOrder.locationId` are required in the current schema; their relations on `Payment` are nullable. If both relations exist, the sale continues to take precedence. Trusted tenant, cashier, status, method, date, pagination, and soft-delete predicates are preserved. No new access permission, schema, migration, or data mutation was introduced.

## Regression evidence

Four new query-contract fixture cases use six payments across two stores: sale-only links, purchase-only links, one unlinked payment, and a payment linked to a sale in store one and a purchase order in store two. They verify returned payment IDs, displayed locations, aggregate totals, aggregate event counts, and identical row/summary scope predicates for:

- Store one: 3 payments, total 100.00.
- Store two: 2 payments, total 60.00.
- An unmatched location: no payments, zero totals.
- Unfiltered history: all 6 payments, total 210.00, including the unlinked record.

These are explicit query-contract tests with fixture data, not a simulated claim of PostgreSQL execution. A real PostgreSQL relational aggregation check would strengthen runtime assurance; no such claim is made here.

Final focused suite: **1 suite / 10 tests passed**, exit 0. Evidence: `cash-history-location-tests.log`, `cash-history-location-test-exit.json`.

Scoped lint of the two changed files: **passed**, exit 0. Evidence: `cash-history-location-lint.log`, `cash-history-location-lint-exit.json`.

Tests used `TS_NODE_TRANSPILE_ONLY=true`, `TS_NODE_COMPILER_OPTIONS={"moduleResolution":"node"}`, `--runInBand`, focused `services/pos/__tests__` roots, and `--runTestsByPath services/pos/__tests__/cash-payment-history.service.test.ts`.

## Final source and build provenance

Application source became stable at **2026-09-24T03:34:45.1565774Z**. Service SHA-256: `78C0E579A2317A5AC850D21E633AD17F006B0F7F86278E97B841301C61B5EEB1`.

Test SHA-256: `41F62D4FA024E5281EAF3D64B98EE9B514430BE11E10A4552C4A9582956115D3`, last written at `2026-09-24T03:34:45.1673401Z`.

Machine-readable evidence: `cash-history-location-final.json`. The final typecheck/build reviewer was notified of the timestamps. A build started before this mutation is not automatically evidence for this final service revision; the parent release report must preserve that distinction.
