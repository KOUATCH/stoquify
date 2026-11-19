# Owner War Room page contract

Date: 24 October 2026. Status: Phase 2 observation semantics implemented; human usability trial pending. Follow [shared contract](command-center-shared.md) and [MASTER](../MASTER.md). See the [Phase 2 evidence and limitations](../../../docs/command-center/phase-2-2026-10-24/README.md).

Route: `/[locale]/dashboard/owner-war-room`. Sources: [page](<../../../app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx>), [component](../../../components/owner-war-room/OwnerWarRoomDashboard.tsx), [service](../../../services/owner-war-room/owner-war-room.service.ts).

## Current baseline to preserve

Dashboard permission and service-level tenant-wide operating authority apply; the page is not automatically available to every user with an owner-like title. Source modules/permissions further limit evidence. Existing compact header, real brief/command/investigate sections, three leading priority actions/risks, and proof drawer are useful foundations.

Current acknowledgment is component-local and explicitly visit-only. Server review timestamps are null and acknowledgment starts as not_started. Current deterministic org-based brief ID is not a unique immutable review version. Phase 2 labels the service events as current observations and the historical comparison as unavailable. There is no validated comparable historical pair; the page must not infer measured deltas from current values.

## Target Release A (Phases 2–3)

| Mode | Required experience |
|---|---|
| Brief | Concise business conclusion, significant exposure, leading decisions/actions, source limitations and coverage |
| Command | Operational detail and authorized source handoffs; explain responsible role and blocking dependency when supported |
| Investigate | Source/proof detail, freshness, redactions and controls, with clear scope and return context |

Each significant risk should answer: what is affected, why attention is needed, what evidence supports it, and what permitted step follows. Show an accountable person only when supported and authorized; otherwise show role or unassigned state. Do not fabricate currency impacts, owners, trends or estimated savings.

Separate new observations from actual period comparisons. Comparable deltas require aligned source definition, scope, period and currency/unit; otherwise label the comparison unavailable. Evidence drawer loading/failure/empty states are distinct, and focus returns to its trigger. Keep technical module/enforcement detail secondary to business decisions while preserving authorized access.

## Planned Work & Follow-up (Phases 5–6)

Show significant unresolved items with accountable role/person, meaningful deadline/follow-up, dependency, coordination progress and verified source outcome. Link to the Manager queue or authoritative workspace without broadening access. Executive aggregation must disclose partial coverage and must not expose employee-level payroll data through follow-up metadata.

If durable review is introduced, persist a read receipt bound to organization, actor, allowed scope, period and evidence revision. Preserve prior receipt history; material new evidence requires a new review. A receipt is not financial approval, certification, risk resolution, or source completion. Keep visit-only copy until persistence exists and passes its own tests.

## Acceptance and ownership

Product/domain owners own risk meaning and comparison policy; frontend owns presentation; backend owns any new receipt persistence. Requirements: applicable CC-02/CC-03, CC-05.1–CC-05.10, CC-06.1–CC-06.8 and release gates in the [checklist](../../../docs/command-center/phase-0-2026-10-24/ACCEPTANCE_CHECKLIST.md).

Verify tenant-authority denial, no visible risks, partial/stale evidence, absent comparison, evidence drawer error/focus behavior, changed receipt version, EN/FR and mobile. Current source inspection does not certify these rendered or persistent cases.

## Phase 3 implementation — 24 October 2026

[Phase 3 evidence](../../../docs/command-center/phase-3-2026-10-24/README.md) records source inspection, mocked tests and synthetic browser checks separately. Existing authority and source-command controls remain in force; database and live authenticated verification have not run.

A shared refresh control hides private content while checking access, confirms a new committed page payload, and exposes failure/retry when no replacement arrives. A successful reload does not certify source freshness or complete work. Payload replacement clears proof, agent and visit-only review state, even if generation timestamps are identical. Safe URL state restores only choices present in the new authorized payload. Source handoffs use native links and browser Back; no client-provided return URL is executed.

Reporting periods and Manager deadline classification use UTC. Manager/Owner header times use UTC; Digest generation time may use the declared organization timezone while its reporting period remains UTC. Each source-loading request uses one clock value. Evidence expiry, detection, submission, generation and reconciliation period end are distinct from a source-owned deadline. Missing expiry evidence is unavailable, never a synthetic deadline.

Owner action/risk queues use risk score then stable identity. Queue explanations remain separate from the existing cash/close/payroll business recommendation and its permission gates. Proof requests clear prior evidence and ignore superseded/closed requests; replacing the authorized payload unmounts the drawer. Owner modes now restore from validated URL state.


## Phase 4 release review — 24 October 2026

Command displays every supplied authorized action with a loaded count; the previous seven-item cap is removed. Brief remains a preview. Proof close restores focus to its initiating header or Investigate control, including pending reads; closed/superseded responses remain ignored. Canonical source details/freshness and module-control labels support EN/FR.

[Phase 4 evidence](../../../docs/command-center/phase-4-2026-10-24/README.md) and [localization inventory](../../../docs/command-center/phase-4-2026-10-24/LOCALIZATION_REVIEW.md) distinguish source, mocked, static, synthetic-browser and live/manual evidence. Release A remains pending human productivity, manual accessibility, live role/revocation and isolated release-build checks. Database changes and durable Work & Follow-up remain outside this phase.
