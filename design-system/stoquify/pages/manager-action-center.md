# Manager Action Center page contract

Date: 24 October 2026. Status: Phase 1 functional modes and complete loaded queue implemented; later phases remain planned. [Phase 1 evidence](../../../docs/command-center/phase-1-2026-10-24/README.md). Follow [shared contract](command-center-shared.md) and [MASTER](../MASTER.md).

Routes: `/[locale]/dashboard/manager-action-center` and contextual `/daily-close`. Sources: [tenant component](../../../components/manager-action-center/ManagerActionCenterDashboard.tsx), [location component](../../../components/manager-action-center/ManagerLocationActionCenterDashboard.tsx), [query](../../../services/manager-action-center/manager-action-center-query.service.ts), [tenant service](../../../services/manager-action-center/manager-action-center.service.ts).

## Phase 0 baseline (historical) and controls to preserve

The server resolves one of two paths: TENANT with TENANT_WIDE authority, or LOCATIONS with LOCATION_RESPONSIBILITY. The latter validates assigned managed locations and builds separate branch bundles; it must never receive a tenant-wide payload and merely hide it in CSS. Page titles are not authorization rules.

Tenant mode selection currently changes the header state without selecting main sections. Priority board/list/lane previews cap at 8/10/3. Service priority order is severity, due time, score; brief recommendation and lane precedence are separately computed. Shared locale defaults and direct source links create incomplete localization. These findings apply to the tenant component; do not blindly retrofit its DTO into the location component.

Existing reconciliation control is a handoff to Finance with `reviewRun`; it does not sign in this page. Existing branch daily-close review/sign-off remains a contextual source workspace, not a new submenu.

## Target Release A (Phases 1–3)

| Mode | Primary content | Secondary content |
|---|---|---|
| Brief | Up to three leading priorities and a conclusion derived from their ranking | Compact authorized totals, clear link to the complete queue |
| Command | All authorized work with source, urgency, role and permitted location filters | Selected action detail, supported source handoff, compact urgency-filter summaries |
| Investigate | Evidence quality, source freshness, blockers and coverage | Proof/source links, explicit permission and unavailable-source recovery |

Count semantics: show authorized total, filtered result count and preview/page size separately. Upstream capped/unavailable sources must have coverage wording. A preview never silently becomes the only access to a counted item. Sorting must be stable for ties. Urgency-lane badges filter the queue; collapsed empty lanes keep compact zero counts without large empty panels.

Safe mode/filter context is shareable in URLs and restored on back/refresh. Invalid filters fall back safely. Changing scope or losing authority clears inaccessible details. The location variant must offer comparable discoverability within its authorized bundles while retaining source scope and branch-specific metrics.

Explain why a leading item outranks others. Blocked/high/overdue are distinct dimensions; do not present a blocked item as immediately executable. Preserve source severity policy until an explicit domain decision changes it. Label fallback/generated dates accurately; user-visible deadlines cannot roll forward with refresh.

## Planned Work & Follow-up (Phases 5–6)

This page hosts the full workspace: personal/team views, authorized assignment, follow-up dates, handoffs and history. Reuse assurance's assignment and incident transitions. Respect accountant-request recipient/review states and source-owned commands. Generic signal helpers require a protected persistent integration before exposing mutation controls. Resolve the candidate on the server, validate current permissions and location authority, and retain event history and concurrency behavior.

Do not add a generic "Mark complete" that overrides domain evidence. Provide source-specific next steps and distinguish coordination progress from verified business resolution. Source disappearance or access loss must not become a successful completion.

## Acceptance and ownership

Frontend and operating-workflow owners lead Phases 1/3; backend/domain owners lead Phase 5. Requirements: all CC-01, CC-03, CC-05 and relevant CC-06 criteria in the [checklist](../../../docs/command-center/phase-0-2026-10-24/ACCEPTANCE_CHECKLIST.md).

Verify 0/1/10/25 authorized items, source caps, sorting ties, real deadlines versus expiry, tenant/location denial, EN/FR, keyboard modes/filters, source navigation and back, and unavailable-source recovery. Shared UI changes require regression coverage of other consumers. No database or rendered behavior is certified by this contract.

## Phase 3 implementation — 24 October 2026

[Phase 3 evidence](../../../docs/command-center/phase-3-2026-10-24/README.md) records source inspection, mocked tests and synthetic browser checks separately. Existing authority and source-command controls remain in force; database and live authenticated verification have not run.

A shared refresh control hides private content while checking access, confirms a new committed page payload, and exposes failure/retry when no replacement arrives. A successful reload does not certify source freshness or complete work. Payload replacement clears proof, agent and visit-only review state, even if generation timestamps are identical. Safe URL state restores only choices present in the new authorized payload. Source handoffs use native links and browser Back; no client-provided return URL is executed.

Reporting periods and Manager deadline classification use UTC. Manager/Owner header times use UTC; Digest generation time may use the declared organization timezone while its reporting period remains UTC. Each source-loading request uses one clock value. Evidence expiry, detection, submission, generation and reconciliation period end are distinct from a source-owned deadline. Missing expiry evidence is unavailable, never a synthetic deadline.

Tenant queue ranking is severity, actual source deadline, risk score, then stable action identity. Only real deadlines contribute to overdue/due-today lanes. Location signal queues use risk score then stable identity; evidence expiry does not create deadline urgency. Brief explanations name the actual leading item and preserve blocked-action limitations.


## Phase 4 release review — 24 October 2026

The tenant coverage panel distinguishes available, possibly capped (25 pre-permission source rows), unavailable and unconfirmed assurance coverage. Failed source loading is not completion. The location variant localizes authority/severity and canonical branch blockers, with valid metadata/action definition lists. No source query or persistence changed.

[Phase 4 evidence](../../../docs/command-center/phase-4-2026-10-24/README.md) and [localization inventory](../../../docs/command-center/phase-4-2026-10-24/LOCALIZATION_REVIEW.md) distinguish source, mocked, static, synthetic-browser and live/manual evidence. Release A remains pending human productivity, manual accessibility, live role/revocation and isolated release-build checks. Database changes and durable Work & Follow-up remain outside this phase.


## Phase 5 source assignment foundation — 24 October 2026

Manager keeps its existing assurance source link. The destination assignment form now requires a current revision, preserves the request ID for uncertain retries, and requires source reload after conflict/denial. The server derives role and validates current actor/assignee tenant and source-definition permissions. Recording an assignment does not resolve the business source. Existing due dates survive blank input.

[Phase 5 evidence](../../../docs/command-center/phase-5-2026-10-24/README.md) separates mocked/static/rendered checks from unrun database proof. Location/module eligibility, generic signal persistence and durable cross-page follow-through remain pending; no universal assignment control is added to the queue.
