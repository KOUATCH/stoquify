# Customer collection provider-receipt rendering — 10 November 2026

Status: **PASS for the rendered mocked-action scope**. The [final attempt](attempt-254a51fb41/RESULT.json) completed twelve scenarios in each English/French ×390/1440 variant: **48 recorded cases**. This is real browser rendering of the current `CustomerSettlementControls`, Button, Input and dashboard styles with explicitly mocked actions and parent authority. It is not an authenticated application, ledger, database, provider or production-build qualification.

The owner-confirmed [projection/action/component unit record](../UI_PROJECTION_RESULT.json) was checked before and after rendering. The [source binding](attempt-254a51fb41/SOURCE_BINDING.json), SHA-256 `b55a5f93cd51c927ab0e4ffc6df6c465beadca110a55ffbf3f107b1120efadd5`, binds fifteen actual source/configuration/fixture files and the emitted bundle, CSS and axe asset. The final result SHA-256 is `df1a91f095f4eb8950a70a01d1d4336e2fcc7ed42fdadf2e2b309f0cc0b3d19d`. The reviewed runner SHA-256 is `35ed9e7984862ae2abba5b77a50b866fb53d2c21ab76862497e0e00ebfeda171`.

## Executed scenarios

1. Manual entry is the default. Real keyboard selection of a long native receipt fills the reviewed amount, reference and UTC date; its full account label/reference/amount wrap outside the collapsed native option. A synthetic file is hashed by the browser and the mocked command receives the explicitly selected native ID.
2. Editing amount, payment date or method removes the native link.
3. An uncertain outcome holds the exact command and native ID even when a refreshed preview no longer lists that receipt; retry sends the same intent.
4. Password focus and mocked step-up do not automatically submit. The operator manually retries the unchanged command.
5. `AUTH_REQUIRED` from collection hides private cached fields and the selection; a successful current read restores the workspace.
6. `FORBIDDEN` does the same without displaying the mock's private diagnostic.
7. `TENANT_SCOPE_VIOLATION` does the same.
8. A failed current read removes the selection; a new successful read requires a fresh choice.
9. Changing collection permission clears the private form and selection. Restoring authority produces a new current read.
10. An old native-command completion is ignored after an actor change.
11. An old completion is ignored after an invoice/document change.
12. Unmounting fences a late completion.

There were sixteen observed same-origin browser requests, zero external requests, zero page/console errors and no horizontal document overflow at either width. Each variant's primary form axe check recorded zero violations and an incomplete color-contrast assessment. Browser, server and owned profile cleanup completed; no profile directory remained.

## Visual review and limits

The [French mobile selection](attempt-254a51fb41/fr-provider-selection-390.png) and [English desktop denial](attempt-254a51fb41/en-authority-denial-1440.png) were visually inspected. The mobile form remained in a single scrolling column with reachable wrapped action buttons; the denial removed amounts, input fields and receipt selection. Existing dashboard controls, focus rings and at least 44px inputs/buttons were retained.

A deliberately long collapsed native option truncates its text. The first visual review identified that its account label needed a separately visible review summary. The parent approved a small wrapped selected-confirmation summary with account label, full external reference and amount/currency, a localized label and polite live region. The current source and both mocked test batches were requalified, then all 48 rendered cases passed again. A subsequent whole-project compiler check identified duplicate comparisons that were unreachable after the earlier authority-denial branch. The approved one-line type-narrowing correction preserved the early authority hide and reachable error handling; 76 service/action tests, 22 component tests and all 48 rendered cases passed against the resulting component SHA-256 `1a08937f09bcbb906c365ce27f00898f96f54932cd33c93254e57c860e9d2f22`. The [exact preimage and focused correction record](../ui-type-fix/RESULT.json) are retained. The mobile French variant explicitly asserts the full visible summary and absence of the internal native ID. The browser's native date/file chrome uses its installed locale; these results verify the component's EN/FR labels, not platform-level French dialog localization.

There is no previous visual baseline, screen-reader evaluation, Core Web Vitals measurement or full accessibility claim. Contrast was incomplete. Only the primary form received axe analysis; denial/recovery behavior was exercised separately. Simulated `POSTED` action results are fixture responses and establish no journal, provider confirmation or financial state.

The runner uses installed Webpack with an explicit TypeScript loader and current Tailwind/app CSS. It loads no Next configuration, environment files, authentication module or database. A compile-time boundary rejects real action/server imports. The browser is restricted to an ephemeral loopback static server with `connect-src 'none'`; actions execute only in fixture memory. No raw action/request bodies, actual credentials, HAR or real documents were saved.

## Retained preliminary attempts

- [attempt-8ad9963652](attempt-8ad9963652/RESULT.json): the compile-time boundary rejected real action paths because a broad alias preceded exact mock aliases. No server or browser started. The fixture's alias ordering was corrected.
- [attempt-ae1a16083f](attempt-ae1a16083f/RESULT.json): the runner waited for a native option to be visible; closed native options are attached but hidden. The test now checks attachment and the visible select's selected value.
- [attempt-6b30aaf6d4](attempt-6b30aaf6d4/RESULT.json): restoring mocked backend receipt availability required an explicit new read before selection. The runner now performs that read. Three completed prefix scenarios are recorded; the full attempt remains failed.

All failed receipts and exact pre-correction runner copies remain retained. Every started preliminary browser/server closed, with zero remaining owned profiles. No product source changed during a browser attempt; the approved summary improvement occurred between retained runs.

The [pre-type-correction 48-case pass](attempt-92c96dfee4/RESULT.json), [prior report](attempt-92c96dfee4/RENDERED_COLLECTION_REPORT.before-typefix.md), [prior owner manifest](../UI_PROJECTION_RESULT_BEFORE_TYPEFIX.json), [earlier 48-case pass](attempt-cb414ee6ae/RESULT.json) and [pre-summary owner manifest](../UI_PROJECTION_RESULT_BEFORE_SUMMARY.json) remain historical evidence of the earlier component revision. Its exact fixture entries and runner were preserved beside that attempt. The current browser entry/mocks use `.test.tsx`/`.test.ts` filenames, so existing project test exclusions classify them correctly; no application-source compiler exclusions or type-check bypass were added.

Reviewed command: `node docs/stoquify-potential/development/close-monthly-qualification-2026-11-10/rendered-ui/run-rendered.cjs`. It accepts no target or authority override and creates a new attempt. Review its current source before executing it again.
