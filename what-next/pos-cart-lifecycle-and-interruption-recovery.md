# POS cart lifecycle and interruption recovery

Execution date: 2026-09-20. Route: `/en/dashboard/pos` (French copy also provided).

## Root cause and implementation

The server retained draft lines, but the active-cart query had no parking/retirement state. Park sale was a placeholder. The only pre-submission request copy lived in tab storage, and a retained attempt could block an unrelated cart after a shift transition. Prior recovery covered only an empty draft belonging to a closed shift.

The implementation adds `SalesOrder.posCartState` (ACTIVE/PARKED/RETIRED) and a session-owned `POSCheckoutWorkspace` containing a short checkout ownership lease and durable original request. `POSCommitResult` remains the financial result authority. No financial status enum or posting boundary is replaced.

| Event / evidence | Cart treatment | Attempt / cashier action |
| --- | --- | --- |
| Reload, navigation, logout, tab close, crash, server restart before submission | Keep server draft | Resume with current price/tax/stock checks, or start new and park |
| Explicit park / Start new sale | Mark PARKED; preserve lines and ownership | Excluded from active selection; original cashier can resume at same location |
| Resume parked cart | Copy into current shift's active draft and retire source | Explicit action; current prices/taxes/stock checked; original history preserved |
| Lost checkout response | Keep exact server request and clientCommitId | Authoritative read; recorded result recovery or idempotent retry |
| One lookup returns NOT_FOUND | Preserve pending request | Retry original, or explicitly review current cart; never treat absence alone as failure |
| Successful shift close | Retire ACTIVE drafts transactionally; preserve PARKED and line contents | Close fences late commits; settled recovery locks are audited |
| Old closed-shift draft from before this change | Retire only after checking scoped result/queue evidence | Automatically remove verified obsolete blocker; retain history |
| Offline pending/conflicted work | Preserve queue and replay identity | Reconcile through existing offline review; retirement/close blocked |
| Another tab owns checkout | Read-only register view | Close other tab and check access; server lease expires after 60 seconds |
| Ownership/connectivity cannot be verified | Keep draft and request | Explain blocker; retry access on reconnect/focus or explicit action |

Parked carts have no automatic expiry. Ownership is the original organization/cashier/location; another cashier cannot resume them through these actions. Cross-shift resume creates a new active identity. No draft retirement adjusts physical stock or hard-deletes lines.

## Controls and compatibility

- All browser writes require a UUID checkout lease. Services check ownership inside the same serializable transaction as editing/commit; database compare-and-set fences expired/competing owners. Web Locks prevent duplicated tabs from sharing a cloned session-storage owner ID.
- Scope checks bind organization, authenticated cashier, location, terminal, shift and cart. Recovery reads remain read-only; reconciliation commands audit verified state transitions.
- The authenticated action durably prepares a request before financial submission. Legacy v1 tab requests are imported without changing their identity. Unknown historical attempts are preserved independently of the current workspace.
- Existing financial idempotency, inventory/ledger/payment transactions and offline replay paths remain authoritative. Cart revision schema 2 includes the monotonic cart version: explicit recovery review fences the old request even when timestamps share a millisecond. Reviewed requests retain their original identifier while permitting corrections; preparing the next submission removes edit permission again. Browser ownership IDs are excluded from the financial request hash.
- Existing module policy gates are reused for cart lifecycle mutations and tender writes. No grants, billing packages or payment methods are introduced.
- English/French lifecycle copy, explicit blockers, native keyboard buttons and shift-close explanation use existing POS controls.

Migration: `prisma/migrations/20260920060000_pos_checkout_lifecycle/migration.sql`. Additive column/enum/table/index only; defaults retain existing active drafts. Applied and marked in migration history only on the verified local PostgreSQL database `localhost/stoquify_replay_next_20260830`. Production deployment was not attempted. Generated client and server process must be refreshed together.

## Verification

