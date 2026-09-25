# Resumable reconciliation alert scan — v94

The staged worker scans overdue/near-due suspense records, runs awaiting sign-off, and broad close-review conditions for one organization. It records in-app observations only. It does not post, resolve, reverse, approve or close financial records, and it does not send external messages.

The current dashboard alert trigger **remains active**. Automatic approval review rejected removing it before a replacement worker is operational because that could leave reconciliation/SLA/close alerts undelivered. This safer staged implementation retains that trigger and uses its event keys, allowing both paths to coexist. No schedule or production deployment has been installed. The rejected removal has not been applied indirectly.

## What changed

- `services/reconciliation/payment-reconciliation-alert-scan.service.ts` stores tenant-scoped scan progress and processes 100 records per page without the old whole-scan 50-suspense/25-ready-run truncation.
- `scripts/reconciliation-alert-worker.ts` exposes explicit organization, worker and stable scan references. It returns exit 2 when more pages remain, 0 when complete, and 1 for a failed command.
- Each page's observations and checkpoint commit together. An interrupted or failed page resumes with the same scan ID. Concurrent workers serialize on that checkpoint. Completed scans replay without changing retained records.
- The reconciliation inbox shows the latest worker scan's absent, requested, incomplete, failed or completed state, recording times, examined records and newly inserted alerts. It does not claim an installed/running schedule or resolved business issues.
- The broad period-close observation now says that close conditions require review. Only actual period controls determine whether close is allowed.

