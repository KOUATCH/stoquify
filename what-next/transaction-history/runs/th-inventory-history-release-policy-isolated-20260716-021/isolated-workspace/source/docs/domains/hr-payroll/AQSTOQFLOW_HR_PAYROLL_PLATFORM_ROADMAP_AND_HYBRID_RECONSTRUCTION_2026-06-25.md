# AqStoqFlow HR/Payroll Platform Roadmap and Hybrid Reconstruction Decision

Date: 2026-06-25

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Refined Prompt Used

You are working in `E:\ohada saas\newStockFlow\aqstoqflow`.

Create a detailed strategic, technical, and product roadmap for deeply baking HR/payroll into AqStoqFlow so it can become a complete SMB operating platform: HR, payroll, attendance, accounting, compliance, payments, close assurance, reporting, and operational management in one connected system.

Start with an honest architecture decision. Decide whether the safest and most productive path is:

- preservation and hardening of the current payroll kernel,
- full rebuild from scratch,
- or hybrid reconstruction, preserving proven controls while rebuilding weak product and workflow layers.

Ground the decision in the actual codebase. Inspect the payroll schema, service boundaries, actions, hooks, components, routes, tests, accounting integration, payments/reconciliation, country-pack/statutory design, close invalidation, RBAC/fresh-auth controls, redaction/privacy, module control, assurance, and recent `what-next/` reports.

Also benchmark five leading HR/payroll platforms for inspiration: Workday, ADP Workforce Now, Rippling, Gusto, and Paychex. Identify what AqStoqFlow should emulate, adapt, or deliberately avoid from each, without cloning their product or ignoring AqStoqFlow's OHADA/accounting-first context.

The output must explain:

- the final preservation/rebuild/hybrid direction,
- the current state of AqStoqFlow HR/payroll,
- the target enterprise-grade HR/payroll product vision,
- the integration map into accounting, close assurance, payments, compliance, and reporting,
- a phased implementation roadmap,
- product, technical, security, privacy, statutory, UX, and assurance gates,
- and how AqStoqFlow can eventually become the complete SMB management system a business can run without disconnected HR, payroll, accounting, compliance, or reporting tools.

Do not recommend a clean rebuild unless the current payroll kernel is structurally unsafe or slower to harden than replace. Do not recommend blind preservation if the existing module cannot support professional workflows. Preserve current invalidation metadata, audit, stale-evidence, business-event, country-pack provenance, ledger source links, and certified export semantics.

## Executive Decision

The safest and most productive path is **hybrid reconstruction**.

Preserve the current payroll kernel because it already contains valuable enterprise primitives:

- dedicated tenant-scoped payroll models for employees, contracts, periods, attendance snapshots, runs, run lines, payslips, declarations, payment batches, and allocations,
- country-pack provenance fields and resolution hashes,
- attendance freeze and correction concepts,
- payroll run calculation and posting flow,
- emitted payslip records and hashes,
- payroll payment release controls,
- declaration preparation with honest expert-review fallback,
- business events,
- ledger posting batches,
- accounting source links,
- payment/reconciliation evidence hooks,
- close certification invalidation for payroll run posting,
- fresh-auth protected server actions,
- and focused service/action tests.

Do not preserve the current module as-is. It is not yet a professional enterprise HR/payroll suite. It is a strong controlled kernel with a thin workbench and incomplete surrounding product workflows.

Do not rebuild from scratch now. A clean rewrite would likely spend months recreating controls that already exist: tenant scoping, country-pack provenance, ledger/source-link behavior, payment posting, business events, and certification invalidation. The rewrite risk is high because payroll correctness depends on many cross-domain invariants.

Use a hybrid path:

- keep and harden the payroll/accounting/payment/event kernel,
- split and productize the service layer only where current boundaries become too dense,
- rebuild the HR source-data workflows, payroll command center, statutory adapters, payslip/self-service product, reporting, and assurance surfaces,
- retire or quarantine obsolete/mock-heavy legacy payroll docs or components that do not match the current schema.

