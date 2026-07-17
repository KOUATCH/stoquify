# AqStoqFlow HR/Payroll Full Production Roadmap

Date: 2026-06-27
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Prompt status: run after approval

## Executive Decision

AqStoqFlow HR/payroll should move from `CONTROLLED PILOT READY` to full production through a gated completion program, not through a broad dashboard expansion.

The next implementation wave must start with statutory country-pack breadth and payroll engine hardening. Operator routes, finance/BI intelligence, POS/sales integration, and full release certification should follow only after payroll calculation, register truth, statutory provenance, and correction rules are production-grade.

The target product is a complete SMB HR/payroll operating system:

- employee master data;
- contracts, compensation, attendance, leave, overtime, and source evidence;
- payroll calculation, review, approval, posting, release, correction, and locked registers;
- payslips, employee self-service, operator workbenches, payments, statutory declarations, and authority evidence;
- accounting postings, payment reconciliation, close assurance, data trust, and release gates;
- finance, BI, POS, sales, owner, manager, accountant, treasurer, auditor, and employee integration;
- tenant-safe, RBAC-controlled, module-entitled, fresh-auth protected, redacted, audited, and evidence-backed behavior.

## Evidence Base

Primary evidence inspected:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_PAYROLL_BROWSER_VALIDATION_GAP_CLOSURE_2026-06-27.md`
- 2026-06-27 Phase 1 payroll reports under `what-next/payroll/`
- `graphify-out/GRAPH_REPORT.md`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `actions/payroll/`
- `services/payroll/`
- `components/payroll/`
- `services/accounting/`
- `services/regulatory/country-packs/`
- `services/analytics/`, `services/finance/`, `services/cash-command/`, `services/owner-war-room/`, `services/signals/`, `services/snapshots/`
- `config/permissions.ts`, `config/sidebar.ts`
- `prisma/schema.prisma`
- payroll action, service, route, accounting, assurance, and Playwright smoke tests

Graph evidence supports the same direction: payroll is part of the connected SMB operations story and operational transaction backbone, with attendance-to-payroll, POS-to-ledger, financial analytics, and payroll processing linked as platform concerns rather than isolated screens.

## Current State

The system already has a real HR/payroll kernel:

- Dedicated Prisma payroll tables for employees, contracts, rubriques, salary changes, payment destination changes, periods, attendance snapshots, runs, run lines, payslips, declarations, declaration evidence, payment batches, and allocations.
- Service-owned workflows in `services/payroll/`.
- Thin protected server actions in `actions/payroll/`.
- Payroll route surfaces for overview, setup, employees, contracts, compensation, attendance readiness, payslips, and register.
- Sidebar entries for the implemented payroll surfaces only.
- Route smoke guards that intentionally exclude unsupported payroll runs, payments, declarations, and presence routes.
- RBAC, module entitlement, tenant scope, fresh-auth evidence, maker-checker controls, salary/person-data redaction, export audit, and watermarking on sensitive flows.
- CNPS-focused Cameroon country-pack payroll provenance for the implemented statutory slice.
- SYSCOHADA-aware payroll posting foundations and payroll source links.
- Register tie-out across payslips, ledger, payments, declarations, close evidence, and proof links.
- Data-trust blockers for missing payroll register proof, payment proof, declaration proof, ledger links, and stale close evidence.
- Browser smoke setup now exists, but authenticated screenshots remain blocked locally until a seeded payroll tenant user is available.

This is enough for a bounded pilot. It is not enough for unrestricted production.

## Production Blockers To Close

| Blocker | Production risk | Roadmap response |
| --- | --- | --- |
| Full statutory payroll breadth | Cannot claim complete statutory payroll. | Complete expert-reviewed country packs, formulas, fixtures, effective dating, caps, allowances, IRPP/income tax, benefits, employer liabilities, leave/overtime, YTD, corrections, and jurisdiction expansion. |
| Authority declaration automation | Cannot claim automated legal filing. | Build adapter contracts only after legal payload/response mappings, rejection/amendment rules, credentials, retries, idempotency, receipts, audit, and close-impact rules are reviewed. |
| Production seed/backfill mutation | Cannot migrate tenant history safely. | Add tenant-by-tenant dry run, approval, idempotency, rollback/correction, redacted evidence, and post-migration reconciliation. |
| Payment/declaration/run operator routes | Operators cannot self-serve the full lifecycle. | Add `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, and `/dashboard/payroll/declarations` only when service-backed and proof-backed. |
| Browser visual/accessibility validation | Cannot certify polished unrestricted release. | Run authenticated Playwright smoke, screenshots, keyboard paths, mobile, dark/light, denied states, proof drawers, and redacted views. |
| Finance/BI/cash integration depth | Cannot claim system-wide payroll intelligence. | Replace estimated payroll analytics with register, ledger, payment, declaration, and close facts; add cash forecasts and cost allocation. |