- PASS: 137 tests across 11 focused suites: POS UI recovery/receipt visibility, lifecycle service, authoritative recovery, shift close, cart transaction/revision, tender actions/provider evidence, cart write authorization and financial POS service regressions. This includes live-price-change rejection before payment/posting and version-based fencing with equal timestamps. A final targeted rerun covered the added recovered-sale summary.
- PASS: five PostgreSQL boundary tests in isolated `codex_pos_lifecycle_20260920`: concurrent ownership, request/line preservation after close, atomic rollback, tenant/cashier isolation, and edit-versus-close serialization with late-edit rejection. The test creates its own tables/enums and removes only its own schema. These tests exercise actual PostgreSQL transactions, but deliberately omit unrelated foreign-key fixtures and do not certify the complete payment/ledger stack.
- PASS: `npm run typecheck` and affected-file ESLint. EN/FR lifecycle keys match; JSON parses and diff whitespace checks pass.
- PASS: Prisma schema validation and `node scripts/ensure-prisma-client.js`. Generator wrote current JavaScript/types but hit an engine DLL lock before updating copied schema metadata. Verified the generated inline schema against source and SHA-256 equality of the installed/generated native engines, then completed only the metadata copy. The normal client-current check passes. Next.js's supported configuration-file reload restarted port 3000 without changing config contents; manual process termination was unnecessary.
- PASS on the isolated validation server: reload offered Resume cart / Start new sale; resume retained all three lines (quantities 12/14/21) and enabled Charge at FCFA 106,848; Start new sale parked the original and displayed an empty active checkout; explicit parked-cart resume restored the same lines/total into a new active identity. Another tab displayed the ownership explanation with editing and Charge disabled.
- No real sale, payment, inventory movement or shift closure was submitted in the browser. The previous active draft remains in history after the park/resume test. The current cart contains the same products and quantities.
- PASS on original port 3000 after server refresh: restored server-owned draft appeared with Resume / Start new actions. French route displayed translated cart-recovery controls; pressing Enter on Reprendre le panier enabled Encaisser 106 848 FCFA. Returned to English and resumed the same cart. The second browser tab was closed, and the temporary port-3001 server/cache/TypeScript include were removed.
- Read-only database verification: original cart `cmu9bi2pw007fmacc095ui6qx` is RETIRED/DRAFT with all three line quantities 12/14/21 preserved; active cart `cmu9s8q070063ma1s2ilw87nr` is ACTIVE/DRAFT with the same quantities and total 106848. There are zero POSCommitResult rows for these two carts. No financial sale was created by the browser checks.

Commands: the prompt's focused Jest invocation was expanded to include the lifecycle, cart revision/transaction, action and existing POS service suites. PostgreSQL tests require `RUN_POS_LIFECYCLE_POSTGRES=1` and a localhost `DATABASE_URL` with `schema=codex_pos_lifecycle_20260920`; they refuse any other target or an already-existing fixture schema. Generic build/migration-deploy commands were not used.

Initial verification failures were resolved: test fixtures gained the required lease; shift-close copy was moved outside the counted-cash label to preserve its accessible name; the disposable database fixture gained its own enum types. Final failures: none in the completed checks above. Untested: actual OS crash/logout automation, production deployment, real provider/ledger transactions, full screen-reader certification and long-running offline-device chaos. Browser reload plus durable-database recovery cover the persistence mechanism, not an assertion that every shutdown event was physically simulated.

## Review lenses and limits

Architecture, database, security/ownership, frontend/workflow, localization, audit, finance boundaries, offline consistency and operational recovery are material and covered by the implementation/checks. Full legal/tax/accounting/security/accessibility/release certification is not claimed. Statutory/country-pack changes, AI/agents, commercial packaging and analytics are not applicable: this change adds no statutory rules, agent actions, billing behavior or analytical model.

Browser shutdown is never evidence of financial failure. No correctness path depends on an unload request. A client-only offline event not yet disclosed to the server still depends on the existing enrolled-device reconciliation protocol; this task does not rewrite offline transport.
