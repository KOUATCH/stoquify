# RBAC Authorization Security Review Report

Project: `E:\ohada saas\newStockFlow\aqstoqflow`  
Date: 2026-06-21  
Review type: Static, evidence-backed enterprise security review  
Scope: Auth/session, RBAC helpers, permissions, server actions, route handlers, service-layer authorization, Prisma scoping, tenant isolation, module gates, audit logging, maker-checker controls, tests, and seeded roles.

## 1. Executive Summary

The project now has a materially stronger RBAC foundation than a basic SaaS permission layer. The newer `lib/security/rbac.ts`, `lib/security/rbac-permissions.ts`, and `services/_shared/protect.ts` stack provides centralized permission checks, known-permission denial, tenant context validation, risk tiers, audit hooks, and fresh-auth support. Several sensitive accounting, POS, purchasing, payroll, inventory, and payment workflows already use this path.

The main enterprise risk is inconsistency. The modern RBAC layer is not yet the only enforcement path. Several older server actions, route handlers, UI permission helpers, and role templates still use legacy permission helpers, wildcard checks, role-name bypasses, or direct organization-id logic. This creates plausible bypass paths even though the new core is comparatively strong.

The highest-risk findings are:

- Legacy wildcard and role-name bypasses can still authorize sensitive behavior outside the central RBAC policy.
- Some actions allow wildcard users to cross organization boundaries in old code paths.
- Module/subscription gates are currently observation-first, not system-wide deny controls.
- Some route handlers validate session/organization membership but do not enforce resource permissions.
- Audit logging for critical security events is useful but not yet tamper-evident or fail-closed for critical operations.
- High-risk freshness and maker-checker controls are present in some workflows but not enforced uniformly by risk tier.

The system can become enterprise-grade if the project makes the modern RBAC layer mandatory across all protected entry points, removes legacy wildcard/admin bypass behavior, enforces module gates before grants, scopes every data operation by authenticated organization and branch/location where applicable, and adds regression tests that directly call server actions and route handlers with hostile cross-tenant payloads.

## 2. Current RBAC Strengths

### Strength: Centralized modern RBAC context

- Severity: Positive control
- Affected module: `lib/security/rbac.ts`
- Evidence: `requireRbacContext()` fetches the authenticated session, resolves the database user, roles, and permissions, rejects inactive/deleted organizations, locked users, unverified users, missing organization context, and stale organization mismatch.
- Security value: Authorization decisions are based on server-side database state instead of trusting client session claims alone.
- Keep and expand: Make this the only supported authorization context for protected server actions and route handlers.

### Strength: Known-permission-only checks and wildcard restriction

- Severity: Positive control
- Affected module: `lib/security/rbac-permissions.ts`
- Evidence: `isKnownPermission()` denies unknown permission keys. `hasRbacPermission()` prevents wildcard permission from satisfying high-risk and critical permissions.
- Security value: Prevents typo-based grants, invented permission strings, and broad wildcard access to sensitive operations.
- Keep and expand: Remove older helpers that still treat `*` or role names as unrestricted grants.

### Strength: Cross-tenant assertion in the modern RBAC helper

- Severity: Positive control
- Affected module: `lib/security/rbac.ts`
- Evidence: `assertCanUseOrganization()` denies cross-organization access even for superuser-style contexts.
- Security value: Tenant isolation is treated as a boundary stronger than ordinary permission checks.
- Keep and expand: Migrate old actions to this helper and remove local cross-org checks.

### Strength: Shared server-action protection wrapper

- Severity: Positive control
- Affected module: `services/_shared/protect.ts`
- Evidence: `protect()` combines fresh-auth checks, `requirePermission()`, tenant-input validation, handler-derived tenant mode, and safe error normalization.
- Security value: Gives server actions a repeatable guard pattern instead of hand-rolled permission logic.
- Keep and expand: Make `protect()` or an equivalent route-handler wrapper mandatory for protected entry points.

### Strength: Sensitive workflow maker-checker controls exist

