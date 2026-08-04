# Stoquify Functionality and Surface Registry — 2026-08-03

## Coverage

This registry combines current source inventory, specialist review, focused tests, and existing module-surface evidence. `what-next/module-surface-inventory.md` reports 386 surfaces: 352 mapped, 259 enforcement candidates, six unmapped, and four missing permission declarations. Runtime promotion remains `NO-GO`; mapping is not enforcement.

## Module registry

| Domain | Primary roles | Canonical surfaces | Service/data owner | Value | Maturity | Danger/gap |
|---|---|---|---|---|---:|---|
| Identity and tenant | Admin, owner, all users | auth, users, roles, organizations | BetterAuth, user/organization services; `User`, `Organization`, `Invite` | USEFUL | 2/5 | Plain invite tokens, MFA incomplete, no structural DB tenant backstop |
| Modules/packages | Owner, admin | settings/modules, public packages | module catalog/entitlement services | USEFUL | 2/5 | Observe mode, legacy full-suite default, no durable subscription truth |
| POS | Cashier, branch manager | `/dashboard/pos/*` | POS/session/drawer/receipt services; sales/payment models | STRONG + DANGEROUS | 3/5 | Provider finality, balance races; store credit disabled |
| Offline POS | Cashier, operations | POS offline status/replay | offline-sync service/device/event models | USEFUL + DANGEROUS | 3/5 | Original actor/module authority incomplete |
| Inventory | Stock manager, branch manager | `/dashboard/inventory/*` | inventory stock/count/transfer/valuation services | STRONG | 4/5 | Tenant backstop applies; some replay/race follow-up remains |
| Purchasing | Buyer, approver, stock | purchase orders, receipt | purchase-order and inventory services | STRONG | 3/5 | Bulk bypass fixed; approval CAS residual; duplicate routes |
| Accounts payable | AP, finance approver | purchases/payables, finance/payables | purchasing/AP controls, posting, reconciliation | STRONG | 3/5 | Active-exception uniqueness race; provider evidence external |
| Payments/reconciliation | Finance, accountant | finance/reconciliation | provider event, statement, reconciliation, suspense services | STRONG independently | 3/5 | Not authoritative for POS status; provider/runtime proof missing |
| Finance dashboards | Owner, finance | finance, cash command, reports | finance/dashboard/snapshot services | DANGEROUS | 2/5 | Conflicting status semantics and capped aggregates |
| Accounting/close | Accountant, controller | accounting, trial balance, close, accountant portal | posting, source links, close/data-trust services | STRONG | 4/5 | Depends on payment truth, migration, statutory, and external evidence |
| HRIS | HR, manager, employee | `/dashboard/people/*` | employee/contract/time/leave/document services | STRONG in tested slice | 4/5 | Broad privacy/runtime/role coverage incomplete |
| Payroll | Payroll, accountant, employee | `/dashboard/payroll/*` | payroll kernel, evidence, provider, declaration services | STRONG but blocked | 3/5 | Provider/statutory/runtime certification unavailable |
| Compliance/country packs | Accountant, compliance | compliance, tax, country pack | compliance/regulatory services | USEFUL, fail-closed | 3/5 | Expert approval and authority conformance blocked |
| Assurance/incidents | Operations, finance, audit | assurance, manager action center | assurance registry/incident services | USEFUL | 3/5 | Static readiness only; runtime scheduler/alert delivery unproven |
| Owner command | Owner, branch manager | dashboard, Daily Digest, Owner War Room, action center | dashboard/snapshot/signal services | USEFUL | 3/5 | Underlying metric truth and permissions affect trust |
| AI/agents | Authorized reviewers/operators | agent command/proposals | agent control plane, proposal, tool services | USEFUL, bounded | 3/5 | Creator self-approval residual; execution authority currently none |
| Public receipt | Customer, admin | `/api/receipts/[receiptId]` | receipt/token registry | STRONG | 4/5 | Runtime/load proof absent |
| Uploads/documents | Authenticated tenant roles | `/api/uploads/[...path]`, UploadThing | storage/upload/document services | USEFUL + DANGEROUS | 2/5 | Public caching, extension MIME, whole-file buffering, retention gaps |
| Communication/WhatsApp | Customer, operations | receipt delivery/outbox | communication/provider services | USEFUL | 3/5 | POS↔communication ownership coupling; provider runtime proof absent |
| Settings/admin | Admin, owner | users, roles, locations, notifications, security | user/location/RBAC/config services | WEAK | 2/5 | Broken user edit, English shell, setup links ignore access/package |

