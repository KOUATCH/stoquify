# Inventory Loss Control Slice 409 Report

Date: 2026-08-01
Phase: 3
Slice: 409
Status: Capability certified; authenticated visual certification pending
Name: Inventory Loss Operating Surface

## Outcome

Stoquify now has a permission-gated Inventory Loss Control workbench at `/dashboard/inventory/loss-control`. The surface consumes only the certified Slice 408 protected query and makes the service-owned loss summary usable without exposing inventory write commands or accepting tenant, actor, role, permission, or plural location authority from the browser.

The implementation is certified at the code, component, protected-route, navigation, and service-regression levels. Live authenticated visual certification remains pending because both the stored Playwright state and a fresh local seeded-credential attempt returned `401` before RBAC could be evaluated.

## Operator Experience

The workbench provides:

- a compact command brief with authorized tenant or managed-location scope;
- an inclusive 30-day default period stored in the URL;
- conversion of the inclusive UI end date to the service's half-open boundary;
- a 366-day client preflight matching the service limit;
- recorded loss value, loss-line count, distinct adjustment count, and evidence coverage;
- evidence, valuation, approving-actor, and source-completeness status;
- partial and truncated source warnings without presenting incomplete totals as complete;
- breakdowns by product, location, category, approving actor, and organization-local month;
- recent source records with a detail drawer and evidence-presence state;
- explicit loading, invalid-period, permission, safe-error, empty, partial, and refresh-failure states;
- English and French copy isolated in the new workbench module.

Approver identity is permanently accompanied by the service-owned trust rule: approval of an adjustment does not establish who or what caused a loss. Evidence hashes are not rendered; the UI exposes only evidence presence.

## Authority And Data Flow

1. The route requires `inventory.levels.read` before rendering.
2. The client hook accepts only `from` and `to` URL filters.
3. Every load calls `getInventoryLossSummaryAction`.
4. Slice 408 continues to enforce inventory module entitlement, RBAC tenant/actor identity, and audited tenant-wide or managed-location operating scope.
5. The component renders the returned scope and read model without adding business inference.
6. No Slice 406 stock-count or adjustment command is imported or exposed.

`RECORDED_THEFT` is rendered only as a recorded source adjustment category. The UI does not create a fraud, theft, fault, or causal finding.

## Files Added

- `app/[locale]/(dashboard)/dashboard/inventory/loss-control/page.tsx`
- `app/[locale]/(dashboard)/dashboard/inventory/loss-control/__tests__/page.test.tsx`
- `components/inventory/loss/InventoryLossWorkbench.tsx`
- `components/inventory/loss/inventoryLossWorkbenchAdapter.ts`
- `components/inventory/loss/inventoryLossWorkbenchCopy.ts`
- `components/inventory/loss/__tests__/InventoryLossWorkbench.test.tsx`
- `hooks/useInventoryLossWorkbench.ts`
- `hooks/__tests__/useInventoryLossWorkbench.test.tsx`
- `what-next/referrals/screenshots/slice409/browser-smoke-result.json`

## Files Updated

- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `scripts/__tests__/module-surface-enforcement-first-pass.test.js`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Pre-existing Accountant Access and Accountant Portfolio edits in `config/sidebar.ts` were preserved. Existing modified message catalogs were not touched.

## Implementation Anchors

- Default period and URL parsing: `hooks/useInventoryLossWorkbench.ts:39`
- Inclusive-to-half-open action filters: `hooks/useInventoryLossWorkbench.ts:91`
- Protected action call: `hooks/useInventoryLossWorkbench.ts:174`
- Workbench entry: `components/inventory/loss/InventoryLossWorkbench.tsx:71`
- Trust coverage: `components/inventory/loss/InventoryLossWorkbench.tsx:317`
- Permanently visible approver guard: `components/inventory/loss/InventoryLossWorkbench.tsx:355`
- Dimension workbench: `components/inventory/loss/InventoryLossWorkbench.tsx:417`
- Source record table: `components/inventory/loss/InventoryLossWorkbench.tsx:622`
- Detail drawer: `components/inventory/loss/InventoryLossWorkbench.tsx:746`
- Route permission: `app/[locale]/(dashboard)/dashboard/inventory/loss-control/page.tsx:5`
- Sidebar entry: `config/sidebar.ts:226`
- Static route-guard entry: `scripts/__tests__/module-surface-enforcement-first-pass.test.js:23`

## Verification

| Gate | Result |
| --- | --- |
| Hook, component, route, and sidebar Jest | Passed: 4 suites, 31 tests |
| Slice 408 action and service regression Jest | Passed: 2 suites, 21 tests |
| Focused module-surface inventory page cases | Passed: 21 cases; 26 unrelated cases skipped |
| `npm run typecheck` | Passed |
| Scoped ESLint | Passed |
| Direct database/write authority scan | Passed; only URLSearchParams `delete` matched the broad write token |
| Protected-source and identity scan | Passed |
| Tracked `git diff --check` | Passed; line-ending warnings only |
| New-file whitespace/final-newline/patch-artifact check | Passed: 9 files |
| Live route server | Passed: Next.js ready at `http://localhost:3000` during smoke |
| Stored-auth desktop/mobile smoke | Auth-blocked: permission endpoint `401`, redirected to login |
| Fresh local seeded-admin desktop/mobile smoke | Auth-blocked: login and permission endpoint `401`, redirected to login |
| Full module-surface suite | 46 passed, 1 unrelated payroll expectation failed |

The full module-surface failure is outside Slice 409: the scanner reports the existing payroll action as `observe`, while its test still expects `report-only`. The focused inventory page table, including the new route and permission, passes.

## Browser Evidence

Screenshots under `what-next/referrals/screenshots/slice409/` record the authentication stop at desktop and mobile widths. They do not certify the changed workbench layout.

The browser result manifest records:

- stored auth state expired or invalid: `401`;
- fresh local `admin@stockflow.test` seeded credential unavailable: `401`;
- route redirected safely to `/en/login` with the encoded callback;
- no workbench heading rendered;
- no product-surface browser claim made.

## Residual Risk

- Authenticated desktop/mobile screenshots and accessibility/layout smoke remain required before rollout certification.
- A valid tenant fixture must include `dashboard.read`, `inventory.levels.read`, inventory module entitlement, and tenant-wide or managed-location operating-scope evidence.
- The workbench is read-only; Slice 406 commands remain intentionally unintegrated.
- Daily Truth, Leakage Radar incidents, alerts, exports, AI/copilot, WhatsApp, and external sharing remain unselected.
- The broad module-surface suite retains one unrelated payroll assertion mismatch.

## Next Decision

No Slice 410 is selected by this report. Return to `stoquify-referral-war-room-orchestrator`.

The next war-room review should decide between:

- a narrow authenticated visual-certification fixture for Slice 409; or
- another roadmap dependency with stronger available evidence.

Do not add loss commands or downstream leakage feeds to this workbench without a separate selection and authority review.
