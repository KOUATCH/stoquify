# AqStoqFlow Module-Oriented SaaS Execution Plan

Date: 2026-06-18  
Purpose: Step-by-step technical, architectural, product, UX, security, migration, and rollout plan for transforming AqStoqFlow from a full-suite operating model into a professional module-oriented SaaS platform without breaking existing functionality.  
Status: Execution blueprint. This is a planning artifact, not a production claim.

---

## 1. Executive Summary

AqStoqFlow should become a module-oriented SaaS operating platform, but the implementation must be controlled and staged. The correct transformation is not to split the product into disconnected mini-apps. The correct transformation is to keep one unified OHADA SMB operating system with one tenant model, one RBAC model, one ledger-first backbone, one audit/event spine, one country-pack direction, and one service-boundary discipline, then add a durable module entitlement layer that decides which parts of the operating system each tenant can see and use.

The winning access model is:

```text
Authenticated user
  -> active organization
  -> tenant isolation
  -> module entitlement
  -> RBAC permission
  -> sensitive-action policy / step-up
  -> country-pack / compliance rule
  -> service action
  -> audit / event / ledger evidence
```

The transformation should happen in observe-first phases. The system should first know what modules exist, what routes/actions/services belong to each module, and what entitlements each tenant should have. Only after this map is correct should enforcement begin. The safest path is:

1. Create a module registry and access map.
2. Add module entitlement schema without changing behavior.
3. Seed and migrate tenants into default/legacy entitlements.
4. Build module gate services in observe mode.
5. Extend protected server actions and page/API guards.
6. Make navigation and dashboards entitlement-aware.
7. Integrate register, onboarding, login redirects, and admin module settings.
8. Enforce module gates progressively by module and risk level.
9. Add billing, partner grants, usage metering, and commercial automation.
10. Harden with release gates, tests, rollback paths, and audit evidence.

The guiding rule is simple: do not make modules invisible in the UI until the backend can also deny direct URL, server action, API, report, export, and background-job access.

---

## 2. Language Locked

- Module: A commercial and operational product area such as POS, Inventory, Accounting, Compliance, Payroll, Finance, Purchasing, Analytics, Accountant Portal, Offline Branch, or Administration.
- Entitlement: The tenant-level right to use a module in a specific state such as active, trial, pending, read-only, suspended, expired, or cancelled.
- RBAC permission: The user-level right to perform an action inside an entitled module.
- Module gate: A server-side authorization check that blocks access when the tenant is not entitled to a module or operation.
- Observe mode: A rollout state where module gates record what would be allowed or denied, but do not yet block production workflows.
- Enforcement mode: A rollout state where module gates actively deny access across UI, routes, actions, APIs, reports, exports, and jobs.

---

## 3. Current State Assessment

### 3.1 Existing strengths to reuse

AqStoqFlow already has several foundations that make this transformation realistic.

1. Organization onboarding already captures module intent.
   - `prisma/schema.prisma` has `Organization.requestedModules String[]`, `companySize`, `businessType`, `branchCount`, `primaryPain`, `setupRole`, and `onboardingSource`.
   - `services/users/user-identity.service.ts` normalizes `requestedModules`.
   - `components/auth/v2/RegisterV2Form.tsx` collects module choices during registration.

2. RBAC is already a serious authorization layer.
   - `Role.permissions` exists in `prisma/schema.prisma`.
   - `lib/security/rbac.ts` exposes `requirePermission`, `requireAnyPermission`, `requireAllPermissions`, `auditRbacDecision`, and cross-organization denial.
   - `config/permissions.ts` already groups permissions by business domains such as Inventory, Sales, Purchase, Financial, Accounting, Compliance, Payroll, POS, Analytics, System, Communication, and Data.

3. Protected server-action wrappers already exist.
   - `services/_shared/protect.ts` supports required permission, audit resource, fresh auth, and tenant input checks.
   - This is the right enforcement point to extend with `moduleKey`.

4. Navigation is already permission-aware.
   - `config/sidebar.ts` defines the full application shell.
   - `components/dashboard/Sidebar.tsx` and `components/dashboard/Navbar.tsx` filter links using `hasPermission`.
   - `components/dashboard/useShellPermissions.ts` centralizes permission access for the shell.

5. The technical specification already expects module gates.
   - `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md` describes module architecture, platform foundation, module gate, tenant scope, RBAC, step-up, ledger-first events, country packs, compliance, payroll, and accountant access.
   - `C:\Users\J COMPUTER\.codex\skills\002-aqstoqflow-control-plane\references\chunk-blueprint.md` places module gates inside the early Platform Control Plane chunk.

6. The graph report supports the control-plane direction.
   - `graphify-out/GRAPH_REPORT.md` highlights Tenant Defence In Depth, Server Action Security Stack, Enterprise RBAC Control Plane, Ledger-First OHADA Operating Spine, and Ledger-Backed Compliance Control Plane.

