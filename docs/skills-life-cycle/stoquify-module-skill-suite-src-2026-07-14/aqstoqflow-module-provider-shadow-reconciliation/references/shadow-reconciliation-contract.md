# Provider Shadow Reconciliation Contract

## Required Records

- Provider account and adapter configuration
- Immutable provider event inbox
- Normalized provider fact
- Internal subscription command and result
- Provisioning command and result
- Effective entitlement snapshot
- Reconciliation run and exception
- Retry and dead-letter state

## Drift Classes

- unknown provider customer or price
- package/version mismatch
- amount, currency, interval, or tax mismatch
- status or period mismatch
- missing, duplicate, delayed, or reordered event
- internal command without provider evidence
- provider fact without an approved internal command
- entitlement projection inconsistent with internal subscription truth

Shadow mode may create evidence and operator queues. It must not write effective access state.
