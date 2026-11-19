# Hardened close: finding ownership and linked-record scope

10 November 2026. Status: **LOCAL SERVICE SCOPE QUALIFIED — PRODUCTION DEPLOYMENT BLOCKED**.

Two remaining CA-06 development gaps are fixed: finding assignment now checks the proposed owner's current contribution access, and comments validate every supplied record against one organization/run/period. Finding and review mutations also reject inconsistent parent scope. The earned mixed-payment monthly close passes again against these changes.

The [final evidence admission](FINAL_QUALIFICATION.json), SHA-256 `8dd3c7cdb85f9d1556bc52552fbf2f55aecff9ac543d18bcc982b6c99e3bc439`, binds the current source, unit/static/database results, exact migration history and retained private fixture bytes. No production access, deployment or live delivery was performed.

## Implemented behavior

- **Eligible owners:** usable local accounts need current Close read/comment permissions. Self-assignment remains supported. An owner needs neither an online session nor assignment/approval permission.
- **Delegated owners:** external preparers and reviewers additionally need a current named client mandate, active home/client organizations and modules, and valid managed engagement/assignment where applicable. Read-only, revoked, expired, scheduled, mismatched or unavailable authority denies. Current consent may cover historical client periods; no nonexistent period-grant field was invented.
- **Concurrent authority:** the proposed home organization is only an initial hint. Both organizations lock in sorted order before the existing assigner authority. Exact user/role/membership/module/grant facts are checked under locks and revalidated before mutation and return. A moved home hint fails closed. Existing Serializable retries, client-local assigner authority and retained evidence-request ownership remain intact.
- **Comment scope:** finding, evidence, review and explicit run IDs are all resolved. Every supplied reference must share one organization/run/period with an organization-owned accounting period. Conflicting explicit runs are rejected. The UI's existing finding-plus-run command and valid aligned multiple references remain accepted.
- **Parent scope:** finding/run/period and optional checklist bindings are checked. Evidence's optional finding/checklist parents are checked before commenting. Review creation requires an organization-owned parent period.

The source finding was inconsistent association creation through a valid command, not a demonstrated foreign-data disclosure. The change rejects corrupt stored references through these service owners; it does not install composite SQL constraints or clean historical data.

Product ownership is limited to [the existing close service](../../../../services/accounting/close-assurance.service.ts), [the new assignee authority helper](../../../../services/accounting/close-finding-assignee-authority.service.ts) and their two focused test files. [Implementation/preimage bindings](IMPLEMENTATION.json) and the [acceptance contract](ACCEPTANCE.md) retain the exact scope. Shared authority, schema, isolation policies and UI files were not changed by this packet. Unrelated working-tree edits were preserved; nothing was staged or committed.

## Verification

| Evidence class | Result | Practical boundary |
| --- | --- | --- |
| Workflow contract | Passed; 196 scripts remain unclassified | Repository workflow validation only; no application/database command is implied |
| Mocked service/action tests | [472 passed across five suites](unit-666e261b93/verification.json), zero failed/skipped/todo | Main close service, new eligibility helper, existing authority/recipient behavior and action adapters. Persistence/identity boundaries are mocked; selected source/configuration hashes match before/after |
| Whole-project compiler and focused lint | [Passed](static-477ad24318/verification.json) | No emit/incremental output; private schema-122 client types. Two changed service files: zero lint errors and warnings. All six bound inputs unchanged |
| Real PostgreSQL 17 | [21 passed](pg-attempt-0e69f2030b/pg-monthly-close-tests.summary.json), zero failed/skipped/todo | Thirteen ownership/scope cases plus eight earned monthly-close regression cases; fresh 122-migration replay twice, exact history verified |
| SQL inventory and teardown | [Unchanged](pg-attempt-0e69f2030b/pg-SQL_INVENTORY.json); owned cluster stopped | 142 triggers, 231 CHECKs and 76 functions before/after; injected objects removed. New absent database only; previous databases were not reset or dropped |
| Browser/rendered UI/build | Not run in this packet | Backend-only changes. Previous authenticated/rendered checks and the old artifact remain historical, with their original source bindings |

