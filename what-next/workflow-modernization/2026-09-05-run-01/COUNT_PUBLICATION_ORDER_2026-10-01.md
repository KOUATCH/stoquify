# Physical-count publication and Close assessment ordering

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. The previous goal turn was progress: persisted Close acceptance authority was implemented and verified. This correction continues the full 17-family modernization objective; neither parent workflow is complete.

## Baseline and intended correction

Evidence date 2026-10-01. Branch codex/migration-control-plane-release-2026-08-29; HEAD 62a56036a5ac9b37236a20c9b148052199069479. Shared checkout has 227 tracked modifications and additional untracked work; unrelated changes are preserved. Register baseline SHA256 18c17c20765035303a9b2de429cb32a74db3bf39b4b257db59db7b85f05c917e. Counts remain 270 workflows, 17 families, 191 unmapped entries, 264 queued, two in progress and four historical verified closures; discovery/source reconciliation is incomplete.

Exact pre-edit files and register/progress bytes: evidence/count-publication-before-95fa0a2e-ff74-4daa-9aa0-c36306088bdf.json. An initial ordinary-write attempt returned EPERM before creating its snapshot; the scoped retry succeeded. This was not an automatic approval-review rejection.

Baseline source confirmed that zero-variance physical-count posting changed source evidence and discovered qualifying Close run IDs once, then invalidated those IDs. A new assessment could be published after that discovery but before count commit, collect old committed source and retain READY after the count committed. The captured predecessor reproduced this gap. Existing inventory annex rechecks still guarded certification; this was not a demonstrated certified-export bypass. Graph communities 55 to 22 and assessment creation community 19 locate the relationship; current source controls this analysis.

The inspected close-invalidation-completion skill concerns adding other domain hooks and a drawer. Those additions are not needed for this existing producer's transaction-order defect. Existing source codes, stale metadata, events and retained export semantics remain the contract.

## Acceptance established before implementation

1. A zero-variance count resolves every affected existing tenant accounting period, including the explicit posting period and every period ending on or after the earlier of count date/event date. Include all statuses and periods with no Close run.
2. Deduplicate and sort the complete period set, then acquire the same transaction-scoped period locks used by assessment publication before any source write or run discovery. Hold through commit. Do not retrofit locks into unrelated financial producers.
3. Owned count transactions explicitly use Read Committed. Reject incompatible/missing inherited transaction isolation before mutation rather than trusting an old MVCC snapshot after waiting.
4. Preserve independent approval, tenant scope, actual POSTED then APPLIED then invalidation order, current run invalidation CAS, exact retry and failure rollback. No ledger/payment/value changes for a zero-variance count; retained exports remain immutable while their stale metadata remains truthful.
5. Prove the predecessor race with exact captured old count source in the guarded owned database. Prove current producer-first and creator-first ordering with distinct backend PIDs and actual blocking, actual domain-produced assessments, newer/later/no-run-period scope and unchanged operation financial/outside-fixture fingerprints. Delayed finalization must not restore an invalidated run to READY.
6. Run focused shared-order/inventory/Close tests, existing TypeScript and changed-file lint serially. Bind current source and preserve failures. No changed UI is proposed; reuse only applicable unchanged UI evidence, without claiming new screenshots or complete accessibility/release proof.

## Scope boundaries

Implementation is limited to zero-variance physical counts and the shared ordered-period helper. Nonzero count variance, valuation writes and multi-call journal reversal retain their existing financial behavior and separately tracked ordering risks. The period-set query covers existing periods; concurrent creation of new accounting periods is not predicate-range locked and remains open unless separately coordinated.

No schema/migration, default build, live activation, deployment, real payment, external message or X1 clearance is part of this correction. Other producers, source/authority lifecycle, future-period creation, interrupted delivery/recovery, authentic country/payroll evidence, full accessibility and production latency remain required work. No organizational input prevents this local engineering step.

The bounded correction is implemented and verified. Both parent workflows remain In progress with the limitations below.

## Implemented boundary and source review

The [shared ordering helper](../../../services/accounting/close-assessment-order.service.ts) now accepts a complete period-ID set, deduplicates it and acquires the existing tenant/period advisory locks sequentially in sorted order. It does not discover runs or change publication, certification or finalization behavior.

