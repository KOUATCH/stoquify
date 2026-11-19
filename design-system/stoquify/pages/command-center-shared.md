# Command Center shared contract

Date: 24 October 2026. Status: target implementation contract authored in Phase 0; not a statement that planned functionality is implemented or verified. Follow [MASTER](../MASTER.md), the existing UI constitution, and server-owned business controls.

Program: [Phase 0 package](../../../docs/command-center/phase-0-2026-10-24/README.md). Traceability: [source map](../../../docs/command-center/phase-0-2026-10-24/ACTION_SOURCE_MAP.md), [acceptance checklist](../../../docs/command-center/phase-0-2026-10-24/ACCEPTANCE_CHECKLIST.md).

## Roles of the three pages

| Page | Primary job | Shared Work & Follow-up integration |
|---|---|---|
| [Daily Digest](daily-digest.md) | Understand today's priorities and source limitations | Personal priorities, requests awaiting response, approaching follow-ups, verified outcomes |
| [Manager Action Center](manager-action-center.md) | Organize and advance authorized operating work | Full team/personal work queue, assignment, handoffs and history |
| [Owner War Room](owner-war-room.md) | Understand exposure and decisions needing attention | Significant unresolved risks, accountable people/roles, progress and review receipts |

**Work & Follow-up is included in the program, in Phases 5 and 6.** It is a shared capability, not a fourth navigation destination. Release A (1–4) improves existing views without requiring new persistence; Release B (5–7) adds the integration after reuse decisions and persistence verification.

## Common presentation

- Keep the approved `.dashboard-landing-theme dark` shell, `--dash-*` semantic tokens, product-blue identity and approved button variants. No new palette, font, or component system.
- One primary page h1, section h2, item h3; compact header, one operating conclusion, relevant metadata and next action. Business implications precede optional technical provenance.
- Reuse BI header, priority board, evidence/state components and existing drawer/table patterns. Inspect shared consumers before changing their defaults; prefer explicit scoped props over global behavior changes.
- Keep critical restrictions visible wherever an affected action appears. Collapsing evidence does not hide a blocker or make incomplete data look healthy.
- Distinguish total authorized results, filtered results, displayed preview and incomplete source coverage. No silent truncation presented as a complete queue.
- Do not expose raw tenant identifiers, permission codes, source hashes or internal errors as primary business copy when a safe descriptive alternative is available. Authorized technical evidence remains accessible.

## Scope, navigation and trust

- Server authorization owns organization, location, module and source visibility. Sidebar visibility, URL parameters, role labels and assignee selection do not grant access.
- Preserve permitted locale, period, location and view/filter context through source navigation and return. Validate internal return destinations; do not accept arbitrary redirect URLs.
- Put only safe navigation state in URLs. No sensitive record payloads, evidence hashes, personal amounts, tokens or private DTO storage in local storage.
- Snapshot UTC boundaries remain unchanged unless separately decided by the domain owner. Label timezone and deadline meaning. Generated time is not proof of source freshness.
- Show null/unavailable values honestly. Never derive resolution from absence, failed fetch, restricted scope, or a reviewed brief.
- Financial commands remain in existing guarded domain workflows. Reconciliation review/signing stays in Finance; branch-close commands remain in their existing workspace.

## Required states and recovery

| State | Presentation / recovery |
|---|---|
| Loading / refreshing | Stable skeleton or pending status; prevent duplicate requests; retain safe view context |
| Empty queue | State that no permitted work is available in current scope; do not claim organization-wide health |
| No filter matches | Show active filters and clear/reset action; distinguish from an empty source |
| Partial / source capped | Identify affected coverage without disclosing unauthorized records; offer source navigation or continuation |
| Stale | Show source as-of and plain-language next step; refresh cannot imply source repair |
| Blocked | Show blocker and authorized recovery workflow; allow safe evidence investigation where the domain permits it |
| Permission / module / no organization | Use existing route states and recovery; clear inaccessible private detail |
| Failed refresh | Retained content remains explicitly old, or is cleared if access cannot be trusted; no false success |
| Source changed / pending mutation | Follow source revision and uncertain-result recovery; never blindly resubmit a financial command |

## Accessibility and localization

EN/FR includes generated summaries, urgency labels, dates, accessible names and destinations. Preserve native link behavior and modifier-click. Modes expose selected state and distinct labeled regions; keyboard focus stays predictable. Drawers restore focus to their trigger. Status changes are announced without moving focus. Use text/icons alongside semantic colors. Verify long French labels, zoom/reflow, narrow screens, reduced motion and essential action reachability; source classes are not rendered evidence.

## Work & Follow-up domain rules

- Reuse source assignment/lifecycle where it exists; define a new coordination record only after a per-origin gap decision.
- Resolve candidate users and current authority server-side. Preserve tenant/location scope and extra source permissions.
- Bind coordination to stable source occurrence and revision. Same occurrence deduplicates; recurrence does not inherit an obsolete resolution.
- Coordination state, evidence availability, and business outcome remain separate. Acknowledge/read/assign/dismiss does not mean paid/posted/reconciled/closed.
- Persistent changes require attributable history, concurrency protection and idempotent retry behavior. Source-confirmed outcomes are projected into allowed summaries.
- Durable brief receipts bind actor, organization, permitted scope, period and evidence version. New material evidence requires a new review.
- Notifications use existing delivery controls only after their persistence and retry path is verified. Notify on actionable changes, not every unchanged refresh.

