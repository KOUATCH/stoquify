# Stoquify Dependency and Ownership Map — 2026-07-28

| Order | Workstream | Authoritative owner | Depends on | Blocks |
| --- | --- | --- | --- | --- |
| 0 | Containment | Domain service owners | Current audit evidence | Further exposure |
| 1 | Tenant DB boundary | Platform/security | Approved ADR and migration plan | Every tenant-owned workflow |
| 2 | Authorization/entitlement | Security/modules | Tenant boundary | External mutations and UI parity |
| 3 | Critical audit/identity | Security/users | Tenant boundary, outbox contract | Security certification |
| 4 | PO/AP controls | Purchase-order/purchasing | Authorization | AP settlement and reporting |
| 5 | POS/store credit/provider | POS/payments | Tenant/auth, schema plan | Reconciliation and cash reporting |
| 6 | Inventory integrity | Inventory | Tenant/auth, business-event contract | Valuation and close |
| 7 | Reconciliation/accounting | Payments/reconciliation/accounting | POS/AP/inventory facts | Close and financial reports |
| 8 | Payroll/compliance | HRIS/payroll/regulatory | Tenant/auth, accounting truth | Statutory close |
| 9 | Projection convergence | Dashboard/snapshots | Approved domain semantics | UI consolidation |
| 10 | Assurance/release | Assurance/operations | All preceding verified gates | Production recommendation |

## Shared contracts requiring single ownership

- Organization-scoped data access: platform security.
- Permission and entitlement taxonomy: security/modules.
- Business-event identity and payload hash: events platform.
- Payment state and settlement meaning: payments/reconciliation.
- Cash/AR/refund semantics: accounting/reconciliation.
- Evidence/freshness/redaction envelope: snapshots/assurance.
- Country-pack authority status: regulatory with independent expert approval.

## Change isolation

Parallel agents must own distinct files. Shared schema, permission enums, event contracts, snapshot contracts and accounting semantics require orchestrator review before modification. UI work cannot define business states that do not exist in service contracts.

## Stop dependencies

- No DB-scoping implementation without a compatibility and rollback plan.
- No store-credit ledger/provider lifecycle without schema and reconciliation design.
- No dashboard migration before the semantic catalog is approved.
- No statutory or production readiness claim without external evidence.
