# AqStoqFlow HRIS/Payroll Browser, Accessibility, and Release Gate

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-16-browser-accessibility-release`  
Status: **Authenticated HRIS self-service browser gate passed for development; overall production readiness remains blocked**  
Next handoff: `aqstoqflow-hris-payroll-17-migration-backfill-pilot`

## Executive Decision

The active People and self-service browser slice passed authenticated Chromium verification across mobile, tablet, and desktop. The authenticated role without HRIS permissions was denied on every tested People route, received redacted permission states, and did not receive protected HRIS navigation or employee data.

This clears the Skill 16 browser/accessibility/RBAC gate for continued development and a controlled migration/backfill pilot. It does not certify the overall HRIS/payroll system for production. The Cameroon country-pack chain remains blocked until qualified signed expert approval is bound to the statutory source artifacts and Skills 12 through 14 are rerun.

## Scope

Authenticated People routes:

- `/en/dashboard/people`
- `/en/dashboard/people/payroll_e2e_browser_2026_06_employee`
- `/en/dashboard/people/me`
- `/en/dashboard/people/team`
- `/en/dashboard/people/approvals`
- `/en/dashboard/people/history`

Responsive viewports:

- Mobile: 390 x 844.
- Tablet: 820 x 1180.
- Desktop: 1440 x 1100 for authenticated route evidence.
- Denied desktop states used the Playwright project default 1280-pixel viewport.

## Files Inspected

- `playwright.config.ts`
- `tests/e2e/auth.setup.ts`
- `tests/e2e/hris-authenticated-release.spec.ts`
- `tests/e2e/hris-rbac-negative.spec.ts`
- `scripts/seed-payroll-e2e-user.js`
- `scripts/ui-route-smoke-gate.js`
- `config/permissions.ts`
- `config/sidebar.ts`
- `lib/security/rbac-permissions.ts`
- People route pages under `app/[locale]/(dashboard)/dashboard/people/`
- HRIS components and services consumed by the tested routes
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SELF_SERVICE_2026-07-19.md`
- the prior 2026-07-16 browser/accessibility/RBAC release evidence

## Files Changed

- `tests/e2e/hris-authenticated-release.spec.ts`
- `tests/e2e/hris-rbac-negative.spec.ts`
  - Added the optional `HRIS_BROWSER_EVIDENCE_TAG` input so evidence can be regenerated under a dated path while preserving the existing `2026-07-16` default.
- `what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RELEASE_EVIDENCE_2026-07-19.json`
- `what-next/payroll/STOQUIFY_HRIS_RBAC_NEGATIVE_BROWSER_EVIDENCE_2026-07-19.json`
- 25 PNG artifacts under `what-next/payroll/screenshots/hris-browser-accessibility-rbac-release-2026-07-19/`
- this report

No application or business-logic code was changed because the verified slice exposed no UI, accessibility, tenant, or authorization defect. Existing working-tree changes were preserved and were not staged, reverted, reformatted, or committed.

## Data Ownership

- HRIS remains the owner of employee, organization, contract, workforce, and self-service request truth.
- Payroll consumes governed HRIS facts and remains the owner of payroll calculation and statutory pay truth.
- Accounting remains the owner of ledger truth.
- Assurance owns evidence that the HRIS-to-payroll-to-accounting chain is complete and controlled.
- Browser evidence is an observation of the UI and authorization boundary; it creates no business truth.

The deterministic browser fixtures are local development evidence, not production records, statutory evidence, or migration truth.

## Tenant and RBAC Decision

Both browser identities resolved within the deterministic local tenant `org_payroll_e2e_local`.

The manager identity exercised the People directory, employee profile, employee self-service, manager team, approvals, and history routes. The denied requester remained authenticated but lacked HRIS permissions.

The denied requester:

- received a `DENIED` permission state on all six People routes;
- did not receive protected employee data;
- did not receive People, My HR, or Workforce sidebar links;
- retained an accessible and geometrically stable denied state on mobile.

No client-supplied tenant, employee, manager, or permission value was accepted as authorization truth.

