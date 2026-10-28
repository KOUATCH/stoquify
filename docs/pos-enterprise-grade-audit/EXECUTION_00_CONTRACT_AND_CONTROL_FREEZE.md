# Stoquify POS and Sales-to-Cash Contract and Control Freeze

Status: **DRAFT — REQUIRES EXPERT REVIEW**  
Program: `STOQUIFY-POS-SALES-TO-CASH`  
Roadmap authority: `STOQUIFY_POS_AND_SALES_TO_CASH_MASTER_IMPLEMENTATION_ROADMAP_2026-08-17.md`  
Freeze version: `0.1.0`  
Date: 2026-08-17

This is the M0/M1 implementation contract. It authorizes design and read-only verification, not product mutation, provider activation, fiscal claims or production release. All statutory and accounting conclusions remain subject to dated qualified-human review.

## 1. Program boundary

### In scope

- Immediate POS checkout and delivery/on-account order-to-cash.
- One sale finalizer: `commitPOSSale`.
- Shared payment, receipt/fiscal-source, inventory/valuation, accounting and reconciliation kernels.
- Cashier sessions, drawers, governed business days, statements, reconciliation and close.
- Returns, refunds, credit notes, stock corrections and journal reversals as linked compensating facts.
- Tenant, organization, location, terminal and actor access boundaries.

### Out of scope until a later approved gate

- A second sale-finalization service.
- Loyalty, CRM campaigns, recommendation engines, generic analytics and broad UI redesign.
- Unproven multi-currency, inclusive tax, UOM, lot, serial, expiry, offline electronic capture or fiscal certification.
- National tax or receipt rules hardcoded into shared code.

## 2. Authoritative owners

| Fact or transition | Sole authoritative owner | Reused by |
| --- | --- | --- |
| Immediate POS financial completion | `commitPOSSale` transaction boundary | POS workstation and retry/result registry |
| Electronic provider truth | Named provider adapter plus provider-event ingestion | POS, AR collections and refunds |
| Payment settlement truth | Statement ingestion and reconciliation kernel | POS close, AR, treasury and accounting close |
| Receipt/fiscal source | Immutable receipt/fiscal-source materializer | POS and invoicing |
| Receipt delivery | Durable delivery worker | Print, email, messaging and public-token delivery |
| Physical stock consequence | Existing stock-event and valuation kernel | POS goods issue, fulfillment, returns and corrections |
| Journal posting | Existing ledger posting kernel | POS, invoices, settlements, fees and corrections |
| Reservation | Reservation aggregate | Sales order and fulfillment |
| Delivery/on-account orchestration | SalesOrder/Fulfillment/Invoice aggregates | O2C workbench |
| Business-day close evidence | Governed business-day and statement services | Retail operations, treasury and accounting close |

No adapter, route, worker or UI may own a second copy of these facts.

## 3. Universal command contract

Every material write command must carry or derive the following immutable context:

```text
commandId/clientCommitId
commandType + commandVersion
organizationId + locationId
terminalId/deviceId when applicable
actorId + authenticated session id
authorization snapshot: permission, module entitlement, assignment
fresh-auth evidence and approval id when policy requires them
expected aggregate version or explicit create-only precondition
canonical request payload hash
business date + UTC occurred-at/received-at timestamps
currency + exact monetary values
correlationId + causationId
country-pack/provider/policy versions when applicable
```

Rules:

1. The first accepted `(organizationId, commandType, commandId)` stores the canonical payload hash and immutable result envelope.
2. A retry with the same payload returns the original result without repeating stock, payment, receipt, fiscal or ledger consequences.
3. The same key with a different payload is rejected as a conflict and audited.
4. Scope, entitlement, permission, assignment, fresh authentication and approval are checked inside the authoritative command boundary, not only in the UI.
5. Timeouts and provider uncertainty remain pending/unknown; they are never translated into success.

## 4. State contracts

The names below are semantic contracts. Implementations may map existing enums, but may not collapse materially different states.

