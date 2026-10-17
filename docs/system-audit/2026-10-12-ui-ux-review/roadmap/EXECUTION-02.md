# Delivery 02 — accurate dashboard access recovery

13 October 2026. Scope: UX01-A, the acceptance defect discovered in the accountant session. Status: implemented locally and regression-tested; fresh browser acceptance pending. No deployment.

## Result

The dashboard no longer describes every permission denial as a deleted organization. Ordinary `FORBIDDEN` errors show the existing permission-denied state in EN/FR, with a localized **Review my access** link and guidance to use available navigation. There is no sign-out prompt for this denial and no loop back into the same denied dashboard.

The existing explicit `Session organization is stale` RBAC discriminator retains session recovery. Missing/inactive organization recovery now states that the active organization is unavailable for the session, without asserting deletion. French accents and the shared error component's locale are corrected. Expired authentication during the data read now redirects to localized login, as it already did during initial context resolution. Unexpected failures still propagate to the error boundary.

No permission, role, tenant guard, service or domain data was changed. `requireRbacContext`, the action's `dashboard.read` check and tenant assertion remain authoritative. The access-review destination itself requires a fresh valid organization context and checks request/review authority independently; merely opening it does not create a request or grant access. No automatic role-based redirect was added.

## Owned files

- `app/[locale]/(dashboard)/dashboard/page.tsx` — clean before this slice; focused recovery/presentation changes.
- `components/dashboard/__tests__/DashboardPageAccess.test.tsx` — new regression suite.
- `roadmap/jest.access.config.cjs` — isolated installed Next/Jest runner; no project Next config, environment loading or application setup.
- This report, roadmap ledger, scoped patch and test JSON.

All unrelated working-tree edits remain untouched. [Application patch](evidence/dashboard-access-2026-10-13.patch).

## Verification

| Evidence | Result |
|---|---|
| Workflow | `npm run agent:workflow:check` passed; 198 unrelated scripts unclassified |
| Reproduction | Before application fix, regression suite ran: 12 failed, 8 passed, reproducing false recovery and missing locale/expired-data-read handling |
| Regression | **20 passed / 1 suite**, zero failures, after fix |
| Syntax | Changed route and new test parsed without TypeScript syntax errors; not a semantic typecheck |
| Whitespace | Scoped `git diff --check` passed |
| Database tests | Not run; mocks do not certify real database behavior |
| Rendered checks | Attempted but not completed on 13 October; do not count yesterday's screenshot as post-fix evidence |
| Release | No build, migration, seed or deployment |

Exact test command:

```powershell
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.access.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/dashboard-access-tests-2026-10-13.json
```

The suite mocks fresh RBAC context, dashboard data action, navigation redirect and expensive dashboard/session components. It renders the real shared permission-denied component and uses the real locale path helper. Next Intl configuration and Lucide icons are mocked to avoid ESM-only package loading in this isolated lane. Initial runner attempts encountered those ESM imports; those runner issues were resolved before the final 20-test result. EN/FR coverage includes denial at context and data boundaries, explicit stale binding at both boundaries, inactive organization, expired auth at both boundaries, unexpected service failure, authorized organization scope, legacy missing-organization failure and absent organization. [Raw results](evidence/dashboard-access-tests-2026-10-13.json).

## Browser/runtime limitation

Only Edge was connected in the current browser inventory; Chrome and Firefox were not exposed. The existing localhost dashboard initially refused the connection. Reviewed `dev`, `predev`, `prisma:ensure`, the ensure-client script, Next configuration and locale plugin. `npm run dev` regenerated Prisma Client v6.19.3 and reported Next ready. This generation writes installed client artifacts, not database migrations or seed data; Prisma configuration declares a seed command but generation did not execute it.

The browser still could not reach a usable page. A hidden Next-only startup and an approved outside-sandbox startup were attempted; the latter reported port 3000 already in use. Host listener metadata confirmed occupied IPv4/IPv6-related listeners; no listener was killed or replaced. Subsequent browser navigation/inspection timed out. These are runtime/tool limitations, not proof that the fixed page failed to render. No fabricated role, session cookie copying, credential access or financial action was used to overcome the gap.

Current state: live role acceptance remains open. Do not ask the accountant to sign out merely because the earlier screen said the organization was deleted; that was the defect under repair. Restore a responsive connected session, then verify the EN/FR denied state, the access-review link, available accounting/POS navigation, keyboard focus and mobile wrapping. Do not send an access request during a read-only acceptance check.

## Continuation and rollback

This is a narrow shared-entry repair using the robust-state skill's existing-component guidance, not completion of the full phase-05 suite or broader roadmap. Next implementation remains UX02 dashboard hierarchy/localization and UX03 reliable action handoffs. Continue role acceptance when the browser connection is usable.

Rollback only this route's patch and its owned test/runner; preserve other changes. The stale-session classifier depends on the existing canonical RBAC message because the current error code is shared with permission denial. If RBAC gains a dedicated stale-session code later, migrate this branch and its tests together. Do not broaden access to make the dashboard render.
