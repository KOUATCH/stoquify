# Migration Control Catalog

Use this reference to classify findings before modifying code.

## Risk Tiers

Critical:

- direct mutation of stock, ledger, payments, payroll, compliance, period close, or audit evidence outside statutory services;
- hard delete of posted, finalized, certified, reconciled, or evidence-bearing records;
- route/action path that can bypass tenant isolation or RBAC for economic data;
- mock/demo data visible through a production business route.

High:

- server action owns business rules that should live in a service;
- App Router route or server page imports Prisma directly for tenant data;
- raw error leakage from actions/routes;
- split ownership between old and new domain services;
- missing idempotency for externally triggered or repeatable economic operations.

Medium:

- duplicate actions/services with unclear canonical owner;
- hard delete of setup/configuration data without audit or soft delete;
- report missing provenance, period status, source status, filter hash, or evidence status;
- UI or hook imports a business-rule service.

Low:

- naming drift, dead exports, stale comments, or old helper wrappers after callers are migrated.

## Replacement Patterns

Inventory:

- Move final stock effects into `services/inventory`.
- Treat `InventoryTransaction` as append-only truth.
- Treat `InventoryLevel` as a projection updated only by the inventory kernel.
- Require business events, open-period checks, evidence for sensitive adjustments, and ledger posting or blockers.

Purchasing/AP:

- Consolidate purchase order, goods receipt, supplier invoice, supplier payment, stock effect, ledger posting, and reconciliation evidence under the AP/purchasing service path.
- Convert destructive edits after approval into cancellation, reversal, credit/debit note, or corrective event flows.

Routes/actions:

- Route handlers and server actions derive tenant and actor from trusted context.
- Actions validate input, call services, map typed errors, and revalidate paths/tags.
- Routes and pages do not import Prisma for tenant business data unless explicitly classified as a read-only bootstrap exception.

Errors:

- Use typed domain errors with stable code, user-safe message, classification, and safe metadata.
- Never return raw Prisma errors, stack traces, or internal exception text to clients.

Mock/demo data:

- Delete if unused.
- Otherwise quarantine under explicit demo-only paths, feature flags, and visible demo labels.
- Never let production dashboards, reports, stock, finance, payroll, payment, or compliance paths return mock business data.

Hard deletes:

- Economic records: forbid hard delete after evidence exists.
- Draft records: allow only with tests proving draft-only state and no ledger/stock/payment/fiscal evidence.
- Setup records: prefer soft delete when referenced by historical transactions.

## Usage Proof Before Deletion

Before deleting a legacy file/function, run targeted `rg` searches for:

- import path;
- exported function name;
- route handler path;
- query key/action name;
- old API URL;
- component prop names if the action was passed through UI layers.

Delete only after no runtime caller remains or all remaining references are tests/docs intentionally updated.