## User procedure

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` and read the scan status within the reconciliation inbox. Existing role and tenant access apply. No new user-facing mutation or permission is introduced.

**No scan:** a worker pass has not been recorded for this organization. Existing dashboard delivery remains available, with its existing limits.

**Incomplete:** prior pages are committed; the operator should resume that scan. This is not proof a process is still running.

**Failed:** prior committed progress is retained. Ask the operator to inspect the scan and retry its original reference. The application does not expose raw database errors.

**Finished:** the stored pass ended. Check its dates and the actual current domain records. A finished pass is neither a current health certificate nor evidence that a scheduler exists.

## Operator inputs and their sources

| Input | Where to obtain it | Use |
| --- | --- | --- |
| Verified environment/database target | Existing deployment configuration owned by the platform operator | Explicitly verify this target before invoking the worker. Never paste credentials into the report or shell output. |
| Organization ID | Authorized organization administration or tenant registry | Scope every scan to one tenant; no implicit all-tenant run exists. |
| Worker ID | A stable, nonsecret identity assigned by the operator | Identify which internal worker most recently processed a page. This is not a user permission or approver signature. |
| Scan ID | Generate a UUID when starting a new observation pass; retain the returned ID in the scheduler job | Reuse exactly this ID for incomplete, failed or interrupted processing. A fresh ID starts a new pass. |
| Maximum pages | Operator execution budget | Integer 1–100, default 10. Each page handles up to 100 candidate records. Exit 2 requests continuation, not a fresh job. |
| Deployment host, cadence and alert owner | Platform/SRE owner and operational service expectations | Required before installing the replacement schedule and requesting trigger cutover. None has been approved or installed by this batch. |

The command source's usage is:

```text
reconciliation-alert-worker --organization-id <tenant-id> --worker-id <worker-id> --scan-id <uuid> --max-pages 10
```

Use the project's reviewed worker TypeScript runtime or its compiled deployment artifact. Runtime configuration must resolve repository imports and the server-only condition. Verification invoked the actual exported argument parser/executor and service under the existing isolated runtime; it did not certify a production shell/service launcher. Do not use the migration-bearing application build to start this worker.

## Durable state, boundaries and recovery

The existing `PaymentReconciliationInboxItem` compound tenant/source/idempotency uniqueness owns a control receipt keyed `operational-alert-scan:<UUID>`. `payloadSummary.worker` records the version, phase, cursor, start/update/completion dates, counts and safe error code. Its transport state is PROCESSED to keep generic financial/provider inbox leasing away; **worker.state is the scan lifecycle**. This receipt is excluded from the notification list by category filtering. No schema migration or backfill is required.

The candidate creation boundary and near-due cutoff are set at scan creation. Each page reads then-current statuses; this is not one atomic snapshot of all business records. Records created or becoming eligible behind an already processed cursor require a new pass. An old scan may be resumed for its original boundary, but must not substitute for a new current pass. Daily event keys retain the first observation of that type that day. An operator's current state must be checked in the underlying domain record.

Each page locks the control receipt and commits its alerts and progress together. A failed page leaves the last successful cursor intact and stores `ALERT_SCAN_PAGE_FAILED` if the database remains available. If the database itself is unavailable, failure recording may also fail; use the worker exit/log and inspect durable state after service restoration. The failure update cannot overwrite a concurrently advanced checkpoint. Retry uses the same ID and rechecks current source state for the next page.

The service is an internal host boundary with explicit tenant scope, not a public mutation endpoint. Access to its deployment runtime/database belongs to the existing infrastructure controls. Module deactivation does not silently erase retained obligations or their observation records. No customer activation or financial write is performed.

## Proposed cutover — held, not applied

1. Select and authorize a nonproduction worker host, environment target, cadence and responsible operator.
2. Deploy this staged worker through the existing release process. Preserve a pending scan ID across restarts/exit 2; resume failed jobs and generate a new ID only after a completed pass. Configure failure and stale-progress monitoring.
3. Verify actual scheduled trigger → processing → durable observations → visible dashboard status → failed-page recovery on that host. Verify a subsequent scheduled pass captures newly eligible records. A one-off successful test does not prove scheduling.
4. Present that concrete deployment evidence for approval. Then remove `deliverOperationalNotifications` and its read-path invocation from `payment-reconciliation-dashboard.service.ts`, retaining the read model/status and domain-transition notifications. Update EN/FR rollout text and prove repeated dashboard reads make no writes.
5. Before any live rollout, repeat the same handoff on its authorized target. Keep the old trigger until the replacement's operational coverage is verified. If recovery requires the legacy trigger, restore it through the release process without deleting scan/notification history.

Automatic approval review specifically held step 4 because no replacement schedule was operational. This batch does not claim the dashboard is read-only. Choosing an environment and approving this handoff are separate from ordinary remaining engineering work; the full workflow-modernization assignment can continue.

## Review responsibilities

The permanent review matrix in [the v93 guide](RECONCILIATION_NOTIFICATION_GUIDE.md) remains applicable, with these updates:

- Architecture/backend/database: paginated resumable scan, atomic page/checkpoint and serialized concurrency verified on owned PostgreSQL; no migration. Generic inbox leasing excludes scan receipts.
- Security/IAM/privacy: explicit internal tenant and worker identity; strict command input rejects supplied cursor/timestamp/completion claims. No new public authority or raw error display.
- Finance/ledger/close: notifications only; 205 suspense and 31 ready-run fixture coverage. Broad close signals are labelled as review conditions. No resolution/reversal/close authority inferred.
- Records/operations/SRE: durable failure/progress, interruption recovery, new-pass boundary and exit-code handling; actual deployed schedule, monitoring and cutover remain unverified.
- Frontend/UX/localization/accessibility: existing tokens, a status announcement and EN/FR failure/recovery guidance; actual mobile/tablet/200% text states verified. No screen-reader or contrast certification.
- Quality/release: focused tests, actual PostgreSQL and browser evidence; no production build/deployment or cutover.
- SaaS packaging, billing, statutory/country rules, POS/offline, AP, HR/payroll, AI/agents: not applicable to behavior changes in this batch; their permissions, calculations, prices and state machines are not modified. Synthetic AP fixture setup is not domain approval evidence.
- Analytics/data governance and provider/API boundaries: counts describe examined/created observations, not resolved cases; no new external transport, aggregation or commercial dataset.

Full inbox history/acknowledgements, historical overwritten-evidence reconstruction, suspense resolution/reversal/export and the remaining platform workflows are still incomplete.
