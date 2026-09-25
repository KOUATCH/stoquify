# Reconciliation notification records — v93

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then **Reconciliation inbox**. Current reconciliation read permission and the tenant's module access still apply. There is no new approval, financial posting or permission control in this list.

The list contains the latest 25 recorded observations for the workspace, including observations assigned to other operators. It is not a personal unread inbox, a complete archive or proof of current readiness. Read the recording date and any due date, then inspect the current suspense/run record before acting. **Recorded** describes retained evidence; **High/Critical** describes the severity captured at that time. Exact amounts carry their own currency; an unavailable amount is not zero.

Different exception/suspense records within a run now retain separate observations. A repeated delivery of the same event keeps the original payload, hash, timestamps and correlation. A new proposal request or assignment audit identifies a new event. Run-ready delivery and dashboard observation now use the same key. Existing records are retained; the patch does not reconstruct notifications overwritten before this correction.

## What operators need

| Situation | Information needed | Where to obtain it | Action |
| --- | --- | --- | --- |
| Investigate an observation | Workspace, recording time, current suspense/run and its supporting evidence | Reconciliation workbench and retained suspense/run records | Verify current state before assigning, proposing or signing. Notification status supplies no authority. |
| Investigate a retry | Source operation's request reference or correlation, relevant record ID | The original workflow's retained audit/proposal record; authorized support logs | Retry the source operation using its existing recovery procedure. Do not edit inbox JSON or manufacture a new event to simulate delivery. |
| Earlier observations appear missing | Original run/exception/suspense IDs and retained audit evidence | Authorized domain records and audit history | Escalate for evidence-backed reconstruction. Older overwrite damage cannot be recovered from an already overwritten inbox row alone. |
| Need the complete notification archive or individual acknowledgements | The desired workflow and authorized operator role | Your operational process owner | These paths remain unimplemented; the visible latest-25 list is not proof they exist. |

No new input, subscription, signer, migration or live activation is required from the user for this code change. A production rollout remains separate from local verification.

## Delivery and recovery limitations

The dashboard still attempts SLA/close observations on read, with the existing 50-at-risk/25-ready-run limits. A failing notification write can still fail that dashboard read. This batch prevents overwrites and duplicate run-ready observations; it does **not** establish a read-only dashboard, a scheduler, complete deadline coverage, acknowledgements or delivery recovery. Those engineering tasks remain in scope. Daily SLA records retain the first observation for their existing day/type key; a later owner/severity change is seen in the current domain record rather than rewriting history.

The existing period-close notification is a broad signal, not an authoritative period-specific close decision. Its underlying trigger and wording require follow-up. Suspense resolution/reversal and retained export remain incomplete.

## Rollout and recovery

No schema changes, database backfill, external messages or deployment were performed. Existing compound organization/source/idempotency uniqueness provides atomic insertion. Notifications written through a domain transaction roll back with it. Logs are diagnostic and can precede transaction commit; the persisted record is the evidence.

Before rollout, run the focused notification/run/suspense regression tests and verify the actual tenant read boundary. Retain original notification rows and hashes. Monitor failed insert operations and caller transaction failures. Do not roll back by deleting notification history. If source rollback is necessary, restore the prior application artifact through the established release process, noting that it reintroduces overwrite and sibling-key defects. No independent statutory, accounting, security, accessibility or release certification is asserted.

## Engineering review responsibilities

| Responsibility | Finding / verification |
| --- | --- |
| Architecture, backend, distributed systems | Explicit event identity and atomic insert-on-conflict; concurrent PostgreSQL delivery and transaction rollback checked. Dashboard/background lifecycle remains incomplete. |
| Database, migrations, integrity | Existing unique constraint reused; no schema migration. Original retry bytes retained. Historical overwrite recovery requires source evidence. |
| Security, IAM, privacy | No new public mutation or authority; existing protected reads retained. Publisher rejects blank tenant; tenant-key independence checked. Diagnostic logs omit amount/owner payload. No new full access audit claimed. |
| Finance, reconciliation, ledger, close | Exact recorded currencies; existing suspense/run/ledger regressions passed. Notifications do not approve, resolve, reverse, post or close anything. |
| Audit and records | Retained first observation; distinct assignment audit/proposal request keys. Individual read receipts and complete archive are still missing. |
| Frontend, design, UX, accessibility, localization | Existing dashboard tokens/badges reused; explicit region, EN/FR snapshot labels, 25-record scope, exact amount fallback, mobile/tablet/200% text verified. No full screen-reader or contrast certification. |
| Product, operations, support | Operators can see separate events instead of overwritten siblings and avoid confusing an observation with current state. Remaining recovery paths stated above. |
| Quality and release | Unit/regression, owned PostgreSQL, real EN/FR browser, typecheck and changed-file lint evidence. No production build or rollout. |
| SRE, performance, cost | Duplicate writes no longer update rows/log a new record. Read-trigger delivery and bounded scans remain. Development timings are observations, not a performance improvement claim. |
| APIs, events, provider boundaries | In-app event storage changed; existing external ingestion/financial-operation contracts retained. No external communication. |
| SaaS modularity, packaging, billing | Existing module/read controls retained. No entitlement, package or price changes. |
| Statutory/OHADA/country rules | Not applicable to this patch: no statutory calculation, country rule or professional approval changed. |
| Purchasing/AP, HRIS/payroll, POS/offline | Not applicable to this patch: their operations/state machines are not modified. Fixtures use synthetic setup only. |
| Analytics/data governance | Recorded monetary strings retain precision; no cross-currency aggregation or new analytics dataset. |
| AI/agents | Not applicable to this patch: no agent tool or approval policy changed. |
