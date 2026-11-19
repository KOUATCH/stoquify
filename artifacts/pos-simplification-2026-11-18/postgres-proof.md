# Isolated POS financial workflow verification — 18 November 2026

## Outcome

The existing full POS PostgreSQL suite executed against a newly created, uniquely named local disposable database. **16 tests passed, 1 failed at browser launch, 0 skipped.** The suite and runner returned exit code 1; this is not an all-pass certification.

The failed test was the optional durable-browser-queue/HTTP-adapter scenario. Playwright could not find its Chromium headless executable in the sandbox. No browser installation or test/setup change was attempted. The other 16 tests ran with real PostgreSQL kernels.

## Isolation and cleanup

- Target: `stoquify_pos_audit_20261118_4b82a4227c34`, created by this task on the existing `localhost:5432` server.
- Maintenance connection identity was verified as database `postgres`, server address `::1`.
- All 123 checked-in migrations were applied only to the fresh audit database; source checksums were verified by the existing guarded runner.
- No application database queries, resets, seeds, schema changes or real sales/payments were performed. No software, database server or application service was installed or started. The optional test briefly started its isolated loopback HTTP adapter before browser launch failed; its cleanup closed the adapter.
- After testing, the owned target had zero active connections. Only that exact database was dropped and its absence verified. See `cleanup.json`.

## Executed commands

```powershell
node scripts/run-s04-s05.cjs bootstrap stoquify_pos_audit_20261118_4b82a4227c34 <this-evidence-directory>
# Test-process flags only:
$env:RUN_RETENTION_OFFLINE_BROWSER = '1'
$env:RETENTION_VERIFICATION_EVIDENCE_DIR = <this-evidence-directory>
node scripts/run-s04-s05.cjs pos stoquify_pos_audit_20261118_4b82a4227c34 <this-evidence-directory>
```

No runner or setup source was changed. The runner overrides all database URLs to the named target, enforces a test-only guard and verifies owned database identity/migration checksums before executing Jest.

## Real PostgreSQL boundaries exercised successfully

- Retained commit identity and original request replay; foreign organization, actor, location, terminal and session rejection.
- Concurrent duplicate completion converges on one sale, stock issue, cash movement, customer receivable, balanced posting batches and durable commit result.
- Cash plus on-account sale ties to the real trial balance; later synthetic bank collection and independent reversal preserve the POS stock/tender history and invalidate stale close evidence.
- Receipt failure after commit stays recoverable; receipt hydration retries do not repost the sale, and changed retry intent is rejected.
- Stale cart and insufficient stock leave no partial financial effects.
- Signed offline event acknowledgement failure recovers without another sale; payload conflicts retain accepted evidence; concurrent replay converges; revoked devices and expired policies preserve blocked evidence.
- Injected serialization failure retries to one complete financial effect.
- Injected final commit-result failure rolls back every real kernel and preserves the retained original request for the permitted retry.

## Limits

Fixtures used synthetic zero-tax account mappings and supplied trusted service controls. They do not prove statutory/OHADA acceptance, deployed authentication/RBAC journeys, real provider settlement, physical peripherals or receipt delivery. The optional isolated browser/HTTP-adapter test did not run past Chromium launch. Desktop/tablet verification of the actual local POS is separate evidence recorded by the parent task. Live application offline capture/replay remains disabled; test flags did not enable it in the running app.

## Evidence files

- `stoquify_pos_audit_20261118_4b82a4227c34-identity.json`
- `stoquify_pos_audit_20261118_4b82a4227c34-bootstrap-2026-11-18T10-15-45-121Z.log`
- `stoquify_pos_audit_20261118_4b82a4227c34-pos-2026-11-18T10-16-46-868Z.json`
- `stoquify_pos_audit_20261118_4b82a4227c34-pos-2026-11-18T10-16-46-868Z.log`
- `sales-accounting-workflow.json`
- `cleanup.json`

## Installed Edge rerun

A temporary test-only `POS_FULL_COMMIT_TEST_BROWSER_CHANNEL` option, allowlisted to `msedge` or `chrome`, was attempted for this rerun. Microsoft Edge 157.0.4341.60 was verified at its official installed path with a valid Microsoft Corporation signature. Because the option did not resolve the sandbox launch failure, it was removed afterward: the final source again uses the original `chromium.launch({ headless: true })`. No final test assertions, skip guards, runner/setup or production code were changed by this verification task.

A second fresh target, `stoquify_pos_audit_20261118_c3ab62bac61e`, was bootstrapped and checksum-verified with the same guarded runner. The rerun selected `msedge` and again produced **16 passed, 1 failed, 0 skipped; exit code 1**. The optional browser case failed during launch: the installed Edge process closed before Playwright connected, with a Windows named-pipe/Crashpad error. No assertions were weakened, cases skipped, browser installed or additional launch workarounds attempted.

The second owned target was dropped after verifying zero active connections and its absence was confirmed. The original failed run remains intact. Rerun evidence, including Jest results, migration identity, accounting tie-out and cleanup confirmation, is in `installed-edge-rerun/`. The actual POS desktop/tablet connector checks remain separate from this blocked isolated-adapter browser test.
