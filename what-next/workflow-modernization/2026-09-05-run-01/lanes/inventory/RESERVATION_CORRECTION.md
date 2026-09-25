# Manual reservation request correction

Current state: request guards and mutation feedback corrected; the complete reservation lifecycle remains unfinished.

Both existing public manual-reservation adapters now require inventory.levels.adjust, derive actor and organization from current RBAC, reject mismatched caller organizations, and enforce the existing inventory write decision before calling the stock owner. The positional compatibility action delegates through the same guard. The legacy helper additionally returns its already verified permissions so the gate can use them; its scope/authority checks and other callers' behavior are unchanged. A denied batch reaches none of its reservations.

The reservation hook now treats structured failure as failure, suppresses success and cache invalidation, uses EN/FR guidance, and disables automatic mutation retries even if a provider's defaults enable them. Unknown network/service outcomes instruct the operator to inspect current records before another request. Existing read hooks are unchanged.

Before correction, 21 of 26 new tests failed. After correction, all69 tests across five focused/shared suites passed. Five changed source/test files passed lint, and full typecheck passed (session23336, chunkdf0cab). Source hashes and exact limits are in ../../evidence/inventory-reservation-receipt.json. The baseline npm.ps1 invocation dropped requested flags; its console result is retained, and the successful final run invoked the bundled Node/Jest entry directly with exact serial/path/JSON flags.

The action tests mock RBAC/module/stock collaborators and verify that denied requests never reach the kernel. Existing module suites exercise grant validity, explicit-empty/missing/duplicate grants and write/dependency semantics. Real hook behavior is tested in both languages. No production consumer of the reservation hook was located, so no actual browser/manual-reservation journey is claimed.

Open work: source-bound partial/full release and expiry, durable request idempotency, partial batch recovery, reviewed stop admission and transaction-level revocation policy. A new-work stop currently names adjustments, transfers and counts; it does not define manual reservations. No blanket stop was added to the shared stock kernel, which also serves retained receiving, delivery and POS obligations. No stock calculation, valuation, ledger posting, schema or rejected offline/POS proposal changed.
