# Local notification settings — implementation after v38

This bounded batch covers the current-tab notification view, shared toast controls and browser sound preference. Production changes are implemented; the source-bound publication receipt below determines the final verified scope. The full platform assignment remains active.

## Current evidence

`../environment/notification-settings-before-afce0a5e-533.json` (be08b5) reproduced NTF-F02 in EN desktop and FR mobile. The real settings buttons announce that a customer payment was recorded and that a privileged action was queued for review. Payment, BusinessEvent and AuditLog counts after sign-in were unchanged by both buttons. Four actual screenshots are retained next to the JSON; source hashes were stable. Only existing owned local synthetic accounts were used. Their temporary `communication.notifications.read` role grant was restored in both cases, and exact created sessions were removed. No payment, real approval or external delivery occurred.

Source ownership: the settings page checks `communication.notifications.read`, and its client directly calls the local NotificationProvider. `components/Providers.tsx` mounts that provider around public and authenticated content. The provider stores at most five messages in React memory, defaults their deliveryState to `delivered`, and removes timed toast messages from the same array used as the settings queue. Read/clear actions only change that array. Sound preference alone uses localStorage.

Historical graph hints were verified against source: `notifications_notificationprovider_tsx` and `notifications_notificationprovider_notificationprovider` are community 3; `notifications_notificationsystem_tsx` is community 37; `notificationmenu_tsx` is community 139. The legacy notification bell is a different path, not a durable version of this local array.

## Next correction and acceptance scope

1. Replace the two business-effect sample buttons with a clearly labeled local example. Its title, message, category, source and status must not claim a payment, approval or delivery. Reuse the existing info treatment and keep real business operations in their domain services.
2. Describe this view as temporary messages in the current browser page/tab. Replace unsupported delivery/adapter-readiness wording and metrics with observed local/read state. Distinguish dismissing a local notice from completing its originating work. Do not invent a durable inbox or a live provider integration.
3. Complete EN/FR labels and dates, meaningful filter selection state, row-specific accessible actions, loading/empty/local recovery and responsive layout. Shared toast controls are currently English and lack a live-region role; NTF-F10 remains open and must be addressed with affected consumers verified.
4. Inspect sound preference parsing/persistence before changing its shared provider. Current parsing accepts non-booleans and write failures are swallowed. Do not claim persisted preference or sound playback merely from a switch's optimistic state. Reproduce each changed behavior first.
5. Verify authorized and denied visits; a local example cannot create payment/approval/delivery records. Exercise local read/dismiss/all/filter actions, temporary-state loss on full reload, sound persistence/failure, EN/FR, mobile/tablet/desktop, keyboard and enlarged text. Bound any shared provider changes and rerun proportionate existing feedback consumers.

## Boundaries still open

NTF-F09's actor/tenant queue-reset concern needs its own real transition reproduction; full sign-out now performs a document navigation, but that does not prove all account/organization transitions clear the global provider. The old bell, signal digest, reconciliation alerts and durable communication workers remain separate workflow records with their own authority and delivery semantics. Do not silently merge them into a fabricated universal inbox.

The current notification lane's earlier provider/statement findings are historical and must be reconciled against already delivered customer-statement changes before repeating work. No external message should be sent for these local display checks. No new user approval is needed to continue this authorized implementation.

For this batch, frontend/workflow/localization/accessibility, product truth, security/identity scope, audit/analytics meanings, SRE/recovery and support are applicable. Finance controls apply to ensuring sample notices are never evidence of a financial effect. Statutory calculations, payroll, stock valuation, live billing, agent authority and professional approvals are not applicable to local notification presentation; their broader workflows remain active.

## Delivered behavior

The settings view has one explicitly labeled local example. It states that no payment, approval or external message was created. Counts describe the actual temporary array and its local read state. The page explains the five-message limit, full-reload loss, timer behavior and absence of a saved inbox. Reviewing/dismissing these messages never completes their originating business task.

Shared controls, categories and date labels follow the route's EN/FR language. Missing/invalid dates show unavailable time rather than the current time. In-app delivery metadata is labeled as display/read in this tab. Explicit email/SMS/push metadata remains distinct: local read actions now retain its original delivery state, including failure.

The floating copy is hidden on the review route, and its expiry timers pause there. Elsewhere timers pause for focus and hover, then provide a fresh reading interval. Browser evidence found that removing a hovered read button suppresses native leave events; a temporary pointer-move listener reconciles that state so expiry resumes. Reading a toast returns focus to the message before removing its button. Live regions announce new or changed content; removing the final notice clears stale announcements. Reading alone does not reannounce the original operation.

The page inherits the existing dashboard shell and semantic notification styles. Selected filters expose aria-pressed and retain the existing information-colored selected treatment; a local example uses information treatment. The temporary-message badge and local-read count do not imply provider readiness. Narrow padding, stacked headings, proportional side columns and cards that fit their container correct reproduced EN/FR overflow at enlarged text sizes. Small-screen primary actions omit decorative icons to give long French labels more room. Existing controls remain reachable without adding a second shell.

