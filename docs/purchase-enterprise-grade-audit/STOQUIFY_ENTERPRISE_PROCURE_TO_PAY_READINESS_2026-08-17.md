# Stoquify Enterprise Procure-to-Pay Readiness Decision

Date: 2026-08-17  
Decision: **PARTIALLY READY — P0 hardening authorized; enterprise-complete claim blocked**

## Decision summary

Stoquify has a credible controlled core for purchase orders, partial receiving, inventory stock events, supplier invoices, AP postings, supplier-bank change approval, payment approval/release, reconciliation queueing, close invalidation, and audit evidence.

The system is not yet end-to-end enterprise ready because:

- concurrent receipt commands can validate and update against a stale PO snapshot;
- PO and GRN identifiers use non-atomic last-record-plus-one generation;
- goods receipt posts stock but leaves the explicit GOODS_RECEIPT_LEDGER_REVIEW blocker instead of authoritative GRNI;
- inspection/quarantine, match-exception approval, return-to-vendor/supplier credit note, secure document artifacts, and complete AP mutation workbenches are missing or partial;
- requisition, RFQ/award, change-order, service acceptance, and landed cost are not authoritative runtime workflows;
- country/account/tax treatment has not received the qualified review required for activation.

No production, security, privacy, accessibility, legal, tax, accounting, OHADA/SYSCOHADA, banking, or provider certification is claimed.

## Current strengths to preserve

- Server-owned organization and actor context in protected AP actions.
- PO creator self-approval prevention.
- Supplier-invoice maker/checker, duplicate fingerprint, idempotency, open-period and country-pack controls.
- Receipt-quantity and exact-price matching.
- Inventory stock-event kernel with concurrency-aware inventory-level mutation and valuation evidence.
- Supplier-bank maker/checker, fresh authentication, approved destination checks, audit, and event evidence.
- Payment approval/release idempotency, sensitive-action controls, ledger evidence, and outbound reconciliation.
- Service boundary, business-event/outbox, notification, close invalidation, and workflow-assurance foundations.
- Token-scoped supplier acknowledgement/change proposals.

## Blocking findings

| Code | Severity | Finding | Required P0 outcome |
|---|---|---|---|
| P2P_RECEIPT_CONCURRENCY | Critical | Receipt validation/cumulative update use a pre-transaction PO snapshot | Atomic claim/version or lock; same-key idempotency; real PostgreSQL race tests |
| P2P_DOCUMENT_SEQUENCE | High | PO/GRN number allocation is last+1 | Tenant-scoped atomic sequence and unique retry |
| P2P_GRNI_POLICY_MISSING | High | Receipt stock posts without authoritative GRNI | Qualified policy-driven balanced receipt posting and invoice clearing |
| P2P_INSPECTION_MISSING | High | Arrival becomes available without inspection/quarantine | Arrival, quarantine, accept/reject state and inventory controls |
| P2P_MATCH_EXCEPTION_MISSING | High | Exact mismatch has no complete controlled exception flow | Versioned policy, reason/evidence, independent approval, expiry |
| P2P_RETURN_CREDIT_MISSING | High | No complete linked return/credit correction | Immutable return, dispatch, supplier credit, inventory/GRNI/AP correction |
| P2P_DOCUMENT_EVIDENCE | High | No unified immutable purchase artifact/delivery service | Secure PO/GRN/inspection/invoice/remittance/accounting artifacts |
| P2P_OPERATOR_SURFACE | High | AP service/actions are not a complete role workflow | Protected mutation workbenches and browser evidence |
| P2P_COUNTRY_PACK_REVIEW | Release blocker | Account/tax mappings are not qualified in this audit | Effective-dated expert approval; block when absent |
| INVENTORY_BOUNDARY_VIOLATION | Release blocker | One runtime-like fixture directly creates inventoryLevel | Kernel use or safe reviewed seed-only classification |

## Receipt/document semantics

- A purchase order is the buyer’s commercial commitment.
- A GRN/purchase receipt is Stoquify operational evidence of quantities received/accepted.
- An inspection/rejection report is Stoquify acceptance evidence.
- A supplier invoice and supplier credit note are supplier-issued documents captured and verified by Stoquify; Stoquify must not invent them.
- Remittance advice is Stoquify payment notification after controlled release; it is not bank settlement proof.
- An accounting voucher/posting batch is internal ledger evidence.
- A GRN is never a sales fiscal receipt.

## Accounting invariant

Target accepted receipt:

- increase accepted/available inventory once;
- value it under an approved effective policy;
- debit inventory/approved asset-or-expense mapping and credit GRNI;
- retain source links and close invalidation evidence.

Target supplier invoice:

- clear the matched GRNI once;
- recognize only approved variance, charge, input-tax, or landed-cost lines;
- credit AP;
- never book the receipt quantity or base inventory value a second time.

Target payment:

- debit AP and credit a truthful bank/mobile-money/payment-clearing stage;
- queue/record provider settlement and reconciliation;
- keep pending, unknown, failed, suspense, and reconciled states distinct.

Returns and supplier credits must be linked corrections. Posted receipts, invoices, payments, and ledgers remain immutable.

## P0/P1/P2

### P0 — control chain

1. Clear the inventory-boundary gate.
2. Add atomic document sequencing.
3. Make receipt finalization idempotent and concurrency-safe.
4. Add arrival/inspection/quarantine.
5. Add qualified receipt-side GRNI posting and tie-out.
6. Add versioned match policies/exceptions.
7. Add secure immutable document artifacts and deliveries.
8. Expose AP/payment controls in role workbenches.
9. Add returns/supplier-credit corrections.
10. Apply risk/amount policy and fresh-auth classification to high-risk PO approvals.

Exit: inventory, GRNI, AP, payment clearing/reconciliation, return/credit, and close equations balance with no double counting; all P0 gates and race tests pass.

### P1 — procurement governance

Requisitions, spending authority, RFQ/quotes/award, conflicts, PO versions/change orders, service acceptance, landed cost, supplier qualification/performance, GRNI aging, and spend analytics.

### P2 — optimization

Governed offline receiving, advanced planning/analytics, optional human-confirmed OCR/anomaly recommendations, and connector-specific automation. No offline critical approval/payment release and no autonomous posting.

## Verification result

| Check | Result |
|---|---|
| Purchasing/AP consolidation gate | PASS — 11/11 |
| AP fraud-control gate | PASS — 9/9 |
| Inventory boundary gate | **FAIL — 1 active violation** |
| Service boundary gate | PASS — 0 active violations |
| Workflow assurance runtime table check | PASS — 7/7 tables and 3/3 migration rows |
| Prisma validate | PASS |
| TypeScript typecheck | PASS |
| Audit-focused Jest | PASS — 6 suites, 50 tests |
| Attached-prompt exact Jest path set | PASS — 6 suites, 45 tests |

Generated evidence is stored in the evidence subfolder, and exact commands are recorded in STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_VERIFICATION_2026-08-17.md. The failed inventory gate is a real release-gate outcome and is not suppressed.

## Release posture

- **Allowed:** design and implement separately gated P0 slices using additive migrations and current service-owned foundations.
- **Blocked:** enterprise-complete marketing/release claim; authoritative GRNI activation; tax/statutory claims; real supplier payment/provider activation; automated tolerance override; autonomous OCR posting; offline approval/payment release.
- **Required before claim:** critical blockers closed, qualified policy review, PostgreSQL concurrency proof, accounting tie-out, protected browser workflows, security testing, migration rehearsal, and accessibility evidence.
