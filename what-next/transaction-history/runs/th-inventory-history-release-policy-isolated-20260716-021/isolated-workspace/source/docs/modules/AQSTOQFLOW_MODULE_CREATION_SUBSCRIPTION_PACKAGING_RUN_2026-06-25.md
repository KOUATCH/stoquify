# AqStoqFlow Module Creation and Subscription Packaging Run

Date: 2026-06-25
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: report-mode architecture and readiness run

## Executive Verdict

AqStoqFlow already has a credible module-control foundation: canonical commercial module slugs, a module catalog, dependency rules, observe-mode entitlement decisions, audit logging for would-block decisions, a Module Control Center page, module-aware redaction/moat guards, and release-gate coverage for module entitlement basics.

The platform is not yet subscription-package ready. The current persistent source of tenant module intent is `Organization.requestedModules`, not a durable package/subscription/entitlement lifecycle. There are no Prisma subscription/package/tenant-module models found in the inspected schema, and module enforcement remains deliberately observe-mode. That is the correct safety posture until route/action/API/report/export/job coverage and package semantics are explicit.

The smallest safe implementation slice is not a schema migration today. It is a report-mode module package readiness plan and gate proposal, backed by current verification. Schema work should come next after the team agrees on package states, entitlement precedence, and billing-provider boundaries.

## Evidence Inspected

### Current Module Control

- `services/modules/module-control-contracts.ts:1` keeps module control in observe mode.
- `services/modules/module-control-contracts.ts:3` defines `COMMERCIAL_MODULE_SLUGS`.
- `services/modules/module-control-contracts.ts:40` defines entitlement sources including `plan` and `trial`.
- `services/modules/module-control-contracts.ts:48` defines surface types: navigation, page, action, api, report, export, job.
- `services/modules/module-control-contracts.ts:59` defines module catalog entries.
- `services/modules/module-control-contracts.ts:72` defines tenant module entitlement shape.
- `services/modules/module-control-contracts.ts:109` defines Module Control Center data.

### Catalog and Dependencies

- `services/modules/module-catalog.service.ts:10` defines module dependencies.
- `services/modules/module-catalog.service.ts:61` defines the catalog.
- `services/modules/module-catalog.service.ts:63` to `services/modules/module-catalog.service.ts:291` define current modules.
- `services/modules/module-catalog.service.ts:304` defines aliases for vocabulary normalization.
- `services/modules/module-catalog.service.ts:362` normalizes requested module labels.
- `services/modules/module-catalog.service.ts:381` maps route paths to module catalog entries.

### Entitlement Evaluation

- `services/modules/module-entitlement.service.ts:25` derives legacy/requested entitlements.
- `services/modules/module-entitlement.service.ts:66` evaluates module entitlement.
- `services/modules/module-entitlement.service.ts:86` allows observe-mode access while marking would-block decisions.
- `services/modules/module-entitlement.service.ts:116` observes module access from organization requested modules.
- `services/modules/module-entitlement.service.ts:134` builds Module Control Center data.
- `services/modules/module-entitlement.service.ts:193` records module entitlement decisions.
- `services/modules/module-entitlement.service.ts:199` writes `MODULE_ENTITLEMENT_OBSERVED` audit events.

### Persistence and Audit

- `prisma/schema.prisma:229` defines `Organization`.
- `prisma/schema.prisma:248` stores `requestedModules String[]`.
- `prisma/schema.prisma:5877` defines `AuditLog`.
- `prisma/schema.prisma:5880` to `prisma/schema.prisma:5893` store entity type, action, changes, user, and organization evidence.
- No durable `Subscription`, `Package`, `Plan`, `ModulePackage`, `TenantModule`, or `TenantSubscription` Prisma model was found by targeted schema search.

### UI and Navigation

