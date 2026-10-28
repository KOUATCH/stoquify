# AqStoqFlow HR/Payroll Expert-Grade Implementation Prompt Suite

Date: 2026-06-25

Requested source path:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PREREQUISITE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Resolved source path:

- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PREREQUISITE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Reason for resolved source: HR/payroll documentation was consolidated into `HR-payroll/` before this refinement task.

Mode: prompt-suite refinement only. No production code was implemented.

## Expert Panel

Every prompt in this suite must be executed through these lenses:

- Senior enterprise software architect: preserve domain boundaries, service ownership, dependency order, and platform modularity.
- Structural UI/UX design expert: build workflow-first, role-aware, ergonomic payroll surfaces only after service-owned read models exist.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, maker-checker, audit, and redaction.
- Payroll/accounting domain expert: protect payroll evidence, payslip correctness, statutory provenance, and payroll register traceability.
- Enterprise finance and controls expert: enforce SYSCOHADA posting, payment approval evidence, reconciliation, close assurance, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep country-pack law/configuration separated from code and require expert-reviewed statutory provenance.
- SaaS modularity specialist: ensure payroll is module-entitled, tenant-safe, scalable, and not implemented as a dashboard-only feature.

## Non-Negotiable Rules

- Services own HR/payroll business truth.
- Server actions expose protected workflows and derive tenant/actor context server-side.
- Dashboards render trusted server-provided data.
- RBAC governs user capability.
- Module entitlement governs tenant/module access.
- No client-computed payroll truth.
- No duplicated payroll metrics.
- No dashboard-specific payroll shadow services.
- No speculative UI routes.
- No unfinished production surfaces.
- No mutation of finalized payroll evidence in place.
- No statutory legal claims without expert-reviewed country-pack provenance.
- No payroll payment release without approved payment destination evidence.
- No salary/person-data exposure without permission, audit, and redaction.
- No phase may proceed when an earlier hard blocker is unresolved.

## Standard Prompt Contract

Every prompt below must produce a dated execution report under `what-next/payroll/` containing:

- Prompt name and phase.
- Expert lenses applied.
- Source prerequisite IDs.
- Files inspected.
- Prerequisite gate result.
- Implementation summary or blocker decision.
- Security/privacy decisions.
- Accounting/finance decisions.
- UI/UX decisions where relevant.
- Tests and validation run.
- Files changed.
- Source-of-truth risks avoided or remaining.
- Handoff decision.

If blocked, the report must include:

- Failed prerequisite.
- Why implementation must stop.
- Risk if forced.
- Exact next safe action.
- Decision: `blocked`.

## Standard Release Gate Menu

Use the smallest relevant subset and explain skipped checks:

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

If Prisma engine generation is blocked locally:

```powershell
npx prisma generate --no-engine
```

## Prompt 00: Expert Program Orchestrator

```text
Prompt name:
Expert Program Orchestrator.

Expert role lens:
Enterprise software architect, SaaS modularity specialist, cybersecurity lead, finance controls lead.

Purpose:
Orchestrate the HR/Payroll implementation program in strict dependency order. Select one prompt at a time, enforce prerequisite gates, stop on hard blockers, and prevent UI-first or dashboard-only payroll implementation.

Source prerequisite IDs:
P0.01, P0.02, P0.03, P0.04, P0.05, P0.33, P0.34, all downstream phase dependencies.

Inspect first:
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PREREQUISITE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`
- `what-next/payroll/`
- `HR-payroll/`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `services/payroll/`
- `actions/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `lib/security/`
- `services/modules/`
- `services/accounting/`
- `services/regulatory/`
- `services/assurance/`

Prerequisite gate:
1. Confirm the source roadmap and prompt suite are readable.
2. Confirm the selected prompt is the next safe slice.
3. Confirm earlier hard blockers are passed or explicitly blocked.
4. Stop if the user asks to jump to a dependent feature before its gates pass.

Implementation scope:
- Select and run exactly one implementation prompt.
- Maintain a dependency ledger: passed, blocked, deferred, not started.
- Require a dated execution report before handoff.
- Preserve source-of-truth ownership and release discipline.

Security and privacy requirements:
- Never allow work that weakens tenant isolation, RBAC, module entitlement, fresh auth, maker-checker, salary-read audit, or redaction.

Accounting/finance requirements:
- Never allow payroll posting, payment release, declaration automation, or close evidence changes without the matching finance gate.

UI/UX requirements:
- UI can only render service-owned data and invoke protected actions. No fake route, fake wizard, or client-derived payroll metric.

Do not implement:
- Broad HR/payroll product features directly from the orchestrator.
- Any dependent phase while a prior hard blocker is open.

Required tests and validation:
- Relevant standard release gate subset.
- Dated orchestration report.

Stop conditions:
- Missing source docs.
- Failed prior gate.
- Requested phase is out of order.
- Release gate failure that affects current scope.

Expected deliverables:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORCHESTRATION_REPORT_<date>.md`

Handoff criteria:
- The next prompt is identified and its prerequisite gate is ready.
```

## Prompt 01: Phase 0 Governance, Inventory, And Source-Of-Truth Map

```text
Prompt name:
Phase 0 Governance, Inventory, And Source-Of-Truth Map.

Expert role lens:
Enterprise architect, domain modeler, security lead, finance controls reviewer.

Purpose:
Create the governance foundation: current-state inventory, stop-on-blocker discipline, release gates, and a service ownership map for every HR/payroll truth source.

Source prerequisite IDs:
P0.01, P0.02, P0.03, P0.04, P0.05.

Inspect first:
- HR/payroll docs under `HR-payroll/`
- Current output folder `what-next/payroll/`
- Payroll schema, migrations, services, actions, components, route, hooks, tests
- RBAC, permissions, module catalog, redaction, audit, accounting, regulatory, assurance, and close services

Prerequisite gate:
- Source roadmap and prompt suite are readable.
- Core payroll schema/service/action/route files can be inspected.
- If reports conflict, reconcile by date and current file evidence.

