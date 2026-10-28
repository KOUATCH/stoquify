# AqStoqFlow HR/Payroll Ordered Prerequisite Implementation Roadmap

Date: 2026-06-25

Source document:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PREREQUISITE_READINESS_ANALYSIS_2026-06-25.md`

Mode: ordering, dependency, and implementation-readiness analysis only. No production code was implemented.

## Executive Ordering Decision

The HR/Payroll roadmap must be executed as a gated dependency chain, not as a broad UI build. The current payroll kernel is valuable, but the readiness analysis makes the safe order clear:

1. Prove kernel safety and release discipline first.
2. Build HR source-data ownership before workflow expansion.
3. Build service-owned command read models before command-center UI.
4. Expand statutory/country-pack breadth before legal production claims.
5. Build payslip, self-service, register, declarations, payments, and close assurance only after their privacy, evidence, accounting, and tenant gates exist.
6. Finish with assurance, chaos, browser, export, and production release gates.

Architecture rule: every prerequisite below preserves service-owned truth, protected server actions, RBAC, module entitlement, evidence, redaction, and no client-computed payroll truth.

## Dependency Map

```text
P0 kernel gates
  -> Phase 1 HR source data
  -> Phase 2 command read models and command center
  -> Phase 3 statutory/country-pack engine
  -> Phase 4 payslip, self-service, archive, register
  -> Phase 5 declarations, payment reconciliation, close evidence
  -> Phase 6 assurance, chaos, browser, final release
```

Hard rule: if any hard blocker in a phase fails, stop that phase and create a blocker report. Do not continue into dependent phases.

## Phase 0: Immediate Blockers And Kernel Readiness

### P0.01 Blueprint-First Execution

- Class: Hard blocker.
- What must be implemented: Treat the HR/Payroll blueprint and prerequisite readiness analysis as the governing roadmap for all later work.
- Why required: Later skills depend on earlier control evidence; blind implementation can create duplicate UI or shadow payroll truth.
- Depends on: The saved blueprint and prerequisite readiness analysis.
- Files/systems likely involved: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md`, this roadmap, future phase reports.
- Build/change/prove: Add a phase-start checklist to every HR/payroll run report that names source document, phase, prerequisite status, stop condition, and release gate.
- Validation: Every phase report must list prerequisite pass/fail status before implementation notes.
- Risk if out of order: The team can build command-center or statutory surfaces before kernel safety is proven.
- Owner slice: Phase 0 governance.

### P0.02 Stop-On-Blocker Behavior

- Class: Hard blocker.
- What must be implemented: A rule that failed prerequisite gates produce a blocker report and halt the current skill/phase.
- Why required: Prevents forcing implementation through unsafe payroll, privacy, accounting, or statutory gaps.
- Depends on: P0.01.
- Files/systems likely involved: Skill execution reports under `what-next/payroll/`, release gate scripts, skill instructions.
- Build/change/prove: Standardize blocker report structure: failed prerequisite, impact, affected files, required fix, next safe action.
- Validation: Each phase report must show either "ready to proceed" or "blocked" with no hidden continuation.
- Risk if out of order: Later phases compound earlier errors and produce unusable or unsafe payroll surfaces.
- Owner slice: Phase 0 governance.

### P0.03 Phase Release Gate After Each Skill

- Class: Hard blocker.
- What must be implemented: A required release-gate report after each implementation phase and before moving forward.
- Why required: The suite is a controlled roadmap, not a batch install.
- Depends on: P0.01, P0.02.
- Files/systems likely involved: `package.json` scripts, payroll tests, close-assurance tests, policy gates, phase reports.
- Build/change/prove: Define the standard gate bundle per phase and save results under `what-next/payroll/`.
- Validation: Gate report includes commands run, pass/fail status, blockers, changed files, and next phase decision.
- Risk if out of order: Later implementation can rely on unverified payroll behavior.
- Owner slice: Phase 0 release governance.

### P0.04 Current-State Inventory

- Class: Hard blocker.
- What must be implemented: Refresh inventory of schema, migrations, services, actions, routes, tests, reports, module controls, RBAC, audit, country packs, and close surfaces.
- Why required: The repo changes quickly; older readiness statements may be stale.
- Depends on: P0.01.
- Files/systems likely involved: `prisma/`, `services/payroll/`, `actions/payroll/`, `hooks/payroll/`, `components/payroll/`, `app/[locale]/(dashboard)/dashboard/payroll/`, `what-next/payroll/`, `lib/security/`, `services/modules/`, `services/accounting/`, `services/regulatory/`.
- Build/change/prove: Create a Phase 0 inventory report listing what exists, what is partial, and what is missing.
- Validation: Inventory must name exact files inspected and reconcile newer reports against older reports.
- Risk if out of order: Work may duplicate existing controls or treat resolved blockers as still open.
- Owner slice: Phase 0 discovery.

### P0.05 Single Source Of Truth Ownership Map

- Class: Hard blocker.
- What must be implemented: A service ownership map for employee source data, contracts, calculations, payslips, payments, declarations, ledger postings, close evidence, redaction, and command read models.
- Why required: Prevents client-computed payroll truth, dashboard shadow services, and duplicated metrics.
- Depends on: P0.04.
- Files/systems likely involved: `services/payroll/*`, future HR source-data services, accounting services, BI/evidence adapters.
- Build/change/prove: Save a source-ownership table under `what-next/payroll/` before Phase 1 starts.
- Validation: Every planned UI or server action maps to one service-owned truth source.
- Risk if out of order: UI or analytics can create alternative payroll totals.
- Owner slice: Phase 0 architecture.

### P0.06 Tenant-Scoped Payroll Core Models

- Class: Hard blocker, structurally satisfied but must be revalidated.
- What must be implemented: Dedicated tenant-scoped payroll employee, contract, period, attendance, run, line, payslip, declaration, payment batch, and payment allocation models.
- Why required: Payroll evidence cannot be built from ad hoc salary fields.
- Depends on: P0.04.
- Files/systems likely involved: `prisma/schema.prisma`.
- Build/change/prove: Reconfirm current model relations, tenant scopes, indexes, statuses, and source evidence fields.
- Validation: `npm run prisma:validate`, model relation review, migration status review.
- Risk if out of order: Service and UI work may build on missing or incorrectly scoped records.
- Owner slice: Phase 0 schema gate.

### P0.07 Migration Ordering And Application

- Class: Hard blocker.
- What must be implemented: Confirm payroll migrations are present, ordered, compatible with the Prisma schema, and applied to a target/test database.
- Why required: Schema-only readiness is not runtime readiness.
- Depends on: P0.04, P0.06.
- Files/systems likely involved: `prisma/migrations/`, Prisma migration status, test database.
- Build/change/prove: Run migration status, apply to test DB, record applied migration IDs.
- Validation: Prisma validation, migration status, runtime DB smoke.
- Risk if out of order: Runtime DB can lack protections or columns expected by services.
- Owner slice: Phase 0 migration gate.

