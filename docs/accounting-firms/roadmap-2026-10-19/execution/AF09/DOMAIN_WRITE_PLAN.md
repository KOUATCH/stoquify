# AF09: controlled domain write plan for AF10

**Inspected:** 20 October 2026, HEAD `6ee84a90c760d2864f6aef672d8b393ac2b65971` plus the current dirty workspace. **Decision:** all financial apply remains blocked. This document proves current source ownership and identifies missing adapters; it does not claim that AF10 posting paths have been implemented or runtime-qualified.

## Current domain writers and gaps

| Domain | Current source evidence | AF10 disposition |
|---|---|---|
| Stock quantity and valuation | [postOpeningStock](../../../../../services/inventory/inventory-stock-event.service.ts:866) delegates to the existing stock-event writer; it uses three-place quantity, idempotency, `OPENING_BALANCE`, `INITIAL_STOCK`, an outbox event and `OPENING_STOCK_LEDGER_REVIEW` | Reuse this sanctioned opening writer. Prove cutover-scoped keys, unit/cost rounding, valuation ownership, crash recovery and the class-3 ledger blocker resolution. No stock adjustment or direct inventory-level substitute |
| Ledger, cash and equity | [createManualJournalEntry](../../../../../services/accounting/journals.service.ts:304) already checks accounts, open period and balanced two-place entries. An opening journal type exists, but this API creates `MANUAL` / `MANUAL_JOURNAL` source semantics | Reuse journal validation/posting machinery through a reviewed opening-specific adapter with immutable manifest linkage and durable idempotency. The existing manual API alone is not a cutover orchestrator |
| AR opening detail | [AR open-item projection](../../../../../services/accounting/ar-open-item.service.ts:176) reads receivable documents. [Receivable document creation](../../../../../services/accounting/customer-receivable-document.service.ts:385) binds documents to real sales orders and snapshots | `AR_OPENING_WRITER_UNSUPPORTED`. Add a domain-owned opening-document path integrated with aging, allocation, customer statements and corrections. Do not manufacture historical sales orders, invoices or direct customer balance changes |
| AP opening detail | [AP control service](../../../../../services/purchasing/ap-control.service.ts:1902) owns normal supplier invoice posting and its supplier ledger writes, with receipt/match/tax/approval controls | `AP_OPENING_WRITER_UNSUPPORTED`. Add an opening-item path integrated with due dates, allocations, supplier statements and payment controls. Do not substitute a fabricated supplier invoice or direct supplier balance update |
| Master identities | [Master import](../../../../../services/onboarding/master-data-import.service.ts) stages identities/catalogs and excludes financial balances | Read existing active identities only in AF09. Complete identity import separately before mapping. Never reinterpret master-import success as financial cutover |

The executable manifest always carries AR/AP writer blockers, `STOCK_OPENING_NO_DOUBLE_POSTING_UNPROVEN` and `CUTOVER_ORCHESTRATOR_AF10_REQUIRED`. The latter includes the missing opening-specific ledger adapter. Neither an independently reviewed preview nor a balanced trial balance clears these blockers.

## Single ownership of each accounting amount

AF09's `covers[]` establishes one proposed ledger control for every AR/AP/stock detail. It is a reconciliation relationship, not a posting command. For the balanced synthetic fixture, the proposed ledger is stock debit 25.00, AR debit 100.00, cash debit 25.00, AP credit 50.00 and equity credit 100.00 XAF.

The preferred AF10 ownership contract is one governed opening ledger for those controls, while opening subledger writers establish the corresponding detail without independently duplicating those GL entries. This is a proposed contract, not a claim that today's writers already support that mode. If a sanctioned writer owns its GL posting, the orchestrator must instead account for that journal exactly once and remove the same control from any residual journal. The final combined debit/credit equation and every detail/control relationship must still tie. No arbitrary suppress-posting flag or direct balance write is authorized to force the equation.

The stock writer explicitly leaves a ledger-review blocker today. AF10 must resolve that blocker through verified ledger ownership and retained evidence. An importer must not clear it merely because a file was uploaded or the preview matched.

## Required controlled operation order

1. Reauthorize the named accountant, managed engagement, assignment, client modules and independent financial approval; enforce fresh authentication at apply. Freeze the exact latest source/control/mapping/master digest. Reject stale or superseded reviews.
2. Preflight **every** required writer before any posting. Validate opening period, currency/precision, mapped accounts/units and current domain state. Refuse a second opening of the same client/cutover/domain. Missing AR/AP or ledger adapters block the whole applicable cutover, not only its final activation.
3. Retain an immutable apply manifest with per-domain operation IDs, expected effects and posting ownership. Derive deterministic idempotency keys from client, cutover and manifest revision; explicitly handle any existing stock-opening key semantics.
4. Under an AF10-defined transaction/recovery boundary, invoke sanctioned AR/AP/stock domain writers, then the governed opening ledger path in its proven ownership order. Use domain events/outbox only through those writers. Do not implement this sequence as ad hoc independent writes with optimistic success messages.
5. Re-read persisted domain balances and ledger movements. Compare each detail, currency, quantity, value, AR/AP outstanding, and combined ledger totals to the independently approved controls. Reject partial/unknown states. Activation requires a complete retained tie-out and the required independent decision.
6. Publish completion only after durable receipts and final reauthorization. Failures keep the client cutover unactivated with a resumable, auditable manifest.

## Recovery evidence required before apply

AF10 must prove replay after interruption at each domain boundary; concurrent apply attempts; stale source/mapping/master rejection; revoked/suspended access; duplicate opening prevention; audit/outbox failure; precision and unit mismatches; mixed currency refusal; and exact no-double-posting reconciliation. Provider delivery is not part of this local preview.

Any compensation must use the owning domain's supported reversal/correction and retain original evidence. Automatic deletion of financial rows or assignment of replacement balances is prohibited. If no safe reversal exists, keep a reconciliation blocker and require the documented recovery decision.

## Release and expert gates

The user explicitly requested AF09 before AF16, changing the default sequence for this bounded implementation. AF16 core qualification remains unrun, and the expansion is not in an approved production release scope. A real client's opening date, evidence quality, supported currencies, chart mappings, retention policy, accounting treatment and final writer plan require explicit pilot selection and qualified accounting review.

AF10 is the smallest next implementation phase if financial migration is still required. It must begin with the missing writer contracts above, and must not infer apply authority from AF09's `REVIEWED` state. Existing-client pilots can continue to omit migration entirely.
