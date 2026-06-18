---
name: 010-aqstoqflow-inventory-boundary-gate
description: Build, run, and ratchet the AqStoqFlow 010 inventory boundary hardening gate. Use when direct InventoryLevel or InventoryTransaction mutations outside services/inventory must be classified, migrated, reported, warned, or hard-failed without breaking POS, purchasing, item stock, or legacy inventory workflows.
---

# Inventory Boundary Gate

Use this skill as the hardening companion to `010-aqstoqflow-inventory-valuation-kernel`.

The goal is to reach a hard Option 3 gate safely:

`InventoryLevel` and final `InventoryTransaction` mutations must live in `services/inventory/*`, and every final stock-changing workflow must have a business event, idempotency key, audit evidence, notification/outbox, and ledger posting or explicit ledger blocker.

## Required Context

Read when present:

- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_TECHNICAL_SPEC_2026-06-15.md`
- `what-next/AQSTOQFLOW_010_ADJUSTMENT_WRITEOFF_COUNT_KERNEL_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_BOUNDARY_GATE_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `services/inventory/*`
- `scripts/inventory-boundary-gate.js`
- `references/runtime-boundary-card.md`
- `references/anti-pattern-register.md`

## Operating Rules

1. Do not jump directly to hard-fail enforcement while legacy stock producers still exist.
2. Install or update the scanner first, then run it in `report` mode.
3. Classify every direct mutation as item initial stock, manual update, purchasing receipt, POS stock effect, legacy inventory helper, script, test, seed, allowed kernel, or unknown.
4. Migrate one producer class at a time behind service-owned inventory kernel APIs.
5. Preserve existing UI/action shapes where practical; use compatibility wrappers before UI rewrites.
6. Add or update regression tests in the same slice as each migration.
7. Turn the gate from `report` to `warn`, then `fail`, only after active violations are intentionally reduced.
8. Stop when a migration would silently change stock, ledger, POS, purchasing, or item-creation behavior without tests.

## Gate Script

Prefer the repo-local script when present:

```powershell
npm run inventory:boundary
```

To save an evidence report:

```powershell
node scripts/inventory-boundary-gate.js --mode report --out what-next/AQSTOQFLOW_010_INVENTORY_BOUNDARY_GATE_REPORT_2026-06-15.md --json-out what-next/AQSTOQFLOW_010_INVENTORY_BOUNDARY_GATE_REPORT_2026-06-15.json
```

Future hard gate:

```powershell
npm run inventory:boundary:fail
```

Use the bundled `scripts/inventory-boundary-gate.js` only when the repo does not yet have the script.

## Migration Order

1. Item initial stock and manual stock updates:
   - create or use opening-stock and manual-adjustment kernel APIs;
   - migrate `actions/itemsShow/*` and `services/item/*`;
   - require event, audit, outbox, idempotency, and ledger blocker.
2. Purchasing receipt stock effects:
   - create or use a goods-receipt inventory event;
   - migrate receipt projection and movement writes from purchasing services.
3. POS sale, refund, and void stock effects:
   - create POS inventory kernel APIs;
   - preserve POS transaction atomicity and payment/accounting behavior.
4. Legacy inventory helpers:
   - wrap or retire direct action/helper mutations.
5. Runtime-like scripts:
   - convert to kernel calls or mark as explicit seed/demo-only scripts outside production gates.

## Verification

Run the smallest meaningful set after each migration:

```powershell
npm run inventory:boundary
npm test -- services/inventory --runInBand
npm run prisma:validate
npm run typecheck
```

For migrated POS or purchasing producers, also run their focused tests.

## Output Contract

End with:

- selected skill: `010-aqstoqflow-inventory-boundary-gate`
- scanner mode used
- active violation count
- classifications found
- files changed
- migrations completed
- gates passed
- gates still blocked
- verification commands and results
- next migration class
