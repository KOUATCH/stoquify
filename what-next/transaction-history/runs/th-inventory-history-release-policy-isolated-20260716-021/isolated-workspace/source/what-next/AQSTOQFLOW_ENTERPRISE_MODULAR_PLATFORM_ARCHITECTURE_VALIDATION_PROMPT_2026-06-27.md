# AqStoqFlow Enterprise Modular Platform Architecture Validation Prompt

Date: 2026-06-27
Status: Validation prompt, not an implementation instruction
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Purpose

This artifact gives a run-ready architecture prompt for validating the future modular subscription platform before implementation begins.

The design target is a unified AqStoqFlow/Kontava platform where clients subscribe to modules and packages without turning the product into disconnected mini-apps. The platform should preserve tenant isolation, OHADA/accounting evidence, RBAC, auditability, close assurance, payroll controls, and service-boundary discipline while adding a durable commercial module and subscription control plane.

## Locked Validation Decisions

These decisions were validated on 2026-06-27 and should be treated as implementation-shaping defaults unless explicitly reopened.

1. Package names: use `Starter Operations`, `Finance Control`, `Reconciliation and Close`, `Compliance and Payroll`, and `Enterprise Assurance` as the initial package names.
2. Billing architecture: design provider-neutral first. AqStoqFlow's internal subscription, entitlement, invoice, audit, and lifecycle state is the source of truth. Stripe, Paystack, Flutterwave, mobile-money, bank-transfer, or manual/offline billing must be adapters and mirrors, not the authority.
3. First billing adapter: start with an internal/manual invoice and entitlement-provisioning adapter in phase one, then add the first online payment adapter after the launch country is confirmed. Current provider availability makes Paystack attractive for supported African markets and Stripe-owned ecosystem alignment, but not safe as the only assumption for CEMAC/Cameroon. Keep the adapter contract ready for Paystack, Flutterwave, Stripe, and local mobile-money rails.
4. Historical read-only access after downgrade: support read-only historical access from day one for all core modules: payroll, accounting, compliance, close, reconciliation, inventory, and POS. This includes legally required exports and evidence views where policy requires them.
5. Hard enforcement rollout: start hard enforcement with low-risk module availability surfaces first: navigation, safe unavailable states, direct route checks, low-risk reads, and non-regulated modules. Keep payroll, accounting, compliance, close, reconciliation, inventory, and POS under observe/read-only-gated enforcement for high-risk writes until audit evidence, surface inventory, and downgrade policy are clean. High-risk writes should fail closed once the entitlement truth and module policy cannot be verified.
6. `Organization.requestedModules`: deprecate it after migration. During transition, treat it only as onboarding intent and backfill it into durable subscription and entitlement records. Replace long-term usage with explicit onboarding/module-request records and tenant entitlement state.
7. Upgrade UX: centralize upgrade flows in Module Control Center and billing/settings. Normal dashboards may show subtle owner-only unavailable/request-access entry points, but they should route to Module Control Center instead of becoming sales-heavy workflow pages.
8. Usage limits: phase one should enforce module availability only. Add usage/metering events and schema hooks early for observability and future pricing, but do not enforce usage caps until module entitlement enforcement is stable.
## Evidence To Inspect First
Use these files as the source of truth before proposing the target architecture:

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
- `scripts/kontava-moat-release-gate.js`
- `prisma/schema.prisma`

## Current Architecture Signals

- The repo already has canonical commercial module language and module ownership ADRs.
- The current entitlement posture is observe-mode, not production subscription hard-enforcement.
- `Organization.requestedModules` exists today and should be treated as registration intent, not the final durable entitlement source of truth.
- Existing module service contracts include commercial module slugs, entitlement statuses, entitlement sources, surface types, module decisions, dependency metadata, observe-mode decisions, and audit-backed observation.
- The system already distinguishes module ownership from permission ownership. This must remain true: entitlement decides whether a tenant has a module; RBAC decides whether a user inside the tenant may perform an action.
- Sidebar/module metadata exists, but UI hiding is not sufficient. Direct routes, server actions, APIs, reports, exports, jobs, dashboards, adapters, and background workflows must also be covered.
- The desired path is observe first, inventory all surfaces, then hard-enforce in rings after evidence is clean.

