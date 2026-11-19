# Command Center combined-workspace verification — Phase 10

**Local verification passed for the latest captured combined workspace.** The candidate contains 7,719 files and matches the final shared-source scan. Production was not accessed or changed. Production release remains unapproved pending the separate gates below.

## Results

| Evidence | Result | Detail |
|---|---|---|
| Command Center mocked/pure/component | 602 passed | [Results](unit-results.json), including six new focus regressions |
| Authentication and Firm Practice contracts | 36 passed | [Results](security-unit-results.json) |
| Latest public/auth/recovery changes | 76 passed | [Results](concurrent-unit-results.json) |
| Middleware and routing | 30 passed | [Results](middleware-unit-results.json); unchanged-cookie, locale switch, CSP, private transport and rate limits |
| Real PostgreSQL | 64 passed, zero skips | [Results](postgres-results.json); persistence, concurrency, denial and rollback |
| Full compiled build | Passed | Normal type/lint checks and process guards; 4253 source fingerprints stable; [result](compiler-final-result.json) |
| Migration replay/history | 120 migrations; 9/9 history checks | Exact names and hashes; repeat deploy has no pending migrations; [history](history.md) |
| Populated upgrade | Five checks passed | Synthetic 118-to-120 upgrade, retained history, promotion lock and old/new client behavior; [evidence](upgrade-results.json) |
| Schema parity | Zero unexpected differences | 240 declared retained/metadata statements; [report](schema-parity.md) |
| Catalog and local migration readiness | Ready; 10/10 | [Catalog review](CATALOG_REVIEW.md), [readiness](migration-readiness.md); 13 historical catalog risks remain visible |
| Workflow registry | Passed | One inspected recovery-test fingerprint reconciled; 196 scripts remain unclassified; [review](workflow-registry-review.json) |
| Lint | Zero errors | Full earlier scope: 3,142 files, 24 warnings; final changed scope: 32 files, zero errors/warnings; final build lint enabled |
| Authenticated Command Center browser | 40 checks; 24 audits, zero violations | EN/FR, three centers/modes, restricted location, keyboard/focus and 320/390/768/1440 reflow; [main](acceptance-browser.json), [location](location-acceptance-browser.json) |
| Native source and persistence journey | 14 checks passed | Exact saved UTC dates, assignment, Owner review, normal receiving, all three centers, new session, foreign scope and revocation; [results](authenticated-results.json) |
| Integration disablement | 5 checks passed | Original dashboards available; 28 coordination/history rows retained byte-for-byte; [results](rollback-results.json) |
| Latest public pages | 18 checks passed | EN/FR policy-status pages and registration render/reflow; no form submission or external navigation; [results](latest-public-browser.json) |
| Live account policy | Four states plus rate-limit denial/retry passed | Inactive/permanent/temporary lock rejected; expired lock admits one real session; [results](auth-live-results.json) |
| Preservation and shutdown | Passed | No source drift or migration edits; private schema matches and shared client unchanged; owned application/cluster stopped; [preservation](preservation.json), [target](target-evidence.json) |

The test total is **808: 744 mocked/pure/component tests and 64 real PostgreSQL tests**. Repeated runs and the focused regression suite are not counted twice. Browser checks and human acceptance are separate evidence classes.

## Corrections made during verification

1. Reconciled the migration manifest from 118 to 120 after reviewing and replaying the two existing Firm Practice migrations. Prior entries, raw SQL and historical exceptions were preserved.
2. Corrected a PostgreSQL fixture that attempted to delete immutable payroll evidence. It now expects denial and a retained ACTIVE forecast; legitimate deletion/cancellation UNKNOWN cases remain covered.
3. Fixed keyboard mode focus across protected snapshot replacement. The existing controls now expose a stable semantic mode; recovery restores only its unique permitted replacement after hydration. Missing/ambiguous controls fall back safely, and focus is not stolen after the user moves it elsewhere. Private descendants are still unmounted. Five regression cases fail against the original implementations; all six new cases pass after the correction.

