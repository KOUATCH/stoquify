# AqStoqFlow Enterprise Modular Platform Architecture Blueprint

Date: 2026-06-27
Status: Design approved for validation, not implemented
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Executive Decision

AqStoqFlow should become a unified modular OHADA SMB operating platform, not a set of disconnected mini-apps. The winning architecture is a platform control plane that owns module catalog, sellable packages, tenant subscriptions, durable tenant entitlements, provider-neutral billing adapters, downgrade policy, audit evidence, and release gates.

The implementation spine is:

1. Keep the current unified tenant, RBAC, audit, ledger, close, payroll, compliance, and service-boundary model.
2. Add durable package/subscription/entitlement records beside the current observe-mode module services.
3. Migrate `Organization.requestedModules` into onboarding intent and durable entitlements, then deprecate it as an access input.
4. Enforce module availability first through central server-side guards, in observe mode, then in controlled rings.
5. Preserve read-only historical access for payroll, accounting, compliance, close, reconciliation, inventory, and POS from day one after downgrade.
6. Keep billing provider-neutral. Internal entitlement state is authoritative; Stripe, Paystack, Flutterwave, mobile-money, bank transfer, and manual invoice flows are adapters and mirrors.

## Current-State Confirmation

Files inspected:

- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `what-next/AQSTOQFLOW_MODULE_SUBSCRIPTION_SKILL_CREATION_PROMPTS_2026-06-25.md`
- `docs/product/proposals/moat/AQSTOQFLOW_MODULE_ORIENTED_SAAS_EXECUTION_PLAN_2026-06-18.md`
- `docs/product/proposals/moat/AQSTOQFLOW_MODULE_ORIENTED_SAAS_ANALYTICAL_REPORT_2026-06-18.md`
- `graphify-out/GRAPH_REPORT.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `actions/modules/module-control.actions.ts`
- `actions/modules/__tests__/module-control.actions.test.ts`
- `config/sidebar.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `services/_shared/protect.ts`
- `services/security/moat-guard.service.ts`
- `scripts/kontava-moat-release-gate.js`
- `scripts/ui-route-smoke-gate.js`
- `playwright.config.ts`
- `package.json`
- `prisma/schema.prisma`

Confirmed facts:

