# Invitation redemption — 2026-09-06

ID-04 now has a corrected redemption transaction and an actual EN/FR application journey. It remains partially verified within the all-workflows assignment. Invocation is through `/en/user-invite/invitation?token=<issued-token>` or its French equivalent; never publish a real invitation token in a report.

## Corrected behavior

Earlier redemption checked expiry before password hashing, created credentials before unconditionally marking the invitation used, and did not check active organization or a role that had acquired wildcard authority. Its generic audit helper wrote outside the credential transaction and could suppress an audit failure. Preview validity did not match current organization/role eligibility.

The service now rate-limits, checks the opaque token format, validates current organization/role eligibility and rechecks expiry after hashing. A conditional claim matches the token, invitation ID, email, organization, role, PENDING status, unexpired time and current organization/role eligibility before credentials are created. A competing claim, cancellation, replacement, suspension or wildcard-role change refuses creation. Expiry updates also match current token/status so they cannot overwrite a reissued or cancelled invitation.

User, assigned role, credential account, password history and redemption audit persist in the same transaction. A credential/audit failure rolls the claim and identity back. Retry can complete once. Recipient email is normalized from the invitation record; client-supplied email, organization or role cannot establish authority.

Preview hides personal metadata for unavailable invitations and uses the requested role language. A database lookup failure is displayed as unavailable loading with Reload, rather than claiming the invitation is invalid.

The invitation route uses the existing AuthV2Shell with a small invitation copy variant. The form uses current authentication surfaces, labels, input/button/focus styling and EN/FR resources. It shows the actual invited address, organization and role; removes the unrelated carousel/default remote avatar; limits duplicate client submissions; retains entries on recoverable uncertainty; and directs expired/changed/already-registered recipients appropriately. Passwords stay in memory and are cleared after confirmed creation, never written to browser storage.

An actual browser check found that a successful server action refresh marked the link used before the form displayed confirmation. The success state now takes precedence after a confirmed server response. This is display-only: subsequent sign-in and operations still use server-owned authority. Fresh visits to the consumed link correctly show unavailable and offer sign-in.

## Verification and limitations

- Final focused regression:122/122 tests in9 suites, `evidence/invitation-final.json`, chunk13e20d,4.545s. Covers invitation, public identity, affected verification/registration components and daily/financial report regressions.
- Typecheck passed: session75361/chunk82c56a. Six-file final lint and scoped whitespace results are in the canonical receipt.
- Actual PostgreSQL9/9: `invitation-redemption-8152b922-f7b.json`, source stable, original authority unchanged. Two concurrent calls yield one200 and one409, one user/role/credential/history/audit. Credential/audit rollback and retry, after-hash cancellation/reissue/suspension/wildcard, expiry, disabled metadata and EN/FR preview checks pass.
- Actual browser2/2: `invitation-browser-browser-af443af6-01c.json`. Genuine account creation and credential sign-in, interrupted-request recovery, retained entries, keyboard submit and success focus, used/expired links, no page errors or horizontal overflow at390/768/1440px. Ten actual screenshots; password fields masked at capture. Initial route observations1242msEN/951msFR are development timings, not performance certification.
- Original organizations, users, grants and configurations remained unchanged; only explicitly synthetic local invitation/account fixtures were created. No invitation email was sent. PostgreSQL proof blocked external fetch and exercised the existing password-breach service's offline behavior. Browser interceptors covered browser requests; the app's server-side breach lookup was not separately measured. Do not claim it made no outbound request.
- First browser c8e304ac-a69 failed: EN confirmation hidden; FR focus failed after a hot source correction. Its sourceStable=false and0/2 remain recorded. Its created accounts and used links were retained. A distinct v2 fixture produced the stable final proof; no used token or original account was reset.
- Reproduction `evidence/invitation-success-order-before.json`:12 tests passed and the added server-refresh regression failed. Corrected final regression passes. Test attempts02/03 encountered ESM test adapters, attempt04 reset the global observer mock; all failed receipts remain. These were test setup issues, separate from the real confirmation defect.

