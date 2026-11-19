# HR-04 — Effective employment changes

Status: VERIFIED for the scoped employment-state criteria. Baseline: HR-00 environment and the preserved working tree on 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886. No deployment, scheduler activation or session revocation.

Child slices: HR-04A future/due transition; HR-04B retained replay and historical employment state; HR-04C adjacent employee-writer protection. Owned production files: services/hris/lifecycle.service.ts, employment-projection.ts, employee.service.ts and services/payroll/employee.service.ts. Corresponding lifecycle/profile tests and the isolated PostgreSQL suite changed. No schema migration.

Approved future changes remain pending and return applied=false with scheduledFor; they do not change current status, dates, assignment fields or contracts. The existing fresh-auth apply action is the explicit due command. At or after the supplied effective instant, it rechecks the current employment-state hash, independent actor, tenant-owned target and frozen payroll boundaries. Employee advisory/row locks serialize request/decision/application with attendance and payroll consumers. A retry retrieves the retained applied event; it cannot duplicate the transition.

Applied events retain before/after employment states and separate access/contract/compensation follow-up ownership. Employment as-of reads reconstruct applied facts; future approval remains separate pending information. Legacy movements without sufficient before-state evidence fail explicitly. Rehire preserves old dates in history while establishing the new current hire date. Last-applied chronology survives later request/approval metadata updates.

The generic profile writer now requires lifecycle for active employment-date/assignment changes and uses a timestamp plus metadata compare-and-set for existing records. Omitted assignment fields are preserved. Future pending lifecycle requests no longer make current source-readiness appear due before their effective instant.

## Acceptance

| Criterion | Evidence |
|---|---|
| HR-04-AC01 | PASS — future termination leaves employee metadata/status and termination date unchanged; unit boundary test verifies no contract writes. Source-readiness test checks before/exact effective instant. |
| HR-04-AC02 | PASS — two real concurrent due commands both recover one event/audit and one retained outcome; unit clock crosses the exact boundary. |
| HR-04-AC03 | PASS for employment-state projections — real transfer and rehire before/after reads, retained original hire/termination dates, pure past/current/future projections. Future approval is never represented as an applied fact. |
| HR-04-AC04 | PASS — real frozen attendance blocks backdated application and remains unchanged; existing payroll-line blocker unit test retained. |
| HR-04-AC05 | PASS — changed employment fields, removed permission, independent-review checks, audit-write and event-write failure rollback and recovery. |

## Verification

- Mocked units: 35 tests / three suites pass (unit.json): lifecycle, HR facade and payroll employee source.
- Real PostgreSQL: seven HR-04 tests pass, 31 other-slice tests intentionally skipped, cleanup passes (postgres.json). Synthetic contract approval markers exercise the existing starter-readiness boundary; they do not qualify an actual contract or employer.
- Focused TypeScript: zero diagnostics (typecheck.txt). No full build or migration replay.
- Browser, live auth/session revocation, provider and statutory review: not run. This slice has no new UI. Existing protected actions supply fresh authenticated actor/permissions; service-level removed-permission testing is not a live session revocation test.
- One test initially expected the injected event error instead of the existing sanitized error. Its assertion now respects the event service's public error contract; rollback assertions remain intact.

## Controls, limits and recovery

Architecture/data: one employee master; existing transactions/events/audit and immutable payroll evidence. Backend/quality: ordered due execution, semantic identity and recoverable retained result. Security/privacy: tenant target validation, independent actor, fresh-auth action boundary, no claim that status revokes access. HR/workflow: scheduled versus applied explicitly distinguished. Finance: frozen inputs remain protected; existing contract/compensation closing rules are reused. Historical contract and compensation eligibility are separate service obligations, not certified by the employment-state projection. Business input supplies the effective instant; no new implicit jurisdictional timezone or legal day-count rule is invented. UI/accessibility and AI/POS/AP/provider transport: not applicable to this service change.

Support runs the existing apply action again at/after scheduledFor with fresh authority. This change does not install an automatic due worker. Stale source or legacy proof requires a fresh reviewed request; frozen evidence requires the existing correction workflow. Access removal and broader onboarding/offboarding tasks belong to HR-17 and remain unimplemented here.

Rollback: stop affected application commands, retain all pending/applied history and reconcile from retained event IDs. Never undo a committed termination by rewriting old payroll. Next: finish HR-03's now-confirmed start-date policy/completeness evidence, then HR-05 manager authorization.
