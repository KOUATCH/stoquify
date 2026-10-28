# AqStoqFlow HR/Payroll Enterprise Completion Roadmap

Date: 2026-06-26

Skill applied: `aqstoqflow-prompt-architect`

Scope: assess what remains to complete a full enterprise-grade HR/payroll integration for AqStoqFlow, given the current HR/payroll backbone already present in the worktree.

## Executive Decision

The HR/payroll system has a serious enterprise backbone, but it is not yet a complete enterprise-grade HR/payroll product.

Current state:

- Controlled pilot: plausible for the implemented, evidence-gated scope.
- Full unrestricted production: not ready.
- Primary reason: the backend control spine exists, but full setup/admin workflows, HR operational workflows, statutory coverage, authority adapters, production migration, and guided operator UX are incomplete.

This agrees with `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`, which states the system is `not production-ready` for full unrestricted rollout and only ready for controlled limited pilot of the implemented scope.

## Evidence Inspected

- Requested skill: `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-prompt-architect\SKILL.md`
- Payroll final readiness: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`
- Payroll schema: `prisma/schema.prisma`
- Payroll services: `services/payroll/`
- Payroll server actions: `actions/payroll/`
- Payroll UI routes: `app/[locale]/(dashboard)/dashboard/payroll/`
- Payroll UI components: `components/payroll/`
- Payroll hooks: `hooks/payroll/`
- Payroll scripts: `scripts/payroll-immutability-runtime-check.js`, `scripts/payroll-seed-backfill-dry-run.*`
- Payroll tests: `services/payroll/__tests__/`, `actions/payroll/__tests__/`, `components/payroll/__tests__/`, `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- Architecture graph output: `graphify-out/`

