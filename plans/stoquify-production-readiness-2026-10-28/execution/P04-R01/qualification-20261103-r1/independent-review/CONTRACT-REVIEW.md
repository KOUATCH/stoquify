# P04-R01 independent authority-contract review

Reviewed 3 November 2026 by the independent Code Reviewer agent. This is a source/contract review, not an execution or release acceptance.

## Proposed authority boundary

The proposed contract is consistent with the current operating-scope resolver: tenant-wide effective access requires `dashboard.read` and either a persisted reserved role code (`admin`, `administrator`, `super_admin`, normalized exactly as the resolver) or persisted wildcard authority. A caller-provided `isSuperUser`, role label, permission list, or preview cannot establish the mutation's final authority.

Keep the existing explicit stored permission controls for role creation, permission assignment, invitations and member assignment. Operating authority is an additional ceiling; wildcard operating authority must not newly bypass existing restrictions on assigning wildcard/control permissions.

The repair must deny both direct latent authority grants and composed effective authority:

- A limited actor cannot create or assign a reserved-code role, even if the role has no permissions.
- Adding an ordinary `dashboard.read` role to a recipient already holding an empty reserved role must not activate tenant-wide access.
- Adding `dashboard.read` to an ordinary role already assigned beside a reserved role has the same effect and must be checked for each affected recipient, including the actor.
- Replay, reactivation and access-request application must check current persisted actor authority, not only the original approval or operation's permission delta.
- Safe authority reductions and metadata-only edits should remain possible under their existing controls; any intentional broader restriction must be stated in the authority contract.

## Invitation evidence review

New evidence can bind exact `roleCode` and contemporaneous persisted `actorRoleCodes` without changing version-1 email rendering. Live issuer and target role checks are still required at issuance/replacement, delivery and redemption. Code drift with unchanged permission arrays is authority drift.

Historical payloads lacking code evidence may remain usable only for a currently nonreserved role whose existing permission/evidence checks pass. Historical reserved-role payloads must fail closed rather than acquiring inferred contemporaneous authority. Preserve these pending records; do not silently rewrite or reissue them.

## Source boundaries inspected

The current writer search across `actions`, `services`, `lib` and `app` identified role writes in `services/roles/role-write.service.ts`, member assignment in `services/users/member-access.service.ts`, invitation redemption in `services/users/user-identity.service.ts`, and fresh-organization bootstrap in the same identity service. Fresh-tenant bootstrap is a distinct creation authority and needs explicit inventory treatment; it must not be mistaken for an authorized delegation into an existing tenant.

The current role/member services have transaction-bound account, stored permission, session and row-lock controls. The bounded repair should compose with those controls. Current member revision hashing omits role code; including code is appropriate when it becomes an explicit grant input.

## Required verification before acceptance

Native fixtures must include reserved-code normalization, the empty-role composition cases above, legitimate privileged administration, ordinary limited delegation, actor reserved-membership removal with unchanged explicit permissions, stale/revoked/expired sessions, replay after authority change, access-request approval/application and invitation evidence/code drift. Demonstrate no unauthorized role/member/credential/invite/outbox changes after denials, while identifying permitted security audit or failed-request bookkeeping separately.

Review the new isolated database target and current migration/client admission before execution. The retired historical `.ts` test path must not be blindly rerun. Mocked source/unit tests, native database composition, actual authenticated action/HTTP checks and rendered/browser checks must be reported separately.

No production changes, commit, push, migrations against production, provider sends or deployment are approved by this review. Final acceptance is pending implementation, execution receipts, cleanup and independent evidence reconciliation.