## Locked Spine

```text
HR source data
  -> contracts, compensation, attendance, leave, overtime
  -> payroll run
  -> immutable payroll register
  -> payslips, ledger, payments, declarations
  -> close assurance and data trust
  -> finance, BI, cash planning, owner/manager views
```

POS and sales may feed approved commission, branch labor, shift, attendance, or performance inputs after HR/payroll approval. POS and sales must never own payroll truth, statutory truth, payment settlement truth, declaration truth, close readiness, or register proof.

## Language Locked

- Full HR/payroll: employee-to-payment-to-ledger-to-close lifecycle, not only salary calculation.
- Production statutory payroll: country-pack formulas, fixtures, legal provenance, effective dating, and release gates that are expert-reviewed or regulator-confirmed.
- Payroll register: immutable service-owned source of financial payroll truth after calculation/posting/release, corrected only through new records or correction runs.
- Operator routes: workflow surfaces backed by services, permissions, proof links, empty/error/denied states, and tests. No placeholder pages.
- Productive SMB system: daily workflows that reduce payroll/accounting/admin friction without adding speculative enterprise complexity.

## Architecture Blueprint

### State

Prisma payroll tables and service-owned read models remain source of truth. UI components render state, collect intent, and invoke protected server actions. Dashboard state must never compute payroll amounts, statutory liabilities, settlement status, declaration truth, close readiness, or register proof.

### Data Model And Invariants

Core records must remain explicit and tenant-scoped:

- employee, employee documents, dependent/tax/social identity references, payment destination evidence;
- contract, salary change request, rubrique, assignment, benefit, allowance, deduction, and approval history;
- attendance snapshot, leave/overtime source evidence, input freeze hash, and correction chain;
- payroll period, payroll run, run line, payslip, payslip line, and immutable register proof;
- declaration, declaration evidence, authority response, amendment, receipt, and statutory liability;
- payment batch, payment allocation, provider/bank/mobile-money evidence, suspense, exception, and settlement proof;
- accounting source link, posting batch, journal entry, close evidence, data-trust finding, and release-gate evidence.

Finalized payroll financial evidence must be append-only or correction-based. In-place mutation of finalized runs, payslips, declarations, payments, settlement evidence, or register proof is not production-safe.

### Contracts

Every write action must use:

- server-derived tenant and actor context;
- explicit permission, module entitlement, and fresh-auth where sensitive;
- maker-checker where one actor should not originate and approve the same payroll-finance change;
- typed validation and safe errors;
- idempotency keys for runs, payments, declarations, exports, migrations, and adapters;
- audit event and business event emission;
- close invalidation when payroll facts affect already-certified or in-progress close evidence.

### Trust Boundary

Untrusted input enters through protected server actions only. Service methods enforce organization scope, status transitions, immutable evidence rules, redaction, and source-link requirements. Adapter credentials, authority payloads, provider responses, and salary/person data are high-risk and must be redacted from UI, logs, reports, and incidents unless a role and purpose explicitly allow exposure.

### Sync Model

Core payroll should remain synchronous for operator actions and deterministic service reads. Authority filing, provider settlement, bank/mobile-money reconciliation, screenshots, migration backfills, and close certification should use idempotent jobs, evidence records, or adapter inbox/outbox patterns where retries or delayed responses are expected.

### Failure Handling

Payroll should fail closed. Missing statutory review, missing register proof, missing settlement proof, closed accounting periods, stale close evidence, unsupported country packs, unauthenticated export, and unauthorized route access must block with a clear action, not silently estimate or continue.

## Completion Roadmap

### Wave 0: Baseline Freeze And Scope Registry

Purpose: lock what is already pilot-ready so the production program does not blur completed work with new risk.

Build:

- Current-state registry of implemented payroll routes, actions, services, permissions, components, migrations, runbooks, tests, and reports.
- Blocked-scope registry for runs/payments/declarations operator routes, full statutory breadth, authority automation, production mutation backfill, and fact-backed BI.
- Release evidence index that points to current passing gates and known skipped browser auth-state checks.

