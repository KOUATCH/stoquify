# Reconciliation signature notification lease review — 2026-10-01

Independent source and evidence review of the reproduced baseline and its completed correction. No product edits, DB operations or verifier reruns were performed by this reviewer. The coordinator owns workflow-status publication; this review is not release approval.

## Evidence and finding

The [baseline receipt](lanes/environment/sign-lease-reclaim-baseline-2586c14a-b971-42c4-b25f-a7d07c49c77b.json), SHA-256 `002a03e213efd84510ac4975c2b66e59914a7ceee1b85d7d6731ef7645c4d257`, records two complete reproductions using actual signed reconciliation fixtures, the actual notification worker and actual outbox claim service. All 92 recorded source bindings agree before/after and matched files when the baseline was reviewed, before this correction. Outside-fixture hashes match (`64d5da4f0dd3d6410bfb61b1f196887650e2cbcf682bfc2216238d3aadd27c9a`); retained signed, financial, business-event and Close records agree exactly.

| Baseline interleaving | Recorded result |
| --- | --- |
| Attempt 1 publishes the inbox notification, then pauses before terminal acknowledgement. The same worker ID reclaims the lease as attempt 2. | Attempt 1 marks attempt 2 `SENT`, clears its lease and writes `OUTBOX_DELIVERED` with `attempts: 2`. The existing inbox notice remains unchanged. |
| Attempt 1 pauses before its attempt-bound handler read. The same worker ID reclaims as attempt 2; the old handler then correctly refuses its obsolete claim. | Generic failure handling nevertheless marks attempt 2 `FAILED`, clears its lease and writes `OUTBOX_RETRY` with `attempts: 2`. No signed-notification inbox item is created. |

`baselineProofComplete: true` and `defectReproduced: true` mean the negative baseline was successfully reproduced. **`safetyContractSatisfied: false` is the product result.** No natural successful process exit is claimed: the receipt and disconnect completed without reported finalization/disconnect errors, but Node lingered. The coordinator reports stopping exact PID `23764`; exec session `86299` then ended with exit `1`. That process-cleanup outcome is separate from the saved baseline observations.

## Source contract

At baseline, `services/events/business-event-outbox.service.ts` (SHA-256 `3a5aaab6861498ad3782a864cd2acdb6284acba2f8bddfd9e98dca224a1578c1`) returns incremented `attempts` and `lockedAt` on acquisition (lines 223–225), but terminal delivered/failed reads and updates bind only tenant, message ID, `LOCKED` status and worker ID (lines 249–270 and 327–354). `runBusinessEventOutboxWorker` at line 445 does not pass the claim generation to either terminal method.

`services/reconciliation/reconciliation-sign-notification.worker.ts` (SHA-256 `846a8887800fd51b00a0c76851e49209b9d7951157627a99552e52d4635464a8`) checks `message.attempts` in its handler at line 29. That check does not protect the later generic terminal mutation. The reviewed baseline driver is bound to SHA-256 `4958d118d56333529430af73f2c1a39df5a20d7ec806cc15dea0ad0c5db39935`.

## Delivered correction and publication semantics

The [saved predecessor](evidence/sign-lease-fix-before-477fd55c-34c0-4cee-a107-8333f73b62d7/manifest.json) and current source were independently compared. `business-event-outbox.service.ts` now requires a valid positive integral `attempts` value and valid `lockedAt` date. Both terminal reads and compare-and-set updates bind tenant, message, locked status, worker, attempt and acquisition time. Missing or superseded claims return `LEASE_LOST` without mutation or terminal audit. The generic worker passes the acquired values through both success and failure paths and continues the batch after an ordinary lease-loss result. Genuine database/audit failures still propagate. The signed handler also binds acquisition time. Ordinary retry, exhaustion and atomic terminal/audit behavior are retained. No must-fix issue was found in this bounded patch.

Current product bindings: `services/events/business-event-outbox.service.ts` = `17070f8505aa49022423aac295579f8bd628c342d069b8320025e9b6bcafc7a0`; `services/reconciliation/reconciliation-sign-notification.worker.ts` = `92b03047335e598729d642692eea1ef88bbaad98c3b8ec17954449304b95d84e`. The existing CLI already treats every non-`SENT` result as failure; the new focused test covers `LEASE_LOST` with exit `1`.

Reclaim after the handler's retained read can still allow that old invocation to publish one valid historical inbox notice. This is consistent with the present at-least-once delivery contract: the immutable signed event determines the notice, tenant/event deduplication prevents a second notice, and a retry does not rewrite its bytes. Signing may subsequently reopen without erasing the historical signing observation. Exact lease ownership is required for terminal acknowledgement, not exclusive handler execution. The new third runtime case proves this distinction; it does not claim lease ownership was held throughout publication. No broader row or organization lock was added.

## Final verification

