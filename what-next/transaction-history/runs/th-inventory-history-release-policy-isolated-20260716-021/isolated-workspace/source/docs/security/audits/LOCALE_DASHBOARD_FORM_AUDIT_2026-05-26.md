# Locale Dashboard Form Audit - 2026-05-26

## Scope

Reviewed the new `app/[locale]/(dashboard)/dashboard` form surface with emphasis on create flows for inventory items, categories, brands, units, locations, and purchase orders.

Graph context was checked through `graphify-out/GRAPH_REPORT_app.md` and component graph matches. The graph confirms these forms are mostly thin, isolated route communities, which matches the code-level finding: each route performs its own `FormData` parsing and action contract mapping instead of sharing a stable form/action boundary.

## Architecture Decision

The canonical backend contract must use locale-sensitive field names all the way through the stack. Forms, route-level `FormData` parsing, server actions, service helpers, and Prisma writes should use fields such as `nameEn`, `nameFr`, `titleEn`, `titleFr`, `descriptionEn`, and `descriptionFr`.

Generic aliases such as `name`, `title`, and `description` are allowed only as temporary compatibility shims for older callers or display DTOs. They should not be the primary create/update contract for locale-aware entities.

Current schema support:

- Items: supported with `nameEn`, `nameFr`, `descriptionEn`, `descriptionFr`.
- Categories: supported with `titleEn`, `titleFr`, `descriptionEn`, `descriptionFr`.
- Units: supported with `nameEn`, `nameFr`.
- Brands: only `brandName` is available for the name in Prisma today. Brand descriptions support `descriptionEn` and `descriptionFr`; bilingual brand names require a schema migration before the name itself can be locale-sensitive.

## Critical Findings

1. Item, category, and unit creation must keep bilingual field names intact from form submission to Prisma writes.
2. Generic `name`, `title`, and `description` aliases still exist in some DTOs and lookup mappings. These are acceptable for display compatibility only, but should not become the canonical mutation contract.
3. Brand names are not yet fully locale-aware because the database model only exposes `brandName`. A brand-name migration is required to add true `brandNameEn`/`brandNameFr` or equivalent fields.
4. Brand create previously omitted `organizationId`, which the action requires for tenant scoping.
5. Unit create previously omitted `organizationId`.
6. Purchase order create route imports `@/actions/purchaseOrderWorkflow/purchase-order.actions`, but the implementation present in the repo is `actions/purchaseOrderWorkflow/newPOActions.ts`.
7. Several create actions revalidate `/inventory/...` paths instead of `/dashboard/inventory/...`, so dashboard cache refreshes can miss the localized dashboard surface.
8. Some server actions use inconsistent success/error result semantics. Purchase-order actions return success messages in an `error` property.
9. Item form state management is fragile: hidden preservation fields, delayed restoration, and extensive debug logging indicate the wizard is compensating for state registration issues.
10. Form UI is visually heavy for operational dashboard workflows. The first UX improvement after correctness should be reducing noise, normalizing actions, and keeping users focused on input and validation.

## Execution Plan

### Phase 1 - Correctness Stabilization

- Align forms and route-level `FormData` parsing around canonical locale-sensitive field names.
- Pass `organizationId` through brand/unit/category create flows.
- Normalize lookup DTOs passed into item create form.
- Fix purchase-order create import.
- Revalidate canonical dashboard paths.

### Phase 2 - Action Contract Cleanup

- Replace entity DTO reuse with explicit create input types.
- Keep backward-compatible aliases where older forms still submit legacy field names.
- Return a shared action result shape with `message`, `formError`, and `fieldErrors`.

### Phase 3 - UX/Form Architecture

- Move repeated dashboard create-page patterns into a small `FormShell`/`FormActions` layer.
- For multi-step forms, use `shouldUnregister: false` and remove hidden field restoration hacks.
- Use explicit localized cancel targets instead of `router.back()`.
- Reduce noisy notifications and debug logging.

## Started Work

Execution began with Phase 1 because these issues directly block successful record creation.

## Execution Log

- Created this report in `docs/LOCALE_DASHBOARD_FORM_AUDIT_2026-05-26.md`.
- Updated item/category/unit create forms and routes to submit and read canonical bilingual fields.
- Updated brand create form and route to submit bilingual descriptions; brand name remains `brandName` until the database supports bilingual brand-name columns.
- Removed hardcoded default-locale NextAuth page URLs and localized auth redirects in the focused auth helper paths.
- Kept login, register, and forgot-password links/redirects locale-aware through `localizePath`/`localizedHref`.
- Stopped trusting hidden `organizationId` in item/brand/unit create server actions and resolved organization context from the authenticated user where route-level context is available.
- Added lookup normalization for item create unit and tax-rate dropdown data.
- Reworked category, brand, and unit create actions to accept explicit create inputs, support legacy aliases, and revalidate dashboard paths.
- Fixed purchase-order create, detail, listing, and edit imports under the locale dashboard to use `actions/purchaseOrderWorkflow/newPOActions.ts`.
- Updated item creation to write bilingual item fields (`nameEn`, `nameFr`, `descriptionEn`, `descriptionFr`) and array-backed `imageUrls`.
- Updated category and unit update paths to map legacy aliases into canonical bilingual Prisma fields instead of writing non-schema `title` or `name` keys.
- Normalized touched inventory create/update action revalidation paths from `/inventory/...` to `/dashboard/inventory/...`.
- Updated item include helpers and item list/basic/tracking mutations to match the bilingual Prisma relation/field names used by the generated client.

## Verification

- Targeted `eslint` passed for the touched inventory/category/unit/brand forms, locale create routes, auth files, and related server actions/helpers.
- Focused auth redirect scan found no remaining `/en` hardcodes or raw `redirect("/login")`/`redirect("/register")`/`redirect("/unauthorized")` in the audited auth/post-auth files.
- Full `tsc --noEmit` is currently blocked by existing missing ambient type packages: `babel__generator`, `babel__template`, and `babel__traverse`.
- Targeted `git diff --check` passed for the touched files.
- `git diff --check` is blocked by pre-existing whitespace issues in unrelated files (`actions/brands/createBrands.ts`, `actions/itemsShow/createActionItem.ts`, `actions/itemsShow/updateItemById.ts`, `actions/itemsShow/updateItemStockById.ts`, and `hooks/newHooks/use-all-supplier-queries.ts`).
