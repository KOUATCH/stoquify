# Purchasing AP gate source-contract repair

Only `scripts/purchasing-ap-consolidation-gate.js` and its focused regression test were changed. No production purchasing or approval code was edited.

The three original failures were stale source expectations:

- Purchase-order maker/checker enforcement moved to `assertPurchaseApprovalOrder`, which rejects missing maker identity and self-approval. The gate now requires its import and invocation before the order mutation and the approval audit event.
- Receipt and inspection resolution now support a caller-supplied transaction. The gate requires the explicit caller/owned transaction wrapper, its invocation before locks and mutations, receipt evidence before quantity/stock posting, and the existing PostgreSQL rollback evidence markers.
- Supplier invoice approval now runs through the reviewed-revision action/service. The original adapter refuses submission with `REVIEW_REQUIRED`. The gate follows server-derived user/tenant/session scope, current posting permission, session token/expiry, password assurance within five minutes, fresh-auth rejection, revision/blocker checks and posting in the same serializable transaction. The original lower-service maker/checker and tests remain required.

Validation:

- `node node_modules/jest/bin/jest.js scripts/__tests__/purchasing-ap-consolidation-gate.test.js --runInBand`: **1 suite, 33 tests passed**, test runtime 56.39 seconds, exit 0. Jest printed its generic delayed-exit/open-handles notice before eventual completion; no test failure occurred.
- Twenty-four added mutations cover helper disconnection or late enforcement, caller transaction loss, legacy direct approval, claimed success, scope/permission/session/freshness bypass, ignored revision/blockers and detached posting transaction.
- All **11 original gate checks retained**, actual source result **11/11 ready**.
- `git diff --check` for gate and test passed (line-ending normalization warning only).

This is static source-control evidence. Historic malformed issued sales, receipt-source mismatches and missing inventory business-event evidence remain separate, unresolved data findings.
