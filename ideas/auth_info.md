use this to build a claude auth/athentication skill, Analyze this project’s existing authentication and authorization system, then propose a drastic improvement plan to make it water-tight, robust, professional, modern, secure-by-default, and enterprise-grade.

Goal:
Inspect the actual codebase, identify real weaknesses with evidence, and produce an implementation-ready upgrade blueprint for authentication, sessions, authorization, RBAC, permissions, scopes, audit logging, and sensitive workflow protection.

Project context:
This platform includes or may include:

- Inventory
- POS
- Purchasing
- Finance and accounting
- Payroll
- Attendance
- HR
- Reporting and dashboards
- Branches / locations
- Warehouses
- Suppliers
- Customers
- Manufacturing / BOM / recipes
- Administration and settings

Analyze the codebase for:

1. Authentication provider and login flow
2. Registration / onboarding flow
3. Password handling or external identity provider usage
4. Session model and token storage
5. Cookie security settings
6. MFA / 2FA support
7. Account recovery and password reset
8. Email verification
9. User status handling: active, suspended, deleted, invited
10. Logout and session revocation
11. Device/session management
12. Middleware, guards, API route protection, server action protection
13. Page-level authorization
14. Component-level conditional rendering
15. Role, permission, and scope model
16. Branch/location/warehouse scoping
17. Sensitive module protections for payroll, finance, bank, POS, purchasing, inventory, HR, reports, and exports
18. Approval workflows and separation-of-duties rules
19. Audit logging and security event logging
20. Rate limiting, bot protection, brute-force protection, and abuse prevention
21. CSRF, CORS, clickjacking, headers, and secure transport protections
22. Secrets and environment variable handling
23. Authorization test coverage and known bypass risks

For each finding, classify:

- Severity: Critical, High, Medium, Low
- Area: Authentication, Sessions, Authorization, RBAC, Scopes, Sensitive Data, Workflow, Audit, API, UI, Database, Security Headers, Tests
- Evidence: exact file paths, routes, functions, middleware, schema fields, or missing controls
- Business risk: what could go wrong in real business usage
- Technical risk: how it can be exploited or bypassed
- Recommended fix: concrete implementation direction
- Priority: Now, Next, Later

Evaluate against enterprise-grade standards:

- Secure-by-default authentication
- Deny-by-default authorization
- Server-side access control enforcement
- Least privilege
- Strong session lifecycle management
- HttpOnly, Secure, SameSite cookies where applicable
- No sensitive tokens in localStorage unless justified
- MFA or re-authentication for high-risk actions
- Account lockout or throttling for brute-force resistance
- Password reset and invitation token expiry
- Email verification where needed
- Role-based and scoped permissions
- Branch/location/warehouse scoping
- Explicit sensitive permissions for payroll, salary, bank accounts, refunds, voids, supplier bank details, exports, user-role management, and financial posting
- Maker-checker approval workflows
- Separation of duties
- Immutable or append-only audit logs for sensitive actions
- Security event logging
- CSRF protection for cookie-based auth
- Safe CORS configuration
- Security headers
- Secrets not committed or exposed to clients
- Authorization tests for allow and deny paths

Specifically check:

1. Authentication
   Verify:

- Login flow is server-validated
- Passwords are hashed with a modern algorithm if locally stored
- OAuth/OIDC provider integration is configured safely if used
- Session creation cannot be spoofed
- Disabled/suspended users cannot log in
- Deleted users cannot retain access
- Logout invalidates sessions where possible
- Password reset tokens expire and are single-use
- Invitation tokens expire and are single-use
- Email verification is enforced where required
- MFA exists or can be introduced for high-risk users/actions

2. Session and Token Security
   Verify:

- Session cookies are HttpOnly, Secure, SameSite, and correctly scoped
- Token expiry and refresh behavior are safe
- Sessions are rotated after login or privilege change
- Privilege changes invalidate or refresh active sessions
- Tokens are not leaked to client bundles, logs, URLs, or localStorage
- Session data does not trust stale role/permission claims without validation
- There is a way to revoke sessions for compromised accounts

3. Authorization Enforcement
   Verify:

- Protected pages are protected server-side
- API routes are protected server-side
- Server actions / route handlers / controllers are protected server-side
- Database queries include tenant/company/branch scope filters
- UI-only checks are not relied on for security
- Direct object access is prevented
- Users cannot access another branch, tenant, warehouse, employee, supplier, customer, or report by guessing an ID
- Exports and reports enforce the same authorization as normal screens

4. RBAC / Permission Model
   Verify:

- There is a clear permission naming convention
- Permissions are granular
- Roles are not overly broad
- Admin does not automatically mean access to payroll, salary, bank, or sensitive finance
- View, create, edit, delete, approve, void, post, export, import, override, assign, and configure are separate actions
- Permissions can be scoped by branch, warehouse, department, cost center, register, supplier, customer, employee, product category, and report category

5. Sensitive Controls
   Verify protections for:

- Payroll visibility
- Salary visibility
- Employee personal data
- Bank account access
- Financial posting
- Refunds and voids
- Discount overrides
- Stock adjustments
- Purchase order approval
- Supplier bank details
- User and role management
- Sensitive report exports
- Deleting, archiving, voiding, or reversing records

6. Workflow Authorization
   Verify whether the system prevents:

- A user creating and approving the same purchase order
- A cashier approving their own refund
- Payroll preparer approving payroll alone
- Supplier creator approving supplier bank changes alone
- Stock adjuster approving large inventory write-offs alone
- Finance poster deleting audit-sensitive records
- Super admin silently granting themselves sensitive payroll, bank, or finance access

