# AF10 — Controlled opening apply, recovery and activation

**Date:** 20 October 2026. **Status:** VERIFIED within the bounded synthetic migration pilot described below. **Release qualification:** open; AF16 has not run. No production cutover, schema promotion, deployment, commit or real-client enrollment was performed by this task.

Canonical run: [2026-10-20-run-01](2026-10-20-run-01/). Read alongside the [recovery runbook](CUTOVER_RECOVERY_RUNBOOK.md), [failure matrix](FAILURE_MATRIX.md), [AF09 result](../AF09/RESULT.md) and unchanged [AF10 execution prompt](../../prompts/AF10-opening-apply.md).

## Outcome and acceptance

A separately authorized client operator can approve the latest independently reviewed AF09 source, apply its opening positions atomically, and recover the committed result after an uncertain response. Activation is recorded only after persisted stock, receivables, payables, journal lines and balances reconcile to that source. One opening journal owns the GL; domain adapters do not double-post it.

| Criterion | Result | Current evidence |
|---|---|---|
| AF10-AC1: immutable source-bound operations and exact retry | PASS | SQL retention/identity constraints; domain receipts; concurrent exact apply returns one new result and one replay; changed keys are rejected; browser lost-response retry preserves one journal and one set of domain effects |
| AF10-AC2: independent source review, permissions, source/period versions under concurrency | PASS | Independent AF09 review plus separate financial approval; source maker cannot approve/apply; current client roles, modules and exact session are locked/rechecked; real role-revocation and period-close waits deny stale admission |
| AF10-AC3: failure recovery without premature activation | PASS | Nine injected failures before/after ledger, AR, AP, stock and at final activation roll back every effect; approval remains recoverable; cancellation is limited to unapplied approvals; browser repeats the same command after rollback |
| AF10-AC4: actual financial detail ties to source | PASS | Persisted journal accounts, functional amounts, document original/settled/outstanding amounts, dates, customer/supplier balances, stock movements/levels and receipt hashes are checked before activation; injected stock-value corruption is rejected |
| AF10-AC5: real database and browser evidence | PASS for this pilot | 19 PostgreSQL scenarios; clean 104-migration install; populated 103→104 upgrade/replay; real protected-action preview→review→approval→apply→recover journey with synthetic users |

## Reuse and implementation

AF09's source schema, independent control totals, mappings, exact decimal preview, retained source hashes, master binding, review evidence and per-client cutover lock remain the source of truth. Its preview continues returning `canApply: false`: preview review alone never authorizes money movement. Current advisory blockers now name the additional financial approval, period, empty-client and controlled-apply requirements. Historical preview manifests remain untouched.

| Area | Implementation and reused boundary |
|---|---|
| Orchestration and reconciliation | [opening-cutover.service.ts](<E:/ohada saas/Focused projects/stoquify/services/onboarding/opening-cutover.service.ts>) — approve, apply, cancel and recovery reads; latest reviewed digest, period version and empty-client checks; actual persisted reconciliation |
| Live authority | [close-evidence-acceptance-authority.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-acceptance-authority.service.ts>) — extends the existing locked organization/module/user/role/membership/session authority with a client-local financial operation |
| Ledger | [opening-ledger.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/opening-ledger.service.ts>) — existing AN journal, active leaf-account checks, balanced journal invariant, posting batch/source link, ledger audit and close invalidation |
| Receivables | [opening-receivable.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/opening-receivable.service.ts>) — existing immutable receivable documents/lifecycle, customer-ledger writer and business events; explicit opening provenance instead of a fabricated sales order |
| Payables | [opening-payable.service.ts](<E:/ohada saas/Focused projects/stoquify/services/purchasing/opening-payable.service.ts>) — bounded AP-owned opening obligation in existing supplier-invoice/payment/aging entities, supplier ledger, optimistic balance claim and business event; historical tax/purchases are not reposted |
| Stock | [inventory-stock-event.service.ts](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-stock-event.service.ts:868>) — source-derived adapter verifies the owning posted opening batch, then uses the existing stock event, valuation, movement, outbox and invalidation writer without a second GL batch |
| Existing collection/reversal | [customer-settlement.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/customer-settlement.service.ts>) — allocation accepts exactly one sales order or opening receivable; existing collection/reversal accounting and lifecycle writers remain in use; legacy sales-order idempotency representation is preserved |
| UI and actions | [OpeningCutoverPanel.tsx](<E:/ohada saas/Focused projects/stoquify/components/onboarding/OpeningCutoverPanel.tsx>) and [protected actions](<E:/ohada saas/Focused projects/stoquify/actions/onboarding/opening-cutover.actions.ts>) — existing accounting page/shell, dashboard controls, EN/FR, explicit confirmation, password step-up, exact retry and retained recovery |
| Master onboarding | Existing readiness projection still does not infer financial completion from master imports. AR/AP/tie-out guidance now links to the independently authorized opening workspace instead of claiming opening imports are unsupported |
| Persistence | [schema](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1359>) and [migration](<E:/ohada saas/Focused projects/stoquify/prisma/migrations/20261020160000_controlled_opening_cutover/migration.sql>) — execution and operation receipts, explicit AR/AP origin columns, constrained opening-document allocation, additive tenant-bound relations and retention triggers |

