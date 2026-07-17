# Kontava/Aqstoqflow Module-Oriented Platform Proposal Evaluation And Roadmap

Date: 2026-06-24

Primary local source: `innovation/KONTAVA_MODULE_DRIVEN_PLATFORM_ARCHITECTURE_ANALYSIS_2026-06-24.md`

External benchmark sources:

- [SAP S/4HANA Cloud Public Edition](https://www.sap.com/products/erp/s4hana.html)
- [SAP Business Technology Platform](https://www.sap.com/products/technology-platform.html)
- [Oracle Fusion Cloud ERP](https://www.oracle.com/erp/)
- [Oracle Cloud Security Services](https://www.oracle.com/security/cloud-security/)
- [Microsoft Dynamics 365 Finance and Operations role-based security](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/sysadmin/role-based-security)
- [Microsoft Dynamics 365 Business Central entitlements and permission sets](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-entitlements-and-permissionsets-overview)
- [NetSuite products and module families](https://www.netsuite.com/portal/products.shtml)
- [NetSuite SuiteCloud Platform](https://www.netsuite.com/portal/platform.shtml)
- [Odoo module manifests](https://www.odoo.com/documentation/19.0/developer/reference/backend/module.html)
- [Odoo security reference](https://www.odoo.com/documentation/19.0/developer/reference/backend/security.html)
- [Frappe/ERPNext users and permissions](https://docs.frappe.io/framework/user/en/basics/users-and-permissions)
- [Salesforce ISVforce and AppExchange packaging guide](https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/packaging_intro.htm)

## Executive Summary

The architecture analysis is directionally correct: Kontava/Aqstoqflow should become a module-oriented platform, but it must do so through governance, not more UI and not duplicated module-specific logic.

The platform already has strong raw materials:

- commercial module catalog
- observe-mode module entitlement evaluation
- module control center
- RBAC aliases and permission mapping
- protected server action wrapper
- snapshots and dashboard read models
- evidence, proof, redaction, and audit services
- release gate scripts
- broad dashboard route/action/service coverage

The current weakness is not lack of features. The weakness is that module identity does not yet govern every platform surface. Routes, server actions, sidebar entries, snapshots, redaction policies, and reports are not yet forced to use one canonical module vocabulary and one entitlement decision path.

The strongest lesson from SAP, Oracle, Microsoft, NetSuite, Odoo, Frappe/ERPNext, and Salesforce is this:

> World-class modular platforms do not treat modules as menu groups. They treat modules as governed product surfaces with metadata, entitlements, permissions, lifecycle, dependencies, extensibility rules, security gates, auditability, and upgrade discipline.

The first implementation move should remain small and non-destructive:

1. Build a report-only Module Surface Inventory Gate.
2. Freeze canonical module slugs and statuses.
3. Fix known drift before enforcement.
4. Add persistent entitlements in observe mode.
5. Extend `protect` and navigation with module decisions.
6. Enforce only one low-risk module after evidence proves it is safe.

## Benchmark Lessons From Prominent Platforms

### SAP S/4HANA Cloud

SAP positions S/4HANA Cloud Public Edition as a modular ERP covering finance, supply chain, HR, and sales processes, with preconfigured practices, role-oriented experience, managed updates, APIs, integration, security, compliance, and scalability.

What Kontava should copy:

- Use module governance to scale the suite without fragmenting the product.
- Keep best-practice business flows as reusable platform assets.
- Treat APIs and extensions as first-class controlled surfaces.
- Make continuous updates possible by avoiding uncontrolled customization.

What Kontava should avoid:

- Do not turn modularity into heavy implementation ceremony too early.
- Do not create enterprise-grade labels without automated gates to enforce them.

### Oracle Fusion Cloud ERP

Oracle presents ERP as an integrated suite spanning financial management, procurement, project management, risk management, EPM, and analytics. The risk/compliance area emphasizes ERP role and security design, separation-of-duties automation, access monitoring, access certification, configuration controls, transaction controls, and audit workflows.

What Kontava should copy:

- Treat security, controls, and auditability as platform modules, not afterthoughts.
- Build continuous access monitoring into module operations.
- Pair module access with control evidence and certification.
- Use analytic/read-model layers rather than dashboard-local calculations.

What Kontava should avoid:

- Do not bury module governance inside admin-only screens with no enforcement path.
- Do not let compliance modules become report pages without operational controls.

### Microsoft Dynamics 365 And Business Central

Dynamics 365 Finance and Operations models access hierarchically: roles map to duties, duties map to privileges, privileges map to permissions. Microsoft also describes role assignment by business responsibility, data security policies, role hierarchy, segregation of duties, and update-time security audits.

Business Central makes a useful distinction between entitlements and permissions: entitlement defines what functionality a customer is licensed or eligible to use; permission defines what an administrator or partner grants to a user. It also shows a strong pattern of defining sensitive system permission artifacts as code for traceability, upgradeability, and hotfixability.

What Kontava should copy:

- Keep tenant entitlement separate from user RBAC.
- Map security to business processes, not just UI objects.
- Keep system permission/module definitions versioned and reviewable.
- Audit security objects after releases.

What Kontava should avoid:

- Do not collapse module entitlement and RBAC into one overloaded permission flag.
- Do not allow ad hoc per-user exceptions to become the control plane.

### NetSuite And SuiteCloud

NetSuite exposes recognizable product/module families across ERP, accounting, global business management, CRM, HR, PSA, analytics, connectors, infrastructure, and platform. SuiteCloud emphasizes customization, automation, integration, internationalization, performance monitoring, platform development, and application distribution.

What Kontava should copy:

- Make platform extension and application distribution governed capabilities.
- Include performance and stability monitoring as part of platform maturity.
- Treat internationalization/localization as a module-platform concern.
- Keep finance, inventory, HR, CRM, analytics, and connectors visible as business module families.

What Kontava should avoid:

- Do not let extensions bypass module boundaries.
- Do not let marketplace-style apps introduce shadow truth.

### Odoo

Odoo's module manifest model is valuable because modules declare metadata such as dependencies, whether a module is an application, installability, assets, and lifecycle hooks. Odoo security also separates group-driven access rights, record rules, and field-level access.

What Kontava should copy:

- Give every module a manifest-like contract.
- Declare dependencies explicitly and validate them automatically.
- Distinguish full applications from technical/support modules.
- Use model, record, and field-sensitive access where needed.

What Kontava should avoid:

- Avoid overusing lifecycle hooks as hidden business logic.
- Avoid additive group access that accidentally grants too much without evidence.

### Frappe/ERPNext

Frappe/ERPNext exposes role permissions at the document type level, with operations such as read, write, create, delete, submit, cancel, amend, report, export, import, share, print, and email. It also supports permission levels for fields and user permissions for record restrictions.

What Kontava should copy:

- Use explicit operation-level permission vocabulary.
- Treat reports, exports, imports, print/PDF, and email as separate controlled surfaces.
- Add field-level or data-category restrictions for sensitive areas such as payroll and supplier banking.

What Kontava should avoid:

- Do not rely on broad module access to imply export/report rights.
- Do not allow sensitive operations to inherit from generic read access.

### Salesforce Platform And AppExchange

Salesforce's ISVforce/AppExchange model is useful less as an ERP and more as a platform maturity benchmark. Managed packages support distribution, licensing, trials, troubleshooting, and monetization. AppExchange distribution requires security responsibility and security review.

What Kontava should copy:

- Treat installable platform capabilities as packages with lifecycle, licensing, and security review.
- Add security review as a release gate for module expansion.
- Build telemetry and troubleshooting paths into module packaging.

What Kontava should avoid:

- Do not introduce package complexity until the internal module control plane is stable.
- Do not monetize or externally distribute modules before security gates are mature.

## Consolidated Industry Pattern

The benchmark pattern is:

1. Canonical module metadata.
2. Explicit dependency model.
3. Tenant-level entitlement/license model.
4. User-level role and permission model.
5. Route/action/API/report/export/job surface mapping.
6. Navigation generated from governed metadata.
7. Server-owned data/read models.
8. Extensibility through approved contracts.
9. Security review and release gates.
10. Observability, audit, certification, and rollback.

Kontava already has parts of this. The implementation strategy should connect and harden them rather than create a second architecture.

## Proposal Inventory And Evaluation

### 1. Canonical Module Catalog Governance

What it is:

The module catalog becomes the source of truth for module identity, status, route prefixes, dependencies, owner, risk level, and permissions.

Problem solved:

Prevents module drift across routes, sidebar, snapshots, evidence, redaction, reports, and release gates.

Strong points:

- Gives every module one name and one owner.
- Enables dependency validation.
- Creates a stable base for navigation, entitlement, and release gates.
- Matches Odoo-style manifest thinking and SAP/NetSuite-style product-family clarity.

Weak points and risks:

- Can become a static spreadsheet in code if not validated.
- Can block useful development if every metadata change requires too much process.
- Catalog status can lie if route/action inventory is not automated.

Prerequisites:

- Existing catalog reviewed and frozen.
- Module statuses defined: production, beta, internal, future, unavailable, legacy.
- Known drift resolved or explicitly marked.

Complexity:

Medium.

Security implications:

Good module identity reduces accidental exposure, but only after enforcement hooks use it.

Single-source-of-truth impact:

Strongly positive if catalog owns identity only and services still own business truth.

What can go wrong:

If the catalog becomes a parallel business configuration store, it will create contradiction and bloat.

Release gate:

`module:catalog` verifies valid slugs, unique route prefixes, declared status, owner, risk level, dependencies, and no unknown aliases.

### 2. Module Surface Inventory Gate

What it is:

A report-only gate that maps catalog modules to dashboard routes, server actions, service folders, sidebar entries, snapshots, evidence subjects, redaction policies, reports, exports, and jobs.

Problem solved:

Shows the real platform surface before enforcement.

Strong points:

- Low-risk first move.
- Finds drift early.
- Creates evidence for phased enforcement.
- Does not change user behavior in its first form.

Weak points and risks:

- Initial inventory may produce noisy findings.
- Static analysis can miss dynamic surfaces.
- Teams may ignore report-only output unless it is ratcheted later.

Prerequisites:

- Catalog slugs available.
- Dashboard routes and sidebar config discoverable.
- Snapshot and redaction module references parsable.

Complexity:

Medium.

Security implications:

Positive because it identifies unowned surfaces.

Single-source-of-truth impact:

Strongly positive because it reveals duplicate or shadow module ownership.

What can go wrong:

If promoted to fail mode too early, it may block unrelated delivery.

Release gate:

Start with `module:surface --mode report`; later add `module:surface:fail`.

### 3. Persistent Module Entitlement Lifecycle

What it is:

A durable tenant module entitlement table and service, replacing derived-only entitlement from `Organization.requestedModules`.

Problem solved:

Makes module access operationally real: active, trial, read-only, suspended, expired, unavailable, legacy default, system default.

Strong points:

- Separates customer/module eligibility from user RBAC.
- Supports lifecycle operations.
- Enables access history, audit, expiry, suspension, and rollback.
- Aligns with Microsoft Business Central's entitlement-vs-permission distinction.

Weak points and risks:

- Adds schema and migration work.
- Backfill errors could affect tenant access.
- Requires careful compatibility with legacy requested modules.

Prerequisites:

- Catalog frozen.
- Legacy requested module values normalized.
- Observe-mode decision parity tests.
- Migration/backfill plan.

Complexity:

High.

Security implications:

High positive impact if built carefully. High risk if migration is careless.

Single-source-of-truth impact:

Positive if entitlement owns only tenant access state and does not duplicate business truth.

What can go wrong:

Enforcement before backfill validation could block paying tenants or expose unavailable modules.

Release gate:

`module:entitlement` verifies valid entitlement statuses, dependency closure, migration parity, and audit logging.

### 4. Module-Aware `protect` Wrapper

What it is:

Extend the existing protected action wrapper so every sensitive action can declare module metadata: slug, surface type, surface name, access intent, enforcement mode, and dependency policy.

Problem solved:

Makes module access checks happen at server boundaries instead of only in UI.

Strong points:

- Reuses the existing boundary wrapper.
- Preserves current RBAC and tenant guard discipline.
- Supports observe-mode logging before enforcement.
- Creates a consistent location for correlation IDs and denial responses.

Weak points and risks:

- Touches a shared platform primitive.
- Bad defaults can either over-block or under-protect.
- Migrating all actions at once would be too risky.

Prerequisites:

- Entitlement evaluator stable.
- Module decision result contract stable.
- Canary action list selected.
- Safe denial response format defined.

Complexity:

High.

Security implications:

Very high. This becomes the main enforcement path.

Single-source-of-truth impact:

Positive because dashboards/actions no longer invent their own access checks.

What can go wrong:

If UI-only checks are trusted, APIs and actions remain exposed. If server checks are too broad, workflows break.

Release gate:

Focused tests for observe/enforce decisions, missing dependency behavior, denial shape, audit logging, and redaction context propagation.

### 5. Route Module Manifest

What it is:

A manifest mapping each route to module slug, permission, surface type, owner service, risk level, and release status.

Problem solved:

Prevents routes from existing outside module ownership.

Strong points:

- Makes module ownership visible.
- Supports navigation generation.
- Supports route smoke checks.
- Helps security review and release notes.

Weak points and risks:

- Manual manifests can drift.
- Generated manifests can be hard to annotate.
- Some shared routes may need explicit exemptions.

Prerequisites:

- Module catalog frozen.
- Route inventory complete.
- Shared route exemption policy.

Complexity:

Medium.

Security implications:

Positive, especially for route-level entitlement diagnostics.

Single-source-of-truth impact:

Positive if route manifest references catalog slugs, not duplicate definitions.

What can go wrong:

If a route maps to multiple modules without a declared primary owner, audits and navigation will be ambiguous.

Release gate:

`module:routes` verifies every dashboard route maps to one catalog module or explicit exemption.

### 6. Navigation From Catalog, Manifest, RBAC, And Entitlement

What it is:

Sidebar visibility becomes a derived output: module catalog plus route manifest plus tenant entitlement plus user RBAC.

Problem solved:

Stops navigation from being a separate access-control system.

Strong points:

- Removes duplicate module knowledge from static sidebar.
- Keeps payroll and other modules visible only when allowed.
- Supports admin diagnostics in observe mode.
- Aligns with enterprise products that expose role/module-driven UIs.

Weak points and risks:

- Navigation can become slow if entitlement checks are not cached or precomputed.
- Hidden navigation can confuse users if denial reasons are not clear.
- Dynamic sidebar behavior needs careful testing.

Prerequisites:

- Route manifest.
- Entitlement decision cache/read model.
- RBAC helper stable.
- UX for blocked/unavailable modules.

Complexity:

Medium to high.

Security implications:

Good for least privilege, but navigation hiding must never replace server enforcement.

Single-source-of-truth impact:

Positive if navigation renders decisions from server-owned access data.

What can go wrong:

If navigation says allowed but server denies, user trust drops. If navigation hides everything in observe mode, admins lose diagnostics.

Release gate:

`module:navigation` verifies no orphan sidebar entries and checks representative RBAC/entitlement combinations.

### 7. Canonical Module Slug Vocabulary

What it is:

Use catalog slugs everywhere, including snapshots, evidence, redaction, audit logs, route manifests, action metadata, reports, and release gates.

Problem solved:

Prevents subtle mismatches such as `close` versus `close_assurance`, or `payments` versus `payment_reconciliation`.

Strong points:

- Simple concept with high leverage.
- Reduces hidden authorization and reporting bugs.
- Makes audit trails searchable and comparable.

Weak points and risks:

- Existing data may contain old slugs.
- Some domains may need separate conceptual names, such as payments versus payment reconciliation.

Prerequisites:

- Slug taxonomy decision.
- Alias/migration map.
- Snapshot/evidence/redaction scan.

Complexity:

Medium.

Security implications:

Positive because module decisions and redaction decisions can compare one vocabulary.

Single-source-of-truth impact:

Very positive.

What can go wrong:

Naive rename without migration can break existing reports or audit lookups.

Release gate:

`module:slugs` verifies all module references are catalog slugs or approved aliases.

### 8. Module-Owned Server Read Models

What it is:

Each module exposes dashboard-safe server read models or snapshots, while business truth remains in domain services.

Problem solved:

Lets dashboards feel excellent without moving truth into client components.

Strong points:

- Supports rich UX while preserving source-of-truth rules.
- Aligns with Oracle analytics and NetSuite reporting/dashboard patterns.
- Keeps expensive calculations server-side.
- Reduces duplicated metrics.

Weak points and risks:

- Can become another service layer if poorly scoped.
- Snapshot freshness and staleness need visible semantics.
- Cross-module dashboards can be hard to own.

Prerequisites:

- Module slug alignment.
- Existing service ownership confirmed.
- Snapshot freshness contract.
- No-client-truth policy.

Complexity:

Medium to high.

Security implications:

Positive when read models include redaction and entitlement context.

Single-source-of-truth impact:

Positive if read models are projections, negative if they recalculate competing truth.

What can go wrong:

Dashboard-specific shadow services can create contradictory metrics.

Release gate:

`module:read-models` verifies no client-computed business truth, source modules are declared, and freshness/blockers are exposed.

### 9. Redaction, Evidence, And Sensitive Surface Controls

What it is:

Module decisions feed redaction, proof/evidence trails, exports, reports, and sensitive field visibility.

Problem solved:

Access is not just "can open module." It is also "what sensitive data can be seen or exported."

Strong points:

- Matches Frappe/ERPNext field and operation granularity.
- Protects payroll, supplier bank, payment, compliance, and close evidence data.
- Supports audit-ready proof trails.

Weak points and risks:

- Can over-redact and reduce usefulness.
- Can under-redact if module decision context is not passed everywhere.
- Export/report surfaces are easy to forget.

Prerequisites:

- Module-aware `protect`.
- Canonical slug vocabulary.
- Sensitive data categories confirmed.
- Export/report operation permissions separated from read permissions.

Complexity:

High.

Security implications:

Very high. This is one of the most important enterprise-grade controls.

Single-source-of-truth impact:

Positive because redaction policy becomes a governed service, not UI conditionals.

What can go wrong:

If a dashboard redacts but export does not, the control is cosmetic.

Release gate:

`module:redaction` and export/report tests for payroll, supplier bank, payment reconciliation, compliance, and close evidence.

### 10. Observe-Mode Analytics Before Enforcement

What it is:

Collect would-block events by tenant, module, surface, missing dependency, stale requested module, and unknown module.

Problem solved:

Prevents blind enforcement.

Strong points:

- Makes enforcement evidence-based.
- Identifies tenants needing cleanup.
- Provides rollback and support data.

Weak points and risks:

- Requires event volume control.
- Logs may contain sensitive context unless redacted.
- Reports can be ignored if no owner is assigned.

Prerequisites:

- Module decision audit events.
- Dashboard/report for would-block trends.
- Sensitive log redaction.

Complexity:

Medium.

Security implications:

Positive, with care around log contents.

Single-source-of-truth impact:

Positive because it measures actual access paths.

What can go wrong:

Noisy analytics can hide real blockers.

Release gate:

`module:observe` verifies event shape, redaction, dedupe, and trend reporting.

### 11. Module Operations Model

What it is:

Admin operations for activate, suspend, resume, trial, expire, downgrade to read-only, resolve dependencies, migrate legacy tenants, and audit changes.

Problem solved:

Turns module access from code behavior into an operable product capability.

Strong points:

- Supports sales, onboarding, support, compliance, and renewals.
- Makes module state explainable.
- Enables safe rollback.

Weak points and risks:

- Can become a full billing platform too early.
- Needs strict maker-checker controls for high-risk modules.
- Requires support playbooks.

Prerequisites:

- Persistent entitlement model.
- Audit logging.
- Dependency resolver.
- Admin RBAC.
- Denial reason contract.

Complexity:

High.

Security implications:

High. Module activation/suspension is sensitive administration.

Single-source-of-truth impact:

Positive if operations mutate entitlement state only.

What can go wrong:

Uncontrolled module activation can expose regulated functionality.

Release gate:

Admin action tests, audit tests, permission tests, and dependency resolution tests.

### 12. Module Release Gates And Ratchets

What it is:

CI/report gates that prevent catalog, route, action, navigation, snapshot, evidence, redaction, and entitlement drift.

Problem solved:

Stops the platform from regressing after the architecture is cleaned up.

Strong points:

- Makes architecture enforceable.
- Builds release discipline.
- Fits existing `policy:gates` strategy.
- Allows report-mode first and fail-mode later.

Weak points and risks:

- Too many gates can slow delivery.
- False positives create gate fatigue.
- Ratchets need ownership.

Prerequisites:

- Inventory output trusted.
- Baseline accepted.
- Allowlist/exemption process.

Complexity:

Medium.

Security implications:

Positive because bypasses become visible.

Single-source-of-truth impact:

Very positive.

What can go wrong:

If teams bypass gates to ship urgent work, drift returns.

Release gate:

`module:surface`, `module:entitlement`, `module:navigation`, `module:snapshot-slugs`, `module:redaction`.

### 13. Governed Extensibility And Future Module Packaging

What it is:

Controlled extension contracts for module add-ons, integrations, partner capabilities, and future package distribution.

Problem solved:

Lets the platform grow without uncontrolled one-off customization.

Strong points:

- Learns from SAP BTP, SuiteCloud, Odoo manifests, and Salesforce managed packages.
- Supports partner ecosystems later.
- Encourages versioned contracts.

Weak points and risks:

- Premature packaging can distract from core platform governance.
- External modules increase security review burden.
- Extension APIs can lock in weak contracts.

Prerequisites:

- Internal module control plane stable.
- Security review checklist.
- Extension boundary policy.
- Observability and rollback.

Complexity:

Very high.

Security implications:

Very high.

Single-source-of-truth impact:

Positive only if extensions consume official services/read models and cannot create shadow truth.

What can go wrong:

A marketplace before governance becomes a bloat multiplier.

Release gate:

Package security review, extension contract tests, data access review, and upgrade compatibility checks.

## Prioritized Implementation Roadmap

### Phase 0: Module Readiness And Drift Audit

Objective:

Know the real current platform surface before changing behavior.

Proposals included:

- module surface inventory gate
- canonical catalog review
- slug drift scan
- route/sidebar/action/snapshot/redaction inventory

Prerequisites:

- Current architecture analysis accepted as source of truth.
- `innovation/` and `what-next/` report locations confirmed.
- No enforcement changes planned in this phase.

Likely files/systems affected:

- `services/modules/module-catalog.service.ts`
- `config/sidebar.ts`
- `app/[locale]/(dashboard)/dashboard/**/page.tsx`
- `actions/**`
- `services/snapshots/snapshot-contracts.ts`
- `services/security/redaction-policy.service.ts`
- `services/evidence/evidence-contracts.ts`
- `package.json`
- `scripts/module-surface-gate.js`
- `what-next/module-surface-inventory.json`

Implementation steps:

1. Parse catalog slugs, route prefixes, dependencies, statuses, and permissions.
2. Enumerate dashboard pages and infer candidate module by prefix.
3. Enumerate server action files.
4. Enumerate sidebar links and permissions.
5. Extract snapshot source module names.
6. Extract redaction policy module slugs.
7. Extract proof/evidence module references.
8. Produce JSON and Markdown inventory.
9. Mark every finding as pass, drift, orphan, unknown, ambiguous, or intentionally exempt.

Validation steps:

- Run the inventory script.
- Manually verify high-risk findings.
- Confirm known drift appears: `presence` route mismatch and snapshot slug mismatch.

Exit criteria:

- Every dashboard route is classified.
- Every catalog route prefix is matched or marked future/unavailable.
- Every snapshot source module is mapped to a catalog slug or alias.
- No behavior changes were introduced.

Blockers:

- Catalog cannot be parsed.
- Route inventory is incomplete.
- Findings are too noisy to trust.

### Phase 1: Canonical Module Catalog And Slug Governance

Objective:

Freeze the platform vocabulary.

Proposals included:

- canonical module catalog governance
- slug vocabulary alignment
- catalog status policy
- dependency normalization

Prerequisites:

- Phase 0 inventory completed.
- Module owners agree on production/beta/internal/future/unavailable/legacy status.
- Decision made on `presence`, `close`, `payments`, `cashDrawer`, and reconciliation naming.

Likely files/systems affected:

- `services/modules/module-catalog.service.ts`
- `services/modules/module-control-contracts.ts`
- `services/snapshots/snapshot-contracts.ts`
- `services/security/redaction-policy.service.ts`
- module inventory reports

Implementation steps:

1. Normalize catalog slugs and aliases.
2. Add explicit lifecycle/status semantics.
3. Mark modules without routes as future/unavailable/internal.
4. Add alias map for legacy names.
5. Add tests for valid slugs and dependency closure.

Validation steps:

- Catalog unit tests.
- Slug scan over snapshots/redaction/evidence.
- No duplicate route prefixes.

Exit criteria:

- Catalog slugs are canonical.
- Known drift has a documented resolution.
- New module slugs require owner/status/risk/dependency metadata.

Blockers:

- Disagreement over whether `payments` and `payment_reconciliation` are separate modules.
- Unclear ownership for cross-cutting modules.

### Phase 2: Persistent Entitlement Kernel In Observe Mode

Objective:

Make tenant module access durable without enforcing it yet.

Proposals included:

- persistent module entitlement lifecycle
- backfill from `Organization.requestedModules`
- entitlement decision audit
- observe-mode parity

Prerequisites:

- Catalog frozen.
- Legacy requested modules normalized.
- Migration rollback plan.
- Test tenants identified.

Likely files/systems affected:

- `prisma/schema.prisma`
- `services/modules/module-entitlement.service.ts`
- `services/modules/module-control-contracts.ts`
- `actions/modules/module-control.actions.ts`
- tests under `services/modules/__tests__`
- seed/backfill scripts

Implementation steps:

1. Add entitlement model.
2. Add migration and backfill script.
3. Keep `MODULE_CONTROL_MODE = "observe"`.
4. Evaluate decisions from durable entitlements first, legacy fallback second.
5. Record audit events for entitlement evaluation and changes.
6. Add parity tests against current requested-module behavior.

Validation steps:

- `npm run prisma:validate`
- module entitlement unit tests
- backfill dry-run report
- observe-mode parity report

Exit criteria:

- Existing tenants keep current access.
- Entitlement decisions are stable and explainable.
- Backfill can be rerun safely.

Blockers:

- Unknown requested module values without mapping.
- Migration would change current access unexpectedly.

### Phase 3: Module-Aware Boundary Guards

Objective:

Move module decisions to trusted server boundaries.

Proposals included:

- module-aware `protect`
- action metadata
- denial response contract
- redaction context propagation

Prerequisites:

- Entitlement kernel stable in observe mode.
- Module decision result type stable.
- Canary modules selected.
- Error response conventions confirmed.

Likely files/systems affected:

- `services/_shared/protect.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payments/reconciliation*.ts`
- `actions/accounting/close-assurance.actions.ts`
- `actions/modules/module-control.actions.ts`
- `actions/snapshots/snapshot.actions.ts`
- `services/security/redaction-policy.service.ts`

Implementation steps:

1. Add optional `module` metadata to `protect`.
2. Evaluate module access in observe mode.
3. Attach decision to audit and redaction context.
4. Add safe denial response shape for future enforce mode.
5. Migrate only canary actions first.

Validation steps:

- Focused tests for `protect`.
- Canary action tests.
- Observe-mode log assertions.
- No behavior change in current mode.

Exit criteria:

- Canary actions report would-blocks.
- No legitimate action is blocked in observe mode.
- Denial contract is tested but not broadly enforced.

Blockers:

- Module decision evaluation is too slow.
- Audit events leak sensitive data.

### Phase 4: Route And Navigation Governance

Objective:

Make page access and sidebar visibility derive from governed module state.

Proposals included:

- route module manifest
- navigation from catalog/manifest/RBAC/entitlement
- sidebar validation
- route smoke checks

Prerequisites:

- Module catalog and entitlement kernel stable.
- Route manifest generated or maintained.
- Sidebar ownership map accepted.

Likely files/systems affected:

- `config/sidebar.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- route manifest file
- module control center page
- route smoke tests

Implementation steps:

1. Create route manifest.
2. Validate all dashboard pages map to modules.
3. Add entitlement-aware navigation filtering.
4. Keep server enforcement as the true access control.
5. Add blocked/unavailable diagnostics in module control center.

Validation steps:

- Sidebar filtering tests.
- Route manifest tests.
- Protected route smoke checks.
- Payroll visibility remains correct for entitled users with `payroll.read`.

Exit criteria:

- No orphan sidebar entries.
- No unowned dashboard routes.
- Navigation decisions match server decisions in canary cases.

Blockers:

- Dynamic routes cannot be mapped.
- Navigation performance degrades.

### Phase 5: Read-Model, Snapshot, Evidence, And Redaction Alignment

Objective:

Improve dashboards while protecting single source of truth.

Proposals included:

- module-owned server read models
- snapshot slug alignment
- evidence/proof module alignment
- redaction and sensitive surface controls
- export/report operation separation

Prerequisites:

- Canonical slugs adopted.
- Module-aware guards available.
- Sensitive data taxonomy confirmed.

Likely files/systems affected:

- `services/snapshots/*`
- `actions/snapshots/snapshot.actions.ts`
- `services/evidence/*`
- `services/security/redaction-policy.service.ts`
- dashboard read-model services
- export/report actions

Implementation steps:

1. Align snapshot source module names.
2. Align proof/evidence module references.
3. Ensure read models declare source modules and freshness.
4. Feed module decisions into redaction policy.
5. Separate read/report/export permissions for sensitive modules.

Validation steps:

- Snapshot contract tests.
- Redaction policy tests.
- Export/report tests.
- No client-computed business truth scan.

Exit criteria:

- Dashboards render server-provided truth.
- Sensitive data is consistently redacted across page, proof, report, and export surfaces.
- No duplicate dashboard-only metric sources.

Blockers:

- Existing dashboards compute core metrics client-side.
- Exports bypass redaction.

### Phase 6: Observability, Audit, And Admin Operations

Objective:

Operate modules like enterprise product capabilities.

Proposals included:

- observe-mode analytics
- entitlement operations
- activate/suspend/resume/trial/expire/read-only flows
- dependency resolution UX
- audit and support reports

Prerequisites:

- Entitlements durable.
- Audit model stable.
- Module control center ready for operational workflows.
- Admin permissions confirmed.

Likely files/systems affected:

- module entitlement service/actions
- module control center page
- audit log service
- observability dashboards
- notification/signals services

Implementation steps:

1. Add entitlement lifecycle actions.
2. Add dependency resolver and blocker report.
3. Add would-block analytics dashboard.
4. Add audit history per tenant/module.
5. Add rollback/resume path.

Validation steps:

- Admin action tests.
- Audit tests.
- Dependency tests.
- Sensitive log redaction checks.

Exit criteria:

- Admins can explain current module state.
- Support can identify why a module is blocked.
- Every entitlement change is audited.

Blockers:

- No reliable admin permission boundary.
- Missing audit correlation IDs.

### Phase 7: Enforcement Canary

Objective:

Turn enforcement on for one low-risk module after evidence proves it is safe.

Proposals included:

- enforce-mode canary
- denial UI
- rollback flag
- release gate ratchet

Prerequisites:

- Observe-mode analytics clean.
- Module inventory trusted.
- Entitlement backfill verified.
- Navigation and server decisions agree.
- Support rollback plan ready.

Likely files/systems affected:

- `services/modules/module-control-contracts.ts`
- entitlement evaluation config
- canary module actions/pages
- module control center
- release gate scripts

Implementation steps:

1. Choose read-heavy canary such as `reports` or `analytics`.
2. Enable enforce mode only for that module/surface set.
3. Monitor denies, support reports, and user impact.
4. Validate rollback.
5. Ratchet one gate from report to fail.

Validation steps:

- Canary route/action tests.
- Denial UI tests.
- Audit and observability tests.
- Manual smoke for entitled and non-entitled tenants.

Exit criteria:

- Enforcement blocks only expected access.
- No critical workflows regress.
- Rollback is proven.

Blockers:

- Would-block events are still high or unexplained.
- Support cannot diagnose denials.

### Phase 8: Full Module Platform Hardening

Objective:

Scale enforcement and prepare for future extensibility.

Proposals included:

- module release gates and ratchets
- governed extensibility
- package/extension readiness
- security review discipline
- module operations maturity

Prerequisites:

- At least one enforcement canary successful.
- Gate false positives resolved.
- Security review checklist approved.
- Extension boundary policy documented.

Likely files/systems affected:

- release scripts
- module gates
- extension APIs
- documentation
- CI
- support/admin workflows

Implementation steps:

1. Enforce additional modules by risk order.
2. Ratchet module gates gradually.
3. Add extension contract tests.
4. Add security review checklist for each new module.
5. Define future module packaging rules.

Validation steps:

- `npm run verify:repo` for broad shared-boundary changes.
- Module gate suite.
- Security review checklist.
- Rollback drills.

Exit criteria:

- New routes/actions/sidebar entries cannot bypass module ownership.
- Module lifecycle is operable.
- Extensibility does not create shadow services or shadow truth.

Blockers:

- High-risk modules lack redaction/export controls.
- Enforcement causes unresolved business disruption.

## Risk Register

| Risk | Severity | Why It Matters | Mitigation |
| --- | --- | --- | --- |
| UI-only modularity | High | Looks organized but remains architecturally loose | Require routes/actions/read models/permissions/entitlements per module |
| Entitlement/RBAC confusion | High | Tenant access and user capability become muddled | Keep entitlement and RBAC separate |
| Early enforcement | Critical | Can block legitimate tenants | Observe mode, analytics, canary, rollback |
| Slug drift | High | Breaks audit, redaction, and access checks | Catalog slugs plus alias migration |
| Shadow services | High | Creates duplicate business truth | Services and snapshots remain source of truth |
| Export/report bypass | Critical | Sensitive data leaks through non-page surfaces | Separate export/report permissions and redaction tests |
| Noisy gates | Medium | Teams bypass architecture controls | Start report-only, ratchet after baseline |
| Overbuilt packaging | Medium | Distracts from core platform governance | Delay external packaging until internal control plane works |
| Navigation/server mismatch | High | Users see links that fail, or hidden modules still work by URL | Validate navigation and server guard decisions together |
| Audit gaps | High | Cannot explain module decisions | Correlation IDs and decision audit events |

## What Must Be Done First

The first move is not a big UI rebuild and not full enforcement.

The first move is:

1. Create a report-only Module Surface Inventory Gate.
2. Freeze canonical module catalog status and slug vocabulary.
3. Resolve known drift:
   - `presence` route mismatch
   - `close` versus `close_assurance`
   - `payments` versus `payment_reconciliation` or `finance`
   - legacy `cashDrawer` route naming
   - mixed uppercase/lowercase sidebar permissions
4. Only then add persistent entitlements and guard integration.

This protects the system from bloat because it turns architecture into measurable evidence before adding more platform machinery.

## Recommended First Implementation Slice

Build `scripts/module-surface-gate.js` in report mode.

Outputs:

- `what-next/module-surface-inventory.json`
- `innovation/MODULE_SURFACE_INVENTORY_2026-06-24.md`

Minimum checks:

- catalog modules and route prefixes
- dashboard route ownership
- sidebar item ownership
- server action candidate ownership
- snapshot source module slugs
- redaction policy module slugs
- evidence/proof module references
- known drift list
- high-risk modules not ready for enforcement

Initial `package.json` script:

```json
"module:surface": "node scripts/module-surface-gate.js --mode report"
```

Do not add fail mode until the baseline is reviewed.

## Final Recommendation

Proceed with the module-oriented platform transformation.

The proposal is strong because it aligns Kontava/Aqstoqflow with proven enterprise patterns: modular metadata, entitlement lifecycle, RBAC separation, server-side truth, governed navigation, controlled extensions, security review, auditability, and release gates.

The proposal is weak only if it is implemented as visual reorganization, module-specific shadow services, or full enforcement before inventory and migration evidence exist.

The safest roadmap is governance first, enforcement later:

1. Inventory.
2. Catalog.
3. Entitlements.
4. Guards.
5. Navigation.
6. Read models and redaction.
7. Observability and admin operations.
8. Canary enforcement.
9. Full hardening.

This path gives the system a better professional enterprise shape without sacrificing the single-source-of-truth philosophy that already makes it valuable.
