# P04-V02 refreshed scope and guard register

Current-source inspection captured 9 November 2026. **This source inventory is not a passing verdict. Completed runtime evidence and remaining defects are reconciled in [coverage outcome](COVERAGE-OUTCOME.md).** [Machine register](scope-and-guard-register.json), [94-file source manifest](source-manifest.json), [browser consumer discovery](browser-consumers.json). Source identity: 2a3cd525dc8cfdad21550b4f77ca2af5d68ca7b8585b8888db6fd086a7256823.

## Admitted qualification scope

Current Better Auth 1.6.14 under /api/auth, application profile/permissions boundaries, selected inventory/private-media browser consumers, UploadThing 7.7.4 ingress and callbacks, and Next implicit HTTP methods. No configured auth plugins were found; credential sign-in is enabled, Google is conditional on configured values. This target must use owned synthetic accounts and actual signed sessions, no auth mocks or preseeded cookies.

Server-owned actor/tenant, current role permissions and inventory module changes are tested with tenant A/B fixtures. No production flags, credentials, migrations or provider calls are admitted. Pure session/account endpoints have no location scope; selected domain resources retain their own location checks. P04-V01 remains the complete surface authority qualification.

## Significant source distinctions

- lib/auth.ts enables a five-minute signed cookie cache. lib/security/rbac.ts and requireSession explicitly disable it and reload current authority. Raw auth getSession and several core endpoints accept cached sessions; **measure those directly** after revocation/expiry.
- /api/auth/update-user is intercepted by the app’s reviewed self-profile HTTP service. Other core operations retain the installed provider handlers. Do not assume every /api/auth request has the same app guard.
- Sensitive middleware for revoke/password operations disables cookie cache. list-sessions/list-accounts/link-social/update-session and account-token subject resolution accept it. unlink-account uses freshSessionMiddleware, which checks age but can still use the cache.
- Default GET /get-session can return cached user/session data; POST is declared but current config lacks deferSessionRefresh and should reject it. setPassword is an API-only endpoint without an HTTP path; verify-password is an HTTP POST candidate: its metadata.scope="server" is not the installed router’s metadata.SERVER_ONLY exclusion. The malformed-body probe returned 400 safely. Supplement03 independently verified authorized 200, wrong-password 400, anonymous 401, foreign-origin 403 and revoked/expired default/query-variant 401, with native effect evidence. There are 30 declared HTTP-candidate auth paths plus the separate pathless setPassword API.
- Next supplies an implicit HEAD handler via the GET export and OPTIONS204 with Allow. The HEAD Request retains method HEAD; the installed Better Auth/better-call router performs exact-method lookup without HEAD-to-GET fallback. Core auth HEAD is therefore expected404/empty with no auth headers; runtime authorized and revoked/expired controls must verify this unsupported-method boundary.
- AuthProvider is pass-through. Global QueryProvider has a 60-second stale time and disables default focus refetch. usePermissions has a separate no-store, focus-refresh query. Shell permissions come from server props. These are source facts, not proof that stale pages leak or recover.

## Auth endpoint inventory

Every path below is under /api/auth. Installed source line, methods and guard notes are in the machine register.