Dependencies:

- Current Phase 1 reports and final readiness report.

Gate:

- No unsupported route is added to sidebar, route smoke, or browser smoke.
- `not production-ready` language remains until blockers close.

Verification:

```powershell
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run typecheck
npm run policy:gates
```

### Wave 1: Statutory Country-Pack And Payroll Engine Hardening

Purpose: close the deepest product-claim blocker first.

Build:

- Full Cameroon payroll statutory matrix beyond the current CNPS slice: IRPP/income tax, taxable base, allowances, benefits, employer liabilities, employee deductions, sector/risk rules, caps, floors, exemptions, YTD, corrections, retroactive adjustments, rounding, and effective dating.
- Country-pack fixture system with regulator/expert provenance, expected outputs, edge cases, golden files, and capability status transitions.
- Payroll calculation engine tests that pin every formula to reviewed country-pack inputs and deterministic golden fixtures.
- Correction run model for retro salary changes, attendance corrections, statutory updates, closed periods, and prior-period adjustments.
- Register hash and payslip tie-out checks that include all statutory components, not only current CNPS amounts.

Dependencies:

- Legal/accounting review of statutory inputs.
- Country-pack schema support for each statutory parameter and fixture.

Gate:

- No statutory formula can run in production unless the parameter provenance is `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED`.
- Regulatory hardcode gate remains clean.
- Calculation cannot fall back to estimated taxes, placeholder rates, or hardcoded legal values.

Verification:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
npm run policy:gates
```

### Wave 2: Core HR Source-Of-Truth Completion

Purpose: make HR records complete enough to feed payroll without hidden spreadsheets.

Build:

- Employee master data completeness model: identity, platform user link, employment status, tax/social identifiers, document hashes, dependents, payment destination evidence, branch/location/cost-center assignment, and redacted profile views.
- Contract lifecycle completion: draft, active, suspended, ended, amendment, transfer, termination, salary history, signed document evidence, and approval history.
- Compensation source data: rubriques, recurring earnings, allowances, benefits, deductions, taxable/non-taxable flags, employer/employee classification, approval workflow, effective dates, and change history.
- Attendance/leave/overtime source data: draft, submitted, approved, frozen, corrected, superseded, source hashes, and payroll-period input lock.

Dependencies:

- Existing employee, contract, compensation, payment, and attendance readiness services.
- Wave 1 calculation inputs for statutory classification.

Gate:

- Payroll calculation blocks when active employees lack active contracts, approved compensation, payment destination evidence, and frozen attendance/input proof.
- Salary/person data is redacted by default in operator, owner, BI, incident, and support views.

Verification:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee.service.test.ts services/payroll/__tests__/payroll-contract.service.test.ts services/payroll/__tests__/payroll-compensation.service.test.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts --runInBand
npm run typecheck
```

### Wave 3: Payroll Run, Register, And Correction Kernel

Purpose: make the payroll run lifecycle production-safe before adding more operator surface.

Build:

- Complete run state machine: create period, freeze inputs, calculate, review, approve, post, release, prepare declarations, archive, close-lock, correct.
- Double-submit and concurrency protection for calculate, approve, post, release, export, and declaration prep.
- Idempotency keys and correlation IDs for lifecycle actions.
- Immutable correction records for finalized payroll runs, payslips, payment batches, and declarations.
- Run anomaly model for missing employee data, changed country pack, stale attendance, negative net pay, unsupported statutory component, unbalanced posting, and register mismatch.
- Register read model that ties gross, taxable, statutory, employer, net, payslip, payment, declaration, ledger, and close proof in one proof chain.

Dependencies:

- Waves 1 and 2.

Gate:

- No route or action can release payment, emit payslips, prepare declarations, or certify close without register proof.
- Closed period and certified close evidence block unsafe mutation.

