# Edit Item Workflow Refactor — Implementation Report

Date: 2026-08-05  
Route: `/:locale/dashboard/inventory/items/[id]/edit`  
Outcome: **Implementation complete; authenticated edit-page browser smoke blocked by unavailable item permissions.**

## Executive result

The edit route is now a complete dedicated-page item-master workflow instead of an always-open modal shell. Every field exposed by the explicit edit contract is loaded through a typed DTO, validated through one shared Zod contract, and persisted through one tenant-scoped atomic service transaction. Form navigation, field changes, blur, uploads, validation, and Enter do not invoke persistence. Only an explicit **Save changes** click can call the update action, and a synchronous save lock prevents duplicate updates.

The lowercase dynamic route is present in fresh production artifacts:

```text
"/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/page"
  -> "/[locale]/dashboard/inventory/items/[id]/edit"
```

A real-item authenticated browser smoke could not be executed because none of the available authenticated organization sessions grants `inventory.items.read` or `inventory.items.update`. This is recorded as a blocker, not a pass.

## Root causes

1. **Route-entry inconsistency.** The route used `Page.tsx` rather than the reserved lowercase `page.tsx`, which made production discovery unreliable on case-sensitive builds.
2. **Dedicated route wrapped an editor modal.** `EditItemClient` forced an always-open dialog and redirected whenever the modal closed, so the route was not a true page workflow.
3. **Incomplete UI.** Only basic/overview tabs had real content; remaining visible tabs rendered `Tab content for …` placeholders.
4. **Split persistence.** Six independent form/mutation paths updated basic data, details, pricing, relations, stock policy, and tracking separately. A successful section save closed the editor, so there was no coherent whole-item review or commit.
5. **Weak contracts.** The route/client passed `unknown` values through `as never`, while the legacy item DTO omitted fields selected for this workflow such as reorder policy, lifecycle flags, tracking flags, and MSRP. Prisma-backed UPC, EAN, MPN, ISBN, color, and size were not selected for the supported edit contract.
6. **No stale-write protection.** The split updates had no edit version check and could silently overwrite a newer item state.
7. **Image lifecycle ambiguity.** Image upload and item persistence were not presented as separate stages in the edit workflow.
8. **Architecture graph confirmation.** The existing graph node `components_dashboard_items_modernitemformforediting_tsx` in community 68 contained the legacy per-section submit handlers. The action graph also contained six distinct update nodes (`updateItemBasicInfoAction()`, `updateItemDetailsAction()`, `updateItemPricingAction()`, `updateItemRelationsAction()`, `updateItemStockAction()`, and `updateItemTrackingAction()`), confirming the fragmented boundary.

## Implemented / partial / missing / risky matrix

| Area | Status | Result |
|---|---|---|
| Lowercase dynamic route | Implemented | `page.tsx` exists and production manifest maps the exact edit URL. |
| Dedicated-page UI | Implemented | Modal/dialog state and placeholder tabs were removed. |
| Responsive hierarchy | Implemented | Page header, horizontal/mobile and sticky/desktop section navigation, six semantic sections, and fixed action bar. |
| Accessibility | Implemented | Semantic form/section headings, labels, required/error messages, alert/live regions, keyboard-safe buttons, and visible save state. |
| Supported edit-contract fields | Implemented | Names/descriptions, primary and retained images, SKU/barcode, dimensions/weight, cost/sell/MSRP, category/brand/unit/tax, inventory tracking and min/max/reorder policy, active/discontinued lifecycle, and serial/batch/expiry tracking. |
| Prisma-backed fields outside this edit contract | Deferred/explicit | UPC, EAN, MPN, ISBN, color, and size are not rendered, accepted by `updateItemFromFormSchema`, or written by `updateItemFromForm`. Unknown submitted values are stripped. |
| Explicit persistence | Implemented | Only the `Save changes` button executes `updateItemFromFormAction`. |
| Duplicate updates | Implemented | A synchronous ref lock plus saving state allows one in-flight mutation. |
| Validation/recovery | Implemented | Shared client/server schema; failed validation, upload, or save retains form state. |
| Unsaved navigation | Implemented | Cancel/back confirmation plus `beforeunload` protection. |
| Atomic persistence | Implemented | One Prisma transaction validates and updates the item master once. |
| Concurrency | Implemented | `updatedAt` optimistic comparison rejects stale editors before update. |
| Secondary images | Implemented | Primary replacement preserves existing secondary image references. |
| Tenant/RBAC | Implemented | Route permission, action permission/audit decision, server-owned org, tenant lookups, and tenant-scoped relations. |
| Stock boundary | Implemented | No quantity mutation or stock event is part of the editor; boundary gate has zero active violations. |
| Tracking-history safety | Implemented, conservative | Tracking policy changes are rejected once inventory transaction or serial evidence exists. |
| Upload file cleanup on cancel | Deferred/risky | Item data remains unchanged, but a newly uploaded replacement can remain as an unreferenced storage object if the user cancels. Storage garbage collection is outside this refactor. |
| Production build command | Partial | Caller timed out after 424 seconds; the child finished and wrote a fresh `.next/BUILD_ID` and route manifest. No build process remained. |
| Authenticated browser edit smoke | Missing/blocked | No available session has item read/update permissions; no real tenant item ID could be discovered. |
| Before/after edit screenshots | Missing/blocked | Not produced because the edit route could not be opened with an authorized browser session. |
| Authenticated unauthorized state | Implemented | Server RBAC redirect captured under the evidence directory. |