| ID | Method(s) | Path | Guard/current condition |
|---|---|---|---|
| V02-BA01 | GET | /list-accounts | Cache-accepting sessionMiddleware; current subject account metadata. |
| V02-BA02 | POST | /link-social | Cache-accepting sessionMiddleware; configured-provider and OAuth/link constraints; no hosted callback admission. |
| V02-BA03 | POST | /unlink-account | Cache-accepting freshSessionMiddleware plus account ownership and last-account safeguard; test revoked session with two synthetic accounts. |
| V02-BA04 | POST | /get-access-token | resolveUserId uses current request session subject over caller userId, but getSessionFromCtx accepts cache; provider branch may refresh and write account credentials. |
| V02-BA05 | POST | /refresh-token | Same subject resolution as get-access-token; provider refresh/account update is separate external effect. |
| V02-BA06 | GET | /account-info | resolveUserId then account/provider ownership; can refresh tokens/provider fetch; isolate and no live credentials. |
| V02-BA07 | GET, POST | /callback/:id | OAuth state/nonce/provider callback validation; POST normalizes into GET; token exchange cannot target live provider in qualification. |
| V02-BA08 | POST | /send-verification-email | App has no emailVerification.sendVerificationEmail callback; disabled here. |
| V02-BA09 | GET | /verify-email | Signed verification token/expiry and trusted callback; synthetic invalid token only unless fixture explicitly admitted. |
| V02-BA10 | GET | /error | Public provider error surface; supplied error text/redirect handling must not expose private state. |
| V02-BA11 | GET | /ok | Public liveness response; no tenant business state. |
| V02-BA12 | POST | /request-password-reset | Origin-safe redirect; configured app has no sendResetPassword callback, so disabled request flow; do not infer application actions have no separate reset flow. |
| V02-BA13 | GET | /reset-password/:token | Verification token and expiry plus trusted callback URL. |
| V02-BA14 | POST | /reset-password | Token/expiry/password bounds; consumes verification and updates credentials, revokeSessionsOnPasswordReset true. Only owned fixtures. |
| V02-BA15 | POST | /verify-password | HTTP password-string body; sensitiveSessionMiddleware. Descriptive scope metadata does not exclude this path from the installed router. Malformed-body400 observed; valid-input authorized and denial cases independently qualified in supplement03. |
| V02-BA16 | GET, POST | /get-session | Signed token and optional signed 300-second cookie cache; default may not query DB. POST declared but requires deferSessionRefresh, absent in app config. |
| V02-BA17 | GET | /list-sessions | Cache-accepting sessionMiddleware; lists active sessions for session subject. Treat sibling tokens returned as private. |
| V02-BA18 | POST | /revoke-session | sensitiveSessionMiddleware cache disabled; only same-subject target token revoked; unknown/other subject token yields nondisclosing success. |
| V02-BA19 | POST | /revoke-sessions | sensitiveSessionMiddleware cache disabled; deletes same subject sessions. |
| V02-BA20 | POST | /revoke-other-sessions | sensitiveSessionMiddleware cache disabled; preserves current token, deletes other active same-subject sessions. |
| V02-BA21 | POST | /sign-in/social | Google only when both configured values exist; isolate absent-provider/invalid state and origin negatives; hosted positive remains external. |
| V02-BA22 | POST | /sign-in/email | Credential sign-in, formCSRF/origin; app account lock/isActive hooks, verification required, custom password hash/verify; login/audit/session bookkeeping intended. |
| V02-BA23 | POST | /sign-out | Signed session token deletion and cookie clearing; classify intended session changes, no business writes. |
| V02-BA24 | POST | /sign-up/email | Credentials enabled but app user.create.before refuses unknown emails; creation gate/duplicate handling, input:false organizationId/isVerified fields. |
| V02-BA25 | POST | /update-session | Cache-accepting sessionMiddleware; only configured writable additional session fields; none configured in app. Forged assurance/user/expiry fields must not write. |
| V02-BA26 | POST | /update-user | App POST interceptor replaces core endpoint with updateSelfProfileHttp: trusted origin, JSON, requireSession, review-hash/requestId and safe errors. |
| V02-BA27 | POST | /change-password | sensitiveSessionMiddleware, password verification and bounds; optional own-session revocation. |
| V02-BA28 | POST | /delete-user | sensitiveSessionMiddleware; app user.deleteUser.enabled absent, disabled. |
| V02-BA29 | GET | /delete-user/callback | Deletion enabled flag absent; verification/session relation and trusted callback. |
| V02-BA30 | POST | /change-email | sensitiveSessionMiddleware; app user.changeEmail.enabled absent, disabled. |

## UploadThing boundaries

Public GET exposes route configuration. itemImageUpload write ingress checks current session/organization, inventory module and create/update permission, then deliberately refuses legacy ingress in favor of the managed image control. An authorized legacy-ingress denial is expected; an authorized private media read must still work.

Installed callback/error branches verify x-uploadthing-signature over raw text before parsing. They do not execute upload middleware. Current onUploadComplete returns an empty object. The signed callback body’s origin drives callback-result delivery, so protocol tests must use an owned loopback sink and no live key. Tampering with body/origin without re-signing must fail. A synthetically valid signature tests the protocol trust boundary; it does not certify hosted provider infrastructure or enforce a hostname allowlist.

## Required runtime families

