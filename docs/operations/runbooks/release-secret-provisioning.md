# Release Secret Provisioning

This runbook owns the dedicated production configuration boundaries enforced by `scripts/release-secret-preflight.js`. Secret values belong in the selected provider's protected environment or secret manager, never in source control, saved evidence, CI output, issue trackers, or chat transcripts. Hosting/domain remain undecided; Vercel + Neon is a proposal. See [hardened close deployment preparation](../../release/HARDENED_CLOSE_PRODUCTION_DEPLOYMENT.md).

## Required production variables

| Variable | Purpose | Production rule |
| --- | --- | --- |
| `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` | HMAC pseudonymization for public identity abuse buckets | Dedicated random value, at least 32 characters |
| `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` | HMAC signing for expiring public receipt links | Dedicated random value, at least 32 characters |
| `AQSTOQFLOW_HISTORY_CURSOR_SECRET` | HMAC signing for transaction-history pagination cursors | Dedicated random value, at least 32 characters |
| `AQSTOQFLOW_STATEMENT_TOKEN_SECRET` | Signing customer statement access tokens | Dedicated random value, at least 32 characters |
| `AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY` | Statement delivery envelopes | Independent AES-256 key: 64 hex characters or Base64 encoding of 32 bytes |
| `AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY` | Accountant invitation delivery envelopes | Independent AES-256 key: 64 hex characters or Base64 encoding of 32 bytes |

Signing secrets must meet the current preflight's strength rules (at least 32 characters and 12 distinct characters; no placeholder values). Encryption keys must pass its AES-256 encoding rule. All six must differ from one another and from `AUTH_SECRET` or `NEXTAUTH_SECRET`. Keep authentication secrets independently protected.

The production public origin must be the actual owned HTTPS origin. Bind `NEXTAUTH_URL` and the configured public URL variables to it; the private local artifact's loopback origin is not production qualification. `DATABASE_URL` is injected only into the controlled schema/runtime environment. Schema promotion requires a direct public-schema target and reconciled `DIRECT_URL`; never publish either URL or add production values to `.env`.

Live statement email and accountant invitations are both in scope. The eventual controlled production environment requires `STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS=1`, `STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS=1`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `STOQUIFY_ACCOUNTANT_INVITE_FROM_EMAIL` (or its documented default to the Resend sender). Both sender identities need a verified owned domain, real provider acceptance/delivery evidence and the protected tenant-scoped worker. WhatsApp is optional additional scope and requires its own live flag, phone-number ID/access token and provider qualification. These requirements do not enable any repository default or authorize sending.

## Provisioning procedure

1. Generate each value independently with a cryptographically secure password or secret generator. A 32-byte random value encoded as Base64 is suitable.
2. After the provider/project/domain is selected and reviewed, use its protected production environment/secret manager. Vercel project settings are applicable only if Vercel is chosen.
3. Provision all six dedicated variables, authentication secrets and reviewed provider/sender configuration in the correct protected environment. Do not expose production secrets to pull-request/preview builds. Use independent nonproduction credentials for owned delivery tests.
4. Follow the separate build, schema and exact-byte hosted promotion sequence in the linked deployment plan. Do not trigger a rebuild after schema promotion. `npm run build` retains secret preflight before lint/compilation; strict controlled release validation uses `NODE_ENV=production` and existing release enforcement.
5. Confirm the **current** preflight report has zero blockers and `Secret value printed: no` (currently 21 checks, not the historical eight). Preserve actual provider, scheduler and delivery evidence separately; variable presence does not qualify those behaviors.
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