## Locked Design Language

Use this vocabulary consistently:

- Module: a commercial or operational capability owned by the platform, for example `inventory`, `pos`, `payroll`, `reconciliation`, `close`, `compliance`, or `analytics`.
- Package or plan: a sellable bundle of modules, limits, and feature flags.
- Tenant entitlement: a tenant-level right to use a module, with status, source, period, dependencies, provenance, and audit history.
- Permission: a user-level authorization claim consumed by RBAC inside an entitled tenant.
- Module control plane: the central platform layer that owns module catalog, package mapping, tenant entitlement evaluation, dependency rules, enforcement policy, audit events, observability, and control-center read models.
- Observe mode: record allow/would-block/deny evidence while preserving current access unless a ring has explicitly moved to enforcement.
- Hard enforcement: server-side denial of access to unsubscribed or unavailable module surfaces after release-gate approval.

## Non-Negotiable Architecture Principles

- Keep one unified OHADA-aware operating system, not disconnected module apps.
- Use the existing tenant, session, RBAC, audit, business-event, close-assurance, and ledger-first spine.
- Do not let admin wildcard permissions bypass module entitlement, fresh auth, maker-checker, redaction, certification, or immutable evidence controls.
- Do not delete or hide legally relevant accounting, payroll, compliance, close, payment, inventory, or audit evidence during downgrade or deactivation.
- Treat billing providers as adapters and mirrors. Internal entitlement state must be authoritative.
- Make backend enforcement real before relying on navigation hiding.
- Prefer small, service-owned, testable primitives over route-local subscription checks.
- Keep migration reversible and observable until the enforcement gates prove clean.

## Run-Ready Prompt

Copy the prompt below into a fresh Codex thread after the team validates this direction.

~~~text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

We are designing the enterprise-grade modular subscription architecture for AqStoqFlow/Kontava in `E:\ohada saas\newStockFlow\aqstoqflow`. Do not implement code yet. Produce the validated architecture blueprint and implementation prompt package we should approve before coding.

Primary goal:
Design a modern, efficient, battle-tested, professional, robust, enterprise-grade modular platform that lets tenants subscribe to modules and packages while preserving the unified OHADA SMB operating-system model, tenant isolation, RBAC, audit evidence, accounting controls, payroll controls, close assurance, compliance, and service-boundary discipline.

Evidence to inspect before designing:
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
- `scripts/kontava-moat-release-gate.js`
- `prisma/schema.prisma`

Current known constraints:
- `Organization.requestedModules` exists and is registration intent, not the durable subscription entitlement model.
- The repo already has module-control contracts, a module catalog, observe-mode entitlement evaluation, module-control-center actions, audit-backed module observation, and release-gate hooks.
- The production gap is durable commercial packaging, subscription lifecycle, tenant entitlement state, entitlement provenance, full surface inventory, hard-enforcement rollout, billing-provider boundary, downgrade/deactivation policy, package-aware read model, and verification gates.
- Module entitlement is not RBAC. Entitlement determines whether the tenant has a module. RBAC determines whether a user in that tenant may use a permitted action.
- Navigation hiding is insufficient. Direct URL, server action, API, report, export, job, dashboard widget, background adapter, webhook, and seed/backfill paths must be covered.
- Validated package names are `Starter Operations`, `Finance Control`, `Reconciliation and Close`, `Compliance and Payroll`, and `Enterprise Assurance`.
- Billing must be provider-neutral first, with internal entitlement state as authority and external payment providers implemented as adapters.
- All core modules must support read-only historical access after downgrade: payroll, accounting, compliance, close, reconciliation, inventory, and POS.
- Phase one should focus on module availability enforcement, while recording usage/metering events without enforcing usage caps.

Guard order to preserve:
1. Session and active tenant context
2. Tenant isolation and organization membership
3. Module entitlement and dependency evaluation
4. RBAC permission
5. Fresh authentication for sensitive actions
6. Maker-checker or approval workflow when required
7. Consent, redaction, certification, and evidence policy
8. Audit, business event, outbox, ledger, and assurance evidence

