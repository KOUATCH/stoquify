# Migration catalog reconciliation — 2026-10-25

Scope: admit 27 existing migration identities into the 91-entry manifest after source review, without editing or renaming SQL. This is the user's authorized catalog-blocker repair. It is not production migration approval. `before-migrations.json` retains the 116 raw SQL hashes and prior manifest membership present at the initial capture. Two concurrent migrations appeared during review; both were inspected before any database execution and are recorded in `catalog-preservation.json`.

## Exact timestamp exception

Preserve `20261024170000_hris_lifecycle_tasks` and `20261024170000_hris_setup_reviewer_grants`. Both full names were already applied in disposable rehearsals before this repair. Phase 7's [catalog](../phase-7-release-2026-10-24/migration-catalog.json) records respectively SHA-256 `f4cbe0129005fe9c0634ddfd6f78d349c34f66ed5a680196706f965a7aa69654` and `2b5ca60fa12d2aed9add8ec9895bfbabceb6f8d49423269fe26d12c5ac616a9b`; its [history gate](../phase-7-release-2026-10-24/history-gate.json) verifies 115 successful matching migrations. HR-09 rehearsal logs corroborate reviewer-grant application; HR-17 logs corroborate lifecycle-task application. Untracked Git status does not make an already-applied name safe to rewrite.

The exception matches this timestamp and the entire sorted pair. A third name invalidates the exception. Existing immutable-SQL checks, history checks, and future collision rejection remain unchanged. Production application status was not inspected; no assertion about production history is made.

## Reviewed delta

| Existing migration | Effects and dependencies | Admission caveat |
|---|---|---|
| 20261004120000 access requests | Tenant-bound requests, compound user identity, independent reviewer and application state controls | No access grants or backfill; index/constraint creation can lock populated tables. |
| 20261004130000 purchase-order authoring | Depends on compound users key; tenant actor/result-order links, revisions, content and authoring states | Creates no purchase order, stock or payable by itself. |
| 20261016150000 reconciliation no-activity evidence | Provider/period composite indexes, evidence table, immutable transitions | Existing-table index creation; no backfill. |
| 20261016180000 close source publication guard | Revision/change tables and source triggers across financial sources | Direct historical close-run BLOCKED and certified-export stale updates. Populated transition needs certificate-hash retention and invalidation checks. |
| 20261016200000 close payable sources | Supplier ledger/match exception triggers using prior revision functions | Advances revisions across existing close tenants and invalidates eligible prior evidence. |
| 20261016220000 bank balance evidence | Provider/period keys, statements, retention and source revision controls | Advances revisions across existing close tenants. |
| 20261016230000 balance sheet evidence | Chart/period keys, retention and revision functions | Advances revisions across existing close tenants. |
| 20261017090000 period close control | Period control columns/events; period and journal write guards | Replaces a trigger, changes runtime restrictions; existing periods get version zero, no fabricated receipts. Legacy closed periods/concurrent writes need populated checks. |
| 20261019120000 firm engagement foundation | Organization/user/accountant-grant tables, assignments, transitions and guards | No consent/enrollment backfill. Initial revoked-only fence is replaced by next migration. |
| 20261019140000 firm engagement authority | Replaces two prior guard functions | Future enrollment updates the managed grant authority key; rollback must respect its namespace. |
| 20261020100000 accountant active named scope | Partial unique organization/accountant index for named active scopes | Existing collisions fail. Never delete consent to force success. |
| 20261020130000 opening position preview | Immutable organization opening revisions | No financial apply/backfill; bounded 2026-10-01 cutover constraint. |
| 20261020160000 controlled opening cutover | Provenance, execution/operation tables and retained receipts for invoices/receivables/allocations | Relaxes two NOT NULL constraints and adds origin checks/FKs. No financial execution by migration. Populated legacy-row preservation needs separate proof. |
| 20261020180000 firm obligation register | Organization/period revisions with immutable and independent review controls | No backfill; tenant-period checks include database triggers. |
| 20261024143000 HRIS schedule revisions | Revision defaults, supersession/shift-plan links and active revision uniqueness | Replaces the prior date-only unique index. Existing rows keep revision one; no invented shifts. |
| 20261024150000 HRIS documents | Tenant employee metadata, encryption/scan/review/retention state, successor and replay constraints | No document upload, storage provider call or legacy evidence invention. |
| 20261024150100 document evidence guard | Employee/contract write trigger locks evidence and enforces availability/binding | Changes future native write behavior; requires prior documents table. |
| 20261024150200 document evidence hash groups | Replaces guard with grouped hashes and ordered locking | Eligible available/superseded evidence can coexist with pending/rejected duplicates. |
| 20261024150300 document storage identity | Required provider identity defaults to UNBOUND | Does not invent a storage provider or bind legacy objects. |
| 20261024150400 document legacy evidence | Replaces guard preserving legacy metadata references | Newly introduced unavailable evidence remains rejected; eligible original evidence retained. |
| 20261024160000 personal correction cases | Tenant employee cases, revisions, proposal/baseline/policy/history and source references | No automatic employee update or backfill. |
| 20261024170000 lifecycle tasks | Tenant employee tasks, independent owner/reviewer, task/state/revision controls | Exact timestamp exception above; no task backfill. |
| 20261024170000 setup reviewer grants | Explicit tenant/user/employee authority intervals and independent grantor/reviewer | Exact timestamp exception above; no automatic authority grant. |
| 20261024180000 command center coordination | Six tenant-bound coordination, immutable event/receipt, notice and preference tables | Phase 7 proved populated 114→115 upgrade and authenticated three-center persistence; no source financial execution by migration. |
| 20261025190000 HRIS payroll handoff | Period-bound versioned packages/receipts, immutable rows, hash/recipient/tenant and replacement-lineage guards, size bounds | Newly present concurrent work preserved. No financial execution or backfill; dependent payroll period identity must exist. |
| 20261025090000 firm advisory outcomes | Retained engagement/client/period revisions, actor reference, version/replay indexes and immutable trigger | Concurrent addition reviewed after discovery during manifest refresh. No backfill or financial action; depends on firm engagement composite keys. |
| 20261025190100 HRIS handoff actor guard | Replaces the handoff guard with same-tenant issuer/recipient checks, independent issuer/recipient and consecutive replacement lineage | Concurrent addition reviewed after discovery during manifest refresh. No row updates; stricter future writes. Depends on immediately preceding handoff package migration. |

The timestamp plus purpose labels above are descriptive; exact directory names and raw hashes are authoritative in `migration-catalog.json`. `before-migrations.json` covers the initial 116, and `catalog-preservation.json` records the two concurrent additions.

## Verification boundaries

The risk scanner does not classify every UPDATE, trigger/function replacement, or DROP NOT NULL. Zero scanner findings are not proof of no business effects. Manifest admission removes files from the *unmanifested* local risk delta; production execution must still evaluate the actual target's history and exact pending migrations with any required human risk approvals. No approval record is authored by this repair.

Fresh replay proves ordered creation on synthetic empty data. Phase 7's populated 114→115 upgrade does not establish every older populated transition listed above. Schema parity is independent: the current Phase 8 `schema-diff-result.json` returns exit 2 (264 generated statements, none referencing Command Center tables), extending the previously retained Phase 7 drift evidence. Neither comparison was applied. Release reports must retain these limits, provider-policy failures in a disposable environment, and outstanding manual accessibility/scale checks.
