# Worktree Stabilization Report - 2026-05-26

## Current verdict

Do not push this worktree to GitHub yet.

The generated/runtime noise has been reduced and the ESLint error surface is clean, but the repository still has a large mixed WIP surface and a failing TypeScript gate.

## Current state

- Branch: `codex-worktree-stabilization-2026-05-26`
- Visible dirty entries: 984
- Tracked dirty entries: 404
- Visible untracked entries: 580
- Tracked deletions: 16
- `git diff --check`: clean, aside from line-ending warnings
- ESLint errors: 0
- ESLint warnings with `--max-warnings=0`: 222
- TypeScript errors: 5,519 total
- TypeScript errors in dirty files: 3,862 across 391 dirty files

## Stabilization completed

- Added ignore coverage for generated Graphify cache artifacts and local runtime uploads.
- Reduced visible untracked/generated noise from the original 2,000+ dirty entries to 572 visible untracked entries.
- Fixed trailing-whitespace and blank-EOF blockers found by `git diff --check`.
- Fixed Next 15 route handler/page signature issues in touched locale/API routes.
- Fixed missing UI/lucide imports that were producing JSX undefined lint errors.
- Repaired POS/auth guard hook-order violations by moving auth/organization returns after hook registration.
- Repaired broken `page2` edit-location routes so they redirect instead of rendering undefined item-edit forms.
- Restored empty update route modules so Next route validation sees valid modules.
- Cleaned malformed `tsconfig.json` include entries.
- Converted a broken POS item-selection JSX fragment into a typed exported component.
- Brought ESLint from hundreds of errors down to zero errors.
- Added `docs/WORKTREE_REVIEW_BUCKETS_2026-05-26.md` so the 984-entry dirty surface can be reviewed by bucket instead of as one mixed change.
- Renamed high-use Prisma relation fields in `prisma/schema.prisma` to application-friendly names without changing mapped table/column names.
- Updated item include helpers, inventory item actions, analytics item/category mappings, dashboard item/category mappings, and TanStack item query hooks to the new relation names.
- Migrated the focused inventory create/edit form tests and item schema/action tests to `nameEn/nameFr`, `titleEn/titleFr`, and `descriptionEn/descriptionFr`.
- Migrated primary seed inventory create payloads for item, category, unit, tax rate, brand description, and production raw-material data to locale-aware fields.
- Normalized item update server action call signatures to object inputs where they flow through hooks and item detail forms.
- Aligned legacy category DTO compatibility types so old callers can receive bilingual category payloads without forcing `title`/`description`.

## Remaining blockers

### TypeScript gate

The TypeScript failure is too large to treat as formatting debt. The main dirty-file error clusters are:

- `actions/inventory/rawInventoryActions.ts` - 106 errors
- `actions/cashSystem/reports/analytics-actions.ts` - 82 errors
- `actions/cashSystem/reports/analiticsActionsLatest.ts` - 82 errors
- `actions/newPOSSession/reports/analytics-actions.ts` - 82 errors
- `lib/analytics/analytics/get-sales-analytics-original.ts` - 82 errors
- `actions/production/productionSystemActions.ts` - 79 errors
- `actions/analytics/get-sales-analytics.ts` - 78 errors
- `prisma/seed.ts` - 65 errors
- `actions/sales-analytics.ts` - 64 errors
- `prisma/comprehensive-seed.ts` - 59 errors
- `components/analytics/DailySalesFinancialDashboard.tsx` - 59 errors
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts` - 59 errors

The dominant causes are Prisma schema/client mismatches, old field names in tests and fixtures, and WIP feature modules whose relation names do not match the generated Prisma API.

The focused Prisma/bilingual cluster now validates more cleanly: `npx prisma validate` passes, and the targeted TypeScript scan no longer reports errors for the patched item relation actions, item query hook, item actions, low-stock analytics action, tax-rate action, item detail pages, or modern item edit wrapper. The remaining hits in that focused scan are the seed files that still depend on removed finance/commercial-agent Prisma models and Decimal arithmetic cleanup.

### Mixed WIP surface

The worktree contains many unrelated changes at once: locale routing, bilingual item/category/unit fields, POS systems, analytics, production, orders, payroll, docs, tests, seeds, and generated analysis reports. This should not be pushed as one unit.

### Untracked source review

There are still 572 visible untracked entries. Many are real source/docs and should not be deleted automatically. They need to be classified into keep/stage, quarantine, or discard with explicit owner intent.

## Recommended next execution order

1. Decide the Prisma relation naming strategy: update code to current snake_case relation names, or deliberately rename relation fields in `schema.prisma` to application-friendly camelCase where safe.
2. Finish the bilingual field migration in tests, fixtures, seeds, and remaining UI surfaces: `nameEn/nameFr`, `titleEn/titleFr`, `descriptionEn/descriptionFr`.
3. Split WIP into reviewable buckets: locale routing, inventory bilingual backend/forms, POS, analytics/finance, production/orders, docs/tests.
4. Quarantine or discard obsolete duplicate routes/components only after approval, because moving/deleting untracked source is irreversible from Git's perspective.
5. Re-run gates after each bucket: `git diff --check`, `npx eslint . --quiet`, `npx tsc --noEmit --pretty false`.

## GitHub readiness

Not ready. A safe GitHub save should wait until the TypeScript blocker is reduced to an intentional, documented residual list and the untracked source files have been classified.
