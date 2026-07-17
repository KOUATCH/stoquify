# AqStoqFlow Module Enforcement Pilot Plan

Date: 2026-07-12
Skill: `aqstoqflow-module-enforcement-pilot`
Lane: Pilot enforcement planning and execution
Mode: pilot plan only; hard enforcement not enabled

## Executive Verdict

AqStoqFlow is ready to plan a bounded enforcement pilot, but it is not ready to execute hard enforcement broadly. The safe next step is a written pilot plan with explicit approval gates, rollback flags, direct URL/action/API/report evidence, unavailable-state requirements, and inventory/test ratchets.

Hard execution is intentionally blocked in this pass because:

- no explicit approval was given to enable hard enforcement;
- durable tenant entitlement records are not yet implemented;
- `Organization.requestedModules` remains registration intent, not commercial access truth;
- the Module Workbench is still diagnostic, not a complete role-aware state surface;
- output/source-module leakage controls are specified but not implemented;
- the inventory still has 34 unmapped and 16 missing-permission records;
- content is cataloged as a low-risk internal module, but no active `/dashboard/blogs` page/action/sidebar surface was found in the current scan.

Recommended future pilot: an accounting trial-balance read-only reporting pilot in shadow mode first, then enforce mode only after approval. It is not low-risk by data sensitivity, but it is narrow, read-only, already RBAC-guarded before data access, and already has focused page tests proving the page-level permission guard denies before loading data.

## Source Evidence Inspected

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_ACCESS_GUARD_CONTRACT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_WORKBENCH_UX_STATES_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_LEAKAGE_PREVENTION_2026-07-12.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `actions/accounting/reports.actions.ts`
- `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/__tests__/page.test.tsx`
- `services/accounting/__tests__/reports-export.service.test.ts`
- `scripts/module-surface-inventory.js`

## Current Enforcement Posture

- `MODULE_CONTROL_MODE` is `observe`.
- `ModuleControlCenterData.hardEnforcementEnabled` is `false`.
- `evaluateModuleEntitlement()` can deny in `mode: "enforce"`, but global control remains observe/report mode.
- `observeModuleAccess()` records would-block audit evidence without denying when observe mode is used.
- `protect()` supports an optional module gate, but the canonical access-guard contract and Workbench unavailable states are still roadmap artifacts rather than complete implementation.
- `requireApiModuleAccess()` exists and current API tests prove selected routes require module access before permission/data calls.
- Inventory remains report-only.
- Sidebar hiding remains non-security.

## Existing Test Evidence

Current module entitlement tests already cover:

- registration label normalization into canonical slugs;
- legacy full-suite observe entitlements;
- observe-mode would-blocks that remain allowed;
- wildcard/admin RBAC not bypassing module entitlement;
- required dependency gaps;
- read-only write denial when enforcement is requested;
- observe-mode would-block audit logging.

Current API tests cover selected API route ordering:

- missing API session stops before module, permission, and data calls;
- tenant authorization failure stops before module, permission, and data calls;
- API module access runs before permission/data calls for inventory and settings API routes.

Trial-balance page tests cover:

- `checkPermission("accounting.reports.read")` before data load;
- denied permission stops before `getTrialBalanceAction()`;
- report read errors are contained after permission succeeds.

Accounting export tests cover:

- export control audit in the service transaction;
- export provenance, content hash, filter hash, watermark, redaction status, and certification status;
- denial/audit when export permission is missing.

## Candidate Assessment