- Severity: Positive control
- Affected modules:
  - `services/controls/sensitive-action.service.ts`
  - `services/inventory/inventory-adjustment.service.ts`
  - `services/inventory/inventory-transfer.service.ts`
  - `services/purchase-order/purchase-order.service.ts`
  - `services/purchasing/ap-control.service.ts`
  - `services/payroll/payroll-control.service.ts`
- Evidence: Inventory approvals, purchase-order approval, supplier-bank approval, payment release, and payroll release include self-approval separation checks.
- Security value: Reduces self-approval fraud and maker-checker bypass risk.
- Keep and expand: Tie these controls to the central permission/risk-tier layer and add uniform audit events.

### Strength: Focused RBAC tests have started

- Severity: Positive control
- Affected modules:
  - `lib/security/__tests__/rbac-permissions.test.ts`
  - `lib/security/__tests__/rbac.test.ts`
  - `services/_shared/__tests__/protect.test.ts`
  - `services/controls/__tests__/sensitive-action.service.test.ts`
- Evidence: Tests cover wildcard denial for sensitive permissions, unknown permissions, cross-org denial, tenant payload rejection, and fresh-auth paths.
- Security value: The new core has regression coverage.
- Keep and expand: Add route/action inventory tests to prove the entire application uses the core.

## 3. Confirmed Weak Points

### Finding 1: Legacy wildcard checks still allow cross-tenant behavior outside the modern RBAC guard

- Severity: Critical
- Affected files/modules:
  - `actions/categories/getCategoriesAction.ts`
  - `actions/units/unit-management-actions.ts`
  - `actions/locations/location-management-actions.ts`
  - `actions/brands/getBrandsAction.ts`
  - `actions/organization/organization-settings-actions.ts`
- Why risky: These files use direct checks such as `user.permissions?.includes("*")` or `permissions.has("*")` to bypass normal organization checks.
- Abuse path: A user with a legacy wildcard grant could supply another organization's id and read or mutate data outside their tenant, depending on the action.
- Required modification:
  - Replace local wildcard checks with `protect()` plus `requirePermission()`.
  - Always derive organization scope from `ctx.orgId`.
  - Call `assertCanUseOrganization(ctx, requestedOrgId)` where a route parameter must be validated.
  - Remove any `*`-based cross-tenant exception.
- Suggested tests:
  - Direct-call tests for each affected server action using a wildcard user and another organization's id.
  - Assert the action denies the request and does not call the service/query.

### Finding 2: Organization settings can create roles with wildcard permissions

- Severity: Critical
- Affected file/module: `actions/organization/organization-settings-actions.ts`
- Why risky: New organizations are seeded with an Administrator role containing `permissions: ["*"]`.
- Abuse path: A role assigned from this template can satisfy older legacy permission checks and may bypass non-critical permissions globally.
- Required modification:
  - Replace wildcard seed role permissions with explicit canonical permission keys from `lib/security/rbac-permissions.ts`.
  - Add a migration/backfill to remove `*` from existing tenant roles.
  - Add a DB or service-level validation rule that rejects `*` for tenant-admin roles.
  - If a platform superuser role is needed, keep it outside tenant roles and deny it for tenant data by default.
- Suggested tests:
  - Role creation rejects `*`.
  - Organization bootstrap creates explicit permissions only.
  - Existing wildcard roles cannot approve critical/high-risk actions.

### Finding 3: Legacy role-name bypass still grants permissions outside the modern risk policy

- Severity: Critical
- Affected file/module: `lib/permissions.ts`
- Why risky: The legacy `can()` path grants access for role codes such as `admin`, `administrator`, or `super_admin`, regardless of the canonical permission risk model.
- Abuse path: A user assigned a broad role name can pass legacy checks even if the role does not explicitly contain the required canonical permission.
- Required modification:
  - Remove role-name bypass behavior from `can()`.
  - Make legacy helpers delegate to `hasRbacPermission()` or mark them deprecated and fail closed for unknown permissions.
  - Replace role-code authorization with explicit permission membership only.
- Suggested tests:
  - `admin` role without explicit permission is denied.
  - Unknown permission is denied.
  - Critical/high-risk permissions require explicit permission, not role code.

