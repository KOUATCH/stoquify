# Cash Command: batch persisted read admission

FA-CASH-COMMAND remains in progress. This correction removes repeated authority reads from Cash source collection; it does not close the whole financial workflow or establish a production latency pass. Source HEAD remains `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`, with unrelated working changes preserved.

## Delivered behavior and boundaries

Cash checks source permissions before requesting module admission. A new internal module service reads the active organization, retained configuration and grants once per call, then uses the unchanged canonical evaluator for each distinct permitted module. Each denied module still receives its existing audit decision. Payroll's two source permissions remain separate, even though they share one module decision. No granted source can admit another source whose permission is missing.

The batch is restricted to enforced reads, accepts no client-supplied grants or requested-module override, and keeps no authority cache between calls. It does not authorize writes, activation, payments or configuration changes. Existing transaction-bound write checks are unchanged. The existing independent organization/configuration/grant reads are preserved; this is not a new transactionally consistent snapshot or a solution to every concurrent-revocation scenario.

Missing organizations, orphaned configuration history and failed reads still fail. Explicit empty managed grants do not restore legacy access. Expired, suspended, future and ambiguous grants remain denied; required dependencies and read-only access retain the canonical behavior. A query failure remains distinct from successful zero data.

## Evidence

The owned disposable database was checked before service access. With the same organization, actor permissions, fixed scope/time and unchanged domain data, three before and three after source loads returned the exact same SHA-256 result (`6f7373f8f67683e22c6e01997bff4810c27bfc3b60960ad29ff5495986b15480`). Each after sample removed 15 Prisma model reads:

| Operation | Before | After |
|---|---:|---:|
| Organization lookup, including one separate domain lookup | 7 | 2 |
| Module configuration | 6 | 1 |
| Module grants | 6 | 1 |

Other measured model-operation counts were unchanged. The counter observes Prisma model operations, not every SQL statement from ownership guards or the server. No restricted source was turned into an empty successful query. Direct-process timings were 722/225/182 ms before and 608/189/118 ms after; small sequential local samples are not a production benchmark.

All 114 focused tests across five suites pass, including batch-versus-single decision/audit equivalence, source permission gating, tenant scoping, fresh admission after revocation, storage failures, and existing module actions/Cash read models. Changed-file lint and TypeScript pass with stable source hashes. The first test run exposed an old parent Cash test mock that did not provide the new batch boundary; the fixture now forwards its existing per-module decisions. Assertions were retained and the failed receipt is preserved.

Four authenticated desktop navigations (two EN, two FR) rendered the actual Cash brief and enabled its mode controls without page errors. Actual screenshots are indexed by the review. Temporary owned-development-only timing wrappers were restored byte-for-byte. Current app route source matches its pre-instrumentation hashes.

Actual Cash service spans after the change were 2.942, 1.743, 5.395 and 1.789 seconds; the prior four-request range was 1.790–2.439 seconds. These results do **not** establish faster page loads. Development recompilation, asset/hydration cost, query logging and disabled browser HTTP caching remain material confounders. Do not sum overlapping server-component spans or treat repeated intercepted navigation as warm-cache evidence. Latency remains open.

## Rollout, recovery and use

No migration, seed, price, authority, production deployment or external provider action is needed for this source correction. Users keep the existing routes `/en/dashboard/finance/cash-command` and `/fr/dashboard/finance/cash-command`; no new procedure or input is required. Continue the application's ordinary reviewed release process. If batch admission regresses, restore only the Cash source collector's previous per-module calls and its corresponding tests; preserve the canonical evaluator and all unrelated edits. Re-run the affected admission checks before release.

The latest review binds this patch to prior Cash evidence. Earlier screenshots and checks remain historical receipts; their source impact is explicitly bridged by the current regression and identical-result evidence, not silently rehashed as old passes. Source admission is verified for the covered cases. Financial proof completion, payroll statutory input approval, remaining accessibility/denial states and representative production performance still prevent whole-workflow closure.

## Review responsibilities

Architecture/backend: service-owned read-only batch reuses the canonical evaluator; no shared policy rewrite. Security/IAM/privacy: source RBAC precedes admission, per-tenant reads and denial audits remain, no cross-request cache or evidence disclosure. Data/finance: identical source result and unchanged domain query counts; no financial writes. QA/SRE: reduced query demand verified; latency improvement unproven and failed attempt retained. Product/frontend/accessibility/localization: no interface change; actual EN/FR route smoke/screenshots retained, prior accessibility limits remain. Audit/operations: immutable receipts, source restoration and scoped rollback documented. Statutory, migrations, billing, external integrations and AI: not applicable to this read-batching change; their broader requirements remain open.