### 3.2 Current gaps

1. `requestedModules` is intent, not authorization.
   - It tells the system what a tenant requested during onboarding.
   - It does not define active subscription, trial, suspension, expiration, read-only archive, granted-by actor, plan, billing status, dependency, or audit history.

2. Navigation is permission-gated but not entitlement-gated.
   - A user with broad permissions can still see broad parts of the shell.
   - The shell lacks `moduleKey` metadata for each route and dropdown item.

3. Backend gates do not yet include module access.
   - `protect()` checks permission and tenant input.
   - It does not yet check whether the tenant has the module.

4. Page/auth utilities do not yet check module access.
   - `config/useAuth.ts` has permission checks for pages/layouts.
   - It needs module-aware helpers such as `checkModulePermission("inventory", "inventory.items.read")`.

5. Direct Prisma and service-boundary gaps still exist.
   - `what-next/PRISMA_SERVICE_BOUNDARY_FALLBACK_SCAN_2026-06-17.md` reports 97 direct Prisma calls outside services and 32 direct Prisma imports.
   - These areas are risky for module enforcement because direct edge actions can bypass tenant, RBAC, audit, and future module gates.

6. Dashboard widgets and reports aggregate across modules.
   - Current dashboard/report actions must become module-aware before module gating can be trusted.

7. Billing and commercial states are absent.
   - There is no durable platform module catalog, module plan, subscription, entitlement, usage meter, module request, or module audit table.

---

## 4. Target Architecture

### 4.1 Architectural position

The module system should be a Platform Control Plane concern. It should not live only in the UI, billing layer, or sidebar. It must be reusable by:

- Page/layout guards.
- Server actions.
- Services.
- API routes.
- Reports and exports.
- Background jobs.
- Webhooks and adapters.
- Dashboard widgets.
- Navigation shell.
- Registration and onboarding.
- Billing and partner workflows.

### 4.2 Core access rule

```text
Tenant access is allowed only when:
1. The session is authenticated.
2. The organization is active and matches the request scope.
3. The organization has a valid module entitlement for the requested operation.
4. The user has the required RBAC permission.
5. Sensitive actions satisfy step-up, segregation-of-duties, maker-checker, and country-pack rules.
```

Admin wildcard permissions must not bypass module entitlements. Wildcard should mean "all permissions inside owned modules", not "all modules are owned".

### 4.3 Module states

Each entitlement should support these states:

- `PENDING`: requested but not yet active.
- `TRIAL`: temporarily active until a trial end date.
- `ACTIVE`: fully usable.
- `READ_ONLY`: historical access only; no new writes.
- `SUSPENDED`: blocked due to billing, compliance, abuse, or support hold.
- `EXPIRED`: time-limited access ended.
- `CANCELLED`: subscription stopped.

### 4.4 Module operation modes

The gate should distinguish:

- `view`: page/shell/read access.
- `read`: service reads and reports.
- `write`: create/update operational data.
- `approve`: high-risk maker-checker steps.
- `post`: accounting/ledger-impacting operations.
- `export`: downloadable data.
- `admin`: configuration and module management.
- `job`: background scheduled or async operation.
- `adapter`: external provider/country authority integration.

This matters because read-only archive access is valid for compliance and accounting history but must not allow new POS sales, payroll runs, fiscal submissions, or AP payments.

---

## 5. Database Model Proposal

### 5.1 Additive schema first

The first migration must be additive only. It should not remove `Organization.requestedModules` or change existing behavior.

Recommended models:

```prisma
model PlatformModule {
  id                  String   @id @default(cuid())
  key                 String   @unique
  nameEn              String
  nameFr              String?
  descriptionEn       String?
  descriptionFr       String?
  category            String
  lifecycleStatus     ModuleLifecycleStatus @default(ACTIVE)
  isCore              Boolean  @default(false)
  requiresCountryPack Boolean  @default(false)
  ledgerImpactMode    String?
  sortOrder           Int      @default(100)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  entitlements        OrganizationModuleEntitlement[]
  dependencies        ModuleDependency[] @relation("ModuleDependencyModule")
  requiredBy          ModuleDependency[] @relation("ModuleDependencyRequired")

  @@map("platform_modules")
}

model ModuleDependency {
  id                String @id @default(cuid())
  moduleKey         String
  requiredModuleKey String
  enforcementMode   String @default("REQUIRED")
  createdAt         DateTime @default(now())

  module            PlatformModule @relation("ModuleDependencyModule", fields: [moduleKey], references: [key])
  requiredModule    PlatformModule @relation("ModuleDependencyRequired", fields: [requiredModuleKey], references: [key])

  @@unique([moduleKey, requiredModuleKey])
  @@map("module_dependencies")
}

model OrganizationModuleEntitlement {
  id             String @id @default(cuid())
  organizationId String
  moduleKey      String
  status         ModuleEntitlementStatus @default(PENDING)
  source         ModuleEntitlementSource @default(REGISTRATION)
  planCode       String?
  subscriptionId String?
  trialEndsAt    DateTime?
  activatedAt    DateTime?
  suspendedAt    DateTime?
  expiresAt      DateTime?
  readOnlyAfter  DateTime?
  grantedById    String?
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  module         PlatformModule @relation(fields: [moduleKey], references: [key])

  @@unique([organizationId, moduleKey])
  @@index([organizationId, status])
  @@index([moduleKey, status])
  @@map("organization_module_entitlements")
}

model ModulePlan {
  id          String @id @default(cuid())
  code        String @unique
  nameEn      String
  nameFr      String?
  audience    String?
  billingMode String @default("MANUAL")
  isActive    Boolean @default(true)
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items        ModulePlanItem[]

  @@map("module_plans")
}

model ModulePlanItem {
  id        String @id @default(cuid())
  planCode  String
  moduleKey String
  mode      String @default("FULL")
  createdAt DateTime @default(now())

  plan      ModulePlan @relation(fields: [planCode], references: [code], onDelete: Cascade)
  module    PlatformModule @relation(fields: [moduleKey], references: [key])

  @@unique([planCode, moduleKey])
  @@map("module_plan_items")
}

model ModuleGateAudit {
  id             String @id @default(cuid())
  organizationId String
  moduleKey      String
  action         String
  result         String
  actorId        String?
  reason         String?
  correlationId  String?
  metadata       Json?
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, moduleKey, createdAt])
  @@map("module_gate_audits")
}

enum ModuleLifecycleStatus {
  ACTIVE
  BETA
  DEPRECATED
  INTERNAL
}

enum ModuleEntitlementStatus {
  PENDING
  TRIAL
  ACTIVE
  READ_ONLY
  SUSPENDED
  EXPIRED
  CANCELLED
}

enum ModuleEntitlementSource {
  REGISTRATION
  SUBSCRIPTION
  PARTNER_GRANT
  ADMIN_GRANT
  MIGRATION
  PROMOTION
}
```

### 5.2 Defer complex billing until gates work

Do not start with full billing automation. First make module access correct. Billing can later write into entitlements. Early commercial states can be manually administered through `ModulePlan`, `ModulePlanItem`, and `OrganizationModuleEntitlement`.

---

## 6. Backend and Service Plan

### 6.1 New module control services

Add:

```text
services/control-plane/module-catalog.service.ts
services/control-plane/module-entitlement.service.ts
services/control-plane/module-gate.service.ts
services/control-plane/module-plan.service.ts
services/control-plane/module-audit.service.ts
services/control-plane/module-access.types.ts
```

Core service functions:

```ts
getPlatformModules()
getOrganizationModuleState(organizationId)
getOrganizationEntitlements(organizationId)
assertOrganizationModuleAccess(input)
canOrganizationUseModule(input)
grantOrganizationModule(input)
suspendOrganizationModule(input)
setOrganizationModuleReadOnly(input)
resolveShellAccess(input)
```

### 6.2 Typed module errors

Extend the shared error taxonomy with:

```ts
type ModuleGateErrorCode =
  | "MODULE_NOT_ENABLED"
  | "MODULE_PENDING"
  | "MODULE_TRIAL_EXPIRED"
  | "MODULE_SUSPENDED"
  | "MODULE_EXPIRED"
  | "MODULE_READ_ONLY"
  | "MODULE_DEPENDENCY_MISSING"
  | "MODULE_COUNTRY_PACK_REQUIRED"
```

All denials should include:

- `organizationId`
- `moduleKey`
- `operation`
- `permission`
- `actorId`
- `correlationId`
- safe user message key
- operator reason

### 6.3 Extend `protect()`

Current:

```ts
protect({ permission, auditResource, freshAuth, tenantGuard }, handler)
```

Target:

```ts
protect(
  {
    permission: "inventory.items.read",
    moduleKey: "inventory",
    moduleOperation: "read",
    auditResource: "Item",
    freshAuth: false,
  },
  handler,
)
```

Execution order:

1. Create correlation ID.
2. Require fresh auth if configured.
3. Require RBAC permission.
4. Resolve active tenant from RBAC context.
5. Assert module entitlement for tenant and operation.
6. Assert trusted tenant input.
7. Execute handler.
8. Audit denied or high-risk allowed decisions.

### 6.4 Page and route guards

Extend `config/useAuth.ts` with:

```ts
checkModulePermission(moduleKey, permission, operation?)
checkAnyModulePermission([{ moduleKey, permission, operation }])
getAuthenticatedModuleAccess()
```

Route-level pages should use these helpers before loading module data.

### 6.5 API and job guards

Add server-only utilities:

```ts
requireApiModuleAccess({ request, organizationId, moduleKey, operation })
requireJobModuleAccess({ organizationId, moduleKey, operation, jobName })
requireExportModuleAccess({ organizationId, moduleKey, exportType })
```

Every API route, scheduled job, webhook, adapter, and export must eventually use one of these helpers.

### 6.6 Service-boundary cleanup dependency

Because the scan shows direct Prisma calls outside services, module enforcement should prioritize:

1. High-risk direct actions: dashboard aggregates, analytics, financial reports, accounting reports, auth/user/role actions, organization settings.
2. Module entry services: POS, inventory, accounting, payroll, compliance, finance/reconciliation, purchasing/AP.
3. Reports and exports.
4. Low-risk reads.

Do not wait to fix every direct Prisma call before starting. Instead, implement module gates first in the standard service/action path, then migrate direct callers module by module.

---

## 7. Frontend and UX Plan

### 7.1 Navigation model

Add `moduleKey` and optional `moduleOperation` to sidebar config:

```ts
type ModuleKey =
  | "dashboard"
  | "inventory"
  | "pos"
  | "sales"
  | "purchasing_ap"
  | "finance"
  | "payment_reconciliation"
  | "accounting"
  | "compliance"
  | "payroll_presence"
  | "analytics"
  | "accountant_portal"
  | "administration"
  | "offline_branch"
```

Example:

```ts
{
  title: "Inventory",
  moduleKey: "inventory",
  permission: PERMISSIONS.READ_ITEMS,
  dropdownMenu: [
    {
      title: "Items",
      href: "/dashboard/inventory/items",
      moduleKey: "inventory",
      permission: PERMISSIONS.READ_ITEMS,
    },
  ],
}
```

Replace `useShellPermissions` with `useShellAccess`:

```ts
useShellAccess(session) => {
  permissions,
  moduleStates,
  hasPermission(permission),
  hasModule(moduleKey, operation),
  canUseFeature(moduleKey, permission, operation),
}
```

### 7.2 Normal user experience

For normal users:

- Non-entitled modules are invisible.
- Search only searches visible modules.
- Dashboard cards only show entitled modules.
- Quick actions only show permitted and entitled actions.
- Direct URLs return an access denied or not-found-like page without commercial upsell noise.

### 7.3 Owner/admin experience

For owners/admins:

- Active modules appear normally.
- Pending/trial/suspended/read-only modules appear in a controlled module settings page.
- Non-owned modules appear only in "Available modules" or "Request upgrade" surfaces.
- Upgrade prompts explain business value, not technical permission errors.

### 7.4 Module settings page

Add:

```text
app/[locale]/(dashboard)/dashboard/settings/modules
components/modules/ModuleSettingsWorkbench.tsx
actions/modules/module-settings.actions.ts
hooks/modules/useModuleSettings.ts
```

It should show:

- Active modules.
- Trial modules and expiry.
- Suspended or expired modules.
- Read-only archives.
- Dependencies.
- Plan/bundle source.
- Usage signals.
- Request activation.
- Request assisted setup.
- Module audit history.

### 7.5 Dashboard home

The main dashboard should become entitlement-aware:

- POS/Inventory tenant: sales, stock alerts, drawer, sessions.
- Accounting tenant: ledger status, journals, trial balance, close blockers.
- Payroll tenant: attendance exceptions, payroll run, payslip status.
- Compliance tenant: fiscal documents, adapter health, obligation calendar.
- Full-suite tenant: cross-module executive command center.

Widgets must not query data from inactive modules.

### 7.6 Register flow

Upgrade the current module checkbox flow:

1. Ask business profile.
2. Recommend a bundle.
3. Let owner confirm selected modules.
4. Create pending or trial entitlements in the registration transaction.
5. Redirect to a module-aware setup page.
6. Notify sales/support if assisted setup is selected.

`Organization.requestedModules` remains historical intent. `OrganizationModuleEntitlement` becomes access truth.

### 7.7 Login redirects

Post-login routing should use active modules plus role:

- Cashier with POS: POS or session start.
- Accountant with accounting: accounting dashboard.
- Payroll user: payroll workbench.
- Owner with many modules: main dashboard.
- Tenant with no active modules: onboarding/module activation page.

---

## 8. Security and Compliance Plan

### 8.1 Non-negotiables

1. Module gates must be server-side.
2. UI hiding is only a presentation layer.
3. RBAC wildcard does not bypass entitlements.
4. Tenant scope must be verified before module access.
5. Read-only means no mutation, no posting, no approval, no fiscal submission.
6. Downgrades never delete statutory, accounting, payroll, compliance, or audit evidence.
7. Sensitive module changes require step-up and audit.
8. Module suspension attempts must generate operator evidence.

### 8.2 Sensitive actions

Require fresh auth and maker-checker for:

- Module activation/suspension/cancellation.
- Country-pack changes.
- Accounting period close/reopen.
- Fiscal document reversal.
- Payroll run approval/posting/payment release.
- AP payment release.
- Supplier bank detail approval.
- POS void/refund above threshold.
- Compliance adapter credential/config changes.

### 8.3 Reports, exports, and analytics

Every report/export must declare a module:

```ts
export const reportModule = "accounting"
export const reportOperation = "export"
```

Cross-module reports must compute the intersection of entitled modules. They must not silently include data from inactive modules.

### 8.4 Country-pack relationship

Compliance, payroll, accounting, and fiscal modules may require a country pack. Module entitlement does not mean production legal certification. Country-specific behavior must remain effective-dated, versioned, and expert-validated before production claims.

---

## 9. Migration Strategy

### 9.1 Migration principles

- Add before enforcing.
- Observe before blocking.
- Migrate existing tenants to safe default entitlements.
- Never hide workflows from existing users without an access audit.
- Keep rollback simple.
- Preserve all ledger, audit, payroll, compliance, and source evidence.

### 9.2 Existing tenant migration

1. Seed `PlatformModule`.
2. Create `FULL_BUSINESS_OS_LEGACY` plan.
3. For every active organization, create active entitlements for modules currently visible or used.
4. Store `source = MIGRATION`.
5. Generate an access audit:
   - organization
   - current users
   - permissions
   - requested modules
   - inferred modules used
   - proposed entitlements
6. Run shell filtering in observe mode.
7. Run server gates in observe mode.
8. Compare actual usage against proposed entitlements.
9. Enforce first for low-risk routes.
10. Enforce high-risk modules only after tests pass.

### 9.3 New tenant migration

For new registrations:

- Preserve `requestedModules`.
- Create pending/trial entitlements from confirmed module selection.
- Apply bundle recommendation.
- Route to setup.

### 9.4 Downgrade policy

When a module is downgraded:

- Convert to `READ_ONLY` when historical access is necessary.
- Disable writes and jobs.
- Preserve reports required by contract/legal policy.
- Stop external adapters unless read-only evidence sync is explicitly allowed.
- Keep audit records.

### 9.5 Rollback strategy

Every enforcement phase needs a rollback:

- `MODULE_GATES_ENABLED=false` disables blocking and returns to observe mode.
- Per-module enforcement flags allow one module to roll back without disabling all module visibility.
- Shell filtering can be disabled independently from backend enforcement.
- Migration is additive, so old code can continue reading old fields if needed.

---

## 10. Seed and Demo Plan

### 10.1 Platform module seed

Seed modules:

- `dashboard`
- `administration`
- `inventory`
- `pos`
- `sales`
- `purchasing_ap`
- `finance`
- `payment_reconciliation`
- `accounting`
- `accountant_portal`
- `compliance`
- `payroll_presence`
- `analytics`
- `offline_branch`
- `ai_copilot`

### 10.2 Plans and bundles

Seed plans:

- `CORE_COMMERCE`: POS, Sales, Inventory lite, Dashboard.
- `STOCK_PURCHASING_PRO`: Inventory, Purchasing/AP, Suppliers, Stock reports.
- `ACCOUNTING_CLOSE`: Accounting, Accountant Portal, Close Center.
- `FINANCE_RECON`: Finance, Payment Reconciliation, Receivables, Payables.
- `PAYROLL_PRESENCE`: Payroll, Presence, HR.
- `COMPLIANCE_COUNTRY_PACK`: Compliance, Fiscal documents, Country-pack readiness.
- `BRANCH_OFFLINE`: Offline Branch, Terminals, Sync controls.
- `FULL_BUSINESS_OS`: All production modules.
- `LEGACY_FULL_ACCESS`: Migration-only compatibility plan.

### 10.3 Demo tenants

Create:

1. `demo-core-commerce`
   - Active: dashboard, administration, inventory, pos, sales.
   - Hidden: accounting, payroll, compliance.

2. `demo-accounting-firm`
   - Active: accounting, accountant_portal, compliance read-only.
   - Hidden: POS operations and payroll operations.

3. `demo-payroll-presence`
   - Active: payroll_presence, dashboard, administration.
   - Hidden: POS, inventory, accounting write operations.

4. `demo-full-business-os`
   - Active: all modules.

5. `demo-suspended-payroll`
   - Active: inventory and finance.
   - Suspended: payroll_presence.

6. `demo-readonly-compliance`
   - Read-only: compliance.
   - Active: accounting.

7. `demo-no-modules-pending`
   - Pending entitlements only.
   - Used for onboarding and support flows.

Each demo tenant should have:

- Owner/admin.
- Manager.
- Cashier or module worker.
- Accountant/partner user when relevant.
- Negative-test user with permission but no entitlement.
- Negative-test user with entitlement but no permission.