### P0.08 DB-Level Immutability Runtime Proof

- Class: Hard blocker.
- What must be implemented: Prove the payroll immutability migration protects finalized payroll evidence in a real database.
- Why required: The blueprint forbids mutating posted runs, emitted payslips, released payment batches, submitted declarations, or archived evidence in place.
- Depends on: P0.07.
- Files/systems likely involved: `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`, `services/payroll/__tests__/payroll-immutability-migration.test.ts`, integration test setup.
- Build/change/prove: Add runtime tests that attempt blocked updates/deletes on protected records while allowing approved lifecycle metadata.
- Validation: Existing migration text test plus real DB trigger tests.
- Risk if out of order: Finalized payroll evidence can be silently changed outside service boundaries.
- Owner slice: Phase 0 kernel safety.

### P0.09 Runtime DB Trigger Test Harness

- Class: Hard blocker.
- What must be implemented: A reliable test harness that applies migrations and verifies trigger behavior against a database.
- Why required: SQL text assertions do not prove deployed behavior.
- Depends on: P0.07, P0.08.
- Files/systems likely involved: Prisma test database setup, payroll immutability test suite.
- Build/change/prove: Provide test DB setup instructions or scripted test path and include blocked mutation cases.
- Validation: Test should fail if triggers are absent or misnamed.
- Risk if out of order: Production protection may be assumed but absent.
- Owner slice: Phase 0 validation.

### P0.10 Correction Workflow Data Model Boundary

- Class: Hard blocker before correction features.
- What must be implemented: Explicit correction, reversal, amendment, void, and evidence linkage semantics for payroll runs, payslips, declarations, and payments.
- Why required: Immutable records require correction workflows instead of in-place edits.
- Depends on: P0.08.
- Files/systems likely involved: `PayrollRun`, `PayrollPayslip`, `PayrollDeclaration`, `PayrollPaymentBatch`, payroll service correction paths.
- Build/change/prove: Define allowed correction states and service APIs before adding correction UI.
- Validation: Tests for correction-only mutation, closed period behavior, audit events, and close invalidation.
- Risk if out of order: Operators may overwrite historical evidence or lack a legal correction path.
- Owner slice: Phase 0/Phase 5 correction foundation.

### P0.11 Row Version And Concurrency Controls

- Class: Hard blocker for high-risk writes.
- What must be implemented: Idempotency and/or optimistic concurrency for employee, contract, run, payment release, declaration, and correction mutation paths.
- Why required: Payroll is vulnerable to double-submit, stale approvals, and duplicate payment risk.
- Depends on: P0.06, P0.10.
- Files/systems likely involved: Payroll models, payroll services, future HR source-data services.
- Build/change/prove: Define concurrency strategy per write path and add replay mismatch tests.
- Validation: Concurrent approval/payment/declaration tests and idempotency replay tests.
- Risk if out of order: Duplicate runs, duplicate payments, stale salary changes, inconsistent evidence.
- Owner slice: Phase 0 kernel and Phase 1 source-data writes.

### P0.12 Protected Server Action Wrapper

- Class: Hard blocker, satisfied for current actions but required for all new actions.
- What must be implemented: All payroll actions must use the shared protection wrapper and derive organization, actor, and permissions server-side.
- Why required: Prevents client-supplied tenant or actor spoofing.
- Depends on: P0.04.
- Files/systems likely involved: `actions/payroll/*`, `services/_shared/protect.ts`, `actions/payroll/__tests__/*`.
- Build/change/prove: Extend the pattern to all future HR/payroll actions.
- Validation: Action tests proving client-supplied organization/actor fields are ignored and RBAC denials are client-safe.
- Risk if out of order: Cross-tenant mutation or forged approvals.
- Owner slice: Phase 0 action gate, repeated in each phase.

### P0.13 Server Action Read-Model Discipline

- Class: Hard blocker before Phase 2.
- What must be implemented: Actions expose trusted service-owned read models, not raw models or client-calculated totals.
- Why required: Dashboards must render server-provided command data.
- Depends on: P0.05, P0.12.
- Files/systems likely involved: `actions/payroll`, `services/payroll`, future command read-model services.
- Build/change/prove: Define read-model contracts for workbench, command center, payslip, declaration, payment, and register surfaces.
- Validation: Read-model contract tests and UI review for no derived payroll truth.
- Risk if out of order: Duplicated metrics and inconsistent UI truth.
- Owner slice: Phase 0/Phase 2 read-model foundation.

### P0.14 Payroll Permission Taxonomy

- Class: Hard blocker.
- What must be implemented: Complete permission taxonomy for payroll read, employee/contract management, attendance freeze, run calculate/review/approve/post, payslip read/emit, payment release, declarations, reports, and exports.
- Why required: Payroll requires persona-specific sensitive capabilities.
- Depends on: P0.04.
- Files/systems likely involved: `lib/security/rbac-permissions.ts`, `lib/permissions.ts`, permission tests.
- Build/change/prove: Review current aliases, fill missing future permissions, and map each planned action/route to permission.
- Validation: RBAC permission tests and persona matrix review.
- Risk if out of order: Overbroad access or blocked legitimate payroll work.
- Owner slice: Phase 0 security.

### P0.15 Persona-Specific Scope Matrix

- Class: Hard blocker before broad UI.
- What must be implemented: Role matrix for HR manager, payroll officer, approver, accountant, treasurer, auditor, manager, owner, and employee self-service.
- Why required: The roadmap is role-aware, and salary/person data must be scoped.
- Depends on: P0.14.
- Files/systems likely involved: RBAC config, module catalog, future routes/actions.
- Build/change/prove: Create a route/action/read-model permission matrix.
- Validation: Persona route/action tests.
- Risk if out of order: Role confusion, overexposure, and unusable workflows.
- Owner slice: Phase 0 security and Phase 1 route planning.

### P0.16 Salary And Person-Data Permission Separation

- Class: Hard blocker, partially satisfied for the current workbench.
- What must be implemented: Salary/person-level values require salary-specific permissions and redaction when absent.
- Why required: Salary data is sensitive and can leak through payroll dashboards, assurance, incidents, and exports.
- Depends on: P0.14.
- Files/systems likely involved: `services/security/redaction-policy.service.ts`, `services/payroll/__tests__/payroll-privacy.service.test.ts`.
- Build/change/prove: Extend policy use to every new salary-bearing read model, export, self-service, proof drawer, and report.
- Validation: Redaction tests and salary-read audit tests per surface.
- Risk if out of order: Unauthorized salary exposure.
- Owner slice: Phase 0 privacy, repeated in each UI/read-model phase.

