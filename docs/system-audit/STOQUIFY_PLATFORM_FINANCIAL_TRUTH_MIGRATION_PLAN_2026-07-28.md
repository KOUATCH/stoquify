# Stoquify Financial Truth Migration Plan — 2026-07-28

## Objective

Converge store credit, payments, refunds, customer balances, cash drawers, inventory, AP, reconciliation and ledger outcomes without rewriting finalized facts.

## Target truth chains

- Store credit: immutable instrument ledger → reserve → consume → expire/reverse → reconciliation.
- Electronic tender: provisional → authorized → captured → provider accepted → settled, with failed/reversed branches.
- Refund: requested → provider accepted → settled/failed; cash can follow a reviewed local path.
- Payment: provider event/statement → PaymentTransaction → match/suspense → AccountingSourceLink → close evidence.
- Customer/drawer balances: immutable entries plus versioned projections, never unguarded read-set truth.
- Inventory: business event → version-guarded level → movement/cost evidence → ledger/source link → close invalidation.
- AP: approved invoice/bank destination/maker-checker release → dispatch → provider acceptance → statement settlement.

## Migration waves

1. Contain unauthoritative store credit and settlement labels.
2. Define schemas, state machines, idempotency keys, hashes and accounting maps.
3. Introduce new records in shadow/dual-read mode; do not dual-write finalized truth without reconciliation.
4. Backfill links with source hashes and exception reports; never invent missing provider evidence.
5. Reconcile legacy Payment and new PaymentTransaction by deterministic policy.
6. Switch reads behind a feature flag after golden-fixture and tenant reconciliation pass.
7. Retire legacy mutation paths; retain adapters and correction history through the stabilization window.

## Acceptance

Concurrent credit/drawer operations preserve totals; store credit cannot overspend/replay; provider duplicates have one effect; refunds remain pending until evidence; AP exceptions are unique; inventory blocked replay adds no duplicate evidence; ledger/statement/reconciliation totals tie; rollback leaves append-only records intact.

## Blockers

Provider contracts, schema migration/rollback proof and clean database history are not available for full execution in this run. Those portions remain design-ready, not implemented.
