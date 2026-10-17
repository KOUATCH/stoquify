# P03 — Execution result

**PASS — reconciled synthetic fixture contract prepared.** 13 October 2026. This completes P03's fixture/research acceptance, not M1, a real cutover, ledger posting or accounting certification. P04–P24 were not run; P02 remains partial and unchanged.

HEAD `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`; branch `codex/migration-control-plane-release-2026-08-29`. At start, all 81 selected P01 fingerprints matched; current tree had 401 modified tracked files and 14,690 untracked entries. [Baseline evidence](evidence/BASELINE_REVALIDATION.json) records this observation; source is not a clean release candidate. Unrelated dashboard/application work and existing P01/P02 evidence were preserved.

## Owned deliverables

- [Opening-position contract and ownership map](OPENING_POSITION_CONTRACT.md), including missing external AR/AP paths, explicit stock-ledger review boundary, rehearsal/cutoff/approval/correction protocol and future V3 cases.
- [Fixture manifest](FIXTURE_MANIFEST.md), with retained source/control hashes, rejection counts, units, independent arithmetic and reviewer limitations.
- Four new files under `services/onboarding/__tests__/`: `opening-position-contract.test.ts`, `fixtures/opening-position-contract.ts`, `fixtures/opening-position-source.json`, `fixtures/opening-position-controls.json`.
- [Isolated test configuration](../../../../jest.opening-position-fixtures.config.cjs), P03 evidence, and only P03's row in [execution STATUS](../STATUS.md).

No production service, route, schema, migration, package, dependency or existing test changed. **Data/schema impact: none.** The test-only checker does not expose importing or posting behavior. No real customer record, ledger write, historical import, installation, graph regeneration, customer contact or deployment occurred.

## Acceptance

| Criterion | State | Evidence |
|---|---|---|
| Source counts, quantities, values and control totals reconcile without unexplained difference | PASS — synthetic | 7 stock source rows = 4 accepted + 3 retained rejections; two locations/items, one AR, one AP; 3,000.00 inventory, 1,200.00 AR, 700.00 AP; 4,700.00 debit = credit. Exact comparison to a separate hand-calculated sheet. |
| Tests expose duplicate opening posting and ledger imbalance; expectations are independent | PASS | Negative cases include a balanced duplicate stock debit/offset, one-cent imbalance, missing/duplicate coverage, and internally balanced replacement totals that fail the unchanged independent sheet. |
| Ownership map identifies current services, gaps and reviewer requirements without invented mappings | PASS — scoped source inspection | Existing stock producer and review blocker, manual opening journal, sales-bound legacy AR backfill, purchasing-bound AP path, explicit external opening-path gaps and unresolved D05. Symbolic fixture accounts only. |

P03 explicitly does not require real DB execution to call the fixture contract prepared. Its downstream runtime/approval requirements remain open and are not reported as passed.

## Verification

