# AqStoqFlow Module Release Gates And Rollback

Date: 2026-07-12

Skill: `aqstoqflow-module-release-gates-and-rollback`

Lane: Release gates, tests, ratchets, and rollback strategy

Mode: report only; no hard enforcement, schema, runtime guard, or application behavior change in this pass

## Executive Verdict

AqStoqFlow is ready to define the module release-gate ladder, but it is not ready to turn module hard enforcement into a broad fail-mode gate.

The correct next maturity move is a staged ratchet:

1. keep the current module surface inventory as report-mode evidence;
2. add no-new-gap baselines for new surfaces only;
3. graduate selected categories from report to warn to fail;
4. require rollback evidence before any named hard-enforcement pilot;
5. enforce module-by-module only after durable entitlements, centralized guards, output leakage controls, Workbench states, and approval exist.

The current platform has enough foundation to preserve progress: canonical slugs, observe-mode decisions, would-block audit logs, guard seams, current inventory output, and focused tests. It does not yet have enough authoritative entitlement truth or full surface coverage to block releases broadly.

## Sources Inspected

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_ACCESS_GUARD_CONTRACT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SURFACE_REGISTRY_RATCHET_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_LEAKAGE_PREVENTION_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_ENFORCEMENT_PILOT_PLAN_2026-07-12.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `lib/security/auth-session.ts`
- `config/sidebar.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`
- `package.json`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `actions/modules/__tests__/module-control.actions.test.ts`
- `scripts/__tests__/module-surface-inventory.test.js`

## Current Release-Gate Posture

The platform already has strong release-gate habits. `package.json` wires `policy:gates` into several fail-mode controls, including inventory boundary, service boundary, API guard inventory, identity abuse, ledger close truth, payment cash truth, purchasing AP, offline POS replay, statutory country pack, report trust export, settings surface, workflow assurance, moat release, receipt token config, payroll immutability, hard delete, regulatory hardcode, demo trust, raw error boundary, CI release, Prisma migration safety, release secrets, and release evidence gates.

The module gate is different today:

- `npm run module:surface:inventory` exists.
- It runs `node scripts/module-surface-inventory.js --mode report`.
- It writes `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json`.
- It is intentionally not part of `policy:gates`.
- The scanner accepts `--mode`, but current code renders report evidence and does not implement fail thresholds.
- Current inventory coverage is `sidebar`, `moduleCatalog`, `dashboardRoot`, and `actionsRoot`.
- APIs, reports, exports, jobs, webhooks, proof surfaces, BI cards, public token flows, and scheduled processors still need first-class registry coverage.

This posture is correct for discovery. It is not sufficient for enterprise modular SaaS release governance.

## Current Module Enforcement Posture

The runtime remains observe-first:

- `MODULE_CONTROL_MODE` is `observe`.
- `ModuleControlCenterData.hardEnforcementEnabled` is `false`.
- `observeModuleAccess()` derives live decisions from `Organization.requestedModules` unless explicit entitlements are supplied to lower-level evaluation.
- `evaluateModuleEntitlement()` can return `allow`, `would_block`, or `deny`, but observe mode allows traffic while recording would-block evidence.
- `recordModuleEntitlementDecision()` writes would-block observations as `MODULE_ENTITLEMENT_OBSERVED` audit events.
- `requireApiModuleAccess()` and `protect({ module })` already contain server-side module guard seams, but the platform has not converged every surface onto one canonical `requireModuleAccess()` contract.
- Sidebar links carry `moduleSlug`, but sidebar visibility is not module security.

## Current Baseline

Inventory evidence before this lane:

