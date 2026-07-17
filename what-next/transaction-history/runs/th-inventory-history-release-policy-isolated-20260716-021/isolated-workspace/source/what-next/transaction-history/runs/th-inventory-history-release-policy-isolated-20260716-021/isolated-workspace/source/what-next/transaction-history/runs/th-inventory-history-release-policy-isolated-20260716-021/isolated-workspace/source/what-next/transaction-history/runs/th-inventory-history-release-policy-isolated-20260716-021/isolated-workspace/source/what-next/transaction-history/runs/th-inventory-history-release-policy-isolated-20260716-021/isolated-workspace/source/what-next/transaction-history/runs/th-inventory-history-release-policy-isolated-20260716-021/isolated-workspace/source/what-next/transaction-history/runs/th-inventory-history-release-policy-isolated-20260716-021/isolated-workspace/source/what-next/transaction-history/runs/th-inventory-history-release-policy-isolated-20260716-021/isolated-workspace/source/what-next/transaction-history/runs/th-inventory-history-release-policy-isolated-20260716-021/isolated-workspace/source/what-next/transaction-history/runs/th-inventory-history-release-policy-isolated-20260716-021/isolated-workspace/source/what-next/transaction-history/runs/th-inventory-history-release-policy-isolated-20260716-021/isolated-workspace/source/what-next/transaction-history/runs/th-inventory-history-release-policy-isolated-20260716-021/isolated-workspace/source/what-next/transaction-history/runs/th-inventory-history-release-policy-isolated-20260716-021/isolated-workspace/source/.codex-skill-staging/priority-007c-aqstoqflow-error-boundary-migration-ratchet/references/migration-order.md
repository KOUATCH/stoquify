# Migration Order

Prefer this order:

1. Add or repair `scripts/raw-error-boundary-gate.js` in report mode.
2. Migrate role, user, and auth action boundaries.
3. Migrate management actions for unit, tax-rate, location, supplier, and customer.
4. Migrate upload, receipt, and remaining App Router API routes.
5. Replace POS raw service errors with typed domain errors.
6. Replace purchase-order raw service errors with typed domain errors.
7. Move scanner from report to warn/fail after active unsafe findings reach zero or reviewed allowlists exist.

Keep each slice small enough to verify with focused tests.
