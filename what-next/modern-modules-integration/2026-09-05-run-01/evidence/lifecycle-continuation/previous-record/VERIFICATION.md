# Verification record

Evidence date: 2026-09-05. These are isolated application and engineering checks, not production, professional or accessibility certification.

## Source and environment

- Branch: `codex/migration-control-plane-release-2026-08-29`.
- Starting commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`.
- Pre-existing changes: `evidence/baseline-working-tree.txt`; preserved throughout this run.
- Final scoped file hashes and result bindings: `evidence/source-binding.json`. A commit alone does not describe this dirty-tree implementation.
- Actual Next application: `http://127.0.0.1:3107`, separate `.next-modern-modules-integration` development output.
- Browser database: `stoquify_local_modern_modules_20260905_01`; five explicitly synthetic organizations with real local accounts, role permissions and password authentication. No fabricated sessions.
- PostgreSQL control database: `stoquify_local_modern_modules_controls_20260905_01`; separate synthetic service fixtures, not authenticated customer evidence.
- Existing port 3000 application/database and the standalone prototype were not integration test targets. Prototype checks remain historical design evidence.

## Results

| Check | Recorded result |
|---|---|
| Original entitlement/action baseline | Passed: 14 tests before implementation |
| Baseline repository typecheck | Passed |
| Access defect reproduction | 18 failures and 5 passes before correction; exposed empty/expiry/dependency/read-only/metadata/missing-org/legacy defects |
| Final focused Jest run | 9 suites, 111 tests: 110 passed, one workbench interaction timed out at the existing 5-second limit; `evidence/final-tests.json` |
| Workbench retry after timeout | All 13 passed with unchanged assertions and timeout; `evidence/workbench-final-retry.json`. Together, all 111 distinct focused tests have a passing execution; the first combined attempt is retained |
| Transport integration suite | 15 passed, also included in the final run; `evidence/module-transport-tests.json` |
| Actual browser full journey run | 8 passed, 2 intentionally skipped project combinations; `evidence/browser-attempt-02.json` |
| Final mobile verification | 2 passed: full French service journey and 834/320px review reachability/reflow; `evidence/browser-mobile-final.json` |
| Real PostgreSQL lifecycle/constraints | 13 passed, 0 failed; `evidence/modern-modules-postgres-smoke-46729149d363.json`; all five bound service/schema/migration hashes match final source |
| Prisma schema validation | Passed for both schema revisions |
| Isolated full migration replay | Passed; `evidence/isolated-migration-replay.txt` and `evidence/controls-migration-replay.txt` |
| Authority retention migration | Applied to the isolated browser database; `evidence/isolated-authority-migration.txt` |
| Final generated Prisma client | Successful, version 6.19.3; `evidence/prisma-generate-final.txt`, `evidence/generated-client.json` |
| Migration catalogue | Ready: 82 migrations; no unmanifested/changed/missing entries; one grandfathered historical timestamp pair; `evidence/migration-catalog.json` |
| Module surface inventory | 419 surfaces; an inventory, not universal enforcement certification; `evidence/module-surface-inventory.json` |
| Changed-file lint | Passed, exit 0; 17 application/config/browser files; `evidence/changed-file-lint-final.txt` |
| Final repository typecheck | Passed, exit 0; completion receipt in `evidence/check-completion.json` and output in `evidence/typecheck-final.txt` |
| Whitespace/diff check | Passed on affected tracked application/schema/config paths; existing line-ending notices are not lint errors |
| Production build/deployment | Not run. Default build invokes migrations. Actual route compilation used the isolated Next development app |

## Customer journeys and control coverage

**Retailer and service business, EN desktop and FR mobile:** native route, presets and edits, reconciliation requiring finance/accounting, real server review, password step-up when required, persisted apply, unchanged grants, resulting workspace links, reload, durable history and reopen as a new draft. Service selection excludes POS/inventory. Legacy conversion preserves all 19 canonical grants.

**Authorization and isolation:** native denied page in both languages; forged organization headers cannot select another tenant. Action/transport tests reject forged top-level/nested tenant identifiers and ensure server authentication supplies identity. Cross-organization history/reopen is rejected in service and database checks. Missing organizations, missing/expired/suspended grants, explicit empty authority, duplicates, dependency conflicts and read-only intent are covered by focused tests.

**Concurrency and recovery:** real PostgreSQL verifies identical submissions commit once, competing previews have one winner, failed eligibility preserves the prior workspace, a corrected fresh command can recover, drafts cannot alter active state, command history cannot be updated/deleted, child authority/history cannot outlive its configuration, invalid grant intervals/status are rejected, and exact review evidence is retained. Unit checks cover stale catalogue/setup/permission/grant evidence, including grant expiry without a row update.

