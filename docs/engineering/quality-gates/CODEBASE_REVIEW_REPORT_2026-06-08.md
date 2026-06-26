# AqStoqFlow Codebase Review Report

Date: 2026-06-08  
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`  
Review mode: Evidence-backed code review after a fresh graphify pass

## Executive Summary

This review found that the repository is not currently production-ready. The TypeScript and Prisma checks pass, but the production build fails, and several tenant/RBAC boundaries are still inconsistent across server actions.

The most urgent issues are:

1. The production build fails because BetterAuth pulls a Kysely adapter module that imports symbols unavailable from the installed Kysely package.
2. Role management actions can read and update roles by id without enforcing organization scope or role-management permissions.
3. Some tenant-scoped server actions trust client-supplied `organizationId` values instead of deriving or validating the organization server-side.
4. A public receipt endpoint returns customer contact data using only a sales-order id.
5. Jest is configured, but the repository currently has zero matching tests.

Resolve the blockers before shipping or deploying.

## Scope Reviewed

The review began with a code-focused graphify pass over review-relevant source directories:

- `app`
- `actions`
- `services`
- `lib`
- `hooks`
- `prisma`
- `middleware.ts`
- `components`
- `validations`
- `types`
- `config`
- `i18n`
- `next.config.mjs`

Docs and `public` images were intentionally excluded from the first graphify pass because the initial detector found a large corpus: 1,028 supported files, including 326 images and 158 documents.

Generated graph artifacts:

- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`

Graph summary:

- 2,092 nodes
- 2,800 edges
- 360 raw communities
- 65 non-empty communities in the report
- 0 token cost because the pass used deterministic AST extraction only

Graphify highlighted these central abstractions:

- `localizePath()`
- `pickLocale()`
- `SystemMonitor`
- `useNotifications()`
- `getSession()`
- `ResilientDatabase`
- `CircuitBreaker`
- `ErrorHandler`
- `scopedOrg()`
- `requireOrg()`

Those graph hubs guided the review toward routing/i18n, auth/session handling, organization scoping, error handling, and shared server action patterns.

## Verification Results

### Passed

`npm run prisma:validate`

Result: Pass. Prisma schema is valid.

Note: Prisma warned that `package.json#prisma` is deprecated and should move to a Prisma config file before Prisma 7.

`npm run typecheck`

Result: Pass. `tsc --noEmit --pretty false` completed successfully.

`npm run lint`

Result: Pass with warnings. Warnings included:

- Async client component warning in `app/[locale]/(auth)/verify/[userId]/page.tsx`
- Missing React hook dependencies in auth and inventory components
- Several `<img>` usage warnings
- `next lint` deprecation warning for Next.js 16

### Failed

`npm test -- --runInBand`

Result: Fail. Jest found no tests.

Evidence:

- 1,093 files checked
- 0 test matches
- Test patterns are configured in `jest.config.ts`

`npm run build`

Result: Fail. Production build fails with webpack errors.

Evidence:

- `better-auth@1.6.14` is installed.
- `kysely@0.29.2` is installed transitively.
- Build fails in `@better-auth/kysely-adapter` because it imports `DEFAULT_MIGRATION_TABLE` and `DEFAULT_MIGRATION_LOCK_TABLE` from `kysely`, but those exports are unavailable.
- Import trace reaches `lib/auth.ts` and `app/api/auth/[...all]/route.ts`.

## Findings

### Blocker 1: Production Build Fails

Layer: Correctness in practice  
Severity: Blocker

Why it matters:

The app cannot ship, deploy, or be validated in production mode while `next build` fails.

Evidence:

- Build script is defined at `package.json:11`.
- BetterAuth dependency is defined at `package.json:76`.
- Auth imports are in `lib/auth.ts:1-6`.
- `npm run build` fails with webpack errors from `@better-auth/kysely-adapter`.
- The installed dependency tree includes `better-auth@1.6.14` and `kysely@0.29.2`.

