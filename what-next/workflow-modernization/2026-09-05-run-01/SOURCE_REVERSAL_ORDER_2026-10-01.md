# Source-owned reversal ordering

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Full workflow modernization remains active. This dependency milestone migrates the four remaining legacy reversal callers without adding or closing workflows.

## Baseline and acceptance

2026-10-01; branch codex/migration-control-plane-release-2026-08-29; HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register predecessor SHA256 e6d02232b8fed1e652157c2109dde7f4c48ef2623bacfdb97a45f138ea132774. 270 workflows, 17 families, 191 unmapped entries; 264 Queued, two In progress, four historical Complete—verified; discovery incomplete. Unrelated changes preserved. Exact pre-edit files retained in evidence/source-reversal-before-* manifests.

Acceptance agreed before owner implementation:

1. Catalog lock precedes source/period locks. Resolve the full tenant-owned period set before any financial or source write, including document numbering. Preserve periods without assessments and additional explicit retained-batch periods.
2. Include linked reconciliation business dates, original source dates, journal dates and reversal dates. Physical stock reversal covers cumulative later periods even without an original journal; no invented journal identity for unposted/zero-value corrections.
3. Inventory-first invalidation receives the complete sorted scope. Purchase journal invalidation follows stock writes to avoid holding Close rows while waiting for inventory. Preserve actual source provenance and retained evidence.
4. Keep Serializable for suspense commands; retry stale snapshots only by restarting the whole transaction. Owned inventory/purchase reversals explicitly use Read Committed. Unsupported inherited transactions fail before effects. Preserve exact replay, original economic mirrors, source lineage and refusal rules.
5. Recheck existing trusted authority after waits where that context exists. Inventory remains an internal service with asserted distinct actor IDs, not an authenticated public approval workflow. Do not fabricate missing approval evidence.
6. Focused tests, typecheck, changed-file lint and guarded actual PostgreSQL compensation, rollback/retry, publication-order and source-scope cases. Preserve failed attempts and verify source bindings/outside-fixture stability. No fake certified states.
7. Update one concise progress checkpoint and targeted register evidence. No workflow closure until all original criteria hold. No schema migration, deployment, live activation, real payment, external message or X1 clearance.

## Verification

The combined source passed 631 tests in 22 suites (zero failed/skipped), full no-emit TypeScript and lint on all 22 changed source/test files. Seven inventory scenarios, two suspense journeys with rollback/authentication/catalog-retry subchecks, and four purchase scenarios passed on the exact owned PostgreSQL target. Every terminal receipt reports stable bound source and unchanged observed records outside its new fixture organizations. The previous journal milestone remains historical evidence for its bound source; current shared regressions do not recertify every previous runtime claim.

| Check | Terminal result and evidence |
|---|---|
| Focused Jest | 631/631, 22 suites; [receipt](evidence/source-reversal-jest-92a4c4da-0534-4668-9bd7-bc5dc0acf523.json) |
| TypeScript | Full existing no-emit compiler check passed; [receipt](evidence/source-reversal-typecheck-cb6a8cc2-bc0d-45e5-8eb9-8c32e67425d2.json) |
| Changed-file lint | 22 files passed; [receipt](evidence/source-reversal-lint-12439eb3-97b1-4a77-bc1b-98de1ada50f2.json) |
| Inventory PostgreSQL | Seven scenarios passed: exact compensation/replay/Cash recovery, both publication orders, early/late rollback and retry, inherited-isolation refusal, cumulative later/no-run periods; [receipt](lanes/environment/inventory-adjustment-reversal-runtime-c0e63cf1-03c1-4f1b-8dda-31a537fe0ab0.json) |
| Suspense PostgreSQL | Correction and resolution recovery passed: complete tenant scope, financial/source/evidence rollback, actual stale-auth wait denial, whole-transaction retry after concurrent catalog creation, exact mirrors/replay and older retained-export invalidation; [receipt](lanes/environment/journal-suspense-runtime-9e67dd35-c388-4186-9883-f0d42e1e8dec.json) |
| Purchase PostgreSQL | Four scenarios passed: posted credit/return, fractional zero-value, unposted failed-batch cancellation, actual source-write rollback/retry; [receipt](lanes/environment/purchase-reversal-order-runtime-b4e944ec-722b-4f31-a9bd-8f17a0d6adb5.json) |

