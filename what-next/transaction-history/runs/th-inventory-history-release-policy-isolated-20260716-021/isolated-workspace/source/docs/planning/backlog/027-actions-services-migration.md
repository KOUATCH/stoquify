---
id: 027
title: Pick ONE home for business logic — migrate actions/ to services/ pattern
area: architecture
priority: P2
effort: M
phase: polish
status: partial
depends_on: [004]
---

# Pick ONE home for business logic — migrate actions/ to services/ pattern

## Problem
The repo has three places where business logic lives:
- `actions/` — 114 `.ts` files, "use server" entry points. Many duplicates: `updatTaxRateById.ts` (typo) AND `updateTaxRateByIdNew.ts`, `newUpdateCategoryById.ts` AND `updateCategoryById.ts`, `newLocationUpdateById.ts` AND `updateLocationById.ts`. Four user-list variants: `getAllUsers.ts`, `getAllMembers.ts`, `getOrgUsers.ts`, `getCurrentUserCount.ts`.
- `services/` — the modernized domain layer per your existing convention (per the user's memory file: "no services layer; server actions → TanStack Query hooks → UI components" — but `services/` exists, so the convention is actually evolving toward services). Properly organized by domain: `brand/`, `category/`, `customer/`, `inventory/`, `item/`, `location/`, `pos/`, `purchase-order/`, `supplier/`, `tax-rate/`, `unit/`. Has its own tests in `services/_test/`.
- `lib/` — utilities + a few business-logic-adjacent helpers.

Per the eslint config, `services/` already has a stricter `no-explicit-any: "error"` rule — clearly the intended canonical layer. But `actions/` is where most of the live code is. New contributors won't know which to use.

## Acceptance criteria
- [ ] `docs/adr/0001-actions-vs-services.md` formalizes the convention: `services/<domain>/<domain>.service.ts` holds business logic; `actions/<domain>/<verb>.ts` is a thin `protect()`-wrapped server-action delegate that calls into the service
- [ ] `CONTRIBUTING.md` (new file) references the ADR and gives a "new server action" recipe
- [ ] Duplicate cleanup (fast wins):
  - [ ] `actions/taxRate/updatTaxRateById.ts` (typo) and `actions/taxRate/updateTaxRateByIdNew.ts` — pick the one called by `app/` / `components/`, delete the other
  - [ ] `actions/categories/newUpdateCategoryById.ts` vs `updateCategoryById.ts` — same
  - [ ] `actions/locations/newLocationUpdateById.ts` vs `updateLocationById.ts` — same
  - [ ] `actions/item/listAllItems.ts` (mock data — covered by #010) vs `actions/itemsShow/getOrgItems.ts` — delete the mock
  - [ ] `actions/users/{getAllUsers,getAllMembers,getOrgUsers,getCurrentUserCount}.ts` — consolidate to two: `listOrgUsers.ts` (paginated) and `countOrgUsers.ts`
- [ ] Migration roadmap in `docs/architecture/actions-to-services.md` lists every domain in `actions/`, the corresponding service file (existing or planned), and a target sprint
- [ ] Pilot one domain end-to-end: pick `actions/categories/` → migrate all of it into `services/category/` + thin `actions/categories/` delegates. Document the work in the migration doc as the template
- [ ] File count in `actions/` drops by ≥ 30% from the duplicate cleanup alone
- [ ] **Test:** `npm run build` and `npm test` succeed after each cleanup batch
- [ ] No new file in `actions/` introduces business logic — enforced by code review checklist in CONTRIBUTING.md; mechanically enforced via #004's ESLint rule once tightened

## Implementation notes
- Don't try to migrate all 114 files in this ticket. Establish the rule + tooling + one pilot domain. Subsequent domain migrations become separate tickets or just incremental hygiene
- Migration pattern:
  ```ts
  // Before — actions/categories/createCategory.ts (200 lines of business logic)
  export async function createCategory(input: CreateCategoryData) { /* ... DB + validation + side effects ... */ }

  // After — services/category/category.service.ts (the logic)
  export class CategoryService {
    async create(orgId: string, input: ValidatedCreateCategoryData) { /* same logic, takes typed input */ }
  }

  // After — actions/categories/createCategory.ts (10 lines, thin wrapper)
  export const createCategory = protect(
    { permission: "categories.create" },
    async (ctx, raw: unknown) => {
      const input = createCategorySchema.parse(raw)
      return categoryService.create(ctx.orgId, input)
    }
  )
  ```
- The user's existing memory says "no services layer" but the codebase has clearly evolved past that. This ticket updates the convention to match reality, and the ADR makes it explicit

## Out of scope
- Migrating from `actions/` (server actions) to API routes — keep server actions as the entry point; only the internal organization changes
- Restructuring the entire folder layout (e.g. monorepo with `apps/`, `packages/`) — overkill at this stage

## Resolution
**Partial** 2026-05-23 — ADR + pilot + CONTRIBUTING.md landed. The bulk migration of the remaining ~100 action files is incremental work tracked here.

**Done:**
- [ADR-0001](../adr/0001-actions-vs-services.md) codifies the convention. Settles "where does this code go?" once and for all.
- `CONTRIBUTING.md` at repo root explains the pattern with the categories pilot as a worked example. New contributors point here.
- **Pilot domain: `actions/categories/`** — already followed the actions→services pattern (delegated to `services/category/category.service.ts`). Cleaned up:
  - Deleted `newUpdateCategoryById.ts` — was a stale re-export of the canonical handler.
  - Added missing permission checks (`can(user, "categories.create|update|delete")`) to `createCategory`, `updateCategoryById`, `deleteCategory`. Previously any authenticated user could mutate categories regardless of role.
- The pilot serves as the reference example in CONTRIBUTING.md.

**Outstanding domains to migrate** (per the #003 audit doc's outstanding list):
- `actions/pos-station-actions.ts`, `actions/pos-terminal-actions.ts` — high-priority (money path)
- `actions/item/*` — high-traffic
- `actions/customers/`, `actions/suppliers/`, `actions/brands/`, `actions/locations/`, `actions/stock/`, `actions/transfers/`, `actions/taxRate/`, `actions/roles/`, `actions/savings/`, `actions/purchaseOrderWorkflow/`, `actions/item-suppliers/` — medium-priority bulk

Total: ~10 directories, each ~2-6 files. Estimate ~2 days of focused work at the demonstrated pace. The ESLint rule that flags `actions/**/*.ts` without `protect()` import (deferred to a CI follow-up) will keep new actions from regressing.

**Duplicates and dead files identified for the broader sweep:**
- `actions/taxRate/updatTaxRateById.ts` (typo) vs `updateTaxRateByIdNew.ts`
- `actions/locations/newLocationUpdateById.ts` vs `updateLocationById.ts`
- 4 user-list variants in `actions/users/` (`getAllUsers`, `getAllMembers`, `getOrgUsers`, `getCurrentUserCount`) — consolidate to two (`listOrgUsers`, `countOrgUsers`).