The pre-existing `graphify-out/graph_actions.json` is dated 8 September 2026. Its customer-settlement action nodes in community 110 assisted discovery; current action/service callers, not the dated graph, establish the implementation above.

## Authority, atomicity and scope

Financial approval and apply require a user whose home organization is the client. A firm review mandate does not grant posting authority. The current role must include `accounting.close.read`, `accounting.close.accountant.review`, `accounting.journal.post`, `inventory.stock.adjust`, `inventory.adjust.approve`, `purchasing.ap.invoice.post` and `customers.update`. The existing accounting, Close, inventory, purchasing and sales modules must permit the operation. This pilot deliberately requires the full multi-domain permission set.

The source creator cannot financially approve or apply their own opening. Approval binds the source revision/digest, accounting-period ID/control version and operator, and expires after 30 minutes. Apply must be executed by that approving client operator with password assurance no older than five minutes. Another currently authorized client operator can cancel an unapplied approval. Authority and expiry are rechecked with database time after lock waits and before commit.

The retained transaction strategy is **one Read Committed transaction**, with a 30-second transaction timeout and 10-second maximum acquisition wait. Existing stock posting accepts the transaction client; the bounded AR/AP/ledger adapters use that same client. Authority locks precede cutover serialization, accounting-period catalog/order locks and master checks. The apply transaction contains the journal, domain effects, operation receipts, reconciliation, activation event/outbox and activation audit. A crash or exception before commit rolls them back together. There is no committed `PARTIAL` state and no compensating deletion.

The supported scope is the AF09 CM/XAF, Africa/Douala, 1 October 2026 pilot: 100 total source rows, 100,000 UTF-8 bytes per source/control file, 200 active master choices per category, and 100 staged revisions. Apply additionally requires an empty financial client, active tracked stock, positive outstanding items, one stock row per mapped item/location and the existing AN opening journal. Existing financial journals/batches, movements, AR/AP documents/ledger entries, nonzero customer/supplier balances or pending stock quantities block apply.

`ACTIVE` means the retained opening cutover reconciled at commit. It does not mean the organization was commercially activated, a Close run was certified, or current balances can never change. Later operations can change balances normally. Cash/equity are represented by the approved journal; no bank-provider statement, bank reconciliation, cash-drawer balance or tax filing is fabricated.

## Reconciliation evidence

The retained [manifest](2026-10-20-run-01/reconciliation-manifest.json) contains the execution and revision identities, source digest, period binding, actual journal ID, per-account debit/credit, document and stock detail, operation hashes and reconciliation hash.

| Synthetic source | Actual committed result |
|---|---|
| Stock: 2.500 kg × 10.00 | One opening movement and level; quantity 2.500, value 25.00 |
| AR: original 120.00, settled 20.00 | Opening receivable 120.00; initial paid 20.00; outstanding/customer ledger 100.00 |
| AP: original 80.00, settled 30.00 | Explicit opening obligation 80.00; historical paid 30.00; outstanding/supplier ledger 50.00 |
| Cash 25.00; equity 100.00 | Approved cash/equity lines in the same opening journal |
| GL controls | One posted journal and batch; debit 150.00, credit 150.00; four immutable domain operations |

The [downstream compatibility result](2026-10-20-run-01/downstream-compatibility.json) verifies an actual 40.00 customer collection and independent reversal using the existing services. The opening receivable returns to paid 20.00/outstanding 100.00, with no sales order created. The existing AP payment-balance reader returns 50.00 after retaining 30.00 historical paid. A full supplier bank approval/release journey was not rerun and is not claimed.

## Verification by evidence class

Commands and helper definitions were inspected against `docs/ecc/command-registry.json` before execution. Unclassified helpers were reviewed for explicit synthetic targets, writes, subprocesses and environment handling. No application build, configured application database, production schema promotion or external delivery ran.