- ADR 0004 establishes canonical module language and makes entitlement tenant-level, not RBAC.
- ADR 0007 requires observe mode before hard enforcement and forbids wildcard RBAC from bypassing entitlement.
- ADR 0011 maps routes, services, actions, reports, exports, scripts, seed files, and Prisma anchors to module ownership, but is intentionally non-enforcing.
- `services/modules/module-control-contracts.ts` already defines commercial module slugs, entitlement statuses, entitlement sources, surface types, decisions, tenant entitlements, and evaluation inputs.
- `services/modules/module-catalog.service.ts` already maps critical modules and route prefixes, including inventory, POS, accounting, close assurance, compliance, payroll, finance, and payment reconciliation.
- `services/modules/module-entitlement.service.ts` derives legacy/requested entitlements, evaluates allow/would-block/deny decisions, records observe-mode audit events, and powers Module Control Center data.
- Current tests cover legacy full-suite observe access, wildcard RBAC not bypassing entitlement would-blocks, dependency gaps, read-only enforcement behavior, and observe-mode audit logging.
- `config/sidebar.ts` has `moduleSlug` metadata but still filters navigation by permission, not durable hard entitlement.
- `services/_shared/protect.ts` and `services/security/moat-guard.service.ts` already contain module-aware guard integration points.
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx` explicitly presents Module Control Center as observe-mode visibility, not hard blocking.
- `scripts/kontava-moat-release-gate.js` includes module-entitlement checks and recommends keeping observe mode until would-block reports are clean.
- `package.json` includes `ui:smoke:payroll`, backed by `scripts/ui-route-smoke-gate.js --require-screenshots`.
- `prisma/schema.prisma` has `Organization.requestedModules String[]` and `AuditLog`, but no durable subscription/package/tenant-entitlement schema found by targeted inspection.
- `graphify-out/GRAPH_REPORT.md` shows the repo has strong tenant, RBAC, ledger-first, and OHADA operating-spine communities. The module system should plug into these, not bypass them.

## Language Locked

- Module: a commercial or operational capability such as `inventory`, `pos`, `payroll`, `accounting`, `payment_reconciliation`, `close_assurance`, `compliance`, `analytics`, or `partners`.
- Package: a sellable bundle of modules, dependencies, limits, trial/read-only behavior, and commercial positioning.
- Tenant entitlement: the tenant-level right to use a module in a specific status and operation mode. It is not a user permission.
- RBAC permission: the user-level right to perform an action inside an entitled tenant.
- Module control plane: the service-owned layer that evaluates package, subscription, entitlement, dependency, enforcement, audit, and read-model truth.
- Observe mode: access is allowed while would-block evidence is recorded.
- Hard enforcement: server-side denial or safe unavailable states after evidence and release gates are clean.

## Blueprint: Enterprise Modular Subscription Platform

### What We Are Building

Build a service-owned module control plane that converts AqStoqFlow from a full-suite platform with registration module intent into a packageable SaaS platform with durable tenant subscriptions, entitlement provenance, downgrade-safe historical access, provider-neutral billing integration, and release-gated enforcement across navigation, pages, server actions, APIs, services, reports, exports, jobs, adapters, and dashboards.

### The Spine

- State: access truth lives in `TenantModuleEntitlement`; commercial lifecycle lives in `TenantSubscription`; external provider state lives in mirror/event tables only.
- Data model and invariants: packages are versioned; package items map to module slugs and dependency policy; each entitlement is organization-scoped, auditable, statused, source-attributed, and time-bound.
- Contract: `evaluateTenantModuleAccess(input)` returns `allow`, `would_block`, or `deny` with reason codes, read-only limits, dependency gaps, enforcement mode, safe copy, and audit metadata.
- Trust boundary: every sensitive access path checks session, tenant, entitlement, RBAC, fresh auth, maker-checker/approval, evidence policy, and audit on the server.
- Sync model: request/response guards for pages/actions/APIs/reports/exports; job/adapters use batch-safe guard helpers; billing webhooks become idempotent billing events that reconcile into internal subscription state.
- Failure handling: observe mode first; fail closed for high-risk writes; preserve legal read/export archives on downgrade; use manual override/grace states for billing-provider outages.

## Structural Decisions

- Package names: use `Starter Operations`, `Finance Control`, `Reconciliation and Close`, `Compliance and Payroll`, and `Enterprise Assurance`. Tradeoff: names may evolve commercially, so persist package codes and version display names separately.
- Billing: provider-neutral first. Internal subscription and entitlement records are authoritative. Tradeoff: more internal work now, but avoids provider lock-in and supports OHADA/CEMAC realities.
- First billing adapter: start with internal/manual invoice and entitlement provisioning. Add Paystack/Flutterwave/Stripe/mobile-money adapters after launch-country confirmation. Tradeoff: slower online automation, safer market fit.
- `Organization.requestedModules`: deprecate after migration. Treat it as onboarding intent and legacy bootstrap only. Tradeoff: requires backfill and compatibility reads during transition.
- Historical downgrade access: all core modules get read-only historical access from day one: payroll, accounting, compliance, close, reconciliation, inventory, and POS. Tradeoff: more policy work, much safer legally and operationally.
- Hard enforcement: start with low-risk surfaces and non-regulated availability checks. Keep critical financial/personnel/compliance writes observe/read-only gated until evidence is clean. Tradeoff: revenue controls arrive in rings, but trust controls are not rushed.
- Upgrade UX: centralize in Module Control Center and billing/settings, with subtle owner-only contextual links from dashboards. Tradeoff: less upsell exposure inside workflows, better operator trust.
- Usage limits: do not enforce in phase one. Record usage/metering events for observability and future pricing. Tradeoff: package monetization starts with availability, not caps.

## Proposed Domain Model And Schema Plan

| Model | Purpose | Source of truth | Key constraints |
| --- | --- | --- | --- |
| `ModulePackage` | Stable commercial package family, for example Starter Operations | Internal source | Unique `code`; active/archive status; no direct module list |
| `ModulePackageVersion` | Immutable package version with display name, effective dates, and pricing metadata pointer | Internal source | Unique `(packageId, version)`; never mutate historical package meaning |
| `ModulePackageItem` | Maps package version to module slug, dependency behavior, read-only fallback, trial support | Internal source | Unique `(packageVersionId, moduleSlug)`; dependency validation against catalog |
| `TenantSubscription` | Organization-level commercial subscription state | Internal source | Organization-scoped; statused; one primary active subscription per org unless add-ons are modeled separately |
| `TenantSubscriptionEvent` | Audit trail for subscription lifecycle changes | Internal source | Append-only; idempotency key for provider/manual events |
| `TenantModuleEntitlement` | Durable module access decision materialized for a tenant | Internal source | Organization-scoped; module-scoped; status, source, read-only, valid dates, dependency state |
| `TenantModuleEntitlementEvent` | Append-only entitlement history | Internal source | Every grant, revoke, downgrade, suspension, override, and recalculation is recorded |
| `BillingProviderAccount` | Provider account/customer references | Mirror | Provider + external customer ref unique; no direct entitlement mutation |
| `BillingProviderSubscriptionMirror` | Last known provider subscription state | Mirror | Provider event version/timestamp; reconcile to internal subscription through service |
| `BillingProviderEvent` | Raw normalized webhook/manual billing event ledger | Mirror/input | Idempotency key unique; stores signature status, processing state, replay metadata |
| `ModuleUsageEvent` | Observable usage events for future pricing and support | Internal telemetry | Organization/module/surface/time indexes; phase one records, does not enforce limits |
| `ModuleUpgradeRequest` | Owner/admin request flow for activation, trial, upgrade, or add-on | Internal source | Organization-scoped; actor/audit; status workflow |
| `ModuleDeactivationPolicy` | Per-module downgrade/read-only/export/write-block rules | Internal policy | Critical modules require explicit archive/read/export behavior |

Recommendation: keep the canonical module catalog code-owned in `services/modules/module-catalog.service.ts` during the first implementation. Add a DB `ModuleCatalogSnapshot` only if operators need editable catalog metadata. This avoids drifting from the existing typed module constants while package and tenant state become durable.

## Entitlement Evaluator Contract

```ts
type ModuleAccessIntent = "read" | "write" | "export" | "report" | "job" | "webhook" | "admin";

