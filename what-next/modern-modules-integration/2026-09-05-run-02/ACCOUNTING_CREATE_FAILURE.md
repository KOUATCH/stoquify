# Accounting draft failure recovery

Evidence date: 2026-09-05. The existing journal-create page now wraps its unchanged server-rendered fields in a small client form. The server wrapper calls the same protected journal action and returns its safe structured outcome; only confirmed creation navigates to the journal queue.

A confirmed new-work stop keeps every header field and all six lines mounted and shows an EN/FR inline alert, focused for keyboard users. The explanation states that no journal was created and asks an authorized configuration owner to review reactivation. Its only link opens the existing journal queue; it grants no configuration authority. Validation failures likewise preserve the draft. Unknown transport outcomes disclose no raw exception and instruct the user to check existing records before another submission. There is no automatic retry.

Controls remain disabled before hydration and during submission. Confirmed success remains disabled while navigation completes, preventing a second click from sending the same draft again. No credentials or journal fields are stored in browser storage or failure URLs.

Changed application scope: the journal-create page, the new ManualJournalDraftForm.tsx beside it, and seven new moduleComposition.accountingCreate keys in each language. The original journal permissions, fresh-authentication policies, source validation, ledger controls, accounting formulas and database schema remain unchanged. Existing English form labels are not represented as newly localized.

Verification: 15 tests across three suites passed in 10.445 seconds; changed-file lint passed with no diagnostics. The page checks include EN/FR stopped feedback, all-field preservation, focus, queue links, unrelated validation, private network-error suppression and confirmed-only navigation/duplicate prevention. The existing domain test verifies a real admission denial creates no journal or audit effect. Evidence and post-test source hashes are in evidence/ACCOUNTING_CREATE_FAILURE_VERIFICATION.json. No new live database/browser journal-write proof or professional certification is claimed.

The original completion review is a preserved checkpoint. Its accounting failure finding is resolved by this follow-up; the parent owns history pagination, final application verification and current report consolidation. No POS/offline candidate, schema or customer activation was changed.
