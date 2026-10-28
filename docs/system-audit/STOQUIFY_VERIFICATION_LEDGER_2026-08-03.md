# Stoquify Verification Ledger — 2026-08-03

## Safety decision

The audit inspected each candidate gate for writes, database access, network access, subprocess execution, and output defaults. `service-boundary-gate.js`, `hard-delete-gate.js`, `raw-error-boundary-gate.js`, and `workflow-assurance-release-gate.js` can write when `--out`/`--json-out` is supplied; the package invocations used here leave those arguments unset. No prior report was overwritten.

Selected Jest suites mock Prisma/provider boundaries. The migration-gate suite writes only synthetic fixtures under the OS temporary directory and injects its command runner; it does not execute a real migration.

## Environment

| Field | Value |
|---|---|
| Workspace | `E:\ohada saas\Focused projects\stoquify` |
| Branch | `codex/service-boundary-burndown` |
| Commit | `5dc78f2c007c51e151342de08be34b72994839bb` |
| Worktree | 329 tracked changes; 1,232 untracked entries |
| Date | 2026-08-03 |
| Database/provider/browser | Not accessed |

## Command ledger

| Command | Duration | Result | Evidence | Repository mutation |
|---|---:|---|---|---|
| `git status --short --branch` | 9.5s | PASS | Branch and 1,561 status entries observed; output was truncated in console but summarized separately | No |
| `git diff --stat` | 13.5s | TIMEOUT | Large dirty tree and line-ending warnings; no complete stat produced | No |
| source/category `rg` inventories | 7–29s each | PASS | Counts recorded in audit/registry | No |
| `npm run prisma:validate` | 66.2s | PASS | Prisma config loaded; `prisma/schema.prisma` valid | No repository report output |
| `npm run typecheck` | 229.3s | PASS | `tsc --noEmit --pretty false`, exit 0 | No |
| `npm run lint` | 303.5s | PASS with warnings | 0 errors, 4 warnings | No |
| `npm run service:boundary:fail` | 17.4s | PASS | 0 active violations; 13 allowed; 13 scanned | No output args; no report write |
| `npm run hard-delete:fail` | 19.6s | PASS | 0 active unsafe deletes; 8 allowed; 8 scanned | No output args; no report write |
| `npm run error:boundary:fail` | 20.6s | **FAIL** | 6 active findings; 106 allowed; 112 scanned | No output args; no report write |
| `npm run workflow:assurance:release-gate` | 16.4s | PASS (static) | 38/38 checks; 11/11 indexes; 2/2 engine health; 0 static blockers | No output args; no runtime checks |
| focused access/control Jest slice | 235.2s wrapper; 91.9s Jest | PASS | 4 suites, 31 tests | No; worker force-exit warning |
| focused consistency/cache Jest slice | 239.3s wrapper; 103.5s Jest | PASS | 5 suites, 52 tests | No; worker force-exit warning |
| focused failure/recovery Jest slice | 232.6s wrapper; 89.7s Jest | PASS | 8 suites, 45 tests | Temp fixtures only |
| focused financial-truth Jest slice | 186.2s wrapper; 56.6s Jest | PASS | 7 suites, 52 tests | No; worker force-exit warning |

## Focused test evidence

### Access, cross-tenant guard, entitlement, and maker-checker

```text
services/_shared/__tests__/protect.test.ts
services/modules/__tests__/module-entitlement.service.test.ts
services/purchase-order/__tests__/purchase-order.service.test.ts
actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts
```

Result: 4/4 suites and 31/31 tests passed. This proves the selected mocked guard and purchase-order contracts, including the current bulk-approval containment. It does not prove persistence-level tenant isolation or simultaneous database approval behavior.

### Duplicate delivery, idempotency, offline replay, query invalidation, and POS

```text
services/events/__tests__/business-event.service.test.ts
services/pos/__tests__/offline-sync.service.test.ts
hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx
hooks/posHooks/__tests__/usePosOperations-receipts.test.tsx
services/pos/__tests__/pos.service.test.ts
```

Result: 5/5 suites and 52/52 tests passed. This supports selected event/offline/POS/query contracts. It does not prove original-actor replay authority, organization-switch cache clearing, provider finality, or real balance concurrency.

### Provider failure, worker lease, backfill, redaction/export, migration, and error recovery

```text
services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts
services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts
services/payments/__tests__/provider-event.service.test.ts
services/communication/__tests__/whatsapp-receipt-worker.service.test.ts
services/security/__tests__/redaction-policy.service.test.ts
services/security/__tests__/export-safety.service.test.ts
scripts/__tests__/prisma-production-migration-gate.test.js
lib/error-handling/__tests__/canonical.test.ts
```

Result: 8/8 suites and 45/45 tests passed. These are mocked/pure/temp-fixture tests, not external provider, production migration, or production privacy evidence.

