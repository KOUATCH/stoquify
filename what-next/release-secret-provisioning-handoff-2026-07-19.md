# Release Secret Provisioning Handoff - 2026-07-19

## Decision

Production release is blocked on secret provisioning, while local development remains conditional. No secret values were generated, stored, hashed, serialized, or printed.

## Required Production Variables

| Variable | Purpose | Current release status |
| --- | --- | --- |
| `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` | Public identity abuse-bucket HMAC | missing |
| `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` | Public receipt access-token HMAC | missing |
| `AQSTOQFLOW_HISTORY_CURSOR_SECRET` | Transaction-history cursor HMAC | missing |

Each value must be a dedicated random secret with at least 32 characters and at least 12 distinct characters. The three values must be different from each other and must not reuse `AUTH_SECRET` or `NEXTAUTH_SECRET`.

## Verification

- `npm run release:secrets:preflight`: conditional locally, 2/8 checks ready, 0 blockers, 6 warnings.
- `npm run release:secrets:preflight:release`: blocked as expected, 2/8 checks ready, 6 blockers.
- Separate release-mode evidence:
  - `what-next/release-secret-preflight-release.md`
  - `what-next/release-secret-preflight-release.json`

## Operator Checklist

1. Generate three independent cryptographically secure secret values outside the repository.
2. Add them to the production deployment provider secret store.
3. Redeploy with production environment variables injected.
4. Confirm `npm run release:secrets:preflight:release` reports 8/8 ready and prints no secret values.
5. Run `npm run verify:release` in the controlled release environment.

Reference runbook: `docs/operations/runbooks/release-secret-provisioning.md`.
