# Kontava/Aqstoqflow Modular Platform Transformation Proposals And Implementation Sequence

Date: 2026-06-24

Source report: `innovation/KONTAVA_MODULE_ORIENTED_PLATFORM_PROPOSAL_EVALUATION_ROADMAP_2026-06-24.md`

Purpose: isolate every proposal needed to transform Kontava/Aqstoqflow into a modular, enterprise-grade, world-class, professional, modern, robust, secure platform, then state each proposal's strengths, weaknesses, prerequisites, implementation order, validation gate, and blockers.

## Executive Conclusion

The source report is clear: Kontava/Aqstoqflow should become a module-oriented platform, but the transformation must be governed and evidence-led. The platform should not become a collection of isolated module UIs or duplicated business logic.

The winning architecture is:

- module catalog owns module identity
- module entitlements own tenant access
- RBAC owns user capability inside entitled modules
- server services own business truth
- snapshots and read models own dashboard-ready truth
- redaction and evidence services own sensitive data handling
- release gates prevent drift
- dashboards render trusted server data

The first implementation slice must be a report-only Module Surface Inventory Gate. This creates the evidence needed before schema changes, guard changes, navigation changes, or enforcement.

## Implementation Order At A Glance

| Order | Proposal | Why This Order |
| --- | --- | --- |
| 0 | Module Surface Inventory Gate | Reveals the real route/action/sidebar/snapshot/redaction surface before changing behavior. |
| 1 | Canonical Module Catalog Governance | Freezes module names, statuses, owners, dependencies, and risk levels. |
| 2 | Canonical Module Slug Vocabulary | Removes naming drift before entitlements and guards depend on slugs. |
| 3 | Persistent Module Entitlement Lifecycle | Makes tenant module access durable while staying in observe mode. |
| 4 | Module-Aware `protect` Wrapper | Moves module decisions to trusted server boundaries. |
| 5 | Route Module Manifest | Ensures dashboard routes are owned by modules. |
| 6 | Navigation From Catalog, Manifest, RBAC, And Entitlement | Makes sidebar visibility a derived access decision instead of separate truth. |
| 7 | Module-Owned Server Read Models | Lets dashboards improve without moving business truth into clients. |
| 8 | Redaction, Evidence, And Sensitive Surface Controls | Protects payroll, payments, supplier banking, compliance, close, export, and report surfaces. |
| 9 | Observe-Mode Analytics Before Enforcement | Measures would-blocks and dependency gaps before blocking users. |
| 10 | Module Operations Model | Gives admins/support safe lifecycle operations for modules. |
| 11 | Module Release Gates And Ratchets | Prevents drift from returning once the baseline is trusted. |
| 12 | Governed Extensibility And Future Module Packaging | Only after the internal module control plane is stable. |

## Proposal Inventory

### 1. Module Surface Inventory Gate

Purpose:

Create a report-only gate that maps modules to every platform surface: dashboard routes, server actions, service folders, sidebar entries, snapshots, evidence subjects, redaction policies, reports, exports, and jobs.

Problem it solves:

The platform cannot safely enforce module access until it knows every surface that must be governed.

Strong points:

- Safest first move.
- Finds drift without changing user behavior.
- Creates objective evidence for all later phases.
- Reveals orphan routes, orphan sidebar entries, invalid module slugs, and high-risk unowned surfaces.

Weak points:

- Initial output can be noisy.
- Static analysis may miss dynamic route or action behavior.
- Report-only gates can be ignored if no one owns cleanup.

Prerequisites:

- Existing module catalog is readable.
- Dashboard routes are discoverable.
- Sidebar config is discoverable.
- Snapshot and redaction module references can be extracted.

Implementation manner:

1. Build `scripts/module-surface-gate.js` in report mode.
2. Parse catalog slugs, route prefixes, module statuses, owners, dependencies, and permissions.
3. Enumerate dashboard pages.
4. Enumerate server action files.
5. Enumerate sidebar links.
6. Extract snapshot source module names.
7. Extract redaction policy module slugs.
8. Extract proof/evidence module references.
9. Output JSON and Markdown inventory.

Implementation order:

Phase 0. This must happen before schema changes, navigation changes, or enforcement.

Validation gate:

`module:surface --mode report`

Blockers:

- Catalog cannot be parsed.
- Route inventory is incomplete.
- Findings are too noisy to trust.

