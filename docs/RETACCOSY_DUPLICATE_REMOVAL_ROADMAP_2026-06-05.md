# RETACCOSY Duplicate Removal Roadmap

Date: 2026-06-05

Purpose: prepare StockFlow/RETACCOSY for OHADA accounting integration by removing duplicate, stale, draft, and parallel feature generations from the active system.

## 1. Why This Cleanup Comes Before OHADA Accounting

OHADA/SYSCOHADA accounting requires reliable source events. If POS, inventory, finance, analytics, dashboards, and reporting each have multiple active or semi-active generations, the accounting engine cannot know which event is authoritative.

The duplicate-removal objective is therefore:

- one active POS flow
- one active inventory flow
- one active finance flow
- one active dashboard flow
- one active analytics flow
- one active reporting flow
- one active service/action/hook pattern per feature
- legacy code removed or quarantined outside the active app surface

This cleanup is not cosmetic. It is a correctness prerequisite for immutable journal posting.

## 2. Cleanup Principles

1. Do not delete code merely because names are similar.
2. Prove whether a file is imported, routed, typechecked, or intentionally quarantined.
3. Delete only safe duplicates.
4. Quarantine uncertain legacy modules when immediate deletion is too risky.
5. Keep one production implementation per domain.
6. Keep `npm run verify:repo` passing.
7. Preserve domain logic needed for future accounting by moving it into services, not duplicated UI trees.
8. Update docs as each duplicate group is resolved.

## 3. Duplicate Domains In Scope

### POS

Known duplication signals:

- `components/cashSystem/*`
- `components/newPOSSession/*`
- `components/posSalesProcess/*`
- `components/synchro/*`
- `components/system/sales/PosTerminal*`
- multiple POS action folders under `actions/pos*`, `actions/cashSystem/*`, `actions/newPOSSession/*`, and `actions/sessions/*`

Target state:

- one active POS terminal
- one active POS session service
- one active cash drawer workflow
- one active sale completion action/service
- one future accounting source event for completed sale

### Dashboard

Known duplication signals:

- old `app/(dashboard)/*` route generation
- active `app/[locale]/(dashboard)/*` route generation
- multiple dashboard cards/components with `Enhanced`, `Comprehensive`, `Modern`, `Final`, `Finalist`, or numbered suffixes

Target state:

- active localized dashboard route tree only
- one owner dashboard
- one manager dashboard
- one cashier dashboard
- one accountant dashboard later

### Finance

Known duplication signals:

- draft finance actions
- finance dashboards that read operational tables directly
- inactive AR/AP Prisma delegate references noted in OHADA readiness docs
- customer/supplier ledgers that are not yet true double-entry accounting

Target state:

- finance UI reads from stable services
- draft finance code not used as accounting foundation
- future finance reports read from ledger after accounting kernel exists

### Inventory

Known duplication signals:

- `actions/inventory.ts`
- `actions/newInventory-system.ts`
- many `actions/inventory/*`
- many `actions/itemsShow/*` and `actions/item/*` overlaps
- duplicated inventory dashboards and tables

Target state:

- one inventory service
- one item management workflow
- one stock adjustment workflow
- one stock transfer workflow
- one inventory valuation source for accounting

### Analytics

Known duplication signals:

- multiple comprehensive sales/financial analytics files
- original/new/final/numbered analytics dashboards
- analytics actions reading overlapping data in different ways

Target state:

- one analytics service layer
- ledger-backed finance analytics after accounting kernel
- operational dashboards clearly separated from statutory accounting reports

### Reporting

Known duplication signals:

- sales, inventory, financial, cash, daily sales, purchase, payroll, and production reports spread across actions/components/app routes
- report logic duplicated between dashboard widgets and export pages

Target state:

- one reporting module
- one export pipeline
- statutory OHADA reports read from journals
- operational reports read from domain services

## 4. Methodical Removal Workflow

For each domain:

1. Inventory files with `rg --files`.
2. Map routes that expose the feature.
3. Map imports into active route tree.
4. Map server actions and services used by active components.
5. Mark each file as:
   - `ACTIVE`
   - `ACTIVE_SHARED`
   - `LEGACY_SAFE_DELETE`
   - `QUARANTINE_UNCERTAIN`
   - `FUTURE_REFERENCE`
6. Remove `LEGACY_SAFE_DELETE`.
7. Move uncertain large legacy folders out of the active app surface only when necessary.
8. Run verification.
9. Update cleanup report.

## 5. First Pass Targets

Priority order:

1. Old dashboard route tree
2. POS duplicate terminals
3. Cash drawer/POS session duplicate actions
4. Inventory duplicate item and stock actions
5. Finance draft modules
6. Analytics duplicate dashboards/actions
7. Reporting duplicate pages/components

Reasoning:

- Old routes and duplicated POS paths create the most ambiguity for accounting source events.
- Inventory must be cleaned before cost-of-goods and stock valuation posting.
- Finance/reporting must be cleaned before OHADA statements.

## 6. Done Criteria

The duplicate-removal effort is done when:

1. There is one active app route tree for each domain.
2. Every active route's imports resolve to the chosen active generation.
3. No active feature imports code from quarantined or legacy folders.
4. `npm run verify:repo` passes.
5. A cleanup report lists removed files/folders and retained active surfaces.
6. Future OHADA posting integrations can name their source event path unambiguously.

## 7. Risks And Controls

Risk: deleting code that is still imported.

Control: run import scans and verification before and after removal.

Risk: deleting useful business logic inside old UI components.

Control: preserve any unique domain logic by extracting it to services before removing UI duplicates.

Risk: large deletes obscure unrelated user changes.

Control: perform cleanup in domain batches and document every batch.

Risk: accidentally relying on draft finance models for OHADA accounting.

Control: use the future `services/accounting/*` kernel as the accounting source, not existing draft finance components.

## 8. Immediate Execution Plan

Batch 1:

- Map active localized dashboard routes.
- Confirm old `app/(dashboard)` routes are already deleted or inactive.
- Remove any remaining active references to old dashboard route tree.

Batch 2:

- Map POS terminal route imports.
- Select one active POS terminal.
- Remove old POS terminal components not imported by active routes.

Batch 3:

- Map inventory item/stock actions used by active routes.
- Remove duplicate unused action files with overlapping responsibilities.

Batch 4:

- Map finance/analytics/reporting active imports.
- Remove draft duplicate dashboards and actions outside the active surface.

Batch 5:

- Run `npm run verify:repo`.
- Save final duplicate cleanup report.

## 9. Recommended Active Architecture After Cleanup

```text
app/[locale]/(dashboard)/dashboard/<domain>
  -> server page or client feature shell
  -> thin server actions
  -> services/<domain>
  -> Prisma
  -> TanStack Query hooks where interactivity needs client state
  -> domain components
  -> shared UI components
```

Accounting will later attach below the service layer:

```text
services/<domain>
  -> emits accounting command
  -> services/accounting/posting.service.ts
  -> JournalEntry / JournalEntryLine
```

This gives RETACCOSY a clean, auditable operational-to-accounting chain.