The inspected coordinator wrapper is `lanes/environment/verify-source-reversal.cjs`; phases `jest`, `typecheck`, `lint` execute direct Jest/tsc/eslint, with exact commands and source hashes in receipts. Runtime commands use the correspondingly named `.cjs` files with `--run`; target identity/ownership checks are mandatory. No application build, browser run, schema change, migration or deployment was necessary for this service-only milestone. There are no new UI screenshots.

Inventory measured scenario durations ranged from 3.0 to 16.2 seconds; purchase cases ranged from 1.5 to 5.0 seconds on synthetic local fixtures. These include verification/setup operations, not user-route latency benchmarks or production budgets. No performance certification is claimed.

Both suspense reassessments honestly returned BLOCKED/T2: correction retained one high blocker; recovery retained one critical and one high blocker. Initial certified files were produced by actual services before unresolved suspense setup. Their bytes stayed unchanged when later invalidated. A passing verifier means the controls behaved as asserted, not that those adverse source conditions disappeared.

## Findings affecting the implementation

The shared period resolver now supports supplementary evidence dates and required retained-batch period IDs. An absent original journal is represented as null, never as a fabricated journal/period. Inventory correction supplies original movement/adjustment dates and cumulative scope. Its first inventory invalidation uses the exact prepared period set; it cannot expand that set with a late date query. Inventory-first evidence-family precedence remains intact.

Independent review found an additional concrete suspense dependency: `close-assurance.service.ts` calls `getPaymentReconciliationDashboardData(organizationId)` without a period filter. The dashboard reads organization-wide suspense and reconciliation summaries. Consequently even an earlier assessment can depend on a later suspense correction. These two writers require all existing tenant periods under the catalog lock, including periods with no current assessment. Supplementary business-date scope alone is insufficient. This conservative scope follows the current collector contract; it is not a refactor of the collector or proof of production lock capacity. See [independent review](evidence/INDEPENDENT_SUSPENSE_REVERSAL_ORDER_REVIEW_2026-10-01.md).

Purchase source preparation also must precede document numbering. Its journal invalidation must follow stock writes to avoid acquiring Close rows before inventory rows. The existing supplier-before-invoice order differs from payment processing and remains a separately identified lock-order boundary unless explicitly corrected and verified.

Approval review initially rejected the purchase production patch for an unverified design and likely contract/API mismatches. The action adapter was saved separately and restored to its predecessor until compatibility was demonstrated. A full virtual TypeScript check and 162 focused tests passed; the single narrower proof-bound application was then approved and applied to exactly ten source/test files (`evidence/source-reversal-before-purchase-39d08eb3-36be-4d4e-aca3-1c08191482b2/candidate-application-4682788d-085d-4b59-95eb-4d6da3d94bdb.json`). Review also initially rejected the all-period suspense addition for an unestablished shared API/scope; a narrowed retry with the actual helper and collector evidence was accepted, and its sandbox write failure was resolved through scoped filesystem execution. Neither rejection was bypassed.

The first focused Jest receipt records 535 passed and one failed: `it.each` interpreted an empty-array case as a callback-style test. The test data now uses named objects, preserving the empty-scope refusal assertion. The failed receipt is retained as `evidence/source-reversal-jest-d31d740e-9459-44e6-a712-0a3e18fde84c.json`.

The first purchase virtual typecheck found six test-fixture typing errors; their annotations were corrected without changing the production proposal. The first candidate Jest attempt stalled in whole-checkout discovery before suites ran. Only its owned child was terminated; limiting discovery to services/actions/lib let the same five selected suites complete. The first combined ordinary-sandbox attempt could not write its evidence log (`source-reversal-jest-2fb47c4b-6b60-4ae4-b0af-67b77543c3e6.log`, EPERM), so it is not accepted as a passing result. The scoped repeat passed 631 tests across 22 suites, with zero failed/skipped tests and stable sources.

