# Verification record — native composition and lifecycle

Evidence date: 2026-09-05. Branch: codex/migration-control-plane-release-2026-08-29; starting commit a05a41ef66cd5d98fd69ae3df18225795f912232. This is scoped engineering and isolated application evidence, not production or professional certification. Earlier report text/source binding remains under evidence/lifecycle-continuation/previous-record/.

## Current source checks

| Check | Result and evidence |
|---|---|
| Core access, transport, navigation, action, stop-policy, journal and inventory-contract checks | 113 tests / 10 suites passed; lifecycle-continuation/core-tests.json and core-tests-receipt.json; source hashes unchanged during execution |
| Composition lifecycle, readiness, actions, payroll readiness/control and purchase-order checks | 122 tests / 6 suites passed; lifecycle-services-unit-and-lint-20260905-final.json. Post-run hashes recorded; no pre-run hash capture for this group |
| Inventory admission and exact frozen-count continuation | 36 tests / 4 suites passed; lifecycle-continuation/inventory-admission-tests-final.json |
| POS, unchanged offline replay, sales and reconciliation admission boundaries | 75 tests / 4 suites passed; lifecycle-continuation/domain-admission-tests.json |
| Reconciliation obligation observations | 6 tests / 2 suites passed, including rollback-only real PostgreSQL fixture checks; lifecycle-continuation/reconciliation-obligations-tests.json |
| Admission locking/error/dependency helper | 10 passed, part of earlier 18-check admission/stop run; lifecycle-continuation/stop-policy-tests.json. The eight stop-policy cases also passed in the final core run |
| Workbench components | 25 passed; workbench-lifecycle-review.json. After one final sandbox-card label correction, its focused case passed (1 selected,24 unselected); workbench-lifecycle-sandbox-card.json |
| Full TypeScript check | Passed, exit0; latest inline-feedback-typecheck-receipt.json follows the final inline localization and explicit transfer-read permission correction. Earlier checks remain retained. Affected source hashes remained stable during the final check |
| Changed-source lint | Passed, exit0; lifecycle-continuation/changed-source-lint-receipt.json. Separate source/test lint also passed in backend/UI/domain lanes |
| Focused whitespace check | Passed, exit0. Existing line-ending warnings are retained, not treated as application failures |
| Schema/client/catalogue | Final schema generated successfully with Prisma6.19.3; 84 catalogue entries ready. Client engine checksum unchanged during local generated-code refresh |
| Isolated migrations | All four integration migrations applied on both owned local databases; lifecycle-continuation/isolated-migrations.json |
| Settings route classifier | Passed, zero findings across38 records; lifecycle-continuation/settings-surfaces.json |
| Repository module surface ratchet | FAILED against the July baseline:156 new-baseline findings /163 current active gaps. Scoped comparison with earlier integration snapshot:167→163, zero introduced findings; lifecycle-continuation/module-surfaces-final.json. This is not a universal enforcement pass |
| Actual PostgreSQL lifecycle/constraints | 18/18 passed with source unchanged; modern-modules-postgres-smoke-b3c4a2958253.json |
| Actual application browser | Passed: 10 full-suite checks / 2 intentional duplicate-project skips; 3 final mobile capture reruns; 1 real French stopped-transfer denial. No unexpected failures or flaky results in these final groups. The capture reruns overlap the full suite and are not additional distinct journeys; browser-results-lifecycle-full.json, browser-results-mobile-capture-final.json and browser-results-stopped-work-fr.json. Earlier invalid captures are archived separately |
| Production build/deployment | Not run. Default build invokes migrations. Route compilation and authenticated journeys use the isolated Next development app |

Paths in the result table are relative to this run's evidence/ directory. The final source/evidence binding identifies exact file hashes; a dirty-tree commit alone cannot identify this implementation. Groups overlap where explicitly stated and must not be blindly added together.

## Real PostgreSQL proof

Target: stoquify_local_modern_modules_controls_20260905_01, loopback only, synthetic owned organizations. The stable18-check run proves legacy conversion retains all19 canonical grants; requested preparation retains the prior active configuration; actual missing setup is observed; staged domain setup followed by resume completes the same operation without repeating unchanged successful step evidence; duplicate/concurrent submissions, stale/superseded requests and cross-tenant objects are handled; requests/events cannot be rewritten/deleted; authority/history remain tenant-linked; supported inventory/purchasing/payroll stops reach RETAINED; inventory reactivation rechecks current authority and readiness.

