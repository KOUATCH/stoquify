# Suspense posting and current Close evidence

2026-10-04. Cash Command remains primary, Close Pack supporting. This delivers a posting correction and scoped verification; neither workflow is complete. Baseline HEAD `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`. The shared working tree already contains extensive changes (298 tracked status entries observed during this turn); unrelated changes were preserved. Previous turn was progress: it published the ingestion correction and evidence.

## Evidence and changes

The actual Close collector maps the tenant-wide suspense queue into `SUSPENSE_ITEM` evidence, including its status in `sourceLabel` (`close-assurance.service.ts`). Historical graph node `payments_reconciliation_actions_ts`, community 14, locates the action boundary; current `approveSuspensePostingAction` and service source establish the behavior. No graph-derived claim substitutes for source verification.

An actual previous-period Close assessment collected before suspense posting persisted **15 obsolete evidence rows**, including `RESOLUTION_PROPOSED`, after a real balanced posting completed. [Baseline](lanes/environment/suspense-posting-close-baseline-84cf7aff-753e-43ed-bd03-d9f88f2284c9.json). This demonstrates outdated operational evidence, not a falsely certified pack: the fixture has other readiness blockers.

`approveSuspensePosting` now coordinates catalog → posting-period row → complete assessment set → suspense source row for new posting. It keeps Serializable isolation and uses the existing bounded whole-transaction retry for proven Close membership changes. The locked source and reviewed revision remain authoritative. A missing/newly incompatible posting period cannot silently proceed. The existing period, maker/checker, source lineage and ledger controls remain effective.

Successful posting invalidates the full tenant assessment scope consumed by Close. It advances supplied authentication time through waits and retries; a final authentication check after the ledger writer throws on expiry so already prepared financial effects roll back. No financial formula, chart rule, schema, pack serialization, price or statutory requirement changed.

The first implementation unnecessarily coordinated assessments for retained replay too. A real concurrent correction held the source row while replay held an assessment lock: PostgreSQL reported **40P01**. [Deadlock baseline](lanes/environment/suspense-correction-lock-baseline-48715793-4a60-4478-8aae-54a609ae9bec.json). Retained `POSTED_TO_SUSPENSE` replay now skips assessment locks because it has no new Close effect, while retaining source locking and receipt/ledger validation. [Acceptance](lanes/environment/suspense-correction-lock-acceptance-2f05d450-c425-4841-aac6-a3a27760c99f.json) observes real source blocking, zero replay assessment locks, one successful correction and an expected **40001 → CONFLICT** for the superseded replay. Exactly the original posting and its reversal remain. This does not certify every correction/recovery lock combination.

## Verification

[Final PostgreSQL acceptance](lanes/environment/suspense-posting-close-acceptance-041770c6-ec33-4a56-a9ae-c9baebefd8c4.json): seven scenarios pass, with stable loaded-source bindings and unchanged outside-fixture fingerprints:

1. Earlier-period in-flight collection is stale and publishes zero obsolete rows; actual posting balances.
2. A stale Serializable snapshot restarts as a second whole transaction and includes the new assessment.
3. Creator-first order shows actual PostgreSQL blocking and suppresses obsolete publication.
4. Producer-first order shows actual blocking and publishes the current `POSTED_TO_SUSPENSE` label.
5. Simultaneous commands produce one journal; the loser gets a reviewable conflict. Exact replay after an explicitly synthetic closed-period precondition changes no retained rows.
6. Injected late failure observes new financial posting, receipt, notification outbox and Close stale state inside the transaction. All observed rows roll back; a fresh retry succeeds.
7. Same-maker, missing-permission, expired-authentication, stale-revision and foreign-object commands produce no financial effects.

Together with the correction/replay acceptance, **eight database scenarios** have current scoped proof. These are loopback synthetic tenants in the already authorized database, not live payments or professional approval evidence.

[Final Jest](evidence/suspense-posting-close-jest-f9c8824d-9e4b-4cb6-9f2e-a521c0375d9e.json): **169 tests, nine suites, zero failed/skipped**. This includes supplied-clock expiry after assessment and ledger waits, independent approval, period restrictions, typed invalidation and shared ordering. [Full TypeScript](evidence/suspense-posting-close-typecheck-f140bb97-1cca-4415-9d0a-9681fbab4d93.json) and [two-file lint](evidence/suspense-posting-close-lint-f1b1768d-dff0-4199-97c6-109765865b6f.json) passed against final source. `git diff --check` passed for both changed source/test files. No build, browser or aggregate policy/release certification is claimed.

Failures retained: [first Jest](evidence/suspense-posting-close-jest-a6b0eb2d-3268-471b-8ed1-23274b28c40e.json) had one incorrect expectation for the existing AND/OR query shape; the assertion was corrected without weakening production filtering. [First database attempt](lanes/environment/suspense-posting-close-acceptance-2bee8261-6838-44bd-a7bf-6bb1511d71cf.json) passed six cases and stopped one fixture at the 80-character invoice-number rule; the synthetic identifier was shortened. Earlier successful intermediate runs are historical where the final replay-lock edit changed their source binding. The separately published ingestion acceptance does not bind the changed posting file and remains relevant.

## Operating and recovery guidance

Use the existing `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` route for suspense review; Close remains under `/{locale}/dashboard/accounting/close`. Routes are source-verified; this service-only change adds no new browser or accessibility claim.

An independent authorized checker reviews the current proposal and authenticates recently before approving. On a conflict, refresh the source: it may already be posted, corrected or awaiting a new review. Exact retained replay returns its verified receipt without new financial effects, including after the original posting period closes. A corrected source must follow its current cycle; an old posting command cannot re-establish the old outcome. After stale Close evidence, run a new assessment and resolve its real blockers before certification. Do not relabel historical evidence as current.

No migration or backfill is required. Roll out only through the existing release controls after remaining workflow gates are satisfied. Monitor posting conflicts, authentication expiry, transaction duration, connection availability and assessment lock waits. Broad assessment coordination needs representative period/pool/capacity measurements; the local race receipts are functional evidence, not performance certification. Worker delivery remains a separate requirement; transactional outbox creation is verified here. If recovery is needed, retain posted journals, receipts and audit history and use source-owned correction; do not delete or repost merely to clear stale evidence.

## Remaining closure and review responsibilities

Next: correction/recovery versus other valid and stale commands, including resolution replay, period closure and assessment publication. Their remaining source-before-assessment ordering is a candidate for reproduction; this report proves only the specific posting-replay deadlock and its fix. Manual allocation, source-link repair and certificate drift/export scope remain queued for consumer-based review. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request.

Architecture/backend/data review covers ordering, fresh snapshots and durable outcome. Security/control review covers independent approval, fresh authentication, revision and tenant/object denials. Finance/audit review covers balanced one-time posting, genuine reversal, retained replay and atomic rollback. Quality/SRE review covers current source binding and real blocking, with capacity and delivery explicitly open. UI/localization, SaaS packaging, statutory country rules and AI behavior are not changed by this patch; their original workflow requirements remain open. No legal, accounting, security, accessibility or release certification is asserted.
