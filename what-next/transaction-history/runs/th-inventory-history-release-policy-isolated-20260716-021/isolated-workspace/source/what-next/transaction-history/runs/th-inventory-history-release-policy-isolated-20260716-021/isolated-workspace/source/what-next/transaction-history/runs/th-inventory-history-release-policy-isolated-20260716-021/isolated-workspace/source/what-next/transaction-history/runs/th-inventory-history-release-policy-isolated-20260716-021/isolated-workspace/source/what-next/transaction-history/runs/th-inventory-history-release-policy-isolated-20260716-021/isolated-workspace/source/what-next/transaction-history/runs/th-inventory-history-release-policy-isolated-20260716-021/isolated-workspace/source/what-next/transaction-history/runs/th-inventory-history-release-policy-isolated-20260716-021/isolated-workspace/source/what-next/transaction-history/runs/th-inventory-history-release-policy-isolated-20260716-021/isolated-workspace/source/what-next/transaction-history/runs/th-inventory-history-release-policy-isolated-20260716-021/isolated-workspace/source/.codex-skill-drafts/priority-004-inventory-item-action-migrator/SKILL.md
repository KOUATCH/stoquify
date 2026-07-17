---
name: priority-004-inventory-item-action-migrator
description: "Priority 004 Inventory Item Action Migrator remediates an AqStoqFlow priority implementation class. Use when executing the ordered priority remediation suite, hardening this codebase priority, migrating legacy code into service-owned workflows, adding OHADA controls, or validating this release gate."
---

# Inventory Item Action Migrator

## Purpose

Finish migration of inventory and item actions into service-owned stock, item, transfer, reservation, count, adjustment, and write-off workflows.

## When To Use

Use this skill when:

- this is the next eligible item in the ordered AqStoqFlow priority remediation suite;
- the user asks to continue, implement, remediate, harden, validate, or report on this specific priority;
- all dependent lower-numbered priority skills are complete, not applicable, or explicitly blocked with evidence.

Do not use this skill when:

- a lower-numbered priority skill has an unresolved dependency that this work needs;
- the requested change would bypass service ownership, tenant isolation, RBAC, audit evidence, fiscal-period controls, or OHADA accounting discipline;
- the user only wants a high-level plan and not implementation, except safe readiness/report mode.

## Source Reports To Read

- what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md
- what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md
- what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md
- what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md
- what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md
- graphify-out/GRAPH_REPORT.md

Read only the relevant sections and files after the initial source reports. Prefer current code over stale report assumptions when they conflict.

## Priority Being Solved

Priority 2 and Slice 2 from the examination report, plus the 010 continuation blockers.

Risk: Old item and inventory actions still expose direct item mutation, mock inventory data, transfer/reservation logic, hard deletes, and incomplete count/adjustment/write-off service ownership.

Dependencies: priority-001 through priority-003.

## Required Architecture

Use the statutory service pattern:

```text
services/<domain>/*.schemas.ts
services/<domain>/*.errors.ts
services/<domain>/*.service.ts
services/<domain>/__tests__/*.test.ts

actions/<domain>/*.actions.ts     -> thin validation/orchestration only
hooks/<domain>/*.ts               -> data fetching/cache only
components/...                    -> UI only
```

Protected business truth must never be owned directly by server actions, App Router pages, route handlers, hooks, UI components, mock/demo helpers, or direct Prisma calls outside approved services.

## Files And Patterns To Inspect

