# AqStoqFlow Settings Routes Report

Date: 2026-06-19

## Scope

Added the user-menu settings routes:

- `/[locale]/dashboard/settings/security`
- `/[locale]/dashboard/settings/notifications`
- `/[locale]/dashboard/settings/appearance`

## Real Capabilities Reused

- Security uses the existing BetterAuth session, database session mirror, RBAC context, password workflow, password history, MFA schema fields, and session revocation helper.
- Notifications uses the existing in-app `NotificationProvider`, current browser queue, and local sound preference.
- Appearance uses the existing `next-themes` provider with `light`, `dark`, and `system` modes.

## Truthful Gaps Shown In UI

- MFA has database readiness fields, but no completed enrollment/challenge route was found, so the security page shows readiness and risk instead of a fake toggle.
- Notification email, push, digest, and per-module preferences do not have a persisted settings model yet, so the notifications page exposes only in-app provider state and sound.
- Appearance has no persisted custom palette, density, or layout settings model, so the page exposes only the real theme modes.

## Verification

- `npx eslint` passed for the five new settings route files.
- Focused TypeScript check passed using a temporary tsconfig that included only the new route files.
- `npm run typecheck` still fails on the existing unrelated `components/finance/FinanceSpecializedLedgerSurfaces.tsx(165,62)` error.
- Dev server started at `http://localhost:3000`.
- Requests to the three new routes returned clean protected `307` redirects to localized login pages, with no route compile errors.
