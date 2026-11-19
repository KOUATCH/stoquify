# AF10 — Failure and verification matrix

**20 October 2026.** Canonical evidence: [PostgreSQL results](2026-10-20-run-01/postgres-results.json), [focused tests](2026-10-20-run-01/unit-results.json), [browser verification](2026-10-20-run-01/browser-verification.json), [reconciliation](2026-10-20-run-01/reconciliation-manifest.json).

## Real PostgreSQL behavior

| Scenario | Expected invariant | Observed result |
|---|---|---|
| Valid multi-domain source | One GL owner; actual details equal controls | PASS: one journal/batch, stock 25.00, AR 100.00, AP 50.00, debit/credit 150.00 |
| Two simultaneous exact applies | No duplicate effects | PASS: one new result and one replay; four retained operations |
| Exact approval retry | Same retained approval | PASS |
| Different apply key after activation | Conflict rather than another cutover | PASS |
| Failure before ledger | No financial effects or activation | PASS; approval retained, exact retry succeeds |
| Failure after ledger | Journal/batch/source link/invalidation roll back | PASS; exact retry succeeds |
| Failure before AR | Earlier journal effects roll back | PASS |
| Failure after AR | Receivable, lifecycle, customer ledger/balance and earlier effects roll back | PASS |
| Failure before AP | Earlier journal/AR effects roll back | PASS |
| Failure after AP | Payable, supplier ledger/balance and earlier effects roll back | PASS |
| Failure before stock | Earlier domains roll back | PASS |
| Failure after stock | Stock level/movement, event/outbox and earlier domains roll back | PASS |
| Failure at final activation audit | Activation, reconciliation, receipts and all financial effects roll back | PASS |
| Actual stock value altered after writer success | Successful row counts cannot cause activation | PASS: reconciliation rejects the mismatch and transaction rolls back |
| New AF09 source revision after approval | Old approval cannot apply | PASS |
| Changed selected account meaning | Old source/master digest cannot apply | PASS |
| Closed and reopened period | Old period control version cannot apply | PASS |
| Nonzero client balance introduced after approval | Empty-client precondition is rechecked | PASS |
| Firm reviewer attempts apply | Review mandate is not financial authority | PASS |
| Client operator selects another tenant | Tenant boundary remains authoritative | PASS |
| Missing current stock-approval permission | Historical context permissions do not authorize | PASS |
| Password assurance older than five minutes | No financial apply | PASS |
| Current module removal | No financial apply | PASS |
| Source creator attempts financial approval | Independent maker/checker is enforced | PASS |
| Unapplied approval cancellation and replay | Retain reason; release reservation; no financial effects | PASS |
| Constructed past approval fixture | Expiry compared to current DB time | PASS; cancel/reapprove permits valid apply |
| Competing different approvals | One active scope reservation | PASS: exactly one approval admitted |
| Role revocation holds the role row while apply waits | Read committed authority must see the committed revocation | PASS; observed lock wait and subsequent denial |
| Period close holds the catalog while apply waits | Apply must not use a pre-wait open-period assumption | PASS; observed lock wait and subsequent denial |
| Operation/active receipt update or deletion | Retained financial evidence cannot be rewritten | PASS |
| Customer collection on opening receivable | Existing collection service must work without a sales order | PASS: 40.00 collected, exact replay has no duplicate effect |
| Independent reversal of that collection | Existing reversal restores historical paid/outstanding amounts | PASS: paid 20.00, outstanding 100.00; zero fabricated sales |
| AP existing balance reader | Historical paid amount reduces open obligation | PASS: 80.00 less 30.00 gives 50.00 |
| Maximum source fixture | Bounded transaction handles all detail | PASS: 100 source rows, 93 receivables, 96 operations, 4,487 ms apply |

The matrix groups assertions within 19 test scenarios; it is not a claim of a separate test for every row. Failure injection is implemented only by scoped synthetic database audit triggers, removed in `finally` blocks. Production services have no test fault-injection switch. A synthetic period-control receipt sets up period-race fixtures; it is not a certified real close.

## Browser and rendered evidence

The browser uses real Better Auth credentials and protected server actions against the isolated synthetic cluster.

| Journey | Evidence |
|---|---|
| Preparer uploads source/independent controls and maps real client masters | A new source revision is retained through the actual UI |
| Different named firm reviewer completes preview review | Real password step-up, explicit retry and exact digest binding |
| Client operator separately approves | Approval persists without financial effects; review access alone does not expose financial buttons |
| Explicit financial confirmation | Apply stays disabled until confirmed; keyboard space activates the checkbox |
| Post-stock failure | All financial effects roll back; UI retains the exact command and offers recovery/retry |
| Response lost after server commit | Recovery shows `ACTIVE`; exact retry creates no duplicate journal, stock or AR/AP entries |
| EN/FR, 1440/390 widths | Retained-result screenshots, no panel overflow, four scoped axe scans |
| Approval/apply forms | Additional scoped axe checks; final dashboard control styling visually inspected |
| Current module denial | Financial detail is cleared from the panel |

The initial successful browser journey revealed a control-style issue during subsequent visual inspection. Its artifacts are retained in `browser-before-control-style-fix/`; final artifacts in the run root supersede it. Automated accessibility scans and keyboard confirmation are not screen-reader or whole-application certification.

## Other verification boundaries

The focused unit lane passes 413 tests in 13 suites: 372 pure/mocked service checks and 41 component/jsdom checks. It covers current shared authority, posting, stock, customer ledger/settlement/reversal, AF09 source/preview, portfolio and opening UI behavior. Focused TypeScript passes independently.

The clean synthetic target applies all 104 migrations. The populated upgrade preserves nine operational table counts and old-column row digests across 103→104 and a no-op migration replay. It includes 24 journals/120 lines, but does not establish populated-stock upgrade coverage.

No production mutation, full build, full-repository test sweep, real supplier bank/payment release, live provider notification, statutory approval, screen-reader evaluation or AF16 release qualification was executed. Source-owned correction procedures and deployment boundaries are documented in the [runbook](CUTOVER_RECOVERY_RUNBOOK.md).
