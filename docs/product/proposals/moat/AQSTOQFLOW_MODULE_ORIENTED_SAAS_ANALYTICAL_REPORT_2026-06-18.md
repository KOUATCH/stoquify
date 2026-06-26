# AqStoqFlow Module-Oriented SaaS Operating System Proposal

Date: 2026-06-18  
Scope: Product, technical, architecture, security, UX, business model, go-to-market, migration, and execution roadmap  
Objective: Transform AqStoqFlow into a professional module-based OHADA-zone SMB operating system where each tenant can see and use only the modules it has subscribed to, been granted, or is trialing.

---

## 1. Executive Decision

AqStoqFlow should become a modular operating system, not a full-suite application that merely hides a few menu items. The platform already has the right strategic spine: tenant-scoped organizations, RBAC permissions, server-side protected actions, audit/security logging, registration module intent, OHADA accounting, compliance, POS, inventory, finance, payroll, and country-aware onboarding. What is missing is a durable module entitlement control plane that decides whether an organization is allowed to access a module before any page, server action, API route, background job, report, export, or integration runs.

The recommended product architecture is:

```text
Authenticated user
  -> active organization / tenant scope
  -> organization module entitlement
  -> user RBAC permission
  -> sensitive-action policy / step-up auth
  -> service-level tenant and ledger controls
  -> audit event / business event
```

This keeps AqStoqFlow's strongest position intact: it remains a ledger-first, OHADA-aware, auditable, tenant-isolated business operating platform. Modules become commercially flexible packages on top of one governed operating spine, not disconnected mini-products.

---

## 2. Current System Findings

### 2.1 What already supports this direction

The platform already contains several enterprise foundations that should be reused rather than replaced.

1. Organization onboarding captures business context.
   - `prisma/schema.prisma` stores `companySize`, `businessType`, `branchCount`, `primaryPain`, `setupRole`, `requestedModules`, and `onboardingSource` on `Organization` around lines 229-251.
   - `services/users/user-identity.service.ts` normalizes requested modules from registration around lines 97-117.
   - `components/auth/v2/RegisterV2Form.tsx` already asks for business type, branch count, pain, setup role, and requested modules.

2. RBAC is real and should remain the user-level authorization layer.
   - `config/permissions.ts` already organizes permissions across Inventory, Sales, Purchase, Financial, Accounting Backbone, Compliance Center, Payroll & Presence, POS, Analytics, System, Communication, and Data.
   - `lib/security/rbac.ts` has `requirePermission`, `requireAnyPermission`, `requireAllPermissions`, auditing of allow/deny decisions, and cross-organization denial.

3. Server actions already have a useful protection wrapper.
   - `services/_shared/protect.ts` accepts permission, audit resource, fresh auth, and tenant guard options.
   - This is the right place to extend enforcement with `moduleKey` so module checks become standard instead of optional.

4. The dashboard shell is already permission-aware.
   - `components/dashboard/Sidebar.tsx` filters links based on `hasPermission`.
   - `components/dashboard/Navbar.tsx` filters mobile/top links based on permissions.
   - This can become permission plus entitlement filtering.

5. The public story already uses module language.
   - `messages/en.json` and `messages/fr.json` describe modules, pricing, module gates, and the idea of "one operating model, not disconnected modules."
   - The landing page can be tightened to promise a modular subscription experience that the application actually enforces.

### 2.2 What is missing

The current `requestedModules String[]` field is onboarding intent, not a commercial or security entitlement. It records what the tenant asked for but does not answer:

- Is this module active, trialing, suspended, expired, read-only, or pending approval?
- Who granted it?
- Which plan or subscription created it?
- Does it depend on another module?
- Does it allow write operations, exports, reports, background jobs, fiscal submissions, or only read-only archive access?
- Should the shell, route, API, server action, report, export, and job all enforce the same rule?
- What audit event proves a module was enabled, disabled, downgraded, or upgraded?

The sidebar and navbar are permission-filtered, but not module-entitlement-filtered. A user with broad permissions, especially an administrator with `*`, can still see routes if those routes are not explicitly protected by module gates. This is not enough for a professional module-based SaaS model.

---

## 3. Target Operating Model

### 3.1 Product principle

