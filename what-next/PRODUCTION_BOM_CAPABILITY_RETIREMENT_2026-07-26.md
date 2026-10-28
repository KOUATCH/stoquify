# Production/BOM Capability Retirement

**Date:** 2026-07-26  
**Decision:** Retired from the active Stoquify product and code model  
**Scope:** Recipes, recipe ingredients, bills of materials, and production batches

## Outcome

The unimplemented production/BOM capability is no longer an active Stoquify
module. It is absent from the canonical module registry, entitlement vocabulary,
public package offer, role templates, permissions, application types, Prisma
runtime models, demo seeds, and BOM-specific utility scripts.

Stoquify continues to support general inventory, purchasing, sales, POS,
accounting, and reconciliation workflows.

## Enforcement Matrix

| Surface | Result |
|---|---|
| Module catalog and entitlement slug | Removed |
| `/dashboard/production` ownership | Removed |
| Public production extension offer | Removed |
| Production, recipe, planning, and costing permissions | Removed |
| Production and recipe role grants | Removed |
| Recipe/BOM application types | Removed |
| Recipe, ingredient, and production-batch Prisma models | Removed |
| Default and comprehensive seed data | Removed |
| Standalone production and bakery/BOM seed utilities | Removed |
| Location production-batch counts | Removed |
| Historical inventory movement interpretation | Preserved |
| Historical accounting source interpretation | Preserved |

## Data Retention

The migration
`prisma/migrations/20260726190000_retire_production_bom_capability/migration.sql`
does not delete data. When legacy BOM tables exist, it renames them to:

- `legacy_recipes`
- `legacy_recipe_ingredients`
- `legacy_production_batches`

The current Prisma client does not expose these tables. Historical
`PRODUCTION_IN`, `PRODUCTION_OUT`, and `PRODUCTION_BATCH` codes remain supported
only so existing inventory movements, source links, ledger evidence, exports,
and audits continue to reconcile.

No database migration was deployed as part of this implementation.

## Reintroduction and Rollback

Reintroducing specialized manufacturing is a new product decision, not a flag
toggle. It requires a new bounded-context proposal, a new canonical module
identity, explicit inventory and accounting contracts, tenant packaging,
migrations from any approved legacy archive, and release evidence.

The archival migration is intentionally one-way at the product boundary. A
database rollback, if ever authorized, must be performed as a reviewed data
migration after confirming that no conflicting active tables exist.

## Verification

- Prisma schema validation: passed.
- Prisma client generation: passed.
- TypeScript typecheck: passed.
- Focused module, landing, inventory-gate, and inventory-surface tests:
  5 suites and 32 tests passed.
- Prisma migration safety gate: ready, 8/8 checks, zero destructive findings.
- Inventory valuation truth gate: ready, 5/5 checks.
- Retirement regression:
  `production_bom_capability_retired_with_history_preserved`.

## Non-Claims

This change does not delete or certify historical BOM records, and it does not
deploy the archival migration to any environment. It removes the capability
from the active product and prevents accidental reintroduction through the
inventory valuation truth gate.
