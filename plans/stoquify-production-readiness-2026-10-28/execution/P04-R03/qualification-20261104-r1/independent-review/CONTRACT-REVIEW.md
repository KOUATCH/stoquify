# P04-R03 independent acceptance contract

Reviewed 4 November 2026 by the independent `r03_review` agent before implementation acceptance. This is a review contract, not a passing qualification result.

The bounded obligation is the nine unsafe catch paths in `actions/item/items.ts`: get, list, basic information, details, pricing, relations, stock, tracking and delete. Create and canonical edit already use the shared safe-action helper and must retain their existing behavior. Parent P04 and production admission remain blocked.

- Replace arbitrary client exception messages without widening permissions, changing tenant derivation, changing service calls, changing transactions or adding direct persistence.
- Execute the existing canonical response/logging machinery, but do not assume its name guarantees confidentiality. It deliberately exposes thrown strings and coded application-like errors in some branches. The item boundary must supply a safe default and restrict retained business messages to approved provenance and literal values.
- Retain the explicit `Item not found` read result and current approved item, image, SKU-conflict and stock-location/business outcomes. Preserve success data/messages and cache invalidation. Unknown typed/coded errors are not approved business messages merely because they carry a code.
- Exercise actual normalization against arbitrary guard/service errors, Prisma failures, provider-like coded errors, thrown strings, invalid input, approved business failures, fresh authentication, and Next control-flow exceptions. The complete serialized client result must contain no injected private sentinel, stack or private metadata.
- Denied requests must not invoke item services or cache invalidation. Stock adjustment's second `inventory.stock.adjust` guard must remain before any stock-policy write. Authorized reads and all seven mutation success paths need positive evidence.
- Native evidence must use a fresh disposable loopback PostgreSQL cluster and database. Preserve all earlier R01/R02 clusters, current migrations and unrelated working-tree changes. Compare relevant business relations before and after denial; count permitted security-audit effects separately. Include tenant-bound related identifiers and transaction rollback after a failed stock adjustment.
- Better Auth/Next transport stubs must be reported explicitly. Item RBAC relies on Better Auth for session validity; a fake transport returning only a user ID does not prove real signed-cookie expiry/revocation or browser behavior.
- Bind the repair and evidence to captured current source hashes; preserve historical P04 characterization. Record exact commands, inspected side effects, results, failed attempts, cleanup and remaining limitations. Independent review must reconcile receipts with tests/source and confirm only this child package advances.

No implementation or tests were edited by this reviewer.
