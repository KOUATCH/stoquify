# Stoquify Enterprise Procure-to-Pay Audit and Modernization Blueprint

Date: 2026-08-17  
Scope: purchasing, supplier controls, receiving, inventory, accounts payable, payments, reconciliation, and purchase accounting  
Engagement: evidence-first audit and target design; no runtime implementation  
Decision: **CONDITIONAL NO-GO for an “enterprise-grade end-to-end procure-to-pay” claim; GO for controlled incremental hardening of the existing purchase/AP kernel**

## 1. Executive decision

Stoquify has a meaningful, control-aware purchase-to-payment core. It is not a superficial dashboard. Current code includes tenant-scoped purchase orders, maker-checker PO approval, supplier acknowledgement, partial goods receipts, inventory stock events with batch/serial/expiry support, duplicate-protected supplier invoices, received-quantity matching, AP ledger evidence, supplier-bank dual control, payment approval/release, reconciliation queueing, close invalidation, audit/business events, and focused readiness gates.

It is not yet a complete enterprise procure-to-pay system. Three boundaries prevent that claim:

1. **Receiving can outrun both concurrency safety and accounting truth.** A PO is read before the receipt transaction; remaining quantity and new cumulative receipt quantity are derived from that earlier state. Parallel receipts can therefore pass the same validation and overwrite or overstate received quantity. PO and GRN identifiers are also derived by “last record plus one” outside a concurrency-safe allocator.
2. **Accepted receipt does not produce authoritative GRNI accounting.** The inventory kernel records stock and valuation evidence, then intentionally raises the ledger blocker GOODS_RECEIPT_LEDGER_REVIEW. Supplier invoice and payment posting are stronger, but without the receipt-side accrual, inventory valuation, GRNI, AP, and close cannot form a fully balanced professional chain.
3. **Critical operating and correction workflows are incomplete.** There is no persisted inspection/quarantine acceptance model, match-exception approval workflow, return-to-vendor/supplier-credit-note chain, service acceptance, or complete AP mutation workbench. Requisition and RFQ/award governance are also absent.

The recommended strategy is not to clone Oracle or SAP. Preserve Stoquify’s existing service, inventory, accounting, evidence, sensitive-action, outbox, and reconciliation foundations; close the P0 integrity chain first; add requisition/sourcing and richer supplier governance in P1; leave optimization, offline receiving, and carefully controlled OCR for P2.

This report does **not** certify production readiness, security, privacy, accessibility, OHADA/SYSCOHADA compliance, tax treatment, bank confirmation, accounting mappings, or payment-provider activation.

## 2. Scope, method, and evidence boundary

The audit reviewed current repository source, Prisma models, services, protected actions, permissions, components, graph reports, focused tests, static gates, runtime-table checks, and prior purchasing/AP reports. Official vendor documentation was used for benchmark principles. No production mutation, reset, reseed, migration, supplier payment, provider activation, or runtime code change was performed.

The worktree was already dirty and was preserved. At the audit snapshot, git status reported 92 entries: 63 modified and 29 untracked. The audit added only docs/purchase-enterprise-grade-audit.

Architecture graph evidence: graphify-out/GRAPH_REPORT.md reports 4,121 nodes, 5,321 edges, and purchase-related Community 10, linking purchase pages/actions with approvePurchaseOrder and applyInventoryReceipt. Graph output was used as navigation evidence; source code remained authoritative.

Primary source anchors:

- prisma/schema.prisma: PurchaseOrder at line 1361, GoodsReceipt at 1697, SupplierInvoice at 1890, ThreeWayMatch at 1983, SupplierPayment at 2021, SupplierLedgerEntry at 6289, JournalEntry at 6970, LedgerPostingBatch at 7068, and BusinessEvent at 7314.
- services/purchase-order/purchase-order.service.ts: transition map at 67, number allocation at 270 and 280, maker-checker approval around 739–751, and receiving at 814–973.
- services/inventory/inventory-stock-event.service.ts: concurrency-aware inventory updates around 346 and 471 and goods-receipt stock posting at 826–867.
- services/purchasing/ap-control.service.ts: AP posting at 592, invoice-line matching at 1103, invoice preparation/posting at 1544–1965, payment approval at 2467, and release at 2746.
- actions/purchasing/ap-control.actions.ts: server-derived tenant/actor and fresh authentication for invoice posting, bank approval, payment approval, and payment release.
- config/permissions.ts and lib/security/rbac-permissions.ts: purchasing/AP permission vocabulary and high/critical risk classifications.
- components/purchasing/APControlWorkbench.tsx: current AP queue/read-model surface.

## 3. Repository-truth map

### 3.1 Status summary

| Capability | Status | Current truth | Principal disposition |
|---|---|---|---|
| Supplier master and lifecycle | Partial | Tenant-scoped supplier records, history/export and bank-control foundations exist; complete qualification, risk, quotation, suspension/reactivation evidence is not a single governed workflow | Preserve; add governed qualification in P1 |
| Supplier bank changes | Implemented control kernel | Request/independent approval, fresh auth, approved destination checks, audit/event evidence | Preserve unchanged except UI/operational proof |
| Purchase requisition | Missing | No authoritative PurchaseRequisition model/service/workbench found | P1 |
| RFQ, quotation comparison, award | Missing | Supplier acknowledgement exists, but no governed sourcing event/quotation/award chain | P1 |
| Purchase order | Partial, strong core | Draft→submit→approve→receive→complete; maker-checker; supplier acknowledgement; immutable after approval | P0 hardening for numbering, policy, versions/change control |
| Receipt numbering | Risky | Last-created GR number + 1 outside atomic allocator | P0 |
| Goods receipt and partial receipt | Partial | GR/lines, batch/serial/expiry, stock event, partial receipt | P0 concurrency and idempotency hardening |
| Inspection/quarantine | Missing | Receipt immediately makes stock available; no accepted/rejected/quarantined quantity model | P0 |
| Inventory event/valuation kernel | Implemented foundation | Atomic stock events, optimistic update checks, weighted-average support, close invalidation | Preserve and extend |
| Receipt accounting / GRNI | Blocked | Stock posts; explicit GOODS_RECEIPT_LEDGER_REVIEW blocker says ledger setup remains required | P0 |
| Supplier invoice capture | Partial, strong backend | Maker/checker, duplicate fingerprint, idempotency, country-pack/open-period checks, ledger evidence | Add secure document capture and operator UI in P0 |
| Three-way match | Partial | Received/uninvoiced quantity and exact price checks; persisted MATCHED evidence | Add versioned policies and exception workflow in P0 |
| Match exception | Missing/dead-end | EXCEPTION is counted and messages mention creating one, but no complete creation/approval action/UI path was found | P0 |
| Service/non-stock procurement | Missing/limited | Invoice-line flow requires received-goods evidence | P1 service acceptance |
| Payment approval/release | Implemented control kernel | Maker-checker, fresh auth, idempotency, destination and blocker checks, posting and outbound reconciliation | Preserve; complete role surface/evidence |
| Settlement/reconciliation | Implemented foundation | Outbound reconciliation is queued; provider truth can remain pending/failed/suspense/reconciled | Preserve; prove connector-specific behavior separately |
| Purchase returns and supplier credits | Missing | No authoritative PurchaseReturn or SupplierCreditNote model/workflow found | P0 correction slice |
| Landed cost | Missing | No controlled allocation model found | P1 |
| Purchase documents | Partial | Browser PO print and receipt history exist; no reusable immutable artifact/delivery chain for GRN, inspection, invoice evidence, remittance | P0 |
| AP operator workbench | Partial | Read-model queues exist; direct component use of invoice/payment mutation actions was not found | P0 |
| Analytics | Partial | PO/AP/supplier reads exist; no full requisition-to-close, GRNI aging, exception SLA, or award analytics | P1/P2 |
| Offline warehouse receipt | Missing | No governed offline receiving/replay identified | P2 only after online invariants |
| AI/OCR | Not applicable today | No deterministic, human-approved invoice extraction flow in scope | Optional P2 proposal only |

