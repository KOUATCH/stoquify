# Cameroon-first modernization continuation

## Authority and scope

User requested execution on 7 October 2026 of the attached modernization programme: full phased implementation over successive sessions, Cameroon first, pre-production test/demo data. No production deployment, real payment, statutory filing, destructive reset or historical-data rewrite is included.

This is an execution addendum to `execution-register.json`, not a replacement programme. Retain all 38 packages and their acceptance conditions. The workflow-level register at `../../workflow-modernization/2026-09-05-run-01/WORKFLOW_REGISTER.json` remains the detailed workflow inventory. Its October 4 progress report retains Cash/Close work and 191 unmapped entries; this continuation does not close those workflows.

## Baseline inspected

- Branch: `codex/migration-control-plane-release-2026-08-29`; starting HEAD `62a56036`.
- Initial worktree: 331 modified tracked files and 4,092 untracked entries. Preserve unrelated changes; no reset, blanket staging or clean operation.
- Declared stack: Next.js 15, React 19, TypeScript, Prisma 6, Better Auth, Tailwind, Jest and Playwright. Current `CLAUDE.md` authentication/build descriptions are stale; executable source and package scripts govern verification selection.
- `npm run build` includes migration execution. Do not use it as a harmless build check. The existing ordinary verification runner disables database URLs and records bounded command results without replacing Jest/TypeScript configuration.
- R01's latest September evidence records successful compilation followed by Windows standalone packaging failure. No current full build or browser success is inferred from that evidence.
- Graphs last documented August 9: action node `hris_approval_inbox_actions_ts`, community 41, helps locate the active approvals action. Confirmed current consumer: `app/[locale]/(dashboard)/dashboard/people/approvals/page.tsx` renders `HrisApprovalInboxView`.
- Historical payroll cache finding has no active TS/TSX caller in current app/components/hooks. It is not established as an active user disclosure and is lower priority pending consumer discovery.

## Ordered work and acceptance

| Slice | Existing packages | Dependencies and scope | Exit evidence | Recovery |
|---|---|---|---|---|
| A1 Approval failure truth | R10/R16/R24 | Independent defect correction; does not certify these packages or bypass their R01/R08/R10 prerequisites. Preserve current auth, tenant, maker/checker and source evidence contracts. | Reproduce resolved action failure; preserve dialog/draft on auth/denial/conflict/unknown errors; safe EN/FR recovery; success alone refreshes; duplicate submissions disabled; action/service regressions, lint and typecheck. Browser check remains separate. | Revert only this slice's component/test delta; no schema/data effect. |
| A2 Approval concurrency | R08/R16 | Inspect request status guards and DB triggers before asserting a race; characterize competing time-request approval/rejection using existing transaction conventions. | Exactly one terminal transition and consistent attendance/leave/event/audit effects; rollback/replay tests; isolated PostgreSQL collision evidence before runtime qualification. | Revert isolated code change; no historical rewrite. |
| B Cameroon provenance | R18 | Reuse legal-source register, country registry, review intake and fixtures. Research can proceed independently of release/build qualification. | Official source URLs, effective dates, applicability and unresolved review decisions; no unsupported rate activation. | Documentation-only refresh until qualified rule change has its own migration/fixture plan. |
| C HRIS/payroll lifecycle | R16/R17 | Requires R01/R08/R10 and payroll producer/close/payment dependencies in canonical register. | Joiner/contract/compensation/time/leaver through payroll snapshot, payslip, payment evidence, declaration and ledger tie-out, including denial/correction/recovery. | Compatible migrations and isolated recovery rehearsal per accepted slice. |
| D Workflow experience | R24 | Improve each verified lifecycle with UI/UX Pro Max and existing design system. | EN/FR browser, keyboard/focus, responsive, loading/empty/denied/error/recovery evidence for supported roles. | Small component changes; preserve server truth and evidence. |
| E Integrated qualification | R01/R30/R31 | Stable candidate and all applicable package gates. | Ordinary build/package, isolated runtime, real database workflows, recovery and current source-bound evidence. | Release remains blocked until all required checks and external qualification pass. |

No new technology or framework is needed for A1. ECC search-first found reusable protected-action contracts and existing tests. Blueprint adversarial review confirmed A1's bounded scope and requested malformed-result, denial, draft-retention, pending and success tests. ECC TDD/verification and UI/UX Pro Max submit-feedback/error-recovery guidance apply. Country/plugin capabilities are not compliance certification.

## A1 reproduction and implementation

Current defect: `submitDecision` awaits `decideHrisApprovalInboxItemAction` but ignores its resolved `success` discriminant, then closes and refreshes. `protect` returns structured failures for fresh authentication, authorization and business errors. Existing UI tests cover only rejected promises, leaving the normal failure contract untested.

Status: implemented and independently reviewed. The component now requires a successful, populated action result before closing or refreshing. Resolved authentication, permission, conflict and unknown failures retain the decision draft and show safe EN/FR messages; raw server details are not displayed. Pending submissions are disabled. This is focused error-message localization, not a complete French UI audit.

RED: `runner/hris-inbox-red-20261007.jest.json` records 12 failed / 6 passed tests before the fix. GREEN: `runner/hris-inbox-green-settled-20261007.jest.json` records 21 passed tests across component, action and service. An intermediate green attempt failed six assertions because the test inspected pending state before React settled; the test now awaits the visible enabled state. No production condition was weakened. Two earlier sandboxed starts produced no output and were interrupted; they are not passing tests.

