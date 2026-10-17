# Preserve evidence requests during ordinary finding assignment

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. This corrects an unsafe existing transition discovered while preparing controlled recipient replacement. It does not implement replacement or close either parent workflow.

Baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, 2026-10-03. Register SHA256 `34e663f1689e71e6112cebf802aa3d6951b3aec242c0105a7122eae4d4d4e86b`; progress SHA256 `19b74195dc80638fc55b988c44ce14c55012d3e4d1d5b61fba3545035e73bce2`. Prior turn completed verified requester tracking. Coverage remains 270 workflows, 17 families, 191 unmapped entries, 264 Queued, two In progress and four Complete—verified. Shared changes preserved.

## Reproduction and correction

The [pre-fix owned-database reproduction](lanes/environment/close-request-assignment-1a19f87a-ee27-44ec-9cc8-717907262603.json) reproduced three defects through actual services and persisted records:

1. Reassigning a finding with an unanswered request changes its owner but leaves the request addressed to the original recipient. Neither person can respond; neither queue shows the request.
2. Assigning a finding back to the same owner after a response resets `IN_REVIEW` to `ASSIGNED`; the submitted response disappears from review.
3. An assignment transaction that reads the finding before another transaction commits a request can overwrite the new request's owner afterwards.

The reproduction receipt is marked passed because it proved the defects, not because the old behavior was correct. It also confirms that ordinary assignment without an evidence request works. Financial and outside-fixture snapshots were unchanged.

`assignCloseFinding` now checks for any retained `CLIENT_ACTION_REQUIRED` record before updating ownership or status. This includes malformed historical requests, which must be investigated rather than overwritten. A request produces a conflict without a finding update, assignment audit or business event. The predicate and update use the existing Serializable retry wrapper; a concurrent request forces assignment to retry against its committed state. Existing resolved/waived refusal remains in place. Ordinary assignment without a request remains supported.

The existing assignment hook returns localized conflict guidance in EN/FR, so both the notification and inline error lead back to the evidence workbench. No successful reassignment is reported. No new visual primitive, permission, schema or migration is introduced.

## Acceptance and verification

- Pending requests retain their actual response owner and remain actionable.
- Submitted responses remain reachable for independent review.
- A concurrently committed request cannot have its owner overwritten by ordinary assignment.
- Refusal has no assignment/audit/event side effects.
- Ordinary assignment without a request still succeeds.
- EN/FR actual application guidance and keyboard activation are verified without losing the original recipient queue.

The first static run passed 496 tests across fifteen suites, TypeScript and lint. A follow-up localization correction ensures the thrown error itself is translated, rather than only the notification. The final source-bound static run also passed **496 tests /15 suites**, TypeScript and lint:

- [Tests](evidence/close-evidence-recovery-jest-008f0d68-ea0b-4d19-82af-be7fd81b6293.json).
- [TypeScript](evidence/close-evidence-recovery-typecheck-9850cb00-a723-4e94-9fc6-67a175458f9d.json).
- [Lint](evidence/close-evidence-recovery-lint-1793a320-63d4-45bb-8c38-4b4d320e3450.json).

The [after-fix database receipt](lanes/environment/close-request-assignment-e19f3937-791a-4550-8210-793e4faa18fe.json) passed all four checks. It proves denied reassignment without side effects, original-recipient response continuity, retained independent review, an observed assignment retry after an overlapping request committed, and successful ordinary assignment with one audit when no request exists. Source, financial and outside-fixture snapshots were stable. SHA256 `cbf78eb8df475e82ee2baae57ce16810e70376f65d6997510dd4ccbbdd276ac1`.

The [actual browser receipt](lanes/environment/close-request-assignment-browser-69433700-b700-4be9-9ca7-243299d0de26.json) passed EN desktop (1440 pixels) and FR mobile (320 pixels). Keyboard activation of the real “Assign to me” control showed translated inline and notification guidance, produced no finding/comment/audit/event mutation, and retained the original recipient's queue. Source, financial and outside-fixture checks passed. Both [English](lanes/environment/close-request-assignment-browser-69433700-b700-4be9-9ca7-243299d0de26-en.png) and [French](lanes/environment/close-request-assignment-browser-69433700-b700-4be9-9ca7-243299d0de26-fr.png) screenshots were visually inspected. No horizontal overflow occurred. The existing mobile toast temporarily overlaps part of the inline banner while showing the same guidance; broader notification/accessibility review remains open.

Development route-to-control observations were 56,149 ms for the initial English route (including compilation) and 10,780 ms for French. They are not production performance certification or evidence of an improvement. Compiled Close route SHA256: `a4fe8c056819613d66a8f7851e8b22e66f64a997f768f22d5fa13de0deb97f31`. The exact owned loopback listener was stopped after finalization.

Commands used the inspected `verify-close-evidence-recovery.cjs` phases in order, `close-request-assignment-runtime.cjs --run --before` for defect reproduction, `--run` for the corrected behavior, and `close-request-assignment-browser.cjs --run` with the exact runtime receipt/hash and verified listener PID. Static receipts retain the actual child command arguments. No migration-bearing build was run.

## Operating guidance and remaining recovery contract

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`. Use the evidence workbench to continue the existing request, response or independent review. “Assign to me” cannot replace the response owner of a retained request. If that owner cannot work, inspect current account/role eligibility. A permanently departed owner still requires the controlled replacement implementation; creating another request, resetting status or editing retained request metadata is not an approved workaround.

The intended replacement operation must preserve the original request and any responses, require current assignment and evidence-request authority, validate the new recipient, bind the command to the currently reviewed assignment revision, and write a durable reason and actor/time history. It must be idempotent, serialize against response/acceptance and update every recipient/reviewer/requester projection consistently. Submitted or accepted responses must not be rewritten as if produced by the new recipient. These are remaining implementation requirements, not delivered capabilities.

The source trace follows `assignCloseFindingAction` → `useAssignCloseFinding` → Close Center assignment, and the domain writer → request/response/review queues and requester tracking. Architecture, lifecycle/data consistency, access boundaries, evidence retention, event effects, EN/FR, quality and operational recovery apply. Statutory calculations, payroll calculations, inventory/POS/offline, commercial billing and AI are not applicable to this assignment transition; their full workflow reviews remain required. Assignment authority beyond the protected action has not been comprehensively certified by this patch.

Rollout requires normal application release with the service/hook changes together. No migration or data rewrite is required. Reverting the guard restores the reproduced corruption risk; use a reviewed forward fix rather than manipulating retained evidence. No deployment, reset, seed command, real payment, external delivery, live activation or X1 clearance occurred. The previously rejected all-period manual-posting helper remains unapplied. Full workflow scope and all other recorded Cash/Close closure requirements remain active.
