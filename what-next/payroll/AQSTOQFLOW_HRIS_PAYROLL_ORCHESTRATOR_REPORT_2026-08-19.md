# AqStoqFlow HRIS/Payroll Orchestrator Report

Date: 2026-08-19  
Scope: G1 17-person identity, employment, organizational-assignment and governance-roster closure  
Status: **CONTROLLED DATA ONBOARDING REQUIRED — NO RESEED OR BROAD SCHEMA REFACTOR**

## Decision

The next safe G1 tranche is controlled employee-identity reconciliation under `aqstoqflow-hris-payroll-03-employee-identity`, followed by organization/position assignment under Skill 04 and a separate governance control-role appointment process.

Do not reseed the current database to manufacture names, employment facts, positions or authority. The HRIS tables already exist. The principal blocker is absent or unverified authoritative data, not absence of the core HRIS schema.

## Evidence inspected

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_FINAL_READINESS_2026-08-17.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_EMPLOYEE_IDENTITY_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORG_MANAGER_SCOPE_2026-07-19.md`
- `docs/blockers-and-gates/cameroon-hris-payroll-authority/CAMEROON_HRIS_SCHEMA_AND_DATA_GAP_REPORT_2026-08-19.md`
- `docs/blockers-and-gates/cameroon-hris-payroll-authority/CAMEROON_HRIS_UNRESOLVED_GOVERNANCE_DECISIONS_2026-08-19.md`
- `docs/blockers-and-gates/cameroon-hris-payroll-authority/CAMEROON_HRIS_PAYROLL_LEGAL_SOURCE_REGISTER_2026-08-19.md`
- `docs/blockers-and-gates/hris-payroll-compliance-prefill/HRIS_PAYROLL_DATABASE_READ_ONLY_SNAPSHOT_2026-08-19.json`
- `docs/blockers-and-gates/hris-payroll-compliance-prefill/HRIS_PAYROLL_NAME_IDENTITY_RECONCILIATION_2026-08-19.md`
- `prisma/schema.prisma`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `graphify-out/GRAPH_REPORT_actions.md`

## Current blockers

- The legal employer and authoritative application tenant are unresolved.
- None of the 17 page-6 candidates is linked to a verified `User.id` and `PayrollEmployee.id`.
- All 24 payroll employees are draft, unlinked to users and unsupported by signed contract hashes.
- Organization units, positions, employment assignments, reporting relationships and delegations contain no runtime records.
- Application RBAC assignments cannot substitute for governance appointments.
- The canonical G1 role appointing authority, SoD policy, qualification policy and independent verifiers remain unresolved.

## Data ownership

- HR/governance owns legal identity, employment evidence and roster truth.
- HRIS stores verified employee, position and assignment truth.
- IAM/security owns authenticated user accounts and stable subject bindings.
- Corporate governance appoints the 17 canonical G1 control roles.
- Assurance independently verifies appointment and approval evidence.
- Payroll consumes certified HRIS truth; it must not invent it.

## Tenant, RBAC, audit and redaction decision

- Resolve the exact legal employer to one `Organization.id` before any onboarding.
- Enforce tenant-scoped uniqueness and deny cross-tenant identity linking.
- Use application RBAC only for system access; do not infer governance authority from it.
- Record maker, checker, source references, content hashes and effective dates for every identity/assignment decision.
- Keep identity-document bytes access-controlled and redact raw tax, social, pay and authentication data from reports.

## Gates run and skipped

- Read-only repository, graph, report and database-snapshot inspection completed.
- Official-source availability was checked against CNPS, DGI, OHADA and ILO NATLEX pages.
- No runtime tests were needed because no production code changed.
- No migration, reset, reseed, tenant write, account creation, role assignment, signature, approval, `policy:gates` or `verify:release` command was executed.

## Residual risk

Regulatory sources can define employer/worker records and statutory duties, but cannot identify Stoquify's internal G1 owners. Treat all legal conclusions as **LEGAL REVIEW REQUIRED** and all page-6 people as candidates until independently verified.

## Next handoff

Run the controlled identity intake described in `AQSTOQFLOW_HRIS_PAYROLL_EMPLOYEE_IDENTITY_2026-08-19.md`. Stop if the legal employer/tenant, source-document authority or independent checker is unavailable. After identity closure, hand off to Skill 04 for organization and position assignments, then create separate evidence-bound G1 control-role appointments.
