# Narrow journal database-guard compatibility review

Read-only caller review for the three disposable-clone failures reported by the parent: a posted line can be edited, a posted header can return to DRAFT, and a line can be reassigned to another existing tenant. This review did not run SQL or edit a migration.

## Production mutation inventory

Repository searches covered TypeScript production paths under services, actions, app, lib and scripts, Prisma scripts/migrations, and a broader source search excluding test/evidence/generated dependency trees. No direct production `journalEntryLine.update`, `updateMany`, `delete`, `deleteMany` or `upsert`, and no raw SQL journal-line update/delete, was found. This is a static caller inventory, not proof against external SQL or dynamic clients.

| Caller | Existing mutation | Proposed narrow guard compatibility |
|---|---|---|
| `services/accounting/journals.service.ts:396` | Newly created DRAFT receives its own sourceId | Allowed |
| `services/accounting/posting.service.ts:332` | Validated DRAFT becomes POSTED | Allowed |
| `services/accounting/posting.service.ts:542` | POSTED becomes REVERSED after creating compensating POSTED entry/lines | Allowed |
| `services/accounting/customer-settlement-reversal.service.ts:761` | Conditional POSTED-to-REVERSED claim | Allowed |
| `services/purchasing/purchase-correction-ledger.service.ts:184` | Original entry becomes REVERSED | Allowed |
| `services/inventory/inventory-adjustment-reversal.service.ts:664` | Original entry becomes REVERSED | Allowed |
| `services/reconciliation/payment-suspense-correction.service.ts:216` | Original entry becomes REVERSED | Allowed |
| `services/reconciliation/payment-suspense-resolution-recovery.service.ts:158` | Original clearing entry becomes REVERSED | Allowed |
| `prisma/seed.ts:105-106` | Deletes all journal lines then headers | May be blocked for posted lines; disposable seed/reset behavior is not runtime authority to bypass retention |
| `prisma/comprehensive-seed.ts:881-885` | Deletes seeded-organization journal lines then headers | Same limitation |

`customer-receivable-backfill.service.ts` creates receivable-document coverage and related evidence; no journal-line rewrite was found. The accounting-source-link repair migration restores the source-link schema and does not rewrite journal amounts. No repository production repair contract requiring posted-line UPDATE or status rollback was found. This does not authorize changing historical posted rows: future controlled repair needs its own qualified owner and evidence.

## Compatible minimum

1. Deny UPDATE/DELETE of an existing line whose original parent is POSTED or REVERSED. On UPDATE also check the destination parent when journalEntryId changes, so a draft line cannot be moved into an existing posted entry. Acquire parent row locks before checking status; a plain snapshot SELECT leaves a transition race.
2. Deny POSTED/REVERSED-to-DRAFT status rollback. Existing POSTED-to-REVERSED compensation remains allowed. Broader status/header immutability must be considered separately rather than implied by this narrow prohibition.
3. For INSERT/UPDATE, require the line organization to equal both its journal parent's organization and its account's organization. Parent/account existence remains subject to the existing foreign keys. Stable parent/account identity or matching locks/constraints must prevent a concurrent tenant reassignment from bypassing a trigger-only check.

Allow INSERT when the new parent is already POSTED: source posting and reversal services create POSTED headers followed by nested lines in the same transaction. Blocking all INSERT into POSTED parents would break current production producers. Do not use transaction-ID heuristics as posting authorization. This deliberately leaves later append prevention for a separately designed atomic posting contract.

## Minimum PostgreSQL checks before accepting this slice

- Reproduce the three original probes and assert rollback/rejection after guards.
- Reject line DELETE, UPDATE reparenting from a draft into a posted entry, tenant mismatch against the account, and both POSTED/REVERSED rollback.
- Preserve valid same-tenant nested-line POSTED creation, DRAFT creation/editing, DRAFT-to-POSTED, and the source/manual compensating reversal shape.
- Exercise concurrent parent posting and line UPDATE with two connections; document whether the draft could change after application validation but before the final status mutation. A parent lock inside the line trigger alone does not make application draft validation atomic.
- Test cascades and parent deletion explicitly. Depending on deletion ordering, a child trigger may not see the removed parent; this slice must not claim cascade retention or complete immutable headers.
- Restore the disposable fixture after each probe and confirm the original source database remains untouched.

Header economic fields, later line append, all foreign-key tenant links, evidence mutation, account/parent tenant reassignment, retention/cascade behavior and runtime database privileges remain broader R08 obligations. The parent owns any resulting migration and clone proof.