## Architecture and persistence decision

### Decision

Use one shared `updateItemFromFormSchema`, one `ItemEditDTO`, one server action, and one service-owned Prisma transaction.

### Transaction controls

The service transaction:

1. Finds the item by `id + organizationId + deletedAt: null`.
2. Compares the server `updatedAt` with the opened edit version.
3. Checks tenant-scoped SKU and barcode conflicts.
4. Validates category, brand, unit, and tax references inside the same organization.
5. Rejects tracking-policy changes when inventory/serial evidence already exists.
6. Updates all fields in the supported edit contract once.
7. Preserves secondary image references while replacing the primary.
8. Returns a fresh typed DTO.

No database migration was necessary. Current Prisma fields support the implemented contract. UPC, EAN, MPN, ISBN, color, and size remain outside this UI/action contract; slug, organization identity, timestamps, and stock quantities remain server/system-owned rather than editable fields.

## Event sequences

### Previous sequence

```text
Route open
  -> route fetches partial ItemDTO
  -> client casts unknown data with as never
  -> always-open Dialog mounts
  -> user selects a tab
  -> one of six independent forms validates
  -> one split mutation/action/service call persists a subset
  -> success closes dialog and redirects
```

Consequences: placeholder sections, no whole-item dirty state, no single review/save point, fragmented failure recovery, and possible partial updates.

### Corrected sequence

```text
Route open
  -> server checks inventory.items.update
  -> server derives organization from authenticated user
  -> tenant-scoped full ItemEditDTO loads
  -> dedicated page renders all item-master sections
  -> changes/navigation/blur/Enter stay local
  -> replacement image uploads and its URL is staged
  -> user explicitly clicks Save changes
  -> shared Zod validation runs
  -> duplicate-submit lock engages
  -> action derives org/actor and checks RBAC with auditAllowed
  -> service transaction checks tenant/version/duplicates/relations/tracking safety
  -> one item-master update commits
  -> cache paths revalidate
  -> success notification and list navigation
```

Failure branches retain the edited values and show a recoverable error. Validation and upload failures never call the item update.

## Files changed

### Route and UI

- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/page.tsx`
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/EditItemClient.tsx`
- `components/dashboard/items/ModernItemFormForEditing.tsx`

### Contract, action, and service

- `lib/item/schemas.ts`
- `actions/item/items.ts`
- `services/item/item.service.ts`

### Focused tests

- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/__tests__/page.test.tsx`
- `components/dashboard/items/__tests__/ModernItemFormForEditing.test.tsx`
- `lib/item/__tests__/edit-item-schema.test.ts`
- `actions/item/__tests__/edit-item.action.test.ts`
- `services/item/__tests__/edit-item.service.test.ts`

### Evidence and report

- `what-next/evidence/edit-item-workflow-2026-08-05/authenticated-unauthorized-desktop.png`
- `what-next/evidence/edit-item-workflow-2026-08-05/browser-smoke-blocked.md`
- `what-next/edit-item-workflow-refactor-2026-08-05.md`

No unrelated lint findings or dirty worktree changes were modified.

## Security and tenant controls

- Route guard: `checkPermission("inventory.items.update")`.
- Action guard: `requirePermission("inventory.items.update", { resource: "Item", resourceId, auditAllowed: true })`.
- Inventory module entitlement is evaluated in enforce mode on both the page and action; denial redirects or fails before persistence.
- Client input cannot set organization or actor identity; the edit schema strips unknown fields and contains no organization/actor field.
- The action uses `ctx.orgId` from the authenticated RBAC context.
- Item lookup and duplicate checks are tenant-scoped.
- Category, brand, unit, and tax references are tenant-scoped on the server.
- Stale writes and duplicate SKU/barcode writes fail before persistence.
- Safe action error handling prevents raw database/internal errors reaching the UI.
- The route returns the same not-found presentation for missing and other-tenant item IDs.
- Tracking policy cannot be changed after inventory/serial evidence exists.
- Stock movement remains exclusively in inventory event/adjustment workflows.

## Tests and command results

| Command | Result |
|---|---|
| Exact Jest: five edit-item paths with `--runTestsByPath --runInBand` | PASS — 5 suites, 27 tests |
| Focused ESLint on route/UI/schema/action/service/tests | PASS |
| `npx tsc --noEmit --pretty false` | PASS — final run 79.7 s |
| `npm run inventory:boundary:fail` | PASS — 0 active violations, 27 allowlisted kernel/test findings |
| `git diff --check` on edit-item files | PASS; only line-ending normalization warnings |
| `npm run build:app` | BLOCKED/PARTIAL — caller timed out after 424 s |
| Fresh production artifact check | PASS — fresh `.next/BUILD_ID`; exact edit route found in `.next/app-path-routes-manifest.json` |
| Authenticated browser preflight | BLOCKED for edit page — all stored sessions lack item read/update |

Focused Jest coverage includes:

- Dedicated page and all six non-placeholder sections
- No persistence on load, field change, navigation, or Enter
- Explicit save and duplicate-submit protection
- Client/server validation failure
- Successful update contract
- Save failure recovery
- Primary image staging and upload failure
- Unsaved navigation confirmation
- Tenant-scoped route loading and not-found state
- Server-owned organization identity
- RBAC rejection
- Page/action module-entitlement allow and deny behavior
- Safe errors and cache revalidation
- Tenant, optimistic concurrency, duplicate identifiers, relations, tracking evidence, and no stock movement

## Browser evidence and explicit blocker

Evidence directory: `what-next/evidence/edit-item-workflow-2026-08-05/`.

Available evidence:

- `authenticated-unauthorized-desktop.png`
- `browser-smoke-blocked.md`

The four existing Playwright storage states authenticate, but `/api/me/permissions` confirms that none grants `inventory.items.read` or `inventory.items.update`. The authenticated inventory-loss session redirects to `/en/unauthorized`; this was captured. The repository-documented inventory login returned HTTP 401.

Therefore desktop/tablet/mobile edit rendering, real-ID opening, successful browser update, validation, image replacement, upload failure, save failure, unsaved navigation, and tenant-scoped not-found checks are explicitly **blocked and not claimed as passed**.

## Remaining risks and deferred boundaries

1. Provide or seed an authorized, organization-scoped inventory editor fixture and rerun the browser matrix with a real item ID.
2. Capture desktop, tablet, and mobile before/after screenshots only after that session is available.
3. Add storage-level cleanup/expiry for replacement uploads abandoned before save; this is separate from item-master persistence.
4. The tracking-history gate is intentionally conservative. A future evidence migration workflow may permit narrowly safe policy conversions.
5. UPC, EAN, MPN, ISBN, color, and size require an explicit product decision and end-to-end contract addition before they can be claimed as editable.
6. Only the primary image is editable in this UI; existing secondary image references are preserved but not rearranged.
7. The build wrapper should be run in an environment whose command timeout exceeds the repository’s build duration to obtain a normal exit-code artifact, even though this run produced a fresh complete route manifest and build ID.

## Success criteria disposition

- Exact edit route exists and production discovery is verified: **Yes**.
- Real organization-scoped ID opens in authenticated browser: **Blocked**.
- Complete dedicated-page workflow: **Yes**.
- Create-form-level hierarchy, responsiveness, clarity, accessibility, recovery: **Implemented and focused-test verified; visual browser review blocked**.
- No placeholder content: **Yes**.
- Every field in the explicit edit contract loads and validates through typed contracts; UPC/EAN/MPN/ISBN/color/size are explicitly deferred: **Yes**.
- No implicit mutation; explicit save only: **Yes**.
- Duplicate updates prevented: **Yes**.
- Upload/save failures preserve recoverable state: **Yes**.
- Tenant isolation, RBAC, entitlement boundary, auditable permission decision, safe errors: **Yes**.
- Stock movement outside editor: **Yes**.
- Focused tests/lint/TypeScript/inventory boundary: **Pass**.
- Route build verification: **Artifact pass; command exit blocked by caller timeout**.
- Unrelated code/lint/user changes untouched: **Yes**.
