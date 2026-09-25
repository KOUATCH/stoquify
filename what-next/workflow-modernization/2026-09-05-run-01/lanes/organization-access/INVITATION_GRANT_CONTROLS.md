# Invitation role-control authority

2026-09-06; source baseline v26. This is a bounded correction to ID-03, ID-04 and the connected role editor/catalogue. It is not a complete organization-access review.

## Finding and correction

Seven new tests reproduced unwanted authority through shared aliases. `users.roles.assign`, `admin.role.assign`, `roles.permissions.assign` and `roles.permissions.remove` shared historical names. Expanding an account's canonical permissions could manufacture the appearance of another operation. A user permitted to assign people to existing roles could consequently be treated as permitted to grant or remove role permissions.

The role-control policy now checks the actual stored canonical operation or an explicitly stored recognized legacy grant. A broad legacy role permission can be granted only when the issuer holds every role-control meaning it conveys. Existing stored legacy authority is retained. Other permission families keep their existing behavior and remain subject to their own review.

The invitation role list reads the current same-organization issuer instead of relying on expanded request claims. Issuance records that its permission snapshot came from stored grants. Preview, locked redemption, history and the disabled delivery worker apply the same evidence rule. Historical invitation records involving these powerful controls require review/reissue when their permission basis is ambiguous. Original records are not rewritten by this implementation. No schema migration or production adapter was introduced.

Graph discovery used `graph_actions.json`, including `roles_createrole_ts` and `roles_role_auth_ts` (community 0). Current source, rather than the historical graph, established the service and invitation dependencies.

## Evidence and limits

The receipt `../../evidence/invitation-grant-controls-receipt.json` binds the exact source, 302 passing tests across 17 suites, 11 real PostgreSQL checks, browser results, typecheck and changed-file lint. The original failing tests and later fixture/environment failures remain recorded.

Database checks cover filtered options, four denied aliased grants per language with no effects, duplicate issuance with one event/outbox/audit, explicit control grants with one recipient/credential/redemption audit, duplicate redemption rejection, locked current-authority revocation, worker no-dispatch and historical evidence review. All tenants were new synthetic fixtures. The deliberately corrupted historical fixture was tested for rejection only. No live email was sent; two service-created recipients do not prove email delivery.

The original live-adapter auto-review rejection remains in force. The production transport remains absent and the worker is disabled by default. Operator retry controls, member deactivation/assignment, coordinated last-administrator protection, other alias families, full accessibility and downstream onboarding remain open. No release, X1 or professional certification is asserted.

## What to do and what information is needed

1. Open `/en/dashboard/settings/users` or `/fr/dashboard/settings/users` with an authorized organization account. Choose Invite user. Supply the recipient's actual work email from your staff directory and choose a role matching their agreed duties. The role owner or organization administrator should confirm those duties.
2. Your account needs the actual invitation and user-role-assignment permissions. Role definitions may be listed only with role-read permission. Assigning people to roles does not automatically allow you to change the permissions inside a role.
3. If a required role is absent, ask the authorized administrator to review the role definition and your grant authority in Settings → Roles. Do not select a broader role merely to bypass the restriction. Permission changes use the existing reviewed, audited role editor and fresh authentication.
4. If an older invitation requires reissue, an authorized administrator opens its history, verifies the intended recipient and role, supplies a short reason for replacement, and uses the existing reissue control. Obtain the reason from the actual correction being made, such as a reviewed role definition. Preserve the earlier history. Do not edit its stored payload or add a provenance marker manually.
5. The application requests your own current password when fresh authentication is required. A signed product approval document does not substitute for these account permissions. The recipient must use the actual current link supplied through an authorized delivery process; this local test environment does not deliver it.

## Rollout and recovery

Deploy the policy, issuer reader, options service/caller, contract, issuance, redemption, history and worker changes together after the ordinary release controls. No database migration is needed. Review pending role-control invitations for reissue without modifying their historical records. Ordinary non-control invitations retain the existing validation path.

If a delivery/permission incident occurs, keep the worker disabled and use the existing cancellation/reissue controls. Do not roll back only the evidence check or relabel historical records to regain access. Existing users and role memberships are not rewritten by this patch; separate member-lifecycle review is still required.

Architecture/backend/security/data/audit/product/UX/localization/release/operations perspectives apply to these boundaries. Finance postings, statutory rules, billing, analytics algorithms and AI behavior: not applicable to this bounded authority correction; no domain records or business algorithms were changed.
