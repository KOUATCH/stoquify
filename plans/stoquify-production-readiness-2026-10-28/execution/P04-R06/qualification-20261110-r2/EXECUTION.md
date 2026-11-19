# P04-R06 rejected-request bookkeeping and browser qualification

The 10 November 2026 continuation is authorized to implement the bounded repair and complete isolated qualification. E01–E29, the previous packet and all prior failed observations remain preserved. No commit, push, production flag/data change, production migration or deployment is authorized.

## Source and repair boundary

The refreshed before-manifest covers 66 inputs; the combined repaired manifest covers 68. Current behavior is derived from application and installed SDK source, with graph node `api_auth_all_route_ts` (community 188) used only for discovery. The two product files owned here are `lib/auth.ts` and `lib/security/credential-sign-in-outcome.ts`. Four regression files support the repair; unrelated changes and the earlier fresh-session guard remain intact.

The credential before-hook now invokes the installed public form-CSRF middleware before account lookup or lock audit. It does not reset expired locks. The after-hook accepts only the native session-token/user success payload or an APIError with status 401 and code `INVALID_EMAIL_OR_PASSWORD`. Other rejection/error outcomes do not write credential bookkeeping. A genuine wrong password after an expired temporary lock resets the old throttle and counts the new attempt as one; a genuine fifth failed attempt still locks the account.

Independent source review passed. The isolated mocked lane passed 116 tests across five suites, with no failures or skips. These results do not substitute for actual database or browser evidence.

## Dependency order and ownership

1. Root captures current source, implements the bounded repair and runs the isolated mocked lane. Independent reviewer admits the source and observes the actual unit outcome.
2. Runtime owner prepares an independently identified local environment and physically verified dependencies, captures the admitted source and builds a new sealed artifact with normal compiler/type/lint checks. Fresh capacity and target checks precede mutation/build.
3. Runtime owner qualifies protected-session denials and independent authorized operations against real synthetic sessions. Expanded native cases cover actual browser origins, wrong/unknown passwords, repeated requests near the lock threshold, expired/future locks, valid credential outcomes and retained expired rows. Exact native before/after effects and allowed security bookkeeping remain explicit.
4. Browser owner supplies an independently reviewed observer binding actual action/request/response identity to consumed profile data, explicit refresh and locale navigation. Runtime owner executes it against the same new artifact. Neither speculative cancellation nor a rendered screenshot alone proves a required read.
5. Independent reviewer assesses actual outcomes, source/artifact identity, secret handling and owned cleanup. Root publishes evidence and the work register only after that verdict, preserving all other packages and prior evidence.

Environment preparation, source review and browser-observer preparation may proceed in parallel. Source capture/build waits for source admission; actual qualification waits for artifact/fixture admission. No shared database or candidate is mutated by multiple owners.

## Acceptance and limits

- Rejected origins, invalid request outcomes and infrastructure errors must not be counted as bad passwords or change lock/login/session state. Genuine credential failure/success and supported native clients must continue working.
- Requalify the original 58 logical requirements through an explicit successor map. The old cookie-free valid-credential native-client denial expectation is preserved as a historical failed observation, not retained as an invented policy requirement. Actual browser/Fetch Metadata denials and native-client positives are qualified separately.
- Retained-expiry probes use distinct issued sessions whose expired rows are proven present immediately before each request. Post-cleanup replay is separately classified.
- Denied protected operations and revoked browser reloads expose no scoped private actor/account/session data and cause no unauthorized native changes. Positive required reads must bind the actual response to the current actor/tenant and consumed UI state; lifecycle events and original bytes remain retained even on cancellation.
- A closed-loopback database rehearsal, if run, proves connection-failure behavior and recovery. It must not be mislabeled as execution of an adapter-null or a particular after-hook error branch.
- Source inspection, mocked tests, native database effects, rendered checks and protocol observations remain separate. No clean-install, hosted-provider, operator or whole-production readiness claim is implied.

## Recovery

Stop only owned local processes, revoke/remove only synthetic test sessions and retain the isolated data and evidence. If the repair requires rollback, revert only this continuation's owned hunks against its source-before snapshot, preserving the earlier current-session protection and unrelated concurrent edits. Keep production admission blocked until the required gates pass. Any product change after artifact sealing requires a new candidate/build and affected requalification.
