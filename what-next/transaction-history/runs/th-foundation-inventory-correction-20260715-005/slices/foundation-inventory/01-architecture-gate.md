# Stage 01 Architecture Gate

## Run identity

- Run: `th-foundation-inventory-correction-20260715-005`
- Trace: `51783d07-4481-4580-be21-7e9312f8d71a`
- Slice: `foundation-inventory`
- Mode: `implement`
- Agent: Software Architect
- Verdict: **PASS**

## Executive decision

The immutable inventory-correction boundary is now safe to dispatch. The owner-reviewed checkpoint at commit `8a406e93b0e798ed6f476ca5d81df37a2aaa38be` made `prisma/schema.prisma` clean while preserving the inventory accounting-time and session-assurance migrations. The other four Stage 03 product targets are absent and therefore have no pre-existing overlap.

The authoritative command remains inventory-owned. The dedicated correction service must compose exact stock/value compensation, exact journal reversal semantics, explicit original-to-reversal persistence, source-link continuity, idempotency, maker-checker evidence, and close invalidation in one database transaction. No action or UI is authorized in this run.

## Exact edit boundaries

Stage 01 may write only:

- `what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-005/slices/foundation-inventory/01-architecture-gate.json`
- `what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-005/slices/foundation-inventory/01-architecture-gate.md`

The proposed Stage 03 product boundary is exactly:

- `prisma/schema.prisma`
- `prisma/migrations/20260715090000_inventory_correction_reversal_lineage/migration.sql`
- `services/inventory/inventory-adjustment-reversal.schemas.ts`
- `services/inventory/inventory-adjustment-reversal.service.ts`
- `services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts`

Inspection-only dependencies remain `services/inventory/inventory-adjustment.service.ts`, `services/accounting/posting.service.ts`, `services/accounting/journal-close-invalidation.service.ts`, and `services/inventory/inventory-close-invalidation.service.ts`.

## Dirty-file decision

The fresh snapshot contains 275 ambient dirty paths, all preserved. None matches the five Stage 03 product paths. `prisma/schema.prisma` is clean; the migration, schema helper, correction service, and focused test do not yet exist. Run `004` remains immutable and blocked; this run supersedes it only for new execution.

## Dependency mapping

| surface | route/page | component | hook/action | service owner/function | Prisma model/query | permission/tenant source | audit/evidence source | tests/gates | truth class | status | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Posted stock adjustment | N/A - service-owned posting path | N/A - verified | Existing callers reach inventory services | `inventory-adjustment.service.ts`, `postStockAdjustment` | `StockAdjustment`, `StockAdjustmentLine`, `InventoryLevel`, `InventoryTransaction` | Service-owned `organizationId` predicates | Business event, audit, ledger posting and source link | Existing adjustment tests; Stage 03 | SYSTEM_OF_RECORD | Mapped | `services/inventory/inventory-adjustment.service.ts:1134`; `prisma/schema.prisma:2730` |
| Inventory movement lineage | Read-only movement surface | `StockMovementDashboard` | Inventory movement action/read service | Inventory services | `InventoryTransaction` with signed quantity and dual time | Stored tenant key and scoped reads | Existing business-event/reference evidence; correction FK absent | Reconciliation tests; proposed reversal test | SYSTEM_OF_RECORD | Routed gap | `prisma/schema.prisma:743` |
| Manual stock correction | No canonical posted-reversal command | N/A - verified | Existing manual adjustment request only | `postManualStockCorrection`; `requestManualItemStockAdjustment` | `InventoryTransaction` or `StockAdjustment` | Trusted organization is required | Idempotent business event and ledger blocker | Existing stock-event and adjustment tests | DURABLE_EVIDENCE | Not a reversal | `services/inventory/inventory-stock-event.service.ts:776`; `services/inventory/inventory-adjustment.service.ts:978` |
| Adjustment ledger posting | N/A - service-owned | N/A - verified | `postStockAdjustment` orchestration | `postAdjustmentLedgerOrBlock` | Posting batch, journal, lines, source link | Tenant-scoped service queries | Posted batch, balanced journal and ledger audit | Existing adjustment tests | SYSTEM_OF_RECORD | Mapped | `services/inventory/inventory-adjustment.service.ts:653` |
| Generic journal reversal | Accounting command outside this run | Accounting journal UI | Existing accounting action | `posting.service.ts`, `reverseJournalEntry` | `JournalEntry.reversalOfEntryId`; swapped lines | Organization plus sensitive command controls | Source link, ledger audit and close invalidation | Existing posting tests | SYSTEM_OF_RECORD | Reusable invariant only | `services/accounting/posting.service.ts:358`; `prisma/schema.prisma:5221` |
| Inventory correction command | MISSING | MISSING | MISSING | Proposed `inventory-adjustment-reversal.service.ts` | Proposed explicit adjustment and movement correction relations | Trusted organization plus distinct requester/approver | Atomic business event, audit, source link, journal and close invalidations | Proposed focused service tests | UNKNOWN | Stage 03 authorized | Current architecture plus run `004` mapping |

