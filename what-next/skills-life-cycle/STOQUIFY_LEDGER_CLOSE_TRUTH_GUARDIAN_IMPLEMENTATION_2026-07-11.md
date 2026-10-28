# Stoquify Ledger Close Truth Guardian Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-ledger-close-truth-guardian`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-release-evidence-ratchet`

## Scope

Trace manual and POS economic events from source document to posting batch, open period, balanced posted journal, accounting source link, ledger audit evidence, idempotent replay behavior, and certified close invalidation.

Selected implementation boundary:

- manual journal posting and reversal;
- POS sale posting;
- POS payment/tender posting;
- POS refund posting;
- POS void posting.

Purchasing/AP, payment reconciliation, inventory valuation, payroll, statutory mapping, and report presentation were not broadened into this slice.

## Audit Finding

Manual journal posting and reversal already invalidated certified close evidence. POS posting services already enforced active posting rules, balanced lines, postable accounts, open periods, posting-batch idempotency, source links, and ledger audit records, but they did not call the close-certification invalidation boundary.

A POS sale, payment, refund, or void posted after a close pack had been certified could therefore change ledger evidence without marking the overlapping certified close run and export stale.

The existing architecture graph placed POS posting services and `createLedgerPostingBatch` in the operational posting community while manual posting and close assurance lived in the accounting control community. The missing dependency was the explicit posting-to-close evidence seam.

## Implementation

### Accounting-Owned Invalidation Helper

Added `services/accounting/journal-close-invalidation.service.ts` with two service-owned operations:

- `recordPostedJournalCloseInvalidationInTx`
- `recordReversedJournalCloseInvalidationsInTx`

The posted-journal helper records `LEDGER_JOURNAL_POSTED` against the posting period, journal entry, posting batch correlation, entry date, and evidence identifier.

The manual-reversal helper records `LEDGER_JOURNAL_REVERSED` for both the original and reversal periods when they differ. Same-period targets are deduplicated before the close service is called.

Both helpers execute inside the caller's existing database transaction. If close invalidation cannot be recorded, the posting transaction fails rather than allowing ledger and certified-close truth to diverge.

### Manual Journals

`services/accounting/posting.service.ts` now uses the shared helper for posting and reversal. Existing actor/time control evidence is preserved, and posting-batch IDs are carried as correlation IDs.

Manual reversals preserve the original journal and create a linked reversal journal. They invalidate both affected periods because the original lifecycle changes and a new reversal entry is posted.

### POS Sale and Tender

`post-sale.ts` and `post-payment.ts` call the posted-journal helper only after:

1. the posted journal is created;
2. the accounting source link is persisted;
3. the ledger audit event is persisted.

Idempotent replay branches return the existing posted journal before the helper and do not emit duplicate invalidation evidence.

### POS Refund and Void

Refund and void share `pos-reversal-helpers.ts`. These workflows preserve original sale/payment journals and create new contra journals, so they invalidate the new posting period through `LEDGER_JOURNAL_POSTED` rather than claiming that the original journal was mutated.

## Evidence Ratchet

Added `scripts/ledger-close-truth-gate.js` and negative fixture tests. The gate verifies:

- posted and reversed journal helper contracts;
- original/reversal period targeting;
- same-period reversal deduplication;
- manual posting and reversal coverage;
- POS sale, payment, refund, and void coverage;
- source-link to audit to invalidation ordering;
- posting-period targeting;
- posting-batch correlation evidence.

Package command:

- `npm run ledger:close-truth:gate`

The command is now part of `npm run policy:gates`.

## Generated Evidence

- `what-next/ledger-close-truth-readiness.md`
- `what-next/ledger-close-truth-readiness.json`

Latest result: 10/10 checks ready and 0 blockers.

## Verification

Passed:

- Focused accounting Jest: 5 suites, 19 tests.
- Ledger-close gate Jest: 1 suite, 3 tests.
- Gate JavaScript syntax validation.
- Focused ESLint across accounting implementation, tests, and gate files.
- `npm run typecheck` with no diagnostics.
- `npm run ledger:close-truth:gate`: 10/10 ready, 0 blockers.
- `npm run policy:gates`: complete chain passed.
- `npm run error:boundary:fail`: 0 active unsafe findings.
- Scoped Git whitespace and artifact encoding checks.

The full policy chain retained the existing local warnings that production public-receipt and public-identity hashing secrets are not configured. No secret value was printed.

## Non-Claims and Residual Risk

- This slice does not certify OHADA/SYSCOHADA account mappings, tax treatment, or statutory financial statements.
- It does not apply or require a production database migration.
- Purchasing/AP creates posted journals through its own service path and remains outside this new manual/POS ratchet. Its close-invalidation and posting-proof coverage should be audited under `stoquify-purchasing-ap-consolidator`.
- Payment-provider, statement-import, reconciliation, and suspense invalidation producers exist, but their end-to-end cash tie-out and exception semantics remain for the payment-reconciliation skill.
- Static gate success proves required code seams. Focused tests prove invocation behavior, while live tenant evidence still depends on production data, scheduler health, and operator follow-through.

## Completion Decision

The selected manual and POS ledger-to-close gap is closed and protected by a fail-mode repository ratchet. New manual and POS postings can no longer succeed in the same transaction while silently leaving overlapping certified close evidence current.

## Next Recommended Skill Slice

Run `stoquify-payment-recon-cash-truth-moat` next, following the blueprint's maximum-results execution order. Trace bank, mobile-money, card, cash-drawer, POS tender, provider event, suspense, and ledger evidence into one defensible reconciliation chain; select the highest-risk remaining mismatch or unsigned-evidence gap for a narrow implementation pass.
