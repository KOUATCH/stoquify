# Reconciliation overview and older work — v92

Routes: `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`.

## Interpret the overview

The durable summary covers all retained records in the current organization, across all dates. It is separate from the legacy capture-workbench date filters. Provider-account, signed/awaiting-signature, exception and unresolved suspense totals no longer use the first page as their denominator. Recent runs still reports the size of the explicitly labelled recent list.

Suspense amounts are grouped by their recorded currency. USD and XAF are never added together or presented as if converted into the workspace currency. The database aggregates Decimal values and the interface preserves exact cents even when a total exceeds JavaScript Number precision. Counts and grouped amounts come from one repeatable-read database snapshot. The displayed source time is the start of that summary read; individual detail lists may be read slightly later.

Unresolved suspense, open exceptions and unfinished/failed runs take precedence over retained signed runs in the overview status. **Signed runs retained** means those records exist; it is not certification of the organization or of all newly received evidence. **Needs attention** counts review signals across exceptions, suspense and unsigned runs. Related records may concern the same case. Actual period-close and sign-off controls still decide whether particular work can proceed.

## Work on an older item

Open **Browse all records**, find the record with Next/Previous, choose **Inspect record**, then **Work on this record** when its status and your permissions permit. The selected item replaces the priority list while you work. Assign it or edit and propose using the existing controls. A successful change reloads the selected record from the protected server read model before further work.

If that reload fails after a saved change, the interface says that the change was saved and disables further selected-item writes until a successful refresh. A failed manual refresh has separate read-failure guidance and does not claim a save. Draft reasons and original request IDs retain the existing tab-scoped recovery behavior. After page reload, reopen the older record through history; its saved draft is restored. Closing selected work returns to the priority queue and does not cancel any server operation.

Read-only inspection of posted or terminal records explains that no new approval is requested. A retained pending approval uses its original request and the existing explicit retry workflow. Independent-checker, fresh-auth, tenant, current permission, module, period, stale-review and idempotency controls remain effective.

## Inputs and responsibility

| Case | Required information | Where to get it / owner | Action |
| --- | --- | --- | --- |
| Summary differs from the visible list | Current organization, currency, list scope and read time | Operator; scope description and retained history | Compare like-for-like counts; recent lists are intentionally bounded. |
| More than one currency | Recorded amounts/currency for each source | Accountant/operator; suspense source records | Review each currency separately. An authorized FX workflow is required for conversion. |
| Old assignment/proposal | Source reason, current account mapping, current record revision | Maker; source evidence and protected history record | Select work, assign, edit/propose; explicitly rebase if the evidence changed. |
| Save succeeded but refresh failed | Original request and actual saved record | Maker/checker/support; retained request and server record | Refresh without submitting a new change; inspect saved outcome first. |
| Plain refresh failed | Current workspace and original source reference | Operator/support; access settings and record | Resolve the read error; no save is implied. |
| Close or sign-off questioned | Selected period/run and current supporting evidence | Accountant/checker; dedicated close/run controls | Follow the real control result, not the overview count. |

## Rollout and limitations

Deploy the summary service, dashboard contract, amount formatter, queue/workbench components and EN/FR messages together. `openSuspenseAmount` is replaced by `openSuspenseByCurrency` in this dashboard contract so consumers cannot silently sum unlike currencies. No schema migration, backfill, provider activation, deployment, live payment or X1 clearance is included. Preserve the server posting and approval evidence on rollback; do not relax controls to recover the view.

Architecture/backend/data/API: service-owned aggregate snapshot and explicit currency contract. IAM/privacy: existing protected tenant/actor interfaces and selected-record isolation. Finance/audit: exact amounts, no conversion, unchanged posting rules and a clear distinction between review signals and domain decisions. Frontend/UX/localization: shared tokens, retained-only copy, current record refresh and bilingual error recovery. QA/SRE: focused regressions, database invariants, actual EN/FR journeys and source-bound evidence; development timings are observations only. SaaS packaging: existing module admission unchanged.

Not applicable to behavior changes in this batch: statutory/country computation, POS/offline, purchasing/AP, HRIS/payroll, analytics calculation, AI/agents and external provider execution. Their platform reviews remain required.

Remaining: complete suspense resolution/reversal/export, account/setup editing, direct journal navigation, notification delivery/read lifecycle, full screen-reader/contrast audit, broader query-cache/summary families and the remaining workflow register. This batch does not certify any full platform workflow or production performance.
