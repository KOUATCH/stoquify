# Rewrite progress

**Status: implementation in progress; the whole-codebase rewrite is not complete.**

The two implemented stages pass 1,019 focused tests and the final full typecheck, with 11 hook tests rerun after the last type fix. Integrated validation remains open: the isolated build timed out after 15 minutes, local browser prerequisites timed out, and the inventory gate reports 20 active findings outside the edited files. The partial build output has been removed and its logs retained.

| Area | Decision and implementation | Verification boundary |
| --- | --- | --- |
| Repository measurement | Source hashes, categories, repeated bodies, complexity proxies, and import cycles recorded. Historical test/schema copies separated. | Not a complete feature inventory or runtime reachability proof. |
| Cash/payment-history browser state | Rewritten to scope cached reads by actor, organization, permissions, and filters; suppress previous data; reject mismatched response scope; derive current export state from mutation state. | Seven defects reproduced before the edit; final tests tracked in verification.md. |
| Cash/payment-history UI | Existing shell receives permission/no-organization states and export visibility. Detail selection preserves current query data and avoids a loading transition. | Component tests; authenticated browser workflow still outstanding. |
| Cash/payment-history service | Two unbounded summary fetches replaced by grouped decimal sums and transaction counts. Trusted response scope added. Existing action guards, cursor binding, redaction, page reads, formulas, and table schema retained. | Mocked service and action tests; aggregate equivalence benchmark. Real query plans, concurrency, and endpoint timings outstanding. |
| Cash-shortage activation preflight | 106 repeated wrappers use one typed implementation. Public function/type names, nested objects, text, property order, and activation flags retained. | 996 existing baseline tests; 5,610 serialized comparisons over 330 functions and 17 scenarios passed. Final suite/typecheck tracked separately. |
| Domain owner services | Accounting/close, inventory, POS writes, purchasing/AP, HRIS/payroll, country packs, reconciliation and billing retained. | Broad source inventory only; these modules are not claimed to have been rewritten or fully audited. |
| Public identity, entitlements and provider boundaries | Existing implementations retained. | Cash action authority traced; global security revalidation remains outstanding. |
| Other UI/query layers | Existing implementations retained. | 62 repeated body groups and remaining high-complexity workflows require individual behavioral review. |
| Schema, migration history, deployment | Retained; no migration or deployment performed. | Prisma validation and workflow runtime table/migration-presence check passed. Full migration release evidence remains distinct. |

No temporary runtime fallback or migration adapter was introduced. The saved originals are verification artifacts only. The transformation script is a guarded, one-time tool; the application does not execute it.

## Next dependency-ordered work

1. Finish the current type/build/test gates and establish a reproducible real-database/browser baseline for the first vertical slice.
2. Reconcile the remaining source/function inventory with required product workflows, external consumers, and deployment entry points. The source inventory alone does not authorize removal of a module.
3. Prioritize shared query/presentation duplication and investigate the accounting/inventory emitted-code cycle. Follow-up classification found that seven of the eight original import SCCs lose their cycles after TypeScript erases type-only/unused imports; those groups do not need new runtime layers merely to satisfy a source-graph metric.
4. Simplify inventory/POS, purchasing/AP/reconciliation, accounting/close, payroll/country packs, and analytics/AI in that order only when each slice has its own behavioral and performance evidence.
5. Measure full application size, bundles, production-like latency, throughput, memory, accessibility, and recovery. Compare using fixed environments and datasets before making a complete-rewrite or release claim.