### 2. Canonical Module Catalog Governance

Purpose:

Make the module catalog the source of truth for module identity, status, owner, route prefixes, dependencies, risk level, and permissions.

Problem it solves:

Prevents module drift across routes, navigation, snapshots, evidence, redaction, reports, and release gates.

Strong points:

- Gives every module one name and one owner.
- Enables dependency validation.
- Creates a stable base for entitlement, route, navigation, and gate work.
- Supports enterprise product-family clarity.

Weak points:

- Can become a static code spreadsheet if not validated.
- Too much process can slow normal delivery.
- Catalog status can be false if route/action inventory is not automated.

Prerequisites:

- Phase 0 inventory completed.
- Module statuses defined: production, beta, internal, future, unavailable, legacy.
- Decisions made for known drift such as `presence`, `close`, `payments`, `cashDrawer`, and reconciliation naming.

Implementation manner:

1. Review every catalog module.
2. Assign owner, status, risk level, permissions, dependencies, and route prefixes.
3. Mark modules without real surfaces as future, internal, or unavailable.
4. Add dependency closure tests.
5. Add catalog validation.

Implementation order:

Phase 1. It follows inventory and precedes entitlements.

Validation gate:

`module:catalog`

Blockers:

- Unclear ownership for cross-cutting modules.
- Disagreement over whether payments and payment reconciliation are separate modules.
- Modules declared available without route or action ownership.

### 3. Canonical Module Slug Vocabulary

Purpose:

Use catalog slugs everywhere: snapshots, evidence, redaction, audit logs, route manifests, action metadata, reports, and release gates.

Problem it solves:

Prevents subtle access, audit, and reporting bugs caused by names such as `close` versus `close_assurance` or `payments` versus `payment_reconciliation`.

Strong points:

- Simple rule with high architectural value.
- Improves auditability.
- Makes entitlement and redaction decisions comparable.
- Reduces duplicate terminology.

Weak points:

- Existing data may use old names.
- Some domains need careful separation, especially payments, finance, and payment reconciliation.
- Naive renames can break reports or historical audit lookups.

Prerequisites:

- Catalog governance accepted.
- Alias and migration map defined.
- Snapshot, evidence, redaction, and audit references scanned.

Implementation manner:

1. Define canonical slug list from the catalog.
2. Define explicit legacy aliases.
3. Normalize current code references.
4. Preserve historical audit compatibility through alias mapping.
5. Add slug validation gates.

Implementation order:

Phase 1. It belongs with catalog governance and must precede entitlements and guards.

Validation gate:

`module:slugs`

Blockers:

- Slug taxonomy is unresolved.
- Historical data cannot be mapped safely.

### 4. Persistent Module Entitlement Lifecycle

Purpose:

Create durable tenant module entitlement state instead of relying only on derived access from `Organization.requestedModules`.

Problem it solves:

Makes module access operationally real: active, trial, read-only, suspended, expired, unavailable, legacy default, and system default.

Strong points:

- Separates tenant entitlement from user RBAC.
- Supports lifecycle operations.
- Enables audit, expiry, suspension, rollback, and support diagnostics.
- Creates the foundation for professional licensing and module operations.

Weak points:

- Requires schema and migration work.
- Bad backfill can block legitimate tenants.
- Needs compatibility with existing requested-module behavior.

Prerequisites:

- Catalog frozen.
- Legacy requested module values normalized.
- Migration/backfill plan created.
- Observe-mode parity tests designed.
- Rollback plan prepared.

Implementation manner:

1. Add module entitlement schema.
2. Add service methods for entitlement evaluation and lifecycle state.
3. Backfill from `Organization.requestedModules`.
4. Keep module mode in observe.
5. Compare legacy derived decisions to durable entitlement decisions.
6. Audit entitlement changes.

Implementation order:

Phase 2. It must happen after catalog and slug governance, but before server enforcement.

Validation gate:

`module:entitlement`

Blockers:

- Unknown requested module values without mapping.
- Backfill changes current access unexpectedly.
- Entitlement decisions do not match observe-mode expectations.

### 5. Module-Aware `protect` Wrapper

Purpose:

Extend the existing protected server action wrapper so actions can declare module slug, surface type, surface name, access intent, dependency policy, and enforcement mode.

Problem it solves:

Moves module access decisions to trusted server boundaries instead of relying on UI visibility.