Acceptance: CC-01 through CC-07 in the program checklist. No runtime acceptance is conferred by this contract.

## Phase 3 implementation — 24 October 2026

[Phase 3 evidence](../../../docs/command-center/phase-3-2026-10-24/README.md) records source inspection, mocked tests and synthetic browser checks separately. Existing authority and source-command controls remain in force; database and live authenticated verification have not run.

A shared refresh control hides private content while checking access, confirms a new committed page payload, and exposes failure/retry when no replacement arrives. A successful reload does not certify source freshness or complete work. Payload replacement clears proof, agent and visit-only review state, even if generation timestamps are identical. Safe URL state restores only choices present in the new authorized payload. Source handoffs use native links and browser Back; no client-provided return URL is executed.

Reporting periods and Manager deadline classification use UTC. Manager/Owner header times use UTC; Digest generation time may use the declared organization timezone while its reporting period remains UTC. Each source-loading request uses one clock value. Evidence expiry, detection, submission, generation and reconciliation period end are distinct from a source-owned deadline. Missing expiry evidence is unavailable, never a synthetic deadline.


## Phase 4 release review — 24 October 2026

Canonical source-copy translation preserves authored evidence and technical identifiers. Optional proof focus hooks support the actual initiating control without changing source permissions. The location Manager definition lists use valid direct term/description groups. Source caps and unavailable reads must remain explicit.

[Phase 4 evidence](../../../docs/command-center/phase-4-2026-10-24/README.md) and [localization inventory](../../../docs/command-center/phase-4-2026-10-24/LOCALIZATION_REVIEW.md) distinguish source, mocked, static, synthetic-browser and live/manual evidence. Release A remains pending human productivity, manual accessibility, live role/revocation and isolated release-build checks. Database changes and durable Work & Follow-up remain outside this phase.


## Phase 5 bounded foundation — 24 October 2026

[Phase 5 evidence](../../../docs/command-center/phase-5-2026-10-24/README.md) records the first source-owned assignment hardening. Work & Follow-up remains a shared capability across the three planned projections. Current integration uses the existing Manager-to-assurance source handoff; it does not yet provide durable generic signal follow-up or three-view synchronization.

Assignment must send a source revision and stable request ID, recheck current authority on replay and distinguish assignment from business completion. Uncertain transport results retain the identical request and freeze edits until source reload. Conflict/denial requires source reload. Replaced/revoked incident props clear the open form and ignore late responses. No private request payload is retained in browser storage. The full Phase 5 checklist remains open pending all-origin scope and database proof.

## Phase 5 follow-through — 24 October 2026

[Continuation evidence](../../../docs/command-center/phase-5-follow-through-2026-10-24/README.md) adds current module/dependency enforcement at the existing assurance assignment source. A denied or read-only source module requires the existing source-access recovery; assignment retry cannot bypass current entitlement. No new frontend surface is added.

The occurrence and future storage contract distinguishes logical source, retained episode, evidence revision and command identity. Material evidence invalidates review; an old matching hash cannot restore a prior review automatically. Source disappearance remains uncertainty. Notifications remain subject to Phase 5 persistence/scope prerequisites and Phase 6 recipient/delivery gates; this continuation enables no delivery.


## Phase 5 scope verification — 24 October 2026

[Disposable database evidence](../../../docs/command-center/phase-5-database-2026-10-24/README.md) verifies source-owned assurance assignment with current POS location responsibility or tenant-wide authority, explicit tenant-wide aggregate handling, and denial for sources without a proven scope adapter. Both actor and assignee retain independent source/action permission and module requirements. Scope is resolved on the server and rechecked on replay.

Real persistence, concurrent updates, rollback, revocation and existing assurance case/alert-row identity now have bounded PostgreSQL evidence. No frontend changed in this slice. This does not make generic signal follow-up persistent, turn a visit-only Owner review into a durable receipt, or certify all three projections. Whole-program acceptance remains governed by the checklist.


## Phase 6 implementation — 24 October 2026

[Persistence and integration evidence](../../../docs/command-center/phase-6-integration-2026-10-24/README.md) supersedes earlier persistence-not-implemented statements for the seven registered generic aggregate families. Work & follow-up is now embedded in Digest, tenant/location Manager and Owner, behind a default-off server feature flag. It is not a fourth menu. The same source/scope has one persistent occurrence across views and sessions; selected location is server-authorized and retained as safe navigation state. Denied saved locations offer scope reset; every replacement clears private stale content.

The shared close follow-up covers all retained accounting periods; shared payroll evidence covers the rolling next 30 UTC days, including declaration-only obligations. These are separately labelled follow-up scopes, not changes to the old financial summaries. Other current-state sources keep identity across daily/weekly views; inventory loss remains interval-specific. Exact member revisions and retained references bind evidence, with explicit unavailable coverage on cap/disappearance.

Durable receipts apply to the Work & follow-up projection only, binding actor, tenant, scope, reporting interval and monotonic evidence revision. Personal-filtered views must switch to all permitted rows before reviewing. This does not make the existing visit-only financial brief acknowledgement durable or turn review into source approval. In-app notices are persisted and delivered on an authorized visit, with current recipient checks, deduplication, preferences, UTC quiet hours and retry; no background/external transport is enabled.

EN/FR fixture-browser checks and real PostgreSQL service tests are separate evidence classes. Production stays disabled; full authenticated source-workflow E2E, migration-history/artifact rehearsal and human acceptance remain Release B gates. Source links preserve locale and native Back; not all destination pages accept the selected follow-up location/period as filters.
