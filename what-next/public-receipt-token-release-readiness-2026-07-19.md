# Public Receipt Token Release Readiness - 2026-07-19

## Decision

Implementation-ready locally. Production release remains blocked until the deployment environment provides `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` or `RECEIPT_TOKEN_SECRET` with an acceptable secret value.

## Verified Behavior

- Public route rejects raw `/api/receipts/[receiptId]` lookup before service access when no token is present.
- Public route passes only a trimmed `receiptAccessToken` to `getPublicSalesReceipt`.
- Public receipt service requires `assertPublicReceiptAccessToken` before loading the sale.
- Registry validation rejects legacy, tampered, expired, revoked, unknown, and sale-mismatched tokens before receipt lookup.
- Public receipt lookup scopes the sale by token-derived `organizationId`.
- Public payload omits `customerEmail`, `customerPhone`, customer balance, cashier email, and creator email.
- Authenticated organization-scoped receipt lookup still preserves private customer contact fields.

## Validation Commands

- `npm run receipt:token:config-gate`
  - Status: `ready`
  - Checks ready: 4/4
  - Blockers: 0
  - Warning: production public receipt token secret is not configured.

- `npx jest --runTestsByPath "app/api/receipts/[receiptId]/__tests__/route.test.ts" "services/pos/__tests__/receipt-public.test.ts" "services/pos/__tests__/public-receipt-token.test.ts" "services/pos/__tests__/public-receipt-token-registry.service.test.ts" "scripts/__tests__/public-receipt-token-config-gate.test.js" --runInBand`
  - Test suites: 5 passed
  - Tests: 35 passed

- `npm run receipt:token:config-gate:release`
  - Status: `blocked`, as expected in this local environment
  - Checks ready: 4/4
  - Blocker: `receipt_token_secret: Production public receipt token secret is not configured.`

## Release Action

Before production launch, configure a dedicated receipt-token signing secret in the release environment. Do not reuse auth/session/identity hashing secrets.