Current verification run:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run typecheck
```

Result:

- Focused Jest: 5 suites passed, 18 tests passed.
- Typecheck: passed.

## Current Backbone That Works

1. Dedicated payroll schema exists.

   Evidence: `prisma/schema.prisma` contains payroll employees, contracts, rubriques, periods, runs, run lines, payslips, declarations, declaration evidence, payment batches, and payment allocations.

2. Read-only setup readiness exists.

   Evidence: `services/payroll/payroll-setup-readiness.service.ts` checks tenant/module readiness, accounting dependency, actor permission, accounting settings, payroll account mappings, payroll journal, posting rules, open accounting period, country-pack capability, and employee-to-user mapping readiness.

3. No-mutation seed/backfill dry-run exists.

   Evidence: `services/payroll/payroll-seed-backfill-plan.service.ts` refuses mutation mode and reports `mutationModeAvailable: false`.

4. Core payroll lifecycle services exist.

   Evidence: `services/payroll/payroll-control.service.ts` includes period creation, attendance freeze, payroll calculation, approval/posting, payment release, reconciliation queueing, declaration preparation, ledger posting, business events, and close invalidation.

5. Service-owned command read model exists.

   Evidence: `services/payroll/command-read-model.service.ts` computes readiness and blockers across employees, contracts, compensation, attendance, payment destinations, payroll run, register, payments, declarations, posting, reconciliation, and close assurance.

6. Protected route surface exists for the implemented scope.

   Implemented routes:

   - `/dashboard/payroll`
   - `/dashboard/payroll/payslips`
   - `/dashboard/payroll/register`

   Evidence: `__tests__/payroll-dashboard-routes.smoke.test.tsx` verifies RBAC, module entitlement, safe denial behavior, and intentionally excludes unsupported routes.

7. Privacy and controls are present in the service/action layer.

   Current patterns include RBAC, module entitlement, fresh auth on sensitive paths, salary/person-data redaction, payment destination hashing, maker-checker controls, audit logs, business events, immutable evidence, and close invalidation.

8. Tests exist for important enterprise controls.

   Covered areas include setup readiness, tenant boundary, privacy, compensation workflow, contract workflow, payment destination evidence, command read model, register tie-out, payment reconciliation, declaration lifecycle, route smoke, and immutability runtime checks.

## Completion Definition

The system should be considered complete only when AqStoqFlow can support a tenant through this full lifecycle without hidden manual truth or dashboard-only state:

1. Enable HR/payroll module with accounting dependency, country pack, payroll settings, payment rails, calendars, and posting rules.
2. Onboard employees, link platform users, manage HR documents, and preserve tenant boundaries.
3. Create and approve employment contracts.
4. Configure rubriques, compensation, allowances, deductions, and salary-change workflows.
5. Capture time, leave, overtime, attendance, and source evidence.
6. Freeze payroll inputs with source hashes and drift detection.
7. Calculate payroll from service-owned data and country-pack rules.
8. Review anomalies and line-level proof.
9. Approve/post payroll with maker-checker, fresh auth, ledger posting, and close invalidation.
10. Issue payslips and employee self-service access with privacy controls.
11. Release payroll payments through approved destination evidence and payment rails.
12. Reconcile payroll payments with provider/bank/mobile-money evidence.
13. Prepare, submit, amend, and settle declarations through country-pack or authority-adapter provenance.
14. Tie out payroll register to payslips, payments, declarations, ledger, reconciliation, close, and proof links.
15. Feed owner/finance/HR dashboards, close assurance, observability, support, and incident workflows.
16. Migrate existing tenant data safely with dry-run, idempotent backfill, rollback plan, and redacted evidence.
17. Pass release gates, browser UX checks, security/privacy checks, policy gates, and pilot signoff.

## Ordered Completion Roadmap

### Phase 0: Release Hygiene And Baseline Freeze

Purpose: turn the current backbone into a reliable baseline before expanding it.

Prerequisites:

- Review the current dirty worktree.
- Identify which HR/payroll files belong to the payroll rollout and which are unrelated.
- Confirm database migrations and generated Prisma client are aligned.

Required work:

1. Stage and commit the current intended HR/payroll backbone.
2. Save a baseline release note listing included services, actions, routes, tests, scripts, and reports.
3. Run and record verification:
   - focused payroll Jest
   - `npm run typecheck`
   - `npm run lint`
   - `npm run service:boundary:fail`
   - `npm run policy:gates`
   - Prisma validation/generation path appropriate for Windows DLL lock state
4. Confirm runtime immutability evidence is current and generated from a dedicated non-production database.

Completion gate:

- Clean release branch or intentionally documented dirty files.
- All scoped gates pass.
- No unrelated lint/type/test debt is mixed into payroll release evidence.

### Phase 1: Payroll Setup And Admin Control Plane

Purpose: make tenant payroll activation operational, not only inspectable.

Prerequisites:

- Phase 0 baseline.
- Current read-only setup readiness service.
- Accounting settings, payroll journal, posting rules, and account mappings remain accounting-owned.

Required work:

1. Build `/dashboard/payroll/setup`.
2. Add server actions around setup readiness and dry-run plan generation.
3. Add role-aware setup UI for:
   - payroll module entitlement status
   - accounting dependency status
   - payroll account mappings
   - payroll journal readiness
   - payroll posting rules
   - open accounting period coverage
   - country-pack capability
   - employee-user mapping readiness
   - dry-run seed/backfill plan
4. Add controlled admin actions only after approval:
   - create/reuse payroll period
   - propose employee shell creation from active users
   - never fabricate contracts, salary, payment destinations, or attendance
5. Add tenant-level payroll settings:
   - country code
   - payroll frequency
   - pay calendar
   - currency
   - payroll cutoff rules
   - statutory sector/risk profile placeholders
   - payment rail configuration
6. Add tests for denied entitlement, missing accounting setup, missing country pack, missing user mapping, and no-mutation mode.

Completion gate:

- Setup page guides a tenant from blocked to ready without raw salary/payment/person leakage.
- Mutation mode remains blocked until explicit migration approval exists.

### Phase 2: HR Employee Master Data

Purpose: make employees first-class HR records rather than only payroll calculation inputs.

Prerequisites:

- Payroll setup readiness page.
- Tenant/user source mapping policy approved.
- Privacy/redaction policies active.

Required work:

1. Build `/dashboard/payroll/employees`.
2. Add employee list, profile, create/update, status transition, and user-linking workflows.
3. Support HR fields:
   - employee number
   - linked user
   - display name
   - employment status
   - job title
   - department/location if available
   - hire date and termination date
   - evidence references
   - statutory profile placeholders
4. Add document/evidence attachment without storing raw sensitive files in payroll models.
5. Add employee onboarding/offboarding workflows that affect payroll readiness.
6. Add import dry-run for employee records with redacted validation output.
7. Add role-specific views:
   - HR admin
   - payroll officer
   - finance
   - employee self-service
8. Add tenant-boundary and redaction tests.

Completion gate:

- Active employee readiness can be resolved from real service-owned HR data.
- No active employee can enter payroll without required identity, evidence, and tenant scope.

### Phase 3: Contracts, Compensation, And Rubriques

Purpose: complete the legal and financial source data needed before calculation.

Prerequisites:

- Employee master data.
- Salary-read privacy controls.
- Maker-checker permissions.

Required work:

1. Build `/dashboard/payroll/contracts`.
2. Build `/dashboard/payroll/compensation`.
3. Surface contract create/update/terminate workflows from `services/payroll/contract.service.ts`.
4. Surface rubrique catalog and assignment workflows from `services/payroll/compensation.service.ts`.
5. Add salary-change request, approval, rejection, and application UI.
6. Enforce contract versioning rather than in-place salary mutation for active contracts.
7. Add signed document hash requirements for active contract readiness.
8. Add compensation preview and redacted role-aware display.
9. Add tests for:
   - salary redaction
   - fresh auth
   - maker-checker
   - forbidden direct salary edits
   - stale contract conflict
   - active contract coverage in command readiness

Completion gate:

- Every payroll employee has an active, approved, evidence-linked contract before calculation.
- Salary changes are auditable, approved, and versioned.

### Phase 4: Attendance, Leave, Overtime, And Input Freeze

Purpose: replace payroll input assumptions with auditable source evidence.

Prerequisites:

- Employee and contract coverage.
- A chosen attendance/source-data policy.
- Leave and overtime approval policy.

Required work:

1. Build attendance readiness workflow or integrate with existing presence/time modules.
2. Add source adapters for:
   - scheduled time
   - worked time
   - leave
   - overtime
   - unpaid absence
   - corrections
3. Add `/dashboard/payroll/attendance` or equivalent embedded command-center workflow.
4. Add freeze workflow using source hashes.
5. Add drift detection when source data changes after freeze.
6. Add anomaly rules:
   - missing attendance
   - overtime review required
   - unpaid absence review
   - changed source hash
7. Add tests proving calculation is blocked when frozen attendance is missing or stale.

Completion gate:

- Payroll calculation can only run against frozen, auditable, tenant-scoped attendance snapshots.

### Phase 5: Statutory Country-Pack Completion

Purpose: move from narrow CNPS support to production statutory correctness.

Prerequisites:

- Expert-reviewed or regulator-confirmed statutory sources.
- Country-pack provenance policy.
- Golden fixtures for each supported jurisdiction.

Required work:

1. Expand Cameroon payroll country pack beyond current CNPS slice.
2. Add IRPP/personal income tax rules only with reviewed formula envelopes.
3. Add supported allowances, deductions, ceilings, exemptions, employer charges, and sector/risk classifications.
4. Add effective dating and pack version pinning.
5. Add tenant statutory profile setup.
6. Add golden fixtures:
   - ordinary salary
   - capped social base
   - multiple family allowance/risk sectors
   - overtime
   - unpaid absence
   - mid-period hire/termination
   - correction run
7. Expand hardcode gates to catch new forbidden statutory literals.
8. Add country-pack explanation/provenance in proof drawers.

Completion gate:

- A payroll run can be independently recalculated from fixtures and country-pack provenance for every claimed supported jurisdiction.
- Unsupported jurisdictions or formulas are blocked, not guessed.

### Phase 6: Guided Payroll Run Workflow

Purpose: turn the command center into an operational payroll cockpit.

Prerequisites:

- Setup ready.
- Employees mapped.
- Contracts active.
- Compensation queues clear.
- Attendance frozen.
- Payment destinations approved.
- Statutory pack supported.

Required work:

1. Build `/dashboard/payroll/runs`.
2. Add a guided run wizard:
   - select period
   - confirm input readiness
   - freeze inputs
   - calculate
   - review lines and anomalies
   - approve/post
   - issue payslips
   - release payments
   - prepare declarations
   - close evidence review
3. Add line-level review and proof drawer.
4. Add correction-run workflow.
5. Add idempotency keys and replay-safe UI states.
6. Add optimistic UI only where server truth remains authoritative.
7. Add tests for every transition and invalid state.

Completion gate:

- Payroll officer can complete a run from readiness to posted payroll without leaving service-owned workflow state.
- Invalid state transitions are blocked server-side.

### Phase 7: Payslip Archive And Employee Self-Service

Purpose: complete employee-facing payroll access.

Prerequisites:

- Posted payroll runs.
- Payslip emission.
- Employee-user mapping.

Required work:

1. Extend `/dashboard/payroll/payslips`.
2. Add payslip detail page.
3. Add employee archive, filtering, and export/download controls.
4. Add employer issue queue for payslip corrections.
5. Add multilingual payslip labels and statutory explanation blocks.
6. Add employee self-service route separate from payroll admin where appropriate.
7. Add tests for own-data access, denied cross-employee access, redaction, export audit, and immutable payslip evidence.

Completion gate:

- Employees can securely view/export only their own payslips.
- Payroll admins can manage issued payslip evidence without mutating finalized records in place.

### Phase 8: Payroll Payments And Provider Evidence

Purpose: make payment release operational, reconcilable, and auditable.

Prerequisites:

- Approved payment destination evidence.
- Posted payroll run.
- Payment rail configuration.
- Maker-checker permissions.

Required work:

1. Build `/dashboard/payroll/payments`.
2. Add payment batch detail.
3. Add bank/mobile-money/provider file generation with hashes.
4. Add provider submission evidence upload or adapter.
5. Add release workflow with fresh auth and maker-checker.
6. Add partial failure and retry model if required by payment rail.
7. Add reconciliation status drillthrough.
8. Add settlement evidence capture.
9. Add tests for payment total equality, duplicate allocation blocking, destination evidence, provider evidence, failed ledger posting, reconciliation exception, and close invalidation.

Completion gate:

- Payroll payment can be released, evidenced, reconciled, and tied back to the register without raw payment details leaking.

### Phase 9: Declaration Lifecycle And Authority Adapters

Purpose: move from manual declaration evidence to production-grade declaration workflows.

Prerequisites:

- Country-pack declaration rules.
- Authority payload and response mappings.
- Credential policy.
- Legal amendment/correction rules.
- Reviewed close-impact rules.

Required work:

1. Build `/dashboard/payroll/declarations`.
2. Extend manual evidence lifecycle UX:
   - prepared
   - submitted
   - accepted
   - rejected
   - payment due
   - paid
   - amended/corrected
3. Add authority adapter interface.
4. Add electronic payload generation only for reviewed authorities.
5. Add response ingestion and immutable evidence.
6. Add statutory payment linkage.
7. Add amendment/correction workflow.
8. Add tests for unsupported authority blocking, manual-only states, adapter idempotency, response mapping, evidence immutability, and close invalidation.

Completion gate:

- The system can either automate a declaration through a reviewed adapter or clearly block it as manual evidence workflow.

### Phase 10: Register, Accounting, Reconciliation, And Close Trust

Purpose: make payroll finance truth fully auditable.

Prerequisites:

- Posted run.
- Payment batch.
- Reconciliation evidence.
- Declaration evidence.
- Close assurance service available.

Required work:

1. Extend `/dashboard/payroll/register`.
2. Add drillthrough from register rows to:
   - run line
   - payslip
   - payment allocation
   - ledger posting
   - declaration
   - reconciliation transaction/exception
   - close evidence
3. Add finance review page for payroll postings.
4. Add close readiness payroll findings.
5. Add stale close evidence banners after payroll-impacting changes.
6. Add tests for register tie-out, missing evidence blockers, close evidence state, and certified export behavior.

Completion gate:

- Payroll totals tie out across run lines, payslips, payment batches, declarations, ledger, reconciliation, and close assurance.

### Phase 11: Role-Based Enterprise UX

Purpose: make the product usable by real operators, not only technically correct.

Prerequisites:

- Service-owned read models for each role.
- Route-level RBAC and module entitlement.

Required work:

1. Build role-specific payroll landing views:
   - owner/executive summary
   - HR admin workspace
   - payroll officer cockpit
   - finance/controller review
   - employee self-service
   - accountant/close assurance view
2. Add action board grouped by urgency and permission.
3. Add proof drawers consistently across payroll surfaces.
4. Add empty, blocked, loading, denied, and error states.
5. Add accessible keyboard/focus states.
6. Add Playwright visual smoke for:
   - desktop
   - tablet
   - mobile
   - light/dark
   - denied module
   - redacted role
   - full permission role
7. Add route smoke for every new route.

Completion gate:

- Each role sees the next correct action, only allowed data, and enough proof to trust the state.

### Phase 12: Observability, Audit, Support, And Runbooks

Purpose: make HR/payroll operable in production.

Prerequisites:

- Stable workflows.
- Assurance registry and incident services.

Required work:

1. Add payroll operational dashboards:
   - failed payroll events
   - stuck outbox messages
   - payment exceptions
   - declaration failures
   - close blockers
   - stale evidence
2. Add redacted incident payloads.
3. Add runbooks for:
   - payroll setup blocked
   - country-pack blocked
   - calculation anomaly
   - ledger posting failed
   - payment release failed
   - reconciliation exception
   - declaration rejected
   - close evidence stale
4. Add support-safe audit lookup.
5. Add alert thresholds and SLOs.
6. Add tests for redacted incidents and runbook registry.

Completion gate:

- Support can diagnose payroll issues without raw salary, person, or payment leakage.

### Phase 13: Production Migration, Seed, And Backfill

Purpose: safely load real tenant payroll data.

Prerequisites:

- Approved setup readiness.
- Approved tenant migration plan.
- Tenant fixture dry-run.
- Rollback plan.
- Owner/accountant/security signoff.

Required work:

1. Extend current dry-run plan into an approved migration workflow.
2. Add idempotent write mode only after approval gates.
3. Add redacted import validation reports.
4. Add duplicate detection.
5. Add rollback or compensating correction strategy.
6. Add production safety guardrails:
   - no raw salary in logs
   - no raw payment destination in reports
   - dedicated migration actor
   - rate limits
   - audit events
7. Run real tenant dry-run and save report.
8. Run staging backfill and compare counts/hashes.

Completion gate:

- Production backfill can be repeated safely, audited, reversed or corrected, and proven with redacted evidence.

### Phase 14: Pilot, Parallel Run, And Production Launch

Purpose: prove the full product before unrestricted rollout.

Prerequisites:

- Phases 0 through 13 complete for the target jurisdiction and tenant type.
- Full test and policy gates pass.
- Browser validation passes.

Required work:

1. Select pilot tenants.
2. Run payroll in parallel with existing payroll process for at least one cycle.
3. Compare:
   - gross
   - deductions
   - employer charges
   - net payable
   - declarations
   - payment batches
   - ledger postings
   - close evidence
4. Resolve deltas.
5. Obtain signoff from:
   - payroll officer
   - HR admin
   - accountant/controller
   - security/privacy owner
   - product owner
6. Promote from limited pilot to production only by jurisdiction and workflow scope.

Completion gate:

- Parallel payroll agrees with approved source of truth and all evidence chains are complete.

## Cross-Cutting Non-Negotiables

- Payroll truth must remain service-owned.
- Dashboard code must never compute authoritative payroll amounts.
- Tenant isolation must be enforced in every read/write.
- Module entitlement must gate every payroll route/action.
- Salary/person/payment data must be redacted by default.
- Fresh auth and maker-checker must protect salary, posting, payment, declaration, export, and correction workflows.
- Finalized payroll evidence must be immutable; corrections must be explicit correction records or versioned workflows.
- Country-pack/statutory values must have provenance, versioning, effective dating, and expert/regulator review.
- Unsupported workflows must be blocked, not approximated.
- Every new route must have RBAC denial tests, entitlement denial tests, and service-backed route smoke.
- Every close-impacting payroll change must invalidate stale close evidence.

## Immediate Next Safe Slice

Recommended next slice: Phase 0 plus Phase 1.

Why:

- The current worktree is still dirty and payroll files are largely uncommitted.
- Setup readiness already exists, so the next product value is to expose it safely.
- A setup/admin surface will unblock real tenant dry-runs without enabling dangerous payroll mutation.

Concrete next slice:

1. Review and package the current payroll backbone.
2. Create `/dashboard/payroll/setup`.
3. Add protected setup readiness server action.
4. Add setup readiness UI from service-owned data.
5. Add dry-run plan UI with redacted planned writes.
6. Preserve no-mutation mode.
7. Add route smoke and service/action tests.
8. Save a run report under `what-next/payroll/`.

## Verification Commands For Next Slice

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run typecheck
npm run service:boundary:fail
npm run policy:gates
```

