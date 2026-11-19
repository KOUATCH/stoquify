# Closure execution report — 26 October 2026

**Fresh rerun:** all five requested areas were re-executed successfully in [revalidation 02](revalidation-02/REPORT.md). That report preserves the new results separately; this document retains the original implementation explanation, scope and limitations.

The four requested workstreams have progressed through implementation and scoped verification. **The whole program remains incomplete:** MTN MoMo has no configured sandbox, the retention/operating policy remains deliberately open, and the exclusions below still apply. This report supplements the single shared [evidence register](../EVIDENCE_REGISTER.md); it does not replace it.

The user authorized reversible engineering and explicitly selected: keep policy open and implement behind existing rollout controls; MTN MoMo with no local sandbox; preserve negative-stock behavior and exclude its certification. No deployment, production mutation, charge, commit or push was performed. Only synthetic local databases were mutated. The task-owned Next application has been stopped.

## What changed

**B5 — legacy purchase creation/clone** is implemented behind `PURCHASE_ORDER_AUTHORING_UI_ENABLED` / `PURCHASE_ORDER_AUTHORING_WRITES_ENABLED`, without changing deployed defaults. Previously, submitting the same legacy create input twice produced two order IDs. The new adapter binds a caller-retained UUID to immutable create/clone input and freezes clone source content in an existing `BusinessEvent`. It delegates save, preparation, creation, receipt recovery, numbering and authorization to the existing durable authoring owner. It introduces no new table, expiry policy, worker, payment or stock side effect.

The authoritative adapter is `services/purchase-order/purchase-order-authoring.service.ts:199`; retained-intent routing is at line 186 and action routing at `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:110`. Both initial execution and replay recheck stored actor/session/tenant authority. A changed payload under the same identity is rejected. A retained completed receipt remains recoverable with new writes disabled. New commands fail when writes are disabled. Recovery-only clone requests cannot fall through into the old non-idempotent creator.

Legacy form and query callers retain the UUID across retries. Clone recovery stores only the opaque identity in session storage, scoped by organization, actor and source order. It resolves the original intent after transport failure or remount instead of sending an ordinary second clone. English/French recovery labels explain that behavior. The existing canonical error mapper handles unexpected create errors; the allowlisted module-stop message is preserved.

The ten application files and exact before/after hashes are in [final-summary.json](final-summary.json). [owned-application.patch](owned-application.patch) is measured against this turn's preserved baseline, rather than treating all pre-existing Git changes as ours. Test additions are `workflow-closure-{seed,authoring,worker,ap}.postgres.test.ts`, the reused AP fixture, and the action/hook regression additions.

## Verification by evidence class

| Class | Result | Evidence and limits |
|---|---|---|
| Repository contract | PASS | `npm run agent:workflow:check`, run first after inspecting its definition/registry. Application build, schema promotion and repository-wide release commands were not run. |
| Source/static | PASS — scoped TypeScript exit 0, no diagnostics; 3,354 source/configuration hashes | [final-source-manifest.json](final-source-manifest.json), [typecheck.log](typecheck.log), [execution receipt](verification-execution.json). No security certification follows from type checking. |
| Mocked actions/hooks | 48 passed | [clone-action-hook-results.json](clone-action-hook-results.json): routing, missing identity, recovery-only no-fallback, disabled rollout recovery, actor-scoped identity, denial, malformed/transport outcomes, retained retry and cache behavior. These do not prove database locks. |
| Real PostgreSQL authoring | 5 passed | [authoring-results.json](authoring-results.json), [authoring-reconciliation.json](authoring-reconciliation.json): legacy duplicate reproduction; concurrent same-key convergence; changed-payload rejection; frozen clone source; writes-disabled replay; stored permission/session and foreign-location denial; final-audit rollback and recovery. One test prepares browser fixtures. |
| Real PostgreSQL worker | 2 passed | [worker-results.json](worker-results.json), [worker-reconciliation.json](worker-reconciliation.json): one winner under competing leases, expired lease recovery, stale/foreign completion denial, duplicate completion denial, retry scheduling, sanitized errors and dead letter. This verifies local inbox ownership, not provider delivery or exactly-once external effects. |
| Real PostgreSQL AP/returns | 2 passed | [ap-results.json](ap-results.json), [ap-reconciliation.json](ap-reconciliation.json): complete supported synthetic chain and invariants below. |
| Authenticated rendered Next journeys | PASS, bounded | [authenticated-browser-results.json](authenticated-browser-results.json): real Better Auth login, real Next actions and PostgreSQL; EN desktop and FR mobile; lost creation response, injected post-commit cache exception, status/reload recovery, focus restoration, live role/session revocation. Only the isolated cache wrapper and response transport were fault-instrumented. |
| Authenticated rendered clone recovery | PASS | [clone-browser-results.json](clone-browser-results.json): real legacy clone action, lost reply, EN-to-FR navigation, actor-scoped retained identity and exactly one additional order. [English unknown result](clone-unknown-en.png), [French recovered order](clone-recovered-fr.png). |
| Upgrade | PASS | [upgrade-results.json](upgrade-results.json): a populated synthetic database at 92 migrations, immediately before durable authoring, upgraded to all 120. Seven selected business tables preserved their prior fields exactly; the new authoring table starts empty. This is not every production data shape. |
| Backup/restore | PASS — 246 data tables | [restore-results.json](restore-results.json): fresh retained local restore of the populated audit database; every public data table compared by row count and sorted row digest; source stability checked before/after dump. Migration history is separately covered by upgrade and the prior 120-migration receipts. |
| External MTN MoMo sandbox | BLOCKED | User confirms no local sandbox configuration. No test contacted MTN, moved funds, or proved its actual callback/authentication contract. The generic mobile-money HMAC adapter and local inbox tests are not MTN conformance evidence. |

