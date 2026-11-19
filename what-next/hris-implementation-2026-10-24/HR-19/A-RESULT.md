# HR-19A — Current input contract

Scoped entry/exit evidence: five pure contract/CSV tests and five real PostgreSQL tests pass in `unit-a-reviewed.log` and `postgres-a-reviewed.log`. The fixture contains201 employees: exactly200 eligible, including a mid-period leaver, and one explicit prior-period exclusion. Exact decimal contract-reference totals and minute totals reconcile; missing contracts/pending requests remain visible blockers. Existing salary permissions are required for both operator and recipient. A concurrent employee-first writer updates the period without deadlock and the projection rereads the resulting period.

Independent reviewer `/root/hr09_independent_review`: PASS_SCOPED source-only after fixing five findings (salary visibility, period lock order, compensation-definition lock, exported applicability dates, deterministic pending-source order). Initial no-emit check passed; final cumulative types will run after B/C.

No package has been issued or recipient acknowledged by this child slice. Native operational time is revalidated under Read Committed locks, not HR18 repeatable-read mode. Legacy/external certification remains a trusted reviewed source contract; fixtures are synthetic and do not qualify any national payroll rule or live provider. B may now add immutable issue/receipt storage and replay controls.
