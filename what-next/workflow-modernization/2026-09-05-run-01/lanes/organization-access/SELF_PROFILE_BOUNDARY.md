# Self-profile boundary discovered after v35

Recorded 2026-09-06. The session-management checkpoint is complete for its supported tests and remains `../../evidence/account-session-receipt.json`. The full platform assignment remains active. No self-profile production code has been changed in this discovery step.

## Confirmed current behavior

The existing account menu links to `/dashboard/profile`; the page is absent. Earlier authenticated EN/FR direct visits returned HTTP 404 (`../environment/profile-route-before-6597b8ea-9c9.json`). The menu is visibly open in later screenshots; its diagnostic background-button lookup failure must not be treated as proof that it cannot open.

`app/api/auth/[...all]/route.ts` delegates GET and POST directly to Better Auth. Installed Better Auth 1.6.26 provides `/update-user` with ordinary session middleware and accepts a display name, image and configured additional fields. `lib/auth.ts` marks first name, last name and phone as user-input fields; organization and verification status are not user-input fields. The route has no application-specific profile permission, revision, idempotency or mandatory audit wrapper. There are no current application callers of `authClient.updateUser`, `auth.api.updateUser` or `/api/auth/update-user` in the searched app/components/actions/hooks/services/lib source.

Real HTTP probe `../environment/self-profile-before-80057a5e-514.json` used two new independent synthetic organizations and accounts. Each tested account had `profile.read` and lacked `profile.update`. Both POST requests returned 200, persisted a changed display name and added zero actor audits. First/last names stayed unchanged, demonstrating that the independent name fields can disagree. Each synthetic profile was restored afterwards; unrelated authority and financial-record hashes were unchanged. Source was stable. This is defect-reproduction evidence, not a passed profile workflow.

The fixture metadata is private at `playwright/.auth/workflow-self-profile-v1.json`, source `owned-self-profile-verification`, database `stoquify_local_registration_20260906_01`. Do not print credentials, overwrite this file, or rerun its single-use fixture-creation driver. It contains EN/FR `editor` (`profile.read` + `profile.update`) and `reader` (`profile.read` only) identities for subsequent isolated tests. All new organization IDs begin `workflow_self_profile_` and names begin the existing owned-environment prefix.

## Connected source relationships

- The authenticated dashboard layout merges fresh RBAC user data into `shellSession`; Navbar and Sidebar receive it. A server layout refresh can update these identity labels.
- `lib/auth-client.ts` exposes the Better Auth client/session hook. The installed `get-session` endpoint supports `disableCookieCache`; a scoped post-save session refresh can be examined without disabling the global cache. Verify the actual cookie and client-store effects before claiming immediate updated identity everywhere.
- `services/users/member-access-read.service.ts` and invitation history prefer structured first/last names. Invitation history resolves actor display names from the current User record while retaining stable actor IDs in its events. Changing a display name is not an approval/signature identity update; history semantics must stay explicit.
- Existing account and role mutation services use organization → user → role/membership → session locks. The new profile service should follow this order and retain current authority checks through commit.

## Next implementation work

1. Define the basic self-profile contract using existing `profile.read` and `profile.update`. Resolve first/last/display-name consistency; keep verified email, phone ownership, credentials, role assignments and external avatar upload outside a basic display-profile edit unless their complete supporting workflows are implemented.
2. Build the service-owned read model and an audited, revision-checked, idempotent self-update with current tenant/account/session/permission checks. Keep stable actor IDs and retain only required change evidence.
3. Correct the demonstrated `/api/auth/update-user` bypass through a narrowly scoped, reviewable endpoint decision. Do not add only a protected form while leaving a parallel generic write path. Document compatibility effects for existing SDK/API clients; no current in-repository caller was found.
4. Add the existing missing profile route, actions, query/mutation hook and bilingual form within the current shell. Preserve edits after recoverable failures and distinguish saved-profile success from failed client/session-display refresh.
5. Complete real profile-menu navigation, localized account-menu copy, role/organization/plan truth and sign-out failure handling with proportionate shared-consumer coverage.
6. Verify reader denial, foreign scope, stale update, simultaneous requests, audit rollback, lost acknowledgement, current authority, immediate shell display, EN/FR, keyboard and responsive behavior against these dedicated fixtures.

The earlier rejection covered global cookie-cache disablement and all-provider session-creation hooks in `lib/auth.ts`, because their authentication/availability impact exceeded the then-verified member-deactivation flow. That rejected patch remains unapplied. This is a newly reproduced specific profile endpoint defect, not permission to repeat the rejected global change. Complete the scoped implementation and evidence; do not turn ordinary engineering work into an invented approval requirement.