Implementation scope:
- Produce a current-state inventory.
- Produce a source-of-truth ownership map covering employee, contract, compensation, salary changes, payment destination, attendance, payroll calculation, payslips, payments, declarations, ledger, close evidence, redaction, and command read models.
- Define blocker-report and release-gate templates.

Security and privacy requirements:
- Map every sensitive data class to RBAC, redaction, audit, and tenant scope.

Accounting/finance requirements:
- Map payroll posting, payment, declaration, register, reconciliation, and close evidence ownership.

UI/UX requirements:
- Identify existing UI surfaces but do not classify any UI as a truth owner.

Do not implement:
- Production code, migrations, UI, calculations, or workflow changes.

Files/systems likely involved:
- `HR-payroll/`, `what-next/payroll/`, `prisma/`, `services/payroll/`, `actions/payroll/`, `components/payroll/`, `app/[locale]/(dashboard)/dashboard/payroll/`, security/module/accounting/regulatory services.

Required tests and validation:
- Documentation validation only unless code is touched.
- Verify the report names inspected files and all ownership decisions.

Stop conditions:
- Core payroll files cannot be inspected.
- Current file evidence contradicts the source roadmap in a way that cannot be reconciled.

Expected deliverables:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_<date>.md`

Handoff criteria:
- Ownership map and phase gate templates are complete.
```

## Prompt 02: Runtime DB Immutability And Correction Boundary

```text
Prompt name:
Runtime DB Immutability And Correction Boundary.

Expert role lens:
Database architect, payroll evidence auditor, cybersecurity specialist.

Purpose:
Prove finalized payroll evidence is immutable at runtime and define correction boundaries before any product workflow depends on finalized evidence.

Source prerequisite IDs:
P0.06, P0.07, P0.08, P0.09, P0.10, P0.11.

Inspect first:
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- Payroll models and existing payroll service mutation paths
- Test database setup
- Prompt 01 report

Prerequisite gate:
- Payroll core models exist and are tenant-scoped.
- Immutability migration exists.
- A safe runtime DB test path exists or can be documented as blocked.

Implementation scope:
- Validate migration ordering and runtime application.
- Add or improve integration tests that attempt forbidden updates/deletes on finalized evidence.
- Validate allowed lifecycle metadata separately.
- Define correction, reversal, amendment, and void boundaries without building UI.
- Define concurrency/idempotency expectations for high-risk writes.

Security and privacy requirements:
- Prevent service bypass from mutating payroll evidence.
- Ensure tests cannot leak real salary/person data.

Accounting/finance requirements:
- Protect posted payroll evidence, payment batches, declarations, and source links needed for audit and close.

UI/UX requirements:
- No UI work.

Do not implement:
- Payslip UI, payment UI, declaration UI, correction UI, or broad workflow surfaces.

Files/systems likely involved:
- `prisma/migrations/`, `services/payroll/__tests__/`, test DB setup.

Required tests and validation:
- `npm run prisma:validate`
- Immutability migration test
- Runtime DB trigger tests if infrastructure exists
- Focused payroll service tests if mutation semantics change

Stop conditions:
- Test database cannot safely run.
- Migration missing or cannot be applied.
- Finalized evidence can be mutated.

Expected deliverables:
- Runtime immutability tests or blocker report.
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_<date>.md`

Handoff criteria:
- Finalized evidence immutability is proven or blocked with exact infrastructure gap.
```

## Prompt 03: Payroll Hardcode, Country-Pack, And Legal Boundary Gate

```text
Prompt name:
Payroll Hardcode, Country-Pack, And Legal Boundary Gate.

Expert role lens:
OHADA/SYSCOHADA architect, payroll statutory specialist, compliance reviewer.

Purpose:
Formalize payroll hardcode detection and enforce expert-review boundaries before statutory calculation or declaration expansion.

Source prerequisite IDs:
P0.26, P0.27, P3.01, P3.03, P3.04.

Inspect first:
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/country-packs/`
- `services/payroll/payroll-control.service.ts`
- Regulatory tests and payroll calculation tests
- Prompt 01 and Prompt 02 reports

Prerequisite gate:
- Current country-pack resolver and payroll calculation paths are inspectable.
- Any production statutory value has country-pack or reviewed-config provenance.
- Unsupported/expert-review states can be represented safely.

Implementation scope:
- Add or refine payroll-specific hardcode scanning.
- Separate test fixtures from production logic.
- Enforce expert-review and unsupported-state labels/gates.
- Ensure legal certainty is blocked until expert-reviewed country-pack provenance exists.

Security and privacy requirements:
- Do not expose statutory payloads or salary details in logs/reports without redaction.

Accounting/finance requirements:
- Statutory amounts must be traceable to source pack/version/hash before posting or declaration.

UI/UX requirements:
- UI must display unsupported/expert-review states honestly and block unsafe workflows.

Do not implement:
- New formulas without reviewed sources.
- Declaration submission automation.
- Payslip legal claims.

Files/systems likely involved:
- Regulatory services, payroll calculation service, tests, policy gates.

Required tests and validation:
- Regulatory hardcode tests.
- Country-pack validation.
- Payroll calculation tests if touched.
- `npm run policy:gates`
- Typecheck if code changes.

Stop conditions:
- Production hardcodes remain.
- Unsupported states cannot be blocked.
- Expert-reviewed inputs are missing for claimed production support.

Expected deliverables:
- Hardcode/legal-boundary implementation or blocker report.
- Dated gate report.

Handoff criteria:
- Statutory expansion can proceed only within verified country-pack boundaries.
```

## Prompt 04: RBAC, Module Entitlement, Privacy, And Protected Actions

