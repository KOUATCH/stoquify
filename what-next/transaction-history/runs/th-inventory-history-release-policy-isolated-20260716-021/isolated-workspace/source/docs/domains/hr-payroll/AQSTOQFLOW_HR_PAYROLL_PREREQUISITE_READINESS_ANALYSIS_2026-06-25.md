# AqStoqFlow HR/Payroll Prerequisite Readiness Analysis

Date: 2026-06-25

Source of truth:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md`

Mode: report-only prerequisite analysis. No production code was implemented.

## Executive Verdict

The HR/Payroll skill suite should not be run as a broad implementation program yet. The current system has a serious payroll kernel foundation, but the blueprint describes a much larger enterprise HR/payroll platform. Meaningful implementation is safe only after Phase 0 gates are proven current and after HR source-data foundations are built in the right order.

Current readiness:

- Payroll kernel: strong partial foundation.
- HR source-data product: missing or shallow.
- Payroll command center: partial workbench, not full workflow center.
- Statutory payroll: partial country-pack foundation, not production-grade legal breadth.
- Payslip/self-service: generated records exist, product surface missing.
- Payments/accounting/close: good foundation, but payment/declaration/correction close impact still needs gate evaluation.
- Security/privacy: RBAC, fresh auth, salary-read audit, and redaction foundations exist, but full self-service and export privacy are not ready.
- Release posture: focused tests exist; full tenant, chaos, browser, export, and live DB trigger verification remain incomplete.

Safest immediate decision: continue only the Phase 0 readiness and kernel-hardening path before implementing Phase 1 to Phase 9 skills.

## Evidence Inspected

- Blueprint: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md`
- Readiness reports under `what-next/payroll/`, especially:
  - `AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_READINESS_ASSESSMENT_2026-06-24.md`
  - `AQSTOQFLOW_PAYROLL_CLOSE_INVALIDATION_RUN_REPORT_2026-06-25.md`
  - `AQSTOQFLOW_HR_PAYROLL_PHASE_0_KERNEL_IMMUTABILITY_RUN_REPORT_2026-06-25.md`
  - `AQSTOQFLOW_HR_PAYROLL_PHASE_0_TENANT_BOUNDARY_RUN_REPORT_2026-06-25.md`
