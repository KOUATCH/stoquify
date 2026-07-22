# Landing Navigation and Localization Verification

Date: 2026-07-18

## Verified

- The landing header now represents all nine substantive page sections in rendered order: Product, Workflow, Platform, People and payroll, Daily control, Automation, Trust, Scenarios, and Adoption.
- Desktop exposes three lead links, an ordered More disclosure, and two closing links; mobile exposes all nine links directly.
- Every menu link has one unique section target, an 80px sticky-header offset, hash navigation, menu closure, and `aria-current="location"` scrollspy state.
- Scrollspy remains inactive above the first anchored section, including during hydration and late layout growth.
- English/French navigation keys remain equivalent. French landing, login, and registration copy now uses accents and corrected operational wording without mojibake or the targeted English placeholders.
- The persistent notification sound control is limited to dashboard routes, so it no longer blocks the public mobile menu; notification toasts remain globally available.
- Desktop/mobile screenshots were captured for English/French landing pages and French login/register pages.

## Gates Run

- `npm run ui:gate:landing-navigation-localization`: 5 tests passed.
- `npm run ui:gate:public-content`: 4 tests passed.
- `npm run ui:gate:landing-refinement`: 5 tests passed.
- `npm run ui:gate:landing-packages`: 5 tests passed.
- Targeted ESLint across changed landing, notification, smoke, and test files: passed.
- `npm run typecheck`: passed.
- `node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001`: 8/8 checks passed with no horizontal overflow or page errors.
- Existing `ui-route-smoke-gate` for `/en`, `/en/login`, `/en/register`, `/fr`, `/fr/login`, and `/fr/register`: 6/6 routes returned 200 with required screenshots.

## Evidence

- `what-next/ui-ux/landing-navigation-localization-browser-evidence-2026-07-18.json`
- `what-next/ui-ux/ui-route-smoke-2026-07-18.json`
- `what-next/ui-ux/screenshots/2026-07-18/landing-navigation-*.png`
- `what-next/ui-ux/screenshots/2026-07-18/auth-*-fr-*.png`

## Residual Launch Risk

- Verification used a clean isolated Next.js development runtime on port 3001. The pre-existing port 3000 process served a corrupted `.next-dev` cache and was deliberately left untouched; it should not be used as launch evidence.
- A production build was not run in this pass. The focused gates, full typecheck, live Playwright interactions, and route smoke are green.
- The French quality gate is intentionally scoped to the landing and shared authentication surfaces. Other dashboard/module strings in `messages/fr.json` still contain legacy unaccented copy and need a separate catalog-wide localization pass before claiming full-product French editorial completion.