The [new database attempt](pg-attempt-0e69f2030b/pg-RESULT.json) uses an isolated synthetic database. Raw Jest/service output, fixture tokens and retained pack bytes remain in its private context. Public summaries contain phase/status/counts and reviewed metrics, rather than complete native or financial payloads. The final admission rechecks source, generated configuration/adapter inputs, private-result digests, catalog/SQL hashes, migration checksums and retained-byte pins.

## What the database checks establish

The [13-case ownership summary](pg-attempt-0e69f2030b/pg-ownership-service.summary.json) covers:

1. Eligible local/default owners without a recipient session.
2. Valid legacy delegated PREPARER/REVIEWER owners for historical periods.
3. Managed preparers/reviewers after actual engagement CREATE/ASSIGN/ENROLL/TRANSITION commands. Initial named consent and module/user/role facts remain synthetic configuration.
4. Missing, foreign, inactive, unverified, locked, insufficient-permission and foreign-role membership denial.
5. Read-only, expired, future, revoked, wrong-scope/wrong-user and managed-without-link mandate denial.
6. Suspended/ended/read-only managed assignments and lost module/home authority denial.
7. Six valid individual/aligned comment-target variants.
8. Foreign, missing and inconsistent secondary comment IDs, including a conflicting explicit run, denied without writes.
9. Corrupt finding/run/period/checklist/evidence parents rejected before mutation, audit or publication.
10. Valid owned-period review creation and corrupt parent-period denial.
11. Actual assignment blocked by a controlled persisted-role update; PostgreSQL blocker identity proves ordering, committed revocation wins, and no domain/audit/workflow effects remain.
12. Actual assignment UPDATE blocked on its finding while the delegated grant expires. The blocker does not change the finding. An observed UPDATE wait precedes expiry, then release leads to `FORBIDDEN` and complete rollback. This real-clock case took approximately 15.5 seconds.
13. An injected audit failure reaches its boundary exactly once, then rolls back assignment/audit/workflow publication. A nontransactional sequence proves the boundary was reached; owned trigger/function/sequence are removed afterwards.

Every negative compares exact ordered domain/audit/business-event/outbox/journal/posting-batch snapshots. The revocation and expiry cases prove their observed ordering, not every possible interleaving. They use persisted synthetic sessions and current database authority, rather than a new HTTP password-login journey.

## Monthly-close regression

The [eight-case current-source regression](pg-attempt-0e69f2030b/pg-monthly-close-service.summary.json) still earns an approved opening receivable, dated cash/mobile/bank collections, native receipt claims, independent full-period reconciliations, bank and balance-sheet approvals, internal T4 certification, retained recovery and an actual October seal. Contested receipt and claim-failure rollback checks also pass in a separate auxiliary client.

Primary counts remain four journals, three customer settlements, two native provider claims, two signed reconciliations, one approved bank-balance item, one internally certified export, one CLOSE and zero REOPEN. The primary October case has no new sale, stock activity, payroll or statutory certified document. Provider confirmation observations and initial mapping configuration remain synthetic external input facts; no upstream authenticity, legal approval or live provider processing is inferred.

The [previous mixed-payment/authenticated packet](../close-monthly-qualification-2026-11-10/RESULT.md) remains unchanged. Its old source binding is historical; the new database regression provides current service evidence. No application, browser, shared client generation, root build, delivery worker or schema promotion was run for this packet.

## Remaining release boundaries

CA-06's service-path ownership and association gaps are locally qualified. **Broader structural SQL integrity remains a separate review**: independent foreign keys still permit malformed parent combinations through direct SQL. Inventory legacy data and authorized writers before selecting composite constraints or a guarded migration. This packet does not claim that all seven core close tables are structurally hardened against direct reparenting.

Production also still requires the selected host/runtime and owned public HTTPS domain, a current platform-compatible artifact and protected promotion, hosted database/history and accepted recovery evidence, verified live customer-statement and accountant invitation delivery with private scheduled workers, original source custody/provider onboarding, and independent Cameroon/domain acceptance. Wider platform release gates remain separate.

Use the existing [deployment runbook](../../../release/HARDENED_CLOSE_PRODUCTION_DEPLOYMENT.md). Keep unresolved target facts explicit. Internal evidence grades and certified exports remain system-evidence labels; statutory authority is not established by these tests.