type EvaluateTenantModuleAccessInput = {
  organizationId: string;
  actorId?: string | null;
  actorPermissions: readonly string[];
  moduleSlug: CommercialModuleSlug;
  surfaceType: ModuleSurfaceType | "layout" | "service" | "webhook" | "dashboard_widget";
  surface: string;
  accessIntent: ModuleAccessIntent;
  operationRisk: "low" | "medium" | "high" | "critical";
  mode?: "observe" | "enforce";
  resource?: { id?: string; organizationId?: string; branchId?: string | null };
  now?: Date;
};

type EvaluateTenantModuleAccessResult = {
  result: "allow" | "would_block" | "deny";
  allowed: boolean;
  reasonCode:
    | "MODULE_ACTIVE"
    | "MODULE_NOT_ENTITLED"
    | "MODULE_READ_ONLY"
    | "MODULE_SUSPENDED"
    | "MODULE_EXPIRED"
    | "MODULE_DEPENDENCY_MISSING"
    | "ENTITLEMENT_UNAVAILABLE"
    | "OBSERVE_ONLY";
  entitlement: TenantModuleEntitlement | null;
  dependencyGaps: readonly string[];
  enforcementMode: "observe" | "enforce";
  readOnlyAllowed: boolean;
  safeUserMessage: string;
  audit: {
    organizationId: string;
    actorId?: string | null;
    moduleSlug: string;
    surfaceType: string;
    surface: string;
    accessIntent: string;
    decision: string;
  };
};
```

Pseudocode:

```ts
async function evaluateTenantModuleAccess(input) {
  assertOrganizationScoped(input.organizationId, input.resource);
  const catalogEntry = getModuleCatalogEntry(input.moduleSlug);
  const entitlement = await loadCurrentTenantEntitlement(input.organizationId, input.moduleSlug);
  const dependencyGaps = await resolveDependencyGaps(input.organizationId, catalogEntry);
  const policy = resolveDeactivationPolicy(input.moduleSlug, input.accessIntent, input.surfaceType);

  const wouldBlock =
    !entitlement ||
    entitlement.status === "suspended" ||
    entitlement.status === "expired" ||
    dependencyGaps.length > 0 ||
    (entitlement.status === "read_only" && !policy.readOnlyAllows(input.accessIntent, input.surfaceType));

  const result = wouldBlock ? (input.mode === "enforce" ? "deny" : "would_block") : "allow";
  await recordModuleDecision({ input, entitlement, dependencyGaps, result });
  return buildDecision({ input, entitlement, dependencyGaps, result, policy });
}
```

Entitlement precedence:

1. Security/legal suspension or explicit deny.
2. Audited manual override.
3. Active subscription package entitlement.
4. Add-on entitlement.
5. Trial entitlement.
6. Legacy full-suite/backfill entitlement during migration.
7. `Organization.requestedModules` observe-only onboarding intent.

## Surface Guard Integration Map

| Surface | Guard shape | Enforcement phase |
| --- | --- | --- |
| Sidebar/nav/search/quick actions | Service-owned package entitlement read model plus RBAC filter | Observe display first, hide later |
| Page/layout direct URL | `requireModulePageAccess` using evaluator before rendering module page | Low-risk routes first |
| Server actions | Extend `protect({ module: { moduleSlug, surface, accessIntent } })` | Observe, then low-risk writes, then critical writes |
| Route handlers/API | `requireModuleApiAccess` before handler logic | Same ring as server actions |
| Services | Service entrypoints call evaluator for module-controlled operations | Required before hard enforcement |
| Reports/exports | Report declaration includes owning module and dependencies | Critical before any hide-only UX |
| Jobs/schedulers | Per-tenant job guard skips or constrains suspended/unentitled modules and audits skip | Required before enforcement |
| Webhooks/adapters | Quarantine or reject module-specific events for inactive modules | After billing boundary exists |
| Dashboards/widgets | Widget query declarations map to modules and redaction policy | Before navigation hiding |
| Seeds/backfills | Demo tenant states include full-suite, POS-only, accounting-only, suspended payroll, read-only compliance | Before release gate promotion |

## Module Control Center UX And Read Model

The Module Control Center remains the primary owner/admin surface for package and module state. It should show:

- Current package and package version.
- Subscription status: trial, active, grace, past_due, suspended, cancelled, expired, manual.
- Module rows with status: active, trial, suspended, read_only, unavailable, dependency_missing.
- Entitlement source: package, add-on, trial, manual override, legacy default, requested intent.
- Dependency warnings and required package upgrades.
- Would-block counts and observed surfaces.
- Downgrade policy summary for each critical module.
- Owner-only upgrade/request buttons routed through `ModuleUpgradeRequest`.
- Audit export for subscription and entitlement history.

Do not turn operational dashboards into marketing pages. Normal dashboards can show subtle owner-only "request access" states, but the actual flow goes through Module Control Center and billing/settings.

## Lifecycle

Registration:

- Keep requested module choices as onboarding intent.
- Create pending/trial entitlements through the new provisioning service once package selection is confirmed.
- Store commercial signals separately from enforcement truth.

Provisioning:

- Subscription package creates package-derived entitlements.
- Add-ons create additive entitlements.
- Manual override can grant, restrict, suspend, or read-only a module with audit.
- Dependency gaps produce `would_block` in observe mode, then `deny` in enforce mode.

Upgrade:

- Owner/admin creates `ModuleUpgradeRequest`.
- Approved request updates subscription/package/add-on state.
- Provisioning recalculates entitlements and writes entitlement events.

Suspension:

- Billing or admin suspension changes subscription state first.
- Entitlement recalculation converts module access to suspended/read-only depending on policy.
- Critical historical reads remain available where policy requires.

Downgrade/deactivation:

- All core modules preserve historical read-only access: payroll, accounting, compliance, close, reconciliation, inventory, and POS.
- New writes, postings, calculations, submissions, imports, and sync jobs block according to policy.
- Exports remain allowed only when legal/business retention policy and RBAC allow them.

## Billing Provider Boundary

Best choice for this environment: provider-neutral architecture first, manual/internal billing adapter first, online provider adapters second.

Rationale:

- AqStoqFlow targets OHADA/CEMAC-style markets where payment rail availability can vary by country.
- Stripe, Paystack, Flutterwave, local mobile-money, bank transfer, and manual invoice flows should all be adapters.
- Provider webhooks must never mutate entitlements directly.
- Billing outage must not accidentally disable good tenants.
- Manual support override must be auditable and time-bound.

Provider event flow:

```text
Provider webhook/manual invoice event
  -> BillingProviderEvent append-only record
  -> signature/idempotency/order validation
  -> BillingProviderSubscriptionMirror update
  -> internal TenantSubscription transition
  -> entitlement provisioning recalculation
  -> TenantModuleEntitlementEvent audit
  -> cache invalidation