| Aggregate | Required minimum states | Forbidden shortcut |
| --- | --- | --- |
| POS cart | `OPEN`, `CHECKOUT_PENDING`, `COMPLETED`, `ABANDONED`, `CONFLICT` | Mutating a completed cart |
| POS sale | `COMMITTING`, `COMPLETED`, `CORRECTION_REQUIRED` | Deleting or rewriting a completed sale |
| Payment attempt | `CREATED`, `PENDING_PROVIDER`, `UNKNOWN`, `CAPTURED`, `FAILED`, `REVERSED`, `REFUNDED` | Treating timeout/unknown as captured |
| Settlement item | `UNMATCHED`, `MATCHED`, `SUSPENSE`, `RESOLVED` | Manufacturing a match without evidence |
| Receipt source | `MATERIALIZED`, `FISCAL_PENDING`, `FISCAL_ACCEPTED`, `FISCAL_REJECTED`, `CORRECTED` | Equating delivery with existence |
| Receipt delivery | `QUEUED`, `DELIVERED`, `RETRY_REQUIRED`, `DEAD_LETTER` | Rolling back a sale when delivery fails |
| Cashier session | `OPEN`, `DECLARATION_PENDING`, `DECLARED`, `REVIEWED`, `CLOSED` | Closing solely because a cashier logs out |
| Business day | `OPEN`, `CLOSE_PENDING`, `CLOSED`, `INVALIDATED`, `REOPEN_REQUIRES_APPROVAL` | Hiding late facts after close |
| Sales order | `DRAFT`, `CONFIRMED`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED` | Posting revenue/COGS on confirmation |
| Reservation | `ACTIVE`, `PARTIALLY_CONSUMED`, `CONSUMED`, `RELEASED`, `EXPIRED` | Reducing on-hand or posting COGS |
| Fulfillment | `RELEASED`, `PICKED`, `PACKED`, `ISSUED`, `DELIVERED`, `REVERSED` | Issuing stock twice |
| Invoice | `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CREDITED`, `VOIDED_BY_CORRECTION` | Billing ineligible quantity |
| Return | `REQUESTED`, `AUTHORIZED`, `RECEIVED`, `INSPECTED`, `DISPOSITIONED`, `COMPLETED` | Increasing sellable stock before disposition |

All transitions require explicit allowed-from states, version preconditions, owner, evidence, audit fields, failure semantics and compensating transition.

## 5. Money, quantity, tax and time

- The repository indicates Cameroon/XAF/EN-FR as a development candidate only. It is not a production or legal conclusion.
- Persist monetary values exactly; do not use binary floating point for financial calculations.
- A qualified country-pack reviewer must approve currency minor units, rounding order, tax inclusion/exclusion, tax point, receipt numbering, correction and retention rules.
- Persist quantity and valuation precision explicitly. Unsupported UOM, lot, serial, expiry, negative-stock or multi-location combinations fail closed.
- Store event time in UTC and preserve the source/provider time. Derive business date from the versioned organization/location timezone and business-day policy; never equate business date with server date.

## 6. Accounting and inventory event matrix

| Event | Quantity | Reserved | Journal consequence |
| --- | ---: | ---: | --- |
| POS sale completion and physical hand-over | decrease on-hand | none | Dr cash/provider clearing; Cr revenue/tax; Dr COGS; Cr inventory |
| Electronic authorization pending/unknown | none | none | no successful-payment posting |
| Provider capture confirmed | none | none | provider-clearing consequence exactly once under approved policy |
| Settlement statement match | none | none | Dr bank/fees; Cr provider clearing, with suspense for mismatch |
| Sales-order confirmation | none | none | none |
| Reservation create/release | none | increase/decrease | none |
| Physical goods issue | decrease on-hand | consume | Dr COGS; Cr inventory exactly once |
| Eligible invoice issue | none | none | Dr AR; Cr revenue/tax exactly once |
| Customer payment allocation | none | none | Dr cash/provider clearing; Cr AR |
| Return disposition to sellable | increase on-hand | none | linked COGS/inventory correction as approved |
| Damage/write-off | decrease or no sellable increase | none | linked approved inventory loss posting |

The exact accounts and tax/fiscal semantics are configuration/country-pack responsibilities and require controller review. Every posting line links the immutable operational source, command result and correction lineage.

## 7. Access and approval matrix

| Command class | Permission + entitlement | Assignment/scope | Fresh auth | Maker-checker |
| --- | --- | --- | --- | --- |
| Ordinary cash sale | required | organization, location, active terminal/session | policy-based | no unless threshold/risk rule |
| Electronic capture/refund | required | organization, location, provider account | required for refund/high risk | required above policy threshold |
| Void/return/credit note | required | source sale/order and allowed location | required | required when material; self-approval forbidden |
| Drawer declaration/business-day close | required | claimed terminal/location/business day | required | reviewer separate from declarer where required |
| Stock issue/reversal/write-off | required | inventory location | required for reversal/write-off | required above threshold |
| Country/provider/capability activation | administrative permission | organization/package/ring | required | two-person approval |

All denials are auditable and redacted. IDs supplied by clients are re-scoped server-side; a valid identifier from another tenant/location must not disclose existence.

## 8. Receipt, fiscal and delivery contract

1. Completion creates immutable receipt/fiscal-source evidence in the transaction or through a transactional outbox tied to it.
2. Receipt/fiscal numbering is owned by a versioned country pack or authority adapter. Offline replay cannot allocate final fiscal numbers unless that pack explicitly authorizes it.
3. Print/email/message delivery is an independent retriable concern. Delivery failure leaves the sale visible and complete with `RETRY_REQUIRED` evidence.
4. Correction creates linked corrective source evidence; it never mutates the original receipt, invoice or fiscal fact.
5. Public delivery tokens are scoped, expiring, revocable, non-enumerable and audited without exposing unnecessary PII.

## 9. Provider and reconciliation contract

- Provider requests use stable idempotency keys and persist a local attempt before external submission.
- Callbacks require signature verification, replay protection, provider account/currency/amount validation and tenant/location resolution from trusted configuration.
- Provider events are append-only. Out-of-order and duplicate events are retained and deterministically reduced.
- Captured, settled, fee, reversal, refund, dispute and chargeback are separate semantics.
- Bank/provider statement ingestion is source-hashed and replay-safe. Unmatched or contradictory evidence enters owned suspense; it never becomes an invented success.

## 10. Offline and device contract

- Offline events are device-signed, monotonically ordered, expiration-bounded and bound to organization, location, terminal, actor and policy version.
- The server verifies signature, revocation, sequence, payload hash, price/tax snapshot and capability eligibility before replay.
- Duplicate replay returns the original result; sequence gaps and payload conflicts become operator-resolvable cases.
- Cash-only offline is the recommended first scope. Electronic, final fiscal numbering and unbounded catalog/price operation remain disabled until separately certified.

## 11. Data change and migration policy

- Additive, deploy-safe migrations only; no reset, destructive repair or mutation/deletion of completed sales, payments, stock movements, receipts, fiscal documents, journals or audit records.
- Constraints become authoritative only after source profiling, deterministic backfill, quarantine of contradictions, tie-out and reconciliation evidence.
- Financial and stock corrections use source-linked compensating records.
- Every migration slice includes forward SQL, compatibility window, backfill, verification query, rollback/disable plan and real PostgreSQL evidence.

## 12. Evidence and privacy contract

Every gate artifact identifies candidate commit/tree, dirty-state hash, command, environment, configuration/country/provider versions, start/end time, exit code, result, source hashes, owner and limitations. Local mocks and unit tests are labeled local evidence; they are never presented as production proof.

Never store secrets, tokens, webhook signatures, PAN, CVV, PIN, raw payment credentials or unnecessary customer PII in logs, fixtures, screenshots or evidence. Use stable redacted references and aggregates.

## 13. Gate disposition

| Gate | Current disposition | What changes it |
| --- | --- | --- |
| G0 Verification Foundation | `BLOCKED` | Resolve the 13 exact-hash migration findings, then complete the baseline ladder, real PostgreSQL and authenticated EN/FR harness proof, plus named pilot matrix |
| G1 Contract and Control Freeze | `REQUIRES_EXPERT_REVIEW` | Accountable approval of D-01 through D-11 and this versioned contract |
| G2–G9 | `BLOCKED_DEPENDENCY` | Prior gates pass with immutable evidence |

The first authorized product slice after G0/G1 is M2 client-commit result replay with PostgreSQL concurrency evidence. Until then, work is limited to verification, harness construction, evidence capture and approval preparation.
