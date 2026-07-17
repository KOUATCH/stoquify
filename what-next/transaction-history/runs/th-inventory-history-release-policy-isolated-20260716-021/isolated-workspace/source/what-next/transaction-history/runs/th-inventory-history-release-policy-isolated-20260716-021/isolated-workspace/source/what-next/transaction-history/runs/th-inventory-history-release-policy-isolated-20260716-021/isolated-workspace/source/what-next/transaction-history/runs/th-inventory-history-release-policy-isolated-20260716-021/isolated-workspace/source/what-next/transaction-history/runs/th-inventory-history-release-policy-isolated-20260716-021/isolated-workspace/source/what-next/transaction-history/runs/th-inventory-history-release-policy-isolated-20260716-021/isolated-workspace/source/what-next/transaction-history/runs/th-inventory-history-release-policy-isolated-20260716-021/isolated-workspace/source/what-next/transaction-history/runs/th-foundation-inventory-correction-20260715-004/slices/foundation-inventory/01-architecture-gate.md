# Stage 01 Architecture Gate

## Run identity

- Run: th-foundation-inventory-correction-20260715-004
- Trace: a82e6f25-6283-4be1-8ca5-aa591975bbef
- Slice: foundation-inventory
- Mode: implement
- Agent: Software Architect
- Verdict: **BLOCKED**

## Executive decision

The correction and reversal architecture is mappable and has a defensible domain owner, but Stage 03 cannot be dispatched safely from this run. Its required persistence target, prisma/schema.prisma, was already modified before run creation. The existing diff contains both predecessor inventory-time controls and independent session-assurance changes.

The installed architecture skill requires BLOCKED_DIRTY_OVERLAP when a planned product path is already modified by another run. No product file, migration, service, or test was written.

## Exact edit boundaries

Stage 01 was permitted to write only:

- what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-004/slices/foundation-inventory/01-architecture-gate.json
- what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-004/slices/foundation-inventory/01-architecture-gate.md

The proposed Stage 03 boundary was:

- prisma/schema.prisma
- prisma/migrations/20260715090000_inventory_correction_reversal_lineage/migration.sql
- services/inventory/inventory-adjustment-reversal.schemas.ts
- services/inventory/inventory-adjustment-reversal.service.ts
- services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts
- the two Stage 03 run artifacts

Inspection-only dependencies were inventory-adjustment.service.ts, accounting/posting.service.ts, journal-close-invalidation.service.ts, and inventory-close-invalidation.service.ts.

## Dirty overlap evidence

| Path | State at run creation | Frozen SHA-256 | Decision |
| --- | --- | --- | --- |
| prisma/schema.prisma | Modified, 32 additions and 16 deletions | 1f1a51e0ee5fabfd20c409c89df0e06a2dfe00953570076e67686254e8302f84 | Blocking overlap |
| services/inventory/inventory-adjustment.service.ts | Modified, inspection only | 873498ecc69003b0c149649567c6e761ff249500adf0af8af927e9aedd672933 | Preserved; not in Stage 03 allowlist |
| services/accounting/posting.service.ts | Clean, inspection only | 59695a5424926771a0bb589e0a0ff6c91eb2a48fbb82a3c3ee19e434a206a919 | Reusable dependency; no edit planned |
| proposed migration, schemas, service, and test | Absent | N/A | Clean new paths, but cannot compensate for the blocked canonical schema |

The schema diff includes session assurance fields on Session and effective/recorded inventory time fields on InventoryTransaction. Automatically committing, stashing, resetting, or overwriting that mixed file would violate ownership boundaries.

## Dependency mapping

| surface | route/page | component | hook/action | service owner/function | Prisma model/query | permission/tenant source | audit/evidence source | tests/gates | truth class | status | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Posted stock adjustment | N/A - service-owned posting path | N/A - verified | Current callers reach inventory services; no correction command exists | inventory-adjustment.service.ts, postStockAdjustment | StockAdjustment, StockAdjustmentLine, InventoryLevel, InventoryTransaction | organizationId is applied to adjustment/location/item queries; server entrypoint remains Stage 02 work | BusinessEvent, AuditLog, LedgerAuditEvent, AccountingSourceLink | inventory-adjustment.service.test.ts; Stage 03 | SYSTEM_OF_RECORD | Mapped | services/inventory/inventory-adjustment.service.ts:1134; prisma/schema.prisma:2730 |
| Inventory movement lineage | Inventory movement page is read-only | StockMovementDashboard | inventory movement action/read service | inventory transaction owner is inventory services | InventoryTransaction has signed quantity, absolute totalCost, effectiveAt, recordedAt, source reference | organizationId is stored and queried | BusinessEvent source identity and movement reference are polymorphic; no correction foreign key | reconciliation and future reversal tests | SYSTEM_OF_RECORD | Gap | prisma/schema.prisma:743 |
| Manual correction helper | No direct canonical history command | N/A - verified | Legacy item service can request a formal adjustment | inventory-stock-event.service.ts, postManualStockCorrection; inventory-adjustment.service.ts, requestManualItemStockAdjustment | InventoryTransaction or StockAdjustment | organizationId is required | Idempotent BusinessEvent and ledger blocker exist | inventory stock-event and adjustment tests | DURABLE_EVIDENCE | Not a reversal | services/inventory/inventory-stock-event.service.ts:776; services/inventory/inventory-adjustment.service.ts:1010 |
| Adjustment ledger posting | N/A - service-owned | N/A - verified | postStockAdjustment orchestration | inventory-adjustment.service.ts, postAdjustmentLedgerOrBlock | LedgerPostingBatch, JournalEntry, JournalEntryLine, AccountingSourceLink | tenant-scoped service queries | posted batch, balanced journal, source link, ledger audit | inventory adjustment tests | SYSTEM_OF_RECORD | Mapped | services/inventory/inventory-adjustment.service.ts:630 |
| Generic journal reversal | Accounting journal command exists separately | Accounting journal UI | reverseJournalEntryAction | accounting/posting.service.ts, reverseJournalEntry | JournalEntry.reversalOfEntryId, swapped lines, reversal batch | organizationId plus sensitive-action control | source link, ledger audit, close invalidation | posting.service.test.ts and journal-close-invalidation tests | SYSTEM_OF_RECORD | Reusable pattern only | services/accounting/posting.service.ts:358; prisma/schema.prisma:5221 |
| Inventory correction command | MISSING | MISSING | MISSING | proposed inventory-adjustment-reversal.service.ts | proposed explicit StockAdjustment and InventoryTransaction correction relations plus exact journal reversal | trusted organization and separate requester/approver required | atomic BusinessEvent, audit, source link, journal and close invalidations | proposed focused service tests and migration verification | UNKNOWN | Blocked before implementation | architecture inference grounded in current adjustment and journal owners |

