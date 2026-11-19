# P03 real PostgreSQL replay verification

PASS:13 tests,0 failures,0 skipped. Fresh stoquify_local_p03_replay_20261028_r1 on the owned loopback cluster, all120 migration checksums verified, no production target. Private generated client and environment-file read guard used. Source hashes stayed unchanged; cluster stopped successfully. See native-replay-result.json, native-replay-jest.json and native-replay.log.

Evidence covers one unchanged grant/receipt/grant-event/notification on replay; four concurrent identical commands converging; distinct-key contention; changed actor/intent; tenant-scoped keys; incomplete/tampered receipts; revoked/expired/changed-consent denial; atomic rollback of grant, receipt and notification before commit; keyless behavior and scheduled-grant recovery. Rollback is injected inside a real Prisma transaction, not a mock database.

This qualifies the current service repair against PostgreSQL. It does not establish authenticated browser behavior, a sealed build, current combined-release security, live providers, broader engagement lifecycle or production readiness.
