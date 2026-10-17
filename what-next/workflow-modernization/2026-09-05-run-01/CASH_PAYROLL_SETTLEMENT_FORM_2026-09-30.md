# Cash Command dependency: settlement entry and recovery

2026-09-30. Primary FA-CASH-COMMAND; supporting payroll settlement/forecast contract. Branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Existing changes preserved. This is a verified subcriterion, not whole-workflow closure.

## Delivered behavior

The reconciliation read model now supplies a verified remaining amount, prior-event revision, balance availability and permission-derived recording eligibility. Restricted amounts/revisions remain redacted. Legacy or invalid history does not produce an editable inferred balance. The read action replaces client-provided module decisions with current server-derived entitlement; retained read-only entitlement prevents recording in the read model and service.

The form defaults to the remaining obligation rather than the original payment amount. Its submission carries the reviewed event revision, checked inside the transaction before a new settlement. A concurrent change conflicts. Unchanged idempotent replay still returns the earlier result. A consumed match is not automatically offered as evidence for the next increment.

EN/FR labels and recovery messages explain incremental amounts, controlled evidence and unavailable balances. Dashboard brand, information, warning and success tokens retain distinct meanings. Controls are disabled before hydration, avoiding an ordinary form navigation before React handlers are available. A verified success refreshes the data; a user explicitly reviews the new balance before another submission. Completed evidence references are cleared for the new increment; recoverable validation/stale errors preserve the draft.

Fresh-authentication denial now offers the existing password step-up action. Password state clears when submitted. Authentication does not submit a settlement: the operator reviews and submits separately. The existing server-side authority, fresh-authentication and maker-checker controls remain effective.

A thrown transport failure or server error leaves the command unchanged and locks its fields. Retry uses that exact command and idempotency key. This resolves a lost acknowledgement without issuing another financial effect. A confirmed success disables further submission until the refreshed balance is deliberately adopted.

## Verification

The immutable review at `evidence/cash-settlement-form-review-2026-09-30.json` binds final source, focused test/lint/TypeScript results and actual screenshots. `run-settlement-form-checks.cjs` executes direct Jest, changed-file ESLint and the exact `tsc --noEmit --pretty false` implementation of the repository typecheck. No build, migration or seed wrapper is invoked.

Actual browser receipt: `lanes/environment/settlement-form-browser-72f584dd-d819-4894-bcd9-4d94539ed4c4.json`. EN at 1440px and FR at 320px use real sign-in, password reauthentication, server actions and persisted events in the owned database. Each synthetic released batch starts at 100.00; a service-recorded 30.00 leaves 70.00. The browser records another 10.00, its response is deliberately dropped after server processing, and retry leaves exactly two events and a verified 60.00 remainder. Authentication alone writes no settlement. Stale revisions and restricted projections reject; revoked write permission removes the form. No browser page errors or overflow inside the form. The French form screenshot was visually inspected.

Earlier failures are preserved: a duplicate fixture role code, an overly exact select locator, missing fresh-authentication recovery, an early click before hydration, a test waiting for a transition to finish, and a missing server-decision assignment. These attempts do not count as passes. Source and verification adjustments address the observed failures.

## Operator guide

Open `/en/dashboard/payroll/payments` or `/fr/dashboard/payroll/payments`. Use a permitted released/partially settled batch with verified history. Enter the amount represented by the new evidence; final settlement equals the remaining obligation. Obtain register/evidence hashes and match/provider/statement references from the actual released register and corresponding controlled records. The authorized payroll/reconciliation operator supplies those records; the application must not invent them.

If authentication is requested, enter the current account password, authenticate, then separately submit the reviewed settlement. After an unknown outcome, keep the page open and choose Retry the same request. Do not change evidence or create another request merely to bypass an uncertain result. After a concurrent change, refresh, review the updated balance, and adopt it deliberately. Insufficient permission requires the authorized payroll controller. An unverified legacy balance requires reconciliation of authentic original evidence; there is no automatic backfill or supported manual immutable-record edit.

## Review and rollout limits

Backend/data/finance: canonical decimal balances, stale revisions, existing serializable/replay controls and persisted counts checked. Security/privacy: server-derived module context, redaction, current permissions and real fresh authentication checked. Audit/events: existing durable settlement history retained. UX/localization: this form's EN/FR and narrow layout verified; the wider table remains horizontally scrollable and contains English headings. Full keyboard, contrast, zoom and native screen-reader review remain open. Product/operations: explicit recovery and evidence ownership documented. SRE: focused local checks only; no production performance or availability certification.

Statutory/country approval, real payment release/provider transfer and declaration processing are not established by synthetic released-payment fixtures. Commercial billing, AI/agents, POS/offline and inventory changes are not applicable to this patch. No migration, deployment, live activation or external message occurred.

Deploy reader/action/form together through the existing reviewed release process. Preserve event history during rollback; an old form may submit the original amount or fail to recover a lost response. Use established operational write controls pending repair rather than deleting settlement evidence. Draft recovery here is within the mounted page; cross-session draft recovery is not claimed.

Remaining: controlled legacy-history reconstruction; complete HRIS/release/provider/declaration/forecast lifecycle; broader payroll localization/layout/accessibility; remaining successful Cash proof lifecycles and route-latency assessment. Continue the existing primary workflow.
