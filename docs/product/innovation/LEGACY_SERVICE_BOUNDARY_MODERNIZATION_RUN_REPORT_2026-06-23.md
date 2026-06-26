# Legacy Service Boundary Modernization Run Report - 2026-06-23

## Scope

Ran the legacy-modernization prompt against the active AqStoqFlow worktree with a surgical first slice: `actions/customers/customerAction2.ts`.

The target was to remove legacy action-owned Prisma persistence from the customer legacy action boundary and route reads, writes, order evidence, and archive behavior through the protected customer service layer while preserving the existing public action contract.

## Implemented Changes

- Migrated `actions/customers/customerAction2.ts` from direct `db` and Prisma model access to service-owned calls.
- Added legacy-compatible customer service methods in `services/customer/customer.service.ts`:
  - `getLegacyCustomersForOrg`
  - `getLegacyCustomerByIdForOrg`
  - `createLegacyCustomerForOrg`
  - `updateLegacyCustomerForOrg`
  - `getLegacyCustomerOrdersForOrg`
  - `archiveLegacyCustomerForOrg`
- Preserved RBAC semantics by keeping `requirePermission` at the action boundary and using the session organization from the RBAC context instead of caller-supplied organization IDs.
- Preserved redaction/trust behavior by keeping DTO mapping inside the service boundary and returning legacy DTO shapes expected by existing callers.
- Added focused coverage for the migrated action/service split:
  - `actions/__tests__/legacy-rbac-auth-actions.test.ts`
  - `services/customer/__tests__/customer-legacy.service.test.ts`
- Cleaned the release gate blocker from pre-existing assurance/snapshot service changes by replacing four raw `throw error` callsites with redacted `ApplicationError` wrappers:
  - `services/assurance/assurance-control-tower.service.ts`
  - `services/snapshots/tenant-operating-snapshot.service.ts`

## Validation Evidence

- `npm test -- --runInBand actions/__tests__/legacy-rbac-auth-actions.test.ts services/customer/__tests__/customer-legacy.service.test.ts services/assurance/__tests__/assurance-control-tower.service.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts`
  - Passed: 4 suites, 17 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with 5 existing warnings and 0 errors.
- `npm run error:boundary:fail`
  - Passed: 0 active unsafe raw-error findings.
- `npm run policy:gates`
  - Passed.
  - Inventory boundary: 0 active violations.
  - Service boundary ratchet: passed; baseline active violations 76, current active violations 47, new active findings 0, resolved active findings 29.
  - Hard-delete gate: 0 active unsafe findings.
  - Demo/report trust gate: 0 active production-visible findings.
  - Raw-error boundary: 0 active unsafe findings.

## Service Boundary Progress

- The customer legacy action slice was removed from the active service-boundary findings.
- Active service-boundary violations moved from 57 at the start of this selected slice to 47 after the migration and current ratchet run.
- Remaining backlog is outside this slice and is still visible in the gate output, mainly location, organization, storage, supplier, tax-rate, unit, invite, role, and security-setting boundaries.

## Notes

- The worktree was already dirty. The assurance and snapshot service files had broader pre-existing edits; this run only added the typed error normalization needed to pass the release gate.
- No unrelated legacy files were reverted or reformatted.
