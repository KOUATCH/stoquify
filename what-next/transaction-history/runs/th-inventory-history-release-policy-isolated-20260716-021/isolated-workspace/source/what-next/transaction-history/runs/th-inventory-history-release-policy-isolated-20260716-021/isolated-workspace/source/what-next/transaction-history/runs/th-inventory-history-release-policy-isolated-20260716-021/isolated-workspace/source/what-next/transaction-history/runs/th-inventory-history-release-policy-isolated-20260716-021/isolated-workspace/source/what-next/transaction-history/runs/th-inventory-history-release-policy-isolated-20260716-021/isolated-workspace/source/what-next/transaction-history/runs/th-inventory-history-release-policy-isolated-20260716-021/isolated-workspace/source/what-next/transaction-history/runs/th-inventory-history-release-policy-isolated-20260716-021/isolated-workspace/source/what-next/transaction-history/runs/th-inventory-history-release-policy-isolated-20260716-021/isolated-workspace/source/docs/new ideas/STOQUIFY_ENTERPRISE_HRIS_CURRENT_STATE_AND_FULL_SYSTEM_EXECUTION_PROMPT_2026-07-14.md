# Stoquify Enterprise HRIS Current-State And Full-System Proposal Execution Prompt

Use all competent specialist agents needed for this work, including HRIS architecture, payroll/domain architecture, security, privacy/RBAC, data modeling, enterprise UX, compliance/control, QA/release readiness, and product strategy.

Perform a deep analysis of the current Stoquify system and produce an honest, professional proposal explaining what the HRIS capability is today, what is missing, and what is required for it to become a full enterprise-grade HRIS platform.

Inspect the current codebase, Prisma schema, services, routes, payroll/HR-related modules, RBAC boundaries, dashboard UI patterns, documentation, and existing HR/payroll roadmap files before making recommendations.

The proposal must clearly separate:

1. Confirmed current system behavior.
2. Existing HRIS-adjacent capabilities.
3. Missing HRIS capabilities.
4. Assumptions.
5. Recommendations.
6. Implementation priorities.

Do not invent existing features. Do not exaggerate. Avoid claiming the system can be "bulletproof"; instead, use realistic enterprise security language such as defense-in-depth, resilient, auditable, privacy-preserving, tamper-resistant, and production-ready.

Analyze the current HRIS position across these areas:

- Employee master data and identity.
- Employment lifecycle: hiring, onboarding, transfers, promotions, termination.
- Contracts and compensation history.
- Organization structure, departments, positions, managers, and reporting lines.
- Attendance, leave, overtime, absences, and scheduling.
- Payroll integration and payroll-readiness controls.
- Employee self-service.
- Manager self-service.
- HR document management and evidence retention.
- Role-based access control and privacy boundaries.
- Audit logs, approval workflows, and segregation of duties.
- Data protection, redaction, hashing, encryption, token security, and sensitive-field handling.
- Compliance readiness and jurisdiction/country-pack needs.
- HR dashboards, movement history, and operational reporting.
- Integration with accounting, payroll, payments, declarations, and close assurance.

For each major HRIS capability, include:

1. Current state.
2. Business use case.
3. User roles that benefit.
4. Source of truth or service boundary that should own the data.
5. Recommended UI pattern.
6. Security/privacy requirements.
7. Value added to Stoquify.
8. Risks and tradeoffs.
9. Practical implementation path.
10. Tests and release gates needed.

The final proposal should answer:

- Is HRIS currently present, partially present, or absent?
- Is the current HRIS capability payroll-owned, HR-owned, or hybrid?
- Should HRIS become a standalone module, a payroll extension, or a phased bounded context?
- What is the minimum viable HRIS slice that adds value without bloating the product?
- What must be added for Stoquify to become a professional, modern, enterprise-grade HR management platform?
- What should not be built yet?
- What security, privacy, audit, and compliance controls are required before release?

Recommended deliverables:

- A professional Markdown proposal.
- A PDF version of the same proposal.
- Save both under `docs/new ideas/`.

Suggested filenames:

- `STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.pdf`

The final document must be practical, structured, honest, implementation-oriented, and suitable for product, engineering, security, and executive review.

