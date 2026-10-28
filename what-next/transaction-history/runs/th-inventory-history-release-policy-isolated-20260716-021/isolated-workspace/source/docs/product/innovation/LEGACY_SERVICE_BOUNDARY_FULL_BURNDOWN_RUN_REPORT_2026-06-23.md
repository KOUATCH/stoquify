# Legacy Service Boundary Full Burndown Run Report

Date: 2026-06-23

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Objective

Complete the remaining service-boundary burndown outside the prior proof/evidence timeline slice. The target was the 47 active runtime violations still present across location, organization, storage, supplier, tax-rate, unit, invite, role, brand, category, and security-setting surfaces.

## Result

- Start of this pass: 47 active service-boundary violations.
- Mid-pass after first migration cluster: 32 active violations.
- Final: 0 active service-boundary violations.
- `npm run service:boundary:fail` passes.
- `npm run policy:gates` passes.
- `node scripts/kontava-moat-release-gate.js --mode fail` reports release status `ready`.

The current service-boundary ratchet compares against the repository baseline of 76 active findings and now reports:

- Baseline active violations: 76
- Current active violations: 0
- Resolved active findings: 76
- Ratchet status: passed

## Implementation Summary

### Service ownership restored

- Added `services/_shared/assert-active-organization.ts` so actions can validate active organizations through a DB-owned service helper without importing the authenticated `requireOrg` flow.
- Kept `services/_shared/resolve-action-organization.ts` for authenticated list/read flows while removing its direct DB implementation.
- Moved location update-by-id persistence into `services/location/location.service.ts`.
- Moved organization settings reads, list aggregation, create, and updates into `services/organization/organization-settings.service.ts`.
- Moved supplier picker reads into `services/supplier/supplier.service.ts`.
- Moved invite registration context reads into `services/users/user-identity.service.ts`.
- Moved security settings account/user reads into `services/security/security-settings.service.ts`.
- Kept storage initialization action-side session checks, but moved active-organization existence checks behind the shared service helper.

### Action and UI boundary cleanup

- Removed Prisma client/type imports from location, tax-rate, unit, customer, supplier, POS, organization, storage, invite, role, payment reconciliation, and security-setting runtime surfaces.
- Replaced Prisma error-class coupling in actions with structural `getPrismaKnownRequest` helpers from `services/_shared/action-errors.ts`.
- Replaced Prisma enum/type leakage in UI/action DTO surfaces with local, explicit DTO unions:
  - Invite status table DTO.
  - Role form and role table row DTOs.
  - Location, tax-rate, and unit dashboard row-derived types.
  - Payment reconciliation suspense type tuple for Zod validation.
- Preserved existing RBAC, tenant scope, revalidation, redaction, and trust semantics at action boundaries.
- Converted raw organization service business-rule errors to `BusinessRuleError` so the raw-error policy gate stays green.

### Domain notes

- Location, organization, storage, supplier, tax-rate, unit, invite, role, and security-setting boundaries were actively present in the service-boundary gate and were migrated.
- Brand and category were named in the request, but the refreshed gate did not show active brand/category runtime violations in this pass.

## Validation

### Focused tests

Command:

```powershell
npm test -- --runInBand actions/__tests__/legacy-rbac-auth-actions.test.ts actions/roles/__tests__/role-actions.test.ts services/roles/__tests__/role.service.test.ts services/supplier/__tests__/supplier.service.test.ts services/tax-rate/__tests__/tax-rate.service.test.ts services/unit/__tests__/unit.service.test.ts services/users/__tests__/user-identity.service.test.ts actions/evidence/__tests__/proof-trail.actions.test.ts services/evidence/__tests__/proof-trail.service.test.ts
```

Result:

- 9 test suites passed.
- 50 tests passed.

### Boundary gates

Command:

```powershell
npm run service:boundary
```

Result:

- Active service-boundary violations: 0
- Allowed test/mock/service findings: 5

Command:

```powershell
npm run service:boundary:fail
```

Result:

- Passed.
- Active service-boundary violations: 0.

Command:

```powershell
npm run policy:gates
```

Result:

- Passed.
- Inventory boundary fail: 0 active violations.
- Service boundary ratchet: 76 baseline findings reduced to 0 current findings.
- Hard delete fail: 0 active unsafe hard-delete findings.
- Demo/report trust fail: 0 active production trust findings.
- Raw error boundary fail: 0 active unsafe raw-error findings.

### Typecheck and lint

Command:

```powershell
npm run typecheck
```

Result:

- Passed.

Command:

```powershell
npm run lint
```

Result:

- Passed with 5 pre-existing warnings:
  - `components/auth/EmailVerificationForm.tsx`: missing hook dependencies.
  - `components/dashboard/items/ModernItemFormForEditing.tsx`: `<img>` warning.
  - `components/frontend/custom-carousel.tsx`: `<img>` warning.
  - `components/ui/groups/inventory/ItemManagement.tsx`: `<img>` warning.
  - `config/permissions.ts`: anonymous default export warning.

### Kontava moat release gate

Command:

```powershell
node scripts/kontava-moat-release-gate.js --mode fail
```

Result:

- Release status: `ready`.
- Seed scenarios ready: 8/8.
- Backfill checks ready: 6/6.
- Release gates ready: 8/8.
- Blockers: 0.
- Critical blockers: 0.

## Follow-Up

- The service-boundary gate can now be promoted to fail mode for runtime boundaries because there are no active findings.
- The baseline file still records 76 historical active findings. The ratchet passes because current findings are 0; updating the baseline to 0 would make future regressions easier to spot.
- The remaining lint warnings are unrelated to this service-boundary migration and can be handled in a separate UI hygiene pass.
