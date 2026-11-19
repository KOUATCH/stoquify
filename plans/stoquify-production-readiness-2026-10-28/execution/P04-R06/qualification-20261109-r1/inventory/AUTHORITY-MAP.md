# P04-R06 authentication authority refresh

**Before-repair source refresh completed; runtime qualification has not run for R06.** The immutable 48-file snapshot has identity `ddeb0b5ad000a37525c3bf3392b5821d2b80a397a26d8826eb5895f6e65f2a36`. All 36 files comparable with the prior V02 inventory are byte-identical; 12 additional inputs cover the adapter, hook/router, schema, profile input and repository controls. The existing unrelated working-tree edits were preserved. [Source manifest](source-before-manifest.json), [machine authority map](authority-map.json), [verification requirements](test-case-map.json).

The repository workflow contract passed (196 other scripts remain outside its reviewed manifest). Installed versions are Better Auth 1.6.14 and Next 15.5.27. Graph node `api_auth_all_route_ts`, community 188, exists in the August 2026 app graph with no recorded route edges; it is discovery evidence only. Captured current source governs this assessment.

## Current authority and confirmed gap

The catch-all GET delegates directly to Better Auth. POST intercepts only update-user and retains the reviewed self-profile service. Current configuration enables a 300-second signed cookie cache; before/after account lifecycle checks run only for credential sign-in. SDK default session and fresh-session middleware can return signed cache before querying the persisted session. Session freshAge is not a revocation check.

Application RBAC already explicitly bypasses the cookie cache, loads the user by immutable session subject, checks active user/current lock/active organization/email verification and loads current roles. The stronger application session helper additionally matches persisted session ID/token/user/expiry and server-owned assurance. These application tenant rules must not become an accidental global policy for every own-account or public authentication endpoint.

The inherited V02 evidence confirms nine failing groups: revoked/expired core get-session, list-sessions, list-accounts and unlink, plus inactive core session read. Genuine surviving sibling sessions and exact unauthorized secondary-account deletion snapshots distinguish private response and mutation defects. Tested query-override bypass was not confirmed; preserve that distinction.

## Endpoint admission map

There are 30 HTTP candidates: 17 protected own-account operations, 1 nullable session identity operation, 1 cleanup operation and 11 public authentication/recovery/status operations. Pathless setPassword is separate. verify-password is an actual HTTP POST despite descriptive server-scope metadata; the installed router excludes only SERVER_ONLY. Declared paths do not mean all disabled/provider branches are locally qualified.

| Method | Path under /api/auth | Admission class | Existing middleware |
|---|---|---|---|
| GET | /list-accounts | protected own account | sessionMiddleware |
| POST | /link-social | protected own account | sessionMiddleware |
| POST | /unlink-account | protected own account | freshSessionMiddleware |
| POST | /get-access-token | protected own account | Handler-specific validation |
| POST | /refresh-token | protected own account | Handler-specific validation |
| GET | /account-info | protected own account | Handler-specific validation |
| GET/POST | /callback/:id | public authentication recovery or status | Handler-specific validation |
| POST | /send-verification-email | public authentication recovery or status | Handler-specific validation |
| GET | /verify-email | public authentication recovery or status | originCheck((ctx) => ctx.query.callbackURL) |
| GET | /error | public authentication recovery or status | Handler-specific validation |
| GET | /ok | public authentication recovery or status | Handler-specific validation |
| POST | /request-password-reset | public authentication recovery or status | originCheck((ctx) => ctx.body.redirectTo) |
| GET | /reset-password/:token | public authentication recovery or status | originCheck((ctx) => ctx.query.callbackURL) |
| POST | /reset-password | public authentication recovery or status | Handler-specific validation |
| POST | /verify-password | protected own account | sensitiveSessionMiddleware |
| GET/POST | /get-session | optional session identity | Handler-specific validation |
| GET | /list-sessions | protected own account | sessionMiddleware |
| POST | /revoke-session | protected own account | sensitiveSessionMiddleware |
| POST | /revoke-sessions | protected own account | sensitiveSessionMiddleware |
| POST | /revoke-other-sessions | protected own account | sensitiveSessionMiddleware |
| POST | /sign-in/social | public authentication recovery or status | Handler-specific validation |
| POST | /sign-in/email | public authentication recovery or status | formCsrfMiddleware |
| POST | /sign-out | public session cleanup | Handler-specific validation |
| POST | /sign-up/email | public authentication recovery or status | formCsrfMiddleware |
| POST | /update-session | protected own account | sessionMiddleware |
| POST | /update-user | protected own account | sessionMiddleware |
| POST | /change-password | protected own account | sensitiveSessionMiddleware |
| POST | /delete-user | protected own account | sensitiveSessionMiddleware |
| GET | /delete-user/callback | protected own account | originCheck((ctx) => ctx.query.callbackURL) |
| POST | /change-email | protected own account | sensitiveSessionMiddleware |