```text
Prompt name:
RBAC, Module Entitlement, Privacy, And Protected Actions.

Expert role lens:
Cybersecurity lead, RBAC specialist, SaaS tenant-isolation architect.

Purpose:
Prove payroll access is controlled by RBAC, module entitlement, fresh auth, maker-checker, tenant isolation, protected server actions, salary-read audit, and redaction.

Source prerequisite IDs:
P0.12, P0.14, P0.15, P0.16, P0.17, P0.18, P0.19, P0.20, P0.21, P0.29, P0.30, P0.32.

Inspect first:
- `actions/payroll/`
- `services/_shared/protect.ts`
- `lib/security/rbac-permissions.ts`
- `lib/permissions.ts`
- `services/modules/`
- `config/sidebar.ts`
- `services/security/redaction-policy.service.ts`
- Payroll action, privacy, redaction, sidebar, protect, and tenant tests

Prerequisite gate:
- Current payroll route/action/read model exists.
- Module catalog entry exists.
- Salary redaction policy exists or is blocked.

Implementation scope:
- Create or update persona/RBAC matrix.
- Prove actions derive tenant/actor context server-side.
- Prove disabled-module behavior for current route/action/read model.
- Prove salary/person-data permissions, audit, and redaction.
- Classify future critical actions requiring fresh auth and maker-checker.
- Keep navigation limited to implemented workflows.

Security and privacy requirements:
- Negative tests for cross-tenant access and missing permission.
- Salary values must never leak through route, action, report, proof drawer, incident, or export without permission and audit.

Accounting/finance requirements:
- High-risk finance actions require fresh auth and maker-checker where appropriate.

UI/UX requirements:
- Navigation must hide or disable unavailable workflows; no dead links.

Do not implement:
- HR subroutes, payslip self-service, payment release UI, or command-center redesign.

Files/systems likely involved:
- Security, module, action, sidebar, redaction, payroll tests.

Required tests and validation:
- Payroll action tests.
- Redaction policy tests.
- Sidebar tests.
- Protect wrapper tests if touched.
- Tenant-boundary tests.

Stop conditions:
- Client input can influence tenant/actor.
- Module-disabled payroll access remains possible.
- Salary leaks without permission.

Expected deliverables:
- Security/module/privacy gate changes or blocker report.
- Dated gate report.

Handoff criteria:
- Payroll access path is tenant-safe, permission-safe, module-aware, audited, and redacted.
```

## Prompt 05: Accounting, SYSCOHADA Posting, And Close-Impact Gate

```text
Prompt name:
Accounting, SYSCOHADA Posting, And Close-Impact Gate.

Expert role lens:
Expert accountant, enterprise finance controls architect, close assurance reviewer.

Purpose:
Verify payroll accounting setup, SYSCOHADA posting rules, source links, close invalidation, and close-impact classification for payment, declaration, and correction sources.

Source prerequisite IDs:
P0.22, P0.23, P0.24, P0.25, P5.04.

Inspect first:
- `services/accounting/default-posting-rules.ts`
- `services/accounting/default-posting-rules.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/payroll/payroll-control.service.ts`
- Payroll/accounting tests and close invalidation reports

Prerequisite gate:
- Security/module gates pass.
- Posting rules and close invalidation paths are inspectable.
- Accounting setup requirements for target tenant are clear.

Implementation scope:
- Confirm payroll run and payroll payment posting readiness.
- Revalidate payroll run close invalidation.
- Classify payment release, declaration transitions, and correction writes as close-impacting or non-impacting.
- Wire close invalidation and data-trust only for justified sources.

Security and privacy requirements:
- Accounting evidence must not leak salary/person data beyond permissioned surfaces.

Accounting/finance requirements:
- No payroll posting without balanced SYSCOHADA source-linked entries.
- Close evidence must become stale when close-impacting facts change.

UI/UX requirements:
- UI may show blockers only from service-owned accounting/payroll facts.

Do not implement:
- Payment reconciliation UI, declaration adapters, payroll register UI, or broad close redesign.

Files/systems likely involved:
- Accounting services, payroll service, data-trust, close-assurance tests.

Required tests and validation:
- Payroll control tests.
- Close-assurance pack tests.
- Default posting rule tests if touched.
- Data-trust tests if touched.
- `npm run service:boundary:fail`

Stop conditions:
- Posting can be unbalanced.
- Close-impact cannot be classified.
- Close evidence can remain falsely fresh.

Expected deliverables:
- Accounting/close-impact implementation or blocker report.
- Dated accounting and close gate report.

Handoff criteria:
- Payroll finance and close foundations are safe for HR source-data expansion.
```

## Prompt 06: Migration, Seed, Backfill, And Payroll Admin Setup

```text
Prompt name:
Migration, Seed, Backfill, And Payroll Admin Setup.

Expert role lens:
Data migration architect, SaaS operations architect, enterprise finance setup reviewer.

Purpose:
Prepare tenant-safe seed/backfill and payroll setup readiness before operational rollout.

Source prerequisite IDs:
P0.35, P0.36, P1.01, P1.03.

Inspect first:
- `prisma/schema.prisma`
- `prisma/migrations/`
- Seed scripts and demo data patterns
- Accounting setup services
- Module catalog and entitlement services
- Payroll setup assumptions

Prerequisite gate:
- Phase 0 inventory and accounting gate exist.
- Employee/user data sources are understood.
- No production data mutation is attempted without a dry-run plan.

Implementation scope:
- Design idempotent seed/backfill for periods, posting rules, employees, contracts, salary/privacy defaults, module entitlement, and payment destination readiness.
- Define admin readiness checks for payroll journal, accounts, country pack, frequency, periods, roles, and module access.
- Produce dry-run report before any mutation.

Security and privacy requirements:
- Backfill must preserve tenant scope and redact sensitive output.

Accounting/finance requirements:
- Backfill must not create unbalanced or uncertified posting setup.

UI/UX requirements:
- Setup/admin surfaces, if later built, must expose readiness blockers rather than hidden failures.

Do not implement:
- Blind production migrations, self-service, payment release UI, or statutory formulas.

Files/systems likely involved:
- Seed/backfill scripts, Prisma, accounting setup, module services, payroll setup reports.

Required tests and validation:
- Dry-run report.
- Idempotency tests.
- Prisma validation.
- Tenant fixture checks.

Stop conditions:
- Employee/user mapping unclear.
- Backfill is not idempotent.
- Accounting setup cannot support payroll posting.

Expected deliverables:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SEED_BACKFILL_ADMIN_SETUP_PLAN_<date>.md`

