# Notifications and communication discovery

Status: read-only source discovery, 2026-09-05. No application/test/schema changes, tests, browser visits, database operations, worker runs, or external sends. Current CS retention plan remains queued for a separate post-freeze assignment.

The register contains 16 semantic workflows. None is runtime-verified by this lane. Statement delivery overlaps the customer-supplier register and must be deduplicated when reporting platform coverage. Auth email and recipient onboarding remain with their owning lanes.

## Current systems

- The global provider handles transient feedback in React memory (maximum five by default, timed dismissal); sound is the only stored preference. Notification settings honestly describes this limitation. It is not a durable or multi-device inbox.
- The dashboard legacy bell has a different input and currently receives no source data. Its nonempty Mark it Read handler is a disconnected no-op that emits success.
- Reconciliation publishes durable tenant-level alert rows into its existing inbox. The workbench displays eight; no read/dismiss/preferences action was found. Loading the dashboard also publishes alerts.
- Customer statements, accountant invitations and WhatsApp receipts use durable domain/business outboxes. Their provider adapters and conditional leases are implemented, but configuration, scheduling and real delivery were not verified. SENT means provider acceptance.
- Signal digest/preference helpers and receipt-send service exist without current production callers found. Print/email/SMS receipt adapters are explicit stubs. Exported helpers do not establish an operational feature.

## Findings to reproduce after freeze

- **NTF-F01 — Legacy bell disconnected; supplied-row read handler reports false success.** Normal shell shows empty independent of provider queue. Nonempty legacy handler does not persist or remove anything. Status: source_confirmed_not_runtime_reproduced.
- **NTF-F02 — Normal settings samples claim a real payment/security event without test labeling.** Payment received and privileged action queued for review are synthetic local calls with business-looking source types. Development-only demo guard does not cover these controls. Status: source_confirmed_not_runtime_reproduced.
- **NTF-F03 — DEFERRED messages are excluded from all communication claimers and no controlled requeue path was found.** Providing missing provider configuration alone does not resume previously deferred messages. No production recovery was executed. Status: source_confirmed_missing_path.
- **NTF-F04 — External acceptance before durable completion can cause duplicate sends on retry.** Statement email lacks provider idempotency identity; WhatsApp adapters expose none. Five-minute lease reclaim plus no heartbeat or request timeout can overlap slow sends. Accountant email does supply an Idempotency-Key; provider retention guarantees remain unverified. Status: source_evidenced_failure_scenario_not_executed.
- **NTF-F05 — WhatsApp receipt worker does not reapply current fiscal-delivery blocking state.** Initial queue checks certification, but a changed blocked certification between queue and worker is absent from fingerprint and worker decision. Focused test required; no send attempted. Status: source_confirmed_missing_revalidation.
- **NTF-F06 — Statement/invite validation exceptions update transport status without corresponding domain delivery state.** Invalid/expired evidence may leave domain status QUEUED while outbox is FAILED/DEAD_LETTER; verify intended read-model precedence and append failure evidence. Status: source_confirmed_failure_path.
- **NTF-F07 — Customer statement UI creates fresh command identity and consent timestamp on every retry.** If queue committed but response is lost, user retry produces another valid delivery/token/outbox rather than replaying the same request. Share with CS lane. Status: source_evidenced_failure_scenario_not_executed.
- **NTF-F08 — Signal digest helper uses immediate-notification suppression and ignores configured timezone.** digestOnly removes noncritical signals even when building a digest; quietHours uses UTC despite timezone field. Digest output org/user are not compared with preference identity. No production caller found; not a demonstrated leak. Status: latent_unconnected_service_defects.
- **NTF-F09 — Session notification queue lacks actor/tenant binding and reset.** Provider remains global with business labels/amounts in local memory; actor or tenant switch lifetime must be tested before claiming isolation. Status: source_risk_runtime_needed.
- **NTF-F10 — Shared transient notifications lack a live-region role and contain English-only controls.** No role/status/aria-live found in notification tree; New, High priority, Dismiss and convenience strings remain English. Actual assistive-technology and EN/FR behavior not tested. Status: source_confirmed_accessibility_localization_gap.
- **NTF-F11 — Reconciliation notification view has no acknowledgement or preference persistence.** Every publication upserts UNREAD; repeated dashboard loads increment attempts and refresh processedAt. UI shows only eight without acknowledgement; domain read triggers writes. This may be intentional shared alert behavior but must not be presented as a completed user inbox. Status: source_confirmed_partial_workflow.

## Bounded next verification

Use fake providers for failure windows before any approved external delivery. Reproduce a provider-accepted/DB-completion-failed retry; stale lease overlap; provider-disabled -> DEFERRED -> configured recovery; current source/token revocation before send; and current fiscal delivery blocking after receipt queue. Compare outbox and immutable domain states. Test source/tenant mismatches without network calls.

For the application, visit actual EN/FR notification settings, shell bell and statement/accountant queue entry with authorized synthetic users; assert samples are visibly samples, denied scopes cannot read private evidence, read/dismiss semantics are accurate, keyboard/live announcements work, and unsaved inputs/command identity survive recoverable failure. Actor/tenant changes need a specific queue lifetime test. Existing source tests were located but not run.

Missing provider configuration, recipient consent, valid source records and a recognized live target are external inputs for real sending. They do not block ordinary implementation or fake-provider/isolated tests. Do not enable providers, send to people, invent consent, or change the rejected offline candidate to complete this discovery.

## Evidence

WORKFLOW_REGISTER.json supplies exact entries, service owners, authority, transitions, side effects, missing paths and visit status. SOURCE_BINDING.json hashes 53 inspected source/graph files. Graph communities 139/3/37 (component queues), 13/163/214 (settings/demo), 2 (reconciliation hooks), and service communities 1/32/97/153/168/17 were used only to locate related code, then checked against current source.

This is a bounded discovery result, not an accessibility, security, delivery, release or professional certification.
