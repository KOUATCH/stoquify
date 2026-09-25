# Verification record

Working directory for commands: `E:\ohada saas\Focused projects\stoquify`. Node v22.17.0; existing dependency installation retained. Logs and machine-readable results are under `evidence/`.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Original full typecheck | PASS | `typecheck-before.log`; run started before application edits. |
| Cash-history characterization | Expected FAIL | `cash-before-tests.json`: 7 new failures, 10 passes, 4 suites. Failure cases establish the existing bugs. |
| Original preflight suite | PASS | `preflight-before-tests.json`: 996 tests. |
| Rewritten cash slice + preflight + server actions | PASS | `after-tests.json`: 1,019 tests in 6 suites. Persistence is mocked. |
| Final hook follow-up | PASS | `final-hook-tests.json`: 11 tests in 2 suites after correcting the optional action-error-code access. |
| Import cycle classification | COMPLETE | `cycles-classified.json`: 7 of 8 original source-import groups lose their cycles during TypeScript transpilation; 1 accounting/inventory group retains a cycle. This is static emitted-code analysis, not runtime initialization certification. |
| Preflight serialized equivalence | PASS | `benchmark.json`: unchanged set of 336 exports; 330 functions × 17 scenarios = 5,610 exact JSON comparisons. Property order is included. |
| Cash-history summary equivalence | PASS | `benchmark.json`: same decimal totals/event counts over 100,000 cash and 100,000 payment fixtures. Page reads are empty in this benchmark; separate service tests cover detail/redaction. |
| Prisma schema validation | PASS | `prisma-validate.log`; no database migration. |
| Workflow runtime schema presence | PASS | `runtime-check.json`: 7 required tables and 3 migration records present; read-only queries. This does not certify the complete migration history. |
| Service boundary gate | PASS | `service-boundary.json`: 0 active violations, 17 allowed findings. |
| Inventory boundary gate | FAIL | `inventory-boundary.json`: 20 active findings (1 fixture script, 19 findings in report-side verification scripts), all outside this task's edited files. |
| Post-change full typecheck | PASS | `typecheck-final.log`, `final-typecheck-result.json`: exit 0 after the optional action-error-code fix. |
| Safe production build | TIMEOUT | `build-final.log`, `build-final-result.json`: exit 1 after 900,000 ms during compilation. No compiler diagnostic was emitted before the timeout. The wrapper reported no orphaned build chains afterward. |
| Authenticated browser flows | BLOCKED / NOT RUN | Existing transaction-history Playwright suite and dedicated-account setup found. The initial local HTTP probe timed out after 10 seconds; a 30-second session-endpoint probe outside the sandbox also timed out (`browser-availability.json`). No login, seed, browser, or accessibility result is claimed. |
| Complete policy/release bundle | NOT RUN | The bundle includes live PostgreSQL test runners and release evidence checks. Only the individually inspected, non-mutating checks above were executed. |

An intermediate cash test run found an ESM import in a newly required auth dependency and an invalid cursor test fixture. The URL-only test now mocks the permission hook; the cursor fixture has a valid 64-character hash. Production security logic was not weakened to make tests pass. The first post-change typecheck found TS2339 on an optional action-error-code property; the hook now checks that the property exists, and all 11 affected hook tests passed again. The final full typecheck passed. The first build invocation was rejected before execution because npm's Windows argument handling stripped the flags; the documented environment-variable invocation then reached the concurrent-build guard. A later dry run found no competing build chain. The isolated retry reached compilation but timed out after 900,000 ms.

The incomplete `.next-codebase-rewrite` output was removed after the wrapper exited, after checking its absolute workspace path, its absence from the original worktree inventory, and its creation time within this task's build. Logs remain available. `tsconfig.json` and `next-env.d.ts` match their pre-type-phase snapshots. No unrelated process or build directory was removed. This failed run provides no completed bundle/deployment size or successful production-build evidence.

## Reproduction