- Generated at: `2026-07-12T08:41:58.546Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Source coverage: `sidebar=present`, `moduleCatalog=present`, `dashboardRoot=present`, `actionsRoot=present`
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Delegated re-export: 1
- Not applicable records: 6

This baseline should be treated as the first historical ratchet baseline. It must not become an immediate whole-repo fail gate until legacy gaps are either remediated or explicitly grandfathered in a baseline file.

## What Is Working

The module vocabulary is canonical enough to support release governance.

The observe-mode evaluator protects tenants from sudden disruption while exposing would-block evidence.

RBAC and module entitlement are conceptually separated. The tests already prove wildcard RBAC does not bypass module entitlement decisions.

Audit evidence exists for would-block module decisions.

The inventory scanner gives a repeatable snapshot of current sidebar, module service, page, and action surfaces.

The repo already has a mature pattern of report and fail scripts. Module gates should reuse that style instead of inventing a parallel release process.

## What Is Not Working

The inventory is not yet a ratchet.

`Organization.requestedModules` still participates in live entitlement derivation, so release gates cannot claim durable subscription truth.

The current scanner does not cover all leakage-prone surfaces.

Guard behavior is still spread across `checkPermission()`, `requirePermission()`, `requireAnyPermission()`, `FinanceRouteAccess`, `protect()`, `requireApiModuleAccess()`, and manual `observeModuleAccess()` calls.

The Module Workbench states are specified but not implemented as runtime unavailable, read-only, suspended, expired, trial, and dependency-missing experiences.

There is no per-pilot rollback flag contract in code yet.

There is no release artifact index that ties a module enforcement change to inventory evidence, focused tests, deny evidence, audit evidence, UI-state evidence, rollback smoke evidence, and approval.

## Blockers To Broad Fail Mode

- No explicit user approval for hard enforcement.
- No durable tenant entitlement table is live.
- `Organization.requestedModules` remains onboarding intent and migration input, not entitlement truth.
- Current inventory still has 34 unmapped records and 16 missing-permission records.
- Inventory coverage excludes key non-page output surfaces.
- Report/export/job/webhook leakage controls are specified but not implemented.
- Centralized module access guard contract is specified but not implemented across all surface types.
- Rollback flags and rollback smoke tests do not exist yet.
- Pilot cohort and approval rules are not defined.

## Gate Ladder

### Gate 0: Report-Only Inventory

Status: current.

Command:

```powershell
npm run module:surface:inventory
```

Purpose:

- refresh module inventory evidence;
- preserve baseline counts;
- avoid release blocking while discovery remains incomplete.

Exit behavior: never blocks.

### Gate 1: Baseline File Creation

Status: next implementation candidate.

Required artifact:

- `what-next/module-surface-inventory-ratchet-baseline.json`

The baseline must record:

- generated timestamp;
- scanner version or commit;
- total records;
- count by surface type;
- count by classification;
- list of grandfathered unmapped records;
- list of grandfathered missing-permission records;
- list of grandfathered guard-none records;
- explicit expiry or cleanup owner for every grandfathered gap.

Exit behavior: report-only until reviewed.

### Gate 2: No-New-Gap Warn Mode

Status: should come before fail mode.

Rules:

- warn when a new module-required page, action, API, report, export, job, webhook, proof surface, BI surface, or token-bound public surface lacks module ownership;
- warn when a new protected user-facing surface lacks permission metadata;
- warn when a new page has `guard: none`;
- warn when a new surface uses an unknown module slug;
- warn when a new surface introduces a dependency gap not declared in the catalog.

Exit behavior: non-blocking in local development; visible in release evidence.

### Gate 3: No-New-Gap Fail Mode

Status: future fail-mode candidate after warn-mode burn-in.

Rules:

- fail only on new or changed surfaces that violate the Gate 2 rules;
- do not fail the whole repo for existing grandfathered records;
- require an explicit baseline update report when legacy gaps are intentionally remediated or reclassified.

Exit behavior: blocks `policy:gates` only after baseline review.

### Gate 4: Guard Contract Ratchet

Status: future gate after `requireModuleAccess()` exists.

Rules:

- every new page/action/API/report/export/job/webhook surface must use the canonical module guard wrapper or be explicitly marked not applicable;
- RBAC checks must remain separate from module entitlement checks;
- server-side guard decisions must happen before data access for deny-capable surfaces;
- wildcard RBAC must not bypass module entitlement;
- safe unavailable errors must not disclose cross-tenant or inactive-module data.

Exit behavior: starts warn, then fail for new surfaces.

### Gate 5: Leakage Prevention Ratchet

Status: future gate after source-module registry exists.

Rules:

- reports and exports must declare owner module and source modules;
- jobs and webhooks must declare owner module, source modules, access intent, and idempotency/audit policy;
- proof surfaces and BI cards must declare source-module dependencies;
- output generation must deny, redact, or partial-render when a source module is inactive, suspended, expired, read-only, or dependency-missing;
- export paths must keep fresh-auth and redaction requirements where applicable.

Exit behavior: report first, then fail only for new leakage-prone surfaces.

### Gate 6: Pilot Enforcement Gate

Status: blocked until explicit approval.

Required before enabling a pilot:

- named module, surface, surface type, and access intent;
- named pilot cohort;
- durable entitlement truth or explicit pilot fixtures;
- canonical module guard wrapper on the surface;
- RBAC-before-data and module-before-data tests;
- deny-path test;
- allow-path test;
- audit evidence test;
- safe unavailable UI test;
- rollback flag;
- rollback smoke test;
- before/after inventory evidence;
- support and owner/admin operational playbook.

Recommended first concrete future pilot remains `accounting.trial_balance.report_read`, because the page already verifies `accounting.reports.read` before data access and denied RBAC prevents `getTrialBalanceAction()` from running. It should still run in shadow/observe first and must exclude exports until source-module leakage policy is implemented.

Exit behavior: blocks only the named pilot surface when approved.

### Gate 7: Module-By-Module Hard-Enforcement Gate

Status: future.

Promotion criteria:

- all surfaces for the module are registered;
- output leakage paths are covered;
- Workbench states exist;
- tenant entitlements are durable;
- package dependencies are typed;
- allow/deny/audit/rollback tests pass;
- no unreviewed dependency gaps remain;
- rollback evidence has been captured;
- product, security, support, and release owner approval is recorded.

Exit behavior: fail mode for one approved module at a time.

### Gate 8: Broad Release Gate

Status: final stage only.

Promotion criteria:

- every commercial module has passed module-level enforcement readiness;
- every core/platform domain is classified;
- every module surface type is covered;
- every new module change produces release evidence;
- rollback is tested per module and globally;
- audit evidence is queryable for allow, deny, observe, migration, override, billing, deactivation, and rollback decisions.

Exit behavior: full module control plane is part of `policy:gates`.

## Rollback Contract

Rollback must be feature-flag based and must not require schema rollback.

Every approved enforcement pilot must define:

- `pilotId`;
- module slug;
- surface key;
- surface type;
- access intent;
- owner;
- rollout cohort;
- enforce flag;
- observe fallback flag;
- kill-switch owner;
- rollback command or environment toggle;
- evidence output path;
- expected audit event names;
- post-rollback verification commands.

Rollback smoke must prove:

- denied pilot traffic returns to observe-mode behavior after rollback;
- non-pilot tenants are unaffected;
- RBAC still denies users without permission;
- module would-block observations are still auditable;
- no report/export/job leakage is introduced;
- no tenant data migration is reversed;
- support can identify whether a tenant is in observe, pilot, or rollback state.

## Required Evidence Packet For Any Future Pilot

Each pilot must save a packet under `what-next/modules/` with:

- before inventory summary;
- after inventory summary;
- changed surface registry records;
- guard contract evidence;
- allow-path test output;
- deny-path test output;
- audit-event evidence;
- unavailable/read-only/suspended UI evidence where relevant;
- output leakage decision evidence;
- rollback smoke output;
- explicit approval note;
- residual risk note.

## Focused Verification Set

For this docs-only lane, the smallest honest verification is:

```powershell
npm run module:surface:inventory
```

When implementation changes module services, guards, or inventory logic, add:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

When the trial balance pilot is later implemented, add:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/__tests__/page.test.tsx"
```

