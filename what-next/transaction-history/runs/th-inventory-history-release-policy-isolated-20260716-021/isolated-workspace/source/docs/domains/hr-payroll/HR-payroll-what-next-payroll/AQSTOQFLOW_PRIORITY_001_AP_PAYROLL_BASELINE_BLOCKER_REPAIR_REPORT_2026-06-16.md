# AqStoqFlow Priority 001 AP/Payroll Baseline Blocker Repair Report

Date: 2026-06-16

Related skills:

- `priority-001-green-baseline-ratchets`
- `priority-002-service-boundary-ratchets`

## Objective

Clear the full Jest baseline blocker recorded during Priority 001:

- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`

## Root Cause

The shared `protect` wrapper now performs a pre-handler tenant guard by default. That guard rejects caller-supplied `organizationId` values that do not match the authenticated context.

The failing AP/payroll tests intentionally pass caller-supplied tenant and actor fields to prove the actions discard them and rebuild service input from trusted `ctx.orgId` and `ctx.userId`.

The pre-handler tenant guard was firing before those actions could sanitize the payload.

## Fix

Updated only the AP/payroll action wrappers that rebuild tenant and actor fields from authenticated context:

- `actions/payroll/payroll-control.actions.ts`
- `actions/purchasing/ap-control.actions.ts`

These wrappers now set:

```ts
tenantGuard: false
```

The global tenant guard remains enabled by default. The affected handlers still overwrite service inputs with authenticated context before calling services.

## Verification

### Targeted AP/Payroll Tests

```powershell
npm test -- actions/payroll/__tests__/payroll-control.actions.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts --runInBand
```

Result:

- Test suites: 2 passed
- Tests: 10 passed

### Full Jest Baseline

```powershell
npm test -- --runInBand
```

Result:

- Test suites: 57 passed
- Tests: 264 passed

### Priority 002 Boundary Ratchet

```powershell
npm run service:boundary:ratchet
```

Result:

- Baseline active violations: 283
- Current active violations: 283
- New active findings: 0
- Worsened classifications: 0
- Ratchet status: passed

### Inventory Boundary

```powershell
npm run inventory:boundary:fail
```

Result:

- Active violations: 0

### Typecheck

```powershell
npm run typecheck
```

Result: passed.

### Prisma Validate

```powershell
npm run prisma:validate
```

Result: passed.

Known non-blocking warning:

- `package.json#prisma` configuration is deprecated and should move to a Prisma config file before Prisma 7.

## Remaining Work

- Service-boundary debt remains at 283 active findings and should continue through the ordered priority suite.
- `service:boundary:fail` remains a future zero-debt gate; use `service:boundary:ratchet` during migration to prevent regression.
