# Stoquify Agent Runtime Credential Rotation Register

**Register:** `stoquify-agent-runtime-credential-response-2026-07-25`  
**Incident scope:** `unsafe-local-browser-report-environment-scope`  
**Gate status:** `BLOCKED`  
**Current blockers:** 31  
**Credential classes:** 15  
**Secret values printed or retained:** No

**Authority source:** `unresolved`  
**Authority attested:** unresolved  
**Release binding:** `unresolved` / `unresolved`

This register records credential classes and evidence references only. It must never contain a credential value, token, password, authorization header, database URL, or environment snapshot.

| Credential class | Purpose | Environment names | Dependent workloads | Disposition | Gate |
|---|---|---|---|---|---|
| `primary-database-credential` | Primary PostgreSQL application and migration access | `DATABASE_URL` | web-application<br>migration-runner<br>agent-reconciler | `UNRESOLVED` | Blocked |
| `payroll-immutability-database-credential` | Payroll immutability verification database access | `PAYROLL_IMMUTABILITY_DATABASE_URL` | payroll-immutability-verifier | `UNRESOLVED` | Blocked |
| `application-auth-signing-secret` | Application authentication and session signing | `AUTH_SECRET` | web-application<br>authentication-service | `UNRESOLVED` | Blocked |
| `legacy-nextauth-signing-secret` | Legacy or compatibility authentication signing | `NEXTAUTH_SECRET` | web-application<br>authentication-service | `UNRESOLVED` | Blocked |
| `google-oauth-client-secret` | Google OAuth client authentication | `GOOGLE_CLIENT_SECRET` | authentication-service | `UNRESOLVED` | Blocked |
| `email-server-credential` | Transactional email server authentication | `EMAIL_SERVER_USER`<br>`EMAIL_SERVER_PASSWORD` | web-application<br>email-delivery-worker | `UNRESOLVED` | Blocked |
| `redis-connection-credential` | Redis cache, rate-limit, or queue access | `REDIS_URL` | web-application<br>background-workers | `UNRESOLVED` | Blocked |
| `public-identity-hmac-secret` | Public identity abuse-protection hashing | `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` | web-application | `UNRESOLVED` | Blocked |
| `public-receipt-signing-secret` | Public receipt token signing | `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` | web-application<br>receipt-service | `UNRESOLVED` | Blocked |
| `history-cursor-signing-secret` | Transaction-history cursor signing | `AQSTOQFLOW_HISTORY_CURSOR_SECRET` | web-application<br>transaction-history-service | `UNRESOLVED` | Blocked |
| `payroll-destination-hmac-secret` | Payroll payment-destination integrity hashing | `PAYROLL_PAYMENT_DESTINATION_HASH_SECRET` | web-application<br>payroll-service | `UNRESOLVED` | Blocked |
| `upload-provider-secret` | Managed upload-provider authentication | `UPLOADTHING_SECRET` | web-application<br>upload-service | `UNRESOLVED` | Blocked |
| `error-monitoring-dsn` | Error-monitoring ingestion authentication | `SENTRY_DSN` | web-application<br>background-workers | `UNRESOLVED` | Blocked |
| `agent-reconciler-credential` | Five-minute Agent Runtime reconciler authentication | `STOQUIFY_AGENT_RECONCILER_SECRET`<br>`STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS` | web-application<br>agent-reconciler-scheduler | `UNRESOLVED` | Blocked |
| `workflow-assurance-webhook-secret` | Workflow Assurance webhook authentication | `STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET` | web-application<br>agent-reconciler<br>alert-endpoint | `UNRESOLVED` | Blocked |

## Required Evidence Per Rotated Credential

- Secret-manager reference
- Rotation owner directory identity
- Rotation start timestamp
- New-version activation timestamp
- Dependent workload restart timestamp
- New-version verification timestamp
- Old-version revocation timestamp
- Old-version rejection timestamp
- Evidence reference
- Security approval reference
- Security review timestamp

A `TEST_ONLY_CONFIRMED` or `NOT_PRESENT_CONFIRMED` disposition still requires a real security owner, review timestamp, evidence reference, and security approval reference.

## Current Blockers

- `authority:ENVIRONMENT_MISSING`
- `authority:SOURCE_SYSTEM_REFERENCE_MISSING`
- `authority:ATTESTATION_REFERENCE_MISSING`
- `authority:ATTESTATION_DIGEST_MISSING`
- `authority:ATTESTED_AT_MISSING`
- `authority:EVIDENCE_SHA256_MISSING`
- `authority:INVALID_AUTH_EVIDENCE_REFERENCE_MISSING`
- `authority:ATTESTED_AT_INVALID_OR_STALE`
- `releaseBinding:ENVIRONMENT_MISSING`
- `releaseBinding:PACKAGE_ID_MISSING`
- `releaseBinding:RELEASE_VERSION_MISSING`
- `releaseBinding:COMMIT_SHA_MISSING`
- `releaseBinding:ARTIFACT_DIGEST_MISSING`
- `releaseBinding:DEPLOYMENT_REFERENCE_MISSING`
- `primary-database-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `payroll-immutability-database-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `application-auth-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `legacy-nextauth-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `google-oauth-client-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `email-server-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `redis-connection-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `public-identity-hmac-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `public-receipt-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `history-cursor-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `payroll-destination-hmac-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `upload-provider-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `error-monitoring-dsn:SECURITY_CLASSIFICATION_UNRESOLVED`
- `agent-reconciler-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `workflow-assurance-webhook-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `register:SECURITY_OWNER_MISSING`
- `register:SECURITY_APPROVAL_REFERENCE_MISSING`

## Decision

Credential response remains blocked. This document is a completion register, not rotation or revocation evidence.