Handoff criteria:
- Phase 1 can rely on known setup and data migration boundaries.
```

## Prompt 07: HR Source-Data Foundation

```text
Prompt name:
HR Source-Data Foundation.

Expert role lens:
Domain architect, database/model designer, payroll operations specialist.

Purpose:
Build service-owned HR source-data foundations before payroll command, payslip, payment, or statutory expansion.

Source prerequisite IDs:
P1.01, P1.02, P1.08, P1.09.

Inspect first:
- Payroll schema and services
- Existing user/membership/employee-like data
- Document/upload/evidence services
- Presence/attendance services
- Audit/business-event services
- Reports from Prompts 01 through 06

Prerequisite gate:
- Phase 0 hard blockers are resolved or explicitly blocked.
- Source-of-truth ownership map exists.
- Persona/RBAC matrix exists.

Implementation scope:
- Build or refine employee profile, HR documents/evidence references, leave/attendance source integration, and service-owned HR source-data boundaries.
- Enforce tenant scope, audit, events, redaction, and future self-service readiness.
- Keep UI minimal until services/actions/tests exist.

Security and privacy requirements:
- Every HR read/write is tenant-scoped and permission-gated.
- Sensitive fields are redacted/audited.

Accounting/finance requirements:
- HR source facts must support payroll calculation, posting, payment, and register traceability.

UI/UX requirements:
- No broad HR UI until service workflows and protected actions exist.

Do not implement:
- Self-service, full contract UI, compensation engine, command center, or payslip UI.

Files/systems likely involved:
- Prisma schema/migrations, `services/payroll/employee.service.ts`, document/evidence, attendance/presence, tests.

Required tests and validation:
- Prisma validate/generate.
- Service tests.
- Tenant-boundary tests.
- Audit/event tests.
- Redaction tests.

Stop conditions:
- Source data cannot be tenant-mapped.
- Evidence/audit services are unavailable.
- UI would need to own business truth.

Expected deliverables:
- HR source-data implementation or blocker report.
- Dated Phase 1 source-data report.

Handoff criteria:
- Employee source data is ready for identity and contract workflows.
```

## Prompt 08: Employee Identity And Contract Workflow

```text
Prompt name:
Employee Identity And Contract Workflow.

Expert role lens:
HR domain architect, SaaS identity specialist, privacy reviewer.

Purpose:
Build employee identity, duplicate-risk handling, employee-user mapping, and contract lifecycle workflow.

Source prerequisite IDs:
P1.03, P1.04, P4.01.

Inspect first:
- HR source-data services
- User/membership/auth models
- Payroll employee/contract models
- RBAC/persona matrix
- Tenant tests

Prerequisite gate:
- HR source-data foundation passes.
- Employee ownership and tenant boundaries are clear.
- If employee-user mapping is unresolved, do not implement self-service.

Implementation scope:
- Build employee master-data workflow with duplicate detection.
- Build employee-user mapping and own-data resolver.
- Build contract create/update/terminate/history services and protected actions.
- Add routes only when backed by services/actions/tests.

Security and privacy requirements:
- Cross-employee access must be denied.
- Contract/person data must be audited and redacted where appropriate.

Accounting/finance requirements:
- Contract state must support payroll eligibility, effective dating, and audit trail.

UI/UX requirements:
- Employee/contract UI must be workflow-oriented, compact, role-aware, and route-safe.

Do not implement:
- Payslip self-service, salary changes, payment destination, or command center expansion.

Files/systems likely involved:
- Payroll employee/contract services, actions, routes, tests.

Required tests and validation:
- Mapping reconciliation tests.
- Duplicate-risk tests.
- Contract service/action tests.
- Cross-employee denial tests.
- Route smoke for implemented routes.

Stop conditions:
- Employee-user mapping ambiguous.
- Contract history cannot be preserved.
- Tenant isolation fails.

Expected deliverables:
- Employee/contract implementation or blocker report.
- Dated employee/contract report.

Handoff criteria:
- Employee and contract truth is ready for compensation and salary controls.
```

## Prompt 09: Compensation, Rubrique, And Salary Change Approval

```text
Prompt name:
Compensation, Rubrique, And Salary Change Approval.

Expert role lens:
Payroll domain expert, security controls architect, accountant.

Purpose:
Build compensation/rubrique source data and maker-checker salary change workflow.

Source prerequisite IDs:
P1.05, P1.06, P0.16, P0.17, P0.18, P0.26, P3.02.

Inspect first:
- Employee/contract services
- Country-pack resolver and hardcode gate
- Redaction policy
- Audit/business-event services
- Existing payroll calculation service

Prerequisite gate:
- Employee and contract workflows are service-backed and tested.
- Hardcode gate passes.
- Salary permission separation and maker-checker rules exist.

Implementation scope:
- Build compensation/rubrique catalog and employee assignment service.
- Add taxable/social base metadata and country-pack interaction boundaries.
- Build salary change request/approval workflow with fresh auth, maker-checker, audit, evidence, effective dates, redaction, and correction semantics.

Security and privacy requirements:
- Salary changes require permission, audit, redaction, and segregation of duties.

Accounting/finance requirements:
- Rubriques must support statutory, payroll posting, payslip, and register traceability.

UI/UX requirements:
- Salary workflows should expose risk, status, approval chain, effective date, and evidence; no direct salary editing bypass.

Do not implement:
- Unreviewed statutory formulas, payslip surfaces, or command center redesign.

Files/systems likely involved:
- Payroll schema/migrations, compensation/rubrique services, salary change actions, redaction, country-pack resolver, tests.

Required tests and validation:
- Prisma validation.
- Rubrique service tests.
- Salary change maker-checker tests.
- Fresh-auth tests.
- Redaction/audit tests.
- Calculation fixture tests if impacted.