Verification:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand
npm run workflow:assurance:runtime-check
```

### Wave 4: Accounting, Payments, Declarations, And Close Backbone

Purpose: make accounting the financial backbone of payroll, not a downstream afterthought.

Build:

- Ledger mapping for salary expense, employer charge expense, employee deduction liabilities, statutory liabilities, net-pay clearing, payment clearing, branch/location/cost-center allocation, and authority payments.
- Posting rules and journal checks for all payroll components produced by the hardened engine.
- Payment release lifecycle with provider/bank/mobile-money evidence, allocation checks, suspense, partial settlement, failure, retry, reversal, and reconciliation.
- Declaration lifecycle with source register hash, authority receipt, submitted/accepted/rejected/amended/settled states, close impact, and correction rules.
- Data-trust and close blockers for statutory liability mismatches, missing authority receipt, stale register, missing settlement proof, and unposted payroll liabilities.

Dependencies:

- Wave 3 register and correction kernel.
- Reviewed authority/provider evidence contracts.

Gate:

- Accounting postings must balance and source-link to payroll evidence.
- Payment settlement and declaration evidence must carry source register proof.
- Close certification blocks when payroll ledger, declaration, payment, register, or source-link proof is incomplete.

Verification:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand
npm run policy:gates
```

### Wave 5: Authority And Payment Adapter Readiness

Purpose: add automation only after manual evidence contracts are production-grade.

Build:

- Authority adapter interface for declaration payload, validation, submission, response parsing, rejection, amendment, receipt, status polling, credential policy, audit, and close impact.
- Payment provider adapter interface for batch creation, status polling, settlement evidence, partial settlement, failure, retry, reversal, and idempotent replay.
- Sandbox/production separation for credentials and endpoints.
- Adapter inbox/outbox records for retries and delayed provider responses.
- Support runbook sections for adapter outage, duplicate provider response, rejection, amendment, and settlement mismatch.

Dependencies:

- Wave 4 manual evidence lifecycle.
- Official/expert-reviewed payload and response mappings.

Gate:

- No automated legal filing or payment automation claim before reviewed mappings and sandbox evidence exist.
- Adapters must never log raw salary/person/payment destination data.

Verification:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/assurance/__tests__/payroll-observability-runbook.test.ts --runInBand
npm run typecheck
```

### Wave 6: Operator And Employee Workflow Surfaces

Purpose: make the system usable day to day without fake routes or workflow gaps.

Build:

- `/dashboard/payroll/runs`: period selection, readiness blockers, input freeze, calculate, anomaly review, approve, post, release, declaration prep, correction, and proof drawer.
- `/dashboard/payroll/payments`: batch proof, destination evidence, release readiness, settlement evidence, reconciliation exceptions, suspense, retry/reversal status, and proof drawer.
- `/dashboard/payroll/declarations`: declaration prep, register proof, payload preview, manual/adapter evidence, authority status, rejection/amendment/settlement lifecycle, and close impact.
- Expand existing setup, employees, contracts, compensation, attendance, payslips, and register surfaces only where service-owned contracts already exist.
- Role modes for owner, HR manager, payroll officer, accountant, treasurer, auditor, and employee.
- Robust UI states: loading, empty, blocked, denied, stale, redacted, partial, mobile, dark/light, and export audit.

Dependencies:

- Waves 3, 4, and 5 for proof-backed workflow contracts.

Gate:

- Sidebar, smoke scripts, and route tests add new routes only after service/action/test coverage exists.
- UI surfaces must not compute payroll truth or expose raw salary/person data outside allowed roles.

Verification:

```powershell
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand
npm run ui:smoke:payroll
npm run typecheck
```

### Wave 7: Finance, BI, POS, Sales, And Cash Integration

Purpose: make payroll central to SMB operations without letting other modules own payroll truth.

Build:

- Replace estimated salary/payroll-tax analytics in finance services with payroll register, ledger, payment, declaration, and close facts.
- Cash forecast for upcoming net payroll, statutory liabilities, authority payment dates, provider settlement delays, and payroll payment exceptions.
- Branch/location/cost-center labor cost allocation from approved payroll facts.
- Profitability views that combine sales/POS revenue with payroll cost allocation through finance/BI, not POS mutation.
- Owner/manager action cards for payroll blockers: setup incomplete, payroll run awaiting approval, payment settlement exception, declaration rejection, stale close evidence, and upcoming cash shortfall.
- Drillthrough proof links from finance/BI to payroll register, ledger source links, payment evidence, declaration evidence, and close findings.

Dependencies:

- Wave 4 proof chain.
- Wave 6 operator routes for drillthrough destinations.

Gate:

- No finance, BI, POS, or sales surface may use estimated payroll values when payroll register facts exist.
- POS and sales can provide approved labor/commission inputs only through HR/payroll-governed workflows.

Verification:

```powershell
npm test -- --runTestsByPath services/analytics/__tests__/financial-reports.service.test.ts services/cash-command/__tests__/cash-command.service.test.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts services/signals/__tests__/business-signal-rules.service.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts --runInBand
npm run typecheck
```

### Wave 8: Production Migration, Backfill, And Tenant Onboarding

Purpose: move real tenants safely into the production HR/payroll model.

Build:

- Tenant-by-tenant migration planner for employees, contracts, compensation, periods, payslips, payments, declarations, and historical evidence.
- Redacted dry-run report with counts, blockers, unresolved mappings, and irreversible risks.
- Idempotent backfill jobs with correlation IDs, replay protection, and rollback/correction strategy.
- Approval workflow requiring product, accounting, security, and operations signoff before mutation.
- Post-migration reconciliation: employee counts, contract counts, payroll totals, ledger balances, payment allocations, declaration statuses, and close blockers.

Dependencies:

- Production-ready data contracts from Waves 1 to 7.

Gate:

- No production mutation without dry-run evidence and signoff.
- Backfill cannot fabricate contracts, salary, payment destinations, attendance, authority receipts, or settlement proof.

Verification:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts --runInBand
npm run prisma:validate
```

