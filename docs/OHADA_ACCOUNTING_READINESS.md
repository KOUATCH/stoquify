# OHADA Accounting Readiness Baseline

Date: June 3, 2026

This document defines the current clean baseline for preparing StockFlow for the upcoming OHADA accounting work.

## Current Verification Gate

Run:

```bash
npm run verify:repo
```

This runs:

```bash
npm run prisma:validate
npm run typecheck
```

As of this baseline:

- `prisma/schema.prisma` validates.
- The active app TypeScript surface passes.
- `npm run build` completes with lint disabled during the Next production build.
- Generated experiments, local outputs, tests, scripts, and draft/legacy modules are not part of the app typecheck.

Lint remains a separate cleanup stream. Use `npm run build:linted` only when the existing lint-warning backlog is being addressed.

## Cleanup Completed

### Repository Hygiene

- Added `.gitattributes` to normalize line endings for source files.
- Expanded `.gitignore` for local logs, Codex temp output, generated experiment output, report outputs, and seed images.
- Added repeatable repo scripts:
  - `typecheck`
  - `prisma:validate`
  - `prisma:generate`
  - `verify:repo`

### Active Type Fixes

- Fixed location management service relation drift:
  - `posTerminals` -> `posStations`
  - `stockTransfersFrom` -> `transfersFrom`
  - `stockTransfersTo` -> `transfersTo`
- Fixed inventory adjustment Decimal handling so service results return explicit numbers.
- Fixed POS query hook date field names and invalid TanStack Query invalidation keys.
- Fixed `next-intl` request locale fallback so the returned locale is always a string.
- Fixed client sign-out overload typing for NextAuth.
- Fixed active auth server redirect typing without weakening strict mode.
- Removed an undeclared `@sentry/nextjs` import from the shared server-action protection wrapper.
- Updated unused auth helper role selection to match the active `Role` schema.
- Fixed item payload nullability for stock fields.
- Removed remote Google font build dependencies so production builds work without network access.
- Split UploadThing SSR router config so server-only auth/password code is not imported into the client provider bundle.
- Added `metadataBase` to avoid social metadata falling back to localhost during production builds.

## Quarantined Surfaces

These files and directories are intentionally excluded from the app TypeScript baseline until they are deliberately repaired or reactivated:

- `__tests__/**`
- `ideas/**`
- `outputs/**`
- `scripts/**`
- `prisma/*.ts`
- `graphify-out/**`
- Legacy dashboard and old dashboard routes.
- Draft finance actions that reference inactive Prisma models.
- Draft payroll and presence actions/hooks/components.
- Old POS/session/cash-system modules.
- Generated or experimental inventory, transfer, sales, delivery, production, and commercial-agent modules.

This is not a statement that the quarantined code is useless. It means it is not part of the clean production baseline for OHADA accounting work.

## Accounting Work Rules

Before adding OHADA ledger models or posting logic:

1. Keep `npm run verify:repo` passing.
2. Do not add accounting logic to UI components.
3. Put accounting business logic in `services/accounting/*`.
4. Keep server actions thin: auth, authorization, validation, service call, cache invalidation.
5. Validate all accounting commands at the server boundary.
6. Require organization scoping on every accounting model and query.
7. Use immutable journal postings. Do not edit posted accounting entries in place.
8. Use reversals for corrections.
9. Use idempotency keys for POS, purchasing, payments, fiscal documents, and offline sync.
10. Add tests for every posting rule before wiring it into production flows.

## First OHADA Accounting Prerequisites

The next accounting branch should start with:

1. Finance schema decision:
   - Decide whether `prisma/schema-financial.prisma` is merged, rewritten, or discarded.
   - Remove references to inactive AR/AP Prisma delegates.
2. Ledger schema:
   - `ChartOfAccount`
   - `AccountingPeriod`
   - `Journal`
   - `JournalEntry`
   - `JournalEntryLine`
   - `PostingRule`
   - `LedgerPostingBatch`
3. Posting service:
   - Balanced debit/credit validation.
   - Source-document idempotency.
   - Organization scoping.
   - Transaction-safe writes.
4. First posting integrations:
   - Completed POS sale.
   - Payment received.
   - Purchase receipt.
   - Supplier payment.
   - Expense.
   - Stock adjustment.

## Remaining Risks

- The worktree still contains many pre-existing modified, deleted, and untracked files. Review before committing.
- Tests are quarantined from the app typecheck because the current suite mixes Jest and Vitest assumptions and has stale server-action mock types.
- Several legacy modules are excluded because they reference stale schemas or missing dependencies.
- Prisma still warns that `package.json#prisma` is deprecated for Prisma 7. This does not fail the current gate, but should be migrated to `prisma.config.ts` in a future maintenance pass.
- The lint backlog is still large, especially hook dependency and image optimization warnings. It is separated from the production build so accounting work can proceed on a compiling baseline.
- The upcoming OHADA accounting work should not rely on draft finance or payroll code until those domains are reconciled with the active Prisma schema.
