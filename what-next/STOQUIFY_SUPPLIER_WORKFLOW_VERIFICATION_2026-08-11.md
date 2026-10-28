# Stoquify Supplier Workflow Verification — 2026-08-11

## Executive result

- Browser aggregate: **PASS**.
- Evidence-scoped workflow-verifier outcome: **PASS WITH CONDITIONS**.
- Final authoritative run: **28 passed, 0 failed, 0 skipped/not run (11.0 minutes)**.
- Scope: supplier list, create, profile, edit, and supplier-filtered history across desktop, tablet, and mobile; denied, loading, empty, error, degraded, locked, and success states.
- No production supplier UI, action, service, schema, or policy code was changed. Remediation was confined to supplier fixtures, Playwright specs/configuration, evidence aggregation, and the supplier npm command.

The condition is evidence-specific: automated screenshots, accessibility scans, focus assertions, and layout measurements passed, but the Codex image viewer could not open local images because the Windows filesystem sandbox repeatedly failed to initialize. This report therefore does not claim a manual pixel review, screen-reader certification, legal compliance, or whole-product release certification.

## Scope and boundaries

| In scope          | Verification                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success surfaces  | List, create, profile, edit, and history at 1280×720 desktop, 834×1112 tablet, and 412×915 mobile                                                             |
| Lifecycle         | Tenant-scoped list, create and detail redirect, hard-refresh persistence, edit persistence, supplier-context history, controlled export, archive confirmation |
| Robust states     | Loading, empty, error, degraded, denied, locked, success                                                                                                      |
| Access boundaries | Denied list/create/profile/edit/history, foreign-tenant non-disclosure, purchasing-module lock                                                                |
| Evidence quality  | Freshness, screenshot presence, serious/critical axe violations, document overflow, clipped actions, overlapping actions, fixture cleanup                     |

Out of scope: the adjacent AP workbench and finance-payables presentation scenarios previously numbered 8 and 9, accounting posting correctness, provider integration, full localization coverage, concurrency/load testing, and manual assistive-technology testing.

The existing graph reports were consulted for impact control. The supplier dashboard sits in the component graph's principal community, while legacy supplier-system routes appear in the app graph; no graph-mapped production component or route implementation was modified.

## Evidence inventory

- Aggregate manifest: `what-next/evidence/supplier-browser-certification-2026-08-11/certification-summary.json`
- Evidence directory: `what-next/evidence/supplier-browser-certification-2026-08-11/`
- Final run window: `2026-08-11T17:27:53.044Z` to `2026-08-11T17:38:53.845Z`
- Artifacts: 33 files — 25 PNG screenshots and 8 JSON records.
- Evidence result records: 24.
- Complete success matrix: five required surfaces × three viewports.
- State union: degraded, denied, empty, error, loading, locked, success.
- Accessibility/layout aggregate: 0 serious/critical axe violations, 0 horizontal-overflow records, 0 clipped-action records, 0 overlapping-action records.
- Cleanup: PASS; 6 export-audit records observed before cleanup; 0 supplier organizations, users, suppliers, or locked organizations remained afterward.
- Evidence errors: 0. Cleanup errors: 0.

## Mandatory gate review

| Gate                           | Result | Evidence-scoped basis                                                                                                                               |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Authority and ownership     | PASS   | Real supplier pages/actions were exercised with tenant fixtures; no duplicate production authority was introduced.                                  |
| G2 Lifecycle correctness       | PASS   | Create, persisted profile, persisted edit, export controls, and archive completed across all three viewports.                                       |
| G3 Access and tenant isolation | PASS   | Denied role was blocked from list/create/profile/edit/history; foreign supplier lookup disclosed no supplier data.                                  |
| G4 Write integrity             | PASS   | Browser mutations survived hard refresh and fixture cleanup verified no residue. No concurrency claim is made.                                      |
| G5 Downstream handoff          | PASS   | Supplier history preserved the supplier identifier and context; denied and locked history paths failed closed. No accounting-posting claim is made. |
| G6 Evidence and recovery       | PASS   | Export control evidence, audit count, recovery links where authorized, non-disclosure, freshness, and cleanup were asserted.                        |
| G7 Regression confidence       | PASS   | Final 28-test browser run, 10 fixture unit tests, test discovery, Prettier, and ESLint all passed.                                                  |

Conditional gates:

- Finance/accounting correctness: not assessed beyond the supplier-to-history handoff.
- SaaS packaging: PASS for the purchasing-module locked history state.
- Accessibility/responsive behavior: PASS WITH CONDITIONS; automated axe serious/critical checks, keyboard/focus assertions, and layout checks passed, but no manual screen-reader or pixel review is claimed.

## Supplier-slice remediation

1. Added a dedicated supplier Playwright configuration with an isolated Next build directory, API readiness probe, one worker, explicit projects, and teardown aggregation.
2. Kept the success spec supplier-focused by running scenarios 1–7 and excluding adjacent AP/finance presentation scenarios 8–9.
3. Added deterministic state projects for loading, empty, missing-supplier error, foreign-tenant degraded behavior, history denial, and module lock.
4. Added a guarded local locked-tenant fixture and fixture tests; production backfill remains false.
5. Added screenshot/accessibility/layout evidence helpers and narrowed overlap detection for an intentional same-wrapper search input/clear-button composite.
6. Added a 6.5-second bounded retry for transient `/api/me/permissions` dev-server responses during supplier auth setup; failures still surface the last response.
7. Added manifest-based evidence pruning so stale or unrelated AP/finance screenshots cannot remain in the supplier certification folder.
8. Defaulted the certification run-start timestamp inside the Playwright config, preserving a caller-supplied value, so stale evidence is rejected for every invocation.

