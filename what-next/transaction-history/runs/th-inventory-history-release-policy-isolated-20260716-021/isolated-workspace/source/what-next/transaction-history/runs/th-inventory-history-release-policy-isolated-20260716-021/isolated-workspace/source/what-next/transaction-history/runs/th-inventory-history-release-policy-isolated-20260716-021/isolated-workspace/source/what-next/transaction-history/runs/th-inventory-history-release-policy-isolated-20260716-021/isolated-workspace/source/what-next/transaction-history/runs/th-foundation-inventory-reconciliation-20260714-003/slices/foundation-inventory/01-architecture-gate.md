# Stage 01 Architecture Gate

## Run identity

- Run: `th-foundation-inventory-reconciliation-20260714-003`
- Trace: `2c326932-0478-4ee8-977f-cc3227d1647c`
- Slice: `foundation-inventory`
- Mode: `implement`
- Verdict: **PASS**

## Scope decision

This run is restricted to the next two accounting blockers from run 002: complete inventory source reconciliation and period tie-out at one effective/recorded cutoff. Correction and reversal lineage, Stage 04 read models, and UI work are explicitly outside this run.

The exact product edit boundary is:

- `services/inventory/inventory-event.schemas.ts`
- `services/inventory/inventory-reconciliation.service.ts`
- `services/inventory/__tests__/inventory-reconciliation.service.test.ts`

All three paths were clean at run creation. Existing dirty work in the accounting-time schema, migration, posting services, lifecycle documents, and unrelated modules is prerequisite or concurrent work and must not be overwritten.

## Architecture map

| Concern | Authoritative owner | Current evidence | Stage 03 handoff |
| --- | --- | --- | --- |
| Reconciliation input | `inventory-event.schemas.ts` | Organization, optional period/location, currency, tolerance | Add optional immutable `recordedThrough` cutoff |
| Inventory accounting time | `InventoryTransaction` | `effectiveAt`, `recordedAt`, explicit/legacy provenance | Query both times; do not substitute `createdAt` |
| Inventory valuation | `inventory-reconciliation.service.ts` | Current levels are incorrectly used against period activity | Derive opening and signed period value from complete transactions |
| Class 3 control balance | `JournalEntryLine` plus `JournalEntry` | Posted/reversed class 3 lines | Use entry effective date and posting knowledge time at the same cutoff |
| Source continuity | Inventory movement to `BusinessEvent` | Movement and event arrays are capped at 500/1,000 | Replace with bounded-memory, cursor-complete traversal |
| Close consumption | `accounting/close-assurance.service.ts` | Calls `reconcileInventoryClass3` for the period | Preserve existing result fields and add cutoff/roll-forward detail additively |

The current ordered graph places `reconcileInventoryClass3()` and its service in inventory community 20 and shows the call to `hashBusinessPayload`. The graph is navigation evidence only; source inspection controls this run.

## Frozen accounting semantics

- Capture `recordedThrough` once at service entry unless supplied by a trusted internal caller.
- Inventory opening includes movements with `effectiveAt < period.startDate` and `recordedAt <= recordedThrough`.
- Period movement includes `effectiveAt >= period.startDate`, `effectiveAt <= period.endDate`, and `recordedAt <= recordedThrough`, matching the repository's inclusive accounting-period convention.
- Inventory closing is opening plus signed period movement. `totalCost` is stored as an absolute amount; transaction type supplies the sign.
- Class 3 opening and period movement use journal `entryDate` as effective time and `postedAt <= recordedThrough` as knowledge time.
- A period tie-out compares inventory closing and class 3 closing at those identical cutoffs.
- No-period behavior remains a current, cutoff-bound reconciliation and does not claim a historical period roll-forward.
- Complete source continuity may use keyset pages, but no page limit may truncate the population.

## Stage 03 success criteria

1. No fixed 500/1,000 population cap remains.
2. Every movement source in scope is checked against business-event evidence known by the cutoff.
3. Opening, movement, and closing inventory values are returned and internally consistent.
4. Class 3 opening, movement, and closing use the same effective interval and recorded-through cutoff.
5. A deliberate same-cutoff variance blocks the result.
6. Backdated rows recorded after the cutoff are excluded.
7. Existing consumers retain `inventoryValue`, `ledgerClass3Value`, and `driftAmount` semantics as closing values.
8. Focused tests, Prisma validation, lint, and available static checks are recorded without overclaiming.

## Stage handoff

Stage 02 may verify the existing tenant and field boundary. Stage 03 is authorized to modify only the three exact product paths above and its two run artifacts. Stage 04 remains ineligible unless Stage 03 eventually passes every inventory accounting control, including correction lineage in a later bounded run.
