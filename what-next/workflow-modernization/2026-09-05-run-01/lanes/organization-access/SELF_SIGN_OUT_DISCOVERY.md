# Current-account sign-out — discovery after source v37

This records the next existing workflow to complete. Profile and header implementation evidence is already published in `SELF_PROFILE_MANAGEMENT.md` and `HEADER_REFLOW.md`. No sign-out implementation change is made by this discovery record.

## Current source and partial runtime evidence

`lib/auth-client.ts#signOut` awaits `authClient.signOut()` but does not inspect the returned error/result before redirecting. There are three current callers of that helper:

| Entry | Current failure behavior | Needed correction/verification |
| --- | --- | --- |
| `components/dashboard/Navbar.tsx` mobile navigation Logout | Calls helper, then pushes login; catch only logs. English label. | Real failed-response proof, current-session persistence, honest EN/FR failure/retry, duplicate suppression and mobile drawer focus. |
| `components/dashboard/Sidebar.tsx` desktop sign-out | Catch also pushes login. | Real failed-response proof; keep user informed of unconfirmed logout; verify success and actual session/cookie effects. |
| `components/dashboard/SessionRecoverySignOutButton.tsx` root-dashboard recovery | Catch redirects anyway; pending flag never clears on failure. | Recovery for unusable/stale account context must remain possible without requiring profile/organization authority. Verify EN/FR error and retry. |

`components/UserDropdownMenu.tsx` uses the client directly and already checks its returned error, keeps the menu open on failure and redirects only after the successful response. Profile EN/FR browser evidence exercised HTTP 503 failure and actual session deletion after success. Its current condition does not explicitly validate a `{ success: true }` payload; strict response handling should be considered together with all callers rather than copying a new rule inconsistently.

The installed Better Auth 1.6.26 implementation in `node_modules/better-auth/dist/api/routes/sign-out.mjs` catches `internalAdapter.deleteSession` errors, logs them, clears browser session cookies and returns `{ success: true }`. This is **source evidence of a partial-completion boundary**, not a real database-failure runtime reproduction. A successful browser cookie removal does not prove server-side revocation if the database deletion failed. The prior Profile success test proved actual row deletion only when the database was available.

## Next bounded implementation sequence

1. Preserve v37 as the baseline; reproduce helper/caller failure redirects with injected unsuccessful HTTP responses and current synthetic session-row checks. Exercise desktop and mobile EN/FR, then root-dashboard recovery separately.
2. Verify the installed provider's deletion-error behavior in an isolated test before designing the endpoint correction. Inspect existing verified-cookie/current-session helpers and the need to sign out a disabled/deleted-organization account. Never make leaving an account depend on profile edit permission or an active organization.
3. Decide and implement an explicit contract for confirmed local logout, confirmed server revocation and unconfirmed/partial failure. Maintain same-origin and cookie controls. Avoid swallowed deletion failures or invented success; retries must be safe for a session already removed.
4. Update the helper and all affected callers together, with EN/FR pending/error/retry feedback, duplicate suppression and no redirect on unconfirmed operation. Keep previously completed account-menu and reviewed-other-session behavior intact.
5. Verify browser cookies, exact current-session persistence/deletion, later authorization and safe retry. Record the limits of cached sessions/other transports instead of claiming global immediate revocation.

The earlier rejected patch changed global cookie-cache policy and all-provider session creation. It remains unapplied. This newly identified sign-out boundary requires its own narrow evidence and implementation; it is not authorization to repeat that rejected global patch.

## Related shared-shell findings still to inspect

Navbar's mobile Sheet currently has no `SheetTitle` or `SheetDescription`, and mobile navigation/search/theme/sound labels are mostly English. Sidebar/search module counts and presence labels need semantic review. These are current source observations, not completed runtime/accessibility audits. The fixed OA-F18 wrapping must be preserved through subsequent shell work.

No external approval is needed to continue source fixes and isolated verification. Live provider/global-auth assurance, formal retention and the remaining full-platform inventory remain separate boundaries; none makes this ordinary engineering work blocked.
