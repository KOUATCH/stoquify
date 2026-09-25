# Business pulse: stock evidence coverage

## Finding and correction

Before this batch, Business pulse skipped absent inventory levels but still displayed a ready stock-warning count of zero. It also counted inventory records for items whose `trackInventory` flag was false. An explicitly selected inactive location could produce operating data even though the default selector required an active site.

The snapshot now counts active, undeleted inventory-tracked items and distinct items with inventory records in the selected active-location scope. It returns `activeItems`, `itemsWithRecords` and `itemsWithoutRecords` in the same repeatable-read transaction as the other pulse figures. Both item and location ownership remain constrained. Non-stock items are excluded from the denominator and warning query.

Coverage is descriptive, not a requirement to stock every item at every location. An item without a record in the selected scope may not be stocked there. It is not assigned a zero quantity. For all-location scope, one record at any active owned location covers the item for this count; this does not establish complete coverage of every item/location pair.

The UI shows a visible EN/FR coverage panel. When some tracked items lack records, the pulse and stock card are partial. When no tracked items have records, the stock-card value is Unavailable / Indisponible. When no active items track inventory, it says so explicitly and the card is empty. Known warning counts from covered items remain available alongside the coverage limit.

An explicitly selected inactive/deleted site now returns a blocked operating pulse without reading sales or stock rows. The default selector already required an active site. This change is scoped to Business pulse and its legacy dashboard-summary reader. Dated historical sales reports retain their existing ownership checks and can still include an inactive location's completed sales. No historical records are removed.

## How to use it

Open `/en/dashboard/analytics` or `/fr/dashboard/analytics`. Read the coverage ratio before relying on the stock-warning count. For example, `1 / 2` means one of two active inventory-tracked items has at least one record in this scope. It does not mean the other item is out of stock.

Inputs already exist in Stoquify:

- Item activity and `trackInventory`: the authorized item administrator configures these in the item record according to the actual business item.
- Inventory level and reorder point: the authorized inventory operator maintains these through inventory setup and stock workflows, supported by real opening balances or movements.
- Site activity: the organization/location administrator controls whether a site is active.

Determine with the inventory operator whether an uncovered item is intentionally absent from that site or needs legitimate setup. Do not create artificial quantities just to make the ratio look complete. Use historical reports for inactive-site sales; reactivate a site only through the authorized location process when business operations really resume. Refresh Business pulse after the source setup changes.

No new approval reference, signature, subscription or X1 evidence is supplied by this panel.

## Evidence and review

See `evidence/pulse-coverage-v147.json` for exact commands, receipts and final source hashes. Unit checks cover inactive selection, unavailable coverage queries, missing records versus non-stock items, tracked-item predicates and existing stock policy/access regressions. Runtime evidence uses the owned local PostgreSQL database and the actual application at localhost:3110, with real POS sale creation and controlled fixture item/site changes. No provider, external message or live-customer operation occurs. Read snapshots cover selected fixture financial/stock tables, not every database table.

Architecture/backend/data/security: coverage is server-owned, transactionally consistent and tenant constrained; financial source logic and permission policy remain unchanged. Product/inventory/UX/localization: unknown, known-zero and not-applicable are distinct and explained in EN/FR. Finance/audit/retention: historical sales remain readable; no quantities, postings or retained records are changed by reads. QA/SRE/support: focused tests and isolated browser evidence, with development timings only. Full screen-reader, zoom and production load assurance remain open. Statutory/country-pack, HR/payroll, AP, providers, offline replay, AI execution and packaging: not applicable to these read-only changes; no domain transitions changed.

Historical graph node `analytics_get_sales_analytics_ts` locates the legacy analytics family. Current source confirms the affected dashboard-summary reader shares `business-pulse-snapshot.ts`; dated report scope is a separate retained path.

## Rollout and recovery

There is no schema or migration change. Release the five production-file changes through the existing application release process after remaining requirements are met. A rollback must be a reviewed patch limited to those files, preserving unrelated working-tree edits; no database rollback or branch reset is needed. A rollback would restore the known misleading zero-warning behavior and must be recorded.

Open work: exact affected-item/coverage drill-through, per-item/location applicability, source synchronization/freshness, full localization, failure recovery, pointer stability, accessibility, volume performance, and the remaining platform workflow register. This batch does not complete Business pulse or the whole-platform assignment.
