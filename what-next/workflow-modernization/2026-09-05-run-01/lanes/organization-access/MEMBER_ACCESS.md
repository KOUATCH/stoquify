> Current history/export and refresh behavior: see [MEMBER_HISTORY_AND_RECOVERY.md](MEMBER_HISTORY_AND_RECOVERY.md), source v30. The v29 checkpoint below is retained as historical evidence.

# Member access, reactivation and retained history

Implementation checkpoint, 2026-09-06. This document describes repository behavior; final command results and source bindings belong to `../../evidence/member-access-receipt.json`. The complete platform workflow review remains active.

## What is implemented

Settings → Users → **Member access** opens the selected account at `/en/dashboard/settings/users/update/<member-id>` or the equivalent `/fr/` route. The existing dashboard shell and organization context remain in control. The screen shows current roles, individually unavailable assignments/removals, an editable reason, an explicit review and a durable success receipt. It reuses shared buttons, fields and the themed dialog. Selected roles use `--dash-brand` and `--dash-brand-soft`; selection does not mean approval or successful activation.

For an active colleague, select or remove roles, review the exact additions/removals and save. For a supported inactive colleague, the same review combines the current role selection with reactivation. Neither operation changes identity, email verification, credentials, MFA, financial records, module eligibility or subscriptions. Existing recipient invitations cancelled during deactivation remain cancelled.

Changes revoke the member's database sessions. Reactivation creates no session; the member signs in normally afterward. Existing default cached identity and unreviewed provider-wide session issuance limitations are described in `SESSION_REVOCATION_REVIEW.md`. They are not resolved or certified by this checkpoint.

## Information to provide and where to get it

| Case | What you supply | Where to obtain it |
| --- | --- | --- |
| Find the member | The colleague's name or work email | Your organization's member list or accepted personnel/access request; verify the named account before review. |
| Add a role | Roles matching the colleague's current responsibilities | The responsible manager's accepted access request and Settings → Roles. An authorized role administrator must first create any genuinely missing role. |
| Remove a role | Roles whose responsibilities have ended | The approved reassignment, departure or access review. Removal authority is separate from assignment authority. |
| Reactivate | Current role selection and the operational reason for return | The responsible manager's accepted return/access request. The system checks its own recorded deactivation; you do not invent an approval identifier or upload a fabricated record. |
| Confirm identity | Your own current password when prompted | The password you normally use to sign in. Do not use the member's password. Confirmation does not submit the change automatically. |
| Explain the change | A reason of 3–400 characters | The actual access request or decision; include a recognized reference if one exists, without passwords, tokens or unnecessary sensitive detail. |
| Trace the result | The change reference | Supplied automatically after successful commit. Audit readers can also find recent references, timestamps and reasons in the account's history. |

An organization still determines who is authorized to make access decisions. The application enforces configured permissions and current session evidence; it does not certify the business request, signer authority or X1 approval.

## Authority and evidence rules

- `users.read` is required to open the account. Read-only users can inspect current role names/counts, with unavailable controls explained.
- Adding a role requires actual stored `users.roles.assign` authority (or its explicit recognized legacy grant), plus current grantable authority for every permission in the added role. A wildcard is not a grant ceiling.
- Removing a role requires actual stored `users.roles.remove`. User assignment is not inferred to include removal.
- Reactivation requires actual `users.activate` plus assignment authority for every selected role, including retained ones. It additionally requires a verified inactive account, a permanent lock and a matching current `DEACTIVATE_USER` receipt. An unverified account, timed lock, unexplained inactive state or subsequently changed account needs investigation rather than automatic unlocking.
- Own-account access changes are refused. Role editing, member deactivation and member access changes serialize on the organization and preserve an existing last usable role custodian.
- `controls.audit.read` is required to see the latest 20 access/deactivation records. Other users receive an explanation rather than private audit content. This is bounded recent history; pagination/export and complete retention review remain open.

The locked write rechecks current organization, actor, raw role grants, membership and the exact unexpired password-confirmed session (300 seconds). The preview revision includes member state, all current own-organization role definitions and membership. A concurrent role change invalidates the preview even if the account row is unchanged. Foreign role associations are retained and blocked for investigation rather than silently discarded.

## Recovery and operations

After a stale review, choose **Reload and compare**. The role selection and reason remain in the current tab; review them against the reloaded definitions and submit a new request. After an uncertain response, **Retry same request** uses the original request identifier and evidence. It returns the existing receipt if it still matches current state; it does not repeat effects. A later account or role change requires another review.

The receipt remains visible until current details reload successfully on close. Do not recreate old sessions, edit audit evidence or use a new invitation to bypass an existing account's lifecycle. A page refresh or tab closure currently loses the unsaved draft and in-memory retry identifier; inspect current roles and available history before making a new decision.

No schema change or migration is required. No deployment, live customer change or email delivery was performed. Rollback of source does not undo recorded member decisions or restore revoked sessions. Keep audit records and apply any correction as a separately authorized new change. Do not roll back to known weak member-deactivation code as an access recovery method.

## Source and review map

`memberAccess.ts` actions obtain the current organization/actor/session and delegate to `member-access-read.service.ts` and `member-access.service.ts`. The write owns Prisma membership, account, session and mandatory audit effects in one transaction. `useMemberAccess.ts` handles query/mutation transport. `MemberAccessEditor.tsx` owns the draft and explicit review, separate from the directory's table row identity. No business mutation is performed in a component or hook.

Historical graph hints: `roles_createrole_ts` / `roles_getorgroles_ts` in actions community 0; `forms_roleform_tsx` in components community 111; invitation form community 182; role route communities 165–167. Current actions, role policy, transaction locks and UI source were read to verify the relevant relationships. The new member services/routes are absent from those historical graphs.

Architecture/backend/data/security, workflow/design/localization/accessibility, product/operations and quality reviewers apply directly. Finance and audit perspectives cover retained records and mandatory evidence; no monetary calculation, posting or country rule changed. SRE covers bounded transactions, serialized updates and observed development timings. SaaS packaging review confirms unchanged module/subscription state. Provider/API review covers sign-in/session boundaries, with the known provider-wide gap retained. OHADA/tax, offline/edge and AI behavior changes are not applicable to this batch because no corresponding domain operation is modified. No professional certification is asserted.

## Remaining work

Complete member-history pagination/export and retention analysis, refresh/tab-close draft recovery, actual native screen-reader testing, browser zoom and full contrast checks. General administrator editing of personal identity details is not part of this access editor. Broader session/provider review and the remaining workflow register continue separately. Timings from a development app are observations, not approved-budget or production performance passes.
