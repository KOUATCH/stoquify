# Close evidence notification delivery

Evidence date: 2026-10-04. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; shared working changes retained. Supporting milestone for FA-CLOSE-PACK and primary FA-CASH-COMMAND. Neither workflow is closed.

## Delivered behavior

Close missing-evidence requests, recipient replacements, submitted responses and accepted responses now have an actual durable in-app destination. Previously these producers created outbox messages without a Close consumer. The new `CloseEvidenceNotification` records a source-bound historical publication, not a personal read receipt, current readiness, approval authority or financial effect.

The worker uses the existing tenant-explicit outbox claim, exact lease, retry and acknowledgement contracts. Before publishing it checks retained and claimed payload hashes, the parent business event, tenant/finding/period/run/request linkage, response/acceptance references and the producer audit. A composite tenant/outbox foreign key and unique publication key constrain persistence. Retrying after a committed publication but lost acknowledgement returns the same publication without changing its timestamp. Corrupted sources do not publish.

The protected read service revalidates current account, organization, Close read/module rights and reviewer permissions. Current recipients can see request/acceptance observations; current same-organization reviewers can see the team feed, including submitted responses. Former recipients and inactive accounts do not retain access through an old notification owner. Original event ownership and request authorship are preserved. The same-organization team audience avoids losing review notifications when the original requester leaves.

The Close evidence workbench includes an EN/FR “Evidence updates” section. It uses dashboard components/tokens, neutral historical labels, accessible headings, a live loading/error region, wrapped references and keyboard-operable refresh/pagination. Pages scan at most 50 retained observations, with continuation even if filtering leaves no visible rows. Failed refresh clears displayed rows and offers retry; missing source records mark the result incomplete. No private response body is copied into the inbox.

## How to use it

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, select the accounting period and find the missing-evidence workbench. “Refresh updates” reads publications available under your current permissions. “Older updates” replaces the page with earlier observations. Use the workbench's existing request, response and review controls to perform work; an update itself authorizes no operation. Published timestamps are historical. Publication does not mean anyone has read or accepted a notification.

New events appear after the worker publishes them. This change installs no scheduler. The controlled runtime must select an authorized database and explicit tenant. A tested PowerShell CLI invocation pattern is:

```powershell
$env:TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}'
node --conditions=react-server -r ts-node/register/transpile-only -r tsconfig-paths/register `
  scripts/close-evidence-notification-worker.ts --organization-id <tenant-id> `
  --worker-id <unique-worker-id> --limit 25
```

The tenant ID comes from the controlled organization record; worker identity comes from the operator's job/run identity. Credentials belong in the existing runtime secret configuration. `--help` was verified with an unused local database URL and performs no claim or publication. Exit 1 means a failure/retry needs investigation; exit 0 does not prove all work is drained.

Inspect scoped outbox `status`, `attempts`, `availableAt`, lease and safe error fields. Automatic FAILED retries respect existing backoff; maximum attempts become DEAD_LETTER. Investigate retained source/audit evidence before any authorized repair/requeue. Do not mark a message SENT manually. The runtime's direct state changes are explicitly isolated fault injections, not an operator recovery API. A controlled dead-letter requeue UI is not supplied by this milestone. Historical messages already marked SENT without a publication are not silently backfilled; they require source reconciliation.

## Verification

| Check | Result and evidence |
|---|---|
| Focused Close regression | 673 passed, 27 suites, no failures/skips; [receipt](evidence/close-evidence-recovery-jest-182ff2bf-f1ba-4f67-900d-3e1a821f8a42.json) |
| Existing no-emit TypeScript check | Passed; [receipt](evidence/close-evidence-recovery-typecheck-39ab6fdf-b285-4b7b-84a1-a08593958c30.json) |
| Changed-scope lint | No errors; one preserved warning in `CloseEvidenceInvestigationPanel`; [receipt](evidence/close-evidence-recovery-lint-af9d7fe8-366c-473f-b6cb-97e8095e4005.json) |
| Prisma schema/client | `prisma validate` passed; local client generated, no deployment build invoked |
| Migration catalog / risk | Catalog ready; scoped static risk scan found zero findings; [catalog](evidence/close-notification-migration-catalog.json), [risk](evidence/close-notification-migration-risk.json) |
| Owned local migration | Exact additive SQL rehearsed with rollback, applied, and recorded in migration history. All 6,616 pre-existing outbox rows unchanged; [receipt](lanes/environment/close-notification-schema-793968df-1727-48c3-8c42-8f82b348bee9.json) |
| Actual PostgreSQL publication | Eight checks passed: publication, reassignment, departed-requester routing, independent acceptance, lost acknowledgement, real 15-second backoff, corruption/dead-letter/retry, revoked review rights; [receipt](lanes/environment/close-notification-delivery-75b10daf-13e8-4919-bde6-8a8f2385ea0f.json) |
| Actual authenticated application | EN/FR at 1440/768/320px, reduced motion, keyboard refresh, interrupted transport, removal of stale rows and successful retry; [receipt](lanes/environment/close-notification-delivery-browser-c52118d3-2cd0-4cfd-8f38-de86cd7b3c65.json) |