Add Playwright/browser checks once the setup UI route exists.

## Execution-Ready Next Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise payroll architecture team:

- Senior enterprise software architect: preserve payroll boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Structural UI/UX design expert: build workflow-first, role-aware, ergonomic payroll surfaces only after service-owned read models and state contracts exist.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, maker-checker where appropriate, audit trails, redaction, and safe error handling.
- Payroll business logic expert: protect correctness, traceability, approval history, source-of-truth records, evidence links, and lifecycle state transitions.
- Enterprise finance and controls expert: ensure payroll integrates correctly with ledger posting, reconciliation, close assurance, control evidence, approval flows, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, accounting, and regulatory configuration separated from code. Require expert-reviewed provenance where legal or accounting rules are involved.
- SaaS modularity specialist: ensure payroll is module-entitled, tenant-safe, scalable, observable, and not implemented as a standalone dashboard-only feature.

Implement the next safe enterprise completion slice for AqStoqFlow HR/payroll: package the current payroll backbone and add a protected payroll setup/admin readiness surface without enabling production seed/backfill mutation.

Evidence to inspect:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_COMPLETION_ROADMAP_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `actions/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `components/payroll/`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`

Implement:

- `/dashboard/payroll/setup`
- protected setup readiness server action
- service-backed setup readiness UI
- redacted dry-run plan UI
- route smoke tests
- focused action/component/service tests
- run report under `what-next/payroll/`

Preserve:

- no mutation mode
- redaction
- tenant isolation
- RBAC
- module entitlement
- accounting-owned mapping boundaries
- country-pack resolver boundaries
- dirty-worktree safety

Verify:

- focused payroll setup tests
- route smoke
- typecheck
- service boundary gate
- policy gates where feasible

Success:

- Payroll setup/admin readiness is visible, role-safe, redacted, and service-owned.
- It can guide a tenant to readiness without inventing contracts, salaries, payment destinations, or attendance.
- Production seed/backfill mutation remains explicitly blocked.
