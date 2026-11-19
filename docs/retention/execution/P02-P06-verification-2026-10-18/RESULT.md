# P02 database closure and P06 authenticated refresh

18 October 2026. **PASS for both requested bounded verification objectives.** P02's missing PostgreSQL reader evidence is now present. P06's authenticated recovery, current-browser queue visibility and local/server shift-close checks pass against the current inspected source. No production implementation fix was needed. This does not pass the historical P12 checkpoint, authorize a pilot, establish customer retention or enable offline sales.

## Verification performed

| Evidence class | Current result | Evidence |
|---|---|---|
| Source inspection | Current reader, authority, queue, action, schema and execution helpers reviewed; installed Prisma datamodel diff empty | [Review](SOURCE_AND_COMMAND_REVIEW.md), [baseline](BASELINE.json), [summary and source hashes](EVIDENCE_SUMMARY.json) |
| Workflow control | PASS, exit 0; 196 unclassified package scripts reported, not executed | [Log](WORKFLOW.log), [execution](WORKFLOW.json) |
| Mocked tests — P02 | 65/65 PASS, three suites, no skips | [Results](p02-unit-1792353981196.results.json) |
| Real PostgreSQL — P02 | 18/18 PASS, no skips | [Database verification](P02_DATABASE_VERIFICATION.md), [results](retention-db-1792354347784.results.json) |
| Real PostgreSQL — P06 setup | One synthetic authenticated operator fixture created successfully; setup is not economic replay coverage | [Fixture results](browser-fixture.results.json) |
| Authenticated application browser — P06 | Seven-step journey PASS; separate server-close denial PASS; two-step French failed-read/offline check PASS and repeated with offline styling assertion | [Operator](browser-1792354378317.json), [server close](server-close-1792354740792.json), [first read-state run](read-states-1792354719659.json), [controlled repeat](read-states-1792354860401.json), [interpretation](P06_OPERATOR_REFRESH.md) |
| Provider/customer/expert/operational evidence | NOT_RUN | No provider calls, customer pilot, qualified country review, production restore/load or field-device proof |

The initial P02 DB run was 17/18: the test's backend-termination probe used a bigint argument for a PostgreSQL function requiring integer. Its parameter cast was corrected; final evidence requires actual termination, error propagation and subsequent recovery. [Initial failure](retention-db-1792354248182.results.json) is retained. No application assertion or production rule was relaxed.

## What changed

- Added [the focused real PostgreSQL reader test](../../../../services/analytics/__tests__/retention-outcomes.postgres.test.ts), with an isolated configuration and target-explicit runners in this packet.
- Saved current source/command review, exact executions, browser evidence, screenshots, schema provenance and cleanup proof in this directory.
- Added dated continuation notices in P02/P06 and refreshed only their rows in the execution register. Historical records and the P12 decision remain unchanged.

No production source, repository schema, package/dependency, financial behavior, media control or replay policy changed. No later prompt was executed in this continuation. No staging, commit, build, migration promotion, broad test suite, install or graph regeneration occurred. Existing August graph nodes are discovery references only; current source and runtime assertions control the conclusions.

## Boundaries that remain

P02 uses real Prisma, persisted RBAC/module decisions and real transactions; only the session-subject/headers seam is stubbed. It verifies a reader over synthetic source rows, not Better Auth session transport or the financial producer. Human provenance remains UNKNOWN; D12 cohort ownership, calendar, attribution and completeness decisions are unresolved. The new database evidence closes D04 for this disposable target only.

P06 uses actual credential sign-in, server actions, persisted ingestion and Chromium IndexedDB. Lost acknowledgement, reconnect/reload, keyboard retry and expired/revoked authority retain the original evidence without financial effects. Ingestion acknowledgement is not a completed sale. Production capture/economic replay remains disabled; fixture signatures do not certify browser key enrollment. Local-only visibility is not a cross-device, pre-upload period-close barrier.

**Visual qualification remains limited:** the first uncertain-state screenshot was unstyled. The later controlled French check retained measured colors/layout through an actual offline transition. Both observations are retained; the cause of the first capture is not isolated, so this packet does not certify general offline visual stability or cold offline startup.

## Environment, preservation and cleanup

Starting HEAD: `6ee84a90c760d2864f6aef672d8b393ac2b65971`. The initial checkout already contained 28 modified tracked paths and 313 untracked paths. The [baseline](BASELINE.json) fingerprints 673 selected files; the [final validation](VALIDATION.json) distinguishes scoped edits from concurrent landing-page changes. This is not a clean release candidate or a byte-for-byte audit of every untracked file.

Database: newly initialized PostgreSQL 17 on localhost:64728, `stoquify_pos_audit_20261018_bb98aca78f`, synthetic data only. [Target](DATABASE_TARGET.json) and [schema provenance](SCHEMA_PROVENANCE.json) bind the evidence to datamodel bootstrap, not migration-history/custom-trigger certification. Next 15.5.27 ran on 127.0.0.1:3192 with isolated output and explicit database authority; Chromium 149.0.7827.55 exercised desktop EN and mobile FR.

The owned Next session was interrupted after checks; its shell exit 1 is the deliberate stop, not a failed browser check. PostgreSQL stop exited 0. Both ports subsequently returned ECONNREFUSED: [cleanup](CLEANUP.json). The stopped disposable cluster and isolated output are retained; no unrelated data/process was removed. [Manifest](MANIFEST.json) records the delivered files. Reproduction requires reviewing the recorded targets and runners before explicitly starting any stopped environment; do not substitute an ambient database URL.

Rollback scope is the new test, this packet and the dated P02/P06 document additions/row updates. There is no production implementation to roll back. Future gate review must consume this dated evidence and its limitations; it must not silently rewrite the historical P12 decision.