Strong points:

- Reuses the existing security boundary.
- Preserves RBAC and tenant guard discipline.
- Supports observe-mode logging before enforcement.
- Centralizes denial responses, audit context, and correlation IDs.

Weak points:

- Shared platform primitive, so mistakes have broad impact.
- Bad defaults can over-block or under-protect.
- Migrating all actions at once would be risky.

Prerequisites:

- Entitlement evaluator stable.
- Module decision result contract stable.
- Safe denial response format defined.
- Canary actions selected.

Implementation manner:

1. Add optional `module` metadata to `protect`.
2. Evaluate module access in observe mode.
3. Attach module decision to audit and redaction context.
4. Add denial response shape for future enforce mode.
5. Migrate canary actions only.

Implementation order:

Phase 3. It follows durable entitlements and starts with canary actions.

Validation gate:

Focused `protect` tests for observe/enforce decisions, missing dependencies, denial shape, audit logging, and redaction context propagation.

Blockers:

- Module decision evaluation is slow.
- Audit events leak sensitive data.
- Canary actions produce unexpected would-blocks.

### 6. Route Module Manifest

Purpose:

Map every dashboard route to module slug, permission, surface type, owner service, risk level, and release status.

Problem it solves:

Prevents dashboard routes from existing outside module ownership.

Strong points:

- Makes ownership visible.
- Supports navigation generation.
- Supports route smoke checks.
- Helps release review and security review.

Weak points:

- Manual manifests can drift.
- Generated manifests can be hard to annotate.
- Shared routes need explicit exemption rules.

Prerequisites:

- Catalog frozen.
- Route inventory complete.
- Shared route exemption policy defined.

Implementation manner:

1. Generate or maintain a route manifest.
2. Map every dashboard route to one primary module.
3. Add explicit exemptions for truly shared routes.
4. Validate route prefixes against catalog.
5. Add route smoke checks for protected routes.

Implementation order:

Phase 4, before entitlement-aware navigation.

Validation gate:

`module:routes`

Blockers:

- Dynamic routes cannot be mapped.
- A route has multiple plausible owners and no primary owner.

### 7. Navigation From Catalog, Manifest, RBAC, And Entitlement

Purpose:

Make sidebar visibility a derived result of catalog metadata, route manifest, tenant entitlement, and user RBAC.

Problem it solves:

Stops navigation from being a separate access system with duplicated module knowledge.

Strong points:

- Removes static sidebar drift.
- Keeps modules visible only when user and tenant context permit them.
- Supports admin diagnostics in observe mode.
- Helps the product feel like a coherent professional suite.

Weak points:

- Entitlement checks can slow navigation if not cached.
- Hidden navigation can confuse users if denial reasons are not available.
- Navigation hiding must not replace server-side enforcement.

Prerequisites:

- Route manifest available.
- Entitlement decision cache or read model available.
- RBAC helper stable.
- UX for unavailable or blocked modules designed.

Implementation manner:

1. Add sidebar module ownership metadata.
2. Filter links by RBAC and entitlement decisions.
3. Keep observe-mode diagnostics visible to admins.
4. Ensure server guards remain authoritative.
5. Test representative role and entitlement combinations.

Implementation order:

Phase 4, after route manifest and after module-aware guard foundations.

Validation gate:

`module:navigation`

Blockers:

- Navigation decisions disagree with server decisions.
- Performance degrades.
- Payroll or other entitled modules disappear for valid users.

### 8. Module-Owned Server Read Models

Purpose:

Expose dashboard-ready module data through server services and snapshots while keeping business truth in domain services.

Problem it solves:

Allows rich module dashboards without moving business calculations into the client.

Strong points:

- Preserves single source of truth.
- Supports modern dashboard UX.
- Keeps expensive calculations server-side.
- Reduces duplicated metrics.

Weak points:

- Can become another service layer if too broad.
- Snapshot freshness needs visible semantics.
- Cross-module dashboards can be hard to own.

Prerequisites:

- Canonical slugs adopted.
- Existing service ownership confirmed.
- Snapshot freshness and blocker contract defined.
- No-client-business-truth policy accepted.

Implementation manner:

1. Define module read-model contracts.
2. Ensure read models reference source modules.
3. Include freshness, blockers, and redaction state.
4. Keep business calculations in existing services.
5. Replace client-computed business metrics with server-provided values.