### P0.17 Fresh Auth On Critical Actions

- Class: Hard blocker for sensitive writes.
- What must be implemented: Fresh auth for approve/post, payment release, salary changes, exports, declaration submission, statutory payment, and high-risk self-service changes.
- Why required: Stale sessions must not approve payroll or expose sensitive data.
- Depends on: P0.12, P0.14.
- Files/systems likely involved: `actions/payroll/*`, `services/_shared/protect.ts`.
- Build/change/prove: Classify every future action by risk and add `freshAuth` where required.
- Validation: Fresh-auth tests per critical action.
- Risk if out of order: Payroll approval, export, or payment can happen from stale sessions.
- Owner slice: Phase 0 security and repeated by phase.

### P0.18 Maker-Checker And Segregation Of Duties

- Class: Hard blocker for financial/person-data mutations.
- What must be implemented: Separate maker/checker semantics for salary changes, payment destination changes, run approval, payment release, declaration submission, and statutory payment.
- Why required: Four-eyes control reduces fraud and high-impact mistakes.
- Depends on: P0.14, P0.15, P0.17.
- Files/systems likely involved: Payroll services/actions, future HR source-data services, audit/event services.
- Build/change/prove: Define SoD rules per workflow and block same-actor approval where required.
- Validation: SoD tests and audit event tests.
- Risk if out of order: One actor can create and approve sensitive payroll changes.
- Owner slice: Phase 0 controls and Phase 1/5 workflow implementation.

### P0.19 Payroll Module Catalog Entry

- Class: Hard blocker, structurally satisfied but must stay enforced.
- What must be implemented: Payroll remains a commercial module with route prefixes, dependencies, and permissions.
- Why required: Module entitlement governs tenant/module access.
- Depends on: P0.04.
- Files/systems likely involved: `services/modules/module-control-contracts.ts`, `services/modules/module-catalog.service.ts`.
- Build/change/prove: Keep payroll catalog entry aligned with routes and dependencies.
- Validation: Module catalog tests and entitlement simulation.
- Risk if out of order: Tenants can access disabled or dependency-broken payroll workflows.
- Owner slice: Phase 0 module gate.

### P0.20 Sidebar Module Gating

- Class: Hard blocker for navigation.
- What must be implemented: Show only available HR/payroll routes and avoid links to unimplemented subroutes.
- Why required: Navigation must not advertise fake workflows.
- Depends on: P0.19.
- Files/systems likely involved: `config/sidebar.ts`, `config/__tests__/sidebar.test.ts`.
- Build/change/prove: Add subroutes only after their services, actions, permissions, and tests exist.
- Validation: Sidebar tests and entitlement tests.
- Risk if out of order: Broken links and speculative UI bloat.
- Owner slice: Phase 0 navigation discipline, repeated in Phase 1/2.

### P0.21 Payroll Module Disablement Behavior

- Class: Hard blocker before tenant release.
- What must be implemented: Payroll route, actions, read models, and redaction policy must block or redact when payroll is disabled.
- Why required: Module entitlement is a governing principle.
- Depends on: P0.19, P0.20.
- Files/systems likely involved: Module guard services, payroll actions/routes, redaction policy.
- Build/change/prove: Add route/action/module-denial tests for current payroll workbench and future routes.
- Validation: Disabled-module route/action tests and redaction tests.
- Risk if out of order: Disabled tenants may still access payroll data or workflows.
- Owner slice: Phase 0 module enforcement.

### P0.22 Dependency Readiness

- Class: Hard blocker.
- What must be implemented: Verify accounting, finance, payment reconciliation, close assurance, presence/attendance, audit, and module-control dependencies are operational for payroll.
- Why required: Payroll later depends on ledger posting, payment reconciliation, declarations, close evidence, and attendance source data.
- Depends on: P0.04, P0.19.
- Files/systems likely involved: Module catalog, accounting setup, payment reconciliation, close assurance, presence/attendance services.
- Build/change/prove: Save a dependency readiness report before Phase 2 and Phase 6.
- Validation: Dependency readiness checks and focused tests.
- Risk if out of order: Payroll workflows start but fail at ledger, payment, close, or attendance boundaries.
- Owner slice: Phase 0 dependency gate.

### P0.23 SYSCOHADA Payroll Posting Rules And Accounting Setup

- Class: Hard blocker.
- What must be implemented: Balanced payroll run and payroll payment posting rules with active accounts, source links, journals, and blockers.
- Why required: No payroll posting is allowed without balanced source-linked SYSCOHADA entries.
- Depends on: P0.22.
- Files/systems likely involved: `services/accounting/default-posting-rules.ts`, payroll posting functions, accounting setup.
- Build/change/prove: Confirm tenant accounting setup can support payroll run and payroll payment postings.
- Validation: Posting rule tests, accounting setup check, ledger integration tests.
- Risk if out of order: Payroll runs cannot be posted or become unbalanced.
- Owner slice: Phase 0 accounting gate.

### P0.24 Payroll Run Close Invalidation

- Class: Hard blocker, currently satisfied for run posting but must be revalidated.
- What must be implemented: Posted payroll runs stale certified close evidence for the affected period.
- Why required: Close packs must remain truthful after payroll posting.
- Depends on: P0.23.
- Files/systems likely involved: `services/accounting/close-assurance-pack.service.ts`, `approveAndPostPayrollRun`, payroll tests.
- Build/change/prove: Keep `PAYROLL_RUN_POSTED` close invalidation wired and tested.
- Validation: Close invalidation test for payroll run posting.
- Risk if out of order: Certified close evidence ignores payroll changes.
- Owner slice: Phase 0 close gate.

### P0.25 Payment, Declaration, And Correction Close-Impact Classification

- Class: Hard blocker before Phase 5/7 expansion.
- What must be implemented: Classify payroll payment release, declaration transitions, and correction writes as close-impacting or non-impacting; wire close invalidation where required.
- Why required: The analysis identifies this as remaining Phase 0 work.
- Depends on: P0.10, P0.24.
- Files/systems likely involved: Payroll services, `services/accounting/close-assurance-pack.service.ts`, `services/accounting/data-trust.service.ts`.
- Build/change/prove: Create a source-impact decision table and focused tests per source.
- Validation: Close invalidation tests for every close-impacting payroll source.
- Risk if out of order: Close packs can remain falsely fresh after payroll payment/declaration/correction changes.
- Owner slice: Phase 0 close-impact gate.

### P0.26 No Statutory Hardcodes

