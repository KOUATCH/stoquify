# Legacy RBAC/Auth Migrator Run - 2026-06-21

## Scope

Ran the installed `legacy-rbac-auth-migrator` skill against the reported legacy authorization and tenant-boundary weaknesses. The run stayed code-focused and local: no live systems were scanned, fuzzed, attacked, or accessed.

## Skill Validation

- Installed skill used: `C:\Users\J COMPUTER\.codex\skills\legacy-rbac-auth-migrator\SKILL.md`
- Skill validation status: previously validated successfully with the local quick validator before execution in this thread.
- Companion guidance applied: Better Auth remains the authentication/session source; server-side RBAC remains the authorization source; tenant scope must come from the trusted RBAC context or pass `assertCanUseOrganization`.

## Changes Made

### Customer Actions

- Updated `actions/customers/customerAction2.ts` so customer reads and writes call `requirePermission` with operation-specific permissions:
  - `customers.read`
  - `customers.create`
  - `customers.update`
  - `customers.delete`
- Removed trust in the caller-supplied `organizationId` parameter for `getCustomer`; reads now use the organization from the RBAC context.
- Added audit-enabled permission checks for create, update, and delete.

### POS Session And Cart Actions

- Updated `actions/pos/session.actions.ts` to gate:
  - active session read with `pos.read`
  - shift open with `pos.session.start`
  - shift close with `pos.session.end`
- Updated `actions/pos/cart.actions.ts` to gate cart read/mutation actions with `pos.use`.
- Preserved the existing `ok`/`err` action response envelope.
- Service calls now receive `organizationId` and `userId` from RBAC context instead of `requireOrg`.

### Tax, Location, And Unit Management

- Updated:
  - `actions/taxRate/tax-rate-management-actions.ts`
  - `actions/locations/location-management-actions.ts`
  - `actions/units/unit-management-actions.ts`
- Replaced hand-rolled session/role permission aggregation with `requirePermission`.
- Added `assertCanUseOrganization` for caller-provided organization scope.
- Applied operation-specific permissions:
  - `taxes.read/create/update/delete`
  - `locations.read/create/update/delete`
  - `inventory.units.read/create/update/delete`

### Release-Gate Cleanup

`verify:repo` initially stopped at the raw-error boundary gate because four raw `Error` throws existed in untracked local files. To keep the release gate green, those were converted to typed `BusinessRuleError` without changing the surrounding control flow:

- `actions/evidence/proof-trail.actions.ts`
- `actions/modules/module-control.actions.ts`
- `services/assurance/assurance-registry-contracts.ts`

## Regression Coverage Added

Added `actions/__tests__/legacy-rbac-auth-actions.test.ts` covering:

- customer read uses RBAC tenant scope instead of caller input
- customer create requires `customers.create`
- POS shift opening requires `pos.session.start`
- POS cart mutation requires `pos.use`
- tax-rate update requires `taxes.update` and tenant guard
- location create requires `locations.create` and tenant guard
- unit delete requires `inventory.units.delete` and tenant guard

## Validation Commands

- `npm test -- --runInBand actions/__tests__/legacy-rbac-auth-actions.test.ts`
  - Passed: 1 suite, 7 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with 5 existing warnings and 0 errors.
- `npm run error:boundary:fail`
  - Passed after typed-error cleanup: 0 active unsafe raw-error findings.
- `npm run verify:repo`
  - Passed.
  - Prisma validate passed.
  - Typecheck passed.
  - Lint passed with 5 existing warnings.
  - Policy gates passed.
  - Build compiled successfully.
  - Jest passed: 115 suites, 499 tests.

## Residual Risk

- The service-boundary ratchet still reports 73 active service-boundary violations, but it passed against the current baseline: baseline 76, current 73, delta -3, no new active findings.
- `actions/customers/customerAction2.ts` still has direct Prisma reads/writes. This run fixed auth/RBAC and tenant trust first; the next slice should move customer persistence into a service-owned boundary.
- Tax/location/unit management still perform a direct organization existence lookup from action code. RBAC and tenant checks now happen first, but the next service-boundary slice should move that lookup behind a service/read-model helper.
- The full build/test output still logs local Prisma datasource health-check noise because the environment URL is not a Prisma Data Platform URL. The release gate exits successfully despite those logs.

## Next Recommended Slice

Migrate the remaining customer action persistence into a service-owned customer management service, then update the service-boundary baseline only after the direct Prisma findings drop again. Prioritize customer actions first because they were the highest-risk tenant-boundary finding in the audit and still carry the largest service-boundary residue.
