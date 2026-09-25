# v105 — resolution/recovery operator verification

Date: 2026-09-09. Source baseline `evidence/source-baseline-v105.json` and final aggregate bind the tested dirty worktree on branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Existing unrelated work was preserved. The default build was not invoked; it bears migration hooks.

## Focused checks

Commands use installed Node directly from the repository root:

- `node_modules/typescript/bin/tsc --noEmit --pretty false`.
- `node_modules/eslint/bin/eslint.js` on the ten changed production/test files.
- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath` for new read/action/panel tests, affected queue, and resolution/recovery/ledger/accounting/certification regressions. Final path and results are appended during publication.
- `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-resolution-ui-v105.cjs` performs ordinary password sign-in, actual server actions and persisted financial checks against owned local fixtures. All browser requests are fenced to `http://127.0.0.1:3110`.

Read tests exercise missing permissions, inactive/foreign actor, missing scoped source, failed query, tampered history, private-payload exclusion and candidate-versus-eligibility distinction. Action tests verify strict input schemas, server identity, explicit module intents and rejected mismatched fresh-auth claims. These mocked action tests prove the contract, not the real protect implementation; actual browser actions supply separate runtime evidence.

Panel tests verify uncertain request preservation/retry, refusal of another actor's financial response and denied-read behavior. Existing queue and underlying financial tests provide proportionate regressions. No route/source count establishes whole workflow completion.

## Retained attempts and corrections

- `evidence/suspense-resolution-ui-v105-tests.json`: two suites failed to import server auth ESM dependencies after new imports; three new panel tests passed. Added the appropriate server dependency mock to the action harness and separate panel mock to the existing queue harness. Production controls were not changed to satisfy Jest.
- `evidence/suspense-resolution-ui-v105-tests-final.json`: 34 tests/3 suites passed, receipt `978059`.
- `evidence/suspense-resolution-ui-v105-tests-complete.json`: 42 tests/4 suites passed, receipt `5c1907`, including the new private read tests.
- Browser `suspense-resolution-ui-v105-browser-cd6f9d68-553.json`: English completed resolution and recovery, five screenshots, no page errors. French stopped selecting the proposed outcome because the wrapped label included option text. Separated the native selector's label. Renamed inherited correction-specific preview/close labels and exposed outcome/date and destination in the independent review. Source changed during this attempt, so it is explicitly not a final source-bound pass. Unrelated financial rows remained unchanged. EN 320px and FR failure images were visually inspected.

## Browser coverage and boundaries

The final intended journeys are EN ordinary resolution and FR supported expense write-off. Each includes journal search/selection, impact preview, maker refusal, independent password step-up with no automatic financial effect, refresh with the exact saved decision, final outcome without another journal, discovery through retained history, independent recovery with step-up/refresh/retry, exactly one clearing reversal and visible durable decision history. Desktop, 320px and 768px reflow and keyboard entry focus are checked. Timings are local observations, not production budgets.

No new real statutory approval, live customer activation, production deployment, database migration or external delivery. No full build, complete screen-reader/contrast/native zoom audit, large-data performance or full connected sign-off/export certification. Resolution/recovery exports and broader lifecycle variations remain engineering work.


## Final bound results

- Tests: evidence/suspense-resolution-ui-v105-tests-regression.json, 106 passed/11 suites, session 12387, receipt 4a8c40, exit 0.
- Typecheck: session 11603, receipt 5ee08a, exit 0.
- Lint: session 39670, receipt 437784, ten files, exit 0 without warnings.
- Browser: lanes/environment/suspense-resolution-ui-v105-browser-2ba8e3d5-69b.json, both locales passed, ten screenshots, no page errors, source stable and unrelated rows unchanged. Timings (local route-to-queue milliseconds): en 15303/26406/10054; fr 14554/10937/12221.
- Screenshots: evidence/suspense-resolution-ui-v105-files; final FR 320px inspected. No performance certification or unexecuted accessibility claims.
- Baseline: evidence/source-baseline-v105.json, 2819 files, 995 tests, 169 action sources, 2433 control candidates; receipt 3bd8b0.

Aggregate: evidence/suspense-resolution-ui-v105.json.
