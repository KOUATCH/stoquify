# Demo Payables repair — 2026-10-16

## Scope and outcome

Applied only to the 12 synthetic supplier invoices `rds_org_001_supplier_invoice_001` through `_012` in organization `rds_org_001` (Wilkinson - Feeney 001), on local database `stoquify_replay_next_20260830`.

The seed attached draft payment allocations to unapproved draft invoices. The actual payment-request service only allows allocation to POSTED or PAYMENT_PENDING invoices. The AP evidence resolver correctly rejected the inconsistent draft records.

Archived and removed the 12 premature allocation links, totaling 13,326.00 XAF. Each original allocation, invoice and payment snapshot is retained in a database AuditLog record with action `DEMO_DRAFT_INVOICE_ALLOCATION_REPAIRED` and version `rds001-draft-ap-allocation-repair-v1`. No invoice or payment header, line, status, amount, previous audit, or unrelated allocation changed. No approval, posting or payment evidence was fabricated.

| Result | Before | After |
| --- | ---: | ---: |
| Draft invoice count | 12 | 12 |
| Draft document total (XAF) | 22,231.00 | 22,231.00 |
| Unverified invoice count | 12 | 0 |
| Recognized open payable (XAF) | unavailable | 0.00 |
| Paid / credited / released payment totals (XAF) | unavailable / unavailable / 0.00 | 0.00 / 0.00 / 0.00 |

Zero recognized payable is correct because these invoices are still drafts. They still require normal matching, approval and posting. The repair does not certify settlement or reconcile the general ledger. Existing matching exceptions and payment/bank workflow tasks remain.

## Verification

- Source inspection: payment-request eligibility and AP history evidence resolver reviewed; repair uses the actual resolver.
- Pure unit tests: 16 passed in `scripts/__tests__/repair-demo-payables-draft-allocations.node-test.cjs`. These do not prove database behavior.
- Real database: reviewed dry-run; serializable transaction rehearsal with verified full rollback; successful commit; subsequent read-only run returned ALREADY_REPAIRED, checked all 12 audit records, and confirmed zero unverified invoices and 0.00 XAF recognized payable. Full snapshot comparison preserved everything except the explicitly authorized allocation links, including a digest of all unrelated allocations.
- Browser: authenticated Payables page displayed All open invoices (0), Unverified evidence (0), no outstanding invoices, 12 draft invoices awaiting review, and recorded released payments 0.00 XAF. The page still displayed Refreshing and subsequent browser navigation/control timed out. A complete settled-page screenshot and invoice-history navigation could not be verified. The saved screenshot is a partial browser view, not proof of a completed refresh.

## Evidence and reproducibility

### Browser retry completed

On 2026-10-16, reopened `/en/dashboard/finance/payables` as ACCOUNTANT Nadia Essomba in the English locale for Wilkinson - Feeney 001. The initial page load completed. Explicitly clicked Refresh, observed the disabled Refreshing state, and then observed the enabled Refresh button again with a newer checked timestamp. The settled page retained 0 open invoices, 0 unverified invoices, 12 drafts awaiting review, and 0.00 XAF recorded released payments. A complete vertical screenshot including the payment totals and final scope notes was saved at `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-refresh-complete-oct16.jpg`. The browser's default viewport was restored after temporary desktop inspection. No data repair was rerun and no application code changed during this retry. This resolves the earlier refresh/screenshot verification limitation; invoice-history navigation was not part of this retry.

Runner: `scripts/repair-demo-payables-draft-allocations.cjs`.

### Invoice history browser verification