| Candidate | Strengths | Blockers | Recommendation |
|---|---|---|---|
| `content` module `/dashboard/blogs` | Cataloged as low risk, internal, no dependencies | No active route/action/sidebar surface found in current scan; product must confirm content is a true pilot module | Do not execute until surface exists and product agrees |
| Accounting trial balance read page/action | Narrow read-only report; page-level RBAC already denies before data; action is protected; focused tests exist | Accounting is critical; needs module gate, unavailable state, source-module policy, explicit approval | Best future reporting pilot after shadow mode |
| Accounting export | Fresh auth, audit, redaction, service tests exist | Export is higher risk than report read; source-module leakage contract not implemented | Use after report-read pilot |
| Inventory API list items | API module-order tests exist; surface is operationally clear | Inventory is high-value operational module; unavailable UI/workbench not complete | Later bounded API pilot |
| Settings/module control | Core/platform module; already protected | Platform foundations should not be commercial enforcement pilot | Keep as control plane, not pilot target |

## Selected Pilot Candidate

Future pilot candidate: `accounting.trial_balance.report_read`.

Scope:

- Page: `/dashboard/accounting/reports/trial-balance`
- Page file: `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx`
- Action: `getTrialBalanceAction`
- Action file: `actions/accounting/reports.actions.ts`
- Service: `getTrialBalance`
- Service file: `services/accounting/reports.service.ts`
- Owner module: `accounting`
- Source modules: `accounting`
- Access intent: `read`
- Required RBAC permission: `accounting.reports.read`
- Initial mode: shadow/observe only
- Enforce mode: only after explicit approval and feature flag
- Excluded from first enforce pass: `exportAccountingReportAction`

Reasoning:

The candidate is narrow enough to verify end to end, but meaningful enough to prove the module model. It exercises direct page access, server action access, report read behavior, RBAC ordering, module entitlement decisions, audit evidence, and rollback. Excluding export keeps the first pilot away from download/leakage risk while still proving direct URL and action gating.

## Required Prerequisites Before Hard Execution

1. Explicit approval to run a bounded hard-enforcement pilot.

   Approval must name the module, surfaces, cohort, and rollback flag.

2. Feature flag.

   Suggested flag: `MODULE_ENFORCEMENT_PILOT_ACCOUNTING_TRIAL_BALANCE_READ`.

3. Pilot-scoped guard wrapper.

   The trial-balance page/action should call a module access wrapper that can run in observe, shadow-enforce, or enforce mode for exactly this surface.

4. Unavailable state.

   Direct URL access must return a safe unavailable/read-only/suspended state or server-side deny without exposing billing/provider/package internals to normal users.

5. Effective entitlement input.

   The pilot must not treat `Organization.requestedModules` as final commercial truth. Until durable entitlements exist, pilot fixtures must be explicit and clearly marked as test/pilot inputs.

6. Audit evidence.

   Every would-block or deny must record actor, organization, module, surface, access intent, decision, reason, entitlement state, RBAC wildcard presence, and evaluated time.

7. Rollback.

   Turning the flag off must return the pilot to observe mode without schema rollback, data rollback, or route removal.

8. Output leakage stance.

   Export remains out of the first enforce pass. Report read is allowed only for accounting source data. Export intent gets its own later pilot.

## Pilot Modes

| Mode | Behavior | Purpose |
|---|---|---|
| `observe` | Allow traffic; record would-block evidence | Current baseline |
| `shadow_enforce` | Allow traffic; compute enforce decision; log would-deny evidence | Quantify blast radius before denial |
| `cohort_enforce` | Deny only for named test tenant/cohort and named surface | Prove runtime denial and unavailable state |
| `full_pilot_enforce` | Deny for approved pilot cohort; still only named surface | Final pilot stage before module rollout |
| `rollback_observe` | Force named surface back to observe | Recovery path |

## Pilot Test Matrix

| Scenario | Expected result |
|---|---|
| User lacks RBAC permission | Page/action denies before trial balance data access |
| Tenant lacks accounting entitlement in shadow mode | Request allowed; would-deny audit recorded |
| Tenant lacks accounting entitlement in pilot enforce mode | Direct URL/action returns safe unavailable or 403 before data access |
| User has wildcard RBAC but tenant lacks entitlement | Deny/would-deny still applies; wildcard does not bypass entitlement |
| Tenant has accounting entitlement and user has RBAC | Page/action succeeds |
| Entitlement is `read_only` | Trial-balance read succeeds; export remains denied unless a later retention-export policy allows |
| Entitlement is `suspended` | Trial-balance read denied or unavailable |
| Entitlement is `expired` | Trial-balance read denied unless read-only retention policy explicitly allows |
| Dependency missing | Not applicable for accounting today, but test should assert no dependency gap |
| Rollback flag disabled | Surface returns to observe mode and data path works for current tenants |

