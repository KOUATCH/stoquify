# P04-V02 coverage outcome

The isolated qualification is complete and **P04-V02 remains blocked**. Across **196 logical groups**, independent evidence supports **171 within the selected local scope**, identifies **17 product-failure groups**, and leaves **8 native hidden-tab checks unexercised**. The product failures map to **P04-R06 (9), P04-R07 (6) and P04-R08 (2)**. No product repairs, commits, deployment or production changes were made.

There were **207 recorded executions**: the original 161 groups, 35 supplementary groups and 11 bounded replay/corroboration executions. Their raw results remain **164 passes and 43 failures**. The 11 followups do not create11 new acceptance requirements. Failed harness expectations and independently supported replays remain traceable; this is not an all-tests pass ratio.

## Scope and evidence identity

Qualification applies only to sealed candidate `p04-v02-full-6577e9e63dc7`, artifact `9f6fa8cf7b5a6d87476d2c1bac3833b479ab2745f4ae5d12f50322b0f59d06d0`. The whole current checkout and complete import closure remain unqualified: four concurrent accounting changes were preserved, and the original source-equality failure remains recorded. Initial admission matched 98 critical inputs; the supplemented exercised-source union matched 107. The immutable 94-file inventory identity remains unchanged.

Source inspection, actual HTTP results, rendered browser observations and native database effects are separate evidence classes. [The machine classification](findings-classification-final.json) contains every logical case, the 11 followup selectors,16 family outcomes, source scope, response hashes, native snapshot paths and limitations. [Original planned map](test-case-map.json), [supplementary scope](supplement03-scope-and-case-map.json) and [followup map](followup04-scope-and-case-map.json) preserve their distinct counts.

| Suite | Executed | Raw pass | Raw fail | Independently reviewed disposition |
|---|---:|---:|---:|---|
| Baseline |22|21|1|All22 scoped gates supported; one audit-count expectation was wrong.|
| Auth v4 |116|93|23|9 product failures,8 native-visibility prerequisites absent,4 historical-body capture errors and2 safe-status expectation mismatches.|
| Provider attempt02 |23|23|0|Synthetic local protocol only; hosted acceptance remains outside scope.|
| Supplement03 |35|19|16|6 client failures,2 module-read failures and 8 recovery harness races.|
| Followup04 |11|8|3|8 authorized recovery positives resolve the original harness races.3 failed-envelope observations corroborate the client finding; named-code assertions remain failed.|

The original 161 reconcile to 144 scoped supported groups, 9 product failures and 8 incomplete visibility checks. The supplementary 35 reconcile to 27 scoped supported groups and 8 product failures after the bounded positive replays. All raw original failures are preserved. The failed attempt01 auth publication has no auth tally and is retained separately; screenshots are not substituted for missing final results.

## Confirmed repair packages

**P04-R06 — current authority on core authentication endpoints.** Revoked and expired original signed sessions returned private representations from default get-session, list-sessions and list-accounts. The list included a token field for an independent live same-actor session. Both invalidated sessions also unlinked their synthetic secondary account; native snapshots confirm the exact accounts-table removals. An inactive user still obtained core session data. Valid signed-cache lifetime and exact browser cookie replay are proven for revoked/expired cases. Token reuse, takeover and cross-tenant escalation were not exercised. Fresh guarded application/profile controls and tested query-override negatives denied; a query-override bypass is not confirmed. [Independent auth review](../independent-review/AUTH-V4-OUTCOME-REVIEW.json).

**P04-R07 — failed inventory Refresh recovery.** Six EN/FR journeys retained previously rendered private inventory and announced success after an actual completed Refresh following revocation, expiry or removed permission. Those responses contained no new private item bytes. Three EN replays explicitly captured `success:false`, no successful envelope and no item bytes, while the settled page kept private data and reported success. The named-code allowlist matched none; no exact denial code is claimed. This is an observed failed authoritative read and client recovery defect, not newly returned private data or an instantaneous pushed-revocation requirement. All 8 authorized recovery Refresh positives passed on bounded replay. [Supplement review](../independent-review/SUPPLEMENT03-OUTCOME-REVIEW.json), [followup review](../independent-review/FOLLOWUP04-OUTCOME-REVIEW.json).

**P04-R08 — inventory module guard on getOrgItems.** Both EN/FR Refresh actions returned new private item bytes after the current inventory module grant was suspended. The actual 506-byte responses have distinct hashes; native transitions establish the suspended grant and subsequent restoration. The inspected read action requires current permission and tenant context but lacks inventory module admission before reading. The page guard cannot protect this direct server action. This finding is bounded to the observed read chain; no cross-tenant disclosure or write claim is made. [Independent source and result review](../independent-review/SUPPLEMENT03-OUTCOME-REVIEW.json).

## Family reconciliation

Group memberships overlap and must not be added. The machine register separates actual HTTP, rendered browser and native database evidence for each family.