Sound now accepts only booleans, loads without transiently overwriting an existing preference and saves only on an explicit toggle. The setting is browser-wide across accounts and tabs. Storage events synchronize other tabs without an echo write. A denied save leaves the choice effective in this tab and shows localized recovery guidance. The header's sound control now has the same localized accessible label. Enabling sound is a preference; it is not proof that the browser actually played audio.

## User and operator procedure

| Situation | What to do | Needed information and source |
| --- | --- | --- |
| Review current messages | Open `/en/dashboard/settings/notifications` or `/fr/dashboard/settings/notifications`; use filters, local read or dismiss actions. | Current signed-in account and `communication.notifications.read`, assigned by the workspace administrator. |
| Understand an operational message | Inspect the originating business workflow and its retained record before treating it as completed. | Record/reference supplied by the actual business workflow; a toast is not approval, payment or delivery evidence. |
| Try the display | Choose Show local example / Afficher un exemple local. | No customer details, approval or financial input. The example performs no business action. |
| Choose sound behavior | Use the page switch or header sound control. Confirm the page reports the choice saved in this browser. | Browser-local storage; no organization or server preference form. Other accounts using the same browser share the choice. |
| Storage is unavailable | The choice still works in this tab. Check browser storage restrictions, then toggle again to save the desired setting. | Browser privacy/storage settings. No password, session cookie, approval register or SOURCE RECORD URI is required. |
| Messages disappear | Full reload, dismissal or expiry outside this review removes temporary entries. Open the originating workflow for retained records. | Its authorized history, not a fabricated notification archive. |
| Settings access is denied | Ask the administrator to check current workspace status and the named permission. | Account/workspace and permission assignment. Do not bypass the route or share authentication credentials. |

## Verification publication and rollout

Canonical receipt: `../../evidence/local-notification-receipt.json` after publication. It records final source hashes, focused tests, real browser visits, screenshots, source baseline and exact terminal results. `../../evidence/local-notification-initial-attempts.md` preserves failed code and harness attempts. The local-only browser driver verifies denied/allowed users in separate EN/FR synthetic organizations, local actions without payment/business-event/audit writes, reload, storage recovery, cross-tab synchronization and shared feedback. Temporary grants and exact synthetic sessions are cleaned up; no external delivery occurs.

No migration, deployment, production activation or X1 decision is included. Roll out through the existing authorized process after outstanding release checks. Preserve the truthful sample labeling, failure state and local/external distinction during recovery. Storage failure is not a reason to erase browser data or reset accounts. Investigate originating services for business failures; notification presentation must not synthesize completion.

## Engineering review matrix

| Responsibility | Assessment and remaining limit |
| --- | --- |
| Enterprise/platform architecture | Reuses the global provider and authenticated shell; local feedback remains distinct from durable domain alerts. Legacy bell and full actor/tenant transitions remain open. |
| Backend/API/distributed systems | No new server mutation or transport; owner metadata remains authoritative. Provider delivery is not established by client state. |
| Database/data integrity/migrations | Local controls do not write Payment, BusinessEvent or AuditLog; before/after checks apply only to the owned verification database. No schema change. |
| Security/IAM/privacy/fraud | Existing settings permission gate retained and exercised. No secrets in artifacts. Global queue scope transitions and all upstream notification producers require further review. |
| Frontend/design system | Existing semantic tokens, components and shell; reproduced reflow defects corrected. Unrelated dashboards unchanged. |
| Workflow/accessibility/localization/content | EN/FR, visible local semantics, keyboard focus/timer recovery and bounded reflow exercised. Native assistive technology, actual browser zoom and complete contrast audit remain open. |
| Product/business process | Removes fake business completion and clarifies what read/dismiss/sound actions accomplish. No new approval step. |
| Finance/accounting/reconciliation/internal controls | Payment/security example claims removed; local acknowledgement cannot change external delivery evidence. Financial posting/reconciliation algorithms are not modified. |
| OHADA/SYSCOHADA/country packs | Not applicable to these changes: no statutory calculation, country setup or expert approval altered. |
| Audit/records/analytics/data governance | Local read counts are not retained audit evidence or email engagement metrics. Dates and statuses no longer invent availability. |
| Quality/release/SRE/DevSecOps/performance/cost | Source-bound focused checks and retained failures; no build, production performance or release certification. Browser route timings are development observations only. |
| Integrations/events/provider boundaries | Custom events supply local feedback; explicit external metadata is preserved. Workers, unknown outcomes and provider recovery remain separate unfinished workflows. |
| POS/offline/inventory/purchasing/AP/HRIS/payroll | Not applicable to this bounded implementation: no domain records or offline replay rules changed. Their reviews remain active. |
| AI/agents/human approvals | Not applicable: no agent execution, signer authority, professional approval or X1 clearance introduced. |
| SaaS packaging/billing/growth/customer success | No entitlement, pricing or billing change. Guidance explains the existing browser-local facility and its limits. |
| Operations/rollout/support | Explicit storage recovery and originating-record guidance. No live deployment, provider send or customer activation. |
