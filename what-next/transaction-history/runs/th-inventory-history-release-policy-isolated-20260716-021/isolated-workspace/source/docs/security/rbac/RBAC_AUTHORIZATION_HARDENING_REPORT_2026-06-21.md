# RBAC Authorization Hardening Report

Generated: 2026-06-21

## Executive Summary

The RBAC permission and authorization layer was hardened as a defense-in-depth platform control. The changes focus on preventing permission leakage, cross-tenant access, wildcard privilege escalation, unknown permission bypasses, and fragile authorization behavior around sensitive business workflows.

This was not a UI-only cleanup. The implementation strengthens the central server-side authorization helpers, permission catalog behavior, tenant isolation checks, and RBAC regression tests.

## Security Outcomes

- Unknown permission keys now fail closed.
- Wildcard grants no longer imply high-risk or critical permissions.
- Cross-organization access is denied even for wildcard users.
- Sensitive workflow permission keys are explicitly recognized and risk-tiered.
- Critical workflow aliases map to existing legacy grants without weakening authorization.
- Focused tests now pin down wildcard hardening, unknown permission denial, sensitive workflow aliases, and tenant isolation.
- Future authorization usage is documented for server actions, route handlers, services, module gates, audit logs, and tests.

## Files Updated

- `lib/security/rbac-permissions.ts`
- `lib/security/rbac.ts`
- `lib/security/__tests__/rbac-permissions.test.ts`
- `lib/security/__tests__/rbac.test.ts`
- `docs/rbac-authorization-hardening.md`

## Key Implementation Details

### 1. Wildcard Permission Hardening

Previously, a stored `*` permission could satisfy every permission check. That is dangerous in an enterprise SaaS system because it lets broad grants bypass critical workflow authorization.

The RBAC permission resolver now blocks wildcard-only access for high-risk and critical permissions. A wildcard user can still access low and medium risk capabilities, but sensitive actions require explicit permissions.

Protected examples include:

- `admin.role.assign`
- `accounting.period.close`
- `accounting.journal.post`
- `inventory.adjust.approve`
- `purchasing.payment.record`
- `payroll.run.approve`
- `reports.financial.export`

### 2. Unknown Permission Fail-Closed Behavior

The server-side authorization helpers now reject unknown permission names before checking grants.

This prevents accidental or malicious use of unregistered permission strings, including:

- Typo-based authorization bypasses.
- Dynamic permission names that were never cataloged.
- Test or demo permissions leaking into production paths.
- Direct server action calls with unsupported permission keys.

### 3. Tenant Isolation Hardening

The organization scope guard now denies cross-organization access even when the caller has wildcard permissions.

This prevents a broad administrative grant from becoming an implicit cross-tenant read or write bypass. Tenant scope must come from the authenticated server-side RBAC context, not from client payloads or role shortcuts.

### 4. Sensitive Workflow Catalog Expansion

The permission catalog now recognizes enterprise workflow names from the hardening prompt and maps them to existing grant names where appropriate.

Added or strengthened workflow keys include:

- `admin.role.assign`
- `admin.user.invite`
- `pos.cash.adjust`
- `pos.sale.refund`
- `pos.sale.void`
- `inventory.adjust.approve`
- `inventory.transfer.approve`
- `purchasing.purchaseOrder.approve`
- `purchasing.payment.record`
- `payroll.run.approve`
- `reports.financial.export`
- `reports.audit.view`

Each sensitive workflow has an explicit risk tier so high-risk and critical authorization behavior remains predictable.

### 5. Regression Tests

Focused tests were added or updated to verify:

- Wildcard grants cannot bypass high-risk or critical permissions.
- Unknown permission keys are denied.
- Sensitive workflow aliases resolve through existing grants.
- Cross-organization access is denied even for wildcard users.
- Existing legacy permission compatibility remains intact.

## Verification Results

The following commands passed:

```powershell
npm test -- --runInBand lib/security/__tests__/rbac-permissions.test.ts lib/security/__tests__/rbac.test.ts
```

Result:

- 2 test suites passed.
- 15 tests passed.

```powershell
npm run typecheck
```

Result:

- TypeScript verification passed.

```powershell
npx eslint lib/security/rbac.ts lib/security/rbac-permissions.ts lib/security/__tests__/rbac-permissions.test.ts lib/security/__tests__/rbac.test.ts --ext .ts
```

Result:

- Focused lint passed.

## Future Authorization Rules

Every new protected feature must:

1. Define a canonical permission in `<module>.<resource>.<action>` format.
2. Assign a risk tier.
3. Enforce authorization on the server.
4. Scope all protected data access by the server-derived tenant or organization id.
5. Ignore client-supplied tenant, organization, user, role, permission, branch, approval, and threshold fields.
6. Use module gates before permission checks where module access applies.
7. Audit allowed and denied high-risk or critical actions.
8. Add tests for direct-call bypass, unauthorized access, and cross-tenant payload attempts.

## Residual Notes

The repository already had RBAC-related edits before this hardening pass. Those changes were preserved and this report covers the hardening work added on top of the existing worktree state.
