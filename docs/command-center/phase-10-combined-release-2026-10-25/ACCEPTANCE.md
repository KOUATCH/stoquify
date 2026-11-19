# Combined-workspace acceptance — Phase 10

This run verifies the latest captured combination of Command Center, authentication, public-page and Firm Practice changes. The 7,719-file manifest includes the initial 17-file refresh, the subsequent 37-file refresh and the final six public/registration edits. Seven owned source corrections and one reviewed command-registry fingerprint are recorded in source-changes.json. Historical evidence retains its original scope.

## Evidence boundaries

| Evidence class | Final result | Meaning and limit |
|---|---|---|
| Source inspection | Completed | Reviewed migrations, selected combined changes, runners, side effects and disposable-target guards. Not a full application security audit. |
| Mocked/pure/component/framework | 744 passed, zero skipped | 602 Command Center, 36 authentication/contracts, 76 concurrent public/auth/recovery and 30 middleware/routing tests. Suites are disjoint; focused repeat runs are not counted twice. |
| Real PostgreSQL | 64 passed, zero skipped | Full migration databases; assignment, evidence identity, replay, concurrency, rollback, scope and immutable history. |
| Fresh migration replay | Passed | 120 exact identities/hashes applied; repeat deploy has no pending migrations. No historical SQL edited. |
| Populated upgrade | Five checks passed | Synthetic 118-to-120 upgrade retains history; promotion-lock exclusion/release and old/new client behavior verified. Does not certify every populated domain transition. |
| Schema parity | Passed with declared residual differences | Zero unexpected statements; 240 retained/metadata statements. Comparison was not applied to remove database controls. |
| Catalog/history/readiness | Passed | All 118 prior catalog entries preserved; local readiness 10/10, history 9/9. Thirteen historical catalog risks remain visible, not newly approved. |
| Workflow registry | Passed | One changed recovery-test fingerprint reviewed and reconciled; 196 other scripts remain unclassified. |
| Lint | Passed | Earlier full scope: 3,142 files, zero errors, 24 warnings. Final changed scope: 32 files, zero errors/warnings. |
| Final build | Passed | Normal type/lint checks and process guards; 4,253 captured source fingerprints unchanged. No trusted release artifact claimed. |
| Live account policy | Passed | Four account states, actual throttled denial without session creation, bounded retry. Real HTTP and database; no auth controls bypassed. |
| Date regression diagnostic | Passed | Original date input remains connected; entered date equals real action payload and stored UTC value after protected reads. |
| Authenticated rendered acceptance | 40 checks, 24 audits, zero reported violations | EN/FR, three centers/modes and restricted location, keyboard/focus, 320/390/768/1440 reflow. Automated incomplete rules retained for manual review. |
| Native source/persistence journey | 14 checks passed | Assignment/deadlines, evidence-bound review, native receiving, all centers in EN/FR, new session, foreign scope/reset and revoked-session denial. |
| Integration rollback | Five checks passed | Three original dashboards remain available with the integration disabled; 28 rows in six coordination tables unchanged byte-for-byte. |
| Latest public pages | 18 checks passed | EN/FR policy-status and registration render/reflow; no form submission or external navigation. Policy publication remains pending. |
| Human/representative acceptance | Open | Screen-reader announcements, native 200%/400% zoom, productivity baseline/comparison and realistic-load capacity need separate evidence. |
| Production release | Not approved | Disposable production-policy diagnostic remains 18/21: HTTP and intentionally disabled live delivery. No clean locked-install/trusted artifact or production-target certification. |

The test total is **808**, with mocked/pure evidence, real PostgreSQL, browser and human acceptance kept separate. The final preservation and shutdown results are in [preservation.json](preservation.json), [target-evidence.json](target-evidence.json) and the asserted [summary](SUMMARY.json).

## Criterion mapping

- **CC-05.1–05.10; CC-06.1–06.6; CC-07.2–07.3:** real database suites cover registered adapters, occurrence/review identity, current authority, replay and transactions. Immutable payroll deletion is correctly denied and its forecast retained ACTIVE. Legitimate deletion/cancellation UNKNOWN cases remain covered. Native browser evidence adds exact saved dates, stable newest-episode identity, source-confirmed clearance, retained history, stale review and new-session persistence.
- **CC-06.7–06.8:** in-app notice tests cover recipient authority, deduplication, preferences and retry. Browser screenshots show visit-delivered notices. No external/background delivery or production notification-volume certification; no real recipient contacted.
- **CC-04.2/04.3/04.5/04.6; CC-07.6:** final compiled EN/FR mode, keyboard, focus, reflow, restricted-location and automated accessibility matrix passes. Screenshots confirm readable state and limitations. Legacy French-copy/technical-identifier polish, incomplete audit rules and manual accessibility remain documented.
- **CC-07.1:** bounded real end-to-end journey passes. A zero-value synthetic order goes through the existing receiving review/confirm command, creating exactly one receipt and stock movement. All three centers observe clearance, with persistent owner/date and invalidated review. No direct completion update or financial-command retry. This does not certify every financial source command or proof-family success.
- **CC-07.4:** fresh replay, exact catalog/history, schema parity and populated upgrade pass in the disposable environment. Trusted artifact, target attestation, policy and deployment controls remain open.
- **CC-07.5:** local flag-disable rollback passes: original dashboards work and all recorded coordination/history rows are retained exactly. Production rollback is not executed.

Final main-center acceptance has 29 checks and restricted-location acceptance has 11. The final main run follows source clearance, so two optional active-queue disclosure checks from the earlier 31-check run are absent; earlier active-state evidence is retained separately. Proof-drawer checks verify focus containment/closure/return during real protected requests, including denial, not successful financial proof access for every family.

Use the [human acceptance procedures](../phase-9-parity-acceptance-2026-10-25/HUMAN_ACCEPTANCE.md) for the remaining manual work. Automated scans and synthetic journeys do not close these gates. The public policy-status pages also require approved content before public launch; this verification does not approve that content.

## Ownership and preservation

Owned changes comprise the migration catalog, one PostgreSQL fixture expectation, two existing focus-recovery components and their regressions, the conditional language-cookie write and its routing regressions, plus the inspected command-registry fingerprint. Existing unrelated workspace edits were preserved. No migration SQL, dependency version or shared generated client was changed by this phase. No deployment, staging or commit occurred.

The final scan compares captured source/assets and newly discovered paths without restoring anything. Reports are excluded from source equality, while the final report generator separately checks every owned file hash, including the registry. Synthetic data, private dependencies and source copies remain in the ignored owned directory for traceability; the owned application and PostgreSQL cluster are stopped. Production was not accessed.
