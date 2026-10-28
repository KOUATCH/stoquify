# Evidence Map

## Core Evidence

- `services/purchase-order/purchase-order.service.ts`
- `services/purchasing/`
- `actions/purchasing/`
- `services/inventory/`
- `services/accounting/`
- `scripts/hard-delete-gate.js`
- `prisma/schema.prisma`

## Lifecycle Areas

- Draft purchase order
- Submitted purchase order
- Approval and rejection
- Goods receipt
- Supplier invoice matching
- AP posting
- Supplier payment readiness
- Archive, cancellation, reversal

## Evidence Questions

- Which state transition is allowed?
- What source document proves it?
- Is inventory affected?
- Is AP or ledger affected?
- Is maker-checker required?
- Is deletion allowed or must evidence be preserved?
