# Delivery 12 — Finance access copy and French module states

Date: 14 October 2026. Source revision: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with substantial pre-existing working-tree changes. Status: implemented locally; real-browser acceptance remains open.

## User-visible change

Finance permission messages now explain that the organization administrator can review access. They retain the access-denial audit notice while removing internal terms such as RBAC, surface and tenant, and the blanket assertion that every affected finance page is read-only. Missing-organization recovery describes the organization's financial data.

Reconciliation module messages use organization terminology and explain that an administrator must enable the module. Both module-denial branches of Cash and Payment History now have English/French headings and recovery instructions. Source inspection established that these two requirements belong to `finance-cash-payment-history`; Cash Command itself has no route-level module requirements in this catalog. No new requirements were added.

Module-activation confirmation still discloses activation of missing required Finance or Accounting dependencies, audit logging and the current-password requirement. The activation component, authority checks, role permissions, organization binding, module enforcement order and protected data reads are unchanged. The edit only selects localized presentation copy for the known module identifiers. Existing fallback handling for other identifiers remains.

## Verification

| Evidence class | Result |
|---|---|
| Workflow contract | Passed, exit 0; 196 scripts outside the reviewed manifest |
| Current source inspection | Finance route wrapper, route/module catalog, route tests, shared route-state and activation components, and permission-denial audit calls inspected |
| Mocked component/route tests | **28 passed in 3 suites**, exit 0; see `evidence/delivery-12-tests.json` |
| Scoped semantic TypeScript | Passed, exit 0; normal dependency resolution with `noEmit`, incremental disabled and Next environment declarations |
| Production-file ESLint | Passed, exit 0 |
| Real database tests | Not run; no migration, seed or business transaction performed |
| Live rendered/browser acceptance | Not completed; browser control timed out before page inspection |

The mocked lane checks both EN/FR history module-denial branches, enforcement order, organization/actor context and audit flag, no protected-content mount on denial, no activation button for ordinary readers, administrator activation disclosure, locale-preserving recovery links and a single main landmark. Existing reconciliation tests retain requested-run selection checks and module/permission boundaries. Cash-command tests cover route and service denial, missing organization, source failure and French empty content. These are jsdom/component checks, not visual, responsive, screen-reader or real-role certification.

Commands, after reviewing scripts, registry and imported setup:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.finance-access-copy.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-12-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.finance-access-copy.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx"
```

The isolated Jest configuration calls `next/jest` without an application directory, avoiding application configuration/environment loading. Server authority, entitlement, data services and mutation actions are mocked. The reconciliation test now explicitly mocks its router rather than relying on the repository-wide setup. No build, application restart, deployment or commit was performed.

## Browser coverage and precise gap

| Destination / context | Locale / role / viewport / state | Observation |
|---|---|---|
| Edge, localhost:3000 `/en/login`, initial attempt | EN; current role and viewport not measured | Tab metadata initially showed login; focus/control calls timed out |
| Edge, localhost:3000 `/en/dashboard/accounting/accountant-access` | EN; accountant intended from user context, current role not independently confirmed; viewport unmeasured | Later tab inventory showed this destination and other dashboard/finance tabs. Claiming the page timed out in browser evaluation; no content or loaded state verified |
| Edge, localhost:3000 `/en/dashboard/finance/reconciliation`, dedicated attempt | EN; current role/viewport/state unverified | Opening a dedicated verification tab timed out during navigation; no populated, denied or error state accepted |

The initial login observation is superseded by later dashboard tab metadata. Asking the user to sign in again is not justified by that metadata. The immediate blocker is the browser-control timeout. Metadata alone does not establish page content, the current actor, successful data loading or a regression in the application. No screenshots or responsive measurements were obtained; no viewport override was applied. No permissions, modules, invitations or business transactions were submitted. Ordinary application reads may produce audit records.

## Remaining acceptance

1. Once browser control responds, confirm the actual accountant role and inspect reconciliation's populated, denied or error state; verify EN/FR recovery and access-review/accountant-portal destinations.
2. Verify the changed denial states with existing authorized fixtures at 1440×900, 1024×768 and approximately 390×844, including long French text and keyboard focus. Do not change live entitlements to manufacture a denial.
3. Complete actual owner/cashier journeys and the remaining responsive and screen-reader checks. Earlier SUPER ADMIN results do not substitute for these roles.

The larger roadmap remains in progress. This delivery does not certify retention, collaboration, network effects, referrals or release readiness.

## Ownership and rollback

The exact pre-edit bytes and hashes of the three existing source/test files and roadmap were captured in `evidence/delivery-12-baseline.json`. The owned patch and post-edit hash manifest are `evidence/delivery-12-owned.patch` and `evidence/delivery-12-files.json`. Reverse only the owned patch after reviewing later overlapping changes; never reset these files to HEAD. New scoped check configurations and this report can be removed independently. The shared finance catalog and business controls were not edited.
