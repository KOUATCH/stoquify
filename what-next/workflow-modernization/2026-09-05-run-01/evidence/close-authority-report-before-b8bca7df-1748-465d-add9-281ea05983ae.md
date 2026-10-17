# Current authority for Close evidence acceptance

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Previous goal turn: progress, with source-bound historical replacement and actual EN/FR recovery verified. The full modernization goal, all 17 workflow families and original closure criteria remain unchanged.

## Baseline and acceptance before implementation

Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Register SHA256 `7644d66803417742e9ef2b668b7b1fa7c2dd794da94588bdec9058381cdea616`. Counts remain 270 workflows: 264 Queued, two In progress, four historical Complete—verified; 191 unmapped entries. Discovery and full source reconciliation remain incomplete. Exact source/register baseline: `evidence/close-authority-before-28ee45e0-6457-402a-a934-c81d2f568582.json`.

The prior acceptance service rechecked active home identity, delegated access and a supplied authentication timestamp after waits. It did not reread persisted home-role permissions, complete account/organization state, the actual session or transactional module authority. Its service caller could supply permissions and a timestamp without a persisted review role/session. The previous synthetic runtime fixtures demonstrated that service contract while proving the separate evidence boundary. The work-desk preflight checked home accounting and target Close access, but could become stale; the direct action did not share those transactional checks. This is an engineering defect, not a missing customer approval.

Closure checklist for this correction:

1. Both acceptance transports derive session identity/token and any surface-specific requirement from trusted server context. Form fields cannot establish authority. The existing domain permission and work-desk audit permission remain distinct.
2. The write transaction establishes active/nondeleted home and target organizations, an active/verified/unlocked home actor, organization-filtered persisted home roles and a current persisted password-assured session. Supplied permission arrays/timestamps are insufficient.
3. Delegated REVIEW requires the actual current grant; valid delegated accountants need no target membership. Home accounting read and target Close write entitlements use canonical module rules, including missing, expired, suspended, dependency and read-only cases.
4. Deterministic organization-first locks retain the relevant authority through commit and coexist with canonical role, member, session, module and grant writers. Expiry/freshness is revalidated after correlation, period/run and finding waits. Refusal leaves finding decisions, acceptance/audit/events and financial records unchanged.
5. Existing selection digests, independent reviewer, exact replay, legacy retained history and immutable original evidence remain effective. Permission loss does not authorize replay or disclose a prior decision.
6. Focused helper/service/action tests, typecheck/lint and actual isolated PostgreSQL denial/concurrency verify authority. Actual EN/FR journeys verify denial, explicit recovery and successful persisted binding. Do not substitute fixture permissions or synthetic approval for required production authority.

## Implementation scope and evidence

The existing graph locates accountant-access actions in community 58 and Close actions in community 6; important relationships are verified against current source. Reuse `isUsableAccount`, canonical permission expansion, managed-module evaluation and established transaction-owned authority patterns in customer-statement review/member history. No schema or migration change is planned. No unrelated read screen, public receipt or inventory API is changed: the access-boundary skill was inspected and found scoped to those other workflows, so its implementation slice is not applied here.

The authority correction is implemented in the shared working tree; its final verification is pending. Both parent workflows remain In progress. This report supplements the historical [source-bound recovery report](CLOSE_EVIDENCE_REPLACEMENT_2026-10-01.md); that report's verification does not prove the new authority behavior.

## Delivered authority behavior

The [new transaction helper](../../../services/accounting/close-evidence-acceptance-authority.service.ts) establishes authority from persisted records. It requires the actual session ID and token, a home account satisfying the existing `isUsableAccount` policy, and active, nondeleted home and target organizations. Canonical account policy accepts either account verification or email verification and permits a timed account lock that has expired; this change does not invent a different account policy.

Only roles belonging to the actor's home organization and actually assigned to that actor contribute permissions. A foreign organization's role cannot supply review rights. The existing canonical permission expansion remains authoritative; this is not a new permission vocabulary. Every acceptance requires `accounting.close.accountant.review`. The work desk additionally requires `accounting.audit.read`; direct Close acceptance retains its domain permission without importing the work desk's extra reading requirement.

