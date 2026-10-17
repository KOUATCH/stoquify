# Controlled Close evidence recipient replacement

This is a correction within FA-CLOSE-PACK supporting FA-CASH-COMMAND. Neither workflow is complete. Source baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with existing shared changes preserved. Receipts bind the working files, not just HEAD.

## Outcome and bounded acceptance criteria

A requester with current Close read, evidence-request and finding-assignment authority can transfer an unanswered evidence request to another eligible colleague in the same organization. The business benefit is recovering work from an unavailable colleague without replacing the request, extending its deadline, losing the original evidence or reopening submitted review.

Criteria for this correction: preserve the original request and deadline; retain actor, reason and revision; enforce current authority and recipient eligibility; reject stale or conflicting commands; replay exact submissions without extra effects; make queues and response/review consumers agree on the recipient; refuse replacement after a response; complete the EN/FR application journey through independent acceptance and retained history.

## Implementation and controls

`replaceMissingCloseEvidenceRecipient` owns the write in the existing Serializable transaction/retry boundary. It locks current tenant/module/user/role/membership/session authority and the new recipient's eligibility. The caller must supply the assignment revision shown in the preview, a reason of at least ten characters and a retry reference. Client tenant/actor injection is rejected. Submission is refused if the finding owner disagrees with retained assignment evidence, a response exists, evidence is ambiguous, the revision is stale or the publication clock has not advanced.

The original `AccountantComment` remains unchanged. `LedgerAuditEvent` retains each `CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED` transition, including old/new recipient, original recipient, previous revision, sequence, reason, actor, time and request/finding/period/run scope. The existing finding owner is updated without resetting its status or deadline. An existing Close workflow event carries a distinct idempotency key and `RECIPIENT_REPLACED` change type; no second request comment is created. Notification dispatch remains outside this verification claim.

One shared resolver supplies the effective recipient to assigned queues, response admission, independent review, acceptance and requester tracking. Source-read failure propagates; invalid replacement evidence becomes an investigation state. The resolver validates the latest transition and its immediate predecessor. It does **not** certify the complete historical audit chain.

The authenticated Close workbench adds EN/FR replacement controls and reason/history text using existing dashboard tokens, fields and keyboard/focus patterns. Unsaved reasons and pending exact commands use the existing actor/organization/period-scoped draft store. Selection is not displayed as approval. Existing generic assignment still refuses to overwrite an evidence request.

## Verification

The inspected runner invokes Jest, `tsc --noEmit` and focused ESLint directly; it invokes no build, migration or seed. Final static receipts:

- [529 tests /16 suites](evidence/close-evidence-recovery-jest-df704103-7454-4206-a059-5f680a869111.json), zero failures/skips.
- [TypeScript](evidence/close-evidence-recovery-typecheck-1d15fcb9-003d-4fc7-8f54-a350fa94e71a.json).
- [Focused lint](evidence/close-evidence-recovery-lint-17d7d9c7-169c-4b03-b4ea-a53ba9addb3b.json).

Failed attempts remain available: [512 passed /9 failed](evidence/close-evidence-recovery-jest-bff7b814-1ae0-4f79-ac78-25700c1fe633.json) exposed queue fixtures missing scope fields now needed by the shared resolver; [528 passed /1 failed](evidence/close-evidence-recovery-jest-0f4cc056-e433-477e-9153-95f95d779b41.json) retained an obsolete original-recipient SQL expectation. Fixtures and the expectation were corrected; subsequent checks passed.

[Six actual database checks](lanes/environment/close-recipient-replacement-b7ced37b-d3e4-48cc-a982-969a59af4b30.json) passed on identity-guarded loopback `stoquify_local_registration_20260906_01`. They cover inactive former-recipient recovery, original request/deadline preservation, old-recipient refusal, new-recipient response/review, replay after response, successive changes, stale/mismatched retry, revoked assignment permission, inactive new recipient, foreign scope, exact concurrent submissions, distinct competing submissions and an overlapping old-recipient response. Competing distinct commands had one winner; identical commands returned one retained change. Financial and outside-fixture hashes were unchanged, as were source bindings. One small-fixture requester read took 114 ms; this is an observation, not a production budget or high-volume benchmark.

