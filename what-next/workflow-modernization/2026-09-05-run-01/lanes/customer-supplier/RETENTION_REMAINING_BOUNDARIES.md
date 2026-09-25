# Customer retention boundaries requiring separate verification

Source review date: 2026-09-05. These findings accompany CS-F05 normalization and are not claims that concurrent retention or all continuing operations have been verified.

## Read/check/write race

The management retention owner in `services/customer/customer.service.ts` reads counts for sales orders, ledger entries, receivable documents, statement snapshots and settlements. It then updates the customer by ID. These statements do not share an explicit transaction, snapshot, or admission lock. A producer could add the first history row after the count read but before the `deletedAt` update. Soft deletion preserves the physical row and foreign keys but can hide it from reads that require `deletedAt: null`.

For example, the statement generator (`services/accounting/customer-statement.service.ts`) reads an organization-scoped nondeleted customer before preparing its snapshot. The ledger owner (`services/accounting/customer-ledger.service.ts`) reads the customer and conditionally updates its balance using organization, balance and nondeleted scope before inserting a ledger row. Neither source inspection establishes a shared serialization contract with customer removal. Wrapping only the removal method in a transaction does not by itself establish complete producer coordination. Real PostgreSQL interleaving tests and a reviewed common lock/admission or atomic retention policy are required before calling this race resolved.

The CS-F05 bounded change reuses the existing retention policy for formerly inconsistent entry points. It reduces their known unconditional archive defect; it does not introduce or certify a new concurrency policy. No history rows are deleted by that change.

## Settlement of inactive customers

`services/accounting/customer-settlement.service.ts` around the customer lookup in the recording path requires `isActive: true` as well as `deletedAt: null`. A customer deactivated to preserve financial history therefore remains available for statement and ledger reads but cannot necessarily receive a new settlement through that owner. Existing exact settlement replay occurs before this lookup; new settlement continuation needs separate analysis against actual pre-existing receivables, allocations, authority, period and payment controls.

The legacy archive path already prevented settlement through `deletedAt`; normalization to deactivation does not make the prior path less permissive, but it does not fulfill this continuing-obligation requirement. A follow-up should distinguish new commercial use of an inactive customer from authorized collection/correction of its existing obligations. Do not remove the active check without tracing those controls and testing the legitimate retained scope.

## Verification status

Both are source-confirmed boundary gaps. Their precise concurrent or customer-facing failure paths have not been exercised by this lane. No production target, customer record, ledger, settlement or schema was changed while reviewing them. Keep these items open in the customer archive workflow until source corrections and isolated runtime evidence exist.