| Family | Status | Direct logical groups | Evidence focus |
|---|---|---:|---|
| V02-T01 auth/session | failed current account lifecycle | 20 | Real credential positives, wrong-password, locked/inactive sign-in and foreign-origin controls passed. An already deactivated user still obtained core session data (supporting R06 finding). |
| V02-T02 core-auth-cache | failed current authority | 22 | Revoked/expired default get-session returned private data; fresh database-backed reads and valid verify-password default/query variants denied. Original signed cache lifetime and exact cookie replay proven. |
| V02-T03 core-auth-cache | failed current authority | 4 | Revoked/expired list-sessions and list-accounts returned private fields. A live independent same-actor session token field was returned; token reuse/takeover was not tested. |
| V02-T04 core-auth-mutation | failed unauthorized account mutation | 5 | Default unlink-account succeeded after revoked/expired authority; query-override variants denied401. |
| V02-T05 custom-profile | qualified executed local scope | 8 | Reviewed own-profile positive and invalidated-session/origin/forged-ownership/unsupported-authority negatives satisfied current strict contract. |
| V02-T06 implicit-session-write | qualified executed local scope | 1 | Forged implicit session authority fields rejected400. |
| V02-T07 session-management | qualified executed local scope | 3 | Foreign-token revocation preserved foreign sessions; revoke-other-sessions removed only intended siblings and caller remained functional. |
| V02-T08 provider-auth | qualified local negative scope external positive pending | 5 | Local anonymous/foreign-origin/invalid-callback controls passed. Safe link-social404 original mismatch retained; supplement completed missing unconfigured social sign-in rejection. |
| V02-T09 implicit-methods | qualified executed method scope | 24 | Protected auth HEAD404 is unsupported method dispatch, not GET guard execution; OPTIONS/unsupported methods checked. verify-password valid input/origin/default/query controls passed; pathless setPassword remains separate. |
| V02-T10 private-HTTP | failed selected server action module boundary | 60 | Both upload URLs and guarded profile/permissions reads deny invalid authority;270 original-private-alias probes safe. Selected getOrgItems Refresh returned new item bytes under a suspended module (R08). |
| V02-T11 permission-module | failed selected module read and client recovery | 42 | Fresh guarded routes and uploads enforce changed permission/module state; direct Refresh action omitted inventory module entitlement and returned private item bytes (R08). |
| V02-T12 browser-recovery | failed refresh recovery native visibility incomplete | 81 | Selected fresh next-read requests deny invalid authority; failed Refresh responses contain no new item bytes for revoked/expired/permission cases. Module action disclosure classified separately. |
| V02-T13 browser-recovery | failed expiry refresh native visibility incomplete | 21 | Expiry direct guarded reads deny; expired Refresh returns a failed envelope without new item bytes yet old view remains. |
| V02-T14 uploadthing-ingress | qualified local protocol external hosted pending | 7 | All local UploadThing ingress/method/configuration controls passed; public metadata only, unauthorized/permission/module/origin negatives, legacy upload intentionally refused. |
| V02-T15 uploadthing-callback | qualified local protocol external hosted pending | 13 | Synthetic signed callbacks/errors/signature/tamper/replay controls passed with two expected loopback callback messages. Signed origin is not an independent hostname allowlist. |
| V02-T16 database-evidence | failed unauthorized account mutation | 155 | HTTP status alone was never used as proof of no writes. Native snapshots accompany applicable probes. |

## Supported boundaries and retained limitations

Both private upload delivery URLs rejected invalid authority and preserved authorized synthetic reads. The baseline rendered EN/FR list/edit image consumers. Its 270 original-private-alias denial probes forwarded no original private bytes; original aliases have no authorized-positive claim, while the synthetic alias supplies compatibility positives. The detail view verified its title; a detail image is not implemented.

All 23 local provider protocol groups passed with native effects reconciled and exactly two expected loopback callback messages. Legacy upload intentionally refuses even an authorized request. Signed callback origin coverage is not an independent hostname allowlist. Hosted OAuth/storage/CDN, lifecycle and operator acceptance remain external.

The endpoint register correctly contains 30 HTTP-candidate auth paths plus the separate pathless setPassword API. Actual verify-password authorized, wrong-password, anonymous, foreign-origin, revoked/expired default and query-variant probes passed. Unsupported auth HEAD404 controls prove method rejection rather than execution of a GET authentication guard. Disabled or unexercised endpoint branches remain source-mapped, not blanket-qualified.

Eight headless browser checks could not create genuinely hidden tabs, so native return/focus recovery is unqualified and no focus defect is inferred. Zero trusted private BFCache restorations occurred. Ordinary back/forward/reload results therefore do not prove BFCache-hit recovery. Other private UI consumers remain outside the selected route scope.

The original baseline audit mismatch was independently resolved: six requests denied safely, but only four reach the module guard; two synthetic-alias requests fail tenant admission first. Four forward-history checks had settled login/no private items before optional historical response-body retrieval failed. Three followup probes captured failed envelopes but the canonical-name regex/allowlist did not capture the legacy generated error code; exact named-code qualification remains absent. These limitations and raw failures are preserved, not silently converted to clean suite passes.

## Cleanup and next eligible work

Final runtime evidence confirms all 5311 sealed runtime files unchanged, the artifact unchanged and only the permitted image-cache addition. The local server/proxy stopped, ports were released, cleanup errors were empty and owned auth sessions remaining were zero. Final native cleanup independently records zero sessions in all three full-app databases; the owned PostgreSQL cluster stopped and its port was released, with isolated databases retained. [Final source integrity](../final-integrity-frozen-supplement03.json) confirms the frozen candidate, artifact and 107 exercised critical inputs unchanged; [all-database cleanup](../database/all-session-cleanup-verified.json) and [cluster cleanup](../database/cleanup-r3.json) preserve the receipts. [Final runtime receipt](../runtime-result-attempt04.json) and [independent followup outcome](../independent-review/FOLLOWUP04-OUTCOME-REVIEW.json) preserve the exact facts.

The next eligible repair is **P04-R06**: refresh and hash its bounded current-authority call chains against current source before editing. P04-R08 can be separately scoped with explicit ownership; P04-R07 final acceptance depends on corrected R06/R08 boundaries. Each repair needs isolated denied/private-byte and unauthorized-write negatives, authorized positives and independent review. Parent P04 and production readiness remain blocked until those repairs and remaining admitted coverage gates are resolved. P04-R05 finance policy implementation remains a separate approved-policy package owned by the parent roadmap.
