# Payment Truth Pilot Sprint 2 - Cash Truth Card Slice - 2026-07-05

## Decision

The next logical post-brief step is Sprint 2 / Phase 2: start the Payment Truth Pilot by making the Daily Business Confidence Brief's payment card show cash-truth evidence, not only generic payment issue counts.

## Pilot Scope

- Pilot name: Pilot 0 - Local Authenticated Tenant Confidence Brief.
- Environment: local development workspace for `E:\ohada saas\newStockFlow\aqstoqflow`.
- Tenant scope: authenticated organization returned by the dashboard and snapshot read models.
- Production/staging tenant: still not confirmed; do not claim certified reconciliation for a real tenant yet.

## What Changed

- Extended `PaymentTruthMetrics` with optional cash-truth fields:
  - `internalCollectedAmount`
  - `externalMatchedAmount`
  - `externalMatchedCount`
  - `cashVarianceAmount`
- Updated `getPaymentTruthSnapshot` to compute:
  - internal collected amount from paid/partial internal payment rows;
  - external matched amount/count from confirmed match records only;
  - variance between internal collected and external matched amounts;
  - match freshness as part of snapshot freshness.
- Updated the tenant operating command-card payment domain from generic `Payment reconciliation` to `Cash truth`.
- Kept the card service-owned and proof-routed to `/dashboard/finance/reconciliation`.

## Gates

- Tenant scope: PASS - all new queries include `organizationId`.
- RBAC surface: PASS - no new route or action was added; existing `payments.reconciliation.read` remains required by the command card.
- Evidence stance: PASS - matched amount uses `AUTO_MATCHED` and `APPROVED` match records only; candidates and rejected records are excluded.
- No certification overclaim: PASS - signed runs and evidence grades are unchanged; the card does not claim certified reconciliation.
- Dashboard bloat control: PASS - no new dashboard shell or extra first-viewport card was added.

## Verification

- `npm test -- --runTestsByPath services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts components/dashboard/__tests__/todays-operating-truth.test.ts services/dashboard/__tests__/dashboard-read-model.service.test.ts --runInBand`
- `npm run typecheck`

## Next Step

Implement or harden the first real provider/statement ingestion rail, then let the same `PaymentTruthMetrics` fields move from fixture/test truth into pilot tenant evidence. Do not add proof drawers or certification UX before provider evidence, statement lines, match records, suspense items, and signed reconciliation runs are present for the named pilot tenant.