Required architecture outcome:
Design a module control plane that includes:
- Canonical module catalog and dependency graph
- Package/plan catalog and versioned package-to-module mapping
- Tenant subscription lifecycle
- Durable tenant module entitlement model
- Entitlement event/history model
- Billing provider boundary and idempotent webhook processing
- Usage/metering model where relevant
- Upgrade/request/trial/suspension/read-only/downgrade/deactivation lifecycle
- Central entitlement evaluator contract
- Server-side adapters for pages, layouts, server actions, route handlers, services, reports, exports, jobs, webhooks, and background workers
- Navigation and control-center read models
- Audit and observability events
- Surface inventory and release gates
- Migration path away from `Organization.requestedModules`

Schema design to propose, but not implement until approved:
- `ModuleCatalog` or service-owned equivalent if the catalog remains code-owned
- `ModulePackage`
- `ModulePackageVersion`
- `ModulePackageItem`
- `TenantSubscription`
- `TenantSubscriptionEvent`
- `TenantModuleEntitlement`
- `TenantModuleEntitlementEvent`
- `BillingProviderAccount`
- `BillingProviderSubscriptionMirror`
- `UsageMeter` or `ModuleUsageEvent`
- `ModuleUpgradeRequest`
- `ModuleDeactivationPolicy` or policy table/service equivalent

For each proposed table/model, explain:
- Why it exists
- Whether it is source of truth or mirror/cache
- Cardinality and tenant boundaries
- Required indexes/uniqueness constraints
- Audit implications
- How it migrates from current state
- Which services own writes
- Which reads are allowed from UI/server actions

Entitlement evaluator requirements:
- Accept active organization, user/session claims, requested module slug, surface type, route/action/resource identifier, operation risk, and optional target resource metadata.
- Return a typed decision such as `allow`, `would_block`, or `deny`.
- Include reason codes, dependency gaps, read-only limits, source/provenance, enforcement mode, audit metadata, and user-safe copy.
- Support observe mode and ring-based hard enforcement.
- Never rely only on client state.
- Use request-scoped caching or short TTL caching with explicit invalidation on entitlement events.
- Fail closed for high-risk writes and legal/compliance/accounting/payroll operations when entitlement truth cannot be loaded.
- Fail gracefully with observable safe-unavailable states for low-risk reads when policy allows.

UX and product requirements:
- Normal users should not be distracted by unsubscribed modules after hard enforcement is ready.
- Owners/admins should see subscribed, trial, suspended, read-only, unavailable, and dependency-missing states in a Module Control Center.
- Upgrade paths should be clear but not marketing-heavy inside operational workflows.
- Suspended or downgraded modules must preserve historical evidence and allow legally necessary read/export flows when policy requires.
- Onboarding should use requested modules as intent, then provision actual entitlements through the new lifecycle.
- The dashboard shell should use entitlement-aware navigation, but server-side guards remain the authority.

Package strategy to validate:
- Starter Operations
- Finance Control
- Reconciliation and Close
- Compliance and Payroll
- Enterprise Assurance
- Optional add-ons for advanced analytics, external partner integrations, AI/copilot, and country-pack expansions
- Internal/beta modules must be possible without leaking to normal tenants

Verification and release gates:
Define a matrix that proves:
- Tenant with module and permission can access the surface.
- Tenant with module but no permission is denied by RBAC.
- Tenant without module but with admin wildcard is denied by entitlement.
- Direct URL access is denied or safely unavailable.
- Server actions and API routes deny unsubscribed module access.
- Reports and exports do not leak unsubscribed module data.
- Background jobs skip or constrain unsubscribed/suspended module work and emit evidence.
- Downgraded payroll/accounting/compliance/close/reconciliation/inventory/POS data remains readable/exportable where legally required but write-blocked where required.
- Billing webhook replay is idempotent.
- Subscription status changes invalidate entitlement caches.
- Observe-mode reports are clean before hard enforcement.
- The release gate fails if module surfaces lack ownership metadata or guard coverage.

Risk controls to address explicitly:
- Sidebar-only hiding
- Admin wildcard bypass
- Stale entitlement cache
- Billing outage disabling good customers
- Provider webhook replay or out-of-order events
- Downgrade deleting or hiding legal evidence
- Migration hiding current tenant workflows
- Permission explosion
- Feature flag and entitlement drift
- Background jobs leaking module behavior
- Report/export leakage
- Trial abuse and suspended account edge cases
- Multi-country compliance and OHADA evidence retention