Stop conditions:
- Rubrique metadata cannot express provenance.
- Maker-checker can be bypassed.
- Salary data leaks.

Expected deliverables:
- Compensation/rubrique and salary change implementation or blocker report.
- Dated report.

Handoff criteria:
- Compensation source data is ready for payment destination and command read models.
```

## Prompt 10: Payment Destination, HR Evidence, And Attendance Readiness

```text
Prompt name:
Payment Destination, HR Evidence, And Attendance Readiness.

Expert role lens:
Finance controls expert, HR operations architect, payroll evidence auditor.

Purpose:
Build payment destination approval, HR evidence references, and attendance readiness needed before payment release UX and command workflows.

Source prerequisite IDs:
P1.07, P1.08, P1.09, P5.03.

Inspect first:
- Employee/contract/compensation services
- Payment release service
- Document/evidence services
- Attendance/presence services
- Audit/redaction policy

Prerequisite gate:
- Employee-user mapping exists.
- Maker-checker and salary/privacy rules exist.
- Payment release service controls are inspectable.

Implementation scope:
- Build employee payment destination create/change workflow with approval state, evidence hash, audit, redaction, and maker-checker.
- Add evidence references for contracts, salary changes, identifiers, and payment details.
- Define attendance source-to-payroll freeze contract and drift detection.

Security and privacy requirements:
- Payment details are sensitive and require permission, redaction, and audit.

Accounting/finance requirements:
- No payroll payment release without approved destination evidence.
- Attendance evidence must support payroll calculation and audit.

UI/UX requirements:
- Payment/attendance UI must display approval and evidence state, not raw sensitive details by default.

Do not implement:
- Payment release UI, reconciliation workbench, self-service, or command wizard.

Files/systems likely involved:
- Employee/payment profile service, payroll payment release, document/upload, attendance/presence, tests.

Required tests and validation:
- Destination approval tests.
- Payment release blocker tests.
- Attendance freeze/drift tests.
- Redaction tests.
- Tenant tests.

Stop conditions:
- Payment evidence cannot be verified.
- Attendance source data is not tenant-scoped.

Expected deliverables:
- Payment destination/evidence/attendance implementation or blocker report.
- Dated report.

Handoff criteria:
- HR source data is ready for command read models.
```

## Prompt 11: Payroll Command Read Model

```text
Prompt name:
Payroll Command Read Model.

Expert role lens:
Enterprise architect, BI/read-model specialist, security reviewer.

Purpose:
Build service-owned payroll command data before command center UI.

Source prerequisite IDs:
P0.13, P2.01, P2.02, P2.05.

Inspect first:
- Current payroll workbench action/service/component
- HR source-data services
- RBAC/persona matrix
- Redaction and salary-read audit
- Module entitlement behavior
- Evidence/audit services

Prerequisite gate:
- Phase 1 source data needed by the read model exists.
- Redaction and salary-read audit pass.
- Module disablement behavior is tested.

Implementation scope:
- Build a service-owned read model for current period, blockers, readiness, next actions, evidence, freshness, role scope, redaction, and trusted counts.
- Expose through protected server action.
- Keep UI render-only.

Security and privacy requirements:
- Read model must enforce tenant, RBAC, module entitlement, salary redaction, and audit.

Accounting/finance requirements:
- Include payroll posting, payment, declaration, register, and close blockers only from trusted services.

UI/UX requirements:
- Shape data for ergonomic command-center rendering without requiring UI calculations.

Do not implement:
- Visual redesign, client totals, or dashboard-only services.

Files/systems likely involved:
- Payroll services/actions, workbench component, BI/evidence adapters, tests.

Required tests and validation:
- Read-model contract tests.
- Redaction and salary-read audit tests.
- Module entitlement tests.
- Action RBAC tests.

Stop conditions:
- Metrics require client computation.
- Salary values cannot be redacted.
- Module-disabled state is unclear.

Expected deliverables:
- Command read model implementation or blocker report.
- Dated read-model report.

Handoff criteria:
- Command data is ready for UI composition.
```

## Prompt 12: Payroll Command Center UX And Proof Drawer

```text
Prompt name:
Payroll Command Center UX And Proof Drawer.

Expert role lens:
Structural UI/UX design expert, workflow architect, security reviewer.

Purpose:
Recompose the payroll workbench into a role-aware command center after the command read model exists.

Source prerequisite IDs:
P2.03, P2.04, P2.05, P2.06, P0.20, P0.34.

Inspect first:
- Command read model
- Current payroll workbench route/component
- Sidebar config/tests
- Proof/evidence adapter patterns
- Existing dashboard UI conventions

Prerequisite gate:
- Command read model passes.
- Every linked route/action exists and is tested.
- No unfinished workflow is exposed as available.

Implementation scope:
- Build command brief, action board, blocker-first flow, line-level review shell where data exists, proof drawer links, role-aware navigation, and route links to implemented workflows.
- Preserve mobile/desktop usability and visual clarity.

Security and privacy requirements:
- UI must preserve redaction and never reveal hidden salary/person data.

Accounting/finance requirements:
- Finance actions must show evidence, status, blocker, approval, posting, reconciliation, and close state from services.

UI/UX requirements:
- Quiet operational interface, compact hierarchy, stable dimensions, clear action states, no decorative bloat, no nested cards, no text overlap.

Do not implement:
- Fake wizard steps, self-service, declaration automation, payment release UI without prerequisites, or UI-derived payroll totals.

Files/systems likely involved:
- Payroll components/routes, sidebar config, command actions, proof drawer/evidence components, tests.

Required tests and validation:
- Component/route tests where available.
- Sidebar tests.
- Action gate tests.
- Browser or route smoke for implemented routes.
- Visual check for responsive layout and no overlapping content.

Stop conditions:
- UI needs data not present in read model.
- Proof links cannot be resolved.
- Sidebar would expose unimplemented workflows.

Expected deliverables:
- Command center UX implementation or blocker report.
- Dated command center report.

