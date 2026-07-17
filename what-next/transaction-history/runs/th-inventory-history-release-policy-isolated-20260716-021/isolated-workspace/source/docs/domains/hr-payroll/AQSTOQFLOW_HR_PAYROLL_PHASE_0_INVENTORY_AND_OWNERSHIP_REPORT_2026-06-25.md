# AqStoqFlow HR/Payroll Phase 0 Inventory And Ownership Report

Date: 2026-06-25

Prompt name and phase: Prompt 01, Phase 0 Governance, Inventory, And Source-Of-Truth Map.

Expert lenses applied: enterprise architecture, domain modeling, cybersecurity/RBAC, finance controls, OHADA/SYSCOHADA business architecture, SaaS tenant isolation.

## Gate Result

Decision: passed.

The source roadmap, expert prompt suite, payroll schema, payroll service, payroll actions, payroll route, payroll UI, RBAC, module entitlement, redaction, accounting, regulatory, assurance, and tests are inspectable.

No production code, migrations, UI, calculations, or workflow behavior were changed.

## Files Inspected

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/__tests__/`
- `actions/payroll/payroll-control.actions.ts`
- `components/payroll/PayrollControlWorkbench.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `config/sidebar.ts`
- `lib/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/_shared/protect.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/security/redaction-policy.service.ts`
- `services/accounting/default-posting-rules.ts`
- `services/accounting/default-posting-rules.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/country-packs/`
- `services/assurance/`

## Current-State Inventory

| Area | Present | Missing or partial |
|---|---|---|
| Payroll schema | Payroll employees, contracts, periods, attendance snapshots, runs, run lines, payslips, payslip lines, declarations, payment batches, and allocations exist and are organization-scoped. | Compensation/rubrique catalog, salary-change workflow, HR document workflow, approval history, and full employee self-service profile workflow are not first-class surfaces yet. |
| Payroll service | `services/payroll/payroll-control.service.ts` owns period creation, attendance freeze, run calculation, approve/post, payment release, declaration preparation, workbench read model, salary redaction, audit, posting integration, and payment reconciliation queueing. | It is currently a broad control service, not yet split into narrower HR source-data, compensation, payslip archive/export, declaration lifecycle, and payment reconciliation services. |
| Server actions | `actions/payroll/payroll-control.actions.ts` protects workbench, calculate, approve/post, payment release, and declaration preparation. It derives organization and actor context server-side. | Dedicated protected actions for employee/contract/source-data management, payslip self-service, register export, declaration status lifecycle, and payment reconciliation operations are not present. |
| Navigation and route | Sidebar exposes `HR & Payroll` at `/dashboard/payroll`; route checks `payroll.read`; component renders service-owned workbench data. | No implemented payroll subroutes for employees, contracts, payslips, register, declarations, payment reconciliation, or self-service. Do not add speculative links before services exist. |
| RBAC and entitlement | Payroll permissions exist in `lib/security/rbac-permissions.ts` and legacy permission constants; module catalog has `payroll`; route and actions enforce permission checks. | Persona matrix, maker-checker inventory, own-data employee permissions, and negative coverage for every future route/action still need phase-specific proof. |
| Redaction and privacy | `payroll_person_amount` policy exists; workbench service redacts amount fields and writes payroll salary-read audit. | Export, incident, payslip/self-service, register, declaration, and payment surfaces must prove redaction before implementation. |
| Country-pack/statutory | Regulatory country-pack resolver and hardcode detector exist; Cameroon pack includes payroll-related parameters and expert-review warnings. | Full statutory payroll breadth and expert-reviewed production provenance are not complete; unsupported states must remain explicit. |
| Accounting and SYSCOHADA | Payroll run and payment posting purposes/rules exist; service checks balanced postings, source links, default journals, business events, and blockers. | Declaration posting/payment lifecycle, payroll register tie-out, and broader close-impact classification need later gates. |
| Close/data trust/assurance | Close assurance knows `PAYROLL_RUN_POSTED`; data trust consumes payroll declaration/payment blockers; assurance registry recognizes payroll. | Payroll payment, declaration, correction, register, and close evidence stale semantics need later approved expansion. |
| UI/UX | Payroll workbench renders counts, recent runs, ledger blockers, payment batches, declarations, and reconciliation link. | Current UI is a control workbench, not a full command center. It must not be treated as a truth owner or as proof that downstream workflows exist. |

## Source-Of-Truth Ownership Map

