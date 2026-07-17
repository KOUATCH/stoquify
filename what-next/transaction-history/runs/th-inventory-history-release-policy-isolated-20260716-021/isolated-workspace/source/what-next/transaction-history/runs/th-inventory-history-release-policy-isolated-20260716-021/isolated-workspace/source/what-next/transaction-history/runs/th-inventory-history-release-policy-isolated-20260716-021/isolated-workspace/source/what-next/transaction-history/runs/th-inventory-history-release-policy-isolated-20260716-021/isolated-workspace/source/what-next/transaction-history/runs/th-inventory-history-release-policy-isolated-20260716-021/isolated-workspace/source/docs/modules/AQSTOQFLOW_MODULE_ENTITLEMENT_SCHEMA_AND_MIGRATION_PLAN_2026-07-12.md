# AqStoqFlow Module Entitlement Schema And Migration Plan

Date: 2026-07-12
Lane: Durable entitlement schema and `Organization.requestedModules` migration
Mode: observe/report only; no hard enforcement enabled
Skill: `aqstoqflow-module-entitlement-schema`

## Executive Verdict

The next durable step for the module control plane is an additive entitlement spine: package records, tenant subscription records, tenant module entitlement records, immutable entitlement events, and a dry-run migration from `Organization.requestedModules`.

The current implementation is intentionally safe but not commercially durable. `deriveLegacyEntitlements()` can accept explicit entitlements, but live access still falls back to `Organization.requestedModules` or legacy full-suite defaults. That is correct for observe mode, but it cannot support real SaaS packaging, paid trials, suspensions, downgrades, read-only retention, billing reconciliation, or enterprise audit.

This report is design-only. It does not change Prisma schema, run a migration, enable hard enforcement, or alter runtime access behavior.

## Source Evidence

- `services/modules/module-control-contracts.ts` defines 20 canonical slugs and `MODULE_CONTROL_MODE = "observe"`.
- `services/modules/module-control-contracts.ts` already has entitlement statuses: `active`, `trial`, `read_only`, `suspended`, `expired`, `unavailable`, `legacy_default`, `system_default`.
- `services/modules/module-control-contracts.ts` already has entitlement sources: `requested_modules`, `legacy_default`, `system_default`, `manual_override`, `plan`, `trial`.
- `services/modules/module-entitlement.service.ts` derives in-memory legacy entitlements from `requestedModules`, explicit entitlements, or legacy defaults.
- `observeModuleAccess()` currently loads `Organization.requestedModules`, evaluates in observe mode by default, and records would-block decisions to `AuditLog`.
- `getModuleControlCenterData()` reports requested modules, normalized requested modules, unknown requested modules, dependency gaps, trial/read-only/suspended counts, and would-block counts.
- `Organization.requestedModules String[] @default([])` remains in `prisma/schema.prisma`.
- `AuditLog` already supports organization-scoped audit records with JSON `changes`.
- `protect()` and `requireApiModuleAccess()` call `observeModuleAccess()` through existing guard seams, but mode arguments may say `"enforce"` while the global evaluator still allows in observe mode.
- `lib/security/auth-session.ts` still hard-codes `modulesEnabled`, so future session claims must derive from the entitlement read model or be removed until authoritative.
- The refreshed module surface inventory remains report-only with 20 catalog modules, 306 surfaces, 266 mapped records, 34 unmapped records, 16 missing-permission records, and 300 enforcement candidates.

## Current State

What works:

- Canonical module vocabulary exists.
- Observe-mode evaluation exists.
- Explicit in-memory entitlements are already accepted by the evaluator.
- Required dependency gaps can be detected.
- Would-block decisions can be audited.
- Module Control Center data already exposes the right diagnostic categories.

What is not durable yet:

- There are no package, subscription, tenant entitlement, entitlement event, migration run, or package dependency records.
- `requestedModules` is still live access input instead of migration evidence only.
- Billing/provider state has no safe internal boundary.
- Unknown requested modules are visible diagnostically but not stored as durable migration issues.
- Module entitlement lifecycle events are not first-class records.
- Session module claims are not authoritative.