---

## 11. Testing and Verification Plan

### 11.1 Unit tests

Test:

- Module key registry.
- Module dependencies.
- Entitlement status resolution.
- Trial expiry.
- Read-only operation matrix.
- Admin wildcard behavior.
- Permission plus entitlement combinations.

### 11.2 Service tests

Test:

- `assertOrganizationModuleAccess`.
- `resolveShellAccess`.
- `grantOrganizationModule`.
- `suspendOrganizationModule`.
- `setOrganizationModuleReadOnly`.
- Audit creation on denial and policy change.

### 11.3 Protected action tests

Extend `services/_shared/__tests__/protect.test.ts`:

- Allows when tenant, module, and permission pass.
- Denies missing module with typed error.
- Denies read-only write operation.
- Denies suspended module.
- Does not let wildcard bypass module.
- Audits high-risk allow/deny decisions.

### 11.4 Route and API tests

Test:

- Direct URL denial.
- API route denial.
- Locale-aware redirect/unauthorized behavior.
- Owner/admin upgrade state.
- Normal user invisible state.

### 11.5 E2E tests

Use demo tenants:

- POS-only tenant cannot see accounting.
- Accounting-only tenant cannot open POS.
- Suspended payroll tenant sees admin status but cannot run payroll.
- Read-only compliance tenant can view evidence but cannot submit new fiscal documents.
- Full-suite tenant still works as before.

### 11.6 Report/export/job tests

Test:

- Dashboard excludes inactive modules.
- Financial reports do not include non-entitled modules.
- Exports are denied without entitlement.
- Background jobs skip suspended tenants and audit the skip.
- Adapter/webhook events are rejected or quarantined when module is inactive.

### 11.7 Release gates

No phase can ship until:

- Prisma schema validates.
- Typecheck passes.
- Module gate service tests pass.
- Tenant rejection test passes.
- RBAC rejection test passes.
- Module rejection test passes.
- Direct URL denial test passes for enforced modules.
- No new direct Prisma bypass is introduced for module-controlled paths.
- Audit evidence exists for module policy changes.

---

## 12. Step-by-Step Technical Roadmap

### Phase 0: Freeze and inventory

Goal: Know what exists before changing behavior.

Build:

- Route-to-module inventory.
- Action-to-module inventory.
- Service-to-module inventory.
- Report/export/job inventory.
- Current tenant/user/permission audit.
- Module naming decision record.

Do not enforce yet.

Exit criteria:

- Every major route has a proposed module key.
- Every sidebar item has a proposed module key.
- High-risk direct Prisma paths are known.

### Phase 1: Static module registry

Goal: Create one source of truth for module keys and route mapping.

Build:

- `config/modules.ts`
- `config/module-routes.ts`
- `config/module-permissions.ts`
- `lib/modules/module-keys.ts`

Do not query database yet.

Exit criteria:

- Type-safe module keys.
- Sidebar can be annotated without behavior change.
- Tests validate registry completeness.

### Phase 2: Additive Prisma migration

Goal: Add durable module and entitlement tables safely.

Build:

- `PlatformModule`
- `ModuleDependency`
- `OrganizationModuleEntitlement`
- `ModulePlan`
- `ModulePlanItem`
- `ModuleGateAudit`
- enums and indexes.

Do not remove `requestedModules`.

Exit criteria:

- `prisma validate` passes.
- Migration is additive.
- Existing app behavior unchanged.

### Phase 3: Seed modules and migrate tenants

Goal: Every tenant has an explicit module state.

Build:

- Module seed.
- Plan seed.
- Demo tenant seed.
- Existing tenant backfill.
- Legacy full access plan.
- Access audit report.

Exit criteria:

- Existing tenants receive safe entitlements.
- Demo tenants prove mixed module states.
- Seed can be rerun idempotently.

### Phase 4: Module gate service in observe mode

Goal: Compute decisions without blocking.

Build:

- `module-gate.service.ts`.
- Typed denial reasons.
- Audit logs in observe mode.
- `resolveShellAccess`.

Exit criteria:

- Service tests pass.
- Observe logs identify would-deny events.
- No user-facing behavior changes.

### Phase 5: Extend protected actions

Goal: Make the standard server-action path module-aware.

Build:

- `protect({ moduleKey, moduleOperation })`.
- Tests for module allow/deny.
- Optional observe/enforce behavior.

Start with low-risk read actions, then high-risk writes.

Exit criteria:

- Existing protected actions still work.
- Module-aware protected actions pass denial tests.
- Typed errors are returned safely.

### Phase 6: Page, API, export, and job guards

Goal: Close direct access gaps.

Build:

- Page guard helpers.
- API guard helpers.
- Export/report guard helpers.
- Job guard helpers.
- Adapter/webhook gate helpers.

Exit criteria:

