# Verification recipes — future execution only

Read AGENTS.md, docs/ecc/WORKFLOW.md, command-registry.json and test-lanes.md first. Inspect the current package script, pre/post hooks, runner, imports/setup and environment/target behavior before executing. A command listed here is not blanket approval for a real environment. Read-only planning ran only C01.

| ID | Exact command / procedure | Prerequisite and evidence class |
|---|---|---|
| C01 | npm run agent:workflow:check | Read reviewed runner/registry/current package hooks. No application/DB execution. PASS in planning |
| C02 | node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false | Review current tsconfig/includes/generated inputs first. Compiler only; no emit/incremental output. Full compiler not rerun during planning |
| C03 | npm run agent:workflow:test | Inspect scripts/jest.agent-workflow.config.cjs and fixture imports; isolated workflow fixtures, not app runtime |
| C04 | npm run test:ecc:pilots | Inspect jest.ecc-pilots.config.cjs, setup and selected source imports. Ten bounded mocked/pure/component suites, no PostgreSQL/browser claim |
| C05 | Targeted owner unit/component checks | Choose exact existing suite/config from package sources and current domain register, inspect setup, then record literal invocation in package evidence before execution. Do not use default Jest blindly; it can load environment and mock Prisma |
| C06 | Native PostgreSQL owner/transaction checks | Inspect the existing runner for selected package, its target allowlist, creation/reset/migration/cleanup. Provision an explicit unique disposable target; no shared or .env-inferred DB. Record literal target-safe command, schema/catalog and expected case list before running; absence/skip leaves gate open |
| C07 | Actual authenticated browser checks | Use current approved journey harness and explicit disposable accounts/URL. Record browser/artifact/candidate/locale/viewport/role; collect failed and passing traces without secrets. Dev fixtures, synthetic action responses and sealed production-mode runtime are different evidence classes |
| C08 | Provider/worker qualification | Select approved nonproduction receiver/provider contract and version; record exact harness/command after side-effect inspection. Verify durable receipts and unknown-outcome recovery. Never send real messages/charges or use employee originals unless separately authorized |
| C09 | npm run release:artifact -- <new-artifact-directory> | Future isolated build only after current runner review and explicit environment. Writes/builds and may load config. Normal intended lifecycle/native install qualification precedes this; retain source/lock/vendor/migration inputs |
| C10 | npm run release:artifact:verify -- <artifact-directory> <trusted-sha256> | Use separately trusted digest and matching source; not an arbitrary newly read manifest hash. Exact runtime/source bytes must match |
| C11 | Database upgrade/restore and hosted promotion rehearsal | Read ARTIFACT_SCHEMA_PROMOTION.md and actual runners. Disposable rehearsals first. Production schema promotion is a separately authorized operator action; never substitute generic prisma migrate/db push or assume app rollback reverses SQL |
| C12 | Human accessibility/load/operator acceptance | Adopt approved device/workload/threshold/protocol first. Record exact procedure, actual users/assistive device, timing and results. Axe, source review and unit mocks cannot replace this |

Known starting locators, not automatically safe invocations:
- P03: SEALED_ENGAGEMENT_BROWSER_2026-10-28.md; scripts/verify-firm-engagement-browser.cjs, its fixture/preparation/recovery wrappers and retained request timeline. Diagnose original failure before changing timeout/assertions.
- P07/P08/P10/P12/P13: mixed-version/REPORT.md, mixed-worker-close/REPORT.md and close-browser/REPORT.md. Mixed-worker final harness is a two-stage retained-target procedure; do not overwrite it or pretend it is a fresh one-shot suite. Derive a fresh isolated recipe explicitly.
- P14/P15/P16: HR21/development-11 RESULT/NEXT and current isolated runner/config; changes to payroll-control invalidate affected inherited proof. Do not run stored credentials/runtime-context files as generic configuration.
- P17–P20: existing Cameroon blueprint and Trust Spine register. Statutory fixtures require effective qualified review; technical passing checks cannot create that review.
- P25/P26: AF16 and command-center final-runtime gates; no fixture-only browser response may count as authenticated source integration.

Every actual run records: package/candidate, literal command/procedure, source and config hashes, expected/observed/skipped cases, fixture/target identity without secrets, exit status, evidence class, failure explanation, cleanup and reviewer. If no safe exact command exists, deriving and reviewing it is an entry task, not permission to guess.