The current Invite schema retains no issuer ID or permission snapshot. This correction cannot prove that a role's ordinary permission expansion stayed within the original issuer's grant ceiling. That requires a further issuance/provenance design and schema change. Real invitation delivery and ambiguous provider outcomes remain open, as do server profile-field bounds, complete administrative cancellation/reissue UX, downstream onboarding, native zoom, actual screen-reader checks and comprehensive contrast review. These are not erased by passing redemption tests. Full build remains historically failed at Windows standalone symlink packaging.

## User and operator guide

| Required information / situation | Who supplies it and where to obtain it |
| --- | --- |
| Invitation link | Obtain the current issued link from the authorized organization administrator. Its opaque token selects the stored invitation; URL organization/role/email edits do not grant access. |
| Invited address, organization, role | Review the values loaded from the invitation. Contact the administrator if incorrect; the recipient does not edit them in this form. |
| Name and optional phone | The invited person supplies their own details. |
| Password | The invited person chooses a unique password meeting the displayed/current server policy. Do not send it to an administrator or include it in evidence. |
| Expired/withdrawn/changed invitation | Ask the original inviter or organization administrator for a current authorized invitation. Reload an updated link. Do not modify the database/token yourself. |
| Existing account / uncertain response | Try sign-in if creation may have succeeded. If needed, reload the invitation before retrying. Preserved entries are only current-page memory. |
| Suspended organization or invalid role | An authorized administrator resolves current organization/role setup through its controls. A signature or UI selection does not override it. |
| Persistent technical failure | Support uses the time and safe correlation/error details; retain the invitation privately. Engineering inspects transaction/audit failures. |

After successful creation, continue to sign-in. Account creation does not activate modules, approve payments, clear X1 or certify a country setup. No new user approval is needed to continue authorized implementation work.

## Review and rollout

| Responsibility | Evidence / assessment |
| --- | --- |
| Architecture/backend/API | Current service owns eligibility, conditional claim and transactional effects; existing public action remains the transport owner. No parallel identity system. |
| Database/migration | Actual concurrency and rollback checks passed. No schema/migration in this batch; issuer provenance remains an explicit schema gap. |
| Security/IAM/privacy/abuse | Token authority, current org/role and abuse policy retained; no client-derived role. Mandatory transactional audit. No security certification. |
| Frontend/design/workflow/accessibility/localization | Existing authentication shell/primitives and EN/FR copy; three widths, keyboard focus/recovery and source-confirmed success verified. Native zoom/screen reader/contrast remain open. |
| Product/operations/support | Clear account versus workspace-access outcome, no duplicate submission, input/source/owner instructions and safe retry guidance. |
| QA/release/SRE | Source-bound unit/action/component, PostgreSQL and browser evidence; observed local latency only. Existing full-build failure remains. |
| Audit/records | One redemption audit with the same commit as credential creation; failed writes roll back. Existing issuer grant provenance not yet available. |
| SaaS packaging | No subscription, entitlement or live activation changed. Sign-in applies existing tenant access. |
| Finance/controls/statutory/country/payroll/POS/offline/inventory/AP/payments/ledger-close | Not applicable to these direct effects: account/role creation only; no domain record, financial rule or professional approval changed. Subsequent domain access is outside this redemption slice. |
| AI/agents/background/integrations | No agent/background action. Issuance/provider delivery is a separate open workflow; no external message sent in proof. |

Release identity service, invitation route/form, shell copy and translations together. Preserve created identities and consumed tokens. Correct forward; do not roll back by restoring a used invitation to PENDING. Credential/audit transaction failures leave the invitation retryable. The v1 and v2 browser invitations are now consumed; runners requiring PENDING must not be repeated blindly. Private fixture files contain passwords/tokens and must remain private.
