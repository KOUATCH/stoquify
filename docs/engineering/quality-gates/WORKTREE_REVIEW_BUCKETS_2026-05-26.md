# Worktree Review Buckets - 2026-05-26

This file splits the remaining dirty surface into reviewable buckets so the repo can be stabilized without mixing unrelated work into one review.

## Current Snapshot

- Branch: `codex-worktree-stabilization-2026-05-26`
- Visible dirty entries from `git status --porcelain -uall`: 984
- Tracked dirty entries: 404
- Untracked entries: 580
- Known blocker class: TypeScript errors are now concentrated around broad inventory raw actions, duplicated analytics/reporting actions, seed files, POS/session reporting, purchase/order workflows, production, and Decimal conversions.

## Review Buckets

| Bucket | Entries | Review intent | Primary paths |
| --- | ---: | --- | --- |
| Config and miscellaneous | 243 | Confirm tool/config changes and classify remaining root-level files. | `.eslintrc.json`, `.gitignore`, `tsconfig.json`, `package.json`, root files |
| Locale routing and i18n | 120 | Review `[locale]` route pass, message files, navigation helpers, and dashboard/home parity. | `app/[locale]`, `i18n`, `messages` |
| Docs and reports | 114 | Keep stabilization reports, archive duplicates later, avoid mixing docs with runtime fixes. | `docs`, root reports, `ideas` |
| Other components | 112 | Triage component edits that are outside inventory/POS/shared UI. | `components/**` |
| Bilingual inventory | 98 | Finish `nameEn/nameFr`, `titleEn/titleFr`, `descriptionEn/descriptionFr` from forms through actions, hooks, tests, and seeds. | `actions/item*`, `actions/categories`, `actions/units`, `components/**inventory**`, `hooks/useItems*`, `types/item*`, `lib/item` |
| POS, sales, and finance | 83 | Align generated Prisma relations for sessions, terminals, sales orders, cash drawers, and analytics. | `actions/analytics`, `actions/finance`, `actions/cash*`, `components/newPOSSession`, `components/cashSystem`, `hooks/usePOSQueries.ts` |
| Orders, purchasing, production, delivery | 41 | Align purchase/sales order relation naming first; defer production model mismatch until order flow compiles. | `actions/purchaseOrderWorkflow`, `actions/orders`, `actions/delivery`, `actions/production`, `components/purchase-orders`, `components/orders`, `components/production` |
| Shared UI and tables | 39 | Review table/data-grid additions after domain API types stabilize. | `components/ui`, `components/tables`, `components/DataTableComponents` |
| Other actions | 36 | Sweep server action return types, auth checks, and Prisma includes after core model names settle. | `actions/**` outside named buckets |
| Other hooks | 24 | Normalize TanStack Query keys and invalidations after server action signatures settle. | `hooks/**` outside named buckets |
| Auth redirects and forms | 23 | Keep locale context intact across login, register, forgot-password, auth errors, sign-in/out, and post-auth dashboard navigation. | `app/(auth)`, `app/auth`, `auth.ts`, `middleware.ts`, `lib/auth*`, auth forms |
| Tests | 16 | Update fixtures/assertions for bilingual inventory fields and Prisma relation aliases. | `__tests__` |
| Prisma schema and seeds | 13 | Align client relation names and seed data with locale-aware fields. | `prisma/schema.prisma`, `prisma/*seed*.ts`, migrations |
| Generated graphify files | 10 | Keep ignored; do not review as source. | `graphify-out` |
| Legacy service deletions | 9 | Review explicit API-service deletions separately before accepting removal. | `services/*API.ts` |

## Execution Order

1. Prisma relation naming for the highest-count generated-client mismatch clusters.
2. Bilingual inventory test and seed fixtures.
3. Locale auth/home redirects and link cleanup.
4. POS/sales/purchase TypeScript fallout after Prisma client generation.
5. Component and hook cleanup once server action contracts are stable.
6. Final review of untracked reports, generated artifacts, and service deletions before staging.

## Progress Notes

- Prisma relation aliasing is now in place for the main inventory, order, POS session, location, user, and transaction relations.
- Focused item action/hook/form relation errors are cleared in the targeted TypeScript scan.
- Inventory create/edit tests and primary seed inventory payloads now use locale-aware fields.
- Remaining seed failures are not simple bilingual-field drift; they are mainly removed commercial-agent/finance Prisma models and Decimal arithmetic operations.

## Guardrails

- Do not revert existing user work while stabilizing.
- Keep graphify output and uploads ignored.
- Keep schema relation changes API-only unless a database column migration is explicitly required.
- Do not push until `prisma validate`, lint, and a meaningful TypeScript trend check are clean enough to review.