Impact:

- No production artifact can be generated.
- CI/CD build gates should fail.
- Runtime behavior cannot be trusted because route generation never completes.

Recommended remediation:

Resolve the BetterAuth/Kysely compatibility issue. Likely paths are pinning a compatible Kysely version, upgrading BetterAuth if a fixed release exists, or configuring the import/build path so the unused Kysely adapter modules are not pulled into the Next.js bundle.

### Blocker 2: Role Management Bypasses Tenant and Permission Checks

Layer: Auth and authorization  
Severity: Blocker

Why it matters:

Role management controls permissions. If role reads or updates are not scoped to the current organization and not guarded by explicit permissions, a user can potentially inspect or modify roles they should not control.

Evidence:

- `actions/roles/getRoleById.ts:7` exports `getRoleById`.
- `actions/roles/getRoleById.ts:9-10` uses `db.role.findUnique({ where: { id } })`.
- `actions/roles/updateRole.ts:10` exports `updateRole`.
- `actions/roles/updateRole.ts:43-44` updates by `id` only.
- `actions/roles/updateRole.ts:51` writes `permissions: data.permissions`.
- The route `app/[locale]/(dashboard)/dashboard/settings/roles/update/[id]/page.tsx:11` calls `getRoleById(id)`.
- `components/Forms/RoleForm.tsx:44-45` calls `updateRole(editingId, data)` or `createRole(data)`.

Impact:

- Cross-organization role reads are possible if a role id is known.
- Unauthorized role updates are possible if the server action is invoked directly.
- Permission escalation is possible because `permissions` can be updated without checking whether the current user may manage roles or grant those permissions.

Recommended remediation:

Move role actions to the same pattern used by stronger modules:

- Resolve the current user through `requireOrg()` or `getAuthenticatedUser()`.
- Enforce `READ_ROLES`, `CREATE_ROLES`, and `UPDATE_ROLES`.
- Query roles with both `id` and `organizationId`.
- For permission assignment, ensure the actor is allowed to grant every requested permission.
- Consider audit logging role permission changes.

### Blocker 3: Some Tenant-Scoped Actions Trust Client-Supplied Organization IDs

Layer: Tenant isolation  
Severity: Blocker

Why it matters:

In a multi-tenant SaaS, server actions must never trust client-provided organization scope unless they validate it against the authenticated user. Otherwise, a caller can request another tenant's data by changing an id.

Evidence:

- `actions/locations/getOrgLocations.ts:6` accepts `orgId`.
- `actions/locations/getOrgLocations.ts:8` calls `listLocations(orgId)` directly.
- `hooks/useAllLocationsQueries.ts:24` exposes `useOrgLocationsNew`.
- `hooks/useAllLocationsQueries.ts:37` calls `getOrgLocations(organizationId)` from the client query function.
- `actions/units/getOrgUnits.ts:6` accepts `orgId`.
- `actions/units/getOrgUnits.ts:16` calls `listUnits(orgId)` directly.

Contrast:

Other newer actions use stronger patterns, such as `requireOrg()` or explicit organization access checks. Brand and category actions have a stronger `resolveOrgId` pattern, and API item routes call `requireApiSessionForOrg`.

Impact:

- Cross-tenant data disclosure is possible through server actions that list organization data by caller-supplied ids.
- The behavior is inconsistent across modules, making future changes easy to get wrong.

Recommended remediation:

Normalize tenant-scoped server actions:

- Derive `orgId` from the authenticated user by default.
- Allow explicit organization ids only for verified superuser flows.
- Use a shared helper such as `requireOrg()` or a stricter `assertOrganizationAccess()`.
- Add tests for same-org access, cross-org denial, and missing session.

### High 1: Public Receipt Endpoint Exposes Customer Contact Data

Layer: Security and privacy  
Severity: High

Why it matters:

Public receipt links can be valid, but they should be deliberate, least-privilege, and hard to enumerate. The current public route returns customer email and phone when given only a sales-order id.