Each tenant should receive a workspace shaped by its subscribed modules. For normal users, non-subscribed modules should feel nonexistent. For owners/admins, non-subscribed modules can appear only in controlled commercial surfaces such as "Available modules", "Upgrade", or "Request activation", never as operational pages that partially fail.

### 3.2 Enforcement principle

"Invisible" must mean all of the following:

- Not visible in sidebar, navbar, command links, dashboard cards, module search, reports, exports, or quick actions.
- Not reachable through direct URL navigation.
- Not callable through API routes.
- Not executable through server actions.
- Not usable by services, repositories, background jobs, scheduled jobs, imports, exports, webhooks, or adapters.
- Not included in analytics, dashboards, cross-module summaries, accountant portal exports, or close packs unless the tenant has a permitted read/archive entitlement.

### 3.3 Access formula

AqStoqFlow should standardize module access as:

```text
allow =
  active organization
  and tenant match
  and module entitlement permits operation
  and RBAC permission permits operation
  and sensitive-action policy permits operation
  and country-pack rules permit operation
```

RBAC alone should never unlock an unsubscribed module. Module entitlement alone should never let a user act without permission.

---

## 4. Proposed Module Catalog

### 4.1 Core module keys

Recommended initial module catalog:

| Module key | Business value | Typical buyers | Notes |
|---|---|---|---|
| `dashboard` | Executive overview of permitted operations | All tenants | Usually core/free, but widgets are module-aware. |
| `inventory` | Stock truth by item, location, movement, value, variance | Retailers, wholesalers, distributors, pharmacies | Requires strong tenant and valuation controls. |
| `pos` | Cashier sessions, sales, returns, receipts, cash drawer control | Retail, restaurant, pharmacy | Often sold with inventory, but can be trialed independently. |
| `sales` | Orders, customers, deliveries, receivables signals | Sales teams, branch managers | Can pair with POS or B2B order flow. |
| `purchasing_ap` | Suppliers, POs, receiving, AP controls, bank/payment approvals | Inventory-heavy SMBs | Strong SoD and maker-checker surface. |
| `finance` | Receivables, payables, cash flow, analytics, payments | Owners, CFOs, accountants | Bridges operations to cash visibility. |
| `payment_reconciliation` | Payment evidence ingestion, matching, suspense, exceptions | Fintech-heavy merchants | Major moat when linked to ledger and source evidence. |
| `accounting` | OHADA chart, journals, posting rules, trial balance, close | Accountants, controllers, owners | Should remain ledger-first and source-linked. |
| `compliance` | Fiscal documents, country packs, adapter readiness, evidence | Regulated sectors and OHADA SMBs | Country-pack dependent. |
| `payroll_presence` | Employees, contracts, attendance, payroll runs, approvals, payslips | SMBs with employees | Needs country packs and payroll statutory rules. |
| `offline_branch` | Offline POS/device identity/replay, branch continuity | Multi-branch and unreliable-network merchants | Strong operational moat. |
| `accountant_portal` | External accountant access, review, close packs, evidence exports | Accountants, accounting firms, SMB owners | Partner-led growth engine. |
| `administration` | Users, roles, invites, settings, modules, country setup | Owners/admins | Core control plane. |
| `analytics` | Cross-module reports, exports, performance intelligence | Owners, managers, partners | Must only aggregate entitled modules. |
| `ai_copilot` | Read-only, source-cited assistant over permitted data | Owners, accountants, managers | Later premium module with strict guardrails. |

### 4.2 Bundle recommendations

1. Core Commerce
   - Inventory lite, POS, sales, customers, basic dashboard.
   - Pitch: "Control sales, stock, and cash from the first day."

2. Stock and Purchasing Pro
   - Inventory full, transfers, counts, purchasing/AP, suppliers, valuation risk.
   - Pitch: "Know what is in stock, what it cost, who supplied it, and what must be paid."

3. Accounting and Close
   - Accounting, accountant portal, source links, trial balance, close center.
   - Pitch: "Turn daily operations into accountant-ready OHADA records."

4. Finance and Reconciliation
   - Finance, receivables, payables, payment reconciliation, cash flow.
   - Pitch: "Match money to transactions and explain every gap."

5. Payroll and Presence
   - HR, employee contracts, attendance, payroll runs, approvals, payslips, statutory declarations.
   - Pitch: "Pay people with traceability and statutory discipline."

