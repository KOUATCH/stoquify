# Preparing a reviewed reconciliation run

Routes: `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`. Preparation records a review and readiness transition. It does not sign, pay, clear suspense or post a journal.

## Inputs and responsibility

| Needed input | Where it comes from | Who supplies or resolves it |
|---|---|---|
| Current workspace and access | Signed-in membership, roles and current module configuration | Workspace administrator; reconciliation read/run permissions and accounting evidence access as appropriate |
| Run | The preparation run list; filter by run ID or provider name | Reconciliation operator; choose All to find signed/historical runs |
| Current source evidence | Provider callbacks, imported statement lines, matched payments and retained decisions shown through reconciliation | Provider/import and reconciliation operators; the service checks completeness |
| Financial/setup prerequisites | Provider setup, settlement-account controls, open accounting period, exception and suspense treatment | Authorized provider, finance and accounting owners |
| Review reason | Your explanation of the actual evidence and obligations reviewed | Preparing operator; 5–2,000 characters, no invented approval or copied secrets |
| Fresh authentication | Your own account password when prompted | Preparing operator; the server enforces freshness |
| Independent signature | Separate signing review after preparation | A different authorized signer, subject to all required separation rules |

## Normal journey

Open preparation, select the run and read the current state and retained history. Enter the review reason, then check preparation conditions. Resolve any named prerequisite through its owning workflow and refresh the preview. Do not replace missing evidence with a final status label.

When the current preview permits preparation, submit. Authenticate if requested, then explicitly retry the retained request. A successful result identifies its receipt and the run's current status. Pass the ready run to an independent signer. If another operator changed the evidence, review the new state before submitting a new request.

After successful authentication, focus returns to Retry when it is available, otherwise to the review panel. Authentication never submits preparation automatically. A rejected password or interrupted authentication shows the authentication error, clears the password and returns focus to that field; the reviewed request remains retained.

Current module access is checked again during the transaction. Read-only access may permit history but does not permit preparation. When the UI explains unavailable write access, ask the administrator to review reconciliation and required finance/accounting capabilities, then refresh the preview after restoration.

## Failure and recovery

For a lost response or uncertain outcome, keep the pending request and use Retry. Reloading the same workspace, account and run preserves it. An exact retry returns the original receipt if preparation already committed; it does not restore an old status over a later signature or recovery.

If a retry is stale, inspect current history and refreshed evidence. Use the explicit reset/new-review path only after checking the actual outcome and deciding to start a new review. A changed request cannot borrow another actor's idempotency key.

A failed history read displays an error and retains the prior page as previously retrieved information. Refresh to obtain current records. A damaged receipt fails the read; an empty list is not substituted. No browser message establishes success if the server did not confirm it.

## History and retained records

History has 20 records per page. Use Next and Previous; after either page request, keyboard focus moves to the labeled history region, including on failure. The run selection survives reload. Back returns to run discovery; Close returns focus to the preparation entry control.

Run discovery also returns focus to its labeled list after a page or search request, including failed reads. Failed queries retain their previous results with a freshness explanation; use the offered read retry to obtain current results.

Historical preparation receipts remain readable after signing when current read access permits it. They prove the recorded review, not current readiness or a signature. Signature export belongs to the separate signing workflow. Current permissions and tenant scope apply to every page and export.

Legacy records marked Resolved or Dismissed without verified decision lineage remain blocked for source-evidence review. PR-17 owns missing investigation/legacy repair adapters; an administrator must not invent a receipt or edit statuses to make preparation pass.

## Operational limits

These changes require no schema migration. Verification uses an owned local database with synthetic records and blocked external requests. Production deployment, live activation and notification scheduling retain their existing controls. Current engineering proof is not statutory, security or accessibility certification. Native screen-reader speech and browser-chrome zoom remain unverified; the recorded checks cover keyboard, semantics, rendered contrast, responsive layout and controlled text enlargement.