Clean rebuild becomes the right answer only if Phase 0 proves that the kernel cannot enforce immutability, tenant isolation, statutory provenance, or balanced ledger posting even after focused hardening. Current evidence does not justify that conclusion.

## Current State Assessment

### Strong Foundation

The current Prisma schema contains a real HR, presence, and payroll kernel:

- `PayrollEmployee` includes employee identity, masked/hash identifiers, payment destination hashes, organization scope, and lifecycle status.
- `PayrollContract` includes contract type/status, salary, currency, working time, classification, and signed-document evidence.
- `PayrollPeriod` tracks period dates, pay date, status, accounting period, and country-pack provenance.
- `PayrollAttendanceSnapshot` supports frozen/corrected/superseded source evidence.
- `PayrollRun` tracks run state, country-pack hashes, calculation hashes, amounts, posting evidence, source links, business events, and correction lineage.
- `PayrollPayslip` and `PayrollPayslipLine` provide immutable-product potential: document hashes, line details, country-pack provenance, amounts, and archive URI.
- `PayrollDeclaration` stores authority/type/status/amount/payload hash and country-pack provenance.
- `PayrollPaymentBatch` and `PayrollPaymentAllocation` connect payroll release, allocations, payment evidence, and ledger posting.

The active service/action layer is concentrated around `services/payroll/payroll-control.service.ts` and `actions/payroll/payroll-control.actions.ts`. It already includes:

- period creation,
- attendance freezing,
- payroll calculation,
- approve-and-post payroll run,
- payment batch release,
- declaration preparation,
- workbench read models,
- SYSCOHADA posting rule checks,
- balanced posting validation,
- ledger posting batches,
- accounting source links,
- sensitive action audit decisions,
- fresh-auth action protection,
- business events,
- outbox/notification hooks,
- and close certification invalidation for payroll run posting.

The latest close invalidation report confirms `approveAndPostPayrollRun` is now treated as a payroll close-impacting source. It preserves existing stale close metadata, stale evidence audit, `close.certification.invalidated` business event behavior, and certified export semantics.

The architecture graph also supports the strategic direction. It shows strong platform spines around:

- tenant defense in depth,
- ledger-first operational posting,
- the ledger-first OHADA operating spine,
- connected SMB operations,
- server action security,
- payment reconciliation,
- and compliance control.

Payroll appears as a smaller cluster around approval workflows, dedicated tables, and calculation engine. That is a good sign for hybrid reconstruction: the platform spine is already stronger than the payroll product surface.

### Product Gaps

The current module should not be marketed as complete enterprise HR/payroll yet.

Key gaps:

- no complete employee profile workflow,
- no mature contract lifecycle UI,
- no compensation/rubrique assignment workflow,
- no salary-change approval workflow,
- no payment destination change request and approval product,
- no document archive workflow for HR evidence,
- no leave and attendance management cockpit,
- no guided payroll lifecycle from readiness to close evidence,
- no line-level payroll review surface,
- no professional payslip viewer/PDF/archive/self-service flow,
- no full payroll register or livre de paie tie-out,
- no authority-specific declaration submission/acceptance/rejection/payment workflow,
- no full payroll payment operations cockpit with file evidence, retry states, provider matching, and settlement proof,
- no complete salary-read audit and redaction policy surface,
- no full tenant-escape, correction, concurrency, and chaos test matrix.

### Production Blockers

Highest-priority blockers before enterprise release:

- DB-level immutability must be restored/proven for posted payroll runs, emitted payslips, payslip lines, released payment batches, allocations, and declarations.
- Statutory calculation must move beyond narrow pension/CNPS-style logic into country-pack-driven rubriques, income tax, social contributions, allowances, benefits, loans, advances, garnishments, overtime, leave effects, caps, YTD totals, and corrections.
- Salary and personal data need salary-read audit, redaction policy, fresh-auth gates, and self-service scoping.
- Payment release and declaration lifecycle changes should be evaluated and, where close-impacting, added to the certified-close invalidation mesh after payroll run posting.
- Payroll exports must require permission, fresh auth, redaction, audit, and evidence hashes.

