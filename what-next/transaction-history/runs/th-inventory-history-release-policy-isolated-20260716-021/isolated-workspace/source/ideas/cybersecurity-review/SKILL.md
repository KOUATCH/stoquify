# Skill: cybersecurity-review

## Purpose

Perform a comprehensive, evidence-based cybersecurity review of a codebase as a senior consultant from a top-tier security firm. Identify realistic vulnerabilities, explain business and technical impact, propose concrete remediations, and produce a prioritized timeline for fixing the issues.

Use this skill to assess an application as if it were going to production for real business use. Inspect the actual codebase, configuration, dependencies, environment handling, authentication, authorization, data access, API routes, server actions, frontend behavior, database usage, deployment assumptions, and operational controls.

## Triggers

Use this skill when the user asks to:

- Perform a cybersecurity review.
- Audit codebase security.
- Find vulnerabilities.
- Assess production security readiness.
- Review auth, authorization, APIs, server actions, Prisma, database access, or secrets.
- Produce a vulnerability report with remediation timeline.
- Evaluate business-logic fraud risks.
- Act as a senior cybersecurity consultant.

Example prompts:

```text
Perform a comprehensive security review of this codebase.
```

```text
Analyze this app for all realistic vulnerabilities and give a remediation timeline.
```

```text
Act as a senior cybersecurity consultant and audit this Next.js/Prisma app.
```

## Target Project Context

Default context, unless the user says otherwise:

```text
A business operations application that may include Next.js App Router, React, TypeScript, Prisma, database access, server actions, API routes, authentication, authorization, RBAC, inventory, POS, purchasing, finance, accounting, payroll, attendance, HR, reporting, dashboards, branches, locations, suppliers, customers, manufacturing, BOMs, recipes, and admin settings.
```

Assume attackers may include:

- Unauthenticated internet users.
- Low-privilege employees.
- Branch staff.
- Cashiers.
- Suppliers or external users.
- Compromised admins.
- Malicious insiders.

## Operating Principles

- Inspect the actual codebase before reporting vulnerabilities.
- Do not hallucinate vulnerabilities without evidence.
- If a risk is inferred from a missing control, clearly label it as inferred.
- Every finding must be supported by code, config, route, dependency, schema, or missing-control evidence.
- Prioritize exploitable and business-impacting issues over theoretical issues.
- Include both technical vulnerabilities and business-logic vulnerabilities.
- Distinguish between confirmed vulnerabilities, likely risks, and defense-in-depth improvements.
- Do not modify code during this review unless the user explicitly asks for remediation execution.
- Do not run destructive commands.
- Do not expose or print secret values. If secrets are found, report file/path and variable names only, and recommend rotation.
- If the workspace does not contain an application codebase, report that clearly and do not invent findings.

## Required Discovery Workflow

Start by mapping the repository. Inspect, when present:

1. `package.json` and lockfiles.
2. `next.config.*`, `middleware.*`, `tsconfig.*`, lint/test/build configs.
3. `app/`, `pages/`, `src/`, route groups, API routes, route handlers, server actions.
4. `prisma/schema.prisma`, migrations, seed files, database utilities.
5. Auth/session files, providers, adapters, callbacks, guards, middleware.
6. Role, permission, policy, RBAC, scope, branch/tenant/org logic.
7. Form validation schemas and server action input parsing.
8. File upload handling.
9. Export/report generation paths.
10. Logging, audit, monitoring, error handling, observability.
11. Environment examples and usage of `process.env`.
12. CI/CD and deployment configs.
13. Tests for auth, authorization, validation, and sensitive workflows.
14. README/docs that describe deployment, auth, roles, or security.