### 3.2 Existing strengths that must be preserved

- Organization and actor are derived server-side in protected AP actions.
- PO creator self-approval is blocked.
- Supplier invoice preparation and posting are separated.
- Duplicate invoice defenses include tenant/supplier invoice uniqueness, idempotency, and duplicate fingerprinting.
- Received quantity cannot be invoiced beyond the uninvoiced receipt quantity.
- Exact decimal handling and open-accounting-period/country-pack checks are present in AP.
- Inventory mutation is centralized through a stock-event kernel with concurrency-aware updateMany checks.
- Supplier-bank changes, payment approval, and release are classified as sensitive, fresh-authenticated actions with maker-checker controls.
- Payment release queues reconciliation rather than declaring settlement from a request.
- Ledger posting and close invalidation/evidence foundations already exist.
- Supplier acknowledgement uses token-scoped public access rather than trusting arbitrary supplier identity.
- Static purchasing/AP and fraud-control gates have strong focused coverage.

These are repository truths, not proposals.

### 3.3 Confirmed gaps and hazards

| ID | Severity | Finding | Evidence | Consequence | Owner |
|---|---|---|---|---|---|
| P2P-001 | Critical | Receipt validation and cumulative update use a PO snapshot loaded before the transaction | purchase-order.service.ts 814–942 | Parallel receipts can both pass remaining-quantity checks and produce an overreceipt or lost cumulative update | Purchasing + Database |
| P2P-002 | High | PO and GRN numbers use last-record-plus-one | purchase-order.service.ts 270–287 | Collisions/retries and ambiguous operator behavior under concurrency | Platform + Database |
| P2P-003 | High | Stock posts without authoritative GRNI accounting | inventory-stock-event.service.ts 826–845 | Inventory valuation and AP timing do not form a balanced receipt-to-invoice chain; close blocker remains | Accounting Platform |
| P2P-004 | High | No complete match-exception lifecycle | ap-control.service.ts 1213 and EXCEPTION queue at 1275 | Legitimate controlled variances become an operator dead end or invite unsafe manual workarounds | AP Controls |
| P2P-005 | High | No inspection/quarantine acceptance model | GoodsReceipt schema/service and immediate stock posting | Damaged or unverified arrivals can become available stock | Inventory Operations |
| P2P-006 | High | No purchase-return/supplier-credit-note correction chain | No authoritative runtime models/services found | Posted receipt/invoice errors cannot be corrected through a complete non-destructive accounting path | Purchasing + AP |
| P2P-007 | High | AP critical actions exist but a complete mutation workbench was not found | ap-control.actions.ts vs APControlWorkbench.tsx | Controls exist in backend but are not fully operable as a professional role workflow | Product + Frontend |
| P2P-008 | Medium | Approved PO has no governed version/change-order/reapproval record | PurchaseOrder status model | Commercial commitment changes lack immutable before/after approval evidence | Purchasing |
| P2P-009 | Medium | Document artifacts and delivery evidence are incomplete | PO browser print; no reusable artifact/delivery model | GRN, inspection, invoice capture, and remittance cannot be proven consistently | Records + Platform |
| P2P-010 | Medium | Requisition/RFQ/award/spend authority are absent | No authoritative models | Need-to-order governance and conflict/award evidence are missing | Product + Procurement |
| P2P-011 | Medium | Service invoices are coupled to goods-receipt evidence | ap-control.service.ts 1179 | Non-stock/service purchasing lacks acceptance semantics | AP + Procurement |
| P2P-012 | Medium | Generated receipt serials can be confused with supplier/manufacturer serials | purchase-order.service.ts 341–357 | Provenance can be overstated | Inventory |
| P2P-013 | Medium | PO approval is not classified in the shared sensitive-action policy | purchase order action vs rbac-permissions.ts | High-value/risk PO approvals lack a consistent fresh-auth/policy posture | Security + Purchasing |
| P2P-014 | Medium | Landed-cost allocation is absent | No authoritative model/service found | Inventory acquisition cost can omit freight/duty/other approved charges | Inventory Accounting |
| P2P-015 | Release blocker | Country-pack/account/tax mappings require qualified approval | existing AP blockers and audit mandate | No hardcoded or assumed legal/accounting treatment is acceptable | Qualified Accounting/Tax |

## 4. Current lifecycle trace

~~~mermaid
flowchart LR
  A["PO DRAFT<br/>buyer"] --> B["SUBMITTED<br/>buyer"]
  B --> C["APPROVED<br/>independent approver"]
  C --> D["Supplier acknowledgement<br/>token-scoped portal"]
  C --> E["GoodsReceipt RECEIVED<br/>warehouse"]
  E --> F["Inventory stock event<br/>available stock + valuation"]
  F --> G["Ledger blocker<br/>GOODS_RECEIPT_LEDGER_REVIEW"]
  E --> H["Supplier invoice prepared<br/>AP maker"]
  H --> I["Exact received-quantity and price match"]
  I --> J["Invoice approved/posted<br/>AP checker"]
  J --> K["AP ledger/open item"]
  K --> L["Payment approved<br/>independent approver"]
  L --> M["Payment released<br/>independent releaser"]
  M --> N["Outbound reconciliation queued"]
  N --> O["Pending / failed / suspense / reconciled"]
~~~

### 4.1 Happy path and exception trace

