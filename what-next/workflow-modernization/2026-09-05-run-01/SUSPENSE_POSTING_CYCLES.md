# Durable suspense posting cycles — v97

## Implemented structure

`LedgerPostingBatch.postingCycle` is an explicit financial cycle number, separate from the existing `sourceVersion` revision. Existing rows retain their IDs, source IDs, period, status, payload, journal/source links and version; they gain cycle 1 by default.

The source-identity unique index now includes the cycle. A SQL CHECK requires a positive cycle and restricts cycles above one to `PAYMENT_SUSPENSE` with `SUSPENSE_RECLASSIFICATION` or `REVERSAL` purpose. The tenant request-key unique index is unchanged. Thus unrelated domains still have exactly one permitted cycle and retain their existing source uniqueness.

The shared `createLedgerPostingBatch` entry point remains an initial-cycle helper. Its source lookup explicitly selects cycle 1, and it rejects a key bound to a later cycle. No public/action input or general-purpose posting parameter was added to request later cycles. A later source-owned suspense command must create those batches only after verifying its approval and compensation lineage.

This resolves the storage limitation identified in v96 without inventing suffixes for canonical source IDs. It does **not** yet implement a correction proposal, approval, compensating journal, reopening or later posting command. The generic suspense reversal guard remains. No approval or operational success is inferred from a cycle row.

## Migration and verification target

Migration: `20260909093000_add_suspense_posting_cycles`. The SQL creates the new column/check and replacement index before removing the previous index, all in one transaction. Lock timeout is five seconds and statement timeout sixty seconds. A timeout rolls back; it is not an instruction to remove safeguards or run an unbounded live migration.

The exact SQL was rehearsed on the existing owned local PostgreSQL database, with all DDL and synthetic inserts rolled back. Six checks covered existing-row preservation, distinct suspense cycles, same-cycle and request-key uniqueness, invalid domains/purposes/cycles, ordinary manual source uniqueness and complete rehearsal rollback.

After that successful rehearsal, the same checksum was applied **only** to `stoquify_local_registration_20260906_01`. The one-use application helper checked target ownership, preserved all existing batch fields and registered only that actually applied migration through `prisma migrate resolve --applied`. The retained `_prisma_migrations` checksum was verified. No other pending migration, seed, reset or production target was invoked.

The local Prisma client was regenerated. Its first attempt failed because the owned verification app held the Windows engine DLL. The exact launcher/child process relationship was checked, that app was stopped, generation succeeded, and the same network-fenced launcher was restarted on `http://127.0.0.1:3110`.

## Release sequence and recovery

1. Complete the source-owned correction lifecycle before exposing later-cycle activation. This storage migration alone is not a customer feature or release approval.
2. Review the migration SQL/hash and normal environment-specific migration controls. Obtain the target and maintenance window from the release/database owner. Test a representative data copy to establish lock/index-build duration; local timings do not establish a production budget.
3. Apply this migration before deploying a Prisma client that selects `postingCycle`. A generated client expecting the field cannot safely run against the old schema.
4. Keep old single-cycle writers out of a tenant once real later-cycle operations are enabled. Older code may read a source without a cycle filter. Deploy the completed cycle-aware domain/read paths together before activation.
5. On application failure while only cycle 1 exists, prefer retaining the additive schema and rolling back to the reviewed v96 application/client. If reverting the schema is necessary, use a reviewed reverse migration that first locks the table and rejects any row with cycle above one, creates the old source unique index, then removes the new index/check/column. Never delete or renumber later-cycle evidence to make rollback pass.
6. Once later-cycle records exist, retain the expanded schema and recover forward. Reconcile the cycle chain, approval evidence and journal effects. Schema contraction cannot represent that history. Follow the normal migration-history process; do not delete or fabricate migration records.

The runtime test intentionally retains one synthetic, unactivated cycle-two batch to prove that the legacy helper cannot select it. It has no approval, journal or operational effect. It is test data, not a completed correction. A schema-contraction check on this owned database must therefore detect it and refuse contraction.

## What the user/operator does now

Existing first-post and retry procedures remain available at `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`. The corresponding journals remain at `/en/dashboard/accounting/journals` and `/fr/dashboard/accounting/journals`. No form needs a manually entered cycle number.

For a real correction request, retain the suspense ID, original journal/batch, business reason, source payment/provider evidence and intended correction date. Obtain the IDs from the workbench/history and journal records; obtain source evidence from the actual provider/payment records. The authorized finance owner chooses the intended outcome and independent reviewer. These inputs do not authorize direct database edits or turn this schema into an approved correction workflow.

No further user input is required for the next engineering stage: durable correction proposal/decision evidence and its controlled source operation remain work to implement.

## Remaining implementation

- Immutable, tenant-scoped correction request/decision history and cycle-bound revisions/idempotency.
- Fresh server-derived authentication and independent approval with current source permissions.
- Exact original-to-compensating journal linkage, open-period checks, close/sign-off invalidation and continuing obligations.
- Reopening and later posting only after verifying the complete earlier-cycle compensation chain.
- Cycle-aware ledger truth, retained read models, EN/FR workbench review/history and interruption recovery.
- Actual complete correction journeys, security/concurrency tests, browser/accessibility proof and rollout activation controls.

PR-13 remains incomplete. The platform-wide workflow inventory and outstanding remediation remain in scope. The v94 automatic approval-review hold on alert-trigger removal remains unchanged.

## Review responsibilities

| Lens | Evidence and limit |
| --- | --- |
| Architecture/backend/data | Cycle identity is separate from source revision; root source IDs retained. Other domains restricted to cycle 1. Full correction command remains absent. |
| Database/migration | Exact transactional rehearsal, preservation and rollback; owned-target apply/checksum registration; catalog and schema validation. Production timing/target approval absent. |
| Finance/ledger/audit/close | Original records preserved, initial-post/retry truth verified. Later-cycle row is not financial or approval evidence; compensation and close invalidation still required. |
| IAM/privacy/API/agents | No new public command or authority granted. Shared helper rejects later-cycle keys. Correction authority remains to be implemented; no security certification. |
| Inventory/AP/payroll/POS/customer settlements | Existing source uniqueness retained by constraint; shared-caller regressions. Full domain lifecycle review remains incomplete. |
| Frontend/UX/localization/accessibility | Existing application smoke checked after client regeneration; no new interface. Full correction UI and full accessibility remain pending. |
| SRE/release/support | Owned app stopped/restarted to resolve verified DLL lock; migration-before-client deployment order and forward recovery documented. No deployment or production readiness claim. |
| Product/operations | No user-entered cycle number; real correction inputs and their source described. Storage prerequisite is not presented as feature completion. |
| Statutory/country/billing/provider/offline calculations | Not applicable to changed rules: no account mapping, rate, commercial term, external provider protocol or offline calculation changed. |
| Analytics/governance | Original history retained; downstream cycle-aware reporting still requires implementation before activation. No report certification. |
