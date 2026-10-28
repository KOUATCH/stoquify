# AqStoqFlow Payroll Browser Validation E2E User Evidence - 2026-06-27

## Scope closed

Closed the remaining browser-validation blocker from `AQSTOQFLOW_PAYROLL_BROWSER_VALIDATION_GAP_CLOSURE_2026-06-27.md` by adding a local, tenant-scoped payroll E2E user provisioner and rerunning the authenticated payroll browser gates.

This change is intentionally narrow: it provisions only the local E2E tenant, role, user, requested module entitlement, and Better Auth credential account. It does not seed payroll employees, contracts, runs, payslips, payments, statutory facts, accounting settings, or other payroll business records.

## Repo changes

- Added `scripts/seed-payroll-e2e-user.js`.
- Added `seed:e2e:payroll` wiring in `package.json`.
- Updated `tests/e2e/auth.setup.ts` to default to the dedicated local user `payroll.e2e@stockflow.test`.
- Kept `tests/e2e/payroll-authenticated-smoke.spec.ts` focused on authenticated payroll route rendering and blocker/proof action visibility.
- Updated `scripts/ui-route-smoke-gate.js` so protected routes with `--storage-state` and `--require-screenshots` are validated through authenticated Playwright browser screenshots instead of unauthenticated HTTP fetches.
- Updated `ui:smoke:payroll` to use `http://127.0.0.1:3000`, a 60s timeout, the payroll auth state, and payroll evidence output paths.

## Tenant-safety checks

- Default E2E tenant: `org_payroll_e2e_auth_local`.
- Default E2E user: `payroll.e2e@stockflow.test`.
- Requested modules: `payroll`, `accounting`.
- Role code: `PAYROLL_E2E`.
- The provisioner refuses production environment markers (`NODE_ENV`, `AQSTOQFLOW_ENV`, `VERCEL_ENV`).
- The provisioner refuses to move an existing same-email user across tenants.
- The clean E2E tenant was checked after seeding:
  - `payrollEmployee`: `0`
  - `payrollContract`: `0`
  - `payrollRun`: `0`
  - `payrollPayslip`: `0`
  - `payrollPaymentBatch`: `0`
  - `organizationAccountingSettings`: `0`

## Git-ignored local state

Confirmed:

- `.gitignore:61:/playwright/.auth/` ignores `playwright/.auth/payroll.json`.
- `.gitignore:38:.env*` ignores `.env.local`.

Generated auth state remains local at:

- `playwright/.auth/payroll.json`

## Commands run

```powershell
node --check scripts/seed-payroll-e2e-user.js
npm run seed:e2e:payroll
.\node_modules\.bin\playwright.cmd test --project=auth-setup --workers=1 --reporter=list
.\node_modules\.bin\playwright.cmd test --project=payroll-authenticated-smoke --no-deps --workers=1 --reporter=list
npm run ui:smoke:payroll
git check-ignore -v playwright/.auth/payroll.json .env.local
git diff --check -- scripts/seed-payroll-e2e-user.js package.json tests/e2e/auth.setup.ts tests/e2e/payroll-authenticated-smoke.spec.ts scripts/ui-route-smoke-gate.js
```

## Results

- `npm run seed:e2e:payroll`: passed.
- `auth-setup`: `1 passed`.
- `payroll-authenticated-smoke`: `9 passed`.
- `ui:smoke:payroll`: passed.
- `git diff --check`: exit `0`; only the existing `package.json` CRLF/LF warning was reported.

Seed output summary:

```json
{
  "organizationId": "org_payroll_e2e_auth_local",
  "requestedModules": ["payroll", "accounting"],
  "userId": "usr_payroll_e2e_auth_local",
  "email": "payroll.e2e@stockflow.test",
  "role": "PAYROLL_E2E",
  "storageState": "playwright/.auth/payroll.json"
}
```

UI route smoke summary:

```json
{
  "ok": true,
  "routeCount": 8,
  "routeStatuses": [
    "payroll: browser-auth",
    "payroll-attendance: browser-auth",
    "payroll-compensation: browser-auth",
    "payroll-contracts: browser-auth",
    "payroll-employees: browser-auth",
    "payroll-payslips: browser-auth",
    "payroll-register: browser-auth",
    "payroll-setup: browser-auth"
  ],
  "captureCount": 16,
  "failedCaptures": 0
}
```

## Evidence artifacts

- JSON report: `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`
- Screenshot directory: `what-next/payroll/screenshots/payroll-browser-smoke/`
- Screenshots generated:
  - `payroll-tablet.png`
  - `payroll-desktop.png`
  - `payroll-attendance-tablet.png`
  - `payroll-attendance-desktop.png`
  - `payroll-compensation-tablet.png`
  - `payroll-compensation-desktop.png`
  - `payroll-contracts-tablet.png`
  - `payroll-contracts-desktop.png`
  - `payroll-employees-tablet.png`
  - `payroll-employees-desktop.png`
  - `payroll-payslips-tablet.png`
  - `payroll-payslips-desktop.png`
  - `payroll-register-tablet.png`
  - `payroll-register-desktop.png`
  - `payroll-setup-tablet.png`
  - `payroll-setup-desktop.png`

## Note

An older local-only payroll demo tenant had immutable generated payroll rows. Those rows are not used by this validation path. The active default is the clean dedicated tenant `org_payroll_e2e_auth_local`, and the checked record counts above confirm this provisioner does not broaden into payroll seed data.
