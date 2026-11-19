# P04-V02 — executed; readiness remains blocked

9 November 2026. Actual signed-session, full-application, native PostgreSQL and Chromium qualification is complete. Four confirmed findings require three bounded repairs. No product fixes were implemented. P04 and production remain blocked.

## Confirmed findings and repair order

| Repair | Evidence-backed behavior | Required outcome |
|---|---|---|
| P04-R06 | Revoked and expired signed-cache sessions still read private core-auth data and each remove one authentication account. Account deactivation also leaves cached core-session data readable. Nine failing groups; seven private-read cases and two account mutations. | Current server-owned session/account authority on protected core reads and account operations, with legitimate independent controls preserved. |
| P04-R08 | Both EN/FR actual inventory Refresh actions return new private item bytes after inventory grant suspension. RBAC remains valid; the page module gate does not guard getOrgItems → listActiveItemPayloads. | Enforce current inventory module access before the server action reads/returns private data. |
| P04-R07 | Six EN/FR Refresh completions after revocation, expiry or permission removal retain prior private inventory and display success. Three follow-ups confirm failed envelopes with no new private item bytes. | Recover safely after failed authoritative reads under lost authority, remove private display and false-success feedback, and retain authorized functionality. |

R06 and R08 may be scoped in parallel with explicit file ownership; prioritize R06, then R08. R07 qualification depends on both server contracts. [R06 proposal](../../P04-R06/proposal-20261109-r1/PROPOSAL.md), [R08 proposal](../../P04-R08/proposal-20261109-r1/PROPOSAL.md), [R07 proposal](../../P04-R07/proposal-20261109-r1/PROPOSAL.md). These packages remain unimplemented and require separate implementation authorization.

The auth findings do not establish session takeover or an upstream-wide vulnerability. Explicit disableCookieCache=true get-session, reviewed profile/application guards and tested caller-query negatives deny correctly. The six client-retention cases are distinct from the two module cases that returned new private bytes.

## Actual verification evidence

| Evidence class | Observed outcome |
|---|---|
| Source and isolated build | Build passed, including current client generation, types/static generation and lint (0 errors, 28 retained warnings). 121 migrations applied to the empty owned build database; fresh qualification databases were cloned and their checksums verified. Physical dependency copy is not a clean-install/reproducibility claim. |
| Original media/browser baseline | 22 groups: 21 raw passes, one audit-count expectation failure. Independent review confirms all six affected requests safely denied; four module audits are correct because two alias requests stop at tenant mismatch first. All 270 original-alias denial probes completed with zero original bytes forwarded; authorized positives use synthetic assets. EN/FR list/edit image consumers work. |
| Actual auth/browser suite | 116 groups: 93 raw passes, 23 raw failures. Review separates 9 product failures, 8 unexercised native visibility prerequisites, 4 optional historical-response inspection errors after saved settled recovery, and 2 safe-status expectation mismatches. |
| Local provider protocol | 23/23 passed against the actual wrapper: signed/unsigned/tampered callbacks, explicit local positives, ingress and method cases, and exact native effects. Hosted acceptance is false. |
| Supplement | 35 groups: 19 raw passes, 16 raw failures. 11 password/provider controls and 8 initial authorized Refresh controls pass; 6 client-retention cases and 2 module disclosures fail; 8 recovery failures came from a missing await in the harness. |
| Bounded follow-up | 11 records: 8 corrected authorized recoveries pass; 3 failures retain failed-envelope/private-DOM evidence. A legacy numeric error-code pattern did not match the named-code allowlist; exact canonical code capture is not claimed. No further replay is required for the bounded findings. |

There are **196 logical groups**, plus 11 recovery/corroboration replays: 207 raw execution records (164 raw passes, 43 raw failures). Independently reconciled logical outcomes are 171 qualified within their executed scope, 17 product-failure groups across four findings, and 8 native-visibility groups unexercised. This is not an all-tests pass ratio. The 16 families overlap; do not add family counts. See [coverage](inventory/COVERAGE-OUTCOME.md), [machine-readable classification](inventory/findings-classification-final.json) and [gate matrix](verification-matrix.json).

Source inspection, pure harness checks, native database evidence, actual HTTP, rendered-browser observations and hosted evidence remain separate. No mocked product-test pass is substituted for the real-session results.

## Candidate, failures retained and cleanup

Candidate: p04-v02-full-6577e9e63dc7. Artifact SHA-256: 9f6fa8cf7b5a6d87476d2c1bac3833b479ab2745f4ae5d12f50322b0f59d06d0. Evidence qualifies only this sealed test artifact. The final source union contains 107 critical inputs. Four concurrent accounting production-file changes were independently reconciled outside the executed branches; the whole current checkout and complete inventory import closure are not qualified. The original whole-checkout freshness failure is retained, with explicit frozen-scope successor receipts.

Attempt01's auth result was not emitted because a nonsecret language cookie was misclassified by the evidence scanner; no auth result is inferred from that missing report. Its snapshots/screenshots and failure remain. Attempt02 reran auth/provider on fresh r2. Supplement03 used fresh r3. Follow-up04 reused reviewed restored r3 fixtures with fresh sessions. All raw failed assertions and successor harness versions remain. No product change was used to make the tests pass.

All three full test databases have zero sessions. Cleanup preserved their exact business/audit digests. The owned application/provider/browser services and PostgreSQL cluster are stopped, ports released, and fixtures/databases retained. [All-session receipt](database/all-session-cleanup-verified.json), [database stop](database/cleanup-r3.json), [final source/artifact integrity](final-integrity-frozen-supplement03.json), [independent result review](independent-review/FINAL-INDEPENDENT-REVIEW.md).

## Decision, limitations and next action

P04-D01 option C is approved by **Kouatchoua Mark** for product/accounting and security across all 14 finance report classes, with no exceptions stated. [Decision](../../P04-D01/decision-20261109-r1/RESULT.md). P04-R05 remains the unimplemented creator/delegate inspection-grant repair; byte delivery still requires P27/provider/retention evidence. Global release decision D01 is separate and unchanged.

Genuine hidden-tab focus transitions and private BFCache hits were not exercised. Tested history/reload outcomes do not establish those behaviors. Other private consumers, original-owner media census, hosted OAuth/provider/storage/CDN, clean-install reproducibility, operator acceptance and the remaining P04-V01/V03/V04/V05 work remain open. The updated verify-password HTTP inventory is supported by actual positive/negative tests; current auth HTTP candidates total 30. All 57 historical domains, 14 global decisions, 18 production gates and deferred commitments remain preserved.

**Exact first action:** refresh P04-R06's current auth catch-all/configuration/middleware/guard hashes and operation-to-current-authority map against these findings, then review one bounded repair and isolated verification recipe. Advancement requires actual invalid-session/account-state denials with no private fields or unauthorized account changes, authorized positive controls, a refreshed build and independent review. After R06/R08/R07, repeat affected V02 gates; parent P04 also requires R05 and its other remaining qualifications.

No commit, push, production flags/data changes or deployment.