## Route and surface decisions

| Decision | Surface | Reason |
|---|---|---|
| KEEP/STRENGTHEN | `/dashboard`, Owner War Room, Manager Action Center, Daily Digest | High-value role command surfaces; converge metric truth underneath |
| KEEP/STRENGTHEN | Canonical inventory, POS, purchase-order, finance, accounting, people, payroll, assurance, settings families | Distinct recurring jobs and service-owned workflows |
| KEEP AS GUIDE | Workflow Atlas | Valuable role-first education; should not become another daily launcher |
| DIAGNOSTIC ONLY | Module Control Center | Current product truth says hard enforcement is off/mixed |
| CONSOLIDATE | Main registration and `/register-v2`; landing and `/ohada-os` | Competing funnels and inconsistent context capture |
| REDIRECT | `/dashboard/suppliersSystem` → `/dashboard/purchases/suppliers` | Duplicate supplier destination |
| REDIRECT | `/dashboard/purchases/[id]` → `/dashboard/purchase-orders/[id]` | Parallel purchase-detail implementation |
| REDIRECT | duplicate location/tax-rate create routes | Same job and implementation |
| REDIRECT | `/dashboard/cashDrawer` → `/dashboard/finance/cash-drawer` | Canonical finance route exists |
| RETIRE/RESTRICT | `/dashboard/notifications-demo` | Production-facing test/demo surface |
| RETIRE | `/update` | Returns `null` and provides no job |
| CONSOLIDATE | legacy `/dashboard/items` and inventory item variants | Duplicate training/support paths |
| FIX | `/dashboard/settings/users/update/{id}` | UI links to a missing destination |

## Role, permission, and entitlement matrix

| Role | Core job | Permission shape | Entitlement expectation | Current gap |
|---|---|---|---|---|
| Owner/operator | See risk, decide, delegate, prove | Cross-domain read plus scoped approvals | Owned modules only | Setup and navigation can expose unavailable/denied destinations |
| Cashier | Shift, sale, tender, receipt, correction | POS/session/drawer mutation | POS | Offline actions and provenance not fully aligned |
| Branch manager | Monitor branch, approve exceptions, close | Location-scoped oversight/approval | POS, inventory, assurance | Metric truth and location scoping need runtime proof |
| Inventory manager | Receive, count, move, adjust, value | Inventory write/approve | Inventory | Canonical route duplication and tenant backstop |
| Purchasing/AP | Order, receive, match, approve, release | Maker/checker separated | Purchasing, AP, payments | Residual approval/exception races |
| Accountant/controller | Reconcile, post, close, export | Finance/accounting/close, fresh auth | Finance, accounting, compliance | Payment semantics and statutory evidence blocked |
| HR/payroll | Employee truth, run, approve, pay, declare | Sensitive data plus maker/checker/fresh auth | HRIS, payroll | MFA incomplete; provider/statutory proof blocked |
| Employee | Own profile, documents, payslip | Self-only reads/actions | HR self-service | Good tested slice; broader tenant/privacy proof limited |
| Compliance/auditor | Review source, evidence, exceptions | Read/review/sign-off | Compliance/assurance | Expert authority and retention evidence incomplete |
| Admin | Users, roles, locations, security, packages | High privilege/fresh auth | Core plus subscribed admin modules | Broken route, MFA incomplete, module truth permissive |

## TanStack Query and client-state matrix

The static specialist pass classified 137 TanStack operations: 51 queries/infinite queries and 86 mutations. These counts describe recognized operations, not runtime completeness.