## Cross-workflow reconciliation

The AP fixture uses explicit synthetic zero-tax XAF posting rules and three independent actors: requester, approver and execution recorder. An approved supplier destination is fixture setup, not a test of the destination-change approval workflow. Country configuration uses the repository's existing CM resolver; this is not statutory acceptance.

| Scenario | Durable expected/observed outcome |
|---|---|
| Receive two units at 100 | Stock quantity 2, stock value 200; inventory debit 200 / GRNI credit 200. |
| Prepare and independently approve matching invoice | One retained invoice decision; GRNI clears to zero and AP liability becomes 200. Exact preparation replay keeps the same invoice. |
| Request, approve and record cash execution | One supplier payment and one outbound payment transaction; AP clears to zero, cash ledger decreases 200, stock remains 2 / 200. Requester cannot approve their own request. Exact release replay retains the same transaction; changed execution reference under the same request is rejected. |
| Provider reconciliation state | Remains `PENDING`, truthfully distinct from recording the synthetic execution. No provider confirmation was manufactured. |
| Return one uninvoiced received unit | Quantity 1 / value 100, stock GL 100, original history retained; exact replay produces no second return; changed quantity under the original identity is rejected. |
| Reverse that return | Quantity 2 / value 200 and stock GL 200 restored through a retained reversal, not history deletion. Every inspected journal balances. |

The return fixture initially lacked its required posting rule. The first attempt correctly retained an accounting blocker while stock moved; it did not prove GL reconciliation. The fixture was then given the explicit GRNI/stock rule required by current source, and the entire AP/return suite passed. No application control was weakened to make the fixture pass.

## Invariants and acceptance disposition

| Invariant | Evidence | Disposition |
|---|---|---|
| One purchase result per retained request | Real concurrent DB assertions, immutable intent/result IDs, actual browser lost-reply recovery | PASS inside rollout cohort |
| Changed payload never silently reuses an operation identity | Authoring, AP execution and purchase-return rejection checks | PASS for tested owners |
| Current authority and tenant scope survive stale client state | Stored DB checks plus actual role/session revocation journeys | PASS for tested purchasing paths; not every POS/location reassignment race |
| Cache failure cannot erase a committed outcome | Actual authenticated action, injected cache throw, recovered receipt and one event | PASS |
| Worker ownership fences stale actors after takeover | Real competing leases and completion checks | PASS for local reconciliation inbox |
| Quantity/value and ledger conservation | AP/return snapshots, balanced journals, retained reversal | PASS for synthetic positive-stock, zero-tax scenarios |
| Rollback leaves recovery evidence readable | New writes disabled; original result replay retained; immutable intent and draft preserved | PASS for tested owner; retention policy still open |
| Upgrade/restore preserves selected historic records and current durable data | Populated upgrade hashes and full restore row digests | PASS within stated rehearsal scope |

