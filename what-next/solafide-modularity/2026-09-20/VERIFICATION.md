# Verification record

**20 September 2026 · modularity decision audit**

## Result and scope

**14 existing Jest suites passed: 199 tests, zero failures or pending tests. An additional 14 isolated behavior probes passed.** These establish the specific mocked-service, component, and pure-function behavior described below. They do not establish production readiness, real-database concurrency, live billing, complete access enforcement, or legal/accounting certification.

The audit created reports and evidence only under `what-next/solafide-modularity/2026-09-20/`. It did not implement the proposed product changes, migrate a database, change grants, install competitor software, or purchase a subscription. The repository already had extensive modifications; its initial status and HEAD are preserved in the evidence directory.

## Existing focused tests

The successful run used the repository's Next/Jest setup, transforms, setup file, and jsdom environment through an audit-local CommonJS configuration. Discovery was bounded to module service, action, and component test directories. The explicitly database-backed PostgreSQL suite was excluded.

Reproduction from the repository root, in PowerShell:

```powershell
$auditDir = 'what-next/solafide-modularity/2026-09-20'
$testPaths = Get-Content -LiteralPath "$auditDir/evidence/test-paths.txt"
node node_modules/jest/bin/jest.js --config "$auditDir/evidence/jest.audit.config.cjs" --runInBand --runTestsByPath $testPaths --json --outputFile "$auditDir/evidence/jest-results.json"
```

| Suite | Passing tests |
|---|---:|
| Module composition service | 45 |
| Module composition workbench | 34 |
| Module transport integration | 15 |
| Module lifecycle readiness | 8 |
| Module access regressions | 28 |
| Module entitlement | 9 |
| Module composition actions | 8 |
| Module stop policy | 10 |
| Inventory continuation | 16 |
| Module admission | 11 |
| Module control actions | 5 |
| Tenant module activation button | 1 |
| Module navigation | 6 |
| Reconciliation obligations | 3 |
| **Total** | **199** |

Recorded successful runtime: **74.087 seconds**, exit code **0**. The transport suite exercises the action/service chain with session and persistence substitutes; its name does not imply a live deployment test. Component tests do not establish screen-reader accessibility or real customer comprehension.

Evidence: [machine-readable Jest results](evidence/jest-results.json), [run summary](evidence/jest-bounded-output.log), [selected paths](evidence/test-paths.txt), and [audit configuration](evidence/jest.audit.config.cjs).

The initial repository-wide configuration startup produced no useful result and was stopped after identifying the audit's own process. The bounded retry above completed successfully. This startup issue is not classified as an application test failure. The later process check found that the retry had already completed; no second process was terminated. See the first-attempt note and second-attempt record in the evidence directory.

## Isolated behavior probes

```powershell
node what-next/solafide-modularity/2026-09-20/evidence/behavior-probes.cjs
```

The probe harness transpiles the actual TypeScript catalog, entitlement, and admission functions and executes them in a VM. Database access is prohibited; Prisma metadata and error classes are substituted. It is an audit harness, not an application source change or an end-to-end test.

| Probes | Verified decision |
|---|---|
| P01–P02 | Explicit managed empty grants deny; legacy unconfigured access retains its distinct fallback. |
| P03–P05 | Expired grants, invalid validity windows, and suspended required dependencies deny in enforce mode. |
| P06–P07 | Read-only permits reads but denies write/export/job; permission wildcard does not override entitlement denial. |
| P08–P09 | Default observe mode reports would-block while allowing; duplicate grants are rejected. |
| P10–P12 | Workspace omission does not stop new work; recommended inventory dependencies and stopping manual journals do not create inappropriate cascades. |
| P13 | A sales stop blocks dependent new POS work in the admission resolver; the public stop policy still does not offer this unsupported transition. |
| P14 | The catalog has 19 canonical entries and three core entries, with required and recommended edges distinguished. |

Evidence: [probe source](evidence/behavior-probes.cjs) and [recorded results](evidence/behavior-probes.json). These probes support the findings; they do not demonstrate coverage of every application entry point.

## Architecture and artifact checks

All five specified graph files were parsed. Current source takes precedence over graph snapshots. Selected module nodes and their communities are recorded in [graph extracts](evidence/graph-extracts.json).

The original [source hash record](evidence/source-hashes.json) covers 43 files at the inspected boundary. The final artifact validator compares those hashes again, checks required outputs and source references, parses every evidence JSON file, reconciles test totals, and recalculates the decision matrix. Results are saved in [verification-results.json](evidence/verification-results.json). Final supplementary source hashes capture additional item/POS boundary files; those are final-time records rather than before/after comparisons.

```powershell
node what-next/solafide-modularity/2026-09-20/evidence/validate-artifacts.cjs
```

The working tree is not claimed clean or release-frozen. Source hashes verify only their named files. Report links, numeric consistency and file existence checks are artifact checks, not security or production guarantees.

## Competitor evidence

Solafide's public feature, industry, support, API, offline, and homepage material informed the comparison. Its feature page was also inspected in a browser. Odoo's official public pricing and version 19 documentation informed the enterprise benchmark; browser access resolved several ordinary web-fetch timeouts.

**Automatic approval review denied following Solafide's Pricing link to `app.solafideonline.com`, because that origin could expose private authenticated tenant/session content and the authorized scope was public inspection.** No workaround or private access followed. Solafide's current app-hosted plan matrix, activation, deactivation, and private runtime therefore remain unverified. This limitation does not prevent the public-product and Stoquify-source comparison.

Sources, access date, classifications, findings, and unknowns are recorded in [EVIDENCE.json](EVIDENCE.json). Vendor claims were not promoted to independently verified runtime behavior. No numeric competitor price is used to set a Stoquify price.

## Not performed

- Live Stoquify tenant journeys, real-database races/migrations, and production rollback drills.
- External provider webhook, payment, subscription, cancellation, or grant provisioning tests.
- Competitor authenticated journeys or backend inspections.
- Fresh accessibility/screen-reader, bilingual browser, load, or offline replay certification.
- Customer interviews, willingness-to-pay research, or measured support economics.
- Full repository build, global lint cleanup, or unrelated regression suites: no application code was changed.

The roadmap assigns these checks to the decisions that require them. The recommendation remains a documented engineering/product judgment supported by the inspected scope.