- Direct URL denial works.
- API denial works.
- Jobs skip unauthorized tenants.
- Reports/exports cannot leak inactive module data.

### Phase 7: Shell and dashboard UX

Goal: Make the product feel module-native.

Build:

- Add `moduleKey` to sidebar items.
- Replace `useShellPermissions` with `useShellAccess`.
- Update `Sidebar` and `Navbar`.
- Entitlement-aware dashboard widgets.
- Controlled unavailable/upgrade states.

Exit criteria:

- Normal users see only active modules.
- Owners/admins can see module status and request upgrades.
- Full-suite tenant still sees the full suite.

### Phase 8: Register, onboarding, and login

Goal: Turn requested modules into entitlement lifecycle.

Build:

- Bundle recommendation.
- Trial/pending entitlement creation during registration.
- Module-aware onboarding.
- Module-aware login redirect.
- Assisted setup handoff.

Exit criteria:

- New tenants get entitlements at registration.
- Login routes to the best active workspace.
- No-module tenants land on setup, not a broken dashboard.

### Phase 9: Module administration workbench

Goal: Let owners/admins manage module lifecycle professionally.

Build:

- `/dashboard/settings/modules`
- Active/trial/suspended/read-only views.
- Request activation/change.
- Audit history.
- Dependency messaging.
- Step-up for sensitive changes.

Exit criteria:

- Owners can understand what they own.
- Operators can audit changes.
- Sensitive changes require step-up.

### Phase 10: Commercial automation

Goal: Connect module access to pricing and partner growth.

Build:

- Plan lifecycle.
- Subscription source/status.
- Partner grants.
- Usage meters.
- Sales handoff events.
- Renewal/suspension policy.

Exit criteria:

- Module access can be sold, activated, renewed, suspended, and audited.
- Partner channels can provision specific modules safely.

### Phase 11: Harden and enforce module by module

Goal: Move from observe to enforced access safely.

Recommended enforcement order:

1. Analytics and dashboard widgets.
2. Inventory reads.
3. POS route access.
4. Purchasing/AP.
5. Finance and reconciliation.
6. Accounting reads.
7. Compliance reads.
8. Payroll reads.
9. High-risk writes and postings.
10. Adapters, exports, and background jobs.

Exit criteria:

- Each module passes its release gate before enforcement.
- Rollback flag tested.
- Support runbook exists.

---

## 13. Design Roadmap

### Phase D1: Module language and mental model

Update product language:

- "Your active modules"
- "Available modules"
- "Trial"
- "Read-only archive"
- "Needs owner approval"
- "Request activation"
- "Included in your plan"

Avoid showing internal terms such as entitlement, gate, tenant, or permission to normal SMB users.

### Phase D2: Shell states

Design states:

- Active module item.
- Active module with alert.
- Trial module with days left.
- Read-only module.
- Upgrade/request tile for owners only.
- Empty module search.
- No active modules setup state.

### Phase D3: Module-aware dashboards

Design dashboard variants:

- Core Commerce.
- Accounting and Close.
- Payroll and Presence.
- Compliance.
- Finance and Reconciliation.
- Full Business OS.

### Phase D4: Onboarding recommendation

Design a guided setup:

1. Business context.
2. Main pain.
3. Recommended starting bundle.
4. Confirm modules.
5. Create workspace.
6. First task.

### Phase D5: Admin workbench

Design `/settings/modules` as a controlled operations surface, not a marketing page inside the app. Owners need status, billing/source, dependencies, and request flows.

---

## 14. Business and Product Alignment

### 14.1 Standalone modules

Good standalone entry points:

- POS.
- Inventory.
- Accounting.
- Payroll/Presence.
- Compliance.
- Payment Reconciliation.
- Accountant Portal.

### 14.2 Bundles that should be sold together

- POS + Inventory + Sales as Core Commerce.
- Inventory + Purchasing/AP for stock-heavy businesses.
- Accounting + Accountant Portal + Close Center.
- Finance + Payment Reconciliation.
- Payroll + Presence.
- Compliance + Country Pack + Fiscal Documents.
- Offline Branch + POS + Terminals.

### 14.3 Partner channels

- Accountants: Accounting, Close, Accountant Portal, Compliance.
- Fintechs/banks: Reconciliation, Finance, Merchant data quality.
- Implementers/resellers: POS, Inventory, Branch/Offline, Full OS.
- Compliance advisors: Country packs, fiscal documents, statutory evidence.

### 14.4 Moat logic

The moat comes from:

- Modular adoption without migration.
- Ledger-first evidence continuity.
- OHADA/country-pack adaptation.
- Tenant/RBAC/module/audit control plane.
- Partner distribution.
- Data quality from controlled workflows.

---