| Evidence class | Actual result and limits |
|---|---|
| S — source inspection | PASS, scoped. P01 hash/HEAD revalidation; graph/current-source trace; stock kernel, inventory reconciliation, master workbench/actions/import owner, AR/AP/journal/settings boundaries and existing tests. Final [validation](evidence/VALIDATION.json) preserves prior artifacts and non-P03 status rows. |
| Workflow control | PASS, exit 0: `npm run agent:workflow:check`; reviewed runner, fs/path/crypto imports, registry, package definition and absent hooks first. 198 unclassified scripts; none executed by this check. Explicit classification of `test:ecc:pilots` also passed. |
| M — pure/static fixture and import tests | PASS, **3 suites / 48 tests**, no skips, exit 0. `node node_modules/jest/bin/jest.js --config jest.opening-position-fixtures.config.cjs --runInBand --no-cache --json --outputFile docs/retention/execution/P03/evidence/FIXTURE_AND_IMPORT_RESULTS_FINAL.json`. [Raw result](evidence/FIXTURE_AND_IMPORT_RESULTS_FINAL.json). Includes existing CSV and master-data control-boundary tests. |
| M — existing inventory boundary | PASS, **3 selected tests**, 29 deliberately filtered, exit 0. `node node_modules/jest/bin/jest.js --config jest.ecc-pilots.config.cjs --runInBand --no-cache --selectProjects ecc-unit --runTestsByPath services/inventory/__tests__/inventory-stock-event.service.test.ts --testNamePattern "opening stock\|closed-period\|idempotency conflict" --json --outputFile docs/retention/execution/P03/evidence/INVENTORY_BOUNDARY_RESULTS.json`. [Raw result](evidence/INVENTORY_BOUNDARY_RESULTS.json). Opening-stock blocker, closed-period denial and idempotency conflict; the latter two exercise shared kernel behavior via POS, not opening-specific PostgreSQL replay. |
| Targeted TypeScript | PASS, exit 0. Installed TypeScript with `--noEmit --incremental false --skipLibCheck --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --types "node,jest"` over the new test-only checker and its test. No whole-application typecheck/build. |
| D — real database | NOT_RUN, not required for prepared P03. No ambient database target used; no schema/data preparation or query. V3 cases are documented, not executed. |
| B — rendered/browser | NOT_RUN. Existing route traced, no UI changed or browser target started. |
| P — provider/authority | NOT_RUN; not applicable to this synthetic contract. |
| C — customer outcomes | NOT_RUN. No real import, activation, user task or retention measured. |
| E — qualified expert | NOT_RUN. D05/accounting regime, accounts, treatment and real approval remain unresolved. |
| O — restore/load/operational | NOT_RUN. No cutover/recovery rehearsal in a database or production environment. |

The first npm invocation forwarded requested filtering/output flags as positional patterns on this host: only the inventory suite ran and all **32 tests passed**, but it did not write the requested JSON. The subsequent reviewed direct Jest invocation above obtained exact selection and durable JSON; 29 filtered cases are not claimed as executed in that second run. The initial 47-test fixture/import run also passed; one additional independent-control regression brought the final count to 48. Earlier output is retained. Source discovery encountered guessed absent action/service paths; actual paths were then located, and absence claims rely on inspected source boundaries, not failed path guesses.

New runner review: exact three pure/static suites; installed SWC transform; no Next app config, dotenv, global application setup, migrations or database client. CSV tests import schema/error utilities; boundary tests read source/migration text without executing SQL. Existing inventory lane uses its reviewed setup and mocked Prisma/domain dependencies; no real transaction behavior is inferred. Existing package/registry/config files were not edited to force a passing gate.

## Decisions, handoff and recovery

P01 D05 remains unresolved; `FIXTURE_APPROVED` is fictional arithmetic input, not a person's sign-off. The current AR document requires an existing sales source; AP invoicing requires purchasing/receiving evidence. Ledger primitives and a generic opening journal do not constitute a reviewed external opening importer. Those source contracts and stock-blocker settlement belong to P13; no substitute financial history was created here.

P07 may consume the proposed shape and control expectations only when requested and after P04. It can expose truthful independent readiness/unsupported/review-needed states without posting. P11 may use the ownership gaps for country/domain review. P12 can consume P03 as prepared synthetic evidence while retaining P02's partial state and other dependencies. No later prompt or gate started automatically.

Next logical authorized continuation would be a separate request for **P04**, which is needed before P07. P03 requires no more local fixture work for its stated acceptance. Runtime cutover, real mapping approval and production readiness remain separate work. Metrics: source/accepted/rejected counts and arithmetic variances only; onboarding time and customer benefit remain unmeasured.

Recovery for this task is removal/supersession of only its new test/config/fixture files and evidence/status entry if required. No domain rollback is needed; preserve original source/control files and prior evidence, and never reset unrelated working-tree work. In actual cutover, posted errors require reviewed corrections, not destructive resets.

Review lenses: architecture/domain/data ownership and financial conservation are covered by source mapping plus synthetic tests; security/privacy by scope/negative fixtures with no real data; QA/operations by explicit verification boundaries, retained evidence and future recovery cases; product/onboarding by truthful readiness and P07/P13 boundaries. UI/accessibility/localization, live integrations, billing/support changes, payroll rules and AI autonomy are not applicable because no such behavior changed. No legal, tax, accounting, security or release certification is inferred.
