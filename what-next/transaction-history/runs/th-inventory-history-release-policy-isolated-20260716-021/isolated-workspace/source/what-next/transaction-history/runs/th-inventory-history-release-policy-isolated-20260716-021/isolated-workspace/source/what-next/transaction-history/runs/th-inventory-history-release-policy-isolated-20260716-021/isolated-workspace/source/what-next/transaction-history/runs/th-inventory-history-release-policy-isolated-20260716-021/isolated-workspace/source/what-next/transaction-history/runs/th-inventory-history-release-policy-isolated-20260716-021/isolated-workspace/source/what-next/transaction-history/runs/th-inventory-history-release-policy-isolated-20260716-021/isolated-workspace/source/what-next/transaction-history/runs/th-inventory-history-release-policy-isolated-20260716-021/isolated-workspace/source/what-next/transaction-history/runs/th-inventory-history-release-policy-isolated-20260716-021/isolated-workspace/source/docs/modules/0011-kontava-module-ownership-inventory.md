# ADR 0011: Kontava Module Ownership Inventory

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

This inventory records the first Phase 0 ownership map from the current codebase. It is intentionally non-enforcing. It maps current route groups, sidebar entries, service domains, server action domains, reports, exports, scripts, seed files, and key Prisma anchors to the canonical module vocabulary.

Sources inspected:

- `config/sidebar.ts`
- `services`
- `actions`
- `app/[locale]/(dashboard)/dashboard`
- `prisma/schema.prisma`
- `services/_shared/protect.ts`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `graphify-out/GRAPH_REPORT.md`

## Sidebar Ownership

| Sidebar group | Primary module/domain | Dependencies | Notes |
|---|---|---|---|
| Dashboard | analytics | all operational modules | Main landing dashboard should consume snapshots later. |
| Inventory | inventory | purchasing, accounting, analytics | Items, categories, brands, units, stock, transfers, movements. |
| Production | production candidate | inventory, purchasing, payroll, accounting | Keep as adjacent candidate until packaging decision. |
| Sales | pos/sales | inventory, payments, finance, accounting | POS belongs to `pos`; customers and orders may bundle with sales/POS. |
| Cash Drawers | pos/payments/controls | finance, accounting | Sensitive cash-control surface. |
| Accounting | accounting/close | finance, reconciliation, compliance | Includes accountant portal, close center, setup, control center. |
| Compliance | compliance | accounting, close, regulatory | OHADA/country-pack-facing module. |
| Purchases | purchasing | inventory, finance, accounting, payments | Purchase orders, purchases, suppliers. |
| Presence | presence/payroll-adjacent | payroll, controls | Keep adjacent until packaging decision. |
| Payroll | payroll | finance, accounting, compliance, controls | Sensitive person-level data. |
| Finance | finance/payments/reconciliation | accounting, purchasing, payroll, POS | Payments, reconciliation, receivables, payables, cash flow, analytics. |
| Analytics | analytics | all modules | Reports and cross-module analytics. |
| Commercial Agents | partners/sales-support | sales, finance | Candidate for partner/channel workflows. |
| Content | content | none | Non-core platform content. |
| Settings | settings/users/locations | all modules | Platform support and tenant configuration. |
| Administration | administration/users | settings, users, controls | Platform administration. |

## Route Ownership

| Route pattern | Owner | Notes |
|---|---|---|
| `/dashboard` | analytics | Main shell/dashboard. |
| `/dashboard/accounting/**` | accounting/close | Close routes belong to `close`; setup/control center are accounting/controls. |
| `/dashboard/analytics/**` | analytics | Reports and analytics surfaces. |
| `/dashboard/compliance` | compliance | Compliance command surface. |
| `/dashboard/customers/**` | sales/customer-support | Supporting data for sales/POS and receivables. |
| `/dashboard/finance/**` | finance/payments/reconciliation | Reconciliation route belongs to `reconciliation`; cash drawer bridges POS/payments/controls. |
| `/dashboard/inventory/**` | inventory | Items, stock, movement, transfer, category, brand, unit. |
| `/dashboard/items/**` | inventory | Legacy or duplicate item routes; should be reconciled later, not renamed in Phase 0. |
| `/dashboard/payroll` | payroll | Payroll module landing. |
| `/dashboard/pos` | pos | POS operations. |
| `/dashboard/purchase-orders/**` | purchasing | Purchase order workflow. |
| `/dashboard/purchases/**` | purchasing | Purchases, payables, suppliers. |
| `/dashboard/sales` | pos/sales | Current sales page. |
| `/dashboard/settings/**` | settings/users/locations | Platform support. |
| `/dashboard/suppliersSystem/**` | purchasing/suppliers | Legacy or alternate supplier routes; should be reconciled later. |
| `/dashboard/change-password` | users/security | Account security. |
| `/dashboard/cashDrawer` | pos/payments/controls | Legacy camelCase route; should be reconciled later. |
| `/dashboard/notifications-demo` | platform/demo | Non-core demo route. |