- actions/inventory/inventoryActions.ts
- actions/inventory/inventoryMovementActions.ts
- actions/item/items.ts
- actions/item/listItemsAction.ts
- actions/itemsShow/*
- services/inventory/*
- services/item/*
- prisma/schema.prisma

## Edit Boundary

May edit:

- services/inventory/*.schemas.ts
- services/inventory/*.errors.ts
- services/inventory/*.service.ts
- services/item/*.service.ts
- actions/inventory/*.ts
- actions/item/*.ts
- actions/itemsShow/*.ts
- services/inventory/__tests__/*
- services/item/__tests__/*
- actions/**/__tests__/*

Must not edit:

- unrelated domains or UI surfaces;
- generated files unless the project command generates them as part of the verified change;
- historical evidence records through destructive changes;
- statutory or legal certification claims without real authority-adapter, country-pack, and expert-review prerequisites.

## Implementation Workflow

1. Read the 010 continuation report and current boundary report before changing code.
2. Build or reuse service-owned methods for transfers, reservations, stock counts, adjustments, write-offs, item updates, and initial stock.
3. Enforce open-period guards, business events, audit, idempotency, maker-checker where applicable, and ledger posting or close blockers.
4. Migrate actions so they parse input, derive context, call services, map errors, and revalidate only.
5. Quarantine or delete mock inventory exports only after callers are moved or proven unused.
6. Delete legacy action-owned mutation only after service replacement and regression coverage exist.

## Security And Compliance Controls

- derive tenant and actor from trusted auth context, never caller-supplied organization scope
- enforce RBAC permissions at the service boundary and keep actions as validation/orchestration only
- enforce maker-checker segregation for approval, posting, certification, and destructive workflows where applicable
- reject closed or locked fiscal periods before economic mutation or certification state change
- record immutable audit and business-event evidence for economic, compliance, and trust decisions
- post valid ledger entries or create explicit close blockers with accountant-review evidence
- return typed, user-safe enterprise errors and keep internal details out of client responses
- add focused regression tests before deleting or ratcheting legacy paths

## Legacy Migration Rules

- Build or confirm the service-owned replacement first.
- Move every caller to the service-backed action or route.
- Add regression tests proving the old behavior still works through the new path.
- Add or update a static/boundary gate so the legacy pattern cannot return.
- Delete old files/functions only after usage reaches zero.
- Preserve behavior unless it conflicts with tenant safety, RBAC, auditability, fiscal periods, ledger integrity, maker-checker controls, or OHADA accounting discipline.

## Regression Test Requirements

- successful transfer/reservation/item update through service-backed action
- successful stock adjustment and write-off request/approval path
- closed-period rejection
- unauthorized and wrong-tenant rejection
- ledger posting path or close-blocker fallback
- boundary gate no longer reports migrated action paths

## Static And Boundary Gate Requirements

- Run the relevant domain gate before and after migration.
- Update report-mode findings with exact file paths, classifications, and replacement service owners.
- Move a gate from report mode to fail mode only when active findings for that class reach zero or have explicit expiring allowlist entries.
- Keep `npm run inventory:boundary:fail` green when touching inventory or stock producers.
- Keep `node scripts/service-boundary-gate.js --mode report` current when touching actions, app routes, hooks, or components.

## Verification Commands

```powershell
npm run inventory:boundary:fail
npm test -- services/inventory services/item actions/inventory actions/item actions/itemsShow --runInBand
node scripts/service-boundary-gate.js --mode report
npm run typecheck
npm run prisma:validate
```

## Completion Report Format

Save a report under `what-next/` named `AQSTOQFLOW_PRIORITY_004_INVENTORY_ITEM_ACTION_MIGRATOR_REPORT_2026-06-16.md` containing:

- priority skill name and number;
- source reports and files inspected;
- current priority status before changes;
- files changed;
- services added or reused;
- actions, routes, hooks, or UI callers migrated;
- security, tenant, RBAC, maker-checker, audit, business-event, ledger, and close-blocker controls added;
- tests added or changed;
- static/boundary gates run;
- verification commands and results;
- remaining blockers and the next priority skill to run.

## Stop Conditions And Blocker Reporting

Stop and save a blocker report when:

- required schema or service ownership cannot be determined from current code;
- a migration would require deleting evidence-bearing data without an approved replacement path;
- a statutory, payroll, tax, or legal claim would require expert approval not present in the repo;
- a lower-numbered priority dependency is still open and this skill would build on unstable ground;
- verification reveals unrelated failures that make the touched-slice result impossible to isolate.

## Success Criteria

No stock, transfer, reservation, count, write-off, adjustment, or item economic update remains action-owned.
