# Release Secret Provisioning

This runbook owns the production configuration boundary for Stoquify's public identity abuse hashing, public receipt signing, and transaction-history cursor signing secrets. Secret values belong in the Vercel project environment, never in source control, saved evidence, CI output, issue trackers, or chat transcripts.

## Required production variables

| Variable | Purpose | Production rule |
| --- | --- | --- |
| `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` | HMAC pseudonymization for public identity abuse buckets | Dedicated random value, at least 32 characters |
| `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` | HMAC signing for expiring public receipt links | Dedicated random value, at least 32 characters |
| `AQSTOQFLOW_HISTORY_CURSOR_SECRET` | HMAC signing for transaction-history pagination cursors | Dedicated random value, at least 32 characters |

All values must contain at least 12 distinct characters. They must differ from each other and from `AUTH_SECRET` or `NEXTAUTH_SECRET`.

## Provisioning procedure

1. Generate each value independently with a cryptographically secure password or secret generator. A 32-byte random value encoded as Base64 is suitable.
2. In Vercel, open the Stoquify project, then **Settings > Environment Variables**.
3. Add all three variables to the **Production** environment. Do not expose them to Preview or Development unless that environment genuinely exercises the same protected boundary.
4. Trigger a production redeploy. The normal `npm run build` path runs `release:secrets:preflight` before lint or application compilation and fails closed when `VERCEL_ENV=production`.
5. Confirm the build log reports eight ready checks, zero blockers, and `Secret value printed: no`.
6. Run `npm run verify:release` in a controlled release environment that receives the production variable names through the deployment provider or secret manager.
7. Archive the generated non-secret evidence files with the promoted commit:
   - `what-next/release-secret-preflight.md`
   - `what-next/release-secret-preflight.json`
   - `what-next/skills-life-cycle/STOQUIFY_OHADA_LEADERSHIP_RELEASE_EVIDENCE_INDEX_2026-07-11.md`

Local `.env` files are not loaded by the Node release scripts automatically and are not release evidence. Do not copy production values into the repository to make a local command pass.

## Rotation

- Rotate one secret at a time and retain the prior value in the provider's protected history until validation completes.
- Rotating `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` changes bucket pseudonyms and effectively starts new abuse windows. Schedule the change during a monitored period.
- Rotating `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` invalidates previously issued receipt links. Plan reissuance and customer communication before rotation.
- Rotating `AQSTOQFLOW_HISTORY_CURSOR_SECRET` invalidates existing signed transaction-history cursors. Expect users to refresh history pages after rotation.
- The current implementation does not support overlapping old and new keys. Restore the prior provider-managed value and redeploy if validation fails.

## Verification

```powershell
npm run release:secrets:preflight
npm run policy:gates
npm run verify:release
```

The first command is non-blocking outside a release environment and should report `conditional` when production secrets are intentionally unavailable. The final command must run only where the production secrets are injected securely; it must never be satisfied with committed examples or temporary shared values.
