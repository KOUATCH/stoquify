# Public And Auth First-Impression Run Report

Date: 2026-07-17

Scope: landing page expansion plus login/register positioning alignment.

## What Changed

- Expanded the landing page sequence with existing product-led sections: disconnected-tools problem, connected workflow, module deep dives, controlled automation, and use cases.
- Kept the existing landing visual system and translation-driven components instead of introducing a second marketing language.
- Refined newly exposed landing copy so the page speaks about provable operating truth, OHADA operating-system flow, payments, evidence, and trusted books.
- Updated login/register copy in `components/auth/auth-copy.ts` so auth reads as entry into the same ledger-first OHADA operating system.
- Added payroll as a visible protected workspace card in the auth side panel beside POS, stock, reconciliation, close, and controls.
- Preserved the existing auth forms, validation flow, routing, tenant-scoped return URL handling, and secure action behavior.

## Files Changed By This Expansion

- `app/[locale]/(home)/page.tsx`
- `components/auth/AuthLayout.tsx`
- `components/auth/auth-copy.ts`
- `messages/en.json`
- `messages/fr.json`

Prior landing-pass files still part of this public-first-impression slice:

- `components/landing/operations-map.tsx`
- `components/landing/hero-dashboard.tsx`

## Verification Performed

- `node -e` JSON parse check for `messages/en.json` and `messages/fr.json`: passed.
- `npx eslint "app/[locale]/(home)/page.tsx" components/auth/AuthLayout.tsx components/auth/auth-copy.ts components/landing/automation-section.tsx components/landing/connected-workflow.tsx components/landing/disconnect-problem.tsx components/landing/module-deep-dives.tsx components/landing/use-cases.tsx components/landing/hero-dashboard.tsx components/landing/operations-map.tsx`: passed.

## What Was Verified

- The public landing page now includes a fuller narrative arc: why disconnected tools fail, how the operating spine works, which daily decisions matter, how automation remains controlled, and which operator segments fit the system.
- Login and register pages now carry the same strategic orientation as the landing page: OHADA operating system, tenant-scoped session, evidence, payments, payroll, reconciliation, close, RBAC, step-up, and auditability.
- The edited locale files remain valid JSON.
- The changed and newly assembled public/auth TypeScript files pass focused ESLint.

## Residual Launch Risk

- Browser smoke and responsive screenshots for `/en`, `/fr`, `/en/login`, `/fr/login`, `/en/register`, and `/fr/register` were not completed in this run.
- Full project typecheck remains unconfirmed; the earlier `npm run typecheck` attempt timed out after 120 seconds.
- The worktree contains unrelated pre-existing changes and long-path warnings under `what-next`; review only the public/auth diffs before staging.
- Product/legal review should confirm OHADA/SYSCOHADA readiness wording against certified capabilities before external launch.