```powershell
node what-next/codebase-rewrite/evidence/inspect.cjs after
node what-next/codebase-rewrite/evidence/classify-cycles.cjs
npm run typecheck
npm run prisma:validate
node scripts/workflow-assurance-runtime-table-check.js --mode fail --out what-next/codebase-rewrite/evidence/runtime-check.md --json-out what-next/codebase-rewrite/evidence/runtime-check.json
node scripts/service-boundary-gate.js --mode fail --out what-next/codebase-rewrite/evidence/service-boundary.md --json-out what-next/codebase-rewrite/evidence/service-boundary.json
node scripts/inventory-boundary-gate.js --mode fail --out what-next/codebase-rewrite/evidence/inventory-boundary.md --json-out what-next/codebase-rewrite/evidence/inventory-boundary.json
node node_modules/jest/bin/jest.js --config what-next/codebase-rewrite/evidence/jest.config.cjs --runInBand --runTestsByPath hooks/__tests__/useCashPaymentHistoryWorkbench.scope.test.tsx hooks/__tests__/useCashPaymentHistoryWorkbench.test.ts services/pos/__tests__/cash-payment-history.service.test.ts components/finance/__tests__/CashPaymentHistoryWorkbench.test.tsx services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts actions/pos/__tests__/cash-payment-history.actions.test.ts
node --expose-gc what-next/codebase-rewrite/evidence/benchmark.cjs
$env:NEXT_DIST_DIR = '.next-codebase-rewrite'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:BUILD_APP_SKIP_CLEAN = '1'
$env:BUILD_APP_TIMEOUT_MS = '900000'
npm run build:app
```

Do not rerun the baseline capture over the saved originals. The consolidation script has a baseline-content guard and is intentionally not repeatable on already changed source. The application has no dependency on these scripts.

## Performance evidence

The harness returns precomputed aggregates from a mocked database; it does not include SQL aggregation cost, network transfer time, authentication latency, browser rendering, or real concurrency. It uses fixed two-decimal values, one caller, three warmups, 20 alternating measured runs per variant, and explicit GC before each trial. Other work was active on the host, so timing variance is substantial.

| In-process metric | Original | Rewritten |
| --- | ---: | ---: |
| Summary rows returned by mocked persistence | 200,000 | 49 |
| Summary/detail queries, excluding organization lookup | 4 | 4 |
| p50 processing | 2,243.99 ms | 6.82 ms |
| p95 processing | 6,701.88 ms | 52.04 ms |
| p50 observed heap allocation delta | 17,306,072 bytes | 89,088 bytes |

The structural transport bound is the installed client's cash-type count plus payment-method/status combinations (49). A schema/client enum expansion changes that bound; it remains independent of transaction count. Heap deltas are per-call observations, not whole-process peak memory. No production speedup, throughput increase, or cost saving is certified.

See `reviewer-coverage.md` for all reviewer perspectives and explicit scope limits.

## Final size measurement and concurrent work

The repeated scan measures 381,619 application lines across 1,602 files. The global difference from the baseline is 1,746 lines, but **only 1,745 lines are attributable to this task**:

| Changed application file | Before | After | Difference |
| --- | ---: | ---: | ---: |
| services/leakage/pos-cash-shortage-production-activation-preflight.ts | 10,857 | 9,074 | -1,783 |
| hooks/useCashPaymentHistoryWorkbench.ts | 193 | 211 | +18 |
| services/pos/cash-payment-history.service.ts | 648 | 662 | +14 |
| components/finance/CashPaymentHistoryWorkbench.tsx | 385 | 391 | +6 |
| **Task total** | **12,083** | **10,338** | **-1,745** |

Concurrent changes were observed in POS session/tender actions, POS route access/data access, and receipt.service.ts. They were not reverted and are not attributed to this task. Existing 62 exact repeated-body groups and 8 import SCCs remain; the 106 consolidated wrappers were parametrically repeated implementations with different names/text, a different measure from exact repeated bodies.

Follow-up classification of those eight source SCCs found only one that still contains an emitted-code cycle: the accounting-close, journal posting, and inventory mutation/valuation cluster. Reconciliation, receipt delivery, analytics, notifications, organization settings, roles, and inventory UI groups lose their cycles after type-only/unused imports are erased. This analysis covers the original groups and literal import paths; it is not a fresh whole-repository runtime graph. The seven erased cycles do not justify adding new runtime architectural layers.

The inventory fixture `scripts/modern-modules-lifecycle-fixture.ts` matches its baseline hash. The other 19 gate findings are in historical `what-next/workflow-modernization/.../*.cjs` verification scripts; those scripts were not edited here and were not included in the source-hash baseline. The gate was not relaxed and archived evidence scripts were not rewritten to erase findings.

`git diff --check` passed for the edited tracked source/test files; only existing CRLF normalization notices were emitted. The new scope tests also passed as part of the six-suite run.
