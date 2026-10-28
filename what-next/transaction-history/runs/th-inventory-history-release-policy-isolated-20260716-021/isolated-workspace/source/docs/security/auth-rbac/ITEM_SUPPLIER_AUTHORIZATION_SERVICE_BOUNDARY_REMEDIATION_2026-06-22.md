# Item-Supplier Authorization and Service-Boundary Remediation

Date: 2026-06-22

## Scope

Closed the legacy item-supplier boundary gap by moving item-supplier reads and writes out of server actions and into `services/supplier/supplier.service.ts`.

## Changes

- `actions/suppliers/itemSupplierActions.ts` now authenticates through canonical RBAC, resolves tenant scope from the trusted RBAC context, and delegates all reads/writes to supplier service methods.
- `actions/item-suppliers/addItemSuppliers.ts` now performs RBAC checks before bulk linking suppliers to an item and delegates `createMany` to the service.
- `actions/item-suppliers/getItemWithSuppliers.ts` now performs RBAC checks before item supplier reads and delegates item/supplier projection to the service.
- `services/supplier/supplier.service.ts` now owns item-supplier list, detail, create, update, delete, bulk-link, item-scoped read, and item-with-suppliers read workflows.
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/AddSuppliersToItemModal.tsx` now respects failed action results instead of showing success after a denied write.

## Controls

- Reads require `inventory.items.read` and `purchases.suppliers.read`.
- Creates/bulk links require `inventory.items.update` and `purchases.suppliers.create`.
- Updates require `inventory.items.update` and `purchases.suppliers.update`.
- Deletes require `inventory.items.update` and `purchases.suppliers.delete`.
- Caller-provided organization IDs are no longer trusted as tenant authority. Actions use `ctx.orgId` from RBAC context and reject explicit cross-tenant organization requests.
- Service methods validate item and supplier ownership before creating, updating, deleting, or reading item-supplier links.

## Regression Tests

- Added action denial tests for missing canonical RBAC permissions.
- Added action cross-tenant tests for explicit organization mismatch.
- Added service tests proving cross-tenant item/supplier IDs fail before reads or writes.

## Verification

- `npm test -- --runInBand services/supplier/__tests__/supplier.service.test.ts actions/suppliers/__tests__/itemSupplierActions.test.ts actions/item-suppliers/__tests__/item-suppliers.actions.test.ts`: PASS, 3 suites / 10 tests.
- `npm run service:boundary:ratchet`: PASS. Baseline active findings 76; current active findings 57; resolved 19; new findings 0.
- Direct action sanity scan for Prisma imports/calls in the three item-supplier action files: PASS, no matches.
- `npm run verify:repo`: FAILED in an unrelated dirty finance surface after Prisma validate, typecheck, lint, policy gates, and build compile succeeded. Blocker: `components/finance/FinanceSpecializedLedgerSurfaces.tsx:733` references missing `dashboardToneClass`; TypeScript suggests `dashboardPanelClass`.

## Remaining Work

The item-supplier remediation is complete. Full repo verification is blocked by unrelated finance/evidence/dashboard work already present in the dirty worktree.
