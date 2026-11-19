# P04-R07 — private inventory recovery after denied Refresh

**Unimplemented; separate implementation authorization required.**

Six EN/FR actual Refresh journeys after session revocation, database expiry or permission removal kept the previously loaded private item visible and produced a success notification. The captured responses contained no new private item bytes and the native business state stayed unchanged. Three EN follow-ups explicitly confirm failed envelopes after current authority loss, with no new private bytes, a success notification and retained private DOM. All eight corrected authorized recovery tests passed. Exact named denial-code mapping was not established by the allowlist and remains a repair-contract concern; no additional replay is claimed. Module-disabled fresh responses are a distinct R08 server defect.

Refresh the current ItemManagement.handleRefresh → useOrgItemsNew.refetch → getOrgItems response/cache contract before editing. After a failed authoritative read under current authority loss, clear or suppress private inventory state and inappropriate controls, show safe recovery, and avoid a success notification. Preserve approved safe error envelopes; inspect available structured denial signals before selecting a mechanism. Split broader shared error/cache changes rather than silently expanding this consumer repair.

Dependencies: P01, P02, P04-R03, P04-R06 and P04-R08. Backend current-authority/module denial must be stable before closing browser recovery. Actual EN/FR Refresh negatives and independent/restored authorized positives must pass with no private new bytes, no stale private display after completed denial and no unauthorized writes. History/reload, genuine native visibility and BFCache-hit evidence remain distinct. Do not claim instantaneous push revocation or force browser cache eligibility.

No commit, push, production flags/data changes or deployment. Rollback retains the readiness block and evidence. Exact first action: after R06/R08, refresh the source/cache/failure-contract map and review a bounded consumer repair with real-browser acceptance cases.