### Finding 4: Module/subscription gates are observation-first, not system-wide deny controls

- Severity: High
- Affected files/modules:
  - `services/modules/module-control-contracts.ts`
  - `services/modules/module-entitlement.service.ts`
  - `actions/modules/module-control.actions.ts`
  - Protected business actions across POS, purchasing, payroll, accounting, reports, and inventory
- Why risky: `MODULE_CONTROL_MODE` is set to `observe`, and observed disabled-module access is allowed instead of denied.
- Abuse path: A tenant without a paid or enabled module could still execute protected server actions if they possess a permission, because permission checks are not globally preceded by enforce-mode module gates.
- Required modification:
  - Add permission-to-module metadata in the canonical permission catalog.
  - Enforce module gates inside `requirePermission()` or `protect()` before permission grants.
  - Use `observe` only for migration telemetry, never as the production security decision for protected modules.
  - Make disabled modules deny before permission checks.
- Suggested tests:
  - Disabled POS module denies `pos.sale.void`.
  - Disabled payroll module denies `payroll.run.approve`.
  - Disabled reports module denies `reports.financial.export`.
  - Denial is audited.

### Finding 5: Some API route handlers check session/org but not resource permission

- Severity: High
- Affected files/modules:
  - `app/api/v1/organisations/[id]/items/route.ts`
  - `app/api/v1/organisations/[id]/briefItems/route.ts`
  - `app/api/v1/organisations/route.ts`
- Why risky: Route handlers can be called directly and must not rely on UI navigation or dashboard checks.
- Abuse path: A logged-in member may query organization inventory endpoints without the specific inventory read permission.
- Required modification:
  - Add route-handler equivalents of `protect()` or use `requireRbacContext()` + `assertCanUseOrganization()` + `requirePermission("inventory.items.read")`.
  - Add `reports` or `organization` read permissions where endpoints expose organizational metadata.
  - Normalize unauthorized responses without leaking whether cross-tenant resources exist.
- Suggested tests:
  - Authenticated user without inventory permission receives 403.
  - Cross-tenant organization id receives 403/404-safe denial.
  - Direct route invocation bypassing UI is denied.

### Finding 6: User and invite actions use legacy permissions instead of critical admin authorization

- Severity: High
- Affected files/modules:
  - `actions/users/sendInvite.ts`
  - `actions/users/deleteUser.ts`
  - `actions/users/getOrgUsers.ts`
  - `actions/users/getOrgInvites.ts`
  - `actions/users/updateUserPassword.ts`
- Why risky: These are administrative identity operations but currently rely on `getAuthenticatedUser()` and legacy `hasAppPermission()` style checks.
- Abuse path: A user with a legacy permission or broad role can invite, remove, list, or reset users without modern risk-tier checks, fresh authorization, or consistent audit logging.
- Required modification:
  - Wrap identity mutations with `protect()`.
  - Map invite to `admin.user.invite`.
  - Add explicit permissions for user deactivate, password reset, invite read, and user read if missing.
  - Require fresh auth for invite, role assignment, password reset, user deactivation, and any role-affecting workflow.
  - Audit allowed and denied critical admin operations.
- Suggested tests:
  - Direct invite call without `admin.user.invite` is denied.
  - Cross-tenant role id cannot be assigned.
  - Password reset requires fresh auth and explicit permission.
  - Denied admin operations write audit events.

### Finding 7: Audit log is not tamper-evident or fail-closed for critical operations

- Severity: High
- Affected files/modules:
  - `lib/security/audit-log.ts`
  - `prisma/schema.prisma` `AuditLog` model
- Why risky: Security events are written best-effort and audit write failures are logged but do not fail critical operations. The audit model lacks hash chaining, request/correlation id, explicit decision result, and session metadata.
- Abuse path: A critical unauthorized or allowed operation could proceed without durable audit evidence if audit persistence fails. A privileged database actor could modify historical audit rows without detection.
- Required modification:
  - For critical operations, write authorization decision and business mutation in a transaction where possible.
  - Fail closed if critical audit persistence fails.
  - Add `requestId`, `correlationId`, `sessionId`, `decision`, `risk`, `permission`, `prevHash`, and `hash`.
  - Add append-only conventions and tests.