## Audit and Redaction Decision

- No production mutation, approval, payment, or statutory submission path was exercised.
- No permission override or bypass was introduced.
- Denied route evidence contains permission UI rather than protected employee content.
- Positive screenshots contain deterministic demo-only records and must remain controlled local development evidence.
- Passwords, cookies, payment destinations, raw documents, source hashes, provider payloads, and authority payloads were not emitted into the evidence.
- Existing server-side audit and business-event behavior was not changed.

## Gates Run

| Gate | Result |
| --- | --- |
| Authenticated People routes across three responsive viewports | Passed: 18/18 route/viewport checks; Playwright project 21/21 including setup |
| Serious/critical automated accessibility findings | Passed: 0 |
| Document overflow | Passed: 0 |
| Overlapping elements | Passed: 0 |
| Clipped elements | Passed: 0 |
| Authenticated HRIS-negative routes and navigation | Passed: 7/7 evidence records in `DENIED` state; Playwright project 12/12 including setup |
| Protected-data exposure in denied states | Passed: 0 |
| Playwright routing, route-smoke, sidebar, and permission regressions | Passed: 4 suites, 29 tests |
| `node --check scripts/seed-payroll-e2e-user.js` | Passed |
| Scoped `git diff --check` | Passed before report creation |

Machine-readable evidence totals:

- authenticated route/viewport records: 18;
- denied-state records: 7;
- screenshots: 25;
- serious/critical accessibility findings: 0;
- overflow findings: 0;
- overlap findings: 0;
- clipping findings: 0;
- protected-data exposures: 0.

## Evidence

- `what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RELEASE_EVIDENCE_2026-07-19.json`
- `what-next/payroll/STOQUIFY_HRIS_RBAC_NEGATIVE_BROWSER_EVIDENCE_2026-07-19.json`
- `what-next/payroll/screenshots/hris-browser-accessibility-rbac-release-2026-07-19/`

## Current Blockers

No functional browser, responsive-layout, serious/critical automated-accessibility, tenant, or negative-RBAC blocker was found in the tested HRIS slice.

Overall production certification remains blocked by:

1. Missing qualified signed Cameroon statutory approval and source-artifact binding. Development authorization is not a substitute for legal/statutory expert approval.
2. The uncompleted production migration/backfill pilot and current owner sign-off for the target deployment dataset.
3. Cross-browser, assistive-technology, live identity-provider, and production-entitlement verification not covered by this local Chromium run.

## Skipped Checks

- Manual human-style review of the generated PNGs was attempted but could not be completed because the Windows desktop image sandbox repeatedly failed with `helper_unknown_error: setup refresh had errors`, including from the dedicated visualization directory.
- Firefox and WebKit execution.
- Real screen-reader and full keyboard-only workflow certification.
- Staging or production identity provider, production data, and production module-entitlement validation.
- Load, latency, and high-concurrency browser testing.
- Full-repository test and typecheck runs; verification remained focused on the bounded Skill 16 surface.

The manual-viewer limitation does not replace or invalidate the generated screenshots, axe assertions, overflow measurements, pairwise overlap checks, clipping checks, route assertions, and negative-RBAC assertions. It remains a release-review limitation that must be closed before unrestricted production sign-off.

## Residual Risk

- Chromium evidence does not prove parity in every supported browser.
- Automated geometry and accessibility checks cannot replace design-owner review, screen-reader testing, or keyboard-only validation.
- The deterministic fixture proves one tenant and two role profiles, not every persisted or custom role combination.
- Local development authentication does not prove production identity-provider behavior.
- Passing Skill 16 does not clear statutory, migration, payment/declaration, accounting-close, or overall final-readiness gates.

## Handoff Decision

Proceed to `aqstoqflow-hris-payroll-17-migration-backfill-pilot`.

The next tranche should audit the existing 2026-07-17 pilot evidence against the current schema and controls, rerun the tenant-scoped dry-run and reconciliation gates when needed, preserve source lineage, verify rollback and exception handling, and refuse production mutation until owner acceptance and all statutory prerequisites are complete.