### Wave 9: Production Certification And Rollout

Purpose: prove unrestricted readiness with repeatable evidence.

Build:

- Authenticated Playwright payroll smoke with seeded payroll tenant users.
- Screenshot evidence for payroll overview, setup, employees, contracts, compensation, attendance, runs, payslips, register, payments, declarations, denied states, proof drawers, mobile, dark/light, and redacted states.
- Accessibility and keyboard checks for high-frequency workflows.
- Tenant isolation matrix for HR/payroll actions, exports, adapters, and routes.
- Concurrency, double-submit, closed-period, stale close, provider outage, duplicate provider response, declaration rejection, and correction-run tests.
- Final Prompt 19 and Prompt 21 rerun with evidence.

Dependencies:

- Waves 1 to 8.
- Seeded payroll tenant user and auth-state generation.

Gate:

- Full production readiness can be claimed only after all six blockers are closed with evidence, one controlled pilot payroll cycle reconciles cleanly, and accounting/security/operations sign off.

Verification:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx actions/payroll/__tests__/payroll-control.actions.test.ts actions/payroll/__tests__/payroll-register.actions.test.ts actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/accounting/__tests__/data-trust.service.test.ts services/assurance/__tests__/payroll-observability-runbook.test.ts --runInBand
npm run typecheck
npm run policy:gates
npm run workflow:assurance:runtime-check
npm run ui:smoke:payroll
```

## Execution Backlog

| Order | Work item | Owner lens | Depends on | Gate |
| --- | --- | --- | --- | --- |
| 1 | Statutory parameter matrix and fixture contract | Payroll/statutory/accounting | Legal review | Expert or regulator provenance exists. |
| 2 | Payroll calculation golden tests | Payroll engineering | Item 1 | No hardcoded rates or estimated taxes. |
| 3 | Retro/correction run design | Payroll/accounting/close | Item 2 | Finalized facts corrected by append-only records. |
| 4 | HR source-data completeness model | HR/product/security | Existing employee/contract services | Missing HR truth blocks payroll calculation. |
| 5 | Attendance/leave/overtime input freeze | HR/payroll | Item 4 | Input freeze hash and correction chain exist. |
| 6 | Register proof expansion | Payroll/accounting | Items 2-5 | Register ties all components to payslip, ledger, payment, declaration, and close. |
| 7 | Payroll posting rule expansion | Accounting | Item 6 | Balanced SYSCOHADA posting and source links. |
| 8 | Payment settlement lifecycle | Treasury/payroll | Item 6 | Provider/bank/mobile-money evidence required. |
| 9 | Declaration lifecycle and adapter contract | Compliance/payroll | Item 6 | Payload/response/rejection/amendment mappings reviewed. |
| 10 | `/dashboard/payroll/runs` | Payroll operator UX | Items 3 and 6 | Service/action/test coverage exists before route exposure. |
| 11 | `/dashboard/payroll/payments` | Treasurer/accountant UX | Item 8 | Proof drawer and exception states exist. |
| 12 | `/dashboard/payroll/declarations` | Compliance/accountant UX | Item 9 | Register proof and close impact visible. |
| 13 | Finance/cash/BI fact replacement | Finance/BI/product | Items 7-12 | No payroll estimates where payroll facts exist. |
| 14 | POS/sales approved input integration | POS/finance/payroll | Item 13 | POS never owns payroll truth. |
| 15 | Production backfill workflow | Ops/security/accounting | Items 1-14 | Dry run, signoff, idempotency, rollback/correction. |
| 16 | Final certification | Release/security/ops | Items 1-15 | Prompt 19 and 21 pass; pilot reconciles. |

## Product Principles For SMB Usefulness

- Make the default payroll workflow obvious: setup, source data, freeze inputs, calculate, review blockers, approve, post, pay, declare, reconcile, close.
- Show blockers before buttons. Operators should know why payroll cannot advance.
- Keep sensitive detail behind role, purpose, and fresh-auth gates.
- Prefer drillthrough proof over large dashboards.
- Put daily work in command centers and workbenches, not static reports.
- Let accounting and close explain trust, not just totals.
- Automate only the stable contract; keep legal/statutory uncertainty visible.
- Keep POS and sales focused on operations while finance/BI performs allocation and profitability analysis from approved payroll facts.

## Do Not Build Yet

- Placeholder `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, or `/dashboard/payroll/declarations` pages without service-backed proof.
- Client-computed payroll totals, statutory liabilities, register proof, settlement status, declaration truth, or close readiness.
- Automated legal filing without reviewed authority payload and response mappings.
- Production backfill mutation without dry-run evidence and signoff.
- Salary/person-data exports without fresh auth, audit, watermarking, redaction, and purpose.
- Generic HR features that do not feed payroll, compliance, accounting, or daily SMB operations.
- AI payroll suggestions that can alter payroll truth without human approval and proof.
- POS-owned payroll calculations, commissions, or attendance truth.
- Full multi-country statutory claims before the country-pack factory and fixtures are proven in Cameroon.

