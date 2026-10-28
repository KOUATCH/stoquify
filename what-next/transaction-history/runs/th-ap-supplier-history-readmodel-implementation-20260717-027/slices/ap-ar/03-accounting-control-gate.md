# Stage 03 Accounting Control Gate - AP Supplier History Backend Remediation

Status: PASS

Run: `th-ap-supplier-history-readmodel-implementation-20260717-027`  
Slice: `ap-ar`  
Active lane: `ap`  
Mode: implement

## Decision

The AP backend history read model now defines service-owned AP operational history semantics for supplier invoices and supplier payments. It is allowed to support Stage 05 UX and Stage 06 frontend delivery as an operational/posted history surface. It does not claim reconciled or system-certified AP close evidence.

## Evidence

- Supplier invoices increase payable through positive `signedPayableMovement`.
- Supplier payments reduce payable through negative `signedPayableMovement`.
- Effective time uses `invoiceDate` for supplier invoices and `paymentDate` for supplier payments; recorded time uses `createdAt`.
- Deterministic ordering uses effective time, recorded time, and ID.
- Summaries calculate invoice total, paid total, released payment total, open payable, posted invoice count, released payment count, and ledger blocker count from the server-side AP population.
- Ledger batch, business event, document hash, and evidence hash are surfaced per row where present.

## Verification

- PASS: `npm test -- services/purchasing/__tests__/ap-history.service.test.ts --runInBand` verifies signed movement, open payable summary, redacted bank destination, and cross-tenant cursor rejection.
- PASS: existing AP command tests passed earlier in the narrowed AP audit run: AP service/action controls, 2 suites / 23 tests.

## Residual Risk

Full AP subledger-to-GL control-account tie-out, disposable roll-forward fixtures, reconciliation proof, and close certification remain Stage 07/release-grade evidence work. No AR accounting claim is made.