# ADR 0004: Kontava Module Vocabulary And Ownership

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava is evolving from a full-suite SMB platform into a module-oriented OHADA-zone operating system. The codebase already has module-like route groups, service folders, server action folders, permissions, accounting source links, business events, reconciliation, close assurance, payroll, purchasing, inventory, POS, finance, analytics, and audit foundations.

The missing foundation is a single vocabulary that every later moat skill can use. Without it, module entitlements, proof trails, snapshots, business signals, redaction, Owner War Room, partner evidence, and pricing bundles will each invent slightly different concepts.

This ADR defines the canonical module language for Phase 0. It does not rename routes, add schema, or enforce module access.

## Decision

Kontava will use these canonical commercial module slugs for moat execution:

| Slug | User-facing name | Primary owner | Depends on | Route/service examples |
|---|---|---|---|---|
| `pos` | POS | Sales/POS | inventory, payments, accounting, controls | `/dashboard/pos`, `services/pos`, `actions/pos` |
| `inventory` | Inventory | Inventory | purchasing, accounting, analytics | `/dashboard/inventory`, `services/inventory`, `services/item`, `services/category`, `services/brand`, `services/unit` |
| `purchasing` | Purchasing and AP | Purchasing/AP | inventory, finance, accounting, payments, controls | `/dashboard/purchase-orders`, `/dashboard/purchases`, `services/purchase-order`, `services/purchasing`, `actions/purchaseOrderWorkflow`, `actions/purchasing` |
| `accounting` | Accounting | Accounting | finance, payments, reconciliation, close, compliance | `/dashboard/accounting`, `services/accounting`, `actions/accounting` |
| `finance` | Finance | Finance | accounting, payments, reconciliation, purchasing, payroll | `/dashboard/finance`, `services/finance`, `actions/finance` |
| `payments` | Payments | Finance/Payments | finance, reconciliation, accounting, POS | `/dashboard/finance/payments`, `services/payments`, `actions/payments` |
| `reconciliation` | Reconciliation | Finance/Controls | payments, accounting, close | `/dashboard/finance/reconciliation`, `services/reconciliation`, payment reconciliation models |
| `payroll` | Payroll | HR/Payroll | finance, accounting, controls, compliance | `/dashboard/payroll`, `services/payroll`, `actions/payroll` |
| `compliance` | Compliance | Compliance/OHADA | accounting, finance, close, regulatory | `/dashboard/compliance`, `services/compliance`, `services/regulatory`, `actions/compliance` |
| `close` | Close Assurance | Accounting/Controls | accounting, reconciliation, compliance, finance | `/dashboard/accounting/close`, close assurance models |
| `analytics` | Analytics | Analytics/Product | all operational modules | `/dashboard/analytics`, `services/analytics`, `services/dashboard` |
| `controls` | Controls | Security/Finance Controls | RBAC, audit, finance, accounting, payments, purchasing, payroll | `services/controls`, high-risk permissions, sensitive actions |
| `partners` | Partners | Partnerships/Integrations | consent, redaction, accounting, finance, evidence | future partner evidence surfaces |

Supporting platform domains are governed separately from commercial modules unless product packaging later promotes them:

| Domain | Classification | Notes |
|---|---|---|
| `settings` | Platform support | Locations, terminals, tax rates, roles, users, company, security, appearance, notifications. |
| `users` | Platform support | Users, roles, invitations, organization membership, RBAC. |
| `locations` | Platform support | Branch/location scope used by inventory, POS, finance, and analytics. |
| `sales` | Commercial workflow | Current route grouping includes POS, orders, customers, deliveries, and payments. In module pricing, POS may be the commercial module and sales order workflows may be bundled with it. |
| `customers` | Supporting commercial data | Usually bundled with sales/POS and finance receivables. |
| `suppliers` | Supporting commercial data | Usually bundled with purchasing/AP and inventory. |
| `presence` | Adjacent module candidate | Current route group supports attendance workflows and should be treated as payroll-adjacent until product packaging decides. |
| `production` | Adjacent module candidate | Current route group supports recipe, batch, costing, profitability, and planning. It should not be forced into the core module catalog until pricing and dependencies are decided. |
| `content` | Non-core platform content | Blog/content management is not part of the OHADA operating-system moat. |
| `administration` | Platform administration | System and user administration, not a commercial SMB module by itself. |

## Ownership Rules

1. Every route, sidebar link, service, action, report, export, job, seed scenario, and test should have an owning module or platform domain.
2. A cross-module feature has one primary owning module and zero or more dependencies.
3. Module ownership does not grant user permission. RBAC remains user-level authorization.
4. Module entitlement does not grant RBAC permission. Entitlement remains tenant-level subscription/access right.
5. Admin wildcard permissions may satisfy RBAC checks but must not bypass subscription entitlement, consent, fresh auth, maker-checker, redaction, certification, or evidence rules.
6. Existing routes and labels are not renamed in Phase 0.

## Product Language

Use "module" for commercial and operational capabilities that can become subscription units or bundle units. Use "platform domain" for support areas that are necessary but not necessarily sold independently.

Do not present a route group as a commercial module until product packaging confirms it.

## Consequences

Positive:

- Later skills can map code and UX consistently.
- Module entitlements can be designed without relying on sidebar-only grouping.
- Sales and partnerships can package the platform using stable vocabulary.
- Evidence, snapshots, signals, and redaction can report source modules consistently.

Tradeoffs:

- Some existing route labels do not map perfectly to commercial modules yet.
- Production, presence, customers, and suppliers need product packaging decisions before enforcement.

## Phase 0 Gate

This ADR passes Phase 0 when:

- Every canonical slug has a description, owner, dependencies, and examples.
- Supporting platform domains are identified.
- Later governance docs reference these slugs instead of inventing new terms.
- No production enforcement is introduced by this ADR.