Subsequently opened `/en/dashboard/purchases/payables/history?lane=invoice` in the authenticated browser and waited for Table ready. The invoice-only history contained exactly 12 rows, references RDS001-INVOICENUMBER-001 through -012, all Draft and XAF, all Not recognized in supplier account. Summing the rendered document amounts using integer hundredths returned exactly 22,231.00 XAF. The displayed current remainder and released payments were both FCFA 0. The existing Proof pending/Partial proof scope labels remain: these are unposted drafts and this view does not attach certified close evidence. No records were changed. Screenshot including all 12 rows: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-invoice-history-12-drafts-oct16.jpg`.

### Explanation of remaining proof labels

Follow-up source inspection and browser observation confirmed three separate label conditions:

- Row-level Proof pending: `components/purchasing/APHistoryWorkbench.tsx` uses this translation whenever `row.accounting.evidenceHash` is null. This is expected for these synthetic drafts, whose document/evidence hashes were deliberately left unchanged. It does not mean the financial resolver still classifies their movements as unverified. A draft status alone does not require a missing hash; the label depends on the actual hash field.
- Header Proof pending: `TransactionHistoryWorkbenchShell.tsx` supplies a fixed unavailable proof summary unless a caller disables it. AP history does not disable it. The accompanying message says certified close evidence is not attached to this view. This is a page capability limitation rather than a per-invoice check or active background job.
- Partial proof scope: `historyCompleteness()` in `services/purchasing/ap-history.service.ts` always returns partial overall, while supplier invoice and payment sources are marked complete. The partial source is the accounting certification claim, which still requires release-fixture and close-control tie-out evidence. Repairing or posting these 12 invoices alone cannot remove this page-wide status.

No additional data repair is needed to preserve valid draft totals. Advancing these synthetic drafts to recognized liabilities would require genuine source/matching evidence and the normal approval/posting workflow. The existing labels could communicate the distinction more clearly, but neither fabricated hashes nor a forced complete flag would be a valid repair. No application code or invoice data was changed in this follow-up.

Verification classes: source inspected and current browser rows checked; no application unit tests or new database test executed in this follow-up. The read-only `npm run agent:workflow:check` failed on unrelated build-command manifest drift and the reviewed POS checkout-test fingerprint; those unrelated working-tree changes were preserved.

Local evidence directory: `.codex-tmp/rds001-draft-ap-allocation-repair-v1/` contains the immutable full before snapshot and rehearsal, apply and post-apply dry-run receipts. The durable database audit records also retain the original allocation data.

- Before SHA-256: `f634d5533bce733f67219a1aa0ab15b9b15f0be1cb59e6954736f83e63147465`
- After SHA-256: `92dde7450a64ef8c3f4b3a3b48a9ebcb3deeb76b5654d6f7c54d255ce79c6bf4`

The runner defaults to read-only dry-run, restricts execution to the named local nonproduction database and exact record IDs, requires the reviewed snapshot hash for mutation, and rejects partial or changed source data. Do not recreate these invalid allocations in normal operation; create valid allocations through the payment workflow after approval/posting. Any historical restoration requires explicit review of the archived before snapshots.

### Draft evidence label clarification

Updated the AP history presentation and English/French translations. A draft invoice classified as not recognized with no evidence hash now reads "Draft — not posted" ("Brouillon — non comptabilisé"). Inconsistent movements take precedence and read "Evidence needs review", even when a stored hash exists; that hash remains inspectable in the details drawer. Other missing hashes read "Evidence hash not recorded". Missing bank destinations read "Not recorded".

The page now explains "Operational history" and "Not certified", with a human-readable "Accounting certification" scope label. Server completeness remains partial; financial calculation, evidence validation, authorization and posting controls are unchanged. No database records or prior audit evidence were modified by this presentation change.

Verification:

- Source: inspected the narrow presentation change and retained the existing financial resolver and completeness flags. Used the project UI/UX skill's status-message guidance with existing components and tokens.
- Mocked/pure tests: 33 passed across APHistoryWorkbench and ap-history-financial; after the final wording adjustment, all 14 component tests passed again. These include draft recognition and inconsistent-evidence safeguards. Local scoped config: `.codex-tmp/ap-proof-labels.jest.cjs`.
- Real database tests: none added or rerun for this presentation-only change. The earlier repair audit trail remains unchanged.
- Browser: English draft rows and details drawer checked; French invoice history settled with all 12 draft rows and translated labels, zero current remainder, zero released payments and zero ledger blockers. The 12 displayed document amounts still total 22,231.00 XAF.
- Workflow check: blocked by unrelated POS checkout-test fingerprint drift; no unrelated registry changes made. Scoped diff whitespace check passed.

Final English browser reload also reached Table ready with all 12 "Draft — not posted" labels, the clarified page scope, and unchanged zero recognized remainder/released payments/ledger blockers. Complete screenshot: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-clear-draft-labels-en.jpg`. Temporary viewport override restored. Both final translation JSON files parsed successfully.

### Mobile proof label follow-up

Mobile inspection reproduced two presentation gaps: the header's badge truncated the certification explanation, and invoice cards omitted the desktop evidence column. Added an opt-in wrapping property to the existing ProofBadge, enabled only by AP history through its shell. AP mobile cards now reuse the same evidenceLabel function as desktop, retaining unverified-warning precedence and stored-hash visibility. No accounting service, data, audit record, permission or completeness logic changed.

The existing eight evidence cases now also exercise rendered mobile-card output. All 14 APHistoryWorkbench mocked component tests passed using the previously reviewed local config. The workflow contract check and scoped whitespace checks passed. No new database tests or writes were performed. The project UI/UX skill search returned Content / Essential Text Truncation and Responsive / Mobile First from ux-guidelines.csv; wrapping essential text applies to the existing Tailwind 3 components without changing tokens or framework APIs.

Initial rendered verification confirmed the full English header text wraps at 320 CSS pixels with equal client/scroll widths and no page horizontal overflow. Browser resizing uses a temporary override adjusted for the in-app browser's display scaling; 539 requested pixels produce approximately 391 CSS pixels. Final settled-page evidence is recorded below when available.

English mobile history then reached Table ready: 12 transactions, zero current recognized remainder, zero recorded released payments, zero ledger blockers. All 12 mobile evidence labels were visible with equal client/scroll widths (304 pixels). Header and scope notice were visually checked without clipping. Screenshots: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-proof-mobile-header.jpg` and `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-proof-mobile-cards.jpg`.

The additional French mobile navigation timed out repeatedly in browser control, so French responsive rendering is not claimed for this follow-up (the preceding desktop French check remains historical evidence). The viewport override was successfully reset and the history tab preserved. Keyboard/focus behavior was not retested for these non-interactive text changes. Rollback is limited to the opt-in wrapping prop, AP mobile-card evidence line and its test assertions; preserve earlier proof-copy changes and unrelated working-tree edits.

### French mobile retry completed

The subsequent browser retry succeeded on `/fr/dashboard/purchases/payables/history?lane=invoice`, authenticated as the same accountant. The page reached Tableau pret with 12 invoices. At approximately 391 and 320 CSS pixels, the full certification explanation and all 12 "Justificatifs: Brouillon — non comptabilisé" card labels fit without clipping: each visible label's scroll width/height equalled its client width/height. The smaller viewport had no page horizontal overflow. Visual inspection confirmed the scope badges stack and longer French text wraps clearly. No additional application code or invoice data changed; no tests or database repair were rerun. This resolves the preceding French mobile verification limitation.

Screenshots: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-proof-mobile-fr-header.jpg` and `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/payables-proof-mobile-fr-cards.jpg`. The normal viewport was restored and the tab preserved.