Receipts bind source before/after, actual browser build and observed financial/outside-fixture state. PostgreSQL foreign-tenant publication was refused by the composite constraint. Request comments, inbox publications and outbox records were unchanged by browser reads. Final browser ready times were EN 6.371s and FR 5.682s in the development fixture; the earlier cold EN read was 37.084s. These are observations, not an approved performance budget or speedup claim.

Actual [French mobile screenshot](lanes/environment/close-notification-delivery-browser-c52118d3-2cd0-4cfd-8f38-de86cd7b3c65-fr-320.png) was visually inspected; six final screenshots are listed in the browser receipt. The first browser attempt passed interactions but its mobile capture missed the region while the surrounding workbench changed height. The final capture waits for the workbench and anchors the visible heading. The earlier receipt `close-notification-delivery-browser-e6c5970c-96ed-425a-a4f5-fc5c7a18bb45.json` is not the accepted mobile visual evidence.

Failed attempts retained: initial schema validation rejected a too-long index name and insufficient one-to-one uniqueness; both were corrected before application. Initial lint rejected an unsupported test lint directive; it was removed and the new effect warning corrected. Initial runtime `close-notification-delivery-0602123d-417c-40cf-8da6-70306e3c3395.json` passed five scenarios but its monkey-patched storage failure did not reach the interactive transaction. The final run uses a temporary constraint scoped to one synthetic outbox row, removes it in `finally`, and proves actual backoff/recovery. The normal catalog writer failed to open the existing file; the catalog was generated using the same repository function through an existing-file handle and validated.

## Rollout and recovery

Migration: `20261004000000_close_evidence_notifications`; SQL SHA256 `d7ff57b0070851dd095ae6d4da6797bae46420a2108cb686b2d5d3912f3b4d3b`. Only `stoquify_local_registration_20260906_01` on the owned loopback instance was changed. No approval registry was edited.

For a separately authorized target, use the repository migration/release controls, review existing outbox volume and index-lock duration, apply the additive migration before application/worker rollout, then observe one permitted tenant cohort. This verification does not authorize that deployment. The new restrictive foreign key prevents deleting a retained publication's source outbox through an ordinary cascade; retention/deletion workflows must account for it.

For application rollback, stop the Close worker and revert the new inbox surface/service deployment while retaining the additive table and source records. Existing producers continue queueing messages. Resume only after schema/client compatibility and source integrity are confirmed. Do not drop a populated destination or reset outbox state as a shortcut. The local rehearsal's rollback happened before real publication and is not proof that deleting live history is safe.

## Remaining scope and review

The same-organization destination and leased publication path are verified. Delegated accountant inbox projection, pending-request recipient-replacement/evidence-recovery compatibility, scheduled operation, operator dead-letter recovery, wider capacity/races and native assistive-technology/true zoom checks remain. Other Close notification event types are deliberately not claimed as delivered. No external email/SMS/read receipt or live approval was created.

Architecture/backend/data/security/UX/product/QA/SRE/audit reviews apply to the boundaries above. Finance: publication produces no journal/payment effects; measured fixture financial fingerprints match. Commercial packaging: existing Close grants retained, no price/subscription change. Statutory/tax/payroll, offline/edge providers and AI behavior: not applicable to this notification-only correction. No professional or release certification is claimed.

The overall workflow goal stays active: 270 discovered workflows, discovery incomplete, 191 unmapped entries, 264 Queued, two In progress and four Complete—verified. Next engineering action: integrate delegated accountant visibility and replacement/recovery compatibility while preserving the actual published observation and current client mandate.