## Required Verification Commands For Actual Execution

When implementation is approved, run:

```powershell
npm run module:surface:inventory
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/__tests__/page.test.tsx"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/accounting/__tests__/reports-export.service.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

Add new tests before enforce mode:

- page-level module unavailable state before action/data call;
- action-level module denial before `getTrialBalance()` service call;
- wildcard RBAC cannot bypass pilot entitlement;
- read-only allows report read but export remains blocked;
- rollback flag returns decision to observe.

## Rollback Plan

Rollback switch:

- set `MODULE_ENFORCEMENT_PILOT_ACCOUNTING_TRIAL_BALANCE_READ=false`;
- preserve audit records;
- keep page/action code intact;
- force mode to observe for the named surface;
- rerun focused page/action/module tests;
- rerun `npm run module:surface:inventory`;
- save rollback evidence under `what-next/`.

Rollback success criteria:

- current tenants regain observe-mode behavior;
- no data migration is required;
- no schema rollback is required;
- would-block evidence remains available for analysis;
- Workbench shows pilot disabled or observe mode.

## Release-Gate Ratchets

Pilot-gate checks should start as report-only:

- named surface exists in inventory;
- named surface has owner module;
- named surface has permission;
- named surface has guard;
- named surface has access intent;
- named surface has unavailable behavior;
- deny path happens before data access;
- audit evidence is written for would-deny/deny;
- rollback flag exists and is tested.

After the pilot succeeds, the ratchet can fail only new pilot surfaces that lack this metadata. It should not fail the whole repo for historical unmapped records until a cleanup baseline is approved.

## Blockers To Hard Execution

Hard execution is blocked until:

- user explicitly approves the named pilot;
- durable entitlement source or explicit pilot entitlement fixtures are defined;
- unavailable/read-only/suspended state exists for the page/action;
- module guard wrapper is implemented for page/action/report surfaces;
- source-module leakage policy is implemented for reporting outputs;
- rollback flag and tests exist;
- pilot cohort is defined;
- focused tests pass;
- before/after inventory evidence is saved.

## Decisions Made In This Lane

- No hard enforcement was enabled.
- The first future pilot should not be broad module enforcement.
- `content` remains the ideal low-risk class, but current code evidence shows only catalog metadata, not an active mapped surface.
- `accounting.trial_balance.report_read` is the best concrete second-stage pilot candidate because its RBAC-before-data behavior is already tested.
- `exportAccountingReportAction` is excluded from the first pilot because export/source-module leakage controls need a separate pilot.
- Rollback must be feature-flag based and return the surface to observe mode without schema rollback.

## Verification Result

Before this lane:

```powershell
npm run module:surface:inventory
```

Inventory evidence from `what-next/module-surface-inventory.md` before this report:

- Generated at: `2026-07-12T07:55:52.078Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Report mode: inventory is read-only and does not enforce module entitlements.

After this lane:

- Command: `npm run module:surface:inventory`
- Result: passed. The report-mode inventory rewrote 306 records to `what-next/module-surface-inventory.json`.
- Generated at: `2026-07-12T08:41:58.546Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Source coverage remained `sidebar=present`, `moduleCatalog=present`, `dashboardRoot=present`, and `actionsRoot=present`.

## Next Handoff

Return to `aqstoqflow-module-control-plane-orchestrator`.

Recommended next lane: `aqstoqflow-module-release-gates-and-rollback`.

Reason: hard execution is blocked without approval, so the safest next step is to specify the release-gate and rollback evidence packet that would make a later pilot executable.