- **V02-T01** (auth/session): Actual credential login creates signed cookie and independent session; wrong password, locked/inactive user and forbidden origin do not gain authority.
- **V02-T02** (core-auth-cache): Get-session default versus disableCookieCache after server-side revoke, DB expiry, account deactivation and fresh untouched independent login; inspect no private user/session fields.
- **V02-T03** (core-auth-cache): list-sessions and list-accounts deny revoked/expired cached subject; no sibling session token or account metadata; independent active user still works.
- **V02-T04** (core-auth-mutation): unlink-account on revoked/expired cached session with two owned accounts causes no deletion; active account positive control separately.
- **V02-T05** (custom-profile): update-user custom HTTP rejects revoked/expired session, forged ownership, unsupported authority fields and cross-origin; authorized reviewed profile read/write still works.
- **V02-T06** (implicit-session-write): update-session forged assurance/user/org/expiry fields rejected with no changed session privilege; no writable additional fields currently configured.
- **V02-T07** (session-management): revoke-session foreign token does not revoke other subject; revoke-others preserves caller, new independent login remains functional; no test credential logged.
- **V02-T08** (provider-auth): Core provider endpoints reject anonymous/forged user/account IDs and wrong origin; configured-provider branch and callback state/signature negative evidence labeled separately from hosted positive.
- **V02-T09** (implicit-methods): GET/HEAD/OPTIONS/method-denial matrix on auth and UploadThing; HEAD carries no body/private leak and must not bypass guard; OPTIONS public204 metadata only.
- **V02-T10** (private-HTTP): Guarded /api/me/permissions,/api/me/profile and both current private-media delivery URLs reject revoked/expired/other-tenant cases; no unauthorized writes; permissions from DB fresh.
- **V02-T11** (permission-module): Role permission removal/restoration and enforced inventory module disable/restoration take effect on next API/action/page request; legitimate independent actor works throughout.
- **V02-T12** (browser-recovery): Rendered private page then revoke externally: same tab stale action, focus/visibility return, back/forward and reload do not restore private records or controls from stale authorization. Record each journey separately, both locales.
- **V02-T13** (browser-recovery): Expiry browser journey and account switch/other-tenant browser contexts cannot reuse private data; authorized positive screenshot/bytes before and after recovery.
- **V02-T14** (uploadthing-ingress): UploadThing public GET/HEAD only router metadata; POST unauthorized/no permission/no module rejected before storage; authorized legacy ingress intentionally denied managed-upload-only.
- **V02-T15** (uploadthing-callback): UploadThing missing/invalid signature, tampered signed body/origin, unknown slug/method/action combos fail without callback side effects; approved synthetic signed callback can reach owned loopback callback sink only and no business writes.
- **V02-T16** (database-evidence): Security/session/audit before-after snapshots classify each intended effect; denied requests cannot modify item/profile/account/role/grant/outbox state or expose any private canary.

For each case preserve exact candidate/artifact identity, expected authority, sanitized response/canary observations, browser journey and business-state comparison. Session creation/refresh/deletion, lock counters and security audits are separate intended effects. Retain failures independently from passing controls.

## Browser and graph limits

The lexical discovery found 21 direct session/permission pattern files and 12 page/visibility recovery pattern files; matches can be comments and are not a complete runtime call graph. Selected EN/FR journeys must include a real allowed view, external revoke/expiry, stale action/focus return, back/forward and reload, plus independent-session positives. Read-only current source does not qualify rendering.

Historical graph evidence is dated 9 August 2026. Useful nodes: api_auth_all_route_ts (community188), api_uploadthing_core_ts and uploadthing_core_requireuploadauth (57), api_uploadthing_route_ts (190), api_me_permissions_route_ts (54), locale_dashboard_dashboard_layout_tsx (71), auth_authprovider_tsx (148). Current source supersedes graph line/behavior claims. Finance-export nodes were absent from the dated action graph.

Deferred: all remaining P04-V01 surfaces, P04-V03 public capability families, P04-V04 HR object/storage races, P04-V05 dependency/exposure review, hosted providers and production/operator acceptance. Parent P04 and production cannot advance from this inventory alone.

## Native BFCache qualification amendment

The planned browser recipes remove Playwright’s default `--disable-back-forward-cache` argument while retaining the isolated traffic restrictions. Auth successor v3 records passive native `pageshow`/`pagehide` events, `persisted`, navigation timing and cache-control evidence. Back/forward uses native history traversal; no response headers or cache eligibility are forced.

Only trusted native `pageshow` with `persisted: true` proves an observed BFCache restoration. A page that is ineligible or never restored from BFCache can still pass the observed fresh history-navigation checks, while cached-document restoration remains explicitly unexercised. Event-start private DOM and the historical response available to browser automation are observations; settled rendered recovery and separate actual requests determine denial outcomes. See `test-case-map.json` and `auth-successor-v3-receipt.json`. No runtime result is claimed here.
