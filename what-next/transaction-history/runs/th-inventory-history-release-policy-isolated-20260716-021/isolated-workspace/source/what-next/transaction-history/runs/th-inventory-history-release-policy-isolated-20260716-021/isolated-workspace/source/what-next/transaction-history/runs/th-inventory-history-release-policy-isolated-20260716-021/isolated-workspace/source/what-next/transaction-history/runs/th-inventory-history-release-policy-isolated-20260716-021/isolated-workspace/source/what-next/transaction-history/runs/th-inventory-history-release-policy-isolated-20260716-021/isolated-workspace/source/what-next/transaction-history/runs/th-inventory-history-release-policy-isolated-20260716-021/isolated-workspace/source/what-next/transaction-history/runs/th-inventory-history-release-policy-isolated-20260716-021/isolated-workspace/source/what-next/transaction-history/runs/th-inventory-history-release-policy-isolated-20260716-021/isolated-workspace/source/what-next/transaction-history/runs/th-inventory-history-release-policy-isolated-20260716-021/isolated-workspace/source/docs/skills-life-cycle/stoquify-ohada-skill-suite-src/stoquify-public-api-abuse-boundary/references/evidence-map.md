# Evidence Map

## Core Evidence

- `app/api/`
- `app/api/receipts/`
- `services/pos/receipt.service.ts`
- `services/pos/public-receipt-token.ts`
- `services/pos/pos.schemas.ts`
- `scripts/public-receipt-token-config-gate.js`
- `scripts/api-route-guard-inventory.js`
- `lib/security/route-response.ts`

## Boundary Classes

- Public receipt link
- Customer-facing document or export
- Authenticated API route
- Public read-only API route
- Upload or import endpoint
- Provider or webhook-like endpoint

## Evidence Questions

- What identifies the tenant?
- What authorizes access?
- What is redacted?
- What is rate-limited?
- What is logged?
- What does the error response expose?
