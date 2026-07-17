# Release Secret Preflight

Generated: 2026-07-11T20:42:14.431Z
Mode: `fail`
Status: `conditional`

## Summary

- Checks ready: 2/6
- Release enforcement: off
- Blockers: 0
- Warnings: 4
- Secret value printed: no

## Checks

| Status | Check | Variable | Remediation |
| --- | --- | --- | --- |
| blocked | public_identity_secret_present | PUBLIC_IDENTITY_ABUSE_HASH_SECRET | Configure the dedicated public-identity HMAC secret in the production environment. |
| blocked | public_identity_secret_strong | PUBLIC_IDENTITY_ABUSE_HASH_SECRET | Use a random secret with at least 32 characters and 12 distinct characters. |
| blocked | public_receipt_secret_present | AQSTOQFLOW_RECEIPT_TOKEN_SECRET | Configure the dedicated public-receipt signing secret in the production environment. |
| blocked | public_receipt_secret_strong | AQSTOQFLOW_RECEIPT_TOKEN_SECRET | Use a random secret with at least 32 characters and 12 distinct characters. |
| ready | dedicated_secrets_are_distinct | n/a | Use separate random values for public-identity hashing and public-receipt signing. |
| ready | dedicated_secrets_are_not_auth_secrets | n/a | Do not reuse AUTH_SECRET or NEXTAUTH_SECRET for either dedicated public-boundary secret. |

## Safety

- This preflight reads secret values only from the process environment.
- It never writes, hashes, serializes, or prints secret values.
- Local and preview environments report missing production secrets without blocking; release mode fails closed.
