# G1/G2 verification command log — 2026-08-20

Generated: `2026-08-20T14:46:52.784138Z`

Classification: **ASSESSMENT ONLY — NOT PRODUCTION AUTHORIZATION**

All commands were read-only or non-writing validators. A non-zero result from a fail-closed gate is recorded as a valid blocked assessment result. No migration, reset, reseed, backfill, approval write or governance write was performed.

| Command | Classification | Exit | Observed result |
| --- | --- | --- | --- |
| git status --short | PASSED | 0 | Worktree captured; candidate is dirty with relevant modified and untracked POS, schema, migration, gate and evidence files. |
| npm run prisma:validate | PASSED | 0 | Prisma schema is valid. |
| npm run typecheck | PASSED | 0 | TypeScript typecheck passed. |
| npx --no-install jest scripts/__tests__/pos-g1-contract-gate.test.js scripts/__tests__/pos-enterprise-program-gate.test.js --runInBand | PASSED | 0 | 2 suites, 4 tests passed. |
| npm run pos:g1:contract:gate | BLOCKED_EXPECTED | 1 | Non-writing validator: 13/13 technical checks ready, runtime partial with explicit gaps, 0/11 decisions approved, overall BLOCKED. |
| npm run pos:enterprise:program:gate | BLOCKED_EXPECTED | 1 | Non-writing validator: control plane ready, first blocker G1, 0/10 enterprise gates passed, G2 dependency-blocked and partially implemented. |
| npx --no-install prisma migrate status | PASSED | 0 | Development database stoquify_dev_migrated_20260814/public reports 75 migrations and is up to date; this does not prove fresh-database portability. |
| focused G2/POS Jest set (9 suites) | PASSED | 0 | 9 suites, 104 tests passed: POS service, offline sync, receipts, tender/session/catalog actions, route/page audit, permissions and migration test. |
| focused shift-close/electronic-authority Jest set (4 suites) | PASSED | 0 | 4 suites, 34 tests passed. |
| npx --no-install jest 'app/api/v1/organisations/[id]/items/__tests__/route.test.ts' ... | FAILED_TOOLING_INVOCATION | 1 | Initial regex-pattern invocation matched no tests; no product test ran or failed. |
| npx --no-install jest --runTestsByPath 'app/api/v1/organisations/[id]/items/__tests__/route.test.ts' --runInBand | PASSED | 0 | 1 suite, 5 item API permission tests passed. |
| npm run receipt:token:config-gate:release | BLOCKED_EXPECTED | 1 | 4/4 token foundation checks ready; release blocked because the production signing secret is not configured; no secret value printed. |
| npm run policy:gates | SKIPPED_INELIGIBLE | — | Skipped: G1 is 0/11, G2 has intrinsic blockers, evidence is incomplete and the worktree contains user-owned modified reports. |
| npm run verify:release | SKIPPED_INELIGIBLE | — | Skipped for the same eligibility and non-overwrite reasons. |

## Aggregate focused test result

- Successful focused suites: **16**.
- Successful focused tests: **147**.
- Product test failures: **0**.
- One initial Jest path invocation matched no tests; it was corrected with `--runTestsByPath` and the intended five tests passed.
- `policy:gates` and `verify:release`: **SKIPPED_INELIGIBLE**.

## Safety notes

- `pos:g1:contract:gate` and `pos:enterprise:program:gate` are configured with `--no-write` in `package.json`.
- The receipt-token configuration gate did not print a secret value.
- The existing dirty worktree and unrelated reports were preserved.
