# AQSTOQFLOW UI/UX Phase 06 Finance Module Normalization Report

Date: 2026-06-26
Skill: aqstoqflow-uiux-06-module-normalization
Module selected: Finance command center

## Scope

Phase 06 was kept to one module slice: `components/finance/FinanceCommandCenterDashboard.tsx`.
Finance was selected because the Phase 06 skill recommends it as the first normalization target when no alternate module is specified.

No payroll UI, POS UI, inventory UI, seed data, service behavior, or release-gate work was broadened into this pass.

## What Changed

- Replaced the custom finance hero with the shared `CommandBriefHeader` primitive.
- Moved the finance filters into the command brief so the page opens with a clear brief, proof posture, metadata, and primary actions.
- Replaced the local finance metric card helper with shared `KpiTile` primitives.
- Added a shared `StatusStrip` for collected payments, pending payments, net tax, and drawer variance.
- Converted live finance alerts into a shared `ActionQueue` so overdue receivables, payables, pending payments, margin risk, and cash gaps become visible next actions.
- Added a shared `EvidenceTimeline` backed by recent payment events.
- Localized first-screen action links with `localizePath`, matching existing finance specialized surfaces.
- Added English and French finance command-copy keys under `financeDashboard.command`.
- Added a focused mapper in `components/finance/finance-command-center-normalization.ts` to keep the finance action/status/evidence mapping testable.

## Files Changed

- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/finance/finance-command-center-normalization.ts`
- `components/finance/__tests__/finance-command-center-normalization.test.ts`
- `messages/en.json`
- `messages/fr.json`

## Verification

- `npm test -- --runTestsByPath components/finance/__tests__/finance-command-center-normalization.test.ts --runInBand`
  - Passed: 1 suite, 3 tests.
- `npx eslint components/finance/FinanceCommandCenterDashboard.tsx components/finance/finance-command-center-normalization.ts components/finance/__tests__/finance-command-center-normalization.test.ts`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with 0 errors and 5 existing warnings outside this slice.
- `Invoke-WebRequest http://localhost:3000/en/dashboard/finance -MaximumRedirection 0`
  - Returned `307` to `/en/login?callbackUrl=%2Fen%2Fdashboard%2Ffinance`, confirming the route reaches the auth boundary without a public crash.
- `messages/en.json` and `messages/fr.json`
  - JSON parse passed after the localized command-copy insertion.

## Notes

The finance dashboard now uses the same command-center anatomy established in earlier UI/UX phases while preserving its existing finance hook, service-backed data, charts, aging cards, recent payment table, and payment-method workflow links.

The next Phase 06 module should be handled as a separate, focused run rather than expanding this finance pass into a cross-module sweep.
