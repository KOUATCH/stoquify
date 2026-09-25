# Codebase rewrite baseline — 24 September 2026

The baseline is the existing working tree, not a clean checkout. Existing changes are preserved. Machine-readable source hashes, the counting script, initial Git status, and before-change copies are in `evidence/`. The initial scan completed but its first save was denied by the sandbox; the successful rerun saved `baseline.json`. Git status was saved separately after a submodule rejected the original empty-ignore configuration.

| Inventory category | Files | Physical lines |
| --- | ---: | ---: |
| Application source in the inspected source roots | 1,602 | 383,365 |
| Maintained tests, including tooling tests | 1,082 | 255,308 |
| Archived/reference test copies | 799 | 211,145 |
| Tooling | 181 | 61,267 |
| Migration files | 88 | 13,376 |
| Authoritative Prisma schema | 1 | 9,935 |
| Copied/generated/reference schemas | 8 | 51,126 |
| Documentation | 5,388 | 795,285 |
| Root legacy dashboard | 2 | 421 |

There are 102 direct production dependencies. The AST scan found 62 repeated function-body groups (at least 12 physical lines) and 8 strongly connected import components, including type-only imports. 51 application files are not TypeScript root files; this does not prove they are absent from the transitive typecheck. Counts include comments and whitespace. Generated/vendor/ignored files, root configuration files, public assets, and localization JSON are not included in the application-source total. They must not be presented as source reductions.

Largest files include payroll-control.service.ts (10,974 lines), pos-cash-shortage-production-activation-preflight.ts (10,857), close-assurance.service.ts (4,382), ap-control.service.ts (3,937), and pos.service.ts (3,857). A file's length is not evidence that its behavior is unnecessary.

## Architecture and current evidence

The current architecture is a Next.js application with server actions, authoritative domain services, Prisma/PostgreSQL persistence, and client query caches. `next.config.mjs` builds standalone output. CI installs through npm; a second pnpm lockfile also exists. The 20 September modularity report favors evolving the modular monolith and records existing domain composition and entitlement controls. It is historical evidence, not a fresh certification.

The graph reports are dated 9 August. Current graph files contain 1,044 action nodes, 308 hook nodes, 622 app nodes, 1,173 component nodes, and 72 type nodes. Graphs are navigation aids; current source determines change decisions.

The cash-history hook is graph community 7, including `hooks_usecashpaymenthistoryworkbench_usecashpaymenthistoryworkbench` and its parser/filter/navigation nodes. Its historical URL test is in community 43. Current source, not that August extraction, exposed the cache-scope failures.

## First vertical slice: cash/payment history

Flow: finance route access → CashPaymentHistoryWorkbench → useCashPaymentHistoryWorkbench → cash-payment-history.actions → cash-payment-history.service → organization/cash/payment records. Read actions enforce current RBAC and both module decisions. Export preparation additionally requires recent authentication and export-safety evaluation. The service binds signed cursors to tenant and filters, scopes own-mode reads to the authenticated cashier, and redacts provider references.

Before changes, the client query key contained only filters and reused previous query data. The QueryProvider keeps a cache with a one-minute stale interval and does not scope the whole provider to an identity. Seven new behavioral regression cases failed against this implementation: organization switch, actor switch, permission refresh/revocation, manager-to-cashier downgrade, mismatched server scope, changed filters, and late export completion. Existing URL/service/component tests passed (10 tests total across existing suites and one already-passing new case).

Summary reads fetched every matching transaction despite bounded page reads. Both monetary columns are `Decimal(14,2)`, allowing exact grouped sums without changing per-record precision. Baseline: two bounded page reads plus two unbounded summary reads for the combined lane, preceded by an organization lookup. No live database timing, query plan, production throughput, browser responsiveness, or deployable bundle baseline has yet been established.

## Verification limits

The full repository typecheck was launched before implementation. See its log and the verification report for its eventual result. Existing build folders have no verified relationship to this working tree and are not a trustworthy before/after bundle baseline. Mocked tests cannot establish PostgreSQL concurrency, real query plans, authenticated browser behavior, or release readiness.
