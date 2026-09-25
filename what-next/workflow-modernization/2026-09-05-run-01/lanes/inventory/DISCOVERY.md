# Inventory workflow discovery

Evidence date: 2026-09-05T18:30:27.369Z. Initial read-only discovery in the shared workflow-modernization run. The register contains 17 workflow candidates with current source paths, permissions, records, transitions and explicit remaining work. This is a workflow denominator input, not a count of pages or a claim of complete validation.

## Boundaries and method

Graph hints were used to locate loss-control, movement-history, transfer and action relationships, then verified against current source. For example InventoryLossWorkbench is component community222; its hook is community8; movement-history hook is community9; transfer page is app community119. The inventory boundary skill was used only as a tracing checklist. No inventory boundary scanner, enforcement-mode change, test, browser, worker or database mutation was run in this discovery.

The inventory root redirects to the item list; it is not a separate stock dashboard workflow. Item master setup belongs to MD. PA-010/011/012/014 own accepted/held receipt and inspection resolution; PA-024/025 own supplier-return effects. Parent OTC owns delivery reservations, goods issue and sale/refund/void flows. Accounting close owns review/pack operations using inventory reconciliation. The register keeps those as cross-references.

## Current connected behavior

- Transfers have a real create form and protected action. Creating stores a DRAFT and audit after checking tenant-owned active locations/items and current availability. Approve posts paired stock/value movements and directly marks COMPLETED; it is not a separate dispatch or transit approval.
- Movement history has an EN/FR workbench with snapshot/cursor controls and proof/error states. The synchronous export service produces content and a manifest, but its UI hook only displays filename/count.
- Loss control is a read workbench. Count freeze, count submission, count posting and adjustment posting are protected server actions with no current production UI callers found. The screen must not be described as completing those workflows.
- Manual item-stock changes request an adjustment instead of bypassing the kernel. Posting counts and adjustments uses event, audit and stock version/evidence controls. An adjustment can have completed stock effects with an explicit blocked ledger result; those states must remain distinguishable.
- A reversal service creates compensating adjustment/movement/journal records while retaining the original. No authenticated action or user interface was found for it.
- Background exports have durable jobs, encrypted chunks, worker/expiry functions and actor/tenant-scoped download grants. No connected enqueue/status/download UI or stream HTTP adapter was found. Worker/artifact runtime is unverified.

## Concrete gaps to reproduce next

| ID | Finding and source evidence | Required next proof or correction |
| --- | --- | --- |
| IN-F01 | hooks/useInventoryMovementHistoryWorkbench.ts:32 receives exported content but onSuccess only calls setExportStatus; connected workbench has no download consumer. | Real export must deliver the returned artifact and manifest, with current authorization/assurance failures and scope clearly explained. |
| IN-F02 | postStockAdjustment replay at inventory-adjustment.service.ts:1174–1178 returns BLOCKED in both ternary branches. | Reproduce a previously POSTED ledger replay and preserve its authoritative outcome; do not repeat stock or ledger effects. |
| IN-F03 | releaseInventory at actions/inventory/inventoryActions.ts:361 explicitly throws unavailable. expiresAt is metadata in postInventoryReservation. | Build and verify source-bound release/expiry with idempotency and current authority before presenting a complete reservation lifecycle. |
| IN-F04 | Legacy reservation batch starts independent service calls with Promise.all; fallback reservation key uses Date.now. | Reproduce partial batch failure/retry and define atomic or explicitly resumable intent; no automatic duplicate reservation. |
| IN-F05 | inventoryLossControlActions exports freeze/submit/post count and post adjustment, but production app/components/hooks search finds no callers. | Add role-appropriate real forms and independent review/evidence/recovery, retaining server actor separation. |
| IN-F06 | reverseStockAdjustment is service-only and accepts requester/approver IDs; schema only checks they differ. | Authenticated durable request/review boundary is required before exposing reversal. Distinct IDs alone are not verified approval. |
| IN-F07 | TransferDetailsModal allows a different creator to Approve but does not mirror explicit write permission; the action posts and completes. | Align UI authority and explain immediate stock consequence. Preserve server controls. |
| IN-F08 | Transfer UI excludes creator always, service excludes creator only at approval-controlled locations. | Decide and align the actual separation policy; do not silently weaken it. |
| IN-F09 | Transfer creation aggregates duplicate item quantities for availability then stores original duplicate lines. Posting plans use per-line current versions. | Reproduce duplicate-line posting and either normalize or reject at the canonical create contract. This is not a proved stock corruption. |
| IN-F10 | Transfer detail value is based on current item.costPrice rather than final posted movement valuation. | Label estimates versus authoritative posted values and test changed-cost examples. |
| IN-F11 | Background export actions and worker exist without a connected delivery surface; process configuration was not exercised. | Provide exact authorized lifecycle/worker/artifact configuration and controlled download/expiry proof. |
| IN-F12 | rebuildInventoryProjection reads movement history and compares current InventoryLevel without writing. No active caller found besides barrel export. | Treat it as comparison, not repair. Verify historical asOf interpretation and design any repair as a separate controlled command. |
| IN-F13 | Adjustment completion and count POSTED can coexist with ledger BLOCKED; no dedicated operational remediation command traced. | Expose retained obligations and safe ledger recovery, preserving original stock effects and audit history. |

