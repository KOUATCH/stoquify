# Delivery 16 — Shared role labels and loading states

Date: 16 October 2026. Status: implementation, scoped automated checks and available Super Administrator responsive/keyboard checks complete. Restricted-role and broader accessibility acceptance remain open. Not deployed or accepted as a release.

## Implemented

The sidebar, organization banner and account-menu role list use the existing server-supplied `nameFr` or `nameEn` for the active locale. The fresh RBAC context already supplies these fields. Missing translations fall back to the supplied name or code; a missing role displays Utilisateur/User. Custom role names are not guessed or rewritten. The helper is presentation-only: role IDs, codes, session authority and permission/module filtering are unchanged.

French loading copy now covers the outer dashboard, inventory, finance, owner morning brief and manager daily run sheet. Sales and customer skeletons now include a visible EN/FR loading announcement. Data-onboarding passes its locale to the shared loading label; purchase orders retain their existing bilingual narrative.

The shared loading component preserves explicit copy overrides and supports an embedded mode. All four of its nested callers use that mode. The outer dashboard boundary retains its standalone main landmark; finance, owner and manager fallbacks use the main already owned by the dashboard layout. Pending figures remain skeletons, not zero or success. Shared default copy no longer calls data “trusted” before the read has completed.

Affected loading states expose a polite status message. The shared status is no longer marked permanently busy, which could defer its announcement until the component disappears. Actual assistive-technology announcement behavior remains unverified. Scoped reduced-motion classes suppress skeleton pulses without changing global animation behavior. No focus movement, interactive controls, permission, accounting or data-fetch behavior was added.

## Scope and inspection

Reviewed current ECC workflow/routing/command registry, design master, UI constitution and component registry, applicable inventory/AP/sales/receivables contracts, current locale provider, dashboard layout, RBAC role mapping and shell permission filtering. Existing component graph Community 77 was a discovery reference for Navbar; behavioral claims use current source.

Project UI/UX Pro Max focused query `loading status keyboard focus` returned focus-indicator and obscured-focus guidance. It informed the rendered checks; no visual compliance is inferred from the dataset. Existing tokens and loading layouts were retained. No generated design system or new dependency was introduced.

Source review found already-localized loaders for analytics, daily digest, profile, module settings, suppliers and payables; these were left unchanged. This is a bounded loading-boundary cleanup, not a claim that every inline asynchronous message across the application has been translated.

## Verification by layer

| Layer | Result | Scope / limitation |
|---|---|---|
| Workflow contract | Passed, exit 0 | 196 package commands remain unclassified; no application commands executed by this check |
| Mocked component tests | **18 passed, 2 suites** | French role display with empty permissions; existing sidebar selection/disclosure/filtering regression checks; eight embedded French loaders; standalone EN/FR boundary; custom copy and unknown-role fallback |
| Scoped TypeScript | Passed, exit 0 | `noEmit`, incremental disabled; current shell and changed loaders with their imported dependencies |
| Production-file ESLint | Passed, exit 0 | Twelve changed TSX files and new role-label helper |
| Browser / rendered | **Available Super Administrator checks passed** | French portal at 1440×900, 1024×768 and 391×844; keyboard interactions and EN/FR role/loading copy observed. Detailed scope below |
| Real database tests | Not run | No transactions, invites, role/permission changes, exports, migration, seed or build |

Jest uses the installed isolated Next/Jest transformer without application config/env/database setup, jsdom and mocked locale/navigation/auth dependencies. Existing sidebar permission logic is exercised, but these tests do not certify server authorization. Test output: [delivery-16-tests.json](evidence/delivery-16-tests.json).

Commands reviewed and executed:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery16.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-16-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.delivery16.json --pretty false
```

ESLint invoked `node node_modules/eslint/bin/eslint.js` with the twelve production TSX paths from the pre-edit baseline plus `lib/dashboard/role-label.ts`. No full build, full-project test run, deployment or commit was performed. Ordinary attempted application reads may create audit records; zero database writes is not asserted.

## Current browser evidence and remaining matrix

Initial Edge/Chrome navigation and observation attempts timed out. After the user opened the French portal in Edge, page control recovered and the following checks completed. The current session is **SUPER_ADMIN**, displayed as **Super administrateur** in French and **Super Admin** in English. Delivery 15's Accountant session is historical evidence; it is not today's role. This recovery does not establish permanent extension reliability. No profile/cache deletion, extension reinstall, security-setting change or server restart was needed.

Route: `http://localhost:3000/fr/dashboard/accounting/accountant-portal`, dark theme, populated state. Recorded CSS dimensions account for the browser's existing zoom; zoom itself was not changed. The portal has one main landmark and its blocked export remains disabled.

| Viewport | Document client / scroll width | Rendered result | Screenshot |
|---|---|---|---|
| 1440×900 | 1420 / 1420 | No page-wide horizontal overflow; translated sidebar role wraps | [Desktop](evidence/delivery-16-fr-desktop.png) |
| 1024×768 | 1004 / 1004 | Content wraps within the available width | [Tablet](evidence/delivery-16-fr-tablet.png) |
| 391×844 | 371 / 371 | Cards stack; wide tables remain in local scroll regions | [Phone](evidence/delivery-16-fr-phone.png) |

Keyboard checks on the phone viewport:

- Account menu opens with Enter, displays the localized role, closes with Escape and restores focus to its trigger. English menu bounds fit within the viewport: x 50.67–354.67, y 64.32–684.46.
- Mobile navigation opens with Enter and focuses its close button. Escape closes the dialog and returns focus to “Ouvrir le menu de navigation”.
- The three named table regions are keyboard-focusable. ArrowRight on “Blocages de clôture” moves its horizontal scroll offset to 53.33 CSS pixels; its 1040-pixel content stays inside a 305-pixel region. The other two regions' scrolling was not individually exercised.
- “Référence du contrôle” opens with Enter and closes with Space. Focus remains on its summary, within the visible viewport, with a computed browser outline. This is not a comprehensive contrast or focus-appearance certification.

Switching to English and back to French exposed the actual outer loading boundary: “Preparing dashboard command center” and “Préparation du tableau de bord”, with French description “Les données du tableau de bord sont en cours de chargement.” The French pending state retained one main and no page-wide overflow. The portal then settled in French. No artificial delay or business mutation was introduced.

The temporary viewport override was reset and verified: normal browser viewport 1645×792, document client and scroll width both 1625. Evidence: [recorded browser observations](evidence/delivery-16-browser-observations.json), [French loading transition](evidence/delivery-16-fr-transition.json). These are live observations, not an automated end-to-end test suite.

| Remaining acceptance | Limitation |
|---|---|
| Actual Owner, Accountant and Cashier sessions | Not available as the active role for this delivery; Super Administrator does not certify their permissions or journeys |
| Finance and other route-specific pending states | Source and mocked tests passed; actual pending rendering was not captured on every route |
| Light theme, screen-reader announcements, reduced-motion rendering and comprehensive contrast | Not verified; scoped source improvements do not certify these behaviors |
| Full keyboard traversal and touch ergonomics across every module | Only the interactions and route explicitly recorded above were exercised |

## Ownership and rollback

The already-dirty pre-edit bytes are preserved in `evidence/delivery-16-baseline.json`. `evidence/delivery-16-owned.patch` is relative to that baseline, not HEAD; final owned-file hashes are in `evidence/delivery-16-files.json`. Preserve unrelated prior changes, including existing Navbar/account-menu work. Reverse only owned hunks after checking later overlap. No entire-file reset to HEAD is appropriate.
