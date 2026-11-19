# AF05 engagement journey

Updated 20 October 2026. Implementation contract; verification results are recorded in RESULT.md.

## Entry and existing functionality

Open Accountant Access in the existing accounting navigation. Choose **Client mandates** when acting for the client organization, or **Firm engagements** when managing the firm's engagements. Both use the existing route permission. Protected management reads and commands also enforce AF04's current session, firm identity and accounting-module controls.

No new organization, membership, subscription, consent table or delivery worker is introduced. Existing accounts retain their home organization. An accountant from another firm can receive a separate named reviewer mandate from the client, but cannot be assigned as this firm's staff.

## Setup and consent

1. The client owner uses Client mandates to grant the manager a named mandate with signed consent evidence, scope and expiry.
2. The manager prepares a draft for that existing client and chooses a responsible firm member, scope and effective dates.
3. For every worker, the client owner grants a separate named mandate. The firm screen shows missing/expired/revoked consent rather than treating assignment as consent. The screen supplies instructions; it does not send a message to the client.
4. The manager assigns an eligible home-firm member within the engagement and mandate windows and ceilings.
5. The manager explicitly enrolls that member's existing mandate. Enrollment immediately makes the mandate subject to managed restrictions; a draft does not permit managed financial access.
6. Activate the engagement after the required assignment and enrollment exist. Each financial read/review/export continues to apply its own authority rules.

Unlinked mandates retain their existing AF04 compatibility behavior. The UI does not claim that an unlinked consenting accountant has no legacy access merely because enrollment is outstanding.

## Handover and retained work

Before replacement, load the authorized open-work summary. It reuses the existing work desk and requires the requesting manager's current review mandate and permissions. Counts distinguish client-recipient work from accountant-review-team work and disclose partial coverage.

Choose an outgoing assignment, an eligible incoming member with their own current mandate, replacement dates/scope and a reason. Review the consequence dialog, then confirm with fresh authentication. AF04 ends the old assignment and creates the new assignment atomically. The incoming mandate is never transferred from the outgoing person; enroll it explicitly when required.

Requests, responses, findings, recipient ownership, independent-review constraints and original attribution remain with the existing evidence domain. This phase does not reassign client evidence recipients. Use the existing work desk for authorized continuation and the existing domain workflows for recipient changes.

Ended assignments and lifecycle transitions remain visible in management history. Ending an engagement is permanent. Suspension and ending stop managed access without erasing records.

## Renewal, delivery and recovery

The client can revoke named access in the existing mandate register. To renew an active mandate, revoke it and issue a new consent-bound mandate with the intended dates; the firm explicitly enrolls the new grant. Expired/revoked grants do not become active merely because an assignment remains recorded.

New-account invitations retain the existing client-to-accountant direction. The delivery panel separates acceptance from delivery, displays redacted email, attempts, expiry and the next worker retry. FAILED is not ACCEPTED. DEFERRED/DEAD_LETTER needs an operator using existing delivery operations. Refresh instead of creating another invitation. No live provider call is made by this screen.

Consequential commands show their impact before submission. Password confirmation reuses the existing step-up action. An uncertain response preserves the exact command and idempotency key for retry. Stale versions and business denials require refreshed state. A read failure clears private metadata; visibility changes invalidate in-flight reads.

## Boundaries

The new list paginates engagements in pages of 20. Staff and setup-client selectors show at most 100 entries and explicitly label partial coverage. Large-firm selector search is a follow-up usability limit, not a complete portfolio total. The evidence desk retains its own pagination.

No financial posting, approval, filing, payment, AI behavior or statutory scope is expanded. AF06 and later phases remain separate.