- Class: Hard blocker.
- What must be implemented: Payroll rates, caps, legal values, deadlines, and formulas must resolve from country packs or reviewed configuration.
- Why required: The roadmap forbids hardcoded statutory payroll values.
- Depends on: P0.04.
- Files/systems likely involved: `services/regulatory/hardcode-detector.ts`, payroll services, country packs.
- Build/change/prove: Formalize a payroll-specific hardcode scan over payroll engine/action files.
- Validation: Hardcode gate with fixture/test whitelist.
- Risk if out of order: Payroll engine can embed unreviewed legal values.
- Owner slice: Phase 0 statutory gate.

### P0.27 Expert-Review And Legal Boundary Enforcement

- Class: Hard blocker before statutory production claims.
- What must be implemented: Unsupported and expert-review country-pack outputs must be visibly blocked or labeled and must never be presented as legal truth.
- Why required: Honest compliance boundaries prevent false statutory claims.
- Depends on: P0.26.
- Files/systems likely involved: Country packs, declaration UI, payroll workbench, release gates.
- Build/change/prove: Add release gate checks and UI/read-model flags for expert-review states.
- Validation: Tests showing expert-review outputs cannot pass as final legal/statutory truth.
- Risk if out of order: Users may file or rely on unverified declarations.
- Owner slice: Phase 0/Phase 3 compliance gate.

### P0.28 Business Events And Audit Chain

- Class: Hard blocker.
- What must be implemented: Payroll changes must emit business events, audit entries, and evidence links.
- Why required: Enterprise payroll needs actor and source traceability.
- Depends on: P0.12, P0.23.
- Files/systems likely involved: Payroll services, audit, business-event, outbox services.
- Build/change/prove: Ensure every new workflow emits events/audit entries with source links.
- Validation: Event/audit tests per workflow.
- Risk if out of order: Payroll changes become untraceable.
- Owner slice: Phase 0 evidence gate, repeated in later phases.

### P0.29 Salary-Read Audit

- Class: Hard blocker.
- What must be implemented: Every salary-bearing read audits actor, policy, redaction decision, and purpose.
- Why required: Salary browsing must not be silent.
- Depends on: P0.16, P0.28.
- Files/systems likely involved: `getPayrollWorkbenchData`, payroll privacy tests, future read-model services.
- Build/change/prove: Extend current workbench audit pattern to all salary-bearing surfaces.
- Validation: Salary-read audit tests per read model.
- Risk if out of order: Sensitive payroll access is invisible to audit.
- Owner slice: Phase 0 privacy and repeated in Phase 2/4/6.

### P0.30 Redaction Policy Coverage

- Class: Hard blocker.
- What must be implemented: Payroll person-level amounts must redact when permissions or module entitlement are missing.
- Why required: Prevents leakage in dashboards, proof drawers, exports, assurance, and incident views.
- Depends on: P0.16, P0.21.
- Files/systems likely involved: `services/security/redaction-policy.service.ts`, payroll read models.
- Build/change/prove: Require redaction policy in every new read model/export.
- Validation: Redaction tests per route, read model, and export.
- Risk if out of order: Salary and person-level data leaks.
- Owner slice: Phase 0 privacy and repeated in every UI/reporting phase.

### P0.31 Focused Service And Action Tests

- Class: Hard blocker.
- What must be implemented: Maintain focused tests for payroll calculation, posting, payment release, declaration preparation, rollback, idempotency, close invalidation, RBAC, fresh auth, tenant derivation, and client input overwrite.
- Why required: Payroll is high-risk and service-owned.
- Depends on: P0.12 through P0.30.
- Files/systems likely involved: `services/payroll/__tests__/*`, `actions/payroll/__tests__/*`, `services/_shared/__tests__/*`.
- Build/change/prove: Expand tests whenever a new service/action path is added.
- Validation: Focused Jest test suite.
- Risk if out of order: Regressions slip into financial/person-data workflows.
- Owner slice: Phase 0 validation, repeated in all phases.

### P0.32 Tenant Escape Matrix

- Class: Hard blocker before release.
- What must be implemented: Every list, read, write, export, and self-service path proves tenant isolation.
- Why required: HR/payroll data is highly sensitive.
- Depends on: P0.12, P0.14, P0.21.
- Files/systems likely involved: Payroll service/action tests, future self-service/export tests.
- Build/change/prove: Maintain a matrix by model and route: allowed tenant, denied tenant, no active org, disabled module.
- Validation: Negative tests for every route/action/export/self-service path.
- Risk if out of order: Cross-tenant data exposure or mutation.
- Owner slice: Phase 0 and final release.

### P0.33 Release Gates

