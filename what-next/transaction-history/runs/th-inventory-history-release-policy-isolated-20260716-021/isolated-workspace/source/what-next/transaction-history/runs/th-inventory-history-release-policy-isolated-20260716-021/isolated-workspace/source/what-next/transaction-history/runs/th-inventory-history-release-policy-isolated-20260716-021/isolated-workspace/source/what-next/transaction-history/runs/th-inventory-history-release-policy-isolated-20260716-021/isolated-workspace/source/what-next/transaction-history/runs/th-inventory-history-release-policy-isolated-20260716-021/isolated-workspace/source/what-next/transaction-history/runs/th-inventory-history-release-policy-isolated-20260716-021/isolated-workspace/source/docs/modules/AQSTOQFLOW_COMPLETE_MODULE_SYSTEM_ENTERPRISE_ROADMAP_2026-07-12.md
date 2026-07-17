# AqStoqFlow Complete Module System Enterprise Roadmap

Date: 2026-07-12
Workspace: `E:\ohada saas\Focused projects\stoquify`
Primary source: `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
Mode: roadmap only, observe mode preserved, no hard enforcement enabled

## Executive Verdict

AqStoqFlow has crossed the first serious threshold toward a modular SaaS platform: it has a real commercial module vocabulary, an observe-mode entitlement evaluator, a Module Control Center, route and permission metadata, shared guard seams, audit-capable would-block decisions, and a module surface inventory. That is a credible foundation.

It is not yet a complete enterprise module system. The current module layer is still an observe-mode governance spine wrapped around a historically full-suite product. The main blocker is that module access truth is not yet durable, subscription-backed, package-aware, consistently guarded, or release-gated across every user-facing and system-facing surface.

The next goal is not to hide sidebar links. The next goal is to build a complete Module Control Plane: canonical modules, commercial packages, tenant entitlements, dependency policy, centralized server-side guards, registered surfaces, professional module states, billing-provider isolation, audit evidence, and release ratchets.

The practical answer is a phased program: freeze vocabulary first, build durable entitlement truth second, expand the surface registry third, centralize guards fourth, then run controlled enforcement pilots before broad module-by-module hard enforcement.

## Current State

The current system is a strong observe-mode foundation.

- `services/modules/module-control-contracts.ts` defines `MODULE_CONTROL_MODE = "observe"` and 20 commercial module slugs.
- `services/modules/module-catalog.service.ts` carries module names, owners, statuses, route prefixes, permissions, aliases, risk levels, and dependency metadata.
- `services/modules/module-entitlement.service.ts` derives legacy entitlements from `Organization.requestedModules`, evaluates access, records would-block decisions, and feeds the control center.
- `/dashboard/settings/modules` exposes a Module Control Center protected by `MANAGE_SYSTEM_SETTINGS`.
- `services/_shared/protect.ts` supports module-gated actions through a shared protection seam.
- `lib/security/server-authz.ts` supports API module gating through `requireApiModuleAccess()`.
- `config/sidebar.ts` includes `moduleSlug` metadata, but current sidebar filtering is permission-led, not entitlement-led.
- `scripts/module-surface-inventory.js` inventories module surfaces in report mode.
- `package.json` keeps `module:surface:inventory` in report mode and intentionally outside fail-mode `policy:gates`.

Current inventory baseline from `what-next/module-surface-inventory.md`:

| Evidence area | Current finding |
|---|---:|
| Catalog modules | 20 |
| Surfaces inventoried | 306 |
| Mapped surfaces | 266 |
| Unmapped surfaces | 34 |
| Missing-permission findings | 16 |
| Enforcement candidates | 300 |
| Dashboard-only risks | 0 in the refreshed snapshot |
| Surface coverage | sidebar, module catalog, dashboard root, actions root |

Guard distribution:

| Guard | Count |
|---|---:|
| `sidebar-permission-filter` | 72 |
| `requirePermission` | 76 |
| `checkPermission` | 59 |
| `protect` | 34 |
| `requireAnyPermission` | 22 |
| `FinanceRouteAccess` | 13 |
| `none` | 26 |
| `requireRbacContext` | 2 |
| `module-observe` | 1 |
| `delegated-re-export` | 1 |

This is enough to plan enforcement. It is not enough to enable broad enforcement.

## What Is Working

### Canonical module vocabulary exists

The platform has a typed module vocabulary with these slugs:

`dashboard`, `inventory`, `production`, `sales`, `pos`, `cash_drawer`, `accounting`, `close_assurance`, `compliance`, `purchasing`, `presence`, `payroll`, `finance`, `payment_reconciliation`, `analytics`, `reports`, `commercial_agents`, `content`, `settings`, and `administration`.

This gives engineering, product, billing, UX, reporting, and release governance a shared language.

### The catalog is richer than navigation

The catalog is not just a sidebar definition. It contains ownership, statuses, permissions, route prefixes, aliases, risk levels, and dependencies. That is the correct nucleus for module-aware packaging and governance.

### Observe mode is the correct current posture

The evaluator returns `would_block` evidence while allowing traffic in observe mode. That protects existing tenants while the team finishes inventory, dependency semantics, unavailable states, and guard convergence.

### RBAC and module entitlement are conceptually separated

The audit confirms the right conceptual split:

- RBAC answers "what can this user do?"
- Module entitlement answers "what has this tenant bought, activated, trialed, or retained as read-only?"

This separation must remain non-negotiable. Admin or wildcard RBAC must not become a module bypass.

### Shared server seams already exist

`protect()` and `requireApiModuleAccess()` are the right direction. They prove the codebase does not need permanent one-off module checks everywhere. The roadmap should converge on shared server-side guard contracts.

### Module Control Center exists

The settings page already gives administrators a view into requested modules, entitled modules, dependency gaps, would-block decisions, unknown requests, and module status. It is a good base for a future Module Workbench.

### Audit evidence has started

Would-block module decisions can be written as `MODULE_ENTITLEMENT_OBSERVED` audit events. That gives the platform evidence before enforcement and a future basis for deny audits, billing audits, support diagnostics, and release signoff.

## What Is Not Working

### `Organization.requestedModules` is not entitlement truth

`Organization.requestedModules String[] @default([])` is onboarding intent. It cannot represent durable subscription reality.

It cannot safely model:

- package source;
- billing status;
- paid add-ons;
- trials;
- trial expiry;
- read-only retention;
- suspension;
- downgrade;
- deactivation;
- manual override;
- dependency grants;
- historical access policy;
- entitlement event history.

It should be preserved as migration evidence, not treated as the durable access source.

### Hard enforcement is intentionally off

`MODULE_CONTROL_MODE` is `observe`, the control data reports `hardEnforcementEnabled: false`, and inventory remains report-only. That is correct today, but it means the platform is not yet a commercially enforceable modular SaaS control plane.

### Surface coverage is incomplete

The current inventory covers sidebar, dashboard pages, actions, and module services. Enterprise module enforcement also needs first-class coverage for:

- API routes;
- report services;
- export services;
- scheduled jobs;
- background processors;
- webhooks;
- public token-bound flows;
- proof/evidence surfaces;
- notification and signal surfaces;
- BI cards and dashboards;
- cross-module read models.

### Guarding is inconsistent by surface

Some surfaces use `protect()`. Some use `requirePermission()`. Some use `checkPermission()`. Some call `observeModuleAccess()` manually. Some APIs call `requireApiModuleAccess()`. Some still show `guard: none` in inventory.

This creates a maturity ceiling. Enterprise-grade modularity needs one contract and surface-specific wrappers, not caller memory.

### Session module claims are not authoritative

The current `modulesEnabled` session claim is hard-coded in `lib/security/auth-session.ts`. Once durable entitlements exist, session claims must either derive from the entitlement read model or be removed until they can be trusted.

### Product vocabulary has drift

Architecture documents and current catalog names do not fully match. Terms like `payments`, `reconciliation`, `close`, `controls`, and `partners` need reconciliation with current slugs like `payment_reconciliation`, `close_assurance`, `cash_drawer`, `commercial_agents`, `reports`, `content`, `settings`, and `administration`.

Vocabulary drift blocks packaging, pricing, UX, and support documentation.

### Dependencies are not commercially complete

Current dependencies exist, but they do not yet distinguish:

- hard runtime dependency;
- commercial package dependency;
- recommended add-on;
- evidence dependency;
- read-only dependency;
- reporting dependency;
- write/posting dependency.

POS, cash drawer, payment reconciliation, accounting, payroll, purchasing, compliance, and close assurance need dependency semantics strong enough for packaging and enforcement.

### Module UI is not yet a full product experience

The sidebar has `moduleSlug` metadata, but hiding navigation is not security. The UI also lacks complete module states:

- active;
- trial;
- trial expiring;
- read-only;
- suspended;
- expired;
- unavailable;
- dependency missing;
- upgrade available;
- admin action required;
- billing attention required.

The current Module Control Center is valuable diagnostics, not yet a complete module management workbench.

## Why It Is Not Working Yet

The platform is between two architectures:

1. A full-suite operational platform where features assume broad availability.
2. A modular SaaS platform where every module is package-aware, tenant-entitled, guarded, audited, priced, and operationally stateful.

That transition is hard because the codebase has real cross-module workflows. Inventory feeds POS, POS feeds finance and accounting, purchasing feeds inventory and AP, payroll feeds accounting and payment reconciliation, and close assurance depends on evidence from many modules. A simplistic entitlement switch would break the operating model.

The correct path is not abrupt enforcement. It is to make module truth durable, make surfaces explicit, make dependencies typed, make unavailable states professional, and enforce one module at a time with rollback.

## What Is Holding The System Back

The main blockers are:

1. No durable tenant entitlement schema.
2. No package and subscription source of truth.
3. `requestedModules` still participates in runtime access derivation.
4. Inventory is report-only, not a merge-blocking ratchet.
5. APIs, reports, exports, jobs, webhooks, and proof surfaces are not fully inventoried.
6. Guard contract is not centralized across all surface types.
7. Session module claims are hard-coded.
8. Module vocabulary and dependency semantics need freezing.
9. UI states do not yet express trial, read-only, suspension, expiry, dependency gaps, or upgrade flows.
10. Billing provider boundaries and provisioning idempotency are not yet modeled.
11. Deactivation and historical-data rules are not yet formalized.
12. Audit captures observed decisions, but not the full entitlement lifecycle.

## Target Enterprise Architecture

### Control-plane layers

The target system should have these service-owned layers:

| Layer | Responsibility |
|---|---|
| Module catalog | Canonical slugs, names, owner, risk, route prefixes, aliases, lifecycle status |
| Module dependency graph | Required, recommended, bundled, evidence, read-only, and write dependencies |
| Package catalog | Sellable plans and add-ons with pricing metadata |
| Tenant subscription | Tenant commercial state independent of billing provider internals |
| Tenant entitlements | Module-level access records derived from package, trial, override, migration, or retention |
| Surface registry | Pages, actions, APIs, reports, exports, jobs, webhooks, proof surfaces, and navigation |
| Guard contract | Server-side module access decision before data access or mutation |
| UX state contract | Active, trial, read-only, suspended, expired, unavailable, dependency-missing states |
| Audit/evidence model | Entitlement changes, access decisions, denies, overrides, billing events |
| Release gates | Inventory ratchets, guard tests, regression gates, rollback evidence |

### Canonical access decision

All protected surfaces should converge on one typed contract:

```ts
requireModuleAccess({
  organizationId,
  userId,
  moduleSlug,
  surfaceType,
  surface,
  accessIntent,
  permission,
  mode,
  evidenceContext,
})
```

The contract should return:

- `allowed`;
- `result`: `allow`, `would_block`, or `deny`;
- `status`: active, trial, read-only, suspended, expired, unavailable;
- `reason`;
- `dependencies`;
- `redactionPolicy`;
- `auditEventId`;
- `safeError`;
- `uiState`.

### Data model recommendation

Additive Prisma models should be introduced before deprecating any legacy fields.

Suggested core models:

```prisma
model CommercialModule {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  owner       String
  status      String
  riskLevel   String
  category    String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CommercialModuleDependency {
  id              String   @id @default(cuid())
  moduleSlug      String
  dependencySlug  String
  dependencyType  String
  accessMode      String
  requiredFor     String
  createdAt       DateTime @default(now())

  @@unique([moduleSlug, dependencySlug, dependencyType, requiredFor])
}

model CommercialPackage {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  status      String
  marketTier  String
  billingMode String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CommercialPackageModule {
  id            String   @id @default(cuid())
  packageCode   String
  moduleSlug    String
  inclusionType String
  pricingRole   String
  createdAt     DateTime @default(now())

  @@unique([packageCode, moduleSlug])
}

model TenantSubscription {
  id                 String   @id @default(cuid())
  organizationId     String
  packageCode        String
  status             String
  billingProvider    String?
  billingCustomerRef String?
  billingSubRef      String?
  startsAt           DateTime
  endsAt             DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model TenantModuleEntitlementRecord {
  id              String   @id @default(cuid())
  organizationId  String
  moduleSlug      String
  status          String
  source          String
  sourceRef       String?
  readOnly        Boolean  @default(false)
  trial           Boolean  @default(false)
  startsAt        DateTime?
  endsAt          DateTime?
  reason          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId, status])
  @@unique([organizationId, moduleSlug, source, sourceRef])
}

model TenantModuleEntitlementEvent {
  id              String   @id @default(cuid())
  organizationId  String
  moduleSlug      String
  eventType       String
  fromStatus      String?
  toStatus        String?
  actorUserId     String?
  source          String
  sourceRef       String?
  reason          String?
  evidenceJson    Json?
  createdAt       DateTime @default(now())

  @@index([organizationId, moduleSlug, createdAt])
}

model ModuleSurfaceRegistryRecord {
  id              String   @id @default(cuid())
  surfaceKey      String   @unique
  surfaceType     String
  filePath        String
  routePattern    String?
  actionName      String?
  moduleSlug      String?
  permission      String?
  accessIntent    String
  guardContract   String
  owner           String
  riskLevel       String
  enforcementMode String
  classification  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Names can be adjusted to match local conventions, but the concepts should be preserved.

## Detailed Phased Roadmap

### Phase 0: Evidence freeze and roadmap baseline

Goal: make the current observe-mode state explicit before implementation starts.

Actions:

- Save this roadmap.
- Keep hard enforcement off.
- Run `npm run module:surface:inventory` and preserve the output as the baseline.
- Record the current counts: 306 surfaces, 34 unmapped, 16 missing permission, 26 guard none.
- Treat these counts as the first ratchet baseline.

Exit criteria:

- Roadmap saved.
- Inventory command passes.
- No production behavior changed.

### Phase 1: Canonical module vocabulary freeze

Goal: eliminate ambiguity before schema, billing, UX, and enforcement depend on the vocabulary.

Actions:

- Reconcile ADR vocabulary against `COMMERCIAL_MODULE_SLUGS`.
- Mark each slug as one of: sellable module, bundle-only module, platform domain, support domain, internal control module, or deprecated alias.
- Decide whether `reports`, `analytics`, `settings`, `administration`, `content`, and `commercial_agents` are independently sellable or platform/support modules.
- Add a canonical module vocabulary document under `docs/modules/`.
- Add tests that fail on unknown catalog slugs, duplicate aliases, or stale ADR terms.

Deliverables:

- `docs/modules/AQSTOQFLOW_CANONICAL_MODULE_VOCABULARY_2026-07-12.md`
- Updated catalog metadata, without enabling hard enforcement.
- Vocabulary drift test.

Success criteria:

- One canonical slug list.
- One alias/deprecation list.
- No unresolved commercial-vs-platform ambiguity.

### Phase 2: Commercial module vs platform-domain classification

Goal: separate what the business sells from what the platform uses internally.

Actions:

- Classify every slug by commercial role.
- Define platform-default modules that every tenant must retain for safe operation.
- Define module bundles for common customer profiles.
- Define dependency and add-on policy for high-risk modules.

Recommended initial classification:

| Module | Recommended class | Notes |
|---|---|---|
| `dashboard` | platform domain | Usually core workspace entry, not sold alone |
| `settings` | platform domain | Tenant administration, not a normal commercial feature |
| `administration` | internal/platform | Needs careful owner-only semantics |
| `inventory` | sellable module | Strong commercial module |
| `sales` | sellable module | Customer/orders surface |
| `pos` | sellable module/add-on | Depends on sales and operational stock/payment policies |
| `cash_drawer` | sellable add-on | Tied to POS, finance, and audit controls |
| `purchasing` | sellable module | Strong commercial module |
| `accounting` | sellable/core finance module | High-risk, accounting-grade enforcement |
| `finance` | sellable module or executive layer | Needs boundary with accounting |
| `payment_reconciliation` | sellable add-on/module | High trust and evidence importance |
| `payroll` | sellable module | High privacy and statutory controls |
| `presence` | sellable add-on/module | Likely payroll dependency or HR package component |
| `compliance` | sellable module | Country-pack and document compliance |
| `close_assurance` | sellable premium module | Depends on accounting and evidence sources |
| `analytics` | sellable add-on/module | Must respect source-module access |
| `reports` | bundle/platform/reporting layer | Must not bypass source modules |
| `production` | sellable module | Needs inventory dependency definition |
| `commercial_agents` | sellable add-on or future module | Needs surface maturity |
| `content` | platform/support | Low-risk first enforcement candidate if scoped |

Exit criteria:

- Product, engineering, and support can explain every module in one sentence.
- Pricing and packaging can use the vocabulary without translation.

### Phase 3: Durable package, subscription, and tenant entitlement schema

Goal: move module truth from registration intent to durable entitlement records.

Actions:

- Add additive models for commercial modules, dependencies, packages, package modules, tenant subscriptions, tenant entitlements, entitlement events, and surface registry records.
- Seed the current catalog into durable tables.
- Create a read model that returns effective tenant entitlements.
- Preserve `Organization.requestedModules` as onboarding intent and migration input.
- Do not remove or reinterpret historical requested-module data.

Exit criteria:

- Every organization can have explicit entitlement records.
- Effective entitlement evaluation can run without relying on `requestedModules`.
- Legacy tenants can still be interpreted safely during migration.

### Phase 4: Migration from `Organization.requestedModules`

Goal: backfill tenants safely without accidental access loss.

Actions:

- Build an idempotent migration/backfill command.
- For each organization, convert normalized requested modules into tenant entitlement records with source `requested_modules_migration`.
- For tenants with no requested modules, create explicit legacy full-suite entitlements with source `legacy_full_suite_migration`, matching current observe-mode behavior.
- Capture unknown requested modules as migration warnings, not silent grants.
- Write entitlement events for every migrated grant.
- Run the migration in dry-run mode first.

Exit criteria:

- Every tenant has explicit effective entitlements.
- Unknown requested modules are reported.
- No tenant loses access in observe mode.

### Phase 5: Package-to-module dependency and pricing model

Goal: make the system commercially usable.

Actions:

- Define package tiers and add-ons.
- Map each package to modules.
- Define dependency types: required, recommended, bundled, technical, evidence, read-only, reporting, and write dependency.
- Define downgrade behavior for each module.
- Define minimum platform package that keeps tenant administration, identity, settings, audit, and billing safe.

Recommended package sketch:

| Package | Purpose | Candidate modules |
|---|---|---|
| Starter Operations | Small business stock and sales | dashboard, settings, inventory, sales, reports-lite |
| Retail POS | Counter sales and cash control | Starter plus pos, cash_drawer |
| Purchasing Control | Procurement and AP | inventory, purchasing, finance-lite |
| Finance Core | Financial visibility | accounting, finance, reports |
| Assurance Pro | Close and control evidence | accounting, close_assurance, compliance, payment_reconciliation |
| Payroll Pro | Payroll and statutory workforce | payroll, presence, payment_reconciliation-lite, compliance links |
| Executive Intelligence | Owner and analytics layer | analytics, reports, dashboard intelligence |

Exit criteria:

- Product can price packages.
- Engineering can derive entitlements from packages.
- Support can explain why a dependency is required or recommended.

### Phase 6: Centralized module access guard contract

Goal: eliminate ad hoc module access checks.

Actions:

- Introduce a canonical `requireModuleAccess()` service.
- Make it the only place that evaluates module entitlement, dependency state, read-only policy, and enforcement mode.
- Wrap it for page, action, API, report, export, job, webhook, and proof surfaces.
- Align guard order with enterprise policy: session, tenant scope, module entitlement, RBAC, fresh auth, maker-checker, consent, redaction, audit.
- Keep observe mode as default until pilots are approved.
- Replace direct `observeModuleAccess()` calls gradually with typed wrappers.

Exit criteria:

- One module decision engine.
- One result shape.
- One safe denial shape.
- One audit path.

### Phase 7: Full surface registry

Goal: make every module surface visible, owned, and testable.

Actions:

- Expand inventory beyond sidebar/pages/actions to APIs, reports, exports, jobs, webhooks, proof surfaces, BI cards, public token flows, and scheduled processors.
- Convert heuristic-only inventory into an explicit registry plus scanner validation.
- Require each surface to declare module slug, permission, owner, risk, access intent, guard, and unavailable behavior.
- Add `not applicable` classifications for true public, token-bound, or internal helper surfaces.
- Add ratchets that block new unmapped or missing-permission surfaces.

Exit criteria:

- The current 34 unmapped and 16 missing-permission findings are either fixed or explicitly classified.
- New unclassified surfaces cannot merge.

### Phase 8: Module-aware shell and UX states

Goal: make modularity feel professional to users while server enforcement remains authoritative.

Actions:

- Define UI state contract returned by module control services.
- Add normal-user unavailable states that do not expose sensitive module internals.
- Add owner/admin upgrade and dependency-resolution states.
- Add read-only historical views for expired or retained modules where policy allows.
- Add suspended states with clear safe copy and support path.
- Make sidebar filtering entitlement-aware only after server-side guards are reliable.

Required states:

| State | UI behavior | Security behavior |
|---|---|---|
| Active | Normal navigation and workflows | Allow if RBAC also passes |
| Trial | Normal access with trial indicator for admins/owners | Allow with auditable trial source |
| Trial expiring | Owner/admin warning | Allow until expiry |
| Read-only | Hide or disable writes, preserve history | Deny mutations, allow approved reads |
| Suspended | Show safe unavailable state | Deny reads/writes except allowed billing/admin support |
| Expired | Show renewal path for owners/admins | Deny or read-only per retention policy |
| Dependency missing | Explain missing dependency to owner/admin | Deny dependent workflow |
| Not entitled | Safe unavailable state | Deny direct URLs and APIs |

Exit criteria:

- Direct URL denial and UI state are consistent.
- The UI never substitutes for server-side security.

### Phase 9: Audit trail and evidence model

Goal: make entitlement decisions provable.

Actions:

- Extend audit from would-block observations to full entitlement lifecycle events.
- Record package changes, entitlement grants, suspensions, expirations, overrides, dependency denials, read-only grants, billing-driven changes, and manual admin actions.
- Add redacted support diagnostics for module access incidents.
- Add evidence IDs to access decisions and denial responses for support traceability.

Exit criteria:

- Every entitlement state change is auditable.
- Every hard denial can be explained without leaking sensitive data.

### Phase 10: Billing-provider boundary and safe provisioning workflow

Goal: make billing integration safe without letting the billing provider become access truth.

Actions:

- Create a billing adapter boundary.
- Treat provider webhooks as inputs to internal subscription state.
- Enforce idempotency keys for subscription changes.
- Require reconciliation between provider state and internal subscription state.
- Allow manual overrides only through audited owner/admin workflows.
- Add dunning, suspension, read-only, and reactivation policies.

Exit criteria:

- Billing events cannot directly mutate module access without service-owned validation.
- Provisioning is idempotent and auditable.

### Phase 11: Report, export, job, and webhook leakage prevention

Goal: close the non-page leakage paths.

Actions:

- Register every report and export with source modules and output sensitivity.
- Add module checks before report data queries.
- Add source-module redaction for cross-module dashboards.
- Add job-level module checks for scheduled processors.
- Add webhook gating where outbound events include module-owned data.
- Add tests that direct exports cannot leak inactive module data.

Exit criteria:

- Reports, exports, jobs, and webhooks obey module access rules.
- Source modules cannot be bypassed through analytics or report aggregation.

### Phase 12: Pilot enforcement plan

Goal: prove enforcement safely in a bounded area.

Pilot candidate selection rules:

- Low blast radius.
- Clean inventory.
- Clear owner.
- Minimal cross-module dependencies.
- Mature unavailable state.
- Focused test coverage.
- Rollback flag exists.

Recommended pilot path:

1. Start with a low-risk support or content surface if product agrees it is a true module.
2. Then enforce one read-only reporting surface.
3. Then enforce one bounded inventory or purchasing read surface.
4. Delay payroll, accounting postings, POS transactions, exports, and background jobs until the guard contract and state model are proven.

Pilot verification:

- Direct route access denied safely.
- Server action access denied safely.
- API access denied safely.
- Report/export access denied or redacted safely.
- Audit event written.
- Owner/admin sees useful next action.
- Rollback returns to observe mode without schema rollback.

### Phase 13: Module-by-module hard-enforcement rollout

Goal: graduate from observe mode without breaking tenants.

Rollout order should be based on risk and dependency complexity:

| Stage | Module family | Rationale |
|---|---|---|
| 1 | content/support surfaces | Lowest operational risk if classified as sellable |
| 2 | reports and analytics read surfaces | Good test of source-module redaction |
| 3 | purchasing and inventory read surfaces | Operationally important but easier than writes |
| 4 | sales and POS support/read surfaces | High customer visibility, moderate risk |
| 5 | payment reconciliation and cash drawer | High trust, needs audit evidence |
| 6 | payroll read-only surfaces | Sensitive data, privacy controls required |
| 7 | accounting and close assurance reads | Evidence-heavy, high confidence needed |
| 8 | writes, postings, exports, jobs | Highest risk, enforce last |

Each module must pass:

- complete surface registry;
- dependency graph test;
- RBAC plus module access tests;
- direct URL tests;
- API/action tests;
- report/export/job tests if relevant;
- unavailable/read-only/suspended UI test;
- audit evidence test;
- rollback test.

### Phase 14: Release gates, tests, ratchets, and rollback

Goal: make modularity permanent release discipline.

Actions:

- Add a report-mode baseline first.
- Add a ratchet gate that fails only on new unmapped or missing-permission surfaces.
- Once baseline reaches zero, switch to fail on any unmapped protected surface.
- Add enforcement-mode tests per module.
- Add CI evidence snapshots for module surface inventory.
- Add rollback flags per pilot/module.
- Add release notes for tenant-facing module access changes.

Recommended gates:

| Gate | First mode | Mature mode |
|---|---|---|
| Module surface inventory | report plus ratchet | fail on unmapped or unguarded |
| API guard inventory | fail | fail |
| Report/export module leakage | report plus pilot | fail |
| Job/webhook module leakage | report plus pilot | fail |
| Entitlement schema migration | dry run | fail on drift |
| Session claim trust | warning | fail on stale hard-coded claims |
| Package dependency matrix | report | fail on invalid package |
| Enforcement rollback | manual evidence | automated smoke |

## Security And RBAC Controls

The module system must preserve this hierarchy:

1. Authenticated session.
2. Tenant scope and membership.
3. Tenant module entitlement.
4. RBAC permission.
5. Fresh auth where needed.
6. Maker-checker or approval controls where needed.
7. Consent and privacy controls where needed.
8. Redaction policy.
9. Audit trail.

Controls to implement:

- Wildcard/admin RBAC cannot bypass tenant module entitlement.
- Module denial must happen before data access.
- Direct URLs must not bypass module gates.
- API routes must not bypass module gates.
- Reports and exports must check source-module access.
- Background jobs must not process inactive module data except approved retention tasks.
- Cross-module dashboards must redact or omit unavailable source modules.
- Safe errors must avoid leaking paid-module details to normal users.
- Owner/admin diagnostics may include more detail, but still no sensitive data leakage.
- Manual overrides require audit events and expiry.

## Product And SaaS Packaging Strategy

The module system should support professional packaging without turning every internal capability into a sellable SKU.

Recommended product principles:

- Sell outcomes, not internal code folders.
- Keep identity, tenant settings, audit, billing, and owner administration as platform foundations.
- Make high-value operational domains sellable: inventory, POS, purchasing, accounting, payroll, reconciliation, compliance, close assurance, analytics.
- Treat dependencies honestly. Do not sell POS without the operational prerequisites it needs.
- Keep read-only retention as a customer-trust feature for downgraded modules.
- Let add-ons unlock premium surfaces without duplicating core data.
- Make package changes reversible, audited, and supportable.

Packaging must answer:

- What does a tenant get by default?
- Which modules are core vs add-on?
- Which modules can be trialed?
- Which modules can expire into read-only?
- Which modules must never be fully hidden because they own historical evidence?
- Which modules are compliance-sensitive and need stronger gates?

## UI/UX Module-System Requirements

The user experience must be module-native but security-backed.

Requirements:

- Sidebar state must reflect module state only after server guards are trustworthy.
- Hiding a link is never treated as access control.
- Module unavailable pages must be useful, calm, and role-aware.
- Normal users should see simple unavailable/read-only language.
- Owners/admins should see package source, dependency gaps, upgrade path, and support actions.
- Suspended states should not shame users or expose billing internals to non-owners.
- Read-only states should preserve historical trust.
- Module Control Center should become Module Workbench with package, entitlement, dependency, audit, and rollout views.
- Dashboard cards should degrade gracefully when source modules are unavailable.
- Reports should show partial/unavailable states rather than leaking hidden data.

## Service-Boundary Recommendations

Recommended service modules:

| Service | Responsibility |
|---|---|
| `module-catalog.service.ts` | Canonical module definitions and owners |
| `module-dependency.service.ts` | Dependency graph and package dependency validation |
| `module-package.service.ts` | Package catalog and package-module mapping |
| `tenant-subscription.service.ts` | Tenant package state independent of billing provider internals |
| `tenant-entitlement.service.ts` | Effective entitlement records and read model |
| `module-access.service.ts` | Canonical module guard decision |
| `module-surface-registry.service.ts` | Registered pages/actions/APIs/reports/exports/jobs/webhooks |
| `module-audit.service.ts` | Entitlement events and access decision evidence |
| `billing-provisioning.service.ts` | Idempotent billing input processing |
| `module-ui-state.service.ts` | Safe owner/admin/user state contract |

Service ownership rules:

- UI never derives entitlement truth.
- Billing provider never directly grants runtime access.
- Reports never bypass source-module policy.
- Jobs never infer module access from old tenant data alone.
- Cross-module services must name the owning source module and consuming module.

## Release-Gate And Testing Plan

Minimum test matrix:

| Area | Required tests |
|---|---|
| Vocabulary | Unknown slug, duplicate alias, ADR drift, dependency validity |
| Entitlement evaluator | active, trial, read-only, suspended, expired, missing, dependency gap |
| Migration | requested modules normalization, legacy full-suite, unknown requests, idempotency |
| Guards | page, action, API, report, export, job, webhook wrappers |
| RBAC interaction | module denied despite wildcard RBAC, RBAC denied despite module active |
| UI states | active, unavailable, read-only, suspended, dependency missing |
| Audit | entitlement grant/change/deny/override events |
| Billing boundary | idempotent webhook handling, provider drift, manual override |
| Surface inventory | no new unmapped, no new missing permission, no new guard none |
| Rollback | enforcement flag restores observe behavior without data loss |

Release sequencing:

1. Observe and record.
2. Add schema and read models.
3. Backfill in dry-run.
4. Backfill in observe mode.
5. Add surface ratchet.
6. Add guard wrappers.
7. Pilot one module.
8. Expand module by module.
9. Turn broad enforcement on only after every high-risk path is covered.

## Risk Register

| Risk | Severity | Why it matters | Mitigation |
|---|---:|---|---|
| Sidebar hiding treated as security | Critical | Direct URLs, APIs, and actions could bypass module UX | Server-side guard contract before UI trust |
| `requestedModules` treated as durable truth | Critical | Onboarding intent becomes paid access truth | Add tenant entitlement records and migrate |
| Wildcard RBAC bypasses modules | Critical | Admin role could defeat commercial and compliance gates | Explicit tests and guard ordering |
| Reports or exports leak inactive module data | Critical | Data trust and subscription boundary failure | Source-module report/export registry |
| Jobs process inactive module workflows | High | Background leakage or unauthorized mutations | Job-level module access wrappers |
| Billing provider directly controls access | High | Provider drift can corrupt tenant access | Internal subscription and entitlement truth |
| Existing tenants lose access during migration | High | Operational disruption and churn | Legacy full-suite explicit migration in observe mode |
| Dependency graph blocks valid workflows | High | Poor UX and support load | Typed dependency semantics and pilot testing |
| Guard inconsistency remains | High | Security behavior differs by surface | Centralized contract and wrappers |
| Session claims stay hard-coded | Medium | UI/API decisions may trust stale module state | Derive claims from entitlement read model or remove |
| Inventory false positives hide real gaps | Medium | Bad governance evidence | Explicit registry plus scanner validation |
| Product vocabulary drift continues | Medium | Packaging confusion and engineering churn | Vocabulary freeze and drift tests |
| Manual overrides become permanent | Medium | Entitlement exceptions pile up | Expiring overrides and audit review |

## Success Criteria

The module system reaches the target level when:

- Every tenant has explicit effective module entitlements.
- `Organization.requestedModules` is migration/onboarding evidence only.
- Every package maps to modules and dependency policy.
- Every protected page, action, API, report, export, job, webhook, proof surface, and navigation item is registered or explicitly not applicable.
- Every protected surface has a server-side module guard.
- Module denial happens before data access.
- RBAC and module entitlement are both required where applicable.
- Wildcard/admin RBAC cannot bypass module entitlement.
- Session module claims are authoritative or removed.
- Reports, exports, jobs, and analytics cannot leak inactive source-module data.
- Trial, read-only, suspended, expired, dependency-missing, and unavailable states are typed and tested.
- Entitlement changes and hard denials create audit evidence.
- Module inventory is a release ratchet.
- At least one pilot module has passed hard enforcement with rollback before broad rollout.

## First 5 Implementation Prompts

### Prompt 1: Freeze module vocabulary and dependency semantics

Act as a principal system architect, SaaS packaging advisor, and release-governance lead. Inspect `services/modules/module-control-contracts.ts`, `services/modules/module-catalog.service.ts`, ADR 0004, ADR 0007, ADR 0011, and the current module audit. Produce and save a canonical module vocabulary and dependency matrix under `docs/modules/`. Classify each slug as sellable, bundle-only, platform domain, support domain, internal control module, or deprecated alias. Do not enable hard enforcement.

### Prompt 2: Design durable entitlement schema and migration plan

Act as a senior backend architect and data migration lead. Design additive Prisma models for commercial modules, package modules, tenant subscriptions, tenant module entitlements, entitlement events, and surface registry records. Produce a migration plan from `Organization.requestedModules` that preserves legacy tenant access in observe mode, captures unknown requested modules, and writes audit evidence. Save the report under `docs/modules/`. Do not delete `requestedModules`.

### Prompt 3: Build the surface registry ratchet

Act as an enterprise release-gate engineer. Extend the module surface inventory design to cover APIs, reports, exports, jobs, webhooks, proof surfaces, BI surfaces, and token-bound public flows. Propose or implement a registry-plus-scanner model that starts as report mode and then blocks only new unmapped or missing-permission surfaces. Save before/after inventory evidence. Do not enable module hard enforcement.

### Prompt 4: Centralize the module guard contract

Act as a cybersecurity architect and senior backend engineer. Design and implement a canonical `requireModuleAccess()` contract and wrappers for page, action, API, report, export, job, and webhook surfaces. Keep default behavior in observe mode. Verify that module decisions occur before data access and that wildcard RBAC cannot bypass module entitlement. Save focused verification evidence.

### Prompt 5: Design the Module Workbench and user states

Act as a senior frontend engineer, UI/UX specialist, product strategist, and security reviewer. Upgrade the current Module Control Center design into a Module Workbench specification covering active, trial, read-only, suspended, expired, unavailable, and dependency-missing states. Include owner/admin upgrade flows, normal-user safe unavailable states, and shell/sidebar behavior that never substitutes for server-side security. Save the UX specification and implementation plan under `docs/modules/`.

## Verification

Required post-save verification:

```powershell
npm run module:surface:inventory
```

Expected result: the command should pass and refresh `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json` while remaining in report mode.

## Final Direction

The module system should become an enterprise control plane, not a navigation convention. The platform already has the right ingredients: vocabulary, observe decisions, audit evidence, a control center, and surface inventory. The work now is to make those ingredients durable, package-aware, guarded, tested, and usable as a commercial SaaS operating model.

Do not enable hard enforcement until durable entitlements, a complete surface registry, centralized guards, professional UI states, billing boundaries, report/export/job protections, and rollback evidence are in place.

## Post-Save Verification

`npm run module:surface:inventory` passed on 2026-07-12 and wrote 306 records to `what-next/module-surface-inventory.json`.