- Suggested tests:
  - Critical action fails if audit write fails.
  - Audit event includes permission, org, actor, decision, and correlation id.
  - Hash chain verifies after multiple critical events.

### Finding 8: Fresh-auth is available but not uniformly tied to risk tiers

- Severity: High
- Affected files/modules:
  - `lib/security/rbac.ts`
  - `services/_shared/protect.ts`
  - `lib/security/auth-session.ts`
  - `actions/accounting/close-assurance.actions.ts`
  - `actions/purchasing/ap-control.actions.ts`
  - `actions/payroll/payroll-control.actions.ts`
  - `actions/accounting/journals.actions.ts`
- Why risky: Some critical actions use `freshAuth`, but others rely on ordinary permission checks. Some actions pass `Date.now()` as `lastAuthAt` to services after fresh-auth validation, which can weaken service-level freshness reasoning.
- Abuse path: A stolen or long-lived session with valid permissions may execute sensitive actions that do not require recent re-authentication or MFA.
- Required modification:
  - Add risk metadata to permission checks and require fresh auth automatically for `high` and `critical` actions unless explicitly waived by policy.
  - Use real session `lastAuthAt`/`mfaVerifiedAt`, not `Date.now()`, when passing freshness evidence to services.
  - Add step-up MFA for role assignment, period close/reopen, journal post/reverse, payroll approval, payment release, financial export, and critical inventory approvals.
- Suggested tests:
  - Critical action with stale auth is denied.
  - Service receives actual session freshness timestamp.
  - MFA-required action denies a session without recent MFA.

### Finding 9: Tenant guard does not fully validate nested organization, branch, location, and amount-scope fields

- Severity: High
- Affected file/module: `services/_shared/protect.ts`
- Why risky: `assertTrustedTenantInput()` currently checks root/data organization fields but does not comprehensively inspect nested arrays, branch ids, location ids, approval-state fields, or amount thresholds.
- Abuse path: A caller may supply a valid organization id but include another tenant's branch/location/item/customer/supplier ids in nested payloads if the service does not re-scope every lookup.
- Required modification:
  - Prefer `handler-derived` tenant mode by default and reject client-supplied tenant identifiers unless explicitly required.
  - Add typed scope validators such as `assertCanUseBranch()`, `assertCanUseLocation()`, `assertCanUseEntity()`, and service-level ownership checks.
  - Centralize branch/location membership in session claims or DB-fetched authorization context.
  - Validate amount thresholds server-side only.
- Suggested tests:
  - Nested line item from another tenant is denied.
  - Cross-tenant branch/location id is denied.
  - Client-supplied amount threshold/approval state is ignored or rejected.

## 4. Possible Exploit or Bypass Paths

### Exploit path: Wildcard user reads another tenant through old category/unit/location actions

- Severity: Critical
- Affected files/modules: `actions/categories/getCategoriesAction.ts`, `actions/units/unit-management-actions.ts`, `actions/locations/location-management-actions.ts`
- Scenario: Attacker has a legacy wildcard permission from an Administrator role. They directly invoke a server action with another organization's id. The legacy action accepts `*` as a cross-org exception.
- Required modification: Remove wildcard tenant exceptions and migrate all affected actions to `protect()` + `ctx.orgId`.
- Suggested test: Simulate wildcard user and assert cross-tenant id is denied.

### Exploit path: Disabled module still permits action execution

- Severity: High
- Affected modules: Module entitlement service and all protected module actions
- Scenario: Tenant has `payroll` or `pos` disabled. User still has a permission and calls the action directly. Because entitlement is observe-mode, access proceeds.
- Required modification: Enforce module gates in `requirePermission()` or `protect()` before permission checks.
- Suggested test: Disable module and assert server action returns forbidden before service call.

### Exploit path: Inventory API direct-call bypass

