# Member lifecycle: next bounded implementation

Reviewed 2026-09-06 against current source after the invitation grant correction. This is an implementation handoff within the active whole-workflow assignment, not an approval gate or a completion claim.

## Current source findings

- `actions/users/deleteUser.ts` obtains fresh authentication but discards its session proof before calling the lifecycle service. The service checks target organization and self-deactivation but does not recheck the current actor/session at commit.
- `services/users/user-lifecycle.service.ts` retains the user, deactivates/locks it and clears a verification token. It does not revoke sessions. It cancels pending recipient invitations with a direct update, bypassing the newer invitation decision/outbox/audit contract. Its mandatory audit is correctly transactional, but the additional `USER_DELETED` event misstates the operation.
- `app/[locale]/(dashboard)/dashboard/settings/users/columns.tsx` exposes the same delete and edit controls to readers. The edit link points to an absent `users/update/[id]` route. The deactivation callback returns normally on an error, so `NewActionColumn` emits success even when the server rejected the operation. Its permanent-delete copy is false for retained account records.
- `actions/users/getOrgUsers.ts` still catches query failures and returns `[]`. The directory can present a failed query as zero users. Existing invitation-read improvements do not fix this separate read.
- Most directory/filter/export labels remain English. CSV export escapes quotes but does not address spreadsheet-formula prefixes. Export authority and data minimization remain to be reviewed.
- No existing member-role-assignment or reactivation action was found in the traced source. These are incomplete workflows, not an invitation-redemption workaround.

## Prerequisite corrected now

The role editor's last-custodian predicate still counted `users.roles.assign` through a shared alias. Two tests reproduced loss of the final actual member-assignment authority or substitution by an unqualified permission editor. Its predicate now uses the stored-grant policy for every required permission. The role transaction already serializes on the organization and locks current users, roles, memberships and session. Five isolated PostgreSQL cases cover final-custodian loss, an unqualified replacement, a qualified replacement, simultaneous removals and explicit legacy authority. See `../../evidence/role-custodian-receipt.json`.

This only protects role edits. The user-deactivation service is unchanged and must participate in the same invariant; do not claim global last-administrator protection.

## Authorized implementation sequence

1. Define a bounded deactivation command with target revision, reason and stable request ID. Keep organization, actor and session server-derived. The UI should review the actual retained-account outcome and preserve its reason/request through recoverable errors.
2. Recheck current account, organization, permission and password-confirmed session inside the transaction. Coordinate the organization → users → roles/memberships → session lock order with the role writer. Preserve an existing qualified custodian through deactivation and concurrent changes.
3. Revoke the target's current sessions, deactivate and lock the account, clear recovery tokens and commit a mandatory audit atomically. Preserve business/financial records and role history. Identical retries must not add another effect or deactivate a later-reactivated account silently.
4. Handle pending recipient invitations through a transaction-owned cancellation helper consistent with the current cancellation event, history and outbox contract. Make the account-deactivation authority and reason explicit. Retain delivery receipts and explain that an in-flight or provider-accepted message cannot be recalled. Invitations issued by the disabled account require current-authority review before redemption/delivery.
5. Replace the generic delete UI with an EN/FR deactivation review, real password step-up, truthful success/error states and permission-scoped controls. Hide the absent member-edit entry until its actual workflow exists. Keep retained records visible to authorized users.
6. Correct the directory's failed-read contract and affected callers, then verify the linked directory/deactivation journey with synthetic users and active sessions. Review CSV scope, authority and formula handling as its own bounded branch.
7. Add member assignment/reactivation through their real contracts after deactivation is safe. Do not widen invitation redemption to create duplicate or cross-organization identities.

Minimum verification: self/foreign/denied cases; stale actor and target; fresh-auth failure; no final-custodian loss; simultaneous role/deactivation changes; session and recovery-token revocation; mandatory-audit rollback; pending invitation/outbox history; duplicate and lost-response recovery; EN/FR denied/editor/mobile/keyboard behavior; retained records; exact source bindings. A native screen reader, full accessibility review and full release assurance remain separate unmet checks.

No additional user permission is needed for the ordinary implementation and isolated verification above. Production delivery, rollout, organizational approvals and expert certification remain subject to the existing controls. Do not ask again about the already recorded live-adapter rejection.