| Stage | Owner | State/evidence | Inventory effect | Accounting/payment effect | Failure path | Correction path |
|---|---|---|---|---|---|---|
| PO draft | Buyer | DRAFT; PO lines/totals | None | Non-posting | Validation failure | Edit while draft |
| Submit | Buyer | SUBMITTED | None | Non-posting | Invalid transition | Reject/cancel to controlled state |
| Approve | Independent approver | APPROVED; approver identity/time | None | Non-posting | Self-approval blocked | Cancel before dependent evidence; future change order required |
| Supplier acknowledgement | Supplier token principal; buyer reviews changes | Acknowledged/change proposal evidence | None | Non-posting | Invalid/expired token, rate/abuse controls | Reissue/revoke access; buyer-controlled review |
| Receive | Warehouse receiver | GoodsReceipt and lines | Immediate stock quantity/availability; valuation event | Receipt ledger blocker, not GRNI posting | Overreceipt, serial/batch validation; concurrency hazard | No complete return/inspection correction chain |
| Prepare invoice | AP maker | Prepared invoice, duplicate/idempotency evidence | None | No final posting | Duplicate/receipt/country-pack errors | Correct draft evidence; never edit posted invoice |
| Match/approve invoice | AP checker | MATCHED three-way evidence; approval claim | None | AP posting/open item; receipt-side GRNI remains incomplete | Exact price/quantity mismatch | Match exception promised but incomplete |
| Approve payment | Payment approver | APPROVED | None | No provider settlement | Bank change/open-item/control blocker | Resolve blocker; reject/cancel |
| Release payment | Payment releaser | RELEASED and posting/reconciliation evidence | None | AP/payment posting and recon queue | Same-key payload conflict, bank/recon/country blocker | Retry same command; reversal/suspense, never edit |
| Reconcile/close | Treasury/accounting | Provider evidence, matching, close blockers | None | Settled/reconciled or suspense | Unknown/failed/unmatched | Evidence-backed match, suspense resolution, reversal |

### 4.2 Scenario conclusions

- **Partial receipt:** supported, including batch/serial/expiry, but not safe enough under concurrent receivers and not separated into arrival, quarantine, inspection, and acceptance.
- **Duplicate invoice:** strong backend defenses exist; retain supplier+number uniqueness, normalized fingerprint, document hash, and idempotency as layered controls.
- **Price variance:** exact mismatch is blocked. That is safer than silent tolerance, but the operator has no complete versioned exception/request/independent-approval path.
- **Supplier bank change:** strong maker-checker and fresh-auth controls exist. Payment release must continue to fail while a bank change is pending or destination evidence is unresolved.
- **Payment failure:** the design can retain pending/failed/suspense/reconciliation evidence; provider-specific settlement truth still needs connector evidence.
- **Return:** not complete. Never mutate the original receipt or posted invoice; add linked return, dispatch, claim, credit-note, inventory, GRNI/AP, and reconciliation records.

## 5. Benchmark comparison using official evidence

