# Stage 03 Accounting Control Gate - AP Supplier History

Status: PARTIAL

Run: `th-ap-supplier-history-security-accounting-20260717-026`  
Slice: `ap-ar`  
Active lane: `ap`  
Mode: audit

## What Passed

- AP service ownership exists in `services/purchasing/ap-control.service.ts`.
- Supplier invoice posting, supplier payment approval/release, bank-change controls, sensitive-action decisions, posting services, accounting periods, posting rules, business events, and country-pack resolution are represented in the AP service layer.
- Assurance/data-trust controls exist for AP three-way match proof, supplier invoice posting proof, released supplier payment evidence, pending supplier bank releases, open AP invoices, and supplier payments missing ledger batches.
- Tests exist for AP control service and AP control actions.

## Accounting Gaps Before Complete AP History

- The current AP workbench queues are not a complete AP subledger history. They cannot yet prove opening plus signed movement equals closing across supplier, currency, effective interval, and `recordedThrough`.
- No canonical AP history service currently exposes deterministic cutoff ordering, signed invoice/payment/credit/write-off/reversal semantics, or uncapped control-account tie-out evidence.
- Current AP page/read action is not a proof-grade AP history with export parity and source population guarantees.
- Stage 03 cannot yet claim AP history is `reconciled` or `system-certified`; the honest maximum for current AP command evidence is operational/posted where ledger batches and source links are present.
- AR remains outside this run and must stay blocked until AR prerequisites are explicit.

## Verdict

PARTIAL. AP command/accounting controls are strong enough to design the Stage 04 read model, but a complete supplier/AP transaction-history read model still needs to be implemented and verified before Stage 05/06 delivery.

## Focused Verification Added

- PASS: `npm test -- services/purchasing/__tests__/ap-control.service.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts "app/[locale]/(dashboard)/dashboard/purchases/payables/__tests__/page.test.tsx" --runInBand` - Jest ran 2 suites / 23 tests for AP service/action controls.