Implementation order:

Phase 5. It follows guard and navigation foundations.

Validation gate:

`module:read-models`

Blockers:

- Existing dashboards compute core metrics client-side.
- Read models duplicate business calculations from services.

### 9. Redaction, Evidence, And Sensitive Surface Controls

Purpose:

Connect module decisions to redaction, proof/evidence trails, reports, exports, and sensitive field visibility.

Problem it solves:

Enterprise access control is not only about opening a module. It also governs which sensitive information can be seen, proven, reported, exported, printed, or emailed.

Strong points:

- Protects payroll amounts, supplier bank details, payments, compliance payloads, and close evidence.
- Makes proof and audit trails enterprise-grade.
- Supports operation-specific permissions for reports and exports.
- Prevents cosmetic-only UI controls.

Weak points:

- Can over-redact and reduce business usefulness.
- Can under-redact if module decision context is not passed everywhere.
- Exports and reports are easy to forget.

Prerequisites:

- Module-aware `protect` available.
- Canonical module slugs available.
- Sensitive data categories confirmed.
- Export/report permissions separated from generic read permissions.

Implementation manner:

1. Feed module decisions into redaction policy.
2. Align evidence/proof references with catalog slugs.
3. Separate page, report, export, print, and email controls.
4. Add sensitive module tests for payroll, supplier bank, payments, compliance, and close.
5. Verify redaction applies consistently outside the UI.

Implementation order:

Phase 5, alongside read-model and snapshot alignment.

Validation gate:

`module:redaction`

Blockers:

- Exports bypass redaction.
- Reports inherit broad read permissions.
- Sensitive logs include unredacted details.

### 10. Observe-Mode Analytics Before Enforcement

Purpose:

Collect would-block events by tenant, module, surface, missing dependency, stale requested module, and unknown module.

Problem it solves:

Prevents blind enforcement.

Strong points:

- Makes enforcement evidence-based.
- Shows tenant cleanup needs before users are blocked.
- Gives support and admins visibility into rollout risk.
- Supports safe canary enforcement.

Weak points:

- Event volume can become noisy.
- Logs may include sensitive context if not redacted.
- Analytics without ownership can be ignored.

Prerequisites:

- Module decision audit events.
- Redacted event shape.
- Would-block dashboard or report.
- Owner for triage.

Implementation manner:

1. Emit would-block events in observe mode.
2. Aggregate by tenant, module, surface, and blocker.
3. Dedupe noisy repeated events.
4. Show trends in module control center or admin report.
5. Use analytics to select enforcement canaries.

Implementation order:

Phase 6. It must be in place before Phase 7 enforcement.

Validation gate:

`module:observe`

Blockers:

- Would-block events are too noisy.
- Logs contain sensitive data.
- No owner is assigned to triage.

### 11. Module Operations Model

Purpose:

Provide safe admin operations for activate, suspend, resume, trial, expire, read-only downgrade, dependency resolution, legacy migration, audit, and support diagnostics.

Problem it solves:

Turns module access from code behavior into an operable enterprise product capability.

Strong points:

- Supports onboarding, sales, support, compliance, and renewals.
- Makes module state explainable.
- Enables rollback and recovery.
- Helps admins understand blocked modules.

Weak points:

- Can become a billing platform too early.
- High-risk module operations need strict permissions.
- Requires support and admin playbooks.

Prerequisites:

- Durable entitlement model.
- Audit logging.
- Admin RBAC.
- Dependency resolver.
- Denial reason contract.

Implementation manner:

1. Add lifecycle actions.
2. Add dependency resolver and blocker reports.
3. Add tenant/module audit history.
4. Add rollback/resume flow.
5. Add admin diagnostics in module control center.

Implementation order:

Phase 6, before enforcement canary.

Validation gate:

Admin action tests, dependency tests, audit tests, and sensitive log redaction checks.

Blockers:

- Admin permission boundary is unreliable.
- Entitlement changes are not audited.
- Support cannot explain denied access.

### 12. Module Release Gates And Ratchets

Purpose:

Add CI/report gates that prevent catalog, route, action, navigation, snapshot, evidence, redaction, and entitlement drift.

Problem it solves:

Keeps the modular architecture from decaying after cleanup.

Strong points:

- Makes architecture enforceable.
- Fits the existing release gate pattern.
- Allows report mode before fail mode.
- Prevents new routes/actions/sidebar entries from bypassing module ownership.

Weak points:

- Too many gates can slow delivery.
- False positives can create gate fatigue.
- Gates need owners and ratchet discipline.

Prerequisites:

- Inventory output trusted.
- Baseline accepted.
- Allowlist and exemption process defined.
- False positives reviewed.

Implementation manner:

1. Start gates in report mode.
2. Review baseline findings.
3. Add allowlist for intentional exemptions.
4. Ratchet individual gates to fail mode after cleanup.
5. Include gates in release verification.

Implementation order:

Phase 7 and Phase 8. Report mode can start earlier, fail mode waits.

Validation gate:

`module:surface`, `module:entitlement`, `module:navigation`, `module:snapshot-slugs`, `module:redaction`.

Blockers:

- Gate findings are not trusted.
- Exemption process is unclear.
- Teams bypass gates for urgent work.

### 13. Governed Extensibility And Future Module Packaging

Purpose:

Create controlled extension contracts for future add-ons, integrations, partner capabilities, and package-style distribution.

Problem it solves:

Allows the platform to grow without uncontrolled one-off customization.

Strong points:

- Prepares for partner ecosystems later.
- Encourages versioned contracts.
- Supports professional extension review.
- Aligns with enterprise platform maturity.

Weak points:

- Premature packaging distracts from core governance.
- External modules increase security review burden.
- Weak extension APIs can lock in bad contracts.

Prerequisites:

- Internal module control plane stable.
- Security review checklist approved.
- Extension boundary policy documented.
- Observability and rollback available.

Implementation manner:

1. Finish internal module governance first.
2. Define allowed extension surfaces.
3. Require security review for new modules/extensions.
4. Add extension contract tests.
5. Add upgrade and rollback compatibility checks.

Implementation order:

Phase 8 only. This must be delayed until internal controls are trusted.

Validation gate:

Package security review, extension contract tests, data access review, and upgrade compatibility checks.

Blockers:

- Core module control plane is not stable.
- Extensions can create shadow services or shadow truth.
- Security review cannot be enforced.

## Phase Roadmap

### Phase 0: Inventory And Drift Audit

Objective:

Know exactly what exists before changing behavior.

Proposals included:

- Module Surface Inventory Gate
- initial catalog review
- slug drift scan
- route/action/sidebar/snapshot/redaction inventory

Prerequisites:

- Source architecture report accepted.
- No enforcement planned in this phase.
- `innovation/` and `what-next/` output paths available.

Implementation steps:

1. Build report-only inventory script.
2. Enumerate catalog modules.
3. Enumerate dashboard routes.
4. Enumerate actions, sidebar entries, snapshots, redaction policies, and evidence references.
5. Produce drift report.

Validation steps:

- Run report mode.
- Manually verify high-risk findings.
- Confirm known drift appears.

Exit criteria:

- Every dashboard route is classified.
- Every catalog route prefix is matched or intentionally marked future/unavailable.
- Every snapshot source module is mapped or flagged.
- No behavior changed.

Blockers:

- Inventory is incomplete or noisy.

### Phase 1: Canonical Catalog And Slug Governance

Objective:

Freeze module vocabulary and metadata.

Proposals included:

- Canonical Module Catalog Governance
- Canonical Module Slug Vocabulary

Prerequisites:

- Phase 0 complete.
- Module status taxonomy agreed.
- Decisions made for `presence`, `close`, `payments`, `cashDrawer`, and reconciliation naming.

Implementation steps:

1. Normalize module slugs.
2. Add status, owner, risk, permissions, dependencies, and aliases.
3. Resolve known drift.
4. Add catalog and slug tests.

Validation steps:

- Catalog tests.
- Slug scan over snapshots, redaction, evidence, and reports.
- No duplicate route prefixes.

Exit criteria:

- Catalog slugs are canonical.
- Known drift has documented resolution.
- New modules require complete metadata.

Blockers:

- Ownership disputes or unresolved terminology.

### Phase 2: Persistent Module Entitlement Kernel

Objective:

Make tenant module access durable while preserving current behavior.

Proposals included:

- Persistent Module Entitlement Lifecycle

Prerequisites:

- Catalog and slug governance complete.
- Legacy requested modules normalized.
- Migration rollback plan ready.

Implementation steps:

1. Add entitlement schema.
2. Add entitlement service.
3. Backfill from `Organization.requestedModules`.
4. Keep observe mode.
5. Compare old and new decisions.

Validation steps:

- `npm run prisma:validate`
- entitlement unit tests
- backfill dry-run report
- observe-mode parity report

Exit criteria:

- Existing tenant access is preserved.
- Decisions are stable and explainable.
- Backfill is safely repeatable.

Blockers:

- Backfill changes expected access.
- Unknown module values cannot be mapped.

### Phase 3: Module-Aware Server Guards

Objective:

Move module decisions to trusted server boundaries.

Proposals included:

- Module-Aware `protect` Wrapper

Prerequisites:

- Entitlement kernel stable in observe mode.
- Decision result type stable.
- Canary actions selected.

Implementation steps:

1. Extend `protect` with optional module metadata.
2. Evaluate access in observe mode.
3. Attach decisions to audit and redaction context.
4. Add denial shape for later enforcement.
5. Migrate canary actions only.

Validation steps:

- Focused `protect` tests.
- Canary action tests.
- Observe logging tests.

Exit criteria:

- Canary actions report module decisions.
- No behavior breaks in observe mode.
- Denial contract is tested.

Blockers:

- Module evaluation is slow.
- Audit data is unsafe.

### Phase 4: Route And Navigation Governance

Objective:

Make pages and sidebar visibility derive from governed module state.

Proposals included:

- Route Module Manifest
- Navigation From Catalog, Manifest, RBAC, And Entitlement

Prerequisites:

- Catalog stable.
- Entitlement kernel stable.
- Server guard foundation in place.

Implementation steps:

1. Create route manifest.
2. Validate route ownership.
3. Add entitlement-aware sidebar filtering.
4. Preserve server guards as authority.
5. Add blocked/unavailable diagnostics.

Validation steps:

- Route manifest tests.
- Sidebar filtering tests.
- Protected route smoke checks.
- Payroll visibility check for entitled users with `payroll.read`.

Exit criteria:

- No orphan sidebar entries.
- No unowned dashboard routes.
- Navigation and server decisions agree in canary cases.

Blockers:

- Dynamic routes cannot be mapped.
- Navigation performance degrades.

### Phase 5: Read-Model, Snapshot, Evidence, And Redaction Alignment

Objective:

Improve dashboards while protecting single source of truth and sensitive data.

Proposals included:

- Module-Owned Server Read Models
- Redaction, Evidence, And Sensitive Surface Controls

Prerequisites:

- Canonical slugs adopted.
- Module-aware guards available.
- Sensitive data taxonomy confirmed.

Implementation steps:

1. Align snapshot source module names.
2. Align proof/evidence module references.
3. Ensure read models declare source modules and freshness.
4. Feed module decisions into redaction policy.
5. Separate read, report, export, print, and email controls.

Validation steps:

- Snapshot contract tests.
- Redaction policy tests.
- Export/report tests.
- No client-computed business truth scan.

Exit criteria:

- Dashboards render server-provided truth.
- Sensitive data is protected across pages, proofs, reports, and exports.
- No duplicate dashboard-only metric sources.

Blockers:

- Exports bypass redaction.
- Dashboards compute core business metrics client-side.

### Phase 6: Observability, Audit, And Admin Operations

Objective:

Make modules operable like enterprise product capabilities.

Proposals included:

- Observe-Mode Analytics Before Enforcement
- Module Operations Model

Prerequisites:

- Durable entitlements.
- Audit model stable.
- Module control center ready for operational workflows.
- Admin permissions confirmed.

Implementation steps:

1. Emit and aggregate would-block events.
2. Add entitlement lifecycle actions.
3. Add dependency resolver.
4. Add tenant/module audit history.
5. Add rollback and resume paths.

Validation steps:

- Admin action tests.
- Audit tests.
- Dependency tests.
- Sensitive log redaction tests.

Exit criteria:

- Admins can explain current module state.
- Support can diagnose blocked modules.
- Every entitlement change is audited.

Blockers:

- No reliable admin boundary.
- Missing audit correlation IDs.
- Would-block events are too noisy.

### Phase 7: Enforcement Canary

Objective:

Turn enforcement on for one low-risk module after evidence proves it is safe.

Proposals included:

- Module Release Gates And Ratchets, limited canary use