| System | Official evidence | Principle | Stoquify decision |
|---|---|---|---|
| Oracle Fusion Cloud | Oracle defines two-way, three-way, and four-way match levels; four-way includes accepted inspection quantity. Oracle also supports matching invoices to receipts and receipt charges and reports modified matched receipts. [Oracle match levels](https://docs.oracle.com/en/cloud/saas/procurement/26a/oapro/match-approval-level-options.html), [invoice matching](https://docs.oracle.com/en/cloud/saas/financials/25c/fappp/matching-invoice-lines.html), [modified receipts](https://docs.oracle.com/en/cloud/saas/financials/25d/fappp/payables-matched-and-modified-receipts-report-details.html) | Policy-selected 2/3/4-way match; accepted quantity; traceable post-match receipt corrections; receipt charges/landed cost | **Adapt:** add versioned match policy, GoodsInspection, immutable receipt correction, landed-cost allocation. Avoid Oracle-scale configurability in P0. |
| SAP S/4HANA | SAP flexible workflow supports condition-based one- or multi-step approvals and role/user/team approvers. SAP documents GR/IR clearing so either receipt or invoice may occur first and the later event clears GR/IR. [Flexible PO workflow](https://help.sap.com/docs/SAP_S4HANA_CLOUD/adbae5bcd5994f159bf2847a11397b61/fbc1a9b4600745c1939276a0d9ce62ec.html), [GR/IR accounting](https://help.sap.com/docs/SAP_S4HANA_ON-PREMI-SE/af9ef57f504840d2b81be8667206d485/be5eb6531de6b64ce10000000a174cb4.html) | Condition-based approvals; receipt/invoice accrual clearing; exception-aware workflow | **Adopt narrowly:** amount/risk/category/location approval conditions and GRNI clearing. Defer full workflow designer. |
| Microsoft Dynamics 365 | Microsoft describes need/requisition through sourcing, receipt, invoice, and payment, with spending limits/workflows, arrival registration, services/nonphysical products, accounting distributions, product-receipt matching, non-PO lines, and vendor performance reporting. [Procurement overview](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/procurement-sourcing-overview), [vendor invoices](https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/vendor-invoices-overview) | Requisition/spending authority; arrival vs product receipt; service procurement; accounting distributions; match details; supplier analytics | **Adapt:** P1 requisition/sourcing and service acceptance; P0 arrival/acceptance split. Reject unrestricted non-PO posting by default. |
| Odoo 18 | Odoo supports ordered-quantity vs received-quantity bill-control policies and three-way matching tied to received quantities, with RFQ/purchase workflows. [Bill controls](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/control_bills.html), [RFQ](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html) | Understandable SMB workflow; product-level bill-control policy; practical RFQ-to-PO path | **Adapt:** simple policy profiles and an approachable SMB UX. Reject manual “force paid” style overrides unless Stoquify’s versioned evidence and independent approval requirements are met. |

Benchmark conclusion: the shared enterprise pattern is not “more screens.” It is a chain of approved intent, immutable commercial commitment, controlled receipt/acceptance, policy-based invoice match, receipt-accrual clearing, independent payment release, provider reconciliation, and source-linked correction.

## 6. Target lifecycle

~~~mermaid
flowchart LR
  R["Requisition<br/>requested → approved"] --> S["RFQ / quotes / award<br/>optional by policy"]
  S --> P["PO version<br/>approved → issued → acknowledged"]
  R --> P
  P --> A["Arrival<br/>registered"]
  A --> Q{"Inspection policy"}
  Q -->|accept| G["Accepted GRN<br/>available stock + GRNI"]
  Q -->|quarantine| U["Quarantined stock<br/>unavailable"]
  Q -->|reject| X["Rejection / return dispatch"]
  G --> I["Supplier invoice capture<br/>maker"]
  U --> I
  I --> M{"2/3/4-way match<br/>versioned policy"}
  M -->|pass| AP["Invoice approval/post<br/>clear GRNI + AP"]
  M -->|variance| E["Match exception<br/>reason + evidence + checker"]
  E -->|approved| AP
  E -->|rejected| I
  AP --> PA["Payment approval"]
  PA --> PR["Payment release<br/>clearing state"]
  PR --> RC["Provider settlement<br/>reconciliation"]
  RC --> C["Close readiness"]
  G --> RT["Return to vendor"]
  RT --> CN["Supplier credit note"]
  CN --> AP
~~~

### 6.1 Target stage contract

| Stage | Accountable owner | States | Required permission/control | Evidence | Failure and correction |
|---|---|---|---|---|---|
| Supplier qualification | Supplier manager | DRAFT, UNDER_REVIEW, ACTIVE, SUSPENDED, REJECTED | supplier manage; maker-checker for bank/critical identity | source documents, verification outcomes, version, actor | suspend; new review version; never overwrite verified evidence |
| Requisition | Requester / budget approver | DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN, CLOSED | request/create; policy-routed approval; no self-approval above policy | need, purpose, dimensions, attachment hashes, policy version | return for correction or create new version |
| Sourcing/award | Buyer / award approver | DRAFT, ISSUED, OPEN, EVALUATING, AWARDED, CANCELLED | sourcing permissions; conflict attestation; independent award | issued RFQ, supplier response snapshot, score/decision | extend, cancel, or supersede award |
| PO | Buyer / PO approver | DRAFT, SUBMITTED, APPROVED, ISSUED, ACKNOWLEDGED, PART_RECEIVED, RECEIVED, CLOSED, CANCELLED | server tenant; risk/amount policy; fresh auth for high risk | immutable approved version, issue/delivery evidence | linked change order and reapproval |
| Arrival | Receiver | EXPECTED, ARRIVED, PARTIAL, CANCELLED | receive permission; idempotent command | delivery reference, quantities, photos/hash | correct through receipt correction before acceptance |
| Inspection | Inspector | PENDING, ACCEPTED, PART_ACCEPTED, QUARANTINED, REJECTED | inspection permission; receiver/inspector split when required | tests, reason, accepted/rejected quantities | reinspect or linked rejection/return |
| Accepted GRN | Receiver/inspector policy | FINALIZED, PARTIALLY_RETURNED, RETURNED, REVERSED | finalize receipt; number allocator; idempotency | immutable GRN/artifact/hash | linked return or reversal only |
| Invoice capture | AP maker | CAPTURED, PREPARED, DUPLICATE_HOLD, MATCH_EXCEPTION, READY | AP prepare; secure attachment controls | supplier document, hash, extracted vs confirmed values | replace unconfirmed draft artifact; never invent invoice |
| Match exception | AP exception requester/checker | OPEN, APPROVED, REJECTED, EXPIRED, RESOLVED | match review; independent approval; policy and limits | reason, policy version, variance, evidence, expiry | reject/correct invoice or obtain supplier credit |
| Invoice posting | AP checker | APPROVED, POSTED, REVERSED/CREDITED | fresh auth for critical posting; maker-checker | ledger batch, source links, country-pack version | credit note or reversal record |
| Payment | Payment maker/approver/releaser | PREPARED, APPROVED, RELEASED, FAILED, CANCELLED | separate duties; fresh auth; destination/blocker checks | allocation, approved bank snapshot, command hash | retry same command, cancel, reversal or suspense |
| Reconciliation | Treasury | PENDING, UNKNOWN, FAILED, SETTLED, SUSPENSE, RECONCILED | reconciliation permission; evidence match | provider reference, statement/settlement evidence | suspense case and evidence-backed resolution |
| Return/credit | Warehouse + AP | REQUESTED, APPROVED, DISPATCHED, CREDIT_PENDING, CREDITED, CLOSED | return approve; AP credit capture/post | return link, dispatch, credit note, ledger evidence | cancel before dispatch or linked reversal |

## 7. Document taxonomy and “receipt issuing”

| Document | Issuer / truth owner | Purpose | Posting effect | Required artifact controls |
|---|---|---|---|---|
| Purchase requisition | Stoquify on behalf of requester | Internal need and authorization | None; optional budget commitment only | version, approvers, purpose/dimensions, hash |
| RFQ | Buyer organization via Stoquify | Solicitation | None | issue version, recipients, secure delivery |
| Supplier quotation | Supplier | Commercial evidence captured by Stoquify | None | original file/hash, supplier identity, received time; never fabricate |
| Purchase order | Buyer organization | Approved commercial commitment | Normally non-posting | concurrency-safe number, approved snapshot, terms, delivery/ack |
| GRN / purchase receipt | Stoquify operations | Operational proof of quantities received/accepted | Triggers inventory and GRNI only at configured acceptance point | number, accepted/rejected quantities, source PO, artifact/hash |
| Inspection/rejection report | Stoquify inspector | Quality/acceptance evidence | Controls availability and receipt posting | inspector, tests/reasons, attachments, immutable result |
| Supplier invoice | Supplier | Commercial request for payment captured by Stoquify | Posts only after controls | original artifact, supplier number/hash, confirmed fields |
| Supplier credit note | Supplier | Correction of supplier invoice | Source-linked AP/inventory/tax correction | original evidence/hash, links to invoice/return |
| Remittance advice | Stoquify after controlled release | Payment notification, not bank settlement proof | None beyond underlying truthful payment event | release/provider state, redacted destination, delivery status |
| Accounting voucher/posting batch | Stoquify accounting kernel | Internal accounting evidence | Ledger effect | posting recipe/policy version, balanced lines, source links |
| Sales fiscal receipt | Outside P2P | Customer-sale fiscal document | Not part of purchase flow | Never label a GRN as this document |

All finalized documents require: tenant/location-scoped atomic numbering, immutable snapshot, version and supersession link, source IDs, EN/FR rendering, HTML/PDF/print, content hash, generation timestamp and actor, redaction policy, retention classification, delivery attempts/status, and permission-checked download/share. A generated PDF is evidence presentation, not independent legal certification.

## 8. Accounting event matrix

No account number, VAT rule, withholding rule, tax rate, or statutory treatment is prescribed here. “Policy” means a versioned, effective-dated, qualified-review-approved country/accounting pack. Missing policy must block final posting.

| Event | Posting | Inventory / valuation | Supplier subledger / GL / GRNI | Tax and payment | Close/evidence/correction |
|---|---|---|---|---|---|
| Requisition approved | No | None | Optional budget commitment only if configured separately | None | Approval/policy evidence; withdraw or supersede |
| PO approved/issued | Normally no | Expected quantity only | Optional commitment, never AP liability | None | Immutable version/issue evidence; change order |
| Physical arrival | No by default | Arrived/quarantine quantity; unavailable | No GRNI until configured acceptance/control point | None | Arrival evidence; correct before acceptance |
| Accepted goods receipt | Yes under perpetual policy | Increase accepted/available stock; provisional acquisition cost | Dr inventory/approved asset-or-expense policy; Cr GRNI | No invented input VAT | Invalidate affected close; linked return/reversal |
| Quarantined receipt | Policy-dependent; default no final valuation posting | Increase quarantined, unavailable quantity | Explicit pending blocker unless policy legally transfers control | None | Inspection due/aging blocker |
| Rejected receipt | No, or reverse prior acceptance | No available increase; reverse provisional receipt if needed | Reverse GRNI/inventory only if previously posted | None | Rejection/dispatch evidence |
| Invoice prepared | No | None | No AP posting | Recognized fields remain unconfirmed until human approval | Duplicate/match/country-pack holds |
| Invoice posted | Yes | Adjust valuation only via approved variance/landed-cost rule | Dr GRNI for matched receipt; approved variance/charge/input-tax lines; Cr AP | Tax/withholding only from approved pack | Posting batch/source links; credit/reversal correction |
| Match exception approved | No by itself | None | Authorizes a bounded later posting; never changes PO/GRN facts | No independent payment effect | Policy version, reason, evidence, checker, expiry |
| Payment approved | No | None | No settlement claim | Allocation and destination locked | Approval evidence; cancel/reject |
| Payment released | Policy-dependent clearing entry | None | Dr AP; Cr payment clearing or bank only according to truthful stage | Remittance may be issued; settlement not assumed | Reconciliation item required |
| Provider settlement | Yes when authoritative evidence exists | None | Dr payment clearing; Cr bank/mobile-money control account, as approved | Provider fee/FX only from evidence/policy | Provider reference and statement evidence |
| Reconciliation | Usually no new posting unless resolving suspense | None | Links payment, bank/clearing, fees, or suspense | No invented confirmation | Close blocker cleared only on evidence |
| Return before invoice | Yes if accepted receipt was posted | Decrease accepted stock; dispatch/quarantine state | Dr GRNI; Cr inventory/asset or approved correction | No supplier credit invented | Return authorization/dispatch links |
| Return after invoice | Inventory correction plus claim; AP correction waits for valid credit/reversal evidence | Decrease/hold stock | Reverse inventory side; establish controlled supplier claim, not arbitrary AP edit | Tax correction only per valid credit/country pack | Credit-pending close blocker |
| Supplier credit note posted | Yes | Adjust inventory/expense/variance per source | Dr AP; Cr inventory/expense/GRNI/approved tax lines | Valid supplier document required | Linked to invoice/return; immutable |
| Landed-cost allocation | Yes after approved source charge | Increase eligible inventory acquisition cost or recognized expense | Cr AP/accrual and allocate by versioned method | Taxes per policy | Allocation evidence and recalculation rules |
| Cancellation/reversal | Source-dependent | Exact inverse or forward correction | Linked balanced reversal, never deletion | Preserve original tax evidence | Reopen/close invalidation and audit |

### 8.1 Balance invariant

For each accepted receipt line, the system must maintain exact source-linked quantities and values:

Accepted quantity = invoiced matched quantity + uninvoiced accepted quantity + returned quantity + valid residual.

Receipt provisional value = GRNI cleared by posted invoices + open GRNI + receipt-side returns/reversals + approved value adjustments.

AP open item = posted supplier invoice/credit balance − allocated released payments ± source-linked reversals.

Payment clearing = released payment − authoritative settlements ± provider reversals/fees/FX adjustments.

No component may be counted twice. An invoice matched to a receipt clears GRNI; it does not book inventory again except a separately identified, policy-approved variance or landed-cost adjustment.

## 9. Inventory effect matrix

| State/event | On hand | Available | Quarantine | Valuation | Batch/serial/expiry |
|---|---:|---:|---:|---|---|
| PO approved | 0 | 0 | 0 | None | Expected metadata only |
| Arrival registered | +arrived operational quantity | 0 | +arrived | No final valuation by default | Capture supplier marks separately from internal unit IDs |
| Inspection accepted | No double increment if arrival bucket exists | +accepted | −accepted | Post provisional acquisition cost once | Validate uniqueness/provenance |
| Inspection rejected | Remove from arrival/quarantine | 0 | −rejected | None or reverse prior acceptance | Retain rejection evidence |
| Partial receipt | Accepted subset only | Accepted subset | Pending subset | Per accepted line | Line-level traceability |
| Return dispatch | −return quantity | −return available | May move to return staging first | Reverse source-linked receipt cost or approved current-cost policy | Preserve source receipt and serials |
| Supplier invoice | 0 | 0 | 0 | Clear GRNI; approved variance/landed-cost adjustment only | No inventory quantity mutation |
| Credit note | 0 unless paired return correction | 0 | 0 | Source-linked valuation/expense adjustment | Preserve linkage |
| Manual correction | Explicit adjustment event only | Policy-controlled | Policy-controlled | Exact reason/evidence; close invalidation | Never rewrite receipt line |

## 10. RBAC and segregation of duties

| Role | Allowed | Forbidden / separation |
|---|---|---|
| Requester | Draft/submit own requisitions; view own outcomes | Approve own governed request; issue PO; receive; post invoice |
| Buyer | Run RFQ, compare quotes, draft/issue approved PO, review supplier acknowledgement | Approve own high-risk award/PO; receive; post invoice; release payment |
| Requisition/award/PO approver | Approve within versioned authority and scope | Change amounts/lines during approval; approve own request/award |
| Receiver | Register arrival and quantities with evidence | Approve PO, inspect when policy separates roles, post invoice |
| Inspector | Accept/quarantine/reject | Edit received facts; post AP |
| AP maker | Capture/prepare supplier invoice and exception request | Final approve/post own invoice; approve bank; release payment |
| AP checker | Approve/post matched invoice or independently approve exception within limits | Prepare same invoice; alter PO/receipt facts |
| Supplier-bank requester | Request destination change with evidence | Approve own request; release payment to pending destination |
| Supplier-bank approver | Independently approve/reject with fresh auth | Request same change; release while unresolved |
| Payment maker | Prepare allocation/payment proposal | Approve/release own payment |
| Payment approver | Approve within authority with fresh auth | Release same payment where policy requires three-person control |
| Payment releaser | Release approved payment with fresh auth/idempotency | Change supplier bank or allocations |
| Treasury reconciler | Match provider/bank evidence, manage suspense | Invent settlement; edit released payment |
| Accountant/closer | Review GRNI/AP/control-account tie-outs and close blockers | Override source facts or country pack without governance |
| Auditor | Read immutable evidence and exports | Mutate business state |

Every high-risk command must derive tenant/actor server-side, check entitlement and permission, enforce fresh authentication when classified critical, claim the state atomically, prevent same-actor conflict, validate idempotency payload hash, append audit/business events and notifications, and expose a retry/reversal path.

## 11. Security and fraud threat analysis

| Threat | Existing defense | Gap | Required response | Severity |
|---|---|---|---|---|
| Cross-tenant ID injection | Protected actions derive organization and actor | Apply consistently to new workbenches/uploads/artifacts | Server-owned context and tenant predicates on every read/write | Critical |
| Parallel overreceipt | Inventory kernel has optimistic stock updates | PO remaining/cumulative receipt uses stale pre-transaction snapshot | Atomic receipt claim/version or serializable/pessimistic row lock; PostgreSQL race tests | Critical |
| Number collision | Tenant uniqueness exists | Last+1 allocator is racy | Atomic DocumentSequence plus unique-constraint retry | High |
| Duplicate invoice | Strong supplier/number/idempotency/fingerprint controls | File hash and normalized number capture need complete UI/storage | Layered duplicate keys and same-key/different-payload rejection | High |
| False invoice/OCR values | No AI truth path today | Future OCR could overreach | Malware-scanned original; OCR as suggestions; human confirmation and deterministic validation | High |
| Variance override abuse | Exact match currently blocks | No governed exception path | Versioned policy, scoped permission, reason/evidence, independent checker, expiry | High |
| Supplier-bank substitution | Strong bank-change maker-checker/fresh auth | Operational surface and alerts must remain provable | Lock approved destination snapshot; notify old/new contacts through safe channels; payment block | Critical |
| Payment double release | Idempotency and state controls exist | Must be proven with real concurrent DB tests | Atomic claim, payload hash, outbox, provider idempotency, no final settlement claim | Critical |
| Receipt evidence tampering | Audit/stock event foundations | No immutable document artifact/attachment lifecycle | Hash, encrypted object storage, signed URLs, malware status, retention/legal hold | High |
| Posted-document edit | Service states restrict some changes | Returns/credit/reversal chain incomplete | Database/service immutability plus linked corrections | High |
| Supplier portal abuse | Token-scoped acknowledgement | Continue rate limit, expiry, revocation, replay protections | Hashed tokens, narrow scope, rate limits, audit, safe errors | High |
| Sensitive-data leakage | Protected surfaces and permissions | Document/download redaction not unified | Field redaction, permission-specific documents, masked bank values, download audit | High |
| Dashboard-only false truth | AP workbench is read-oriented | Mutation workflow incomplete | Service-owned command/state contracts before UI claims completion | High |

## 12. Smallest coherent additive data model

### 12.1 P0 integrity chain

| Model/change | Core fields and state | Constraints/indexes | Compatibility and rollback |
|---|---|---|---|
| DocumentSequence | organizationId, locationId nullable, documentType, fiscalScope, nextValue, version | unique(org, location, type, scope); index(org, type); atomic update returning value | Additive table; old numbers remain valid; feature flag allocator; rollback to old reader only, never reuse assigned numbers |
| GoodsReceipt additive command fields | idempotencyKey, payloadHash, rowVersion, arrivalAt, finalizedAt, acceptanceStatus | unique(org, idempotencyKey); index(org, PO, status); compare-and-swap version | Nullable first; legacy receipts classified LEGACY_ACCEPTED with explicit provenance; no record rewrite |
| GoodsInspection / lines | receiptId, inspectorId, status PENDING/ACCEPTED/PART_ACCEPTED/QUARANTINED/REJECTED, quantities, reason/evidence | unique active inspection per receipt/version; indexes org/status/dueAt | New receipts use gate; legacy bypass remains explicit until backfill review |
| MatchPolicy / MatchPolicyVersion | scope dimensions, match level, quantity/price/tax/freight/FX/total rules, effective dates, reviewer evidence | unique org/policy/version; indexes org/active/effectiveAt | Default deny/exact-match migration; no silent tolerance |
| MatchException | invoice/match/source lines, policyVersionId, variance, reason, evidence, requester/checker, expiry, state | unique active exception per invoice/match scope; org/status/expiry indexes | Existing mismatches remain blocked; feature can be disabled without losing evidence |
| DocumentArtifact / DocumentDelivery | source type/id/version, kind, locale, object key, MIME, hash, generation actor/time, redaction class, state; delivery channel/status/attempt | unique org/source/kind/version/locale/hash; indexes org/kind/state and source | Lazily render legacy PO/GRN; immutable finalized rows; revoke delivery, never delete source |
| PurchaseReturn / lines | source receipt, authorization, staging/dispatch/received-by-supplier states, quantities, reason/evidence | unique org/return number; indexes receipt/status | Additive; original receipt unchanged |
| SupplierCreditNote / lines | supplier document number/hash, invoice/return link, states CAPTURED/PREPARED/POSTED/CREDITED/REVERSED | unique org/supplier/normalized number; hash/idempotency indexes | Additive; never manufacture supplier evidence |
| GRNI posting source links | receipt/line, policy/country-pack version, posting batch, status/blocker | unique org/source/purpose/idempotency; indexes org/status/period | Existing blocker retained until qualified recipe activated |

### 12.2 P1 business governance

- PurchaseRequisition and PurchaseRequisitionLine.
- ApprovalPolicy and ApprovalInstance, initially limited to requisition, award, PO/change order, exception, and return.
- SourcingEvent, SupplierQuotation, SupplierQuotationLine, and AwardDecision.
- PurchaseOrderVersion and PurchaseOrderChangeRequest.
- ServiceAcceptance for non-stock/service invoice matching.
- LandedCostAllocation with immutable allocation basis/version.
- SupplierQualificationReview and controlled lifecycle history if existing supplier history cannot express the invariant.

### 12.3 Migration sequence

1. Add new tables, nullable foreign keys, status enums/strings, indexes, and feature flags; run schema validation without backfill mutation.
2. Deploy read compatibility and sequence allocator behind a disabled flag.
3. Backfill only deterministic document metadata and legacy classifications; record counts/hashes before and after.
4. Enable concurrency-safe numbering for one document type; prove race tests and unique retry.
5. Enable idempotent receipt finalization and inspection for pilot tenants; legacy receipts remain readable.
6. Activate qualified GRNI recipe only after country/accounting pack approval and opening tie-out.
7. Enable match policy/exception and AP workbench in observe, then enforce.
8. Enable returns/credit-note corrections.
9. Add P1 requisition/sourcing/change-order/service acceptance.

Rollback is by feature flag, version routing, and forward migration. Do not drop old columns/tables or renumber/rewrite posted documents. A failed new posting is left blocked with evidence; it is not silently re-run under a different policy.

## 13. UI and route/workbench plan

| Workbench | Primary jobs | Required robust states | Mutation contract |
|---|---|---|---|
| Requester requisitions | Draft, submit, track, withdraw | loading, empty, denied, rejected with reason, stale version, success | server recalculates totals/dimensions and routes approval |
| Buyer sourcing | Issue RFQ, compare normalized quotes, record award | supplier nonresponse, expired quote, conflict declaration, partial | signed supplier response evidence; award command with policy |
| PO approval inbox | Review commercial snapshot and risk/authority | denied, fresh-auth required, stale/change pending, conflict | atomic approval claim; no client totals/actor |
| Receiving/inspection | Scan/select PO, register arrival, accept/quarantine/reject | offline, duplicate scan, overreceipt, serial conflict, partial, retry | idempotent command, row/version claim, inventory/GRNI transaction |
| Supplier acknowledgement | Acknowledge or propose change | invalid/expired/revoked token, rate-limited, conflict | narrow token scope; buyer controls accepted change |
| AP invoice/match | Upload, prepare, compare PO/receipt/inspection, request exception | malware pending, duplicate, missing receipt, variance, country blocker | secure artifact service; maker/checker and policy-bound exception |
| Payment approval/release | Review allocation, bank snapshot, blockers, approve/release | fresh-auth, bank change, open exception, recon/country blocker, retry | critical sensitive action; idempotency and audit |
| Supplier history/reconciliation | Timeline of PO/GRN/invoice/credit/payment/recon | partial data, redacted, unresolved suspense, close blocker | read model from service-owned sources, no client reconstruction |

All workbenches need responsive desktop/tablet/mobile behavior, keyboard reachability, focus restoration, semantic labels, EN/FR strings, non-color-only status, safe errors with a correlation ID, and a persistent source-document context. WCAG conformance requires dedicated automated and manual evidence and is not certified here.

## 14. Delivery plan

### P0 — Integrity and accounting chain

Each slice can release independently behind tenant/module flags.

| Order | Slice | Dependencies | Focused acceptance/exit gate |
|---:|---|---|---|
| 0 | Preserve baseline and fix inventory gate fixture classification/kernel use | None | inventory boundary fail gate = 0 active violations |
| 1 | Atomic document sequence | Schema additive migration | 20+ real PostgreSQL parallel requests create unique PO/GRN values; no reused number; retry test |
| 2 | Idempotent/concurrent receiving | Sequence, current inventory kernel | same-key replay returns same receipt; different payload conflicts; parallel receipts cannot exceed PO; stock and PO quantities tie |
| 3 | Arrival/inspection/quarantine | Receipt hardening | unavailable until accepted; partial accept/reject balances; role split; immutable inspection evidence |
| 4 | Qualified GRNI posting | Inspection, country/accounting policy approval | accepted receipt creates balanced receipt posting once; invoice clears exact GRNI; open GRNI aging/tie-out; close blocker behavior |
| 5 | Versioned match policy/exception | AP kernel, approval contract | exact default; independent bounded exception; expiry/rejection; source facts unchanged |
| 6 | Secure document artifacts | Object storage/security design | MIME/size/malware gates; encryption/signed URL; hash/retention/redaction; PO/GRN/inspection/invoice/remittance HTML/PDF |
| 7 | AP mutation workbenches | Match/artifact services | role journey E2E; denied/stale/blocked/retry states; no client business truth |
| 8 | Return and supplier-credit correction | GRNI, documents, AP | return-before/after-invoice accounting tests; original documents immutable; close tie-out |
| 9 | Sensitive PO approval policy | Approval policy minimum | risk/amount rule, self-approval prevention, fresh-auth for configured high-risk cases, audit/notification |

P0 exit: no receipt concurrency violation; authoritative receipt-to-GRNI-to-invoice-to-AP-to-payment-to-reconciliation chain balances; every failed stage has an explicit blocker and correction; inventory/service/purchasing/AP/fraud gates and focused PostgreSQL race tests pass.

### P1 — Full procurement governance

- Requisition and spending authority.
- RFQ, quotation capture/comparison, conflict declaration, award, and blanket agreement minimum.
- PO version/change-order/reapproval.
- Service acceptance and controlled non-stock invoices.
- Landed-cost allocation.
- Supplier qualification, suspension/reactivation, performance and spend/GRNI analytics.
- Complete EN/FR role workbenches and evidence exports.

P1 exit: request-to-award-to-PO evidence is complete; service and goods flows both match correctly; supplier/award analytics have defined grains and owners; no dashboard value lacks a service-owned source.

### P2 — Scale and optimization

- Governed offline receiving with signed/idempotent replay, conflict resolution, and no offline approval/payment release.
- Forecasting, blanket-release optimization, supplier scorecards, and advanced close analytics.
- Optional OCR/anomaly recommendations: original document retained, extraction confidence visible, deterministic validations, human confirmation, no autonomous posting/payment.
- Connector-specific provider settlement automation after separate certification evidence.

P2 exit: offline replay race/duplicate/conflict tests pass; AI evaluations and human-approval guardrails are documented; provider integration has sandbox and operational evidence. None is a prerequisite for the P0 control chain.

## 15. Verification and release gates

Executed on 2026-08-17 without runtime mutation:

| Verification | Result | Evidence |
|---|---|---|
| Purchasing/AP consolidation gate, fail mode | PASS — 11/11 checks, 0 blockers | evidence/purchasing-ap-consolidation-readiness.md/json |
| AP fraud-control gate, fail mode | PASS — 9/9 checks | evidence/ap-fraud-control-readiness.md/json |
| Inventory boundary gate, fail mode | **FAIL — 1 active violation** | evidence/inventory-boundary-readiness.md/json |
| Service boundary gate, fail mode | PASS — 0 active violations | evidence/service-boundary-readiness.md/json |
| Workflow assurance runtime table check | PASS — 7/7 tables, 3/3 migration rows | evidence/workflow-assurance-runtime-readiness.md/json |
| Prisma schema validation | PASS | Prisma reported schema valid |
| TypeScript typecheck | PASS | tsc --noEmit exited 0 |
| Audit-focused Jest suite | PASS — 6 suites, 50 tests | purchase order, AP service/actions, inventory kernel, AP gates |
| Attached-prompt exact Jest path set | PASS — 6 suites, 45 tests | purchase order, receipt/batch, PO action, AP service/actions/history |

The exact commands and outcomes are recorded in STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_VERIFICATION_2026-08-17.md. The inventory gate violation is scripts/supplier-po-ack-e2e-fixture.js:195, where inventoryLevel.create bypasses the inventory event boundary. It may be a fixture rather than production behavior, but the fail gate classifies it as runtime-like; it must either use the kernel or be explicitly and safely classified seed-only. This audit does not modify it.

Required pre-release additions:

- real PostgreSQL race tests for document sequence, same-PO partial receipts, invoice idempotency, approval claims, and payment release;
- accounting invariant tests for GRNI receipt/invoice clearing, returns, credits, landed cost, AP control tie-out, and close invalidation;
- security tests for tenant swapping, IDOR, stale/fresh auth, maker-checker collision, token replay, upload malware/MIME, signed URL expiry, and redaction;
- browser tests for the role workbenches and blocked/conflict/retry states;
- automated accessibility plus manual keyboard/screen-reader review in EN/FR;
- migration rehearsal on a sanitized production-shaped copy with counts, hashes, explain plans, rollback/forward-fix drill, and no destructive reset.

## 16. Unresolved-risk register

| Blocker code | Risk | Required evidence to clear | Owner | Phase |
|---|---|---|---|---|
| P2P_RECEIPT_CONCURRENCY | Parallel overreceipt/lost cumulative quantity | PostgreSQL race tests and atomic claim proof | Database/Purchasing | P0 |
| P2P_DOCUMENT_SEQUENCE | PO/GRN number collision | Atomic allocator, unique retry, concurrency test | Platform | P0 |
| P2P_GRNI_POLICY_MISSING | Receipt stock lacks authoritative ledger posting | Qualified policy/account mapping, balanced tests, pilot tie-out | Accounting Platform + qualified accountant | P0 |
| P2P_INSPECTION_MISSING | Arrival immediately becomes available | Inspection/quarantine state and inventory tests | Inventory Ops | P0 |
| P2P_MATCH_EXCEPTION_MISSING | Legitimate variance has no controlled path | Versioned policy, approval, expiry, evidence, UI/test | AP Controls | P0 |
| P2P_RETURN_CREDIT_MISSING | No complete non-destructive correction | Return/credit models, postings, reconciliation/close tests | Purchasing/AP | P0 |
| P2P_DOCUMENT_EVIDENCE | Documents lack unified immutable artifacts | Secure artifact/delivery service and retention approval | Platform/Security/Records | P0 |
| P2P_OPERATOR_SURFACE | AP controls not fully operable through role UI | Browser evidence for end-to-end protected actions | Product/Frontend | P0 |
| P2P_COUNTRY_PACK_REVIEW | Tax/account mappings not certified | Effective-dated qualified sign-off and release evidence | Country-pack owner | P0 release |
| P2P_PROVIDER_EVIDENCE | Settlement connector truth not proven here | Sandbox statements, idempotency, webhook/outbox/recon evidence | Payments/SRE | Separate release |
| P2P_ACCESSIBILITY_EVIDENCE | No conformance audit in this run | Automated + manual EN/FR test evidence | Accessibility/QA | Each UI slice |
| INVENTORY_BOUNDARY_VIOLATION | Fixture directly creates inventory level | Kernel migration or reviewed seed-only classification | Inventory Engineering | Immediate |

## 17. Reviewer-lens dispositions

| Lens | Disposition |
|---|---|
| Enterprise/platform architecture | Partial: strong kernels, but receipt, document, match exception, and correction boundaries are incomplete. |
| Backend/domain/API/distributed systems | High-priority concern: receipt and numbering concurrency; service boundary gate otherwise passes. |
| Database/migration/recovery | Additive proposal supplied; no destructive migration. Real PostgreSQL concurrency and rehearsal remain required. |
| Security/IAM/privacy/fraud | Strong AP/bank/payment controls; new document, PO, receipt, and exception surfaces need the same sensitive-action discipline. |
| Frontend/design/accessibility/localization | Read models exist; full role mutation workbenches and EN/FR accessibility evidence are incomplete. |
| Product/business process | PO-to-payment core exists; need-to-order and correction loops are incomplete. |
| Purchasing/supplier/AP | AP kernel is a major strength; match exception, requisition, sourcing, and return workflows are missing. |
| Inventory/warehouse | Stock event foundation is strong; arrival/acceptance split, receipt race safety, return, and offline flow are missing. |
| Finance/accounting/treasury/close | Invoice/payment evidence is strong; GRNI receipt posting and full correction tie-out are blocked. |
| OHADA/SYSCOHADA/tax/country pack | Blocked pending qualified review; no account/tax treatment is certified or invented. |
| Audit/records/data quality | Audit/business events exist; immutable document artifact, secure attachment, delivery, and retention model is needed. |
| Payments/providers/reconciliation | Controlled approval/release and recon queue exist; no provider activation or settlement certification is claimed. |
| QA/release/accessibility | 50 focused tests and most gates pass; inventory gate fails and race/browser/a11y evidence is outstanding. |
| SRE/DevSecOps/observability | Outbox/blocker patterns are useful; new workflows need metrics, alerts, retry/DLQ/runbooks and correlation IDs. |
| API/webhook/import/export | Reuse protected actions and outbox; secure document upload/provider webhooks need explicit contracts. |
| Analytics/data governance | Partial: add GRNI aging, exception SLA, supplier/award/spend metrics with documented grains. |
| SaaS packaging/operations | Use existing purchasing/AP entitlements; gate P0 features separately and provide role training/runbooks. |
| AI/agent safety | Not applicable to current truth; optional OCR only in P2 with human confirmation and evaluation evidence. |

## 18. Implementation-ready optional next prompts

### Prompt A — P0 atomic numbering and receiving

Implement only the DocumentSequence and idempotent/concurrency-safe purchase receipt slice. Preserve the current inventory stock-event kernel. Add an additive migration, same-key/different-payload protection, atomic PO-line claims, unique retries, and real PostgreSQL parallel tests. Do not add inspection, GRNI, or UI changes in this slice.

Exit: 20+ parallel numbering calls are unique; parallel receipts never exceed ordered quantity; stock, receipt lines, and PO cumulative quantities tie; inventory boundary gate passes.

### Prompt B — P0 inspection and GRNI

Implement arrival, inspection/quarantine, accepted GRN, and receipt-side GRNI posting using versioned country/accounting policy resolution. Default to a visible blocker when mappings are not qualified. Do not hardcode account numbers or tax rules. Preserve original receipts and use linked corrections.

Exit: accepted/quarantined/rejected quantities balance; only accepted stock is available; receipt posting is balanced/idempotent; invoice clears GRNI once; close blockers and reversals are tested.

### Prompt C — P0 match exception and AP workbench

Implement versioned MatchPolicy/MatchException with independent approval, evidence, expiry, and limits, then expose existing AP prepare/post/payment actions in role workbenches. Server derives tenant, actor, totals, document numbers, policy, and ledger state. Add robust denied/stale/blocked/retry UI states.

Exit: exact matching remains default; exceptions cannot self-approve or exceed policy; source PO/GRN facts remain immutable; browser and security tests pass.

### Prompt D — P0 returns, credits, and documents

Implement secure DocumentArtifact/DocumentDelivery plus PurchaseReturn and supplier-issued SupplierCreditNote capture. Generate controlled PO, GRN, inspection, remittance, and accounting artifacts; never create a supplier invoice/credit note or label a GRN as a sales fiscal receipt.

Exit: original posted documents cannot be edited; return-before/after-invoice and credit-note postings tie inventory, GRNI, AP, payment/reconciliation, and close without double counting.

## 19. Final readiness statement

Stoquify is **ready to begin P0 hardening on top of a credible existing control kernel**. It is **not ready to be represented as a complete enterprise procure-to-pay, receipt-accounting, or certified OHADA purchasing system** until the critical receipt race, GRNI, inspection, match-exception, return/credit, document-evidence, operator-surface, country-pack, and inventory-boundary blockers are closed with the specified evidence.
