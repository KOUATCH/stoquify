# RBAC Authorization Hardening Guide

This system treats authorization as a server-side platform control. UI permission checks may improve usability, but they are never sufficient security.

## Required Pattern

Every protected feature must follow this flow:

1. Define a canonical permission in the `<module>.<resource>.<action>` catalog.
2. Assign a risk tier through `permissionRisk` or the explicit risk map.
3. Guard server actions and route handlers with `requirePermission`, `requireAnyPermission`, or `requireAllPermissions`.
4. Use the authenticated RBAC context organization as the tenant scope.
5. Ignore client-supplied `tenantId`, `organizationId`, `userId`, `role`, permission, approval state, and amount threshold.
6. Keep protected Prisma reads and writes scoped by the server-derived organization id.
7. Audit allowed and denied high-risk or critical actions.
8. Add tests for permission denial, direct-call bypass attempts, and cross-tenant ids.

## Non-Negotiable Rules

- Unknown permission keys deny.
- Wildcard grants do not imply high-risk or critical permissions.
- Cross-organization access denies even for wildcard users.
- Critical actions must use fresh server-side authorization checks.
- Disabled modules must deny before permission checks where module gates apply.
- Self-approval is forbidden for sensitive maker-checker workflows.
- Exports, financial posting, reversals, role assignment, payroll approval, and payment release require explicit permissions.

## Sensitive Workflow Checklist

For each workflow such as `accounting.journal.post`, `accounting.period.close`, `pos.sale.refund`, `inventory.adjust.approve`, `purchasing.payment.record`, `payroll.run.approve`, `reports.financial.export`, and `admin.role.assign`, document and test:

- UI visibility behavior.
- Server action or route handler guard.
- Service-layer authorization and tenant scope.
- Module or subscription gate.
- Audit event for allowed and denied critical operations.
- Maker-checker separation where approval is involved.
- Cross-tenant payload rejection.
- Direct API/action invocation denial.

## Review Gate

No new protected endpoint, server action, export, mutation, or dashboard count should merge unless it has an authorization check, tenant-scoped data access, and focused tests proving unauthorized users cannot call it directly.
