# Close control contract — phases 0 and 1

Phase 7 update (2026-10-17): [period close control](PERIOD_CLOSE_CONTROL.md) requires current independent certification before sealing, retains immutable transition receipts, rejects stale period versions and protects closed-period journal writes. Authorized reopening records its reason and requires fresh assessment/certification before reclosure.

Phase 6 update (2026-10-16): [balance-sheet account reconciliations](BALANCE_SHEET_RECONCILIATION.md) add independently reviewed supporting schedules, per-account/currency opening and gross movement comparisons, explicit zero-activity evidence, source revalidation and a dedicated close checklist. Existing specialized bank and domain controls remain required.

Phase 5 update (2026-10-16): [bank balance reconciliation](BANK_BALANCE_RECONCILIATION.md) adds exact opening/closing and statement roll-forward checks, independently approved retained evidence, source revalidation and explicit close blockers for bank accounts. See the supported mapping/statement scope and rollout limits in that contract.

Phase 4 update (2026-10-16): [unpaid AP balance classification](CLOSE_PAYABLE_BALANCE_CLASSIFICATION.md) replaces the generic open-invoice blocker with evidenced normal balances and explicit AP exceptions. Existing payment, payroll and bank reconciliation controls remain active.

Phase 3 update (2026-10-16): [publication race safety and source revision invalidation](CLOSE_PUBLICATION_RACE_SAFETY.md) implement the publication barrier and financial-source mutation guard. See its execution evidence and rollout limits; the historical baseline below remains for traceability.

Phase 2 update (2026-10-16): [per-account reconciliation coverage and explicit no-activity evidence](ACCOUNT_RECONCILIATION_COVERAGE.md) now implement the corresponding gaps below. The historical Phase 1 baseline is retained for traceability. Scope version remains 1. Full effective-dated account applicability remains conservative rather than inferred from current status.

Version: 1. Implemented against the existing working tree on 2026-10-16, baseline commit `fe540161f9fa53c149cc662759567cacc1dbd136`. Existing edits were retained. This contract defines scope and evidence collection; it does not certify statutory compliance or complete the later roadmap phases.

## Scope and dates

Every new close assessment binds organization, accounting period, the stored start/end instants, observation cutoff (`recordedThrough`), UTC boundary convention, currency policy and contract version in a SHA-256 scope hash. The period is resolved using both tenant and period ID before financial queries. Explicit dates must equal the stored period endpoints; contradictory or invalid dates fail before collection.

Existing stored endpoints are inclusive. No local-midnight conversion or extra day is added. Evidence arriving at the cutoff is eligible; evidence arriving one millisecond later is not. An economic date determines which period an item supports. A recording/import/signature date determines whether it was available to the assessment. A September statement imported in October before the cutoff supports September, not October.

This is a current-state collection with a recording cutoff, **not historical database reconstruction**. Mutable status/metadata rows do not provide full temporal history. Live period preflight remains a current safety gate, and existing broad source-change invalidation and assessment ordering remain in force. Later race/invalidation work must close remaining concurrency gaps before stronger snapshot claims are made.

## Collector rules

| Collector | Economic membership | Recording boundary / context |
|---|---|---|
| Ledger activity and traceability | Tenant + accounting period; portal additionally uses its stored entry-date endpoints | Journal creation/posting and batch/link creation through cutoff; balances remain separate by currency |
| Statement evidence | Line occurrence inside period; imported/processed parent statement overlaps period | Both line creation and parent import/creation through cutoff |
| Provider events | Occurrence inside period | Creation through cutoff; undated events cannot be positive period evidence |
| Reconciliation runs | Explicit period assignment OR business date inside period | Creation through cutoff; signed evidence additionally requires signature through cutoff. Assigned date-inconsistent runs remain visible |
| Outstanding suspense/exceptions | Related period run, payment/statement/provider obligation through period end, or unassigned obligation | Older outstanding obligations carry forward. Unassigned obligations remain explicit conservative organization controls |
| Payroll runs/payslips/payment batches | Payroll period overlap or explicit accounting period assignment | Creation through cutoff; child queries use tenant-scoped parent membership |
| Payroll declarations/evidence | Declaration period overlap | Creation through cutoff; evidence follows its parent declaration |
| Supplier invoices/payments | Invoice/payment economic date through period end | Creation through cutoff; older open obligations remain included. Unpaid-balance classification is unchanged |
| Fiscal documents | Posting batch's tenant and accounting period | Creation through cutoff |
| Business-event failures | Occurrence inside period | Recorded/created through cutoff |
| Inventory | Existing class-3 opening/movement/closing logic | Receives the same recordedThrough as close |
| Accounting setup, offline safety, audit context | Organization-wide | Explicitly identified as organization controls/context; absence of a trustworthy period link is not proof of irrelevance |

