# Validation and incremental adoption roadmap

**20 September 2026 · proposed work; no rollout or implementation performed**

## 1. Start with one discriminating experiment

**Journey:** Buy and replenish for a goods distributor. Reuse purchasing, inventory, accounting setup, composer preview and retained supplier obligations.

**Control:** Existing module builder and its current explanations.

**Prototype:** The same services and permissions behind an outcome-led entry. The user chooses goods or services, sees supported prerequisites, reviews impact, and receives the next setup/task action.

Do not add a second purchasing service, another ledger, or a separate entitlement system. Prototype interactions use synthetic data.

### Assumptions to test

1. Users can choose the right configuration with fewer explanations.
2. They understand workspace removal, new-work stopping and subscription changes as different actions.
3. Required accounting/stock behavior is understandable without separately selecting every internal dependency.
4. The resulting workspace helps them complete a receipt/invoice/settlement task.
5. Administrators can resolve setup failure and resume without duplicate commands or unexpected access changes.

### Baseline

Current source and component tests establish feature presence. There are no measured user comprehension, setup-time, support-cost or willingness-to-pay baselines in this run. Obtain those before asserting improvement.

Suggested formative cohort: 6–8 relevant participants spanning business owners, purchasing operators, and accountants, with English and French represented. Counterbalance experience order. This is directional usability research, not statistically powered proof.

### Proposed acceptance criteria

- At least 80% choose the correct goods-versus-services configuration and explain the change correctly without coaching.
- Median configuration/task-discovery time improves by at least 20% versus the control for comparable tasks.
- No participant believes a workspace choice purchased access or approved country compliance.
- No material loss in completion/recovery success versus the control.
- Automated denied-effect, stale-preview, duplicate-command and continuation checks have zero failures.
- Unsupported stops remain unavailable and understandable.

Thresholds are proposed decision gates, not existing business KPIs. Record actual counts and task difficulty. Any unauthorized effect, duplicate financial outcome or inaccessible retained obligation stops expansion irrespective of usability scores.

Reject or simplify the recipe layer if it produces no material improvement, hides dependencies, or creates more support questions.

## 2. Phases and exit evidence

Effort ranges are rough planning judgments in person-days for the bounded scope, assuming familiarity with the repository and access to a disposable test environment. They are not commitments, staffing assumptions or elapsed delivery dates. Re-estimate after discovery; do not add overlapping work to existing module-roadmap estimates.

| Phase | Work and owner capability | Indicative effort | Exit evidence |
|---|---|---:|---|
| 0: Bind current scope | Platform engineer + domain owner: map catalog, destinations, readiness and observe/enforce entry points; preserve stable aliases. | 2–4 | Reviewed capability/operation matrix with every pilot path classified; current source hashes. |
| 1: Make pilot contracts consistent | Platform/backend + QA: reconcile hidden prerequisites and unavailable destinations; close the pilot's authority gaps without global mode changes. | 4–8 | Denied reads/writes and authority-change tests; existing grants preserved; same owning services. |
| 2: Prototype recipe UX | Product/UX/frontend: extend existing composer for goods/service purchasing and understandable impact/recovery. | 3–5 | Working synthetic prototype, EN/FR copy, keyboard/focus checks, explicit limits. |
| 3: Formative comparison | UX/product + accountant/operator participants: run the defined tasks and record baseline/control/prototype results. | 2–4 plus recruitment | Actual completion and comprehension results; proceed/simplify/reject decision. |
| 4: Integrated pilot evidence | Backend/data/QA/operations: isolated DB transactions, concurrency, idempotency, revocation, history and recovery. | 4–8 plus a relevant business cycle | Source-to-ledger/stock/payable tie-out; rollback rehearsal; support ownership. |
| 5: Commercial validation | Product/commercial operations: compare outcome bundles with broad-suite packaging; quantify support/provider/storage/country costs. | 2–4 research days | Cost model and price/limit comprehension; real willingness-to-pay evidence remains external research. |
| 6: Commercial lifecycle engineering | Billing/platform/security, only after phase 5 decisions: reviewed offers, signed/deduplicated provider evidence, grant transitions and retained access. | Estimate after provider and policy discovery | Failure/out-of-order/duplicate event matrix, cancellation continuity, monitored reconciliation. |
| 7: Expand by observed demand | Domain owners: sell/collect, reconcile/close, and qualified payroll scope. | Estimate each slice separately | Same gates repeated for each supported variant; actual support and retention observations. |

POS/sales stop and direct reconciliation stop are separate prerequisites if a future slice requires them. Their completion is not hidden inside the purchasing UX estimate.

## 3. Compatibility and migration

1. Preserve the 19 current slugs and all existing grant records. Add customer-facing aliases rather than silently changing identifiers.
2. Treat recipes as versioned selections over existing capabilities. A recipe update produces a proposed difference, not an automatic entitlement change.
3. Preserve the distinction between absent legacy configuration and managed configuration with zero grants.
4. Bind preview to tenant, actor authority, grant/configuration revisions, setup scope and operation impact. Recheck at commit.
5. Keep the old active configuration during preparation; record failures durably and permit bounded retry.
6. Migrate any new metadata in a disposable copy first. Validate counts, key constraints, scoped history and rollback. This audit executes no migration.
7. Introduce commercial packages without rewriting historical business records or retroactively withdrawing previously established rights.

## 4. Retention and downgrade contract to resolve

For each commercial transition define new-work eligibility, completion operations, read/export access, retention duration, support route and accountable approver. Have appropriate business/legal reviewers settle customer terms where needed; this report gives no legal retention period.

Define what happens when:

- A payment arrives after the subscription changes.
- A refund or correction must reference an old transaction.
- An already accepted offline event returns late.
- An employee loses access while another authorized employee must finish work.
- Provider events are duplicated, out of order, disputed or unavailable.
- A suspended customer reactivates with changed country or accounting setup.

A historical source ID is necessary but insufficient: current actor permission, tenant scope and operation-specific policy still apply.

## 5. Rollback and operations

Disable the new recipe presentation and return to the existing builder if the UX fails. Keep all accepted commands, grants and business records. Restore a previous selection through a new reviewed command, not by deleting configuration history.

Do not roll back a commercial issue by rewriting ledger or stock truth. Correct domain effects through their established reversal/settlement paths.

Record preparation latency, retry age, active-versus-desired revision, rejected/stale previews, unauthorized attempts, unexplained financial differences, and support minutes per organization. Measure rather than invent service-level objectives.

Rehearse recovery when a grant changes during preparation and when an event arrives after a stop boundary. Identify the operational owner and a user-facing resolution route before pilot use.

## 6. Explicit delivery disposition

| Keep | Simplify/adopt | Introduce after evidence | Defer |
|---|---|---|---|
| Current monolith, domain services, grant/configuration separation, command history, retained-work controls | Clear industry/workflow entry, shared prerequisite explanations, accurate availability, small package menu | Recipe versions, cross-contract validation, commercially reviewed provisioning and retained scopes | Wholesale rewrite, arbitrary plugins, marketplace, microservices per module, autonomous AI changes |

The next implementation brief should name the precise pilot paths and defects from phase 0. Do not use this report as authorization to broaden into an ERP rewrite.
