# UX17 recovery boundary — current source discovery

4 October 2026. This records a source finding; UX17 remains open.

The original roadmap's generic inbox retry assumption does not match current notification producers. `services/reconciliation/payment-reconciliation-notifications.ts` inserts in-app notification observations directly as transport `PROCESSED`. Their payload status `UNREAD` is a reader state, not pending worker processing. Requeueing those records would invent work and could route them through a worker with unrelated financial responsibilities.

`payment-reconciliation-alert-scan.service.ts` owns an actual resumable alert-generation workflow. Its control record is also transport `PROCESSED`, deliberately excluding it from generic inbox leasing. `payloadSummary.worker` owns REQUESTED/RUNNING/FAILED/COMPLETE progress, phase, cursor, version and counters. Each scan page locks the control row, reads a bounded source page, records deduplicated in-app notifications and updates the checkpoint in the same transaction. Failure marking is version-fenced. The command-line worker explicitly resumes the same scan ID after interruption.

The generic `payment-reconciliation-inbox-worker.service.ts` is a separate boundary. It includes provider/payment sources, leases, retries, redaction checks and max-attempt dead letters. Payroll settlement uses its completion/failure operations. Its browser DTO must never expose worker lease tokens, raw payload or actor/worker secrets.

## Implemented adaptation; operating acceptance pending

Resume the existing alert scan checkpoint through a scoped, audited, idempotent operator command. Reuse the existing page advancement inside one caller transaction and existing BusinessEvent receipts. Require current stored reconciliation read/run permissions, live session and module authority. Lock the same control row as the worker. Reject stale revisions, unexpected transport states/leases, malformed or hash-mismatched progress and foreign tenant records. Preserve the original scan identity, cursor and attempt history. Return a minimal receipt and refresh authoritative progress; never report payment settlement or financial reconciliation as a consequence.

An operator page is bounded, not a detached process. A RUNNING checkpoint between pages is not itself a live lease; any continuation policy must explain this and prove worker/operator serialization with independent database connections. No generic dead-letter payload is retried merely because its error code looks temporary. Unknown/redaction/poison payloads require source-specific investigation.

A question has been sent asking whether to use this existing scan recovery or introduce a separate queued-alert processor. With no preference received, implementation proceeded against the existing checkpoint contract behind a disabled write flag. The guarded command and EN/FR panel now pass 134 focused tests; see `ALERT_SCAN_RECOVERY_IMPLEMENTATION_NOTES.md`. No live recovery ran. D08 retry authority, escalation ownership, database races and worker transition acceptance remain open.

## Runbook evidence needed before exposure

1. Identify tenant, scan ID, source, safe error code and current checkpoint. Do not copy payloads or lease tokens into tickets.
2. Confirm the registered source adapter and authoritative record. A completed in-app notification is not eligible work; provider/payment sources use their own recovery workflow.
3. Validate progress shape/hash and current authority before enabling recovery. Stop on malformed state, redaction failure, unexpected lease or absent source evidence.
4. Resolve the same command receipt after a timeout before retrying. Do not reset attempts, replace the scan ID, change cursors, steal leases or delete audit/receipt history.
5. Verify page progress, deduplication and financial-record invariants. Escalate repeated failure to the named reconciliation/SRE owner; that human owner is still unassigned.
6. Keep mutation exposure disabled until PostgreSQL worker/operator races, rollback, revoked authority, poison-state and browser interpretation checks pass.
