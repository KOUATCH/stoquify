# Invitation issuance and queue recovery — source v15

Evidence date: 2026-09-06. This is a bounded ID-03 implementation checkpoint in the all-workflows assignment. The complete invitation lifecycle is still open.

## Delivered behavior

The existing users page at `/en/dashboard/settings/users` and `/fr/dashboard/settings/users` now records an invitation and an email-delivery request. The page explicitly explains that email delivery is disabled in this build. It does not claim that a colleague received an email or acquired an account.

`sendInvite` retains its fresh authentication, current server identity, tenant and grant permissions. Its service now also reloads the active, verified, unlocked issuer and current same-tenant roles from the database. Both the submitted server permission context and the current stored issuer must be able to grant the selected role. The role catalogue remains guidance; submission owns the decision.

A serializable transaction stores the invitation, issuance event, delivery request and mandatory audit together. The event captures the issuer, permission snapshot, role snapshot, language and stable email presentation. It stores hashes of the recipient and token, without copying the address or bearer token into the queue. The private invitation record remains the token owner. The worker compares these bindings before constructing the email. No schema migration was needed: the existing business-event and outbox models provide durable storage.

The browser keeps a request UUID for unchanged details across fresh-authentication and uncertain-response retries. A repeated request returns its original result; changing the details under that same reference is rejected. Two different requests for one recipient cannot create two pending invitations. Expired/cancelled invitations can be reissued by the existing issuance path; accepted invitation history is preserved. A complete administrative reissue/cancel interface is not delivered in this checkpoint.

The internal worker uses tenant-scoped queues, unique attempt leases and conditional settlement. It persists the first attempted dispatch before invoking an adapter, preserves identical message content and request reference, and records acceptance only after a receipt and mandatory audit. Stale workers cannot overwrite newer receipts. Changed invitation tokens, expired links, changed role permissions and lost issuer authority prevent dispatch. Unknown outcomes and exhausted retries require review. The default worker is disabled and there is no production adapter.

## Actual authorization limitation

Automatic approval review rejected adding the proposed Resend network adapter because it could transmit invitation links and recipient information to an external destination without specific user authorization. That rejected implementation was not applied through another tool. The safer internal queue/worker implementation has no network sender. The decision needed is described in [INVITATION_DELIVERY_TRANSPORT_REVIEW.md](INVITATION_DELIVERY_TRANSPORT_REVIEW.md).

The tested 23-hour retry ceiling reserves a margin inside Resend's documented 24-hour idempotency retention. This is a design bound for the proposed adapter, not a tested guarantee from a live provider. [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).

## What administrators do

1. Open Settings → Users using a role allowed to invite and assign the target role. Role choices also require the existing role-read permission.
2. Enter the colleague's email and select an available role. Confirm your own password when asked. The password is cleared after verification; recording still requires a separate explicit action.
3. Read the delivery-disabled notice before recording. The confirmation means that the authorized invitation and delivery request were saved. It does not mean an email was sent.
4. If the response is lost, keep the same details and retry. The same browser draft preserves its request reference. Refresh the invitation register before starting a different request. A pending invitation is awaiting acceptance, not proof of delivery.

Recording needs a sender address (`STOQUIFY_USER_INVITE_FROM_EMAIL` or `RESEND_FROM_EMAIL`) and application URL (`NEXT_PUBLIC_BASE_URL` or `AUTH_URL`). The sender should come from the organization's approved sending identity; the URL comes from the environment owner. Only HTTPS is accepted outside loopback development. These settings do not enable delivery. The owned local server uses `invites@example.invalid` and `http://127.0.0.1:3107`; these are synthetic test settings, not production instructions.

## Operations and recovery

Do not run a production sender from this checkpoint: none is installed. Do not clear dead-letter rows, rotate request keys, or replay an uncertain attempt outside its retry window. Once a production adapter is authorized and verified, operator recovery must inspect the original provider receipt/audit before a separate, authorized reissue. That operator UI remains open work.

There is no migration to apply or roll back. An application rollback must not restart the former synchronous invitation sender while queued requests or uncertain delivery outcomes exist. Preserve invitation/event/outbox/audit records, pause invitation issuance and reconcile them first. The queue is durable history; deleting it is not rollback.

Existing users, roles, entitlements, financial records and X1 approvals are unchanged. The local test server was restarted only on its owned port 3107 (session 64020) with the synthetic sender configuration. Original application/prototype servers were untouched.

## Verification and limits

See `evidence/invitation-queue-receipt.json` for exact hashes, commands and results. Tests include real PostgreSQL races, atomic rollback, current-authority rejection, identical retry content, stale-lease fencing, receipt/audit failure recovery and retry-window holds. Delivery adapters in those tests are in-memory simulations; their receipt labels do not certify actual provider acceptance.

Actual EN/FR browser runs use the authenticated application, the existing password verification action and PostgreSQL. They cover recording, post-commit response loss and same-request retry, pending register visibility, focus return and widths 390/768/1440. No real email or recipient account was created. Browser origin interception does not measure arbitrary app-server egress; absence of an invitation transport and zero queue attempts establish the invitation-specific no-send result.

First unit run: 108 assertions passed but report writing hit filesystem EPERM, so command exit was 1. Rerun saved a larger regression set successfully. First PostgreSQL harness run: four checks passed before a new row was not yet due; the local database clock was about 5ms ahead of Node. The harness now explicitly stages only its new synthetic pending rows as due. First browser run: both journeys passed, but the broad authority hash included expected login timestamps; the final comparison excludes `lastLogin`/`updatedAt` while retaining account, credential, role and entitlement fields. All original fixtures remain retained.

Remaining: live adapter approval and implementation; provider/recipient delivery evidence; redemption enforcement of issuance snapshots; legacy pending invitation provenance and revision-safe administrative recovery; delivery status/history UI; wider directory localization; actual screen-reader/native zoom/contrast review; full application build/release assurance. No complete workflow, security certification or X1 clearance is claimed.

## Review lenses

Architecture/backend/data: existing service and business-event boundaries reused; atomic issue and fenced retry behavior tested. IAM/privacy: fresh action authority plus stored issuer/role checks, token-free queue and tenant-scoped processing. UX/localization: honest paused-delivery language, recoverable EN/FR draft and existing dashboard primitives. Quality/operations: source-bound regressions and isolated runtime evidence; live transport and operator recovery remain open. Commercial packaging: existing access and billing behavior are preserved. Finance/statutory/payroll/AI/offline processing: not applicable to this bounded issuance change because no such records or decisions change. These are review responsibilities, not professional certifications.


## Final verification binding

134/134 tests in eight suites passed (b1712e,5.183s); typecheck passed (session32950/a03e48); 12-file lint passed (c067d3); scoped diff check passed (a84c1a). Actual PostgreSQL9/9 (lanes/environment/invitation-queue-postgres-613ce751-ad6.json); actual EN/FR browser2/2 (lanes/environment/invitation-queue-browser-0174b59e-317.json), source stable, original authority unchanged. Five actual screenshots. Receipt: evidence/invitation-queue-receipt.json.
