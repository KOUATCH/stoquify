# Kontava Module Control Plane - Phase 3 Run Report

Date: 2026-06-20  
Skill: `kontava-module-control-plane`  
Phase gate: ADR 0010 Phase 3 - module decisions run in observe mode with would-block logs; server-side guard design covers routes/actions/APIs/reports/exports/jobs.

## Executive Summary

The `kontava-module-control-plane` skill has been executed as an observe-mode foundation slice. This phase does not introduce hard module enforcement, does not create subscription tables yet, and does not hide existing tenant workflows globally.

The implementation adds the first server-side module control plane:

- Canonical commercial module catalog.
- Module dependency map.
- Registration intent normalization from `Organization.requestedModules`.
- Legacy/default entitlement derivation for existing tenants.
- Observe-mode entitlement decision service.
- Would-block audit logging.
- Protected server actions.
- Owner/admin Module Control Center page under settings.
- Focused tests proving RBAC wildcard does not bypass entitlement would-block decisions.

## Files Added

- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `actions/modules/__tests__/module-control.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `moat proposals/KONTAVA_MODULE_CONTROL_PLANE_PHASE_3_RUN_REPORT_2026-06-20.md`

## Files Modified

- `config/sidebar.ts`

Added a `Settings -> Modules` navigation entry for users with `MANAGE_SYSTEM_SETTINGS`.

## What Was Implemented

### 1. Canonical Module Catalog

The new catalog defines Kontava commercial modules such as:

- Dashboard.
- Inventory.
- Production.
- Sales.
- POS.
- Cash Drawer.
- OHADA Accounting.
- Close Assurance.
- Compliance.
- Purchasing and AP.
- Presence.
- Payroll.
- Finance.
- Payment Reconciliation.
- Analytics.
- Reports.
- Commercial Agents.
- Content.
- Settings.
- Administration.

Each catalog entry includes:

- Slug.
- Name.
- Description.
- Owner.
- Status.
- Risk level.
- Core flag.
- Route prefixes.
- Permissions.
- Dependencies.

### 2. Dependency Map

The first dependency map includes required and recommended relationships, including:

- POS depends on Sales.
- Payment Reconciliation depends on Finance and Accounting.
- Close Assurance depends on Accounting and recommends Payment Reconciliation.
- Payroll recommends Accounting.
- Purchasing recommends Inventory.
- Analytics recommends Reports.

These dependencies are evaluated server-side and surfaced as observe-mode would-block reasons.

### 3. Requested Module Normalization

Registration labels such as `POS`, `Inventory`, `Accounting`, and `Payment reconciliation` are normalized into canonical module slugs.

Important rule preserved:

`Organization.requestedModules` is treated as registration intent, not as the final subscription source of truth.

### 4. Legacy Entitlement Derivation

Existing tenants with no requested modules receive legacy full-suite observe access. This prevents sudden disruption while Kontava transitions to durable entitlements later.

Core modules such as dashboard, settings, and administration are marked as system defaults.

### 5. Observe-Mode Entitlement Decisions

The new decision service returns:

- Allowed.
- Would-block.
- Decision reason.
- Module status.
- Missing dependencies.
- Surface type.
- Access intent.
- RBAC wildcard presence.
- Proof that wildcard did not bypass entitlement.
- Hard enforcement status.

Observe mode means:

- Existing workflows are not denied yet.
- Would-block decisions are still visible and auditable.
- Hard enforcement can be introduced only after observe reports are clean and approved.

### 6. Would-Block Audit Logging

Would-block decisions are logged to `audit_logs` as:

```text
entityType: ModuleEntitlementDecision
action: MODULE_ENTITLEMENT_OBSERVED
```

The log records module, surface, intent, mode, result, reason, missing dependencies, and wildcard presence.

### 7. Protected Server Actions

Added:

- `getModuleControlCenterAction`
- `observeModuleAccessAction`

The actions derive tenant and actor from RBAC context and ignore caller-supplied tenant identifiers.

### 8. Module Control Center UI

Added:

```text
/dashboard/settings/modules
```

The page shows owners/admins:

- Observe mode.
- Hard enforcement off.
- Registration module intent.
- Unknown requested modules.
- Catalog count.
- Entitled count.
- Would-block count.
- Dependency gap count.
- Per-module status, source, risk, owner, decision, and missing dependencies.

This creates a controlled admin surface without distracting normal users with upgrade marketing.

## Security and Compliance Notes

- RBAC and module entitlement are separate.
- Passing RBAC does not grant module entitlement.
- Module entitlement does not grant RBAC.
- Admin wildcard permissions do not remove `wouldBlock` entitlement decisions.
- Hard enforcement remains off.
- Existing tenants are not suddenly restricted.
- Would-blocks are logged for audit review.
- No destructive database operation was performed.
- No subscription schema was introduced in this slice.

## Validation Results

Passed:

```powershell
npm test -- --runInBand services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts
```

Result: 2 suites passed, 9 tests passed.

Passed:

```powershell
npm run typecheck
```

Result: TypeScript completed with no errors after rerunning with a longer timeout.

Passed:

```powershell
npx eslint "services/modules/**/*.ts" "actions/modules/**/*.ts" "app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx" config/sidebar.ts
```

Result: No lint errors or warnings in the touched module-control slice.

Passed:

```powershell
npx prisma validate
```

Result: Prisma schema valid.

Passed:

```powershell
npm run lint
```

Result: 0 errors, 5 existing warnings outside the module-control slice.

Passed:

```powershell
git diff --check -- services/modules actions/modules "app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx" config/sidebar.ts
```

Result: No whitespace errors.

## Tests Added

The focused tests cover:

- Registration label normalization.
- Legacy full-suite observe entitlements.
- Observe-mode would-block decisions.
- Wildcard RBAC not bypassing entitlement decisions.
- Required dependency gaps.
- Read-only entitlement behavior in observe and enforce modes.
- Would-block audit logging.
- Protected action tenant derivation.
- Protected action permission registration.

## What Was Not Done

This phase intentionally did not:

- Add hard enforcement.
- Add durable subscription tables.
- Hide subscribed/unsubscribed modules globally for all normal users.
- Block direct URL access.
- Enforce reports, exports, APIs, or jobs.
- Modify seed data.
- Reset, push, or migrate the database.

Those steps should wait until observe-mode data is reviewed.

## Phase 3 Gate Assessment

Phase 3 is passed for the implemented observe-mode foundation slice.

The platform now has a server-side entitlement decision service and an owner/admin control surface. The next phase can safely use this service for broader server-side route/action/API/report/export/job guard design while still avoiding hard denial.

## Rollback Strategy

Rollback for this phase is straightforward:

- Remove `services/modules`.
- Remove `actions/modules`.
- Remove `/dashboard/settings/modules`.
- Remove the `Settings -> Modules` sidebar entry.
- Remove this report.

No database migration rollback is needed.

## Recommended Next Step

Run `kontava-security-redaction-guard` before exposing broader cross-module intelligence or expanding module-control decisions into more surfaces. After that, extend module-control observe checks to selected server actions, reports, exports, APIs, and jobs before any hard enforcement is considered.