## Go/No-Go Checklist

Full production may be approved only when every item below is true:

- Full statutory country-pack scope for the launch jurisdiction is expert-reviewed or regulator-confirmed.
- Payroll calculation golden fixtures pass for ordinary, correction, retro, leave, overtime, allowance, benefit, deduction, YTD, and employer liability scenarios.
- Payroll register proof ties to payslips, ledger, payments, declarations, close evidence, and data-trust findings.
- Payroll payments have settlement evidence, provider/bank/mobile-money proof, suspense handling, and reconciliation.
- Declarations have authority evidence, rejection/amendment rules, source register hash, and close impact.
- Production backfill has dry-run evidence, approval workflow, idempotency, rollback/correction plan, and post-migration reconciliation.
- Runs, payments, and declarations operator routes are service-backed, proof-backed, tested, and browser-smoked.
- Finance/BI/cash surfaces consume payroll facts, not estimated payroll values.
- POS/sales integrations are approved input sources only and never payroll source of truth.
- Tenant isolation, RBAC, module entitlement, fresh auth, maker-checker, redaction, audit, and safe errors pass for every new route/action/export/adapter.
- Authenticated Playwright screenshots and accessibility checks pass for implemented payroll routes and role states.
- Prompt 19 and Prompt 21 reruns pass after blockers are closed.
- One controlled pilot payroll cycle reconciles cleanly with accounting, payment, declaration, close, and data-trust evidence.
- Product, accounting, security, and operations owners sign off.

## Verification Command Set

Use focused checks first during implementation:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-control.actions.test.ts actions/payroll/__tests__/payroll-register.actions.test.ts actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts services/accounting/__tests__/close-assurance.service.test.ts --runInBand
npm run typecheck
npm run policy:gates
npm run workflow:assurance:runtime-check
```

Use broader checks for release readiness:

```powershell
npm run ui:smoke:payroll
npm run build:app
```

Browser smoke still requires a seeded payroll-enabled tenant user and local Playwright storage state at `playwright/.auth/payroll.json`.

## Optional Next Prompts

### Prompt A: Statutory Country-Pack And Payroll Engine Hardening

Implement Wave 1 only. Inspect country-pack schemas, Cameroon payroll parameters, payroll-control calculation logic, register tie-out, regulatory hardcode gate, and relevant tests. Add reviewed statutory fixture infrastructure, broaden the payroll calculation contract, and save an execution report under `what-next/payroll/`. Do not add operator routes or BI until the calculation/register truth passes.

### Prompt B: Payroll Run And Correction Kernel

Implement Wave 3 only after Wave 1 is complete. Add idempotency, correction-run rules, double-submit protection, closed-period blockers, register proof expansion, and tests. Preserve immutable evidence and close invalidation.

### Prompt C: Payroll Payments And Declaration Operator Routes

Implement Waves 4 to 6 only after register proof is production-grade. Add service-backed `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, and `/dashboard/payroll/declarations` with proof drawers, denied states, redaction, tests, sidebar updates, and browser smoke coverage.

