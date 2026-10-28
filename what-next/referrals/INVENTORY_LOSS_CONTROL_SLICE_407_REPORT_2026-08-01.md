# Inventory Loss Control Slice 407 Report

Date: 2026-08-01
Phase: 3
Slice: 407
Status: Certified
Name: Inventory Loss Analytics Read Model

## Outcome

Stoquify now has a service-owned inventory loss summary derived from completed stock-adjustment evidence. The read model converts posted negative adjustment lines into bounded, serialization-safe loss records and summaries for a requested tenant and half-open period.

The model closes the roadmap gap left after Slice 406: cycle counts and write-off approvals were operational, but loss evidence was not analyzable by product, location, approving actor, category, and period.

## Source Truth

The service reads `StockAdjustmentLine` records only when their parent adjustment is:

- owned by the requested organization;
- non-deleted;
- `COMPLETED`;
- dated inside the requested half-open period;
- classified as cycle count, physical count, damage, expiry, recorded theft, or write-off.

Only negative quantity lines contribute to loss. Positive count corrections are excluded. Generic correction, found-stock, other, and unrelated adjustment categories are excluded from loss claims.

## Analytics Contract

The result includes:

- total loss value in the organization's currency;
- loss-line and distinct-adjustment counts;
- top product groups with unit-safe lost quantities;
- value groups by location and approving actor;
- complete category and organization-local monthly groups;
- optional detail records with evidence hashes and source count links;
- evidence, valuation, and approval-attribution coverage;
- source limit, truncation, generation time, and completeness state.

The source query is bounded to 5,000 lines by default and 20,000 at the internal maximum. When the limit is reached, totals and completeness are explicitly partial.

## Trust Semantics

`RECORDED_THEFT` means the approved source adjustment was recorded with the `THEFT` category. It is not an inferred accusation.

Actor grouping is explicitly `APPROVER` attribution. It identifies who approved the adjustment and does not claim that the actor caused the loss, committed fraud, or bears causal fault. Missing approvers appear as unattributed approval evidence.

Missing valuation produces `0.00` with partial valuation coverage rather than an invented amount. Missing evidence hashes or actor attribution also reduce completeness.

## Implementation Anchors

- Filter and period contract: `services/inventory/inventory-loss-read.service.ts:35`
- Tenant-bound input contract: `services/inventory/inventory-loss-read.service.ts:72`
- Read-model entry point: `services/inventory/inventory-loss-read.service.ts:370`
- Tenant/lifecycle/date filter: `services/inventory/inventory-loss-read.service.ts:401`
- Negative-line and source-limit query: `services/inventory/inventory-loss-read.service.ts:419`
- Non-causal actor meaning: `services/inventory/inventory-loss-read.service.ts:682`
- Focused tests begin at `services/inventory/__tests__/inventory-loss-read.service.test.ts:94`.

## Verification

| Gate | Result |
| --- | --- |
| Focused inventory-loss read-model Jest | Passed: 1 suite, 9 tests |
| Count, adjustment, reconciliation, and stock-event Jest | Passed: 4 suites, 19 tests |
| `npm run typecheck` | Passed |
| Scoped ESLint | Passed |
| Database write-method scan | Passed: no write methods |
| Tenant/lifecycle/negative-line/source-bound scan | Passed |
| Whitespace and narrow diff hygiene | Passed |

Full Jest, Prisma validation/migration status, application build, browser smoke, and accessibility smoke were not selected because Slice 407 adds no schema, route, action, or UI.

## Residual Risk

- The read model has no protected query action or product surface yet.
- Tests use an injected Prisma client and do not constitute a seeded-database integration test.
- Approver attribution cannot answer who physically caused a stock loss.
- Totals become partial when the source-line cap is reached.
- No alert, leakage exception, daily-truth feed, or external share consumes the summary yet.

## Next Decision

No Slice 408 is selected by this report. Return to `stoquify-referral-war-room-orchestrator` to decide whether the next dependency-aware slice should be a protected inventory-loss query action, a daily-truth/leakage feed, or another roadmap pillar.
