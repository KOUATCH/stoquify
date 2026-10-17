# Delivery 21 — Reverse scrolling and accurate journal access recovery

Date: 16 October 2026. Actual Chrome Accountant session. User reconnected the extension; the journal tab became inspectable. No live draft, invitation, grant or other business mutation was performed.

## Completed

- **Overview keyboard scrolling:** `/fr/dashboard/accounting`, 320×844 CSS pixels. Tab from search focused `Dernières écritures comptables`; client width 232, scroll width 1040. Six ArrowRight presses reached 320px. ArrowLeft reduced this to 266.6666564941406; further left presses reached zero. Focus stayed on the region. Shift+Tab returned to the named search input; Tab through the region reached `Lignes par page`. No custom key handler was needed. This closes Delivery 20's reverse-scroll and keyboard-exit gaps for the overview.
- **French journal headings:** the live journal-entry route displays the translated title, introductory copy, panel heading and queue link from Delivery 20.
- **Newly reproduced defect:** the current Accountant cannot read chart accounts. Browser console evidence reports protected-action `FORBIDDEN` for `accounting.accounts.read`; current `listChartAccountsAction` source requires that permission. The page previously rendered this as a generic loading failure and offered retry.
- **Local correction:** explicit `FORBIDDEN` from either setup lookup now produces EN/FR access-required copy, asks an organization administrator to review permissions, and offers return to the journal queue. Unknown/service errors retain the original retry state; failed setup still withholds the form. No permission, server action, account filter, parsing, default, draft recovery or submission control changed.

The final action returns to journals. The Accountant Access page was inspected during destination verification and manages client mandates; it is not presented as a way to repair this chart-account permission.

## Rendered acceptance

| Route/state | Locale / viewport | Evidence |
|---|---|---|
| Accounting overview, populated | FR / 320×844 | Reverse scrolling, left boundary and both keyboard exits passed |
| New journal, initial generic setup failure | FR / 1707×723 | Translated headings visible; no form; document widths 1686/1686 |
| New journal, corrected permission denial | FR / 320×844 | Final administrator guidance and `Retour aux journaux` visible; Tab focuses recovery link; document widths 300/300; screenshot saved |
| Journal queue reached via Enter on recovery link | FR / 320×844 | Populated journal queue loaded; document widths 300/300; no financial action invoked |
| Accountant Access, existing empty grants | FR / phone override | Read-only landing inspected; invitation/grant form left untouched |

Full journal-form labels, line-field traversal and horizontal scrolling remain **unverified live** because this session is denied its required account lookup. Passing mocked form tests does not replace that evidence. This is a permission/fixture gap, not a browser failure diagnosis and not authorization to grant access.

The final English locale-link attempt was dispatched, but subsequent browser inspection timed out; English recovery has mocked evidence only in this delivery. Temporary viewport reset returned success. The next dimension measurement failed before dispatch, so the resulting normal dimensions remain unmeasured. No theme preference was changed. The French screenshot is the final queue-recovery version, replacing the intermediate access-page destination capture.

## Verification

- Workflow: freshly reviewed `npm run agent:workflow:check` passed, exit 0; 196 commands remain unclassified.
- Mocked component tests: **20 passed**, one suite, final run 10.23 seconds. Four new cases cover account/journal denial in EN/FR, safe queue recovery, withheld form and absence of private error detail. Existing failed/empty setup, permission, recovery, confirmed submission and duplicate-submit cases also pass.
- Scoped TypeScript: passed, exit 0, no emit/incremental writes.
- Production lint: passed, exit 0, one production page.
- Real database tests: not run. Browser uses ordinary authenticated reads, which can create audit records. No build, seed, migration, grant, invitation, posting, export or deployment.

Reused the inspected Delivery 20 isolated Jest/TypeScript configs for the same page. Final commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery20.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-21-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.delivery20.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx"
```

Source HEAD: `fe540161f9fa53c149cc662759567cacc1dbd136`; unrelated edits preserved. [Baseline](evidence/delivery-21-baseline.json) records pre-edit page/tests/roadmap bytes. [Owned patch](evidence/delivery-21-owned.patch) is relative to those bytes. Roll back only these owned hunks after checking later overlap.

Evidence: [French recovery screenshot](evidence/delivery-21-journal-access-fr-phone.png), [test results](evidence/delivery-21-tests.json), [browser observations](evidence/delivery-21-browser-observations.json).

Remaining: authorized journal-form fixture, Owner/Cashier sessions, populated delegated-client portfolio, actual screen reader, forced colors, reduced motion and broader theme/state acceptance. No whole-module or release certification is claimed.
