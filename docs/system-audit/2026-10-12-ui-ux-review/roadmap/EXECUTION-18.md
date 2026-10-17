# Delivery 18 — Accountant report reflow and keyboard follow-up

Date: 16 October 2026. Packages: UX06 and UX10. Local implementation; no release certification.

## Delivered

- **Trial balance, narrow screens:** account identity columns previously covered the numeric columns even after scrolling. They now scroll normally below `md`; desktop retains frozen identity columns. The footer label follows the same breakpoint. Filters wrap, with full-width search and selects on phones.
- **Trial balance, sorting:** the active column header exposes `aria-sort` and updates ascending/descending state. Native buttons retain keyboard activation. This supplies accessibility semantics; actual screen-reader announcements are not certified.
- **Accountant portfolio, refresh:** a live Enter-triggered refresh dropped focus when its button became natively disabled. The refresh button now remains focusable with `aria-disabled`, a pending appearance and a guarded click handler. Duplicate activation while pending does not issue another request. Live post-fix focus verification remains open after browser timeouts; EN/FR mocked regression checks passed.

No accounting calculations, row data, authorization, consent, review acceptance or identity controls changed. Account names supplied through the existing `nameEn` field remain business data; this delivery does not translate or replace the account catalogue.

The [dated responsive decision](../../../UI/UX/2026-10-16-trial-balance-responsive-decision.md) records why narrow-screen identity cells differ from desktop frozen-column guidance.

## Live coverage

Chrome's existing session confirmed **ACCOUNTANT / Comptable**, with four visible modules. User is arranging Owner and Cashier sessions; no additional sign-in was requested. Original page was `/en/dashboard`. Theme preference and browser zoom were not deliberately changed during this delivery. The authenticated canvas retains its approved dark design.

| Route / state | Locale | Measured CSS viewport | Result |
|---|---|---|---|
| `/dashboard`, permission-limited recovery | EN | Existing browser window | Actual Accountant role, truthful limited-access message and access-review action |
| `/dashboard/accounting/reports/trial-balance`, populated 18-account report | EN | 320×844 | Before fix: local table viewport 245px, identity columns total 368px; numeric values obscured after ten ArrowRight presses and scroll offset approximately 458px |
| Same, populated and sorted | EN | 320×844 | After fix: identity cells static, numeric values visible while horizontally scrolled; Enter changes activity-debit sorting ascending then descending with matching `aria-sort` |
| Same, search and clear | EN | Phone | Search for account 401 preserves full-report footer; clearing restores rows |
| Same, localized filters and no-match state | FR | 320×844 | `html.lang=fr`; document client/scroll widths 300/300; search-to-select keyboard traversal; both selects contained within viewport; no-match search preserves full-report footer; clear restores ten displayed rows |
| Same, desktop | FR | 1440×900 | Document client/scroll widths 1420/1420; both identity headers remain sticky; ten rows displayed |
| `/dashboard/accounting/accountant-portfolio`, no active mandates / no outstanding evidence | FR | 1440×900 and 320×844 | Localized scope, empty and loading copy; phone document client/scroll widths 300/300; one main landmark; Enter refresh returns to empty state |
| Portfolio refresh after focus fix | FR | Phone | **Not verified live:** repeated DOM/native browser command timeouts; source and mocked tests only |

No grants were created, evidence accepted, identities confirmed, journal entries submitted, files exported or financial actions performed. Authenticated reads may produce ordinary audit records. No real database test suite was run.

Client-link attempts from dashboard to trial balance and from trial balance to portfolio remained on the previous route during observation. Direct navigation to the exact observed destination URL loaded each page. This is unresolved navigation/runtime evidence, not a diagnosed or fixed application defect.

The final browser commands repeatedly timed out and one reset attempt reported the debugger was detached. Reclaiming the existing tab also timed out. **Normal viewport restoration could not be confirmed**; last confirmed override was 320×844. Last confirmed page was the French portfolio. No other user tabs were closed or modified as recovery.

## Verification by layer

| Layer | Result | Limits |
|---|---|---|
| Source inspection | Complete for changed components and focused test dependencies | Workflow, registry, master, table controls and relevant contract, Work Desk and notification history imports reviewed |
| Workflow contract | Pass, exit 0 | 196 unclassified commands remain; check itself runs no application/database command |
| Mocked component tests | **23 passed, 2 suites**, exit 0 | Trial-balance totals/filter/localization/sort and existing Work Desk permission/review/retry controls, plus EN/FR focus and duplicate-refresh regression; server actions mocked |
| Scoped TypeScript | Pass, exit 0 | Both changed production components and imported dependencies, no emit/incremental writes |
| Production ESLint | Pass, exit 0 | Both changed production components |
| Rendered browser checks | Trial balance and portfolio states as above | Refresh focus after patch, intermediate viewports and broader role matrix remain open |
| Real database tests | Not run | No migration, seed or transactional verification |

The focused project UI/UX Pro Max query `table sort keyboard filter labels` returned Chip Collection Reflow and Form Labels from `ux-guidelines.csv`. Reflow and accessible label guidance applied; no generated palette or framework migration was adopted.

Reviewed commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery18.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-18-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.delivery18.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/trial-balance-table.tsx" components/accounting/AccountantWorkDesk.tsx
```

The first narrow trial-balance run passed three tests. After the additional refresh fix, the expanded final run passed all 23 tests in 23.294 seconds. Jest uses an isolated Next transform without app configuration/environment or database setup. No build, installation, migration, seed, commit or deployment ran.

## Evidence and remaining acceptance

- [Structured observations](evidence/delivery-18-browser-observations.json)
- [Phone before scrolling fix](evidence/delivery-18-trial-phone-before-scrolled.png) and [after](evidence/delivery-18-trial-phone-after-scrolled.png)
- [French phone filters](evidence/delivery-18-trial-fr-phone-filters.png) and [desktop report](evidence/delivery-18-trial-fr-desktop.png)
- [French portfolio phone](evidence/delivery-18-portfolio-fr-phone.png) and [desktop](evidence/delivery-18-portfolio-fr-desktop.png)
- [Test results](evidence/delivery-18-tests.json), [owned patch](evidence/delivery-18-owned.patch), [file manifest](evidence/delivery-18-files.json)

Next: restore/confirm browser viewport, verify refresh focus in the rendered portfolio, then exercise actual Owner and Cashier journeys when sessions are connected. Populated delegated-client portfolio/review states require authorized fixtures; the empty portfolio does not certify them. Actual screen reader, forced colors, reduced motion, exhaustive contrast and the wider state/theme matrix remain open. Delivery 17 holds earlier light-preference portal/access/reconciliation evidence; those checks were not re-certified here.

## Ownership and rollback

Source revision: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`. Extensive unrelated working-tree changes were preserved. Pre-edit bytes are retained in `delivery-18-baseline.json`; the owned patch is relative to those bytes rather than HEAD. Revert only these owned hunks after checking subsequent overlap. Do not reset complete files to HEAD. The added configuration, report and decision files are listed separately in the manifest.