| Truth source | Owner | Current status | Validation before dependent work |
|---|---|---|---|
| Employee identity and tenant scope | `PayrollEmployee` model, future HR source-data service | Partially present | Prove employee-user mapping, duplicate detection, tenant scope, and own-data access before self-service. |
| Contract and employment terms | `PayrollContract` model, future contract workflow service | Partially present | Prove active contract selection, salary privacy, approval evidence, and correction semantics before payroll calculation expansion. |
| Compensation, rubriques, salary changes | Future compensation/rubrique service | Missing as first-class workflow | Do not build advanced statutory/payroll UI until compensation catalog and salary-change approval exist. |
| Payment destination | `PayrollEmployee` payment destination hash fields, future payment-destination workflow | Partially present | Prove approved destination evidence, fresh auth, maker-checker, redaction, and audit before payment release expansion. |
| Attendance | `PayrollAttendanceSnapshot` and `freezeAttendanceSnapshot` | Present at snapshot level | Prove source attendance ownership and correction rules before broader attendance workflows. |
| Payroll calculation | `calculatePayrollRun` in payroll control service | Present and service-owned | Validate country-pack provenance, no hardcoded production values, fixtures, and calculation trace before statutory expansion. |
| Payroll approval/posting | `approveAndPostPayrollRun` plus accounting services | Present | Prove immutability, balanced SYSCOHADA posting, source links, close invalidation, and maker-checker/fresh-auth gates. |
| Payslips | `PayrollPayslip` and `PayrollPayslipLine`, emitted during approval/post | Partially present | Prove immutability, archive/export hash, redaction, own-data access, and route smoke before payslip UI/self-service. |
| Payment batches | `PayrollPaymentBatch`, `PayrollPaymentAllocation`, `releasePayrollPaymentBatch` | Present as service workflow | Prove destination evidence, settlement model, provider evidence, exception workflow, and close/data-trust impact before reconciliation UI. |
| Declarations | `PayrollDeclaration`, `preparePayrollDeclarations` | Prepared-state foundation present | Build lifecycle and adapter contracts only after expert-reviewed statutory provenance and immutable authority evidence are ready. |
| Ledger and source links | Accounting posting services and source-link records | Present for payroll run/payment foundations | Validate balanced posting, default rules, source-link drillthrough, and close-impact decisions per phase. |
| Close evidence | Close assurance pack and data-trust services | Present but partial for payroll | Extend only with justified payment, declaration, correction, register, and certified-close sources. |
| Redaction/audit | `services/security/redaction-policy.service.ts`, payroll workbench audit | Present for workbench amounts | Extend and test every export, incident, proof drawer, self-service, register, and declaration payload. |
| Command read models | `getPayrollWorkbenchData` | Present for current workbench | Later command-center read models must remain service-owned and cannot compute business truth in UI. |

## Blocker Report Template

Each blocked skill must save a report under `what-next/payroll/` with: failed prerequisite, evidence inspected, reason implementation stopped, risk if forced, exact next safe action, and decision `blocked`.

## Release Gate Template

Each implementation skill must state the smallest relevant validation subset. Typical gates include `npm run prisma:validate`, focused payroll/accounting/security tests, `npm run service:boundary:fail`, `npm run policy:gates`, `npm run typecheck`, and route smoke checks when routes change.

## Security And Privacy Decisions

- Sensitive salary/person data is controlled by payroll permissions, module entitlement, redaction policy, and read audit.
- Future routes/actions must derive tenant and actor context server-side.
- Payment destination and export workflows require fresh auth, maker-checker where appropriate, audit, and redaction.

## Accounting And Finance Decisions

- Payroll run and payment posting are service-owned and must remain source-linked and balanced.
- Declarations, payment settlement, register tie-out, and close assurance are not yet complete enough for production-grade payroll close certification.
- SYSCOHADA posting and close-impact gates must precede UI expansion.

## UI/UX Decisions

- Existing payroll route is a workbench and dashboard shell, not a payroll truth owner.
- Do not add payroll subroutes or sidebar links before matching service/action/read-model ownership exists.
- Later UX must be role-aware, evidence-linked, redacted, and based on server-provided command data.

## Tests And Validation

Documentation validation only; no production code touched.

Validation performed by focused file scans and direct inspection of payroll schema, service, actions, route, UI, security, module, accounting, regulatory, and assurance surfaces.

## Handoff Decision

Decision: passed to Prompt 02.

Prompt 02 may run next because the current inventory and ownership map are complete enough to evaluate runtime DB immutability and correction boundaries.
