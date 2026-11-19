# P04-R04 current-source inventory

Captured 9 November 2026 against HEAD 80e4abb283216b9f8e04b94e5020393f7dcabf62. [Source manifest](source-manifest.json) preserves 26 source snapshots and three graph hashes; [machine register](call-chain-register.json) records arguments, guards, query scope and response policy. Snapshots are inert .source.txt files. No product or test edits were made by this inventory agent.

## Exact scope

This is the sibling actions/item/listItemsAction.ts export, not the same-named export repaired in actions/item/items.ts by P04-R03. Before repair, its export starts at line 52, catch is lines 71–75 and raw error.message is returned at line 73. The earlier supplemental finding recorded lines 76–80 inaccurately. Its source SHA is unchanged: 3f763ceea82658460f6e0ed339a8d1283c13080af25bf34b082877cab8e95f60. Preserve that historical record; this inventory corrects its locator.

## Arguments and client envelope

Object input passes the first non-null object through the actual listItemsSchema. Positional input accepts organizationId as the first string, q only when string, page/pageSize only when numbers. Missing arguments become an invalid empty object. Object numeric-string coercion remains the schema's behavior; positional numeric strings are ignored by normalizeArgs. Unknown fields are stripped. Keep both forms and their existing defaults.

The response is {success:true,data:{data,total,page,pageSize,totalPages}} or {success:false,error:string}. Empty results are successful with an empty data array, total 0 and totalPages 1. The hook at hooks/itemsHooks/useItemHooks.ts imports this sibling at line 6, calls it from useListItems at line 63, and forwards res.error into a React Query Error at line 34. It uses object input and the existing itemKeys.list(params) key. No current rendered component consumer or compiled reachability was established by this targeted search.

## Enforcement and data path

normalizeArgs → listItemsSchema.parse → requirePermission('inventory.items.read',{resource:'Item',auditAllowed:false}) → current Better Auth subject/current stored user and roles → listItemsWithRelations with organizationId overwritten by ctx.orgId. Input organization remains a compatibility requirement; it does not grant scope.

RBAC disables the cookie cache when obtaining the session, reloads active user, verifies active/nondeleted organization, rejects locked/unverified users and stale session organization, filters roles to the current tenant and checks expanded stored permissions. Denied permissions can create a security-audit row. This action does not call requireSession's additional persisted-session mirror lookup; transport stubs cannot establish actual expiry/revocation/signature behavior.

The service at line 831 uses itemWhereFromListInput at line 431: organizationId from server, deletedAt:null, optional text search/category/brand/unit/tax/isActive filters. It runs only item.count and item.findMany with identical tenant where, standard includes, enumerated sort, skip and take. It performs no business mutations or stock transitions. No explicit location/module guard is added here; broader authority qualification remains P04-V01.

## Minimal response policy

**No explicit safe business-error messages are reachable in this read service.** There are no BusinessRuleError/ConflictError/NotFoundError branches; no records is a successful empty collection. The R03 mutation-message allowlist is therefore unnecessary.

Use the existing safeLoggedActionErrorMessage with an explicit fixed operation fallback, Failed to list items. Keep the response envelope and all successful query behavior. Calling the helper without a fixed message is unsafe: canonical normalization can expose arbitrary thrown strings and structurally coded Error messages. A fixed fallback also masks ordinary authentication/validation text; any alternate auth/validation presentation must use fixed constants, never exception.message. The existing helper specially preserves FreshAuthRequiredError recovery and rethrows Next redirect/not-found control flow. Neither is asserted as currently reachable from this read chain without runtime evidence.

Negative evidence should exercise guard, service, Prisma, provider-shaped, string, typed-but-unapproved and validation failures through both argument forms; check public response and logged metadata for private canaries. Positive evidence should preserve empty, search/filter/sort/pagination and tenant-binding behavior. Native denied-state proof must separate intended audit additions from business state. Do not infer HTTP/browser or session qualification from mocked tests.

## Graph provenance

The August 9 graph distinguishes sibling nodes item_listitemsaction_ts, item_listitemsaction_normalizeargs and item_listitemsaction_listitemsaction in community 112 from item_items_listitemsaction in community 1. The useListItems node itemshooks_useitemhooks_uselistitems is in hooks community 6. These dated graphs locate functions; current imports/source establish this chain. Graphs were read and hashed, not regenerated.
