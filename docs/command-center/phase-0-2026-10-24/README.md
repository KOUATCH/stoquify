# Command Center improvements — Phase 0

Date: 24 October 2026. Status: documentation and source-baseline package complete; implementation and runtime release acceptance remain pending.

## Scope and authorization

The user authorized Phase 0 only: verify the baseline and create page contracts, an action/source map, and an acceptance checklist. This package changes documentation only. It does not authorize application implementation, migrations, production-data changes, deployment, or notification delivery.

**The new Work & Follow-up functionality IS included.** Phase 5 defines its persistent foundation; Phase 6 integrates it into the existing three centers. Manager Action Center hosts the full working interface; Daily Digest presents personal priorities and follow-ups; Owner War Room presents significant exposure, accountability, and outcomes. No fourth top-level center is proposed.

## Deliverables

| Document | Purpose |
|---|---|
| [Baseline](BASELINE.md) | Current evidence, corrections to earlier descriptions, preservation boundaries, unresolved runtime coverage |
| [Source fingerprints](baseline-files.json) | SHA-256 fingerprints of 32 selected current working-tree files |
| [Action/source map](ACTION_SOURCE_MAP.md) | Sources, identities, access, deadlines, completion authority, persistence reuse decisions |
| [Acceptance checklist](ACCEPTANCE_CHECKLIST.md) | Phase gates, owners, fixture specifications, evidence requirements |
| [Shared contract](../../../design-system/stoquify/pages/command-center-shared.md) | Cross-page rules and Work & Follow-up integration contract |
| [Daily Digest contract](../../../design-system/stoquify/pages/daily-digest.md) | Existing behavior and target briefing/workspace experience |
| [Manager contract](../../../design-system/stoquify/pages/manager-action-center.md) | Tenant/location variants, meaningful modes, complete queues, follow-up workspace |
| [Owner contract](../../../design-system/stoquify/pages/owner-war-room.md) | Executive decisions, evidence, review, and outcome presentation |

## Delivery sequence

Priority P1 means required for Release A; P2 means subsequent productivity work. Effort is relative, not a calendar commitment. Role owners below are responsibilities, not named assignees.

| Phase | Priority / effort | Dependencies | Lead | Result |
|---|---|---|---|---|
| 0 | P1 / small | — | Product + engineering | This source baseline and documentation package |
| 1 | P1 / medium | 0 | Frontend + operating-workflow owner | Functional Manager views and all permitted work discoverable |
| 2 | P1 / medium | 0 | Product/design + frontend | Concise Digest and Owner briefings; duplicate blockers consolidated |
| 3 | P1 / medium | 1, 2 | Frontend + domain owners | Consistent ranking, EN/FR, scope, time, navigation, recovery |
| 4 | P1 / medium | 1–3 | QA + release owner | Release A: improved existing experience |
| 5 | P2 / large | 0, 4; persistence decision | Backend + domain owners | Source-aware Work & Follow-up foundation |
| 6 | P2 / medium–large | 5 | Product + frontend/backend | Integrated assignment, follow-up, review, and outcomes |
| 7 | P2 / medium | 5, 6 | QA + release owner | Release B with real persistence and cross-page journey evidence |

Release A must not depend on new follow-up persistence. Existing assurance assignment and close/reconciliation controls remain source-owned. Phase 5 begins with a documented reuse decision, not an assumed new task database.

## Phase 0 conclusion

The current source corroborates Manager mode/list limitations, Digest blocker concatenation, incomplete Manager localization, and session-only Owner acknowledgment. It also establishes reusable domain persistence and a source-owned reconciliation handoff. See the baseline for the precise evidence boundary.

No unit, database, or browser acceptance is claimed by these documents. Prior browser observations are retained as historical context, not a fresh Phase 0 verification. Remaining rendered coverage is explicitly assigned in the checklist and must be completed before the corresponding release gate.

Deferred P3 ideas: automatic reassignment, scheduled escalation, configurable SLA engines, predictive recommendations, and a fourth center. Their absence does not block the authorized improvement program.
