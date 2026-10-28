# AqStoqFlow HR/Payroll System Integration Architecture And Gap Report

Date: 2026-06-27

Skills applied:

- `architect`
- `aqstoqflow-prompt-architect`
- `aqstoqflow-hrpayroll-00-orchestrator`
- `aqstoqflow-hrpayroll-21-final-readiness`
- `012-aqstoqflow-payroll-presence-architect`

## Executive Decision

HR/payroll is no longer a superficial dashboard. The current system has a real enterprise kernel: tenant-scoped payroll schema, service-owned workflows, protected server actions, country-pack provenance, database immutability triggers, accounting posting hooks, payment reconciliation evidence, close/data-trust integration, assurance checks, and limited UI routes.

The honest readiness classification is:

- Current state: `PARTIAL / CONTROLLED PILOT READY`.
- Full unrestricted production: `NOT READY`.
- Recommended direction: preserve the kernel, complete the missing product and statutory surfaces, then integrate payroll into finance, owner/manager, BI, cash planning, and close as service-owned projections.

This agrees with the 2026-06-26 final readiness decision: controlled limited pilot is possible for the implemented, evidence-gated scope; unrestricted production is blocked by statutory breadth, declaration adapter automation, production migration/backfill, and incomplete role-specific workflows.

## Language Locked

- "HR/payroll" means the full employee-to-payment-to-ledger-to-close lifecycle, not only salary calculation.
- "Baked with accounting" means source-linked SYSCOHADA posting, payroll liabilities, payment settlement, reconciliation, stale close evidence, and accountant drillthrough.
- "Integrated with POS/sales/finance" means payroll cost, cash obligation, and compliance risk flow into finance/BI/owner/manager views. POS should not own payroll truth.
- "Complete" means a tenant can run payroll with no hidden manual truth, no dashboard-computed payroll amounts, and no unreviewed legal/statutory claims.

## Evidence Inspected

Repository evidence:

- `graphify-out/GRAPH_REPORT.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_COMPLETION_ROADMAP_2026-06-26.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_READINESS_ASSESSMENT_2026-06-24.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PLATFORM_ROADMAP_AND_HYBRID_RECONSTRUCTION_2026-06-25.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/`
- `prisma/migrations/20260626093000_payroll_compensation_approval/`
- `prisma/migrations/20260626103000_payroll_payment_evidence_readiness/`
- `prisma/migrations/20260626123000_payroll_cnps_country_pack_expansion/`
- `prisma/migrations/20260626133000_payroll_declaration_lifecycle_evidence/`
- `prisma/migrations/20260626143000_payroll_payment_reconciliation_lifecycle/`
- `services/payroll/`, `actions/payroll/`, `components/payroll/`, `hooks/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `services/accounting/`, `services/payments/`, `services/reconciliation/`, `services/assurance/`
- `services/modules/`, `config/permissions.ts`, `config/sidebar.ts`, `lib/security/`
- `services/dashboard/`, `services/owner-war-room/`, `services/cash-command/`, `services/signals/`, `services/snapshots/`, `services/analytics/`

Current verification run:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run typecheck
```

Results:

- Prisma schema validation: passed.
- Focused payroll/route tests: 4 suites passed, 16 tests passed.
- Typecheck: passed.

## What Is Present Now

### Data Model

The Prisma schema contains a dedicated payroll model family:

- employees and employee status;
- contracts and contract status/type;
- rubriques and employee rubrique assignments;
- salary change requests;
- payment destination change requests;
- payroll periods and attendance snapshots;
- payroll runs and run lines;
- payslips and payslip lines;
- declarations and declaration evidence;
- payment batches and payment allocations.

This is the right direction: payroll is not stored as loose fields on users or sales records.

### Service Boundaries

Present service-owned slices include:

- `services/payroll/employee.service.ts`
- `services/payroll/contract.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/payslip-self-service.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/payment-reconciliation.service.ts`

