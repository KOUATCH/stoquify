# Audit And Override Contract

## Required Lifecycle Envelope

- event identifier and aggregate sequence
- organization and module identifiers
- actor, approver, and subject identifiers
- event type, prior state, next state, and reason code
- policy, package, and surface-registry versions
- causation, correlation, command, and idempotency identifiers
- occurred, accepted, effective, expiry, and revoked timestamps
- redacted payload or payload fingerprint
- previous-event hash, event hash, and optional signed checkpoint
- retention class and deletion/legal-hold state

## Override States

`requested -> approved -> active -> expired`

Alternative terminal transitions are `rejected` and `revoked`. Approval cannot activate an override when its scope, policy version, tenant, or requested authority changed after review.
