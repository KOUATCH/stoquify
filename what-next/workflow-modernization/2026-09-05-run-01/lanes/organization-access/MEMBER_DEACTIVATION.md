# Member directory and account deactivation

This batch implements the `OA-USERS` and `OA-DEACTIVATE` boundaries of the continuing workflow review. It does not complete the whole platform assignment. Current evidence is recorded in the member-deactivation receipt after verification; earlier findings in `MEMBER_LIFECYCLE_REVIEW.md` are the before-state.

## Delivered behavior

The existing `/en/dashboard/settings/users` and `/fr/dashboard/settings/users` routes show a localized, scoped directory with a checked time. A failed query returns an error and retry, never a successful zero-member count. Displayed role names use French where available. The CSV contains only the displayed directory fields for matching rows; formula-like prefixes are escaped as literal text. Its availability retains the existing directory-reader policy; no additional export entitlement is invented.

Authorized members with an explicit `users.deactivate` or existing `users.delete` grant can review an active colleague's deactivation. Existing `DEACTIVATE_USERS` and `DELETE_USERS` grants remain supported. Wildcard alone cannot authorize it. Own-account and inactive-account rows have no deactivation control. The broken member-edit link is removed until an actual member editor exists; member assignment/reactivation remain unfinished workflows.

The review names the member and current revision, explains retention, and requires a 3–400-character reason. A password challenge verifies the acting member's existing password and then requires explicit resubmission. Recoverable errors preserve the reason. An uncertain result retains the exact request ID and details for retry. Dialog identity is keyed to the member: table filtering cannot reuse another member's draft or target.

The service locks the organization before its users, roles, memberships and acting session. It rechecks the active organization, usable actor, actual stored grants, current password assurance, target scope and reviewed revision. It shares the role editor's definition of an administrator who can manage roles and invite members. Deactivation and concurrent role editing cannot jointly remove the last such administrator.

One transaction disables and locks the account, clears its current recovery token, revokes its sessions, cancels pending recipient invitations, stops queued delivery, and records mandatory audit evidence. A duplicate confirmed request returns the original receipt after current-authority and current-account checks. Roles and business records remain. Cancellation records use the existing invitation event/history format. Sent and in-flight delivery receipts remain; no email recall or provider delivery is claimed.

The existing password sign-in hook now distinguishes inactive/permanently locked accounts from expired login throttles. Successful sign-in bookkeeping uses a conditional update so it cannot unlock an account deactivated concurrently. Broad session-cache and provider-wide hook changes were rejected by automatic approval review and remain unapplied. Default cached identity display can outlive session revocation for up to its existing five-minute cache duration. Fresh session checks and protected RBAC use current database state. OAuth/provider-wide issuance still needs its own review and verification.

## What an administrator supplies

1. Select the correct member in **Settings → Users**. Confirm their name and email against the organization's member/personnel record.
2. Select **Deactivate**, read the consequences and enter the operational reason—for example a confirmed departure or reassignment. Obtain the reason from the responsible manager or accepted internal access-change request; avoid sensitive personal details.
3. If asked, enter **your own current password**, obtained from your existing account credentials. Do not enter the departing member's password. Password verification is separate from the final confirmation.
4. Confirm deactivation. Trust the success receipt only when the application shows its audit reference and actual session/invitation counts. Close the receipt to refresh the retained member row.
5. If the account changed, reload it and review again; the reason remains. If the outcome is uncertain, retry the same request. If permission changed or this is the last qualified administrator, an authorized administrator must resolve that condition first.

Reactivation is not yet available through a verified product workflow. Do not recreate the identity by inviting the same person, restore old sessions, or edit audit history to simulate reactivation. Existing records remain accessible to other authorized members according to domain permissions.

## Failed browser attempt and fixture recovery

`lanes/environment/member-browser-a0affcda-b3a.json` is a failed receipt, not successful proof. A filtered-row component reused the earlier synthetic reader's target. The English test consequently deactivated the pre-existing **synthetic role-catalogue reader** instead of its new synthetic target. The French test reached the intended deactivation but exposed cached identity data from the default session endpoint. Both failures were retained.

The component and its table integration now key the review by member ID. A regression test changes the row identity and verifies that the previous draft is discarded and only the new member ID is submitted. `member-browser-fixture-recovery-a0affcda-b3a.json` records restoration of exactly the affected synthetic reader's prior active/unlocked flags, conditional on the unchanged failed-test revision. Existing credentials and roles were retained. Revoked sessions were not recreated. The original deactivation audit and a separate `LOCAL_TEST_FIXTURE_RECOVERED` audit remain. This isolated fixture correction is not a production reactivation mechanism.

The first PostgreSQL attempt could not write its report (`7ad2ea`); it is not counted as passed evidence. Its synthetic outbox event name was also corrected before the retained six-case run. No prior fixture was reset on retry.

## Review and rollout boundaries

Backend, database, security, frontend, accessibility/localization, audit/events, product and operational review apply. Finance, statutory, POS/offline, purchasing, payroll, payments and close are retention boundaries: this change creates no postings, payments, declarations or domain approvals. Country-law certification is not applicable to the changed algorithm; no statutory rules change. Analytics, AI behavior and commercial packaging are not applicable beyond existing access semantics; no models, prices or subscriptions change.

No migration or new table is required; existing accounts, sessions, invitation events/outbox and audit records are reused. No deployment or live customer activation is authorized by this evidence. Monitor deactivation denials, request conflicts, audit failures and session checks during any later approved rollout. Retain the request and audit reference when investigating an uncertain result. Do not restore deleted session tokens as rollback. A rollback/re-enable procedure must verify current authority and obligations and record a new decision; its product implementation remains open.

Native screen-reader operation, complete contrast/zoom coverage, provider-wide login behavior, member assignment/reactivation, durable deactivation-history browsing and the remaining platform workflows are not certified or marked complete.
