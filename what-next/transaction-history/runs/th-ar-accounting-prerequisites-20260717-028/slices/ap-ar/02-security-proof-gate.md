# Stage 02 Security Proof Gate - Customer/AR Prerequisites

Status: PARTIAL

Run: `th-ar-accounting-prerequisites-20260717-028`  
Slice: `ap-ar`  
Active lane: `ar`  
Mode: audit

## Positive Controls Found

- Existing receivables overview is behind finance route access through `financeViewPermissions("receivables")`.
- `finance.receivables.read` is present in `config/permissions.ts` and mapped to `CUSTOMER_RECEIVABLES_READ` in `lib/security/rbac-permissions.ts`.
- Customer routes have page boundary tests under `app/[locale]/(dashboard)/dashboard/customers/__tests__/pages.test.tsx`.
- Customer analytics reads are tenant-scoped through `services/customer/customer.service.ts`.
- POS services derive `organizationId` server-side and update customer balances inside transactional sale/void workflows.

## Required Security Contract Before AR History Implementation

- Define canonical server action permissions for AR history table, drawer, export, proof, and any allocation/correction actions. Do not inherit export/drawer authority from table visibility.
- Enforce the finance/customer module boundary at the server action entrypoint when the canonical AR history action is created.
- Define redaction for customer contact, credit exposure, provider references, private notes, and proof identifiers.
- Require fresh auth for customer/AR exports, proof expansion, write-off/correction/reversal actions, and bulk customer statement exports.
- Use signed tenant/filter-bound cursors and server-side export parity.
- Add negative tests for cross-tenant customer IDs, stale cursors, unauthorized exports, and redacted fields.

## Verdict

PARTIAL. Existing overview/customer surfaces have useful RBAC and tenant controls, but there is no canonical AR transaction-history action/export/proof surface to fully evaluate yet. Stage 03 accounting prerequisites remain the blocking gate.
