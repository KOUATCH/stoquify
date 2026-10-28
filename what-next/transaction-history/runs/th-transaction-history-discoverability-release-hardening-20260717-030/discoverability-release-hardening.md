# Transaction History Discoverability and Release Hardening - 2026-07-17

Status: PASS.

## Product discoverability now passed

The implemented transaction-history pages are now visible from the main sidebar navigation:

- Cash Payment History: `/dashboard/finance/cash-payment-history`
- AP History: `/dashboard/purchases/payables/history`
- Customer AR History: `/dashboard/finance/receivables/history`

Changed files:

- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`

## Verification

- PASS: `npx eslint config/sidebar.ts config/__tests__/sidebar.test.ts`
- PASS: `npm test -- config/__tests__/sidebar.test.ts --runInBand` with 17 tests passing
- PASS: focused cash/payment, AP, AR, export-safety, and sidebar regression suite with 8 test suites and 35 tests passing
- PASS: static release smoke for guarded routes, sidebar discoverability, and action controls
- PASS: Playwright protected-route smoke for cash/payment, AP, and AR desktop/mobile redirects with callback URLs and no document overflow
- PASS: Prisma Client generation passed after stale temporary Next dev servers were stopped
- PASS: `npm run prisma:validate`
- PASS: `npm run policy:gates` passed
- PASS: `npm run lint` completed with 0 errors and 4 warnings
- PASS: `npm run typecheck` passed after excluding `what-next/**` evidence artifacts and fixing transaction-history diagnostics
- PASS: `npm run build:app` completed and route table includes the transaction-history pages
- PASS: `npm run test:e2e:transaction-history` completed migrations-current check, seeded the transaction-history E2E role, created a dedicated auth state, and passed authenticated mobile/desktop browser+a11y checks for cash/payment, AP, and AR history pages
- PASS: `node what-next/transaction-history/runs/th-transaction-history-discoverability-release-hardening-20260717-030/transaction-history-stage07-release-fixtures.mjs` passed role matrix, export parity, cursor/backdated insert, and accounting tie-out release fixtures

## Release state

This hardening pass fixes product discoverability, lifts the authenticated browser/mobile/accessibility blocker, and closes the Stage 07 cross-slice release fixtures for the cash/payment, AP, and AR history routes. Public UploadThing remains a development/pilot storage posture for earlier inventory export work and must still be replaced before go-live where private storage is required.

## Current-State Evidence Boundary

Earlier stage artifacts remain historical and may show checksum drift after the Stage 07 typecheck remediation. Do not rewrite those historical checksums. Current file checksums and final verification results are recorded in `current-state-release-manifest.json`.
