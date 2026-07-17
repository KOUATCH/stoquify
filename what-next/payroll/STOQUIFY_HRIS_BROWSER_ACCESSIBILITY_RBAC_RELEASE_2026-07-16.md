# Stoquify HRIS Browser, Accessibility, and RBAC Release

Date: 2026-07-16

## Executive outcome

Status: **Ready for a controlled landing and the next HRIS execution slice, with documented browser-tooling limitations. This is not unrestricted production certification.**

The authenticated People and Payroll surfaces now have current Chromium evidence across mobile, tablet, and desktop viewports. The authenticated requester without HRIS permissions was also exercised against every People route and received explicit redacted permission states.

- People: 6 routes x 3 viewports = 18 evidence records.
- Payroll: 6 routes x 3 viewports = 18 evidence records.
- RBAC negative: 6 desktop denied routes plus 1 mobile denied-state check = 7 evidence records.
- Focused denied-role Playwright run: 11/11 tests passed.
- Serious/critical axe findings: 0.
- Document overflow findings: 0.
- Element overlap findings: 0.
- Clipped interactive/text element findings: 0.

## Scope

Authenticated People routes:

- `/en/dashboard/people`
- `/en/dashboard/people/payroll_e2e_browser_2026_06_employee`
- `/en/dashboard/people/me`
- `/en/dashboard/people/team`
- `/en/dashboard/people/approvals`
- `/en/dashboard/people/history`

Authenticated Payroll routes:

- `/en/dashboard/payroll`
- `/en/dashboard/payroll/runs`
- `/en/dashboard/payroll/payments`
- `/en/dashboard/payroll/declarations`
- `/en/dashboard/payroll/attendance`
- `/en/dashboard/payroll/payslips`

Responsive viewports:

- Mobile: 390 x 844.
- Tablet: 820 x 1180.
- Desktop: 1440 x 1100 for positive route evidence.
- Denied desktop states used the project default 1280-pixel viewport.

## Files inspected

- `playwright.config.ts`
- `tests/e2e/auth.setup.ts`
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `scripts/seed-payroll-e2e-user.js`
- `scripts/payroll-browser-smoke.js`
- `scripts/ui-route-smoke-gate.js`
- People route pages under `app/[locale]/(dashboard)/dashboard/people/`
- HRIS components under `components/hris/`
- HRIS services under `services/hris/`
- Permission and sidebar contracts in `config/permissions.ts`, `config/sidebar.ts`, and `lib/security/rbac-permissions.ts`
- The prior accounting/finance assurance handoff report.

## Files changed

- `playwright.config.ts`
  - Added separate authenticated HRIS-positive and HRIS-denied Playwright projects.
- `scripts/seed-payroll-e2e-user.js`
  - Added four HRIS permissions to the manager fixture only.
- `tests/e2e/auth.setup.ts`
  - Creates isolated manager and authenticated denied-role storage states and validates their tenant/permission contracts.
- `tests/e2e/hris-authenticated-release.spec.ts`
  - Added positive People route, responsive, axe, screenshot, overflow, overlap, and clipping coverage.
- `tests/e2e/hris-rbac-negative.spec.ts`
  - Added denied-route, sidebar non-disclosure, mobile accessibility, and redaction coverage.
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
  - Extended Payroll accessibility/layout evidence from mobile-only layout checks to mobile, tablet, and desktop.
- Browser evidence JSON and PNG artifacts under `what-next/payroll/`.
- This report.

No unrelated dirty-worktree files were reverted, reformatted, staged, or committed.

## Data ownership

- HRIS continues to own employee, organization, contract, and workforce truth.
- Payroll consumes HRIS-backed facts and owns payroll calculation and statutory pay truth.
- Accounting owns ledger truth.
- Assurance owns evidence that the chain is complete and controlled.
- The browser layer creates no business truth and was exercised only as a read/interaction surface.

The seeded records are deterministic local browser fixtures. They are explicitly not production backfill or statutory truth.

## Tenant and RBAC decision

Both browser identities resolve to `org_payroll_e2e_local`.

Manager fixture:

- Requires `payroll.command.read`.
- Requires `hris.people.read` and `hris.people.manage`.
- Requires `hris.self_service.read`.
- Receives `hris.self_service.request` from the seed contract.