Handoff criteria:
- Command center can show later-phase blockers without pretending completion.
```

## Prompt 13: Statutory Country-Pack Expansion

```text
Prompt name:
Statutory Country-Pack Expansion.

Expert role lens:
OHADA/SYSCOHADA payroll specialist, compliance architect, accountant.

Purpose:
Expand country-pack-driven payroll calculation with expert-reviewed statutory provenance and fixture gates.

Source prerequisite IDs:
P3.01, P3.02, P3.03, P3.04.

Inspect first:
- Payroll calculation service
- Compensation/rubrique services
- Country-pack resolver/validation
- Cameroon country pack
- Regulatory tests
- Hardcode gate report

Prerequisite gate:
- Compensation/rubrique foundation exists.
- Hardcode gate passes.
- Expert-reviewed inputs exist for any production formula.

Implementation scope:
- Expand supported statutory calculation mechanisms.
- Attach country, pack version, schema version, capability, resolution hash, and legal provenance to run/line/payslip/declaration evidence.
- Add golden fixtures and blocked unsupported-state gates.

Security and privacy requirements:
- Statutory artifacts must not leak salary/person details in logs or reports.

Accounting/finance requirements:
- Statutory outputs must be traceable before posting, declaration, register, or close use.

UI/UX requirements:
- UI must surface unsupported/expert-review states clearly and block unsafe legal claims.

Do not implement:
- Unreviewed formulas, declaration submission adapters, or hidden expert-review states.

Files/systems likely involved:
- Payroll calculation, regulatory country packs, validation, tests.

Required tests and validation:
- Payroll calculation tests.
- Country-pack validation.
- Golden fixtures.
- Hardcode scan.
- Typecheck.

Stop conditions:
- Legal inputs not expert-reviewed.
- Hardcoded statutory values found.
- Payroll controls regress.

Expected deliverables:
- Statutory expansion or blocker report.
- Dated statutory gate report.

Handoff criteria:
- Payslip/register work can rely on stable calculation provenance.
```

## Prompt 14: Payslip, Archive, Export, And Employee Self-Service

```text
Prompt name:
Payslip, Archive, Export, And Employee Self-Service.

Expert role lens:
Payroll product architect, privacy specialist, UX expert.

Purpose:
Build immutable payslip product surfaces, archive/export evidence, and employee self-service only after identity, redaction, immutability, and statutory gates pass.

Source prerequisite IDs:
P4.01, P4.02, P4.03, P0.08, P0.16, P0.30, P3.04.

Inspect first:
- Employee-user mapping
- Payslip models/service paths
- Immutability proof report
- Redaction and salary-read audit
- Country-pack provenance
- Document/archive/export services

Prerequisite gate:
- Own-data restriction passes.
- Runtime immutability proven.
- Salary redaction/audit passes.
- Unsupported statutory states are visible.

Implementation scope:
- Build immutable payslip viewer/read model.
- Add archive/PDF/export evidence with hashes, actor, purpose, redaction, and source links.
- Build employee self-service limited to own payslips and permitted own profile subset.

Security and privacy requirements:
- No cross-employee access.
- Exports require permission, audit, redaction, and fresh auth where appropriate.

Accounting/finance requirements:
- Payslip totals must tie back to payroll run, calculation provenance, ledger, payment, declaration, and register.

UI/UX requirements:
- Payslip/self-service must be calm, legible, mobile-safe, bilingual-ready, and evidence-aware.

Do not implement:
- Cross-employee access, unaudited export, unsupported legal claims, or payroll register before payslip/archive stability.

Files/systems likely involved:
- Payslip services/actions/routes/components, archive/export/document systems, redaction/audit, tests.

Required tests and validation:
- Own-data negative tests.
- Redaction and salary-read audit tests.
- Export permission/fresh-auth/audit tests.
- Archive hash tests.
- Browser smoke for implemented routes.

Stop conditions:
- Employee-user mapping ambiguous.
- Payslip evidence mutable.
- Export cannot audit/redact.

Expected deliverables:
- Payslip/self-service/archive implementation or blocker report.
- Dated report.

Handoff criteria:
- Payslip product is ready for payroll register tie-out.
```

## Prompt 15: Payroll Register And Livre De Paie Tie-Out

```text
Prompt name:
Payroll Register And Livre De Paie Tie-Out.

Expert role lens:
Expert accountant, auditor, finance reporting architect.

Purpose:
Build a service-owned payroll register tying payslips, run totals, ledger entries, payments, declarations, and close evidence.

Source prerequisite IDs:
P4.04, P2.02, P3.04, P4.02, P4.03.

Inspect first:
- Command read model
- Payslip/archive services
- Payroll posting/source links
- Payment and declaration models/services
- Close-assurance/data-trust services

Prerequisite gate:
- Payslip/archive/self-service gate passes.
- Statutory unsupported-state gates pass.
- Payroll run posting/source links exist.

Implementation scope:
- Build payroll register read model.
- Tie payslips to run totals, ledger, payment, declaration, and close evidence.
- Add audited/redacted export path.

Security and privacy requirements:
- Register views and exports must enforce salary permissions and redaction.

Accounting/finance requirements:
- Register must be accountant-ready, source-linked, and reconcilable to ledger and payment/declaration facts.

UI/UX requirements:
- Register UI, if built, must support audit scanning, filters, proof links, and no client-derived totals.

Do not implement:
- Declaration submission adapters, payment reconciliation UI, or client-computed tie-outs.

Files/systems likely involved:
- Payroll reporting service, payroll/accounting services, export/archive, tests.

Required tests and validation:
- Tie-out tests.
- Export audit tests.
- Redaction tests.
- Accounting source-link tests.

Stop conditions:
- Ledger/payment/declaration links insufficient.
- Register totals need UI computation.

Expected deliverables:
- Payroll register implementation or blocker report.
- Dated register report.

Handoff criteria:
- Register is ready for declaration, payment, and close assurance expansion.
```

## Prompt 16: Declaration Lifecycle And Adapter Foundation

```text
Prompt name:
Declaration Lifecycle And Adapter Foundation.

