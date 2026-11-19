# P04-R03 verification matrix

Candidate p04-r03-20261104-9c1182e0773a. [Machine matrix](verification-matrix.json) binds named unit/native assertions and indexed database observations to each handler.

| Handler | Matched new unit checks | Native checks | Local result |
|---|---:|---:|---|
| getItemAction | 20 | 4 | Passed |
| listItemsAction | 20 | 4 | Passed |
| updateItemBasicInfoAction | 24 | 5 | Passed |
| updateItemDetailsAction | 23 | 5 | Passed |
| updateItemPricingAction | 22 | 4 | Passed |
| updateItemRelationsAction | 22 | 5 | Passed |
| updateItemStockAction | 33 | 8 | Passed |
| updateItemTrackingAction | 22 | 4 | Passed |
| deleteItemAction | 22 | 4 | Passed |

Four further shared unit assertions cover explicit null-item output, provider-message spoofing and stock secondary-permission denial/positive behavior. All212 new assertions and12 existing compatibility checks passed (224 total,4 suites,0 skipped). Exact pre-repair bytes reproduced9 sentinel disclosures;203 other assertions were deliberately filtered in that historical run.

All43 native checks passed against a fresh PostgreSQL database after121migration replay/checksum checks.32 denied/rolled-back comparisons and one forged-list read preserved24 business-relation groups; one additional positive stock pair records the intended SUBMITTED adjustment without posted stock/ledger.25 security-audit rows across denial observations are expected and separately recorded.5208 source inputs and migrations stayed unchanged. Owned database stopped; port released; no remaining clients.

Neither unit nor native lane qualifies signed-cookie transport, session expiry/revocation, rendered/browser recovery or hosted/operator acceptance. Native Better Auth/Next adapters are stubbed. Seven unit cache-failure checks preserve the existing post-write failure behavior; response failure alone does not prove rollback. The separate sibling list-action disclosure remains P04-R04.

Inventory objects and their catch text/line numbers are explicitly pre-repair provenance. Each handler also has its current source SHA and current export line; final behavior uses itemActionError and the existing safe logged contract.
