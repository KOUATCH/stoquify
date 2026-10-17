# French Payables history and drawer verification — 2026-10-16

## Scope

Presentation-only changes to Payables history, its invoice/payment detail labels, and the toolbar fallback for this exact route. No database records, accounting evidence, posting rules, permissions, exports or certification rules were changed. Existing unrelated working-tree changes were preserved.

## Changes

- Localized the browser title and description with the route locale.
- Used existing French navigation labels for the Payables-history toolbar fallback and breadcrumb when the Purchases navigation group is unavailable to the current role.
- Translated document types, payment business states and known partial-source names instead of displaying internal enum/table names.
- Improved French history/filter/table/drawer wording, accents and result-count pluralization; shortened the unavailable-search placeholder to fit mobile.
- Allowed status labels, source identifiers and evidence hashes to wrap. Invoice proof warnings and draft/not-posted semantics remain unchanged.
- Business names, document identifiers, currency codes and timezone identifiers retain their original values.

## Source inspection

Reviewed APHistoryWorkbench, its export dialog, the route, toolbar fallbacks, service row types, SupplierPaymentStatus values and the existing translation namespaces. English/French message JSON parsed and the new next-intl keys resolved. Scoped git diff whitespace checks passed. The project workflow contract check passed; unclassified application/database scripts were not executed.

## Mocked tests

Ran the existing APHistoryWorkbench component suite using the inspected local configuration:

`node node_modules/jest/bin/jest.js --config .codex-tmp/ap-proof-labels.jest.cjs --runInBand --runTestsByPath components/purchasing/__tests__/APHistoryWorkbench.test.tsx`

14/14 passed, including partial-proof warnings, unverified evidence, retained hash visibility and export permission checks. These are mocked component tests, not database or rendered-browser certification. The final shortened placeholder was subsequently checked in the browser.

## Rendered browser checks

Local app: `/fr/dashboard/purchases/payables/history?lane=invoice`, Wilkinson - Feeney 001, accountant session. Checked desktop and mobile responsive layouts using the in-app browser; reset the viewport override afterwards.

- History finished loading and displayed 12 draft invoices. Summing document amounts from rendered desktop table cells yielded **22,231 XAF**. Recognized payable balance remains **0 FCFA** because the invoices are unposted drafts.
- French toolbar, browser title, filter, column, status and proof labels were visible.
- Opened invoice RDS001-INVOICENUMBER-012 and checked its French drawer description, document identity, proof and origin fields on desktop and mobile.
- Mobile drawer measured clientWidth 347 and scrollWidth 347: no horizontal overflow. Visually checked wrapping of the source identifier and proof wording. Mobile cards displayed the full draft-proof label.
- Reloaded after shortening the search placeholder and visually confirmed `Recherche indisponible` fits.
- Demo rows do not cover every payment state. Other payment-state translations were checked through source and translation resolution, not claimed as live rendered-state coverage.

## Database tests

None run. Browser verification used the existing demo data through normal application reads. No data repair, migration, payment, posting, export submission or deployment was performed.

## Screenshots

Saved under `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/`:

- `payables-french-audit-desktop-overview.jpg`
- `payables-french-audit-desktop.jpg` (table viewport)
- `payables-french-audit-desktop-drawer.jpg`
- `payables-french-audit-mobile.jpg`
- `payables-french-audit-mobile-drawer.jpg`
- `payables-french-audit-mobile-proof.jpg`

These are unedited viewport captures; longer pages and drawers scroll vertically.

## Payment-history follow-up — 2026-10-16

### Change and source inspection

Reviewed the payment lane and payment drawer, including payment-state labels, reconciliation-link copy and bank-destination redaction. Shared payment status/type labels were already translated by the preceding change. One remaining English fallback was found in source: the bank-redaction policy supplies `[REDACTED:BANK]` directly to the drawer.

The drawer now renders `Coordonnées bancaires protégées` / `Bank details protected` when the server-provided redaction metadata identifies protected supplier bank details. The server policy, permissions, redacted payload and financial data are unchanged. Missing bank details still render `Non renseigné`; permitted masked bank values remain intact. Business names and stable payment/source identifiers are not translated.

Owned follow-up edits: APHistoryWorkbench bank-destination presentation, one apHistory proof key per locale, four component-test cases, and this report. Rollback only these follow-up hunks; preserve earlier translation and unrelated working-tree changes.

### Verification

- Workflow check was rerun and **failed** due to reviewed-file drift in the unrelated `services/pos/__tests__/checkout-lifecycle.service.test.ts` fingerprint for `test:ecc:pilots`. That file and the registry were left unchanged. No pilot script was executed.
- Inspected the existing scoped Jest configuration and component mocks before running the same direct component command recorded above. **18/18 passed**, including protected-marker localization, hiding a supplied bank value when redaction metadata requires it, retaining an allowed masked value, and the missing-value fallback. These are mocked tests, not real authorization/database tests.
- EN/FR message JSON parsed successfully and the new key plus existing payment-state translations resolved. Scoped `git diff --check` passed.
- Browser: `/fr/dashboard/purchases/payables/history?lane=payment`, existing accountant session in Wilkinson - Feeney 001. Waited until ready: 12 draft payments, released-payment total **0 FCFA**. Checked French history filters, rows/cards, proof wording and payment drawer RDS001-PAYMENTNUMBER-012 (1,204 XAF).
- Desktop override 1700×1000 and mobile override 539×900 were used for responsive verification. Mobile drawer clientWidth and scrollWidth were both 347; source identifiers and long French proof labels wrapped without horizontal overflow. Scrolled through the full drawer, including the bank destination and dates. Reset viewport afterwards.
- Existing demo payment 012 has no bank destination and displays `Non renseigné`. The protected-bank branch was verified with mocked component tests, not fabricated browser data. Approved/released/posted/failed/cancelled payment states were reviewed in source; the live sample contains drafts.
- No database tests, writes, repairs, payment execution, export submission, migration or deployment were performed.

