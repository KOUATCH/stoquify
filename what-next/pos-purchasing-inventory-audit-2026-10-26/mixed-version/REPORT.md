# Mixed-version compatibility — disposable PostgreSQL

Verification executed 2026-10-26; continuation and report completed 2026-10-28. This is scoped compatibility evidence, not approval for a rolling deployment. MTN, open authoring/retention/operating policy and negative-stock certification remain outside scope.

## Outcome

Thirteen scenarios have durable evidence: nine support the exercised compatibility contract, one proves safe rejection at a reservation payload-version boundary, and three reproduce unsafe combinations. Passing a diagnostic test that reproduces duplication or value drift does not make that combination compatible.

Two additional read-only comparisons on 2026-10-28 passed for the retained EN/FR certified-close fixtures. Old/current dashboard, evidence graph, certificate and period seal values match. [Close read results](close-read-results.json). These are service/database reads of locale-associated fixtures, not new localized rendering tests.

No application change was needed within the supported, consistently configured cohort. New files implement the verification harness and evidence collection. The unsafe cases involve historical code already repaired in the current tree or admission behavior deliberately retained behind existing rollout controls. Altering defaults, accepting mismatched reservation hashes, modifying retained receipts, or changing the frozen historical source would conceal these boundaries rather than verify them.

## Versions, environment and evidence classes

