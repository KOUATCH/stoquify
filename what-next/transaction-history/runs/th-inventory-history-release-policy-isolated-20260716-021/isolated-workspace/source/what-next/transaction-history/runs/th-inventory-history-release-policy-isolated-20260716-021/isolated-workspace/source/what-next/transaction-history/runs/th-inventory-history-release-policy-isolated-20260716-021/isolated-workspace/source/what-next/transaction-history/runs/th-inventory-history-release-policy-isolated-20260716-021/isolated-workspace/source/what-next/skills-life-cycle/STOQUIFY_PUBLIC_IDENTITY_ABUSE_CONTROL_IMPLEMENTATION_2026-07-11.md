# Stoquify Public Identity Abuse Control Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-public-api-abuse-boundary`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-release-evidence-ratchet`

## Scope

Complete the residual public-identity work identified by the preceding UploadThing abuse-boundary pass. The selected boundary covers custom public registration, invitation redemption, password-reset request and completion, and email OTP verification.

The implementation had to be durable across application instances, enumeration-resistant, non-exposing, and independent of client-supplied identity or tenant context.

## Implemented Controls

### Durable Abuse Buckets

Added `PublicIdentityAbuseBucket` and migration `20260711133000_public_identity_abuse_limits`.

The table stores only:

- operation/dimension scope;
- HMAC subject hash;
- window start and request count;
- optional block expiry;
- lifecycle timestamps.

It does not persist raw email addresses, invitation tokens, reset tokens, user IDs, or IP addresses. A unique `(scope, subjectHash)` key supports deterministic distributed counters.

### Operation Policies

- Registration: 3 requests per hour, then a one-hour block.
- Invitation redemption: 5 requests per 15 minutes, then a 30-minute block.
- Password-reset request: 3 requests per 15 minutes, then a 30-minute block.
- Password-reset completion: 5 requests per 15 minutes, then a 30-minute block.
- Email OTP verification: 5 requests per 15 minutes, then a 30-minute block.

Each workflow consumes a subject dimension and, when a valid server-derived address is available, a separate IP dimension. Active blocks are not extended by repeated requests.

### Persistence and Failure Semantics

- Counters are consumed inside serializable Prisma transactions.
- Unique-key and serialization conflicts (`P2002`, `P2034`) are retried up to three times.
- Exhausted conflicts become a non-exposing `DATABASE_CONFLICT` error.
- Other persistence failures become a non-exposing `DATABASE_UNAVAILABLE` error.
- Missing or undersized hashing secrets fail closed with status 503.
- HMAC keys use `PUBLIC_IDENTITY_ABUSE_HASH_SECRET`, with approved auth-secret fallbacks, and require at least 32 characters.

### Service-Owned Enforcement

Abuse checks run in `services/users/user-identity.service.ts` before password hashing, identity lookup, token lookup, or write transactions.

The password-reset request path preserves its generic HTTP 200 response when throttled, preventing user-enumeration differences. Registration, invitation redemption, reset completion, and OTP verification return generic rate-limit failures without exposing account, token, or database details.

### Server-Derived Request Context

Added `lib/security/public-request-context.ts` to derive the client address from server request headers. It normalizes valid IPv4 and IPv6 candidates and rejects malformed or oversized values.

The following public actions now forward this context into the service boundary:

- `actions/auth.ts`
- `actions/users/createUser.ts`
- `actions/users/createInvitedUser.ts`
- `actions/users/sendResetLink.ts`
- `actions/users/verifyOtp.ts`
- the public reset path in `actions/users/updateUserPassword.ts`

### Release Evidence Ratchet

Added `scripts/public-identity-abuse-gate.js` and its regression tests. The gate checks schema, migration, HMAC use, serializable transactions, conflict retries, subject/IP dimensions, all five operation integrations, all six action seams, and release-secret readiness.

Package commands:

- `npm run public-identity:abuse:gate`
- `npm run public-identity:abuse:gate:release`

The local gate is part of `npm run policy:gates`. Release mode blocks when no approved 32-character secret is configured and never prints secret values.

## Generated Evidence

- `what-next/public-identity-abuse-readiness.md`
- `what-next/public-identity-abuse-readiness.json`

Latest result: 15/15 checks ready, 0 blockers, and 1 local-only warning for the absent release secret.

## Verification

Passed:

- `npx prisma validate`.
- `npx prisma generate --no-engine` for generated model types.
- Focused Jest: 5 suites, 29 tests.
- Static gate Jest: 1 suite, 3 tests.
- Focused ESLint across implementation, action, test, and gate files.
- `npm run typecheck` with no diagnostics.
- `npm run public-identity:abuse:gate`: 15/15 ready, 0 blockers.
- `npm run error:boundary:fail`: 0 active unsafe findings.
- `npm run policy:gates`: complete chain passed.
- The policy chain applied migrations to its dedicated non-production payroll immutability database and passed 14/14 forbidden mutation checks plus 3/3 allowed lifecycle checks.
- Scoped Git whitespace and artifact encoding checks.

The standard `npx prisma generate` command remains affected by a Windows file lock on `node_modules/.prisma/client/query_engine-windows.dll.node` and fails at the final rename with `EPERM`. Schema validation, no-engine generation, typecheck, focused tests, and database-backed policy verification all passed. This is an environment-level client refresh issue, not a schema diagnostic.

## Non-Claims and Residual Risk

- The new migration was not applied to a production database.
- Production must configure an approved 32-character hashing secret before the release gate can pass.
- The deployment proxy must strip untrusted forwarded-address headers and set the canonical client address. Application parsing cannot establish proxy trust by itself.
- Abuse buckets currently have no retention cleanup job. Expired rows remain reusable and correct, but table growth needs a bounded, observable cleanup policy before large-scale operation.
- Rate limits are intentionally fixed policy constants in this slice. Production tuning should use measured false-positive and attack telemetry, with reviewed changes and regression evidence.

## Completion Decision

The durable custom public-identity abuse boundary is implemented and evidence-backed for the selected workflows. The public/API abuse skill can close its currently prioritized implementation sequence once the deployment secret and trusted-proxy requirements are recorded in release operations.

## Next Recommended Skill Slice

Run `stoquify-ledger-close-truth-guardian` next. Public and API boundaries now have the prioritized token, upload, route-guard, and durable identity-throttling controls. The highest-value next move is to verify that every financially material posting and close workflow preserves balanced, source-linked, tenant-scoped, immutable accounting truth and that closed-period controls cannot be bypassed.
