# Evidence Map

## Core Evidence

- `package.json`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `app/api/`
- `actions/`
- `services/`
- `scripts/service-boundary-gate.js`
- `scripts/api-route-guard-inventory.js`
- `scripts/module-surface-inventory.js`

## High-Value Domains

- Inventory and item actions: `actions/item/`, `actions/inventory/`, `services/inventory/`, `services/item/`
- Purchasing/AP: `services/purchase-order/`, `services/purchasing/`, purchasing actions and routes
- POS and receipts: `services/pos/`, `app/api/receipts/`, POS actions
- Accounting and close: `services/accounting/`, `services/reconciliation/`
- Reports and exports: `components/reports/`, `actions/analytics/`, reporting services

## Findings To Rank

- Critical: cross-tenant read/write path, unauthenticated mutation, financial write outside service.
- High: direct DB write in action/API, unprotected module operation, raw error leak.
- Medium: duplicated service ownership, read model computed in UI, missing gate coverage.
- Low: naming drift or documentation-only mismatch.
