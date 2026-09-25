# Invitation authority at account creation

Checkpoint: 2026-09-06, source v17. This is an engineering implementation record, not a release approval or a completed platform review.

## Delivered behavior

Redemption now requires exactly one applied issuance event for the invitation's tenant, record and current token generation. It checks the event's payload integrity, issuer, recipient hash, role, expiry and original grant ceiling. The role's permission set must still match the recorded decision; both permission additions and removals require a new review. The issuer must still be active, verified, unlocked and authorized to grant that role.

After password validation and hashing, the transaction repeats the checks and holds the current event, organization, target role, issuer and actual role-membership rows until the invitation claim, user, credential, password history and audit commit. The final check uses the locked membership rows. A concurrent revocation that committed during password preparation prevents account creation; a revocation started after the final locks waits for this transaction to finish. Future access for an existing account still follows current role policy.

The redemption audit records the issuance ID, issuer ID, approved permission set and payload hash. A hash is an integrity binding; it is not a signature, professional approval or proof of external delivery. No schema migration was needed. The PostgreSQL implementation uses row-level shared locks with tenant-scoped parameters and the existing `_UserRoles` relation. See [PostgreSQL row-lock documentation](https://www.postgresql.org/docs/current/explicit-locking.html).

## What administrators and recipients do

| Situation | Required action and source of information |
| --- | --- |
| A current invitation has a valid recorded decision | Recipient enters their name, optional phone and a new password through the private link supplied through the organization's authorized delivery process. The service determines tenant and role. |
| Older link has no issuance record | An administrator uses Settings → Users → Invitations → Replace invitation. Choose a role from the current authorized options and explain the business reason. Do not fabricate an issuer or backfill an approval. |
| Role permissions or issuer authority changed | An authorized administrator reviews the intended access and records a replacement. Permission decisions come from the organization's access owner. |
| Recorded replacement | Stoquify generates the new event/reference and token, preserves history and invalidates the previous link. The current application has no production invitation transport; recording does not send email. |
| Account already exists | Use sign-in or the organization's account-management process. Cancelling an invitation does not deactivate an account. |
| Rejected or uncertain registration | The form retains entered details and an actionable error. Reload the current link or sign in if an earlier request may have completed. A server-invalidated link cannot be submitted again from the retained form. |
| Page is not interactive | Credential inputs and submission remain disabled until hydration. The native fallback uses POST. With JavaScript disabled, the authentication layout gives EN/FR reload guidance outside the streamed content. |
| Rate limit | Wait for the genuine cooldown. Do not rotate headers, reset counters or change the limiter to complete verification. |

IDs, issuer evidence, revisions, hashes and timestamps are generated from actual application records. The user supplies the recipient, intended role and business reason; administrators obtain authority from the organization's existing access assignment. No customer activation or X1 decision is implied.

## Verification and findings

- Focused regression: **183/183 tests in 11 suites**, `evidence/invitation-provenance-after-03.json`; chunk `4fbb61`, 7.185 seconds. Typecheck passed (`55154/2ec36e`), seven-file lint passed (`5abad4`), scoped diff check passed (`0b9f67`).
- Actual isolated PostgreSQL: **22/22**, `invitation-provenance-de46da02-030.json`; chunk `aa2818`. Covers simultaneous redemption, credential/audit rollback, revoked issuer/membership/role/organization, locks during final commit, missing/corrupt/foreign/duplicate evidence, expiry and bilingual previews. Source remained stable and unrelated authority unchanged; external fetch was blocked. The first attempt `b99a861c-9fa` passed seven checks then encountered an unexpected 400. Its random hexadecimal password generation could violate the existing repeated-character rule; the corrected driver separates byte pairs and retains the failed result.
- Browser generations are retained, including failed paths. First `f563e8c1-e48` exposed a native GET fallback and hidden action errors. Two synthetic accounts were disabled, credential passwords cleared and sessions expired (`invitation-provenance-v1-containment.json`); invitation and audit history remain.
- `32d9de23-9db` found no-JavaScript guidance hidden inside streamed content; it was moved into the existing authentication layout. `fc9651b5-cf2` verified that guidance and account creation/sign-in, but the changed-authority error was hidden by the refreshed invalid-link state. The error/draft precedence was corrected and covered in EN/FR component tests.
- Latest `3d94908e-01e`: **0/2 complete browser journeys**. Both reached the real invitation rate limiter during registration. Do not label these journeys passed. Read-only inspection at 07:10:08 UTC found a six-request bucket blocked until **07:33:11.574 UTC (09:33 Paris)**. No counter was reset. Native POST/disabled-input and no-JavaScript checks ran, but final changed-authority/replacement runtime proof remains pending.

The original local browser fixture generations v1/v2 have consumed happy links. v1's affected accounts are disabled. v3's happy links remain unconsumed after rate limiting and can be reused after the cooldown; inspect state first. The final browser must run one locale per rate-limit window: the complete locale journey performs three real redemption attempts, while the existing per-IP budget is five per 15 minutes. Do not disguise additional attempts as different client IPs.

## Review responsibilities and remaining work

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend/API | One service owns evidence and authority; the existing public action and route remain thin callers. No parallel identity system. |
| Database/migrations | Real transactional race/rollback/row-lock proof; existing schema and relation mapping retained. No migration or destructive backfill. |
| Security/IAM/privacy | Tenant/token/issuer/permission checks and credential-in-URL correction implemented. Actual password policy remains in force. Broader proxy-header trust and platform authentication review remain open. |
| Frontend/UX/localization | Existing auth shell, inputs and feedback retained; EN/FR recovery and hydration states implemented. Final full browser recovery pending cooldown. |
| QA/release | Passing focused tests and PostgreSQL checks; failed browser receipts preserved. No full-build pass: historical standalone Windows symlink failure remains separate. |
| SRE/operations | Locks are limited to final credential commit after password preparation. No production performance claim. Queue stays disabled; history/operator UI remains open. |
| Product/support | Legacy links require an explicit current access review; recipient and administrator responsibilities are clear. |
| Audit/records | Redemption links to the recorded issuance decision; old events, attempts and accepted records retained. No legal-signature claim. |
| SaaS packaging | No entitlement, subscription or billing change. |
| Finance, reconciliation, ledger/close, statutory/country rules | Not applicable to these writes: no monetary, posting, tax or country-pack behavior changed. |
| POS/offline, purchasing/AP, HRIS/payroll | Not applicable: no domain records or operations changed. Future account permissions remain subject to their existing guards. |
| Analytics and AI/agents | Not applicable: no metrics, model or agent behavior changed. |

Keep the production sender absent until the previously requested implementation-only approval is answered. An approval to add disabled code would not authorize sending email. Delivery/decision history, operator recovery, actual screen-reader/native-zoom/contrast verification, downstream onboarding and the rest of the 206-workflow inventory remain open.

Roll out these service, form, authentication-layout and translation changes together after ordinary review and remaining verification. Preserve all evidence. Do not restore the permissive legacy redemption path as a workaround. No deployment, production migration, live delivery, customer activation or X1 clearance was performed.


## Final EN/FR invitation recipient proof — 2026-09-06, source v18

English browser671da972-87e and French browserfaf0e1ef-d62 each passed1/1 complete supported recipient journey. Both used the real local application and retained synthetic v3 fixtures, matching current source v18. Account creation/sign-in, interrupted submission recovery, no-JavaScript safety, expired/unrecorded links, changed-role rejection with preserved draft, and a current authorized replacement were verified. Each locale ran in an ordinary permitted rate-limit window; no counters, headers or limiter policy were changed. Existing queue records remain unsent with zero attempts; unrelated authority stayed unchanged. Eighteen actual screenshots are bound in evidence/invitation-recipient-final-receipt.json. Earlier failed browser receipts remain historical evidence and are not relabeled.

The v3 English and French successful links are now consumed; never reset/replay them. Current read-only history also passed EN/FR under the separate invitation-history receipt. Production transport and operator mutation controls remain open after the earlier approval rejection; no answer to the implementation-only question is assumed. Native zoom, actual screen reader, comprehensive contrast, full downstream onboarding and the remaining platform inventory are still incomplete. No full-build/release/X1/professional approval is claimed.

Next engineering work is ID-05 password change, documented in lanes/environment/PASSWORD_CHANGE_REVIEW.md. The goal remains active.