Prerequisites:

- Observe-mode analytics clean.
- Entitlement backfill verified.
- Navigation and server decisions agree.
- Rollback plan ready.

Implementation steps:

1. Choose a low-risk read-heavy module such as `reports` or `analytics`.
2. Enable enforcement only for that module and surface set.
3. Monitor denies and support reports.
4. Validate rollback.
5. Ratchet one trusted gate from report mode to fail mode.

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

- Would-blocks are unexplained.
- Support cannot diagnose denials.

### Phase 8: Full Module Platform Hardening

Objective:

Scale enforcement and prepare for future extensibility.

Proposals included:

- Module Release Gates And Ratchets
- Governed Extensibility And Future Module Packaging

Prerequisites:

- One enforcement canary succeeded.
- Gate false positives resolved.
- Security review checklist approved.
- Extension boundary policy documented.

Implementation steps:

1. Enforce additional modules by risk order.
2. Ratchet gates gradually.
3. Add extension contract tests.
4. Add security review checklist for every new module.
5. Define future packaging and upgrade compatibility rules.

Validation steps:

- Module gate suite.
- Security review checklist.
- Rollback drills.
- `npm run verify:repo` for broad shared-boundary changes.

Exit criteria:

- New routes/actions/sidebar entries cannot bypass module ownership.
- Module lifecycle is operable.
- Extensions cannot create shadow services or shadow truth.

Blockers:

- High-risk modules lack redaction/export controls.
- Enforcement causes unresolved business disruption.
- Extension controls are not enforceable.

## What Must Be Done First

Do first:

1. Build the report-only Module Surface Inventory Gate.
2. Freeze canonical module status and slug vocabulary.
3. Resolve known drift:
   - `presence` route mismatch
   - `close` versus `close_assurance`
   - `payments` versus `payment_reconciliation` or `finance`
   - legacy `cashDrawer` route naming
   - mixed uppercase/lowercase sidebar permissions
4. Only then add persistent entitlements.
5. Only after that extend server guards and navigation.

## What Should Be Delayed

Delay these until the internal control plane is stable:

- full enforcement
- marketplace/package distribution
- partner module extensions
- fail-mode gates for noisy inventory checks
- high-risk enforcement for POS, payroll runs, payment reconciliation, close assurance, and accounting postings

## Highest-Risk Proposals

Highest risk:

- Persistent Module Entitlement Lifecycle
- Module-Aware `protect` Wrapper
- Redaction, Evidence, And Sensitive Surface Controls
- Enforcement Canary
- Governed Extensibility And Future Module Packaging

Why:

These touch tenant access, sensitive data, core security boundaries, or future external extension surfaces.

## Foundational Proposals

Foundational:

- Module Surface Inventory Gate
- Canonical Module Catalog Governance
- Canonical Module Slug Vocabulary
- Persistent Module Entitlement Lifecycle
- Module-Aware `protect` Wrapper

Without these, the platform can look modular while staying architecturally loose.

## Safest Early Slice

Safest early slice:

Build `scripts/module-surface-gate.js` in report mode and save:

- `what-next/module-surface-inventory.json`
- `innovation/MODULE_SURFACE_INVENTORY_2026-06-24.md`

Initial script:

```json
"module:surface": "node scripts/module-surface-gate.js --mode report"
```

Do not add fail mode until the baseline is reviewed and trusted.

## Governing Principles

Keep these principles throughout implementation:

- Services own business truth.
- Snapshots and read models own dashboard-ready truth.
- Module catalog owns module identity.
- Module entitlements own tenant access state.
- RBAC owns user capability inside entitled modules.
- Dashboards render trusted server-provided data.
- No client-computed business truth.
- No duplicated metrics.
- No module-specific shadow services.
- No speculative bloat.
- No enforcement before inventory, migration, and observe-mode evidence.

## Final Recommendation

Proceed with the modular platform transformation, but keep it governance-first.

The correct order is:

1. Inventory.
2. Catalog.
3. Slugs.
4. Entitlements.
5. Server guards.
6. Route and navigation governance.
7. Read models, snapshots, evidence, and redaction.
8. Observability and admin operations.
9. Canary enforcement.
10. Full hardening and future extensibility.

This order gives Kontava/Aqstoqflow a professional enterprise architecture without weakening the single-source-of-truth philosophy that the system is already trying to protect.
