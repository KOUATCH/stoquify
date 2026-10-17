# Change a password and revoke its sessions

Open the account menu → Change your password, or `/en/dashboard/change-password` / `/fr/dashboard/change-password`.

| Input or prerequisite | Who provides it | Where to obtain it |
|---|---|---|
| Signed-in account in an active workspace | Account holder | Normal Stoquify sign-in; the server derives account and tenant identity |
| Permission to change your own password | Workspace role administrator | Existing role permission `profile.password.update`; the unknown legacy `PASSWORD_READ` label is insufficient |
| Current password | Account holder | The credential you currently use; never send it to an administrator or put it in an approval document |
| New password | Account holder | Choose a different policy-compliant password, 12–128 characters; the form explains restrictions and the service checks recent reuse |
| Administrative target change, where already integrated | Authorized administrator | Existing same-tenant protected action/service, `users.password.reset`, fresh password authentication and active target; this work adds no target-reset screen |

Enter both passwords and choose Save new password once. The current password establishes fresh authentication. The server rechecks the actor, permission, workspace, credential generation and session before changing anything. On success, credentials, password history, target-session revocation, prior reset-link invalidation and the security audit commit together.

For your own account, the application moves to the localized sign-in page. Sign in with the new password; the old password and previous sessions no longer work. The sign-in notice alone does not prove a completed change. An authorized administrative change revokes the target's sessions and preserves the administrator's session.

A wrong password or policy error focuses its explanation and retains the draft. An interrupted request also retains the fields. If the outcome is uncertain, first try signing in with the new password: a lost response can follow a committed change. Do not automatically repeat the old credential change. Use the established password recovery workflow if neither credential works. Expired sessions or changed authority require signing in again or asking the role administrator to restore legitimate access.

Error text uses the dashboard's readable text color; the danger border/icon and alert semantics retain the failure meaning. Show/hide controls have explicit accessible names. Browser screenshots and reports must mask credentials; no secret belongs in an audit note or support ticket.

No schema migration is required for the presentation correction. Use the existing authorized release process. A UI rollback does not restore passwords or revoked sessions; never restore historical hashes or erase password history/security audits as a recovery shortcut. Live delivery for public password recovery belongs to its separately registered workflow.

Engineering evidence is local and synthetic. It does not establish production performance, native screen-reader speech, browser-chrome zoom or professional certification. Current evidence and remaining closure requirements are in [the ID-05 checklist](PASSWORD_CHANGE_CLOSURE_2026-09-27.md).