Server actions are thin wrappers under `actions/payroll/`. They derive tenant and actor context server-side, enforce permissions/module entitlement/fresh auth where needed, and delegate business truth to services.

### Accounting And Close Integration

Present accounting integration:

- default posting rules for `PAYROLL-RUN` and `PAYROLL-PAYMENT`;
- accounting source types for payroll run/payment;
- payroll posting through ledger posting services;
- payroll payment release posting and reconciliation references;
- close invalidation for payroll posting/payment/declaration changes;
- data-trust source tables for payroll runs, lines, payslips, declarations, declaration evidence, payment batches, and allocations;
- payroll register tie-out to payslips, ledger, payments, declarations, and close evidence.

This is enough for a controlled pilot of implemented flows. It is not yet enough for full statutory or authority-adapter production.

### Security, Privacy, And Module Control

Present controls:

- canonical payroll permissions in `config/permissions.ts`;
- risk-classified payroll permissions and legacy aliases in `lib/security/rbac-permissions.ts`;
- payroll module catalog entry and entitlement checks in `services/modules/`;
- route-level RBAC and module entitlement on all implemented payroll routes;
- salary/person redaction policies;
- fresh-auth and maker-checker patterns for sensitive workflows;
- database-level immutability triggers for finalized payroll evidence;
- focused tenant-boundary, privacy, action, route, and register tests.

### UI Surfaces

Implemented routes:

- `/dashboard/payroll`
- `/dashboard/payroll/payslips`
- `/dashboard/payroll/register`

Implemented components:

- `PayrollCommandCenter`
- `PayrollPayslipSelfService`
- `PayrollRegisterTieOut`

Navigation and route smoke tests intentionally exclude unsupported subroutes:

- `/dashboard/payroll/setup`
- `/dashboard/payroll/employees`
- `/dashboard/payroll/contracts`
- `/dashboard/payroll/runs`
- `/dashboard/payroll/payments`
- `/dashboard/payroll/declarations`

That exclusion is correct. The system is avoiding fake production surfaces.

### Operating-System Integration

Present cross-system links:

- Dashboard setup status counts payroll employees and payroll periods.
- Owner War Room includes redacted payroll exposure counts.
- Cash Command action routing recognizes payroll exposure signals.
- Tenant operating snapshots count approved/emitted/paid/posted/archived payroll runs.
- Business signal rules route payroll exposure to `/dashboard/payroll`.
- Assurance registry includes payroll payment evidence, payment reconciliation exception, declaration lifecycle exception, and stale close evidence checks.
- The HR/payroll runbook covers operations, corrections, payment failure, declaration fallback, country-pack review, exports, privacy incidents, and stale close evidence.

## What Is Lacking

### Hard Blockers For Full Production

1. Full statutory payroll breadth is incomplete.

   Cameroon CNPS support exists as a narrow reviewed slice. Full IRPP/income-tax, allowances, caps, benefits, sector/risk automation, multi-period/YTD, leave/overtime/corrections, and jurisdiction expansion still require expert-reviewed country-pack formulas and fixtures.

2. Authority declaration automation is blocked.

   Manual declaration evidence lifecycle exists. Production electronic submission requires reviewed payload mappings, response mappings, rejection/amendment rules, credential policy, and close-impact rules.

3. Production seed/backfill is not approved.

   The existing seed/backfill path is dry-run/no-mutation. Production migration needs an approved tenant plan, redacted dry-run evidence, idempotency, rollback/correction strategy, and signoff.

4. Full role-specific product workflows are missing.

   Services exist for employees, contracts, compensation, payment evidence, declarations, payments, and reconciliation, but dedicated operator routes do not yet exist for setup, employees, contracts, compensation, runs, payments, and declarations.

5. Browser/visual/accessibility validation is incomplete.

   Route smoke exists. Full browser checks for proof drawers, role visibility, no-overlap layouts, keyboard paths, mobile, dark/light, denied states, and redacted views are still needed.

### Integration Gaps