## Compatibility, rollback and remaining gates

1. **Rollout remains opt-in.** With neither flag enabled and no retained durable intent, legacy creation remains available and its duplicate risk remains outside this fix's certified cohort. Enabling authoring is a separate controlled rollout decision. With UI enabled and writes disabled, the durable UI can expose recovery while refusing new work. Preserve the retained-intent routing during rollback; do not revert to a version that treats old identities as new legacy requests. Keep routing flags consistent across serving instances and drain in-flight creation before disabling both flags; mixed-version/mixed-flag rolling transitions were not certified.
2. **Durable validation applies in the enabled cohort.** Legacy ISO date inputs are translated to calendar days. An old clone whose expected delivery precedes its new order date, duplicate item lines, or unsupported numeric precision must be reviewed under the existing authoring contract; the adapter does not silently adjust dates, merge lines or round input. Broader compatibility approval remains open with the operating policy.
3. **Do not delete retained drafts, intents or receipts.** No automated expiry, cleanup, administrator ownership or retention duration was approved or implemented. The requested retention/resumption/escalation policy remains open; tests do not settle it.
4. **MTN MoMo remains blocked.** Closure needs an identified sandbox account/product, local sandbox configuration supplied through the normal secret mechanism, a safe callback/test endpoint and reproducible sandbox scenarios for timeout/unknown result, duplicate callback, worker restart and reconciliation. Local generic adapter success cannot replace those checks.
5. **Negative stock is explicitly excluded.** Existing behavior was preserved. No negative-stock valuation certification is claimed.
6. **Remaining broader verification:** supplier credit-note allocation/reversal after settled invoices, closed-period correction variants, every action-to-commit permission/location reassignment schedule, and provider-specific reconciliation remain outside these new passing cases. Prior program gaps are not automatically closed by these narrower tests.
7. **UI limits:** these are scoped real authenticated journeys, not a full accessibility audit. The previously observed wizard progress can still show step completion independently of an already recovered receipt; review its presentation separately. No new overall UI conformance or axe certification is claimed for this closure pass.

All new database names are retained in their result files. The unsuccessful first upgrade rehearsal is also retained for inspection; its mismatch came from the runner converting PostgreSQL timestamps through the host timezone. The corrected runner transports server JSON and the fresh repeat passed. No application migration was changed. Source URLs, auth passwords, session cookies and database dumps stay in ignored local scratch storage, not this public evidence package.

## Reproduction procedures

These task-owned scripts were reviewed for effects before execution; they are not added package commands. Run from the repository root only after checking their fixed disposable-target guards. `run.cjs seed` refuses to replace an existing authenticated fixture. Authoring fixture generation writes new synthetic rows; upgrade/restore create a new uniquely named database and refuse overwrite. None targets the application database.

```text
npm run agent:workflow:check
node what-next/pos-purchasing-inventory-audit-2026-10-26/closure/run.cjs authoring
node what-next/pos-purchasing-inventory-audit-2026-10-26/closure/run.cjs worker
node what-next/pos-purchasing-inventory-audit-2026-10-26/closure/prepare-ap-fixture.cjs
node what-next/pos-purchasing-inventory-audit-2026-10-26/closure/run.cjs ap
node node_modules/jest/bin/jest.js --config jest.workflow-closure-ui.config.cjs --runInBand
node node_modules/typescript/bin/tsc -p tsconfig.workflow-closure.json --pretty false
node what-next/pos-purchasing-inventory-audit-2026-10-26/closure/upgrade-restore.cjs upgrade
node what-next/pos-purchasing-inventory-audit-2026-10-26/closure/upgrade-restore.cjs restore
```

For the browser runs, `setup-app.cjs` records provenance and copies an environment-free application; `start-app.cjs` injects only loopback/disposable/synthetic settings; `prepare-browser-app.cjs` syncs owned changes and instruments the cache only in that copy. `authenticated-browser.cjs` consumes the prepared drafts and `clone-browser.cjs` tests the legacy caller. Browser artifacts carry their actual tested source hashes in [browser-source-provenance.json](browser-source-provenance.json). The final allowlisted module-stop error normalization was validated by the final action tests after the browser copy; successful/recovery behavior was unchanged. Do not blindly repeat setup over preserved baseline evidence.