4. Prevented redundant language-cookie writes on requests where the language already matches. The installed framework treated those writes as revalidation, repeatedly replacing protected forms during reads. Missing and changed language preferences still persist; access checks and private-content replacement remain unchanged. Four regression cases fail before the fix; all thirty middleware/routing checks pass afterward.

[Owned hashes](source-changes.json) identify the seven source files changed by this phase. A separate command-registry update reconciles the inspected password-recovery test fingerprint; its mocked effects and unchanged setup were reviewed before updating it. The remaining implementation was existing workspace work. Verification runners and reports are recorded separately. No migration SQL, dependency versions, shared generated client, deployment, staging or commit was changed by this phase.

## Latest workspace capture

The initial capture was refreshed with 17 files, then 37 files, then the final six reviewed public/registration edits. The last set adds policy-publication status routes, matching public shell tests and registration navigation wrapping; it changes no Command Center authorization, database schema or source transaction. See [source manifest](source-baseline.json), [final six-file review](latest-public-review.json) and [capture](latest-public-sync.json).

The final preservation scan reports zero changed/missing candidate files, zero uncaptured shared-source changes, zero new source paths and unchanged SQL/client fingerprints. Evidence describes this source capture; it is not a guarantee about future edits.

## Browser and workflow qualifications

The final native run verifies both deadlines against actual PostgreSQL values before receiving a synthetic zero-value purchase order through the normal review/confirm UI. One receipt and its stock movement are verified for that order; no direct completion update is used. Source clearance, stable occurrence identity and stale Owner review are checked across all centers in both languages. The earlier completed test receipt remains intact.

Earlier browser attempts exposed stale-element observations, a filter-list transition race and the application's request limiter. The final tests read current controls atomically, wait for connected and enabled follow-up rows, pace navigation and honor bounded Retry-After responses. They do not disable limits, forge identities, retry financial commands automatically or substitute mocked actions. These functional runs do not certify capacity. The separate [date diagnostic](date-diagnostic.json) confirms that the entered date remains in the original connected input, appears unchanged in the real action payload and reaches PostgreSQL.

The first native attempt is explicitly retained as incomplete: receiving succeeded, but a screenshot raced a replaced panel and a weak assertion missed one unsaved deadline. The corrected final run uses a fresh synthetic case and explicit per-source database/date checks. See [execution notes](EXECUTION_NOTES.md) for all failures and superseded evidence.

The proof-drawer checks cover keyboard containment/closure/focus return during real protected requests, including permission denial. They do not certify successful access to every financial proof family. Automated audits retain incomplete-rule findings for manual review. [Visual inspection](VISUAL_REVIEW.md) records readable layouts plus remaining legacy French-copy/technical-identifier polish observations.

## Remaining release gates

- Human screen-reader announcements and native 200%/400% zoom acceptance.
- Representative-user productivity measurements and realistic-load capacity.
- A clean locked-install, trusted release artifact and verified production target/deployment controls.
- Production-policy requirements for HTTPS and live statement/invitation delivery. The disposable diagnostic remains 18/21; live providers were deliberately not enabled.
- Approved content for the publication-pending public policy routes before public launch. The smoke checks verify their status and indexing controls, not policy approval.

Use the [acceptance mapping](ACCEPTANCE.md) and [human procedures](../phase-9-parity-acceptance-2026-10-25/HUMAN_ACCEPTANCE.md). Automated local evidence does not close these gates or authorize production promotion.

## Retention and rollback

Synthetic credentials, source copies and databases remain in the ignored owned directory for traceability; the application and cluster are stopped. No real recipients were contacted. To reverse an owned source correction, review its before/after hashes and reverse only its specific hunks. Do not restore whole shared files or alter unrelated work. Disabling the integration was separately verified to preserve stored history and keep the original dashboards available.