- Class: Hard blocker.
- What must be implemented: Run required gates before moving from Phase 0 to Phase 1 and after every implementation phase.
- Why required: The suite must stop on failed foundations.
- Depends on: P0.31, P0.32.
- Files/systems likely involved: `package.json` scripts, Prisma, payroll/action/privacy/close tests.
- Build/change/prove: Minimum gate bundle:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm run service:boundary:fail
npm run policy:gates
npm run typecheck
```

- Validation: Save command output summary in a phase report.
- Risk if out of order: Later phases build on unverified behavior.
- Owner slice: Every phase.

### P0.34 Unfinished Production Surface Gate

- Class: Hard blocker.
- What must be implemented: Production routes/components must not expose unfinished HR/payroll capabilities as real workflows.
- Why required: Prevents speculative bloat and fake workflow surfaces.
- Depends on: P0.20, P0.33.
- Files/systems likely involved: Routes, components, sidebar, tests.
- Build/change/prove: Scan changed production files for unfinished markers and route stubs; hide routes until backed by services/actions/tests.
- Validation: Static scan, route smoke, action gate tests.
- Risk if out of order: Users see incomplete workflows as real features.
- Owner slice: Every phase.

### P0.35 Migration, Seed, And Backfill Strategy

- Class: Hard blocker before operational rollout.
- What must be implemented: Plan idempotent seed/backfill for payroll periods, posting rules, employees, contracts, salary/privacy defaults, module entitlements, and payment destination placeholders where appropriate.
- Why required: Existing tenants cannot operate payroll with empty or inconsistent setup.
- Depends on: P0.06, P0.07, P0.23.
- Files/systems likely involved: Seed scripts, services, module catalog, accounting setup, payroll setup.
- Build/change/prove: Save a dry-run seed/backfill plan and implement only after data mapping is approved.
- Validation: Dry-run report, idempotency tests, tenant fixture checks.
- Risk if out of order: Workflows fail late or require manual DB edits.
- Owner slice: Phase 0 planning, Phase 1 implementation.

### P0.36 Payroll Setup And Admin Readiness

- Class: Hard blocker before tenant rollout.
- What must be implemented: Admin readiness for payroll journal, posting accounts, country pack, periods, frequency, module entitlement, and role setup.
- Why required: Payroll runs should not fail late because setup is hidden or incomplete.
- Depends on: P0.22, P0.23, P0.35.
- Files/systems likely involved: Accounting setup, payroll setup routes/services, readiness reports.
- Build/change/prove: Define setup checklist and service validation before operational rollout.
- Validation: Setup validation tests and readiness checklist.
- Risk if out of order: Operators begin payroll without required accounting or country-pack setup.
- Owner slice: Phase 0/Phase 1 admin foundation.

## Phase 1: HR Source-Data Foundation

### P1.01 HR Source-Data Model Completeness

- Class: Hard blocker before Phase 1 implementation.
- What must be implemented: Employee profile, contract lifecycle, compensation/rubrique assignments, salary changes, payment destination approvals, HR documents, leave/attendance inputs, and employee-user mapping.
- Why required: Payroll computation must originate from controlled HR source data.
- Depends on: P0.05, P0.06, P0.14, P0.15, P0.35.
- Files/systems likely involved: `prisma/schema.prisma`, future HR/payroll migrations.
- Build/change/prove: Add or verify models, indexes, tenant scopes, uniqueness, status transitions, source/evidence fields, and employee-user linkage.
- Validation: Prisma validation, migration tests, tenant uniqueness tests, duplicate-risk tests.
- Risk if out of order: Payroll relies on manual inputs or shallow fields.
- Owner slice: Phase 1 schema.

### P1.02 HR Source-Data Services

- Class: Hard blocker.
- What must be implemented: Service boundaries for employee profile, contract, compensation/rubrique, payment destination, salary change, documents, leave, and attendance.
- Why required: Services must own HR source truth.
- Depends on: P1.01, P0.12, P0.28, P0.30.
- Files/systems likely involved: Future `services/payroll/employee.service.ts`, `contract.service.ts`, compensation/rubrique services, document services.
- Build/change/prove: Build service APIs with tenant scope, RBAC context, audit events, idempotency/concurrency, and redaction rules.
- Validation: Service tests, tenant-boundary tests, audit tests, schema validation.
- Risk if out of order: Direct UI writes or duplicated HR truth.
- Owner slice: Phase 1 service foundation.

### P1.03 Employee Profile, Duplicate Risk, And Employee-User Mapping

- Class: Hard blocker before self-service.
- What must be implemented: Employee master-data workflow, duplicate detection/risk, and reliable mapping from user account to payroll employee.
- Why required: Employee self-service and payroll source truth require authoritative identity linkage.
- Depends on: P1.01, P1.02, P0.15, P0.32.
- Files/systems likely involved: Employee service, user/membership models, self-service actions.
- Build/change/prove: Add mapping rules, duplicate checks, tenant/user constraints, and own-data resolution.
- Validation: Mapping reconciliation report, duplicate-risk tests, cross-employee denial tests.
- Risk if out of order: Duplicate employees, broken self-service, privacy leaks.
- Owner slice: Phase 1 employee foundation.

### P1.04 Contract Lifecycle Service And UI

- Class: Hard blocker before payroll source-data completion.
- What must be implemented: Contract create/update/terminate/history workflows with evidence and tenant scope.
- Why required: Payroll calculation depends on active contracts and historical contract facts.
- Depends on: P1.02, P1.03.
- Files/systems likely involved: Contract service, payroll routes under `/dashboard/payroll`, server actions, tests.
- Build/change/prove: Build service first, then protected actions and route UI.
- Validation: Contract service tests, action tests, tenant tests, route smoke.
- Risk if out of order: Payroll uses stale or ungoverned contract data.
- Owner slice: Phase 1 contracts.

### P1.05 Compensation And Rubrique Catalog

- Class: Hard blocker before statutory and rich payslips.
- What must be implemented: Compensation/rubrique catalog and employee assignment model/service for allowances, deductions, benefits, taxes, loans, bonuses, overtime, and other payroll items.
- Why required: Professional payroll cannot rely only on narrow gross/net lines.
- Depends on: P1.01, P1.02, P0.26.
- Files/systems likely involved: Payroll schema/migrations, compensation/rubrique services, country-pack resolver.
- Build/change/prove: Define rubrique metadata, taxable/social base flags, provenance, tenant scope, and country-pack interaction.
- Validation: Schema tests, service tests, calculation fixture tests.
- Risk if out of order: Country-pack and payslip work has no source data for real payroll lines.
- Owner slice: Phase 1 compensation foundation.

### P1.06 Salary Change Approval

- Class: Hard blocker for salary mutations.
- What must be implemented: Maker-checker salary change workflow with audit, redaction, evidence, correction semantics, and effective dates.
- Why required: Salary changes are sensitive and financially material.
- Depends on: P0.16, P0.17, P0.18, P1.03, P1.05.
- Files/systems likely involved: Salary change service/action, audit/event services, redaction policy, HR routes.
- Build/change/prove: Require separate maker/checker, fresh auth for approval, audit trail, and no direct mutation without workflow.
- Validation: SoD tests, salary-read/redaction tests, effective-date tests, correction tests.
- Risk if out of order: Unauthorized or untraceable salary changes.
- Owner slice: Phase 1 salary controls.

### P1.07 Payment Destination Approval

- Class: Hard blocker before payment release UX expansion.
- What must be implemented: Employee payment destination creation/change workflow with maker-checker, evidence hash, audit, and approval state.
- Why required: The payment release service requires approved payment destination evidence.
- Depends on: P0.18, P1.03.
- Files/systems likely involved: Employee/payment profile service, payroll payment release, audit/evidence services.
- Build/change/prove: Add destination evidence upload/reference, approval, change history, and redaction.
- Validation: Destination approval tests, payment release blocker tests, redaction tests.
- Risk if out of order: Payment UI may release funds against unapproved destinations.
- Owner slice: Phase 1 payment profile.

### P1.08 HR Documents And Evidence References

- Class: Hard blocker for auditable HR source data.
- What must be implemented: Evidence references for contracts, salary changes, identifiers, payment details, and HR documents.
- Why required: Payroll source data must be explainable and auditable.
- Depends on: P1.02, P1.04, P1.06, P1.07.
- Files/systems likely involved: Document/upload services, HR source-data services, audit/event services.
- Build/change/prove: Store document references, hashes, actor, purpose, and redaction category.
- Validation: Evidence-link tests and redaction tests.
- Risk if out of order: HR changes lack proof and cannot support payroll certification.
- Owner slice: Phase 1 evidence foundation.

### P1.09 Leave And Attendance Source Integration

- Class: Hard blocker before full command center/run readiness.
- What must be implemented: Leave and attendance input source integration beyond frozen snapshots, with tenant scope and evidence hashes.
- Why required: Payroll readiness depends on complete and frozen input evidence.
- Depends on: P1.02, P0.22.
- Files/systems likely involved: Payroll attendance snapshot service, presence/attendance services, HR routes.
- Build/change/prove: Define source-to-payroll freeze contract and drift detection.
- Validation: Attendance freeze tests, drift tests, tenant tests.
- Risk if out of order: Payroll calculations can use incomplete or drifting attendance data.
- Owner slice: Phase 1 attendance foundation.

### P1.10 HR Source-Data Routes

- Class: Hard blocker before UI expansion.
- What must be implemented: Employee, contract, compensation/rubrique, salary-change, payment profile, leave/attendance, and document routes backed by services/actions.
- Why required: Payroll inputs need professional operating surfaces.
- Depends on: P1.02 through P1.09, P0.20.
- Files/systems likely involved: Future `app/[locale]/(dashboard)/dashboard/payroll/*`, components, actions, services.
- Build/change/prove: Add routes only after service, permission, action, test, and redaction readiness.
- Validation: Route inventory, permission matrix, service-backed CRUD tests, route smoke.
- Risk if out of order: Broken or fake HR/payroll subroutes appear in navigation.
- Owner slice: Phase 1 UI.

## Phase 2: Payroll Command Center Foundation

### P2.01 Payroll Workbench Route Baseline

- Class: Hard blocker, partially satisfied.
- What must be implemented: Preserve the current server-rendered payroll workbench route as trusted server-provided data.
- Why required: The current workbench is the first safe UI surface.
- Depends on: P0.12, P0.13, P0.30.
- Files/systems likely involved: `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`, `components/payroll/PayrollControlWorkbench.tsx`, `actions/payroll/payroll-control.actions.ts`.
- Build/change/prove: Keep workbench render-only; do not add client-computed payroll totals.
- Validation: Route smoke, RBAC denial test, redacted read-model test.
- Risk if out of order: UI may become a shadow payroll engine.
- Owner slice: Phase 2 baseline.

### P2.02 Service-Owned Payroll Command Read Model

- Class: Hard blocker before command-center UI.
- What must be implemented: A command read model with service-owned counts, blockers, next actions, evidence, redaction, freshness, and role scope.
- Why required: Dashboards must render trusted server data.
- Depends on: P1 source data, P0.13, P0.16, P0.30.
- Files/systems likely involved: Payroll read-model service, actions, BI/evidence adapters, privacy tests.
- Build/change/prove: Build read model before visual recomposition.
- Validation: Read-model contract tests, redaction tests, no-client-truth UI review.
- Risk if out of order: Command center duplicates metrics or fakes readiness.
- Owner slice: Phase 2 read-model foundation.

### P2.03 Command Center UX Prerequisites

- Class: Hard blocker before full command center.
- What must be implemented: First viewport command brief, action board, run wizard, blocker-first flow, line-level review, drillthrough, role-specific views.
- Why required: The goal is a daily operating place, not a read-only queue.
- Depends on: P2.02, P1.10.
- Files/systems likely involved: Payroll components, route pages, actions, read models.
- Build/change/prove: Recompose UI around read model and existing workflows only.
- Validation: Browser smoke, action gating tests, no unsupported route links.
- Risk if out of order: Operators see incomplete workflows or bypass sequence gates.
- Owner slice: Phase 2 UX.

### P2.04 Evidence And Proof Drawer Contract

- Class: Hard blocker before proof-centric UX.
- What must be implemented: Run, payslip, payment, declaration, and blocker rows link to trusted proof subjects without UI recomputation.
- Why required: Operators need evidence to clear blockers and approve payroll safely.
- Depends on: P2.02, P0.28, P0.30.
- Files/systems likely involved: Payroll read models, BI/evidence adapters, proof drawer components.
- Build/change/prove: Define proof subject IDs, evidence grade, redaction state, and route/action links.
- Validation: Proof-link contract tests and browser smoke.
- Risk if out of order: Users cannot verify blockers or evidence.
- Owner slice: Phase 2 evidence UX.

### P2.05 Operational Blockers And Action Queue

- Class: Hard blocker before command center release.
- What must be implemented: Command center shows blockers and next actions from services, not UI inference.
- Why required: Users need a controlled daily action surface.
- Depends on: P2.02, P2.04.
- Files/systems likely involved: Payroll read models, manager/owner/action-center services.
- Build/change/prove: Build service-owned action queue with actor permissions, module entitlement, evidence links, and freshness.
- Validation: Read-model tests and UI smoke.
- Risk if out of order: Users miss required steps or see duplicate manual workflows.
- Owner slice: Phase 2 action center.

### P2.06 Persona-Specific Navigation

- Class: Hard blocker before broad route rollout.
- What must be implemented: Navigation that reflects available services, permissions, module entitlement, and persona.
- Why required: The readiness analysis forbids exposing missing routes.
- Depends on: P0.15, P0.20, P1.10, P2.02.
- Files/systems likely involved: Sidebar config, module catalog, payroll routes, tests.
- Build/change/prove: Add route links only for implemented, tested, entitled workflows.
- Validation: Sidebar tests, route tests, entitlement tests.
- Risk if out of order: Sidebar becomes cluttered with nonfunctional HR/payroll links.
- Owner slice: Phase 2 navigation.

## Phase 3: Statutory And Country-Pack Readiness

### P3.01 Country-Pack-Driven Calculation Service

- Class: Hard blocker before statutory production payroll.
- What must be implemented: Payroll calculations resolve statutory parameters through country packs with version, schema, capability, and resolution hash.
- Why required: Legal values must not live in payroll logic.
- Depends on: P0.26, P0.27, P1.05.
- Files/systems likely involved: `services/payroll/payroll-control.service.ts`, `services/regulatory/country-packs/*`, resolver/validation tests.
- Build/change/prove: Expand resolver usage and provenance on run, line, payslip, and declaration evidence.
- Validation: Hardcode scan, country-pack fixture tests, expert-review provenance tests.
- Risk if out of order: Payslips and declarations may use unreviewed formulas.
- Owner slice: Phase 3 calculation engine.

### P3.02 Payroll Calculation Breadth

- Class: Hard blocker before production statutory payroll.
- What must be implemented: IRPP/income tax, CNPS family allowance, occupational risk, taxable/social bases, rubriques, YTD, corrections, caps, benefits, allowances, deductions, and lawful recovery rules.
- Why required: Professional payroll cannot rely on a narrow gross/CNPS/net path.
- Depends on: P3.01, P1.05.
- Files/systems likely involved: Payroll calculation service, country packs, schema extensions, tests.
- Build/change/prove: Add calculation mechanisms with pack-sourced rules and golden fixtures.
- Validation: Multi-period/YTD tests, country-pack golden fixtures, correction tests.
- Risk if out of order: Payslips and filings are incomplete or wrong.
- Owner slice: Phase 3 statutory breadth.

### P3.03 Expert-Reviewed Country-Pack Inputs

- Class: Hard blocker before legal production claims.
- What must be implemented: Reviewed country-pack values, formulas, versions, schema versions, hashes, legal references, and expert-review records.
- Why required: The system must not present expert-review placeholders as legal truth.
- Depends on: P3.01, P3.02.
- Files/systems likely involved: `services/regulatory/country-packs/cameroon.ts`, country-pack validation/resolver, review records.
- Build/change/prove: Attach legal/accounting review provenance to supported formulas.
- Validation: Country-pack validation, legal review record tests, provenance tests.
- Risk if out of order: Statutory payroll claims become legally unsafe.
- Owner slice: Phase 3 country-pack certification.

### P3.04 Statutory Fixture And Unsupported-State Gates

- Class: Hard blocker.
- What must be implemented: Golden fixtures and release gates that block unsupported/expert-review states from production legal certainty.
- Why required: The product must be honest about what is supported.
- Depends on: P3.03.
- Files/systems likely involved: Country-pack tests, payroll calculation tests, release gates, command UI labels.
- Build/change/prove: Add fixture suite and UI/read-model flags for blocked expert-review states.
- Validation: Golden fixtures and blocked-state tests.
- Risk if out of order: Users rely on unsupported calculations.
- Owner slice: Phase 3 statutory release gate.

## Phase 4: Payslip, Self-Service, Archive, And Register Readiness

### P4.01 Employee Self-Service Own-Data Restriction

- Class: Hard blocker before self-service.
- What must be implemented: Employees can access only their own profile and payslips.
- Why required: The blueprint explicitly forbids cross-employee access.
- Depends on: P1.03, P0.16, P0.32.
- Files/systems likely involved: Future self-service routes/actions, employee-user mapping, payroll read models.
- Build/change/prove: Add own-data resolver and deny cross-employee access.
- Validation: Cross-employee negative tests, tenant tests, module entitlement tests.
- Risk if out of order: Serious salary/person-data privacy breach.
- Owner slice: Phase 4 self-service gate.

### P4.02 Payslip And Self-Service UI

- Class: Hard blocker before Phase 4 release.
- What must be implemented: Immutable payslip viewer, PDF/archive, employee self-service, payroll exports, and controlled payslip drillthrough.
- Why required: Generated payslip rows are not enough for a professional payroll product.
- Depends on: P4.01, P0.08, P0.16, P0.30, P3.04.
- Files/systems likely involved: Future payslip routes/components/services, payroll actions, document/archive services.
- Build/change/prove: Build service-owned payslip read models with redaction, archive hash, and evidence links.
- Validation: Own-data tests, redaction tests, export audit tests, browser smoke.
- Risk if out of order: Salary leakage and weak legal/audit artifacts.
- Owner slice: Phase 4 payslip product.

### P4.03 Immutable Archive And Export Evidence

- Class: Hard blocker before export/self-service release.
- What must be implemented: Immutable archive references for payslip PDFs, exports, declarations, payment files, and close packs with redacted export audit.
- Why required: Released artifacts must be durable, traceable, and controlled.
- Depends on: P4.02, P0.28, P0.30.
- Files/systems likely involved: Export/archive services, upload/document systems, payroll services.
- Build/change/prove: Store archive URI/hash, actor, redaction state, purpose, and source evidence.
- Validation: Export permission/fresh-auth/audit tests and archive hash tests.
- Risk if out of order: Legal/audit artifacts may be mutable or untraceable.
- Owner slice: Phase 4 archive/export.

### P4.04 Payroll Register And Livre De Paie Tie-Out

- Class: Hard blocker before payroll certification.
- What must be implemented: Payroll register tying payslips, run totals, ledger entries, payments, declarations, and close evidence.
- Why required: Accountants and auditors need a certifiable payroll truth pack.
- Depends on: P2.02, P3.04, P4.02, P4.03.
- Files/systems likely involved: Future reporting service, payroll services, accounting services.
- Build/change/prove: Build a service-owned tie-out report and export path with redaction/audit.
- Validation: Tie-out tests and export audit tests.
- Risk if out of order: Payroll cannot be certified end to end.
- Owner slice: Phase 4 register/reporting.

## Phase 5: Declarations, Payment Reconciliation, And Close Assurance

### P5.01 Declaration Lifecycle Service

- Class: Hard blocker before declaration automation.
- What must be implemented: Prepare, submit, accept, reject, pay, reconcile, archive, and amend declarations with authority evidence.
- Why required: Prepared declarations are not enough for statutory operations.
- Depends on: P3.04, P0.10, P0.25, P0.28.
- Files/systems likely involved: `preparePayrollDeclarations`, regulatory country packs, compliance services, future declaration services.
- Build/change/prove: Build declaration state machine, evidence capture, amendment/correction path, and authority proof fields.
- Validation: Adapter tests, authority evidence tests, status transition tests.
- Risk if out of order: Manual/unproven compliance and false statutory claims.
- Owner slice: Phase 5 declarations.

### P5.02 Declaration Adapters

- Class: Hard blocker before authority submission.
- What must be implemented: Authority-specific declaration payloads, submission evidence, acceptance/rejection, amendment, payment, and reconciliation adapters.
- Why required: Country-pack preparation must become actual compliance workflow only when reviewed adapters exist.
- Depends on: P5.01, P3.03.
- Files/systems likely involved: Payroll declaration service, compliance services, country packs.
- Build/change/prove: Build adapter contracts with expert-reviewed mappings and fallback states.
- Validation: Adapter contract tests, evidence tests, blocked unsupported-state tests.
- Risk if out of order: The system may overstate compliance readiness.
- Owner slice: Phase 5 declaration adapters.

### P5.03 Payroll Payment Reconciliation

- Class: Hard blocker before payment product release.
- What must be implemented: Released payroll payments need provider/file references, matching, exceptions, settlement state, and retry handling.
- Why required: Payroll payments must be evidence-backed and reconcilable.
- Depends on: P1.07, P0.23, P0.25, P4.03.
- Files/systems likely involved: Payroll service, payment/reconciliation services, data-trust service, payment batch UI.
- Build/change/prove: Build payment batch detail, provider evidence upload/match, retry states, and exception workflow.
- Validation: Reconciliation service tests, exception tests, payment batch drillthrough smoke.
- Risk if out of order: Paid payroll cannot be certified or traced to cash movement.
- Owner slice: Phase 5 payment reconciliation.

### P5.04 Close Assurance And Data-Trust Expansion

- Class: Hard blocker before accounting/close release.
- What must be implemented: Complete close evidence for payroll payments, declarations, corrections, register tie-out, and stale close packs.
- Why required: Payroll must feed accounting close truthfully.
- Depends on: P0.25, P4.04, P5.01, P5.03.
- Files/systems likely involved: Close-assurance pack service, data-trust service, payroll services, accounting services.
- Build/change/prove: Add close-impact sources, data-trust facts, blockers, and certified-close stale metadata where needed.
- Validation: Close invalidation tests, data-trust tests, close pack tests.
- Risk if out of order: Close evidence may be incomplete or falsely fresh.
- Owner slice: Phase 5 close assurance.

## Phase 6: Assurance, Chaos Testing, Release Gates, And Production Readiness

### P6.01 Full Tenant, Export, Self-Service, And Chaos Matrix

- Class: Hard blocker before production release.
- What must be implemented: Tenant escape, export privacy, self-service own-data, rollback, double-submit, concurrent approval, closed-period posting, correction integrity, and payment/declaration chaos tests.
- Why required: Payroll must be robust under abuse, failure, and concurrency.
- Depends on: P0.32, P4.01, P5.04.
- Files/systems likely involved: Payroll service/action tests, self-service tests, export tests, close tests.
- Build/change/prove: Build permanent matrix and run it before release.
- Validation: Full test matrix pass.
- Risk if out of order: High-impact payroll regressions reach production.
- Owner slice: Phase 6 assurance.

### P6.02 UI And Browser Smoke Tests

- Class: Soft now, hard before UI release.
- What must be implemented: Browser/route smoke tests for payroll route, command center, run detail, approval, payment, declarations, payslip, register, and self-service once those routes exist.
- Why required: Enterprise workflows need real route verification.
- Depends on: P2 through P5 implemented routes.
- Files/systems likely involved: App routes, payroll components, Playwright or route smoke tests.
- Build/change/prove: Add smoke tests only for implemented routes, not planned routes.
- Validation: Browser smoke pass, no overlapping UI, no unsupported route links.
- Risk if out of order: Broken UI flows despite service tests.
- Owner slice: Phase 6 UI validation.

### P6.03 Observability And Incident Handling

- Class: Soft now, hard before production rollout.
- What must be implemented: Operational surfacing for payroll errors, blocked postings, failed payments, declaration failures, privacy incidents, stale close evidence, and assurance incidents.
- Why required: Payroll failures are business-critical.
- Depends on: P0.28, P5.04, P6.01.
- Files/systems likely involved: Error handling, assurance registry, notification/action services, incident services.
- Build/change/prove: Add alert/action routing and incident categories for payroll-critical failures.
- Validation: Incident tests and alert/action routing tests.
- Risk if out of order: Payroll failures can be silent or unmanaged.
- Owner slice: Phase 6 operations.

### P6.04 Documentation And Runbooks

- Class: Soft readiness, hard before final rollout.
- What must be implemented: Runbooks for payroll operation, correction, payment failure, declaration fallback, country-pack review, export, and close evidence.
- Why required: Admins and operators need safe procedures.
- Depends on: P1 through P5 implementation choices.
- Files/systems likely involved: `what-next/payroll/`, docs/runbooks.
- Build/change/prove: Save operator/admin runbooks and decision records.
- Validation: Runbook review and release checklist.
- Risk if out of order: Operators misuse expert-review states or correction/payment workflows.
- Owner slice: Phase 6 documentation.

### P6.05 Final Release Decision Report

- Class: Hard blocker before production claim.
- What must be implemented: Final report showing prerequisites satisfied, tests run, blockers closed, remaining risks, and approved production scope.
- Why required: The readiness analysis explicitly says not to claim production readiness from the current workbench alone.
- Depends on: P0 through P6 gates.
- Files/systems likely involved: `what-next/payroll/`, release gate outputs, test outputs.
- Build/change/prove: Save a final readiness report with scope boundaries and remaining deferrals.
- Validation: All hard gates pass or explicitly block release.
- Risk if out of order: The platform claims enterprise HR/payroll readiness prematurely.
- Owner slice: Phase 6 final release.

## Safest First Implementation Slice

The safest first implementation slice remains Phase 0 readiness closure:

1. Refresh the Phase 0 current-state inventory.
2. Apply the payroll immutability migration in a test database.
3. Add runtime DB trigger tests for finalized payroll evidence.
4. Formalize and run the payroll-specific hardcode gate.
5. Classify payroll payment, declaration, and correction close-impact sources.
6. Prove disabled payroll module behavior for current route, actions, read model, and redaction.
7. Confirm accounting setup readiness for payroll run/payment posting.
8. Produce the source-of-truth ownership map and persona/RBAC matrix.
9. Run the Phase 0 validation gate bundle.
10. Save a go/no-go report before Phase 1.

## Items That Must Not Be Implemented Yet

1. Do not build payslip PDF/archive/self-service until employee-user mapping, salary redaction, payslip immutability, and own-data tests exist.
2. Do not automate statutory declaration submission until expert-reviewed country-pack declaration adapters exist.
3. Do not present fallback or expert-review payroll outputs as legal truth.
4. Do not add HR/payroll sidebar subroutes pointing to unimplemented workflows.
5. Do not compute payroll totals in dashboard components.
6. Do not build dashboard-specific payroll shadow services.
7. Do not implement payroll payment release UI before payment destination approval evidence and reconciliation status handling are proven.
8. Do not mutate posted runs, emitted payslips, released payment batches, submitted declarations, or archived evidence in place.
9. Do not claim production HR/payroll readiness from the current payroll workbench alone.

## Final Ordered Roadmap

1. Governance: blueprint-first execution, stop-on-blocker, phase release gates.
2. Discovery: current-state inventory and source-of-truth ownership map.
3. Schema/runtime: tenant payroll models, migration ordering, DB immutability proof, runtime trigger tests.
4. Kernel safety: correction boundaries, concurrency controls, service/action protection.
5. Security: RBAC taxonomy, persona matrix, salary permission separation, fresh auth, maker-checker.
6. Module control: catalog, sidebar gating, disabled-module behavior, dependency readiness.
7. Accounting and close foundation: posting rules, accounting setup, run close invalidation, payment/declaration/correction close-impact classification.
8. Compliance foundation: hardcode gate, legal boundary labels, expert-review enforcement.
9. Evidence/privacy foundation: business events, audit, salary-read audit, redaction coverage.
10. Validation foundation: service/action tests, tenant matrix, release gates, unfinished-surface gate.
11. Migration and setup: seed/backfill, admin setup readiness.
12. HR source data: employee, contracts, compensation/rubriques, salary changes, payment destination, documents, leave/attendance, routes.
13. Command center: server read model, command UX, proof drawer, operational action queue, persona navigation.
14. Statutory engine: country-pack calculations, payroll breadth, expert-reviewed inputs, statutory fixtures.
15. Payslip and register: own-data self-service, payslip viewer/archive, export evidence, payroll register.
16. Declarations and payments: declaration lifecycle, adapters, payment reconciliation.
17. Close assurance: close/data-trust expansion and certified evidence gates.
18. Production readiness: chaos matrix, browser smoke, observability, runbooks, final release decision.