## Service Ownership

| Service folder | Owner |
|---|---|
| `services/accounting` | accounting/close |
| `services/analytics` | analytics |
| `services/auth` | users/security |
| `services/brand`, `services/category`, `services/item`, `services/unit` | inventory |
| `services/compliance`, `services/regulatory` | compliance |
| `services/controls` | controls |
| `services/customer` | sales/customer-support |
| `services/dashboard` | analytics/read models |
| `services/events` | controls/evidence foundation |
| `services/finance` | finance |
| `services/inventory` | inventory |
| `services/location` | locations/settings |
| `services/organization` | tenant/platform |
| `services/payments` | payments/reconciliation |
| `services/payroll` | payroll |
| `services/pos` | pos |
| `services/purchase-order`, `services/purchasing`, `services/supplier` | purchasing |
| `services/reconciliation` | reconciliation |
| `services/roles`, `services/users` | users/RBAC |
| `services/tax-rate` | settings/compliance/accounting |
| `services/_shared` | platform service boundary |

## Server Action Ownership

| Action folder | Owner |
|---|---|
| `actions/accounting` | accounting/close |
| `actions/analytics` | analytics |
| `actions/brands`, `actions/categories`, `actions/inventory`, `actions/item`, `actions/item-suppliers`, `actions/itemsShow`, `actions/units` | inventory |
| `actions/compliance` | compliance |
| `actions/customers` | sales/customer-support |
| `actions/dashboard` | analytics/read models |
| `actions/finance` | finance |
| `actions/locations` | locations/settings |
| `actions/organization` | tenant/platform |
| `actions/payments` | payments/reconciliation |
| `actions/payroll` | payroll |
| `actions/pos` | pos |
| `actions/purchaseOrderWorkflow`, `actions/purchasing`, `actions/suppliers` | purchasing |
| `actions/roles`, `actions/users` | users/RBAC |
| `actions/storage` | platform/settings |
| `actions/taxRate` | settings/compliance/accounting |
| `actions/_shared` | platform service boundary |

## Reports, Exports, Jobs, And Seeds

| Surface | Owner | Notes |
|---|---|---|
| `components/reports/*` | analytics/finance | Cash flow, cashier performance, financial summary, item performance, trust banner. |
| `services/analytics/financial-reports.service.ts` | analytics/finance | Financial reports service. |
| `services/accounting/reports.service.ts` | accounting | Accounting reports and export tests. |
| `actions/accounting/reports.actions.ts` | accounting | Accounting report actions. |
| `actions/analytics/financial-reports.ts` | analytics/finance | Analytics report action. |
| `lib/exportDataToExcel.ts` | controls/exports | Cross-cutting export helper. |
| `scripts/service-boundary-gate.js` | controls/release gate | Existing release gate script. |
| `scripts/raw-error-boundary-gate.js` | controls/release gate | Existing release gate script. |
| `scripts/hard-delete-gate.js` | controls/release gate | Existing release gate script. |
| `scripts/demo-report-trust-gate.js` | controls/release gate | Existing release gate script. |
| `scripts/inventory-boundary-gate.js` | inventory/release gate | Existing inventory boundary script. |
| `prisma/seed.ts`, `prisma/comprehensive-seed.ts` | seed/release gate | Main seed surfaces for future moat scenarios. |
| `prisma/seed-finance.ts` | finance seed | Finance-specific seed. |
| `prisma/seed-integrated-rbac.ts`, `prisma/rbac-test-seed.ts` | users/RBAC seed | RBAC test and integrated seed. |

## Key Prisma Anchors

| Model | Governance role |
|---|---|
| `Organization.requestedModules` | Registration intent; not a durable entitlement source of truth. |
| `AccountingSourceLink` | Existing source-link backbone for proof trails. |
| `BusinessEvent`, `BusinessEventOutbox` | Existing event/evidence backbone. |
| `PaymentReconciliationInboxItem` | Payment/reconciliation evidence source. |
| `CloseRun`, `CloseEvidenceItem`, `ClosePackExport` | Close assurance and certification evidence source. |
| `AuditLog` | Audit/event accountability source. |
| `PurchaseOrder` | Purchasing subject candidate. |
| `PayrollRun` | Payroll subject candidate. |
| `StockAdjustment` | Inventory subject candidate. |

## Known Phase 0 Gaps

- Some routes are duplicated or legacy-shaped, including `/dashboard/items`, `/dashboard/suppliersSystem`, and `/dashboard/cashDrawer`.
- Production and presence are real workflow areas but not yet in the canonical commercial module catalog.
- `Organization.requestedModules` needs migration into a future entitlement model.
- Sidebar permission filtering is useful but not module entitlement security.
- Report/export/job ownership is partial and must be expanded during later implementation.

## Phase 0 Gate

This inventory passes Phase 0 when later skills can map their work to owners and dependencies without re-inspecting every folder from scratch.