## Design Principles

1. Add tables before changing behavior.
2. Keep `requestedModules` as onboarding and migration evidence; do not delete it in this lane.
3. Keep hard enforcement off until explicit bounded pilot approval.
4. Store internal subscription and entitlement truth separately from billing-provider payloads.
5. Make every entitlement state change auditable and idempotent.
6. Preserve legacy tenant access in observe mode.
7. Keep RBAC separate: module entitlement says what the tenant has; RBAC says what this user may do.
8. Design for read-only retention, suspension, expiry, trial, manual override, and package-derived grants from the start.

## Proposed Additive Prisma Shape

The exact names can be adjusted to match migration naming conventions, but the boundary should remain intact.

```prisma
enum ModuleRecordStatus {
  AVAILABLE
  BETA
  INTERNAL
  DEPRECATED
}

enum ModuleRiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ModuleDependencyType {
  REQUIRED_RUNTIME
  REQUIRED_COMMERCIAL
  RECOMMENDED_BUNDLE
  SOURCE_EVIDENCE
  REPORTING_SOURCE
  WRITE_POSTING
  READ_ONLY_RETENTION
  PLATFORM_SUPPORT
}

enum ModulePackageStatus {
  DRAFT
  ACTIVE
  RETIRED
}

enum TenantSubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  SUSPENDED
  CANCELED
  EXPIRED
}

enum TenantModuleEntitlementStatus {
  ACTIVE
  TRIAL
  READ_ONLY
  SUSPENDED
  EXPIRED
  UNAVAILABLE
  LEGACY_DEFAULT
  SYSTEM_DEFAULT
}

enum TenantModuleEntitlementSource {
  SYSTEM_DEFAULT
  LEGACY_FULL_SUITE_MIGRATION
  REQUESTED_MODULES_MIGRATION
  PACKAGE
  TRIAL
  MANUAL_OVERRIDE
  BILLING_PROVISIONING
  RETENTION
  IMPORT
}

enum ModuleEntitlementEventType {
  GRANTED
  CHANGED
  SUSPENDED
  RESUMED
  EXPIRED
  REVOKED
  READ_ONLY_GRANTED
  DEPENDENCY_BLOCKED
  MIGRATION_DRY_RUN
  MIGRATION_APPLIED
  UNKNOWN_REQUESTED_MODULE
  BILLING_RECONCILED
  MANUAL_OVERRIDE_APPLIED
}

enum ModuleMigrationRunMode {
  DRY_RUN
  APPLY
}

enum ModuleMigrationRunStatus {
  STARTED
  COMPLETED
  FAILED
}

model CommercialModule {
  id          String             @id @default(cuid())
  slug        String             @unique
  name        String
  owner       String
  status      ModuleRecordStatus
  riskLevel   ModuleRiskLevel
  core        Boolean            @default(false)
  sellable    Boolean            @default(false)
  description String
  metadata    Json?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([status])
  @@index([owner])
  @@map("commercial_modules")
}

model CommercialModuleDependency {
  id             String               @id @default(cuid())
  moduleSlug     String
  dependsOnSlug  String
  dependencyType ModuleDependencyType
  requiredFor    String?
  reason         String
  metadata       Json?
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@unique([moduleSlug, dependsOnSlug, dependencyType, requiredFor])
  @@index([moduleSlug])
  @@index([dependsOnSlug])
  @@map("commercial_module_dependencies")
}

model ModulePackage {
  id          String              @id @default(cuid())
  code        String              @unique
  name        String
  status      ModulePackageStatus @default(DRAFT)
  description String?
  currency    String?
  priceCents  Int?
  metadata    Json?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  modules       ModulePackageModule[]
  subscriptions TenantSubscription[]

  @@index([status])
  @@map("module_packages")
}

model ModulePackageModule {
  id                String                        @id @default(cuid())
  packageId         String
  package           ModulePackage                 @relation(fields: [packageId], references: [id], onDelete: Cascade)
  moduleSlug        String
  entitlementStatus TenantModuleEntitlementStatus @default(ACTIVE)
  dependencyPolicy  Json?
  limits            Json?
  metadata          Json?
  createdAt         DateTime                      @default(now())
  updatedAt         DateTime                      @updatedAt

  @@unique([packageId, moduleSlug])
  @@index([moduleSlug])
  @@map("module_package_modules")
}

model TenantSubscription {
  id                     String                   @id @default(cuid())
  organizationId         String
  organization           Organization             @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  packageId              String?
  package                ModulePackage?           @relation(fields: [packageId], references: [id], onDelete: SetNull)
  status                 TenantSubscriptionStatus
  source                 String
  provider               String?
  providerCustomerId     String?
  providerSubscriptionId String?
  startsAt               DateTime?
  currentPeriodStartsAt  DateTime?
  currentPeriodEndsAt    DateTime?
  endsAt                 DateTime?
  metadata               Json?
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt

  entitlements TenantModuleEntitlement[]

  @@index([organizationId, status])
  @@index([packageId])
  @@unique([provider, providerSubscriptionId])
  @@map("tenant_subscriptions")
}

model TenantModuleEntitlement {
  id             String                         @id @default(cuid())
  organizationId String
  organization   Organization                   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  moduleSlug     String
  status         TenantModuleEntitlementStatus
  source         TenantModuleEntitlementSource
  sourceRef      String?
  subscriptionId String?
  subscription   TenantSubscription?            @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  startsAt       DateTime?
  endsAt         DateTime?
  readOnly       Boolean                        @default(false)
  trial          Boolean                        @default(false)
  priority       Int                            @default(0)
  metadata       Json?
  createdAt      DateTime                       @default(now())
  updatedAt      DateTime                       @updatedAt

  events ModuleEntitlementEvent[]

  @@index([organizationId, moduleSlug, status])
  @@index([organizationId, source])
  @@index([subscriptionId])
  @@unique([organizationId, moduleSlug, source, sourceRef])
  @@map("tenant_module_entitlements")
}

model ModuleEntitlementEvent {
  id             String                     @id @default(cuid())
  organizationId String
  organization   Organization               @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  entitlementId  String?
  entitlement    TenantModuleEntitlement?   @relation(fields: [entitlementId], references: [id], onDelete: SetNull)
  subscriptionId String?
  moduleSlug     String?
  eventType      ModuleEntitlementEventType
  source         String
  actorUserId    String?
  actorUser      User?                      @relation(fields: [actorUserId], references: [id], onDelete: SetNull)
  idempotencyKey String?
  reasonCode     String?
  before         Json?
  after          Json?
  metadata       Json?
  createdAt      DateTime                   @default(now())

  @@index([organizationId, createdAt])
  @@index([moduleSlug, createdAt])
  @@index([eventType, createdAt])
  @@unique([organizationId, idempotencyKey])
  @@map("module_entitlement_events")
}

model ModuleEntitlementMigrationRun {
  id              String                   @id @default(cuid())
  mode            ModuleMigrationRunMode
  status          ModuleMigrationRunStatus
  source          String
  startedAt       DateTime                 @default(now())
  completedAt     DateTime?
  requestedCounts Json?
  resultSummary   Json?
  warnings        Json?
  error           String?

  @@index([mode, status, startedAt])
  @@map("module_entitlement_migration_runs")
}
```