Denied requester fixture:

- Remains authenticated.
- Requires `payroll.command.read` so the dashboard shell and Payroll route are real.
- Is explicitly asserted not to have `hris.people.read`, `hris.people.manage`, `hris.self_service.read`, or `hris.self_service.request`.

The denied requester received a permission state on all six People routes, did not receive People/My HR/Workforce sidebar links, and did not receive the seeded employee name, employee code, or phone fragment.

## Audit and redaction decision

- No production mutation path was exercised.
- No permission override or bypass was introduced.
- Denied-state screenshots contain permission UI rather than protected employee data.
- Positive screenshots contain deterministic demo-only employee data and must remain local release evidence.
- The browser tests do not expose passwords, auth cookies, payment destination values, raw documents, provider payloads, or authority payloads.
- Existing server-side audit behavior was not changed by this slice.

## Gates run

| Gate | Result |
| --- | --- |
| Scoped ESLint for Playwright config and E2E files | Passed |
| `node --check scripts/seed-payroll-e2e-user.js` | Passed |
| `npm run typecheck` | Passed |
| Playwright routing and payroll browser harness Jest tests | 2 suites, 8 tests passed |
| Deterministic local Payroll/HRIS browser seed | Passed |
| Combined Payroll, HRIS-positive, and RBAC-negative Playwright command | Payroll and HRIS-positive evidence completed; command wrapper timed out at 1204 seconds before a final aggregate and before RBAC evidence teardown |
| Focused `hris-rbac-negative` Playwright rerun | 11/11 tests passed in 5.4 minutes |
| Machine-readable evidence contract | Passed: HRIS 18, Payroll 18, RBAC 7; all required geometry/accessibility counters zero |
| Permission, sidebar, RBAC, and Payroll route policy Jest tests | 4 suites, 46 tests passed |
| Scoped `git diff --check` | Passed |

The combined timeout is an orchestration-duration issue, not a hidden pass claim. Payroll and HRIS-positive JSON writers completed with all expected records and zero asserted findings. The unfinished negative project was rerun independently and passed with a definitive Playwright summary.

## Evidence

- `what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RELEASE_EVIDENCE_2026-07-16.json`
- `what-next/payroll/STOQUIFY_HRIS_RBAC_NEGATIVE_BROWSER_EVIDENCE_2026-07-16.json`
- `what-next/payroll/AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json`
- `what-next/payroll/screenshots/hris-browser-accessibility-rbac-release-2026-07-16/`
- `what-next/payroll/screenshots/payroll-authenticated-accessibility-mobile/`

## Current blockers

No functional tenant, RBAC, responsive-layout, or serious accessibility blocker was found in the tested slice.

Operational limitations:

1. The all-project development-server run exceeds the 20-minute command wrapper. CI should run the projects separately or use a larger job timeout while keeping the seeded tenant serialized.
2. Manual image viewing and the in-app browser connection were blocked by a Windows sandbox refresh failure: `helper_unknown_error: setup refresh had errors`.

The second limitation prevented a human-style visual sign-off in this run. It did not prevent Playwright from producing full-page PNGs, axe results, route assertions, overflow measurements, pairwise overlap measurements, or clipping measurements.

## Skipped checks

- Manual visual inspection of the generated PNGs, due to the sandbox helper failure above.
- Firefox and WebKit cross-browser execution.
- Real screen-reader testing and full keyboard-only workflow certification.
- Staging/production identity provider, production data, and production module-entitlement validation.
- Load, latency, and high-concurrency browser testing.

## Residual risk

- Chromium-only evidence does not prove parity in every supported browser.
- Automated geometry checks cannot replace design-owner review of visual hierarchy and content quality.
- Cold Next.js development compilation makes the combined release command slow and can obscure project-level summaries.
- The deterministic fixture proves the permission boundary for one tenant and two roles, not every custom role combination.
- Evidence remains controlled-pilot evidence and must not be represented as statutory or production backfill assurance.

## Handoff

Next skill: `stoquify-hris-18-migration-backfill-pilot`.

The migration/backfill pilot should consume the established ownership and RBAC boundaries, use dry-run and reconciliation evidence, preserve source lineage, and refuse any production mutation until tenant-scoped rollback and exception handling are proven.
