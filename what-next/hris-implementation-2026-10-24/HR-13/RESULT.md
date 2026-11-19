# HR-13 — Scheduling and attendance closure

Status: **VERIFIED (scoped engineering evidence)**. Baseline: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared edits. HR-10 and HR-12 dependencies were already verified; their historical shared-file hashes are not resealed. User authorized automatic ordered continuation and independent review.

Office and dated shift schedules now have retained revisions, independent publication and exact retry recovery. Local start-date allocation, explicit offsets, breaks, neighboring overlap checks, holiday-policy admission and consumed-payroll boundaries are enforced. Published own/team views, bounded attendance-file preview, duplicate recovery, reconciled receipts and a period closure desk are connected to native owners. Rejected observations require actual repair; corrections retain original observations and produce new certifications. Shared certification derives actual preparers instead of trusting a caller-supplied identity.

## Acceptance

| Criterion | Result | Evidence |
|---|---|---|
| HR-13-AC01: seven-day mixed roster draft/review/publish/change | PASS | `roster.postgres.test.ts` mixed roster, parallel replay, same-interval correction and finite fallback; EN/FR prepare/publish browser journey; revision component regressions. |
| HR-13-AC02: overnight month boundary | PASS | Explicit user policy: whole shift on local start date. Pure DST/break/overlap cases and real PostgreSQL 450-minute month-end plan; shared period-allocation regressions. No split into the next period is invented. |
| HR-13-AC03: import/approval replay does not add time | PASS | Parallel batch and schedule replay, cross-batch provider deduplication, changed source/key conflict, retained receipt. |
| HR-13-AC04: anomaly repair, new certification, stale readiness | PASS | Real OPEN anomaly blocks certification; valid linked replacement permits closure; 360→480 correction retains original and creates successor; stale payroll evidence denied; direct/adjacent importer self-certification denied. |
| HR-13-AC05: exact team/own scope and low-width usability | PASS | PostgreSQL report-only scope and revoked relationship denial; own/foreign/unlinked denial; EN/FR manager and employee browser checks at 360/768/1440; denied view. |

## Separate verification lanes

- Source/migration review: independent reviewer R1–R7 closed. See [review](INDEPENDENT-REVIEW.md). Canonical hashing, current call sites and native owners inspected; no graph count is treated as behavioral proof.
- Pure/mocked/component/action: **46 passing tests in 6 suites**, `unit-final.log`. Source-owner mocks are explicitly separate from real locks/constraints.
- Real PostgreSQL: **13 cases**, including integrated browser fixture, `postgres-browser-final.log`; **60 shared HR correctness cases**, `shared-correctness-first.log`. Fixture cleanup asserts zero owned fixture organizations.
- Rendered browser: **14 result records**, `browser/results.json`, actual React/CSS/service/PostgreSQL journeys with synthetic HTTP role/action transport. Screenshots under `browser/`. Keyboard submission/status focus and horizontal reflow tested. No full-screen-reader or production-session claim.
- Static: scoped TypeScript diagnostics **0**, with separate route check for final error-state wording; schema validation and generated-client verification pass. Workflow contract and owned diff checks pass.
- Not run: production migration/seed/deployment, provider attendance connection, live employer pilot, statutory rule review, full application build/authenticated end-to-end or assistive-technology certification.

The first mocked run exposed an outdated test double after the native import owner changed; the fixture was updated to include canonical hashing and retained-record queries. Failed logs remain visible. Final counts refer only to the final passing artifacts listed in evidence.json.

## Review lenses and limits

Architecture/backend/database: existing schedule, import, correction and snapshot owners reused; no second attendance or employee master. Security/privacy: fresh protected actions, exact server-owned identity, existing team/own scope and independent actors. UX/accessibility/localization: EN/FR, explicit context, preserved revision facts, focus and reflow; broader accessibility remains unclaimed. Payroll/accounting: retained evidence, stale-consumption rejection, no financial posting or country expansion. QA/SRE: deterministic retry, bounded files/history and separate test classes; live capacity is unmeasured. Legal/country-pack changes, AI/agents, provider/offline infrastructure and commercial packaging are not applicable to this bounded scheduling slice; existing gates remain unchanged.

See [operations](OPERATIONS.md) for migration coordination, rollback and live-pilot decisions. Next eligible step: **HR-14**, automatically under the user's continuation instruction.
