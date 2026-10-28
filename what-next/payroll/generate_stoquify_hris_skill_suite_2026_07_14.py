from pathlib import Path


ROOT = Path("what-next/payroll/stoquify-hris-skill-suite-drafts-2026-07-14")

COMMON_LAW = [
    "HRIS owns people truth.",
    "Payroll consumes certified HRIS snapshots.",
    "Accounting records money truth.",
    "Assurance proves the whole chain.",
    "UI never creates business truth.",
]

COMMON_EVIDENCE = [
    "docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md",
    "docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md",
    "docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md",
    "docs/HR-Payroll/",
    "what-next/payroll/",
]

COMMON_RISKS = [
    "Do not duplicate employee master truth.",
    "Do not let payroll invent mutable HRIS facts.",
    "Do not run payroll from uncertified, stale, or UI-derived HRIS inputs.",
    "Do not leak salary, identifiers, payment destination data, raw documents, provider payloads, or authority payloads.",
    "Do not broaden work outside the active slice.",
    "Do not claim unrestricted production readiness from controlled-pilot evidence.",
]


SKILLS = [
    {
        "name": "stoquify-hris-00-orchestrator",
        "title": "Stoquify HRIS 00 Orchestrator",
        "description": "Select the next safe Stoquify HRIS People Core slice and keep the HRIS/payroll roadmap in dependency order. Use when asked to run, continue, pilot, or coordinate the HRIS skill suite without breaking payroll, accounting, RBAC, redaction, audit, evidence, or saved-report handoffs.",
        "purpose": "Select the next safe People Core skill, prevent payroll-first drift, and save the ordered handoff report.",
        "trigger": "Use when the user asks to run the Stoquify HRIS skill suite, continue HRIS work, choose the next step, or pilot the installed skills.",
        "prerequisites": ["Readable HRIS implementation analysis and targeted skill-system blueprint.", "Readable `docs/HR-Payroll/` and `what-next/payroll/` evidence."],
        "evidence": COMMON_EVIDENCE + ["git status", "installed `stoquify-hris-*` skills", "installed `aqstoqflow-hris-payroll-*` skills"],
        "touch": ["Planning reports only unless a downstream skill is explicitly selected."],
        "may": ["Save an orchestration report.", "Name the next handoff skill and stop conditions."],
        "must_not": ["Change production code.", "Change database schema.", "Overwrite installed payroll skills."],
        "gates": ["Report consistency grep.", "No-production-code-change check for the orchestrator run."],
        "report": "what-next/payroll/STOQUIFY_HRIS_ORCHESTRATOR_REPORT_<date>.md",
        "handoff": "Hand off to `stoquify-hris-01-current-state-register` unless a current register already exists and points to a later safe skill.",
        "stop": "Stop if required roadmap or status documents conflict and cannot be reconciled from repo evidence.",
        "success": "One next skill is selected with prerequisites, verification, blockers, and next report path.",
    },
    {
        "name": "stoquify-hris-01-current-state-register",
        "title": "Stoquify HRIS 01 Current State Register",
        "description": "Reconcile the Stoquify HRIS proposal, repo state, and payroll evidence into one current truth register. Use before People Core implementation, after long gaps, or when HRIS/payroll readiness is disputed.",
        "purpose": "Create the canonical current-state register for HRIS, payroll, accounting, RBAC, UI, migration, and release evidence.",
        "trigger": "Use before implementing People Core or when old reports may conflict with newer payroll proof.",
        "prerequisites": ["Orchestrator report or explicit user request.", "Readable HRIS proposal and prior payroll reports."],
        "evidence": COMMON_EVIDENCE + ["prisma/schema.prisma", "services/payroll/", "actions/payroll/", "components/payroll/", "app/[locale]/(dashboard)/dashboard/payroll/", "config/permissions.ts", "config/sidebar.ts", "lib/security/rbac-permissions.ts", "services/security/redaction-policy.service.ts", "services/accounting/", "services/finance/"],
        "touch": ["Status register report.", "Optional supersession map report."],
        "may": ["Save current-state and blocker tables.", "Mark closed, open, superseded, and pilot-only evidence."],
        "must_not": ["Edit production code.", "Treat stale reports as current truth without evidence."],
        "gates": ["Every major blocker class appears in the register.", "Current next handoff is named."],
        "report": "what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_<date>.md",
        "handoff": "Hand off to `stoquify-hris-02-people-boundary-facade` when the register is current.",
        "stop": "Stop if evidence conflicts require owner decision.",
        "success": "The register identifies current posture, open blockers, closed evidence, and next safe implementation skill.",
    },
    {
        "name": "stoquify-hris-02-people-boundary-facade",
        "title": "Stoquify HRIS 02 People Boundary Facade",
        "description": "Create or design the first-class Stoquify HRIS People boundary over existing payroll source storage. Use when adding `services/hris`, `actions/hris`, People Core read models, or facade-first HRIS ownership without duplicating employee truth.",
        "purpose": "Introduce the HRIS facade so new people-source reads and mutations have one upstream owner before payroll consumes snapshots.",
        "trigger": "Use for the first People Core code slice or a detailed facade design pass.",
        "prerequisites": ["Current-state register.", "Source-truth map.", "Decision to keep facade-first storage."],
        "evidence": COMMON_EVIDENCE + ["prisma/schema.prisma", "services/payroll/employee.service.ts", "services/payroll/contract.service.ts", "services/payroll/compensation.service.ts", "services/payroll/payment-evidence.service.ts", "services/payroll/payroll-control.service.ts", "actions/payroll/"],
        "touch": ["services/hris/", "actions/hris/", "service tests", "what-next/payroll report"],
        "may": ["Add HRIS facade services.", "Add read-model contracts.", "Add narrow tests proving payroll storage is wrapped, not duplicated."],
        "must_not": ["Rename payroll tables.", "Create a second employee master.", "Break existing payroll routes."],
        "gates": ["No duplicate employee truth.", "Payroll focused tests still pass.", "Tenant and redaction tests cover HRIS facade reads."],
        "report": "what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-03-permissions-and-route-shell`.",
        "stop": "Stop if the facade would require schema migration before ownership is agreed.",
        "success": "`services/hris` owns new People Core access while payroll compatibility remains intact.",
    },
    {
        "name": "stoquify-hris-03-permissions-and-route-shell",
        "title": "Stoquify HRIS 03 Permissions And Route Shell",
        "description": "Add Stoquify HRIS permissions, risk classifications, and the `/dashboard/people` route shell. Use when separating HRIS access from payroll access and creating the People workspace entry point.",
        "purpose": "Create the access and route shell that lets HRIS become visible without widening payroll permissions.",
        "trigger": "Use after the HRIS facade exists or when defining People workspace access contracts.",
        "prerequisites": ["People boundary facade or approved facade design.", "Current RBAC map."],
        "evidence": COMMON_EVIDENCE + ["config/permissions.ts", "config/sidebar.ts", "lib/security/rbac-permissions.ts", "app/[locale]/(dashboard)/dashboard/payroll/", "config/__tests__/permissions.test.ts", "config/__tests__/sidebar.test.ts"],
        "touch": ["config/permissions.ts", "config/sidebar.ts", "lib/security/rbac-permissions.ts", "app/[locale]/(dashboard)/dashboard/people/", "route/access tests", "report"],
        "may": ["Add `hris.*` permissions.", "Add People sidebar entries.", "Add route shell and denied/empty states."],
        "must_not": ["Reuse payroll manage permissions for broad HRIS actions.", "Expose People routes without route-level access checks."],
        "gates": ["HRIS/payroll permissions are separate.", "Sidebar and route-access tests pass.", "Denied state is safe and redacted."],
        "report": "what-next/payroll/STOQUIFY_HRIS_PERMISSIONS_ROUTE_SHELL_<date>.md",
        "handoff": "Hand off to `stoquify-hris-04-employee-identity-profile`.",
        "stop": "Stop if permission taxonomy conflicts with module entitlement strategy.",
        "success": "People route shell is present, permission-gated, and not payroll-permission dependent.",
    },
    {
        "name": "stoquify-hris-04-employee-identity-profile",
        "title": "Stoquify HRIS 04 Employee Identity Profile",
        "description": "Build Stoquify HRIS employee identity, directory, profile, duplicate detection, user mapping, and redacted profile read models. Use when implementing People Core employee master behavior over existing payroll employee storage.",
        "purpose": "Make the employee profile the HRIS-owned source for identity, status, user mapping, readiness, and profile history.",
        "trigger": "Use after People route shell and permissions exist.",
        "prerequisites": ["HRIS facade.", "HRIS permissions and route shell."],
        "evidence": COMMON_EVIDENCE + ["prisma/schema.prisma", "services/payroll/employee.service.ts", "actions/payroll/payroll-employee.actions.ts", "services/payroll/__tests__/payroll-employee.service.test.ts"],
        "touch": ["services/hris/employee.service.ts", "actions/hris/", "components/hris or People route components", "tests", "report"],
        "may": ["Add redacted employee directory/profile read models.", "Add duplicate and stale user mapping checks.", "Add lifecycle timeline read hooks from audit/business events."],
        "must_not": ["Expose raw identifiers, salary, or payment destination in list payloads.", "Trust client-provided employee ids for own-record access."],
        "gates": ["Tenant isolation tests.", "Duplicate prevention tests.", "User-to-employee denial tests.", "Redacted payload tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_IDENTITY_PROFILE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-05-lifecycle-workflows`.",
        "stop": "Stop if user-to-employee mapping cannot be resolved tenant-safely.",
        "success": "HRIS can explain one tenant-scoped employee profile without leaking sensitive fields.",
    },
    {
        "name": "stoquify-hris-05-lifecycle-workflows",
        "title": "Stoquify HRIS 05 Lifecycle Workflows",
        "description": "Model Stoquify HRIS onboarding, transfer, promotion, suspension, termination, offboarding, and rehire workflows. Use when lifecycle changes must be request-reviewed-applied with audit and payroll readiness impact.",
        "purpose": "Replace ad hoc employee status edits with traceable lifecycle workflows.",
        "trigger": "Use after employee identity/profile read models are safe.",
        "prerequisites": ["Employee identity profile.", "Audit event sources.", "Maker-checker decision for high-risk HR changes."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/employee.service.ts", "services/payroll/contract.service.ts", "services/payroll/payroll-control.service.ts", "prisma/schema.prisma", "services/security/redaction-policy.service.ts"],
        "touch": ["services/hris/lifecycle.service.ts", "actions/hris/", "tests", "report"],
        "may": ["Add lifecycle request/read models.", "Block payroll readiness on incomplete starter/leaver facts.", "Emit audit and business events."],
        "must_not": ["Silently mutate employee status after payroll snapshot.", "Bypass contract, document, or payroll readiness effects."],
        "gates": ["Maker-checker tests.", "Starter/leaver payroll readiness tests.", "Audit timeline tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_LIFECYCLE_WORKFLOWS_<date>.md",
        "handoff": "Hand off to `stoquify-hris-06-org-position-manager-scope`.",
        "stop": "Stop if lifecycle changes need new schema and no expand/contract plan exists.",
        "success": "Lifecycle changes are traceable, approved, and reflected in payroll readiness.",
    },
    {
        "name": "stoquify-hris-06-org-position-manager-scope",
        "title": "Stoquify HRIS 06 Org Position Manager Scope",
        "description": "Build Stoquify HRIS organization units, positions, reporting lines, manager scope, delegation, and effective-dated assignment rules. Use when moving beyond location-based manager scope.",
        "purpose": "Create honest manager authority and org structure without overstating current location-scope behavior.",
        "trigger": "Use before manager self-service, approvals, org reporting, or delegated authority workflows.",
        "prerequisites": ["Employee identity profile.", "Current manager/location scope evidence."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/org-manager-scope.service.ts", "services/payroll/__tests__/org-manager-scope.service.test.ts", "prisma/schema.prisma", "config/sidebar.ts"],
        "touch": ["services/hris/org.service.ts", "manager-scope tests", "People route/read models", "report"],
        "may": ["Add compatibility wrapper over current location scope.", "Design effective-dated org/position assignment models.", "Add manager negative tests."],
        "must_not": ["Call location-managed employees direct reports unless reporting lines exist.", "Expose salary or identifiers to managers by default."],
        "gates": ["Manager sees only assigned scope.", "Cross-tenant and out-of-scope denial tests.", "Assignment overlap checks when schema is introduced."],
        "report": "what-next/payroll/STOQUIFY_HRIS_ORG_POSITION_MANAGER_SCOPE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-07-contract-document-evidence`.",
        "stop": "Stop if manager scope cannot be proven without leaking broader employee data.",
        "success": "The system distinguishes location scope from reporting-line authority and tests the boundary.",
    },
    {
        "name": "stoquify-hris-07-contract-document-evidence",
        "title": "Stoquify HRIS 07 Contract Document Evidence",
        "description": "Wrap Stoquify contracts and HR document evidence behind HRIS approval, retention, legal-hold, redaction, and secure-access controls. Use before exposing contract or document workflows in People Core.",
        "purpose": "Move contracts and HR documents into HRIS-owned evidence workflows with safe access boundaries.",
        "trigger": "Use after employee identity and org scope are understood.",
        "prerequisites": ["Employee identity profile.", "Document redaction and retention decisions."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/contract.service.ts", "actions/payroll/payroll-contract.actions.ts", "services/security/redaction-policy.service.ts", "prisma/schema.prisma"],
        "touch": ["services/hris/contract.service.ts", "services/hris/document-evidence.service.ts", "tests", "report"],
        "may": ["Wrap current contract model.", "Add document metadata/access decisions.", "Add contract approval and expiry risk views."],
        "must_not": ["Expose raw documents without short-lived authorized access.", "Delete legal/audit evidence needed for disputes."],
        "gates": ["Contract overlap tests.", "Signed evidence tests.", "Document access denial tests.", "Export redaction tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_CONTRACT_DOCUMENT_EVIDENCE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-08-compensation-benefits-control`.",
        "stop": "Stop if raw storage, malware scanning, or retention requirements are not decided before download exposure.",
        "success": "Contracts and documents are approval-backed, redacted, and payroll-readiness aware.",
    },
    {
        "name": "stoquify-hris-08-compensation-benefits-control",
        "title": "Stoquify HRIS 08 Compensation Benefits Control",
        "description": "Move Stoquify employee-level compensation, benefits, allowances, deductions, and payroll-affecting assignments behind HRIS approval and evidence controls. Use when compensation truth must be separated from payroll calculation formulas.",
        "purpose": "Make employee compensation inputs HRIS-owned while country packs own statutory meaning and accounting owns posting maps.",
        "trigger": "Use after contract and document evidence boundaries are safe.",
        "prerequisites": ["Contract/document evidence workflow.", "Payroll component/country-pack ownership map."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/compensation.service.ts", "actions/payroll/payroll-compensation.actions.ts", "services/payroll/payroll-control.service.ts", "lib/security/rbac-permissions.ts"],
        "touch": ["services/hris/compensation.service.ts", "actions/hris/", "tests", "report"],
        "may": ["Add HRIS compensation assignments/read models.", "Require maker-checker for salary changes.", "Attach evidence and effective dates."],
        "must_not": ["Invent statutory formula meaning.", "Expose compensation in manager or employee lists without explicit permission."],
        "gates": ["Salary request/approve/apply separation tests.", "Stale compensation readiness blocker tests.", "Country-pack separation tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_COMPENSATION_BENEFITS_CONTROL_<date>.md",
        "handoff": "Hand off to `stoquify-hris-09-payment-destination-privacy`.",
        "stop": "Stop if employee compensation truth cannot be separated from payroll component definitions.",
        "success": "Approved compensation source data can be certified for payroll without broad leakage.",
    },
    {
        "name": "stoquify-hris-09-payment-destination-privacy",
        "title": "Stoquify HRIS 09 Payment Destination Privacy",
        "description": "Own Stoquify employee payment-destination request, approval, privacy, masking, hashing, fresh-auth, and payroll-release readiness. Use when moving destination evidence from payroll-only screens into HRIS People Core.",
        "purpose": "Make approved payment destination an HRIS-owned sensitive workflow consumed by payroll release.",
        "trigger": "Use after compensation controls or when payment-destination privacy is changed.",
        "prerequisites": ["Employee identity profile.", "RBAC/fresh-auth policy for sensitive HRIS actions."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/payment-evidence.service.ts", "actions/payroll/payroll-payment-evidence.actions.ts", "services/payroll/payroll-control.service.ts", "services/security/redaction-policy.service.ts"],
        "touch": ["services/hris/payment-destination.service.ts", "actions/hris/", "tests", "report"],
        "may": ["Wrap existing payment-destination change requests.", "Add HRIS self-service request flow.", "Propagate approved hashes to payroll proof."],
        "must_not": ["Persist or expose raw bank/mobile-money values in reports.", "Allow requester and approver to be the same actor for high-risk changes."],
        "gates": ["Fresh-auth tests.", "Masked/hash-only payload tests.", "Payment release readiness tests.", "Maker-checker tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_PAYMENT_DESTINATION_PRIVACY_<date>.md",
        "handoff": "Hand off to `stoquify-hris-10-time-leave-attendance-engine`.",
        "stop": "Stop if encryption/HMAC and reveal/export policy are undefined for recoverable sensitive data.",
        "success": "Payment destinations are approved, masked/hash-backed, fresh-auth protected, and payroll-consumable.",
    },
    {
        "name": "stoquify-hris-10-time-leave-attendance-engine",
        "title": "Stoquify HRIS 10 Time Leave Attendance Engine",
        "description": "Build Stoquify HRIS schedules, calendars, holidays, leave policies, balances, requests, approvals, overtime, attendance imports, corrections, and payroll freeze contracts. Use before payroll relies on full time/leave truth.",
        "purpose": "Move from aggregate payroll attendance snapshots to operational time, leave, attendance, and overtime source truth.",
        "trigger": "Use after core employee, org, contract, compensation, and destination controls are safe.",
        "prerequisites": ["Employee identity.", "Manager scope.", "Contract and compensation controls."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/payroll-control.service.ts", "components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx", "services/payroll/__tests__/payroll-control.service.test.ts"],
        "touch": ["services/hris/time-leave.service.ts", "actions/hris/", "People route components", "tests", "report"],
        "may": ["Add time/leave contracts.", "Add approval and correction chains.", "Produce certified period freeze proof for payroll."],
        "must_not": ["Let payroll calculate from mutable time data.", "Build leave UI before policy/balance/readiness contracts exist."],
        "gates": ["Unapproved time/leave blocks payroll.", "Approved freeze creates immutable input proof.", "Corrections create diff evidence.", "Manager approval tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_ENGINE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-11-approval-inbox`.",
        "stop": "Stop if country/company leave policy rules are not modeled enough to avoid incorrect payroll impact.",
        "success": "Payroll can consume certified time/leave/attendance proof instead of raw mutable inputs.",
    },
    {
        "name": "stoquify-hris-11-approval-inbox",
        "title": "Stoquify HRIS 11 Approval Inbox",
        "description": "Create Stoquify HRIS approval inbox and maker-checker flows for lifecycle, contract, document, compensation, payment destination, leave, attendance, and corrections. Use when pending approvals must block readiness safely.",
        "purpose": "Centralize HR and manager approvals with safe states, SoD, audit, and readiness blockers.",
        "trigger": "Use after the first workflow domains exist and before self-service is opened.",
        "prerequisites": ["At least one HRIS workflow domain with request/review/apply states.", "RBAC/fresh-auth policy."],
        "evidence": COMMON_EVIDENCE + ["actions/payroll/", "services/payroll/compensation.service.ts", "services/payroll/payment-evidence.service.ts", "services/payroll/contract.service.ts"],
        "touch": ["services/hris/approval-inbox.service.ts", "actions/hris/", "components/hris/", "tests", "report"],
        "may": ["Add approval read models.", "Add deny/approve/apply state transitions.", "Add readiness blockers for pending approval."],
        "must_not": ["Use client state as approval truth.", "Allow high-risk self-approval."],
        "gates": ["SoD matrix tests.", "Pending approval blocker tests.", "Denied/error-state safety tests.", "Audit event tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_APPROVAL_INBOX_<date>.md",
        "handoff": "Hand off to `stoquify-hris-12-movement-history`.",
        "stop": "Stop if workflow states are not explicit enough to audit.",
        "success": "Approvals are visible, scoped, auditable, and tied to readiness.",
    },
    {
        "name": "stoquify-hris-12-movement-history",
        "title": "Stoquify HRIS 12 Movement History",
        "description": "Build Stoquify HRIS movement history from audit logs, business events, lifecycle events, contracts, compensation, documents, payment destination, attendance freezes, and payroll snapshots. Use when HR changes must be explainable and redacted.",
        "purpose": "Create the evidence timeline that explains employee and payroll source changes without leaking sensitive details.",
        "trigger": "Use after approval workflows or when HR history/reporting is requested.",
        "prerequisites": ["Employee profile.", "Audit/business event sources.", "Redaction policy."],
        "evidence": COMMON_EVIDENCE + ["prisma/schema.prisma", "services/security/redaction-policy.service.ts", "services/payroll/", "services/accounting/close-assurance-pack.service.ts"],
        "touch": ["services/hris/movement-history.service.ts", "components/hris/", "tests", "report"],
        "may": ["Add movement read model.", "Normalize event types.", "Add proof badges and redaction reasons."],
        "must_not": ["Expose raw before/after sensitive values.", "Treat missing audit events as proof."],
        "gates": ["Redacted event payload tests.", "Tenant-scoped filters.", "Proof badge consistency checks."],
        "report": "what-next/payroll/STOQUIFY_HRIS_MOVEMENT_HISTORY_<date>.md",
        "handoff": "Hand off to `stoquify-hris-13-payroll-readiness-contract`.",
        "stop": "Stop if source events are too sparse to support an honest history claim.",
        "success": "HRIS can explain person and payroll-input movement with safe, scoped evidence.",
    },
    {
        "name": "stoquify-hris-13-payroll-readiness-contract",
        "title": "Stoquify HRIS 13 Payroll Readiness Contract",
        "description": "Connect Stoquify People Core facts to payroll input readiness, certified snapshots, correction diffing, and payroll engine consumption. Use when proving payroll consumes HRIS proof only.",
        "purpose": "Bind HRIS People Core outputs to the existing payroll readiness and snapshot chain.",
        "trigger": "Use after People Core source domains produce enough approved facts for payroll readiness.",
        "prerequisites": ["Employee, contract, compensation, payment destination, and time/leave readiness sources.", "Existing payroll readiness and snapshot reports."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/payroll-control.service.ts", "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md", "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md", "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md"],
        "touch": ["services/hris/readiness.service.ts", "services/payroll/payroll-control.service.ts", "tests", "report"],
        "may": ["Add HRIS readiness export contract.", "Add source hash propagation.", "Add fail-closed stale proof handling."],
        "must_not": ["Let payroll read live mutable HRIS tables when certified snapshot proof is required."],
        "gates": ["Payroll consumes certified HRIS proof only.", "Stale or missing proof fails closed.", "Existing payroll-control tests remain green."],
        "report": "what-next/payroll/STOQUIFY_HRIS_PAYROLL_READINESS_CONTRACT_<date>.md",
        "handoff": "Hand off to `stoquify-hris-14-employee-self-service`.",
        "stop": "Stop if HRIS source proof cannot be reconciled with existing payroll run metadata.",
        "success": "Payroll readiness and snapshots can cite HRIS People Core proof end to end.",
    },
    {
        "name": "stoquify-hris-14-employee-self-service",
        "title": "Stoquify HRIS 14 Employee Self Service",
        "description": "Open Stoquify HRIS employee self-service for own profile, documents, leave/time, payment requests, correction requests, and payslips. Use only after identity, redaction, own-record resolution, and readiness contracts are safe.",
        "purpose": "Give employees safe own-record workflows without cross-employee leakage.",
        "trigger": "Use after readiness contract and movement history are safe.",
        "prerequisites": ["Own employee resolver.", "Redacted employee profile.", "Document/payment/time workflow controls.", "Payslip self-service compatibility."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/payslip-self-service.service.ts", "actions/payroll/payroll-payslip-self-service.actions.ts", "components/payroll/PayrollPayslipSelfService.tsx", "tests/e2e/payroll-authenticated-smoke.spec.ts"],
        "touch": ["app/[locale]/(dashboard)/dashboard/people/me/", "services/hris/self-service.service.ts", "actions/hris/", "components/hris/", "tests", "report"],
        "may": ["Add own profile and request views.", "Reuse payslip self-service.", "Add fresh-auth export/reveal gates."],
        "must_not": ["Trust client-provided employee id.", "Preload hidden sensitive fields into the DOM."],
        "gates": ["Employee sees only own data.", "DOM redaction tests.", "Fresh-auth export tests.", "Route smoke where feasible."],
        "report": "what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_SELF_SERVICE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-15-manager-self-service`.",
        "stop": "Stop if own-record resolver cannot be proven tenant-safe.",
        "success": "Employee self-service is useful, scoped, audited, and redacted.",
    },
    {
        "name": "stoquify-hris-15-manager-self-service",
        "title": "Stoquify HRIS 15 Manager Self Service",
        "description": "Open Stoquify manager self-service for team roster, approvals, readiness, onboarding/offboarding tasks, documents, leave, and attendance without broad sensitive data. Use after manager scope is proven.",
        "purpose": "Give managers operational team workflows while keeping salary, identifiers, and out-of-scope employees protected.",
        "trigger": "Use after manager scope, approvals, and employee self-service controls exist.",
        "prerequisites": ["Manager scope tests.", "Approval inbox.", "Redaction policy."],
        "evidence": COMMON_EVIDENCE + ["services/payroll/org-manager-scope.service.ts", "services/payroll/__tests__/org-manager-scope.service.test.ts", "config/sidebar.ts"],
        "touch": ["app/[locale]/(dashboard)/dashboard/people/team/", "services/hris/manager-self-service.service.ts", "components/hris/", "tests", "report"],
        "may": ["Add team roster/readiness views.", "Add scoped approval queues.", "Add safe task status panels."],
        "must_not": ["Expose salary, identifiers, bank data, or documents by default.", "Show employees outside manager scope."],
        "gates": ["Scoped manager tests.", "Out-of-scope denial tests.", "No salary/identifier leakage tests.", "Browser route smoke where feasible."],
        "report": "what-next/payroll/STOQUIFY_HRIS_MANAGER_SELF_SERVICE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-16-accounting-finance-assurance-bridge`.",
        "stop": "Stop if current scope is location-only and the requested workflow requires reporting-line authority.",
        "success": "Manager workflows are useful and honest about scope boundaries.",
    },
    {
        "name": "stoquify-hris-16-accounting-finance-assurance-bridge",
        "title": "Stoquify HRIS 16 Accounting Finance Assurance Bridge",
        "description": "Prove Stoquify HRIS changes flow safely through payroll, finance, accounting, data trust, and close assurance. Use when People Core proof must support registers, ledger posting, forecasts, auditor packs, and close blockers.",
        "purpose": "Keep people truth, payroll proof, money truth, and close assurance aligned.",
        "trigger": "Use after People Core and payroll readiness proof are connected.",
        "prerequisites": ["Payroll readiness contract.", "Recent payment/declaration proof.", "Recent accounting close assurance proof."],
        "evidence": COMMON_EVIDENCE + ["services/accounting/data-trust.service.ts", "services/accounting/close-assurance-pack.service.ts", "services/finance/finance-dashboard.service.ts", "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md", "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md"],
        "touch": ["services/accounting/", "services/finance/", "services/hris/", "tests", "report"],
        "may": ["Add HRIS proof references to finance/accounting read models.", "Add close blockers for missing HRIS/payroll proof.", "Add redacted auditor exports."],
        "must_not": ["Expose person-level payroll detail in accounting broad reports.", "Let accounting mutate HR profile truth."],
        "gates": ["Register-to-ledger tieout.", "Close fails on missing HRIS/payroll proof.", "Redacted auditor export tests."],
        "report": "what-next/payroll/STOQUIFY_HRIS_ACCOUNTING_FINANCE_ASSURANCE_BRIDGE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-17-browser-accessibility-rbac-release`.",
        "stop": "Stop if finance/accounting proof would require raw employee-level data outside authorized contexts.",
        "success": "Finance and close assurance can rely on aggregate/hash-backed HRIS/payroll proof.",
    },
    {
        "name": "stoquify-hris-17-browser-accessibility-rbac-release",
        "title": "Stoquify HRIS 17 Browser Accessibility RBAC Release",
        "description": "Validate Stoquify People and Payroll routes with authenticated browser smoke, responsive screenshots, accessibility checks, RBAC negative tests, and release evidence. Use before release certification or after UI route changes.",
        "purpose": "Prove the HRIS/payroll experience works in real authenticated browser routes and does not leak by role or viewport.",
        "trigger": "Use after People workspace UI is implemented or before release gates.",
        "prerequisites": ["People routes exist.", "Route access and RBAC contracts exist.", "Seed/auth state available or documented blocker."],
        "evidence": COMMON_EVIDENCE + ["playwright.config.ts", "tests/e2e/payroll-authenticated-smoke.spec.ts", "scripts/payroll-browser-smoke.js", "__tests__/payroll-dashboard-routes.smoke.test.tsx", "what-next/payroll/screenshots/"],
        "touch": ["tests/e2e/", "scripts/", "screenshots", "browser evidence reports", "accessibility reports"],
        "may": ["Add route smoke coverage.", "Add accessibility checks.", "Save screenshot/evidence artifacts."],
        "must_not": ["Claim browser readiness from component tests only.", "Ignore mobile/tablet overlap or denied-state failures."],
        "gates": ["Desktop/tablet/mobile smoke.", "RBAC negative route checks.", "Accessibility checks.", "Visual no-overlap checks."],
        "report": "what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RBAC_RELEASE_<date>.md",
        "handoff": "Hand off to `stoquify-hris-18-migration-backfill-pilot`.",
        "stop": "Stop with blocker if auth state, seed data, or dev server is unavailable.",
        "success": "People and payroll routes have current browser, access, and accessibility evidence.",
    },
    {
        "name": "stoquify-hris-18-migration-backfill-pilot",
        "title": "Stoquify HRIS 18 Migration Backfill Pilot",
        "description": "Plan and execute Stoquify HRIS migration, backfill, dry-run, idempotency, reconciliation, rollback, and pilot close signoff. Use before moving real tenants to People Core ownership.",
        "purpose": "Move tenant data safely without corrupting HRIS, payroll, accounting, or audit history.",
        "trigger": "Use after implementation and browser/RBAC gates are ready for pilot data.",
        "prerequisites": ["Implemented People Core slices.", "Schema/backfill plan.", "Pilot tenant scope.", "Rollback/correction plan."],
        "evidence": COMMON_EVIDENCE + ["prisma/migrations/", "scripts/", "what-next/prisma-migration-deployment-readiness.md", "what-next/payroll/*BACKFILL*", "what-next/payroll/*PILOT*"],
        "touch": ["migration/backfill scripts", "dry-run reports", "pilot reports", "tests"],
        "may": ["Add dry-run scripts.", "Add idempotency checks.", "Add reconciliation hashes.", "Add pilot close signoff report."],
        "must_not": ["Mutate production tenant data without dry-run and owner signoff.", "Delete historical evidence records."],
        "gates": ["Dry-run diff.", "Idempotency rerun.", "Rollback/correction simulation.", "Pilot close-pack signoff."],
        "report": "what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_<date>.md",
        "handoff": "Hand off to `stoquify-hris-19-final-readiness`.",
        "stop": "Stop if migration history, tenant data quality, or rollback proof is incomplete.",
        "success": "Pilot migration is reconciled, repeatable, reversible by correction, and signed off.",
    },
    {
        "name": "stoquify-hris-19-final-readiness",
        "title": "Stoquify HRIS 19 Final Readiness",
        "description": "Produce the final Stoquify HRIS/payroll go/no-go decision with evidence completeness, release gates, owner signoff, environment, tenant/country scope, and commit SHA. Use before unrestricted production claims.",
        "purpose": "Make the launch decision explicit, evidence-backed, and honest about scope.",
        "trigger": "Use after all required People Core, payroll, accounting, browser, migration, and release gates are complete.",
        "prerequisites": ["All prior skills complete or explicitly waived with owner/date/risk.", "Current CI and gate evidence.", "Pilot signoff."],
        "evidence": COMMON_EVIDENCE + ["all `STOQUIFY_HRIS_*` reports", "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_FINAL_READINESS_*", "package.json", "CI evidence", "git status"],
        "touch": ["Final readiness report only unless missing evidence requires a blocker report."],
        "may": ["Save go/no-go report.", "Name launch scope.", "List waivers and owners.", "Name residual risks."],
        "must_not": ["Mark unrestricted production ready when required proof is missing.", "Hide skipped checks."],
        "gates": ["Evidence completeness checklist.", "Focused suite replay where feasible.", "Route smoke proof.", "Release blocker review."],
        "report": "what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_<date>.md",
        "handoff": "Hand off to `stoquify-hris-20-extended-hris` only after controlled People Core release is real.",
        "stop": "Stop as NO-GO if any critical HRIS/payroll/accounting/security release gate lacks proof.",
        "success": "A scoped, signed, evidence-backed go/no-go decision is saved.",
    },
    {
        "name": "stoquify-hris-20-extended-hris",
        "title": "Stoquify HRIS 20 Extended HRIS",
        "description": "Govern deferred Stoquify HRIS modules such as recruitment, performance, training, disciplinary workflows, surveys, workforce planning, analytics, and advanced benefits after People Core is stable. Use to prevent broad HRIS overbuild before the core is ready.",
        "purpose": "Add broader HRIS capabilities only after People Core and payroll assurance are stable.",
        "trigger": "Use after final readiness for People Core or when evaluating deferred HRIS modules.",
        "prerequisites": ["People Core is production-ready or controlled-pilot limitations are explicit.", "Module entitlement and product packaging decisions."],
        "evidence": COMMON_EVIDENCE + ["docs/modules/", "what-next/module-surface-inventory.md", "config/sidebar.ts", "config/permissions.ts"],
        "touch": ["Extended HRIS module plans", "module entitlement docs", "reports", "optional future code only when approved"],
        "may": ["Prioritize deferred HRIS modules.", "Define module contracts.", "Add skill prompts for specific future modules."],
        "must_not": ["Start recruitment/performance/training before People Core evidence is stable.", "Bypass HRIS boundary, RBAC, redaction, audit, or release governance."],
        "gates": ["Each extension has owner, boundary, data model, RBAC, redaction, tests, and release gates.", "Module entitlement is defined before UI exposure."],
        "report": "what-next/payroll/STOQUIFY_HRIS_EXTENDED_HRIS_<date>.md",
        "handoff": "Hand off to a module-specific skill only after approval.",
        "stop": "Stop if the module would dilute payroll-ready People Core before it is stable.",
        "success": "Deferred HRIS growth is governed rather than bolted on.",
    },
]


def bullet(items):
    return "\n".join(f"- {item}" for item in items)


def skill_markdown(spec):
    desc = spec["description"].replace('"', "'")
    body = f"""---
name: {spec["name"]}
description: "{desc}"
---

# {spec["title"]}

## Operating Law

{bullet(COMMON_LAW)}

## Purpose

{spec["purpose"]}

## Trigger/use cases

{spec["trigger"]}

## Prerequisites

{bullet(spec["prerequisites"])}

## Evidence to inspect

{bullet(spec["evidence"])}

## Files/surfaces likely touched

{bullet(spec["touch"])}

## What the skill may change

{bullet(spec["may"])}

## What the skill must not change

{bullet(spec["must_not"])}

## Required tests or gates

{bullet(spec["gates"])}

## Required saved report path

`{spec["report"]}`

## Handoff conditions

{spec["handoff"]}

## Stop/blocker conditions

{spec["stop"]}

## Success criteria

{spec["success"]}

## Execution Workflow

1. Read the governing HRIS analysis, skill-system blueprint, current status register, and the latest report for the active slice.
2. Confirm the prerequisites before making code or report changes.
3. Inspect only the surfaces needed for this skill.
4. Preserve tenant isolation, RBAC, redaction, audit, evidence hashes, and payroll/accounting ownership boundaries.
5. Stop and save a blocker report when a prerequisite or risk control fails.
6. Change only the active slice when implementation is explicitly requested.
7. Run the smallest honest verification gate set.
8. Save the required report and name the next handoff skill.

## Shared Risk Controls

{bullet(COMMON_RISKS)}

## Report Contract

Every run must report scope, files inspected, files changed, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and next handoff skill.
"""
    return body


def openai_yaml(spec):
    display = spec["title"].replace("Stoquify ", "")
    short = spec["purpose"]
    if len(short) > 64:
        short = short[:61].rstrip() + "..."
    prompt = f"Use ${spec['name']} to execute the Stoquify HRIS People Core slice in dependency order."
    return f"""interface:
  display_name: "{display}"
  short_description: "{short}"
  default_prompt: "{prompt}"
policy:
  allow_implicit_invocation: true
"""


def main():
    missing = []
    for spec in SKILLS:
        skill_dir = ROOT / spec["name"]
        if not skill_dir.exists():
            missing.append(str(skill_dir))
            continue
        (skill_dir / "SKILL.md").write_text(skill_markdown(spec), encoding="utf-8", newline="\n")
        agents = skill_dir / "agents"
        agents.mkdir(exist_ok=True)
        (agents / "openai.yaml").write_text(openai_yaml(spec), encoding="utf-8", newline="\n")
    if missing:
        raise SystemExit("Missing scaffold folders:\n" + "\n".join(missing))
    print(f"Wrote {len(SKILLS)} Stoquify HRIS skill drafts to {ROOT}")


if __name__ == "__main__":
    main()