These are source observations and bounded search negatives. Existing unit suites were located, not rerun. The prior module-integration French inventory-transfer denial is historical evidence of stopped-work handling only; it is not evidence for transfer posting, count controls, export completeness or current accessibility.

## Controls and unresolved invariants

StockTransfer posting uses tenant-scoped lookup, current active relationships, available quantity, an open accounting period, canonical event replay and version-checked level writes. Count posting requires every frozen line, count-sheet evidence and an approver different from creator/submitter; count-derived adjustments after a module stop must match a previously admitted frozen count. Reversal requires a fully posted balanced source journal and compensating records. These are implemented checks seen in source, not independent professional approval.

Further verification must cover actor/tenant changes, explicit empty grants, stopped-work continuation, quantity/value concurrency, duplicate request and idempotency binding, closed periods, zero-variance counts, stale frozen snapshots, ledger blockers, retained evidence, denied/error/freshness paths and actual EN/FR mobile/keyboard behavior. Currency/valuation precision and Class3 reconciliation need representative expert-reviewed fixtures; no accounting or statutory certification is claimed.

## Runtime and ownership

No application source was edited for this discovery. Only this document and WORKFLOW_REGISTER.json are owned by this inventory pass. Purchasing recovery implementation is a separate authorized batch with separate source receipts. Browser/server ownership remains with verification_environment. Pending MD/OTC/accounting IDs must be filled during the parent register merge, not invented here.

## Final reservation authority trace

IN-F14 (high; source evidence, runtime reproduction pending): actions/inventory/inventoryMovementActions.ts:221–247 authenticates a user but forwards the caller’s organizationId to postInventoryReservation without requirePermission or comparison to the actor’s active organization. The inventoryAction wrapper (lib/error-handling/server-action-wrapper.ts:336) adds error handling, not permission enforcement. The kernel validates item/location against that supplied organization; it does not prove actor membership. In contrast, actions/inventory/inventoryActions.ts:324 uses trusted inventory.levels.adjust scope. The two transports therefore disagree. This must be reproduced with isolated cross-tenant and no-permission fixtures before correction; no unauthorized mutation was attempted in this read-only pass.

## Next correction plan — inventory reservation authority

Production changes and tests are held until the parent releases the current accounting/purchasing source checkpoint. No inventory implementation was changed in this discovery.

The narrow first change belongs in actions/inventory/inventoryMovementActions.ts. The canonical existing permission is inventory.levels.adjust (MANAGE_INVENTORY_LEVELS alias), matching inventoryActions.reserveInventory. Derive active actor/organization through requirePermission, reject a supplied organization that differs, then pass server-owned orgId/userId to the unchanged stock kernel. Preserve quantity, item/location, reason and expiry semantics. The reserveInventory compatibility export must use the same guarded command.

Extend actions/inventory/__tests__/inventoryMovementActions.test.ts with cases for: authenticated foreign tenant rejected before kernel/cache calls; role without adjustment permission rejected; missing session rejected; valid same-tenant exact actor/arguments; compatibility export uses the guard; kernel failure does not revalidate or claim success. Run pre-correction cases only when the parent grants the focused slot, retain failures and then implement. No live stock writes or valuation/accounting changes are needed.

A related boundary defect must not be hidden by the new denial: hooks/useInventoryMovementQueries.ts:98 useInventoryReservation treats every resolved response as success. A success:false result currently produces a success toast and cache invalidation. Proposed additional ownership is this hook and focused cases for resolved denial, unknown rejection and real success. No production UI consumer of the reservation hook was found; StockMovementDashboard imports only read hooks. Parent approval for that extension is pending.

The reservation action and kernel also have no module entitlement/admission check in the traced source. A tenant/RBAC fix alone must not be described as proving read-only, expired or stopped-module consistency. Parent should explicitly choose whether this correction adds the existing authoritative inventory write gate or tracks it as the following boundary task. Do not invent a reservation-specific admission policy or change retained owner obligations silently.

Unchanged invariants: stock/value calculations, movement/event/audit/outbox effects, open-period rules, retained receiving/delivery obligations, rejected offline/POS candidates and source evidence. Release/expiry, batch atomicity and request idempotency remain separate required gaps.

## Reservation gate plan — current policy resolved

This section supersedes the earlier open question about whether an existing entitlement write gate can be used. It is a read-only plan; no application or test edits were made.

The existing model has three distinct controls:

| Control | Current owner and semantics | Reservation correction |
| --- | --- | --- |
| Actor and tenant authority | requirePermission with inventory.levels.adjust, whose existing alias is MANAGE_INVENTORY_LEVELS. The legacy inventoryActions.reserveInventory already uses trustedInventoryContext and rejects a different supplied organization. | Apply the same authority to reserveInventoryMovement and its compatibility export. Use ctx.userId/ctx.orgId, never caller identity. Reject org mismatch before any entitlement or kernel lookup. |
| Module entitlement for an operation | inventoryLossControlActions.ts:61–92 calls observeModuleAccess with inventory/action/write/enforce and current actor permissions, then throws ForbiddenError on denial. protect.ts:87–102 implements the same pattern for protected commands. | Use this established pattern on both public manual-reservation transports. Keep their current response wrappers/contracts; do not migrate every legacy inventory action. |
| Explicit reviewed stop of new work | module-stop-policy.service.ts:29 lists inventory_adjustments, inventory_transfers and inventory_counts. Their owning create services call admission inside the write transaction. module-admission.service.ts:62–67 explicitly excludes settlement, correction, required ledger posting and prior captured offline replay. | Manual reservations are not in this reviewed scope. Do not invent an inventory.reservation.create admission policy, broaden the stop registry, or add a blanket stop to the shared stock kernel in this patch. Track reservation admission/expiry/obligation policy separately. |

The entitlement evaluator's existing write decision rejects a missing grant, invalid/future/expired interval, suspended/unavailable state, read-only status or flag, ambiguous duplicate grants and unavailable required dependencies. Observe mode alone always permits and therefore is insufficient for this mutation; the action must explicitly pass mode enforce. Wildcard RBAC does not bypass entitlement. An active organization with no managed configuration may retain established legacy grants; a managed explicit-empty grant set does not regain legacy defaults. Missing organizations and failed reads propagate. These rules are implemented in module-entitlement.service.ts:90–166 and340–356 and already have module-access-regressions tests.

Hiding a workspace shortcut is not grant revocation. An inventory stop does not currently revoke the grant either. Therefore the proposed entitlement gate is not presented as closing manual reservation stop admission. Other new-work/continuation contracts stay unchanged.

### Exact proposed production ownership after parent release

1. actions/inventory/inventoryMovementActions.ts: only reserveInventoryMovement and its now-unused auth import if applicable. Keep existing input checks, call requirePermission("inventory.levels.adjust", { resource:"InventoryReservation", resourceId:itemId, auditAllowed:true }), reject organizationId !== ctx.orgId, then evaluate the inventory write gate with surface "actions/inventory/inventoryMovementActions.ts:reserveInventoryMovement". On allowed decision call postInventoryReservation with server org/actor and the existing item/location/quantity/reason/expiry fields. Revalidate only after confirmed service return. The public reserveInventory positional compatibility function continues delegating to this command.
2. actions/inventory/inventoryActions.ts: add the same inventory write entitlement decision only inside legacy reserveInventory after its existing trustedInventoryContext check and before Promise.all. Use surface "actions/inventory/inventoryActions.ts:reserveInventory". Do not change trustedInventoryContext globally or unrelated item/level/read actions.
3. hooks/useInventoryMovementQueries.ts: make only useInventoryReservation's mutation function await the action, reject success:false via the existing safe getActionErrorMessage helper, and return only actual success to onSuccess. Explicit retry:false avoids automatic repeat effects. Keep global notification suppression flags, current input shape and read hooks. Existing onError presents failure; only true success notifies success and invalidates caches. No extra error metadata is exposed.
4. No schema, module evaluator, admission registry, stock kernel, valuation, financial posting, owner receiving/delivery/POS, shared authentication or global notification changes.

The write gate is the existing request-boundary check, not a new transaction-level grant lock. This plan does not claim to eliminate a revocation race between authorization and a later stock transaction; any stronger atomic revocation guarantee requires its own reviewed owner contract.

### Focused regression plan

- Extend actions/inventory/__tests__/inventoryMovementActions.test.ts, keeping current transfer/read cases: authenticated foreign organization; no adjustment permission; missing session; explicit module denial; module lookup failure; exact successful ctx identity and write/enforce/audit surface; positional compatibility delegation; kernel failure causes no invalidation. Every denied case asserts zero kernel calls, not merely a returned error label.
- Add actions/inventory/__tests__/inventoryReservationActions.test.ts for the legacy batch adapter: same authority/gate, denied before any batch effect, valid actor/org per line, and unchanged surfaced service failure. A deny gate must not create even the first reservation. Do not claim the existing Promise.all batch is atomic.
- Add hooks/__tests__/useInventoryMovementQueries.reservation.test.tsx: resolved structured denial and thrown/network failure cannot notify success or invalidate; false response produces one failure path; real success notifies/invalidates once; explicit no retry. Use the real mutation hook, not a mirror of its conditions.
- Reuse existing services/modules/__tests__/module-access-regressions.test.ts and module-entitlement.service.test.ts to verify read-only, interval, missing/duplicate grant and dependency semantics; do not reimplement entitlement logic in the reservation action.
- If a transport integration case is needed, feed the real evaluateModuleEntitlement decision into the action observer mock for inventory with a fixed evidence time. Cover active versus read-only flag, suspended and exact expiry boundary. Do not label a mocked denial as proof of live database grants.
- After parent grants the test slot, retain the new failure baseline, implement only the agreed files, rerun focused suites, changed-file lint and parent combined typecheck. Any real database/browser proof uses only the verifier-owned synthetic scope. No production or external stock operation is authorized by this plan.

Evidence remains source-only for this planning pass. Existing test assertions were read but were not executed.