## 15. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| UI hides modules but backend still allows access | Subscription bypass and data leakage | Enforce in services/actions/APIs/jobs/reports before trusting UI |
| Existing tenants lose access unexpectedly | Churn and support fire | Legacy full-access migration, observe mode, per-module flags |
| Wildcard admin bypasses modules | Revenue leakage | Make wildcard permission-only, not entitlement bypass |
| Direct Prisma actions bypass module gates | Security/control gap | Prioritize service-boundary cleanup in module-controlled paths |
| Read-only states still permit writes | Compliance and billing failure | Operation-mode matrix and tests |
| Billing outage suspends good tenants | Business disruption | Grace states, manual override, audited support flow |
| Module dependencies confuse buyers | Poor conversion | Bundle recommendations and owner-only dependency messaging |
| Reports leak inactive module data | Trust/compliance failure | Report/export module declarations and tests |
| Overbuilding billing too early | Slow delivery | Gate architecture first, billing automation later |

---

## 16. Team Responsibilities

| Team | Responsibility |
|---|---|
| Product | Module catalog, bundles, commercial states, downgrade/read-only rules |
| Architecture | Control-plane spine, data model, service boundaries, rollout sequencing |
| Backend | Prisma schema, entitlement services, guards, audits, seeds, migrations |
| Frontend | Shell access, dashboards, module settings, onboarding, login redirects |
| Design | Module mental model, owner/admin states, upgrade/request UX |
| Security | Threat model, RBAC separation, wildcard rules, direct access testing |
| QA | Matrix tests across tenant, module, role, status, operation |
| Sales | Bundle pitch, stakeholder messaging, upgrade paths |
| Partnerships | Accountant, fintech, implementer, compliance partner workflows |
| Support/CS | Migration communications, activation playbooks, downgrade support |

---

## 17. Release Checklist

Before production enforcement:

- [ ] Module registry complete.
- [ ] Sidebar and route module map complete.
- [ ] Prisma additive migration reviewed.
- [ ] Module seed idempotent.
- [ ] Existing tenants backfilled.
- [ ] Observe-mode audit reviewed.
- [ ] `protect()` module tests pass.
- [ ] Direct URL denial tests pass.
- [ ] API denial tests pass.
- [ ] Report/export denial tests pass.
- [ ] Background job skip tests pass.
- [ ] Admin wildcard does not bypass modules.
- [ ] Read-only modules block writes.
- [ ] Rollback flags tested.
- [ ] Support runbook ready.
- [ ] Owner/admin communication ready.

---

## 18. Recommended Immediate Next Steps

1. Approve the module key vocabulary.
2. Build `config/modules.ts` and route/action/report inventory in observe-only mode.
3. Draft the additive Prisma migration for module catalog and entitlements.
4. Seed platform modules, plans, and demo tenants.
5. Build the module gate service with tests.
6. Extend `protect()` with optional module gates in observe mode.
7. Annotate sidebar links with `moduleKey`, but do not hide yet.
8. Run an access audit against existing tenants.
9. Enforce one low-risk module path end to end.
10. Repeat module by module with release gates.

---

## 19. Final Blueprint

### What we are building

AqStoqFlow will remain one unified OHADA-zone SMB operating system, but every tenant will have a durable module entitlement profile that controls what modules it can see and use. The module system will be enforced at the service/action/API/job/report/export level and reflected in the shell, onboarding, login, admin settings, sales bundles, and partner workflows.

### The spine

- State: module access truth lives in `OrganizationModuleEntitlement`; `requestedModules` remains onboarding intent.
- Data model: modules, dependencies, plans, entitlements, and audits are additive Prisma models.
- Contract: access checks return typed allow/deny decisions with stable error codes and correlation IDs.
- Trust boundary: tenant, module, RBAC, step-up, and country-pack checks happen on the server.
- Sync model: request/response for page/actions, explicit guards for jobs/adapters/exports.
- Failure handling: observe mode first, typed denials when enforced, rollback flags per module.

### Build order

1. Inventory and registry.
2. Additive schema.
3. Seed and migration.
4. Gate services in observe mode.
5. Protected action and route guard integration.
6. Shell and dashboard UX.
7. Register/login/admin module management.
8. Billing and partner lifecycle.
9. Per-module enforcement and hardening.

### Out of scope for first release

- Automated payment-provider billing.
- AI-driven module recommendations.
- Production legal certification claims for country-specific compliance.
- Splitting modules into separate deployable applications.

Blueprint ready.

---

## 20. Skill Execution Note

Selected skill: `002-aqstoqflow-control-plane`  
Files changed: this report only  
Gates passed: architecture/context review, tenant/RBAC/module-control planning, staged rollout planning, risk register, verification plan  
Gates blocked: no code implementation, no schema migration, no tests run  
Verification result: report artifact saved for review before implementation  
Next recommended numbered skill: `003-aqstoqflow-error-notification-foundation` after the control-plane blueprint is approved, because typed module denials and notifications must be consistent before broad enforcement.