- `config/sidebar.ts:24`, `config/sidebar.ts:35`, and `config/sidebar.ts:57` carry optional `moduleSlug` metadata.
- `config/sidebar.ts:79` begins module-tagged navigation with the dashboard module.
- `config/sidebar.ts:89`, `config/sidebar.ts:109`, `config/sidebar.ts:123`, `config/sidebar.ts:149`, `config/sidebar.ts:158`, `config/sidebar.ts:186`, `config/sidebar.ts:196`, `config/sidebar.ts:216`, `config/sidebar.ts:233`, and `config/sidebar.ts:248` show broad sidebar module mapping.
- `config/sidebar.ts:269` filters navigation by permission, not yet by hard module entitlement.
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:9` defines the Module Control Center page.
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:21` explicitly states observe mode and no hard blocking.
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:90` protects the page with `MANAGE_SYSTEM_SETTINGS`.
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:94` loads service-owned Module Control Center data.
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:140`, `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:160`, and `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:186` surface would-block and unknown-module evidence.

### Security and Moat Controls

- `services/security/moat-guard.service.ts:105` evaluates moat guard decisions.
- `services/security/moat-guard.service.ts:114` evaluates module entitlement when `moduleSlug` is present.
- `services/security/moat-guard.service.ts:129` to `services/security/moat-guard.service.ts:131` adds `require_entitlement` and blocks only when enforcement denies.
- `services/security/moat-guard.service.ts:167` handles export safety.
- `services/security/moat-guard.service.ts:186` evaluates redaction requests.
- `services/security/moat-guard.service.ts:223` audits moat decisions.
- `services/security/redaction-policy.service.ts:207` redacts when a module decision would block access.

### Tests and Gates

- `services/modules/__tests__/module-entitlement.service.test.ts:35` tests label normalization.
- `services/modules/__tests__/module-entitlement.service.test.ts:42` tests legacy full-suite observe entitlements.
- `services/modules/__tests__/module-entitlement.service.test.ts:54` tests wildcard RBAC does not bypass entitlement would-block.
- `services/modules/__tests__/module-entitlement.service.test.ts:72` tests dependency gaps.
- `services/modules/__tests__/module-entitlement.service.test.ts:88` tests read-only enforcement behavior.
- `services/modules/__tests__/module-entitlement.service.test.ts:123` tests observe-mode audit logging.
- `scripts/kontava-moat-release-gate.js:162` includes a module entitlement gate.
- `package.json:28` runs existing policy gates.

## What Is Working

1. Canonical module vocabulary exists.
   - There are 20 commercial module slugs covering dashboard, inventory, production, sales, POS, cash drawer, accounting, close assurance, compliance, purchasing, presence, payroll, finance, payment reconciliation, analytics, reports, commercial agents, content, settings, and administration.

2. Module catalog entries are service-owned.
   - Modules have names, owners, statuses, risk levels, routes, permissions, and dependencies.

3. Dependency logic exists.
   - POS requires sales; payment reconciliation requires finance and accounting; close assurance requires accounting and recommends payment reconciliation; other recommended dependencies exist.

4. Observe-mode entitlement is intentional.
   - Non-entitled modules can produce would-block evidence without breaking current tenants.

5. RBAC wildcard does not bypass module entitlement logic.
   - Tests explicitly prove wildcard RBAC still records would-block decisions.

6. Module Control Center exists.
   - There is already an admin-facing view showing catalog, entitlement status, dependency gaps, unknown requested modules, and would-block count.

7. Module decisions can feed security, export, and redaction controls.
   - Moat guard and redaction policy already integrate module decisions.

8. Release evidence is healthy for the current foundation.
   - Prisma validation, TypeScript, focused entitlement tests, policy gates, and moat release gate all passed during this run.

## What Is Missing

1. Durable package/subscription model.
   - Current tenant module intent is stored as `Organization.requestedModules String[]`.
   - There is no durable package, subscription, plan, tenant entitlement, billing state, or entitlement history model.

2. Package-to-module bundle mapping.
   - No inspected service defines packages such as Starter, Growth, Finance, Compliance, or Enterprise and maps them to modules.

3. Tenant subscription lifecycle.
   - Trial, active, suspended, cancelled, expired, grace-period, billing-past-due, and manual override states are not persisted as first-class entities.

4. Entitlement precedence rules.
   - The types mention sources such as `plan`, `trial`, and `manual_override`, but there is no persisted precedence model for combining system defaults, package entitlements, trials, overrides, and suspensions.

5. Surface inventory gate.
   - Navigation has module metadata, and catalog route prefixes exist, but there is not yet a complete gate that maps every page, action, API route, report, export, and job to a canonical module slug.

6. Hard enforcement path.
   - The evaluator supports enforce mode, but platform-level callers remain observe-oriented. This is good until coverage is clean.

7. Billing-provider boundary.
   - No provider-independent billing boundary was found. The user dropdown mentions billing/plans copy, but that is not a service-owned subscription system.

8. Deactivation behavior.
   - There is no durable rule for what happens when a tenant loses a module: navigation hiding, read-only historical access, export redaction, job suspension, API denial, and close/reconciliation impact.

## Canonical Module Creation Process

Every new module should move through this lifecycle.

### 1. Module Definition

Create a catalog entry with:

- canonical slug,
- display name,
- description,
- owning domain team,
- status: internal, beta, available, deprecated,
- risk level,
- core/non-core flag,
- route prefixes,
- permissions,
- required/recommended dependencies,
- package eligibility,
- default availability policy,
- enforcement readiness state.

### 2. Service Ownership

Before UI:

- create or identify the service-owned read model,
- define DTO/state contracts,
- define permission requirements,
- define module slug ownership,
- define evidence/redaction requirements,
- define audit events.

### 3. Surface Registration

Register all surfaces:

- navigation entries,
- App Router pages,
- server actions,
- API routes,
- reports,
- exports,
- background jobs,
- proof/evidence drawers,
- scheduled checks.

Each surface should declare:

- module slug,
- surface type,
- route/action/key,
- permission,
- access intent: read, write, export, job,
- required dependencies,
- enforcement mode.

### 4. Package Eligibility

Decide whether the module can be sold as:

- core platform module,
- standalone add-on,
- package-only module,
- enterprise-only module,
- internal/admin-only module,
- beta/trial module.

### 5. Entitlement Policy

Define entitlement behavior:

- active,
- trial,
- read-only,
- suspended,
- expired,
- unavailable,
- system default,
- legacy default.

Also define whether historical data remains read-only after subscription loss.

### 6. Subscription Mapping

Map packages/plans to modules:

- package includes module,
- package requires module dependency,
- package recommends module dependency,
- package allows trial,
- package allows read-only fallback,
- package supports add-ons.

### 7. Tenant Provisioning

Provision tenant module entitlements from:

- active subscription package,
- trial,
- manual override,
- system default,
- legacy migration,
- partner/admin grant.

### 8. Enforcement Ladder

Use this progression:

1. report mode: inventory unmapped surfaces and slug drift,
2. observe mode: record would-block decisions,
3. warn mode: surface blockers without denying,
4. pilot enforce mode: one low-risk module, one tenant set,
5. fail mode: release gate blocks new unmapped surfaces,
6. hard enforce: route/action/API/export/job denial for clean modules.

### 9. Deactivation Rules

When a module becomes unavailable:

- hide navigation but do not rely on hiding for security,
- deny write actions,
- allow or deny read based on historical-read policy,
- redact sensitive exports,
- suspend scheduled jobs,
- keep audit/proof data available to authorized admins,
- record entitlement decision evidence.

### 10. Release Gate

No module is release-ready until:

- catalog entry exists,
- package eligibility is explicit,
- permissions are mapped,
- all surfaces are mapped,
- tests cover entitlement behavior,
- module unavailable state exists in UI,
- policy gates pass,
- no unmapped critical route/action/API/export/job remains.

## Proposed Subscription Packaging Model

Do not apply this schema until reviewed, but use it as the target model.

### CommercialPackage

Represents a sellable package.

Fields:

- id,
- code,
- name,
- description,
- status,
- marketSegment,
- billingIntervalOptions,
- currencyPolicy,
- createdAt,
- updatedAt.

### CommercialPackageModule

Maps package to module.

Fields:

- packageId,
- moduleSlug,
- inclusionType: included, optional_addon, trial_only, internal,
- accessLevel: full, read_only, report_only,
- dependencyPolicy,
- startsWithTrial,
- trialDays,
- metadata.

### TenantSubscription

Represents a tenant's commercial subscription.

Fields:

- organizationId,
- packageId,
- status: trial, active, grace_period, past_due, suspended, cancelled, expired,
- startsAt,
- renewsAt,
- endsAt,
- billingProvider,
- billingCustomerRef,
- billingSubscriptionRef,
- cancellationReason,
- metadata.

### TenantModuleEntitlementRecord

Durable entitlement derived from subscription, trial, manual override, or system default.

Fields:

- organizationId,
- moduleSlug,
- status,
- source,
- sourceId,
- startsAt,
- endsAt,
- readOnly,
- trial,
- grantedById,
- revokedById,
- reason,
- metadata.

### ModuleEntitlementDecisionLog

Optional specialized log if `AuditLog` becomes too generic.

Fields:

- organizationId,
- userId,
- moduleSlug,
- surfaceType,
- surface,
- accessIntent,
- mode,
- result,
- allowed,
- wouldBlock,
- reason,
- missingDependencies,
- entitlementSnapshot,
- evaluatedAt.

## Recommended Packages

Use package names only as product examples; final pricing can come later.

### Starter Operations

For small tenants starting with day-to-day stock and sales control.

Modules:

- dashboard,
- settings,
- administration,
- inventory,
- sales,
- pos.

### Finance Control

For tenants that need cash, finance, and accounting truth.

Modules:

- Starter Operations modules,
- finance,
- accounting,
- reports,
- cash_drawer.

### Reconciliation and Close

For tenants that need trusted payment and close evidence.

Modules:

- Finance Control modules,
- payment_reconciliation,
- close_assurance,
- analytics.

### Compliance and Payroll

For regulated tenants.

Modules:

- Finance Control modules,
- compliance,
- payroll,
- presence.

### Enterprise Assurance

For larger or multi-branch tenants.

Modules:

- all available modules,
- workflow assurance surfaces,
- export controls,
- advanced evidence/proof features,
- module enforcement pilots.

## Module Control Center Roadmap

The existing Module Control Center should evolve in this order:

1. Current observe mode view.
2. Package membership view.
3. Tenant subscription status.
4. Entitlement source breakdown.
5. Surface coverage inventory.
6. Would-block decision history.
7. Dependency warnings and recommended upsells.
8. Enforcement readiness score.
9. Safe pilot-enforcement toggle per tenant/module.
10. Audit export for entitlement history.

Do not add a hard enforcement toggle before the surface inventory gate is clean.

## Risk Controls

1. Tenant isolation.
   - All package and entitlement reads must be organization-scoped.

2. RBAC layering.
   - Module entitlement must complement RBAC, not replace it.

3. Navigation security.
   - Hiding links is usability, not authorization. Actions and APIs must enforce.

4. Package dependency safety.
   - A package cannot include a module while excluding required dependencies.

5. Historical data access.
   - Subscription loss should not destroy historical data. Use read-only/redacted access where required.

6. Billing provider isolation.
   - Billing-provider events should enter through an adapter boundary and never directly mutate module access without service validation.

7. Auditability.
   - Grants, revocations, trials, suspensions, overrides, package changes, and enforcement decisions must be auditable.

8. Redaction.
   - Disabled modules must not leak data through exports, reports, proof drawers, snapshots, or API DTOs.

9. Migration safety.
   - Do not migrate from `requestedModules` to durable entitlements without a backfill plan and rollback.

10. Release gates.
   - Keep existing boundary gates green and add module-surface gates in report mode first.

## Smallest Safe Next Implementation

Implement this next, not schema persistence:

1. Create a report-mode module surface inventory script.
2. Read canonical slugs from `services/modules/module-control-contracts.ts`.
3. Read catalog route prefixes from `services/modules/module-catalog.service.ts`.
4. Scan:
   - `config/sidebar.ts`,
   - `app/`,
   - `actions/`,
   - `app/api/`,
   - report/export services,
   - job scripts.
5. Classify surfaces:
   - mapped,
   - inferred,
   - unmapped,
   - unknown slug,
   - dependency gap,
   - missing permission,
   - dashboard-only risk.
6. Write JSON and markdown evidence under `what-next/`.
7. Keep exit code zero until active critical unmapped surfaces reach zero.
8. Only then introduce durable package/subscription schema.

## Verification Results

| Command | Result |
| --- | --- |
| `npm run prisma:validate` | Passed. Prisma schema is valid. |
| `npm run typecheck` | Passed. TypeScript completed without output errors. |
| `npx jest services/modules/__tests__/module-entitlement.service.test.ts --runInBand` | Passed. 1 suite, 6 tests. |
| `node scripts/kontava-moat-release-gate.js --mode report --json-out what-next\AQSTOQFLOW_MODULE_PACKAGE_READINESS_MOAT_GATE_2026-06-25.json` | Passed. Release status ready; blockers 0. |
| `npm run policy:gates` | Passed. Inventory, service boundary, workflow assurance runtime, hard-delete, demo trust, and raw-error gates passed. |

Generated evidence:

- `what-next/AQSTOQFLOW_MODULE_PACKAGE_READINESS_MOAT_GATE_2026-06-25.json`

## Decisions Made

1. No schema migration was implemented in this run.
   - Reason: package/subscription persistence requires explicit lifecycle and precedence design before database changes.

2. No hard enforcement was enabled.
   - Reason: current system is intentionally observe-mode, and coverage gates are not yet complete.

3. The recommended next slice is a report-mode module surface inventory.
   - Reason: it de-risks package enforcement, reveals unmapped surfaces, and creates the evidence needed for durable entitlements.

4. `Organization.requestedModules` should be treated as registration intent or legacy bootstrap, not the final commercial entitlement source.

## Next Implementation Prompts

### Prompt 1 - Module Surface Inventory Gate

In `E:\ohada saas\newStockFlow\aqstoqflow`, implement a report-mode module surface inventory gate. Scan sidebar navigation, App Router pages, server actions, API routes, reports, exports, and job scripts. Map each surface to canonical commercial module slugs, permissions, and access intent. Detect unmapped surfaces, unknown slugs, dependency gaps, missing permissions, and dashboard-only module risks. Keep exit code zero, save JSON and markdown reports under `what-next/`, run focused verification, and do not touch unrelated lint warnings.

### Prompt 2 - Subscription Package Schema Design

In `E:\ohada saas\newStockFlow\aqstoqflow`, design the durable package/subscription/tenant entitlement Prisma model without applying destructive migrations. Base the design on the existing module catalog, entitlement source types, audit log, and requestedModules legacy bootstrap. Define package, package-module mapping, tenant subscription, tenant entitlement records, entitlement decision history, billing-provider adapter boundary, migration/backfill plan, and rollback strategy. Save the design report under `what-next/`.

### Prompt 3 - Module Package Read Model

In `E:\ohada saas\newStockFlow\aqstoqflow`, build a service-owned module package readiness read model that combines the module catalog, package definitions, tenant requested modules, entitlement decisions, dependency gaps, and would-block summaries. Keep it report/observe-mode only, add focused tests, and do not add UI until the read model is stable.

### Prompt 4 - Module Control Center Package View

In `E:\ohada saas\newStockFlow\aqstoqflow`, extend the Module Control Center to show package membership, tenant subscription state, entitlement source, dependency warnings, surface coverage status, and enforcement readiness. Use the service-owned read model, preserve RBAC and tenant isolation, and keep hard enforcement disabled.

### Prompt 5 - Enforcement Pilot Plan

In `E:\ohada saas\newStockFlow\aqstoqflow`, create a narrow module enforcement pilot plan for one low-risk module. Use historical would-block evidence, route/action/API coverage, dependency checks, rollback controls, and release-gate criteria. Do not enable enforcement until the pilot plan proves zero false positives.

## Success Criteria Status

- Clear repeatable module creation process: complete in this report.
- Canonical identity/owner/permission/dependency/enforcement behavior: partially implemented in catalog and described as process.
- Subscription packages map to modules: designed, not implemented.
- Tenant entitlements derived, audited, eventually enforced: partially implemented through requestedModules and observe-mode audit; durable lifecycle missing.
- Unmapped surfaces detectable: not yet implemented; next recommended slice.
- Navigation/UI respect module entitlement and RBAC: partial; RBAC filtering exists and Module Control Center observes entitlement, but navigation is not hard-entitlement filtered.
- Verification commands run and summarized: complete.
- Follow-up report saved under `what-next/`: complete.