ECC checkpoint commits on the current branch: `97eef25b` (RED), `48252ea2` (GREEN).

## A2 same-request decision ownership

Implemented a conditional pending-status update scoped by request, organization and employee before reading balances or producing decision effects. Exactly one caller can claim a pending request. A stale decision raises `CONFLICT`. All later request metadata, event/outbox, debit and audit operations remain in the same transaction; errors must propagate to the transaction owner.

- RED: five new unit tests failed before the guard (`hris-time-claim-red-20261007.jest.json`); checkpoint `41a6496d`.
- GREEN: 11 operational-time unit tests passed (`hris-time-claim-green-20261007.jest.json`); reviewed implementation and PostgreSQL tests checkpointed in `6f7f6741`.
- Actual PostgreSQL: four tests passed in `runner/hris-time-postgres-20261007.jest.json`: APPROVE/REJECT in both winning orders, duplicate APPROVE, and rollback after injected final-audit failure. Both competing transactions read REQUESTED before the chosen winner commits. The stale decision starts its UPDATE after that commit; explicit waiting on an uncommitted row lock is not tested.
- Bootstrap: a new `stoquify_local_ui_workflow_hris_20261007` database on local PostgreSQL 17.5, with successful migration replay. Identity and applied migrations are in `runner/hris-time-postgres-bootstrap-20261007.json`. The application database was not migrated, reset or seeded. Synthetic fixtures remain in the isolated database for inspection; no automatic deletion.
- The integration test mocks manager-scope resolution only. Decision, event/outbox, debit and audit persistence and rollback use PostgreSQL. Scope/SoD checks are covered separately by ordinary tests; these four tests do not qualify all authorization paths.

Independent review found no introduced blocker in this bounded scope. **Shared-balance concurrency remains open:** two different requests can still consume the same employee/policy balance. The next fix must coordinate every writer, including `services/hris/leave-balance.service.ts`, whose aggregate/create/audit sequence is currently nontransactional. A request-level claim does not solve that problem. Do not qualify payroll input integrity from A2 alone.

Recovery: revert only the A2 service/test delta. No schema or historical record change was introduced. Caller-supplied transaction clients must propagate exceptions; catching an error and committing a partially completed transaction is unsupported.

## R01 verification environment repair

The first full no-emit compiler run reported 2,118 errors. The generated Prisma schema lacked models/fields present in the current source schema. Regenerating the client from the existing schema with database URLs disabled reduced the compiler to two literal-inference errors in `services/accounting/close-evidence-workflow.service.ts:62`. No migration or package upgrade was used.

The remaining repair adds `as const` to the existing `false` and `"UNAVAILABLE"` filter literals. Runtime query values and filters are unchanged; no `any`, suppression or source exclusion was introduced. This file was already untracked and is not claimed or staged wholesale. Its pre-edit SHA-256 was `e88991915a535677cd06a17ae4f97ec7cc52a770c2eb9ca4c40ddf0ecd2d7c49`. Preserve all its other content and its existing ownership.

Final combined focused run: **59 tests passed in six suites**, including existing close-evidence workflow tests (`runner/modernization-focused-final-20261007.jest.json`). The four PostgreSQL tests are separate; earlier overlapping runs are not additional unique coverage. All seven affected source/test files passed targeted lint (`runner/modernization-lint-final-20261007.result.json`). The final full no-emit typecheck **passed with exit 0** at 05:25:23 UTC (`runner/modernization-types-final-20261007.result.json`), with the existing configuration unchanged. Full build/package and authenticated browser acceptance are still pending.

## R18 source evidence

See [Cameroon source refresh](CAMEROON_SOURCE_REFRESH_2026-10-07.md). Official CGI 2026, Finance Law, OHADA, Labour Code and CNPS source discoveries are recorded with applicability and date limitations. The addendum preserves August records and includes a provisional expansion gap matrix. No rates, country-pack activation or statutory approval changed. Download hashes and section-level legal review remain required.

## Exact next work

1. Establish one transaction/locking contract for employee/policy leave balances across approval and balance adjustment writers. Prove distinct-request and adjustment races, insufficient-balance rollback, source idempotency and effective-date effects on a fresh isolated database.
2. Verify the approval interaction in an authenticated EN/FR browser session on a controlled current build: denied/fresh-auth/conflict recovery, draft retention, pending state, keyboard focus and narrow viewport. Unit/component tests are not browser completion evidence.
3. Refresh R18 source bytes/checksums and section-level provenance through the existing country review intake; prepare independently reviewed Cameroon calculation fixtures without activating unverified rules.
4. Continue existing R07/R08 source-close/database gates, then HRIS-to-payroll-to-ledger journeys. Preserve the current Cash/Close priorities and the 38-package dependencies. A fresh integrated build/package and recovery rehearsal remain required.

## Continuation rules

Read this addendum, the canonical register and current source state first. Record exact command outcomes and source hashes after each slice. Never sum overlapping test runs as unique coverage. Keep failed attempts. Do not equate a component fix with complete HRIS, payroll, country or release readiness.

Unresolved: integrated build/package, authenticated browser, actual concurrency, external statutory reviewers, legal applicability and broad programme completion. Manual evidence-hash entry remains a separate source/evidence workflow decision; replacing it with an automatically fabricated hash would not establish proof.
