# AqStoqFlow Close Invalidation Mesh Continuation Run Report

Date: 2026-06-24

## Scope

Continued the certified-close invalidation mesh beyond the prior statement import and reconciliation sign/export hooks.

New invalidation sources added:

- `PAYMENT_PROVIDER_EVENT_CAPTURED` for verified provider event capture.
- `PAYMENT_SUSPENSE_POSTING` for approved suspense posting.
- `LEDGER_JOURNAL_POSTED` for manual journal posting.
- `LEDGER_JOURNAL_REVERSED` for manual journal reversal against the original close period.
- `INVENTORY_VALUATION_WRITE` for posted inventory valuation-affecting movements.

## Implementation Notes

- Reused `recordCloseCertificationInvalidationsForSourceInTx` so stale metadata, `close.certification.invalidated` business events, report-export outbox messages, ledger audit events, and certified run/export stale metadata stay consistent.
- Kept invalidations period-scoped through period id or source occurrence date.
- Added `services/inventory/inventory-close-invalidation.service.ts` so stock adjustment, stock transfer, and generic inventory stock-event writes share one inventory valuation invalidation path.
- Excluded stock reservations from generic inventory valuation invalidation because reservations do not change valuation.

## Focused Tests Added

- Provider event capture invalidates an overlapping certified close run.
- Suspense posting approval invalidates an overlapping certified close run.
- Manual journal post invalidates certified close evidence.
- Manual journal reversal invalidates the certified close evidence for the original journal period.
- Stock adjustment posting invalidates inventory valuation close evidence.

## Verification

Passed:

- `npm test -- services/payments/__tests__/provider-event.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/accounting/__tests__/posting.service.test.ts services/inventory/__tests__/inventory-adjustment.service.test.ts services/inventory/__tests__/inventory-transfer.service.test.ts services/inventory/__tests__/inventory-stock-event.service.test.ts services/inventory/__tests__/inventory-count.service.test.ts`
- `npm run typecheck`
- `npm run prisma:validate`

Note: local sandbox helper failed before starting several commands, so the same local verification commands were rerun with escalation.

## Compliance Status

Partial for the full universal mesh; stronger for this slice. The newly covered sources now preserve system-certified close-pack stale semantics, but payroll, compliance/fiscal submissions, country-pack changes, and permission/module entitlement changes remain future invalidation sources.

## Next Hardening

- Add invalidation hooks for payroll run/payment posting.
- Add invalidation hooks for fiscal/compliance submissions and country-pack changes.
- Add permission/module entitlement change invalidation for certified close evidence access semantics.
- Add a compact close dashboard stale-source drawer grouped by invalidation source code.