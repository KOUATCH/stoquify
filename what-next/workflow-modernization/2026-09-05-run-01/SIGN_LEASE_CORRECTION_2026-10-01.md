# Exact ownership for reconciliation notification delivery

Evidence date: 2026-10-01. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; unrelated changes preserved. This bounded correction remains part of the full workflow-modernization goal.

## Reopened requirement and priority

The actual signed-notification baseline reproduced stale attempts overwriting a newer lease when the same worker name is reused. Both success and error handling changed attempt 2 from attempt 1, with an incorrectly attributed delivery/retry audit. [Independent review and exact receipt](SIGN_LEASE_REVIEW_2026-10-01.md) retain the source bindings and observations. The baseline receipt completed; its process required exact-PID cleanup and returned exit 1. This is defect evidence, not a passing safety test.

This reopens PR-10's background-delivery ownership criterion. The financial signature itself was unchanged. Cash remains the primary workflow and Close its supporting dependency; the prepared purchase/Close recovery proof is briefly deferred because a demonstrated defect invalidates a previously completed handoff and shares the worker source used in verification. No workflow is split or added.

## Acceptance established before verification

1. Terminal delivery/failure operations require a valid exact tenant, message, worker, attempt and claim timestamp. Both the retained read and conditional write bind all fields.
2. A superseded claim returns `LEASE_LOST`, preserves the newer row and audit history, and permits later messages in the batch to proceed. Actual storage/audit failures retain their error and transactional semantics.
3. The signed consumer reads the same exact claim; real signed events remain the authority for deduplicated historical inbox observations.
4. Actual PostgreSQL stale-success and stale-failure interleavings preserve attempt 2. Genuine current-owner acknowledgement or backoff/retry completes with one inbox observation and delivered audit.
5. Existing competing workers, lost acknowledgement, early retry refusal and transactional audit rollback remain effective. Cover invalid/missing claim fields, cross-tenant identity, mismatches, retry exhaustion, batch continuation and the finance-export consumer through focused regression checks.
6. Preserve financial/signature/Close records, unrelated observed tenants and immutable baseline evidence. Bind the proof to current sources and report natural process outcome accurately.
7. Reuse unaffected signing/UI evidence only after an explicit dependency-impact review; do not infer full Cash/Close closure from this patch.

## Implementation and operating guidance

The shared outbox service now validates the attempt and lock timestamp, binds both to its read and conditional terminal update, and returns `LEASE_LOST` without a mutation or audit when ownership has changed. The generic runner carries the original claim identity through either outcome and continues its batch after lease loss. The signature worker includes the timestamp in its retained-message check. No schema or handler contract changes were necessary.

A worker losing ownership must not manually mark the row sent or failed. Operators should inspect the current scoped outbox state and allow its current worker or normal stale-lease/backoff recovery to proceed. The CLI already returns failure for any non-`SENT` outcome; its new regression covers `LEASE_LOST`. `SENT` means durable workspace inbox publication; it does not establish external delivery, personal acknowledgement or a new financial signature.

## Current verification

All commands used the installed Node runtime and inspected scripts, with no build hooks. Exact arguments, source hashes and detailed results are in these receipts:

- [78 tests across five suites](evidence/sign-lease-jest-38631a21-0632-4199-ab18-243719ff5639.json): terminal ownership, invalid inputs, cross-tenant/mismatched identity, lost CAS, batch continuation, storage/audit errors, existing finance export and CLI behavior.
- [Full no-emit TypeScript](evidence/sign-lease-typecheck-35d5d4ec-a39f-4f0e-affa-1aa7a1225cf5.json) and [five-file lint](evidence/sign-lease-lint-3557b2ad-7c20-45eb-ab68-f72a78d1b166.json) passed.
- [Actual PostgreSQL acceptance](lanes/environment/sign-lease-acceptance-463bc87b-5b9b-4feb-b4e7-46086a5109dc.json): stale success, stale error and reclaim after the handler's retained read all passed. Each obsolete terminal attempt returned `LEASE_LOST`; the newer lease and its audits remained intact. Genuine current-owner completion and the actual 30-second backoff/retry left one inbox observation and one delivered audit. Signed/financial/Close rows and observed outside-fixture state were unchanged. Three cases, stable sources, terminal exit 0.
- [Refreshed competing-worker and lost-acknowledgement proof](lanes/environment/sign-notification-10d17a81-27a3-4d96-a2c9-a998012ee8df.json) passed with current sources and terminal exit 0. The genuine audit failure rolled back delivery acknowledgement after inbox commit; early retry was refused, and normal backoff recovery preserved the original inbox bytes.

The after-read race confirms at-least-once handling with one retained historical inbox observation; exclusive handler ownership through publication is not claimed. The stale-lease clock is explicitly advanced through the claim API rather than waiting five real minutes. Multi-message batch continuation is a focused unit result; each new database case uses a separately scoped real signed fixture. Production scheduling/capacity, external delivery and general dead-letter operator recovery remain outside this bounded proof.

## Rollout and recovery

There is no migration or data backfill. For a later authorized rollout, replace all affected worker processes together and stop older versions before restarting: an old binary still has the unfenced terminal behavior. Keep worker IDs unique operationally and inspect `LEASE_LOST` as an incomplete invocation, then check the current persisted lease rather than resetting it. A code rollback to the predecessor would reintroduce the reproduced defect; pausing the affected worker and correcting forward preserves pending rows and inbox history. No deployment or worker installation was performed in this task.

Before bytes are retained under `evidence/sign-lease-fix-before-477fd55c-34c0-4cee-a107-8333f73b62d7/`. The independent review reconciles affected prior signing evidence separately; this correction alone does not close Cash or Close.

The scope changes no schema, deployment configuration or UI. Architecture, backend, data integrity, tenant isolation, reconciliation, audit and operational-recovery reviews apply. Statutory calculation, commercial terms, external providers, AI and changed visual/accessibility behavior are not applicable to these backend changes. Prior platform obligations remain open.

## Other retained findings, not expanded into this patch

- `FA-ASYNC-EXPORT`: a completed artifact can be rebuilt after an acknowledgement failure and rejected for having a different key/hash. The injected artifact builder lacks a verified production storage/download/scheduler handoff. Exact outbox fencing does not solve artifact replay; retain this existing workflow as queued.
- Cash/Close draft freshness: creating a journal draft affects preflight and the tenant snapshot without corresponding assessment invalidation. The snapshot also includes Close's own updates, so hash inequality alone is insufficient reproduction evidence. A change overlaps the rejected all-period scope proposal; no alternate helper applies it here.
- Cash/Close authority: current organization-scoped role writers already serialize through the organization's module-admission lock. Remaining source-review concerns are legacy foreign-tenant role contamination and session revocation after the final fresh-auth check. No new runtime exploit or correction is claimed here.

The all-period manual-posting change remains unapplied pending the previously requested explicit approval. No migration, reset, seed, live activation, real payment, external message, deployment or X1 clearance is part of this correction.
