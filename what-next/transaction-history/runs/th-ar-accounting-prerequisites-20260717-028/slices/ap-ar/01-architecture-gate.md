# Stage 01 Architecture Gate - Customer/AR Prerequisites

Status: PASS

Run: `th-ar-accounting-prerequisites-20260717-028`  
Slice: `ap-ar`  
Active lane: `ar`  
Mode: audit

## Architecture Map

Customer/AR has enough visible and service-level surface area to be mapped, but not enough accounting proof to proceed to implementation.

## Mapped Surfaces

- Receivables overview route: `app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx`.
- Customer dashboard routes: `app/[locale]/(dashboard)/dashboard/customers/page.tsx` and `app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx`.
- Customer analytics/read source: `services/customer/customer.service.ts`.
- POS source owner for on-account customer sales and void credits: `services/pos/pos.service.ts`.
- Customer ledger append helper: `services/accounting/customer-ledger.service.ts`.
- Accounting posting services: `services/accounting/postings/post-sale.ts`, `services/accounting/postings/post-payment.ts`, and `services/accounting/postings/post-refund.ts`.
- Persistence: `Customer`, `SalesOrder`, `Payment`, `PaymentRefund`, and `CustomerLedgerEntry` in `prisma/schema.prisma`.
- Permissions: `finance.receivables.read` in `config/permissions.ts` and `lib/security/rbac-permissions.ts`.

## Important Boundary

The current AR/customer surfaces are overview and capped-analytics surfaces. They are not a canonical customer/AR transaction-history implementation. Stage 01 maps the current domain ownership only; Stage 03 decides whether the accounting prerequisites pass.

## Handoff

Stage 02 may record the required security contract for a future AR history surface. Stage 03 must apply the automatic AR prerequisite gate before any Stage 04 read-model implementation.
