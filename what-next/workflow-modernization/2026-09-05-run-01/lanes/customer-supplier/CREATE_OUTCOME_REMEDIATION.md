# CS-F03 — keep successful creation distinct from refresh failure

Evidence date: 2026-09-05. This is a bounded second batch in the customer/supplier lane. The shared branch and commit remain recorded in `WORKFLOW_REGISTER.json`; unrelated changes, the two completed public-response retry fixes and the rejected POS/offline candidate were preserved.

## Executed reproduction and correction

Customer and supplier management creation first committed a Prisma insert, then reloaded the complete aggregate management row. A later lookup error escaped as a creation failure. The actions also treated a route-cache invalidation exception after successful creation as a failed save. Both outcomes left the user able to retry and create another record. A create result should establish the saved identity; aggregate statistics should come from their normal authoritative read paths.

The new service and action tests ran against the prior source: **5 failed, 14 passed, four suites, 5.893 seconds**. Four failures reproduce the two post-commit reload failures and the two cache failures. The fifth checks the newly required explicit cache status on a successful response. These are injected-failure tests, not an observed database outage.

`createCustomerForManagement` and `createSupplierForManagement` now return only the committed `id`, `organizationId`, `name` and `code` directly from the underlying create result. They do not perform a second lookup, fabricate zero aggregate statistics or claim downstream readiness. Existing input normalization, tenant scope, uniqueness checks and Prisma creation remain unchanged. An actual insert rejection still rejects once and returns no receipt.

The protected/customer and scoped/supplier actions return `cacheStatus: invalidated` after their existing path invalidation calls, or `cacheStatus: deferred` if those calls throw. Both outcomes retain the successful committed receipt. `invalidated` means cache invalidation was requested successfully; it is not evidence that every screen has finished loading.

The existing create hooks await settled cache/refetch results and distinguish a saved record from a refresh problem. A refresh rejection leaves the mutation successful, preserves cached data, and displays an English/French warning through the existing notification provider. Private source error text is not included in that warning. The existing invalidation key coverage is preserved, including dependent views. Update/delete callers retain their previous asynchronous invalidation behavior; they were not converted to new receipt contracts in this batch.

## Exact affected scope

Production:

- `services/customer/customer.service.ts`
- `services/supplier/supplier.service.ts`
- `actions/customers/customer-management-actions.ts`
- `actions/suppliers/supplier-management-actions.ts`
- `hooks/useCustomerManagement.ts`
- `hooks/useSupplierManagement.ts`

Tests:

- New customer and supplier `*-create-receipt.service.test.ts`.
- Extended `actions/customers/__tests__/customer-management-actions.test.ts`.
- New `actions/suppliers/__tests__/supplier-create-receipt.actions.test.ts`.
- New `hooks/__tests__/managed-create-receipt.test.tsx`.
- Extended the existing customer action-page and supplier management presentation suites.

All create consumers were traced: the customer standalone page and supplier standalone mode navigate using `saved.id`; both dashboard forms only await creation before closing/resetting. No consumer needs aggregate statistics from this result. Their production component source is unchanged.

## Verification and limits

Final result: **46 tests passed across seven suites in 11.366 seconds**, exit 0. Changed source/test lint passed across 13 files. The first post-change run had 45 passes and one test expectation failure because the existing supplier parser adds default fields; the expectation was corrected to verify those defaults, with no source change.

The checks cover committed identity without a post-create read, actual insert failure, tenant code conflicts, cache exceptions, server-derived organization/permission denials, settled client refresh rejection, EN/FR notifications, receipt-based navigation and retained entered name/email fields after real form rejection. The tests use transaction/database doubles and actual React Query/component execution. They do not establish PostgreSQL persistence, concurrency, browser accessibility, mobile layout, provider behavior or complete end-to-end workflow coverage. Typecheck/build and real runtime verification are coordinated by the parent and must be recorded independently.

The register remains **29 discovered workflows, zero runtime visits by this lane and zero complete workflows certified**. Customer/supplier create paths have this focused correction and tests; their other branches remain open. The older retry verification remains separately bound to its original source hashes.

## Remaining behavior and operations

If the notification says the record was saved but views could not refresh, open/refresh the existing customer or supplier list and locate that saved record before submitting another creation. Do not interpret stale views as proof the save failed. An actual validation, permission or insert rejection retains the form for correction.

This patch requires no migration, provider access, subscription change or organizational approval. Rollout follows the normal application validation process. Reverting restores the ambiguous post-create outcome; existing records require no rollback or deletion. Lost network responses before a committed receipt reaches the client, automatic-code allocation collisions, and analogous update/reload ambiguity remain separate findings; this patch does not claim durable command idempotency for arbitrary master-data creates.

Architecture, data integrity, security, UX/recovery and operations lenses apply to this batch. Finance/records are affected only through preserved existing customer/supplier identity and dependent reads. Country-pack rules, professional accounting approval, payroll, provider execution, AI and commercial packaging are not applicable: none of their behavior changes.
