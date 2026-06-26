# AqStoqFlow Statutory Service Modernizer Skill Run Report

Date: 2026-06-16

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

Installed skill: `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-statutory-service-modernizer`

## Objective

Create, install, validate, and run the `aqstoqflow-statutory-service-modernizer` skill. The skill is designed to guide controlled migration from legacy action/route/UI-owned business logic into statutory service-owned AqStoqFlow workflows.

## Skill Created

Installed files:

- `SKILL.md`
- `agents/openai.yaml`
- `references/migration-control-catalog.md`
- `scripts/legacy-modernization-scan.js`

Workspace draft source:

- `.codex-skill-drafts/aqstoqflow-statutory-service-modernizer/SKILL.md`
- `.codex-skill-drafts/aqstoqflow-statutory-service-modernizer/agents/openai.yaml`
- `.codex-skill-drafts/aqstoqflow-statutory-service-modernizer/references/migration-control-catalog.md`
- `.codex-skill-drafts/aqstoqflow-statutory-service-modernizer/scripts/legacy-modernization-scan.js`

## Validation

Official skill validation passed:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\aqstoqflow-statutory-service-modernizer"
```

Result:

```text
Skill is valid!
```

Manual validation also checked:

- frontmatter name and description;
- `agents/openai.yaml` display fields;
- no scaffold placeholder text;
- installed skill file structure.

## First Skill Run

The skill was run in report mode only. No legacy code was deleted and no production paths were refactored in this first run.

Command:

```powershell
node "C:\Users\J COMPUTER\.codex\skills\aqstoqflow-statutory-service-modernizer\scripts\legacy-modernization-scan.js" --root . --out "what-next\AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md" --json-out "what-next\AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.json"
```

Output artifacts:

- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.json`

## Scan Summary

Files scanned: 652

Total findings: 481

Category counts:

- `action-owned-mutation`: 48
- `direct-prisma-outside-service`: 17
- `hard-delete-review`: 18
- `mock-demo-production-risk`: 14
- `raw-error-handling`: 375
- `ui-service-import`: 9

## Highest Priority Findings

The first migration slice should not start with all 481 findings. The skill's own rules point to a controlled sequence.

Recommended first slice:

1. Inventory and item stock legacy actions.
2. Item hard-delete and stock update paths.
3. Inventory mock/demo paths.
4. Service-backed replacement actions and tests.

Representative files from the scan:

- `actions/inventory/inventoryMovementActions.ts`
- `actions/inventory/inventoryActions.ts`
- `actions/item/items.ts`
- `actions/itemsShow/deleteItem.ts`
- `actions/itemsShow/updateItemStockById.ts`
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx`

Recommended second slice:

1. Purchase-order/AP split-brain consolidation.
2. Hard-delete review inside purchase-order lifecycle.
3. Raw error normalization for the legacy purchase-order service.

Representative files:

- `services/purchase-order/purchase-order.service.ts`
- `services/purchasing/*`
- `actions/purchasing/*`
- purchase-order dashboard/action callers.

## Controls Added By Skill

The installed skill now gives Codex:

- a ratcheted migration workflow;
- deletion safety rules;
- statutory service controls checklist;
- verification checklist;
- a deterministic scanner for legacy modernization findings;
- a migration control catalog for classifying legacy paths.

## Remaining Blockers

This run did not complete the full modernization. That would require domain-by-domain implementation, caller migration, tests, and deletion. The scan confirms the work should be sequenced rather than handled as one broad deletion pass.

Current blockers before fail-mode gates:

- 48 action-owned mutation findings;
- 17 direct Prisma findings outside services;
- 18 hard-delete review findings;
- 14 mock/demo production-risk findings;
- 375 raw-error findings, many of which need classification before enforcement;
- 9 UI/hook service-import findings.

## Next Recommended Command

Use the newly installed skill for the first implementation slice:

```text
Use $aqstoqflow-statutory-service-modernizer to migrate the inventory and item legacy action paths into statutory services. Start with actions/inventory/inventoryActions.ts, actions/inventory/inventoryMovementActions.ts, actions/item/items.ts, actions/itemsShow/deleteItem.ts, and actions/itemsShow/updateItemStockById.ts. Preserve behavior through service-backed actions, add regression tests, and delete old code only after all callers are migrated.
```
