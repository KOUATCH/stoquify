# P04-R06 qualification continuation — blocked

10 November 2026. Memory capacity and the isolated full build passed. The current-session repair now has actual real-session and database evidence for all nine inherited V02 authentication failures. R06 cannot advance: rejected cross-site requests change login-failure bookkeeping, and four browser cases retain unresolved request-lifecycle evidence. Parent P04, P04-V02 and production remain blocked.

This continuation made no product changes. It executed the previously implemented repair in isolation and added bounded verification observers and evidence. No commit, push, production flag/data migration or deployment occurred. Unrelated working-tree changes remain preserved.

## Candidate and isolation

- Candidate: `p04-r06-full-4661f767924e`.
- Sealed artifact SHA256: `4cc40546c6caebe2df6b35ff7b1c01f756387199b4530a9a4014bc5f7f70de73`.
- Build ID: `0Bfm5_McCY4nZ4HMhHTEN`; 5,305 runtime files.
- Owned local storage: `D:/p04-r06-fullapp-20261109-r1`.
- Two retained local databases, 122 migration-ledger entries, synthetic actors and organizations only. No production database was used.
- [Final integrity](final-integrity-attempt02.json) confirms 9,788 captured source files, 63 critical inputs, artifacts/runtime copies, canonical private client and unchanged HEAD. The sealed artifact qualifies the recorded inputs; this is not clean-install reproducibility, hosted acceptance or general production readiness.

## Outcomes by evidence class

| Evidence class | Actual outcome | Primary evidence |
| --- | --- | --- |
| Host capacity | Passed: approximately 10.67 GiB free physical memory, 16.53 GiB free commit and 22.04 GiB free build-drive space | [Resource receipt](resource-retry-ready-20261110-r3.json) |
| Current source and authority | 63 selected inputs and 48-file repair subset reviewed; the current four owned product/regression inputs retain their admitted hashes | [Source admission](independent-review/REPAIR-SOURCE-ADMISSION-v3.json), [source manifest](inventory/source-after-manifest-v4.json) |
| Mocked tests | 87 passed, four suites, zero failures/skips; persistence mocked | [Jest result](unit/attempt03/jest.json), [independent review](independent-review/UNIT-OUTCOME-REVIEW-v3.json) |
| Full application build | Passed compilation, type validation, normal lint and 11-page generation; zero lint errors, 29 warnings; no check disabled | [Build result](build-result-attempt02.json), [independent build review](independent-review/BUILD-OUTCOME-REVIEW-attempt02.json) |
| Original actual runtime | 58 logical groups: 53 passed, five failed. The original failed result is unchanged | [Runtime result](runtime-result-attempt02.json), [original matrix](verification-matrix-attempt02.json) |
| Genuine current-session denials | Nine inherited V02 auth failures have passing successor evidence; 42 signed-cache wire proofs were reviewed. No private actor/account/session fields or unauthorized protected-account effects in those admitted denial cases | [Observed runtime review](independent-review/OBSERVED-RUNTIME-REVIEW-attempt02.json), [expiry review](independent-review/EXPIRY-SUPPLEMENT-OUTCOME-REVIEW-attempt02-v2.json) |
| Retained expired rows | Three additional probes passed for list-sessions, list-accounts and unlink-account, each proving the expired row still existed before its request. Expected deletion of that exact expired session is separately recorded | [Expiry supplement](expiry-supplement-result-attempt02.json) |
| Credential recovery | All four actual scenarios passed: successful sign-in, wrong password, inactive account and future lock. Explicit UTC/raw values fall within persisted request bounds | [Recovery result](recovery-result-attempt03.json), [independent recovery review](independent-review/RECOVERY-OUTCOME-REVIEW-attempt03.json) |
| Origin rejection | Cookie-bearing mutation denial passed. Two real cross-site browser requests returned 403 without private authority bytes, authority cookies or new sessions, but each changed account failure bookkeeping | [Independent defect review](independent-review/ORIGIN-DENIAL-INDEPENDENT-REVIEW-attempt03.json) |
| Latest rendered/browser checks | Six cases ran: both revoked reloads passed; four authorized/restored cases failed the strict completion gate on eight exact Chromium-confirmed cancellations. All six visible states matched expectations and all six native before/after pairs were unchanged | [Browser-only result](browser-only-result-attempt04.json), [independent browser review](independent-review/BROWSER-ONLY-OUTCOME-REVIEW-attempt04.json), [visual-description correction](independent-review/BROWSER-VISUAL-REVIEW-CORRECTION-attempt04.json) |
| Cleanup and preservation | 18 remaining synthetic sessions removed; business/audit digests unchanged by cleanup. Owned cluster stopped, PID absent and all five ports released on both localhost names | [Session cleanup](database/final-session-cleanup-attempt02.json), [cluster cleanup](database/cleanup-attempt02.json), [final recovery integrity](final-integrity-recovery-attempt04-v3.json) |

