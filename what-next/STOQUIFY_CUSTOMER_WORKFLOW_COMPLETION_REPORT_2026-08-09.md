# Stoquify Customer Workflow Completion Report

Date: 2026-08-09  
Verifier: `aqstoqflow-entity-workflow-verifier`  
Scope: customer management, customer lifecycle, customer order access, and controlled customer exports

## Decision

**Conditionally complete for the verified application slice.** The customer workflow now has enterprise-grade tenant isolation, permission and entitlement enforcement, controlled exports, lifecycle safeguards, truthful user interactions, and focused automated coverage. This is not a production certification: repository-wide compilation and authenticated browser/accessibility evidence remain outstanding for reasons recorded below.

## Corrected workflow

| Workflow area | Implemented control | Result |
| --- | --- | --- |
| Customer routes | Read plus operation-specific permissions on create, edit, profile analytics, and orders routes | Route access matches displayed capability |
| Server actions | `protect` boundary, tenant derived from session, Sales module entitlement, explicit read/write/export intent | Client-supplied tenant authority removed |
| Legacy customer actions | RBAC plus enforced module-access observation; order reads require `customers.orders.read` | Legacy boundary fails closed |
| Customer export | Dedicated `customers.export` critical permission, recent authentication, server-side selection, 5,000-row bound, purpose, watermark, hash, manifest, and audit | Export is controlled and evidentiary |
| Data minimization | Default customer export omits email, phone, address, tax ID, credit limit, balance, and notes; selected and redacted fields are audited | PII and credit disclosure reduced |
| Filter parity | Dashboard passes status, activity, locale, and exact visible customer IDs; order export passes customer, status, and search | Export reflects the visible workflow scope |
| CSV safety | UTF-8 BOM, quoting, and spreadsheet formula neutralization | Injection-resistant CSV output |
| Customer deletion | Customers with orders, ledger entries, receivables, statements, or settlements are deactivated; history-free records are soft archived | Retained evidence is preserved |
| UI truthfulness | Timer simulations, fake PDF/invoice/view actions, and premature success notices removed | User feedback reflects completed server work |

## Ownership and control decisions

- Organization and actor identity come only from the authenticated server session.
- `customers.export` is separate from ordinary read access and additionally requires the scope-specific read permission.
- The Sales module entitlement is enforced at every corrected customer action boundary.
- Export decisions and safe metadata are recorded through the shared export-safety audit service.
- Historical financial or operational evidence prevents destructive customer removal.

## Export disclosure map

The standard customer export contains customer identity, locale, active state, payment terms, order counts, summarized sales values, recent activity dates, and record timestamps. Direct contact details, address, tax identifiers, free-form notes, credit limit, and balance are excluded by default. Customer-order export contains order identity, lifecycle/payment status, monetary totals, item count, and dates; it does not claim invoice or settlement evidence.

## Verification evidence

- Focused Jest run: **7 suites passed, 43 tests passed**.
- Focused ESLint run: **0 errors**; one pre-existing anonymous-default-export warning remains in `config/permissions.ts`.
- Export trust gate: **ready, 35/35 checks, 0 blockers**.
- Export tests cover tenant binding, module denial, fresh-auth denial, scope-specific permission separation, formula injection, quoting, filter binding, minimization, audit metadata, watermark, and content hash.
- Lifecycle tests cover retained statement evidence and history-free soft archival.

Evidence artifacts:

- `what-next/customer-workflow-export-trust-readiness-2026-08-09.md`
- `what-next/customer-workflow-export-trust-readiness-2026-08-09.json`

## Residual conditions before production certification

1. The repository-wide TypeScript check is currently blocked by unrelated syntax errors in `actions/suppliers/supplier-management-actions.ts`; customer-focused tests and lint pass.
2. Authenticated browser journeys, visual regression screenshots, and accessibility scans have not been executed in this pass.
3. The dashboard read model remains bounded to 500 rows and controlled exports to 5,000 rows; higher-volume tenants require a queued or streaming export design.
4. Analytics are intentionally bounded recent summaries, not a full historical warehouse view.
5. Fresh-auth denial is safe and explicit, but the product does not yet provide a reusable inline step-up authentication modal on this surface.
6. Secrets, provider connectivity, and pilot operational evidence require target-environment validation.

## Recovery and rollback

The implementation introduces no database migration. The new export path can be disabled by removing `customers.export` from roles or the Sales module entitlement. Existing customer data remains intact; archive/deactivate behavior continues to use reversible soft-state transitions.

## Final verifier position

The previously identified customer-workflow correctness gaps are remediated in code and covered by focused evidence. Promote this slice only after the residual repository-wide compilation and browser/accessibility gates are cleared; until then, classify it as **enterprise-ready implementation, conditionally releasable** rather than fully production-certified.
