# AqStoqFlow Exam 001-002 Service Boundary Ratchet Completion Report

Date: 2026-06-16

## Risk Class

- `exam-001-aqstoqflow-risk-suite-orchestrator`
- `exam-002-aqstoqflow-service-boundary-ratchets`

## Result

Completed the first implementation-bearing remediation slice from the exam risk suite: a repository-level service-boundary scanner and package gate that inventories direct Prisma access outside service ownership and action-owned protected mutations.

This does not claim the legacy boundary violations are gone. It makes them visible, ordered, repeatable, and enforceable so the following domain skills can retire them without losing coverage.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\exam-001-aqstoqflow-risk-suite-orchestrator\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-002-aqstoqflow-service-boundary-ratchets\SKILL.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_EXAM_RISK_REMEDIATION_SKILL_SUITE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_EXAM_RISK_REMEDIATION_SKILL_SUITE_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `package.json`
- `scripts/inventory-boundary-gate.js`

## Files Changed

- `scripts/service-boundary-gate.js`
- `scripts/__tests__/service-boundary-gate.test.js`
- `package.json`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- `what-next/AQSTOQFLOW_EXAM_001_002_SERVICE_BOUNDARY_RATCHET_COMPLETION_REPORT_2026-06-16.md`

## Controls Added

- Added `scripts/service-boundary-gate.js`.
- Added report, warn, and fail modes.
- Scans `app`, `actions`, `components`, and `hooks`.
- Flags direct `@/prisma/db` imports outside services.
- Flags direct `db.*`, `tx.*`, and `prisma.*` calls outside services.
- Flags server action-owned mutations.
- Classifies economic mutations separately from general action mutations.
- Treats test and mock paths as allowed findings.
- Orders findings so item/inventory, App Router API, purchasing/AP, hooks, components, and remaining actions are migrated in a controlled sequence.

## Package Gates Added

```json
"service:boundary": "node scripts/service-boundary-gate.js --mode report",
"service:boundary:fail": "node scripts/service-boundary-gate.js --mode fail"
```

`service:boundary:fail` is intentionally not release-blocking yet because the generated report still has active findings. It becomes the ratchet target after the domain migrations reduce active violations to zero or a reviewed baseline is introduced.

## Current Boundary Findings

Generated report:

- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`

Current active findings:

- Active service-boundary violations: 286
- `ACTION_OWNED_ECONOMIC_MUTATION`: 15
- `ACTION_OWNED_MUTATION`: 38
- `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 144
- `DIRECT_PRISMA_DB_IMPORT`: 54
- `PRISMA_CLIENT_BOUNDARY_COUPLING`: 35

Highest-priority migration cluster:

- `actions/inventory/inventoryActions.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/item/items.ts`
- `actions/item/listItemsAction.ts`
- `actions/itemsShow/*`
- inventory item edit page and item API routes

## Services Added Or Reused

No domain service was added in this slice. This slice creates the cross-cutting scanner and execution ratchet. Domain services are handled by the following ordered skills, starting with tenant/RBAC hardening and the inventory/item finalizer.

## Actions, Hooks, And UI Migrated

None in this slice. The scanner identifies the exact migration backlog. Moving these callers now belongs to the next domain-specific remediation pass, where each path can be replaced by a tested service-backed implementation.

## Tests Added

- `scripts/__tests__/service-boundary-gate.test.js`

Covered behavior:

- detects direct Prisma imports outside services;
- detects action-owned economic mutations;
- allows test/mock persistence stubs;
- renders migration guidance for active findings.

## Verification Results

Passed:

```powershell
node --check scripts\service-boundary-gate.js
npm test -- scripts/__tests__/service-boundary-gate.test.js --runInBand
node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json
npm run prisma:validate
npm run typecheck
npm run inventory:boundary:fail
```

Notes:

- `npm run prisma:validate` passed and emitted the existing Prisma 7 deprecation warning for `package.json#prisma`.
- `npm run inventory:boundary:fail` remains green with 0 active direct final-stock mutation violations.
- `npm run service:boundary -- --out ...` was not used for artifact generation because npm on Windows consumed the extra `--out` style flags. The direct Node command generated the report successfully.

## Remaining Blockers

- The repository still has 286 active service-boundary findings.
- `service:boundary:fail` will fail until those findings are migrated or a reviewed baseline is introduced.
- The first migration cluster is item/inventory actions and item read APIs/pages.
- Later migration clusters include purchasing/AP, hooks, component DTO coupling, and remaining CRUD/auth/action mutations.

## Next Skill

Ordered suite next: `exam-003-aqstoqflow-tenant-rbac-hardener`.

First domain migration after tenant/RBAC hardening: `exam-004-aqstoqflow-inventory-item-finalizer`, because the new service-boundary gate ranks item and inventory action paths as migration order 1.
