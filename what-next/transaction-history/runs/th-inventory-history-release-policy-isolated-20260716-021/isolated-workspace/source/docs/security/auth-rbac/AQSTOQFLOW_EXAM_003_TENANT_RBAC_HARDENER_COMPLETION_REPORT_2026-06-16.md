# AqStoqFlow Exam 003 Tenant RBAC Hardener Completion Report

Date: 2026-06-16

## Risk Class

`exam-003-aqstoqflow-tenant-rbac-hardener`

## Result

Added a tenant-scope guard to the shared protected action wrapper so modern service-backed actions cannot silently accept caller-supplied `organizationId` or `orgId` values that do not pass the trusted RBAC organization context.

This creates a reusable guardrail for the remaining action-to-service migrations. Legacy actions that do not yet use `protect` remain in the migration backlog and are visible in the service-boundary gate report.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\exam-003-aqstoqflow-tenant-rbac-hardener\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-003-aqstoqflow-tenant-rbac-hardener\references\risk-brief.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-003-aqstoqflow-tenant-rbac-hardener\references\runtime-boundary.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `services/_shared/protect.ts`
- `services/_shared/__tests__/protect.test.ts`
- `lib/security/rbac.ts`
- `lib/security/server-authz.ts`
- selected `actions/**/*` tenant/RBAC scan results

## Files Changed

- `services/_shared/protect.ts`
- `services/_shared/__tests__/protect.test.ts`
- `what-next/AQSTOQFLOW_EXAM_003_TENANT_RBAC_HARDENER_COMPLETION_REPORT_2026-06-16.md`

## Controls Added

- `protect` now checks top-level `organizationId` and `orgId` input fields when present.
- `protect` now checks nested `data.organizationId` and `data.orgId` input fields when present.
- Checks use `assertCanUseOrganization(ctx, organizationId)`, preserving existing super-user behavior and RBAC denial auditing.
- The guard runs after `requirePermission` and before the handler, so mismatched tenant input cannot reach service orchestration.
- The guard is enabled by default and can be explicitly disabled only with `tenantGuard: false` for narrowly reviewed exceptions.

## Tests Added

Updated `services/_shared/__tests__/protect.test.ts` to cover:

- no tenant check when no caller tenant is supplied;
- wrong-tenant rejection before handler execution;
- nested `data.organizationId` check before handler execution;
- existing fresh-auth, RBAC denial, and safe error behavior still works.

## Verification Results

Passed:

```powershell
npm test -- services/_shared/__tests__/protect.test.ts --runInBand
npm test -- scripts/__tests__/service-boundary-gate.test.js --runInBand
npm run typecheck
npm run prisma:validate
```

Notes:

- `npm run prisma:validate` passed and emitted the existing Prisma 7 deprecation warning for `package.json#prisma`.
- No Prisma schema changes were made.

## Remaining Blockers

- Legacy actions that do not yet use `protect` still need migration to service-backed protected actions.
- Legacy actions that accept `organizationId` directly remain visible in `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`.
- Same-actor controls are already present in several modern kernels, but the remaining legacy workflows still need domain-by-domain migration and tests.

## Next Skill

Next ordered domain remediation: `exam-004-aqstoqflow-inventory-item-finalizer`.

This is the first migration cluster in the service-boundary report and should move inventory/item action paths into service-owned workflows that inherit the shared tenant/RBAC guard.
