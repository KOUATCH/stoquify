# Suspense history and off-queue recovery — v91

Routes: `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`.

## Find a retained record

Choose **Browse all records** in the suspense queue. History includes current and terminal states, ordered by creation time and ID, 25 records per page. Use Next/Previous, then Inspect record. The account code/name and retained journal reference help identify the posting. A posted record without a retained request is inspected without a posting button.

History is a current read, not a frozen export or certification. Refresh/reopen history for new records. A journal's recorded entry date is distinct from approval time. If matching retained journal evidence is missing or ambiguous, the date is unavailable; the application does not substitute today's date. Inspection does not establish that all posting controls or accounting rules have been independently certified.

## Resume a request that left the queue

The work queue remains a prioritized 25-item view. **Resume retained request** now looks up the original item directly using the current protected organization and actor, even if it is outside that queue. Review current server facts and use **Retry retained approval**. Existing permissions, module admission, fresh authentication, independent checker, reviewed revision and ledger/receipt checks remain authoritative. A changed or unavailable record does not discard the local request.

| Situation | Input needed | Owner and source | What to do |
| --- | --- | --- | --- |
| Find old work | Item ID or approximate creation order | Operator; source record or retained request banner | Browse history or resume the saved request. |
| Unknown approval outcome | Original reviewed revision, current identity and journal outcome | Checker; tab recovery plus protected server records | Resume; authenticate if requested; explicitly retry. Do not create a second approval to work around an uncertain response. |
| Posting date unavailable | Original journal/source linkage | Accountant/support; journal, posting batch and source records | Investigate the mismatch. Never enter an invented historical date to clear the display. |
| Account name unavailable | Current account reference and tenant chart | Accountant/admin; organization chart of accounts | Check the account mapping through its authorized setup workflow. History does not alter account setup. |
| Record lookup denied/failed | Current organization, role/module eligibility and original request | Admin/support; access settings and retained request | Restore legitimate access or resolve the read error, then retry. No server result is inferred from browser storage. |

## Rollout and recovery

Deploy the new read service, dashboard mapping, protected action, history/queue components and EN/FR messages together. No schema migration, backfill, subscription change or production activation is included. History queries are tenant scoped, bounded and read-only; opening history does not deliver operational notifications. The existing dashboard still has its separately tracked notification-on-read behavior.

Retain server journals, approval/inbox evidence and browser request references if investigation is required. Roll back the coordinated UI/read implementation if necessary; never weaken authority or fabricate successful approval. Tab storage still does not provide cross-device persistence.

## Engineering review and remaining scope

Architecture/API/data: shared queue/history presenter prevents two date interpretations; keyset pagination covers tied creation times. IAM/privacy: protected actor/tenant scope, read module admission and current permission gates; scoped lookup rejects foreign objects. Finance/audit: retained journal dates/references are shown without changing posting/reversal rules. UI/UX: shared tokens, EN/FR copy, focus return, responsive controls, explicit read failures and retained-request retry. QA/SRE: source-bound tests, isolated database checks and actual-browser evidence; observed development timings are not a production budget.

Not applicable to behavior changes in this batch: statutory/country rules (no new accounting interpretation), POS/offline, purchasing/AP, HR/payroll, analytics, AI/agents, external provider operations and SaaS billing (no domain mutation). Their full-platform reviews remain required.

Still required: editing/assignment of all older off-queue work, full resolution/reversal/exports, ledger detail navigation, full screen-reader/contrast verification, notification lifecycle, exact whole-population dashboard totals, standalone suspense close obligations and other platform workflows. History pagination and off-queue approval recovery do not establish completion of these workflows.
