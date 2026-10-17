# Terminal 011 local fixture repair — applied

Applied with explicit user approval at 2026-10-12 11:18:29 UTC. The three expected states and the audit record were verified in PostgreSQL. Cart identity, four lines, prices, total and active shift were identical before and after the repair. Browser resume verification completed successfully at approximately 11:31 UTC.

The initial guarded attempts rolled back because the Node PostgreSQL driver converted timestamp-without-time-zone values to UTC during JSON export. A read-only comparison proved that only timestamp representations differed by one hour; no fixture data had changed. `snapshot-native-timestamps.json` retains exact PostgreSQL JSON timestamps. `apply-native.sql` is the applied statement; **use `rollback-native.sql` for rollback**. Original SQL and snapshots remain as diagnostic history. Full-row guards were retained. `applied-evidence.json` records the committed result and before/after cart checks.

Prepared 2026-10-12 after the user confirmed the offline data is disposable test data and requested a scoped repair preparation.

Target: local PostgreSQL database `stoquify_replay_next_20260830`, organization `rds_org_001`, terminal `rds_org_001_pos_station_011`, device `rds_org_001_pos_offline_device_011`. This is the database serving the local application, not the separate integration-test database.

## Evidence and exact changes

The read-only repeatable-read inspection found exactly one event, one conflict and one certificate in the affected scope. The event contains only `{"seed":true}` and has no session, business event, posting batch or document hash. The conflict has no linked source event. The generated seed names and hash strings agree with the repository seed conventions.

| Record | Current | Proposed |
|---|---|---|
| `rds_org_001_pos_offline_event_011` | `PENDING_REPLAY` | `REJECTED`, reason `LOCAL_TEST_FIXTURE_RETIRED` |
| `rds_org_001_pos_offline_sync_conflict_011` | `OPEN` | `DISMISSED`, explicit test-fixture reason and timestamp |
| `rds_org_001_pos_offline_sync_certificate_011` | `OPEN`, `closeBlocker=true` | `EXPIRED`, `closeBlocker=false`, explicit test-fixture reason |

All three records remain stored. Each receives repair metadata. One system audit row records the reason and complete prior values; it does not impersonate a signed-in user. No sale replay or successful certification is asserted. The device and received sync batch remain unchanged. The cart, its lines, tenders, shift, financial records, inventory, module access and other terminals are outside the update statements.

## Files and controls

- `snapshot-1791802660153.json`: complete before-images of the three affected records, plus device/batch context. Created by an explicitly read-only transaction.
- `apply.sql`: one serializable transaction, local database identity guard, short lock/statement timeouts, exact scope counts and complete row-snapshot comparisons before any update. Aborts on stale evidence. Short table locks prevent new offline evidence racing those checks; apply during an idle moment because other offline writes may briefly wait.
- `rollback.sql`: restores only the changed columns from the snapshot, retaining the application audit row and appending a rollback audit row. Refuses if repair markers, statuses or timestamps changed after repair. Rollback restores the checkout blocker. Review subsequent checkout activity before using it.
- `scripts/prepare-pos-terminal-011-repair.cjs`: read-only inspection/backup; cannot apply changes.
- `scripts/generate-pos-terminal-011-repair.cjs`: file-only SQL generation; cannot connect to a database.

The SQL is intended for a reviewed local database connection. Do not rerun seeds, reset the database or disable the checkout guard. The approved application writes are now complete; do not reapply them.

## Verification performed

- Repository workflow contract passed.
- Both scripts passed Node syntax checks.
- Actual local PostgreSQL inspection succeeded under `BEGIN ... READ ONLY`; the transaction was rolled back and the snapshot saved locally.
- Generated SQL was inspected against the current Prisma schema and checkout guard. The corrected native-timestamp apply SQL executed successfully against the explicitly authorized local fixtures; rollback has not been executed.

## Completed browser and database acceptance

Authenticated English POS, Wouri Warehouse / Seed POS Terminal 011: clicked Resume cart on the retained order `POS-RDS001-TERM-011-20261012-IXVT3`. The Resume controls disappeared, quantity editing became enabled and Charge became enabled. Offline status shows 0 pending events, 0 conflicts and 0 blockers. Cart still has the same four items and displayed total FCFA 4,889 (stored decimal total 4889.26). Screenshot: `pos-cart-resumed.jpg`. POS was marked to remain open for the user.

Final read-only PostgreSQL check after Resume confirmed order status DRAFT, payment status PENDING, four lines, zero payments, zero POS commit records, ACTIVE shift, no end time and zero blocking certificates. Evidence: `checkout-verification.json`. No Charge, Close or End shift action was invoked. Browser/server interruptions delayed verification, but the final UI and database checks both succeeded.