## Review scope and tradeoffs

Architecture/backend/data review preserves the source-owned transaction and existing economic calculations. Complete period preparation precedes writes; invalidation uses that same scope. Suspense retains Serializable and retries only the explicit stale-snapshot signal by restarting the whole transaction. Inventory uses Read Committed; unsupported inherited isolation refuses before effects. The serializable fresh reader requires another available database connection; production pool capacity is not certified by this local work.

Security review preserves tenant predicates, existing source/refusal checks and distinct-actor controls. Suspense rechecks authentication age after waits. The proposed purchase action callback rechecks server-derived identity and permission after preparation. Direct inventory and purchase service calls retain their existing asserted-actor authority limitations. These are not authenticated browser approval proofs.

Finance/inventory/purchasing review requires exact original-line mirrors, stock/value conservation, supplier balance and outstanding-balance changes, immutable retained records and rollback. Audit/event review includes committed invalidation events/outbox records, retained certified files and transactional rollback; external outbox delivery remains open. Quality review retains failed attempts and source hashes. Product/operations review keeps Cash/Close active and does not inflate workflow counts for these corrections.

Frontend, localization, accessibility and responsive design are not applicable to this service-only patch; their original workflow closure requirements remain open. Statutory/country-pack rule changes, AI policy, SaaS prices and provider integration changes are not applicable because this milestone changes no such rules or external contracts. No professional or release certification is claimed.

Independent reviews: [inventory](evidence/inventory-reversal-independent-review-2026-10-01-settlement-runtime-recipe.md), [suspense](evidence/INDEPENDENT_SUSPENSE_REVERSAL_ORDER_REVIEW_2026-10-01.md), [purchase candidate and runtime](evidence/INDEPENDENT_PURCHASE_REVERSAL_CANDIDATE_REVIEW_2026-10-01.md). Purchase runtime uses a synthetic preapproved purchase order only as setup; actual receipt, invoice approval and correction services provide the transitions under test. It does not prove the purchase-order approval workflow, purchase publication races or retained purchase exports.

## Operating and recovery instructions

No schema change is required. This work prepares local code; rollout remains subject to the existing release process. Do not apply a whole-file rollback from this dirty checkout because predecessor files may contain unrelated work. Exact milestone predecessor bytes and candidate/application receipts identify the scoped changes for review.

On a stale-snapshot conflict, restart the entire owning transaction with the same command and revision. Do not resume a partially evaluated transaction or bypass a rejected review revision. Authentication-expiry failures require fresh authentication and a new server-authorized attempt. Transactional failures must preserve the last committed source state; use the retained command/idempotency reference to inspect whether an operation committed before retrying. Do not manually mark a failed batch as posted or recreate a reversal journal.

Previously exported files remain historical records. A reversal invalidates affected Close evidence without rewriting those bytes. Reassess current source records through the existing Close workflow; certify/export only if the real prerequisites permit it. Preserve adverse evidence and unresolved reconciliation blockers rather than forcing READY.

The isolated runtime drivers assert the exact existing owned loopback database identity and ownership before creating synthetic organizations. They do not authorize a production target, migrate/seed/reset an environment or exercise real customer funds. Their source-bound receipts must be checked before reusing their conclusions.

## Next bounded dependency

Read-only review identified ordinary manual `postJournalEntry()` (`services/accounting/posting.service.ts`) as the next producer: it writes the posting batch, POSTED journal and source link before its posted-journal invalidator, without the catalog/assessment-period boundary. That invalidator selects the explicit posting period and entry-date overlaps. Class 3 evidence in `inventory-reconciliation.service.ts` also includes later periods, so their retained readiness can become stale without immediate invalidation. Export revalidation can detect changed evidence later; this finding does not establish an unconditional certification bypass.

Keep the same primary/supporting workflows. Next acceptance should cover manual posting only: complete pre-write scope, both actual publication orderings, later-period and retained-export consequences, late transactional rollback, duplicate refusal, authority after waits and actual reassessment. The publication race is source-supported but still requires its own database reproduction. Do not expand this into every `createLedgerPostingBatch` caller before completing that bounded handoff.
