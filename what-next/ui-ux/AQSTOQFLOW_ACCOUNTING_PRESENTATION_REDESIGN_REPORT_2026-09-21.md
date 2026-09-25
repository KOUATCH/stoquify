# Accounting presentation redesign — 2026-09-21

## Outcome and scope

Applied the user's finance presentation requirements to all 13 discovered accounting page routes. A shared accounting shell now gives the pages consistent headers, spacing, readable actions, theme tokens, and full available content width. Major operational tables stack vertically. Existing unified table search and pagination were retained and regression checked.

This is the accounting pass of the module-normalization skill. The related finance report is `AQSTOQFLOW_FINANCE_PRESENTATION_REDESIGN_REPORT_2026-09-21.md`. Earlier accounting table-normalization changes already present in the working tree were preserved.

## Changes

- `AccountingPageShell` provides a themed, compact page header, wrapping action row, shared 1920px maximum content width, and consistent section spacing. The decorative live-status animation was removed from the generic header because it did not represent a data state.
- `AccountingPanel` uses semantic section headings; accounting metrics retain exact values and gain consistent numeric alignment.
- Control center follows readiness → account mappings → default journals → posting rules → audit/control events. Every major table occupies the available content width.
- Accountant portal brings blockers ahead of posted figures, keeps evidence modules readable, and stacks source links and audit records below.
- Close assurance follows checklist → findings → certification/review/export → evidence/provenance. Certification cards only share a row at very wide sizes. The period selector has a localized accessible name.
- Chart of accounts places its full-width register before the account-creation form.
- Setup stacks journals and accounting-period tables while allowing compact configuration forms to pair.
- Financial statements stack the report sections. Residual grid spans were removed so a single-column layout cannot generate unintended extra columns.
- Accountant access and portfolio cards use existing theme tokens, readable spacing, focus treatment, and consistent actions.
- Manual journal rows keep all six editable lines mounted and receive distinct localized accessible field names. Search/pagination was not added to an entry form because hiding editable rows would undermine the posting workflow.

## Route coverage

Paths are relative to `/[locale]/dashboard/accounting`. All 13 routes were reviewed in source; every route receives the shared shell improvements.

| Route | Additional presentation work | Verification in this pass |
| --- | --- | --- |
| `/` | More readable KPI breakpoints; full-width latest journal table retained | Browser passed: 1 table/paginator, no overflow; route regression passed |
| `/accounts` | Register before creation form; both full width | Browser correctly showed role restriction; authorized content verified through route tests |
| `/journals` | Shared header/actions and existing unified register retained | Route regression passed; live route stayed at dashboard loading state and browser inspection subsequently timed out |
| `/journals/new` | Localized accessible names on all journal-line fields | Route regression and final rerun passed; live navigation did not finish inspection |
| `/setup` | Stacked journal/period tables; responsive summary cards | Browser passed: 2 tables and paginators, no overflow; route regression passed |
| `/control-center` | Section navigation and full-width mappings/journals/rules/events | Browser passed: 4 tables and paginators, all anchors resolved; regression passed |
| `/accountant-portal` | Blockers first, then figures, source links, and audit | EN desktop plus FR tablet/mobile passed: 3 tables and paginators; independent labeled searches, working anchors, no page overflow; route regression passed |
| `/accountant-access` | Themed grant form and register with consistent actions | Component regression passed; live route not completed before browser became unresponsive |
| `/accountant-portfolio` | Themed client cards and readable responsive grid | Source/type/lint reviewed; live route not completed |
| `/close` | Checklist/findings/certification/evidence sequence | Browser correctly showed module-access restriction; close component regressions passed |
| `/close/[periodId]` | Same close workspace presentation | Source reviewed; component tests use a concrete selected-period fixture; no accessible live period link was available because the parent was locked |
| `/reports/trial-balance` | Shared shell; full-width report and totals retained | Page and table regressions passed; live route not completed |
| `/reports/financial-statements` | Report sections stacked full width | Page and line-table regressions passed; final page rerun passed; live route not completed |

## Browser evidence and limits

- In the control center, the mappings, journals, posting-rules, and event sections each measured approximately 1052 CSS pixels at the inspected desktop viewport. Their widths matched, confirming the requested full-width stacking.
- The portal's rendered order was Close blockers, Posted figures, Evidence modules, Recent source links, Audit and control trail. Its three searches were labeled independently.
- Overview, setup, control center, and portal had no page-level horizontal overflow in the inspected desktop layout. New section links all resolved.
- The current accountant session cannot load the chart-of-accounts content. Close Assurance is module locked. Those restrictions were preserved; no access was granted or bypassed to obtain screenshots.
- Browser navigation later stalled on journal pages. A fresh French portal preview eventually loaded and restored inspection; routes not subsequently checked remain identified above.
- The French portal was inspected at 927 CSS pixels (tablet) and 391 CSS pixels (mobile), with no page-level horizontal overflow. Section links wrapped and the blocker-table search remained usable (approximately 288 CSS pixels wide). Its legacy page title/description remain English, while workspace sections and controls render in French.
- Saved desktop and mobile screenshots are available in the task visualization directory. A complete all-route/all-breakpoint visual pass remains incomplete.
- The temporary browser viewport override was reset after the final responsive checks.

Saved visual evidence:

- [French portal desktop table](<C:/Users/J COMPUTER/.codex/visualizations/2026/09/21/01a0c2fe-fe64-7d60-9582-6b89089912bd/accountant-portal-fr-desktop.png>)
- [French portal mobile](<C:/Users/J COMPUTER/.codex/visualizations/2026/09/21/01a0c2fe-fe64-7d60-9582-6b89089912bd/accountant-portal-fr-mobile.png>)
- [French portal mobile table](<C:/Users/J COMPUTER/.codex/visualizations/2026/09/21/01a0c2fe-fe64-7d60-9582-6b89089912bd/accountant-portal-fr-mobile-table.png>)

## Verification

Passed:

- TypeScript: `npm run typecheck`, exit 0.
- Scoped ESLint over 22 changed TS/TSX files, exit 0.
- Scoped diff whitespace check, exit 0.
- Accounting regression suites: control center, close assurance, accountant access, accounting table primitive, overview route, accounts route, setup route, accountant-portal route, journals route, journal-entry route, trial-balance route/table, financial-statements route/line table.
- Final combined finance/accounting rerun: 4 suites and 50 tests passed.
- Tests cover independent search/pagination, row/action identity, clearing search, localized empty controls, report totals, journal-line preservation, permission restrictions, protected close actions, safe errors, and the sequence/targets of the new close section navigation.

Full-repository `git diff --check` remains failed on four whitespace lines in an unrelated reconciliation service. No accounting file introduced a diff-check failure.

Logs: `.codex-tmp/presentation-typecheck-final.log`, `presentation-lint.log`, `presentation-tests-final.log`, `presentation-tests-additional.log`, `presentation-last-tests.log`, `presentation-last-results.json`, and `presentation-scoped-diff-check.log`.

## Controls and review

No accounting calculations, currencies, posting rules, database schema, permissions, tenant boundaries, service queries, approval decisions, or business records were changed by this pass. Existing table data limits and server/client pagination semantics remain in force. Read-only browser checks did not submit any create/archive/post/lock/review/export action.

The presentation uses existing tokens and shared primitives. New section labels and journal-field names support English and French. Several older accounting pages still contain English-only business labels; this pass does not claim to have translated that legacy content. Existing number/date formatting was preserved.

All discovered routes are accounted for and implementation is complete. Visual acceptance is partial for the explicit access/browser limitations above; no blanket accessibility, production-readiness, or all-route browser certification is claimed.
