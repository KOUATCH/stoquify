# Phase 0 baseline and evidence

Date: 24 October 2026. HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`.

## Evidence boundary

This assessment describes the **current working tree**, not a clean checkout or deployed release. [baseline-files.json](baseline-files.json) records byte-level SHA-256 fingerprints of 32 selected files, captured before writing this package. A fingerprint establishes file identity, not behavioral correctness.

Repository instructions, workflow, command registry, design master, and existing page-contract conventions were inspected. Existing UI/UX Pro Max guidance from this conversation was retained; no generated design system or new design tokens were adopted. No delegation was used.

The existing graph refresh record is dated 9 August 2026. Component discovery nodes are `daily_habit_dailyhabitdigestdashboard_tsx` (community 156), `manager_action_center_manageractioncenterdashboard_tsx` (125), and `owner_war_room_ownerwarroomdashboard_tsx` (24). Current source takes precedence over their historical locations and relationships. Graphs were not regenerated.

## Navigation and authority

| Surface | Current route without locale prefix | Source-confirmed authority |
|---|---|---|
| Daily Digest | `/dashboard/daily-digest` | Route accepts any of dashboard, finance, close, inventory, analytics read permissions listed in its catalog; workspace/role/module and source filtering further constrain results |
| Manager Action Center | `/dashboard/manager-action-center` | Dashboard read plus resolved operating authority; TENANT/TENANT_WIDE and LOCATIONS/LOCATION_RESPONSIBILITY use different query paths |
| Owner War Room | `/dashboard/owner-war-room` | Dashboard read plus service-level tenant-wide operating authority; page name alone does not confer owner access |
| Branch daily close | `/dashboard/manager-action-center/daily-close` | Existing contextual journey, not a fourth Command Center submenu; source-owned location/day review and sign-off |

Evidence: [navigation](../../../config/sidebar.ts), [Digest catalog](<../../../app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-data-access.ts>), [Manager query](../../../services/manager-action-center/manager-action-center-query.service.ts), [Owner service](../../../services/owner-war-room/owner-war-room.service.ts).

Sidebar visibility is not authorization. The sidebar's dashboard permission and the Digest route's broader any-permission catalog are different contracts; verify discoverability for those permitted roles before changing either.

## Current capability register

Status terms: **implemented** = source path exists; **partial** = foundation exists but the intended experience is incomplete; **gap** = absent in the inspected scoped path; **unverified** = no adequate runtime evidence. None means deployed certification.

| ID | Capability / finding | State and source evidence | Phase |
|---|---|---|---|
| B01 | Three existing submenus | Implemented in sidebar; no fourth destination needed | 0 |
| B02 | Digest modes and deep links | Implemented: conditional sections, `digest`/`mode` URL restoration and `replaceState`; preserve existing local edits | 2–3 |
| B03 | Manager mode behavior | Partial: `commandMode` drives header selection but not main content sections in tenant component | 1 |
| B04 | Complete Manager queue | Gap: priority board previews 8, tenant list 10, lane previews 3; no all-items mechanism in these components | 1 |
| B05 | Upstream completeness | Partial: Digest intentionally selects top 5 actions/signals; missing-proof source caps at 100; source coverage must accompany queue totals | 1 |
| B06 | Digest blocker grouping | Gap: concatenates tenant blockers and role-signal blockers without grouping in `buildDigest`; do not group by translated label | 2 |
| B07 | Owner compact modes and proof | Implemented: compact header, separate brief/command/investigate sections, proof drawer | 2 |
| B08 | Manager localization | Partial: shared header defaults to English when no locale supplied; service brief/lane copy is English; some direct `next/link` action paths lack locale | 3 |
| B09 | Priority explanation | Partial: service ranks severity, due time, then score; brief can instruct overdue-first independently; final stable identity tie-break is not explicit | 3 |
| B10 | Time semantics | Snapshot boundaries and Manager due-today comparison use UTC; signal deadlines may be derived from expiry/current time, not a business obligation | 3 |
| B11 | Owner review receipt | Session-only component state; service returns not_started/null timestamp; no persistent receipt in inspected path | 5–6 |
| B12 | Generic action lifecycle | Pure assignment/resolve/dismiss/event helpers exist; production search under actions/services found declarations but no non-test callers of those helpers | 5 |
| B13 | Assurance incident lifecycle | Existing database-backed incident/event models, protected assignment/resolution actions, transactions, and source-hash checks; reuse as domain authority | 5 |
| B14 | Missing-close-proof work | Existing request/response records read from close findings and accountant comments; Manager adapter projects their lifecycle | 5–6 |
| B15 | Reconciliation sign-off | Existing candidate projection and handoff to Finance; current Manager component links to `?reviewRun=...`, does not itself sign | 1–6 |
| B16 | Branch close | Existing run/sign-off persistence and guarded review/sign-off journey; aggregate follow-up must not duplicate its state | 5–6 |
| B17 | Generic signal notifications | Preference/quiet-hour decision helper exists; this alone does not prove durable delivery/retry integration | 6 |
| B18 | Shared Work & Follow-up | Planned: personal/team queues and outcome summaries across all three centers; not implemented by this package | 5–6 |

Primary presentation sources: [Digest](../../../components/daily-habit/DailyHabitDigestDashboard.tsx), [Manager](../../../components/manager-action-center/ManagerActionCenterDashboard.tsx), [location Manager](../../../components/manager-action-center/ManagerLocationActionCenterDashboard.tsx), [Owner](../../../components/owner-war-room/OwnerWarRoomDashboard.tsx), [shared header](../../../components/bi/BICommandBriefHeader.tsx), [priority board](../../../components/bi/BIActionPriorityBoard.tsx). Source lifecycles are linked in the [map](ACTION_SOURCE_MAP.md).

## Corrections and decisions carried into implementation

1. The Manager reconciliation component's name is not evidence of an inline command. Preserve its current handoff to the Finance workspace, which owns signing and recovery.
2. Persistent assignment is not absent throughout Stoquify: assurance incidents already implement it. Generic signal follow-up remains a separate integration gap.
3. Pure action helpers are not authorization endpoints. Candidate validation is conditional on receiving a candidate; a future mutation boundary must always resolve the candidate and trusted actor/scope itself.
4. Generic `resolveActionItem` accepts a resolution note; it is not proof that payment, stock, payroll, or close work completed. Completion must derive from the source.
5. A signal's deterministic hash is not automatically a durable occurrence identity. Aggregate subjects such as `latest`/`open-suspense` and default dedupe scope `current` need recurrence and location analysis before persistence.
6. No schema is selected or modified in Phase 0. Phase 5 must choose source reuse or an additive coordination record per origin, with explicit source authority and evidence revision.

## Working-tree preservation

Pre-existing modifications include Digest presentation and its mode tests, the design master, package scripts/command registry, schema, accounting/reconciliation services, and extensive unrelated accounting/onboarding/public-site work. These were not reset, staged, formatted, or repaired.

Ownership for this turn: new files under `docs/command-center/phase-0-2026-10-24/`, four new Command Center page contracts, and only the new contract-index rows in the already-modified design master. Do not commit other edits with this package. Fingerprint comparison verifies the selected 32-file boundary; it is not a whole-repository content comparison.

## Executed verification

| Evidence class | Result |
|---|---|
| Source inspection | Completed for scoped routes, components, services, lifecycle helpers, source persistence, and relevant schema declarations |
| Workflow contract | `npm run agent:workflow:check` passed, exit 0; 196 scripts outside manifest. Runner, registry entry, and absent npm pre/post hooks inspected first |
| Documentation integrity | Read-only `python -B -` check passed, exit 0: 9 Markdown files including the master, 104 local links resolved, 64 unique acceptance IDs, no future-phase criteria marked passed |
| Selected source preservation | Same read-only checker recomputed all 32 manifest SHA-256 fingerprints: zero drift |
| Master patch whitespace | `git diff --check -- design-system/stoquify/MASTER.md` passed; master diff has five added rows versus HEAD, including the pre-existing accountant-portfolio row; this task owns only the four Command Center rows |
| Mocked unit/component tests | Not run; documentation-only task |
| Real database tests | Not run; no application/database commands or fixture creation |
| Fresh browser checks | Not run in Phase 0 |
| Build / migrations / deployment | Not run |

Prior same-conversation browser evidence: English Super Admin Digest and tenant Manager accessibility-tree inspection; repeated blockers, 15 reported actions versus truncated lists, and mode-selected-state-only change observed. Owner, French, location-scoped Manager, mobile, full keyboard and pixel-level checks were not completed. Computer Use ended on a Windows URL-confidence safety check. No new browser claims, saved screenshots, viewport measurements, or fixture certification are inferred from that run.

## Outstanding decisions and verification ownership

| Item | Owner / required phase | Resolution criterion |
|---|---|---|
| Genuine deadline versus expiry/follow-up | Domain owners / 3 | Document meaning per origin; no silent source-date mutation or rolling deadline |
| Stable occurrence and location identity | Backend + domain owners / 5 | Distinguish same occurrence from recurrence; prevent cross-location collision |
| Follow-up persistence | Backend / 5 | Reuse existing source lifecycle; propose only missing coordination storage |
| Return navigation | Frontend / 3 | Validate locale-aware internal destinations and preserve safe context |
| Notification delivery reuse | Backend / 6 | Trace actual durable sender, idempotency, permissions and preferences before enabling |
| Browser and accessibility matrix | QA / 1–4, 6–7 | Execute named fixtures and record route, role, locale, viewport and state |

Phase 0 documentation is complete when its links, traceability, and selected source preservation are verified. Runtime implementation acceptance remains unchecked in the [checklist](ACCEPTANCE_CHECKLIST.md).

Final verification: the documentation checks above completed successfully. The ad hoc Python verifier only read Markdown, the manifest and selected source bytes; it did not import application modules, load environment files, or contact services. New documents are untracked and the master remains modified; nothing was staged or committed. Rollback is limited to removing this package's new documents and its four master index rows, preserving all pre-existing edits.
