# Stoquify Slice 409 Release Evidence Report

Date: 2026-08-01

Mode: implementation and bounded capability certification

Primary skill: `stoquify-inventory-loss-control`

Supporting skills: `stoquify-referral-war-room-orchestrator`, `aqstoqflow-uiux-00-orchestrator`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Scope

Implement the read-only Inventory Loss Operating Surface over the certified Slice 408 protected query, add it to permission-aware Inventory navigation, and verify URL-period, scope, completeness, evidence, attribution, route, and navigation behavior.

## Non-Goals

No stock count or adjustment command, inventory write, approval, resolution, alert, assurance incident, daily-truth or leakage feed, export, schema, migration, permission creation, AI/copilot behavior, WhatsApp behavior, or external sharing.

## Evidence Inspected

- Slice 407 service-owned inventory loss read model and tests.
- Slice 408 protected query, managed-location scope behavior, and tests.
- Inventory movement route, React Query hook, component, and focused tests.
- Shared command-center, filter, KPI, proof, detail-drawer, and robust-state primitives.
- Current sidebar information architecture and route-existence tests.
- UI/UX roadmap, UI registry, and inventory normalization guidance.
- Playwright configuration, existing auth-state metadata, and authenticated smoke prerequisites.
- Current dirty-worktree status and unrelated sidebar/message/POS edits.

## Findings Or Changes

- Added a route guarded by `inventory.levels.read`.
- Added URL-backed inclusive period filters with a stable 30-day default and 366-day preflight.
- Converted the inclusive end date to the service's half-open `to` boundary.
- Used only `getInventoryLossSummaryAction` for data access.
- Rendered explicit tenant-wide or managed-location authorization scope.
- Rendered service-owned totals, groups, records, coverage, completeness, and snapshot metadata.
- Preserved partial/truncated truth and safe refresh behavior.
- Kept evidence hashes redacted from the UI.
- Made the approver non-causation contract permanently visible and repeated it in approval/detail contexts.
- Added English/French workbench copy without modifying already-dirty message catalogs.
- Added an alphabetized, permission-aware Inventory sidebar destination.
- Added focused URL/query, component-state, protected-route, sidebar, and static module-surface tests.
- Preserved all unrelated existing edits.

## Verification

| Command or gate | Result | Notes |
| --- | --- | --- |
| Exact-path Slice 409 Jest | PASS | 4 suites, 31 tests |
| Slice 408 service/action regression Jest | PASS | 2 suites, 21 tests |
| Focused static inventory page guard cases | PASS | 21 passed, 26 unrelated skipped |
| `npm run typecheck` | PASS | Final repository TypeScript gate |
| Scoped ESLint | PASS | Product, tests, route, navigation, and static gate |
| Direct DB/write scan | PASS | No DB import or product write; broad scan matched URLSearchParams `delete` only |
| Protected source and identity scan | PASS | Protected action and route permission present; no caller tenant/actor authority |
| Tracked diff whitespace | PASS | Line-ending notices only |
| New file hygiene | PASS | 9 files; no trailing whitespace, missing newline, `.rej`, or `.orig` |
| Live Next server | PASS | Route compiled and auth middleware responded |
| Stored auth browser attempt | BLOCKED | `/api/me/permissions` returned `401`; desktop/mobile redirected to login |
| Fresh seeded-admin browser attempt | BLOCKED | Local fixture login returned `401`; desktop/mobile redirected to login |
| Full static module-surface suite | PARTIAL | 46 passed; 1 unrelated stale payroll `report-only` expectation failed |
| Full Jest | NOT TESTED | Not selected for this bounded surface |
| Production build | NOT TESTED | No deployment or migration release selected |
| Prisma validate/migrate | NOT TESTED | No schema or migration changed |
| Authenticated accessibility/layout smoke | BLOCKED | No valid tenant auth and inventory-scope fixture |

A repository-wide typecheck attempt briefly observed a concurrent unrelated POS edit while its local `ReceiptChannel` declaration was in transition. The final rerun passed after that file stabilized; Slice 409 files were not changed to address it.

## Browser Evidence

Manifest: `what-next/referrals/screenshots/slice409/browser-smoke-result.json`

The screenshots prove only that authentication stops safely and retains the requested callback. They are not evidence that the workbench itself has passed desktop/mobile layout or accessibility certification.

Required rerun fixture:

- valid authenticated tenant session;
- `dashboard.read`;
- `inventory.levels.read`;
- active inventory module entitlement;
- tenant-wide administrator authority or active managed-location responsibility;
- source adjustment data for complete, partial, and empty states.

## Blockers And Residual Risk

There is no blocker to the bounded code capability.

Rollout and visual certification remain blocked by missing valid local auth/RBAC/operating-scope fixture evidence. The full module-surface suite also has one pre-existing payroll expectation mismatch unrelated to the new route; its focused inventory route cases pass.

Slice 409 does not authorize claims of live authenticated visual quality, accessibility, production readiness, loss command integration, or downstream leakage automation.

## Next Recommended Skill

Return to `stoquify-referral-war-room-orchestrator`.

## Suggested Next Slice

Prefer a narrow Slice 409 authenticated browser-certification fixture only if the war room confirms that creating or refreshing local tenant seed data is safe and dependency-complete. Otherwise select another evidence-ready roadmap dependency. No Slice 410 is selected here.