The opt-in [physical-count helper](../../../services/inventory/inventory-close-invalidation.service.ts) reads the actual transaction isolation and refuses anything other than Read Committed with a conflict before count mutations. It queries tenant-owned accounting periods using the explicit posting-period ID or an end date on/after the earlier count/event date. There is no run-existence or period-status filter. The posting period must be present, and every returned period is locked before returning.

[Count posting](../../../services/inventory/inventory-count.service.ts) invokes that helper only for zero-variance counts, after existing independent-approval, source-evidence and open-period checks but before creating the count event, updating the session, writing its audit or discovering Close runs. Its owned transaction now explicitly selects Read Committed. A caller supplying a transaction must retain compatible isolation and propagate failures so the enclosing transaction rolls back; it must not catch a failed posting operation and commit partial work. The existing posting-period row lock from `getOpenPeriodForDate` remains held through subsequent waits, preventing a concurrent period close from invalidating the OPEN decision.

After the period locks are held, the existing POSTED → APPLIED → Close invalidation sequence runs unchanged. Run discovery therefore sees a creator that committed before the producer acquired the boundary. A creator arriving afterward waits for count commit before publishing and collecting. The existing assessment finalization compare-and-set accepts only RUNNING, so a run already invalidated to BLOCKED cannot be restored to READY by an older collector result. Exact replay returns its original result before new discovery or invalidation effects.

Independent source review compared the three product files with the recorded pre-edit bytes. It found no concrete defect in transaction placement, isolation enforcement, posting-period validity or sorted acquisition. Actual concurrency, rollback and regression results are recorded below. The generic pack invalidator and unrelated producer lock orders are unchanged.

## User and support operating guide

Use the existing Loss Control route, `/en/dashboard/inventory/loss-control` or `/fr/dashboard/inventory/loss-control`, and the existing Close route, `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`. No new screen or approval form is introduced.

1. Complete and submit the physical count using the existing count sheet. An independently authorized approver posts it. A zero variance means stock quantities agree; the completed observation still changes Close evidence.
2. If count posting and assessment publication overlap, one operation may wait for the other. Wait for the application result. A delay is not confirmation that either operation succeeded.
3. If affected Close evidence becomes stale, the authorized Close operator runs a fresh assessment for the relevant existing period and reviews its remaining findings. A new assessment is not an automatic certification or a promise that every business control will pass.
4. Keep existing exports and their hashes as recorded history. Use the current assessment for the next review; do not relabel an old export as current or remove its stale metadata.
5. After an uncertain response, reload the count and current assessment before retrying. Preserve the original count identity and request key when using the established retry flow. Do not create another count merely to work around a timeout.

| Situation | Information needed | Where it comes from / next action |
|---|---|---|
| Count or assessment appears stalled | Organization, count-session reference, location, count date, posting/event date if separately supplied, and affected accounting period | The existing count and Close screens supply business references. Engineering can correlate the operation and inspect database waits; users do not need to supply database credentials or lock keys. |
| Zero-variance posting reports an unsupported transaction conflict | Calling integration/service and displayed correlation reference, if present | Engineering inspects the caller's transaction isolation and retries through the supported Read Committed boundary. Do not weaken the guard or ask the user to change business evidence. |
| Posting period is missing or closed | Intended date and tenant accounting period | The authorized accounting operator resolves the real period configuration/status through existing controls. Later closed periods are still included in stale-evidence scope; their inclusion does not reopen them for posting. |
| Source evidence becomes stale | Posted count, latest assessment and existing source-linked finding | The accountant reviews the actual completed count and runs a new assessment. No new commercial or statutory approval document is supplied by this engineering correction. |

## Rollout and recovery instructions

No schema migration, backfill or receipt conversion is required. Release the count service, inventory helper and shared ordering helper together after the source-bound verification is complete. Do not enable this by replacing only a caller while omitting its helper. Existing inherited-transaction callers must comply with the explicit isolation requirement.

Observe posting latency, transaction timeouts, conflicts and Close invalidation failures during the existing approved rollout process. Cumulative count evidence may cover many later periods, so the lock set can grow with retained accounting history. This is a deliberate correctness/lock-duration tradeoff; production contention has not been measured. Do not disable stale-evidence checks to reduce wait time.