- Historical source: commit `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with 2,437 archived source files. Separate Node processes load historical/current services and separately generated Prisma clients. Both use the installed Prisma 6.19.3 runtime. This is not a clean-install or full production artifact comparison.
- Current source: the working tree recorded in [start-source.json](start-source.json), compared in [final-source.json](final-source.json) and [resume-provenance.json](resume-provenance.json). Prior application repairs and unrelated edits are preserved. The final comparison detected no drift in captured application source or historical files during the original run.
- Completion comparison: seven HRIS/payroll files changed concurrently after the resume comparison. They are recorded separately in [completion-source.json](completion-source.json), preserved and not certified here. None is the purchasing/POS/stock owner or the retained close-dashboard/graph read path exercised above. No historical source file changed. This report does not claim that the entire working tree stayed frozen or that other work passed these checks.
- Database: retained `localhost / stoquify_pos_audit_20261026_d30f / public`, PostgreSQL 17.5. All 120 applied migration checksums match source. Both generated clients' normalized model declarations match their source schema; raw current generated/source schema hashes differ because of formatting/declaration order. [Environment evidence](environment.json).
- Source/static: current owners, baseline counterparts, rollout flags and release controls inspected; scoped TypeScript passed with no diagnostics. Existing dated graph evidence was used for discovery only.
- Mocked unit/component: no new standalone mocked test suite. Action harness request-context authentication and Next cache APIs are supplied synthetically. These results do not prove authenticated HTTP authorization, revocation, or cache behavior.
- Real PostgreSQL: services, ORM clients, transactions, stock effects, receipts, payments, journal rows and observed blocking sessions are real. A final read-only transaction reconciled all thirteen scenario organizations: [database-readback.json](database-readback.json).
- Rendered/browser/accessibility and external provider: not run in this continuation. Earlier EN/FR evidence remains separate. No live provider calls occurred.

## Scenario and invariant matrix

Each case starts with its own synthetic organization, actors and item/location. Purchasing actors receive existing permissions and a stored session. POS cases use the existing checkout fixture. Stock races/restoration cases seed an explicitly synthetic opening value pool; they do not prove opening-stock accounting. Detailed commands, identifiers, denials, balances and journal lines are retained in [combined-reconciliation.json](combined-reconciliation.json).

| Scenario | Rule and procedure | Result / durable evidence |
|---|---|---|
| Baseline draft → current creation → baseline recovery | Save/prepare old, create current, replay/read old with writes disabled | PASS: same receipt, one PO, no stock/payment effect |
| Current draft → baseline creation → current recovery | Reverse the producer/consumer versions | PASS: same receipt, one PO, no stock/payment effect |
| Current legacy create/clone across all flags | Commit with flags enabled; replay under `00`, `10`, `01`, `11`; change payload; read using old owner/client | PASS: exactly two POs; same retained identities; changed payload denied |
| Interrupted preparation and discard | Prepare old; disable current writes; read retained draft; discard current; stale old create | PASS: prepared work remains readable; write/stale attempt denied; zero POs |
| New admission and old client shape | Exercise all four flag pairs; then keyless input and recovery-only clone without an intent | PASS for existing admission contract: `00` remains legacy; `10` denies; `01`/`11` create; keyless enabled and unknown recovery denied. Not duplicate-safety certification for `00` |
| Current commit → unaware old legacy create/clone | Replay the same request through baseline legacy actions, including `recoverOnly` clone | UNSUPPORTED: four POs for two logical requests. Current recovery still returns its two originals |
| Inconsistent flags at first admission | `00` node creates first, `11` node receives the same identity next | UNSUPPORTED: two POs. The first legacy write has no retained durable intent |
| Baseline POS commit → current replay | Commit full cash sale, replay other version, change tender under same identity | PASS: one commit/payment/movement; stock/value zero; two balanced journals; changed tender rejected |
| Current POS commit → baseline replay | Reverse the producer/consumer versions | PASS: same durable counts and balances; changed tender rejected |
| Baseline goods receipt → current replay | Approve through current owner, receive old, replay current, change quantity under same identity | PASS: one receipt/movement, quantity 3.000, value 300.00. Fixture has no receipt posting rule; receipt-to-GL remains outside this case |
| Competing last-stock writers | Independent old/current processes contend behind a held row lock; observe PostgreSQL blocking before releasing | PASS: one success, one denial, one movement, quantity/value zero |
| Current exact-value issue → old return | Remove 3 units/value 300.02; old issue replay; old return; current return replay | UNSUPPORTED: old return restores 300.03, drift 0.01. Current retry adds no effect and preserves historical result |
| Reservation hash versions | Reserve old then replay current; reserve current with another identity then replay old | PASS for fail-closed safety: both cross-version retries rejected, original reservations retained, total reserved 2.000. Transparent replay is NOT compatible |

## Confirmed boundaries and disposition

**MV1 — historical legacy writer, high impact, reproduced.** The baseline action ignores the new request identity and recovery-only semantics. Current routing is at `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:110`, `:169`, `:375`; the current durable adapter is at `services/purchase-order/purchase-order-authoring.service.ts:199`. New code cannot make an already-running old binary honor this owner. Keep the repaired adapter on every PO-writing node; drain the unaware writer before routing recovery or new writes. This strengthens the evidence for the existing B5 rollback restriction; it is not a new default-rollout decision.

**MV2 — inconsistent first-admission flags, high impact, reproduced.** Current `00` routing without retained intent intentionally calls legacy creation. A later enabled node cannot associate that legacy PO with the supplied identity. Flags are defined at `purchase-order-authoring.service.ts:18`; retained-intent routing at `purchaseOrderSystemAction.ts:111`. Keep flags consistent across admission nodes and drain in-flight admissions before transitions. Retained completed intents recover under every tested flag pair. Globally changing legacy admission is still the explicitly open policy decision.

**MV3 — historical restoration arithmetic, high impact, reproduced.** The baseline multiplies rounded unit cost; current issue/return owners at `services/inventory/inventory-stock-event.service.ts:1127` and `:1162` implement the B1 exact-value repair. Route restoration writes only to repaired code. A historical bad result remains immutable on retry; repairing it requires an explicit supported correction, not replay mutation or direct SQL. No such synthetic correction was necessary to establish this version boundary.

**MV4 — reservation hash mismatch, intentional fail-closed boundary.** The current actor-bound reservation payload at `inventory-stock-event.service.ts:1299` differs from the baseline. Rejecting mismatched replays protects retained effects. Retain original identities and reconcile pending reservations before retiring their owner. Do not weaken hash validation or retry with a fresh identity merely to bypass the conflict. A transparent migration/resumption contract remains unverified and was not invented here.

## Procedures, failures and reproducibility

Current command definitions, registry and workflow were inspected before execution. First check: `npm run agent:workflow:check`, PASS (196 unclassified package scripts reported). Unclassified custom scripts below were individually reviewed: fixed disposable target, allowlisted process environment, no `.env` loading, no migration/reset/provider call. Historical generation writes only the isolated client output; it does not replace the shared client.

1. `node what-next/pos-purchasing-inventory-audit-2026-10-26/mixed-version/prepare.cjs` archives the fixed baseline and hashes source. It refuses an existing snapshot. The local dependency junction required reviewed elevated filesystem execution after the initial sandbox denial.
2. `node .../mixed-version/generate-client.cjs` generates the historical schema client, PASS. `node .../mixed-version/environment.cjs` validates schema/migration provenance, PASS.
3. `node .../mixed-version/run.cjs 'hands a prepared durable request from baseline'` preflight: one pass. The initial syntax-only harness failure ran zero tests and is preserved in `initial-harness-results.json`.
4. `node .../mixed-version/run.cjs` full matrix: twelve assertions passed, one failed due to the harness expecting original cost in a replay response. Preserved in [initial-matrix-results.json](initial-matrix-results.json) and [initial-matrix.log](initial-matrix.log).
5. The owner reports the cost of newly applied movements: replay correctly returns zero. The assertion now checks zero incremental cost, the original durable movement cost 300.02, and unchanged stock. `node .../mixed-version/run.cjs 'tests stock receipt replay'`: one pass, twelve skipped, [results.json](results.json). This is an affected-case rerun, not a claim that the complete final file ran in one all-green invocation. No application code changed between these runs.
6. `node node_modules/typescript/bin/tsc --project tsconfig.mixed-version.json --noEmit --incremental false`: PASS, exit 0, no diagnostics, after the final test correction.
7. `node .../mixed-version/finalize.cjs`: read-only final reconciliation and source comparison. Two initial evidence-script ORM field mistakes were corrected (`InventoryLevel.location.organizationId`, `InventoryTransaction.type`); those read-only attempts made no database changes. All thirteen final states matched.
8. `node .../mixed-version/close-read.cjs`: two retained certified-close reads, PASS. Initial strict equality differed only on observation timestamps; [initial result](close-read-initial-results.json) is retained. Comparison now excludes exactly `dashboard.currentProof.checkedAt` and `graph.source.asOf`; persisted source dates, certificate content hashes, complete certificate rows and seals remain compared. The old/current services return the same certified proof grade and matching retained records.
9. `node .../mixed-version/check-evidence.cjs` records completion hashes and checks evidence against the private disposable configuration/session values without emitting them. [Completion provenance](completion-source.json) binds the added close-reader branch; the earlier final manifest remains the exact thirteen-scenario harness snapshot.

Preserve existing result files before rerunning: the runner writes its current `results.json`, `run.log`, and `reconciliation.json`. Fixtures use new identities and do not reset retained organizations. Private jobs contain synthetic session tokens under ignored `.codex-tmp/mixed-version-work`; do not publish that directory. The archived baseline, generated client and disposable database are retained. No app server was started by this continuation.

## Remaining gates and rollback

- **BLOCKED for unrestricted mixed-writer certification:** MV1–MV3 reproduce incompatible effects. Required evidence is an enforced, consistently configured cohort excluding those historical writers, or a separately reviewed bridge implementation. This pass did not change deployed routing or decide the open rollout policy.
- **NOT RUN:** mixed production Next artifacts, stale browser server-action identifiers/chunks, cross-build authenticated session transport, and old/new delivery-worker leasing/recovery. Required inputs for release-specific certification are the exact artifact pair, runtime/routing configuration, worker versions and a disposable deployment-equivalent rehearsal. The service harness cannot substitute for those tests. Prior single-version browser/worker passes do not certify version skew.
- **NOT RUN:** mixed-version close writes and authenticated close-screen transport. Old/current service reads of retained certified packs now pass; earlier certification/sealing lifecycle evidence remains single-version. Read compatibility does not certify creating new packs/seals on historical writers.
- **OPEN, excluded:** retention/resumption/escalation, default durable-authoring adoption/legacy policy. **MTN excluded:** no sandbox configured. **Negative stock excluded** by instruction.

Follow `docs/release/ARTIFACT_SCHEMA_PROMOTION.md`: retain the expanded schema and durable data; a source rollback does not undo migrations. For these workflows, returning new PO or restoration writes to the historical binary is specifically unsafe. Keep repaired owners available for receipt recovery, pause/drain admission using existing controls, reconcile pending work, and use the existing worker drain/reconciliation runbook before worker changes. Do not delete receipts, reset attempts or mass-requeue jobs. This report recommends no deployment and authorizes none.