Evidence:

- `app/api/receipts/[receiptId]/route.ts:10` calls `getPublicSalesReceipt({ salesOrderId: receiptId })`.
- `services/pos/receipt.service.ts:356-358` calls `findSalesReceipt(input.salesOrderId)` without organization or session scope.
- `services/pos/receipt.service.ts:270-271` returns `customerEmail` and `customerPhone`.

Impact:

- Customer PII can be disclosed if a sales-order id leaks.
- Receipt ids become bearer secrets, but the code does not clearly treat them as such.

Recommended remediation:

Choose one of these safer designs:

- Require authentication for the API and scope access to the organization.
- Use signed, expiring receipt tokens instead of raw sales-order ids.
- Redact customer contact details from public receipts.
- Rate-limit public receipt lookups and audit access.

### High 2: Jest Is Configured But There Are No Tests

Layer: Testing  
Severity: High

Why it matters:

The codebase includes high-risk workflows: tenant scoping, RBAC, auth, POS, finance, inventory, receipt delivery, and file uploads. There is no automated regression coverage for the reviewed risks.

Evidence:

- `package.json:19` defines `"test": "jest"`.
- `jest.config.ts:34` defines matching test patterns.
- `npm test -- --runInBand` fails with "No tests found".

Impact:

- Security regressions are likely to be reintroduced.
- Refactors can pass typecheck while breaking authorization or tenant isolation.
- Build and lint are the only automated gates currently giving useful signal.

Recommended remediation:

Start with focused tests for the highest-risk server behavior:

- Role actions reject users without `READ_ROLES`, `CREATE_ROLES`, or `UPDATE_ROLES`.
- Role actions cannot read/update roles from another organization.
- Location and unit list actions ignore or reject cross-org ids.
- Public receipt behavior is either authenticated, token-guarded, or redacted.
- Build failure dependency fix is protected by CI running `npm run build`.

## Quality Dimension Notes

- Data integrity: Gap. Financial and POS services exist, but build failure and missing tests prevent confidence.
- API contract: Gap. Some API routes are scoped well, but public receipt and org-id-trusting actions are risky.
- State and data flow: Gap. Query hooks expose organization-scoped server actions to client-provided ids.
- UI states: Partial. Lint warnings show hook dependency concerns; not deeply exercised manually.
- Auth and authorization: Gap. Central patterns exist, but role and organization-scoped actions bypass them.
- Security: Gap. Tenant isolation, permission escalation, and public PII exposure need remediation.
- Observability: Partial. Error handling and monitoring modules exist, but many logs are ad hoc.
- Performance: Not deeply reviewed. Build does not complete.
- Accessibility: Not deeply reviewed.
- i18n/localization: Partial. Graph hubs show strong routing utilities, but hardcoded dashboard paths remain in some actions/components.
- Theming/design system: Not deeply reviewed.
- Testing: Gap. No tests found.
- Migrations/backward compatibility: Partial. Prisma validates, but Prisma 7 config deprecation is pending.
- Rollout/operations: Gap. Build failure blocks release.
- Maintainability: Gap. Multiple auth/org-scoping patterns coexist.

## Recommended Remediation Order

1. Fix the production build failure.
2. Lock down role management with org scope, permission checks, and audit logging.
3. Normalize tenant-scoped server actions around `requireOrg()` or a shared access helper.
4. Decide the intended security model for public receipts and remove unnecessary PII from public responses.
5. Add a focused Jest test suite for the fixed security boundaries.
6. Re-run `npm run prisma:validate`, `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build`.

## Final Readiness Assessment

Current status: Not ready to ship.

The repository has promising architecture pieces: graphify shows central localization, auth/session, error handling, and organization-scoping abstractions. The main risk is uneven adoption of those abstractions. The codebase needs a short hardening pass focused on build health, RBAC, tenant isolation, and tests before it can be treated as production-ready.