Use an explicit public endpoint-template allowlist and protect every other operation by default, including pathless setPassword. The installed hook context uses endpoint.path, so callback/:id and reset-password/:token are templates rather than request-specific values.

Protected own-account admission requires an authentic current unexpired persisted session and current active, unlocked subject. An indefinite lock or a lock with future lockedUntil denies; an expired lock alone does not. Preserve each endpoint's password, freshness, provider-account ownership and origin rules. Do not derive authority from supplied userId, organizationId, email or role labels. Nullable get-session must expose no private identity when authority is absent or invalid.

Public initiation, token recovery, callback and status operations retain their existing token/state/body/origin checks. Sign-out must remain available for cleanup after revocation, deactivation or lock. Do not require active tenant, role, module or email-verification state for every core own-account operation. Hosted provider and delivery success remains external; current user deletion and email-change branches remain disabled.

## Bounded repair recommendation

Use an application-owned Better Auth before hook for current authority, together with disabling cookie-cache authority. This shared boundary covers HTTP and auth.api callers. Obtain fresh persisted session state without trusting an existing context session or caller-supplied disableCookieCache=false; avoid recursively invoking the outer get-session hook. The installed exported getSessionFromCtx invokes the raw SDK get-session route, but it short-circuits context.session and merges caller query after config, so those details require explicit handling. Avoid session-lifetime refresh during admission.

Check current active/lock state by immutable session subject. Keep credential sign-in bookkeeping and custom update-user behavior. Do not patch installed dependencies, replace the authentication framework, or reuse full application RBAC indiscriminately. Cache-disable alone misses lifecycle defects; an HTTP-only catch-all repair misses direct auth.api entry points. [Options, tradeoffs and rollback](repair-options.json).

A current-state preflight does not itself prove transaction-level ordering against simultaneous revocation during a mutation. No such linearizability claim should be made without a separately admitted race test.

## Verification and evidence

The 58 recommended requirements are 51 real HTTP/database cases, 6 rendered EN/FR profile/session continuity cases and 1 direct auth.api/database boundary case. They are requirements, not a claimed runtime tally. The runtime owner may group requests while mapping every requirement explicitly.

The matrix covers active positives; exact target revocation with a surviving same-actor sibling; expiry; deactivation; indefinite/future lock; expired-lock positive; default core reads, unlink and valid password verification; caller cache-query variants; forged foreign account IDs; mixed genuinely issued token/cache subjects; origin/method/public recovery/sign-out controls; and current custom profile behavior. Inactive/locked profile and permissions HTTP routes are included as related continuity denials; optional orgless/unverified core controls guard against accidental full-RBAC overrestriction. Browser continuity uses actual sign-in, profile/session consumption, concrete reload after revocation and a fresh authorized recovery. It does not rerun unrelated media, provider or inventory Refresh packages.

If the repair stops issuing cache cookies, absence of a new cache is insufficient regression proof. Acquire genuine pre-repair signed cache against the new isolated target and the same local signing secret, replay unchanged against the repaired app before its original expiry, and capture sanitized lifetime/hash proof. Do not fabricate a signed session or infer a legacy-cache pass from source.

Each denied request must expose no private bytes or newly granted authentication authority and cause no unauthorized native changes. Preserve old audit/session rows except explicitly classified own expired-session cleanup. Authorized unlink/profile/login effects must match exact owned rows and expected bookkeeping. Record HTTP hashes/private-canary flags, screenshots of settled rendered states and native database deltas separately; never persist credentials, raw cookies or tokens. Use bounded cleanup, incremental sanitized evidence and independent recipe/result review.

No R06 runtime pass is claimed here. P04-R07/R08 findings remain separate. The next action is independent review of the bounded current-authority implementation proposal, followed by its exact source capture and isolated qualification. Parent P04 and production readiness remain blocked.
