# P04-R03 current-source scope and guard inventory

Captured 2026-11-04T09:23:53.370Z against HEAD `80e4abb283216b9f8e04b94e5020393f7dcabf62` and the dirty-tree source snapshots. [Hash manifest](source-manifest.json) records 25 inventoried files and 3 dated graph files; [machine register](call-chain-register.json) contains each chain and exact messages. No product files were edited by the inventory agent.

## Nine admitted error-response obligations

| Handler (actions/item/items.ts) | Permission | Service | Existing checks/effects |
|---|---|---|---|
| `getItemAction` (pre-repair line 97) | `inventory.items.read` | `getItemWithRelations` | tenant-filtered item.findFirst; missing returns Item not found; none |
| `listItemsAction` (pre-repair line 118) | `inventory.items.read` | `listItemsWithRelations` | server ctx.orgId overwrites caller organizationId; tenant-filtered count/findMany; none |
| `updateItemBasicInfoAction` (pre-repair line 180) | `inventory.items.update` | `updateItemBasicInfoWithRelations` | transaction: existing image row tenant lookup, claimItemPictures tenant-bound claim, assertItemInTenant then update; item plus optional picture attachment; transaction |
| `updateItemDetailsAction` (pre-repair line 199) | `inventory.items.update` | `updateItemDetailsWithRelations` | assertItemInTenant; same-tenant SKU duplicate check then update; item; existing separate prechecks/update |
| `updateItemPricingAction` (pre-repair line 218) | `inventory.items.update` | `updateItemPricingWithRelations` | assertItemInTenant then update; item; existing separate precheck/update |
| `updateItemRelationsAction` (pre-repair line 237) | `inventory.items.update` | `updateItemRelationsWithRelations` | assertItemInTenant; same-tenant category/brand/unit/taxRate checks via assertItemRelations then update; item; existing separate prechecks/update |
| `updateItemStockAction` (pre-repair line 256) | `inventory.items.update` | `updateItemStockFromForm` | nonzero adjustment also requires inventory.stock.adjust; transaction existingItem tenant lookup; stock policy update; requestManualItemStockAdjustment verifies item active/tracked/location; createStockAdjustment module admission and tenant references; item stock policy, draft adjustment/lines; no posted stock movement; transaction rollback on denial |
| `updateItemTrackingAction` (pre-repair line 283) | `inventory.items.update` | `updateItemTrackingWithRelations` | assertItemInTenant then update; item; existing separate precheck/update |
| `deleteItemAction` (pre-repair line 302) | `inventory.items.delete` | `archiveItem` | tenant lookup with evidence relation counts then archive flags/date; item archival; no hard deletion |

All nine parse their actual schema before authorization. The server derives organization/user from `requirePermission`; client organization fields never grant scope. Reads use `auditAllowed:false`; mutations use `auditAllowed:true`. A nonzero inventory adjustment requires a second `inventory.stock.adjust` permission before service execution. Current RBAC reloads active verified/unlocked user, active organization and same-tenant roles through Better Auth with disabled cookie cache. That source inspection is not signed-cookie/session runtime qualification. Existing security-audit effects are not unauthorized business writes.

Basic-info and stock writes retain their transaction boundaries. Basic-info image claims use tenant-bound ready assets. Stock writes can request draft adjustment approval inside the existing transaction; the action does not post a stock movement. Other item mutations preserve their existing tenant lookup/update sequencing. This response repair does not certify those operations against every race, location rule or module boundary.

## Minimal response contract

Retain `{success:false,error:string}` and all successful return values/messages. Use the existing `safeLoggedActionErrorMessage` with an explicit operation fallback. A helper call with no fallback is insufficient: current canonical handling admits raw strings and ApplicationError-like messages. Preserve only reviewed constant business messages paired with trusted error classes; do not pass arbitrary `.message`, dynamic SKUs, database/provider detail, raw Zod issues or structurally spoofed error codes. Keep the explicit read-null `Item not found` branch. Existing safe logging emits category/code/correlation metadata without raw exception text.

