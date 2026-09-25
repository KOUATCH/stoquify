# Receipt quantities and supplier invoice retries — 2026-09-08

This is a bounded correction to PA-016, not completion of Purchasing/AP or the platform review. The full workflow register remains open.

## Reproduced findings and correction

1. **Repeated receipt lines bypassed available-quantity checks.** A received quantity of 10 accepted two invoice lines of 6 because each line independently compared itself with 10. Preparation now accumulates quantities per receipt using Decimal arithmetic and rejects the invoice before creating records when the combined quantity exceeds the available balance. Legitimate split lines remain supported: 0.1 + 0.2 consumes exactly 0.3.
2. **Concurrent exact retries could fail as duplicate invoices.** Both transactions read the absence of an invoice before one committed. Preparation now locks the same-tenant supplier row before reading idempotency or quantity state. A waiting request observes committed reservations and exact retries return the existing invoice. This also serializes different invoices for the same supplier when the optional purchase-order ID is omitted. Different suppliers use different rows.

The tradeoff is serialization of invoice preparation for one supplier. No production throughput budget is asserted. Lock timeouts still need the complete action/UI recovery work. Other supplier-balance writers have not been certified by this correction.

## Evidence

- Before: `../environment/ap-receipt-quantity-141a2d78-73f.json` reproduced excess split acceptance and a concurrent exact retry unique-constraint failure. The different-invoice concurrency case happened to pass in that run; it is not evidence that the previous implementation was race-free.
- After: `../environment/ap-receipt-quantity-3a32154a-d92.json`: all four database groups passed using fresh owned fixtures and real receiving/AP services. No existing payments, journals or unrelated roles changed.
- Regression: `../../evidence/ap-receipt-quantity-after-20260908.json`: 57 tests across AP service, AP actions and receiving service passed.
- The first sandboxed database and Jest runs could not write their JSON reports (EPERM). Their output is retained in the task. The before Jest regression reached invoice creation rather than the expected quantity rejection. Reviewed reruns were authorized; no automatic approval-review rejection was overridden.

Source hashes and command outcomes are bound by the v56 receipt. This is backend verification; no new browser, EN/FR or accessibility pass is claimed.

## What an operator supplies

| Input | Owner and source | Meaning |
| --- | --- | --- |
| Supplier and invoice number | AP maker; original supplier invoice and supplier master | Identifies the liability document. Do not invent a new number to retry the same invoice. |
| Receipt-line reference | Receiving record for that supplier in the same organization | Only accepted received goods can support preparation. Held inspection is not received evidence. |
| Quantity, cost, tax and description | Original invoice, compared with approved PO and accepted receipt | Multiple lines may refer to one receipt, but their combined quantity must fit the uninvoiced balance. Tax setup still requires its existing country controls. |
| Stable request key | Application-generated command identifier | Reuse for an exact retry. A changed command requires review and its own intent; do not automatically generate another key after an uncertain response. |
| Maker identity and organization | Authenticated server context | Never supplied as authority by an employee's browser. |

The current AP workbench is reachable at `/en/dashboard/purchases/payables` and `/fr/dashboard/purchases/payables`. The interactive invoice preparation form is still missing; this patch does not make it available. The action/service exists, and the next implementation must provide scoped receipt selection, document capture, preview, recovery and current authority checks.

## Accounting and recovery

Preparation produces MATCHED or DISPUTED invoice evidence, not a journal or a payment. Accepted stock receipts still carry the explicit GOODS_RECEIPT_LEDGER_REVIEW blocker where accounting is unfinished. Do not mark these batches posted or remove their blockers to make preparation appear complete.

No migration or production deployment was performed. Rollback is a source rollback of only this checkpoint's additions; preserve the earlier cancelled-order obligation correction. Existing over-reserved invoices discovered by an audit require an authorized document review/correction, not silent deletion. The synthetic before-test invoice is isolated evidence and is retained.

## Review accountability and remaining work

- Architecture/backend/database: existing AP owner reused; same-tenant supplier lock precedes replay and quantity reads; cumulative Decimal reservation verified.
- Security/IAM/privacy: scoped SQL and existing server-derived action identity retained; full service authority/fresh-auth review remains open.
- Finance, audit and retention: no posting evidence fabricated; no destructive cleanup; invoice, match and audit transaction retained.
- Quality/SRE: real PostgreSQL concurrency and focused regressions; lock contention/timeout UX and production performance remain unverified.
- Product/frontend/accessibility/localization: missing interactive AP preparation explicitly recorded. No visual changes or new browser claims.
- Statutory/country: rules unchanged; expert setup/approval still required where existing controls demand it.
- API/events: same service used by existing prepare action; no new transport or event contract.
- Packaging: not applicable; no entitlement or commercial changes. POS/offline, HRIS/payroll, AI/agents and external provider integrations: not applicable to this reservation correction; their workflow reviews remain in the overall register.

Next: finish service authority and document/preview contracts, integrate the preparation interface and recoverable submission, then verify independent matching approval and the actual goods-receipt/AP/accounting handoff. Remaining engineering work is not an external approval requirement.