- Severity: High
- Affected files/modules: `app/api/v1/organisations/[id]/items/route.ts`, `app/api/v1/organisations/[id]/briefItems/route.ts`
- Scenario: Authenticated member without inventory read permission calls the API route directly.
- Required modification: Add route handler RBAC guard and test direct calls.
- Suggested test: Mock a session with no inventory permissions and assert 403.

### Exploit path: Admin role-name bypass grants sensitive action through legacy helper

- Severity: High
- Affected file/module: `lib/permissions.ts`
- Scenario: A role code such as `admin` passes old `can()` checks without explicit permission assignment.
- Required modification: Remove role-name bypass and require explicit canonical permissions.
- Suggested test: Admin role without explicit permission is denied.

### Exploit path: Critical operation proceeds without durable audit evidence

- Severity: High
- Affected modules: `lib/security/audit-log.ts`, critical actions
- Scenario: Audit insert fails during a critical operation, but the business operation continues.
- Required modification: Critical audit events must be transactional or fail-closed.
- Suggested test: Force audit insert failure and assert critical action fails.

## 5. Cross-Tenant Leakage Risks

### Risk: Client-supplied organization id accepted by legacy actions

- Severity: Critical
- Affected files/modules: Category, unit, location, brand, and organization settings actions
- Why risky: Tenant scope is sometimes selected from user input rather than authenticated context.
- Required modification: Treat client-supplied organization id as untrusted. Derive tenant scope from `requireRbacContext()`.
- Suggested tests: Direct server-action calls with another tenant id.

### Risk: Route handlers expose organization-scoped resources with membership checks but no resource permission

- Severity: High
- Affected modules: API v1 organization inventory routes
- Why risky: Membership alone is not sufficient for least-privilege enforcement.
- Required modification: Add resource-specific `requirePermission()` checks.
- Suggested tests: Same-tenant user without resource permission receives denial.

### Risk: Branch and location scoping are not centralized

- Severity: High
- Affected modules: POS, inventory, purchasing, location-aware workflows
- Why risky: A same-tenant user may operate outside authorized branch/location boundaries if services do not consistently validate ownership and membership.
- Required modification: Add branch/location-aware authorization helpers and enforce them in service queries.
- Suggested tests: User authorized for branch A cannot approve, sell, move, count, or export branch B data.

## 6. Privilege Escalation Risks

### Risk: Wildcard role bootstrap and legacy wildcard helpers

- Severity: Critical
- Affected modules: Role seed/bootstrap and legacy permission helpers
- Abuse path: A tenant admin role with `*` can pass older code paths and potentially grant or exercise permissions not intended by the new catalog.
- Required modification: Remove `*` from tenant roles and deprecate wildcard semantics.
- Suggested tests: No tenant role contains `*`; wildcard does not satisfy high/critical or cross-tenant checks.

### Risk: Role assignment and user invite not fully centralized under critical admin policy

- Severity: High
- Affected modules: User invite and role assignment workflows
- Abuse path: A user with broad legacy user permissions can invite users into privileged roles.
- Required modification: Add `admin.role.assign`, `admin.user.invite`, fresh auth, role-assignment policy checks, and audit events.
- Suggested tests: Inviter cannot assign a role containing permissions they do not hold; critical role assignments require fresh auth and audit.

### Risk: Public/client permission exposure can become a trust source

- Severity: Medium
- Affected modules: `app/api/me/permissions/route.ts`, UI permission helpers
- Abuse path: Client-visible permissions are modified or forged in browser state and used by code that assumes frontend checks are security.
- Required modification: Keep endpoint for UX only, document as non-authoritative, and ensure all mutations are server-guarded.
- Suggested tests: Hidden UI action called directly is still denied.

## 7. Missing Authorization Coverage

The following areas need explicit coverage review and migration:

