# Evidence Map

## Core Evidence

- `services/accounting/posting.service.ts`
- `services/accounting/postings/`
- `services/accounting/source-link*`
- `services/accounting/close*`
- `services/events/business-event.service.ts`
- `services/reconciliation/payment-suspense-workflow.service.ts`
- `prisma/schema.prisma`

## Economic Workflows

- Journal posting and reversal
- POS sales and payments
- Inventory adjustments and goods receipt
- Purchase orders, supplier invoices, AP
- Payment reconciliation and suspense
- Expenses and cash movements
- Payroll accounting and declarations

## Evidence Questions

- What is the source document?
- What is the idempotency key?
- Which period is affected?
- What source link is created?
- What invalidates a close pack?
- What audit event proves the decision?