1. Finance analytics still contains estimated salary/payroll-tax logic.

   `services/analytics/financial-analytics.service.ts` estimates salaries and payroll tax from revenue. That may be acceptable as a legacy placeholder, but it must not be treated as authoritative. Finance/BI should consume payroll register, ledger, and payment evidence instead.

2. Cash planning is not yet using payroll obligations as cash forecasts.

   Owner/Cash surfaces show redacted payroll exposure counts. They do not yet show upcoming net payroll, statutory liabilities, payment dates, or settlement risk from service-owned payroll/payment facts.

3. POS/sales are not directly connected to payroll labor cost.

   No direct POS payroll integration was found. That is acceptable because POS should not own payroll. The missing layer is finance/BI profitability that can allocate payroll cost by branch, department, location, shift, cost center, or product line when approved data exists.

4. Manager/owner action surfaces are aggregate only.

   They count exposure and route to payroll, but they do not yet provide enough role-specific next actions for payroll setup, payment exceptions, declaration blockers, or close blockers.

5. Setup/admin control plane is not a real route.

   `payroll-setup-readiness.service.ts` exists and is tested, but `/dashboard/payroll/setup` is intentionally absent. Operators need a guided setup surface before pilot tenants can self-serve readiness.

## Target Architecture

### The Spine

- State: Prisma payroll tables and service-owned read models are source of truth. UI renders state and invokes protected server actions only.
- Data model: employee, contract, attendance snapshot, period, run, run line, payslip, declaration, payment batch, ledger source link, reconciliation evidence, and close evidence remain explicit records.
- Contract: every mutation receives server-derived tenant/actor context, an idempotency key where relevant, typed validation, and safe errors.
- Trust boundary: untrusted input enters through server actions; RBAC, module entitlement, fresh auth, maker-checker, redaction, and tenant scope are enforced before service mutation.
- Sync model: payroll core is request/response plus append-only business events and outbox/assurance checks; payment/authority integrations may become adapter-driven later.
- Failure handling: unsafe states block visibly, emit proof, and preserve evidence; finalized facts are corrected through new records or correction runs, not in-place mutation.

### Integration Map

Payroll should feed:

- Accounting: `PAYROLL-RUN`, `PAYROLL-PAYMENT`, authority/social payment postings, source links, audit events.
- Payments/reconciliation: payment batches, provider/bank/mobile-money evidence, settlement state, suspense/exceptions.
- Close assurance: stale close evidence, payroll findings, certified pack invalidation, register tie-out.
- Compliance/country packs: statutory formulas, declarations, expert-review states, authority adapter provenance.
- Dashboard/owner/cash/BI: redacted exposure, upcoming cash obligations, branch/cost-center payroll cost, blockers, proof links.
- POS/sales: no payroll truth; only downstream profitability/cost allocation through finance/BI, never POS transaction mutation.

### Required Product Surfaces

Build only after service-owned read models exist:

1. `/dashboard/payroll/setup`
2. `/dashboard/payroll/employees`
3. `/dashboard/payroll/contracts`
4. `/dashboard/payroll/compensation`
5. `/dashboard/payroll/attendance`
6. `/dashboard/payroll/runs`
7. `/dashboard/payroll/payments`
8. `/dashboard/payroll/declarations`
9. Expanded `/dashboard/payroll/register`
10. Role-specific owner, HR, payroll officer, accountant, treasurer, auditor, and employee views.

### State Machines To Preserve

- Contract: `draft -> active -> suspended -> ended`
- Attendance: `draft -> signed/frozen -> corrected | superseded`
- Payroll period: `open -> inputs_locked -> calculated -> approved -> paid -> posted -> closed`
- Payroll run: `draft -> calculated -> reviewed -> approved -> emitted -> posted -> paid -> archived`
- Payment batch: `draft -> approved -> released -> partially_settled | settled | failed`
- Declaration: `prepared -> submitted -> accepted/rejected -> payment_due -> paid -> reconciled -> archived`