## Stage 03 correction contract

1. Accept a trusted organization, completed original adjustment, requester, distinct approver, reason, allowed reversal effective date, and idempotency key.
2. Preserve every original adjustment, movement, posting batch, journal, line, and source link.
3. Persist explicit foreign-key correction lineage on the correction adjustment and each compensating movement.
4. Enforce exactly one reversal per original with database uniqueness and idempotent replay.
5. Negate original signed quantities and preserve original values exactly within one database transaction.
6. Refuse reversal when stock quantity/value cannot support the compensation.
7. Create a posted reversal batch and journal whose debit/credit, base amount, currency, account, dimensions, location, item, and source identity reverse the original exactly.
8. Set `JournalEntry.reversalOfEntryId`, create a correction source link, and retain the original journal.
9. Record business event, audit evidence, and inventory/journal close invalidations atomically.
10. Expose no action or UI until Stage 02 separately governs permission, tenant derivation, fresh auth, and maker-checker enforcement.

## Findings

| id | verdict | severity | claim | evidence class | truth class | path | symbol | line | dirty state | impact | required action | owner | next stage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TH01-CORR-005-001 | PASS | high | Inventory adjustment is the authoritative correction owner; generic journal reversal is an accounting invariant, not the domain command | CURRENT_CODE | SYSTEM_OF_RECORD | `services/inventory/inventory-adjustment.service.ts` | `postStockAdjustment` | 1134 | modified, inspection only | Keeps stock, valuation, journal and evidence atomic | Implement the dedicated correction service | Inventory/Accounting | 03 |
| TH01-CORR-005-002 | GAP | critical | Explicit original-to-correction relations and one-time reversal uniqueness are absent | PERSISTENCE | SYSTEM_OF_RECORD | `prisma/schema.prisma` | `InventoryTransaction` / `StockAdjustment` | 743 | clean | Duplicate or untraceable reversal can misstate stock and class 3 | Add the approved schema and migration | Inventory | 03 |
| TH01-CORR-005-003 | PASS | high | Existing journal reversal swaps lines exactly and invalidates close evidence | CURRENT_CODE | SYSTEM_OF_RECORD | `services/accounting/posting.service.ts` | `reverseJournalEntry` | 358 | clean, inspection only | Provides the exact accounting invariant | Reproduce the semantics inside the inventory transaction | Accounting | 03 |
| TH01-CORR-005-004 | PASS | high | The canonical schema and all proposed correction paths are free of pre-existing overlap | CURRENT_CODE | N/A | Stage 03 exact allowlist | N/A | N/A | clean or absent | Safe role dispatch is now possible | Preserve the exact boundary | Orchestrator | 02 and 03 |

## Graph provenance

`graphify-out/manifest.json` was last modified at `2026-07-14T20:02:31.9127217Z` and still identifies the current repository root. Its ordered graph points to the adjustment/posting/close-assurance neighborhoods, but it predates the schema checkpoint and is used only for navigation. Every claim above was rechecked against current source and commit `8a406e9`.

## Verification

- Initial run artifact validation: PASS, zero errors, one expected pre-evidence directory warning.
- Initial selector: Stage 01 selected with no overlapping dirty file.
- Scoped status check: PASS; all five Stage 03 product targets clean or absent.
- Prisma validation: PASS at the checkpoint step.
- Focused checkpoint tests: PASS, 28 tests.
- Full TypeScript check: PASS at the checkpoint step.
- Product changes in Stage 01: none.

## Handoff

Stage 02 and Stage 03 are independently eligible after this exact `PASS`. Stage 02 must define the security contract for any future externally reachable correction command but must not add an action in this run. Stage 03 may edit only the five product paths and its two run artifacts. Stage 04 remains ineligible until both Stage 02 and Stage 03 return exact `PASS` evidence.