### Prompt D: Finance/BI/POS Payroll Fact Integration

Implement Wave 7 only after payment/declaration/register facts are stable. Replace estimated payroll analytics with payroll register, ledger, payment, declaration, and close facts. Add cash forecasts and branch/cost-center labor cost views without making POS or sales payroll authority.

### Prompt E: Production Backfill And Final Release Gate

Implement Waves 8 and 9 after all feature blockers close. Build tenant migration dry-run/signoff, idempotent backfill, rollback/correction plan, authenticated browser smoke, accessibility evidence, and Prompt 19/21 rerun package.

## Handoff

Recommended next executable step: Prompt A, statutory country-pack and payroll engine hardening.

Do not proceed to operator routes, finance/BI expansion, POS/sales integration, production backfill, or unrestricted release until the statutory calculation/register truth is production-grade and evidence-backed.

## 2026-06-28 Refresh Addendum

Refresh decision: the roadmap remains the governing full-production path, with one important update from the June 28 Phase 6 work. Production seed/backfill has advanced from dry-run planning into redacted execution/reconciliation certificate infrastructure and setup evidence visibility, but production mutation remains intentionally disabled. This strengthens the migration lane without changing the final decision: AqStoqFlow HR/payroll is still `CONTROLLED PILOT READY`, not unrestricted production-ready.

