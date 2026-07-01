# AqStoqFlow Payroll Browser Smoke Auth Seed Evidence - 2026-06-27

## Status

Closed. The authenticated payroll browser smoke is unblocked for the local/demo validation path.

Final browser result, after restoring and rerunning the full fixture seed on disk:

```text
$env:PLAYWRIGHT_SKIP_WEB_SERVER = '1'
npx playwright test --project=payroll-authenticated-smoke --workers=1 --reporter=line
10 passed (7.2m)
```

Covered authenticated routes:

- `/en/dashboard/payroll`
- `/en/dashboard/payroll/attendance`
- `/en/dashboard/payroll/compensation`
- `/en/dashboard/payroll/contracts`
- `/en/dashboard/payroll/employees`
- `/en/dashboard/payroll/payslips`
- `/en/dashboard/payroll/register`
- `/en/dashboard/payroll/setup`

## Demo-Only Boundary

The seed path is intentionally local/demo-only. It is not production payroll backfill and must not be used as statutory truth.

Guardrails added in `scripts/seed-payroll-e2e-user.js`:

- Refuses to run when `NODE_ENV`, `AQSTOQFLOW_ENV`, or `VERCEL_ENV` is `production`.
- Prints the warning: `Demo-only payroll browser fixture. This is not production payroll backfill and must not be used for statutory truth.`
- Marks seeded payroll fixture metadata with `demoOnly: true` and `productionBackfill: false`.
- Seeds only the minimal local browser-smoke surface required for payroll route rendering.

## Seeded Demo Principal

Command:

```text
npm run seed:e2e:payroll
```

Seed result:

- Organization: `org_payroll_e2e_local`
- User: `usr_payroll_e2e_local`
- Email: `hr.manager@stockflow.test`
- Role: `PAYROLL_E2E`
- Requested modules: `payroll`, `accounting`

The seed is rerunnable and resets local demo user lock state before auth bootstrap.

## Minimal Payroll Fixtures

The seed creates deterministic June 2026 demo payroll fixtures:

- Payroll employee and active contract
- Base pay rubrique and assignment
- Applied payment destination evidence
- Payroll period and frozen attendance snapshot
- Posted payroll run and run line
- Emitted payslip and payslip lines
- Prepared declaration
- Released payment batch and allocation

The fixture is deliberately minimal. It does not create production statutory backfill, bank reconciliation truth, or ledger close truth.

## Auth Bootstrap

Scripts wired in `package.json`:

```text
npm run seed:e2e:payroll
npm run auth:payroll:bootstrap
npm run test:e2e:payroll
```

Auth bootstrap regenerates the local storage state:

```text
playwright/.auth/payroll.json
```

Evidence from the final check:

```text
FullName: E:\ohada saas\newStockFlow\aqstoqflow\playwright\.auth\payroll.json
Length: 1875
LastWriteTime: 06/27/2026 22:12:29
```

The auth state contents were not read or copied; only file metadata was checked.

## Code Fixes Uncovered By Browser Validation

Two narrow fixes were needed after the auth path started exercising real route data:

- `services/payroll/payment-evidence.service.ts`: supplies the employee relation when mapping the latest payment destination change from employee-readiness records.
- `components/payroll/PayrollRegisterTieOut.tsx`: keeps the payroll run number visible but makes the data state expose an accessible `Payroll register` `h1`, matching the route smoke contract.

## Verification

Passed:

```text
npm run prisma:validate
```

```text
npx prisma migrate status
Database schema is up to date.
```

```text
node --check scripts\seed-payroll-e2e-user.js
```

```text
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"
package.json ok
```

```text
npm run seed:e2e:payroll
```

```text
npm run seed:e2e:payroll
```

Rerun passed and emitted the same deterministic fixture IDs.

```text
npx playwright test --project=auth-setup --reporter=line
1 passed
```

```text
npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-evidence.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand
2 passed, 8 tests passed
```

```text
npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts actions/payroll/__tests__/payroll-register.actions.test.ts --runInBand
2 passed, 12 tests passed
```

```text
npx playwright test --project=payroll-authenticated-smoke --grep "command center renders as an authenticated tenant route" --reporter=line
2 passed
```

```text
npx playwright test --project=payroll-authenticated-smoke --grep "register renders as an authenticated tenant route" --workers=1 --reporter=line
2 passed
```

```text
npx playwright test --project=payroll-authenticated-smoke --grep "employees renders as an authenticated tenant route" --workers=1 --reporter=line
2 passed
```

Final full browser smoke:

```text
$env:PLAYWRIGHT_SKIP_WEB_SERVER = '1'
npx playwright test --project=payroll-authenticated-smoke --workers=1 --reporter=line
10 passed (7.2m)
```

## Local Migration Note

The local database initially had checked-in payroll migrations pending. `npx prisma migrate deploy` was run to bring the local browser-validation database up to the repository migration state before seeding. Final `npx prisma migrate status` reported the database schema is up to date.

## Operational Notes

The Windows sandbox patch helper failed in this workspace with `helper_unknown_error: setup refresh had errors`, so bounded PowerShell/.NET file writes were used for the small local edits. Browser and database commands were run with escalated execution because they require local server, browser, and database access.
