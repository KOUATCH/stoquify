# G1 contract freeze candidate v0.2.0

Status: **READY FOR ACCOUNTABLE REVIEW — NOT APPROVED**  
Gate: `G1 — Architecture and control contract freeze`  
Production authorization: **NO**

The canonical gate numbering comes from `STOQUIFY_POS_AND_SALES_TO_CASH_MASTER_IMPLEMENTATION_ROADMAP_2026-08-17.md`. The older enterprise roadmap used a pre-baseline numbering scheme; its `G0` maps to canonical `G1` and its `G1` maps to canonical `G2`.

This candidate corrects the earlier draft by separating three different claims:

1. The business/control decision is still valid as a target.
2. The current runtime may implement all, part, or none of that target.
3. Only an authenticated accountable owner can approve the decision.

No typed name, previous development authorization, repository hash or passing test is converted into owner approval.

## Decision disposition

| Decision | Corrected selected option | Runtime status | Approval status |
| --- | --- | --- | --- |
| D-01 | Store credit hidden and rejected | Enforced for current POS | Pending product, controller and payments owners |
| D-02 | Terminal current-session CAS plus one session drawer-opening claim | Partially enforced; no dedicated unique active-drawer-claim aggregate | Pending operations, architecture and security owners |
| D-03 | Electronic tender disabled until one named provider is approved | Fail-closed | Pending payments, treasury and security owners |
| D-04 | Offline capture disabled | Fail-closed | Pending product, risk and operations owners for any enablement |
| D-05 | Edge 151 / Windows 10 25H2 simulated desktop, browser preview/PDF only | Development declaration; no physical certification | Pending operations, QA and support owners |
| D-06 | Linked full-sale refund/void compensation in current scope | Fresh auth and compensation exist; partial return/disposition and maker-checker are missing | Pending controller, operations and risk owners |
| D-07 | Cameroon/XAF/EN-FR development only | Fail-closed for production | Pending product, controller and qualified Cameroon reviewer |
| D-08 | No production SLO until D-05 and measured baselines exist | Target only | Pending SRE, product and support owners |
| D-09 | Confirmation non-posting; invoice from accepted delivered quantity | Target not implemented | Pending controller, O2C product and qualified accounting reviewer |
| D-10 | Reservation affects availability only; physical issue owns stock/COGS | Immediate POS goods issue exists; delivery reservation lifecycle is missing | Pending inventory, fulfillment and accounting owners |
| D-11 | Session, drawer, business day, statement, reconciliation and accounting close stay separate | Partial; governed business-day aggregate is missing | Pending controller, treasury and operations owners |

## State-machine corrections

The original state table remains a valid target, but it was not a truthful runtime freeze. The machine-readable contract now records exact mappings and gaps.

Material corrections include:

- `SalesOrderStatus.PROCESSING/SHIPPED/DELIVERED` cannot be treated as quantity-backed `PARTIALLY_FULFILLED/FULFILLED` without fulfillment evidence.
- `PaymentTransaction.CONFIRMED` cannot be marketed as provider-owned `CAPTURED` until a named provider mapping and `UNKNOWN/REVERSED` semantics are implemented.
- The receipt delivery `PENDING/SENT/FAILED/SKIPPED` presentation type is not a durable `QUEUED/DELIVERED/RETRY_REQUIRED/DEAD_LETTER` aggregate.
- `POSSession.ACTIVE/CLOSED/RECONCILED` does not implement blind declaration and independent review states.
- Governed business day, delivery reservation, fulfillment, delivery invoice and partial return aggregates are not implemented.
- `ReconciliationRunStatus` already matches its required durable state contract.

## Frozen current-scope event ownership

| Event | Authoritative owner | Current status |
| --- | --- | --- |
| `pos.sale.finalized` | `commitPOSSale` transaction | Implemented, cash-only development |
| `pos.sale.stock_issued` | Inventory stock-event kernel | Implemented |
| `pos.refund.issued` / `pos.refund.stock_returned` | Refund transaction plus inventory kernel | Implemented for full-sale correction |
| `pos.sale.voided` / `pos.void.stock_returned` | Void transaction plus inventory kernel | Implemented for full-sale correction |
| `pos.shift.closed` | `closePOSShift` transaction | Implemented development scope |
| `pos.sale.fiscalization.requested` | Transactional business-event outbox | Non-statutory development only |
| Provider payment lifecycle | Named provider adapter and append-only ingestion | Disabled/unimplemented |
| Order confirmation/reservation/goods issue/invoice/return/business day | Respective target aggregates using shared kernels | Not implemented |

## Accounting and inventory invariants retained

- Cash sale and physical hand-over decrease on-hand once and post cash, revenue, tax, COGS and inventory through the existing kernels.
- Provider pending, unknown or timeout has no successful-payment posting.
- Order confirmation has no journal or on-hand consequence.
- Reservation changes reserved/available quantity only.
- Physical goods issue owns on-hand reduction and COGS.
- Eligible invoice issuance owns AR/revenue/tax exactly once.
- Refunds, voids, returns, stock corrections and journals use source-linked compensating evidence.
- Statement matching, reconciliation sign-off and accounting close remain separate facts.

## Approval return requirements

Each D-01–D-11 decision must return:

```text
selectedOption
rationale
accountableApprover + approverRole + authorityReference
freshAuthenticatedAt + approvedAt
effectiveVersion + reviewOrExpiryAt
evidenceLinks + affectedCapabilities
rollbackOrDisablePolicy
signatureReference + signatureEvidenceSha256
```

The complete frozen source of truth is `EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`. Approvals must be recorded separately in `EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`, which binds the exact contract SHA-256; do not edit the frozen contract after signing begins. G1 remains **BLOCKED** at 0/11 authentic decision approvals. The contract candidate can be reviewed now; runtime implementation may proceed only within the already authorized development scope and must not claim that the missing aggregates are frozen production behavior.