The [trusted action adapter](../../../services/accounting/close-evidence-acceptance-context.ts) derives session proof and the surface requirement from the authenticated server context. It cross-checks actor, home organization, assurance organization, assurance level and authentication timestamp. Neither action takes those values from browser fields. Both the [Close action](../../../actions/accounting/close-assurance.actions.ts) and [work-desk action](../../../actions/accounting/accountant-work-desk.actions.ts) pass this internal context to the same acceptance service. The session token is used only for exact persisted-session lookup; it is absent from acceptance DTOs, replacement bindings, comments, audit metadata and business-event payloads.

The session must belong to the actor, remain unexpired, and contain password assurance for the home organization at level 1 or higher. Its verified timestamp must not be in the future and must be within five minutes of the acceptance check. A current assurance lock also refuses acceptance. Caller-supplied permission arrays and timestamps remain preflight inputs but cannot replace the persisted checks.

For a delegated client, the actual grant must match the target organization and actor's active scope, remain `ACTIVE`, have no revocation timestamp or revoking actor, and be currently effective and unexpired. `REVIEWER` and `PREPARER` retain their existing REVIEW capability; `READ_ONLY` does not. The accountant belongs to the home organization and does not need membership in the client organization. Same-organization acceptance does not fabricate or require an external client mandate.

The [canonical module evaluator](../../../services/modules/module-entitlement.service.ts) runs in enforcement mode on the locked managed state: home `accounting` requires read access, while target `close_assurance` requires write access and available required dependencies. Thus a delegated accountant's home Accounting access may be read-only while the client's Close and required Accounting capability remain writable. Explicit empty managed grants, expired/future grants, suspended capabilities, ambiguous duplicates and read-only target dependencies refuse the operation. Genuine legacy module intent still follows the existing evaluator; a failed database read cannot become broad legacy access.

## Transaction ordering and retained authority

The [acceptance service](../../../services/accounting/close-assurance.service.ts) uses Read Committed and acquires these locks in order:

1. Both organization rows, deduplicated and sorted by ID, with `FOR SHARE`.
2. Each organization's module configuration and grants, ordered consistently.
3. Home actor, home roles and assigned home-role memberships.
4. Exact actor/session ID/token row and, when delegated, the target grant row.
5. Tenant/correlation advisory lock, then tenant/period publication lock and selected current run lock.
6. The original finding in the mapped `close_assurance_findings` table, with a tenant-scoped `FOR UPDATE`.

Authority rows remain locked through commit. Existing role/member writers start with the organization; session revocation follows actor-before-session order; module composition also starts with organization authority. Existing grant revocation changes the grant row without a later organization-lock upgrade. Taking organizations first avoids reversing these writer orders across home and client organizations. A revocation that wins first is observed and refuses acceptance; one that arrives after the protected authority is established waits for the transaction. Actual concurrency verification is still pending in this report.

The helper's returned `revalidate(at)` rechecks time-dependent authority under those retained locks. The service invokes it after the correlation wait before returning an exact replay, and after the period/run/finding waits before any acceptance effect. For the latter check, [the publication clock helper](../../../services/accounting/close-assessment-order.service.ts) reads the database wall clock after locks, rather than the transaction-start timestamp. A finding-row wait cannot silently age a fresh session or grant past its limit. A changed or unavailable source preview still refuses separately; existing independent-reviewer, source-binding, compare-and-set and idempotency controls remain effective.

Missing, revoked, expired or insufficient fresh-session proof returns `FRESH_AUTH_REQUIRED` with status 403. Account, organization, role, delegated-access and module refusals return `FORBIDDEN` with status 403. The older missing-evidence timestamp check was aligned to the same 403 authentication contract. Database faults remain failures; they do not become permission grants or successful empty observations. Replaying a previously accepted command still requires current authority.

## User recovery guide

Open the accountant work desk at `/en/dashboard/accounting/accountant-portfolio` or `/fr/dashboard/accounting/accountant-portfolio`. The related Close pages remain `/en/dashboard/accounting/close` and `/fr/dashboard/accounting/close`, with a period-specific page beneath each route. This change adds no new navigation or separate approval system.

