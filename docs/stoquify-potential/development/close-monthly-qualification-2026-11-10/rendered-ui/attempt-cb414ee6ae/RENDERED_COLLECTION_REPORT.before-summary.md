# Customer collection provider-receipt rendering — 10 November 2026

Status: **PASS for the rendered mocked-action scope**. The [final attempt](attempt-cb414ee6ae/RESULT.json) completed twelve scenarios in each English/French ×390/1440 variant: **48 recorded cases**. This is real browser rendering of the current `CustomerSettlementControls`, Button, Input and dashboard styles with explicitly mocked actions and parent authority. It is not an authenticated application, ledger, database, provider or production-build qualification.

The owner-confirmed [projection/action/component unit record](../UI_PROJECTION_RESULT.json) was checked before and after rendering. The [source binding](attempt-cb414ee6ae/SOURCE_BINDING.json), SHA-256 `39e09d7f935845ace95c5fe13e512e9f579e301027bbe48c8046780c1fef4cbd`, binds fifteen actual source/configuration/fixture files and the emitted bundle, CSS and axe asset. The final result SHA-256 is `64b20bb204bb59d7c2a56c1b38dae1a677d6eb5424c6f5b653395c7222fe7f76`.

## Executed scenarios

1. Manual entry is the default. Real keyboard selection of a long native receipt fills the reviewed amount, reference and UTC date; a synthetic file is hashed by the browser and the mocked command receives the explicitly selected native ID.
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

The [French mobile selection](attempt-cb414ee6ae/fr-provider-selection-390.png) and [English desktop denial](attempt-cb414ee6ae/en-authority-denial-1440.png) were visually inspected. The mobile form remained in a single scrolling column with reachable wrapped action buttons; the denial removed amounts, input fields and receipt selection. Existing dashboard controls, focus rings and at least 44px inputs/buttons were retained.

A deliberately long collapsed native option truncates its text. Amount, full reference and date remain available in their own fields; the account label is inside the native option. A wrapped selected-account summary is a possible operator-review improvement and has been reported to the parent without changing frozen product code. The browser's native date/file chrome uses its installed locale; these results verify the component's EN/FR labels, not platform-level French dialog localization.

There is no previous visual baseline, screen-reader evaluation, Core Web Vitals measurement or full accessibility claim. Contrast was incomplete. Only the primary form received axe analysis; denial/recovery behavior was exercised separately. Simulated `POSTED` action results are fixture responses and establish no journal, provider confirmation or financial state.

The runner uses installed Webpack with an explicit TypeScript loader and current Tailwind/app CSS. It loads no Next configuration, environment files, authentication module or database. A compile-time boundary rejects real action/server imports. The browser is restricted to an ephemeral loopback static server with `connect-src 'none'`; actions execute only in fixture memory. No raw action/request bodies, actual credentials, HAR or real documents were saved.

## Retained preliminary attempts

- [attempt-8ad9963652](attempt-8ad9963652/RESULT.json): the compile-time boundary rejected real action paths because a broad alias preceded exact mock aliases. No server or browser started. The fixture's alias ordering was corrected.
- [attempt-ae1a16083f](attempt-ae1a16083f/RESULT.json): the runner waited for a native option to be visible; closed native options are attached but hidden. The test now checks attachment and the visible select's selected value.
- [attempt-6b30aaf6d4](attempt-6b30aaf6d4/RESULT.json): restoring mocked backend receipt availability required an explicit new read before selection. The runner now performs that read. Three completed prefix scenarios are recorded; the full attempt remains failed.

All failed receipts and exact pre-correction runner copies remain retained. Every started preliminary browser/server closed, with zero remaining owned profiles. No product changes were made during this rendered qualification.

Reviewed command: `node docs/stoquify-potential/development/close-monthly-qualification-2026-11-10/rendered-ui/run-rendered.cjs`. It accepts no target or authority override and creates a new attempt. Review its current source before executing it again.
