# Close notification operations and audited recovery

Evidence date: 2026-10-04. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Shared changes preserved. FA-CASH-COMMAND remains primary, FA-CLOSE-PACK supporting. No whole-workflow closure is claimed.

## Correction and operating contract

The Close outbox already had tenant-explicit worker claims, expiring leases, backoff and source-validating publication. It lacked a role-appropriate application view and durable manual recovery command for exhausted attempts or older acknowledged events without a destination. These are now integrated into the existing Close evidence workbench.

**Notification delivery controls / Contrôles de diffusion des notifications** loads a bounded, period-scoped read model on demand. It shows queued, processing, deferred, acknowledged, failed, exhausted and cancelled states separately from matching durable publication. It exposes attempts/current limit and a next-eligible time when backoff applies. No raw payload, original error message or private source body is returned. Database errors remain errors. Home-tenant reviewer authority and module eligibility are rechecked before and after the read; delegated history access does not grant these same-organization operational controls.

The strict server action derives tenant, actor and session from trusted authentication. Retrying requires the existing Close reviewer and read permissions, writable Close access, current accounting access and persisted password assurance within five minutes. The service takes existing organization/module/user/role/session authority locks through commit, then a correlation lock and an exact outbox row lock. It revalidates time-sensitive authority after waiting. A source/processing revision binds the command to the operator's preview.

An authorized retry changes only processing state, eligibility time and—when the previous budget is exhausted—the attempt ceiling. It preserves the current attempt count, original event/payload/hash/idempotency key, retained failure information and domain records. An atomic audit records actor, reason, exact command, previous state/budget and source hash. Identical requests return the original audit result; a changed command under the same correlation is rejected. Concurrent different requests are rejected once their preview becomes stale.

Retries do not steal worker leases, override automatic backoff, resurrect cancelled/deferred work, rewrite source evidence or approve Close findings. Acknowledged records with matching publication need no retry. Acknowledged records without publication can be explicitly reconciled through the existing worker. Inconsistent payload/publication bindings require investigation. The worker remains responsible for full original request/response/acceptance and audit validation before publishing. An invalid source cannot gain publication merely because a retry was queued.

The UI uses existing dashboard tokens and secondary controls, text-based states, inherited layout and EN/FR copy. It preserves an exact pending command after uncertain transport, including through password step-up. Revoked permission or session expiry clears visible records and the password. Successful queueing is reported as a retry request, not successful publication. There is no new schema or migration.

## User and operator guide

1. Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, select the relevant period, then open **Notification delivery controls** in the evidence workbench. Your organization's current Close reviewer/read permissions and module access are required. Write actions require writable access.
2. Compare processing state with publication. “Processing acknowledged” alone is insufficient if the screen still shows no verified in-app publication. Publication is a historical observation, not a personal read receipt or current evidence approval.
3. For an available retry, investigate the original operational problem first. If source bindings need review, use the existing retained evidence investigation process; do not edit the event payload to make it pass. Locked work belongs to the worker; cancelled/deferred work belongs to its original policy. Backoff remains effective until its displayed time.
4. Choose **Review retry**, explain what was investigated or restored, and submit. Confirm your current password when prompted. This confirmation is identity evidence for the processing command; it is not professional approval of accounting records.
5. If the result is uncertain, use **Request retry** again without changing the pending command. The retained correlation recovers its recorded outcome. If the preview is stale, refresh and review current state before a new request.
6. A queued retry requires the configured worker to run. Refresh delivery status afterward to observe actual publication. The existing CLI is `scripts/close-evidence-notification-worker.ts`; see [the delivery runbook](CLOSE_NOTIFICATION_DELIVERY_2026-10-04.md) for the explicit tenant/worker arguments and isolated invocation. Use only an authorized database target. This change does not install a production scheduler.
7. For further investigation, retain the request/outbox reference, period, observed status, retry reason and the audit recorded under `CLOSE_NOTIFICATION_RETRY_REQUESTED`. Audit records preserve the original command and processing state. Do not reset attempt counts or delete historical publications.

Inputs the organization must supply: an actually authorized operator account, its own tenant and period, a factual reason describing the investigated failure, and a legitimate running worker configured for that tenant. Obtain account/role and target configuration from the organization/platform administrator; obtain source references from the actual Close record; obtain the failure explanation from the investigated storage/service incident. No fabricated approval, credentials or source URI is accepted.

