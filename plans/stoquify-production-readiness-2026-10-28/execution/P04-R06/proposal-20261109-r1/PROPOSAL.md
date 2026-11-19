# P04-R06 — current authority for core authentication operations

Status: bounded repair proposal; **not implemented or authorized**. Derived from real P04-V02 execution and independent review.

## Confirmed trigger and behavior

A user signs in normally, receiving genuine signed session cookies. The isolated database then revokes that session while its signed cache remains valid. Default core get-session, list-sessions and list-accounts still return private actor/session/account information. A default unlink-account request succeeds and deletes one authentication account. Native comparison isolates the mutation to accounts, with unchanged sessions/audits. The reviewed revoked mutation had 247 seconds of signed-cache lifetime remaining.

Explicit disableCookieCache=true get-session requests and the reviewed application profile controls deny correctly. Query-override unlink/change-password probes also deny; this evidence does **not** support a caller-query bypass or session-takeover claim. It describes this application candidate/configuration and the exercised endpoints, not an upstream-wide vulnerability verdict. The independently reviewed final authentication suite reproduced the three reads and account deletion after database expiry, and observed cached core-session disclosure after account deactivation: nine confirmed current-authority failures in total. Each invalid-session mutation deleted one synthetic account; session and audit state stayed unchanged.

## Repair boundary

Refresh the auth catch-all, configuration, installed endpoint middleware and current application guard hashes. Define server-owned current authority for each protected core read/mutation and retain explicit public sign-in/recovery exceptions. Implement the smallest compatible repair after separate authorization. Preserve working tenant, module, profile and private-media guards and legitimate account management. Do not patch installed dependency files as an untracked fix.

Reproduce the denied read and mutation cases with real signed cookies against a fresh isolated candidate. Require zero private response fields and unchanged accounts/business/session state for denied operations, while independently authorized positive reads/writes work. Classify intended security bookkeeping. Include expiry, current-account eligibility, caller-query continuity and selected real-browser recovery tests; obtain independent review.

## Dependency and recovery

Prerequisites: P01, P02 and the locally verified P04-R01 contract. The P04-V02 findings supply evidence; R06 must not depend on completing V02 because V02 requalification depends on this repair. Add R06 as a prerequisite of parent P04 and remaining surface qualification P04-V01.

Preserve unrelated edits and prior failed evidence. Revoke all synthetic sessions and stop owned local processes after tests. Retain the production block if rollback restores the defective behavior. No commit, push, production flags/data changes or deployment.

**Exact first action:** refresh the listed source/middleware hashes and operation-to-current-authority matrix against the V02 result, then review one bounded repair diff and an isolated signed-session/native-state verification recipe.

## Evidence links

- [Independent core finding](../../P04-V02/qualification-20261109-r1/independent-review/CONFIRMED-CORE-AUTH-FINDING.json)
- [Final authentication review](../../P04-V02/qualification-20261109-r1/independent-review/AUTH-V4-OUTCOME-REVIEW.json)
- [Current source and guard inventory](../../P04-V02/qualification-20261109-r1/inventory/scope-and-guard-register.json)
- [Qualification result](../../P04-V02/qualification-20261109-r1/RESULT.md) — final publication follows complete runtime and review.
