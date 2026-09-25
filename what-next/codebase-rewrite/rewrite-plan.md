# Rewrite plan

The complete continuation roadmap, work-package process, domain acceptance requirements, and program completion gates are in `execution-roadmap.md` (24 September 2026). The initial implementation sequence and its original acceptance budgets remain below for traceability.

Maintain the modular monolith and existing domain ownership. Rewrite demonstrated problems within each domain; keep routes, server contracts, tenant boundaries, control evidence, and existing user changes intact. Replacing working modules without behavioral inventories would not satisfy the request.

## Ordered implementation

1. Establish repository measurements, source hashes, behavior contracts, and reproducible checks.
2. Rewrite the cash/payment-history read slice: identity- and permission-scoped browser caching, response-scope validation, current export-state derivation, and database summary aggregation. Preserve existing decimal formulas, paginated detail queries, RBAC, module enforcement, redaction, and cursor checks.
3. Consolidate repeated code only after inspecting current callers and confirming equivalent behavior. The preflight module's unusually deep public wrapper chain requires contract checks before any consolidation; its exported functions cannot simply be deleted because they look repetitive.
4. Examine remaining high-complexity domain owners and import cycles in dependency order: shared presentation/queries; identity/module contracts; inventory/POS; purchasing/AP/payments; accounting/close; HR/payroll; regulatory/adapters; analytics/AI/operations. Give each selected replacement behavioral protection and remeasure it before extending the pattern.
5. Complete integrated type/build/policy checks, real-database and browser validation, migration/rollback evidence if schema changes become necessary, and final scope reconciliation.

## Measurable acceptance budgets

- Cash history: all seven reproduced scope failures pass; existing URL/service/component contracts remain covered.
- Summary transport: the number of returned aggregate rows is bounded by the cash type enum plus the payment-method/status Cartesian product, independent of transaction volume. Query count must not increase. Monetary totals and event counts must remain identical for the same data and filters.
- Performance measurements must distinguish simulated application processing from actual database and endpoint latency. Claim no whole-application latency target until representative real workloads can be measured.
- Consolidations must reduce maintained source lines and repeated bodies after including any new helpers. Do not count snapshots, removed tests, generated files, or reclassified source as a reduction.
- The preflight dry run identifies 106 exactly matching wrapper functions. Before applying that edit, set its target at at least 15% fewer lines in the module, preserving every existing export and serialized result. The predicted reduction is 1,783 of 10,857 lines (16.42%), including the shared helper.
- Require unchanged values and shapes for retained exported contracts, including evidence labels, fingerprints, blocked states, and activation authority.
- Whole-codebase radical reduction is an objective without a defensible numerical commitment yet. The baseline does not justify inventing a percentage or claiming all modules have been reviewed.

## Rollback and controls

No schema migration or deployment is needed for the first slice. Source baselines permit selective reversal of this task's edits without resetting the user's worktree. Keep the old implementation only as evidence, not as a runtime fallback. Never enable production activation, weaken a failing gate, relax tenancy, or refresh evidence merely to make checks green.