```

## Migration And Backfill From `Organization.requestedModules`

1. Add additive schema only. Do not remove `requestedModules`.
2. Seed package definitions and package versions.
3. Backfill existing tenants:
   - no requested modules: legacy full-suite observe entitlement;
   - requested modules: normalize to package/add-on recommendations and module entitlements;
   - unknown requested modules: keep in diagnostics, do not enforce.
4. Record all backfilled entitlements with source `legacy_default` or `requested_modules_migration`.
5. Add read model comparing requested modules to durable entitlements.
6. Run observe-mode reports and release gates.
7. Stop new access checks from reading `requestedModules`.
8. Keep `requestedModules` as onboarding/sales analytics until deprecation migration is approved.
9. Deprecate the field only after all registration and control-center flows write durable records.

Rollback:

- Entitlement enforcement remains feature/ring controlled.
- Backfilled records are additive and can be ignored by reverting evaluator mode to legacy observe.
- Provider event mirrors remain append-only and do not block tenant access by themselves.

## Package Strategy Matrix

| Package | Core modules | Target buyer | Notes |
| --- | --- | --- | --- |
| Starter Operations | dashboard, inventory, pos, purchasing-lite, basic analytics | Retail/SMB operators starting with stock and sales control | POS depends on inventory; accounting posting may be basic/read-only until Finance Control |
| Finance Control | accounting, finance, payments, purchasing, cash controls, inventory integration | Finance-led SMBs needing ledger and cash discipline | Requires stronger audit, posting, and export gates |
| Reconciliation and Close | payment_reconciliation, close_assurance, accounting, finance, evidence exports | Accountants, controllers, multi-branch owners | Must preserve close packs and reconciliation evidence after downgrade |
| Compliance and Payroll | payroll, compliance, presence/payroll-adjacent, accounting dependency, finance payment dependency | OHADA/CEMAC employers and regulated SMBs | Critical data privacy, read-only archive, fresh auth, maker-checker |
| Enterprise Assurance | all core modules plus analytics, controls, partners, advanced evidence, redaction, assurance surfaces | Multi-branch, partner-led, accountant-led, or high-control tenants | Highest release-gate and observability standard |

Add-ons:

- Advanced analytics and BI.
- AI/copilot with source-cited read-only access.
- Partner/accountant portal.
- Country-pack expansions.
- External integrations and provider adapters.
- Enterprise evidence/export pack.

Internal/beta modules must be possible without leaking to ordinary tenants.

## Verification Matrix And Release Gates

Minimum matrix:

- Tenant has module and permission: access allowed.
- Tenant has module but lacks permission: RBAC denial.
- Tenant lacks module but has wildcard/admin permission: entitlement denial or would-block.
- Direct URL for unsubscribed module: safe unavailable or denial.
- Server action for unsubscribed module: typed denial.
- API route for unsubscribed module: typed denial.
- Report/export for inactive module: no data leak.
- Job for suspended tenant/module: skipped or constrained with audit event.
- Downgraded payroll/accounting/compliance/close/reconciliation/inventory/POS: historical read/export allowed where policy allows; writes blocked.
- Billing webhook replay: idempotent.
- Provider event out of order: quarantined or reconciled safely.
- Subscription change: entitlement cache invalidated.
- Observe report: clean before hard enforcement.
- Release gate: fails if route/action/API/report/export/job lacks module ownership metadata.

Repo-native verification commands for implementation runs:

```powershell
npx prisma validate
npm run typecheck
npx jest services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts --runInBand
node scripts/kontava-moat-release-gate.js --mode fail --json-out what-next/AQSTOQFLOW_MODULE_CONTROL_PLANE_RELEASE_GATE.json
npm run ui:smoke:payroll
```

Future gates to add:

- Module surface inventory gate.
- Package dependency gate.
- Entitlement precedence gate.
- Downgrade/read-only policy gate.
- Billing provider idempotency gate.
- Report/export/job leakage gate.

## Failure Modes Considered

- Sidebar-only hiding: blocked by requiring server-side page/action/API/service/report/export/job guards.
- Wildcard admin bypass: blocked because wildcard satisfies RBAC only, not entitlement.
- Stale entitlement cache: request-scope or short TTL only; invalidate on entitlement/subscription events.
- Billing outage: use grace/manual override; provider mirrors do not directly suspend tenants.
- Webhook replay/out-of-order: idempotency keys, event ledger, provider version/timestamp checks.
- Downgrade hides legal evidence: all core modules have read-only historical access policy.
- Migration breaks existing tenants: legacy full-suite observe entitlement and additive backfill.
- Permission explosion: entitlement remains module-level; RBAC remains action-level.
- Reports/export leakage: module declarations and tests required before enforcement.
- Jobs leak module behavior: per-tenant job guard and audited skip/constrain decisions.
- Trial abuse: trial status is time-bound and auditable.

## Phased Implementation Plan

1. Freeze package and module vocabulary.
2. Create surface inventory gate for routes, actions, APIs, reports, exports, jobs, adapters, and dashboard widgets.
3. Add additive Prisma schema for package, subscription, entitlement, event, billing mirror, usage event, upgrade request, and deactivation policy.
4. Seed package definitions and package versions.
5. Backfill current tenants from `Organization.requestedModules`.
6. Build entitlement provisioning service and precedence tests.
7. Expand evaluator to load durable entitlements while preserving observe mode.
8. Add package-aware Module Control Center read model.
9. Add provider-neutral billing event boundary with manual/internal adapter.
10. Wire page/action/API/report/export/job guards in observe mode.
11. Add downgrade/read-only policies for all core modules.
12. Run release gates and UI smoke gates.
13. Enforce one low-risk ring end to end.
14. Promote additional modules only after clean evidence.

## Open Questions That Can Wait

- Final pricing and currency display.
- First online provider adapter after launch-country confirmation.
- Whether package catalog becomes operator-editable or remains seeded/code-reviewed.
- Whether usage caps are monetized in phase two or only observed.
- Whether production and presence graduate to commercial modules or remain adjacent domains.

## Out Of Scope For The First Build

- Splitting modules into separate deployable applications.
- Enforcing usage limits.
- Automated multi-provider billing reconciliation for every provider.
- AI-driven package recommendations.
- Removing `Organization.requestedModules`.
- Hard enforcement for all modules at once.

## Implementation Prompt Package

Use this prompt after approving the blueprint:

```text
In `E:\ohada saas\newStockFlow\aqstoqflow`, implement the first surgical slice of the enterprise modular subscription control plane from `what-next/AQSTOQFLOW_ENTERPRISE_MODULAR_PLATFORM_ARCHITECTURE_BLUEPRINT_2026-06-27.md`.

