# Cash Command related-source reuse

2026-09-28T09:38:56.774Z. FA-CASH-COMMAND remains In progress.

## Correction and evidence

Cash Command used to read payment, inventory and close snapshots directly and again through the tenant operating snapshot. It now supplies its existing results to getTenantOperatingSnapshotFromRelated. This removes redundant reads and ensures the cards and aggregate use the same related evidence. It does not create a transaction-wide database snapshot.

Only Cash Command orchestration and its tests changed. It now calls the existing tenant aggregate FromRelated entry with the same three objects passed to cards/signals. Shared snapshot builders, domain projections, schema, actions, portal and destination policies are unchanged. Real database equivalence covers aggregate metrics, source hash, freshness, blockers, disclosed summary, proof subjects and card values/states; financial rows remain unchanged.

- evidence/cash-related-checks-711ad1b9-ef0a-4a3e-a1f1-7b8627e853be.json: 57 tests/four suites, changed-file lint and full TypeScript passed. New cases cover exact object reuse, one call per related source, independent failure of each source, no aggregate/signal/proof discovery after failure, and fresh retry. The existing tenant currency, unavailable-total, blockers, UI request-state and route tests remain covered.
- lanes/environment/cash-related-8f869a02-eb8e-4773-8328-95ce048528dd.json: actual isolated PostgreSQL with an existing synthetic organization. The historical nested-read path was reconstructed using the unchanged getTenantOperatingSnapshot entry. Calls to payment/inventory/close were 2/2/2 before and 1/1/1 after. Deep equality passed for the complete aggregate (including evidence and provenance), and for disclosed summary, proof subjects and card values/states. Balances, payment transactions, payment and journal counts were unchanged. No fixture creation, business operation or authentication change was required.
- Raw service timings were 385.8ms followed by 113.3ms. The second read benefits from a warmed process/database; these are diagnostic observations only. No production latency improvement percentage is claimed.

The portal's six views and current module-action matrix remain valid for unchanged presentation/action code. Source changes and exact verification bindings are recorded in evidence/cash-related-review-2026-09-28.json; old receipts remain immutable.

## Remaining source boundary

The tenant aggregate still reads sales, purchasing, payroll, journal and assurance data before the output projection. Required next implementation: authorize each source domain before its query and build domain-specific evidence for permitted cards. The private tenant builder currently performs 27 parallel operations and composes mixed provenance. A denied domain must become explicitly unavailable, never a fabricated successful zero snapshot. Preserve the existing currency, payroll proof and failed-query contracts. Do not broaden Cash Command roles or infer domain authority from tenant administrator status.

Payroll/inventory destination permissions, all server-authored EN/FR copy, remaining proof subjects and genuinely posted payroll lifecycle also remain open in the parent checklist.

## Operation and recovery

Routes remain /en/dashboard/finance/cash-command and /fr/dashboard/finance/cash-command. No new input, document, approval, migration or setup is required. A failed source still fails the read; retry requests fresh evidence. No deployment or live activation occurred. If an orchestration regression emerges, revert only this Cash Command call change while retaining the current proof authorization and portal fixes. Existing previous closure source files are unchanged.

## Review scope

Architecture/backend/SRE: existing shared composition entry reused; redundant source calls measured without performance certification. Data/finance/audit: actual aggregate and financial-row invariance, failure not zero. Security: output projection retained; pre-query domain admission explicitly unfinished. Frontend/quality: current Cash UI and route tests passed; unchanged visual evidence reused. Product/operations: no employee procedure or packaging change. Statutory, migrations, external providers, offline and agents: not applicable; behavior unchanged.
