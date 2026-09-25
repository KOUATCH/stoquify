# CS-F05 verification plan — prepared, not executed

This is a read-only plan following the customer lane's source review. No customer records or permissions were changed while preparing it.

## Actual entry points

The reachable modern route is `/{locale}/dashboard/customers`. The row menu uses Archive/Archiver and confirms in “Archive customer”/“Archiver client”. It requires `customers.read` and `customers.delete` with current Sales availability. It calls `deleteManagedCustomer`, now using the same retention owner as the older exported delete/archive services. There is no current component consumer of the legacy removal hook; a browser visit must not be reported for that legacy path.

## Small isolated fixture

For a later authorized browser batch, keep the exact five browser organizations and use uniquely prefixed new customers and a new limited reader/remover role/user in the existing legacy synthetic organization. Keep all current users, passwords, roles, grants and configuration unchanged. Existing Sales eligibility should be revalidated with the real evaluator. Do not add accounting/payment permissions or alter existing customer obligations.

Prepare an unused customer with no sales orders, customer ledger entries, receivable documents, statement snapshots or settlements. Prepare a second customer with a clearly labeled, immutable synthetic statement-history input, using the same disclosed input boundary as the statement retry proof. Its real snapshot hash and record count should be recorded; this is retention input, not proof of posted financial activity or approval. Prefer a genuine existing owned historical record where available and explicitly bound to this purpose.

## PostgreSQL checks

Use the controls database and new source-owned fixtures for the exported management/archive/direct service paths. For each path verify the exact `{id,mode}` or retained DTO contract, not a generic truthy result. An unused customer becomes inactive with `deletedAt` set; a historical customer becomes inactive with `deletedAt` still null. Missing/foreign-tenant IDs reject without changes. Snapshot/ledger/order/settlement counts never decrease. Read the retained customer through an existing permitted nondeleted-record read. Ordinary fixture rollback may isolate these cases but cannot establish production concurrency safety.

## Actual EN/FR browser checks

Use genuine sign-in with the new limited actor. Open each owned customer's row menu, inspect the actual confirmation text, and confirm the explicitly selected fixture only. Compare DB state and history counts immediately afterward. Verify archive versus deactivation feedback and that retained history remains accessible using the current inactive/all-customer filter or direct permitted detail read. Capture desktop/mobile result states and keyboard focus return. A denied user must see a denied state/no archive affordance; no mutation should be sent unless a separate direct-action negative is deliberately instrumented.

For a recoverable list refresh failure, use a bounded browser request interception only after the actual removal commits, preserve the known removal receipt, and record the artificial transport-fault boundary. Never simulate a successful removal response. If this UI does not expose a controllable refresh request, leave that branch to the focused hook/action tests instead of presenting a fabricated browser proof.

## Limits to keep open

The existing retention decision counts history and later updates the customer without shared serialization with producers. A transaction around the removal alone is not evidence of a complete race fix. Do not claim concurrent history creation is safe without a separate coordinated producer/retention test and source design.

The settlement owner currently requires an active customer. Deactivation can still prevent recording a new settlement for an existing receivable. This plan verifies retention and truthful removal only; it must not claim that collection/correction of all remaining obligations is supported. Do not remove that active check or manufacture financial approval as a test workaround.

Source references: `services/customer/customer.service.ts`; the customer lane's `LEGACY_RETENTION_REMEDIATION.md`, `RETENTION_REMAINING_BOUNDARIES.md` and `evidence/LEGACY_RETENTION_VERIFICATION.json`. Rebind their current hashes before execution.