Expert role lens:
Compliance architect, payroll statutory specialist, evidence auditor.

Purpose:
Build declaration lifecycle and authority adapter foundations without presenting unreviewed outputs as legal truth.

Source prerequisite IDs:
P5.01, P5.02, P3.03, P3.04, P0.10, P0.25, P0.28.

Inspect first:
- `preparePayrollDeclarations`
- Country-pack declaration metadata
- Compliance services
- Payroll register/read models
- Close-impact decision table
- Audit/evidence services

Prerequisite gate:
- Statutory fixture and unsupported-state gates pass.
- Expert-reviewed adapter inputs exist for production submission.
- Correction/amendment boundaries are defined.

Implementation scope:
- Build declaration state machine: prepare, submit, accept, reject, pay, reconcile, archive, amend.
- Add authority evidence capture and immutable source hashes.
- Build adapter contracts with fallback/expert-review states.
- Wire close/data-trust only according to approved close-impact decisions.

Security and privacy requirements:
- Declaration payloads must protect salary/person details and authority payloads with redaction policy.

Accounting/finance requirements:
- Declaration liabilities, payments, and reconciliation must tie to register, ledger, and close evidence.

UI/UX requirements:
- UI must distinguish prepared, submitted, accepted, rejected, paid, reconciled, archived, expert-review, and blocked states.

Do not implement:
- Authority automation for unreviewed adapters, hidden fallback states, or in-place mutation of submitted declarations.

Files/systems likely involved:
- Payroll declaration service, country packs, compliance services, close/data-trust, tests.

Required tests and validation:
- Adapter contract tests.
- Authority evidence tests.
- Status transition tests.
- Close-impact tests.
- Unsupported-state tests.

Stop conditions:
- Expert-reviewed mappings unavailable.
- Declaration transitions unsafe.
- Close-impact undecided.

Expected deliverables:
- Declaration lifecycle/adapter implementation or blocker report.
- Dated declaration report.

Handoff criteria:
- Declarations can feed register, data-trust, close, and payment workflows safely.
```

## Prompt 17: Payroll Payment Reconciliation

```text
Prompt name:
Payroll Payment Reconciliation.

Expert role lens:
Enterprise finance controls expert, payment reconciliation specialist, security reviewer.

Purpose:
Build payroll payment reconciliation after destination approval, posting setup, close-impact classification, and archive evidence are ready.

Source prerequisite IDs:
P5.03, P1.07, P0.23, P0.25, P4.03.

Inspect first:
- `releasePayrollPaymentBatch`
- Payment destination approval workflow
- Payment/reconciliation services
- Data-trust service
- Payroll payment posting rules
- Archive/export evidence services

Prerequisite gate:
- Approved payment destination workflow passes.
- Payroll payment posting setup is ready.
- Payment close-impact decision exists.
- Archive/export evidence is ready.

Implementation scope:
- Build payment batch detail and reconciliation read model.
- Add provider/file references, matching, exceptions, settlement, retry, and evidence links.
- Feed payment state into data-trust and close assurance where required.

Security and privacy requirements:
- Payment details require permission, redaction, audit, fresh auth, and maker-checker where applicable.

Accounting/finance requirements:
- Payment truth must reconcile to payroll register, ledger, provider evidence, and cash movement.

UI/UX requirements:
- Payment UI must show status, exceptions, evidence, next action, and no UI-derived reconciliation metrics.

Do not implement:
- Payment release UI bypassing approved destination evidence, UI-computed reconciliation, or cash claims without provider evidence.

Files/systems likely involved:
- Payroll service, payment/reconciliation services, data-trust, payment batch routes/components, tests.

Required tests and validation:
- Reconciliation service tests.
- Exception/retry tests.
- Payment batch route smoke.
- Close/data-trust tests where affected.

Stop conditions:
- Destination evidence missing.
- Settlement state cannot be modeled.
- Data-trust/close impact unclear.

Expected deliverables:
- Payment reconciliation implementation or blocker report.
- Dated payment reconciliation report.

Handoff criteria:
- Payment state can feed close assurance and final release gates.
```

## Prompt 18: Close Assurance And Data-Trust Expansion

```text
Prompt name:
Close Assurance And Data-Trust Expansion.

Expert role lens:
Close assurance architect, accountant, data-trust reviewer.

Purpose:
Complete payroll close assurance and data-trust expansion for payments, declarations, corrections, register tie-out, and certified close evidence.

Source prerequisite IDs:
P5.04, P0.25, P4.04, P5.01, P5.03.

Inspect first:
- Close-assurance pack service
- Data-trust service
- Payroll register
- Declaration lifecycle
- Payment reconciliation
- Correction boundaries

Prerequisite gate:
- Register tie-out exists.
- Declaration and payment workflows exist or are blocked with known limitations.
- Close-impact decision table exists.

Implementation scope:
- Add close-impact sources, stale evidence metadata, data-trust facts, blockers, and certified close integration where justified.
- Ensure payroll payments, declarations, corrections, and register tie-outs are represented truthfully.

Security and privacy requirements:
- Close/data-trust projections must redact salary/person data where required.

Accounting/finance requirements:
- Certified close evidence must stale when close-impacting payroll facts change.
- Data-trust must consume service-owned payroll facts only.

UI/UX requirements:
- Close surfaces must show proof, freshness, blockers, and risk without recomputing totals.

Do not implement:
- Duplicate close services, dashboard-only metrics, or unjustified close invalidation.

Files/systems likely involved:
- Accounting close/data-trust services, payroll services, tests.

Required tests and validation:
- Close invalidation tests.
- Data-trust tests.
- Close pack tests.
- Register tie-out tests.

Stop conditions:
- Source impact cannot be justified.
- Close evidence can remain falsely fresh.
- Register/payment/declaration evidence incomplete.

Expected deliverables:
- Close/data-trust implementation or blocker report.
- Dated close assurance report.