The [successor reconciliation](recovery-reconciliation-attempt04-v2.json) accounts for all 58 original logical requirements: 50 unaffected main-run groups, one credential requirement supported by four recovery cases, one unresolved origin requirement, and all six latest browser cases. It records 53 currently satisfied requirements and five unresolved requirements. This is a mapping across named observations, not a new 58-case passing run. Three retained-expiry probes are additional. Earlier browser passes are not selected in place of newer strict failures.

## Confirmed repair blocker

Both real cross-site browser probes were rejected with 403, yet the supplied synthetic user's `failedLoginAttempts` changed 0→1→2. Each request also changed `lastFailedLogin` and `updatedAt`, and added one `LOGIN_FAILED` event. Other users, authentication accounts and session rows remained unchanged. The credential after-hook treats any non-successful result as a failed password attempt, including rejection before admitted credential verification.

Independent comparison found the same hook and helper in the captured before-repair source. This is a pre-existing defect discovered during R06 qualification; it still fails the no-unauthorized-write gate. The probes supplied valid synthetic credentials. Password-independent impact follows from the inspected call order; an incorrect/unknown-password reproduction, repeated-request lock threshold and expired-lock transition were not tested and remain explicit future cases.

The [bounded repair handoff](REPAIR-HANDOFF-attempt02-v2.md) defines the smallest correction, positive/negative tests and recovery controls. A product edit requires a newly captured candidate and rebuilt artifact before renewed qualification.

## Browser qualification blocker

Four authorized/restored views rendered the expected profile and had a completed current-subject session response. Eight additional RSC responses—four locale-prefetch GETs and four current-profile POSTs—were matched by exact response ID to Chromium request IDs and ended with `loadingFailed`, `net::ERR_ABORTED`, `canceled:true`. Complete original server bytes and downstream completion do not prove application consumption or an intentionally successful cancellation lifecycle.

The locale GETs match the language-link prefetch path. The POSTs are consistent with the profile read action, but the exact action identifier and initiating/termination lifecycle were not retained. Rendered account fields and checked timestamps show a read result was consumed; they do not bind that result to each cancelled POST. No UI regression is inferred solely from these cancellations, and none is silently counted as a completed request.

Follow the [browser lifecycle handoff](browser/BROWSER-LIFECYCLE-HANDOFF-attempt04-v2.md) to bind actual action identity, consumer result and cancellation cause. Any changed acceptance contract must be explicit and independently reviewed; attempts 02–04 remain immutable.

## Evidence corrections and limits

- The first full build's memory failure and the E28 blocked checkpoint remain intact. The successful build and all later observations use successor files.
- The diagnostic proved that the local timestamp reader shifted values by one hour. The original raw value/request bounds were not retained, so that exact historical assertion cannot be reconstructed: it remains failed, and four new scenarios with explicit UTC interpretation supply the accepted evidence.
- The original cookie-free API client supplied valid credentials without browser Fetch Metadata. Its successful sign-in is not a demonstrated authentication bypass or an inferred new business-approval gate. Its original failed expectation remains recorded separately from the actual browser findings.
- The CORS observer called the browser response status as a function; its generic TypeError cannot independently prove body unreadability. Exact origin/header provenance, original 403 bytes, absence of private authority fields, database deltas and the separate form-navigation probe still establish the bookkeeping defect. See the [independent caveat](independent-review/RECOVERY-CORS-OBSERVER-CAVEAT-attempt03.json).
- Failed browser body captures and the attempt03 null-body observation race remain preserved. Attempt04 corrected the observer race and established actual cancellation; it did not waive the strict gate.
- The first reconciliation summary collided a numeric count with a boolean outcome. Its original receipt is preserved; version 2 separates `passed: 53` from `qualificationPassed: false`, without changing any raw test result.
- Source inspection, mocked tests, native database effects, rendered states and browser transport evidence remain distinct. Reused dependencies do not establish a fresh-install build. Hosted providers, production infrastructure, operator acceptance and whole-system release gates were not qualified here.

## Advancement and exact next action

The [local gate matrix](advancement-gates-attempt02.json) remains blocked. The [final independent outcome review](independent-review/FINAL-OUTCOME-REVIEW-attempt02.json) records the accepted evidence and blocked qualification; it is not a release approval.

**First action:** refresh the credential-hook/outcome-helper/route/trusted-origin/SDK call-chain hashes and establish origin admission before every account mutation. Then apply the bounded bookkeeping correction, prepare the request-to-consumer browser observation, rebuild after product changes, rerun affected isolated gates and obtain independent review. Both the no-unauthorized-write and browser-consumer gates must be satisfied before advancing R06.

R06 remains the next eligible package. R08 → R07 remains the recommended order after R06 qualification; R05 creator/delegate implementation is separate. R05/R07/R08 remain unauthorized here. Historical V02 counts remain 196 groups (171 scoped qualified, 17 product-failure, eight unexercised), plus 11 separate replay records. P04-D01 option C remains approved by Kouatchoua Mark; global decisions are unchanged. All 59 packages, 57 domains, dependencies and deferred commitments remain preserved.
