# HR-02 — Approved attendance correction revisions

Status: VERIFIED for the bounded acceptance below. Baseline: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus the preserved inherited tree and HR-01. No deployment or production certification.

## Implementation and ownership

Child slices: HR-02A immutable correction identity and decision; HR-02B snapshot revision/replay and payroll consumption; HR-02C request form and recovery evidence. All remain inside HR-02.

Owned production surfaces: services/hris/attendance-correction.ts, operational-attendance.service.ts, operational-time.service.ts, time-leave.contract.ts, time-leave.service.ts, self-service.service.ts; services/payroll/payroll-control.service.ts; actions/hris/operational-time.actions.ts; components/hris/HrisOperationalTimeRequestPanel.tsx and HrisEmployeeSelfService.tsx. Narrow test fixtures and dedicated PostgreSQL/component tests accompany them. No schema change.

Corrections bind the tenant/employee, exact validated entry/date, reviewed base hash, before/after minutes and request semantics. Original imports remain intact. Approved corrections form an ordered overlay; stale contenders fail instead of replacing each other. A transaction-scoped employee lock orders correction decisions, certification, attendance freeze and payroll calculation. The caller retains ownership of supplied transactions.

The operational certification orchestrator derives revisions from the retained snapshot chain, returns the same revision for exact retries, and requires fresh approval evidence after source changes. It uses the existing linked snapshot correction service. Payroll calculation refuses pending or approved-but-uncertified corrections. Calculated/paid periods return the existing payroll-correction-run blocker. Legacy corrections without a reviewed target must be resubmitted; they are not silently applied.

The EN/FR form exposes current and proposed minutes, derives the employee on the server, binds the selected source hash, preserves values on resolved/thrown failures and focuses the committed error summary. Browser testing found and fixed a transition/focus timing issue.

## Acceptance

| Criterion | Result and evidence |
|---|---|
| HR-02-AC01 | PASS — real PostgreSQL import fixture 360→480, pending blocked, rejected unchanged. postgres-regression.json. |
| HR-02-AC02 | PASS — original imported entry, original snapshot totals, source hash and metadata retained; original snapshot status alone superseded. |
| HR-02-AC03 | PASS — exact replay returns one revision, changed request values conflict, two simultaneous corrections have one winner. |
| HR-02-AC04 | PASS — changed snapshot hash, old certification rejected by the calculation guard, stale approval hash rejected, newly reviewed certification accepted. Guard wiring also covered by calculator regressions. |
| HR-02-AC05 | PASS — frozen input produces a linked revision; CALCULATED and PAID runs explicitly block correction approval without mutation. Caller-aborted revision rolls back and recovers. |
| HR-02-AC06 | PASS — authenticated own-employee derivation unit coverage; three component tests; six real browser cases across EN/FR and 360/768/1440 widths preserve values, keyboard submit, error focus and success announcement. |

## Verification boundaries

- Source: inspected action/service/readiness paths and dated graph context. Focused TypeScript program: zero diagnostics (typecheck.txt); no whole-repository build.
- Mocked unit/component: five suites, 67 tests pass (unit.json). After the focus fix, three component tests pass again (component-final.json).
- Real PostgreSQL: six HR-02 tests pass; combined HR-00–02 regression: 30 tests pass including cleanup (postgres-regression.json). Explicit task-owned database only; schema synchronized, not migration replay.
- Browser: browser/results.json and six screenshots. Actual component bundled locally with synthetic action responses. No authenticated full application, production session, screen reader or general WCAG certification claimed. Chrome connector profile conflict and in-app browser timeout were bypassed using a separate headless Playwright browser.
- Provider, production payroll, migration replay and qualified statutory review: not run; no such effects enabled.

## Review, recovery and limitations

Architecture/data: existing employee/import/snapshot owners, no second master; immutable source evidence and revision provenance. Backend/integration: shared ordering, root/supplied transaction rollback, deterministic retries. Security/privacy: server identity, tenant filtering, independent review, no raw reason in downstream event evidence. Workflow/design/accessibility: existing visual language, EN/FR, keyboard/error retention; synthetic server message in screenshots intentionally represents a test response. HR/product: explicit corrected values and recoverable blockers. QA/SRE: source, mocks, PostgreSQL and browser claims separated; evidence and scoped cleanup retained. Finance/statutory: no invented rates or country approval. SaaS/product operations: existing action entitlement remains in place. AI/POS/purchasing/provider transport: not applicable.

Read Committed is required for the employee serialization boundary. The operational builder still produces a candidate revision 1; only the orchestration/snapshot service owns persisted revision numbering. HR-03 must replace whole-request period sums and ambiguous policy selection; HR-02 does not certify those allocation semantics.

Rollback: suspend affected correction/certification entry points operationally; retain requests, imports and every snapshot/event. Never edit paid history or remove production admission to recover. Review/revert only owned hunks if necessary. Next: HR-03 allocation correctness.