Use fast search for terms such as:

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
invite
mfa
2fa
role
permission
authorize
guard
policy
can()
tenantId
organizationId
branchId
warehouseId
payroll
salary
bank
refund
void
approve
audit
export
upload
localStorage
sessionStorage
dangerouslySetInnerHTML
$queryRaw
$executeRaw
process.env
NEXT_PUBLIC
rateLimit
```

## Vulnerability Categories To Analyze

### 1. Authentication

Look for:

- Weak login flow.
- Insecure password handling.
- Missing MFA or re-authentication.
- Unsafe password reset.
- Unsafe invitation flow.
- Session fixation.
- Session not revoked after user disable/delete.
- Token leakage.
- Cookie misconfiguration.
- Account enumeration.
- Brute-force risks.

### 2. Authorization and Access Control

Look for:

- Missing server-side authorization.
- Client-only authorization.
- IDOR / broken object-level authorization.
- Missing tenant/company/branch scoping.
- Overly broad admin permissions.
- Privilege escalation.
- Missing separation of duties.
- Missing approval controls for finance, payroll, POS, inventory, purchasing, and admin actions.

### 3. Data Protection

Look for:

- Sensitive data exposure.
- Payroll/salary leakage.
- Bank account leakage.
- Customer/supplier data leakage.
- PII exposure in logs/errors.
- Secrets in client bundles.
- Secrets committed to repository.
- Weak environment variable handling.
- Lack of encryption where needed.

### 4. Input Validation and Injection

Look for:

- SQL injection risks.
- Unsafe Prisma raw queries.
- Command injection.
- XSS.
- Stored XSS.
- Reflected XSS.
- Unsafe HTML rendering.
- Unsafe file uploads.
- Path traversal.
- SSRF.
- Prototype pollution.
- Unsafe redirects.

### 5. API, Server Action, and Route Security

Look for:

- Unprotected API routes.
- Unprotected server actions.
- Missing validation.
- Missing rate limiting.
- Missing CSRF protection.
- Unsafe CORS.
- Excessive data returned.
- Mass assignment.
- Insecure direct mutation endpoints.
- Missing audit logs for sensitive actions.

### 6. Frontend Security

Look for:

- Sensitive data stored in localStorage/sessionStorage.
- Exposed tokens.
- Unsafe client-side role checks.
- Dangerous HTML rendering.
- Third-party script risks.
- Missing CSP.
- Clickjacking risks.
- Insecure forms.
- Leaky error states.

### 7. Database and Prisma Security

Look for:

- Unsafe raw SQL.
- Missing row-level scoping in queries.
- Over-fetching sensitive fields.
- Missing transaction boundaries.
- Unsafe cascading deletes.
- Missing soft-delete / audit controls for sensitive records.
- Weak migration practices.
- Missing unique constraints or integrity protections.

### 8. Dependency and Supply-Chain Security

Look for:

- Vulnerable packages.
- Outdated dependencies.
- Suspicious packages.
- Unpinned critical tooling.
- Unsafe postinstall scripts.
- Missing lockfile hygiene.
- Dependency confusion risks.

Use package manager audit commands when appropriate and safe:

```text
npm audit
pnpm audit
yarn npm audit
```

Do not install packages just to run the review unless the user approves.

### 9. Infrastructure and Deployment Assumptions

Look for:

- Missing security headers.
- Missing HTTPS/HSTS assumptions.
- Debug mode in production.
- Verbose errors.
- Unsafe logging.
- Missing monitoring/alerting.
- Missing backup/recovery controls.
- Missing secrets rotation plan.

### 10. Business-Logic Security

Look for abuse paths involving:

- POS refunds and voids.
- Discounts.
- Cash drawer.
- Stock adjustments.
- Purchase orders.
- Supplier bank details.
- Vendor payments.
- Payroll runs.
- Salary changes.
- Financial postings.
- Report exports.
- Audit-log tampering.
- Race conditions in financial or inventory workflows.

## Finding Format

For each vulnerability, provide:

```text
ID:
Title:
Severity: Critical | High | Medium | Low | Informational
Confidence: High | Medium | Low
Category: OWASP / CWE / business-logic category where applicable
Evidence: exact file paths, functions, routes, schema fields, dependency names, or missing controls
Attack scenario: realistic exploitation path
Business impact:
Technical impact:
Affected users/data/modules:
Recommended fix:
Implementation notes:
Verification steps:
Priority: Now | Next | Later
```

## Severity Rules

- Critical: direct unauthorized access to sensitive data, account takeover, privilege escalation, unauthenticated sensitive mutation, secret exposure, payment/payroll/bank manipulation, or cross-tenant data exposure.
- High: missing server-side authorization, IDOR, serious session flaws, unsafe sensitive exports, stored XSS, unsafe raw SQL, missing branch/tenant scoping, or high-impact business-logic fraud path.
- Medium: missing rate limits, weak audit logging, missing CSRF/CORS hardening, partial validation gaps, incomplete security headers, or sensitive over-fetching.
- Low: minor information disclosure, hardening gaps, inconsistent error messages, or non-sensitive dependency hygiene.
- Informational: documentation, process, monitoring, or defense-in-depth improvements.

## Required Deliverables

### 1. Executive Summary

Include:

- Overall security maturity score from 0 to 10.
- Production readiness verdict.
- Top 5 highest-risk issues.
- Highest-leverage fixes.
- Estimated remediation effort.

### 2. Attack Surface Map

Map:

- Public routes.
- Authenticated routes.
- Admin routes.
- API routes.
- Server actions.
- Database entry points.
- File upload points.
- External integrations.
- Sensitive modules.

### 3. Risk-Ranked Vulnerability Report

Include findings ordered by severity and exploitability. Each finding must include evidence and actionable remediation.

### 4. Security Architecture Assessment

Evaluate:

- Authentication.
- Authorization.
- Session management.
- RBAC/scoping.
- Data protection.
- Input validation.
- API/server-action protection.
- Database access.
- Audit logging.
- Dependency security.
- Deployment hardening.

### 5. Business-Logic Fraud Assessment

Specifically assess:

- POS refunds and voids.
- Discounts.
- Cash drawer.
- Stock adjustments.
- Purchase orders.
- Supplier bank details.
- Vendor payments.
- Payroll runs.
- Salary changes.
- Financial postings.
- Report exports.

### 6. Remediation Roadmap

Create a realistic timeline:

- Immediate: 0-48 hours.
- Short term: 1-2 weeks.
- Medium term: 3-6 weeks.
- Long term: 2-3 months.

For each phase, include:

- Issues addressed.
- Files/areas to modify.
- Expected risk reduction.
- Dependencies.
- Verification/testing required.

### 7. Implementation Plan

For the highest-risk issues, provide:

- Specific code-level fix direction.
- Suggested middleware/guards.
- Validation patterns.
- Authorization checks.
- Prisma query scoping changes.
- Audit log additions.
- Rate limit rules.
- Security header configuration.
- Test cases.

### 8. Verification Plan

Include:

- Unit tests.
- Integration tests.
- Authorization negative tests.
- Dependency scans.
- Secret scans.
- Manual security test cases.
- Regression checks.
- Production monitoring checks.

### 9. Security Hardening Checklist

Include:

- Authentication.
- Authorization.
- Sessions/cookies.
- CSRF/CORS.
- Headers/CSP.
- Validation.
- Database access.
- Secrets.
- Logging/audit.
- Dependencies.
- Deployment.
- Monitoring.

### 10. Final Recommendation

State clearly:

- Whether the app is safe to ship now.
- What must be fixed before production.
- What can be scheduled after launch.
- What security practices should become ongoing process.

## Evidence Standards

Use this evidence taxonomy:

- Confirmed: direct code/config/dependency evidence proves the issue.
- Inferred: a necessary control appears missing after searching relevant areas.
- Not assessed: code path or dependency is unavailable in the workspace.

When a finding is inferred, write:

```text
Evidence type: Inferred missing control
Search performed: <paths/patterns searched>
Reason: <why this control appears absent>
```

## Safe Commands

Useful read-only commands when applicable:

```text
npm audit --audit-level=low
pnpm audit
yarn npm audit
git log --oneline -30
git status --short
```

Do not run destructive commands. Do not print secrets. Do not push code.

## Final Response Style

- Lead with the verdict and top risks.
- Keep findings specific and evidence-backed.
- Avoid generic filler.
- Use concise tables where helpful.
- Clearly distinguish confirmed vulnerabilities from inferred missing controls.
- If no app code exists, state that the security review cannot be performed and list what is missing.

## Stop Conditions

Stop and ask the user before proceeding if:

- The repository contains secret-looking values that need rotation outside the codebase.
- The audit requires installing dependencies or running the app.
- The codebase appears incomplete and vulnerability claims would be speculative.
- Multiple apps exist and the audit target is ambiguous.
- The user asks to exploit a vulnerability rather than assess and remediate it.