- `actions/categories/getCategoriesAction.ts`: migrate to `protect()` and `ctx.orgId`.
- `actions/units/unit-management-actions.ts`: migrate to `protect()` and remove wildcard tenant exception.
- `actions/locations/location-management-actions.ts`: migrate to `protect()` and add branch/location scope policy.
- `actions/brands/getBrandsAction.ts`: migrate to `protect()` and remove explicit-org wildcard behavior.
- `actions/organization/organization-settings-actions.ts`: remove wildcard role creation and centralize organization-admin permissions.
- `actions/users/*.ts`: migrate identity administration to canonical admin permissions, fresh auth, and audit.
- `app/api/v1/organisations/[id]/items/route.ts`: add resource permission.
- `app/api/v1/organisations/[id]/briefItems/route.ts`: add resource permission.
- `app/api/v1/organisations/route.ts`: add organization read/admin permission policy.
- `components/Forms/RoleForm.tsx`: stop using legacy permission catalog directly; use canonical permission catalog or server-supplied assignable permission matrix.

## 8. Missing or Weak Tests

### Missing test: Direct server-action bypass inventory

- Severity: High
- Affected modules: All `use server` actions
- Required modification: Add a test inventory that scans protected actions and verifies they use `protect()`, `requirePermission()`, or a documented exception.
- Suggested tests: Static guard test plus targeted runtime tests for legacy action families.

### Missing test: Legacy wildcard cross-tenant regression

- Severity: Critical
- Affected modules: Categories, units, locations, brands, organization settings
- Required modification: Add direct-call tests with wildcard user and foreign organization id.
- Expected result: Denied, no service/query called.

### Missing test: Module disabled denial

- Severity: High
- Affected modules: POS, purchasing, payroll, reports, accounting, inventory
- Required modification: Add tests proving disabled modules deny before permission grants.
- Expected result: Denied and audited.

### Missing test: API route resource permission denial

- Severity: High
- Affected modules: API v1 organization routes
- Required modification: Test direct route invocation with valid session but missing permission.
- Expected result: 403/404-safe denial.

### Missing test: Critical audit failure

- Severity: High
- Affected modules: Critical protected actions
- Required modification: Mock audit write failure and assert critical operation fails closed.
- Expected result: No mutation without audit evidence.

### Missing test: Role assignment privilege escalation

- Severity: High
- Affected modules: Admin role/user invite workflows
- Required modification: Test that users cannot assign roles or permissions above their own allowed assignment policy.
- Expected result: Denied and audited.

## 9. Required Hardening Modifications

1. Make the modern RBAC path mandatory.
   - Add a route-handler guard equivalent to `protect()`.
   - Add a static test that flags new `use server` actions without `protect()` or `requirePermission()`.
   - Add a documented exception list for public/read-only endpoints.

2. Remove wildcard authorization from tenant roles.
   - Replace `permissions: ["*"]` with explicit canonical permissions.
   - Backfill existing roles.
   - Reject future wildcard grants in role creation/update services.

3. Deprecate legacy permission helpers.
   - Make `lib/permissions.ts` and `config/permissions.ts` delegate to the canonical RBAC catalog or mark them UI-only.
   - Remove role-code bypasses.
   - Deny unknown permissions everywhere.

4. Enforce module gates before permission checks.
   - Add module metadata to every permission.
   - Deny disabled modules in `requirePermission()`/`protect()`.
   - Audit module-gate denials.

5. Harden identity administration.
   - Protect invite, role assignment, user deletion/deactivation, password reset, and user listing.
   - Use `admin.user.invite`, `admin.role.assign`, and explicit user-management permissions.
   - Require fresh auth and MFA for privileged identity changes.
   - Prevent assigning a role containing permissions the actor is not allowed to grant.

6. Strengthen audit logging.
   - Make critical authorization audit writes fail-closed.
   - Add tamper-evident hash chaining.
   - Add request id, correlation id, session id, permission, risk, decision, and reason.
   - Add alerting for denied critical attempts and audit persistence failures.

7. Add branch, location, and entity-scope authorization.
   - Add `assertCanUseBranch()`, `assertCanUseLocation()`, and typed entity-scope helpers.
   - Validate nested ids at service boundaries using authenticated org/branch context.
   - Reject client-supplied approval state and amount threshold fields.

8. Tie fresh auth to risk tiers.
   - Require fresh auth for high-risk and critical permissions by default.
   - Require MFA step-up for critical permissions.
   - Pass actual session freshness timestamps to services.

