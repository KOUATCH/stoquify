# Preserve one evidence request per finding

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. This correction prevents a second request from making retained evidence unreviewable. The full workflow program remains active; no parent workflow is closed.

Baseline: 2026-10-03, branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; register SHA256 `cb126813581adeddfa10fcf4dc8e34e69d89c8d0fbc3552a9ce1cf5754db56d2`; progress SHA256 `138720a453cc19f2c14a8eb1276bfca4b320fd4584eccb20b8f042c5af326cd7`. Unrelated shared changes are preserved. Coverage remains 270 workflows /17 families, 191 unmapped entries, 264 Queued, two In progress and four Complete—verified.

## Reproduction and correction

`requestMissingCloseEvidence` previously deduplicated only an exact finding/correlation replay. A new correlation identifier could append another request to the same finding and replace its assignment/status, including after a response had been submitted. The reviewer projection requires exactly one request for a finding, so this admitted state could not proceed to review.

Four pre-fix focused regressions failed for OPEN, ASSIGNED, IN_REVIEW and REOPENED findings. Receipt: `evidence/close-evidence-recovery-regression-d0766a13-c8fd-4013-8925-86c8ee09da89.json` (24 passed, four failed, 103 intentionally not selected by the focused filter). The actual database reproduction then saved two distinct requests and one response, observed the finding absent from the review list and observed an evidence issue. Receipt: `lanes/environment/close-request-uniqueness-a4c49dfc-46ad-41eb-a723-60db50e561c7.json`; its `passed` means successful defect reproduction, not correct application behavior. Source, financial and outside-fixture observations passed.

The service now checks for a retained request after its exact-replay path and scoped finding lookup, before recipient/assignment changes. Any existing request-visibility record blocks creation; malformed old evidence is not silently bypassed. The check and finding update share the existing Serializable transaction. Concurrent conflicting requests retry against committed state; exact replay returns the original result. No new lock order, schema, index, migration or data rewrite is introduced.

The existing CONFLICT response now has specific EN/FR guidance in the recovery panel. It explains that an existing request must be continued, retains the user's draft, clears the uncertain command and does not announce success. The original source records, recipient, response, audit and business events remain authoritative.

## Acceptance criteria and verification

- A second distinct request cannot change the finding, original request, response, audit or business-event state.
- Existing exact retries remain valid, including after their deadline, with current authority still required.
- A new request cannot move an IN_REVIEW finding back to ASSIGNED.
- Overlapping different-key transactions commit exactly one request, one audit event and one business event; the other receives CONFLICT.
- Overlapping identical-key transactions return the same retained request and create those effects once.
- The original response remains available to the authorized reviewer and replacement-source preview.
- Actual stale-tab submissions in EN/FR preserve the second draft and reject the duplicate while the original journey continues to independent acceptance.

Final static verification passed **444 tests /13 suites, zero failures/skips**, no-emit TypeScript and changed-file lint. Receipts: `evidence/close-evidence-recovery-jest-b0dd3fae-ac4a-4ab4-a10f-79749af659c2.json`, `evidence/close-evidence-recovery-typecheck-ec1b98ac-7fd1-4467-9db8-7c8737257b79.json`, and `evidence/close-evidence-recovery-lint-9ab36be7-fcc8-4372-82a8-c058dfcf9d7d.json`. All bind stable final source. The earlier 443-test/static run predates the specific conflict copy and retained-draft regression and remains intermediate evidence.

All **four actual database checks passed** in `lanes/environment/close-request-uniqueness-33d4d39c-f600-4d2d-a652-34baea3053e9.json` (SHA256 `487d23874ad643d790a7fa6e0c6c7c5b095f997ce2da1d6c84976e19cffa8929`). Serial conflict and exact replay preserved state; a responded finding retained authorized review and an available replacement. Distinct-key contenders ran on PostgreSQL backends 15492/24188: one succeeded, the other retried and received CONFLICT. Identical-key contenders ran on backends 352/4544: both returned the same request after retry. Each race retained one request, one request audit and one request business event. Source, financial and outside-fixture checks passed. The exact target was the owned loopback `stoquify_local_registration_20260906_01`.

Both EN/FR actual browser journeys passed: a second tab was opened and filled before the first request committed; the second submission received the localized conflict, retained its draft and left the finding/comments unchanged. The first request continued through response, fresh identity confirmation and explicit independent acceptance, with one acceptance per journey and original missing evidence retained. Eighteen screenshots include `close-evidence-browser-c84ff9be-2d69-48b3-9100-649ced44b971-en-second-request-refused.png` and its French counterpart, both visually inspected.

The original receipt `lanes/environment/close-evidence-browser-c84ff9be-2d69-48b3-9100-649ced44b971.json` is retained as incomplete: both journeys passed, but Windows could not autoload `NetTCPIP` for the final listener check. A fresh read confirmed the same listener, PID 15208 /parent 18188. Read-only finalization then verified the original receipt/hash, unchanged source/build hashes, outside-fixture and financial snapshots, and durable acceptances. No journeys or database mutations were repeated. Completed receipt: `lanes/environment/close-evidence-browser-finalized-2ca328a5-0bf7-4d32-a869-a39ceff1629d.json`; its recovery record preserves the original failure and hash. All final flags passed. The exact owned listener was then stopped and its launcher exited 0.

Both languages passed 1440/768/320 CSS-pixel reflow checks with reduced motion and no horizontal overflow. Keyboard/focus and explicit recovery were exercised; comprehensive accessibility/zoom certification is not claimed. Local development maker/checker/reviewer readiness timings were EN 46,299/10,307/11,122 ms and FR 8,988/8,854/7,555 ms. The cold first visit includes development compilation; these are individual observations, not production performance results.

The runtime driver `lanes/environment/close-request-uniqueness-runtime.cjs` is inert without `--run`, verifies the exact owned loopback database and creates only explicit synthetic fixtures. Its concurrency barrier pauses after real correlation reads and records distinct database backend IDs; it does not replace query results or authorization decisions. The shared browser driver creates a second real tab and draft before the first request commits, then checks refusal and preserved draft before completing the first request's response/acceptance.

## Operation, rollout and limits

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`. If another tab has already submitted a request for the finding, the later tab displays the conflict and keeps its draft. Refresh the workbench and coordinate with the existing response owner. Repeating the operation with a new identifier cannot replace the retained request. An uncertain original submission should use its saved exact retry.

Recipient replacement/leaver recovery still needs an explicit controlled lifecycle. This patch does not grant replacement authority or delete old requests. Already ambiguous historical findings require investigation; no automated backfill or evidence deletion was performed. Requester tracking and visibility of those recovery obligations remain required next work.

Release the service and copy/UI changes together through the normal process. No migration is required. Observe conflict rates and support reports; a conflict is not failed financial posting or payment. Reverting the guard would reintroduce a verified admission defect, so prefer forward correction if rollback is considered. No production deployment, payment, external delivery, migration, seed command, reset, professional approval or X1 clearance occurs here.

Architecture, backend/data consistency, IAM, audit, workflow/localization, quality and operations apply. Financial/retained-evidence invariants are checked. Statutory/country calculations, payroll calculations, inventory/POS/offline, commercial billing and AI: not applicable to this request admission change; their workflow reviews remain in the full program. Existing separation of duties, fresh acceptance authentication and tenant/module boundaries remain effective. Full screen-reader/zoom coverage and other authority interleavings remain open. The previously auto-review-rejected all-period manual-posting helper remains unapplied pending the existing approval request.
