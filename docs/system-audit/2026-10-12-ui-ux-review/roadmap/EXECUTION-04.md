# Delivery 04 — repair the owner stock handoff

13 October 2026. UX03 selected repair. **Implemented locally and regression-tested; browser/role acceptance pending.** The broader action audit and dashboard narrative localization remain in progress.

## Result

The owner stock card destination, stock risk action/drill-through and stock investigation zone now reference the implemented `/dashboard/inventory/items` workspace. The nonexistent `/dashboard/inventory/stock` destination is removed from the owner service.

The stock action retains its original `inventory.read` requirement and adds the destination's `inventory.items.read` requirement. The owner service supplies its server-resolved actor permissions to the composer; omitted permissions fail closed for this navigation. The existing canonical permission helper supplies wildcard behavior. No role or permission is granted or broadened.

Denied navigation disables both the action and its evidence route; an unavailable drill-through carries no href. The zone and its primary metric share that decision. The stock figure, evidence grade, freshness, ranking and tenant-wide dashboard authority are preserved. This is a navigation check, not a replacement for the destination's fresh RBAC, organization and module-entitlement enforcement.

Investigation-zone actions reuse Delivery 03's shared action control, making disabled reasons visible. A repeated route with the same label, destination and enabled state (or the same disabled explanation) appears once. Distinct evidence links remain available. Zone actions and KPI/drill-through routes use the existing locale helper, retaining supplied query parameters and anchors. Backend-generated action labels and narratives still require EN/FR localization; this delivery does not claim language completeness.

## Scope and source evidence

- `services/owner-war-room/owner-war-room.service.ts`: canonical stock destination, permission-sensitive stock actions and action-aware drill-through construction.
- `services/owner-war-room/owner-war-room-contracts.ts`: optional server-resolved composer permissions; absence cannot enable stock navigation.
- `components/bi/BIBusinessTruthZone.tsx`: shared controls and removal of equivalent duplicate route controls.
- `components/bi/BIKpiCard.tsx`: locale preservation for action and evidence links.
- Existing owner-service and BI component tests; new isolated `jest.stock-handoff.config.cjs`.

The inventory route registry names `/dashboard/inventory/items`, requires `inventory.items.read`, and enforces the inventory module. The page independently calls `checkPermission("inventory.items.read")`. The inventory root redirects to that page. The owner route and protected action both supply actor identity, roles and permissions from their existing server context; user-supplied action input does not set these fields. Those boundaries were inspected and left unchanged.

Source HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`. All edited source files already contained local changes. [Delivery baseline](evidence/delivery-04-baseline.json) and [owned patch](evidence/stock-handoff-2026-10-13.patch) preserve the distinction. No service-wide cleanup or unrelated source changes were made.

## Verification

| Evidence class | Result |
|---|---|
| Workflow contract | Passed; 198 package scripts remain unclassified |
| Reproduction | Six permission-matrix cases exposed the old `/inventory/stock` route. Two initial service-fixture cases used an unsupported role code; corrected to the existing administrator fixture, without changing the role policy |
| Mocked service tests | **22 passed**, including eight new handoff cases; [JSON](evidence/stock-handoff-tests-2026-10-13.json) |
| Component/DOM tests | **47 passed across four suites**, including five new route/duplicate/denial cases; [JSON](evidence/stock-handoff-components-2026-10-13.json) |
| Scoped lint | Six changed TS/TSX files, passed |
| Syntax diagnostics | Six files, no syntax errors; not full semantic type checking |
| Scoped whitespace check | `git diff --check` passed |
| Real database / build / deployment | Not run |
| Rendered browser / real-role acceptance | Not completed: browser-control request timed out before returning page state |

The service matrix covers absent permissions, empty permissions, each required permission alone, both permissions together and the existing wildcard policy. It checks action and drill-through parity, permission metadata against the current route registry, absence of the old path, preserved figures/evidence, and forwarding of the current service actor's permissions. Existing tests continue to cover tenant-wide authority denial and inventory-loss module behavior. Persistence, RBAC audit and snapshot providers are mocked; these are not real-session or database guarantees.

Component cases cover EN/FR URL prefixes, query/anchor retention, one equivalent action, a visible associated disabled explanation, no navigable denied route, and preservation of a distinct proof destination. They do not prove actual contrast, reflow or screen-reader behavior.

## Commands and side effects

Current package script/lifecycle and registry definitions were reviewed before the workflow check. Both installed Next/Jest runners omit `dir`, so they do not load application Next configuration or environment files. The service suite mocks DB, RBAC audit, entitlement and snapshot boundaries; its real signal/queue helpers are pure. Component setup is Jest DOM, with existing evidence-action mocks. Output writes are limited to test evidence and tool caches. No migration, seed, app build, server startup or financial action was run.

```powershell
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.stock-handoff.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/stock-handoff-tests-2026-10-13.json
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.command-center.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/stock-handoff-components-2026-10-13.json
node node_modules/eslint/bin/eslint.js services/owner-war-room/owner-war-room.service.ts services/owner-war-room/owner-war-room-contracts.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts components/bi/BIBusinessTruthZone.tsx components/bi/BIKpiCard.tsx components/bi/__tests__/bi-command-primitives.test.tsx
```

No fix or broad formatting flag was used.

## Browser and remaining acceptance

Attempted Edge at `http://localhost:3000/fr/dashboard/owner-war-room`. The browser request timed out and reset its control session. No application DOM, current role, viewport or screenshot was returned. This is a tooling/access gap, not evidence that the application rendered correctly or is down. No business data or authentication was modified.

Remaining: actual authorized and denied owner-to-items journeys, module-locked and changed-session checks, EN/FR desktop/tablet/mobile evidence, and localization of generated dashboard narratives. Other owner destinations still require the broader UX03 audit; this repair does not certify them.

Rollback: reverse only the owned patch after checking for later edits. Preserve prior local changes and the existing route guards. No database rollback is needed.