9. Secure public and semi-public routes.
   - Review receipt endpoints for signed token or sufficiently unguessable id.
   - Add rate limiting where public identifiers can be probed.
   - Avoid leaking cross-tenant existence through error messages.

10. Normalize role and permission UI.
   - Use the canonical permission catalog for assignable permissions.
   - Hide permissions the actor cannot grant.
   - Keep UI checks as UX only; enforce all assignment rules server-side.

## 10. Priority-Ranked Remediation Roadmap

### Priority 0: Stop confirmed cross-tenant and wildcard bypass risk

- Remove wildcard tenant exceptions from categories, units, locations, brands, and organization settings actions.
- Replace wildcard role bootstrap.
- Backfill existing roles that contain `*`.
- Add direct-call cross-tenant tests.

### Priority 1: Make authorization centralized across entry points

- Migrate user/admin actions to `protect()`.
- Add route-handler guard and protect API v1 organization routes.
- Add static guard tests for server actions and route handlers.

### Priority 2: Enforce module gates and risk-tier freshness

- Add permission-to-module metadata.
- Deny disabled modules globally.
- Auto-require fresh auth/MFA for high and critical permissions.

### Priority 3: Harden audit and maker-checker assurance

- Add tamper-evident critical audit log fields.
- Fail closed when critical audit persistence fails.
- Expand maker-checker tests to all listed sensitive workflows.

### Priority 4: Strengthen branch/location/entity scoping

- Add scoped authorization helpers.
- Add nested payload and cross-branch tests.
- Convert service queries to use authenticated org/branch scope consistently.

### Priority 5: Consolidate catalogs and documentation

- Merge legacy and modern permission catalogs.
- Document the required authorization pattern for future features.
- Add CI checks for unknown permissions and unprotected server actions.

## 11. Files and Modules That Need Changes

Critical/hardening changes:

