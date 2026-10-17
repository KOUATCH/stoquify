# Retained delegated Close notification history

Evidence date: 2026-10-04. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Existing shared changes preserved. FA-CASH-COMMAND remains primary and FA-CLOSE-PACK supporting. This closes the bounded retained-history criterion, not either workflow.

## Delivered behavior and boundary

Previously the delegated desk exposed publications only while requests remained in its open-work projection. Accepted requests disappeared from that view, taking their visible publication history with them. The accountant portfolio now keeps an authorized client entry even when it has no open requests and offers **Notification history / Historique des notifications**.

The new service reads actual retained `CloseEvidenceNotification` records across the client's periods, including publications associated with accepted or closed work. It uses the existing persisted home-account/permission/module and client-mandate checks before and after each page. A Repeatable Read transaction checks current client existence and source request/period/outbox bindings. Only minimal request reference, period name, event stage and publication time leave the service; private request/response bodies, payloads, employee identifiers and approval notes do not.

Pages contain at most 50 scanned records, with one look-ahead record. The descending time/ID cursor is versioned and bound to the home organization, client and actor; it grants no access. Inconsistent source rows are omitted with an explicit incomplete-page message. Pagination advances over invalid scanned rows rather than looping on them. Database failures propagate as errors, never successful empty history. Tests verify denial before reading and denial after a read if current authority changes.

The protected server action derives the actor from its trusted context and rejects form-supplied authority. The interface loads history only on request, avoiding eager fan-out across all client histories. Older pages replace the current page; latest-publication refresh clears stale rows while reauthorizing. Revocation clears that client's history/work/detail. Closing history clears its data and returns focus to the trigger; late replies cannot reopen it. An unrelated review draft is not reset merely by opening historical publications.

The inline section uses existing dashboard secondary buttons, borders, text tokens and inherited theme. History uses text labels and UTC times, without success-colored approval or health claims. EN/FR copy explicitly distinguishes historical in-app publication from current readiness, a personal read receipt or permission to act. This is a disclosure, so modal focus containment is not applicable. No new design system, schema, migration or external transport was introduced.

## How to use it

1. Open `/en/dashboard/accounting/accountant-portfolio` or `/fr/dashboard/accounting/accountant-portfolio` as an authorized reviewer. The existing home permissions, module access and current client review mandate are required.
2. In the evidence review desk, find the client and open **Notification history**. A client can still appear here when the open-work queue is empty.
3. Read the event stage, request reference, period and publication time. Acceptance is a historical event; it does not certify the current period or authorize a new operation.
4. Use **Older publications** to continue through retained records, or **Latest publications** to reload from the newest authorized records. A failed load offers retry and does not report zero rows.
5. An incomplete-page message means retained source records need investigation through the existing client Close investigation/recovery process. Preserve originals and obtain the real independent decision required by that process.
6. If access is revoked, the client data disappears. Restore a legitimate mandate through the existing access process, refresh the desk and reopen history. A known request ID or copied cursor cannot restore authority.

No additional customer input is required for this implementation. A live organization's identity, review mandate and retained evidence remain its real operating prerequisites. The prior [delivery guide](CLOSE_NOTIFICATION_DELIVERY_2026-10-04.md) describes the existing worker and migration prerequisites; this work does not enable scheduling or substitute an approval.

## Verification and limitations

