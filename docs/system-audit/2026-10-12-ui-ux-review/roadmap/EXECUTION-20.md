# Delivery 20 — Accountant table keyboard follow-up

Date: 16 October 2026. Packages UX06/UX07/UX10. Bounded browser acceptance and local journal-entry presentation fixes.

## Browser result

Actual Chrome ACCOUNTANT / Comptable session; French `/fr/dashboard/accounting`, measured viewport 320×844 CSS pixels. Tab from `Rechercher: Dernières écritures comptables` reached the named table region. Its client width was 232px, scroll width 1040px, `overflow-x: auto`, and tabindex 0.

ArrowRight moved the native scroll position from 0 to 53.33333206176758 after the scroll animation settled. Two more presses reached 160; fifteen further presses reached the full 808px range (`1040 - 232`). Focus remained on the region. The previous immediate zero-offset observation did not establish a keyboard defect. No custom keyboard handler was added to the shared table.

The screenshot timed out before ArrowLeft could run. A separate ArrowLeft attempt failed before dispatch, so reverse scrolling is **not verified**. The viewport reset returned success, but subsequent browser failure prevented measuring the returned size. Chrome later reappeared in inventory, but the original tab had no attached debugger; reattachment failed and a fresh-tab attempt timed out. This is a browser-control gap, not a sign-in diagnosis. No new screenshot is claimed.

## Local fixes found during continued source review

The manual journal-entry page had an unnamed horizontal overflow container with no explicit keyboard focus target. It now has an EN/FR region name, tabindex 0, a visible focus outline using existing tokens, and explicit column-header scope. Native arrow behavior is preserved, including arrow use inside account selects and text fields.

The same French page retained English headings, field labels, table headers, select placeholders and success notice. These interface strings now follow the existing route locale. Stored account/journal names remain source data. Field names, defaults, parsing, eligible account/journal filters, server actions, access checks and draft recovery are unchanged. No live draft was created or submitted.

The new journal page could not be reached through the failed browser connection. Its fixes are implemented locally; live EN/FR, reverse-scroll, field traversal and narrow-layout acceptance remain open.

## Verification by layer

- Source: workflow/registry, master/constitution, shared table/overflow CSS, manual draft page and form, existing permission/recovery tests reviewed.
- Workflow contract: `npm run agent:workflow:check` passed, exit 0; 196 unclassified commands remain.
- Mocked component tests: **16 passed**, one suite, exit 0 (55.901 seconds). Includes existing permission denial, failed/empty setup, stopped-write recovery, retained fields, uncertain transport, confirmed creation and duplicate-submit prevention; added EN/FR focus-region/label checks and French success notice. These are mocked submissions only.
- Production lint: passed, exit 0, scoped to the journal-entry page.
- Scoped TypeScript: passed, exit 0, covering the journal-entry page and its imported dependencies; no emit or incremental write.
- Browser: overview rightward scroll and focus verified as above; no post-change journal browser pass claimed.
- Real database tests: not run. Ordinary authenticated reads may create audit records; no financial mutation, build, migration, seed, export or deployment performed.

Reviewed commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery20.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-20-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.delivery20.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx"
```

The isolated Jest config uses Next's transform without an application directory, with actions/access/navigation mocked and no database setup. TypeScript disables emit and incremental writes. Lint does not use fix mode. These scoped commands were reviewed independently; they are not a claim that every package script is safe.

UI/UX Pro Max query `keyboard navigation scroll focus` returned Accessibility / Keyboard Navigation, applied to the explicit focus target. Smooth Scroll guidance concerned anchor links and was not applied to table key handling.

## Remaining acceptance

1. Recover Chrome control, verify overview ArrowLeft and Tab/Shift+Tab exit, and measure normal viewport after reset.
2. Verify the journal form in EN/FR at desktop and phone widths; traverse its named region and all line fields without submitting.
3. Actual Owner/Cashier journeys, populated delegated-client portfolio fixtures, actual screen reader, forced colors, reduced motion and broader theme/state coverage remain open.

## Ownership and evidence

Source revision during this delivery: `fe540161f9fa53c149cc662759567cacc1dbd136`, with unrelated working-tree edits preserved. [Baseline](evidence/delivery-20-baseline.json) records pre-edit bytes for the page, tests and roadmap; [owned patch](evidence/delivery-20-owned.patch) is relative to that baseline. Reverse only owned hunks after checking later overlap.

- [Browser observations](evidence/delivery-20-browser-observations.json)
- [Mocked test results](evidence/delivery-20-tests.json)

This is partial acceptance, not accounting-module or release certification.

## Live-check continuation — 16 October 2026

On the next user-requested continuation, Chrome inventory again exposed the French accounting overview. Attaching to that tab timed out. Opening the known French journal-entry route in a fresh Chrome tab also timed out; the subsequent inventory showed a blank tab, not verified journal content. A recovered Chrome binding could list tabs, but reading the overview failed while enabling browser focus emulation; screenshot capture also timed out. Browser numeric identifiers changed after a runtime reset and were reconciled against the Chrome inventory before further page inspection. No Edge session was used as Accountant evidence.

No ArrowLeft key was dispatched, no French journal content was observed, and no new responsive override, form submission or business mutation occurred. Existing rightward-scroll evidence above remains historical; reverse-scroll, Tab/Shift+Tab exit, journal labels/field traversal and normal-viewport measurement remain open. A request to reconnect the existing Accountant tab was sent to the user; no credential or new-role request was made.

Available checks completed: current journal page and draft-form source reviewed; page and test SHA-256 hashes match the Delivery 20 manifest; the freshly inspected `npm run agent:workflow:check` passed with exit 0 and 196 unclassified commands. No new source defect was established, so no production code was changed and the earlier passing component tests were not redundantly rerun. This continuation records a browser-control blocker, not a new implementation delivery or rendered acceptance pass.
