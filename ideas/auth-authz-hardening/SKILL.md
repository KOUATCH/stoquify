# Skill: auth-authz-hardening

## Purpose

Analyze, redesign, and harden a project's authentication and authorization system until it is water-tight, robust, professional, modern, secure-by-default, and enterprise-grade.

Use this skill to inspect the actual codebase, identify real weaknesses with evidence, produce an implementation-ready upgrade blueprint, and execute corrections step by step for authentication, sessions, authorization, RBAC, permissions, scopes, audit logging, abuse prevention, and sensitive workflow protection.

## Triggers

Use this skill when the user asks to:

- Audit authentication or authorization.
- Harden login, sessions, cookies, tokens, MFA, password reset, or user status handling.
- Review API route, server action, middleware, route handler, or page protection.
- Assess RBAC, permissions, branch scopes, warehouse scopes, or sensitive module access.
- Make auth secure, water-tight, professional, modern, robust, production-ready, or enterprise-grade.
- Fix auth bypasses or authorization gaps.
- Add audit logging, security event logging, rate limiting, CSRF/CORS/header hardening, or session revocation.
- Propose and execute a step-by-step auth/authz improvement plan.

Example prompts:

```text
Analyze this project's authentication and authorization and make it enterprise-grade.
```

```text
Audit auth, identify bypasses, propose improvements, and implement the fixes phase by phase.
```

```text
Make login, sessions, permissions, and sensitive workflow protection water-tight.
```

## Target Product Context

Default product context, unless the user says otherwise:

```text
A unified business operations platform covering inventory, POS, purchasing, finance, accounting, payroll, attendance, HR, reporting, dashboards, branches, warehouses, suppliers, customers, manufacturing, BOMs, recipes, administration, and settings.
```

Assume the product may contain highly sensitive business data:

- Payroll and salaries.
- Employee personal data.
- Bank accounts.
- Financial postings.
- Refunds, voids, discounts, and cash drawer activity.
- Stock adjustments and inventory valuation.
- Purchase orders and supplier bank details.
- Customer and supplier records.
- Sensitive reports and exports.
- User, role, and permission management.

## Operating Principles

- Inspect the actual project before proposing changes.
- Do not provide generic security advice without file, route, function, middleware, schema, or missing-control evidence.
- Prefer secure-by-default authentication and deny-by-default authorization.
- Enforce access control server-side. Frontend hiding is not security.
- Treat authentication and authorization as separate but connected systems.
- Close direct bypasses before redesigning architecture.
- Prefer small, high-impact, verifiable changes before broad rewrites.
- Preserve existing users, sessions, roles, and permissions unless a migration plan is explicit.
- Do not introduce changes that can lock out all admins without a safe bootstrap or rollback path.
- Do not hard-delete audit-sensitive records.
- Do not weaken existing checks for convenience.
- Do not commit changes unless the user explicitly asks for commits.

## Required Discovery Workflow

Before proposing or editing code, inspect the project for:

1. Framework and routing architecture.
2. Authentication provider and login flow.
3. Registration, invitation, onboarding, and account activation flows.
4. Password handling or external identity provider usage.
5. Session model, token storage, refresh behavior, and session persistence.
6. Cookie security settings.
7. MFA / 2FA support and re-authentication hooks.
8. Password reset and account recovery.
9. Email verification.
10. User status handling: active, suspended, disabled, deleted, invited.
11. Logout, session invalidation, and session revocation.
12. Device/session management.
13. Middleware, guards, route handlers, API routes, controllers, server actions, and background jobs.
14. Page-level authorization and component-level conditional rendering.
15. Role, permission, policy, and scope model.
16. Branch, location, warehouse, register, department, cost center, tenant, organization, customer, supplier, employee, product category, and report scoping.
17. Sensitive module protections for payroll, finance, bank, POS, purchasing, inventory, HR, reports, and exports.
18. Approval workflows and separation-of-duties rules.
19. Audit logs, security event logs, activity logs, export logs, sensitive view logs, and failed authorization logs.
20. Rate limiting, bot protection, brute-force protection, and abuse prevention.
21. CSRF, CORS, clickjacking, security headers, and secure transport protections.
22. Secrets, environment variables, client-exposed variables, debug routes, and sensitive logs.
23. Test coverage for authentication, authorization, scopes, workflows, and bypass prevention.