Corrections after finalization must create correction evidence or correction runs.

## Recommended Build Order

1. Freeze and package the current backbone.

   Review dirty files, commit the implemented payroll kernel, and rerun release gates in CI/staging.

2. Build payroll setup/admin readiness.

   Add `/dashboard/payroll/setup`, protected setup actions, readiness UI, and redacted dry-run plan UI. Keep mutation mode blocked.

3. Build HR source-data surfaces.

   Add employee, contract, compensation, payment destination, and attendance readiness workbenches from existing services.

4. Build the guided payroll run cockpit.

   Add run selection, readiness, freeze, calculate, review, approve/post, emit payslips, release payments, prepare declarations, and close review.

5. Complete statutory country-pack coverage.

   Add expert-reviewed formulas, golden fixtures, effective dating, capability states, and hardcode gates before claiming legal production support.

6. Build payment and declaration workbenches.

   Add payment batch detail, provider evidence, settlement/retry exceptions, declaration lifecycle, authority adapter contracts, and statutory payment linkage.

7. Expand finance/BI/cash integrations.

   Replace estimated payroll analytics with payroll register/ledger/payment facts. Add cash forecasts for net payroll and statutory liabilities. Add branch/location/cost-center payroll cost views only where redaction and accounting proof allow it.

8. Complete assurance and launch gates.

   Add chaos tests, tenant escape/export matrix, browser visual/accessibility checks, pilot parallel-run evidence, and production signoff.

## Quality Risks Handled

- Data integrity: schema, indexes, immutability triggers, idempotency, hashes, and source links exist for current scope.
- API/service contract: actions are thin and protected; services own business truth.
- State/data flow: command and register read models are server-owned.
- Security/privacy: payroll permissions, redaction, module entitlement, fresh-auth, maker-checker, and route denial states exist.
- Accounting: payroll posting and payment settlement have posting-rule foundations and close invalidation.
- Observability: assurance registry and runbook exist for implemented scope.
- Testing: focused service/action/route tests exist and pass for the checked slice.

## Open Risks

- Statutory correctness beyond the reviewed CNPS slice.
- Authority declaration automation and legal response handling.
- Full tenant migration/backfill safety.
- UI completeness for real HR/payroll operations.
- Visual/browser/accessibility validation.
- Legacy finance analytics estimates that should be replaced or clearly labeled non-authoritative.
- POS/sales profitability allocation not yet connected to payroll cost evidence.

## Advancement Decision

Do not advance HR/payroll to unrestricted production.

Approve a controlled pilot only for:

- implemented payroll command center;
- implemented payslip self-service;
- implemented register tie-out;
- service-owned payroll setup/readiness evidence;
- current accounting/payment/reconciliation/close integration;
- manual declaration evidence lifecycle;
- Cameroon CNPS narrow slice where already reviewed;
- redacted owner/cash/dashboard aggregate exposure signals.

Do not pilot:

- full statutory payroll;
- IRPP;
- automated authority declaration submission;
- production seed/backfill;
- unimplemented setup/employee/contract/run/payment/declaration routes;
- finance analytics that uses estimated payroll tax as payroll truth.

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

Mission:

Implement the next safe HR/payroll completion slice for AqStoqFlow: package the current backbone and add a protected payroll setup/admin readiness route without enabling production seed/backfill mutation.

Evidence to inspect:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `actions/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `components/payroll/`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`

Implement:

- `/dashboard/payroll/setup`
- protected setup readiness action
- service-backed setup readiness UI
- redacted dry-run plan UI
- route smoke and focused tests
- run report under `what-next/payroll/`

Success criteria:

- Payroll setup/admin readiness is visible, role-safe, redacted, and service-owned.
- The route guides a tenant to readiness without inventing contracts, salaries, payment destinations, or attendance.
- Production seed/backfill mutation remains blocked.
- Prisma validate, focused setup tests, route smoke, typecheck, service boundary gate, and policy gates pass or documented blockers are saved.

Blueprint ready.
