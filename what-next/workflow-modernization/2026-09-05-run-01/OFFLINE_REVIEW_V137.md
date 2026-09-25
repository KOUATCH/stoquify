# Offline conflict review — v137

Status: bounded v137 evidence published. This is a bounded workflow improvement; the platform assignment remains unfinished.

## Delivered behavior

The existing POS workspace can open a tenant-scoped conflict, show its source reference and last reviewer, and record a review note and next action. The server binds the note to the evidence revision the operator loaded. It rejects changed evidence and competing updates, retains the original conflict metadata, and writes the acknowledgement and named audit record in one serializable transaction. An exact retry after a lost response does not create a second review record.

Review acknowledgement does **not** resolve the conflict, authorize replay, post a sale or remove synchronization/financial blockers. OPEN and ACKNOWLEDGED both remain blocking. Accepted payloads, payment records, journal entries and original replay evidence are untouched. No schema change or migration is required.

The existing checkout permission snapshot supplies display access to the review components. Server actions independently check current permissions; saving additionally requires authentication within five minutes. Dashboard cache keys include organization and user. A failed dashboard query remains an error rather than an empty successful result.

Device enrollment labels now describe enrollment only. They no longer imply certification or that offline processing is armed. The review uses dashboard surface, chrome, text, focus and danger tokens, shared buttons, text status, EN/FR copy, a labelled textarea and an inline panel. No duplicate application shell or modal was introduced.

## Operator procedure

1. Open `/en/dashboard/pos` or `/fr/dashboard/pos` with the affected store and terminal selected. POS transaction-read permission is required to view conflict evidence.
2. Choose **Review conflicts / Examiner les conflits**, then **Inspect conflict / Examiner le conflit**. Confirm the device and conflict/source-event references. The list currently shows the first ten open conflicts in the selected scope; it is not a complete operator queue.
3. Enter a 10–1000-character review note describing what was checked, the next action and the responsible person/team. Obtain the conflict and event references from this panel; obtain business facts from the retained source transaction, cashier records and accounting evidence. Do not paste credentials or unnecessary customer/payment data into the note.
4. **Record review** requires `controls.manage`, `pos.transactions.read`, an active organization member and fresh authentication. The application records the actual signed-in reviewer and server time automatically. The note is an operational review record, not a product, statutory or release approval.
5. If evidence changed, use **Load current evidence**, compare it with your note and save explicitly. The current note is retained through recoverable read/save errors. After a lost response, retry the same note before editing it. The server recognizes the exact already-saved request.
6. If fresh authentication is required, enter your own current password in the panel and choose **Confirm identity**. The existing protected authentication action checks it; the password is cleared after submission and never saved in the note. Confirmation does not save the review automatically. Check your note and choose **Record review** explicitly. Unsaved notes currently live only in the mounted panel; reload, sign-out or switching conflicts can discard them. No cross-device or durable draft guarantee is made.
7. Keep the conflict open for a verified correction. Do not reset its event status, edit an accepted payload, invent a signature or create a replacement payment to make the blocker disappear. Full correction/supersession and resolution remain outstanding engineering work.

## Findings and corrections during verification

Initial real-browser attempts could not reach the review entry point. New nested permission subscriptions caused permission refreshes to remount checkout's loading view. Reusing the existing workspace snapshot removed these added subscriptions. The following attempt reached the button but the sticky checkout header intercepted ordinary clicks; spacing and scroll offsets were corrected. Failed runs remain retained as evidence.

Existing checkout unit fixtures lacked the newly consumed `hasPermission` function. Their fixtures now explicitly deny offline review while preserving their original checkout/receipt assertions; no production permission fallback or test assertion was weakened.

The next browser run showed that a normal sign-in does not establish the separately required session assurance. The panel now reuses the existing password step-up action, retains the note, clears password input, reports authentication failures and requires explicit review submission after identity confirmation. Global authentication/provider configuration is unchanged.

Functional browser checks subsequently passed, but visual inspection found clipped French metadata in the narrow panel. Page-level overflow alone had missed it. Explicit single-column sizing, content wrapping and multiline buttons correct the panel; the final verifier checks panel-level overflow as well. Progress and success announcements were consolidated into one status region. An intermediate two-language run also found a duplicate fixture identifier; the fixture now creates a unique organization for each journey. These failures remain in the evidence directory.

## Verification and limitations

Final command receipts, source bindings, database checks and actual browser captures are recorded in `evidence/pos-offline-review-v137.json`. Earlier successful tests and v136 reports are historical evidence at their recorded bindings. Owned database fixtures contain synthetic unresolved conflicts; they do not establish a real device signature/ingestion journey or enable the test-gated offline replay deployment.

The new service's database checks cover tenant denial, stale revision rejection, exact retry, concurrent review and unchanged financial snapshots. Snapshot equality concerns the specifically enumerated sale, payment, journal, drawer, shift, stock and commit records; it is not a universal database audit. Browser verification must separately establish EN/FR interaction, permission loss, failure recovery, keyboard and responsive behavior. No full-build, professional accessibility or production performance certification is implied.

## Rollout, recovery and review responsibilities

Use a reviewed application release through existing controls. No live customer activation, production deployment, payment, external notification or X1 clearance occurred. The isolated target is `stoquify_local_registration_20260906_01`. Keep the existing offline replay authorization gate. Preserve retained review audits when rolling back UI code; prefer a forward fix for a faulty display or read. Do not bulk-resolve conflicts as rollback. Production rollback rehearsal remains open.

Architecture/backend/database: server-owned read model and atomic revision-bound acknowledgement, using existing durable conflict/audit records. IAM/privacy: current action permissions, fresh authentication and tenant-scoped reads; no accepted transaction payload exposed to the panel. Finance/audit/POS/API/events: blockers and financial effects preserved; review and resolution explicitly separated. Frontend/UX/localization/quality: native shell, scoped cache, EN/FR interaction and retained notes; complete resolution and durable drafts remain open. SRE/operations: explicit failure/retry, development timing observations, no invented production budget. SaaS packaging: no commercial grants or billing changes. Country formulas, HR/payroll, AP, analytics and AI behavior are not applicable to this patch because they are unchanged; they remain in the broader workflow register. These are engineering review responsibilities, not independent professional approvals.

Next work: complete audited correction/supersession, operator resolution and queue coverage; verify device enrollment/signature/revocation/replay/close as one lifecycle; add closed-tab result discovery and finish the other platform workflows. No global blocker prevents continued authorized implementation.


Final evidence: 71 tests across seven suites (`b4d03c`), eleven-file lint (`43376b`), typecheck (`e39f53`), three owned PostgreSQL checks and EN/FR browser journeys (`7cb558`) passed. Eight screenshots cover 1440/768/320 widths and 200% text. Source hashes stayed stable during the final browser run. Page and panel overflow, ordinary button hit-testing, keyboard submission, current permission removal, stale evidence, inline authentication and lost-response retry were checked. This remains bounded verification, not full accessibility or release certification. Development route-to-loaded-review observations were en 14567 ms, fr 16023 ms; no production budget or certification is inferred.
