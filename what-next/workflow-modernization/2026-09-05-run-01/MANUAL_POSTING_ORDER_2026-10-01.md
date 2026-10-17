# Manual journal posting and Close evidence

Status: local corrections applied; full retained-evidence scope is incomplete and its proposed change requires explicit user approval after automatic approval-review rejection. Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. This is a dependency within the original workflows, not a newly split workflow or closure.

## Baseline and required outcome

Evidence date 2026-10-01. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Baseline has 267 tracked changed entries plus untracked work; unrelated edits are preserved. Register predecessor `cb9815b811492e645d8bfc3702c5e8ba90c2ca2e3143daa9f14b715fa8aaa8ae`: 270 workflows, 17 families, 191 unmapped entries; 264 Queued, two In progress and four historical Complete—verified. Discovery and historical closure revalidation remain incomplete.

Original requirement: a manual draft must post exactly once under current authority, retain its economic evidence and source links, invalidate every dependent Close assessment before it can establish current readiness, and recover through actual reassessment. Required proof includes duplicate/concurrent posting, both assessment/posting orders, fiscal-catalog creation, late transactional rollback, expired authority, tenant/object refusal, retained exports and current Cash/Close consequences. Class 3 posting must retain genuine inventory orphan blockers. Source-only tests do not close the complete finance workflow or its UI/accessibility/delivery criteria.

Exact predecessors are retained in `evidence/manual-posting-before-shared-2724304f-579f-4912-91d1-62c3aa1ee5c4/` and `evidence/manual-posting-before-service-5dfaf690-c1e5-4644-8dba-f53495eb4eb8/`. Existing graph node `accounting_posting_service_postjournalentry`, community 3, located the command; current source establishes the findings below.

## Delivered corrections

`postJournalEntry` now explicitly uses Read Committed. It acquires the shared fiscal-period catalog lock before a tenant-scoped journal row lock, then rereads the draft. A competing poster therefore observes the committed POSTED state and receives the existing only-draft refusal. Original FX/base-amount checks, balancing, account validation, period restrictions, source-owned journal refusal and batch identity controls remain effective.

The currently applied helper prepares posting-period/date-overlap scope, plus cumulative later periods for class 3, before allow audit and financial/source effects. The invalidator consumes exactly that sorted scope without a late date query expanding beyond it. Existing callers without a prepared scope retain their previous contract. This is a partial correction: it does not satisfy the full organization-wide retained hash dependency described below.

Sensitive-action time advances across waits. Denied sensitive actions retain denial evidence; successful admission does not write an allow audit before scope preparation. The journal action now preserves the actual verified assurance timestamp instead of replacing it with the request time. Its server-owned callback rereads fresh session evidence and permission after waits and rejects changed actor/tenant identity. Caller input cannot supply this callback. Permission-role changes are not serialized through commit; direct internal callers retain their asserted-control contract.

No economic line values, source journal contents, migration/schema, application layout, pricing or provider integration changed. The public route remains the existing authenticated journal experience at `/en/dashboard/accounting/journals` or `/fr/dashboard/accounting/journals`. No new browser/accessibility verification is claimed for this service/action milestone.

## Remaining scope and approval decision

[Independent scope review](MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md) traces the exact retained dependency: each Close period stores the tenant operating snapshot hash in payroll-forecast proof; that hash includes latest journal `updatedAt` and source-link `createdAt` without period or journal-status filtering. A manual posting can therefore obsolete an earlier period even when it has no class 3 line. Date/class-3 locking alone is insufficient.

The isolated [candidate helper](evidence/manual-posting-all-period-candidate.ts.txt) instead prepares all existing periods belonging to the posting organization under the catalog lock. It preserves required-period validation, sorted locks, transaction isolation and existing transactional lifetime. It neither locks another tenant nor changes the collector/hash contract. The tradeoff is broader same-organization contention; production period counts and capacity remain unverified. Reworking the retained hash contract would be a separate evidence-compatibility change, not a safe shortcut around the rejection.

Automatic approval review rejected both the original widening and one evidence-backed narrowed application, citing broad contention/availability risk and requiring explicit approval for this exact change. The candidate remains unapplied; its SHA-256 is `82f7be861b1c131340ba0773e0db3229c98eb6c095424ece1fe999a081cfe8ac`. Six isolated mocked contract checks passed in [candidate receipt](evidence/manual-posting-scope-candidate-a05e8323-fe5f-440f-b7f3-f584a69d6c95.json); these are not production capacity or database verification. The prepared application script was rejected before execution. No workaround or other agent applied the rejected scope.

Decision required from the user: approve or decline this exact local helper change, allowing each manual posting transaction to hold the existing locks for every existing period in its own organization until commit/rollback. Approval would allow implementation and isolated verification; it would not authorize deployment or establish production capacity.

## Verification