Run broad gates only when code changes application behavior:

```powershell
npm run policy:gates
npm run verify:repo
```

## Decisions Made In This Lane

- No hard enforcement was enabled.
- No schema, runtime guard, inventory scanner, package script, or application behavior change was made.
- `module:surface:inventory` remains report-only for now.
- The first release-gate implementation should be a baseline and no-new-gap ratchet, not broad failure on historical gaps.
- `policy:gates` should not include a fail-mode module inventory gate until the baseline file and warn-mode evidence have been reviewed.
- Rollback must be a prerequisite for every hard-enforcement pilot, not an afterthought.
- The next implementation lane should build the ratchet script or extend the inventory script in report/warn mode first.

## Verification Result

Before this lane:

- Generated at: `2026-07-12T08:41:58.546Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300

After this lane:

- Command: `npm run module:surface:inventory`
- Result: passed. The report-mode inventory rewrote 306 records to `what-next/module-surface-inventory.json`.
- Generated at: `2026-07-12T08:47:39.293Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Source coverage remained `sidebar=present`, `moduleCatalog=present`, `dashboardRoot=present`, and `actionsRoot=present`.

## Next Handoff

Return to `aqstoqflow-module-control-plane-orchestrator`.

Recommended next lane: `aqstoqflow-module-surface-registry-ratchet` or a narrow implementation prompt for the Gate 1/Gate 2 baseline and warn-mode ratchet.

Reason: enforcement is blocked without approval, but release maturity can still advance safely by making new module-surface gaps visible and eventually non-mergeable without breaking historical surfaces.
