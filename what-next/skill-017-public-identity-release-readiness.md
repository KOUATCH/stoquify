# Public Identity Abuse Readiness Gate

Generated: 2026-07-27T05:34:19.674Z
Mode: fail
Status: blocked

## Summary

- Checks ready: 14/15
- Blockers: 1
- Warnings: 0
- Release secret enforcement: on
- Secret configured: no
- Secret value printed: no

## Checks

- ready: schema_model
- ready: schema_no_raw_identifiers
- ready: migration_table
- ready: migration_unique_bucket
- ready: hmac_hashing
- ready: serializable_transactions
- ready: conflict_retries
- ready: subject_and_ip_dimensions
- ready: registration_limit
- ready: invitation_limit
- ready: reset_request_limit
- ready: reset_completion_limit
- ready: otp_limit
- ready: server_derived_request_context
- blocked: release_hash_secret

## Blockers

- release_hash_secret

## Warnings

- None

## Safety

- This gate is static and does not mutate abuse buckets or identity data.
- It never prints secret values or raw public identifiers.