[Actual EN/FR browser verification](lanes/environment/close-recipient-replacement-browser-3a19fd75-7a2b-4e88-8d8d-425cf0c307df.json) passed against the exact owned loopback process and the passing runtime fixture. Both journeys completed draft reload, replacement, removal from the former recipient's queue, response by the new recipient, independent acceptance and requester history retaining the replacement reason. Each accepted finding was actually resolved with one persisted acceptance; original missing evidence remained unchanged. Financial/outside-fixture hashes and source bindings passed. Keyboard activation, focused outcome messages, reduced motion and 1440/768/320 form reflow passed. The actual development route artifact is hashed in the receipt; this is not a production build certification.

Screenshots are listed in that receipt. Visually inspected [English desktop draft](lanes/environment/close-recipient-replacement-browser-3a19fd75-7a2b-4e88-8d8d-425cf0c307df-en-draft-1440.png) and [French narrow-mobile draft](lanes/environment/close-recipient-replacement-browser-3a19fd75-7a2b-4e88-8d8d-425cf0c307df-fr-draft-320.png): controls and guidance remain contained, the selected colleague is visible, and confirmation/cancel actions are reachable. Full screen-reader, zoom and high-volume/paginated-recipient draft verification remain outside this bounded browser proof.

Observed route-to-workbench loading was 65.639 s for the first English visit and 11.237 s for the first French visit; subsequent persona visits ranged from 5.797 to 7.995 s. These development observations include compilation/loading effects and do not establish a performance improvement. Source/build/fixture bindings and individual timings are in the browser receipt.

## Operating instructions and recovery

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, select the accounting period and find the request in **your request history**. For an unanswered request, choose the recipient-replacement action, select an eligible colleague, enter the reason and confirm. The action requires both evidence-request and assignment authority. The colleague needs current Close read/comment authority and a usable account in the organization.

After uncertain transport failure, use the retained retry action. It sends the same command and reference; it cannot undo a later change. After a stale/conflict refusal, refresh and explicitly review the current assignment before starting another change. Submitted responses stay with independent review. Investigation states require examination of retained records; do not create another request or edit audit rows to conceal ambiguity.

The requester supplies the new colleague and a factual reason. Colleague choices come from the current organization directory. Revision, actor, timestamp, record ID and event evidence are service-generated. No commercial approval document, external signature system or X1 clearance is required or produced by this operational assignment change.

## Review, rollout and remaining boundaries

Architecture/backend/data review: one domain writer and shared resolver, existing schema, no migration. Security/controls review: current tenant/object/role/session/module authority, private request bodies, revision binding and retained history. Finance/audit review: financial records unchanged, historical missing evidence retained, submitted review protected. UX/product review: preserves the employee's existing work and deadline; full accessibility certification is not claimed. SRE/operations review: deterministic retry and durable event creation are checked; delivery and high-volume latency are still open. SaaS packaging review: existing module eligibility is preserved. Country-pack policy, payroll, POS, AI and billing-provider changes are not applicable to this assignment correction because their behavior and data are unchanged.

Deploy affected readers and writers together: older readers would ignore replacement audit records. Once replacement events exist, do not roll back to an old recipient resolver without a compatible recovery plan. A safe containment action is disabling the new replacement entry point while retaining the current readers and evidence. No production deployment or live activation was performed.

Remaining: existing ambiguous-history recovery; a replacement entry point when the original requester is unavailable or an administrator is delegated; complete-chain audit assurance; delegated summary context; broader diagnostic localization; full accessibility/zoom and authority interleavings; notification dispatch/recovery; high-volume projection latency. The full Cash/Close and platform workflow criteria remain in the register.