## Five Platform Inspirations

The point is not to clone these platforms. AqStoqFlow should emulate the underlying product patterns, then adapt them to an OHADA, accounting-first, SMB operating system.

| Platform | What It Teaches | What AqStoqFlow Should Emulate | What To Modify For AqStoqFlow |
|---|---|---|---|
| [Workday HCM](https://www.workday.com/en-us/products/human-capital-management/overview.html) | A single HCM system combining core HR, workforce management, planning, analytics, employee experience, and global/local compliance. | One secure employee/workforce source of truth; HR data connected to planning, analytics, finance, and operations; employee service delivery. | Make it lighter and SMB-first. Focus on operational clarity, OHADA payroll, accounting source links, close evidence, and local compliance rather than large-enterprise HR complexity. |
| [ADP Workforce Now](https://www.adp.com/what-we-offer/products/adp-workforce-now.aspx) | All-in-one HR, time, payroll, benefits, workflows, payroll anomaly detection, and scalable HCM modules. | Continuous payroll readiness, missing-input detection, payroll anomaly flags, configurable approvals, HR/time/payroll workflows. | Replace black-box payroll outsourcing with transparent country-pack provenance, source evidence, expert review, SYSCOHADA posting, and local filing evidence. |
| [Rippling Platform](https://www.rippling.com/platform) | Platform-first employee graph, shared workflows, role policies, reporting, approval management, and cross-domain automation. | Shared workflow engine, common permissions, unified reporting, approval studio patterns, employee-centered operational graph. | Keep the platform scope business/accounting-first. Defer IT/device management. Connect HR events to accounting, compliance, cash, close, BI, owner war room, and manager action queues. |
| [Gusto Payroll](https://gusto.com/product/payroll) | SMB-friendly payroll flow, simple onboarding, automated taxes, time sync, employee self-setup, paystubs, and clear guided payroll. | Easy guided payroll run, employee onboarding, simple self-service, paystub/payslip access, clear operator experience. | Add stricter enterprise controls than typical SMB tools: maker-checker, fresh auth, salary-read audit, statutory provenance, payroll register tie-out, and close invalidation. |
| [Paychex Payroll](https://www.paychex.com/payroll) | Fast payroll processing, automated tax admin, missing-hour/incorrect-data flags, pre-check, mobile approvals, and modular growth. | Payroll pre-check, readiness warnings, employee preview where legally appropriate, mobile-friendly approvals, modular HR/payroll expansion. | Build a redacted and controlled "payroll pre-check" that respects local law, role access, employer policy, and immutable evidence. Tie every payroll action to ledger/payment/declaration proof. |

## Target Product Vision

AqStoqFlow should become the operational system of record for SMBs that need inventory, sales, purchasing, cash, accounting, compliance, HR, payroll, and reporting in one connected platform.

The HR/payroll product should not be an isolated module. It should be the people-cost and statutory-obligation layer of the platform.

The target first viewport for payroll should show:

- current payroll period,
- due actions,
- blocked evidence,
- missing HR source data,
- attendance freeze status,
- run calculation/review/approval/posting status,
- gross, deductions, employer charges, net payable,
- payslip issue/archive status,
- payment release and reconciliation status,
- declaration due/submitted/accepted/rejected/paid status,
- ledger posting status,
- close readiness and stale-certified-close status,
- high-risk changes since last payroll,
- and trust/confidence status.

Role-specific experiences:

- HR manager: employee profiles, contracts, documents, leave, attendance, salary-change requests, payment-profile requests.
- Payroll officer: payroll readiness, calculation preview, anomalies, run wizard, payslip queue, declaration preparation.
- Approver: evidence summary, variance review, high-risk changes, fresh-auth approval, SoD enforcement.
- Accountant: SYSCOHADA posting rules, payroll register, source links, close blockers, certified exports.
- Treasurer: payment batches, release approval, bank/mobile-money file evidence, settlement and exceptions.
- Auditor: immutable evidence, hashes, source links, actor chain, redacted person-level views.
- Manager: team attendance, leave approvals, payroll-affecting exceptions, not salary-wide visibility.
- Employee: own profile subset, own payslips, own documents, payment destination change requests.

## Platform Integration Map

HR/payroll should integrate with these platform spines:

- Auth/RBAC/fresh auth: all salary, approval, payment, declaration, export, and sensitive-read actions go through canonical permission checks.
- Tenant boundary: every model, service, action, read model, and report remains organization-scoped.
- Module control: payroll belongs to one canonical module identity so routes, actions, read models, redaction, entitlements, and billing do not drift.
- Country packs: all statutory values and declaration rules come from versioned country packs with provenance and expert review.
- Ledger: payroll run posting and payment release create balanced SYSCOHADA entries with source links.
- Payment reconciliation: payroll payments generate provider/bank/mobile-money evidence and settlement matching paths.
- Business events: all meaningful lifecycle changes emit durable events.
- Audit: sensitive decisions and salary reads are logged.
- Close assurance: payroll facts invalidate certified close evidence when they change a closed/certified period.
- Compliance center: declarations and statutory payments become due-action and evidence workflows.
- BI/reporting: payroll cost, headcount, overtime, absenteeism, profitability, and cash forecast feed management views.
- Owner war room and manager action queues: payroll exceptions become actionable operational work, not hidden back-office noise.

## Phased Roadmap

### Phase 0: Kernel Safety and Architecture Inventory

Goal: make the current foundation safe to build on.

Scope:

- Reconfirm all current payroll models, migrations, services, actions, hooks, components, tests, and reports.
- Restore or add DB-level immutability for posted runs, emitted payslips, payslip lines, released payment batches, allocations, submitted declarations, and archived artifacts.
- Add tests proving forbidden mutation fails outside approved correction flows.
- Add tenant-escape tests for all current payroll actions/services.
- Add a hardcode gate that fails non-test statutory constants in payroll calculation code.
- Add salary-read audit and redaction tests for employee, payslip, payroll run, payment, declaration, and export views.
- Confirm that payroll run posting invalidates certified close evidence.
- Evaluate payment release and declaration state changes as next close invalidation sources.
- Identify obsolete payroll docs/components and mark them as historical if they no longer match the schema.

Exit gates:

- DB immutability tests pass.
- Tenant escape tests pass.
- Hardcode gate passes.
- Salary-read audit path exists.
- Payroll run posting close invalidation remains covered.
- No payroll export can bypass permission, redaction, audit, and fresh auth.

### Phase 1: HR Source-Data Foundation

Goal: make payroll inputs professional, controlled, and auditable.

Build:

- employee profile service, routes, forms, tables, and detail pages,
- contract lifecycle service and UI,
- compensation/rubrique catalog,
- salary-change request/approval workflow,
- payment destination request/approval workflow,
- HR document/evidence references,
- leave and attendance request/approval workflows,
- manager review screens for attendance exceptions,
- employee self-service profile subset.

Kernel preservation:

- preserve `PayrollEmployee`, `PayrollContract`, and payment hash fields,
- add models only where the current schema lacks lifecycle history, approvals, or evidence,
- do not store raw sensitive identifiers if masked/hash fields satisfy the workflow.

Exit gates:

- payroll cannot calculate if required employee/contract/payment/attendance inputs are missing or unapproved,
- payment destination changes require maker-checker and fresh auth,
- salary changes are versioned and auditable,
- managers cannot access unauthorized salary data.

### Phase 2: Payroll Command Center

Goal: replace the thin workbench with a guided lifecycle.

Lifecycle:

1. Input readiness.
2. Attendance freeze.
3. Calculate.
4. Review anomalies.
5. Approve and post.
6. Emit payslips.
7. Release payment.
8. Prepare declarations.
9. Reconcile payment and statutory liabilities.
10. Attach close evidence.

Build:

- first-viewport command brief,
- period action board,
- payroll run wizard,
- run detail page,
- line-level employee payroll review,
- anomaly and blocker list,
- proof drawer,
- approval summary,
- correction workflow.

Exit gates:

- operators can see the next required action without reading documentation,
- every action shows evidence, actor, timestamp, status, and blockers,
- double-submit and concurrent approval tests pass,
- corrections create new evidence rather than rewriting approved history.

### Phase 3: Payroll Calculation Engine and Country Packs

Goal: move from narrow calculation to country-pack-driven statutory payroll.

Build:

- rubrique/rule engine,
- taxable and social base calculators,
- IRPP/income tax support,
- social contributions,
- employer charges,
- allowances,
- benefits in kind,
- loans and advances,
- garnishments,
- overtime,
- leave effects,
- caps and thresholds,
- YTD totals,
- retroactive corrections,
- statutory provenance UI,
- expert review workflow for country-pack changes.

Exit gates:

- no statutory amount comes from hardcoded application constants,
- country-pack version/hash is present on run, line, payslip, and declaration evidence,
- expert-review-required fallback is visible and blocks false legal certainty,
- calculation snapshot can be independently explained from source HR data and country-pack rules.

### Phase 4: Payslips, Self-Service, and Payroll Register

Goal: make payslips and payroll reporting real products.

Build:

- immutable payslip viewer,
- PDF generation,
- archive URI and hash verification,
- bilingual labels,
- employer and employee legal identity,
- line-level earnings/deductions/employer charges,
- YTD totals,
- leave balances,
- payment references,
- employee self-service access,
- salary-read audit,
- payroll register/livre de paie,
- accountant/auditor tie-out views.

Exit gates:

- emitted payslips cannot be mutated,
- employee can only access their own payslips,
- export requires permission, fresh auth, redaction rules, and audit,
- payroll register ties runs, payslips, ledger postings, payments, declarations, and close evidence.

### Phase 5: Statutory Declarations and Compliance Evidence

Goal: turn declaration preparation into a full compliance workflow.

Build:

- country-specific declaration adapters,
- authority-specific payloads,
- submission package generation,
- submission evidence,
- acceptance/rejection handling,
- statutory payment workflow,
- statutory payment reconciliation,
- due-date risk alerts,
- compliance center integration,
- authority proof trail.

Exit gates:

- declaration status is not just prepared; it moves through submitted, accepted/rejected, paid, reconciled, archived,
- fallback declarations remain marked `expertReviewRequired`,
- authority evidence is immutable and linked to payroll run and close evidence.

### Phase 6: Payroll Payments and Reconciliation

Goal: make payroll payment operations certifiable.

Build:

- payroll payment batch detail screens,
- bank/mobile-money file generation or evidence upload,
- approval and release with SoD,
- provider/statement matching,
- retry states,
- exceptions,
- settlement proof,
- partial settlement support where business rules allow,
- treasurer dashboard.

Exit gates:

- payment batch total matches approved payroll net payable or documented approved partial release,
- duplicate payslip allocation is impossible,
- payment destination evidence is required,
- payment posting is balanced or creates a visible blocker,
- settlement/reconciliation proof links back to payroll and close evidence.

### Phase 7: Accounting, Close Assurance, and Certified Exports

Goal: make payroll part of financial truth.

Build:

- SYSCOHADA payroll posting rule management,
- payroll liability and payment posting proof,
- source-link drillthrough from ledger to payroll,
- payroll register tie-out,
- close blocker integration,
- certified export stale evidence,
- stale close invalidation for payment/declaration changes where close-impacting,
- auditor proof packs.

Exit gates:

- payroll run posting remains balanced and source-linked,
- payroll payment release is balanced or blocked with evidence,
- certified close evidence becomes stale when payroll facts change after certification,
- export semantics preserve stale-evidence, audit, business event, and outbox behavior.

### Phase 8: SMB Operating System Integration

Goal: make AqStoqFlow the complete management environment, not a set of disconnected modules.

Build:

- owner morning brief with payroll/cash/compliance signals,
- manager action center for attendance and HR exceptions,
- cash forecast including payroll and statutory payments,
- profitability views with payroll cost by branch, department, product line, or cost center,
- compliance radar with payroll filing/payment risks,
- close readiness journey with payroll blockers,
- BI command center with HR/payroll/accounting metrics,
- employee lifecycle automation across HR, access, payroll, and operations.

Exit gates:

- a manager can answer "what must be done today?" from one action surface,
- an owner can see payroll cash impact and compliance risk without opening separate tools,
- an accountant can trace payroll costs from employee/run to ledger/source link/close evidence,
- an auditor can inspect immutable proof without asking for external spreadsheets.

### Phase 9: Assurance, Chaos, and Release Gates

Goal: make the system battle-tested.

Add checks for:

- attendance drift after freeze,
- duplicate payroll run,
- duplicate posting,
- duplicate payment,
- missing payslip archive,
- declaration due risk,
- unusual salary changes,
- payment destination changes before payroll,
- correction abuse,
- closed-period posting,
- tenant escape,
- concurrent calculation/approval/payment release,
- rollback after partial failure,
- export redaction bypass,
- salary-read audit bypass.

Release gates:

- focused Jest service/action tests,
- integration tests for tenant and RBAC boundaries,
- payroll chaos suite,
- country-pack provenance gate,
- hardcoded statutory value gate,
- Prisma validation,
- typecheck,
- policy gates,
- service boundary gates,
- browser smoke for command center, run detail, payment, declaration, payslip, and self-service.

## Preserve, Rebuild, Retire

### Preserve And Harden

- Payroll Prisma kernel models and enums.
- Country-pack provenance fields.
- Attendance snapshot freeze/correction model.
- Payroll run status model and calculation evidence fields.
- Payslip hash and line-detail model.
- Payment batch/allocation model.
- Declaration model and expert-review fallback semantics.
- Ledger posting/source-link integration.
- Business-event emission.
- Sensitive action audit.
- Fresh-auth protected payroll approvals and payment release.
- Close invalidation metadata and stale-evidence semantics.
- Focused payroll service/action tests.

### Rebuild Or Recompose

- Payroll UI into a true command center.
- Employee/contract/compensation workflows.
- Payment destination workflows.
- Leave/attendance operations.
- Payslip viewer/PDF/archive/self-service.
- Declaration submission/payment/reconciliation adapters.
- Payroll payment operations cockpit.
- Payroll register/livre de paie.
- Assurance checks and chaos suite.
- Salary-read audit and redaction product surfaces.

### Retire Or Quarantine

- Legacy payroll documents that describe missing tables or mock-driven behavior contradicted by the current schema.
- Any mock payroll dashboard that bypasses current service/action/kernel semantics.
- Any isolated HR or payroll route that does not use tenant scoping, RBAC, fresh-auth where needed, country-pack provenance, audit, and evidence links.

## Service Boundary Direction

Do not split the service layer prematurely if it would weaken invariants. Start with internal extraction only where tests remain tight.

Target boundary:

- `employee.service.ts`: employee lifecycle, sensitive fields, profile read/redaction.
- `contract.service.ts`: contracts, amendments, activation, evidence.
- `compensation.service.ts`: rubriques, salary changes, assignments, approvals.
- `attendance.service.ts`: attendance snapshots, leave effects, freeze/correction.
- `payroll-run.service.ts`: calculation, review, approval/posting, corrections.
- `payslip.service.ts`: issue, archive, view, export, employee self-service.
- `payroll-payment.service.ts`: batch, allocation, release, evidence, reconciliation.
- `payroll-declaration.service.ts`: prepare, submit, accept/reject, pay, reconcile.
- `payroll-assurance.service.ts`: blockers, checks, trust status, close impact.
- `payroll-read-model.service.ts`: command center summaries and role-scoped views.

All services must preserve:

- organization scoping,
- idempotency,
- audit,
- business events,
- source links,
- redaction,
- country-pack provenance,
- and immutable correction semantics.

## Security And Privacy Model

Sensitive actions requiring fresh auth:

- approve payroll run,
- post payroll run,
- release payroll payment,
- submit declarations,
- export payroll data,
- read bulk salary data,
- change payment destination,
- approve salary change,
- void/correct payslip,
- close/certify payroll evidence.

Maker-checker required:

- salary changes,
- payment destination changes,
- payroll run approval/posting,
- payment release,
- declaration submission,
- statutory payment,
- correction of posted/emitted artifacts.

Redaction rules:

- managers see team operational exceptions, not broad salary data,
- employees see only their own payslips/profile subset,
- auditors get redacted person-level views unless explicitly authorized,
- accountants see payroll ledger/register totals and controlled drillthrough,
- payroll officers see needed salary details with audit,
- treasurers see payment evidence and destination-masked details only as required.

## Business Events To Standardize

Recommended canonical event spine:

- `payroll.employee.created`
- `payroll.employee.updated`
- `payroll.contract.created`
- `payroll.contract.amended`
- `payroll.contract.activated`
- `payroll.compensation.change_requested`
- `payroll.compensation.change_approved`
- `payroll.payment_destination.change_requested`
- `payroll.payment_destination.approved`
- `payroll.attendance_snapshot.frozen`
- `payroll.attendance_snapshot.corrected`
- `payroll.run.calculated`
- `payroll.run.reviewed`
- `payroll.run.posted`
- `payroll.run.corrected`
- `payroll.payslip.emitted`
- `payroll.payslip.archived`
- `payroll.payment_batch.approved`
- `payroll.payment_batch.released`
- `payroll.payment_batch.reconciled`
- `payroll.declaration.prepared`
- `payroll.declaration.submitted`
- `payroll.declaration.accepted`
- `payroll.declaration.rejected`
- `payroll.declaration.paid`
- `payroll.declaration.reconciled`
- `payroll.export.generated`
- `close.certification.invalidated`

## Build Order Recommendation

The next implementation slice should not be more UI polish. It should be Phase 0 safety.

Recommended immediate sequence:

1. Restore/prove DB-level immutability and correction-only mutation rules.
2. Add hardcode/static gate for statutory constants.
3. Add tenant-escape and salary-read audit tests.
4. Add payroll privacy/redaction read-model policy.
5. Evaluate and add certified-close invalidation for payroll payment release and declaration lifecycle changes where they are close-impacting.
6. Build employee and contract source-data workflows.
7. Recompose the command center only after source-data controls exist.

## Final Direction

AqStoqFlow should not rebuild payroll from scratch today.

It should also not merely preserve the current payroll module and call it enterprise-grade.

The correct direction is **hybrid reconstruction**:

- preserve the kernel,
- harden the invariants,
- reconstruct the product workflow layer,
- expand statutory/country-pack capability,
- integrate payroll into ledger, payments, close assurance, compliance, BI, and owner/manager action surfaces,
- and use strong gates to decide when each slice is safe to advance.

This path gives the business the best chance of becoming a complete SMB operating platform: not just payroll software, not just accounting software, and not just disconnected modules, but one system where employee data, payroll obligations, cash impact, accounting truth, statutory compliance, and close evidence all agree.

## Verification Performed

This was a roadmap/design run, not a code-change run.

Verified inputs:

- inspected the attached prompt,
- searched current Prisma HR/payroll schema,
- searched current payroll service and action paths,
- reviewed the current payroll close invalidation run report,
- reviewed the HR/payroll readiness assessment from 2026-06-24,
- checked the existing graphify architecture report and graph manifest,
- reviewed active payroll route/component/hook/service/action/test file presence,
- benchmarked official public pages for Workday, ADP Workforce Now, Rippling, Gusto, and Paychex.

No application tests were run because no code was changed.