**Failure truth:** failed authority/accounting/provider reads propagate rather than becoming empty successful observations. UI tests cover preserved drafts, denied/unavailable/error/stale conditions, safe failure messages, terminal-failure re-review and unknown-outcome retry using the same command. Operational health and setup approval are not inferred from an applied workspace. This does not claim browser coverage of every finance-dashboard failure case.

**Accessible/responsive behavior:** automated axe checks on the workbench found no selected WCAG 2A/AA/2.1AA violations in the four customer journeys. Browser tests cover keyboard entry, dialog focus containment, Escape and focus return. Screenshots cover EN 1440px, FR 390px and additional FR 834px/320px widths, all with zero measured horizontal overflow. After the final mobile refinement, the single Review control remains within the viewport and the final capability scrolls above it. The browser runs with reduced motion. Actual screen-reader testing, native browser zoom, every browser/device and full-shell contrast certification were not performed.

The two intentional browser skips avoid running the single legacy fixture twice and keep French extra-width checks in the mobile project.

## Attempts and corrections

1. Initial browser attempt: three passed, four failed, one skipped; `evidence/browser-attempt-01.json`. Selection/review/apply already worked, but history/review clicks could occur on server-rendered controls before hydration. Controls now wait for draft hydration and tests await that state. The next full run passed all eight applicable cases.
2. The final fixed mobile Review control was verified with a targeted two-test run. It uses the existing single button, reserves bottom space and clears the tablet sidebar; desktop behavior is unchanged.
3. The final combined Jest run had one 5-second interaction timeout while browser/type checks also ran. The whole affected workbench suite passed alone without increasing its timeout or weakening assertions. The original timeout remains in the evidence.
4. An early Jest evidence write met Windows EPERM after passing tests; the authorized retry succeeded. Standard Prisma generation could not replace an engine DLL held by another app. A separate client was generated, engine hashes matched exactly, and generated code installed while retaining that identical engine binary. Existing app processes were not stopped.

## Observed route loading and screenshots

Measurements time navigation to the hydrated, useful workbench in the isolated development app. Latest retained builder captures: EN retailer 6,244ms, EN service 6,219ms, FR retailer 8,411ms, FR service 8,662ms. These include development/runtime overhead; they are not production SLO measurements or p95 estimates. They establish an observed integration baseline, not a claim of improvement. No applicable approved production budget was established here. Production performance needs measurement in the controlled release environment.

Each capture has a JSON companion containing URL, time, CSS viewport, overflow and relevant scope. Examples:

- `evidence/screenshots/desktop-en-retailer-builder.png`
- `evidence/screenshots/desktop-en-service-review.png`
- `evidence/screenshots/mobile-fr-retailer-workspace.png`
- `evidence/screenshots/mobile-fr-service-history.png`
- `evidence/screenshots/mobile-fr-service-review-reachable-320.png`
- `evidence/screenshots/mobile-fr-service-reflow-834.png`

Screenshots exclude login/password inputs. Network traces/video are disabled to keep credentials out of report evidence.

## Reproduction and safety

Use the project's configured Node runtime. These are not production deployment instructions.

```powershell
npm test -- --runInBand --runTestsByPath `
  services/modules/__tests__/module-entitlement.service.test.ts `
  services/modules/__tests__/module-access-regressions.test.ts `
  services/modules/__tests__/module-navigation.test.ts `
  services/modules/__tests__/module-composition.service.test.ts `
  services/modules/__tests__/module-transport.integration.test.ts `
  actions/modules/__tests__/module-control.actions.test.ts `
  actions/modules/__tests__/module-composition.actions.test.ts `
  components/modules/__tests__/ModuleCompositionWorkbench.test.tsx `
  components/modules/__tests__/TenantModuleActivationButton.test.tsx
npm run typecheck
npm run prisma:validate
node scripts/modern-modules-local-verification.js status
node scripts/modern-modules-local-verification.js start
# Separate terminal with the isolated app running:
node scripts/modern-modules-local-verification.js test
node scripts/run-modern-modules-postgres-smoke.js run
```

The helpers bind exact loopback databases, refuse production markers and verify target ownership/migrations. Random local credentials remain in ignored private fixture storage. Do not run create/seed against existing data or copy test grants to a customer. Actual execution used bundled Node with the same Jest/TypeScript/Prisma entry points. Lint used the inspected ESLint entry point and explicit changed paths.

Remaining unverified or unimplemented boundaries appear in `FEATURE_STATUS.md` and `ROLLOUT_AND_RECOVERY.md`: live commercial grants, provider preparation, universal operational deactivation, production performance and release authorization. None is represented by simulated success.
