# Invitation register and issuance — 2026-09-06

This is a further partial correction of ID-03 and the input boundary of ID-04. It does not complete invitation delivery or the all-workflows assignment. Review the application at `/en/dashboard/settings/users` and `/fr/dashboard/settings/users`.

## Findings and corrections

| Finding and consequence | Implemented correction | Evidence scope |
| --- | --- | --- |
| `getOrgInvites` caught all failures and returned `[]`; a failed/denied read looked like an empty register. | Structured successful data carries rows and a check time; failures carry no rows. The page shows unavailable counts, a separate error and an explicit refresh action. | Action tests and actual failed-request/recovery browser trace. |
| Stored PENDING records remained visually pending after expiry. | The service derives EXPIRED at read time, retaining stored status without mutating the record. Existing ACCEPTED/CANCELLED statuses stay unchanged. | Focused tests and actual local PostgreSQL records. |
| The list omitted role, expiry and freshness, used English dates and called acceptance “Success.” | EN/FR searchable records show the role, record creation, link expiry, check time and explicit acceptance status. UTC is displayed to avoid an implicit timezone. Pending is informational, not delivery or approval evidence. | EN/FR component checks and application screenshots. |
| An empty role list crashed on `selectedRole.value`. The dialog had no title, no email label, an inert Save button and no duplicate guard. | Named shared dialog, labeled inputs, native role selection, explicit unavailable-role guidance, one meaningful submit action, pending guard and retained drafts. | Component and browser checks. |
| `sendInvite` normalized input before its error boundary and trusted TypeScript for remote input. | Server action and service validate bounded email/role input; only server identity and stored role descriptions establish scope/meaning. Browser organization/name fields are ignored. | Malformed input, authorization and service tests. |
| Redemption did not bound optional profile fields or safely handle a missing whole input object. | Shared service schema bounds token, password and profile fields before lookup/hashing, with public abuse controls still applied to invalid requests. | Focused malformed/oversized input tests and prior redemption regressions. |
| Actual browser submission required fresh authentication, but signing in did not create the separate assurance evidence. | The form invokes the existing password step-up action when required, clears the password after every attempt/close, retains email/role, announces confirmation and requires explicit resubmission. Permissions are checked again on submission. | Existing step-up tests and real browser step-up followed by permission denial. |

Successful issuance wording means the transaction returned successfully and the provider accepted the email request. It does not claim recipient delivery or acceptance. No successful live issuance or real email is claimed by this batch.

The current invitation-read contract has one production caller: the users/settings page. Its client refresh invokes the same action with server-derived organization scope. Search text survives a failed refresh and retry. Other user-directory workflows on that page remain under review; changing invitation reads does not certify user counts, exports or user administration.

## Design and interaction mapping

Use the existing dashboard/product tokens, shared Button/Input/Label/Dialog/Badge, typography and radii. The portalled dialog gets the established dashboard token scope with a solid surface and fixed positioning; its inherited decorative backgrounds are suppressed. This avoids a new theme and preserves the shared overlay/focus implementation.

Brand treatment identifies the primary action. Informational treatment represents awaiting acceptance, recorded provider acceptance and identity confirmation. Accepted records use success treatment. Missing roles use attention; actual errors use danger. Every state also has explanatory text. Identity verification is not invitation authorization.

The invitation list uses a responsive list with labeled record details so long addresses, French role names and expiry dates fit narrow screens. Surrounding user-directory copy and controls are still partly English. Native zoom, actual screen-reader behavior, exhaustive contrast and all directory interactions remain unverified.

## User and operator instructions

| Situation / input | What to do | Owner and source |
| --- | --- | --- |
| Colleague email | Enter the intended colleague's address and check spelling. | Obtain it directly from the colleague or your organization's verified directory. |
| Role | Choose the role intended for the job. Submission checks your current grant authority. | Organization administrator; consult the existing Roles & Permissions settings and the job's actual responsibilities. |
| No roles available | Refresh; ask an administrator to check role setup and your role-read access. Do not invent a role ID. | Organization administrator, current roles and user permissions. |
| Identity confirmation required | Enter your own current password into the confirmation field, then review and explicitly submit the invitation. | The signed-in inviter supplies their own password. Never use the colleague's password or include a password in support evidence. |
| Identity confirmed, invitation denied | Ask an administrator to review invitation and role-assignment rights; password confirmation does not grant those rights. | Current server permissions and selected role's permission set. |
| Outcome uncertain | Keep the entered email/role, close the dialog and refresh Invitations before another send. Existing delivery ambiguity is not yet repaired. | Invitation register plus restricted provider records when available; support must reconcile uncertainty before reissue. |
| Existing pending invitation | Inspect its status and expiry. Do not repeatedly submit it. | Current invitation register. |
| Existing account | Review that account rather than issuing another invitation. | Users directory and administrator. |
| Register unavailable | Refresh Invitations. If it persists, provide the time, organization and safe error reference to support. | Application/support logs; never share the opaque invitation token publicly. |
| Expired or cancelled link | Ask an authorized administrator for a current invitation through the supported issuance path. | Current invitation record and administrator. Administrative cancellation/reissue UX remains incomplete. |

