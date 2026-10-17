# Receivables history proof labels — 2026-10-16

## Scope

Presentation-only changes to `components/finance/AROpenItemsHistoryWorkbench.tsx` and the `arHistory` translations in `messages/en.json` and `messages/fr.json`. Preserve the existing unrelated return-navigation/export-permission changes in the same files. No records, ledger entries, hashes, lifecycle states, totals, permissions or export scope were modified.

## Findings and changes

The history read model returns posted customer receivable documents, including settled/partial records. It requires a lifecycle state at the requested effective/recorded boundary and rejects negative or non-conserving nonterminal balances. Its `posted` evidence grade describes the receivable record, not a certified accounting close. The type also retains an `operational` grade; this must not be presented as posted or certified.

- Header: replace “Proof pending” with “Not certified” and explain that posting status is shown per item while close certification is not included.
- Table, drawer and mobile cards: translate `posted` to “Posted receivable” / “Créance comptabilisée”, and `operational` to “Operational record” / “Enregistrement opérationnel”. An unexpected grade displays “Evidence status unavailable”.
- Reuse the existing opt-in proof-summary wrapping support. Mobile cards now include the same evidence label as desktop. Search matches both the original grade and displayed translation.
- Keep the existing `isPartial={false}` data-coverage behavior; do not infer certification from it or change server evidence validation.

## Verification

- Source: reviewed the current component, hook, server open-item resolver, page contract and prior shared badge wrapping implementation. Applied the established project UI/UX guidance for complete essential text and responsive wrapping; no new tokens or framework APIs.
- Workflow contract: `npm run agent:workflow:check` passed. Scoped whitespace check passed and both translation JSON files parsed.
- Mocked tests: the six existing `ar-open-item.service.test.ts` tests passed, including missing-lifecycle failure, currency separation and reversal behavior. Six component tests passed on rerun, including desktop/mobile grade parity, unknown-grade fallback, drawer amounts, error-state row suppression and existing pagination/search/export behavior. The initial run had three test-selector failures because the same explanation appears twice; the assertion was corrected without changing production behavior.
- Commands: `node node_modules/jest/bin/jest.js --config .codex-tmp/ar-proof-labels.jest.cjs --runInBand --no-cache`, followed by the same config with `--runTestsByPath components/finance/__tests__/AROpenItemsHistoryWorkbench.test.tsx` after the assertion fix. The reviewed local setup mocks database construction and the receivable-document dependency; these are not real-database tests.
- Browser: authenticated accountant in Wilkinson - Feeney 001. French history loaded 12 records, 197,201 XAF open/overdue and nine settled. All rows showed “Créance comptabilisée”; the header separately stated “Non certifié”. An initial development ChunkLoadError resolved after reload. French mobile explanation and all 12 evidence labels had equal client/scroll dimensions at approximately 391 and 320 CSS pixels, without horizontal overflow.
- No database tests, migration, repair, posting, build or deployment ran for this change.

French mobile evidence: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/receivables-proof-mobile-fr-header.jpg` and `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/receivables-proof-mobile-fr-cards.jpg`.

English browser verification also reached Table ready with the same 12 records, 197,201 XAF open/overdue and nine settled. Desktop (approximately 1594 CSS pixels) displayed all 12 “Posted receivable” labels and the separate “Not certified” explanation. At approximately 391 CSS pixels all 12 mobile labels had no clipping. The selected SO-004 details retained 73,635 XAF opened, 18,409 allocated and 55,226 open, with the translated evidence grade. No claim of close certification was introduced.

English evidence: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/receivables-proof-desktop-en.jpg`, `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/receivables-proof-mobile-en-header.jpg` and `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/receivables-proof-mobile-en-cards.jpg`.

Rollback: revert only this component's evidence-label rendering, opt-in wrapping, translation edits and added test assertions. Preserve prior user work and the shared Payables label changes.

## Status translation follow-up — 2026-10-16

The history table, mobile badges and detail drawer displayed raw lifecycle status codes. They now use `arHistory.status` messages in EN/FR. French labels are Ouverte, Partiellement réglée, Réglée, Annulée and Invalidée. Search also matches translated status text. Badges allow wrapping. This is presentation-only; no lifecycle state, balance, permission, export or evidence-certification behavior changed.

