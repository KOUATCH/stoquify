# Independent HR-18 review — 25 October 2026

Reviewer: `/root/hr09_independent_review`, read-only independent agent. Final disposition: **PASS_SCOPED** by source inspection; no independent runtime execution.

Closed findings:

1. Existing summary caps and differing filters could not prove complete 200-person counts. The new derived projection uses one repeatable-read transaction; detail filters produce counts. Each bounded source exposes partial coverage.
2. Time and approval links stranded records after the first 100. Exact source selection now reuses protected/native review owners and existing controlled-review components.
3. Approved-leave cancellation requests and open attendance anomalies were missing. Both are included with scope and explicit responsibility; anomaly details are excluded.
4. Dual-role own hidden originals leaked expiry existence. Document projection now preserves the native own visibility rule and rejects ambiguous identity mappings.
5. Old pending correction cases and expired originals could fall outside newest-200 destination histories. Exact case/document selection now survives list loading.
6. Correction selection was lost on client refresh/stale recovery. The page passes `selectedCaseId`; every QUEUE refresh preserves it and query navigation changes the component key.

An earlier final-review attempt stopped at an account usage limit; resumed review completed. No approval was inferred from that interrupted attempt.

Scope limits: current work queue and source routing. Period-specific handoff readiness remains HR-19. External delivery, provider qualification, real user acceptance and release certification are not covered.
