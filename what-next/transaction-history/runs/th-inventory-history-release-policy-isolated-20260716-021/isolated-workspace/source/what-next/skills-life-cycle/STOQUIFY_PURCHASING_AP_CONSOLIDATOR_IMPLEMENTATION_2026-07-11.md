# Stoquify Purchasing AP Consolidator Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-purchasing-ap-consolidator`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-ledger-close-truth-guardian`
- `stoquify-release-evidence-ratchet`

## Scope

Trace purchase-order approval, goods receipt, inventory posting, supplier invoice matching, AP ledger posting, supplier payment approval and release, outbound reconciliation, audit evidence, hard-delete policy, Workflow Assurance, and certified-close invalidation.

Selected implementation boundary:

- posted supplier-invoice journals;
- posted supplier-payment journals;
- shared AP source-link, ledger-audit, and certified-close evidence ordering;
- a fail-mode purchasing/AP lifecycle ratchet.

The existing architecture graph places the PO workflow, `receiveItems`, and `applyInventoryReceipt` in the operational transaction community. The AP service is the shared finance boundary for supplier invoices, three-way match evidence, supplier balances, supplier payments, journals, source links, and reconciliation handoff. The selected change belongs in its shared ledger-posting helper rather than in an action or UI caller.

## Existing Control Spine

The audit confirmed these service-owned controls already exist:

- purchase-order approval blocks requester self-approval and records audit evidence;
- goods receipt, receipt lines, received quantities, inventory stock events, batches, and serials execute in one transaction;
- PO line replacement is limited to draft/submitted orders and blocked after receipt or invoice evidence exists;
- supplier invoices require received goods, cannot exceed uninvoiced receipt quantity, and reject price variance without an exception workflow;
- supplier invoices create deterministic duplicate, document, match, business-event, ledger-batch, and audit evidence;
- supplier bank changes, payment approval, and payment release enforce separate actors and fresh-auth action boundaries;
- payment release rechecks the approved destination, blocks pending bank changes, updates allocations, and creates outbound reconciliation evidence;
- six purchasing/AP Workflow Assurance checks monitor PO-to-receipt, receipt-to-stock, three-way matching, invoice posting proof, released-payment evidence, and pending bank-change release risk;
- the hard-delete gate permits only reviewed draft PO-line cleanup and blocks evidence-bearing purchasing/AP deletion.

## Audit Finding

`createAPLedgerPosting` already created a posted ledger batch, balanced journal entry, accounting source link, and `PURCHASING_AP_LEDGER_POSTED` audit event for both supplier invoices and supplier payments.

It did not call the certified-close invalidation boundary. A backdated supplier invoice or released supplier payment could therefore change an accounting period after close certification while the overlapping close run and export remained current.

This gap affected both AP source types because they share the same posting helper. Blocked postings did not create a journal and therefore did not require close invalidation.

## Implementation

`services/purchasing/ap-control.service.ts` now calls `recordPostedJournalCloseInvalidationInTx` from the shared AP ledger-posting helper.

The call executes inside the existing AP transaction and carries:

- organization ID;
- posted journal-entry ID;
- accounting period ID;
- source document date;
- ledger posting-batch correlation ID;
- AP actor and control time;
- an explicit purchasing/AP stale reason.

Ordering is now:

1. posted ledger batch and balanced journal;
2. accounting source link;
3. AP ledger audit event;
4. certified-close invalidation;
5. final supplier invoice or payment business event and source-record evidence update.

If close invalidation fails, the AP transaction cannot complete. Blocked ledger batches do not call the invalidation helper because no posted journal changed ledger truth.

## Evidence Ratchet

Added `scripts/purchasing-ap-consolidation-gate.js` and negative fixture tests. The gate verifies:

- PO maker-checker approval;
- atomic goods-receipt stock posting;
- evidence-preserving PO-line cleanup;
- supplier-invoice receipt quantity and cost controls;
- three-way-match evidence;
- AP ledger batch, journal, source-link, and audit proof;
- AP posted-journal close invalidation and ordering;
- supplier-payment maker-checker controls;
- approved destination, pending bank-change, and reconciliation controls;
- purchasing/AP Workflow Assurance and policy-gate wiring.

Package command:

- `npm run purchasing:ap:gate`

The command is now part of `npm run policy:gates`.

## Generated Evidence

- `what-next/purchasing-ap-consolidation-readiness.md`
- `what-next/purchasing-ap-consolidation-readiness.json`

Latest result: 10/10 checks ready and 0 blockers.

## Verification

Passed:

- Broadened Jest bundle: 7 suites, 79 tests.
- AP service and action tests.
- PO workflow and receipt-batch tests.
- Inventory stock-event tests.
- Workflow Assurance registry tests.
- Purchasing/AP gate tests with negative fixtures.
- Focused ESLint across implementation, test, and gate files.
- `npm run typecheck` with no diagnostics.
- `npm run purchasing:ap:gate`: 10/10 ready, 0 blockers.
- `npm run policy:gates`: complete chain passed.
- Hard-delete gate: 0 active unsafe findings.
- Workflow Assurance release gate: 37/37 checks ready, 0 blockers.
- Scoped Git whitespace validation.

The full policy chain retained existing local warnings that production public-receipt and public-identity hashing secrets are not configured. No secret value was printed.

## Non-Claims and Residual Risk

- This slice does not certify supplier documents, bank execution, tax treatment, SYSCOHADA mappings, or statutory reports.
- It does not apply or require a production database migration.
- `postSupplierInvoiceAction` currently derives both `createdById` and `approvedById` from the same authenticated actor. Posting is permission-gated and exact-match controlled, but this is not a true maker-checker invoice lifecycle. A separate prepare, approve, and post workflow should be implemented before requiring two-person invoice authorization.
- A supplier invoice can have business status `POSTED` while its ledger batch is `FAILED` and explicitly blocked pending posting rules. Workflow Assurance exposes the gap, but a dedicated accounting-pending or posting-blocked lifecycle state would make operational truth clearer.
- Goods-receipt stock posting and AP invoice posting remain separate economic events by design. Live tenant tie-out must prove that uninvoiced receipts and received-not-invoiced accounting are handled according to the approved policy.
- Static gate success proves required code seams. Production evidence still depends on valid posting rules, country packs, active journals, scheduler health, tenant data quality, and operator follow-through.

## Completion Decision

The selected purchasing/AP ledger-to-close gap is closed and protected by a fail-mode repository ratchet. Posted supplier-invoice and supplier-payment journals can no longer complete while silently leaving overlapping certified close evidence current.

## Next Recommended Skill Slice

Run `stoquify-offline-pos-fiscal-replay-finalizer` next, following the leadership blueprint order. Trace offline sale capture, device and tenant identity, sequence and hash chains, replay idempotency, quarantine, stock/payment/ledger effects, receipt and fiscal evidence, conflict recovery, and operator visibility; then implement the highest-risk missing replay or certification boundary with a fail-mode ratchet.