- Source checks: locale JSON parsing, all five status keys and scoped `git diff --check` passed. `npm run agent:workflow:check` passed.
- Mocked tests: the existing component suite passed all 6 tests using `node node_modules/jest/bin/jest.js --config .codex-tmp/ar-proof-labels.jest.cjs --runInBand --runTestsByPath components/finance/__tests__/AROpenItemsHistoryWorkbench.test.tsx`. No new database tests or data writes.
- Rendered browser: French Receivables history, accountant in Wilkinson - Feeney 001, desktop approximately 1377 × 797 CSS pixels and mobile 391 × 844. All 12 records displayed localized status text: nine Réglée and three Partiellement réglée. The longer status wrapped on desktop and fit on mobile; all three mobile partial badges measured 130 px client/scroll width and 20 px client/scroll height. Existing proof labels remained visible. Local refresh was slow and required a reload before records returned; screenshots were captured only after loading completed.
- Screenshots: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/receivables-status-desktop-fr.jpg` and `receivables-status-mobile-fr.jpg` in the same directory.
- Rollback: remove only this follow-up's status messages, translated display/search calls and badge wrapping classes. Preserve earlier proof-label work and unrelated edits.

## Aging translation follow-up — 2026-10-16

Mobile subtitles and the desktop/mobile detail drawer now use `arHistory.aging` translations instead of raw bucket codes. French labels: Sans retard; 1 à 30 jours de retard; 31 à 60 jours de retard; 61 à 90 jours de retard; Plus de 90 jours de retard. Search includes raw and localized bucket text. The existing service assigns zero days past due to settled balances, so Sans retard avoids implying that every `current` record has a future due date. Aging calculations, balances, permissions and exports remain unchanged.

- Source: inspected the bucket boundaries and zero-balance handling. Workflow contract, scoped whitespace check, JSON parsing and all five EN/FR message keys passed.
- Mocked component suite: all 6 existing tests passed with the same scoped Jest command above (123.753 seconds). No database tests, writes, build or deployment.
- Browser: French accountant session, desktop approximately 1377 × 797 and mobile 391 × 844 CSS pixels. Desktop SO-001 detail drawer shows Sans retard. All 12 mobile cards contain translated aging labels, with no horizontal card overflow and no raw `current` or unresolved aging keys. Cards for SO-002/003/004 show both Sans retard and Plus de 90 jours de retard, alongside the translated status/proof labels. Open AR remains 197,201 XAF. Reload refreshed the stale development message catalog after transient missing-message logs during hot replacement; captured UI shows resolved translations.
- Evidence: `receivables-aging-desktop-fr.jpg` and `receivables-aging-mobile-fr.jpg` under the same absolute visualization directory recorded above.
- Rollback: revert only the aging message entries and the three display/search uses added in this follow-up.

## Remaining French interface labels — 2026-10-16

Reviewed the complete `arHistory` message namespace, page metadata, workbench, shared shell controls and ledger allocation types. The remaining English interface content was the browser-tab metadata, the raw CUSTOMER_RECEIVABLE_DOCUMENT label in the drawer and raw ledger-type allocation labels. French copy also contained AR shorthand, unaccented labels and literal “Allocations”.

- Localized page metadata through `getTranslations`; retained the existing finance access guard.
- Replaced the drawer document-type label with Document de créance client, translated all ten ledger allocation types in EN/FR, and retained the original reference identifier with safe word wrapping.
- Revised only the French history namespace for clear headings, organization scope, counts, filters, actions, amount labels, Ancienneté and Affectations. Search placeholders now describe the already implemented search in both locales. Customer names, reference IDs, currencies and financial records retain their recorded values.
- Checks: workflow contract and scoped whitespace check passed. Actual `next-intl` translator resolved all allocation keys and plural counts in EN/FR. The existing six mocked component tests passed (42.221 seconds), using the scoped command above. No database tests, writes, posting or deployment.
- Browser: authenticated accountant, French history ready with 12 records and 197,201 XAF open/overdue. Desktop approximately 1232 × 797 CSS pixels; mobile 391 × 844, with a 391 × 652 view for the lower drawer. Reviewed complete page text and SO-004 drawer text. Drawer preserved 73,635 initial, 18,409 allocated and 55,226 remaining XAF. All 12 mobile cards and the mobile drawer had no horizontal overflow. The current demo drawer has no allocation rows, so populated allocation-type labels were verified through source and real translation resolution, not a live allocation row.
- Screenshots in the visualization directory above: `receivables-french-audit-desktop.jpg`, `receivables-french-audit-desktop-drawer.jpg`, `receivables-french-audit-mobile.jpg`, `receivables-french-audit-mobile-drawer.jpg`, `receivables-french-audit-mobile-drawer-lower.jpg`.
- Rollback: revert only this follow-up’s namespace copy, drawer type/allocation rendering, identifier wrapping and localized route metadata. Preserve all earlier status/proof/aging work and unrelated edits.
