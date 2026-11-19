# HR21 development11 — hiring denial/recovery and protected originals

Status: **VERIFIED_SCOPED**. Independent source and final evidence review: **PASS_SCOPED**, recorded in `INDEPENDENT-REVIEW.md`. Overall HR21 remains **IMPLEMENTED_PENDING_VERIFICATION**. Development environment only; no deployment or schema/statutory change.

## Delivered behavior

- Hiring read, write, review and postcommit-refresh authorization failures clear private records and drafts. Late review responses from a previous selection cannot clear the current employee.
- Unknown hiring outcomes freeze the exact submitted request. Password expiry during recovery preserves that request; verification never automatically submits it. The browser recovered one created employee after a dropped success response with the original request/key.
- Protected-original transport retains canonical errors and HTTP status. Upload, review, download and retention use existing password recovery. Actual authority/session loss clears private data. Late lists cannot restore cleared details and late downloads cannot trigger a file after invalidation.
- Confirmed upload, review and retention writes remain reported as saved if only the following status refresh fails.
- Existing dashboard theme restored readable document refresh controls and the hiring denied state; no new palette or global token change.

## Verification

| Evidence class | Current result | Scope |
|---|---|---|
| Original-source regression | 6 failures / 6 tests | Hiring read/write/postcommit privacy, uncertain-request lock, document freshness and denial |
| Mocked components/transports | 52 passed, 7 suites | EN/FR recovery, canonical errors, retained drafts, review callbacks, postcommit truth and deferred-response races |
| Real PostgreSQL | 15 document + 10 approval tests passed | Native locks/transactions, independent and stale reviews, exact recovery, scoped grants, quarantine, evidence/retention protections; synthetic actors and in-memory provider ports |
| Actual Next/Chromium/native authentication | 12 stages passed | Browser-authored hiring, lost response + expired assurance recovery, role revocation, protected-original upload/scan/review/download and grant denials |
| Rendered checks | 4 enabled controls across 3 states | Minimum measured text contrast 10.326:1; EN desktop, FR390px denial screen, no horizontal overflow, password focus, keyboard transition to upload title and keyboard refresh |
| TypeScript | 0 diagnostics | Five changed production roots and their transitive imports; no emit or incremental output |
| Startup controls | 2 passed | Wrong target and absent context refuse before creating a database client |
| Workflow / owned diff | Passed | Workflow contract and scoped whitespace checks |
| Provenance / cleanup | 78 source + 7 runtime hashes stable | Browser fixtures removed; Next, HTTPS simulation and PostgreSQL ports closed; temporary gateway private key removed |

Browser evidence uses actual server actions and document HTTP routes, Better Auth sessions and password verification. Session expiry, role revocation, a second linked employee and a stale document revision are declared synthetic test manipulations. An immutable **local HTTPS protocol simulation** supplies encrypted-object storage and controlled scanner outcomes. This proves workflow/protocol handling, not external provider operation or malware-detection efficacy.

Final native counts before cleanup: one browser-authored hire plus one synthetic other employee; one AVAILABLE and one REJECTED original. The uploaded bytes match independent-reviewer and linked-employee downloads. Scanner failure leaves the same record QUARANTINED, retry reaches review without duplicate records, uploader approval is refused, stale review is refused, dropped approval response recovers the same decision, copied/wrong-scope and expired grants are denied with the expected canonical codes.

## Failed attempts retained

- The first native test invocation could not reach the owned database through the restricted execution boundary; the same inspected tests passed with authorized local access. No application fix was inferred from that failure.
- Component attempt01 exposed an edit syntax error and an obsolete error-message expectation; both corrected. Attempt02 exposed tests waiting for the pending state rather than the completed uncertainty state; corrected. Attempt03 passed45 tests. Attempt04 passed50/51, with one pre-existing review case exceeding its5-second timeout during initial app compilation. The bounded lane now permits15seconds; final52/52 passed, including newly added regressions.
- Browser attempt01 stopped after2stages because its global alert selector matched shell announcements before the upload response; cleanup passed. Expectations and response selectors corrected.
- Browser attempt02 completed12functional stages but was rejected by the source-hash check after the theme correction and visual-check additions made during inspection. Its result is not qualification evidence. Attempt03 passed12/12 with stable source/runtime fingerprints and cleanup.

## Practical limits and rollback

No production provider, actual employee data, legal-policy approval, statutory payroll certification, deployment, full screen-reader audit or operator acceptance is claimed. Native document/approval tests remain separate from browser proof. Existing global shell layout outside the changed workspaces was not redesigned.

Production edits are limited to five HR client components; test cleanup additionally removes each test's exactly owned synthetic users. For rollback, compare the five originals in `original/` and revert only this slice's hunks, preserving other work. No migration rollback is needed. Test runtime and generated build files remain ignored.

Evidence: `browser-results.json`, `database-outcome.json`, `visual-contrast.json`, `component-final-theme.log`, `postgres-tests-attempt-02.log`, `review-postgres.log`, `types-final.log`, `startup-checks.json`, `shutdown.json`, `INDEPENDENT-REVIEW.md`, and sealed `evidence.json`.
