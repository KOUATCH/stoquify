# Daily Digest page contract

Date: 24 October 2026. Status: Phase 2 briefing implementation; human usability trial pending. Follow [shared Command Center contract](command-center-shared.md) and [MASTER](../MASTER.md). See the [Phase 2 evidence and limitations](../../../docs/command-center/phase-2-2026-10-24/README.md).

Route: `/[locale]/dashboard/daily-digest`. Sources: [page](<../../../app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx>), [component](../../../components/daily-habit/DailyHabitDigestDashboard.tsx), [service](../../../services/daily-habit/daily-habit-digest.service.ts).

## Current baseline to preserve

The route accepts an any-permission catalog and further filters workspaces by roles, operating authority, modules and source visibility. Owner/manager/finance/accountant/stockkeeper/end-of-day/weekly definitions do not mean all seven are visible to every actor. Current component has real Brief/Command/Investigate regions, `digest`/`mode` URL state, source-unavailable explanations and localized presentation. The current file and mode tests contain unrelated pre-existing edits; preserve them.

Phase 0 gaps addressed in Phase 2: repeated headers/metadata, prominent disabled agent presentation, and concatenated blocker summaries. A single compact header, leading source-action preview and source-aware blocker disclosure now implement the briefing hierarchy. Top-five service signal/action selection remains a deliberate summary, not a complete work inventory. Command shows every supplied Digest action. Agent rollout/proposal gating is existing functionality; generating an enabled agent brief or proposal can persist records despite the operational summary being read-only.

## Target Release A (Phases 2–3)

| Region | Required behavior |
|---|---|
| Header | One page h1, short conclusion, organization, selected period/timezone, currency, source freshness; no repeated metadata wall |
| Workspace selector | Show permitted choices; preserve selection through valid URL state; invalid or newly revoked choice falls back safely |
| Brief | Leading business priorities and key observations; distinguish current observations from true comparisons |
| Command | Summary action list with next step, limitation and permitted source link; explicit access to more work where available |
| Investigate | Source details, evidence, blockers and redactions; retain safe links and explanatory unavailable states |
| Optional agent | Preserve access/release gates; unavailable feature uses a compact explanation and does not displace the briefing |

Group blockers by stable source identity and scope, never display text alone. Different records with the same label remain distinguishable. Preserve all affected-source details in disclosure; critical restrictions remain visible. Keep an accessible native link to each source and preserve the existing scroll-to-source behavior where compatible with return context.

Period semantics: current daily/custom source ranges use UTC boundaries, weekly is a rolling seven-day range ending on the selected end date. Some balances retain current-state meaning; do not imply that every metric is a period movement. Generated time can use organization timezone but must not be confused with period boundaries or source update time.

## Planned Work & Follow-up (Phases 5–6)

Show personal priorities, approaching follow-ups, requests requiring the viewer's response and source-confirmed outcomes. The selected digest remains an audience-specific projection; it does not become an independent task database. Use the same source occurrence identity as Manager/Owner for shared items. Personalization cannot broaden source visibility. Distinguish responsibility role from an actual assigned person; do not invent an assignee.

## Acceptance and ownership

Product/frontend own briefing hierarchy; domain owners own evidence semantics. Requirements: CC-02.1–CC-02.8, CC-03.1–CC-03.9, CC-06.1–CC-06.8 and shared-state/accessibility checks.

Verify empty permitted workspaces, partial sources, revoked access, stale data, duplicate blockers, more-than-five summary items, English/French, browser back, safe source navigation and narrow-width reflow. Fixtures and test evidence are specified in the [checklist](../../../docs/command-center/phase-0-2026-10-24/ACCEPTANCE_CHECKLIST.md). Phase 2 records bounded mocked/service/browser evidence separately; live session, database and human productivity validation are not implied.

## Phase 3 implementation — 24 October 2026

[Phase 3 evidence](../../../docs/command-center/phase-3-2026-10-24/README.md) records source inspection, mocked tests and synthetic browser checks separately. Existing authority and source-command controls remain in force; database and live authenticated verification have not run.

A shared refresh control hides private content while checking access, confirms a new committed page payload, and exposes failure/retry when no replacement arrives. A successful reload does not certify source freshness or complete work. Payload replacement clears proof, agent and visit-only review state, even if generation timestamps are identical. Safe URL state restores only choices present in the new authorized payload. Source handoffs use native links and browser Back; no client-provided return URL is executed.

Reporting periods and Manager deadline classification use UTC. Manager/Owner header times use UTC; Digest generation time may use the declared organization timezone while its reporting period remains UTC. Each source-loading request uses one clock value. Evidence expiry, detection, submission, generation and reconciliation period end are distinct from a source-owned deadline. Missing expiry evidence is unavailable, never a synthetic deadline.

Digest role projections use risk score then stable identity. Generated priority copy uses the same leading action in EN/FR. Source links use the selected locale. Changes to agent access/proposal gates invalidate the panel state.


## Phase 4 release review — 24 October 2026

Freshness and unavailable source-action explanations use the reviewed EN/FR canonical-copy helper. Existing template, role, timezone, source-authority and visit-only review semantics remain in force.

[Phase 4 evidence](../../../docs/command-center/phase-4-2026-10-24/README.md) and [localization inventory](../../../docs/command-center/phase-4-2026-10-24/LOCALIZATION_REVIEW.md) distinguish source, mocked, static, synthetic-browser and live/manual evidence. Release A remains pending human productivity, manual accessibility, live role/revocation and isolated release-build checks. Database changes and durable Work & Follow-up remain outside this phase.