Required deliverables:
1. Current-state confirmation with exact files inspected.
2. Target architecture blueprint.
3. Vocabulary and ownership model.
4. Proposed domain model and schema plan.
5. Entitlement evaluator contract and pseudocode.
6. Surface guard integration map.
7. Module Control Center UX/read-model specification.
8. Registration, provisioning, upgrade, suspension, downgrade, and deactivation lifecycle.
9. Billing-provider boundary and webhook/idempotency design.
10. Migration and backfill plan from `Organization.requestedModules`.
11. Package strategy matrix with module bundles and rationale.
12. Verification matrix and release gates.
13. Phased implementation plan with small surgical increments.
14. Open questions and tradeoffs requiring product approval.
15. A saved markdown report under `what-next/` with a date-stamped filename.

Implementation discipline:
- Do not implement code in the architecture-validation run.
- Do not invent a separate micro-frontend or mini-app architecture unless the evidence proves it is necessary.
- Prefer repo-native services, contracts, server actions, tests, scripts, and release gates.
- Keep architecture compatible with existing module-control services and ADRs unless a change is explicitly justified.
- Treat all proposed schema names as provisional until validated against `prisma/schema.prisma`.
- Surface design choices and tradeoffs. Do not silently assume pricing, billing provider, enforcement timing, or package names.

Success criteria:
- The blueprint is clear enough for a later implementation run to create schema, services, guards, UI read models, tests, and release gates without re-deciding the architecture.
- The design protects tenant boundaries, financial records, payroll records, close evidence, compliance evidence, audit logs, and immutable historical data.
- The design supports subscription packaging while keeping the product cohesive and operationally fast.
- The design includes a credible path from observe mode to hard enforcement.
- The design explicitly identifies the smallest safe implementation sequence.
~~~

## Validation Questions Before Implementation

Resolved on 2026-06-27:

1. Initial package names are approved: `Starter Operations`, `Finance Control`, `Reconciliation and Close`, `Compliance and Payroll`, and `Enterprise Assurance`.
2. Billing is provider-neutral first. The first phase should support internal/manual invoicing and entitlement provisioning; Paystack, Flutterwave, Stripe, and local mobile-money rails remain adapter candidates.
3. All listed core modules require read-only historical access after downgrade from day one: payroll, accounting, compliance, close, reconciliation, inventory, and POS.
4. Hard enforcement starts with low-risk surfaces and non-regulated availability checks. High-risk payroll/accounting/compliance/close/reconciliation/inventory/POS writes move to hard enforcement only after observe evidence, surface inventory, and downgrade policy pass.
5. `Organization.requestedModules` is deprecated after migration and replaced by durable onboarding/module-request and entitlement records.
6. Upgrade flows live in Module Control Center and billing/settings, with only subtle owner-only contextual links from dashboards.
7. Phase one focuses on module availability. Usage events can be recorded early, but usage limits are not enforced in phase one.

## Recommended Implementation Sequence After Approval

1. Freeze module vocabulary and surface inventory.
2. Add durable subscription/package/entitlement schema behind observe-mode reads.
3. Backfill entitlements from `Organization.requestedModules` and current tenant state.
4. Add central entitlement evaluator contract and adapters.
5. Wire navigation, pages, actions, API routes, reports, exports, and jobs in observe mode.
6. Add package-aware Module Control Center read model.
7. Add billing provider boundary as an adapter with idempotent event ingestion.
8. Add downgrade/deactivation/read-only policies.
9. Expand verification matrix and release gates.
10. Move selected low-risk rings from observe to hard enforcement after clean evidence.

## Minimal Approval Standard

Implementation should not start until the validation run confirms:

- The source of truth for tenant entitlements.
- The relationship between package, subscription, module, entitlement, RBAC, and feature flags.
- The guard order and enforcement modes.
- The migration path from `Organization.requestedModules`.
- The first package matrix and first enforcement ring.
- The downgrade/deactivation evidence policy.
- The verification gates that must pass before hard enforcement.

Prompt package ready for validation.


