# Decision requested: invitation email transport

The queue, authority checks, immutable message inputs, retry controls and actual EN/FR recording journey are implemented and tested. There is no production transport. Calling `runUserInvitationDeliveryWorker` without an explicitly supplied adapter returns `disabled` before reading or changing the queue.

Automatic approval review rejected the proposed live sender on 2026-09-06: adding a Resend integration could transmit invitation links and recipient data to an external provider, which was not specifically authorized and conflicted with the no-live-email verification scope. Neither rejected file was created. The internal-only alternative has been applied and verified with synthetic, in-memory delivery receipts.

## Concrete proposal for approval

Authorize implementing a **disabled-by-default** adapter for the existing Resend provider, with these fixed boundaries:

| Item | Proposed behavior |
| --- | --- |
| Destination | HTTPS POST to `https://api.resend.com/emails` only |
| Data sent | Approved sender address, invited colleague's email, invitation subject and text containing the current private invitation link |
| Preconditions | Current tenant/issuer/role/token checks, a committed queue record, configured provider credential and explicit environment enablement |
| Duplicate protection | Same stored request key and identical message bytes; stop automatic retries at 23 hours from the first attempted dispatch |
| Result | Provider acceptance stored separately from recipient delivery and invitation acceptance |
| Failure | Bounded timeout, no credentials/token in logs, uncertain outcomes retained for safe retry/review |
| Verification | Isolated adapter tests first; no real email as part of implementation approval |

Approval to implement the adapter would **not** authorize enabling it in production, sending an email, or selecting a real customer cohort. A live test would separately need an explicitly authorized sender, recipient and environment. Those values must come from the organization/environment owner, not be invented by the assistant.

The immediate question is whether the user authorizes adding this disabled-by-default Resend adapter. Work on redemption provenance, administrative recovery and other platform workflows can continue independently.