The current [focused Jest receipt](evidence/sign-lease-jest-38631a21-0632-4199-ab18-243719ff5639.json) records **78 passed tests in five suites, zero failed or pending**, including both existing finance-export consumer suites. [Full TypeScript](evidence/sign-lease-typecheck-35d5d4ec-a39f-4f0e-affa-1aa7a1225cf5.json) and [five-file lint](evidence/sign-lease-lint-3557b2ad-7c20-45eb-ab68-f72a78d1b166.json) pass. All 19 source bindings in each static receipt agree before/after and with files read during this review.

The [actual lease acceptance receipt](lanes/environment/sign-lease-acceptance-463bc87b-5b9b-4feb-b4e7-46086a5109dc.json), SHA-256 `abc337112ce002cfbc09859d29f970b6f5626e68203ddba53e4f3392438fd7dd`, passes all three cases. All 94 before/after/current bindings agree; outside-fixture hashes agree and no finalization/disconnect error is recorded. Obsolete success and failure both leave the newer lease and all audits unchanged. The after-read publication case adds exactly one notice while preserving the newer lease/audits and retained signature/financial/Close state. Real claim-2 acknowledgement succeeds; the failure case uses the actual claim-2 failure and approximately 30-second retry schedule before real claim-3 delivery. Exact repeats have no effects. The coordinator reports terminal exit `0`.

The independently inspected [refreshed ordinary delivery receipt](lanes/environment/sign-notification-10d17a81-27a3-4d96-a2c9-a998012ee8df.json) also passes with its four current source bindings unchanged. It verifies competing workers produce one notice, and that an actual acknowledgement-audit failure after committed inbox publication preserves that notice through the existing approximately 15-second backoff and successful retry. Its retained financial/signature and unrelated-outbox checks pass; unlike the larger acceptance receipt it does not claim a whole-database outside fingerprint. The coordinator reports terminal exit `0` after disconnect.

## Applicability to PR-10

The [original closure binding](evidence/signoff-closure-2026-09-27.json) has 56 files; 50 still match. Reuse is by affected behavior, not a claim that its old aggregate binding still matches:

| Changed dependency | Current applicability |
| --- | --- |
| Outbox and signed notification worker | Replaced delivery evidence by the current static, three-case acceptance and ordinary concurrency/lost-ack receipts above. |
| Preparation service and preparation workbench | Both exact current hashes appear in the later [preparation closure](evidence/preparation-closure-2026-09-27.json), which retains its reviewed discovery, preparation and signer-handoff evidence. No lease change affects those UI behaviors. |
| `periods.service.ts` | The signing dependency `getOpenPeriodForDate` retains tenant selection, `FOR SHARE`, ordering and open-status validation; its changed predicate explicitly interprets the supplied date in UTC. Current actual signing fixtures exercise this dependency. Other changed fiscal creation/closing functions are not called by this signing path. |
| `close-assurance-pack.service.ts` | The same signing source code, period/date scope and certificate-hash handoff remain. Later changes lock/reload the selected run, resolve its current export after that lock and mark additional observed run states stale. Prior retained-signature/certificate evidence and later source-bound Close producer evidence remain applicable to that existing-record handoff; they are not evidence of every possible signing/publication interleaving. |

**Recommendation: PR-10 may return to `Complete—verified` for its original implemented application boundary once the coordinator publishes these current bindings and impact notes.** No remaining gate for the demonstrated lease defect was found. The unchanged signing action, reviewed signing UI, certificate calculation and immutable export contracts do not require a repeated full browser run solely for this patch. This recommendation preserves the [original audit's limits](RECONCILIATION_SIGNOFF_FINAL_AUDIT_2026-09-27.md), including native assistive technology/zoom, production-scale performance, deployment, scheduler installation and broader notification repair.

A signing transaction racing a newly published Close assessment is **not verified by this milestone**. Signing still calls source invalidation within its Serializable transaction without the newer Close publication advisory-lock contract. No reproduction or safety claim for that separate interleaving is made here; retain it as an explicit Close follow-on rather than silently expanding PR-10's verified scope. Generic finance-export artifact replay recovery also retains its separate unresolved boundary despite the passing consumer regressions.

## Review limits

The test advances the supplied reclaim clock by 300,001 ms; it does not prove five minutes of elapsed time or production scheduling behavior. Reused worker IDs are accepted by the current service despite CLI guidance recommending unique IDs. `SENT` denotes durable workspace inbox publication, not external delivery or human acknowledgement. The receipt's `externalFetchDisabled` flag is declarative; this review establishes that the exercised handler has an inbox-only path, not a separately verified network sandbox.

The previous PR-10 delivery receipt alone cannot prove this newly exercised lease boundary; use the current receipts above. The coordinator owns register reopening and subsequent evidence-based status updates. This review itself changes no PR-10, Cash, Close, X1 or parent-workflow status. UI/localization, pricing and statutory calculation are not applicable to this bounded backend correction. Production contention, wider consumer behavior beyond the focused regressions, and external-delivery guarantees remain unverified.
