# AF04 authority and lock order

20 October 2026. Implementation contract; verification is recorded in RESULT.md.

## Authority

Reuse Organization/User, explicit per-user client consent, tenant roles, existing module controls, protect/fresh authentication and domain-specific review/export controls. Management uses existing critical `accounting.close.accountant.invite`; it does not imply review/export/posting permission. Ownership labels do not grant authority. All lifecycle writes require a currently usable firm-home actor, persistent permission, a live password-confirmed session (five minutes), and writable home accounting module. Restriction-only commands can end/suspend or remove an assignment without requiring client module availability; they disclose no client financial data.

Draft creation requires the manager's existing named client mandate. Enrollment and assignment require an active named mandate for the exact usable firm-home staff user; neither creates consent nor reactivates a revoked mandate. Activation requires a current assignment with a live linked mandate; each subsequent access still checks the assigned user's eligibility and action permission. Foreign staff, changed tenant IDs, self-service privilege escalation and guessed foreign engagements fail. Managers may organize their firm's metadata without obtaining delegated client records. Retained management reads expose identifiers/lifecycle history under the management permission and home accounting read-retention policy; ended engagements never authorize delegated financial reads.

Managed delegated authority is the intersection of usable firm-home membership, current action permission, home accounting and client close-assurance entitlement, active exact mandate, ACTIVE engagement within its dates, one unended current staff assignment within its dates, and all three role ceilings. READ_ONLY anywhere denies review/export. PREPARER and REVIEWER keep existing meanings. Existing domain independence, freshness and financial rules remain additional predicates.

## Persistent enrollment and rollback

AF04 replaces AF03's revoked-only fence with a sticky namespace for the existing grant's activeScopeKey: `managed:<client>:<accountant>`. Explicit enrollment changes this key atomically with the retained link. The mandate remains an ACTIVE explicit client consent; enrollment never creates or revives consent. New readers recognize the namespace and enforce the intersection. AF03-era grant-only readers requiring the old exact key fail closed. Linked grants cannot regain the legacy namespace; links cannot be changed or deleted. Null keys on revocation/expiry remain restrictive. A separately granted, unlinked mandate is separate explicit consent; it is not an unlink/rollback of the managed grant.

The partial unique index `accountant_active_named_scope_key` permits only one non-null active scope per client/accountant pair across both namespaces. It also fences older invitation writers. A separate mandate can acquire that scope only after the former scope is retired/revoked. Existing AF03 revoked links are preserved without activation or backfill. Before authorized promotion, check for duplicate non-null scopes; any unexpected legacy duplicates require review, not automatic deletion.

Stop new commands through existing module write controls while keeping managed checks active. Do not revert to arbitrary historical builds lacking the current delegated boundaries. Keep both migration histories and all links/receipts. No production rollout is performed by this phase.

## Lock order and publication

For sensitive writes: sorted home/client organizations FOR SHARE → module configuration/grants → home actor → tenant roles/memberships → exact session → additional affected staff rows for lifecycle commands → named client grants in ID order → engagement → assignment rows → existing domain correlation/period/run/finding locks. Lifecycle commands lock this firm's mandate rows for one client and the engagement FOR UPDATE; assignment updates acquire their row lock under that aggregate. Accept/export acquire SHARE locks and retain them through their transaction. No lifecycle command upgrades user/role/organization locks or writes identity. Client grant revocation only updates its existing mandate row and takes no later organization lock. Existing member/role/module writers serialize through their organization/authority rows.

Commands are confined to one firm/client engagement, never a global transaction across clients. A transaction-scoped advisory command lock, namespaced by firm and idempotency key, serializes retries before the domain locks. Receipts use existing business events; state, transition history, event and outbox commit together. Replay requires current authority first and exact normalized command/actor hash, and returns the original receipt. A reused key with changed payload conflicts; a new key with stale expected version conflicts. Assignment commands use the latest assignment version rather than incrementing engagement lifecycle version.

Accept/export revalidate after later waits and immediately before publication, including session freshness, grant dates, engagement/assignment dates and module expiry. A revoke/suspend either commits first and denies the operation, or waits until the already-authorized operation commits with retained audit evidence. Snapshot reads use fresh before/after checks; aggregate readers recheck accumulated clients. Notification delivery is never authority.

## Command contract

`executeFirmEngagementCommandAction` accepts a strict discriminated command. Server context supplies home organization, actor and exact session. Unknown fields, including injected authority or restriction flags, are rejected. All commands require an 8–191 character idempotency key scoped to the firm and bound to normalized command plus actor.

| Command | Required version and behavior |
| --- | --- |
| CREATE | Client, firm-home owner, scope and effective dates; creates DRAFT version 0 after named-consent validation. |
| ASSIGN | Engagement version, staff's last assignment version (0 initially), scope and dates; creates the next assignment within both mandate and engagement terms. |
| ENROLL | Engagement version and exact existing grant ID; requires a usable assigned staff member and explicitly links that mandate. |
| TRANSITION | Engagement version, ACTIVE/SUSPENDED/ENDED and 10–500 character reason; stores the next immutable transition receipt and applies it atomically. |
| REMOVE_ASSIGNMENT | Engagement and assignment versions, assignment ID and reason; ends the assignment irreversibly. |
| HANDOVER | Engagement version, outgoing assignment/version, different incoming staff/latest assignment version, scope, dates and reason; ends and creates atomically. Incoming consent is never transferred; enrollment remains explicit. |

Terms on an engagement are immutable under AF03. End/recreate to amend them. End/reassign to replace an assignment; subsequent effective dates must not overlap retained history. `getFirmEngagementAction` reads only an engagement owned by the actor's firm, with assignment/link/transition metadata. It does not read balances, evidence bodies or exports.

Existing module semantics remain authoritative, including legacy full-suite intent and managed read-retention decisions. Empty legacy requestedModules is not interpreted as revocation. Tenant-member export retains its existing domain contract; delegated export must supply authenticated server session proof and cannot omit it in a direct service call.

## Scope boundaries

No new role/permission store, firm-wide consent, organization membership redesign, financial delegation expansion or UI. No country rules, AI/provider execution or packaging changes. Browser/accessibility changes are not applicable; direct action, service and real PostgreSQL tests are required. Production capacity, deployment and pilot qualification remain separate gates.