7. Audit and Security Logging
   Verify logs for:

- Login success/failure
- Logout
- Password reset request and completion
- MFA challenge and failure
- Role changes
- Permission changes
- Scope changes
- Sensitive data views
- Exports
- Approvals
- Overrides
- Financial postings
- Payroll changes
- Refunds and voids
- Stock adjustments
- Supplier bank changes
- Failed authorization attempts
- Suspicious activity

8. Admin and User Management UX
   Review whether admin UI supports:

- User invitation flow
- User suspension/deactivation
- Session revocation
- MFA status visibility
- Role templates
- Permission matrix
- Branch/location scoping
- Role preview
- Permission source explanation
- Risk badges
- Conflict warnings
- Approval limit configuration
- Temporary access with expiry
- Permission change review screen
- Audit log visibility

9. Security Hardening
   Check:

- Rate limiting on login, password reset, invitations, exports, and sensitive mutations
- CSRF protection for cookie-based auth
- CORS is not overly permissive
- Security headers: CSP, frame-ancestors/X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy
- Secrets are not exposed via `NEXT_PUBLIC_*` or client bundles unless intentionally public
- Environment variables are validated
- Production debug routes or logs do not leak sensitive data
- Error messages do not reveal account existence or secrets

Deliverables:

1. Executive summary

- Current authentication maturity score from 0 to 10
- Current authorization maturity score from 0 to 10
- Biggest risks
- Highest-leverage improvements

2. Current-state architecture

- How authentication currently works
- How sessions/tokens currently work
- How users, roles, permissions, scopes, guards, middleware, and policies currently work
- Mermaid diagram if useful

3. Gap analysis

- Missing controls
- Weak controls
- Overly broad roles
- Client-only checks
- Missing server-side enforcement
- Missing session lifecycle controls
- Missing scope checks
- Missing audit/security logs
- Missing tests

4. Risk-ranked findings
   For each finding:

- Severity
- Evidence
- Business risk
- Technical risk
- Recommended fix
- Priority

5. Target authentication architecture
   Propose:

- Authentication provider strategy
- Login/session lifecycle
- MFA/re-authentication model
- Password reset/invitation model
- Session revocation model
- Secure cookie/token model
- Device/session management
- Rate limiting and abuse protection
- Security event logging

6. Target authorization architecture
   Propose a modern hybrid model:

- RBAC for job roles
- Hierarchical RBAC for management levels
- Resource-scoped RBAC for branches, warehouses, registers, departments, etc.
- Policy-based checks for amount limits, ownership, status, risk, time, and device
- Workflow-aware authorization for approvals and separation of duties
- Audit-first logging for sensitive events

7. Proposed role and permission model
   Include:

- Default roles
- Permission naming convention
- Permission risk levels
- Scope requirements
- Example permissions for major modules

8. Proposed scope model
   Define access boundaries for:

- Company
- Branch
- Warehouse
- Register
- Department
- Cost center
- Supplier
- Customer
- Employee
- Product category
- Report category

9. Proposed sensitive-action model
   Include:

- Payroll/salary access
- Bank account access
- Finance posting
- Refunds and voids
- Discount overrides
- Stock adjustments
- Purchase approvals
- Supplier bank changes
- User/role management
- Sensitive exports

10. Proposed workflow and separation-of-duties model
    Include workflows for:

- Purchase orders
- Stock adjustments
- Refunds
- Expenses
- Vendor payments
- Payroll runs
- Salary changes
- Supplier bank changes
- User permission changes
- Financial period closing

11. Proposed audit and security event model
    Include:

- Events to log
- Database fields
- Sensitive view logging
- Export logging
- Failed authorization logging
- Tamper-resistance recommendations
- Retention expectations

12. UI/UX improvement proposal
    Include:

- Admin security dashboard
- User/session management
- MFA status
- Role templates
- Permission matrix
- Scope selector
- Role preview
- Risk warnings
- Conflict detection
- Temporary access UX
- Permission change review UX
- Audit log viewer

13. Backend implementation plan
    Include:

- Suggested database schema changes
- Authentication/session changes
- Authorization helper/guard design
- Middleware/server-action/API enforcement strategy
- Policy evaluator design
- Permission cache strategy
- Rate limiting strategy
- Migration plan
- Testing plan

14. Step-by-step upgrade roadmap
    Break into phases:

- Phase 1: close critical auth and authorization bypasses
- Phase 2: harden sessions, cookies, tokens, and user status checks
- Phase 3: introduce permission taxonomy and server-side guards
- Phase 4: add scopes and sensitive controls
- Phase 5: add approval workflows and separation of duties
- Phase 6: add audit/security logging and admin UX
- Phase 7: add rate limiting, headers, CSRF/CORS hardening
- Phase 8: harden with tests, monitoring, and documentation

15. Implementation-ready examples
    Provide:

- Example database tables
- Example permission names
- Example `can(user, action, resource, context)` checks
- Example middleware/guard pseudocode
- Example session revocation logic
- Example audit log structure
- Example rate-limit rules
- Example tests for authentication and authorization failures

Important:

- Do not only give generic security advice.
- Inspect the actual project structure and code.
- Reference exact files, routes, functions, schemas, and guards.
- Distinguish between what exists, what is missing, and what should be built.
- Prioritize small, high-impact changes first.
- Prefer secure-by-default and deny-by-default behavior.
- Assume this will be used by real businesses with sensitive payroll, finance, inventory, POS, purchasing, customer, supplier, and HR data.
