# Invitation cancellation and reissue — source v16

Evidence date: 2026-09-06. This continues ID-03 within the all-workflows implementation. It supplies an administrative recovery path before redemption is tightened against issuance evidence. It does not complete the whole invitation lifecycle.

## Delivered

The existing EN/FR invitation register now offers **Replace invitation** and **Cancel invitation** to appropriately authorized administrators. Read-only users do not receive these controls. Existing grantable-role options determine presentation; server actions and services independently enforce fresh authentication, current tenant/identity, stored issuer status and the explicit grant ceiling.

Each change requires a short reason and the revision displayed when its dialog was opened. A later background refresh cannot silently substitute another revision into an open review. Conflicting requests are rejected and the administrator can discard that review, refresh and start again. Uncertain retries retain the original request reference and decision details.

Replacement checks the administrator's authority over both the current invitation role and the proposed role. It rotates the private token, stores a new issuance/permission snapshot and delivery request, records the reason, and preserves old events/audits. Previous pending/failed/deferred deliveries are cancelled. Accepted and in-flight provider receipts remain historical evidence. Accepted invitation records cannot be replaced.

Cancellation changes the reviewed invitation and stops its unstarted/retryable queue work in one serializable transaction with a decision event and mandatory audit. It cannot recall mail, erase delivery history or deactivate an existing account. Accepted invitations must be handled through account management instead. Replaying an earlier cancellation returns that decision; it does not cancel a subsequently issued replacement. The confirmation therefore refers specifically to the reviewed link and tells the administrator to check for newer invitations.

A legacy pending invitation can now be explicitly replaced by a currently authorized administrator. That creates a real new decision record rather than inventing an original issuer or signature. Requiring this evidence at redemption is the next implementation step, not a completed claim here.

## What to do

1. Open `/en/dashboard/settings/users` or `/fr/dashboard/settings/users`, select Invitations and find the colleague by email.
2. Use **Replace invitation** when a new link or a corrected role is needed. Review the current email, select an available role and explain the reason. The email cannot be changed inside replacement; a different recipient needs a separate invitation.
3. Use **Cancel invitation** when the reviewed link should stop creating an account. Explain why. Existing accounts and previously sent messages are unaffected.
4. Confirm your own password if requested, then explicitly submit. Password confirmation alone does not make the change.
5. If another review changed the invitation, discard the stale review and refresh the register. Never copy a revision or request reference from an unrelated invitation.

The administrator supplies the business reason and intended role. Role choices come from the organization's existing role definitions and the administrator's actual grant authority. Invitation ID, revision, decision time, actor and request reference come from Stoquify; the user does not invent them.

Email delivery remains disabled. Recording a replacement does not send it. The pending sender implementation decision remains [INVITATION_DELIVERY_TRANSPORT_REVIEW.md](INVITATION_DELIVERY_TRANSPORT_REVIEW.md); an asynchronous approval question has already been issued. No answer or authorization has been assumed.

## UI and state corrections found by actual use

The first EN/FR run passed English and exposed a French cancellation using an older register revision immediately after a successful replacement. The server rejected it correctly. Management dialogs now wait for the parent register's authoritative refresh before close controls become available.

The same run exposed long French recovery text exceeding the dialog's internal width. Dialog children/forms now allow shrinking, and the recovery button wraps. The browser checks internal dialog scrolling as well as page width. A second run exposed an enabled-looking close icon during the refresh wait. A small optional `closeDisabled` property was added to the existing shared Dialog; its default is unchanged. This form uses it, announces refresh progress and disables both close controls while busy. Other callers retain their previous behavior.

After cancellation, focus returns to the relevant register row because its cancellation button is now disabled. Replacement returns focus to its still-available trigger. Existing dashboard theme, information/warning/destructive meanings and shared fields are retained. No new design system was introduced.

## Verification

The source-bound receipt is `evidence/invitation-management-receipt.json`. Real PostgreSQL checks cover competing replacements, cancellation versus replacement, atomic rollback, idempotent replay, foreign/accepted records, replacement of a legacy pending link and retention of earlier simulated delivery receipts. Original authority and unrelated fixtures remain unchanged.

Actual EN/FR application tests cover real password assurance, recording, a deliberately lost post-commit response, a competing second review tab, stale-review rejection and recovery, replacement, cancellation, current register status, focus entry/feedback/return and widths 390/768/1440. Every created delivery row has zero attempts. Isolated database adapter receipts are simulations and are never described as actual email delivery.

The first browser attempts (`28dd7341-800`, `b0591467-187`) each passed English and failed a French recovery/close check; their records and fixtures are retained. No failed run was overwritten or used as completion evidence. The later corrected runs are recorded separately.

Scoped repository scans map the new cancellation action to Settings and its existing grant-authority guard, with no module-surface gaps or direct database/service-boundary violations in the six affected edge files. This is a scoped result; it does not certify every application surface or promote observe mode into enforcement.

## Rollout, recovery and remaining work

No schema migration, live deployment, billing change or X1 approval occurred. Ship the management service/action, revision read model, form/table/page wiring, optional shared-dialog property and EN/FR messages together. Preserve invitation/event/outbox/audit records. Do not revert to the old synchronous sender while queues or uncertain outcomes exist.

The owned local server remains on port 3107, session 64020, with a synthetic sender address. Earlier test invitation generations remain in their resulting states; do not reseed or reset them. Accepted legacy redemption fixture accounts remain untouched.

Next: enforce issuance permission revisions and current issuer authority at redemption, including races during password hashing; distinguish legacy/missing evidence and direct administrators to the now-working replacement path; provide delivery/decision history and operator review UI. The production sender remains absent pending the already-requested implementation approval. Broader directory localization, actual screen-reader/native zoom/contrast assessment and full build/release assurance remain open.

Architecture/backend/data, IAM/privacy, workflow/UX/localization and quality/operations lenses apply directly. Commercial access and existing entitlements are preserved. Finance/statutory/payroll/AI/offline lenses are not applicable to these bounded invitation changes because no corresponding business records or decisions change. No professional or release certification is claimed.


## Final verification binding

151/151 tests in ten suites (681de6,6.392s); typecheck (session47637/6f40a8); 18-file lint (594ef5); scoped diff check (681494) all passed. Real PostgreSQL15/15 (lanes/environment/invitation-queue-postgres-6fe45358-008.json); final EN/FR management browser2/2 (lanes/environment/invitation-management-browser-e59ab633-d9e.json); source stable and unrelated authority unchanged. Supplemental reader/role-options browser2/2 (lanes/environment/invitation-options-browser-6420dc4f-ed4.json) proves new controls absent for readers. Its code bindings remain current; only EN/FR cancellation receipt wording changed afterward, outside those read-only interactions. Scoped module/service-boundary scans found zero gaps/active violations (042e82).
