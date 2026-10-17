# Payables dashboard contract

Decision date: 2026-10-12. Applies to `/[locale]/dashboard/finance/payables`.
Follow [MASTER](../MASTER.md), [AP payment controls](ap-payment.md) and the [phase 0–1 data/evidence contract](../../../docs/finance/receivables-payables-dashboard-phases-0-1.md).

## Purpose and source

Answer what remains owed to suppliers and when invoices fall due. Reuse AP History financial resolution: posted supplier invoice evidence, verified payment allocations and supplier credits. Explicitly label results as operational AP evidence, not a reconciled or certified general-ledger balance. An approved payment is not proof of execution or reconciliation.

## Phase 1 page connection

Use the shared invoice dashboard structure: current position, organization/timezone/freshness, location, source/coverage, separate currency cards, aging and paginated invoices. Link to AP History and the existing AP workbench. Those destinations enforce their permissions independently and open a broader organization scope.

Location follows the invoice's source purchase order. Invoices without a purchase order belong only to All locations. Show the organization-wide count of unassigned posted/payment-pending/disputed documents, explicitly as a document count, not an additional payable amount.

The user approved this small UI extension to phases 0–1. Approval, blocked-invoice, payment execution, recovery and reconciliation queues remain later-phase UI work and reuse existing workflows.

## Evidence and access

- A recognized invoice lacking verifiable balance evidence remains visible as unverified. All totals for its affected currency are unavailable; never publish a known subset as a complete balance.
- Preserve recognized soft-deleted obligations until financial reversal evidence resolves them. Deletion alone does not clear debt.
- Current snapshots only; no historical as-of certification. Unknown due dates get a separate aging bucket.
- Enforce existing finance/AP permission alternatives and purchasing module access on the server. Actor/workspace and authorization are checked again before response.
- EN/FR, keyboard table scrolling, responsive cards, loading/error/empty states and cache invalidation follow the receivables contract.

No changes to invoice approval, maker/checker separation, payment execution, recovery, reconciliation, or financial records are authorized by this page contract.

## Phases 2–3 addition (2026-10-12)

The invoice explorer now includes search/currency/aging filters, overdue/due-soon/unknown/unverified queues, counterparty rankings for complete currency groups, and read-only invoice details. The workflow panel is explicitly organization-wide and independent of the invoice filters. It reuses workbench counts for matching, bank changes, posting and reconciliation, and adds draft invoice/request and approved-payment counts.

Draft is a review candidate, not verified approval readiness. Approved is not executed; released is not reconciled. Workflow signals require the existing AP workbench permission; payment-approval and payment-release counts additionally require their respective permissions. Restricted counts are null, never zero. Existing approval, execution, invoice recovery, payment recovery and reconciliation routes remain the only action destinations. See [phase 2–3 evidence](../../../docs/finance/receivables-payables-dashboard-phases-2-3.md).

## Phases 4–5 addition (2026-10-12)

Exact invoice history links carry supplier/invoice scope through full summaries and controlled exports, plus safe dashboard return navigation. Workflow links follow the destination permission combinations; broader workflow scope is disclosed and existing server/module/maker-checker controls remain independent. Current exposure shares and due-through-30-day amounts are currency/location scoped. Separate period payment activity reuses AP History's recorded released-payment evidence, follows organization/payment-date scope, and does not imply reconciled cash outflow or available funds. Funding coverage, early-payment opportunities and historical trends remain deferred pending authoritative evidence. See [phase 4–5 evidence](../../../docs/finance/receivables-payables-dashboard-phases-4-5.md).
