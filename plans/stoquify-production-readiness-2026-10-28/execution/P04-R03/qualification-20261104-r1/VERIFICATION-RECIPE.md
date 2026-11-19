# P04-R03 verification recipe

Scope: candidate p04-r03-20261104-9c1182e0773a, the nine historical response paths only. Existing command registry and npm hooks reviewed; workflow check passed. New direct commands are separately side-effect reviewed, not claimed registered.

- Unit: node unit/run.cjs attempt01 actions/item/__tests__/item-error-responses.action.test.ts (paths relative to this packet for the runner, repository root for suites). Exact archived pre-repair action alias; nine selected expected-red tests. Other cases excluded by the explicit name filter, not skipped acceptance.
- Current unit: same runner attempt02 and the new suite, existing edit-item.action.test.ts, create-item-entitlement-observe.action.test.ts and shared safe-action-responses.test.ts. Actual normalizer/schema, mocked authority/services/cache/logger in new tests. No Next dir/config, env files or network; private client26hashes rechecked. Independent UNIT-RECIPE-REVIEW.json binds exact recipe.
- Typecheck: node unit/typecheck.cjs uses installed tsc with two owned entries/import closure, noEmit, incremental:false, plugins:[], sanitized env. No generated output or app execution.
- Lint: node unit/lint.cjs uses installed ESLint/next-core-web-vitals configuration, two owned files, no fix/cache. Clean inherited env allowlist; source hashes checked.
- Native: database/RECIPE.md and independent NATIVE-RECIPE-REVIEW.json. Fresh owned loopback PostgreSQL, copied current migrations, actual guards/services/actions. Better Auth and Next transport/cache explicitly stubbed. DB snapshots distinguish business state/audit effects. No expiry/revocation or signed-cookie HTTP claim.

Do not run historical recipes blindly: exclusive attempt outputs and retained fixtures must not be overwritten. No production configuration, flag, database, commit, push or deployment. Malformed preliminary unit mapper was rejected/fixed before execution and retained as preparation evidence.

Rollback: restore only the owned helper/import/catch hunks using preserved baseline, preserving unrelated working-tree changes; unsafe surfaces remain outside production admission. No DB migration changes need rollback. Stop only owned fixture processes and retain evidence.