New evidence inspected for this refresh:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_6_PRODUCTION_BACKFILL_PROOF_DRY_RUN_REPORT_2026-06-28.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_6_PROOF_BACKFILL_EXECUTOR_CONTRACT_REPORT_2026-06-28.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_6_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_REPORT_2026-06-28.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_6_SETUP_EVIDENCE_CONTROL_PLANE_REPORT_2026-06-28.md`
- `graphify-out/GRAPH_REPORT.md`, `prisma/schema.prisma`, `services/payroll/`, `actions/payroll/`, `components/payroll/`, and `services/accounting/data-trust.service.ts`.

Current proof-backfill status:

- Historical declaration/payment proof-gap dry-run scanning exists and blocks production certification when proof contracts are missing.
- Disabled-by-default proof-backfill execution certificates exist with dry-run evidence hash validation, approval bundle hash, required payroll/accounting/security/operations signoffs, idempotency preview, correction-event intents, and redacted audit persistence.
- Post-backfill reconciliation certificates exist and map remaining proof gaps to accounting data-trust blocker ids.
- `/dashboard/payroll/setup` renders historical proof-backfill dry-run state and redacted certificate trail through a service-owned setup evidence read model.
- No production mutation was enabled, and no finalized payroll evidence is overwritten.

Adjusted execution priority:

| Priority | Workstream | Reason | Gate before proceeding |
| --- | --- | --- | --- |
| 1 | Statutory country-pack breadth and payroll engine hardening | Deepest product-claim blocker; all downstream workflows depend on calculation/register truth. | Expert-reviewed/regulator-confirmed formulas, golden fixtures, no hardcoded legal logic, register tie-out. |
| 2 | Payroll run/register/correction kernel | Prevents unsafe release, duplicate actions, and in-place mutation of finalized payroll evidence. | Idempotency, correction events, closed-period controls, double-submit tests, data-trust proof. |
| 3 | Accounting/payment/declaration proof backbone | Makes ledger, settlement, declaration, and close evidence financially reliable. | Balanced postings, source links, register proof on payment/declaration evidence, close blockers. |
| 4 | Proof-backfill execution gate | Moves migration readiness forward while keeping production mutation controlled. | Disabled-by-default flag, tenant signoff, audit certificate, idempotency ledger, reconciliation certificate. |
| 5 | Operator routes for runs/payments/declarations | Daily productivity improves only when service contracts are already true. | Service/action/test coverage, proof drawers, denied/redacted states, route smoke. |
| 6 | Finance/BI/POS integration | Replaces estimates with payroll facts without letting POS or sales own payroll truth. | Register/ledger/payment/declaration/close facts available and redacted drillthrough works. |
| 7 | Final browser/accessibility/pilot certification | Required for unrestricted release. | Authenticated Playwright smoke, accessibility, tenant isolation, chaos/provider-failure, Prompt 19/21 rerun, clean pilot cycle. |

Updated owner map:

| Area | Primary owner lens | Required signoff |
| --- | --- | --- |
| Statutory formulas and fixtures | Payroll statutory lead, OHADA/SYSCOHADA-aware accounting reviewer | Legal/statutory reviewer and accounting controller |
| Payroll engine and register | Backend payroll engineer, system architect | Payroll owner and accounting controller |
| HR source data | HR product owner, privacy/security reviewer | HR owner and security/privacy owner |
| Payments and declarations | Treasurer, compliance owner, integration engineer | Treasury, compliance, and accounting controller |
| Backfill/migration | Operations owner, security/privacy reviewer, backend engineer | Payroll admin, accounting controller, security/privacy, operations |
| Operator UX | Senior frontend engineer, UI/UX specialist, payroll operator | Product owner and security reviewer |
| Finance/BI/POS integration | Finance product owner, BI engineer, POS/sales owner | Finance owner and payroll/accounting owner |
| Release certification | QA/release manager, security architect, operations | Product, accounting, security, and operations |

Updated risk controls:

- No fake payroll routes: sidebar, route smoke, and browser smoke must expose only implemented service-backed routes.
- No client-computed payroll truth: React surfaces can render proof-backed read models and submit intent only.
- No unreviewed statutory formulas: country-pack data and fixture provenance control production capability.
- No unaudited exports: salary/person/payment/provider data requires permission, purpose, fresh auth where sensitive, audit, watermarking, and redaction.
- No blind migration: proof backfill requires dry-run, signoff, release flag, idempotency, append-only/correction output, and reconciliation.
- No POS payroll authority: POS/sales may feed approved labor/commission inputs, but HR/payroll owns calculation, register, statutory, and payment truth.

Updated production migration lane:

1. Keep proof-backfill execution disabled by default until a release flag, tenant signoff bundle, dry-run evidence hash, approval bundle hash, idempotency key, rollback/correction plan, and reconciliation certificate are all present.
2. Build the next safe migration slice as an approved append-only execution gate, not a blind mutation runner.
3. Consider a mutation runner only after the gate is tested, and only if it produces append-only/correction evidence rather than editing finalized declaration, payment, register, payslip, or close evidence in place.
4. Backfill must never fabricate employee contracts, salary history, attendance, payment destinations, authority receipts, provider settlement evidence, or statutory provenance.

Updated go/no-go rule:

Full production remains `NO-GO` until all six original blockers are closed with evidence, the newer proof-backfill execution lane has a tested append-only/correction-safe production path, one controlled pilot payroll cycle reconciles cleanly, and product/accounting/security/operations sign off.

Updated verification set for the next implementation wave:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-setup-evidence.service.test.ts actions/payroll/__tests__/payroll-setup.actions.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run typecheck
npm run service:boundary:fail
npm run regulatory:hardcode:fail
npm run policy:gates
```

Recommended next approved execution prompt:

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise HR/payroll architecture team. Implement only the next full-production Wave 1 slice: statutory country-pack breadth plus payroll engine hardening. Inspect country-pack schemas, payroll statutory parameter resolution, Cameroon CNPS/IRPP evidence, payroll tax/rubrique evaluator, payroll-control calculation logic, payroll-register tie-out, regulatory hardcode gate, and focused payroll tests. Add reviewed statutory fixture infrastructure, broaden the payroll calculation contract, pin golden outputs, preserve no-hardcoded-legal-logic, and save an execution report under `what-next/payroll/`.

Do not add `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, `/dashboard/payroll/declarations`, BI/POS payroll intelligence, production backfill mutation, or automated authority/payment adapters in this wave. Operator routes and BI must wait until calculation/register truth is production-grade and evidence-backed.
```

Parallel safe migration prompt, only if Phase 6 must continue first:

```md
Act as a multidisciplinary principal review team for AqStoqFlow HR/payroll. Implement only the approved append-only proof-backfill execution gate behind an explicit disabled-by-default release flag and tenant signoff bundle. Use the existing dry-run, execution certificate, reconciliation certificate, setup evidence read model, and AuditLog certificate trail. Produce redacted audit/job evidence and reconciliation expectations. Do not mutate immutable payroll evidence unless every release flag, signoff, idempotency, rollback/correction, and reconciliation precondition is satisfied and tested.
```

Blueprint ready.
