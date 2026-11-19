# P04-R04 inspected verification lanes

Current package definition, npm lifecycle hooks, command registry, workflow and test-lane controls reviewed. npm run agent:workflow:check passed; it performs no app/database work. New direct recipes are separately side-effect reviewed and are not claimed to be registered commands.

## Unit

From repository root, node plans/stoquify-production-readiness-2026-10-28/execution/P04-R04/qualification-20261109-r1/unit/run.cjs attempt01 actions/item/__tests__/list-items-error-responses.action.test.ts selects two expected-red plain-service-Error assertions through exact pre-repair source alias. 56 other cases are deliberately filtered only for characterization.

Attempt02 uses the same runner with explicit new sibling, R03 item-error-responses and shared safe-action-responses suites. nextJest without dir avoids app config/env; OS env allowlist, env-file read guard, disabled net/tls/socket/fetch, default mocked DB, and verified private generated-client hashes apply. Source/harness hashes recorded; source drift fails. Actual normalizer/schema and hook queryFn execute; authority/service/useQuery are explicitly mocked. Independent UNIT-RECIPE-REVIEW.json binds the execution inputs.

## Static

unit/typecheck.cjs invokes installed tsc on two owned entries plus import closure (including hook), noEmit, incremental:false, plugins:[], clean env. No application execution or build output. unit/lint.cjs invokes installed ESLint with reviewed .eslintrc.json, no fix/cache, two owned paths and source hash comparison.

## Native

See database/RECIPE.md and independent-review/NATIVE-RECIPE-REVIEW.json before execution. Fresh exclusive cluster/database/output, reviewed loopback capability, current copied migrations/schema and source/client hashes, explicit no-env/provider boundaries, actual persistence and safe audit accounting. No R01/R02/R03 fixture reuse/reset. Better Auth and Next transport are stubbed and cannot prove signed-cookie/browser/session expiry.

No build, dependency installation, production migration/flags, commit/push or deployment. Historical executable source is archived inertly after runs; do not blindly replay retained exclusive-output recipes.
