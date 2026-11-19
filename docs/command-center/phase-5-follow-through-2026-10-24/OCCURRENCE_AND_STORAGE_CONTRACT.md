# Work & Follow-up occurrence and storage contract

24 October 2026. Design decision for the next permitted implementation stage. No schema/model/migration or database record is created by this document. CC-05.7/05.8 and CC-06.1/06.5 remain unverified until implemented and exercised.

## Identity: four distinct values

1. **Logical source key**: canonical versioned serialization of trusted organization, origin, source type/reference, authorized location scope (explicit tenant scope or sorted location IDs), relevant reporting period and producer policy version. Use a canonical array/object encoding before hashing; do not concatenate free-form parts with a delimiter. The current signal dedupe string uses colon joining and default `current`; preserve its existing read-only behavior but do not turn it into a persistence uniqueness contract.
2. **Occurrence ID**: a retained episode identifier or source-owned immutable occurrence token. It is stable while the same work remains open. It cannot be a translated title, generation timestamp, latest source hash, or signal `act_` ID.
3. **Source revision**: source-owned evidence version for compare-and-set/review invalidation. Changed evidence can change revision without starting a new occurrence. Reversion to an old hash never restores an old receipt automatically.
4. **Command ID**: stable client-generated UUID scoped to the trusted organization, actor and command family. Persist command intent hash and result. Changed target/payload with the same command ID is a conflict, not a second transition.

The existing assurance `occurrenceCount` increments on repeated detection in `assurance-incident.service.ts`; it is not proof of a new business episode. Its inclusion in the assignment revision is conservative invalidation, not a generic recurrence model.

## Producer binding decisions

| Producer | Current observed reference | Required durable binding |
|---|---|---|
| Payment suspense aggregate | `payment.suspense/open-suspense` | Organization, authorized scope and canonical source period; explicit episode lifecycle. A specific suspense item may instead use its immutable source ID and source reopen lifecycle. |
| Inventory stockout aggregate | `inventory.level/stockout-risk` | Scope/location plus source period and policy. A per-item producer must also bind item/location; neither zero visible rows nor an unavailable snapshot closes the episode. |
| Inventory loss | `<location-or-tenant>:recorded-loss` | Structured location scope, recorded period and policy; do not parse the display subject string as authorization. |
| Close blocker | `close.run/latest` | Resolve actual period and retained close run/finding/request IDs before persistent mutation; never persist `latest` as a foreign key. Retained evidence requests continue using their existing lifecycle. |
| Purchase receiving aggregate | `pending-receiving` or `<location-or-tenant>:pending-receiving` | Explicit scope/period and episode; specific PO/receipt follow-up uses source record identity and current receiving revision. |
| Payroll exposure | `payroll-finance-forecast`, `active-employee-balance`, `<location-or-tenant>:payroll-allocation` | Authorized payroll scope, forecast/run period and policy. Do not widen employee visibility to harmonize counts across pages. |
| Other signal defaults | Cash variance, duplicate provider reference, refund/void spike, dead stock | No persistent adapter until the live producer and source outcome are traced. Default copy/rules are not evidence of a source occurrence. |
| Assurance, accountant requests, reconciliation and branch close | Existing retained source identities | Reuse each source lifecycle. New coordination records cannot become competing assignment/sign-off records. |

Reporting scope uses the source's existing exact period boundaries and UTC policy; this contract does not change business-day semantics. A personal/team/executive projection may omit an occurrence for authorization or filtering, but it must not invent a different identity for the same source occurrence.

## Episode and outcome rules

Repeated qualifying evidence while an episode is active updates its evidence revision and last-observed time, preserving its accountable owner and explicit deadline. A meaningful source revision invalidates bound review receipts. Detection times are not contractual deadlines.

Only an authorized source adapter can confirm a business outcome and close the episode. Assignment, read, dismiss, snooze, source disappearance, expired evidence, access denial and failed queries cannot do so. Coordination acknowledgment/dismissal is a separate attribute and cannot suppress a source blocker or erase retained evidence.

After source-confirmed completion, a new qualifying source event starts a new occurrence, even if the payload hash matches an older event. Keep the completed occurrence/history. If the producer cannot distinguish new failure from stale cached evidence, return uncertain and require a fresh authoritative source read; do not resurrect the old completion or manufacture recurrence.

## Minimal additive storage decision

Do not repurpose AuditLog, comments or financial source tables as a generic task store. Reuse source-owned tables first. For remaining generic signals, the proposed additive design consists of:

- **Coordination occurrence**: trusted organization, logical key/version, immutable occurrence ID/sequence, structured scope and period, source reference/revision, coordination owner/state/deadline, source-outcome reference, monotonic revision and timestamps. Unique occurrence identity; at most one active episode per logical key, established atomically. Avoid copying sensitive financial/employee payloads into this row.
- **Immutable coordination event/command receipt**: organization, occurrence, actor, command ID/intent hash, expected/result revisions, before/after coordination state and source revision, timestamp and result reference. Unique command identity enforces idempotency; event and occurrence update commit together. A replay rechecks current authority before disclosing the result.
- **Review receipt**: organization, actor, authorized scope, period, projection kind and evidence-set revision plus timestamp. Preserve prior receipts; current view reports reviewed only when all binding fields still match. A receipt is never financial approval or certification.

These are proposed logical records, not approved Prisma models or SQL. Concrete foreign keys, retention, source adapters and migration/backfill must be checked against the current schema when database work is authorized. Do not initialize a historical occurrence as completed from its current absence. Initial observations are open or uncertain with explicit provenance.

## Transaction and privacy contract

Resolve session, tenant, current roles, source-specific permissions, module entitlements and source scope on the server. Client-supplied assignee/location/period is a requested value, not authority. A single transaction performs current-source validation, revision comparison, occurrence mutation, immutable event/receipt and any approved outbox insertion. Use consistent authority/source lock order and bounded conflict recovery.

Do not store private DTOs in browser storage. Lists and history must reauthorize every read, including pagination; historical assignment never grants present access. Counter disagreements must be explained by scope, coverage, period or filters without fetching prohibited data.

## Ready-to-execute verification specification once authorized

| Case | Execution | Required evidence |
|---|---|---|
| Persistence | Assign in one session; reload through a new session | Same occurrence/owner/deadline and one event |
| Race | Two transactions with the same expected revision | One accepted mutation; the other conflicts; no overwrite |
| Replay | Concurrent identical command and lost response | One transition/event/outbox item; authorized identical result |
| Changed intent | Reuse command ID with another target/owner/date | Conflict with no extra writes |
| Rollback | Fail event/audit/outbox after occurrence update | No partial state in a new transaction |
| Revocation | Commit account/role/location/module removal before an assignment retry | Denied and no result leakage; test actual authority writer locking |
| Recurrence | Resolve from source; create new qualifying event with old payload hash | New occurrence; old owner/resolution/review not inherited silently |
| Scope | Same source-looking IDs in two tenants, locations or periods | Separate identities and denied cross-scope lookups |
| Unavailable source | Remove access/fail fetch/expire evidence | Unavailable/uncertain; no inferred completion |
| Review | Review evidence A, change to B, then return to A | Old receipt retained but no automatic renewed current review |

Run only against an explicitly designated disposable PostgreSQL target under the repository test lane controls. Mocked fixtures cannot close these gates. No target is accessed by this document.
