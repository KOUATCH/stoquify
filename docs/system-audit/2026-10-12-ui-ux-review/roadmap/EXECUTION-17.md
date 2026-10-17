# Delivery 17 — Accountant role, theme boundary and keyboard accessibility

Date: 16 October 2026. Status: four local fixes implemented and verified; available Accountant acceptance completed for the bounded checks below. Owner/Cashier and assistive-technology acceptance remain open. No deployment or release certification.

## Findings and fixes

| Finding | Reproduction | Local change | Verification |
|---|---|---|---|
| Missing shared navigation bypass | French portal had no skip link and its main landmark had no focus target | Localized first shell link targets `main#dashboard-main-content`, with `tabIndex=-1`, visible focus styling and scroll margin | French and English keyboard focus moves to main; next Tab reaches the first page-section link. Link is visible above the toolbar when focused |
| Mobile navigation icon almost invisible with light preference | At 391×844, trigger background was white and icon was rgb(247,250,248) | Reuse existing `dashboard-top-button` styling | Rendered icon is visible against the dashboard surface; Enter, focus trap and Escape return still work |
| Document language stale after client locale navigation | French content rendered with `html lang=en` after EN→FR navigation | Small `DocumentLanguage` client component receives the already-validated locale from the locale layout and updates the document language | Live Accountant Access EN→FR transitions report `en` then `fr`; regression covers repeated changes without remounting root |
| Date-picker icons dark against dark fields under light preference | Accountant Access native date inputs computed `color-scheme: light`; calendar icons were black on a dark field | Set the two date inputs to the canonical dashboard dark color scheme | Computed scheme is dark; both calendar icons are visibly white; field values and validation unchanged |

The language fix touches the shared locale layout because the root HTML layout persists across client navigation. Initial server HTML still uses the existing middleware locale header. The new component adds no visible content, request, permission or data behavior. Its effect applies to localized routes; actual screen-reader pronunciation is not certified here.

The design master and constitution intentionally retain a dark authenticated canvas. Selecting the existing light preference changes the document preference but does not create an approved light dashboard palette. This delivery tests that boundary and fixes the two resulting control mismatches; it does not introduce a new theme. The current theme toggle wording can imply a full dashboard recolor, so product clarification remains a design decision.

## Live coverage

Chrome's existing session confirmed **ACCOUNTANT / Comptable** with four visible modules. Edge confirmed **SUPER_ADMIN / Super administrateur**. No connected Owner/Cashier session was available; Firefox was not exposed. The user was asked to make an Owner or Cashier session available while work continued. No credentials were requested or read.

| Route and state | Locale / preference | Measured CSS viewport | Evidence |
|---|---|---|---|
| Accountant portal, populated with blocked certified export | FR / light preference, canonical dark dashboard | 1440×900, 1024×768, 391×844 | Document client/scroll widths 1420/1420, 1004/1004, 371/371; one main; screenshots below |
| Accountant portal, account menu and bypass | EN / light preference | 391×844 | Accountant label; visible 48px-high skip link; focus moves to main; menu End reaches visible Sign out without activating it; Escape restores trigger focus |
| Accountant Access, empty register and unsubmitted form | FR / light preference | 391×844 and 320×844 | Client/scroll widths 371/371 and 300/300; accessible implicit field labels; email→firm Tab focus visible; date control segments keyboard reachable |
| Accountant Access locale transition | EN→FR / light preference | 391×844 | Document language follows content after client navigation |
| Reconciliation, loading then populated evidence | FR / light preference | 320×844 | Client/scroll width 300/300; one main; named filter and table keyboard checks; current access denies manual proposals; no protected actions executed |

Portal keyboard checks exercised all three named table regions with ArrowRight, not just their presence in the DOM. Mobile navigation opens with Enter, starts on Close, wraps Shift+Tab to Sign out and Tab back to Close, and restores trigger focus after Escape. Account menu opens with Enter and restores trigger focus after Escape. The native Finance disclosure opens with Enter on its summary. No logout was activated.