- `actions/categories/getCategoriesAction.ts`
- `actions/units/unit-management-actions.ts`
- `actions/locations/location-management-actions.ts`
- `actions/brands/getBrandsAction.ts`
- `actions/organization/organization-settings-actions.ts`
- `lib/permissions.ts`
- `config/permissions.ts`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `services/_shared/protect.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `lib/security/audit-log.ts`
- `prisma/schema.prisma`

Admin/identity changes:

- `actions/users/sendInvite.ts`
- `actions/users/deleteUser.ts`
- `actions/users/getOrgUsers.ts`
- `actions/users/getOrgInvites.ts`
- `actions/users/updateUserPassword.ts`
- `services/users/user-identity.service.ts`
- `services/users/user-lifecycle.service.ts`
- `components/Forms/RoleForm.tsx`

Route-handler changes:

- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `app/api/v1/organisations/route.ts`
- `app/api/receipts/[receiptId]/route.ts`

Test changes:

- `lib/security/__tests__/rbac-permissions.test.ts`
- `lib/security/__tests__/rbac.test.ts`
- `services/_shared/__tests__/protect.test.ts`
- Add action-level tests for categories, units, locations, brands, organization settings, and users.
- Add route-handler tests for API v1 organization endpoints.
- Add static authorization coverage tests.

## 12. Verification Plan

### Focused static checks

```powershell
rg "permissions\?\.includes\(\"\\*\"\)|permissions\.has\(\"\\*\"\)|includes\('\*'\)|hasAppPermission|getAuthenticatedUser\(" actions app services lib config
rg "use server" actions
rg "requirePermission|protect\(" actions app services
rg "findMany\(|findFirst\(|update\(|delete\(" services actions app
```

Purpose:

- Find remaining wildcard grants.
- Find legacy auth helpers in protected paths.
- Find unprotected server actions.
- Review raw Prisma access for missing organization scope.

### Focused unit and integration tests

```powershell
npm test -- lib/security/__tests__/rbac-permissions.test.ts
npm test -- lib/security/__tests__/rbac.test.ts
npm test -- services/_shared/__tests__/protect.test.ts
npm test -- services/controls/__tests__/sensitive-action.service.test.ts
npm test -- services/inventory/__tests__
npm test -- services/purchase-order/__tests__
npm test -- services/purchasing/__tests__
npm test -- services/payroll/__tests__
```

Purpose:

- Prove permission catalog behavior.
- Prove tenant denial.
- Prove direct server-action guard behavior.
- Prove maker-checker controls.

### New regression tests to add

```powershell
npm test -- actions/categories/__tests__/authorization.test.ts
npm test -- actions/units/__tests__/authorization.test.ts
npm test -- actions/locations/__tests__/authorization.test.ts
npm test -- actions/brands/__tests__/authorization.test.ts
npm test -- actions/organization/__tests__/authorization.test.ts
npm test -- actions/users/__tests__/authorization.test.ts
npm test -- app/api/v1/organisations/__tests__/authorization.test.ts
```

Required assertions:

- Cross-tenant ids are denied, even for wildcard roles.
- Hidden UI actions are denied when called directly.
- Disabled modules deny before permission checks.
- Critical actions require fresh auth and MFA where configured.
- Role assignment cannot grant permissions above the actor's authority.
- Critical allowed and denied decisions create audit events.
- Public receipt access is tokenized or rate-limited.

### Type and build verification

```powershell
npm run typecheck
npm run lint
```

Purpose:

- Confirm permission-key normalization is type-safe.
- Confirm no deprecated legacy helper usage remains after migration.

## Sensitive Workflow Coverage Matrix

| Workflow | Current observed status | Risk | Required hardening |
|---|---|---:|---|
| `admin.role.assign` | Canonical alias exists, but role/user admin actions still use legacy paths in places | High | Centralize role assignment under `protect()`, fresh auth, MFA, grant-policy, audit |
| `admin.user.invite` | Canonical alias exists, invite action uses legacy permission helper | High | Wrap invite action in `protect({ permission: "admin.user.invite", freshAuth: true, auditAllowed: true })` |
| `accounting.journal.post` | Protected with fresh auth | Medium | Ensure service receives real session freshness and audit is fail-closed |
| `accounting.journal.reverse` | Protected with fresh auth | Medium | Same as journal post |
| `accounting.period.close` | Protected with fresh auth | Medium | Add module gate and critical audit hardening |
| `accounting.period.reopen` | Needs explicit coverage confirmation | High | Add explicit permission, fresh auth, MFA, audit, tests |
| `pos.cash.adjust` | Alias exists; POS tender actions use modern protection for refund/void | High | Verify cash adjustment action uses canonical permission and branch scope |
| `pos.sale.refund` | Protected with fresh auth in tender actions | Medium | Add branch/location scope tests and audit fail-closed |
| `pos.sale.void` | Protected with fresh auth in tender actions | Medium | Add branch/location scope tests and audit fail-closed |
| `inventory.adjust.approve` | Alias and service self-approval checks exist | Medium | Add module gate, critical audit, direct-call tests |
| `inventory.transfer.approve` | Alias and service self-approval checks exist | Medium | Add branch/location scope tests |
| `purchasing.purchaseOrder.approve` | Service self-approval checks exist | Medium | Ensure action uses canonical alias and fresh auth where required |
| `purchasing.payment.record` | Alias exists; AP control payment release uses fresh auth | Medium | Verify payment record uses canonical permission and no self-release |
| `payroll.run.approve` | Payroll approve/release uses modern protection | Medium | Add MFA/fresh-auth risk policy and audit hardening |
| `reports.financial.export` | Export action uses fresh auth | Medium | Add module gate, export audit, rate limiting, and data-scope tests |
| `reports.audit.view` | Alias exists; coverage needs confirmation | High | Add explicit route/action guard and audit-log access tests |

## Conclusion

The project has a strong modern RBAC core, but the security posture is only as strong as the weakest still-active authorization path. The immediate hardening work should focus on removing wildcard and role-name bypasses, migrating all legacy actions/API routes to the central RBAC layer, enforcing module gates before permission checks, and making critical audit records durable and tamper-evident.

Once those changes are complete and backed by direct-call, cross-tenant, module-disabled, and privilege-escalation tests, the RBAC layer will be much closer to a watertight, enterprise-grade platform security control.
