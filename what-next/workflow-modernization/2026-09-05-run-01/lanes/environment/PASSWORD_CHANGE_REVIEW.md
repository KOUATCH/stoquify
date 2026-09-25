# Password change — current source review

2026-09-06, source v18. ID-05 remains incomplete. No password-change production edits at this checkpoint.

Graph discovery located the password-change page in `graph_app.json`, community 83 (`locale_dashboard_dashboard_change_password_page_tsx`, `change_password_page_changepass`), with error boundary in community 82. Component/action graphs contain no matching current node; source was used to confirm the relationship.

Current path: `/en/dashboard/change-password` or `/fr/dashboard/change-password` → existing route-access wrapper → current authenticated user → `ChangePasswordForm` → `updateUserPassword` → `changeUserPasswordWorkflow` → shared credential synchronization. The form has only this production caller. The action also supports an administrative target using existing `users.password.reset` and fresh authentication.

## Reproducible source findings

1. `ChangePasswordForm` uses `TextInput` without a type override for the old password. `TextInput` defaults to `type="text"`, exposing entered characters visually. The form lacks a POST method and hydration guard, repeating the native-GET hazard already observed in invitation registration. Verify the corrected behavior without submitting real credentials through a URL.
2. Only status 403 and 200 are handled. A structured 400, 429 or 503 leaves `loading` true; an absent editing ID also never completes. Errors are English-only, no live status region exists, and a successful administrative use would sign out the acting administrator rather than simply confirming the target update. The current page itself only supplies the actor's own ID.
3. The action derives self versus administrative mode correctly, but invalidates an unrelated clients route. Its imported request type belongs to the client form rather than a bounded service contract.
4. The service verifies the old credential and computes the policy-compliant new hash before the write transaction. The transaction does not compare the credential generation it verified, recheck stored actor authority, or retain current session evidence. A concurrent reset/change during preparation can be overwritten by an older request. This requires failing regression/database proof before claiming a fix.
5. Credential synchronization and session revocation are transactional, but the password-change audit is best-effort after commit. An unavailable audit can leave an unrecorded credential change. Existing two unit cases cover a wrong old password and nominal synchronization, not concurrency or rollback.

## Intended bounded correction and acceptance

Keep the shared Argon2id/password-policy/credential/session facilities. Give the workflow a bounded service input and derive its mode from current actor/target identity. Reuse the actual password step-up process for current-password assurance, with its existing failure limits; retain the administrative permission and fresh-authentication check. Do not invent MFA or provider approvals.

Before committing, compare the previously verified credential generation and revalidate current tenant, actor, target and session authority under appropriate transaction locks. Credential change, history, target-session revocation and mandatory audit must either all commit or all roll back. Reject stale or revoked requests with actionable codes. Avoid holding database locks during the expensive password preparation. Validate real concurrent requests and audit failure with owned isolated fixtures.

The existing dashboard form should mask both passwords, submit through a safe hydrated POST path, handle every structured/transport failure in EN/FR, preserve drafts on recoverable failures and explain that the account must sign in again after success. Reuse current dashboard components and semantic colors. Keep unrelated auth policy and shared component behavior unchanged unless this workflow demonstrates a necessary correction.

Required proof: self/admin/denied/foreign tenant; wrong password, bounded input, actual policy failures; stale credentials, revoked session/actor/role, duplicate concurrent requests; mandatory-audit rollback and real session invalidation; EN/FR mobile/tablet/desktop, keyboard and recoverable failure. Provider notifications require their own authorized transport and are not implied by this patch.

Authentication skill applied as implementation guidance; its broad provider/MFA/pepper recommendations are not proof of current repository behavior and do not authorize an unrelated rewrite. No legal, security or release certification is implied.