| Check | Current result and evidence |
|---|---|
| Focused tests | 716 passed /29 suites, zero failed/skipped. [Receipt](evidence/close-evidence-recovery-jest-a0c352a2-fa21-4063-b940-4a0e959f4e47.json) |
| TypeScript | No-emit check passed. [Receipt](evidence/close-evidence-recovery-typecheck-64e1e598-7198-4489-8852-0a00bc2feac1.json) |
| Lint | Zero errors; one existing unrelated investigation-panel ref warning retained. [Receipt](evidence/close-evidence-recovery-lint-f1b1cd8e-3146-4ce2-9fbb-16f0013b2c50.json) |
| Fresh fixture predecessor | Seven existing delegation/reassignment/recovery/publication checks passed. [Receipt](lanes/environment/close-delegated-notification-b4bc2fef-c9b1-4f0c-ac70-e1a4929718dd.json) |
| Owned PostgreSQL history | Four scenarios passed: initial historical read, actual independent acceptance of both requests, revoked/restored mandate and inaccessible client/cursor isolation. [Receipt](lanes/environment/close-delegated-history-ae7171f7-3af3-435b-bbcd-d54c877a4a89.json) |
| Actual application browser | EN/FR passed at 1440/768/320px; history remains discoverable after zero open work, keyboard opening/focus return, transport failure/retry, actual mandate revocation/removal and authorized restoration. [Receipt](lanes/environment/close-delegated-history-browser-b6648be5-abea-4566-852a-0a80987a25a1.json) |

Actual acceptance ran through the domain service with an independent synthetic firm reviewer, persisted session, password step-up and current mandate. Durable publication ran through the real Close notification worker. Both requests left the open queue; the authorized client entry remained and seven historical publications were readable, including two acceptance events. Original comments and publication/outbox records remained unchanged during browser reads. Financial and observed outside-fixture fingerprints matched before/after both runtime and browser checks.

The first history runtime [receipt](lanes/environment/close-delegated-history-0b087f35-f903-492d-84b8-9085f00dc2b8.json) is retained as **failed**. Acceptance/retention and revocation passed, but its negative test incorrectly expected a reviewer's own firm to be inaccessible. Existing same-organization authority legitimately allowed an empty read. The assertion was corrected to an inaccessible client and the full history lifecycle rerun using a fresh, hash-bound synthetic predecessor. No authorization behavior was weakened and no failed result was republished as a pass.

The seven-row service read took 45ms locally. Browser EN cold route readiness was 34.089s and FR 3.647s; opening history took 919ms/906ms respectively. These are development-fixture observations with no representative capacity or production budget claim. The browser receipt binds current sources and generated portfolio route SHA256 `75ba8d964fec7b4c90650fd0920b2f9db4f8ed54317b03294af1f1b2b36b1231`.

Six actual screenshots are retained with the browser receipt. The [French 320px history](lanes/environment/close-delegated-history-browser-b6648be5-abea-4566-852a-0a80987a25a1-fr-320.png) was visually inspected: long French text and request references reflow, accepted publications are readable, and focus is visible. Reduced motion and no horizontal overflow were checked. Native screen-reader use, true browser zoom, representative high-volume pagination and full accessibility certification remain unverified.

## Rollout, recovery and remaining work

This is an additive application read/UI change. Deployment still requires the separately authorized target, existing Close notification migration and matching generated Prisma client. No migration was applied this turn. The local browser app uses only the owned loopback registration database and network fence; no production target, real approval/payment, outbound message or X1 clearance was used.

To roll back this feature, remove its action/service/component and the corresponding portfolio history entry while keeping durable notifications and original domain records. Do not delete accepted evidence or change open-work status to recreate a historical view. Forward correction is preferable if the problem concerns a source discrepancy. Historical records prove past publication, not present operational health.

Next engineering criterion: controlled notification operator visibility and recovery, including queued/failed/dead-letter states and safe retry of retained events. Scheduling, older SENT-without-publication reconciliation, broader concurrency/capacity/accessibility, and all original Cash/Close producer/authority/recovery requirements remain. Workflow counts remain 270 discovered, 4 Complete—verified, 2 In progress and 264 Queued, with discovery incomplete and 191 unmapped source entries. Full goal remains active.

Review responsibilities applied: architecture/backend/data—bounded service-owned history and retained source consistency; IAM/privacy—current authority and minimal output; finance/audit—unchanged financial records and no inferred certification; frontend/UX/localization—semantic tokens and recoverable EN/FR disclosure; QA/SRE—failure propagation, measured local timings and source-bound evidence; packaging—existing module enforcement retained. Country/statutory calculation, payroll/POS/offline providers, external billing and AI behavior are not applicable because this read-only history changes none of their behavior. These are engineering checks, not professional approvals.
