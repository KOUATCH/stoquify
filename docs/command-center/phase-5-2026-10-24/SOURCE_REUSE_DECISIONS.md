# Phase 5 source reuse decisions

24 October 2026. This is a source-inspection decision record, not proof of production persistence. Phase 5 uses existing storage where suitable; no schema, migration, seed or database execution is included.

## Per-origin decision

| Origin | Decision | Source authority / remaining gap |
|---|---|---|
| Generic SIGNAL in Digest, Manager and Owner | Defer durable assignment, dismissal and follow-up until occurrence identity and additive storage are designed | `services/signals/action-queue.service.ts` returns objects/events without persistence. `BusinessSignal`/`ActionItem` are not Prisma models. Hash identity combines organization/type/module/subject/dedupeScope; it is not a business occurrence. |
| LOCATION SIGNAL | Same deferred coordination adapter, explicitly bound to authorized location | Current Manager location loader resolves managed locations. Generic action DTO has no dedicated location field; some producers encode location in subject IDs. Never infer scope from a label. |
| ASSURANCE incident | Reuse WorkflowAssuranceIncident, WorkflowAssuranceIncidentEvent and AuditLog; harden the existing assignment command | Implemented source revision, current session/account/tenant-role checks, source-definition permission check for actor and assignee, transaction, replay and before/after history. No competing assignment record or generic completion command. Full location/module eligibility and real database proof remain open. |
| ACCOUNTANT_REQUEST | Reuse retained close-proof request/response and recipient replacement | `replaceMissingCloseEvidenceRecipient` in `services/accounting/close-assurance.service.ts` already owns revision, actor/recipient locks, replay and retained history. `actions/accounting/close-evidence-workflow.actions.ts` is its protected entry. Generic finding assignment cannot replace retained proof recipients. This turn does not modify or execute it. |
| ACCOUNTANT_REQUEST source failure | No assignable synthetic record | Keep unavailable coverage and source recovery; do not persist fabricated work against an unavailable request. |
| SOURCE_COMMAND reconciliation | Reuse reconciliation run and guarded Finance review/signing | Candidate command ID/run version and independent-actor signing remain source-owned. A coordination assignment cannot sign or reconcile. No alternate command introduced. |
| BRANCH DAILY CLOSE | Reuse organization/location/business-date run, review and sign-off | `branch-daily-close-sign-off.service.ts` owns guarded sign-off; existing request hashes and source revision remain authoritative. Branch sign-off is distinct from accounting-period close. |
| OWNER BRIEF REVIEW | Defer durable receipt | Visit-only review remains visit-only. Future receipt needs actor, organization, authorized scope, period and material evidence version; it must not assert approval. |
| AGENT BRIEF/PROPOSAL | Reuse separate rollout/proposal controls | Do not enable agent functionality or treat proposal generation/acceptance as generic follow-up completion. Notification delivery/retry review belongs to Phase 6. |

## Identity decision before additive persistence

A logical signal key, occurrence identity and source revision serve different purposes. The current default `dedupeScope=current` does not establish a new occurrence when an aggregate disappears and reappears. Neither a source hash nor a label is sufficient: evidence can revert to an older hash. Define source-owned occurrence tokens or explicit episode lifecycle before retaining resolution, with organization/location/period included when the source requires them.

Required future fixtures: repeated detection in all three authorized projections; different tenants and locations with similar subject IDs; different business periods; disappearance followed by recurrence; source hash changes and reversion; stale resolution after recurrence; unavailable source versus confirmed completion. Do not add generic persistence before deciding these semantics per producer.

## Implemented assurance protocol

The protected action derives actor/organization from protection context and verifies a matching server session. The client supplies incident ID, proposed owner, optional deadline, expected revision and request UUID. It cannot supply trusted session, actor, organization or assigned role. The source definition supplies the assigned role.

The serializable transaction locks organization, accounts, tenant roles/memberships, session, incident and definition using parameterized SQL. It verifies current active/verified/unlocked accounts, a valid current session, actor `controls.manage` plus `controls.audit.read`, and assignee `controls.audit.read`; both must have the definition's source permission. Existing role labels alone confer no authority. These checks do not implement a general location resolver or prove module entitlement.

The compare-and-set revision binds incident/organization, source hash, status, owner/role/deadline, update time and occurrence count. It is not an authorization credential or a new generic occurrence identity. A matching replay requires the original actor and payload hash plus the resulting revision still being current; it creates no second assignment event or business audit. Current authority is checked on replay. A stale or changed request requires refresh. Authorization access logging by the existing action wrapper may still occur on each attempt.

Assignment updates only owner, definition-derived role, deadline and coordination status. Omitted deadline preserves the existing date; the internal service supports explicit null but the UI does not expose clearing. In-progress work stays in progress; finalized incidents require the existing reopen workflow. Event metadata retains source fingerprint/hash/type/occurrence count, actor, request ID and prior/resulting state. Event timestamps use existing database defaults. No session token or raw source ID is copied into event metadata.

The incident update, event and audit are in the same transaction. A serialization failure becomes a recoverable conflict; there is no blind server retry. Mocked failure propagation is not evidence that actual PostgreSQL rollback or concurrent locks work.

## Source inspection provenance

Current source supersedes graph snapshots. Existing `graphify-out/graph_actions.json` discovery includes branch-close communities 86/87 and `end_of_day_close_branch_daily_close_review_startbranchdailyclosereviewaction`; it is not live coverage. Existing close-evidence authority locking patterns informed this bounded assignment change. No graph was regenerated and no database was accessed.
