# Delivery 19 — Portfolio focus acceptance and accounting overview localization

Date: 16 October 2026. Packages UX06/UX07/UX10. Local implementation and bounded Accountant acceptance.

## Completed

1. **Viewport recovery:** the old portfolio tab remained detached from automation. A fresh tab in the same Chrome session restored access without changing credentials. The viewport reset succeeded and measured 1707×797 CSS pixels, with document client/scroll widths 1686/1686. This closes the previous restoration blocker for the working browser session.
2. **Portfolio refresh focus:** Enter on French `Actualiser` preserved focus on that button during the pending state (`aria-disabled=true`) and after the authorized read completed (`aria-disabled=false`). The visible focus ring was captured. No additional production change was needed for Delivery 18's fix.
3. **Accounting overview:** live `/fr/dashboard/accounting` showed English headings/actions/table controls, raw `IN_PROGRESS`/`POSTED` states and English dates. The page now consumes the locale already validated by its route guard, uses EN/FR overview copy, reuses existing journal-status translations and passes the locale to the shared table. Dates use the selected locale and UTC, consistent with the journal workspace. Unknown states remain unknown.

Summary figures, amounts, currency formatting, stored period names, action destinations and authorization remain unchanged. Raw server error text remains available through the existing error branch; its fallback and surrounding instructions are localized. This does not claim every backend error is translated. No shared money-formatting behavior or financial calculation was changed.

## Rendered coverage

Actual role: **ACCOUNTANT / Comptable**, Chrome. The session exposed four modules. No Owner/Cashier session was substituted.

| Route | Locale / viewport | State and result |
|---|---|---|
| `/dashboard/accounting/accountant-portfolio` | FR, 1707×797 | Empty mandate/work list; refresh pending and completed; keyboard focus stays on Actualiser in both states |
| `/dashboard/accounting` | FR, 1707×797 | Populated overview; translated header/actions/cards/table/statuses/dates; screenshot reviewed |
| Same | FR, 320×844 | Document widths 300/300; long translated content remains within document; screenshot attempt timed out, so this is DOM/layout measurement evidence |
| Same | FR, narrow default window | Search `Comptabilisée` returns all six loaded records; no-match query displays `Aucun résultat.`; query cleared; Tab from search focuses the named table region |
| Same | EN, narrow window | Locale link successfully transitions to English overview with readable setup/status labels and localized dates |
| `/dashboard/accounting/journals` | EN, narrow window | Overview's Journals link eventually loads; Enter advances posted-evidence pagination from page 1 to 2 of 4, then returns to page 1 |
| Same | FR, 320×844 observed | French headings for draft, posted and retained evidence; document widths 300/300; source-owned correction explanations remain; no posting/reversal action invoked |

The overview's horizontal ArrowRight attempts reported zero scroll offset. Focusability passed; actual horizontal keyboard scrolling is **not confirmed** and remains a follow-up, not an accessibility pass. Some client navigations were slow but the observed Journals and locale transitions ultimately completed. Phone/journal screenshots timed out; successful desktop images are linked below.

Temporary responsive overrides were cleared again after checks. Final reset succeeded and immediately measured 355×1002 CSS pixels, client/scroll widths 334/334. This is the browser's returned default size at that moment, not a claim that the physical window matches the earlier desktop dimensions. Theme preference and zoom were not changed. Browser runtime bindings were reset during the session; selected Chrome received a different runtime ID, but the user session remained Accountant.

## Verification by layer

| Layer | Result |
|---|---|
| Source inspection | Workflow/registry and runner, master/constitution, existing accounting shell/table, overview, journal copy and validated route locale inspected |
| Workflow contract | Pass, exit 0; 196 commands outside the reviewed registry remain |
| Mocked component tests | **6 passed**, one suite: existing permission/data-access/error checks plus French content/date/table locale, unknown state, empty and unavailable fallbacks |
| Scoped TypeScript | Pass, exit 0; page and imported dependencies; no emit or incremental write |
| Production lint | Pass, exit 0; overview page and new copy module |
| Browser | Bounded results above, including closure of portfolio focus blocker |
| Real database test suite | Not run; ordinary authenticated reads may create audit records |

First test run: five passed, one failed because the new assertion expected a space before the colon in the shared search label. Browser and component output confirmed the existing label `Rechercher: ...`; the assertion was corrected and the final six tests passed in 11.174 seconds. No production code was changed to satisfy that punctuation mismatch.

Commands were inspected for side effects before execution:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery19.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-19-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.delivery19.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/accounting/page.tsx" "app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-overview-copy.ts"
```

Jest's isolated Next transform loads no app configuration/env/database setup; route guards and actions are mocked. UI/UX Pro Max focused query `localization date language consistency` returned Content / Date Formatting from `ux-guidelines.csv`; locale-aware date guidance applied. No palette, framework or business-control changes were introduced. No build, seed, migration, installation, financial mutation, export, commit or deployment was performed.

## Evidence and remaining work

- [Portfolio refresh focus](evidence/delivery-19-portfolio-refresh-focus.png)
- [French overview](evidence/delivery-19-overview-fr-desktop.png)
- [Structured browser observations](evidence/delivery-19-browser-observations.json)
- [Tests](evidence/delivery-19-tests.json), [owned patch](evidence/delivery-19-owned.patch), [file manifest](evidence/delivery-19-files.json)

Remaining: actual Owner/Cashier journeys; reproducible horizontal keyboard scrolling check on the overview table; populated delegated-client portfolio/review fixtures; screen reader, forced colors, reduced motion and broader theme/state coverage. This delivery does not certify the whole accounting module or release readiness.

## Ownership

End-of-run HEAD: `fe540161f9fa53c149cc662759567cacc1dbd136`. The working tree contains unrelated ongoing work. Three pre-edit file snapshots are in `delivery-19-baseline.json`; the owned patch is relative to these bytes, not HEAD. New copy/config/report files are recorded separately. Reverse only owned hunks after checking later overlap; do not reset whole files. Earlier delivery reports and their historical evidence remain intact.