| What the user sees | What to do | Information required and where it comes from |
|---|---|---|
| Identity confirmation requested | Confirm the signed-in account's password in the existing identity control, then deliberately submit acceptance again. An expired or revoked login may require signing in again. | The account password is entered only into Stoquify's authentication control. The server supplies session ID/token and assurance; never paste these into notes, forms or support messages. |
| Access refused after the review was already open | Ask the authorized access administrator to verify the home account, its assigned home roles, organization state, and module eligibility. After legitimate correction, refresh the work desk, reopen the item and review it again. | Identify the signed-in account, home organization, client organization if applicable, and missing-proof request reference. These come from the selected workspace, client and review item. Supply a displayed support correlation ID when available; no password or token is needed. |
| Delegated client review is unavailable | The client's authorized administrator must review or establish the legitimate accountant access grant through the existing Accountant Access controls. Do not claim client membership as a substitute. | Accountant email and firm identity come from the accountant; role, effective/expiry dates and consent evidence come from the authorized client decision. A registration number is optional in the existing schema. The consent hash represents retained actual consent; a synthetic fixture record cannot authorize a real client. |
| Target capability is missing, suspended, expired or read-only | The authorized module administrator checks the client's Close capability and required Accounting dependency, and the accountant's home Accounting access. | Existing tenant configuration, grants and validity periods supply these facts. This implementation establishes no new commercial eligibility, subscription term or price. |
| Replacement observation changed | Refresh the displayed replacement, inspect its collector and current control outcome, confirm review again and resubmit. | The application supplies the new checklist identity and binding digest. The reviewer supplies truthful resolution notes; neither a manually invented source hash nor a copied approval ID replaces a current source observation. |
| No verified replacement is available | Resolve the collector failure and run a new assessment for the same client and period. Then review the new observation. | Source owners provide the missing operational records or restore the failing collector. Earlier history and failed controls remain visible. |

The existing [work-desk component](../../../components/accounting/AccountantWorkDesk.tsx) preserves the review during password confirmation and does not submit automatically when authentication succeeds. A recoverable source conflict preserves notes and requires explicit renewed review. An authority refusal clears the visible confidential detail; refreshing and reopening resets the draft, so the user must enter and review notes again. This is intentional behavior for revoked access, not a claim that every error preserves every draft. A generic retry remains subject to the same source and authority checks.

Acceptance records reviewed recovery of missing evidence. It does not clear current business-control failures, certify a Close pack, authenticate a statutory approval, grant client access or lift X1 by itself. No user-supplied commercial or professional approval is needed to finish isolated engineering verification; real deployment and real-client operation still use their applicable controls.

## Rollout and recovery

No Prisma schema or migration change is required. The helper, trusted context adapter and both action callers must ship together through the existing release process. Old service callers that provide only permission arrays and timestamps now refuse acceptance; internal callers must obtain proof from the authenticated server boundary. Session ID/token and `requireWorkDeskAccess` must never be added to public command schemas or persisted into review evidence.

Before releasing, finish the source-bound focused tests, typecheck, changed-file lint, owned-database denial/concurrency checks and actual EN/FR recovery journeys. Exercise both a home reviewer and a legitimately delegated reviewer. Use the guarded synthetic fixtures for engineering proof; do not convert their grants, password sessions or consent records into customer authority. No migration-bearing build or live activation is part of this report.

For rollout, use the existing approved cohort process and observe authentication refusals, authorization refusals, conflicts, transaction failures and review latency. New denials may expose previously stale or invalid access; investigate the persisted authority rather than weakening checks or broadening grants. Locking all home roles favors consistent authority over narrow lock scope; its contention cost has not yet been measured at production scale.

If a regression prevents safe acceptance, suspend new evidence acceptance at the existing operational release boundary and restore the compatible reviewed implementation. There is no new feature flag claimed here. Rolling back to acceptance that trusts only caller permissions or timestamps would reopen the defect. Preserve all collection receipts, original evidence, accepted replacement bindings, comments and audit/event history; do not delete or rewrite prior decisions as rollback. A failed transaction is retried only after its actual cause is corrected, with renewed source review and current authentication as needed.

## Review responsibilities and tradeoffs