Handoff criteria:
- Close and data-trust gates are ready for assurance/chaos testing.
```

## Prompt 19: Assurance, Chaos, Browser Smoke, And Release Gates

```text
Prompt name:
Assurance, Chaos, Browser Smoke, And Release Gates.

Expert role lens:
Release engineer, security tester, QA architect, workflow assurance specialist.

Purpose:
Build final tenant, export, self-service, chaos, browser, and release validation matrix.

Source prerequisite IDs:
P0.31, P0.32, P0.33, P6.01, P6.02.

Inspect first:
- Reports from Prompts 01 through 18
- Payroll service/action/self-service/export tests
- Close/data-trust tests
- Implemented payroll routes/components
- Browser smoke infrastructure if present

Prerequisite gate:
- Earlier prompts pass or are blocked with explicit scope.
- Browser smoke only targets implemented routes.

Implementation scope:
- Add full tenant escape matrix for list/read/write/export/self-service.
- Add chaos tests for rollback, double-submit, concurrent approval, closed-period posting, correction integrity, payment/declaration edges.
- Add browser/route smoke for implemented routes only.
- Run release gates and save evidence.

Security and privacy requirements:
- Tests must catch tenant escape, salary leak, weak auth, module bypass, and unredacted exports.

Accounting/finance requirements:
- Tests must catch unbalanced posting, false-fresh close evidence, unreconciled payments, and declaration/register mismatches.

UI/UX requirements:
- Browser smoke must verify route availability, no broken links, no overlapping critical text, and no fake workflow routes.

Do not implement:
- New business features, routes only for tests, or tests that bless fake workflows.

Files/systems likely involved:
- Payroll tests, action tests, export/self-service tests, close tests, browser smoke tests, package scripts.

Required tests and validation:
- Full relevant test matrix.
- Standard release gate subset.
- Browser/route smoke for implemented routes.
- Static scan for unfinished production surfaces.

Stop conditions:
- Hard gate fails.
- Tenant escape or salary leak discovered.
- Route exists without service/action backing.

Expected deliverables:
- Assurance/chaos/browser release report.
- Test changes or blocker report.

Handoff criteria:
- Validation evidence is ready for operations/runbooks and final readiness decision.
```

## Prompt 20: Observability, Incident Handling, And Runbooks

```text
Prompt name:
Observability, Incident Handling, And Runbooks.

Expert role lens:
Operations architect, incident response lead, payroll controls reviewer.

Purpose:
Add or document operational readiness for payroll failures, blocked postings, failed payments, declaration failures, privacy incidents, stale close evidence, and operator runbooks.

Source prerequisite IDs:
P6.03, P6.04.

Inspect first:
- Assurance/incident services
- Notification/action routing services
- Error handling patterns
- Reports from earlier prompts
- Implemented payroll workflows

Prerequisite gate:
- Core workflows exist or have explicit blocked scope.
- Assurance/chaos report exists.

Implementation scope:
- Add alert/action routing and incident categories for payroll-critical failures where appropriate.
- Create runbooks for payroll operation, correction, payment failure, declaration fallback, country-pack review, export, privacy, and close evidence.

Security and privacy requirements:
- Incident payloads must not leak salary/person data.

Accounting/finance requirements:
- Runbooks must cover accounting setup, posting failures, payment reconciliation, declaration liability, and close stale evidence.

UI/UX requirements:
- Operational surfaces must show actionable status and proof links without noisy dashboards.

Do not implement:
- New payroll business workflows, new UI beyond existing incident surfaces, or legal claims beyond proven scope.

Files/systems likely involved:
- Error handling, assurance registry/incident services, notifications/action services, docs/runbooks, `what-next/payroll/`.

Required tests and validation:
- Incident tests.
- Alert/action routing tests.
- Runbook review checklist.
- Redaction tests for incident payloads.

Stop conditions:
- Incident payloads leak sensitive data.
- Runbooks contradict implementation.
- Operational routing lacks service-owned facts.

Expected deliverables:
- Observability/runbook implementation or documentation.
- Dated operational readiness report.

Handoff criteria:
- Final production readiness can be evaluated.
```

## Prompt 21: Final Production Readiness Report

```text
Prompt name:
Final Production Readiness Report.

Expert role lens:
Enterprise architect, cybersecurity auditor, expert accountant, release executive.

Purpose:
Produce the final readiness decision for the HR/Payroll prerequisite implementation program.

Source prerequisite IDs:
P6.05 and all P0 through P6 gates.

Inspect first:
- All reports from this suite
- Current git diff or changed files summary
- Test outputs from release gates
- Remaining blocker reports
- Implemented HR/payroll routes, services, actions, tests, and docs

Prerequisite gate:
- Every hard blocker is passed or explicitly unresolved.
- If any production-critical hard blocker remains unresolved, final decision must be `not production-ready`.

Implementation scope:
- Summarize completed prerequisites.
- Summarize unresolved blockers.
- List tests/gates and status.
- List changed files.
- List source-of-truth, security, accounting, privacy, statutory, and UI risks.
- Define approved production scope and non-production scope.
- Recommend the next action.

Security and privacy requirements:
- Explicitly report tenant isolation, RBAC, module entitlement, salary privacy, redaction, audit, and export status.

Accounting/finance requirements:
- Explicitly report SYSCOHADA posting, payment destination approval, payment reconciliation, register tie-out, declarations, data-trust, and close assurance status.

UI/UX requirements:
- Explicitly report route readiness, command center readiness, self-service readiness, proof links, and unsupported workflows.

Do not implement:
- Production code, last-minute fixes, UI changes, or scope expansion.

Files/systems likely involved:
- `what-next/payroll/`, reports, test outputs.

Required tests and validation:
- Validate report links/files exist.
- Validate no hard blocker is omitted.
- Validate final decision matches evidence.

Stop conditions:
- Missing phase report.
- Missing test evidence.
- Unclear production scope.

Expected deliverables:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_<date>.md`

Handoff criteria:
- None. This closes the program or declares it blocked.
```

