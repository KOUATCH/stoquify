# Phase 5 Post-Slice 437 Next-Slice Audit Report

Date: 2026-08-08
Operating mode: `/caveman full` with `/stoquify-referral-war-room`
Phase: 5 - Statement Hub And External Proof Network
Status: audit complete; Slice 438 selected

## Objective Lock

Continue the roadmap with a fresh source-truth audit after Slice 437 certification.

The next scope must remain source-only: no API, route, UI, delivery, or external token surfaces should be introduced until the immutable receivable document foundation is in place.

## Evidence Inspected

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_5_POST_SLICE_437_AUDIT_REPORT_2026-08-08.md`
- `what-next/referrals/CUSTOMER_SETTLEMENT_REVERSAL_PROTECTED_ACTION_SLICE_437_REPORT_2026-08-08.md`
- `what-next/referrals/STATEMENT_PROOF_NETWORK_REPORT_2026-08-08.md`
- `prisma/schema.prisma`
- `services/accounting/customer-settlement.service.ts`
- `services/accounting/customer-settlement-reversal.service.ts`
- `services/accounting/ar-open-item.service.ts`

## Findings

1. `prisma/schema.prisma` still has `SalesOrder` as the sales reference and does not define a
   `SalesInvoice` or immutable posted receivable document model.
2. `services/accounting/customer-settlement.service.ts` still resolves settlement allocations
   through `SalesOrder` IDs and computes open-item conservation from `CustomerLedgerEntry` rows
   keyed by `referenceType: "SALES_ORDER"`.
3. `services/accounting/ar-open-item.service.ts` builds open-item projection, aging, and due-date
   fields from live `SalesOrder` records; it labels the result as `evidenceGrade: "operational"`,
   not a posted immutable source.
4. No customer/supplier statement generation read model, statement token model, or statement route
   service is implemented yet.
5. The existing controlled environment confirms the boundary now needs an invoice-grade,
   immutable receivable source before any statement generation, signed access, or recipient workflow.

## Decision

Select **Phase 5 / Slice 438: Immutable Posted Customer Receivable Document Foundation** as the
next implementation slice.

This slice is the narrow dependency required to decompose mutable operational state from
statement-ready evidentiary state.

## Candidate Control Requirements for Slice 438

- Define a tenant-scoped immutable posted receivable document aggregate (customer receivable ledger
  source truth) decoupled from mutable `SalesOrder` runtime fields.
- Capture issuance fields (`issuedAt`, `invoiceDate`, `dueDate`), `currency`, payment terms,
  customer snapshot, `totalAmount`, tax/sub-total metadata, and cancellation/correction lineage.
- Ensure each receivable document is backed by settlement/allocation/ledger provenance and can be
  replayed from durable source links.
- Add posted-document open-balance and period movement logic in a service-owned read model with
  customer-grouped identity and deterministic ordering.
- Persist migration/backfill evidence for existing sales and payment rows into immutable posted documents
  without overwriting operational sources.
- Keep existing `SalesOrder` and settlement services untouched; do not expose statement APIs/routes
  until this slice is certified.

## Next Skill

Next: `stoquify-referral-war-room-orchestrator` through `/stoquify-referral-war-room`, under
`/caveman full`, for Slice 438 implementation coordination.

Execution handoff target: `stoquify-statement-proof-network`.