## Organization Relations To Add Later

When implementation starts, `Organization` should receive additive relations only:

```prisma
tenantSubscriptions       TenantSubscription[]
tenantModuleEntitlements  TenantModuleEntitlement[]
moduleEntitlementEvents   ModuleEntitlementEvent[]
```

Do not remove `requestedModules` during this migration. It remains source evidence until the backfill is verified and downstream runtime no longer depends on it.

## Effective Entitlement Read Model

Create `services/modules/tenant-entitlement.service.ts` with a single reader:

```ts
getEffectiveTenantModuleEntitlements({
  organizationId,
  now,
  includeInactive = false,
}): Promise<TenantModuleEntitlement[]>
```

Read-model rules:

1. Always include active `system_default` entitlements for core platform modules.
2. Load package-derived, trial, manual override, retention, legacy migration, and requested-module migration rows.
3. Apply status precedence: `suspended` and `expired` override active package grants unless a higher-priority manual override says otherwise.
4. Apply source precedence: `system_default` > `manual_override` > `billing_provisioning`/`package` > `trial` > `retention` > `requested_modules_migration` > `legacy_full_suite_migration`.
5. Apply `startsAt` and `endsAt` windows.
6. Collapse to one effective entitlement per module for the evaluator.
7. Return unknown/missing/dependency issues separately; do not silently grant unknown modules.
8. Continue to support observe mode while the evaluator is switched from legacy derivation to explicit read-model input.