Use fast search first. Look for terms such as:

```text
auth
session
token
cookie
csrf
cors
headers
middleware
login
logout
password
reset
verify
invite
mfa
2fa
role
permission
authorize
guard
policy
can(
scope
tenantId
organizationId
branchId
warehouseId
registerId
departmentId
payroll
salary
bank
refund
void
approve
audit
export
rateLimit
```

## Analysis Checklist

### 1. Authentication

Verify:

- Login flow is server-validated.
- Passwords are hashed with a modern algorithm if locally stored.
- OAuth/OIDC provider integration is configured safely if used.
- Session creation cannot be spoofed.
- Disabled, suspended, or deleted users cannot log in.
- Deleted users cannot retain access through old sessions.
- Logout invalidates sessions where possible.
- Password reset tokens expire and are single-use.
- Invitation tokens expire and are single-use.
- Email verification is enforced where required.
- MFA exists or can be introduced for high-risk users/actions.
- Error messages do not reveal account existence or sensitive state.

### 2. Session and Token Security

Verify:

- Session cookies are HttpOnly, Secure, SameSite, and correctly scoped where applicable.
- Token expiry and refresh behavior are safe.
- Sessions are rotated after login, privilege change, or sensitive auth state change where applicable.
- Privilege changes invalidate or refresh active sessions.
- Tokens are not leaked to client bundles, logs, URLs, localStorage, or insecure storage unless justified.
- Session data does not trust stale role/permission claims without validation.
- There is a way to revoke sessions for compromised accounts.
- Session and token secrets are strong and environment-specific.

### 3. Authorization Enforcement

Verify:

- Protected pages are protected server-side.
- API routes are protected server-side.
- Server actions, route handlers, controllers, services, and background jobs are protected server-side.
- Database queries include tenant/company/branch/warehouse scope filters where needed.
- UI-only checks are not relied on for security.
- Direct object access is prevented.
- Users cannot access another branch, tenant, warehouse, employee, supplier, customer, or report by guessing an ID.
- Exports and reports enforce the same authorization as normal screens.

### 4. RBAC / Permission Model

Verify:

- There is a clear permission naming convention.
- Permissions are granular.
- Roles are not overly broad.
- Admin does not automatically mean access to payroll, salary, bank, or sensitive finance.
- View, create, edit, delete, approve, void, post, export, import, override, assign, and configure are separate actions.
- Permissions can be scoped by branch, warehouse, department, cost center, register, supplier, customer, employee, product category, and report category.

Recommended permission naming convention:

```text
module.resource.action
```

Examples:

```text
inventory.stock_adjustment.create
inventory.stock_adjustment.approve
pos.refund.approve
pos.sale.void
purchase.purchase_order.approve
finance.payment.post
finance.bank_account.view
payroll.salary.view
payroll.run.approve
settings.role.assign
audit.event.view
report.finance.export
```

### 5. Sensitive Controls

Verify explicit protections for:

- Payroll visibility.
- Salary visibility.
- Employee personal data.
- Bank account access.
- Financial posting.
- Refunds and voids.
- Discount overrides.
- Stock adjustments.
- Purchase order approval.
- Supplier bank details.
- User and role management.
- Sensitive report exports.
- Deleting, archiving, voiding, or reversing records.

### 6. Workflow Authorization

Verify whether the system prevents:

- A user creating and approving the same purchase order.
- A cashier approving their own refund.
- Payroll preparer approving payroll alone.
- Supplier creator approving supplier bank changes alone.
- Stock adjuster approving large inventory write-offs alone.
- Finance poster deleting audit-sensitive records.
- Super admin silently granting themselves sensitive payroll, bank, or finance access.

### 7. Audit and Security Logging

Verify logs for:

- Login success/failure.
- Logout.
- Password reset request and completion.
- MFA challenge and failure.
- Role changes.
- Permission changes.
- Scope changes.
- Sensitive data views.
- Exports.
- Approvals.
- Overrides.
- Financial postings.
- Payroll changes.
- Refunds and voids.
- Stock adjustments.
- Supplier bank changes.
- Failed authorization attempts.
- Suspicious activity.