## Exact final commands and results

### Authoritative browser run

```powershell
$env:PLAYWRIGHT_PORT='3137'; $env:AQSTOQFLOW_SUPPLIER_CERT_STARTED_AT=(Get-Date).ToUniversalTime().ToString('o'); node node_modules/@playwright/test/cli.js test --config=playwright.supplier.certification.config.ts
```

Result: exit 0; 28 passed; 0 failed; 0 skipped/not run; 11.0 minutes. All setup, desktop, tablet, mobile, state-matrix, denied, locked, and aggregate-cleanup projects passed.

Non-failing dev-server output: `next-intl`/webpack cache dependency warnings, a future `allowedDevOrigins` warning for `127.0.0.1`, and `ECONNRESET`/`aborted` messages during server shutdown.

### Discovery

```powershell
node node_modules/@playwright/test/cli.js test --config=playwright.supplier.certification.config.ts --list
```

Result: exit 0; 28 tests in 8 files.

### Fixture unit tests

```powershell
node node_modules/jest/bin/jest.js --runTestsByPath scripts/__tests__/supplier-e2e-fixture.test.js scripts/__tests__/supplier-locked-e2e-fixture.test.js --runInBand --silent
```

Result: exit 0; 2 suites passed; 10 tests passed; 0 snapshots.

### Formatting

```powershell
node node_modules/prettier/bin/prettier.cjs --check package.json playwright.supplier.certification.config.ts scripts/supplier-locked-e2e-fixture.js scripts/__tests__/supplier-locked-e2e-fixture.test.js tests/e2e/supplier-auth.setup.ts tests/e2e/supplier-authenticated-release.spec.ts tests/e2e/supplier-rbac-negative.spec.ts tests/e2e/supplier-locked-auth.setup.ts tests/e2e/supplier-certification-evidence.ts tests/e2e/supplier-state-matrix.spec.ts tests/e2e/supplier-history-rbac-negative.spec.ts tests/e2e/supplier-locked-state.spec.ts tests/e2e/supplier-certification-cleanup.setup.ts
```

Result: exit 0; all matched files use Prettier style.

### Lint

```powershell
node node_modules/eslint/bin/eslint.js playwright.supplier.certification.config.ts scripts/supplier-locked-e2e-fixture.js scripts/__tests__/supplier-locked-e2e-fixture.test.js tests/e2e/supplier-auth.setup.ts tests/e2e/supplier-authenticated-release.spec.ts tests/e2e/supplier-rbac-negative.spec.ts tests/e2e/supplier-locked-auth.setup.ts tests/e2e/supplier-certification-evidence.ts tests/e2e/supplier-state-matrix.spec.ts tests/e2e/supplier-history-rbac-negative.spec.ts tests/e2e/supplier-locked-state.spec.ts tests/e2e/supplier-certification-cleanup.setup.ts
```

Result: exit 0; no lint output.

## Intermediate diagnostic truth

- `$env:PLAYWRIGHT_PORT='3130'; npm run test:e2e:supplier` — exit 1 after the 240-second web-server timeout; no supplier test ran because the generic landing readiness route failed. This led to the isolated API-readiness configuration.
- First full isolated run on port 3132 — exit 1; 20 passed, 6 failed, 8 did not run. Failures identified cold-build timeout, out-of-scope AP/finance scenarios, an intentional input/button overlap false positive, and lock-copy expectation drift.
- Second full isolated run on port 3133 — exit 1; 26 passed, 2 failed. The only state failure was the intentional search input/clear-button composite; aggregate correctly failed with it.
- Full run on port 3134 — exit 0; 28 passed in 9.7 minutes.
- Cleanup-only run on port 3135 — exit 1; its pre-cleanup audit-count assertion correctly could not be replayed after the prior full run had already removed fixtures. It did remove three stale out-of-scope screenshots; a fresh full lifecycle superseded this result.
- Full run on port 3136 — exit 0; 28 passed in 8.7 minutes and validated evidence pruning.
- `npm run test:e2e:supplier -- --list` — in this Windows npm invocation, `--list` was not forwarded and the suite launched. It exited 1 with 2 failures and 26 not run after a transient Next manifest-read 500 in auth setup; cleanup then truthfully rejected missing evidence. This exposed the bounded auth-read retry added before the final run. Use the direct Playwright discovery command above.
- Final full run on port 3137 — exit 0; 28 passed in 11.0 minutes. This is the authoritative result.

## Residual conditions and next action

- Highest residual severity: low, evidence/tooling only.
- The automated screenshots are present and machine-checked, but manual image viewing was blocked by the Codex Windows sandbox (`helper_unknown_error: setup refresh had errors`).
- A manual responsive/pixel and screen-reader pass would be required to remove the accessibility/visual condition.
- The Next dev-server cache, cross-origin, and shutdown warnings are outside the supplier slice and did not change test outcomes.

This is an evidence-scoped supplier browser verification result, not a legal, accounting, security, or whole-product release certification.
