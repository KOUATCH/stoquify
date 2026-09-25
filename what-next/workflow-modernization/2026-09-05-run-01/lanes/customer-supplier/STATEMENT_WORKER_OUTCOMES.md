# Statement delivery outcomes and worker recovery

Engineering implementation record, 2026-09-07. Canonical workflow `CS-STATEMENT-DELIVERY-WORKER`; `NTF-STATEMENT-DELIVER` is its notification review alias. The previous goal turn made progress by publishing statement history v41. This turn reproduced and corrected worker defects; the full platform assignment remains active.

Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, 633 dirty entries at this continuation's inspection (`0ed387`). Unrelated edits were preserved.

## Reproduced failures and corrections

The owned PostgreSQL reproduction (`statement-worker-before-8ec6bbe4-99b.json`, terminal `12c15b`) confirmed three defects without external messages: an old invocation settled a newer claim with the same worker ID; acceptance followed by a settlement outage became retryable and invoked the adapter twice; invalid evidence left delivery history QUEUED while transport was FAILED.

The worker now requires tenant and worker scope. Claims compare the current attempt and revision. Before provider invocation, a transaction reserves a unique execution in existing outbox metadata and records an audit event. Reservation compares the prior metadata as well as revision, so safety does not depend on timestamps being different by one millisecond. Settlement requires the same tenant, event, attempt and execution reservation.

A concurrent processor observes the existing reservation or loses its claim. After a stale claim, a reserved or otherwise uncertain attempt is held as DEFERRED with `PROVIDER_OUTCOME_UNKNOWN`. Legacy attempted records without dispatch evidence are also held. A provider exception, response deadline, missing acceptance reference or database outage after possible acceptance cannot schedule an automatic duplicate send.

Known provider rejection can retry within the existing attempt limit. Unknown acceptance cannot. Provider classification uses the installed Resend SDK's error-name contract; its ErrorResponse has no HTTP status field. WhatsApp status errors distinguish definite rejection from timeout/server uncertainty. Provider accepted remains different from recipient delivered/read.

Verified token revocation/expiry prevents dispatch and records a cancellation. Reservation rechecks the token in a transaction that serializes with revocation. A revocation after the reservation can deny public link access but cannot recall an in-flight external message. Payload, recorded snapshot, token/jti, destination, consent, locale, organization and source bindings are checked before reservation.

Outbox settlement, append-only delivery state, business event and audit are transactional. If original domain evidence is missing or already terminal, the code retains it and records the transport problem without fabricating a new valid domain history. If settlement itself cannot reach the database, the durable reservation remains for subsequent review.

## What users see

Open `/en/dashboard/customers/<customer-id>/statement` or `/fr/dashboard/customers/<customer-id>/statement`, then the saved statement's history. It now explains:

- **Unknown provider outcome:** automatic retry is paused to avoid another copy; reconcile provider evidence before another delivery.
- **Provider setup unavailable:** the retained request is deferred; an administrator must review setup and recovery.
- **Revoked or expired access:** the delivery is cancelled; customer obligations remain.
- **Invalid evidence or exhausted attempts:** an operator must inspect original records.

The existing EN/FR header and sharing description no longer run adjacent words together. Existing dashboard tokens and native controls remain. No shell or provider settings were replaced.

## Inputs, owners and sources

| Situation | Required input | Owner and source |
| --- | --- | --- |
| Review the outcome | Customer, statement/version, checked time and delivery/queue/link states | Operator reads the saved statement history in Stoquify. |
| Missing provider setup | Approved provider configuration and existing live-send decision | Authorized administrator uses the organization's actual provider account and secrets process. Never put keys in this report or browser history. |
| Unknown acceptance | Actual provider evidence for the recipient, statement and relevant attempt period | Authorized delivery operator compares the provider's records with Stoquify's immutable request, redacted destination, hashes and attempt evidence. A missing response is not proof of rejection. |
| Invalid source evidence | Original immutable statement, outbox payload hash, token/link and consent records | Engineering/support investigates retained records through authorized access; do not edit hashes or rewrite the immutable history to make validation pass. |
| Exhausted attempts | Prior attempt results and reason for any further action | Authorized operator reviews records. The worker does not reset attempt counts. |
| Revoked/expired link | Current customer consent for any separately requested new copy | Customer supplies consent; authorized operator uses the existing fresh-authenticated new-delivery workflow. Revocation does not reverse receivables. |

