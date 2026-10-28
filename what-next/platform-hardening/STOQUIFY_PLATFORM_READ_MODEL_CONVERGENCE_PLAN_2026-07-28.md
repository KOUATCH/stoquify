# Stoquify Read-Model Convergence Plan — 2026-07-28

## Confirmed problem

Dashboard, tenant snapshot and finance read models use different payment-status rules for cash and receivables. DailySalesReport and live aggregation coexist, while legacy route/action facades increase policy drift.

## Canonical semantic catalog

For every metric define: owner; source records; included/excluded states; amount field; refund treatment; currency; tenant/location scope; time field/time zone; as-of time; freshness SLA; reconciliation state; source hash; semantic version; blockers; redaction.

Priority definitions: cash collected, receivables, partial payments, refunds, provider settlement, store credit, supplier release versus settlement, tax and close period.

## Delivery

1. Approve the semantic catalog with payment/reconciliation/accounting owners.
2. Build golden fixtures covering pending, partial, paid, refunded, cancelled, provisional and corrected records.
3. Implement one server-owned adapter/read model.
4. Run old/new projections in shadow and publish variance reports.
5. Move dashboard, snapshot, finance, daily report and analytics consumers incrementally.
6. Add evidence/freshness/redaction envelopes and role-specific next actions.
7. Retire duplicate facades through tested re-exports/redirects and deprecation telemetry.
8. Perform keyboard, screen-reader, focus, responsive, locale and degraded-state verification.

## Acceptance

Identical fixtures yield identical totals and trust badges; provisional is never settled; stale/blocked/partial states remain visible; no UI calculates private financial truth; route aliases converge on the same service contract; browser and accessibility evidence covers representative roles.

## Entry gate

Implementation remains blocked until Phase 2 financial state semantics are approved. Premature dashboard changes would encode unstable truth.
