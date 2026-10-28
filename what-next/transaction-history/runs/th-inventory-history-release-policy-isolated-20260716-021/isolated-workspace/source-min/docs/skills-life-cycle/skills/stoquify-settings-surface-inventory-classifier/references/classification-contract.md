# Classification Contract

## Boundaries

| Boundary | Meaning | Permission expectation |
|---|---|---|
| `rbac-protected` | Executable dashboard action with a permission guard | Canonical permission required |
| `authenticated-self-service` | Authenticated operation scoped to the current actor | RBAC context required; extra permission depends on target |
| `public-registration` | New organization-owner registration | No dashboard RBAC; service-owned validation and audit evidence required |
| `token-bound-invitation` | Invitation redemption | Valid, unexpired, single-use invitation token required |
| `public-reset-request` | Enumeration-resistant reset request | Generic response and service-owned token issuance required |
| `otp-bound-verification` | Email verification | Valid, unexpired OTP required |
| `mixed-protected-and-token-bound` | One module exports protected password change and token reset completion | Both boundaries must remain independently evidenced |
| legacy-manual-auth | Executable action using legacy session/manual permission checks | Migration to canonical RBAC and trusted tenant context required |
| helper-module | Non-executable helper under ctions/ | Permission and module entitlement are not applicable |
| `unresolved-executable` | Server action with no approved boundary evidence | Review and hardening required |

## Reviewed Identity Registry

- `actions/users/createUser.ts`: public registration through `createOrganizationOwner`.
- `actions/users/createInvitedUser.ts`: invitation-token redemption through `acceptInvitationWorkflow`.
- `actions/users/sendResetLink.ts`: enumeration-resistant public request through `requestPasswordResetLinkWorkflow`.
- `actions/users/verifyOtp.ts`: OTP verification through `verifyEmailOtpWorkflow`.
- `actions/users/updateUserPassword.ts`: mixed protected change and token-bound reset through `changeUserPasswordWorkflow` and `completePasswordResetWorkflow`.

Any new public exception requires an explicit registry change and source review. A missing permission is never sufficient evidence that a surface is public.

## Evidence Fields

Each JSON record must include source inventory values, execution boundary, authorization boundary, status, permission disposition, module disposition, guard markers, tenant markers, fresh-auth evidence, module-observe evidence, findings, and recommended action.

`review-required` is an active finding. `allowed-public`, `protected`, `protected-mixed`, `helper`, and `delegated` are reviewed dispositions, not authorization guarantees beyond the inspected source evidence.

## Invariants

- Keep the source module inventory in report mode.
- Do not expose token values or personal data.
- Do not count helper modules as executable actions.
- Do not require dashboard RBAC for reviewed public or token-bound identity workflows.
- Flag executable settings actions that lack an approved auth boundary.
- Flag sensitive registered actions when expected fresh-auth evidence disappears.