If verification or rollout exposes a defect, pause the affected posting/assessment operation through the existing operational process, preserve the count, events, audits and exports, and repair or restore the compatible implementation. No new feature flag or automatic operational switch is claimed here. Rolling back to the predecessor reopens the known publication/discovery gap; a successful rollback alone does not establish safe concurrent operation. If an earlier uncoordinated count may have overlapped an assessment, have the authorized operator reassess affected periods rather than rewriting historical evidence.

An invalidation failure must abort the count transaction. Retry only after its cause is resolved and the current count state is checked. Outbox records remaining in the transaction are not evidence that external delivery completed; delivery/recovery remains a separate workflow requirement.

## Review responsibilities and bounded tradeoffs

| Review lens | Applied judgment and limits |
|---|---|
| Platform, backend/API and distributed systems | The participating producer joins the existing publication boundary. All period locks precede run discovery; creators and finalizers retain their current contracts. No universal producer-order correction is claimed. |
| Database, integrity and migration | Read Committed is explicit and inherited isolation is checked. Existing-period discovery includes periods without runs. Concurrent creation of new periods remains outside this resolved set; no predicate-range guarantee or migration is introduced. |
| Security, IAM, privacy and fraud | Existing tenant, evidence and independent-approver checks remain. Locks are tenant/period scoped. No permission, session, client mandate or private-evidence policy is broadened. This is not a security certification. |
| Finance, reconciliation and internal controls | Zero-variance completion supplies new evidence without a new adjustment, journal, payment or valuation movement. Current evidence becomes stale while retained exports remain historical records. Runtime operation financial fingerprints and outside-fixture fingerprints remained unchanged. |
| Audit, records and analytics | Existing source identity, invalidation events, audit trail and retained export hashes remain the provenance contract. No new aggregation or analytics metric is introduced. |
| Frontend, design system, accessibility, EN/FR and content | Not applicable to new UI implementation: no UI or translated copy changes. Existing routes and recovery controls are reused; earlier browser results do not establish new screenshots or complete accessibility for this correction. |
| Product, SaaS packaging and customer operations | The user benefit is consistent current Close/Cash evidence when count posting overlaps assessment creation. Existing modules, prices and commercial eligibility are unchanged. Support needs operation references, not new approval paperwork. |
| Quality and release assurance | Focused tests and actual PostgreSQL races must bind the final source. Retain a predecessor reproduction and failures; do not equate passing mocks with demonstrated database ordering. Both parent workflows stay In progress. |
| SRE, observability, resilience, performance and cost | Sorted locks prevent an inversion within participating period sets; waiting and failure propagation are explicit. Other producers and pre-held caller locks require their own analysis. Production contention, interruption and delivery guarantees remain unverified. |
| OHADA/SYSCOHADA, country packs and statutory advice | Not applicable to changing statutory rules: no accounting policy, legal approval or country-pack provenance is modified or certified. |
| Provider integration, offline/edge and AI/agent policy | Not applicable: no provider protocol, offline write path, autonomous decision or approval authority changes. Existing internal events remain within the reviewed transaction. |
| Growth, billing and customer-success automation | Not applicable: no subscription, purchase, marketing or automated outreach changes. |

## Verification results

All four verification commands completed successfully against the same frozen product source. Heavy checks ran serially. Each receipt records its UTC execution time and current source hashes; the checkpoint rechecks those hashes before updating the register. Exact static commands and logs are retained in the linked receipts.

| Check | Result and evidence |
|---|---|
| Focused Jest regressions | **298 passed, 8 suites, zero failed or pending.** Shared assessment ordering, physical count, inventory invalidation/adjustment, Close assessment/pack, readiness snapshot and inventory action tests. [Receipt](evidence/count-publication-jest-94336885-a287-4026-aee8-b182106018de.json). |
| Existing TypeScript check | **Passed** `tsc --noEmit --pretty false`, the existing typecheck command. [Receipt](evidence/count-publication-typecheck-589c4b48-4c08-4123-8b5a-d6f0d67460b7.json). |
| Changed-file ESLint | **Passed**, six changed files, empty diagnostic log. [Receipt](evidence/count-publication-lint-f785fb87-0141-4956-abc5-739f5e07e2e1.json). |
| Actual PostgreSQL scenarios | **Five passed**, stable source, unchanged outside-fixture and operation-financial fingerprints. [Receipt](lanes/environment/count-publication-runtime-53fe88b5-682a-45ad-a581-abebcc254eb7.json). |

