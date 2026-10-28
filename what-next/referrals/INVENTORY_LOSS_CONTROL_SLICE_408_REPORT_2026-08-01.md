# Inventory Loss Control Slice 408 Report

Date: 2026-08-01
Phase: 3
Slice: 408
Status: Certified
Name: Protected Managed-Location Inventory Loss Query

## Outcome

Stoquify now has a protected application query for the Slice 407 inventory loss analytics read model. The action derives tenant and actor identity from RBAC, enforces the inventory module entitlement, resolves audited operating scope, and passes only trusted location authority to the service.

This makes loss analytics safely consumable by a later product surface without giving managers tenant-wide visibility or accepting location arrays from the browser.

## Authorization Flow

The query executes these gates in order:

1. Require `inventory.levels.read` through the canonical `protect` wrapper.
2. Enforce and audit the `inventory` module entitlement for `inventory.loss.summary.read`.
3. Parse a bounded inventory-loss filter payload that omits caller identity and plural location authority.
4. Resolve the established operating-access decision, which requires `dashboard.read` and writes minimal scope audit evidence.
5. Verify the decision's tenant and actor match the protected context.
6. Resolve tenant-wide or managed-location scope.
7. Delegate to `readInventoryLossSummary` with the RBAC organization and trusted location filter.

No direct database or product write exists in the action.

## Scope Behavior

Tenant-wide operating authority remains limited to the established super-user or allowlisted administrator roles. A tenant-wide actor may query all locations or narrow to one location; the tenant predicate in the read model prevents cross-organization disclosure.

A location-responsible manager:

- receives all active managed locations when no location is requested;
- may narrow to one location present in the audited scope;
- is denied before the read when requesting an unassigned location;
- is denied when scope and managed-location evidence disagree.

The read model now accepts a normalized internal `locationIds` filter. Singular and plural location filters are mutually exclusive. Plural IDs are deduplicated and sorted before the database predicate and returned filter evidence.

## Caller Data Treatment

The action accepts period, optional singular location, item, approver, detail limit, and group limit. Caller-supplied organization, actor, permissions, roles, and plural location IDs are not included in the parsed payload and cannot widen authority.

The response includes whether the authorized operating scope is tenant-wide or location-scoped. Slice 407's evidence, valuation, completeness, truncation, and non-causal approver semantics remain unchanged.

## Implementation Anchors

- Caller payload allowlist: `actions/inventory/inventoryLossReadActions.ts:47`
- Trusted scope resolver: `actions/inventory/inventoryLossReadActions.ts:70`
- Protected RBAC/module boundary: `actions/inventory/inventoryLossReadActions.ts:156`
- Public server action: `actions/inventory/inventoryLossReadActions.ts:198`
- Multi-location filter schema: `services/inventory/inventory-loss-read.service.ts:35`
- Multi-location database predicate: `services/inventory/inventory-loss-read.service.ts:412`
- Action tests begin at `actions/inventory/__tests__/inventoryLossReadActions.test.ts:202`
- Read-model multi-location test: `services/inventory/__tests__/inventory-loss-read.service.test.ts:414`

## Verification

| Gate | Result |
| --- | --- |
| Focused protected-action and read-model Jest | Passed: 2 suites, 21 tests |
| Related operating-access, inventory-history action, and Slice 406 action Jest | Passed: 3 suites, 23 tests |
| `npm run typecheck` | Passed |
| Scoped ESLint | Passed |
| Direct database/write-method scan on action | Passed: no matches |
| RBAC, entitlement, identity, scope, and plural-authority scan | Passed |
| Whitespace and narrow diff hygiene | Passed |

Full Jest, application build, route smoke, browser smoke, and accessibility smoke were not selected. Slice 408 adds no route, component, rendered UI, schema, or migration.

## Residual Risk

- No inventory-loss product page consumes the action yet.
- Focused action tests mock the auth, entitlement, operating-access, and read services; they are not a live authenticated browser test.
- The operating-access resolver intentionally records an audit row for every allowed or denied scope decision.
- Managers require both inventory read and dashboard read authority under the established contract.
- Approver attribution remains approval evidence, not causal fault.
- Daily truth and leakage radar do not yet consume the loss summary.

## Next Decision

No Slice 409 is selected by this report. Return to `stoquify-referral-war-room-orchestrator` before deciding whether the next slice should be the inventory loss operating surface or another higher-priority roadmap dependency.
