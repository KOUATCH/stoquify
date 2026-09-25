# Business pulse: stock policy and useful actions

This is a bounded continuation of the whole-platform review. It does not complete Business pulse or certify a release.

## Findings and changes

The previous query classified an item as low stock whenever on-hand quantity was at most ten. It ignored location reorder points and reservations. The read now compares Decimal available quantity against each active owned location's reorder point. A distinct item is counted once across locations; zero available stock is included. Missing inventory levels are not treated as zero stock. Item and location organization ownership are both checked. The query remains inside the existing repeatable-read snapshot. No inventory write, posting or reservation policy changes.

The stock links previously targeted the nonexistent `/dashboard/inventory/stock` route. They now open `/en/dashboard/inventory/items` or `/fr/dashboard/inventory/items`. Their label explicitly says the catalogue covers all locations: its aggregate filters are not a reproduction of the pulse's location-level calculation.

Sales links previously reopened Business pulse. They now open the financial summary report with the same location, period and language. The report still owns source validation and authorization.

The authenticated route now passes server-derived permissions to a service-owned link resolver. It uses the existing RBAC permission expansion, including recognized legacy aliases. Reports require `reports.read`; item records require `inventory.items.read`; POS requires `OPERATE_POS`; location settings require `locations.read`. Dashboard access by itself does not enable those actions. Missing permission context fails closed for links. Destination routes continue to enforce tenant, module and operation controls. This is not entitlement activation.

Disabled primary actions now display a visible explanation rather than disappearing. New destination labels, stock explanations and permission explanations have EN/FR versions. Other historical BI strings remain partly English on the French route and need further work.

## Use and inputs

Open `/<locale>/dashboard/analytics`. Review the selected site and period before following a report link. Sales reports preserve both; the item catalogue intentionally covers all sites. To investigate a stock warning, review available stock and the reorder point on the affected location's stock record. Do not compare the warning with the catalogue's aggregate low-stock filter as though the two had identical scope.

The inputs come from existing records: organization membership and roles from access administration; location activity from location settings; quantities, reservations and reorder points from inventory records. An authorized inventory operator supplies or corrects the stock policy. An organization administrator grants appropriate roles when needed. Do not enter signatures, approval IDs or commercial entitlements into this report. Reading or following its links does not clear X1.

## Verification and recovery

See `evidence/pulse-actions-v145.json` for final source binding, commands, passed checks and retained failed attempts. Local fixtures use the owned PostgreSQL database and localhost port 3110. They do not send messages, invoke payment providers or activate customers. Checks cover stock thresholds, fractional precision, duplicate sites, foreign/inactive location exclusion, permission behavior and actual EN/FR navigation.

No schema or migration changes. Rollout uses the normal application release process after remaining release requirements are satisfied. Recovery means reverting this batch's five production-file changes as a reviewed patch while preserving unrelated working-tree edits. Do not reset the branch. The prior stock heuristic and bad links are known defects, so monitor any rollback explicitly. No database rollback is needed.

## Review and remaining work

- Architecture/backend/data/security: scoped snapshot and read-only link resolution reviewed; destination authorization remains authoritative. Broad RBAC policies are reused, not redefined.
- Product/UX/frontend/accessibility/localization: useful destinations, explicit scope and visible denied-state explanation; full screen-reader, zoom, language and recovery coverage remain incomplete.
- Finance/reconciliation: report selection retains site/period. No financial calculations or financial transitions changed in this batch.
- Inventory/audit: location reorder policy and reservations determine the count; evidence records do not imply a stock movement or approval.
- QA/SRE/rollout/support: focused regression and isolated browser evidence; local timings are observations, not production performance budgets. Large-volume stock reads still require measurement and possible query-side aggregation.
- Statutory/country-pack, HR/payroll, purchasing/AP, providers, offline replay, AI/agents and commercial packaging: not applicable to these read-only changes; no domain rules or contracts modified.

Open engineering work includes precise affected-item drill-through, catalogue filter alignment, missing/inactive-site semantics, module-aware action availability, source completeness, risk-score and zero-activity conclusions, full French content, failed-load recovery, expanded accessibility and volume performance. A role-allowed link can still meet a module/setup denial at its destination; no operational readiness is asserted by the link. The broader workflow inventory remains unfinished.