### 8. Admin and User Management UX

Review whether admin UI supports:

- User invitation flow.
- User suspension/deactivation.
- Session revocation.
- MFA status visibility.
- Role templates.
- Permission matrix.
- Branch/location scoping.
- Role preview.
- Permission source explanation.
- Risk badges.
- Conflict warnings.
- Approval limit configuration.
- Temporary access with expiry.
- Permission change review screen.
- Audit log visibility.

### 9. Security Hardening

Check:

- Rate limiting on login, password reset, invitations, exports, and sensitive mutations.
- Bot protection or abuse throttling where appropriate.
- CSRF protection for cookie-based auth.
- CORS is not overly permissive.
- Security headers: CSP, frame-ancestors or X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
- Secure transport is enforced in production.
- Secrets are not exposed through `NEXT_PUBLIC_*`, client bundles, logs, or committed files unless intentionally public.
- Environment variables are validated.
- Production debug routes or logs do not leak sensitive data.
- Error handling does not expose tokens, stack traces, secrets, or account enumeration hints.

## Enterprise Standards To Evaluate Against

- Secure-by-default authentication.
- Deny-by-default authorization.
- Server-side access control enforcement.
- Least privilege.
- Strong session lifecycle management.
- HttpOnly, Secure, SameSite cookies where applicable.
- No sensitive tokens in localStorage unless justified.
- MFA or re-authentication for high-risk actions.
- Account lockout or throttling for brute-force resistance.
- Password reset and invitation token expiry.
- Email verification where needed.
- Role-based and scoped permissions.
- Branch/location/warehouse scoping.
- Explicit sensitive permissions for payroll, salary, bank accounts, refunds, voids, supplier bank details, exports, user-role management, and financial posting.
- Maker-checker approval workflows.
- Separation of duties.
- Immutable or append-only audit logs for sensitive actions.
- Security event logging.
- CSRF protection for cookie-based auth.
- Safe CORS configuration.
- Security headers.
- Secrets not committed or exposed to clients.
- Authorization tests for allow and deny paths.

## Finding Format

Every finding must include:

```text
Severity: Critical | High | Medium | Low
Area: Authentication | Sessions | Authorization | RBAC | Scopes | Sensitive Data | Workflow | Audit | API | UI | Database | Security Headers | Tests
Evidence: exact file paths, routes, functions, middleware, schema fields, or missing controls
Business risk: what could go wrong in real business usage
Technical risk: how it can be exploited or bypassed
Recommended fix: concrete implementation direction
Priority: Now | Next | Later
```

Severity guidance:

- Critical: unauthenticated access to sensitive mutation, session spoofing, token leakage, cross-tenant data access, role escalation, payroll/bank/finance exposure, or direct object access to sensitive resources.
- High: missing server-side authorization, weak session lifecycle, missing user status checks, missing scope enforcement, unsafe exports, self-approval for financial workflows, broad admin access to sensitive modules.
- Medium: incomplete audit/security logs, coarse roles, missing re-authentication, weak admin UX warnings, partial rate limiting, partial test coverage.
- Low: inconsistent naming, documentation gaps, minor UX clarity issues, non-sensitive missing tests.

## Required Deliverables Before Editing

Before code changes, produce an assessment unless the user explicitly asks to immediately fix known issues.

Include:

1. Executive summary.
2. Current authentication maturity score from 0 to 10.
3. Current authorization maturity score from 0 to 10.
4. Current-state architecture.
5. Gap analysis.
6. Risk-ranked findings.
7. Target authentication architecture.
8. Target authorization architecture.
9. Proposed role and permission model.
10. Proposed scope model.
11. Proposed sensitive-action model.
12. Proposed workflow and separation-of-duties model.
13. Proposed audit and security event model.
14. UI/UX improvement proposal.
15. Backend implementation plan.
16. Step-by-step upgrade roadmap.
17. Implementation-ready examples where useful.

Use Mermaid diagrams when they clarify current or target architecture.

## Target Authentication Architecture

Propose or validate:

- Authentication provider strategy.
- Login and session lifecycle.
- MFA and high-risk re-authentication model.
- Password reset and invitation model.
- Email verification model.
- Session revocation model.
- Secure cookie/token model.
- Device/session management.
- Rate limiting and abuse protection.
- Security event logging.

