# Journal status and direct database guard supplement

The independent review found no production writer that requires POSTED/REVERSED-to-VOIDED or REVERSED-to-POSTED. The traced journal updates remain DRAFT source initialization, DRAFT-to-POSTED and POSTED-to-REVERSED. `prisma/comprehensive-seed.ts` creates standalone VOIDED fixtures; that INSERT behavior remains allowed. The earlier caller matrix remains applicable.

## Append-only correction

`20260930213000_journal_posted_status_transitions/migration.sql` replaces only the prior status-trigger function. POSTED may remain POSTED or become REVERSED. REVERSED must remain REVERSED. Other starting states remain outside this narrow guard. This closes the previously documented POSTED-to-VOIDED-to-DRAFT bypass without rewriting migration 88 or historical data.

Migration 89 SHA-256: `50742465c97d3519981a2918d50a2988a4f06058159a7662a9341048815f8e97`.

Retained migration 88 SHA-256: `b967518e17b8d8dfe82a27be32ed387171eccf361ade577d63ea4fedaf665cde`.

## Disposable-clone verification

Command:

```powershell
node what-next/platform-remediation/2026-09-30-run-01/accounting/verify-journal-guard-supplement.cjs
```

The harness verifies this run's restore receipt, prior migration receipt/checksum, loopback disposable target and connected database identity before migration operations. It uses only `stoquify_restore_local_remediation_20260930_run01`; credentials and record identifiers are not emitted. The offline worker confirmed its clone connections were closed before execution and was notified when the window ended.

`journal-guard-supplement-results.json` records exit 0, `prisma migrate deploy` and `prisma migrate status` success, migration count 88 to 89, both migration checksums, **17/17 SQL checks passed**, and `fixtureRollbackConfirmed: true`. The run completed at 2026-09-30T21:29:31.537Z. Only migration installation persists on the disposable clone; source/primary database was not written.

Rejected with SQLSTATE 23514:

- Posted and reversed line deletion; reversed line amount update.
- POSTED-to-DRAFT/VOIDED and REVERSED-to-DRAFT/VOIDED/POSTED.
- The POSTED-to-VOIDED-to-DRAFT sequence at its first forbidden step.
- Account-only tenant mismatch on draft-line INSERT and UPDATE, with line/parent tenant otherwise correct.

Allowed:

- POSTED-to-REVERSED and unchanged POSTED/REVERSED statuses.
- DRAFT-to-POSTED and DRAFT-to-VOIDED.
- A new POSTED header followed by its balanced nested-line shape.

These supplement the parent's original three before/after probes and eight compatibility cases. Each probe used a savepoint, forced deferred constraints, and rolled back; the entire fixture transaction was then rolled back and connections closed.

## Remaining qualification

This verifies the specified SQL boundaries, not complete application compensation. Complete header immutability, inserts appended to previously committed posted entries, parent/account tenant reassignment, cascade retention, least-privilege runtime roles and concurrent draft edit/post ordering remain R08 obligations. No historical base amount repair, source deployment or certification was performed. The parent owns migration catalog updates and clean replay evidence.
