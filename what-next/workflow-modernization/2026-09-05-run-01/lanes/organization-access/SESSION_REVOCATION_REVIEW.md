# Session revocation review — 2026-09-06

Automatic approval review rejected a proposed patch to `lib/auth.ts` that disabled the global session cookie cache and added session-creation hooks before and after every provider's session issuance. Stated reason: organization-wide authentication and availability impact beyond the specifically verified member-deactivation flow. The rejected patch was not applied or executed elsewhere.

A narrower alternative was accepted and verified: the existing password sign-in hook rejects inactive accounts and permanent locks, only releases an actually expired login throttle on an active account, and conditionally updates successful-login bookkeeping. No global cache or provider-wide hook changed.

Evidence in `../environment/member-browser-fe856e5e-db8.json` distinguishes three observations in EN and FR:

- The default cached `get-session` endpoint still returned prior identity information after session deletion.
- `get-session?disableCookieCache=true` returned no user after revocation.
- A new password sign-in returned HTTP 403 and created no session.

The existing five-minute cache remains configured. Do not present its display data as proof of current authority. Current `lib/security/rbac.ts` requests an uncached session and loads active user/organization state; `lib/security/auth-session.ts` checks the exact current session row. The dashboard layout and company settings also perform current RBAC checks. The raw home-layout session read remains a presentation boundary to review. This source trace is not proof that every provider and transport is correct.

Before reconsidering a global change, define and verify its complete provider/session contract, including existing OAuth users, session insertion versus deactivation races, authentication outages, cookie cleanup, refreshed-session behavior, and the extra database-read cost. A proposed broad change needs review of those concrete effects and applicable approval; no claim of immediate global cache invalidation or complete provider revocation is made here. This does not block unrelated workflow implementation.