## Target Authorization Architecture

Propose a modern hybrid model:

- RBAC for job roles.
- Hierarchical RBAC for management levels.
- Resource-scoped RBAC for branches, warehouses, registers, departments, and cost centers.
- Policy-based checks for amount limits, ownership, status, risk, time, device, and user status.
- Workflow-aware authorization for approvals and separation of duties.
- Audit-first logging for sensitive events.

Recommended principle:

```text
Authentication proves who the user is.
Roles define what job they have.
Permissions define what actions they may perform.
Scopes define where those actions apply.
Policies define when conditions allow the action.
Workflows define who must approve sensitive transitions.
Audit logs prove what happened.
```

## Execution Workflow

After the assessment, execute corrections in phases. Keep phases small, safe, and verifiable.

### Phase 0: Safety and Baseline

1. Check git status.
2. Identify unrelated user changes and avoid modifying them unless necessary.
3. Run existing tests or targeted checks if available.
4. Document current auth/authz behavior.
5. Identify admin/bootstrap access path to avoid lockout.

Stop if there is no safe way to preserve admin access.

### Phase 1: Close Critical Auth and Authorization Bypasses

Fix issues such as:

- Unauthenticated sensitive routes/actions.
- Unprotected API routes.
- Unprotected server actions.
- Client-only authorization checks.
- Missing tenant/company/branch filters.
- Direct object access without ownership or scope checks.
- Disabled/deleted users retaining access.
- Broad admin access to payroll, bank, finance, or role management without explicit permission.

Verification:

- Add or run tests proving unauthorized users are denied.
- Inspect all touched routes/actions.
- Confirm intended users still have intended access.

### Phase 2: Harden Sessions, Cookies, Tokens, and User Status

Implement or improve:

- HttpOnly, Secure, SameSite cookies where applicable.
- Safe token expiry/refresh behavior.
- Session rotation or refresh after privilege changes where applicable.
- User status checks on session use.
- Session revocation.
- Logout invalidation.
- Password reset/invitation token expiry and single-use behavior.
- MFA/re-authentication hooks for high-risk actions if feasible.

Verification:

- Tests or targeted checks for disabled users, revoked sessions, expired tokens, and reset/invite token reuse.

### Phase 3: Introduce Permission Taxonomy and Server-Side Guards

Implement or improve:

- Permission constants or registry.
- `can(user, action, resource, context)` or equivalent helper.
- Risk levels for permissions.
- Server-side guard utilities.
- Deny-by-default behavior.

Verification:

- Unit tests for allow and deny cases.
- Typecheck/lint/build where available.

### Phase 4: Add Scopes and Sensitive Controls

Implement or improve scope enforcement for:

- Company / tenant.
- Branch.
- Warehouse.
- Register.
- Department.
- Cost center.
- Supplier.
- Customer.
- Employee.
- Product category.
- Report category.

Implement explicit controls for:

- Payroll and salary visibility.
- Bank account access.
- Financial posting.
- Refunds and voids.
- Discount overrides.
- Stock adjustments.
- Purchase approvals.
- Supplier bank details.
- User/role management.
- Sensitive exports.

Verification:

- Tests proving users cannot read or mutate data outside assigned scopes.
- Negative tests for sensitive permissions.

### Phase 5: Add Approval Workflows and Separation of Duties

Implement or improve workflows for:

- Purchase orders.
- Stock adjustments.
- Refunds.
- Expenses.
- Vendor payments.
- Payroll runs.
- Salary changes.
- Supplier bank changes.
- User permission changes.
- Financial period closing.

Rules to enforce:

```text
Creator cannot be sole approver.
Approval limits must be respected.
Dual approval is required for high-risk actions.
Emergency override requires reason and audit log.
Delegation must be explicit and time-limited.
```

Verification:

- Workflow transition tests.
- Self-approval denial tests.
- Approval limit tests.

### Phase 6: Add Audit and Security Logging

Implement logs for:

- Login success/failure.
- Logout.
- Password reset request/completion.
- MFA challenge/failure.
- Role, permission, and scope changes.
- Sensitive data views.
- Exports.
- Approvals and overrides.
- Financial postings.
- Payroll changes.
- Refunds and voids.
- Stock adjustments.
- Supplier bank changes.
- Failed authorization attempts.
- Suspicious activity.

Audit/security events should include:

```text
actor_user_id
action
resource_type
resource_id
scope_type
scope_id
before_value
after_value
reason
approval_reference
ip_address
user_agent
session_id
created_at
```

Verification:

- Tests or targeted checks confirming events are written.
- Confirm logs are append-only where practical.

### Phase 7: Add Rate Limiting, Headers, CSRF/CORS Hardening

Implement or improve:

- Login rate limiting.
- Password reset rate limiting.
- Invitation rate limiting.
- Export rate limiting.
- Sensitive mutation rate limiting.
- CSRF protection for cookie-based auth.
- Safe CORS allowlist.
- Security headers.
- Environment variable validation.
- Secret exposure checks.

Verification:

- Tests or manual checks for limits and headers.
- Confirm CORS does not allow arbitrary origins in production.

### Phase 8: Harden With Tests, Monitoring, and Documentation

Add or update:

- Authentication tests.
- Authorization tests.
- Scope leakage tests.
- Workflow tests.
- Sensitive export tests.
- Session revocation tests.
- Security docs.
- Admin/user-management docs.
- Developer auth/authz guidelines.

Verification:

- Run relevant test suite.
- Run lint/typecheck/build where available.
- Summarize residual risks.

## Implementation Patterns

Prefer a guard shaped like:

```text
can(user, action, resource, context)
```

Example policy evaluation order:

```text
1. Authenticate user.
2. Confirm user is active and session is valid.
3. Require MFA or recent re-auth for high-risk action if supported.
4. Load roles, permissions, temporary access, and scopes.
5. Check explicit deny policies.
6. Check required permission.
7. Check resource scope.
8. Check policy conditions such as amount, status, owner, time, device, or risk.
9. Check workflow rules and separation of duties.
10. Write audit/security event for sensitive actions.
11. Allow or deny.
```

Default behavior:

```text
If no valid session exists, deny.
If user is disabled, suspended, or deleted, deny.
If no explicit permission exists, deny.
If no valid scope exists, deny.
If policy is ambiguous, deny.
If workflow state is invalid, deny.
If audit logging fails for a high-risk mutation, deny or fail closed where practical.
```

## Example Database Concepts

Adapt to the project's ORM and schema style.

```text
users
sessions
devices
login_events
security_events
roles
permissions
role_permissions
user_roles
resource_scopes
approval_limits
policies
workflow_approvals
temporary_access_grants
audit_events
password_reset_tokens
invitation_tokens
mfa_factors
```

Do not introduce all tables at once if incremental migration is safer. Start with the smallest schema change that closes the highest-risk gap.

## Required Tests To Add When Practical

Minimum negative tests:

```text
Unauthenticated user cannot access protected route/action.
Suspended user cannot access protected route/action.
Deleted user cannot retain access through old session.
Expired password reset token cannot be used.
Used invitation token cannot be reused.
Cashier cannot view payroll.
Cashier cannot approve own refund.
Branch Manager cannot access another branch's data.
Purchaser cannot approve own PO.
AP Clerk cannot approve own payment batch.
IT Admin cannot view bank account details.
User cannot export sensitive report outside scope.
Role or permission change writes an audit event.
Failed authorization attempt writes a security event.
```

## Final Response Requirements

When the work is complete, report:

- What was assessed.
- What was changed.
- Which files were modified.
- Which risks were closed.
- Which verification commands ran and their results.
- Remaining risks or deferred hardening items.
- Recommended next phase if the full enterprise model was not completed.

Keep the final response concise but specific. Include exact file paths for important changes.

## Stop Conditions

Stop and ask the user before proceeding if:

- A change may lock out all admins.
- A migration may invalidate existing user sessions, accounts, roles, or permissions.
- Existing production auth semantics are unclear.
- Multiple incompatible auth systems exist and choosing one would be architectural.
- Sensitive payroll, finance, bank, or permission-management behavior cannot be safely inferred.
- The requested correction requires destructive database changes.
- Secrets appear to be exposed and remediation requires rotating credentials outside the codebase.
