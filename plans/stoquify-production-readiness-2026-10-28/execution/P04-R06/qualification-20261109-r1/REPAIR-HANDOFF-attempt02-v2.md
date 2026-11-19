# P04-R06 continuation: rejected-origin credential bookkeeping

This is a bounded repair handoff, not an implemented fix or an advancement verdict. The 10 November 2026 qualification preserves the accepted isolated artifact and every failed observation. Parent P04, P04-V02 and production remain blocked.

## Observed defect

Two actual cross-site browser sign-in requests were rejected, but each changed the supplied synthetic account's `failedLoginAttempts`, `lastFailedLogin` and `updatedAt`, and appended a `LOGIN_FAILED` security event. No session was created. This is an account-bookkeeping defect on rejection; it is not evidence that the browser signed in or obtained a private session.

The current `lib/auth.ts` credential after-hook treats every non-successful result as a failed password attempt. It does not distinguish an origin/transport rejection from a password verification failure. Source inspection places origin rejection before admitted credential verification, indicating password-independent account impact. The actual browser probes supplied valid synthetic credentials; they do not independently prove the same impact with an unknown or incorrect password. The observed requests increased the counter; crossing the lock threshold was not exercised in this qualification and must not be represented as tested.

The original cookie-free API-client request is separate: it supplied valid credentials without browser Fetch Metadata. Its success does not demonstrate an authentication bypass. Preserve that original failed test expectation and the independent protocol classification; do not replace it with a claimed denial.

Independent comparison in [ORIGIN-DENIAL-INDEPENDENT-REVIEW-attempt03.json](independent-review/ORIGIN-DENIAL-INDEPENDENT-REVIEW-attempt03.json) found the same credential hook and outcome helper in the captured before-repair source. This defect predates the R06 current-session repair. Its newly observed no-write failure still prevents qualification; pre-existing behavior is not an acceptance waiver.

## Exact first action

Refresh and hash the credential before/after hooks, credential outcome helper, auth route adapter, trusted-origin configuration and installed SDK origin/Fetch Metadata call chain. Bind the two rejected browser requests to their original response captures, exact native before/after snapshots and independent review. Establish where origin admission occurs relative to every account update and credential audit write before selecting the smallest repair.

## Bounded implementation package

1. Make credential bookkeeping depend on the actual admitted credential outcome. Origin/transport rejection must not increment failures, lock or unlock the account, alter login timestamps, create a session or emit a misleading password-failure event.
2. Inspect the existing expired-temporary-lock reset in the before-hook for the same ordering problem. Repair only demonstrated paths needed to preserve the rejected-request invariant; record any newly exercised defect separately.
3. Preserve valid anonymous sign-in/recovery, supported nonbrowser clients, wrong-password failure counting, inactive/locked-account rejection and the R06 fresh-session protection. Do not patch installed dependencies or broaden this into an auth-provider redesign.

## Required verification

- Source review and bounded mocked regressions distinguish origin/metadata rejection, actual wrong password, successful sign-in, inactive/locked accounts and expired temporary locks.
- Use fresh isolated synthetic sessions/accounts. Real cross-site form and CORS requests must be denied with no private authority bytes/cookies and no unauthorized account/session/business writes. Persist request headers, original response bytes and exact database deltas.
- Genuine wrong-password requests still update only permitted own-account failure bookkeeping; successful credential requests retain permitted login/session/audit effects. Timestamp checks must use explicit UTC interpretation with actual request bounds.
- Exercise repeated rejected requests around the failure threshold and the expired-lock case to prove that origin rejection cannot cause lock or unlock transitions. This is future verification, not a result already obtained.
- Refresh the candidate and rebuild after any product change. Requalify affected R06 protected-session denials and authorized positives, and all required EN/FR browser cases against the new sealed artifact. Do not reuse the present artifact as proof of changed code.
- Obtain independent source, execution and outcome review before changing the R06 gate. Preserve original main-run, supplement and recovery results and record all retries as successors.

## Recovery and boundaries

Revert only the explicitly owned repair if necessary and retain the production admission block. Stop owned local runtimes/databases after qualification, retain synthetic evidence, and leave unrelated changes intact. No commit, push, production flag/data changes, production migration or deployment.

This packet does not authorize R05, R07 or R08 implementation. Their existing register status, dependencies and deferred commitments remain unchanged. A broader business-origin policy is not silently invented to explain the observed bookkeeping defect.