No schema or migration changed in this batch. Release the action/read contract and users-page consumers together. Existing invitations and accounts are retained; expiry is a display/read derivation. Roll back the coordinated code set if needed, without resetting invitation status or credentials.

## Remaining issuance engineering

1. The provider call still executes inside the invitation transaction. A provider acceptance followed by transaction failure can leave a useless emailed link; timeout/unknown outcomes and retry are not durable. Move delivery to an invitation-specific consumer of existing BusinessEvent/BusinessEventOutbox facilities, with immutable payload binding, bounded leases, provider idempotency, explicit unknown outcome and operator recovery. Do not treat provider acceptance as recipient delivery.
2. `Invite` retains no issuer identity or permission snapshot. Persist the actual inviter, tenant, role/permission decision, issue revision and token binding. Recheck appropriate current authority and compatibility during redemption. Existing records must be explicitly handled without inventing their original approver or silently granting expanded roles.
3. Current issuance audit uses the separate best-effort helper. Issue/change/audit/outbox intent need one durable transaction. Reissue must compare the current revision and retain earlier evidence; duplicate recipients/concurrent reissue need real PostgreSQL tests.
4. The current page exposes an invitation entry to users who can read the directory but may lack invitation authority. A service-owned options/read model should distinguish unavailable authority, failed role loading and an actually empty grantable-role catalogue. Current server denial remains enforced.
5. Add authorized administrative retry/cancel/reissue history, provider outcome reconciliation and safe recovery. Complete successful isolated provider-adapter proof without transmitting real messages; real delivery requires an authorized recipient/provider target.

These are engineering requirements, not a request for a signature or a reason to stop ordinary implementation. Existing accountant-client invitation workers and business outbox models provide patterns, but their event payload, attribution and consent contracts cannot simply be reused as workspace-user invitations.

## Review responsibilities

| Responsibility | Finding / verification / applicability |
| --- | --- |
| Architecture, backend and API | Service-owned register and validation; one current read consumer updated. Durable delivery remains open. |
| Database and migration | Derived expiry does not mutate records; isolated actual reads and original-authority hashes. No migration. Issuer/reissue state still missing. |
| Security, IAM and privacy | Authenticated tenant and role checks retained; bounded public input; token-free read projection; existing password step-up. No whole-system security claim. |
| Frontend, workflow UX, accessibility and localization | EN/FR invitation controls, named dialog, keyboard recovery, draft retention and narrow layouts. Full directory/assistive-technology audit remains open. |
| Product, SaaS and operations | Distinguish pending, provider acceptance, recipient delivery and user acceptance. No packaging/pricing changes. |
| Quality and release | Focused tests, current local runtime and failed attempts retained. Full build remains historically failed at Windows standalone symlink packaging. |
| SRE, providers and events | Development observations only; outbox, unknown delivery and replay design above remains required. |
| Audit and records | Existing issuance audit is not atomic; no fabricated issuer evidence. Existing redemption audit remains transactional. |
| Finance, reconciliation, ledger and close | No monetary calculations/postings changed; access can affect who works in those domains, so role authority remains mandatory. |
| Statutory/country packs, purchasing/AP, HRIS/payroll, POS/offline | Not applicable to this patch's domain behavior: no statutory configuration, employment, payment, procurement or offline operations change. |
| AI/agents | Not applicable: no agent capability or approval policy is changed. |

Graph hints checked: actions `users_getorginvites_getorginvites` and `users_sendinvite_sendinvite` (community 0); components `dashboard_tables_invites_tsx` (163), `forms_users_userinvitationform_tsx` (182); app users page (174), client (175). Important callers and boundaries were revalidated against current source.

Exact current receipts, source snapshot, screenshots and failed attempts are bound by `evidence/invitation-register-receipt.json` after verification finishes. This guide does not claim all workflows complete or X1/release clearance.


## Final verification binding

109/109 tests in eight suites passed (937dff,4.759s); final typecheck passed (session2679/e19b83); twelve-file lint passed (7e495b); scoped diff check passed (072ba1). Real PostgreSQL2/2 (lanes/environment/invitation-register-postgres-48b28725-c78.json) and actual EN/FR browser2/2 (lanes/environment/invitation-register-browser-8428c4a8-011.json), source stable and original authority unchanged. Ten screenshots. Canonical receipt: evidence/invitation-register-receipt.json.

Reader-route observations:3291msEN,4923msFR, local development only. Final screenshots and original failed attempts are listed in the canonical receipt. All unchanged-source checks are bound to source v13.
