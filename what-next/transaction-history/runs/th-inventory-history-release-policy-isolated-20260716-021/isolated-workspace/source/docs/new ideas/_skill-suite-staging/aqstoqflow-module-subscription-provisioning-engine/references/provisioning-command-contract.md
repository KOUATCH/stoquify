# Provisioning Command Contract

## Required Command Envelope

- command and organization identifiers
- actor and authenticated tenant context
- command type and schema version
- package and package-version identifiers
- expected aggregate version
- reason code and optional approved override
- requested and effective timestamps
- idempotency key and canonical input hash
- causation and correlation identifiers

## Required Results

- accepted, rejected, duplicate, conflict, or failed status
- stable reason code
- prior and next subscription versions
- generated grants, constraints, and lifecycle-event identifiers
- projection version and reconciliation state
- safe retry guidance

## Core Commands

`create_subscription`, `change_package`, `start_trial`, `expire_trial`, `schedule_change`, `suspend`, `resume`, `cancel`, `reactivate`, `grant_override`, and `revoke_override`.