- Payroll schema and migration surfaces:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- Payroll service/action/UI surfaces:
  - `services/payroll/payroll-control.service.ts`
  - `services/payroll/payroll-control.schemas.ts`
  - `actions/payroll/payroll-control.actions.ts`
  - `hooks/payroll/usePayrollWorkbench.ts`
  - `components/payroll/PayrollControlWorkbench.tsx`
  - `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- Control and platform surfaces:
  - `lib/security/rbac-permissions.ts`
  - `lib/permissions.ts`
  - `services/_shared/protect.ts`
  - `config/sidebar.ts`
  - `services/modules/module-catalog.service.ts`
  - `services/modules/module-control-contracts.ts`
  - `services/security/redaction-policy.service.ts`
  - `services/accounting/close-assurance-pack.service.ts`
  - `services/accounting/data-trust.service.ts`
  - `services/accounting/default-posting-rules.ts`
  - `services/regulatory/country-packs/*`
  - `services/regulatory/hardcode-detector.ts`
  - `services/assurance/assurance-registry-contracts.ts`
- Focused tests under `services/payroll/__tests__`, `actions/payroll/__tests__`, `services/security/__tests__`, `services/accounting/__tests__`, and `config/__tests__`.
- Existing graph context: `graphify-out/GRAPH_REPORT.md`.

Note: The 2026-06-24 readiness assessment said payroll immutability triggers were absent. A later 2026-06-25 Phase 0 run added `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`, so the current status is no longer "absent"; it is "migration present, live DB application and runtime trigger tests still not proven in this analysis."

## Architecture Principles To Preserve

- Services own payroll and HR business truth.
- Server actions expose protected workflows and derive tenant/actor context from auth.
- Dashboards render trusted service/server-action data.
- RBAC governs capability.
- Module entitlement governs tenant/module access.
- Payroll amounts, eligibility, calculations, declarations, and payment truth must not be computed in client components.
- No duplicated payroll metrics.
- No dashboard-specific shadow services.
- No speculative HR/payroll routes until backing services, permissions, tests, and evidence rules exist.

## Prerequisite Matrix

### 1. Source-Of-Truth And Inventory Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Blueprint-first execution | Treat the 2026-06-25 skill-suite blueprint as the governing roadmap and stop each phase when its prerequisite gate fails. | The suite is intentionally ordered; later skills depend on earlier control evidence. | Exists as document; execution discipline must be enforced. | Blind implementation can create UI, workflows, or metrics that bypass service truth. | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md` | Confirm every phase references its prerequisites before code work starts. | Hard blocker |
| Current-state inventory | Before each implementation skill, inspect schema, services, actions, routes, tests, reports, module controls, RBAC, audit, country-pack, and close surfaces. | The repo is changing quickly, and older reports may be stale. | Partial. Recent reports exist, but each skill still needs live inspection. | Implementing against stale assumptions can duplicate existing controls or miss newer blockers. | `what-next/payroll/`, `prisma/`, `services/payroll/`, `actions/payroll/`, `app/[locale]/(dashboard)/dashboard/payroll/` | A phase-start inventory note that lists current files and pass/fail gates. | Hard blocker |
| Single source of truth map | Identify which service owns each truth: employee source data, contracts, calculations, payslips, payments, declarations, ledger postings, close evidence. | Prevents client-computed payroll truth and dashboard-specific shadow services. | Partial. Payroll kernel truth lives in `services/payroll`, but HR source-data services are not complete. | Bloat, duplicate metrics, inconsistent payroll totals, untraceable compliance claims. | `services/payroll/*`, future employee/contract/rubrique services, accounting services | Source ownership table before Phase 1 and Phase 2. | Hard blocker |

### 2. Domain Model And Database Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Tenant-scoped payroll core models | Dedicated models for payroll employees, contracts, periods, attendance snapshots, runs, run lines, payslips, declarations, payment batches, and allocations. | The suite needs durable payroll evidence, not ad hoc salary fields. | Exists in `prisma/schema.prisma`. | Payroll cannot be posted, audited, reconciled, or certified with source links. | `prisma/schema.prisma` | `npm run prisma:validate`, model relation review, migration status review. | Hard blocker, currently satisfied structurally |
| DB-level immutability for finalized payroll evidence | Posted/archived runs, run lines, emitted/corrected/voided payslips, payslip lines, released/settled payment batches, allocations, and declaration payload content must be protected. | The blueprint forbids mutating finalized payroll evidence in place. | Partial. Migration exists, but live DB application and runtime trigger tests are not proven here. | Bypassing services could silently alter payslips, payment batches, declarations, or posted payroll evidence. | `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`, `services/payroll/__tests__/payroll-immutability-migration.test.ts` | Apply migration in target DB, verify triggers exist, add runtime mutation tests against a real test database. | Hard blocker |
| Correction workflow data model | Correction runs, void/correct payslip semantics, declaration amendments, and payment correction links must be explicit. | Immutable evidence requires correction, reversal, or amendment workflows instead of in-place edits. | Partial. Statuses and immutability exist, but full correction workflow depth is not evident. | Operators may overwrite historical payroll evidence or lack a lawful correction path. | `PayrollRun`, `PayrollPayslip`, `PayrollDeclaration`, service correction paths to be added | Tests for correction-only mutation, closed period behavior, event/audit chain. | Hard blocker before correction features |
| HR source-data model completeness | Employee profile, contract lifecycle, compensation/rubrique assignments, salary changes, payment destination approvals, HR documents, leave/attendance inputs, employee-user mapping. | Payroll computation must originate from controlled HR source data. | Partial/missing. Employee, contract, and attendance snapshot models exist; product-complete compensation/rubrique/payment-approval/self-service models are incomplete or not evident. | Payroll will rely on manual/spreadsheet inputs or shallow fields, weakening auditability. | `prisma/schema.prisma`, future HR/payroll migrations | Schema review, migration tests, seed/backfill plan, tenant and uniqueness constraints. | Hard blocker before Phase 1 |
| Row version/concurrency controls | Mutation paths for employee, contract, payroll run, payment release, declaration, and correction flows need idempotency and/or optimistic concurrency. | Payroll is high-risk under double-submit and stale review screens. | Partial. Idempotency exists in kernel flows; broad row-versioning is not evident. | Duplicate runs, duplicate payments, stale approvals, inconsistent evidence. | Payroll models and service mutation paths | Concurrent mutation tests and idempotency replay mismatch tests. | Hard blocker for high-risk writes |

### 3. Existing Payroll/HR Routes And UI Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Payroll route visibility | A visible HR/Payroll sidebar entry routed to the current payroll workbench, gated by permission and module slug. | Users need discoverability without exposing nonexistent subroutes. | Exists. Sidebar exposes `/dashboard/payroll` with `payroll.read` and `moduleSlug: "payroll"`; tests assert missing subroutes are not exposed. | Hidden module or broken links in navigation. | `config/sidebar.ts`, `config/__tests__/sidebar.test.ts` | Sidebar tests, route smoke check, module entitlement check. | Hard blocker, currently satisfied for the single workbench route |
| Payroll workbench route | Server-rendered route that fetches trusted payroll workbench data through protected server action/service. | The first UI surface must not compute payroll truth in the browser. | Exists as a partial workbench. | UI may show fake or client-derived payroll metrics. | `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`, `components/payroll/PayrollControlWorkbench.tsx`, `actions/payroll/payroll-control.actions.ts` | Route smoke, RBAC denial test, redacted read model test. | Hard blocker, partially satisfied |
| HR source-data routes | Employee, contract, compensation/rubrique, salary-change, payment profile, leave/attendance, and document routes. | Payroll inputs need professional operating surfaces before the command center can be meaningful. | Missing/not evident. Current route is only the payroll workbench. | Payroll team cannot maintain source truth inside the system. | Future `app/[locale]/(dashboard)/dashboard/payroll/*`, components, services | Route inventory, permission matrix, service-backed CRUD tests. | Hard blocker before Phase 1 |
| Command center UX prerequisites | First viewport command brief, action board, run wizard, blocker-first flow, line-level review, drillthrough, proof drawer. | The blueprint aims for a daily go-to operating place, not a read-only queue. | Partial. Workbench shows counts and queues but not the full workflow center. | User experience stays thin and operators may bypass proper sequence. | `components/payroll/PayrollControlWorkbench.tsx`, future command components | Browser smoke, no-client-truth review, action gating tests. | Hard blocker before Phase 2 |
| Payslip and self-service UI | Immutable payslip viewer, PDF/archive, employee self-service restricted to own data, payroll register/export surfaces. | Employee and audit-facing payroll product needs controlled access to immutable outputs. | Missing/not evident. Payslip rows exist but no full product route found. | Salary leakage, weak employee experience, no certified payroll register. | Future payslip/self-service routes/components/services | Own-data access tests, redaction tests, export audit tests, browser smoke. | Hard blocker before Phase 4 |

### 4. Service-Layer Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Payroll kernel service ownership | Calculation, attendance freeze, approval/posting, payslip emission, payment release, declarations, and workbench read model must live in services. | Services own business truth. | Exists for the current kernel in `services/payroll/payroll-control.service.ts`. | Dashboard or action code may become a shadow payroll engine. | `services/payroll/payroll-control.service.ts` | Service tests for each workflow and no client-calculated totals review. | Hard blocker, currently partially satisfied |
| HR source-data services | Dedicated services for employee, contract, compensation/rubrique, payment destination, salary change, documents, leave/attendance. | Payroll inputs need auditable service boundaries. | Missing/partial. Current service focuses payroll control, not full HR operations. | Direct UI writes, weak validation, duplicate HR truth. | Future `services/payroll/employee.service.ts`, `contract.service.ts`, etc. | Service tests, tenant-boundary tests, audit tests, schema validation. | Hard blocker before Phase 1 |
| Country-pack-driven calculation service | No hardcoded statutory values; calculations must resolve statutory parameters with provenance. | Professional payroll cannot claim legal truth from code constants. | Partial. CNPS pension/employer rules resolve through country pack; full tax/rubrique breadth incomplete. | Incorrect payslips and declarations, legal/compliance exposure. | `services/payroll/payroll-control.service.ts`, `services/regulatory/country-packs/*`, `services/regulatory/hardcode-detector.ts` | Hardcode scan, country-pack fixture tests, expert-review provenance tests. | Hard blocker before production statutory payroll |
| Payment release service controls | Posted run evidence, emitted payslips, approved destination evidence, SoD, idempotency, ledger posting, reconciliation queue. | Payroll payments are financial controls, not UI actions. | Partial/strong. Current service has many controls, but payment destination approval workflow and provider settlement product are incomplete. | Unauthorized or unprovable payroll payments. | `releasePayrollPaymentBatch`, payment/reconciliation services | Payment service tests, destination-approval tests, settlement/retry tests. | Hard blocker before Phase 6 expansion |
| Declaration lifecycle service | Prepare, submit, accept, reject, pay, reconcile, archive, and amend declarations with authority evidence. | Statutory filings must be traceable and correction-safe. | Partial. Preparation and expert-review fallback exist; adapters/lifecycle are incomplete. | Manual/unproven compliance and false statutory claims. | `preparePayrollDeclarations`, regulatory country packs, compliance services | Adapter tests, authority evidence tests, status transition tests. | Hard blocker before Phase 5 |
| Close-impact service evaluation | Payroll payment release, declaration lifecycle, and correction paths must be evaluated for close invalidation. | Certified close packs must become stale when close-impacting payroll facts change. | Partial. Payroll run posting close invalidation exists; payment/declaration/correction evaluation remains required. | Certified close evidence may stay falsely fresh. | `services/accounting/close-assurance-pack.service.ts`, payroll service writes | Close invalidation tests for each new source before release. | Hard blocker before accounting/close expansion |

### 5. Server Action Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Protected action wrapper | Payroll actions must use the shared protect/permission wrapper and derive tenant/actor context server-side. | Prevents client-supplied organization, actor, or permission spoofing. | Exists for current actions. | Cross-tenant writes and forged approvals. | `actions/payroll/payroll-control.actions.ts`, `services/_shared/protect.ts` | Action tests proving client input is overwritten and RBAC denials are safe. | Hard blocker, currently satisfied for current actions |
| Fresh auth on critical actions | Approve/post and payment release require fresh auth; future salary, export, declaration submission, and statutory payment actions need the same decision. | Payroll actions are sensitive financial/person-data operations. | Partial. Approve and payment release use `freshAuth: true`; future actions not built yet. | Stale sessions can approve payroll or expose sensitive data. | `actions/payroll/*`, `services/_shared/protect.ts` | Fresh-auth action tests for each critical action. | Hard blocker for sensitive writes |
| Maker-checker action semantics | Approver/releaser separation, salary-change approval, payment destination change approval, declaration submission approval. | Four-eyes controls are required by the blueprint. | Partial. Payment release enforces separate approver/releaser; broader maker-checker not complete. | Insider error/fraud, weak audit posture. | Payroll services/actions, future HR source services | SoD tests and audit event tests. | Hard blocker for financial/person-data mutations |
| Server action read-model discipline | Actions expose trusted read models rather than raw models or client-calculated totals. | Keeps dashboards render-only. | Partial. Workbench read model exists; future command/read models not built. | Duplicated metrics and inconsistent UI truth. | `actions/payroll`, `services/payroll` | Read-model contract tests and UI code review. | Hard blocker before Phase 2 |

### 6. RBAC And Permission Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Payroll permission taxonomy | Permissions for read, employee/contract management, attendance freeze, run calculate/review/approve/post, payslip read/emit, payment release, declaration prepare, reports, exports. | Payroll has different user personas and sensitive capabilities. | Exists/partial. Permission aliases and risks are present. | Overbroad access or blocked legitimate workflows. | `lib/security/rbac-permissions.ts`, `lib/permissions.ts` | Permission tests, persona matrix review. | Hard blocker |
| Salary/person-data permission separation | Person-level payroll amounts require salary-specific permission and redaction when absent. | Salary data is sensitive and should not leak through analytics or workbench. | Exists for workbench/redaction foundation. | Unauthorized salary exposure. | `services/security/redaction-policy.service.ts`, `services/payroll/__tests__/payroll-privacy.service.test.ts` | Redaction tests, salary-read audit tests, self-service access tests. | Hard blocker, partially satisfied |
| Persona-specific scopes | HR manager, payroll officer, accountant, treasurer, auditor, manager, employee self-service, and owner roles need distinct read/write scopes. | The blueprint is role-aware. | Partial/missing. Current workbench is not a full persona cockpit. | Role confusion, overexposure, unusable workflows. | RBAC config, module catalog, future UI/routes | Persona permission matrix and route/action tests. | Hard blocker before broad UI |
| Employee self-service own-data restriction | Employee self-service must only access the logged-in employee's own profile/payslips. | The blueprint explicitly forbids cross-employee access. | Missing/not evident. Employee-user mapping must be proven first. | Serious privacy breach. | Future self-service actions/routes, employee-user mapping | Cross-employee negative tests. | Hard blocker before self-service |

### 7. Module Entitlement And Navigation Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Payroll module catalog entry | Payroll must exist as a commercial module with route prefixes, dependencies, and permissions. | Module entitlement must govern tenant/module access. | Exists. `payroll` is in module control contracts and catalog. | Tenants can access unpaid/disabled modules or miss dependencies. | `services/modules/module-control-contracts.ts`, `services/modules/module-catalog.service.ts` | Module catalog tests and entitlement simulation. | Hard blocker, structurally satisfied |
| Sidebar module gating | Navigation should show only available routes and avoid missing subroute bloat. | Keeps UI honest and prevents broken HR/payroll expansion. | Exists for current route; tests explicitly avoid missing subroutes. | Broken links and speculative UI. | `config/sidebar.ts`, `config/__tests__/sidebar.test.ts` | Sidebar tests, entitlement tests. | Hard blocker |
| Payroll module disablement behavior | Reads/writes/redaction should respect disabled payroll module state. | Module entitlement is a governing principle. | Partial. Redaction policy tests module entitlement for payroll amounts; broader route/action disablement must be proven. | Disabled tenants may still access payroll workflows. | Module guard services, payroll actions/routes, redaction policy | Route/action/module-denial tests. | Hard blocker before tenant release |
| Dependency readiness | Payroll depends on accounting and likely presence/finance/payment reconciliation/close-assurance flows. | Later skills require upstream modules. | Partial. Catalog dependencies exist; operational readiness per dependency needs verification. | Payroll workflows start with missing ledger/payment/close foundations. | Module catalog, accounting setup, payment reconciliation, close assurance | Dependency readiness report before Phase 2 and Phase 6. | Hard blocker |

### 8. Accounting, Finance, And Posting Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| SYSCOHADA payroll posting rules | Balanced payroll run and payroll payment posting rules with active accounts, source links, journals, and blockers. | No payroll posting without balanced source-linked SYSCOHADA entries. | Exists/partial. Default payroll run/payment posting rules are present and tested; tenant account setup still must be ready. | Unbalanced or unpostable payroll accounting. | `services/accounting/default-posting-rules.ts`, payroll posting functions | Posting rule tests, accounting setup check, ledger integration tests. | Hard blocker |
| Payroll run close invalidation | Posted payroll runs must stale certified close evidence for the affected period. | Close packs must remain truthful after payroll postings. | Exists for `PAYROLL_RUN_POSTED`. | Certified close packs may ignore payroll changes. | `services/accounting/close-assurance-pack.service.ts`, `approveAndPostPayrollRun` | Close invalidation test for payroll run posting. | Hard blocker, currently satisfied for run posting |
| Payment/declaration/correction close impact | Payroll payment release, declaration transitions, and correction workflows must be classified as close-impacting or non-impacting, then wired if needed. | Blueprint requires preserving close invalidation semantics beyond run posting. | Missing/partial. Explicitly listed as remaining Phase 0 work. | False-fresh close evidence after payroll payment/declaration/correction changes. | Payroll service, close-assurance pack, data-trust service | Source-impact decision table and focused tests per source. | Hard blocker before Phase 7 |
| Payroll payment reconciliation | Released payroll payments need evidence, provider/file references, matching, exceptions, and settlement state. | Payments must be evidence-backed and reconcilable. | Partial. Release queues outbound reconciliation and data-trust blockers exist; full provider settlement workbench is incomplete. | Paid payroll cannot be certified or traced to cash movement. | Payroll service, payment/reconciliation services, data-trust service | Reconciliation service tests, exception tests, payment batch drillthrough smoke. | Hard blocker before Phase 6 |
| Payroll register and tie-out | Payroll register/livre de paie tying payslips, run totals, ledger, payments, declarations, and close evidence. | Accountants/auditors need a certifiable payroll truth pack. | Missing/not evident. | Payroll cannot be certified end to end. | Future reporting service, payroll/accounting services | Tie-out tests and export audit tests. | Hard blocker before Phase 4/7 certification |

### 9. Compliance And Statutory Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| No statutory hardcodes | Payroll rates, caps, legal values, deadlines, and formulas must come from country packs or reviewed config. | The blueprint forbids hardcoded statutory payroll values. | Partial. Regulatory hardcode detector exists; payroll-specific Phase 0 gate should be formalized and run. | Wrong legal values and unreviewable payroll engine. | `services/regulatory/hardcode-detector.ts`, payroll services, country packs | Hardcode gate over payroll files, fixture whitelist for test data. | Hard blocker |
| Expert-reviewed country-pack inputs | Production formulas and declarations require reviewed country-pack values, versions, schema versions, hashes, and legal provenance. | Unsupported/expert-review outputs must not be presented as legal truth. | Partial. Cameroon CNPS metadata/provenance exists; full legal breadth incomplete. | False statutory certainty and compliance exposure. | `services/regulatory/country-packs/cameroon.ts`, validation/resolver | Country-pack validation, legal review record, provenance tests. | Hard blocker before production statutory claims |
| Payroll calculation breadth | IRPP/income tax, CNPS family allowance, occupational risk, taxable/social bases, rubriques, YTD, corrections, caps, benefits, allowances, deductions. | A professional payroll suite cannot rely on narrow gross/CNPS/net logic. | Missing/partial. Current engine is narrow. | Incorrect payslips and filings. | Payroll calculation service, country packs, schema extensions | Golden fixtures, multi-period/YTD tests, country-pack tests. | Hard blocker before statutory production |
| Declaration adapters | Authority-specific declaration payloads, submission evidence, acceptance/rejection, amendment, payment and reconciliation lifecycle. | Prepared declarations are not enough for compliance operations. | Missing/partial. Preparation fallback exists; adapters are not complete. | Manual filings remain unproven; system may overstate compliance. | Payroll declaration service, compliance services, country packs | Adapter contract tests, status transition tests, evidence tests. | Hard blocker before Phase 5 |
| Legal boundary labels | Expert-review and unsupported outputs must be visibly blocked or labeled and never shown as legal truth. | Honest product behavior reduces compliance risk. | Partial. Fallback metadata exists; UX and release gates must enforce it. | Users may file or rely on unverified values. | Payroll workbench, declaration UI, country-pack metadata | UI tests and release gate checks for expert-review states. | Hard blocker |

### 10. Evidence, Audit, Redaction, And Privacy Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Business events and audit chain | Payroll changes must emit business events, audit entries, and evidence links. | Enterprise payroll requires actor and source traceability. | Exists/partial for current kernel. | Untraceable payroll changes. | Payroll service, audit/business-event/outbox services | Event/audit tests per workflow. | Hard blocker |
| Salary-read audit | Salary-bearing reads must audit actor, policy, redaction, and purpose. | Payroll amounts are sensitive. | Exists for current workbench read model. | Silent salary browsing and privacy incidents. | `getPayrollWorkbenchData`, privacy tests | Extend tests to all future salary surfaces. | Hard blocker |
| Redaction policy | Payroll person-level amounts must redact when permissions or module entitlement are missing. | Prevents data leakage in dashboards, assurance, incidents, and exports. | Exists/partial. Core policy exists; every new surface must use it. | Salary leakage. | `services/security/redaction-policy.service.ts`, payroll read models | Redaction tests per route/read model/export. | Hard blocker |
| Evidence/proof drawer contract | Run, payslip, payment, declaration, and blocker rows should link to trusted proof subjects without recomputing truth in UI. | Makes the module auditable and usable. | Partial/missing for payroll UI. | Operators cannot verify blockers or evidence. | Payroll read models, BI/evidence adapters, components | Proof-link contract tests and browser smoke. | Hard blocker before Phase 2 |
| Immutable archive/export evidence | Payslip PDFs, exports, declarations, payment files, and close packs need immutable archive references and redacted export audit. | Released artifacts must be durable and reviewable. | Missing/partial. Payslip records exist; full archive/export product missing. | Legal/audit artifacts may be mutable or untraceable. | Future export/archive services, upload/document systems | Export permission/fresh-auth/audit tests, archive hash tests. | Hard blocker before Phase 4 |

### 11. Testing And Validation Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Focused payroll service tests | Tests for calculation, posting, payment release, declaration preparation, rollback, idempotency, close invalidation. | Payroll is high-risk and service-owned. | Exists for current kernel. | Regressions in financial/person-data workflows. | `services/payroll/__tests__/*` | Keep running focused test suite after each payroll change. | Hard blocker |
| Action/RBAC tests | Tests for RBAC denial, fresh auth, actor/tenant derivation, client input overwrite. | Server actions are the workflow boundary. | Exists/partial for current actions. | Client can spoof org or bypass permissions. | `actions/payroll/__tests__/*`, `services/_shared/__tests__/*` | Extend to all new actions. | Hard blocker |
| Tenant escape matrix | Every list/read/write/export/self-service path must prove tenant isolation. | Payroll and HR data are highly sensitive. | Partial. Current write-path tests exist; broad list/export/self-service matrix incomplete. | Cross-tenant data exposure or mutation. | Payroll service/action tests | Matrix for every model and route. | Hard blocker before release |
| Runtime DB trigger tests | Immutability triggers must be tested against a real DB, not only migration text. | SQL text tests do not prove runtime protection. | Missing. | DB-level immutability may not work in deployment. | Prisma migrations, integration test setup | Apply migration and attempt blocked updates/deletes. | Hard blocker |
| UI/browser smoke tests | Payroll route, command center, run detail, approval, payment, declaration, payslip, self-service. | Enterprise workflows need real route verification. | Missing/partial. Current route can be smoke-tested; future routes absent. | Broken UI flows despite service tests. | App routes/components | Playwright or route smoke tests. | Soft now, hard before UI release |
| Release gates | `prisma:validate`, `prisma:generate`, payroll tests, close-assurance tests, `service:boundary:fail`, `policy:gates`, typecheck, lint/route checks as applicable. | Each phase should stop on failed gates. | Partial. Reports show many passed; current full run not executed in this analysis. | Releasing unverified payroll changes. | Package scripts and test suites | Run gates before moving phases. | Hard blocker |

### 12. Migration And Seed/Backfill Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Migration ordering and application | Payroll migrations must be present, idempotent where needed, applied to target DB, and compatible with current Prisma schema. | Schema-only readiness is not enough. | Partial. Immutability migration exists; application not proven here. | Runtime DB does not match app assumptions. | `prisma/migrations`, Prisma migration status | Migration status, apply in test DB, runtime trigger checks. | Hard blocker |
| Seed/backfill strategy | Existing tenants need payroll periods, posting rules, employees, contracts, salary/privacy defaults, module entitlements, and possibly payment destination placeholders. | HR/payroll cannot operate with empty or inconsistent source data. | Partial/missing. Default posting rules exist; broader HR/payroll seed/backfill not evident. | Workflows fail or require manual DB edits. | Seed scripts, services, module catalog, posting setup | Dry-run seed/backfill report and idempotency tests. | Hard blocker before operational rollout |
| Data migration for HR source data | If employee data exists in legacy tables or users, map it safely into payroll employee/contract/user linkage. | Employee self-service and payroll inputs need authoritative mapping. | Missing/not evident. | Duplicate employees, broken self-service, privacy leaks. | User/employee/payroll models, future migration scripts | Mapping reconciliation report and duplicate-risk tests. | Hard blocker before Phase 1/self-service |
| Backfill evidence hashes | Existing payslips/runs/payments/declarations need hashes and provenance if imported. | Evidence trust requires source hashes. | Partial for generated current kernel; import/backfill path not evident. | Imported payroll artifacts cannot be trusted. | Payroll models, import/backfill scripts | Hash/backfill tests and reconciliation report. | Hard blocker for migration scenarios |

### 13. Operational And Admin Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Payroll setup/admin surface | Admin should configure payroll journal, posting accounts, country pack, periods, payroll frequency, module entitlement, and roles. | Operations need guided readiness, not hidden setup. | Partial. Accounting posting defaults exist; full payroll setup surface missing. | Payroll run fails late because setup is incomplete. | Accounting setup, payroll setup routes/services | Readiness checklist and setup validation tests. | Hard blocker before tenant rollout |
| Operational blockers and action queue | Workbench/command center should show blockers from services, not infer them in UI. | Users need a daily operating surface controlled by truth services. | Partial. Workbench shows blockers/queues; command action board incomplete. | Users miss required steps or duplicate manual workflows. | Payroll read models, manager/owner/action-center services | Read-model tests and UI smoke. | Hard blocker before Phase 2 |
| Observability and incident handling | Payroll errors, blocked postings, failed payments, declaration failures, privacy incidents, and stale close evidence need operational surfacing. | Payroll failures are business-critical. | Partial through existing error/audit/assurance foundations. | Silent payroll failure or untracked incident response. | Error handling, assurance registry, notification/action services | Incident tests, alert/action routing tests. | Soft now, hard before production rollout |
| Documentation and runbooks | Payroll operation, correction, payment failure, declaration fallback, and expert-review boundaries need runbooks. | Admins need safe procedures. | Missing/partial. Reports exist, product runbooks not complete. | Manual errors and misuse of expert-review states. | `what-next/payroll/`, docs/runbooks | Runbook review before release. | Soft readiness |

### 14. Release Gate Prerequisites

| Prerequisite | What is required | Why it is required | Current status | Risk if skipped | Likely files/systems | Validation needed | Blocker |
|---|---|---|---|---|---|---|---|
| Phase release gate after each skill | Run the release gate before moving from Phase 0 to Phase 1 and after every implementation phase. | The suite is a controlled roadmap, not a batch install. | Required by blueprint; must be enforced manually or by orchestrator. | Later phases build on failed foundations. | Skill docs, test scripts, report files | Gate report per phase. | Hard blocker |
| No TODO/placeholders in production surfaces | Skills may create docs/plans, but production code should not ship placeholders as features. | Prevents decorative bloat and fake workflows. | Must be validated per phase. | Users see incomplete workflows as real capability. | Routes/components/services | Placeholder scan, browser smoke, action gate tests. | Hard blocker |
| Stop-on-blocker behavior | If a prerequisite gate fails, stop and produce a blocker report. | Prevents forced implementation. | Required by blueprint. | Compounds risk across phases. | Skill execution reports under `what-next/payroll/` | Each phase report includes blockers and next action. | Hard blocker |

## Must Be Done Before Implementation

These are immediate blockers before running broad HR/payroll implementation skills:

1. Produce or refresh a Phase 0 current-state inventory that confirms the latest schema, migrations, service/action files, route files, reports, and test status.
2. Prove the payroll immutability migration is applied in the target/test database and add runtime trigger tests for finalized payroll evidence.
3. Formalize and run a payroll-specific statutory hardcode gate over payroll engine and action files.
4. Complete the Phase 0 close-impact source decision for payroll payment release, declaration lifecycle, and correction workflows; wire close invalidation only where the source truly stales close evidence.
5. Confirm payroll module entitlement blocks or redacts all current payroll routes/actions/read models when payroll is disabled.
6. Create the HR source-of-truth ownership map before adding employee/contract/compensation workflows.
7. Define the persona/RBAC matrix for HR manager, payroll officer, approver, accountant, treasurer, auditor, manager, owner, and employee self-service.
8. Define employee-user mapping and own-data rules before any employee self-service or payslip self-service route.
9. Confirm accounting setup readiness for payroll run and payroll payment posting rules in the target tenant.
10. Run and record the required verification gates: Prisma validation/generate, focused payroll tests, action tests, privacy tests, tenant-boundary tests, close-assurance tests, service boundary gate, policy gates, and typecheck.

## Should Be Done During Early Implementation

These should be built in Phases 1 and 2, immediately after Phase 0 gates pass:

1. Employee profile, duplicate-risk, and employee-user mapping service.
2. Contract lifecycle service and UI.
3. Compensation/rubrique catalog and employee assignment model/service.
4. Salary change approval with maker-checker, audit, redaction, and correction semantics.
5. Payment destination approval/change workflow before expanding payment release UX.
6. HR document/evidence references for contracts, salary changes, identifiers, and payment destinations.
7. Payroll command read model that renders service-owned counts, blockers, next actions, evidence, and redaction.
8. Run wizard and line-level review only after the source-data services exist.
9. Proof/evidence drawer links for run, payslip, declaration, payment, and blocker rows.
10. Persona-specific navigation without exposing routes that lack service-backed workflows.

## Can Be Deferred Safely

These can wait until the core enterprise payroll path is stable:

1. Advanced SMB digest integrations, owner/manager daily summaries, and BI story refinements.
2. Broad browser smoke coverage for routes that do not exist yet.
3. Mobile-first optimization beyond making the initial payroll route usable.
4. Rich visual polish of the payroll command center after the service-owned read model is stable.
5. Additional country packs beyond Cameroon after the country-pack engine and validation contract are proven.
6. Advanced analytics and anomaly scoring after the source data, payslips, payments, and declarations are trustworthy.

## Should Not Be Implemented Yet

These should be blocked until prerequisites are real:

1. Do not implement payslip PDF/archive/self-service until employee-user mapping, salary redaction, payslip immutability, and own-data tests are in place.
2. Do not implement statutory declaration submission automation until expert-reviewed country-pack declaration adapters exist.
3. Do not present fallback or expert-review payroll outputs as legal/statutory truth.
4. Do not add HR/payroll sidebar subroutes that point to placeholder pages.
5. Do not create dashboard-only payroll totals or command metrics outside service read models.
6. Do not implement payroll payment release UI before payment destination approval evidence and reconciliation status handling are proven.
7. Do not mutate posted runs, emitted payslips, released payment batches, submitted declarations, or archived evidence in place.
8. Do not build a separate dashboard payroll service that duplicates `services/payroll`.
9. Do not claim production HR/payroll readiness from the current workbench alone.

## Readiness Roadmap

### Immediate Blockers

1. Live DB immutability proof is missing even though the migration exists.
2. Payroll-specific hardcode gate must be formalized and run.
3. Payment/declaration/correction close-impact evaluation is incomplete.
4. Full module entitlement behavior across payroll route/action/read models is not yet proven.
5. HR source-data services and routes are not ready.
6. Employee-user mapping and own-data self-service rules are not ready.
7. Full statutory payroll breadth and declaration adapters are not ready.
8. Payment destination approval workflow is not ready.
9. Payroll register/livre de paie tie-out is not ready.
10. Full tenant/export/self-service/chaos/browser validation is not ready.

### Required Foundations

1. Phase 0 kernel gate:
   - Schema valid.
   - Migrations present and applied.
   - Runtime immutability proven.
   - Tenant boundary tests pass.
   - Salary read audit/redaction tests pass.
   - Hardcode gate passes.
   - Module entitlement blocks as expected.
   - Close invalidation sources classified and tested.

2. Phase 1 HR source-data gate:
   - Employee profile service and route.
   - Contract lifecycle service and route.
   - Compensation/rubrique model and service.
   - Payment destination approval.
   - Salary change approval.
   - Employee-user mapping.
   - Tenant/RBAC/redaction tests.

3. Phase 2 command center gate:
   - Service-owned command read model.
   - No client-computed payroll truth.
   - Action board and run wizard backed by existing workflows.
   - Proof drawer links to evidence.
   - Role-specific redaction and permissions.

4. Phase 3 statutory gate:
   - Country-pack formulas complete enough for the target country.
   - Expert-review provenance recorded.
   - Hardcode gate passes.
   - Golden statutory fixtures pass.
   - Unsupported states block production legal certainty.

5. Phase 4 to Phase 7 evidence and close gate:
   - Payslip archive/self-service own-data tests.
   - Declaration lifecycle evidence.
   - Payment reconciliation evidence.
   - Payroll register tie-out.
   - Close invalidation and data-trust gates pass.

### Recommended Implementation Order

1. Refresh Phase 0 inventory and gate report.
2. Apply/prove payroll immutability migration in test DB and add runtime trigger tests.
3. Formalize payroll hardcode gate.
4. Evaluate and test payment/declaration/correction close-impact sources.
5. Prove payroll module entitlement blocks current route/action/read-model access.
6. Build HR source-data services before UI expansion.
7. Add employee/contract/payment-destination/salary-change routes only when their services and tests exist.
8. Build service-owned payroll command read model.
9. Recompose workbench into command center and action board.
10. Expand country-pack statutory engine and expert-reviewed fixtures.
11. Build payslip viewer/archive/self-service and payroll register.
12. Build declaration adapters/lifecycle.
13. Build payment reconciliation workbench.
14. Complete accounting/close evidence and assurance gates.
15. Add SMB/BI digest integration.
16. Run chaos, browser smoke, release gates, and final readiness report.

### Validation Gates Before Moving Forward

Minimum before Phase 1:

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

If Prisma engine generation is blocked locally, use the blueprint fallback:

```powershell
npx prisma generate --no-engine
```

Additional validation before production release:

- Runtime DB immutability trigger tests.
- Payroll-specific hardcode scan.
- Module entitlement route/action tests.
- Full tenant escape tests for list/read/write/export/self-service.
- Country-pack statutory fixtures.
- Payment destination approval tests.
- Declaration lifecycle tests.
- Payroll payment reconciliation tests.
- Payroll register tie-out tests.
- Browser smoke for implemented routes only.

## Safest First Implementation Slice

The safest first implementation slice is not a UI expansion. It is a Phase 0 readiness closure slice:

1. Create a short current-state Phase 0 gate report.
2. Apply the payroll immutability migration to a test database.
3. Add runtime tests proving finalized payroll evidence cannot be updated or deleted outside allowed lifecycle metadata.
4. Add a payroll hardcode gate scoped to payroll engine/action files.
5. Decide whether payroll payment release, declaration status changes, and future correction writes are close-impacting sources.
6. Prove current payroll route/action/read model behavior when the payroll module is disabled.
7. Run the validation gates above.

Only after that should the system move into Phase 1 HR source-data implementation.

## Final Readiness Decision

Proceed with the HR/Payroll skill suite only as a gated roadmap. Do not execute all skills blindly.

Allowed now:

- Phase 0 inventory, hardening, gate closure, and blocker reports.
- Planning and source-ownership mapping for Phase 1.

Blocked now:

- Broad employee/contract UI implementation without services and source-data schema decisions.
- Command center workflow expansion without HR source-data services.
- Payslip/self-service without employee-user mapping and own-data tests.
- Statutory production claims without expert-reviewed country-pack formulas and fixtures.
- Declaration submission/payment/reconciliation automation without adapters and evidence lifecycle.
- Dashboard metrics or payroll totals computed outside services.

