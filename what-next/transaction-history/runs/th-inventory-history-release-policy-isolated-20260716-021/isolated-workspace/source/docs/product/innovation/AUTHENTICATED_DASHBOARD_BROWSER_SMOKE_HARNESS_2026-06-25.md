# Authenticated Dashboard Browser Smoke Harness

Date: 2026-06-25

## Scope

Added a narrow Jest + Testing Library smoke harness for the dashboards changed today:

- `/dashboard/owner-war-room`
- `/dashboard/manager-action-center`
- `/dashboard/accounting/close`

The harness lives at:

```powershell
__tests__/authenticated-dashboard-command-surfaces.smoke.test.tsx
```

## What It Proves

- Owner War Room loads through the real `requirePermission("dashboard.read")` path using a mocked Better Auth session and mocked Prisma tenant user lookup.
- Manager Action Center loads through the same authenticated tenant RBAC path.
- Accounting Close loads through the protected close-assurance server action path and derives tenant scope from the session context.
- The visible command shells render for all three surfaces.
- Owner and Manager route `loading.tsx` and `error.tsx` states render safely without leaking raw error text.
- Accounting Close exposes its route-specific loading and retryable error panels inside `CloseAssuranceCenter`.

## How To Rerun Locally

From the repo root:

```powershell
npm test -- --runInBand __tests__/authenticated-dashboard-command-surfaces.smoke.test.tsx
```

No Playwright setup, dev server, database, or broad E2E rollout is required. The test uses the existing Jest/jsdom stack and mocks only the session, Prisma user lookup, and read-model service boundaries.