6. Compliance and Country Pack
   - Fiscal document lifecycle, authority queues, country rules, compliance evidence.
   - Pitch: "Stay audit-ready as local rules change."

7. Branch and Offline
   - Terminals, device identity, offline POS replay, branch controls.
   - Pitch: "Keep selling and preserve evidence even when connectivity fails."

8. Full Business OS
   - All modules plus enterprise controls, partner access, advanced reporting.
   - Pitch: "One governed operating layer for every critical SMB workflow."

---

## 5. Database and Backend Architecture

### 5.1 Recommended schema additions

Keep `Organization.requestedModules` as onboarding and sales intelligence, but add durable entitlement tables.

Recommended Prisma models:

```prisma
model PlatformModule {
  id                 String   @id @default(cuid())
  key                String   @unique
  nameEn             String
  nameFr             String?
  descriptionEn      String?
  descriptionFr      String?
  category           String
  lifecycleStatus    ModuleLifecycleStatus @default(ACTIVE)
  isCore             Boolean  @default(false)
  requiresCountryPack Boolean @default(false)
  ledgerImpactMode   String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  entitlements       OrganizationModuleEntitlement[]
  dependencies       ModuleDependency[] @relation("ModuleDependencyModule")
  requiredBy         ModuleDependency[] @relation("ModuleDependencyRequired")

  @@map("platform_modules")
}

model ModuleDependency {
  id              String @id @default(cuid())
  moduleKey       String
  requiredModuleKey String
  enforcementMode String @default("REQUIRED")
  createdAt       DateTime @default(now())

  module          PlatformModule @relation("ModuleDependencyModule", fields: [moduleKey], references: [key])
  requiredModule  PlatformModule @relation("ModuleDependencyRequired", fields: [requiredModuleKey], references: [key])

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

Optional but valuable next tables:

- `ModulePlan`: commercial plan definition by country/currency.
- `ModulePlanItem`: modules included in each plan.
- `OrganizationSubscription`: billing lifecycle, renewal date, status, payment provider reference.
- `ModuleUsageMeter`: branches, seats, terminals, transactions, employees, exports, adapter calls.
- `OrganizationModuleRequest`: owner/admin upgrade requests.
- `ModuleGateAudit`: structured audit log for module activation, suspension, downgrade, override, and renewal.

### 5.2 Service layer

Create a control-plane service boundary:

```text
services/control-plane/module-catalog.service.ts
services/control-plane/module-entitlement.service.ts
services/control-plane/module-gate.service.ts
services/control-plane/module-plan.service.ts
services/control-plane/module-audit.service.ts
```

Key APIs:

```ts
getPlatformModules()
getOrganizationModuleState(organizationId)
assertOrganizationModuleAccess({ organizationId, moduleKey, operation, resourceId })
grantOrganizationModule({ organizationId, moduleKey, source, planCode, actorId })
suspendOrganizationModule({ organizationId, moduleKey, reason, actorId })
setModuleReadOnly({ organizationId, moduleKey, reason, actorId })
resolveShellAccess({ organizationId, permissions })
```

`assertOrganizationModuleAccess` should return typed application errors, not raw strings:

- `MODULE_NOT_ACTIVE`
- `MODULE_TRIAL_EXPIRED`
- `MODULE_SUSPENDED`
- `MODULE_READ_ONLY`
- `MODULE_DEPENDENCY_MISSING`
- `MODULE_COUNTRY_PACK_REQUIRED`

### 5.3 Extend the protected action wrapper

`services/_shared/protect.ts` should accept module requirements:

```ts
protect(
  {
    permission: "inventory.items.read",
    moduleKey: "inventory",
    auditResource: "Item",
  },
  handler,
)
```

The wrapper should enforce in this order:

1. Fresh auth if required.
2. RBAC permission.
3. Module entitlement.
4. Tenant input trust.
5. Handler execution.
6. Audit/security/business event on deny or sensitive allow.

This avoids every feature team hand-rolling entitlement checks.

### 5.4 Route, API, and job enforcement

Module gates must be enforced in multiple places:

- Page/layout level: prevents direct URL entry to unsubscribed module pages.
- Server action level: blocks mutations and reads even if UI leaks.
- Service level: protects reuse from API routes or background jobs.
- API route level: blocks external callers.
- Job worker level: blocks scheduled jobs for suspended/expired modules.
- Export/report level: prevents data leakage through reports and downloads.
- Adapter/webhook level: rejects or quarantines module-specific external events if the module is not active.

### 5.5 Caching rules

Module entitlements can be cached for shell rendering, but authorization decisions for writes, exports, fiscal submissions, payment matching, payroll posting, and accounting close should use server-side checks with short-lived request caching only. Billing outages should not accidentally enable modules. Expired or suspended states should fail closed.

---

## 6. Security and Compliance Requirements

### 6.1 Non-negotiable controls

1. Tenant isolation remains first-class.
   - Every entitlement belongs to an organization.
   - Every check must use the active organization from session or server context, not caller-supplied organization IDs.

2. RBAC remains separate from subscriptions.
   - Entitlement decides whether the organization owns the module.
   - RBAC decides whether this user can do this action inside that module.

3. Wildcard admin does not bypass modules.
   - `*` should bypass permission granularity only.
   - It must not bypass commercial, compliance, or lifecycle gates unless a superuser-only platform support flow is explicitly audited.

4. Module changes need audit events.
   - Emit events such as `MODULE_GATE_CHANGED`, `MODULE_ENTITLEMENT_GRANTED`, `MODULE_ENTITLEMENT_SUSPENDED`, `MODULE_ENTITLEMENT_EXPIRED`, and `MODULE_PLAN_CHANGED`.

5. Downgrades must preserve statutory and ledger evidence.
   - Never delete accounting, fiscal, payroll, or payment reconciliation records because a subscription changes.
   - Convert to read-only archive access where legally or operationally required.

6. Sensitive module operations need step-up and maker-checker.
   - Examples: payroll approve/post, AP payment release, fiscal document reversal, accounting period close, module suspension, country-pack changes, and high-risk role changes.

### 6.2 Module denial UX

For regular employees, unsubscribed modules should be invisible and direct URLs should produce a neutral access response. For owners/admins, the system can show a controlled upgrade/request page that explains the business value and offers next action. This prevents confusion while still supporting sales expansion.

---

## 7. Frontend and UX Modifications

### 7.1 Navigation shell

Replace "permission-only navigation" with "entitlement plus permission navigation."

Recommended changes:

- Add `moduleKey` to every sidebar link and dropdown item in `config/sidebar.ts`.
- Extend `useShellPermissions` or create `useShellAccess` to expose:
  - `permissions`
  - `activeModules`
  - `trialModules`
  - `readOnlyModules`
  - `canUseModule(moduleKey)`
  - `canUseFeature(moduleKey, permission)`
- Filter `Sidebar`, `Navbar`, command links, module search, and quick actions by both module and permission.
- Make dashboard widgets module-aware so cross-module dashboards do not show empty or unauthorized data.

Expected effect:

- Higher trust because users see only what they can use.
- Lower onboarding friction because new users are not overwhelmed by a full enterprise suite.
- Better sales presentation because each tenant workspace visually reflects the modules they bought.
- Less support burden because users stop clicking unavailable areas.

### 7.2 Dashboard home

The main dashboard should become an entitlement-aware command center. Recommended states:

- Retail Core home: today's sales, stock alerts, cash drawer, POS quick action.
- Accounting home: trial balance readiness, source-linked journal queue, close blockers.
- Payroll home: attendance exceptions, payroll run status, approval queue.
- Compliance home: fiscal document status, country-pack alerts, evidence queue.
- Full OS home: cross-module executive command center.

The same route can render different sections based on entitlements, but all data queries must also be guarded.

### 7.3 Register workflow

The current registration asks for requested modules. Upgrade this into a guided module recommendation and activation flow.

Recommended register changes:

1. Ask for business profile first.
   - Country, business type, branch count, team size, main pain, setup role.

2. Recommend a starting bundle.
   - Example: "Retail business with 2 branches and stock control pain" recommends Core Commerce plus Stock and Purchasing.

3. Let the user confirm modules.
   - The selected modules create pending/trial entitlements, not only `requestedModules`.

4. Separate "I want to explore" from "I want production setup."
   - Explore creates trial entitlements.
   - Production setup creates assisted setup request and sales handoff.

5. For accountant/partner setup roles, activate accountant/partner onboarding.
   - This can lead to accountant portal, client invitation, or partner pipeline rather than a normal retail dashboard.

Expected effect:

- Better lead qualification.
- Better product perception because the system appears consultative.
- Smoother onboarding because the first dashboard matches declared intent.
- Cleaner sales follow-up because requested modules become structured entitlements and commercial signals.

### 7.4 Login experience

After login, redirect users to the best permitted workspace:

1. If only POS is active: `/dashboard/pos` or a POS-ready branch selector.
2. If accounting is active and user is accountant: `/dashboard/accounting`.
3. If payroll is active and user is HR/payroll: `/dashboard/payroll`.
4. If multiple modules are active: entitlement-aware `/dashboard`.
5. If no modules are active: onboarding/readiness page for owner/admin, support contact for employees.

Expected effect:

- Faster time to value.
- Less confusion for single-module customers.
- Stronger premium feel because the platform adapts to tenant purchase and user role.

### 7.5 Module administration page

Add a governed admin surface:

```text
/dashboard/settings/modules
```

It should show:

- Active modules.
- Trial modules and expiry.
- Suspended/expired modules.
- Included plan/bundle.
- Dependencies.
- Usage meters.
- Request upgrade/downgrade.
- Audit history.
- Read-only/archive status.

Only owners/admins with module-management permission should see this page.

---

## 8. Landing Page and Messaging Changes

The landing page already describes modules, but it should more clearly position AqStoqFlow as a modular OHADA SMB operating system.

### 8.1 Core headline direction

Current concept to strengthen:

```text
One OHADA-ready business operating system. Start with the modules you need, expand without losing the evidence trail.
```

Why:

- "Operating system" signals breadth.
- "Start with the modules you need" makes pricing feel accessible.
- "Expand without losing the evidence trail" preserves the ledger-first moat.

### 8.2 Messaging blocks to add or sharpen

1. Modular by business reality.
   - "A retailer can start with POS and stock. An accountant can start with close and evidence. A growing group can add payroll, compliance, reconciliation, and branch controls."

2. One governed spine.
   - "Every module carries tenant scope, RBAC, audit events, source evidence, and ledger impact."

3. OHADA and country-pack readiness.
   - "Country packs keep accounting, fiscal, payroll, and compliance behavior adaptable to each market."

4. Invisible until purchased.
   - "Teams see only the modules they use. Owners can add modules without migrating to another system."

5. Upgrade without reimplementation.
   - "The first POS receipt can later become accounting evidence, compliance evidence, reconciliation evidence, and close evidence."

### 8.3 Pricing presentation

Replace broad plan names with module bundles:

- Core Commerce
- Stock and Purchasing Pro
- Accounting and Close
- Finance and Reconciliation
- Payroll and Presence
- Compliance and Country Pack
- Branch and Offline
- Full Business OS

Use "talk to us" pricing where legal/compliance/country adapter exposure is high, but keep entry modules understandable enough for SMB self-selection.

---

## 9. Stakeholder Pitch

### 9.1 SMB owner / general manager

What they should see:

- A simple workspace with only their purchased modules.
- Cash, stock, sales, payables, payroll, and compliance risk presented as business outcomes.

What they should hear:

```text
Start with the problem that hurts today. AqStoqFlow gives you that module now, then lets you add accounting, compliance, payroll, reconciliation, and branch controls on the same evidence trail as you grow.
```

What they should understand:

- They are not buying expensive unused software.
- They will not lose operational history when they upgrade.
- The platform can grow from shop floor to accountant-ready close.

### 9.2 Accountant / accounting firm

What they should see:

- Accounting, source links, close center, accountant portal, export packs, tenant evidence.

What they should hear:

```text
Your client operations become source-linked OHADA records instead of month-end reconstruction work.
```

What they should understand:

- AqStoqFlow reduces cleanup work.
- Partner access can scale across client portfolios.
- Module gating lets accounting firms deploy only the accounting/accountant module for some clients and full operations for others.

### 9.3 Cashier / branch operator

What they should see:

- Only POS, drawer, receipts, session controls, and branch-specific actions.

What they should hear:

```text
Your screen shows only what you need to sell, receive money, and close your session correctly.
```

What they should understand:

- The system is simpler and less risky for frontline staff.
- Sensitive back-office modules remain invisible.

### 9.4 Inventory and purchasing manager

What they should see:

- Stock levels, item catalog, transfers, counts, purchase orders, suppliers, receiving, valuation alerts.

What they should hear:

```text
Stock movement, purchasing, supplier obligations, and valuation risk are controlled in one place.
```

What they should understand:

- Inventory is not just a list of items; it is operational evidence.
- Purchasing and stock data can later support accounting and cash planning.

### 9.5 CFO / finance manager

What they should see:

- Cash flow, receivables, payables, payment reconciliation, variance explanations.

What they should hear:

```text
The finance module explains where money came from, where it went, and which transactions still need reconciliation.
```

What they should understand:

- Finance becomes evidence-backed, not spreadsheet-dependent.

### 9.6 HR / payroll manager

What they should see:

- Employees, contracts, attendance exceptions, payroll runs, approvals, payslips, declarations.

What they should hear:

```text
Presence, payroll, approvals, payments, and statutory evidence live in one controlled workflow.
```

What they should understand:

- Payroll is not isolated from finance, accounting, or compliance.

### 9.7 Bank, fintech, payment partner

What they should see:

- Payment evidence, reconciliation quality, merchant operational health, permissioned partner surfaces.

What they should hear:

```text
AqStoqFlow can turn merchant operations into clean, permissioned, auditable signals for payments, reconciliation, and credit readiness.
```

What they should understand:

- The platform can become a trusted merchant data layer.
- Module-based rollout supports channel partnerships without forcing every merchant into the full suite immediately.

### 9.8 Implementation partner / reseller

What they should see:

- Bundles, tenant module activation, onboarding readiness, country packs, partner-friendly deployment.

What they should hear:

```text
You can deploy the right starting module for each business, then grow the account over time without replacing the platform.
```

What they should understand:

- The module model creates recurring expansion revenue.
- Controlled bundles reduce implementation complexity.

### 9.9 Investor / strategic partner

What they should see:

- A modular commercial engine attached to compliance, ledger evidence, and operational data.

What they should hear:

```text
AqStoqFlow is not another POS or accounting app. It is the governed operating layer for OHADA SMBs, with modular adoption and compounding data, compliance, and partner network effects.
```

What they should understand:

- The moat comes from workflow depth, regulatory adaptation, evidence continuity, and ecosystem distribution.

---

## 10. Commercial Model

### 10.1 Pricing levers

Use a hybrid of:

- Per module.
- Per bundle.
- Per location/branch.
- Per POS terminal/device.
- Per employee for payroll.
- Per accountant portfolio/client.
- Per transaction volume for reconciliation.
- Per country pack or regulated adapter.
- Implementation/onboarding fee for enterprise or assisted setup.

### 10.2 Expansion paths

1. POS-only retailer:
   - POS -> Inventory -> Finance/Reconciliation -> Accounting -> Compliance.

2. Accountant-led client:
   - Accounting -> Accountant Portal -> Compliance -> Inventory/POS integration.

3. Payroll-led client:
   - Payroll/Presence -> Finance -> Accounting -> Compliance.

4. Multi-branch group:
   - Inventory/POS -> Branch/Offline -> Finance -> Full Business OS.

5. Fintech partner channel:
   - Reconciliation -> Merchant dashboard -> Accounting/Compliance upsell.

---

## 11. Migration Strategy

### 11.1 Existing tenants

For current organizations, do not suddenly hide operational surfaces. Migrate safely:

1. Create all platform modules.
2. Map existing permissions and used routes to module keys.
3. For active existing tenants, create a temporary `FULL_BUSINESS_OS_LEGACY` bundle or active entitlements for all modules already in use.
4. Run an audit report showing each organization, active users, permissions, and module access.
5. Enable shell filtering in observe mode first.
6. Enable direct route/action enforcement module by module.
7. Remove legacy broad access only after owners/admins have confirmed their plan.

### 11.2 Existing `requestedModules`

Preserve `requestedModules` as historical onboarding data. Use it to seed initial trial or pending entitlements for recently registered tenants. Do not treat it as authorization.

### 11.3 Downgrade and cancellation

Downgrades should:

- Disable new writes.
- Preserve read-only history where required.
- Continue legal/statutory exports where contractually or legally needed.
- Stop background jobs that create new operational activity.
- Preserve audit and ledger evidence permanently according to data retention policy.

---

## 12. Seed and Demo Data Plan

Create demo tenants that prove module isolation:

1. `demo-core-commerce`
   - Active: dashboard, inventory, pos, sales.
   - Hidden: payroll, compliance, accounting close, payment reconciliation.

2. `demo-accounting-firm`
   - Active: accounting, accountant_portal, compliance read-only.
   - Hidden: POS operations, payroll, inventory operations.

3. `demo-payroll-presence`
   - Active: payroll_presence, finance lite, dashboard.
   - Hidden: POS, inventory, purchasing.

4. `demo-full-business-os`
   - Active: all modules.
   - Used for sales demos and integration testing.

5. `demo-suspended-module`
   - Has payroll suspended and inventory active.
   - Used to test direct URL, API, export, job, and shell denial.

6. `demo-readonly-compliance-archive`
   - Compliance is read-only after downgrade.
   - Used to test statutory evidence retention.

The seed should include users with different roles so tests prove that entitlement and RBAC work together.

---

## 13. Engineering Roadmap

### Phase 0: Module inventory and registry

Owner: Product + Architecture + Engineering  
Outcome: Every route, action, service, report, export, and job has a module owner.

Deliverables:

- `config/modules.ts` registry.
- Route prefix to module map.
- Permission category to module map.
- Sidebar link `moduleKey`.
- Risk list for sensitive modules.

### Phase 1: Database and services

Owner: Backend + Data  
Outcome: Durable module entitlements exist.

Deliverables:

- Prisma migration for module catalog, dependencies, entitlements, subscriptions/requests if in scope.
- Seed platform modules.
- Seed existing tenants.
- Module gate service.
- Module audit events.

### Phase 2: Server-side enforcement

Owner: Backend + Security  
Outcome: Direct access cannot bypass module subscriptions.

Deliverables:

- Extend `protect` with `moduleKey`.
- Add module checks to high-value actions first: POS, inventory, accounting, compliance, payroll, finance/reconciliation, purchasing/AP.
- Add route-level helpers for pages.
- Add API/job/export/report guards.
- Add tests for denied direct calls.

### Phase 3: Shell and UX

Owner: Frontend + Design  
Outcome: Tenants see only active modules.

Deliverables:

- `useShellAccess`.
- Entitlement-aware sidebar/navbar.
- Entitlement-aware dashboard home.
- Owner/admin module settings page.
- Upgrade/request states.
- Bilingual copy.

### Phase 4: Register, onboarding, and commercial activation

Owner: Product + Growth + Engineering  
Outcome: Registration creates module intent and entitlement lifecycle.

Deliverables:

- Register recommendation logic.
- Trial/pending entitlement creation.
- Assisted setup/sales handoff.
- Login redirect by active module and role.
- Admin activation workflow.

### Phase 5: Billing and partner operations

Owner: Product + Finance + Partnerships + Engineering  
Outcome: Modules become monetizable packages.

Deliverables:

- Plan/bundle catalog.
- Subscription status sync.
- Usage metering.
- Partner grants.
- Renewal/suspension policy.
- Sales CRM export or webhook.

### Phase 6: Hardening and release gate

Owner: QA + Security + Engineering  
Outcome: Enterprise-grade confidence.

Deliverables:

- Matrix tests by tenant/module/role/status.
- E2E tests for invisible modules and direct URL denial.
- Background job denial tests.
- Report/export leakage tests.
- Performance tests for shell access.
- Audit event verification.

---

## 14. Team Execution Matrix

| Team | Responsibility | Key output |
|---|---|---|
| Product | Define module catalog, bundles, downgrade rules, activation policy | Module product spec and pricing model |
| Design | Create entitlement-aware shell, module settings, upgrade UX, onboarding | UX flows and component specs |
| Engineering | Build schema, services, guards, seeds, migrations, shell integration | Working module control plane |
| Security | Threat model, RBAC/module separation, audit policy, direct access tests | Security sign-off |
| QA | Tenant/module/role test matrix, E2E coverage, regression suite | Release confidence |
| Sales | Stakeholder pitch, bundle decks, objection handling | Sales playbook |
| Partnerships | Accountant, fintech, implementation, compliance channels | Partner rollout plan |
| Customer Success | Onboarding scripts, module adoption, upgrade triggers | Activation and retention playbooks |

---

## 15. Risk Register

| Risk | Impact | Control |
|---|---|---|
| Sidebar hides modules but APIs still allow access | Data leakage and subscription bypass | Enforce module gates in server actions, services, APIs, jobs, exports |
| Admin wildcard bypasses commercial gates | Revenue leakage and broken product promise | Wildcard affects permissions only, not entitlements |
| Downgrade deletes or hides legal evidence | Compliance failure | Read-only archive policy and immutable evidence retention |
| Module dependencies confuse users | Poor conversion | Bundle recommendations and clear dependency messages for owners/admins |
| Billing outage disables good customers | Operational disruption | Grace periods and explicit subscription state machine |
| Entitlement caching becomes stale | Unauthorized access after suspension | Short-lived request caching for authorization, fail-closed high-risk operations |
| Migration hides existing tenant workflows | Customer trust damage | Legacy bundle, observe mode, tenant access audit |
| Permission explosion | Admin complexity | Module-scoped permission categories and role templates |

---

## 16. Verification Gates

Before release, the platform should pass these checks:

1. Tenant A active POS, Tenant B no POS:
   - Tenant B cannot see POS, open `/dashboard/pos`, call POS actions, access POS APIs, or run POS exports.

2. Tenant with payroll read-only:
   - Can view historical payslips if policy allows.
   - Cannot create payroll runs, approve, post, or release payments.

3. Admin with `*` but no accounting entitlement:
   - Cannot access accounting module operations.

4. User with accounting entitlement but no accounting permission:
   - Cannot access accounting operations.

5. Suspended payment reconciliation:
   - Background matching job skips tenant and emits audited denial.

6. Landing/register path:
   - Selected modules create pending/trial entitlements and route user to the right onboarding state.

7. Report/export leakage:
   - Cross-module analytics only includes entitled modules.

8. Seed tenants:
   - Demo tenants prove visible, hidden, suspended, and read-only module states.

---

## 17. Why This Creates A 10-Year Moat

1. Compliance moat
   - Most competitors sell generic POS, stock, or accounting software. AqStoqFlow can sell an OHADA-aware operating layer with country packs, auditability, and statutory evidence.

2. Evidence moat
   - The same operational event can become stock evidence, sales evidence, payment evidence, accounting evidence, compliance evidence, and close evidence.

3. Modular adoption moat
   - SMBs can start small without choosing a weak product. They get a serious system from day one and expand without migration.

4. Partner moat
   - Accountants, fintechs, banks, implementers, and compliance partners can each enter through their own module while feeding the same platform.

5. Data quality moat
   - Module gates plus RBAC plus tenant isolation produce cleaner, permissioned operational data for analytics, reconciliation, financing readiness, and AI assistance.

6. Switching-cost moat
   - Once POS, inventory, accounting, payroll, compliance, reconciliation, and branch evidence share one source trail, replacing the platform becomes painful.

7. Trust moat
   - A tenant that only sees purchased modules, with auditable controls behind every sensitive action, perceives the product as professional and enterprise-grade.

---

## 18. Recommended Next Build Prompt

Use this implementation prompt after the report is accepted:

```text
Implement AqStoqFlow's module entitlement control plane. Preserve the existing tenant isolation, RBAC, auditability, ledger-first accounting, OHADA country-pack direction, and current registration workflow. Add a durable platform module catalog, organization module entitlements, module dependencies, module gate services, module audit events, seed data, and tests. Extend protected server actions, route/page guards, API routes, reports, exports, background jobs, sidebar, navbar, dashboard widgets, login redirects, and register onboarding so tenants can see and use only active/trial/read-only modules according to their entitlement status and user permissions. Existing Organization.requestedModules must remain onboarding intent and must be migrated into pending/trial entitlements where appropriate. Admin wildcard permissions must not bypass module entitlements. Produce demo tenants for full, limited, suspended, and read-only module states, and verify direct URL/API/action/job/report denial for unsubscribed modules.
```

---

## 19. Final Recommendation

Yes, it makes strong strategic sense to restructure AqStoqFlow into a module-based operating system. The change should not be treated as a UI filter project. It should be implemented as a control plane that joins commercial packaging, tenant entitlements, RBAC, service guards, audit events, onboarding, shell rendering, billing, and partner growth.

The winning positioning is:

```text
AqStoqFlow is the modular, ledger-first OHADA SMB operating system. Start with the module your business needs now, then expand into the rest of the business without losing trust, evidence, compliance, or control.
```