The missing controlled operator requeue/reconciliation form is still engineering work, not an approval blocker. This batch deliberately does not claim that entering provider settings resumes deferred messages. Do not manually change statuses to bypass an unknown outcome.

## Rollout and recovery

No schema migration or backfill was added; reservations use existing outbox metadata, business events, delivery states and audits. Deploy only through the ordinary authorized release process. Stop older statement-worker instances before enabling the corrected worker: mixed versions cannot uphold the reservation contract.

Keep the existing live-send flags unchanged unless separately authorized. Start with a permitted tenant cohort and inspect its attempted legacy records. Previously attempted requests without adequate dispatch evidence move to review rather than being resent automatically. Observe DEFERRED/unknown, invalid evidence, cancelled access and lost ownership separately.

Do not roll back to the old worker while reserved or uncertain requests can be reclaimed by it. Pause dispatch, retain every request/reservation/outcome record and reconcile the affected queue first. A browser-only wording rollback does not justify reverting worker controls. No actual rollout or external send occurred here.

## Review responsibilities

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend/distributed systems | Generation and execution ownership; durable dispatch reservation; explicit uncertainty and bounded processing deadline. |
| Database/integrity/migrations | Existing schema; atomic reservation/audit and outcome/state transactions; no record deletion or reset. |
| Security/IAM/privacy/fraud | Required tenant scope, current link/source binding, no secrets or raw provider errors in failure records. Worker operational identity is distinct from end-user authorization. |
| Frontend/design/localization/accessibility | Current shell/tokens; EN/FR explanations and whitespace fix; actual keyboard/reflow evidence. Native screen-reader/zoom/contrast review remains open. |
| Product/process/support | Fewer unsafe automatic retries; operators can distinguish setup failure from unknown acceptance. Controlled operator recovery UI remains incomplete. |
| Finance/controls/reconciliation/ledger/close | No ledger posting, receivable correction or balance mutation. Link/delivery cancellation preserves customer obligations; full populated financial lifecycle remains open. |
| Statutory/country compliance | Not applicable to changed rules: no country-pack calculation or statutory policy changed; no certification. |
| Audit/records | Append-only delivery state/event lineage, retained reservation and explicit missing-domain evidence; hashed provider references. |
| Quality/release | Before/after PostgreSQL evidence, focused tests and actual EN/FR history checks. Full-build/release certification remains unproven. |
| SRE/performance/cost | 30-second default response deadline; late result ignored after uncertainty hold; bounded retries. No production performance claim. |
| APIs/events/providers | Existing adapters and gates; provider accepted is not delivery/read proof. No external transmission in verification. |
| POS/offline, purchasing/AP, HRIS/payroll | Not applicable to direct code changes; their workflows remain independently inventoried. |
| Analytics/data governance | Domain and transport states remain separate; no new metrics or exports. |
| AI/agent governance | Not applicable: no model, agent action or simulated approval added. |
| SaaS packaging/rollout | No subscription, price, entitlement or live-customer activation change. |

## Remaining work

Implement controlled recovery for known-not-sent deferred requests with current authority, fresh authentication, a reason, a displayed revision and idempotent submission. Provide operator reconciliation for unknown outcomes; do not equate a manually entered reference with verified provider evidence. Complete browser recovery, public-recipient races, native accessibility, populated receivable/ledger calculations and the wider workflow register. No X1 clearance or full workflow completion is claimed.


## Published verification

[Source-bound worker receipt](../../evidence/statement-worker-receipt.json) records sixty tests, twelve PostgreSQL scenarios, two EN/FR browser journeys and eighteen screenshots, with final typecheck and lint. The remaining engineering requirements above still apply.


## Subsequent recovery implementation

The v43 [statement processing retry guide](STATEMENT_PROCESSING_RETRY.md) supersedes the earlier missing-path finding only for known-not-sent statement setup delays. Unknown outcomes and other workers remain open. The original v42 evidence above is preserved.