The operational payment dashboard and its organization-wide summary retain their existing behavior. Close uses a separate read-only collector with no notification delivery. Close evidence is collected from complete scoped queries, not the dashboard's 12/25-row display pages. The new payment collector retains each amount's currency; ledger reconciliation retains its existing currency groups. This slice does not redesign the portal's existing monetary aggregates.

The portal resolves an explicitly requested period before constructing its queries. Unfiltered operational portal requests remain organization-wide. Its detailed ledger export uses the same resolved period/cutoff as the certificate.

## Evidence and obligation policy

- Missing evidence is unknown or blocked, never inferred no activity. Successful empty collection receipts prove that collection succeeded, not that an account had no obligations.
- No-activity proof needs an identified account, period, source and independent review. A zero aggregate alone is insufficient.
- Deactivation/archive today cannot erase a historical obligation. Phase 1 conservatively includes accounts created by period end without using current ACTIVE status to suppress their evidence. Full dated activation/deactivation applicability, cadence and settlement-lag policy are phase 2 work.
- Statement freshness is evaluated against the requested period, using evidence visible through the cutoff. One account's statement/signature does not prove another account's coverage; account-by-account coverage remains an explicit phase 2 gap.
- A later record may affect an earlier economic period or later cumulative balances. Phase 1 does not narrow the existing all-period payment invalidation locks.
- New CloseRun metadata retains the scope version/hash and dates. The existing close-pack payload includes that metadata under its content hash. Historical runs lacking the new scope remain historical; no backfill, signature rewrite or upgraded certification claim is implied.

## Mutation/dependency inventory

| Source mutation | Existing boundary to preserve | Scope consequence |
|---|---|---|
| Journal posting/reversal | Journal posting order, period catalog and close invalidation helpers | Assigned period and potentially later cumulative periods |
| Statement import, provider events, matching, signoff, suspense resolution | Reconciliation close catalog/period locks and retry protocol | Economic period plus outstanding carry-forward obligations |
| Supplier payment review/reconciliation | Source-owned reconciliation receipt and close invalidation | Original payment obligation; receipt cutoff is separate |
| Inventory events/adjustments/counts | Existing valuation kernel and recordedThrough proof | Opening + movement + closing balances |
| Payroll lifecycle/payment/declaration transitions | Existing payroll evidence and close invalidation | Payroll/declaration period and related accounting effects |
| Accounting-period changes | Existing period/catalog protocol | Scope must be re-resolved; changed endpoints cannot reuse a scope hash |

## Regression register

| ID | Required proof | Lane |
|---|---|---|
| S01 | Tenant period resolved before financial queries; foreign period denied | Unit + PostgreSQL |
| S02 | Conflicting explicit dates and forged/changed scope rejected | Unit |
| S03 | Exact stored endpoints included; one millisecond outside excluded | PostgreSQL |
| S04 | September evidence imported in October before cutoff included; post-cutoff excluded | Unit + PostgreSQL |
| S05 | October run does not alter September close; operational summary still sees it | PostgreSQL |
| S06 | More than 12 runs counted and retained; currencies remain separate | Unit + PostgreSQL |
| S07 | Signature after cutoff cannot count as signed proof | Unit |
| S08 | Unassigned controls explicitly retained; query error propagates | Unit + PostgreSQL |
| S09 | Scope persists in close metadata and hashed export; existing receipts still verify | Unit |
| S10 | Payroll/AP selectors use economic membership and recording cutoff | Unit |

## Reviewed execution lanes

Unit command: `node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand`. The config uses the installed SWC transform directly, bounded test roots and an inert server-only shim. It loads neither Next config nor dotenv nor the application Jest setup. Persistence is mocked by the named suites. This is not database or browser evidence.

PostgreSQL command: `node scripts/run-close-scope-postgres.cjs`, with explicit `CLOSE_TEST_DATABASE_URL`. The target must be localhost, schema `public`, and database name `stoquify_local_close_scope_YYYYMMDD_<8 hex>`. The runner refuses an existing database, creates the target through the local administration database, overrides all Prisma connection variables, deploys existing migrations, verifies `current_database()`, then runs synthetic fixtures. It performs no application query, seed, reset or automatic deletion. Do not reuse an application target or interpret a skipped/unrun DB suite as success.

The runner leaves its uniquely named test database for inspection. Cleanup must target that exact verified name. Tests do not create statutory certification or browser evidence. These direct lanes were reviewed for this task; they do not change the package command registry or authorize generic migration/build wrappers.

## Deferred acceptance gates

Phase 2: complete per-account coverage and explicit no-activity proof. Phase 3: race-safe publication, mutation coverage and snapshot/freshness assurance. Phase 4: distinguish normal unpaid balances from exceptions. Later phases: bank balance reconciliation, broader balance-sheet reconciliations, approval/lock/correction workflows and rollout evidence. Passing the scope suite does not close those gaps.