The inspected static wrapper is `lanes/environment/verify-count-publication.cjs` with `jest`, `typecheck` and `lint` modes. The database command runs `lanes/environment/count-publication-runtime.cjs` with the bundled Node runtime. It verifies the exact owned loopback database `stoquify_local_registration_20260906_01`, connected identity and ownership before writes. It uses synthetic tenant data with real domain setup, balanced fixture journals, independently approved counts and actual assessment collectors. Fixture financial setup precedes the financial baseline. It does not fabricate approval, assessment status or ledger output, and external fetch is disabled.

| Database scenario | Observed outcome |
|---|---|
| Inherited Repeatable Read | Real transaction refused with CONFLICT before source writes; observed effects unchanged. Unit tests also cover Serializable and missing isolation. |
| Captured predecessor | Loaded only the saved old count module into a private verifier module. After old run discovery, a new assessment completed READY/T4 before count commit and remained READY with an outdated inventory hash and zero invalidation events. This reproduces the original defect, not current behavior. |
| Count first | Count acquired the complete existing-period lock set before its first source write. The first assessment for a later existing period waited: backend PID 3564 was blocked by 12336. After commit it collected the new count evidence and reached READY/T4. Existing current/later assessments were invalidated; an earlier excluded period was unchanged. |
| Assessment first | Count backend PID 29408 waited for creator PID 18868. After publication it discovered and invalidated the new RUNNING assessment. Delayed collectors left it BLOCKED with one invalidation event and no checklist publication. A fresh assessment then reached READY/T4 with current certification available. |
| Injected discovery failure and retry | A clearly identified verifier-only fault occurred after actual POSTED/APPLIED writes. The transaction rolled back all observed effects and retained exports. A separate connection retried successfully, produced one count event and one invalidation per target, and released the locks. Exact repeated submission added no effects. |

Current race cases retained draft/certified export contents and hashes while allowing truthful stale metadata. The rollback case retained export contents both after failure and successful retry. No operation changed journal, payment, adjustment or valuation fingerprints. All outside-fixture fingerprints remained unchanged. Saved exports are retained beside the runtime receipt and included in the checkpoint hashes.

All verification attempts passed on their first execution. The intentional injected fault is a passing rollback assertion, not a failed verifier. The earlier snapshot EPERM and successful scoped retry are preserved above. `git diff --check` passed for the six changed files; Git emitted only CRLF normalization warnings. No schema changed, and no migration, seed or application build was run for this correction.

No UI changed, so browser checks and new screenshots were not rerun. Previous Close acceptance browser evidence remains historical and does not prove this transaction fix. No production performance budget was evaluated; recorded event spans include deliberate race barriers and are not route-latency measurements. A separate simultaneous finalizer-versus-invalidator row-lock race was not rerun; the unchanged RUNNING compare-and-set and delayed-collector case bound the present claim.

## Remaining boundary and next action

Source-producer coverage, concurrent new-period creation, multi-call journal reversal ordering, nonzero variance, interruption/delivery, authentic country/payroll prerequisites, complete accessibility and production latency remain open. No workflow has been closed or renamed. This record does not establish deployment, live activation, real payment, external delivery or X1 clearance.

Read-only scoping found `createFiscalYearWithPeriods` in `services/accounting/periods.service.ts` as the current online period-membership writer, reached through the existing fresh-auth accounting setup action. No runtime period date-change, reassignment or deletion writer was found in the inspected service/action/API/library paths. Graph community 3 locates that writer; its source was verified. Seeds and fixture scripts also write periods and remain outside online concurrency claims.

The next bounded implementation must coordinate period-set discovery with this writer: acquire a shared tenant period-catalog lock before the count's posting-period row lock, and an exclusive catalog lock before fiscal-year/period creation, holding both through transaction commit. Verify both commit orders, current committed visibility, failed creation rollback and no-monthly-period behavior. Period overlap policy and any future date/deletion writer require their own contract; a catalog lock alone does not settle them. This is actionable engineering work, with no missing user input.
