# Resume an unsent customer statement request

Evidence date: 2026-09-07. This extends the statement worker and sender history. It does not complete the communication or financial lifecycle, or the platform-wide assignment.

## Delivered behavior

The statement history now offers **Review processing retry / Examiner la reprise du traitement** for a deferred request whose recorded dispatch outcome is NOT_SENT and whose setup was unavailable. The server also requires an active, unexpired link, an intact statement and consent record, and remaining attempts. Unknown, reserved, accepted, cancelled, invalid and exhausted outcomes are not eligible.

The operator reviews the displayed request, supplies a reason, confirms their own password and explicitly confirms resuming the same details. The action uses current `accounting.exports.create` and `customers.read` authority, enforced Accounting export access and the existing five-minute fresh-authentication check. Organization and actor come from server identity. Object lookups also bind the customer, statement and delivery.

The server binds the command to the displayed queue revision and atomically changes that existing queue row to PENDING with a business event and audit. It preserves the recipient, consent, token, payload, delivery record, past outcomes and attempt count. A transaction conflict is retried within a fixed bound. A competing different command against an old revision is rejected. Replaying the same committed command returns its existing receipt without another effect, even after subsequent processing.

The domain's last delivery outcome remains visible separately from the current processing queue. A newly recorded retry is not displayed as sent. The worker revalidates the full envelope, current link/source, provider setup and dispatch conditions before an external call. If provider configuration is still unavailable, the request pauses again and the attempt budget still applies. This form does not enable provider settings or claim they are verified.

## How to use it

1. Open **Customers → customer → Statement**, then **Latest statements / Derniers relevés** and review the relevant saved statement.
2. Check its version, redacted destination, delivery outcome, queue and link access. For a known unsent setup delay, review provider configuration with the responsible administrator.
3. Choose **Review processing retry / Examiner la reprise du traitement**. Record why processing can be tried again. Enter your own password and confirm the same request details.
4. A successful response means the retry request was recorded. Refresh history for the worker's actual outcome. No duplicate statement, new delivery or replacement link is created by this action.
5. After a lost response or reload, use **Check retained retry / Vérifier la reprise conservée**. Its reason and command identity remain fixed. Re-enter your password and confirm. The server checks the original command.
6. If the server rejects a stale or invalid request, refresh the record and review its current condition. If the outcome remains uncertain, preserve the retained command and records; do not manufacture a new delivery as a workaround.

The pending command is scoped to organization, user and customer in browser session storage. It contains the IDs, displayed revision, reason and command key, never the password or an asserted server result. A corrupt storage record remains an explicitly unresolved recovery condition. Browser tab loss can be investigated through durable history; a general controlled reconciliation interface remains open work.

## Inputs and where to get them

| Case | Input | Owner and source |
| --- | --- | --- |
| Select a request | Customer, saved statement/version, redacted destination and displayed state | Operator selects existing records in Stoquify; the application supplies IDs and revision automatically. |
| Review missing setup | Actual provider configuration and authorized sending decision | Administrator checks the organization's provider account and secrets process. Do not place keys or passwords in the reason or reports. This retry form changes no provider settings. |
| Explain retry | Short factual reason, 3–500 characters | Operator records what was checked or corrected. This is operational context, not an approval certificate. |
| Confirm identity | The operator's current password | The signed-in user enters their own password. Do not borrow an administrator's credentials. The existing authentication and rate controls apply. |
| Lost response | Original retained command and same details | Browser retains the command; the server resolves its durable business event. No replacement key is needed from the user. |
| Stale/changed request | Refreshed queue/link/current permissions | Stoquify rereads current records; the user reviews the new condition before a new command. |
| Unknown acceptance | Actual provider evidence tied to the original recipient/request and attempt period | Delivery operator obtains provider records through authorized access. An absent response or manually entered reference is not proof of non-delivery. Automatic and manual retry remain unavailable for this case. |
| Expired/revoked link or exhausted attempts | Current customer instruction and retained outcome evidence | Customer supplies any new consent; authorized operations/support reviews the existing records. This form does not reset limits, extend links or bypass withdrawal. |