### Payment truth, reconciliation, AP, and close

```text
services/finance/__tests__/finance-dashboard.service.test.ts
services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts
services/dashboard/__tests__/dashboard-read-model.service.test.ts
services/payments/__tests__/payment-reconciliation-workbench.service.test.ts
services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts
services/purchasing/__tests__/ap-control.service.test.ts
services/accounting/__tests__/data-trust.service.test.ts
```

Result: 7/7 suites and 52/52 tests passed. Independent suite passes do not resolve the cross-service status-semantic contradiction or capped aggregate finding because no shared truth-table/large-tenant contract is asserted.

## Lint warnings

1. `components/dashboard/items/ModernItemFormForEditing.tsx:514` — raw `<img>`.
2. `components/frontend/custom-carousel.tsx:62` — raw `<img>`.
3. `components/ui/groups/inventory/ItemManagement.tsx:173` — raw `<img>`.
4. `config/permissions.ts:581` — anonymous default export.

These are P3/P2 hygiene/performance issues and were not modified.

## Raw-error gate findings

| File | Line | Classification |
|---|---:|---|
| `services/accounting/accountant-access.service.ts` | 282 | needs canonical mapper/reviewed rethrow classification |
| `services/accounting/close-assurance.service.ts` | 3245 | needs canonical mapper/reviewed rethrow classification |
| `services/agents/portfolio/connector-inventory-read-model.service.ts` | 358 | raw domain error |
| same | 362 | raw domain error |
| same | 366 | raw domain error |
| same | 370 | raw domain error |

## Test-process warning

Access/control, consistency/cache, and financial-truth invocations all passed their assertions but emitted:

> A worker process has failed to exit gracefully and has been force exited.

This indicates timer/handle teardown debt. A narrowed `--detectOpenHandles` diagnostic is safe in principle, but was not run because it can significantly extend execution and does not change the audit’s principal correctness verdict. It is recorded as `TEST-001`.

## Skipped, blocked, and unverified checks

| Check | Status | Reason | Required prerequisite |
|---|---|---|---|
| `npm run policy:gates` | SKIPPED | Composite includes report writes and runtime/environment-sensitive checks | Clean candidate; inspect every subcommand; authorize new output paths |
| `npm run verify:repo` | SKIPPED | Invokes policy composite and full suite/build | Clean candidate and artifact authority |
| `npm run verify:ci` | SKIPPED | Migration deploy/status and full verification | Disposable named CI database and migration authority |
| `npm run verify:release` | SKIPPED | Release secrets/evidence/provider/environment effects | Named release environment and independent approval |
| Prisma migrate deploy/status/reset | BLOCKED | Unidentified/no disposable database; reset is destructive | Isolated production-shaped DB, backup/rollback plan |
| Seeds | BLOCKED | Mutates database and may overwrite fixtures | Disposable test DB and explicit seed plan |
| `*.postgres.test.ts` | BLOCKED | Requires isolated PostgreSQL and can mutate state | Dedicated database/container and cleanup ownership |
| Payroll immutability runtime | BLOCKED | Creates/uses test DB/runtime evidence | Dedicated disposable DB and artifact path |
| Authenticated Playwright/browser flows | UNVERIFIED | Setup may migrate/seed and create screenshots/artifacts | Reusable isolated auth fixture; approved artifact directory |
| Webhook/provider/authority calls | UNVERIFIED | External side effects/credentials/contracts unavailable | Mock server or sandbox provider with written authority |
| Real balance/approval/AP concurrency | UNVERIFIED | Mocked tests cannot prove database race behavior | Disposable PostgreSQL and deterministic concurrent harness |
| Organization-switch cache proof | UNVERIFIED | Requires authenticated multi-org browser fixture | Safe multi-org fixture and browser test |
| Audit-sink outage during transaction | UNVERIFIED | Failure policy not yet defined; requires isolated DB/outbox | Approved fail-closed/deferred policy and fixture |
| Load/DoS/credential attacks | BLOCKED | Potentially disruptive and outside audit authorization | Written target/scope/rate/rollback authorization |
| SAST/SCA/secret/SBOM/container/DAST | UNVERIFIED | Tooling/network/artifact policy not configured | Approved tools, network access, immutable output location |
| Backup/PITR/restore/rollback drill | BLOCKED | Infrastructure unavailable | Named environment, recovery objectives, operations owner |
| Statutory/OHADA certification | BLOCKED | Source hashes/expert approval/authority proof incomplete | Licensed expert and authoritative sources |

## Overall verification interpretation

The source compiles, lints without errors, validates its Prisma schema, preserves the configured service/hard-delete boundaries, and passes 180 focused tests. The raw-error gate fails. More importantly, none of these results proves production tenant isolation, provider settlement, real concurrency, alert delivery, migration history, recovery, user adoption, or statutory correctness. Those remain explicitly blocked or unverified.
