# HR-13 — Scheduling and attendance closure

Active after HR-12 was sealed VERIFIED with 123 hashes and zero drift. User authorized automatic ordered continuation and the independent review workflow. Baseline remains `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared edits.

This L-sized slice is split into three ordered child deliverables:

1. **HR-13A — Published roster truth.** Reuse HrisWorkSchedule preparation and independent approval. Add only dated shift facts and retained schedule revision identity that the current model lacks. Preserve office weekly-minute patterns. Explicit shift timestamps/offsets and timezone must agree; unpaid break intervals and overlaps are validated. Overnight work belongs wholly to its local start date. Employees read only their own published schedules; supervisors use existing exact team scope.
2. **HR-13B — Observation and closure workflow.** Add bounded preview/commit around the existing time-import owner, retaining source identity, row errors and exact replay. Compose a period closure desk from existing anomalies, pending decisions, correction lineage, source readiness and certifyOperationalAttendance. Keep planning, observations, approved corrections and frozen snapshots distinct. Never substitute scheduled time for imported actuals.
3. **HR-13C — Verification and independent review.** Synthetic seven-day office/shift roster, version change, overnight month boundary, timezone/DST ambiguity, breaks, overlap, duplicate import/approval, anomaly→repair→new certification and stale-readiness denial. Real PostgreSQL plus EN/FR manager/employee/denied browser journeys. Save results/hashes and append the existing execution register before proceeding.

## Current source findings

HrisWorkSchedule stores weekly integer minutes and has one unique row per employer/employee/effectiveFrom. It has no dated start/end/break facts or version column. Existing readers use ACTIVE rows, effective dates and approved source hashes; they already support daily minute allocation. assignWorkSchedule creates DRAFT; approveWorkSchedule holds the operational employee lock but currently only reads DRAFT and has no exact approved replay. The period owner preserves frozen snapshot revisions and rejects changed approval evidence on exact replay. Time imports, anomaly status and correction decisions already exist.

## Proposed narrow data change, subject to source/migration inspection

Extend HrisWorkSchedule with a revision (legacy default 1), optional predecessor identity and optional dated shift-plan JSON. Replace the old unique date key with the same key plus revision. No second employee or attendance table. An approved replacement retains and retires its predecessor under the same employee lock; the existing approval owner remains authoritative. Existing consumers continue selecting ACTIVE schedules and bind changed source hashes. Existing rows retain their data and version 1; no guessed shift times or live backfill.

Review every current compound-key caller before changing the unique constraint. Apply reviewed DDL only to the already-owned synthetic loopback database, after inspecting generator/migration side effects. No production migration or application environment fallback. Source schema, generated client and isolated schema must agree before integration tests. No destructive data operation.

## Candidate ownership and controls

Narrow schedule model/migration; operational-time schedule/import/reader seams; new roster/attendance workspace service, pure shift validator, protected actions, client route and focused tests; minimal self/team navigation links; HR-13 evidence. HR-12 shared owner hashes will legitimately change and its historical evidence will not be resealed.

Prepare/publish/revise operations serialize by employee and use exact semantic replay. Publication rejects consumed payroll changes, overlapping shifts and stale predecessor evidence. Explicit offsets resolve DST ambiguity; nonexistent or timezone-mismatched local times are blocked. Off days and coverage gaps are explicit, not inferred absence. Real employer shift patterns, break/overtime rules and attendance source remain pilot inputs; synthetic examples demonstrate behavior only.

Rollback stops publication/import/certification entry points independently while retaining last accepted schedules, observations and certification history. Actual live pilot activation remains outside this implementation step.