## Architecture and controls

Existing customer statement route → existing history component → guarded history action → retry domain service → transaction over existing outbox, business event/audit and active token. The worker and recovery service share the dispatch metadata contract. The read model returns only an opaque eligible revision, not encrypted payloads, token hashes, provider credentials or arbitrary metadata.

The historical graph node `customers_customerstatementworkflow_tsx` in community 21 locates the sender. Current source adds the history/recovery relations absent from that older graph. The event uses the existing `CUSTOMER_STATEMENT_DELIVERY` source type and delivery ID. Its stored command payload hash matches the stored command payload; queue details are separate metadata and audit fields.

## Rollout and recovery

No migration, backfill, reset or data deletion is required. Release the service/action/history change together with the worker reservation protocol from v42. Stop older workers before rollout; mixed versions cannot enforce the shared reservation contract. Use the normal authorized release/cohort process. No deployment or live sending was performed here.

Keep pending commands, queue metadata and attempts, original consent/link records, business events and audit history. If retry commands need to be paused, withdraw the UI/action entry through an ordinary release while retaining their server records for investigation. Do not roll back to a worker that ignores RESERVED/UNKNOWN outcomes. Do not reset attempts, overwrite immutable states or turn unknown outcomes into NOT_SENT.

## Review responsibilities

| Responsibility | Review |
| --- | --- |
| Architecture/backend/API/events | Thin guarded action, shared dispatch contract, server-owned eligibility, revision binding and idempotent receipt; canonical source relation retained. |
| Database/integrity/migration | Serializable transaction, queue/token fences, one command event/audit, rollback on audit failure; no schema changes. |
| Security/IAM/privacy/fraud | Server-derived tenant/actor, scoped customer/statement/delivery, current permissions/module gate and password assurance; no provider or password exposure. |
| Frontend/UX/localization/accessibility | Existing shell/tokens; EN/FR named inline form; reason preservation, explicit confirmation, keyboard focus entry/return and failure guidance. Native screen readers/zoom and comprehensive contrast remain open. |
| Product/process/support | Resume the existing known-unsent request without another copy; operator responsibilities and setup limitations remain explicit. |
| Finance/controls/ledger/close | No amount, journal, posting or obligation changes. Original financial-state hashes compared in isolated checks; full populated financial lifecycle remains open. |
| Statutory/country rules | Not applicable to changed rules: no country pack or statutory calculation changed. No professional approval claimed. |
| Audit/records | Durable retry event and mandatory audit; exact replay returns existing receipt. Existing outcome chain is preserved. |
| Quality/release | Focused tests, actual owned PostgreSQL concurrency/rollback and actual EN/FR browser recovery. Failed attempts are retained. Full-build/release certification remains open. |
| SRE/performance/cost | Bounded database conflict retries and existing worker attempts; no provider call in recovery service. Local route observations are not production budgets. |
| Providers/integrations | Existing adapter rechecks setup; unknown acceptance remains held. No real transmission or delivery/read proof. |
| SaaS packaging/rollout | Existing Accounting module intent and authority; no new entitlement, price or live activation. |
| Analytics/data governance | Read model distinguishes latest domain result and queue state; no new analytics or export. |
| POS/offline, purchasing/AP, HRIS/payroll | Not applicable to this direct change; their registered workflows remain separately open. |
| AI/agents | Not applicable: no model action or fabricated human approval introduced. |

## Remaining engineering and verification

Unknown-outcome reconciliation, controlled corrupt-command resolution, other communication workers/recovery, public recipient revocation races, populated receivables and the complete financial lifecycle remain open. Native assistive technology, native zoom, full contrast, full build and release gates remain separate requirements. No X1 clearance or platform completion is claimed.


## Published verification

[Source-bound retry receipt](../../evidence/statement-retry-receipt.json) records seventy-five tests, ten PostgreSQL scenarios, two EN/FR browser journeys and twenty-two screenshots, with final typecheck and lint. Remaining requirements above apply; narrow enlarged French wrapping remains a UX improvement, not a passed accessibility certification.