Reconciliation aggregate tests create transaction-local temporary tables on a pinned PostgreSQL connection and roll back unconditionally. They cover full signed versus partial/unsigned/cross-tenant/void-corrected matches, legacy electronic payments lacking valid linkage, imports, exceptions and failed inbox work. Query failures are not zero observations. These checks do not enable reconciliation stopping.

## Browser and visual scope

Application: http://127.0.0.1:3107, separate .next-modern-modules-integration output. Database: stoquify_local_modern_modules_20260905_01. Five synthetic organizations have real local credential accounts and scoped roles. Browser login and fresh identity confirmation use actual passwords; no sessions or assurance evidence are fabricated. Password inputs, traces and video are excluded from retained evidence.

The current suite covers retailer/service recipes, dependencies, fresh server review, genuine sign-in challenge, waiting preparation, actual isolated setup then resume, active workspace, history/reopen, inventory retained records, denied users, and legacy preservation. Core journeys cover ENdesktop/FRmobile; the expanded batch adds ENmobile/FRdesktop, actual portal-dialog axe, keyboard/focus, reduced motion and narrow/tablet reflow. The full suite passed10 checks with2 intentional project-specific skips: legacy conversion runs once on desktop, and French reflow runs once in the mobile project. The three mobile journeys were rerun successfully after capture timing was corrected; the separate French stopped-transfer denial passed without creating a transfer. Parent and verification agent inspected actual waiting, applied and retained mobile captures.

Synthetic accounting setup calls the real collector. Four required purposes have no canonical installer template: EXPENSE_APPROVAL, INVENTORY_ADJUSTMENT, CASH_DRAWER_CLOSE and GOODS_RECEIPT. Isolated fixtures supply explicitly marked balanced scaffolds only to exercise lifecycle reads; these are neither recommended posting policies nor professional approval. Actual tenant accounting owners must provide appropriate configured rules. Provider/settlement/terminal fixtures are similarly labelled test setup and make no network calls.

## Failures and corrections retained

1. Real PG run ef62c8104fbb:16 passed /2 failed. One fixture lacked two required rule purposes. The other exposed real JSONB key-order hashing that falsely marked a stop request stale. Fixture completeness and canonical evidence hashing were corrected independently.
2. PG run77a89fd35f46: one test incorrectly expected all19 grants in preservedModules, which describes the subset outside active navigation. The assertion now checks actual durable/effective grants. No authority was removed to satisfy the test.
3. PG run74fab03e7849: all17 functional checks passed; source-stability check failed because shared files changed during execution. Final b3c4a2958253 rerun passed18/18 against unchanged source.
4. Expanded workbench tests initially had14 five-second timeouts and one duplicate selector failure. The selector was scoped; the execution-only time limit was raised to20seconds without weakening assertions. Later18,22 and25-case groups passed; earlier failures and an EPERM evidence-write failure remain in workbench-lifecycle-checks.md.
5. A broader89-case domain attempt had87 passes, one new error-type fixture mismatch that was fixed, and an unrelated pre-existing POS shift-close exact-payload expectation failure. Shift-close source was not modified; the focused affected75-case run passed. No whole-domain release pass is claimed.
6. Initial mobile preparation screenshots were mostly blank because capture followed scroll immediately. They are invalid visual proof and archived separately. Capture now uses instant target scrolling, rendering-frame stability and CSS-pixel output; final images require actual visual inspection.
7. Windows blocked several direct file/evidence writes. Authorized adjacent-file replacement resolved filesystem failures. The separately rejected POS/offline change was not rerouted or applied; its exact automatic-review reasons remain in OFFLINE_CONTINUATION_APPROVAL.md.

## Performance and practical limits

Previous useful-workbench navigation observations were6.2–8.7seconds in the development app. They are a recorded baseline, not a production budget or percentile. Final useful-workbench observations span5.481–9.504seconds across six EN/FR desktop/mobile journeys, all with zero horizontal overflow. The slowest is above the earlier8.7second observation; these local development samples do not establish a percentile or production regression budget. Screenshots record URL, viewport, overflow and capture time. First compilation and concurrent checks affect timing. No production performance certification or cost claim is made.

Automated axe, keyboard/focus and responsive checks cannot establish complete accessibility certification. Actual assistive-technology testing, native browser zoom, all devices, production load/failover and live financial/provider flows have not been certified. Operational health is not inferred from configuration readiness.

## Reproduction