Reconciliation's Lieu combobox opens with Enter and closes with Escape, returning focus and retaining Tous les lieux. Both named table regions scroll with ArrowRight. No filters were committed, files imported, matches proposed, payments signed or exports invoked. Portal export stayed disabled. Form labels in Accountant Access wrap their controls, so missing explicit IDs are not missing accessible names.

The first client-link attempt to reconciliation remained on Accountant Access during observation. Navigating directly to the observed link URL reached the announced loading state, then populated reconciliation. Occasional browser DOM timeouts recovered via native accessibility observation. These observations do not establish permanent browser reliability or a diagnosed navigation defect.

Theme was restored to its original dark preference. The temporary viewport override was reset and verified at 1381×688, document client/scroll widths both 1361. Browser zoom was not changed. Screenshot files preserve the browser tool's full capture, including unused canvas around emulated viewports.

## Evidence

- [Structured observations](evidence/delivery-17-browser-observations.json)
- [Visible French skip link](evidence/delivery-17-skip-link-focus.png)
- [Portal desktop](evidence/delivery-17-accountant-light-desktop.png), [tablet](evidence/delivery-17-accountant-light-tablet.png)
- [Phone before icon fix](evidence/delivery-17-accountant-light-phone.png), [phone after icon fix](evidence/delivery-17-accountant-light-phone-after.png)
- [Date fields before](evidence/delivery-17-accountant-access-light-phone.png), [date fields after](evidence/delivery-17-date-controls-after.png)
- [Reconciliation at 320px](evidence/delivery-17-reconciliation-light-320.png)

## Verification by layer

| Layer | Result | Boundaries |
|---|---|---|
| Source inspection | Complete for changed surfaces | Current workflow, registry, master, constitution, component registry, related payment/receivables contracts, layout/locale middleware, token and control source |
| Workflow contract | Pass, exit 0 | 196 commands remain unclassified; no application command executed by check |
| Mocked component tests | **15 passed, 3 suites** | Existing RBAC shell/recovery and access grant/expiry regression tests; EN/FR bypass structure; document language changes. All server actions mocked |
| Scoped TypeScript | Pass, exit 0 | Changed production surfaces and imported dependencies, `noEmit`, incremental disabled |
| Production ESLint | Pass, exit 0 | Five changed production files |
| Live browser | Checks above passed | Actual Accountant session; limited routes/states/viewport matrix; not full accessibility certification |
| Real database test suite | Not run | Ordinary authenticated reads can produce audit records. No business mutation was performed |

Project UI/UX Pro Max query `skip links focus keyboard contrast`, domain `ux`, returned Skip Links, Focus Appearance and Focus States from `ux-guidelines.csv`. Framework-independent focus/bypass guidance was applicable. Enhanced AAA focus guidance was not treated as an AA certification, and no generated palette was adopted.

Reviewed commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery17.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-17-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.delivery17.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/layout.tsx" components/dashboard/Navbar.tsx "app/[locale]/layout.tsx" components/i18n/DocumentLanguage.tsx components/accounting/AccountantAccessManager.tsx
```

The initial Jest attempt was interrupted after a broad repository crawl produced no test output. Its config was narrowed to the relevant test directories; the final run above passed. Installed isolated Next/Jest transformation loads no app config/env/database setup. No build, migration, seed, install, commit or deployment was run.

## Remaining acceptance

- Actual Owner and Cashier sessions, including their respective operational destinations. Accountant and Super Administrator do not substitute for those roles.
- Actual screen-reader announcements/pronunciation, forced-colors and rendered reduced-motion checks. Native accessibility trees and DOM checks are useful evidence, not an assistive-technology certification.
- Comprehensive text/icon/focus contrast, whole-application keyboard traversal and every state/theme combination.
- A fully light authenticated dashboard would require an explicit design decision; this delivery preserves the current theme contract.

## Ownership and rollback

Source revision at inspection: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with extensive unrelated existing working-tree changes. Pre-edit bytes are in `evidence/delivery-17-baseline.json`; the owned patch is relative to those bytes, not HEAD. File hashes and paths are recorded in `evidence/delivery-17-files.json`. Reverse only owned hunks after checking for subsequent overlap; do not reset whole files to HEAD. Existing permissions, session recovery, locale validation, consent and payment controls remain intact.