| Class | Command / artifact | Result |
|---|---|---|
| Workflow contract | `npm run agent:workflow:check` | PASS; final exit 0; 196 scripts remain unclassified |
| Schema and isolated client | Prisma CLI `validate` / `generate --config .codex-tmp/af10-prisma/prisma.config.ts` | PASS, exit 0; Prisma 6.19.3; environment-free config and task-local client |
| Focused types | `node node_modules/typescript/bin/tsc --project tsconfig.opening-cutover.json --noEmit` | PASS, exit 0 |
| Pure/mocked services | Focused Jest config `jest.opening-cutover.config.cjs` | 372 passing tests, including posting, customer ledger/settlement/reversal, stock and current-authority regressions |
| Component/jsdom | Same focused Jest lane | 41 passing tests across portfolio, preview, cutover and opening-readiness components; total lane 13 suites / 413 tests |
| Clean migration | `node scripts/fixtures/opening-cutover-database.cjs` | Fresh synthetic database, all 104 migrations applied |
| Populated upgrade/replay | `node scripts/fixtures/opening-cutover-upgrade.cjs` | 103→104 and replay PASS; nine operational table counts and old-column row digests unchanged, including 24 journals / 120 lines |
| Real PostgreSQL | `node node_modules/jest/bin/jest.js --config jest.opening-cutover-postgres.config.cjs --runInBand` | 19 scenarios PASS; [JSON](2026-10-20-run-01/postgres-results.json) |
| Bounded workload | Same real DB lane, 100-source-row fixture | 93 receivables, 96 operations, one journal; 4,487 ms apply, below the normal 30,000 ms timeout; synthetic measurement, not production load qualification |
| Browser | `node scripts/verify-opening-cutover-browser.cjs` | PASS, exit 0; real Better Auth/protected actions, separate maker/reviewer/client operator, rollback and uncertain-commit recovery; six scoped axe scans without violations, no page errors or panel overflow; final [browser verification](2026-10-20-run-01/browser-verification.json) |
| Publication | Repository `docs-report-publisher` plus PDF content/render inspection | Matching Markdown/PDF artifacts; final archive checks in [publication verification](2026-10-20-run-01/publication-verification.json) |

The DB lane uses real financial services, locks and database session/role/module/mandate records. It redirects the database module to the guarded synthetic database and stubs only `server-only` and the HTTP authentication module's password-assurance constant. The browser lane independently exercises real authentication and protected actions. Mocked/component results are not counted as database proof.

The main target is `stoquify_local_af10_20261020_r1` at `127.0.0.1:55449`. The upgrade target is a new clone, `stoquify_local_af10_upgrade_20261020_r1`, of the retained synthetic AF09 upgrade database. Helpers verify the exact owned cluster directory and refuse existing creation targets. The upgrade's empty stock tables are not described as populated-stock migration proof. Random browser credentials stay in the task-private directory.

Initial verification exposed fixture errors: the period fixture omitted its fiscal-year relationship/period number; direct period-version editing correctly failed the existing transition guard; the collection fixture incorrectly specified both an account and mapping key. These fixtures were corrected. The isolated reversal test also required the auth-assurance constant stub to avoid loading the HTTP runtime. Final tests pass. Visual inspection caught a missing dashboard control class; this was corrected and the browser journey rerun with explicit form accessibility and keyboard confirmation. The driver was also corrected to wait for the confirmation checkbox to become enabled after refresh before pressing Space. Final approval and French mobile results were visually inspected. Earlier browser evidence is retained in `browser-before-control-style-fix/` and `browser-keyboard-wait-retry/`.

## Source state, rollout and limitations

Initial inspected HEAD was `6ee84a90c760d2864f6aef672d8b393ac2b65971`. During execution, an unrelated branding commit advanced HEAD to `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`; the compared AF10 source paths did not change between those commits. Results describe the tested working tree, including existing AF01–AF09 and unrelated uncommitted work, not a clean release commit. This task preserved that work and created no commit. Owned file hashes and command evidence identify the tested slice.

Deploy the additive migration and matching generated client before admitting financial cutovers. Keep the existing role/module gates. A release operator can stop new financial commands by restricting the designated client operator's posting prerequisites through existing role/module controls while retaining authorized read access. This task did not change any real grant or deploy anything.

Preserve execution, source, journal, document, event and operation history during application rollback. Do not revert to code that assumes every receivable/allocation has a sales order after opening receivables exist. Do not reverse a source-owned opening journal through the generic manual-journal endpoint. Applied-source corrections require the domain-owner procedure in the runbook; whole-cutover undo is not exposed.

Unqualified areas remain production cutovers and performance, arbitrary dates/countries/currencies, merging into existing financial activity, credit/zero-balance imports, larger migrations, automatic whole-cutover corrections, full supplier-payment release, full-application regression, live provider delivery, statutory expert approval and AF16 release certification. No new legal/tax rule or expert certification is asserted.

## Cross-discipline review and next work

Architecture/backend/database: one bounded transaction, domain-owned adapters, existing financial entities and immutable receipts. IAM/privacy: current locked authority, independent source maker, client-only financial actions, fresh auth, hidden-tab clearing and stale-response protection. Accounting/integration: one GL owner, retained original/settled amounts, actual-detail tie-out, event/outbox and close invalidation. UI/workflow/accessibility: EN/FR controls, keyboard confirmation, explicit recovery and retained historical status; automated scans do not establish screen-reader certification.

Product/process/operations: initialization of an empty client is explicit; unknown outcomes are investigated through the retained execution. No automatic retries with new identities. Retention and application rollback preserve financial history. Packaging/customer success: no new commercial package or billing entitlement; operator training follows the recovery runbook. Country rules and production accounting judgment require qualified review. AI, external provider adapters, offline apply and commercial activation are not applicable to this slice.

The user explicitly selected AF10 before AF16; this authorizes implementation sequencing, not release expansion. The smallest justified next program work is AF16 qualification with an explicit decision about whether the bounded AF09/AF10 migration pilot is in scope. AF11–AF15 were not started.