## Verification

| Check | Result and current receipt |
|---|---|
| Focused regressions | 741 passed in 31 suites; zero failed/skipped. [Receipt](evidence/close-evidence-recovery-jest-3e0c6d31-8382-47b5-9995-9a48f10e297b.json) |
| TypeScript | No-emit check passed. [Receipt](evidence/close-evidence-recovery-typecheck-40e01090-8c81-4197-8464-a020f9f8c872.json) |
| Lint | No errors; one existing unrelated investigation-panel ref warning retained. [Receipt](evidence/close-evidence-recovery-lint-4c69b128-45df-4896-ae9b-d7556cf11242.json) |
| Owned PostgreSQL | Six scenarios passed. [Receipt](lanes/environment/close-notification-operations-880dae8c-8e04-4779-83f9-094eab3467f1.json) |
| Actual EN/FR browser | Both complete retry/publication journeys passed at 1440/768/320px. [Receipt](lanes/environment/close-notification-operations-browser-b0d97c36-5a06-4323-a5e8-f20c49c98280.json) |

The database scenarios cover persisted fresh authority and object isolation, concurrent identical requests producing one audit, immutable retry and actual single publication, exact replay after worker completion, legacy SENT-without-publication reconciliation, backoff/stale-preview refusal and current role revocation. Financial and observed outside-fixture fingerprints match. Original payloads and attempt history remain retained.

The browser used actual synthetic password login and deliberately expired its persisted assurance to require the real step-up action. The recovery request committed before its network response was deliberately dropped. The visible uncertain state retained the exact command; manual resubmission recovered the original outcome with one audit. The actual worker then validated and published one notification, and refresh showed matching publication. Current role revocation cleared records; restored role recovered the authorized view. Original comments, events and outbox payload/hash/idempotency records, financial and observed outside-fixture fingerprints remained unchanged.

Six screenshots are retained. The [French 320px screen](lanes/environment/close-notification-operations-browser-b0d97c36-5a06-4323-a5e8-f20c49c98280-fr-320.png) was visually inspected: long French status/guidance text, attempt counts and retry controls reflow without horizontal overflow. Keyboard opening, heading focus, password focus and reduced motion were checked. Native assistive technology and actual browser zoom remain unverified.

Cold EN development route readiness was 76.287s; FR was 14.987s. These slow local measurements remain limitations, not performance acceptance. Source bindings and generated Close route SHA256 `76550be25cae6400ad344df8d3368ab4381c5ae9eaa80a9c1709a0593c98a7f4` are retained in the browser receipt. The temporary loopback app was stopped after verification.

Initial failed attempts remain evidence: [first Jest receipt](evidence/close-evidence-recovery-jest-a23f6982-81a1-4159-b1d6-6cd50ce4e2a2.json) needed the parent component's new server-action import mocked at its existing test boundary; [first typecheck receipt](evidence/close-evidence-recovery-typecheck-8546af70-35f1-49bd-99b5-e514994a4841.json) caught the UI assuming the domain password result rather than the established action result. Both were corrected before browser execution. No production authorization or domain behavior was weakened to pass checks.

## Rollout and remaining scope

This adds application read/recovery behavior to the existing outbox and notification schema. Rollout still requires a separately authorized target with the existing notification migration and generated Prisma client. Recovery audits and publications must remain retained if the UI/service is rolled back. Already queued retries are legitimate durable commands; removing the screen does not cancel them. Any suspension or cancellation must follow the owning operational controls, not destructive database edits.

A scheduler/service deployment, representative capacity and queue age observations, native assistive technology, true browser zoom and broader interruption/authority races remain. The original Cash/Close producer and recovery closure checklist remains unchanged. No live tenant, real approval/payment, outbound message, X1 clearance or whole-workflow certification is implied.

Architecture/backend/data reviews: existing outbox, retained source and audit mechanisms reused; no second delivery store. Security/privacy: current tenant/role/module/session locks and bounded redacted output. Finance/audit: processing-only writes with retained immutable sources and measured financial fingerprints. UX/localization: actual status, actionable retry guidance, EN/FR failures and responsive controls. SRE/release: explicit worker dependency and preserved failed evidence. Packaging: existing module controls retained. Statutory/country calculations, payroll/POS/offline transports and AI behavior are not applicable because their behavior and data are unchanged. These are engineering checks, not professional certification.
