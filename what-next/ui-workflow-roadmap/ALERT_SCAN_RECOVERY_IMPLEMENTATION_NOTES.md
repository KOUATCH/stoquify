# Alert scan recovery implementation — UX17

4 October 2026. Implemented locally; recovery writes remain disabled. No release or roadmap completion is claimed.

Database follow-up: 11 real PostgreSQL recovery scenarios and 11 target-guard checks now pass on a separate migrated local database. See `POSTGRES_WORKFLOW_VERIFICATION.md` and `postgres-workflow-verification.json`. The earlier mocked-test evidence below remains valid historical evidence; additional schedules, browser and operating acceptance still remain open.

## Implemented outcome

An authorized operator can review an existing alert-scan checkpoint and request one bounded continuation page. The command reuses the scanner's transaction helper, preserving the scan ID, cursor, deduplication and attempt history. Notifications, checkpoint advancement, a BusinessEvent receipt and an audit event commit together. This records in-app observations; it does not settle payments, approve matches or post accounting entries.

The original roadmap assumed a generic queued-alert retry. Current notification producers insert observations as transport PROCESSED; UNREAD describes readership. The actual resumable work is the separate RECONCILIATION_ALERT_SCAN_V1 control record. This implementation proceeds with that evidenced boundary while the optional operator-preference question remains unanswered. D08 operating acceptance remains open. The generic provider/payment inbox worker, its leases and payroll settlement responsibilities are unchanged.

## Authority, serialization and outcome recovery

- Both current context and stored roles must grant reconciliation read and run. Active organization/account, a live matching session and enforced module access are checked inside the transaction. Reads of command receipts also recheck authority.
- The operator locks organization then scan; the host scanner now takes an organization share lock before its scan lock. This establishes consistent lock ordering with organization foreign-key checks during notification insertion. Independent PostgreSQL race proof and lock-performance measurements are still required.
- Exact source/key, transport, provider/lease absence, payload schema/hash, completion timestamps and safe error invariants determine eligibility. Unexpected or poisoned state returns escalation with no worker payload, cursor, lease or token in the browser DTO.
- Expected revision fences stale commands. The command UUID namespaces a stored BusinessEvent receipt; replay validates actor, source, command hash, event hash and result. Replay is available after the write kill switch, subject to current read authority. Another worker advancing the scan does not erase an earlier committed receipt.
- One command advances at most 100 source records. RUNNING can describe a checkpoint between pages; the shared row lock serializes any active page. The UI explains this distinction and requires explicit checkpoint review for each new request.
- Unknown browser outcomes require authoritative status lookup before the same request can be retried. A changed checkpoint requires a new explicit review. Duplicate clicks are suppressed, unmounted responses are ignored and receipt focus is restored. Cache refresh failure cannot turn a recorded receipt into a failed command.

## Exposure and rollback

`RECONCILIATION_ALERT_RECOVERY_ENABLED` defaults to false and was not enabled. The workbench mounts the EN/FR panel only when a scan exists and current actor/organization-bound permissions include read and run. The server independently enforces the boundary. No migration is introduced.

Rollback disables command admission with the flag; preserve scan records, observations, event receipts and audit history. Do not reset attempts, replace scan IDs/cursors, clear leases or route processed notifications through the generic worker. Repeated failure or malformed state goes to the reconciliation/SRE owner; that named human owner is not yet assigned. Share only the scan reference and safe diagnostic code, never payloads or lease tokens.

## Verification and limits

- `alert-recovery-jest.json`: 10 suites, 134 tests passed (session 51956). Includes service/action/UI contracts, actual page helper, host scanner lock-order checks, existing notification/generic-worker/workbench/CLI regressions. Earlier workbench failures were a test-provider harness issue; the final run uses a stable QueryClientProvider wrapper and passes.
- Repository TypeScript session 47306 completed with exit 0. The subsequent change was confined to the workbench test wrapper; scoped ESLint was rerun for that file and passed with zero warnings. Product and other focused test lint had also passed.
- Authenticated localhost browser: the reconciliation workbench and processed-notification diagnostics loaded in English and French. The inbox explicitly reports no recorded worker scan in both locales, so no live recovery panel or mutation was verified. No checkpoint was created to manufacture evidence.
- No database race, rollback injection, production latency, screen-reader or representative operator task result is claimed. Mocked transactions establish contracts, not PostgreSQL isolation behavior.

## Remaining release gates

1. Rehearse worker/operator contention, two operators on the same revision, same-command replay, failure between notification/checkpoint/event/audit writes, permission/session revocation, malformed controls and flag rollback on an explicitly disposable PostgreSQL environment.
2. Verify invariants: exactly one page advancement per accepted revision, deduplicated notifications, unchanged financial records and no generic lease theft. Measure organization-lock contention.
3. Exercise populated EN/FR desktop/mobile and limited-role browser tasks, lost response, reload, current-checkpoint review, focus/keyboard and screen-reader interpretation.
4. Confirm D08 authority, escalation owner and the scan-target adaptation with domain/SRE reviewers; complete UX18/UX19 release and pilot evidence before exposure.
