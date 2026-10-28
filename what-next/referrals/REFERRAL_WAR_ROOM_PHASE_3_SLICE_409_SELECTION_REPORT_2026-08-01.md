# Referral War Room Phase 3 / Slice 409 Selection Report

Date: 2026-08-01
Slice: 409
Name: Inventory Loss Operating Surface
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `aqstoqflow-uiux-00-orchestrator`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Selection Decision

Slice 409 is selected after Slice 408 certified the protected, inventory-entitled, managed-location query for the service-owned inventory loss read model.

The remaining product gap is bounded and evidenced: inventory navigation exposes catalog, movement, and transfer workflows, but no operator can view the trusted loss summary. Shared command-center primitives, robust route states, React Query workbench conventions, and sidebar route tests already exist. No new backend truth or speculative dashboard contract is required.

## Scope

Selected implementation:

- Add `/dashboard/inventory/loss-control` behind `inventory.levels.read`.
- Consume only `getInventoryLossSummaryAction`; keep tenant, actor, and managed-location authority server-derived.
- Provide bounded date filters with a 30-day default and URL-backed state.
- Render explicit tenant-wide or managed-location scope evidence from the protected response.
- Render loss value, line and adjustment counts, evidence/valuation/approval coverage, and service-owned product, location, category, approver, and period groups.
- Render recent source records with evidence state and an operator detail view.
- Preserve partial-source and truncation warnings instead of presenting incomplete totals as complete.
- Label approving actors as approval evidence and repeat the service contract that approval does not establish causation.
- Add the route to the existing Inventory sidebar group using the same read permission.
- Add focused hook, component, route, and navigation tests.

Expected product files:

- `app/[locale]/(dashboard)/dashboard/inventory/loss-control/page.tsx`
- `app/[locale]/(dashboard)/dashboard/inventory/loss-control/__tests__/page.test.tsx`
- `components/inventory/loss/InventoryLossWorkbench.tsx`
- `components/inventory/loss/__tests__/InventoryLossWorkbench.test.tsx`
- `hooks/useInventoryLossWorkbench.ts`
- `hooks/__tests__/useInventoryLossWorkbench.test.ts`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`

## Evidence Inputs

- Slice 407 inventory-loss service contract and certification.
- Slice 408 protected query, managed-location scope contract, and certification.
- `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx`.
- `hooks/useInventoryMovementHistoryWorkbench.ts`.
- `components/inventory/movements/InventoryMovementHistoryWorkbench.tsx`.
- `components/dashboard/primitives/command-center-primitives.tsx`.
- `config/sidebar.ts` and `config/__tests__/sidebar.test.ts`.
- Current UI/UX roadmap, inventory UI registry, and robust-state guidance.

## Authority Contract

The route requires `inventory.levels.read` before rendering. Every data load crosses the Slice 408 protected action, which enforces inventory module entitlement, derives tenant and actor identity from RBAC, resolves audited operating scope, and injects trusted managed-location filters.

The browser may request only a bounded period and optional singular business filters accepted by the action. It cannot supply organization identity, actor identity, roles, permissions, or plural location authority.

## Explicit Non-Authority

Slice 409 adds no stock write, adjustment approval, adjustment creation, loss resolution, alert, assurance incident, daily-truth feed, leakage-radar feed, new permission, schema, migration, AI/copilot behavior, WhatsApp behavior, export, or external sharing.

The surface must not infer theft, fraud, fault, or causal responsibility. `RECORDED_THEFT` remains a source adjustment category, and approving-actor groups remain approval evidence only.

## Expected Verification

- Focused Jest for URL filter normalization, action calls, protected route gating, robust loading/error/empty/partial states, scope display, evidence semantics, and approver non-causation copy.
- Sidebar information-architecture and permission assertions.
- Existing Slice 408 action and service suites.
- `npm run typecheck`.
- Scoped ESLint over changed TypeScript and TSX files.
- Narrow authority scan confirming the UI calls only the protected read action and adds no direct database or write path.
- Route/browser smoke and responsive screenshot attempt; record any environment blocker honestly.
- Whitespace and narrow-diff hygiene.

## Success Criteria

Slice 409 is certified when an authorized operator can reach a stable inventory loss workbench, change a bounded period, understand operating scope and data completeness, inspect service-owned loss groups and source records, and retry safe failures without gaining any new authority or seeing approver identity represented as causal fault.

## Next Skill

Execute with `stoquify-inventory-loss-control`, applying `aqstoqflow-uiux-00-orchestrator` conventions for shared command-center primitives and robust states. Return to `stoquify-referral-war-room-orchestrator` after certification before selecting Slice 410.