| Lens | Applied review and limits |
|---|---|
| Platform, backend/API and distributed systems | Shared service authority and trusted adapters cover both acceptance transports. Deterministic lock order and post-wait checks retain the decision's authority. This is bounded to acceptance; it does not harden every accounting operation. |
| Database, integrity and migration | Existing rows and transactions supply authority; no new schema or history rewrite. Read Committed is paired with explicit retained locks and current source rereads. Competing mutation order and failed-transaction effects require actual PostgreSQL proof. |
| Security, IAM, privacy, fraud and abuse | Tenant-filtered roles, usable accounts, exact sessions, current grants, module enforcement and independent reviewer checks fail closed. No token appears in acceptance output. This is an engineering control review, not a security/privacy certification or a complete revocation audit of the platform. |
| Frontend, workflow, accessibility, localization and content | Existing EN/FR work-desk identity, focus and recovery behavior is reused. Authority denial removes visible detail; source conflicts preserve notes. New browser verification is pending; no full screen-reader, zoom or contrast certification is asserted. |
| Product and operations | Legitimate external accountants keep delegated REVIEW without target membership. Clear distinction remains between missing identity proof, refused authority and changed source evidence. The product benefit is trustworthy review under concurrent access changes. |
| Finance, reconciliation and internal controls | Missing-evidence recovery retains original adverse history and current failed controls; a respondent cannot accept their own response. No posting, payment, valuation or certification rule is changed. Actual financial no-effect verification remains pending for this increment. |
| Audit and records | Acceptance/comment/audit/event source binding and exact replay remain append-only evidence. Permission loss prevents replay disclosure. Authentic mandates remain organizational evidence supplied through existing access controls. |
| Quality and release assurance | Dedicated helper, service and action tests cover the changed boundary; source hashes and guarded runtime/browser receipts must bind the final implementation. Existing historical passes are not substituted for current results. |
| SRE, observability, resilience, performance and cost | Authentication failures, authorization failures, source conflicts and database failures remain distinguishable. Locks trade additional contention for retained authority. No approved production latency budget or performance certification is established. |
| SaaS modularity and packaging | Home Accounting read and target Close write preserve canonical module semantics and required dependencies. Billing/provider eligibility and commercial terms are not modified or inferred. |
| OHADA/SYSCOHADA and country packs | Not applicable to changing statutory rules: this correction governs who may accept evidence and supplies no legal/accounting attestation or country-pack approval. |
| Analytics and data governance | Existing proof lineage and tenant scopes are retained; no new analytics model or data export is introduced. |
| Provider, offline/edge and external integration | Not applicable: no provider, transport protocol or offline workflow changes. Existing internal acceptance events remain within scope. |
| AI/agents and human-approval policy | Not applicable: no agent authority, autonomous approval or new approval policy is introduced. |
| Billing, growth and customer-success automation | Not applicable: no pricing, subscription, purchase or automated outreach changes. The operating guide covers manual recovery only. |

## Verification status at report handoff

Verification is **pending**. This section records the first run, not the final result of work still in progress.

| Check | Current result |
|---|---|
| Initial focused Jest run | **Failed:** 476 passed, two failed; 11 suites passed and one failed, zero pending tests. [Command/source receipt](evidence/close-authority-jest-f675e7a6-d3b6-4c0a-a15c-777b6cba3fe9.json), [test results](evidence/close-authority-jest-f675e7a6-d3b6-4c0a-a15c-777b6cba3fe9-jest.json). The failing cases concern a final authority-query failure and authentication freshness after replacement-lock waiting. They are under investigation; no passing rerun is claimed here. |
| New helper and helper-test syntax | Lightweight TypeScript transpilation passed with no emitted files. This does not replace full typecheck or tests. |
| TypeScript and changed-file lint | Pending final coordinator evidence. |
| Actual PostgreSQL authority matrix and race | [Prepared guarded verifier](lanes/environment/close-acceptance-authority-runtime.cjs); execution/result pending. Intended proof includes explicit backend blocker PIDs, revocation-first refusal, acceptance-first retained authority and denied replay with no acceptance/financial effects. |
| Actual EN/FR browser recovery | [Prepared browser verifier](lanes/environment/close-acceptance-authority-browser.cjs); execution/result and screenshot inspection pending. Real sign-in/password assurance is required; runtime-only synthetic sessions are not browser authentication evidence. |
| Production or complete workflow release | Not performed or claimed. |

Both FA-CASH-COMMAND and FA-CLOSE-PACK remain In progress. Existing source-producer discovery and multi-period ordering, the full Cash lifecycle, background delivery, authentic country/payroll prerequisites, full accessibility and production performance remain open. No workflow/register status is changed by this report. No deployment, live activation, real payment, external message or X1 clearance is established by this milestone. The next engineering action is to resolve the two initial test failures, bind the final static results, and complete the guarded runtime/browser verification.