The existing `evaluateModuleEntitlement()` can remain pure. The future service change should feed it `explicitEntitlements` from this read model and stop using `requestedModules` as the normal runtime source.

## Migration From requestedModules

Migration must be idempotent and run in dry-run mode first.

Dry-run algorithm:

1. Load canonical modules and aliases from the catalog.
2. For each non-deleted organization, read `requestedModules`.
3. Normalize requested values using current alias rules.
4. Record unknown requested values as migration warnings.
5. If the organization has requested modules:
   - create planned `SYSTEM_DEFAULT` entitlements for core modules;
   - create planned `REQUESTED_MODULES_MIGRATION` entitlements for normalized requested modules;
   - do not grant unknown modules.
6. If the organization has no requested modules:
   - create planned `SYSTEM_DEFAULT` entitlements for core modules;
   - create planned `LEGACY_FULL_SUITE_MIGRATION` entitlements for every non-core catalog module to preserve current observe-mode full-suite behavior.
7. Calculate dependency gaps but do not block migration in dry-run mode.
8. Produce counts by organization, module, source, status, unknown value, and dependency gap.
9. Write a `ModuleEntitlementMigrationRun` record only after the schema exists; until then, save JSON/Markdown evidence under `what-next/`.

Apply-mode algorithm:

1. Require a clean dry-run snapshot.
2. Use idempotency keys: `module-entitlement-migration:{organizationId}:{moduleSlug}:{source}:{sourceRef}`.
3. Upsert entitlement rows with deterministic `sourceRef`.
4. Write a `ModuleEntitlementEvent` for every grant/change.
5. Store unknown requested modules as event records or migration warnings, not grants.
6. Preserve `Organization.requestedModules` unchanged.
7. Keep `MODULE_CONTROL_MODE = "observe"`.
8. Compare before/after effective entitlements to prove no existing tenant loses access in observe mode.

## Unknown Requested Module Reporting

Unknown values should be treated as data-quality issues and migration evidence:

- organization id and slug;
- raw requested value;
- normalized attempt;
- nearest alias if available;
- recommended remediation;
- whether access was granted, which should be false unless explicitly reviewed;
- migration run id;
- created timestamp.

This can start as JSON report output and later become `ModuleEntitlementEvent` rows with `eventType = UNKNOWN_REQUESTED_MODULE`.

## Entitlement Event Evidence

Use `ModuleEntitlementEvent` as the durable lifecycle trail and `AuditLog` for compatibility with current audit views.

Required event evidence:

- package assignment and removal;
- subscription status changes;
- entitlement grant, update, suspension, expiry, revoke, and read-only retention;
- migration dry-run and apply;
- unknown requested-module warning;
- manual override with actor and reason;
- dependency block or dependency-gap detection;
- billing reconciliation result;
- rollback or observe-mode reversion.

Event records must avoid secrets and sensitive payment payloads. Store provider ids and normalized statuses, not raw webhook bodies.

## Billing Boundary

Billing providers must be inputs, not authority:

1. Provider webhook received.
2. Provider event stored idempotently.
3. Internal subscription reconciliation validates provider state.
4. Internal `TenantSubscription` changes.
5. Internal entitlement provisioning derives module rows.
6. Entitlement events and audit records are written.
7. Runtime access reads only internal entitlement state.

This prevents provider drift, retries, webhook spoofing, or partial billing outages from directly corrupting module access.

## Security And RBAC Controls

- Module entitlement is tenant-level; RBAC is user-level.
- Wildcard/admin RBAC must not bypass module entitlement.
- Owner/admin upgrade flows are UI behavior, not authorization.
- Read-only status must permit only safe read surfaces: navigation, page, report, and explicitly approved proof views.
- Exports, jobs, APIs, webhooks, and write actions require explicit access intent and cannot inherit read-only access by accident.
- Fresh auth should be required for manual entitlement overrides, billing reconciliation, and suspension/resumption actions.
- Audit logs and entitlement events must be tenant-scoped and redacted.

## Release Gates And Tests For Implementation

When this lane moves from plan to code, add focused tests before any enforcement pilot:

- explicit entitlements override `requestedModules`;
- no requested modules migrate to legacy full-suite entitlements without access loss;
- requested modules migrate only normalized canonical slugs;
- unknown requested modules produce warnings and no grants;
- core modules become `SYSTEM_DEFAULT`;
- suspended and expired statuses would block in enforce mode;
- read-only allows reads but blocks write/export/job;
- wildcard RBAC is recorded but does not bypass entitlement;
- package removal creates read-only retention where policy requires it;
- dry-run and apply produce identical effective entitlement counts before apply is allowed;
- migration is idempotent.

Release-gate candidates:

```powershell
npm run module:surface:inventory
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

Run typecheck and policy gates only when implementation changes application code or release-governance code.

## Implementation Sequence

1. Add Prisma enums and additive tables.
2. Add seed/sync command for `CommercialModule` and `CommercialModuleDependency` from the frozen catalog.
3. Add `tenant-entitlement.service.ts` read model.
4. Add dry-run migration report from `Organization.requestedModules`.
5. Add apply mode only after dry-run evidence is reviewed.
6. Switch `getModuleControlCenterData()` to show explicit entitlements first and legacy fallback second.
7. Feed `evaluateModuleEntitlement()` explicit entitlements from the read model.
8. Keep observe mode and compare would-block deltas.
9. Remove or derive hard-coded `modulesEnabled` session claims.
10. Hand off to package strategy and surface registry ratchet before guard hardening.

## Rollback Strategy

Rollback must not require schema rollback:

- keep `MODULE_CONTROL_MODE = "observe"`;
- leave `requestedModules` intact;
- let evaluator fall back to legacy derivation if the read model is disabled;
- mark bad entitlement rows as superseded/suspended instead of deleting evidence;
- record rollback events;
- rerun inventory and entitlement dry-run snapshots after rollback.

## Blockers Before Hard Enforcement

1. Durable schema is not implemented yet.
2. Migration dry-run evidence does not exist yet.
3. Surface inventory still has unmapped and missing-permission records.
4. Guard contract is not centralized across pages, actions, APIs, reports, exports, jobs, and webhooks.
5. Session module claims are not authoritative.
6. Package strategy and dependency policy are not finalized.

## Verification Result

Baseline verification after saving this report passed:

```powershell
npm run module:surface:inventory
```

The command refreshed `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json` at `2026-07-12T05:26:43.865Z` with 20 catalog modules, 306 inventoried surfaces, 266 mapped records, 34 unmapped records, 16 missing-permission records, and 300 enforcement candidates.

Focused Jest and broader gates are not required for this planning artifact because no application code, schema file, module service, guard, inventory logic, or release-gate code changed.

## Next Handoff

Run `aqstoqflow-module-package-strategy` next. It should convert the frozen vocabulary and entitlement schema plan into package tiers, add-ons, dependency policy, read-only retention policy, trial/suspension states, and owner/admin upgrade semantics before implementation changes begin.

