# Stoquify Enterprise HRIS Current State And Full System Proposal

Date: 2026-07-14  
Repository: `E:\ohada saas\Focused projects\stoquify`  
Prepared from: saved execution prompt, current codebase inspection, HRIS/payroll roadmap documents, UI documentation, and specialist review lenses covering HR operations, UX, compliance, security, data architecture, product scope, and release readiness.

## 1. Executive Verdict

Stoquify already contains a serious payroll-grade HR source layer. It has employee master records, effective-dated contracts, compensation controls, payment-destination change evidence, attendance snapshots, payslip self-service, payroll readiness checks, certified input proof, payment/declaration proof, and close-assurance hooks. These are valuable foundations.

It is not yet a full enterprise HRIS.

The current implementation is best described as a payroll-controlled HR source foundation embedded inside the payroll domain. It is suitable for controlled pilot or limited release of implemented, evidence-gated payroll workflows where the scope is explicit. It should not be marketed or operated as unrestricted production HRIS/payroll until the missing HRIS boundary, HR lifecycle workflows, retention controls, statutory certification, live integration evidence, manager/employee self-service, browser/accessibility evidence, and release attestation controls are complete.

The strongest strategic move is not to rewrite the payroll kernel. The right move is to establish a dedicated HRIS/People boundary that owns people truth, then make payroll consume certified HRIS snapshots. This aligns with the existing roadmap language: HRIS owns people truth, payroll consumes certified HRIS snapshots, accounting records money truth, and assurance proves the chain.

## 2. Scope And Method

This report evaluates:

- What HRIS functionality exists now.
- What is missing for a professional, modern, enterprise-grade, secure HRIS.
- Which current payroll tables/services should be reused, wrapped, or replaced.
- How the future HRIS should fit Stoquify's dark command-center dashboard design system.
- Which security, privacy, audit, compliance, and release controls are required before broader production use.
- A staged implementation path that avoids unnecessary rewrites.

Primary evidence inspected included:

- `prisma/schema.prisma`
- `services/payroll/*`
- `actions/payroll/*`
- `components/payroll/*`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/security/redaction-policy.service.ts`
- `services/accounting/*close*` and data-trust evidence surfaces
- `docs/HR-Payroll/*`
- `what-next/payroll/*`
- `docs/UI/UX/*`
- `docs/product/user-experience/ui-registry.md`
- `components/dashboard/primitives/command-center-primitives.tsx`

No production code was changed for this report.

Specialist review inputs were incorporated from HR operations, UX architecture, compliance/audit, security architecture, database architecture, and product strategy perspectives. The report uses completed specialist findings plus direct repository evidence.

## 3. Confirmed Current HRIS-Like Capabilities

### 3.1 Employee Master Foundation

The `PayrollEmployee` model is the current employee master record. It includes organization scope, optional user mapping, employee number, display/legal names, status, hire and termination dates, country, location, department, job title, cost center, masked/hash tax identifiers, masked/hash social identifiers, masked/hash payment destination fields, and relations to contracts, compensation assignments, payment-destination requests, attendance snapshots, run lines, payslips, allocations, and balance cases.

Evidence:

- `prisma/schema.prisma:1644` defines `PayrollEmployee`.
- `services/payroll/employee.service.ts` enforces tenant-scoped employee operations, user/location validation, duplicate mapping checks, evidence hashes, audit behavior, redaction policy, and readiness blockers.
- `actions/payroll/payroll-employee.actions.ts` routes employee operations through payroll permissions and fresh-auth policies for sensitive operations.

Assessment:

This is a credible starting point for an HRIS employee identity layer, but it is still named and owned by payroll. A full HRIS should make employee identity a People/HRIS-owned boundary, even if it initially wraps this table.

Data caution:

The current employee record also conflates identity, employment status, organization placement, identifiers, and current payment destination. The future HRIS should avoid copying this into a second employee master. During transition, use the current employee row as compatibility storage, make HRIS services the only writer, and move payroll-affecting facts into effective-dated HRIS-owned version tables.

### 3.2 Contract Lifecycle

The `PayrollContract` model supports employee contracts with organization scope, effective dates, status, type, salary, currency, working hours, classification, convention, signed document hash, and business-event linkage.

Evidence:

- `prisma/schema.prisma:1701` defines `PayrollContract`.
- `services/payroll/contract.service.ts` validates employee ownership, effective-date order, overlapping active contracts, signed-evidence requirements for active contracts, and payroll eligibility.

Assessment:

The foundation is strong for payroll eligibility and contract evidence. A full HRIS needs a broader employment lifecycle around it: draft, review, approval, signature, probation, renewal, amendment, suspension, termination, offboarding, retention, and legal hold. Contract operations also need a consistent request-review-approve-apply pattern rather than allowing all privileged users to directly perform every high-impact action.

Data caution:

Contract overlap appears to be enforced primarily in application logic. For enterprise readiness, PostgreSQL constraints or equivalent transactional protections should prevent concurrent overlapping active ranges at the database layer.

### 3.3 Compensation And Payroll Input Controls

Stoquify has compensation/rubrique logic, salary-change workflows, maker-checker behavior, evidence hashes, requester/approver separation, and active-contract gating.

Evidence:

- `PayrollEmployeeRubriqueAssignment` begins at `prisma/schema.prisma:1786`.
- `services/payroll/compensation.service.ts` manages salary requests and compensation assignments, including separation between requester and approver/apply actors.
- `actions/payroll/payroll-compensation.actions.ts` applies permission and fresh-auth checks.

Assessment:

This is important, but compensation is broader than payroll input. Full HRIS compensation should include grades, bands, allowances, benefits, deductions, approvals, eligibility, effective dating, employee-facing visibility rules, and audit-ready change history. Country-pack and accounting boundaries must still own statutory meaning and posting mappings.

Data caution:

Compensation assignments should eventually link to explicit contract/employment versions and should have overlap protection. Payroll rubriques should remain calculation definitions; they should not become the sole employee compensation truth.

### 3.4 Payment Destination Evidence

The current system supports payroll payment-destination change requests with masked/hash destination fields, approval/rejection/application actors, reasons, evidence hashes, and business events.

Evidence:

- `PayrollPaymentDestinationChangeRequest` begins at `prisma/schema.prisma:1877`.
- `services/payroll/payment-evidence.service.ts` handles readiness, masking, hashes, evidence matching, audit, and business events.

Assessment:

This is a strong control surface. A full HRIS should keep raw payment details out of ordinary list payloads and reports. Sensitive values should remain masked, encrypted when recoverable, hash/HMAC-addressed when used as evidence, and subject to fresh authentication for reveal/export.

Security caution:

Deterministic unkeyed SHA-256 is not sufficient for low-entropy values such as phone numbers, account fragments, or national identifiers. Use purpose-specific HMAC-SHA-256 with secret rotation for equality checks, and encryption with managed keys when the value must be recoverable.

### 3.5 Attendance Snapshots

The `PayrollAttendanceSnapshot` model stores aggregate payroll-period facts: scheduled, worked, overtime, absence, and leave minutes, source hashes, freeze metadata, and correction linkage.

Evidence:

- `PayrollAttendanceSnapshot` begins at `prisma/schema.prisma:1970`.

Assessment:

This is not a full time and leave system. It is a payroll input snapshot. A proper HRIS needs calendars, schedules, holidays, leave policies, leave balances, requests, approvals, overtime workflows, timesheet imports, attendance corrections, and certified period snapshots that payroll consumes.

Data caution:

Attendance snapshots currently store period totals and source payload metadata. Full HRIS requires source-level time/leave facts, not only aggregate payroll inputs.

### 3.6 Payslip Self-Service

Employee self-service exists primarily through payslip retrieval/export.

Evidence:

- `actions/payroll/payroll-payslip-self-service.actions.ts` resolves own payslip access and uses fresh authentication for export.

Assessment:

This is useful but narrow. Full HRIS self-service should include own profile, employment summary, document requests/status, time and leave, payment-destination change request, and a controlled view of payslips and payroll history.

### 3.7 Manager Scope

A manager-scope service exists, based on `Location.managerId` and employees assigned to managed locations.

Evidence:

- `services/payroll/org-manager-scope.service.ts` resolves manager-scoped employees.

Assessment:

This should be labeled honestly as managed locations/teams. It is not yet a true reporting-line model. A full HRIS needs effective-dated org units, positions, jobs, assignments, reporting lines, delegations, and manager history.

### 3.8 Accounting And Assurance Chain

Recent payroll assurance work links certified HRIS input proof to payment/declaration proof and accounting close/data-trust controls. Reports indicate that close/data trust can fail closed when certified HRIS input proof is absent.

Evidence:

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md`
- `services/accounting/data-trust.service.ts`
- `services/accounting/close-assurance-pack.service.ts`

Assessment:

This is the right architecture direction: HR truth should certify payroll inputs; payroll should generate money/statuory facts; accounting and assurance should validate traceability. The remaining weakness is that some controls are still in current working-tree reports and are not a substitute for production-certified, committed, release-tied evidence.

### 3.9 Current Security Foundation And Gaps

Observed strengths:

- Payroll actions generally derive tenant and actor context from verified session flows.
- Sensitive payroll services usually include `organizationId` in queries.
- Compensation and payment-destination changes include maker-checker-style workflows.
- Redaction policies cover salary, documents, compliance payloads, provider references, and audit context.
- Payroll mutations commonly write audit records and business events.
- Repository gates already cover many policy, migration, browser, and release-evidence checks.

Observed gaps:

- Fresh authentication appears to be session-recency based rather than proven step-up MFA. A newly stolen session could still satisfy sensitive-operation freshness during the allowed window.
- Tenant isolation is mostly application-query discipline. A future query that omits `organizationId` could bypass the intended tenant boundary unless database row-level security or equivalent controls are added.
- OAuth/session/invite/verification tokens and sensitive identifiers need stronger at-rest protection, including token digests, envelope encryption for recoverable secrets, and keyed hashes for identifier equality.
- Generic audit records are flexible and useful, but not yet uniformly append-only, hash-chained, retained, or exported to immutable storage.
- Segregation of duties is strong in some workflows and incomplete in others, especially termination, contract lifecycle, payment approval/release separation, and broad HR lifecycle changes.
- HR document storage, binary download authorization, retention, legal hold, malware scanning, and verifiable deletion are not yet enterprise-complete.
- Flexible JSON metadata can bypass redaction if sensitive keys are added outside a strict schema.
- Release readiness should fail closed on enterprise-security gates such as real step-up MFA, database tenant isolation, document security, retention/legal hold, audit integrity, key rotation, and cross-tenant negative testing.

## 4. What HRIS Is Today

Today, Stoquify's HRIS is not a standalone module. It is an HR/payroll source-truth spine expressed mostly through payroll tables, payroll services, payroll actions, and payroll dashboard routes.

Current practical definition:

- Employee identity exists through `PayrollEmployee`.
- Employment contracts exist through `PayrollContract`.
- Compensation and deductions exist through payroll rubrique assignments and salary-change workflows.
- Payment-destination evidence exists through payroll payment evidence services.
- Attendance exists as payroll-period snapshots.
- Employee self-service exists mainly for payslips.
- Manager scope exists through location-managed employees.
- Payroll readiness, payment/declaration proof, and close assurance are increasingly tied to certified HRIS input hashes.

What this means operationally:

- Stoquify can already support controlled payroll workflows with meaningful controls.
- It cannot yet support complete HR operations from hire to retire.
- It should not claim unrestricted enterprise HRIS readiness.
- It should avoid building more HR truth inside payroll-specific services without a boundary plan.

## 5. What Full Enterprise HRIS Requires

A full Stoquify HRIS should become the system of record for people, employment lifecycle, organization structure, time/leave, documents, HR approvals, and employee/manager self-service. Payroll should consume HRIS-certified snapshots rather than directly owning mutable HR facts.

### 5.1 Required Domain Boundaries

| Boundary | Owns The Truth For | Should Not Own |
|---|---|---|
| HRIS / People | Employee identity, employment lifecycle, org assignments, contracts, HR documents, time/leave approval, payment-destination approval, HR approvals | Payroll calculations, statutory formula meaning, ledger posting |
| Payroll | Periods, readiness verdicts, certified input snapshots, payroll runs, run lines, payslips, corrections, payment batches, payroll declarations | Mutable employee master truth |
| Country Pack / Compliance | Statutory formula provenance, effective windows, legal mappings, certified fixtures | Employee personal master records |
| Accounting | Journal posting, close, reconciliation, accounting assurance, close-pack certification | HR profile editing |
| Auth / RBAC | User identity, session security, tenant membership, permissions, fresh-auth policy | Business truth |
| Security / Privacy | Redaction, sensitive access audit, secret management, retention, legal hold, export controls | Operational HR decisions |

### 5.2 Required Functional Capabilities

1. Employee master and identity management.
2. Employment lifecycle: onboarding, probation, transfer, promotion, suspension, termination, offboarding, rehire.
3. Organization structure: legal entity, locations, departments, jobs, positions, reporting lines, manager delegations.
4. Contract lifecycle: draft, evidence, review, approval, signature, renewal, amendment, termination.
5. Compensation and benefits: grades, ranges, allowances, benefits, deductions, eligibility, effective dating, approvals.
6. Time and attendance: schedules, calendars, holidays, time entries, anomalies, corrections, approvals.
7. Leave management: policies, balances, accruals, requests, approvals, team calendar, payroll impact.
8. HR documents: evidence register, document types, validity, expiry, retention, legal hold, redacted access.
9. Employee self-service: own profile, docs, leave, attendance, payslips, payment-destination change requests.
10. Manager self-service: scoped roster, leave/attendance approvals, onboarding/offboarding tasks, team readiness.
11. HR analytics and movement history: employee movements, contract movements, comp changes, leave movements, payroll-input certification history.
12. Compliance and audit: SoD, maker-checker, immutable evidence, release attestation, audit export, data retention.

### 5.3 Capabilities To Defer

The following are valuable, but should not distract from the core HRIS/payroll trust chain:

- Full recruitment/ATS.
- Performance management.
- Learning management.
- Succession planning.
- Advanced workforce planning.
- Benefits marketplace integrations.

They should come after the employee master, lifecycle, time/leave, document evidence, self-service, and payroll certification chain are stable.

## 5A. Product Strategy: Payroll-Ready People Core

The honest product wedge is not a generic full HR suite. The defensible next product is a Payroll-Ready People Core: authoritative employee, organization, contract, compensation, document, payment-destination, and attendance-input truth that produces a certified payroll snapshot.

This fits Stoquify's existing strength: trusted operational evidence flowing from people data through payroll, cash movement, accounting, and close. A broad generic HRIS would dilute that advantage and delay higher-risk payroll, cash, reconciliation, and accounting production work.

Recommended current label:

Stoquify is an OHADA business operating system with a controlled-pilot payroll kernel and payroll-ready people-data controls.

Do not market Stoquify as a full enterprise HRIS until the HRIS boundary, time/leave source engine, lifecycle workflows, self-service, manager workflows, document retention, live statutory/provider evidence, and release attestation are complete.

### MVP Scope

The MVP should be People Core, not full HRIS. It should include:

| Capability | MVP Requirement |
|---|---|
| Employee master | Create/import/update employee identity, employment status, user mapping, duplicate detection, lifecycle timeline |
| Organization structure | Durable location, department, position, manager, cost-center references, effective dates, scoped manager access |
| Contract and compensation | Operator forms for contracts, evidence, amendments, approved salary and rubrique changes |
| Documents | Metadata/evidence center with document type, hash, expiry, retention class, access policy, secure download boundary |
| Payment destination | Employee request plus maker-checker approval; masked/hash-only operational views |
| Attendance input | Approved import or integration, freeze, source hash, correction diff; not full scheduling yet |
| Readiness | Employee, branch, and period queues explaining exactly why payroll is blocked |
| Payroll handoff | Certified immutable snapshot consumed by the existing payroll engine |
| Basic self-service | Own profile, payslips, correction request, document request/upload, payment-destination request |
| Implementation tooling | CSV import, dry-run validation, duplicate report, migration diff, rollback/correction plan |

MVP release gates:

- Every included payroll employee maps to one tenant-scoped employee identity.
- Every payroll run consumes a certified snapshot; no UI-supplied readiness claims.
- No draft or unapproved contract, compensation, attendance, or payment destination reaches payroll.
- Managers cannot read outside assigned scope.
- HR/payroll writes have user-facing workflows, not only backend actions.
- A pilot tenant completes two payroll cycles without destructive data repair.

### Sequencing Against Cash, Accounting, And Payroll

Cash and accounting should retain priority over broad HRIS expansion because they are closer to Stoquify's current market promise and carry immediate money-movement and close risk.

Recommended order with one delivery squad:

1. Release integrity plus cash/reconciliation/close external certification.
2. Payroll-Ready People Core.
3. Cameroon production payroll and migration pilot.
4. Time, leave, and self-service.
5. Broader HRIS.

With two squads, run cash/accounting final-mile work and the narrow People Core in parallel, then converge at the payroll production pilot. Do not divert either squad into recruitment, performance, or AI before that convergence.

### Commercial Packaging

Near term, sell Payroll Pro with People Core included rather than a separate HRIS entitlement. Do not introduce a separately priced `hris` module until People Core is real and durable package/entitlement truth exists.

Recommended commercial evolution:

| Offer | Contents | Pricing Metric |
|---|---|---|
| People Core | Employee/org/contract/documents/basic self-service | Platform base plus active employees/month |
| Time & Attendance | Schedules, leave, overtime, approvals, attendance integrations | Active employees plus optional integration/location fee |
| Payroll Pro | People Core, certified snapshots, runs, payslips, statutory pack | Active payroll employees plus legal entity/country pack |
| Payroll Assurance | Payroll Pro plus payments, declarations, reconciliation, accounting close evidence | Enterprise bundle plus implementation/integration fee |
| Talent Suite | Recruitment, performance, learning | Deferred add-on |

Commercial cautions:

- Do not charge employees for self-service seats; adoption improves data quality.
- Charge separately for migration, implementation, country-pack certification, and external integrations.
- Live payroll should be an assisted pilot, not a self-serve free trial.
- Downgrade should stop new writes, payroll runs, payment release, and declarations while preserving redacted payslips, registers, and legal evidence read-only.
- Avoid publishing numeric prices until customer employee counts, willingness to pay, implementation cost, and competitor replacement budgets are measured.

### What Not To Build Yet

Do not prioritize these before People Core and payroll/cash/accounting certification are stronger:

- Recruitment/ATS.
- Performance reviews.
- Learning management.
- Succession and engagement surveys.
- AI HR copilot or workforce predictions.
- Generic executive HR dashboards.
- Full benefits marketplace.
- Native biometric hardware.
- Deep scheduling integrations before import/adaptor demand is proven.
- Multi-country payroll beyond the first fully certified country pack.
- A big-bang rewrite from `services/payroll` into `services/hris`.
- Production automated payments or declarations without real provider/authority certification.
- A new commercial HRIS module slug before durable entitlement and independent demand exist.

Recommended north star:

Percentage of payroll periods completed from certified HRIS snapshots and closed without high-severity payroll evidence exceptions.

Initial pilot measures:

- 100% of payroll runs from certified snapshots.
- At least 95% of employees ready by payroll cutoff after two cycles.
- Zero cross-tenant or out-of-scope manager reads.
- Declining post-issue payslip correction rate.
- Measurable reduction in payroll preparation hours.
- Successful attachment of Finance/Assurance to payroll customers.

Confidence is high on technical sequencing and moderate on market packaging. Before funding broad HRIS phases, run 8-10 interviews across HR, payroll, finance, and employees, then baseline the current spreadsheet-heavy payroll workflow.
## 6. Proposal By Capability Area

### 6.1 HRIS Service Boundary

Business use case:

Create one trusted owner for people truth so payroll, accounting, compliance, and dashboards no longer infer HR facts from route-local UI or payroll-only services.

Users benefiting:

HR operators, payroll operators, accountants, managers, employees, auditors, owners, compliance reviewers.

Truth owner:

New `services/hris/*` boundary. Initially it can wrap the existing `PayrollEmployee`, `PayrollContract`, compensation, attendance, and payment-destination tables. Over time, it should introduce dedicated HRIS models where the payroll naming becomes misleading or insufficient.

UI pattern:

Dedicated People/HRIS workspace, not only payroll screens. Recommended route family:

- `/dashboard/people`
- `/dashboard/people/employees`
- `/dashboard/people/employees/[employeeId]`
- `/dashboard/people/organization`
- `/dashboard/people/time`
- `/dashboard/people/leave`
- `/dashboard/people/documents`
- `/dashboard/people/me`
- `/dashboard/people/team`

Value:

Clear ownership, safer payroll integration, cleaner UX, easier audit, better product positioning.

Risks and tradeoffs:

Creating a new boundary too quickly could duplicate payroll logic. The first phase should use facades/read models over existing tables rather than immediate schema churn.

Implementation path:

1. Add HRIS service facade/read models over existing payroll source tables.
2. Add `hris.*` permissions while preserving existing `payroll.*` permissions.
3. Add HRIS route registry and sidebar entries.
4. Move new people-source mutations behind HRIS services.
5. Keep payroll consuming certified snapshots.

Verification:

- Boundary tests proving HRIS services own people mutations.
- Payroll tests proving payroll consumes HRIS-certified inputs.
- RBAC tests proving HR users and payroll users have different capabilities.
- Regression tests proving existing payroll routes still work.

### 6.2 Employee Master And Identity

Business use case:

Provide one trusted employee profile for operational HR, payroll readiness, access mapping, manager scope, and audit.

Users benefiting:

HR admins, payroll admins, managers, employees, auditors.

Truth owner:

HRIS employee service. Current storage can remain `PayrollEmployee` during migration.

UI pattern:

Employee directory plus Employee 360 profile. Use compact tables, privacy-safe columns, command brief, status strip, action queue, evidence/proof strip, and detail drawers for sensitive sections.

Default directory columns:

- Employee
- Status
- Job
- Department
- Location
- Readiness
- Evidence status

Sensitive fields such as salary, legal identifiers, bank data, tax identifiers, and raw documents should not be included in list payloads.

Value:

Reduces payroll setup errors, makes HR operations visible, improves audit readiness, and gives managers a reliable team view.

Risks and tradeoffs:

If employee data stays payroll-named forever, future HR features will feel bolted on. If schema migration happens too early, it may destabilize payroll. Use a facade-first approach.

Implementation path:

1. Create HRIS employee read model.
2. Add employee profile page with permission-gated tabs.
3. Resolve employee-user mapping server-side.
4. Add lifecycle timeline assembled from audit/business events.
5. Add redaction-aware drawers for sensitive sections.

Verification:

- Tenant isolation tests.
- User mapping conflict tests.
- Redaction tests for list payloads and rendered DOM.
- Own-record and manager-scope negative tests.

### 6.3 Employment Lifecycle

Business use case:

Manage onboarding, probation, transfer, promotion, suspension, termination, offboarding, and rehire as traceable HR workflows instead of ad hoc employee record updates.

Users benefiting:

HR operators, managers, payroll operators, auditors, employees.

Truth owner:

HRIS lifecycle service.

UI pattern:

Action queue and lifecycle timeline. Each lifecycle event should show state, risk, action, proof, effective date, actor, evidence, and downstream payroll impact.

Value:

Reduces missed payroll changes, prevents undocumented terminations/transfers, and creates audit history.

Risks and tradeoffs:

Lifecycle workflow can become too heavy for SMB users. Start with a minimum useful state machine: draft, submitted, approved, effective, cancelled, corrected.

Implementation path:

1. Add lifecycle event/request model or metadata-backed workflow if schema must stay narrow.
2. Tie lifecycle actions to employee status, contracts, assignments, document checklist, and payroll readiness.
3. Add onboarding/offboarding task queues.
4. Add correction-only behavior for finalized payroll periods.

Verification:

- State-transition tests.
- Approval and SoD tests.
- Payroll readiness tests for starter/leaver edge cases.
- Audit evidence tests.

### 6.4 Organization, Positions, And Manager Scope

Business use case:

Represent who works where, who manages whom, and what organizational structure applied at a point in time.

Users benefiting:

HR admins, managers, owners, payroll admins, auditors.

Truth owner:

HRIS organization service.

UI pattern:

Initially: managed locations and team rosters. Later: effective-dated org tree, position list, reporting-line history, and manager workspace.

Value:

Improves access boundaries, approvals, workforce visibility, leave planning, and audit of manager authority.

Risks and tradeoffs:

The current manager scope is location-based, not a reporting-line hierarchy. Calling employees "direct reports" today would overstate the model.

Implementation path:

1. Keep existing location manager scope and label it accurately.
2. Add organization units, jobs, positions, assignments, and reporting lines.
3. Make all manager scope effective-dated.
4. Add delegations and temporary approver coverage.

Verification:

- Manager route-access tests.
- Negative tests for employees outside scope.
- Effective-date tests for historical manager access.
- Privacy tests ensuring managers cannot see salary, bank, or identifiers unless explicitly authorized.

### 6.5 Contract And Document Evidence

Business use case:

Control employment agreements, signed evidence, amendments, renewals, expiries, and retention obligations.

Users benefiting:

HR admins, legal/compliance, payroll admins, auditors, employees.

Truth owner:

HRIS contract and document-evidence services.

UI pattern:

Contract workbench and document evidence register. Use compact tables, proof badges, expiry/risk status, review queues, and sensitive detail drawers.

Value:

Prevents payroll from running against unsigned, expired, or unapproved employment terms.

Risks and tradeoffs:

Document storage is a privacy and retention risk. Metadata and hashes are not a full document repository. Raw files need separate authorization, short-lived access, encryption, legal hold, and deletion controls.

Implementation path:

1. Wrap existing contract model with HRIS service.
2. Add contract approval workflow for high-impact actions.
3. Add document metadata model: type, category, version, validity, expiry, owner, retention class, evidence hash, storage pointer.
4. Add document access decisions and redaction reasons.

Verification:

- Contract overlap and active-contract tests.
- Evidence-required tests.
- Document access negative tests.
- Retention/legal-hold tests.
- Export redaction tests.

### 6.6 Compensation, Benefits, And Payroll Inputs

Business use case:

Manage pay changes, allowances, deductions, benefits, and payroll input eligibility with approval evidence and clean handoff to payroll.

Users benefiting:

HR, payroll, finance, managers, employees, auditors.

Truth owner:

HRIS owns employee-level compensation assignments and approvals. Country pack/compliance owns statutory meaning. Accounting owns posting maps. Payroll consumes approved inputs.

UI pattern:

Compensation control surface inside People/HRIS, permission-gated and redacted by default. Payroll should show certified input status, not become the editor for HR compensation truth.

Value:

Reduces wrong payslips, wrong declarations, payroll disputes, and ledger mismatches.

Risks and tradeoffs:

Compensation touches sensitive personal data and statutory obligations. Overexposure in UI is a high privacy risk.

Implementation path:

1. Keep salary-change maker-checker.
2. Add approval workflow coverage for active rubric assignments and high-impact compensation changes.
3. Link assignments to contract/effective period.
4. Generate certified compensation input snapshots for payroll.
5. Keep list payloads salary-free unless specifically authorized.

Verification:

- Maker-checker tests.
- Incompatible-role tests.
- Sensitive field absence tests.
- Payroll input hash tests.
- Country-pack fixture tests.

### 6.7 Time, Leave, And Attendance

Business use case:

Manage attendance, overtime, absence, leave requests, balances, and payroll-period certification.

Users benefiting:

Employees, managers, HR, payroll, finance, auditors.

Truth owner:

HRIS time/leave/attendance service.

UI pattern:

Separate time and leave operations from the existing payroll readiness screen:

- Attendance period summary.
- Exceptions and anomaly queue.
- Leave balances and requests.
- Manager approval queue.
- Team calendar.
- Certified payroll-input status.

Value:

Prevents payroll from calculating against mutable or unapproved time data.

Risks and tradeoffs:

Time and leave rules vary by country, contract, schedule, and company policy. A rushed implementation may create legal and payroll errors.

Implementation path:

1. Add leave policy, balance, request, approval, and accrual contracts.
2. Add schedule/calendar/holiday support.
3. Add attendance import and correction chains.
4. Freeze approved period snapshots.
5. Have payroll consume only approved, frozen, traceable snapshots.

Verification:

- Leave accrual and balance tests.
- Manager approval tests.
- Retroactive correction tests.
- Payroll readiness fail-closed tests.
- Browser tests for employee and manager workflows.

### 6.8 Employee Self-Service

Business use case:

Let employees safely access their own HR/payroll facts without exposing other employees or trusting client-provided employee IDs.

Users benefiting:

Employees, HR support, payroll support.

Truth owner:

HRIS self-service resolver. Payroll remains owner of immutable payslip data.

UI pattern:

`/dashboard/people/me` with tabs for profile, employment, documents, leave/time, payment destination requests, and payslips.

Value:

Reduces HR support load, improves employee trust, and creates auditable self-service workflows.

Risks and tradeoffs:

Self-service can leak sensitive data if it trusts client IDs or preloads hidden fields. Own-employee resolution must be server-side.

Implementation path:

1. Resolve own employee from authenticated `userId`.
2. Add read-only own profile and employment summary.
3. Add document request/status.
4. Add leave/time view after time/leave contracts exist.
5. Reuse existing payslip self-service with fresh-auth export.

Verification:

- Own-record negative tests.
- Tenant-switch tests.
- Sensitive export fresh-auth tests.
- Rendered DOM redaction tests.

### 6.9 Manager Self-Service

Business use case:

Give managers the ability to act on team HR workflows within approved scope.

Users benefiting:

Managers, HR, payroll, employees.

Truth owner:

HRIS manager service with effective-dated scope. Current phase can use location manager scope.

UI pattern:

`/dashboard/people/team` with team roster, availability, leave/attendance approvals, onboarding/offboarding tasks, document task status, and payroll-readiness signals without sensitive compensation or identifier exposure.

Value:

Moves HR work closer to the responsible manager while preserving access boundaries.

Risks and tradeoffs:

Manager scope is easy to overstate. Current scope is location-based. Reporting-line authority requires a real org model.

Implementation path:

1. Expose location-scoped team roster.
2. Add operation-specific manager permissions.
3. Add approval queues for leave/attendance and lifecycle tasks.
4. Later introduce reporting-line assignments and delegations.

Verification:

- Scope tests by location and effective date.
- Negative tests for out-of-scope employees.
- Sensitive field absence tests.
- Accessibility and mobile tests for queue workflows.

### 6.10 HR Movement And History Tables

Business use case:

Provide audit-grade history of employee movements and HR/payroll source changes.

Users benefiting:

HR, payroll, managers, auditors, accountants, owners.

Truth owner:

HRIS movement read service assembled from immutable audit logs, business events, lifecycle events, contract changes, compensation changes, payment-destination changes, attendance freezes/corrections, payroll snapshots, and payslip events.

UI pattern:

Movement-style analytical table similar in spirit to the existing inventory movements page, but adapted for HR privacy:

- Compact table.
- Event type, employee, effective date, recorded date, actor, source, risk, proof status.
- Filters by event type, employee, department/location, period, status, proof state.
- Detail drawer for evidence and before/after state.
- Redacted values by default.

Value:

Makes HR changes traceable, improves payroll dispute resolution, and supports audits.

Risks and tradeoffs:

Movement tables can accidentally expose sensitive before/after salary, identifier, or bank data. The table must use redacted summaries and lazy-load sensitive detail only after authorization.

Implementation path:

1. Create movement read model.
2. Normalize events across employee, contract, compensation, payment destination, attendance, and payroll snapshots.
3. Add proof badges and redaction reasons.
4. Add export only after retention/export controls are defined.

Verification:

- Event completeness tests.
- Redaction tests.
- Export permission tests.
- Filter and pagination tests.

## 7. Security, Privacy, And Control Recommendations

### 7.1 Security Posture

The target should be defense-in-depth, tamper-evident, privacy-preserving, and audit-ready. Avoid absolute claims such as "bulletproof." No HRIS is bulletproof; the practical goal is strong preventive controls, fast detection, provable accountability, and controlled recovery.

### 7.2 Access Control

Recommendations:

- Add dedicated `hris.*` permissions instead of overloading `payroll.*`.
- Separate HR admin, payroll admin, manager, employee, accountant, auditor, and owner roles.
- Enforce tenant isolation in service code, not only UI.
- Require fresh authentication for sensitive reveal, download, export, approval, and destructive/corrective actions.
- Add an incompatible-role matrix for segregation of duties.
- Require distinct preparer, approver, and releaser for high-risk workflows above configured thresholds.
- Add periodic access recertification and expiring break-glass access.

### 7.3 Redaction And Sensitive Data Handling

Recommendations:

- Never include salary, legal identifiers, bank details, tax identifiers, social identifiers, or raw document contents in default list payloads.
- Fetch sensitive sections lazily after server authorization.
- Show `Masked` or `Redacted` states with policy and reason.
- Keep public/customer-facing or low-privilege payloads aggregate or masked.
- Add rendered-DOM tests to prove hidden fields are not simply hidden after being sent to the browser.

### 7.4 Hashing, HMAC, Encryption, And Tokens

Hashing is useful in HRIS for evidence fingerprints, integrity checks, non-reversible comparison of normalized values, and audit proof. It does not encrypt data, does not prove who created a value, does not protect low-entropy identifiers by itself, and does not replace authorization.

Recommended distinctions:

| Need | Recommended Control |
|---|---|
| Password storage | Argon2id preferred; bcrypt or scrypt acceptable when operationally supported |
| Evidence fingerprint for documents/snapshots | SHA-256 or SHA-512 over canonical bytes, with stored algorithm/version |
| Low-entropy identifier matching | HMAC-SHA-256 with secret rotation, not plain SHA-256 |
| Payment destination proof | Masked display plus keyed hash/HMAC; encrypt recoverable destination values with managed keys |
| Audit integrity | Append-only records, previous-record/content hash chain, correlation IDs, periodic verification |
| Session/API tokens | High-entropy random tokens or signed tokens with expiry, audience, issuer, rotation, and replay controls |
| Export/download access | Short-lived signed URLs or signed access grants with audit and expiry |

### 7.5 Audit, Retention, And Legal Hold

Recommendations:

- Make audit and certification records append-only.
- Add tamper-evident hash chains for sensitive audit and certification streams.
- Add retention classes by evidence type and jurisdiction.
- Add legal hold and approved disposition workflows.
- Avoid cascade-deleting evidence records that may be needed for labor, tax, or audit disputes.
- Add purge certificates and backup/restore retention tests.
- Export audit/security events to SIEM or a monitored evidence sink.

### 7.6 Production Release Blockers

Unrestricted production should remain blocked until:

- Country-pack approvals cover every enabled statutory family and effective window.
- Live payment-provider settlement evidence and authority acceptance evidence pass.
- Retention, legal hold, and tamper-evident archive controls operate successfully.
- Contract, termination, compensation, attendance, payment, declaration, and close workflows meet the approved SoD matrix.
- Historical assignment/run backfill and reconciliation have signed results.
- Authenticated browser, accessibility, mobile, and RBAC-negative tests pass on the release build.
- A clean committed build produces a signed, current final-readiness attestation tied to commit SHA, environment, tenant/country scope, evidence freshness, and functional owner signoff.

## 8. UI/UX Proposal

### 8.1 Dedicated People Workspace

Create a dedicated People/HRIS workspace beside payroll.

Recommended route:

- Use `/dashboard/people` for the product-facing HRIS workspace.
- Keep `/dashboard/payroll/*` stable for payroll runs, payment, statutory, payslip, and close controls.

Reason:

Users should not have to understand payroll readiness screens to manage HR operations. Payroll should remain the certified calculation and payment engine, while People/HRIS becomes the workplace for employee truth, lifecycle, organization, time, leave, documents, and approvals.

### 8.2 Dashboard Design System

All HRIS authenticated screens should follow Stoquify's command-center design system:

- Dark dashboard canvas.
- `.dashboard-landing-theme dark`.
- `.dashboard-landing-content`.
- `--dash-*` tokens.
- Compact, scannable tables.
- Shared primitives: command brief, status strip, KPI/status row, action queue, evidence/proof strip, workbench table, and detail drawer.
- Every screen must answer: What is the state? What is the risk? What is the action? What is the proof?

Avoid:

- Decorative dashboards.
- Route-local palettes.
- Duplicated cards.
- Raw business truth invented in UI components.
- Loading sensitive data into the DOM and hiding it visually.

### 8.3 Core Screens

People dashboard:

- Workforce state: active employees, starters, leavers, unmapped users, contract readiness.
- Risk: expiring contracts/documents, missing evidence, attendance exceptions, pending approvals.
- Action: onboarding/offboarding tasks, document review, attendance corrections, salary/destination approvals.
- Proof: source freshness, HR evidence coverage, certified payroll-input status.

Employee directory:

- Compact, searchable table.
- Privacy-safe columns.
- Filters by status, location, department, readiness, proof state.
- No raw salary, bank, social, tax, or document values in list payloads.

Employee profile:

- Header with display name, employee number, status, job, department, location, source freshness.
- Tabs for overview, employment, time/leave, documents, compensation, payroll, and history.
- Compensation and identifiers permission-gated and redacted by default.

Organization:

- Phase 1 label: Managed locations and teams.
- Later: org units, positions, reporting lines, delegations, historical manager scope.

Time and leave:

- Attendance summaries, exceptions, corrections, freeze status.
- Leave balances, policies, requests, approvals, team calendar.

Document evidence:

- Metadata-first register.
- Validity, expiry, retention class, owner, proof hash, access decision.
- Raw files behind short-lived authorized access.

Self-service:

- My profile.
- My employment.
- My documents.
- My leave/time.
- My payment-destination request.
- My payslips.

Manager workspace:

- Scoped team roster.
- Availability and exceptions.
- Approval queues.
- Onboarding/offboarding tasks.
- Team readiness without sensitive salary/bank/identifier exposure.

## 9. Data Architecture Proposal

### 9.1 Phase 1: Facade Before Schema Split

Do not immediately rename or migrate every payroll table. Introduce an HRIS facade first:

- `services/hris/employee.service.ts`
- `services/hris/lifecycle.service.ts`
- `services/hris/org.service.ts`
- `services/hris/contract.service.ts`
- `services/hris/compensation.service.ts`
- `services/hris/time-leave.service.ts`
- `services/hris/document-evidence.service.ts`
- `services/hris/movement-history.service.ts`

This lets the product create the correct ownership boundary without destabilizing payroll.

During this phase, avoid duplicate truth:

- Keep the existing employee row as the compatibility identity record.
- Make HRIS services the only writer for people-source facts.
- Treat payroll snapshots as immutable evidence copies, not editable HR truth.
- Block direct legacy writes after cutover with database privileges, service checks, or triggers.
- Compare canonical-versus-projection hashes before removing compatibility columns.

### 9.2 Phase 2: Dedicated HRIS Models

After the facade is stable, add dedicated models where payroll-named tables are insufficient:

- `HrisEmployee` or a mapped/renamed canonical employee identity, without creating a parallel employee master.
- `HrisEmployeeUserLink`
- `HrisEmployment`
- `HrisEmploymentVersion`
- `HrisLegalEmployer`
- `HrisEmployeeLifecycleEvent`
- `HrisOrgUnit`
- `HrisJob`
- `HrisPosition`
- `HrisPositionAssignment`
- `HrisManagerAssignment`
- `HrisCostCenterAllocation`
- `HrisReportingLine`
- `HrisManagerDelegation`
- `HrisContract`
- `HrisContractAmendment`
- `HrisCompensationVersion`
- `HrisCompensationComponentAssignment`
- `HrisBenefitPlan`
- `HrisBenefitEnrollment`
- `HrisPaymentDestinationVersion`
- `HrisDocument`
- `HrisDocumentVersion`
- `HrisDocumentLink`
- `HrisDocumentEvidence`
- `HrisWorkCalendar`
- `HrisSchedule`
- `HrisScheduleAssignment`
- `HrisTimeEntry`
- `HrisLeavePolicy`
- `HrisLeaveBalance`
- `HrisLeaveRequest`
- `HrisLeaveAccount`
- `HrisLeaveEvent`
- `HrisOvertimeRequest`
- `HrisTimeCorrection`
- `HrisAttendanceEntry`
- `HrisAttendanceCorrection`
- `HrisPayrollInputCertification`

Use half-open effective-date ranges for payroll-affecting facts:

```text
validFrom <= asOf < validTo
validTo = null means unbounded
```

Use date-only validity for employment, contract, compensation, and assignment facts. Use timestamped event times for approvals, recordings, signatures, imports, and corrections. Corrections should insert new versions and reference the superseded record; they should not rewrite historical content.

Priority database constraints:

- Composite tenant foreign keys such as `(organizationId, employeeId)`.
- Database checks for date ordering, nonnegative amounts/minutes, status/evidence consistency, and balance arithmetic.
- Exclusion or equivalent constraints preventing overlapping active ranges for employment, contracts, position/manager assignments, base compensation, component assignments, schedule assignments, and payment destinations.
- Partial unique indexes for open salary-change requests, open payment-destination requests, current attendance certifications, and active payroll runs.
- FK-leading indexes for child relationships.
- Mandatory idempotency keys after historical nulls are backfilled.

### 9.3 Phase 3: Payroll Consumption Contract

Payroll should consume only certified HRIS snapshots:

- Employee identity snapshot.
- Active contract snapshot.
- Compensation/rubrique snapshot.
- Payment destination proof hash.
- Attendance/time/leave snapshot.
- Certification hash.
- Source freshness and blockers.
- Corrected-from linkage where applicable.

Payroll should fail closed if required HRIS proof is absent, stale, mismatched, or outside the payroll period.

Migration and backfill risks:

- Reconcile the target database's Prisma migration history before adding HRIS migrations.
- Mark ambiguous legacy rows as `LEGACY_UNVERIFIED`; do not invent historical HR facts from incomplete free-text or JSON records.
- Convert inclusive end-date conventions carefully if moving to half-open date ranges.
- Audit dirty data before cutover: orphan/cross-tenant user and location links, overlapping contracts or assignments, multiple frozen attendance rows, duplicate active runs, active compensation without evidence, and payment destinations without applied approval.
- Never rewrite posted run lines, payslips, declarations, released payment evidence, or close evidence; add append-only source links or correction records.
- Use expand/contract migrations, concurrent indexes, `NOT VALID` constraints followed by validation, tenant-batched dry runs, reconciliation hashes, and explicit rollback/correction scripts.
## 10. Roadmap

### Phase 0: Boundary And Status Register

Goal:

Make ownership explicit before more HR features are added.

Deliverables:

- Refresh HRIS/payroll status register.
- Add HRIS source-truth map.
- Create `services/hris` facade.
- Add `hris.*` permissions.
- Add route registry entries for People workspace.
- Document payroll consumption contract.

Release gate:

Payroll still works; new people-source mutations are routed through HRIS facade.

### Phase 1: Employee Identity And Lifecycle

Goal:

Turn employee identity into an HRIS-owned profile and lifecycle workflow.

Deliverables:

- Employee directory.
- Employee profile.
- Lifecycle event/workflow model.
- Onboarding/offboarding task queue.
- Employee movement history.

Release gate:

Tenant/RBAC/redaction tests pass; payroll readiness still consumes certified HRIS facts.

### Phase 2: Organization And Manager Scope

Goal:

Move from location-only manager scope toward effective-dated organization authority.

Deliverables:

- Managed locations/team workspace.
- Org units/jobs/positions.
- Reporting-line assignments.
- Delegation model.
- Manager approval scopes.

Release gate:

Manager negative access tests pass; historical scope is traceable.

### Phase 3: Contracts, Documents, Compensation

Goal:

Make contract, document, and compensation controls HRIS-owned and audit-grade.

Deliverables:

- Contract lifecycle approvals.
- Document evidence register.
- Retention/legal hold model.
- Compensation assignment controls.
- Benefit/deduction eligibility.
- Approval completeness and SoD matrix.

Release gate:

Sensitive data redaction, document access, SoD, and evidence tests pass.

### Phase 4: Time, Leave, Attendance

Goal:

Create operational time/leave workflows and certified payroll input snapshots.

Deliverables:

- Leave policy/balance/request/approval.
- Attendance import/entry/correction.
- Schedule/calendar/holiday support.
- Certified period snapshot.
- Payroll readiness fail-closed behavior.

Release gate:

Payroll cannot run from mutable or uncertified time/leave data.

### Phase 5: Employee And Manager Self-Service

Goal:

Open safe HR workflows to employees and managers.

Deliverables:

- `/dashboard/people/me`
- `/dashboard/people/team`
- Own profile, docs, leave/time, payslips.
- Manager queues for scoped tasks.
- Browser/accessibility/mobile proof.

Release gate:

Own-record and manager-scope negative tests pass; rendered DOM redaction tests pass.

### Phase 6: Production Certification

Goal:

Convert controlled pilot readiness into broader production readiness.

Deliverables:

- Qualified country-pack signoff.
- Live provider/authority certification.
- Historical backfill and reconciliation.
- Immutable audit/evidence archive.
- Release attestation tied to commit SHA and environment.
- Accountant/compliance/security/ops signoff.

Release gate:

Unrestricted production remains no-go until all blockers are closed with current evidence.

### Phase 7: Extended HRIS

Goal:

Add enterprise breadth after the source-truth spine is stable.

Candidate modules:

- Recruiting/ATS.
- Benefits administration.
- Performance management.
- Learning/training.
- Workforce planning.
- Advanced HR analytics.

Release gate:

Each module must use the same HRIS boundary, RBAC, privacy, evidence, and release governance.

## 11. Testing And Verification Plan

Minimum release gates for any HRIS production slice:

| Gate | Required Verification |
|---|---|
| Prisma/schema | `npm run prisma:validate`, migration diff review, backfill dry run |
| Type safety | `npm run typecheck` |
| Lint/static checks | `npm run lint` and repository policy gates |
| HRIS services | Unit tests for tenant isolation, state transitions, redaction, and evidence hashes |
| Payroll integration | Tests proving payroll consumes certified HRIS snapshots and fails closed without proof |
| RBAC | Negative tests for HR, payroll, manager, employee, accountant, auditor, owner |
| Privacy | Tests proving sensitive fields are absent from list responses and rendered DOM |
| Audit | Tests for append-only behavior, correlation IDs, event completeness, and denied-action logging |
| SoD | Tests for incompatible roles and requester/approver/releaser separation |
| UI | Authenticated Playwright smoke at desktop/tablet/mobile widths |
| Accessibility | Keyboard navigation, focus states, labels, no color-only status, Axe checks |
| Release | Machine-readable final readiness attestation tied to commit SHA, environment, country/tenant scope, and evidence freshness |

## 12. Honest Production Readiness Statement

Current status:

Stoquify is strong enough to continue controlled pilot work for implemented, evidence-gated payroll workflows. It has more serious controls than a basic HR/payroll CRUD module.

Not ready:

It is not yet ready to be called a full enterprise HRIS or unrestricted production HRIS/payroll system.

Why:

- HRIS truth is still embedded mainly in payroll services/tables.
- There is no standalone `services/hris` or `actions/hris` boundary observed.
- No dedicated People/HRIS route family was observed.
- Time and leave are payroll input snapshots, not a full HRIS time/leave module.
- Self-service is mostly payslip-centered.
- Manager scope is location-based, not a true reporting-line model.
- Retention/legal hold and archive controls need hardening.
- SoD needs a platform-wide incompatible-role matrix.
- Statutory country-pack breadth and live authority/provider certifications remain blockers.
- Browser/accessibility/mobile release evidence must be current and release-tied.
- Several roadmap/report artifacts and current controls may be working-tree evidence rather than deployed proof.

Recommended decision:

Continue, but continue honestly. Build the HRIS/People boundary next, preserve payroll's evidence-gated kernel, and keep unrestricted production blocked until the release gates are satisfied.

## 13. Immediate Next Actions

1. Create the `services/hris` facade and HRIS source-truth map.
2. Add `hris.*` permissions and separate HRIS roles from payroll roles.
3. Add `/dashboard/people` route shell using existing dashboard primitives.
4. Build employee directory, employee profile, and lifecycle timeline over current data.
5. Add HR movement-history read model with strict redaction.
6. Add manager workspace using current location scope, labeled accurately.
7. Design dedicated document evidence and retention/legal-hold model.
8. Design time/leave contracts before building leave request UI.
9. Tie every payroll run to certified HRIS input proof and fail closed on missing/stale proof.
10. Create release attestation that blocks on dirty/uncommitted artifacts, stale evidence, missing live proof, and absent owner signoffs.

## 14. Final Recommendation

The product direction is sound: Stoquify should become a full enterprise HRIS plus payroll assurance system. The current codebase already has enough controlled payroll and HR source-data foundation to make that realistic.

The main risk is overclaiming readiness before the HRIS boundary, lifecycle breadth, privacy controls, retention, live statutory/provider evidence, self-service, and release attestation are complete.

The professional path is:

- Do not rewrite payroll.
- Do not keep expanding HR truth inside payroll-only screens.
- Build People/HRIS as the owner of employee truth.
- Let payroll consume certified HRIS snapshots.
- Keep accounting and assurance tied to proof.
- Release in narrow, evidenced slices.

This approach gives Stoquify a credible route to a modern, enterprise-grade HRIS without weakening the controls that already make the payroll foundation valuable.