Use the configured Node runtime and inspected repository entry points. Both local helpers reject remote/production markers and verify exact target ownership/migrations. Do not reset the retained databases or copy synthetic credentials/grants to a customer.

- npm test -- --runInBand --runTestsByPath services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts
- npm run typecheck
- npm run prisma:validate
- node scripts/modern-modules-local-verification.js status
- node scripts/modern-modules-local-verification.js start
- node scripts/modern-modules-local-verification.js test
- node scripts/run-modern-modules-postgres-smoke.js run

The actual grouped commands, exit codes, source hashes and result paths are stored in their receipts. This task does not deploy, purchase, issue grants or clear X1. Remaining operational scope and rollout actions are explicit in FEATURE_STATUS.md and ROLLOUT_AND_RECOVERY.md.

## Final targeted localization and source binding

The newly introduced stopped-work reason is allowlisted across canonical and legacy responses, while ordinary forbidden errors retain their existing sanitized behavior. Targeted EN/FR callers cover inventory transfers, purchase-order creation and payroll calculation; shared/targeted transports preserve the same reason for cloning, counts and adjustments. The purchase form retains expected failures as structured results. The receipt is `evidence/lifecycle-continuation/stopped-work-localization-receipt.json`; it records50 distinct passing checks across bounded reruns, initial failures, corrected expectations, final source hashes and clean lint. This extension postdates the original113-check transport group and has its own regression evidence.

The actual transfer route exposed a pre-existing unknown-permission defect: it requires TRANSFERS_READ, which the registry did not recognize. An explicit inventory.transfers.read ↔ TRANSFERS_READ mapping now restores the intended read permission. It does not alias general inventory access or grant transfer creation/approval; wildcard remains denied by its existing risk treatment. Focused permission checks, lint and the final full typecheck are recorded in `evidence/lifecycle-continuation/transfer-read-checks.json`; the later French browser denial exercises this mapping. Earlier failed unknown-permission evidence is retained.

All PostgreSQL-recorded production sources remain unchanged. The later browser-only `inventory-denial` fixture stage adds synthetic transfer prerequisites for one owned local organization and requires an existing reviewed Inventory stop. It is exercised by the separate French denial case; it does not retrospectively alter the PG18/18 run. The final evidence binding records this verification-input delta explicitly. No production/customer fixture, grant or approval was created.

Initial capture failures, an omitted disclosure click, a prematurely captured pending browser response and the cold transfer-route timeout remain preserved. Final applied captures await the actual localized applied state rather than database state alone. The existing shared sidebar still contains some English labels on French pages; this integration does not claim a translation of every unrelated shell label. Native browser zoom and assistive-technology certification remain unperformed.

## Observed transfer-route render limitation

The isolated development server logged `TypeError: Cannot read properties of null (reading useRef)` through `lib/auth-client.ts:18` → `hooks/useClientAuth.ts:8` → `TransferDashboard.tsx:133`. It recurred after a clean restart, so it is not dismissed as a hot-reload-only artifact. The browser subsequently rendered the route and the actual French stopped-transfer assertion passed, with no transfer created. The shared authentication client was not modified for this integration. Confirm the affected route in a production bundle before rollout; a passing browser recovery does not establish clean server rendering. Failed navigation/hydration attempts and the final successful check remain separate evidence.

## Final visible failure-state correction

A passing DOM visibility check initially missed an actual usability defect: the stopped-transfer toast was behind the dialog portal. The native screenshot exposed that occlusion. The dialog now displays the actual stopped mutation error as a persistent localized role=alert above its footer, preserving selected locations, items and quantities. The hook suppresses the duplicate stopped-work toast only when this modal opts into inline feedback; default callers and other errors retain their prior behavior.

The final French application case passed with the complete title/reason visibly inside the dialog, the retained item still present, an elementFromPoint occlusion check, and unchanged transfer count. Parent and verifier inspected `screenshots/mobile-fr-inventory-new-work-denied.png`. Existing English form labels and the development issue indicator are visible and are not presented as a fully translated or production-certified transfer screen. Earlier inadequate images and passing-but-insufficient visibility assertions remain archived.

Separate focused verification is in `lifecycle-continuation/stopped-work-inline-feedback-receipt.json`: two EN/FR modal cases plus the existing three hook regressions, with source/hash lineage preserved from the previous localization receipt. An initial Jest/lucide ESM suite-load failure required an existing-pattern icon mock in test code; production source was unchanged by that correction. The final full typecheck passed14:08:57–14:10:32UTC after production source froze.