Do not build a separate app or micro-frontend. Preserve the current Next.js, Prisma, RBAC, tenant, audit, module catalog, and observe-mode entitlement patterns.

First implementation slice:
1. Add additive Prisma models for package/version/item, tenant subscription, subscription event, tenant module entitlement, entitlement event, billing provider event/mirror, module usage event, module upgrade request, and module deactivation policy, without removing `Organization.requestedModules`.
2. Add service-owned package and entitlement contracts under `services/modules`.
3. Add provisioning precedence in observe mode: suspension/deny, manual override, active package, add-on, trial, legacy default, requestedModules migration.
4. Add backfill/report mode from `Organization.requestedModules` without hard enforcement.
5. Add focused tests for package dependency validation, entitlement derivation, wildcard RBAC not bypassing entitlement, read-only downgrade policy, and billing event idempotency.
6. Save evidence under `what-next/`.

Required safety:
- No hard enforcement yet.
- No billing provider directly mutates entitlements.
- All core modules preserve read-only historical access after downgrade: payroll, accounting, compliance, close, reconciliation, inventory, POS.
- Module entitlement remains tenant-level and RBAC remains user-level.
- Existing tenants keep safe observe-mode access until release gates prove clean.

Verification:
- `npx prisma validate`
- `npm run typecheck`
- `npx jest services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts --runInBand`
- Add and run any new focused tests for the first slice.
- `node scripts/kontava-moat-release-gate.js --mode fail --json-out what-next/AQSTOQFLOW_MODULE_CONTROL_PLANE_RELEASE_GATE.json`
```

Blueprint ready.
