# P02 — Database verification closure

18 October 2026. **PASS for the bounded outcome-reader slice; the original P02 database-verification gap is closed.** No production implementation change was required. Human adoption/cohort collection remains UNKNOWN and unimplemented pending D12 decisions. This is not a measured retention result or whole-application authentication certification.

## Current evidence

| Class | Actual check | Result |
|---|---|---|
| S | Current reader/projection/RBAC/module/schema/dependency inspection; baseline and installed-client datamodel comparison | Reviewed; Prisma diff empty, no client regeneration |
| M | Existing three-suite outcome/cohort/reader contract lane | [65/65 PASS](p02-unit-1792353981196.results.json), no skips, exit 0 |
| D | New dedicated PostgreSQL reader suite | [18/18 PASS](retention-db-1792354347784.results.json), no skips, exit 0; [execution](retention-db-1792354347784.execution.json), [log](retention-db-1792354347784.log) |
| B | P02 internal service has no new UI/endpoint | NOT_RUN for P02; P06 browser evidence reported separately |
| P/C/E/O | Provider, customer, qualified expert, operational restore/load | NOT_RUN |

New source: [retention-outcomes.postgres.test.ts](../../../../services/analytics/__tests__/retention-outcomes.postgres.test.ts). It invokes the actual reader and production RBAC/module services with real persisted records. No query result is mocked. `next/headers` and Better Auth's session-subject return are stubbed; actual role/user/organization/module changes are queried from PostgreSQL. Cookie transport, complete session lifecycle and arbitrary role/site policy are outside this suite.

## Independent assertions

| Cases | What is verified |
|---|---|
| 1 | Two tenants, two sites in the authorized tenant plus a foreign site; finalized/claimed/duplicate rows and refund/void/failed corrections produce independently specified counts. Scalar output excludes seeded private payload/envelope/metadata and actor fields |
| 2–3 | Concurrent identical-key insert has exactly one winner and a real P2002 loser; changed hash cannot replace it. COMMITTED-to-COMPLETED remains one operation; conflicting durable observations are excluded |
| 4 | Inclusive start/exclusive end, recording cutoff, future recording and invalid durable timestamp handling |
| 5 | Foreign organization and foreign/missing location denied through real RBAC/location reads; persisted security audit exists |
| 6–8 | Removing either required permission is observed on the next read; managed module configuration with zero grants denies the report |
| 9–12 | Persisted inactive/locked user and inactive organization are denied. Absent/stale session subjects are rejected, with the session harness limitation explicit |
| 13–15 | Each real source cap accepts 1,000 rows and rejects 1,001; invalid/future/oversized windows fail; caller as-of/traffic overrides cannot fabricate human evidence |
| 16 | Real transaction reports repeatable read; separate connection commits an eligible correction between the two source queries. It is absent in the current snapshot and visible in the next read |
| 17 | A deliberately rolled-back persisted intent contributes no completed outcome |
| 18 | Terminate only the current reader transaction's backend; the report rejects rather than returning zero, and a subsequent read succeeds |

The sources were seeded to test reading, uniqueness and query semantics. This does not independently certify the POS financial producer or ledger atomicity. Source coverage remains SOURCE_ROWS_ONLY, not an attempted-operation denominator or historical time-travel store. The repeated-key test demonstrates the database constraint; the reader itself accepts no mutation payload to replay.

## Failed attempt retained

The [first database run](retention-db-1792354248182.results.json) had 17 passes and one failure in the test's termination probe. The PostgreSQL log reports `pg_terminate_backend(bigint)` has no matching function. The new test was corrected to cast its parameter to integer. Final acceptance still requires actual backend termination, reader rejection and recovery. No production code or assertion was relaxed, and the earlier failure is retained.

## Environment and reproduction

Target [identity](DATABASE_TARGET.json): PostgreSQL 17, localhost:64728, `stoquify_pos_audit_20261018_bb98aca78f`, new isolated cluster; no copied customer data. [Schema provenance](SCHEMA_PROVENANCE.json) records datamodel bootstrap, not migration-history/custom-trigger certification. The installed client's schema comparison is in [client-shape.log](client-shape.log).

Reviewed invocations: `node docs/retention/execution/P02-P06-verification-2026-10-18/checks.cjs p02-unit`; `node docs/retention/execution/P02-P06-verification-2026-10-18/retention-db.cjs`. The latter requires the explicit recorded target and test opt-in; it cannot use an inferred ambient target. The target is stopped at the end of this combined continuation; do not rerun against it without verifying ownership/startup and current source first.

## Acceptance update and remaining decisions

P02 A1 and A2 now have real persisted source/count/snapshot/isolation evidence alongside their existing mocks. A3 passes for the conservative UNKNOWN/exclusion contract; it does not establish trustworthy live human provenance. A4 now has a working bounded reader verified against PostgreSQL. D04 is satisfied for this execution target only. D12 historical role/provenance, trading calendar, completeness, activation producers and metric ownership remain external/design decisions; no collector, backfill, new analytics endpoint or later prompt was added.

Rollback is limited to the new test and task-owned evidence/notices. No business records, schema or production query behavior changed. Keep historical P02 and P12 packets as dated observations; later gate consumers must use this continuation with its explicit limits.
