# Evidence Map

## Core Evidence

- `lib/security/rbac.ts`
- `lib/security/server-authz.ts`
- `services/_shared/protect.ts`
- `services/controls/sensitive-action.service.ts`
- `config/`
- `actions/`
- `app/api/`
- `scripts/module-surface-inventory.js`

## High-Risk Operations

- Accounting close, journal post, journal reverse
- POS cash adjustments and receipt actions
- Inventory adjustments and transfers
- Purchasing approvals, goods receipt, supplier invoice/AP actions
- Payment reconciliation suspense approvals
- Payroll approval, declaration, payment evidence
- System settings and module administration

## Evidence Questions

- Which trusted server context determines organization?
- Which permission is expected?
- Which module entitlement is expected?
- Is fresh auth required?
- Is maker-checker required?
- Is the denial audited?
- Is the response safe for the caller?
