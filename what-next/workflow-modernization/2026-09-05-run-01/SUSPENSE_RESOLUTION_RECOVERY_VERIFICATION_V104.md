# v104 — recovery verification

Date: 2026-09-09. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`, revalidated before implementation. Existing shared worktree changes preserved. Final aggregate binds source hashes and discovery baseline.

## Commands and results

Use installed Node at `C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`, repository root, without migration-bearing package hooks.

- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath` covering accounting posting, suspense ledger, reconciliation evidence/certification, resolution contracts/evidence and new recovery evidence. Final **64 tests / 7 suites passed**, receipt `ce3b6a`, exit 0, `evidence/suspense-resolution-recovery-v104-tests.json`.
- `node_modules/typescript/bin/tsc --noEmit --pretty false`: session 72708, receipt `c82514`, exit 0.
- `node_modules/eslint/bin/eslint.js` on the nine changed production/test files: receipt `411ddf`, exit 0, no warnings.
- `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-resolution-recovery-v104.cjs`: owned actual original/clearing posting, resolution, recovery and subsequent correction/reposting/re-resolution. Final receipt appended on publication.

## Retained failures and corrections

- Initial six-suite run reported 56 passing tests but failed to save JSON (`119e06`, sandbox EPERM). The narrowly approved final run saved the expanded seven-suite result; no saved receipt is claimed for the first attempt.
- Runtime `b508a953-bdf` and `ffa6aa8d-d6f`: five resolution checks completed, then recovery-journal generic reversal was unexpectedly allowed. Detailed assertion location isolated the missing posting-batch include in the generic reversal query. Fixed the query; added a test whose fixture only supplies batch metadata when requested. These synthetic financial effects remain in owned fixtures, not live customer data.
- `3d79aced-2d8`: 15 checks passed, source stable/unrelated rows unchanged, including recovery and tamper denial after the guard correction.
- `b6330836-1d9`: 17 checks passed, extending through actual original correction, second posting cycle and new independent final resolution. Later fixture extension adds linked exceptions, explicitly synthetic signed-run/close states and snapshot coverage of those tables.

## Evidence boundaries

The database is `stoquify_local_registration_20260906_01`; the verifier checks ownership before writes and compares unrelated rows afterward. Actual services post financial journals only for synthetic organizations. Close and signed-run states used for invalidation testing are clearly marked synthetic, not issued professional approvals. Original certificate payload retention and exception/close invalidation are checked in the final extension; full genuine sign-off/export remains open.

Core assertions include read scope, stale preview, recovery rejection and fresh reproposal, proposer/clearing-poster separation, fresh authentication, missing reverse permission, late-audit rollback, concurrent duplicate recovery, exact original/reversal line matching, current source status, retained original posting, generic reversal refusal, corrupted reversal denial, second-cycle source correction/posting and new resolution with historical allocation verification.

No new browser actions/UI are present; EN/FR, mobile, keyboard and screen-reader verification for resolution/recovery are pending implementation. No full build, migration, production performance or release certification. Whole workflow and platform completion remain unproven.


## Final bound result

Runtime lanes/environment/suspense-resolution-recovery-v104-a82d20ba-5f6.json: 17 checks passed, session 68959, receipt 15056b, exit 0, source stable and unrelated records unchanged. Includes actual non-dismissed exception reopening/dismissed preservation, synthetic signed-run payload retention and close invalidation. Baseline evidence/source-baseline-v104.json: 2812 source/config/test files, 992 tests; saved receipt 193463. Aggregate evidence/suspense-resolution-recovery-v104.json.