| Trusted class | Approved source literal | Applies to |
|---|---|---|
| `NotFoundError` | Item not found | `updateItemBasicInfoAction`, `updateItemDetailsAction`, `updateItemPricingAction`, `updateItemRelationsAction`, `updateItemStockAction`, `updateItemTrackingAction`, `deleteItemAction` |
| `ConflictError` | Another item with this SKU already exists | `updateItemDetailsAction` |
| `BusinessRuleError` | Upload an image before saving this item. | `updateItemBasicInfoAction` |
| `BusinessRuleError` | This image is unavailable. Upload it again before saving. | `updateItemBasicInfoAction` |
| `NotFoundError` | Item not found or inactive for this organization. | `updateItemStockAction` |
| `BusinessRuleError` | Item is not inventory-tracked. | `updateItemStockAction` |
| `BusinessRuleError` | A default active location is required before requesting a stock adjustment. | `updateItemStockAction` |
| `NotFoundError` | Inventory location not found or inactive for this organization. | `updateItemStockAction` |
| `NotFoundError` | Adjustment location not found. | `updateItemStockAction` |
| `BusinessRuleError` | One or more adjustment items were not found for this organization. | `updateItemStockAction` |
| `ModuleNewWorkStoppedError extends ApplicationError` | This capability is not accepting new work. Existing records and permitted completion workflows remain available. | `updateItemStockAction` |
| `NotFoundError` | Active organization not found | `updateItemStockAction` |
| `ConflictError` | Operation policy is ambiguous | `updateItemStockAction` |
| `ConflictError` | The stored operation policy requires reconciliation | `updateItemStockAction` |
| `ConflictError` | Capability dependencies require reconciliation | `updateItemStockAction` |

Module helper messages `Operation context is required` and `Unknown capability` exist but are unreachable with this action’s fixed valid inventory operation/context; no need to add them to the action allowlist. The inventory manual-delta path cannot reach the frozen-count-specific continuation conflict. Relation lookup failures are Prisma errors and need fixed safe responses.

## Consumers and adjacent scope finding

`hooks/itemsHooks/useItemHooks.ts` imports get and seven mutation exports from `actions/item/items.ts`. `callAction` turns their `error` string into a React Query `Error`. The current search found no direct rendered component consumer of those eight hooks; `ItemManagement` uses only create from this hook file and uses separate item actions for its own other workflows. `createItemAction` and `updateItemFromFormAction` are already safe-helper consumers and remain outside the nine repair obligations. Their existing positive/error tests should guard against collateral changes.

**P04-R03-SCOPE-01 (source-confirmed, unimplemented):** `useListItems` imports **`actions/item/listItemsAction.ts`**, not the same-named export in `items.ts`. Its lines 76–80 also return arbitrary `Error.message`; the entire separate file and consuming hook are preserved/hash-bound here. No current product consumer of `items.ts#listItemsAction` was located. The sibling action needs a separately bounded follow-up. Nine-path completion must not imply that all item list consumers are redacted.

## Historical evidence and graph provenance

P04-F03 originally exercised only get/list (four mocked sentinel cases). Seven mutation catches were source-matched obligations, not historical runtime proof. The original [characterization](../../../P04/actions-review/item-read-error-disclosure.test.ts.source.txt) and [findings register](../../../P04/findings-register.json) remain unchanged. The August 9 graph has `item_items_<lowercase handler>` nodes in community 1; current source, not the dated graph count, establishes this scope.

## Verification requirements and limits

Exercise actual nine actions with real schema/error normalization; inject guard/service/Prisma/provider-shaped/string/unknown errors and prove fixed responses contain no sentinel. Include authorized success and approved business/null results, plus additional stock permission denial. Isolated DB evidence should compare item/related business state before/after denied tenant/permission/stock requests; bounded security audit rows may be expected. Keep mocked unit, native database, HTTP and rendered/browser classes separate. Parent P04 and production remain blocked by their outstanding obligations.