## Proposed correction contract

The future correction service should:

1. Accept one trusted organization, original completed adjustment, requester, distinct approver, reason, reversal effective date, and idempotency key.
2. Preserve the original adjustment, movements, posting batch, journal, lines, and source link.
3. Persist explicit foreign-key correction lineage on the new adjustment and every reversal movement.
4. Enforce one reversal per original with a database uniqueness constraint and idempotent replay.
5. Negate each original signed quantity and apply the exact original value in one database transaction.
6. Refuse an exact reversal when current quantity or value cannot support it.
7. Create a POSTED reversal batch and journal with every original debit/credit, base amount, currency, account, location, item, dimension, and description reversed exactly.
8. Link the reversal journal to the correction source and set JournalEntry.reversalOfEntryId.
9. Record business-event, audit, and both inventory and journal close invalidations atomically.
10. Expose no action or UI until Stage 02 defines permission, tenant derivation, fresh-auth, and maker-checker controls.

A raw SQL-only side table was rejected because it would leave Prisma schema and runtime persistence contracts divergent. A generic manual correction was rejected because its polymorphic reference is not an enforced original-to-reversal relationship. Calling reverseJournalEntry after a stock adjustment was rejected because it would not be atomic and the normal adjustment posting rule would not necessarily reverse the original debit/credit direction.

## Findings

| id | verdict | severity | claim | evidence_class | truth_class | path | symbol | line | dirty_state | impact | required_action | owner | next_stage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TH01-CORR-001 | PASS | high | Inventory adjustment service is the authoritative correction owner; generic journal reversal is a reusable accounting pattern, not the domain command | CURRENT_CODE | SYSTEM_OF_RECORD | services/inventory/inventory-adjustment.service.ts | postStockAdjustment | 1134 | modified, inspection only | Keeps stock, valuation, journal, and evidence in one domain transaction | Implement a dedicated inventory reversal service once persistence is writable | Inventory/Accounting | 03 |
| TH01-CORR-002 | GAP | critical | InventoryTransaction and StockAdjustment have no enforced original-to-correction relation | PERSISTENCE | SYSTEM_OF_RECORD | prisma/schema.prisma | InventoryTransaction / StockAdjustment | 743 | modified before run | Duplicate or untraceable corrections can overstate stock and class 3 | Add explicit foreign keys, correction kind/reason constraints, and one-time reversal uniqueness | Inventory | 03 |
| TH01-CORR-003 | PASS | high | Existing journal reversal swaps lines exactly and invalidates close evidence | CURRENT_CODE | SYSTEM_OF_RECORD | services/accounting/posting.service.ts | reverseJournalEntry | 358 | clean | Provides the accounting invariant to reproduce inside the inventory transaction | Reuse semantics without changing source ownership to MANUAL | Accounting | 03 |
| TH01-CORR-004 | GAP | critical | Required canonical schema path overlaps mixed predecessor work | CURRENT_CODE | N/A | prisma/schema.prisma | Session and InventoryTransaction | 72 | modified before run | Stage 03 dispatch would overwrite or co-mingle unowned work | Create an owner-reviewed clean checkpoint; do not stash, reset, or auto-commit mixed changes | Repository owner | 01 |

## Graph provenance

The ordered graph identifies inventory-adjustment.service.ts, postStockAdjustment, postAdjustmentLedgerOrBlock, and reverseJournalEntry as related nodes and places close-assurance behavior in accounting community 20. The graph manifest itself lists Prisma inputs and does not prove the current service diff. It is navigation support only; all architectural claims above were verified against source.

## Verification

- Current HEAD: 5cf02043eed4fbfb7e6e1bb3b1a4c87683965e2d
- Initial run artifact validation: PASS, zero errors and warnings.
- Initial selector: Stage 01 selected with no Stage 01 artifact overlap.
- Scoped schema diff inspection: PASS, mixed Session and InventoryTransaction changes confirmed.
- Product tests: SKIPPED because no product change was authorized.
- Stage 02 and Stage 03: NOT DISPATCHED.

## Blocker resolution

A repository owner must make prisma/schema.prisma clean without discarding either the session-assurance work or the inventory-time work. The safe paths are an owner-reviewed checkpoint/commit sequence or completion of the currently active schema work. This run must not create that checkpoint automatically because the file contains mixed concerns from separate programs.

After the schema is clean, create a fresh correction-lineage run with the proposed exact Stage 03 allowlist. Stage 04 remains ineligible.
