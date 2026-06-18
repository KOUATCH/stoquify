# AqStoqFlow Priority 003 Tenant RBAC Maker Checker Report

Date: 2026-06-16

Skill: `priority-003-tenant-rbac-maker-checker`

## Status

Completed the Priority 003 tenant/RBAC/maker-checker hardening slice and migrated the AP maker-checker action-owned control cluster into the purchasing AP service.

The service-boundary backlog was reduced from 283 to 280 active findings. The remaining 280 findings are still real legacy debt and must be migrated domain by domain; this pass did not attempt a blind full-repo deletion.

## Source Reports And Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\priority-003-tenant-rbac-maker-checker\SKILL.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `services/_shared/protect.ts`
- `services/_shared/__tests__/protect.test.ts`
- `actions/purchasing/ap-control.actions.ts`
- `actions/payroll/payroll-control.actions.ts`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/__tests__/ap-control.service.test.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `services/controls/sensitive-action.service.ts`
- `services/controls/__tests__/sensitive-action.service.test.ts`

## Priority Status Before Changes

- Priority 001 full Jest baseline was already repaired and green.
- Priority 002 service-boundary ratchet was in place with a 283-finding baseline and no new finding allowance.
- AP/payroll action wrappers were already deriving tenant and actor from RBAC context, but they used a raw `tenantGuard: false` escape hatch.
- AP bank-change approval and supplier-payment release still had action-owned Prisma and sensitive-action transaction orchestration in `actions/purchasing/ap-control.actions.ts`.

## Files Changed

- `services/_shared/protect.ts`
- `services/_shared/__tests__/protect.test.ts`
- `actions/purchasing/ap-control.actions.ts`
- `actions/payroll/payroll-control.actions.ts`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/__tests__/ap-control.service.test.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`
- `what-next/AQSTOQFLOW_PRIORITY_003_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_003_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`

## Controls Added Or Strengthened

- Added explicit `tenantGuard: "handler-derived"` mode to `protect`.
- Kept default tenant checking strict for caller-supplied `organizationId` and `orgId` fields, including nested `data.organizationId` and `data.orgId`.
- Replaced raw `tenantGuard: false` in AP and payroll action wrappers with the explicit reviewed mode.
- Added AP service-owned control wrappers:
  - `approveSupplierBankChangeWithControls`
  - `releaseSupplierPaymentWithControls`
- Moved AP sensitive-action auditing and same-actor approval checks out of the action layer.
- Added service-level actor/tenant consistency checks so AP control callers cannot spoof approval context.
- Preserved fresh-auth gate at the protected action boundary and passed fresh-auth evidence into service controls.
- Preserved sensitive-action audit logging for denied and allowed AP approval/release decisions.

## Actions, Routes, Hooks, Or UI Callers Migrated

- `actions/purchasing/ap-control.actions.ts` is now thin for AP bank-change approval and payment release:
  - parses request payloads;
  - derives organization and actor from RBAC context;
  - calls AP service-owned control wrappers;
  - revalidates AP dashboard paths.
- Removed AP action-owned direct Prisma usage from this file.
- Removed AP action-owned sensitive-action transaction composition from this file.

No routes, hooks, or UI components were changed in this slice.

## Security, Audit, Ledger, And Close-Blocker Notes

- Tenant isolation: caller-supplied tenant IDs are rejected by default; handler-derived exceptions are explicit and test-backed.
- Actor identity: AP and payroll actions derive actor IDs from `RbacContext`, not request payloads.
- RBAC: protected actions still call `requirePermission` before service execution.
- Maker-checker: AP supplier bank approval and supplier payment release now enforce service-owned sensitive-action controls and self-approval denial.
- Audit: denied and allowed AP sensitive decisions are recorded through `auditSensitiveActionDecision`.
- Business events, ledger posting, and close blockers remain owned by the existing AP service economic workflows.
- This slice did not change statutory certification behavior.

## Tests Added Or Changed

- Added shared `protect` regression coverage for:
  - wrong-tenant rejection;
  - nested `data.organizationId` checking;
  - explicit handler-derived tenant mode.
- Updated AP action tests to assert trusted tenant/actor derivation and service delegation.
- Added AP service tests proving:
  - supplier bank self-approval is audited and blocked before mutation;
  - supplier payment self-release is audited and blocked before mutation.

## Static And Boundary Gates

Refreshed service-boundary report:

- `node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_PRIORITY_003_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_PRIORITY_003_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- Active findings: 280
- Previous baseline: 283
- Delta: -3

Ratchet:

- `npm run service:boundary:ratchet`
- Baseline active violations: 283
- Current active violations: 280
- New active findings: 0
- Resolved active findings: 3
- Worsened classifications: 0
- Result: passed

## Verification Commands And Results

- `npm test -- services/_shared --runInBand`
  - Passed: 1 suite, 8 tests.
- `npm test -- actions/purchasing/__tests__/ap-control.actions.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/purchasing/__tests__/ap-control.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts --runInBand`
  - Passed: 4 suites, 33 tests.
- `npm test -- actions --runInBand`
  - Passed: 9 suites, 36 tests.
- `npm run typecheck`
  - Passed.
- `npm test -- --runInBand`
  - Passed: 57 suites, 267 tests.
- `npm run service:boundary:ratchet`
  - Passed with active findings reduced to 280.
- `npm run inventory:boundary:fail`
  - Passed with 0 active inventory stock mutation violations.
- `npm run prisma:validate`
  - Passed with the existing Prisma 7 package configuration deprecation warning.
- `npm run lint`
  - Passed with existing warnings outside this slice:
    - `components/auth/EmailVerificationForm.tsx`
    - `components/dashboard/items/ModernItemFormForEditing.tsx`
    - `components/frontend/custom-carousel.tsx`
    - `components/ui/groups/inventory/ItemManagement.tsx`

## Remaining Blockers

- Service-boundary debt remains at 280 active findings.
- The largest next clusters are still inventory/item actions, App Router/API direct Prisma reads, and legacy user/role/customer/supplier action paths.
- Some remaining direct Prisma paths may be read-model-only, but they still need service/read-model DTO ownership and tenant/RBAC-safe boundaries before they should be allowed.

## Next Priority Skill

Run `priority-004-inventory-item-action-migrator` next.

Recommended scope:

1. Migrate `actions/item/items.ts` and `actions/itemsShow/*` onto service-owned item/inventory workflows.
2. Keep item actions thin: validation, RBAC/protect wrapper, service call, revalidation only.
3. Preserve inventory-boundary fail mode at 0 active violations.
4. Reduce service-boundary findings in the highest-risk economic action cluster before moving to generic App Router read models.