Current applied source passed 714 tests in 27 suites, zero failed/skipped: [receipt](evidence/manual-posting-jest-872e5e52-cf01-4f00-90d1-a13183572bd5.json). The full no-emit [TypeScript check](evidence/manual-posting-typecheck-635e30b3-609f-4238-be04-540b9d507190.json) and [eight-file lint](evidence/manual-posting-lint-2c88d9c3-0dbe-47ec-b02f-a57626162ea8.json) passed. `lanes/environment/verify-manual-posting.cjs` records exact commands and source bindings; it performs no migration/build/seed operation.

The actual owned PostgreSQL [runtime receipt](lanes/environment/manual-journal-posting-runtime-84405173-075a-4c7a-8f6f-d028e2675084.json) is **failed overall: seven passed, two failed**. The verifier retained the full all-period requirements. Source hashes were stable, observed outside-fixture records were unchanged and finalization/disconnection succeeded.

| Scenario | Result |
|---|---|
| Ordinary posting, Cash/Close recovery and earlier retained record | Failed: required earlier-period lock absent. Current-period exact posting, stale evidence, actual reassessment and system certification were observed; earlier Close and its export remained CERTIFIED with no staleState or invalidation event. Partial observations are retained, not a passed complete journey. |
| Backdated class 3, overlap/later/no-run periods and earlier record | Failed: earlier-period lock absent. Cumulative later/overlapping scope was acquired; the later record was invalidated, actual orphan/drift blockers remained, and system certification was refused. Earlier record/export remained CERTIFIED without stale markers. |
| Posting first versus assessment creation | Passed: actual PostgreSQL blocking relationship; assessment then reads committed posting. |
| Assessment creation first versus posting | Passed: posted source invalidates the newly published run; delayed collectors cannot restore READY. |
| Concurrent fiscal creation | Passed: posting waits on catalog, then includes the newly committed later period. |
| Concurrent and repeated same-draft posting | Passed: exactly one posting/batch/source link; loser and repeat receive only-draft refusal. |
| Late failure after source/audit/invalidation effects | Passed: complete transactional rollback and independent retry. |
| Authentication expiry during actual period-lock wait | Passed: no financial or Close effects; existing denial audit is allowed. |
| Missing and foreign-tenant draft | Passed: NOT_FOUND and no effects in either observed tenant. |

The run uses the same exact identity- and ownership-guarded loopback database as prior checks, `stoquify_local_registration_20260906_01`, and new synthetic organizations. No rejected candidate code was injected or executed. An independent read-only review of verifier SHA `91a7ddbfa4f0c7c0ce51835a661d410c39e190f0c591f6961346f7b2883b3556` found no blocking harness/API/ordering defect. The two scope failures remain genuine incomplete acceptance criteria; tests were not weakened to pass.

Recorded scenarios took 3.3–14.7 seconds including fixture/check work. This is local verification timing, not a user-route or production capacity budget. Controlled race clients allow 45 seconds to hold/release observed locks; that timeout is not a production performance claim.

## Operating and recovery guidance

If a post succeeds but the response is lost, inspect the journal and its retained batch/source link before resubmitting. A repeat post of the same committed journal receives the existing only-draft error; do not create a replacement journal merely to obtain another success message. A failed transaction rolls back its financial/source effects; after confirming the draft remains unposted and correcting the cause, retry that draft.

Authentication expiry requires fresh authentication and a new server-authorized attempt. Never reset the assurance timestamp or reuse an unverified approval claim. A stale Close record requires actual reassessment and resolution of its blockers. Retained export bytes remain historical records and must not be edited into current evidence.

This partial patch must not be released as complete Close-evidence coordination while its scope gap remains. No schema migration is required. Any rollback must use the scoped predecessor copies and account for unrelated edits; do not restore whole dirty files indiscriminately. No live customer, deployment, external delivery or X1 approval is authorized by these results.

## Review accountability and remaining boundaries

Architecture/backend/data review covers transaction ordering, current reads and retained source identity. Security/IAM review covers freshness, tenant/object refusal and post-wait permission/identity; it does not certify broader RBAC revocation or the existing missing automatic accounting-module admission at posting. Finance/ledger/inventory review covers exact lines and class 3 evidence. Audit/events and SRE review cover transactional invalidation/outbox records, rollback and contention; delivery and production capacity remain open. Product/quality/operations review preserves workflow counts and requires actual recovery evidence.

Frontend/EN-FR/accessibility are not applicable to these unchanged screens but remain original workflow closure requirements. Country/statutory rules, POS/offline, purchasing, HRIS, AI, analytics product changes, commercial packaging and external provider contracts are not applicable to this patch because their behavior is unchanged. No professional or release certification is claimed.

Draft creation also changes the unfiltered operating hash and has a separate incomplete invalidation boundary. Other producers, broad forecast freshness, interrupted delivery, user-facing recovery and full workflow discovery remain open. Earlier runtime bindings are historical after shared-source changes; current focused regression tests alone do not recertify all prior workflow claims.