### Payment screenshots

Same screenshot directory as above:

- `payables-payments-fr-desktop-history.jpg`
- `payables-payments-fr-desktop-drawer.jpg`
- `payables-payments-fr-mobile-history.jpg`
- `payables-payments-fr-mobile-drawer.jpg`
- `payables-payments-fr-mobile-proof.jpg`

## Draft-payment proof-label follow-up — 2026-10-16

Extended the existing draft proof label to payments whose business status is exactly `DRAFT`, control state is `draft`, movement state is `not_recognized`, and no evidence hash exists. The shared presentation helper supplies the desktop table, mobile card and drawer fallback, using the existing translations `Brouillon — non comptabilisé` / `Draft — not posted`.

Unverified movement warnings retain priority; stored evidence hashes remain visible. Approved payments can map to the draft control state, so the explicit `DRAFT` business-status check prevents relabeling approved payments as drafts. Released/posted/cancelled payment evidence fallbacks and all financial, permission and server controls are unchanged. No database writes or database tests were performed.

Source inspection confirmed that the financial resolver distinguishes clean unrecognized payments from records with unexpected posting/ledger evidence. Added eight mocked payment cases covering draft, unverified, retained-hash, approved, cancelled, released and posted behavior across table, card and drawer. The current workflow contract check and scoped whitespace check passed. Existing EN/FR translation keys were read successfully.

The inspected scoped component command recorded above completed successfully: **26/26 tests passed**, including all eight new payment cases. This is mocked component evidence, not browser or database verification.

Browser verification is blocked for this follow-up: the existing tab, tab inventory and reconnect after resetting the browser tool session all failed with a closed transport. The browser inventory returned no available browsers and the same transport error. No new screenshot was captured; screenshots above belong to the preceding payment-label audit and do not verify this draft-payment change.

### Browser retry — connection restored

The subsequent user-requested retry restored access to the same in-app browser and existing accountant session. On `/fr/dashboard/purchases/payables/history?lane=payment`, the loaded desktop table contained 12 occurrences of `Brouillon — non comptabilisé`, one for each draft payment. Released payments remained 0 FCFA. The horizontally scrollable desktop table was scrolled to its Justificatifs column for the screenshot.

Opened RDS001-PAYMENTNUMBER-012 and confirmed the same draft wording in the drawer on desktop and mobile. The mobile drawer had clientWidth 347 and scrollWidth 347, with the full proof label readable. This retry performs application reads and screenshots only; no code or financial records were changed and the previously passing 26 mocked tests were not rerun.

Confirmed the mobile history's 12 draft-proof labels in the accessibility tree and visually checked the first cards: the complete French label and details action fit clearly. Desktop and mobile overrides were 1700×1000 and 539×900, respectively, and were reset after verification. One mobile accessibility snapshot timed out after scrolling; the subsequent screenshot succeeded and showed the intended cards. The previous browser-verification blocker is resolved.

Fresh screenshots saved in the same directory listed above:

- `draft-payments-fr-desktop-history.jpg` (table scrolled horizontally to Justificatifs)
- `draft-payments-fr-desktop-drawer.jpg`
- `draft-payments-fr-mobile-history.jpg`
- `draft-payments-fr-mobile-drawer.jpg` (drawer scrolled to the proof and source sections)

## English payment-proof verification — 2026-10-16

Switched the existing accountant session to `/en/dashboard/purchases/payables/history?lane=payment`. The ready desktop table displayed 12 draft payments and 12 `Draft — not posted` evidence labels. Recorded released payments remained FCFA 0, and the operational-history/non-certification warnings remained visible. The existing English wording was clear and required no source or translation changes. Desktop history was captured with the table scrolled to the Evidence column.

The selected payment drawer (RDS001-PAYMENTNUMBER-012, FCFA 1,204) showed `Business state: Draft` and `Evidence hash: Draft — not posted` on desktop and mobile. At mobile width the drawer measured clientWidth 347 and scrollWidth 347; its proof text fit without horizontal overflow. Navigation was slow, so the drawer was opened through its direct selected-payment URL and verified only after `Table ready` appeared. A mobile DOM read timed out; the subsequent screenshot clearly verified the proof section.

Mobile history also contained all 12 `Draft — not posted` labels. Visually checked the first cards and their details buttons: labels fit clearly. Desktop/mobile overrides were 1700×1000 and 539×900 and were reset afterwards. This was browser verification only, with no data writes or new test run; the prior 26-test result remains separate mocked evidence.

Fresh English screenshots in the directory above:

- `draft-payments-en-desktop-history.jpg`
- `draft-payments-en-desktop-drawer.jpg`
- `draft-payments-en-mobile-history.jpg`
- `draft-payments-en-mobile-drawer.jpg`