| Pattern | Evidence | Assessment | Required control |
|---|---|---|---|
| Global QueryClient | `components/Providers.tsx:16-40`; `lib/providers/query-provider.tsx:14-58` | USEFUL + DANGEROUS | Remount/clear on session/org change or prefix every key with trusted context |
| Shared query-key catalogue | `types/queryKeys.ts:2-93` | USEFUL but partial | One canonical factory per domain/context |
| Customer keys | `hooks/useCustomerQueries.ts:24-87` | Missing org dimension | Tenant/session prefix and switch test |
| Category keys | `hooks/useCategories.ts:35-106` | Missing org dimension | Tenant/session prefix and filter-complete keys |
| Recent purchase-order boundary | `hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx` | Tested | Preserve canonical action backing and invalidation |
| POS receipt operations | `hooks/posHooks/__tests__/usePosOperations-receipts.test.tsx` | Tested | Preserve scoped receipt/token actions and invalidation |
| Inventory-loss workbench | `hooks/__tests__/useInventoryLossWorkbench.test.tsx` | Useful evidence | Expand context/invalidation matrix across mutations |
| Mutation invalidation | 86 recognized mutations | Fragmented local patterns | Registry of writers → affected projections → rollback/invalidation |

No source-backed global reset was proven for authenticated organization changes. The risk is classified likely, not runtime-confirmed.

## Prisma ownership anchors

| Context | Models/lines in `prisma/schema.prisma` | Ownership note |
|---|---|---|
| Identity/tenant | `User` 107; `Organization` 237; `Invite` 404 | Identity/user services; invite token storage requires hashing |
| Inventory | `Item` 736; `InventoryLevel` 840; `InventoryTransaction` 876 | Inventory services with CAS/event patterns |
| Purchasing/AP | `PurchaseOrder` 1127; `GoodsReceipt` 1221; `SupplierInvoice` 1414; `SupplierPayment` 1545 | Purchase-order and AP controls |
| HR/payroll | `PayrollEmployee` 1800; `PayrollRun` 2650; `PayrollDeclaration` 2848; `PayrollPaymentBatch` 2932 | HRIS/payroll services |
| POS | `SalesOrder` 3105; receipt token 3169; session 3649; drawer 3709; offline device 3772; payment/refund 4081/4177 | POS, receipt, offline, payment services |
| Payment/reconciliation | Provider event 4527; statement 4583; transaction 4671; reconciliation run 4837; exception 4896 | Payment/reconciliation services |
| Accounting | Period 5216; close run 5347; accounts 5669; journal 5769; posting/link 5867/5913 | Accounting/close services |
| Events/assurance/agents | Business event/outbox 6104/6152; assurance incident 6817; agent run/proposal 7329/7495 | Events, assurance, agent control plane |

## KPI semantic contradiction register

| Concept | Main dashboard | Tenant/branch snapshot | Finance | Verdict |
|---|---|---|---|---|
| Cash collected | `PAID` | `PAID + PARTIAL` | all non-`CANCELLED` sales payments | DANGEROUS; converge before external trust claim |
| Refund effect | Status-filtered | Projection-specific | separately aggregated while source payments may remain included | DANGEROUS |
| Receivables | Dashboard-specific | Snapshot contract | payments subtracted with finance status rule | DANGEROUS |
| Completeness | Unclear | freshness/source metadata | sums capped arrays | DANGEROUS; use DB aggregate and partial labels |

## Dependency and ownership register

| Issue | Evidence | Priority |
|---|---|---:|
| POS and communication bidirectional context | `services/pos/receipt.service.ts:8-9`; communication imports POS receipt/schema contracts | P2; move contracts to neutral boundary |
| Local query-key factories | Hook graph and current hooks | P1/P2; canonicalize with tenant/session prefix |
| ADR ownership inventory drift | ADR-0011 omits current contexts/report/job ownership | P2; update after canonical ownership decisions |
| Duplicate Redis clients | `redis` and `ioredis` dependencies | P3 hypothesis; confirm imports/runtime need before removal |
| Generic `add`/`init` packages | Package metadata, no reviewed production imports | P3 hypothesis; verify bundle/import graph before removal |

## Evidence status

- STRONG does not mean production-certified.
- USELESS is reserved for null/demo/duplicate surfaces lacking a distinct job.
- MISSING commercial/adoption evidence is not converted into a build recommendation until user or operating evidence exists.
