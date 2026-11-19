# Source integration review — 26 October 2026

The Phase 13 capture contains 8,016 files and differs from Phase 12 by 43 changed source paths and 18 additions. The package manifest, lockfile, schema and all 120 migration SQL files are unchanged from the reviewed dependency/migration baseline. The exact list is in source-delta.json. This phase initially owns only verification runners and evidence; application edits, if required by a reproduced defect, must be recorded separately.

## Reviewed changes and required evidence

| Area | Inspected behavior | Selected verification / limit |
|---|---|---|
| Inventory valuation | POS issues allocate from the retained value pool; final depletion consumes its remaining cents. Full-sale returns match retained original sale movements and restore their recorded cost, preserving reversal links. Existing negative-stock policy remains separate. | Mocked valuation tests plus real depletion, partial quantity, return, replay, period, contention and rollback tests. No generalized costing-policy certification. |
| Reservations | Caller retains a request identity. Batch submission uses one stock event and transaction instead of independent per-line calls. Server actor, module and tenant checks remain. Quantity precision, bounded lines and request identity are validated before posting. | Action and hook tests; real batch rollback, changed-payload rejection, replay and competing reservations. The compatibility call without an identity now fails closed. |
| Cache refresh after commit | Shared helper attempts independent invalidations and logs a safe warning if they fail. Cache or logger errors do not replace a successful committed result. Domain failures remain failures. | Regression tests for purchasing, AP, inventory transfers and the shared helper. This is not a background cache-repair system. |
| Goods receipt reads | Current permission identity and enforced purchasing read entitlement precede the existing tenant-scoped queries. | Revocation, foreign-tenant, module-denial and read-only allowance tests. |
| HR authentication recovery | Initial denied reads expose the existing password re-verification gate. Client wrappers retain structured error codes, use current scope keys, and route freshness denials through the shared recovery hook. Verification does not automatically resubmit business mutations. | Eight explicit component files covering EN/FR, late responses, scope replacement, draft retention, focus return, uncertain commands and safe denial. DOM tests are not authenticated browser evidence. |
| HR authority loss | Controlled review clears visible private facts on authority loss while retaining an uncertain command only for exact authorized recovery. Task/correction workspaces hide private details after denial and distinguish committed writes from failed reloads. | Existing and new denial/recovery component tests; real server authorization remains authoritative. |
| Public workflow preview | Active previews and the placeholder share one invisible sizing guide. Reduced-motion rendering retains the reserved progress footprint. | Landing/recovery tests assert guide count and keyboard selection. No new animation library, branding or financial source is introduced. |
| TypeScript scope | Main config adds a generated public-preview type directory. Existing exclusions remain. The explicit workflow config includes changed inventory/purchasing files and their tests otherwise omitted by the main config. | Both configured-project and explicit workflow type checks; no emission or incremental output. |

The reviewed HR hook still increments a response-generation ref during cleanup. Its prior lint warning is not suppressed. The updated hook also invalidates outstanding challenges when recovery opens, closes or succeeds; the component suite tests stale replies rather than assuming this is correct from inspection.

## Database boundary

The external repair runner was inspected but is not reused: it derives its target from application configuration and uses schema push. The Phase 13 runner instead reads only this task's retained disposable-cluster identity, requires the cluster to be stopped, binds 127.0.0.1:65404, checks the actual data directory/address/port, and refuses any existing target database. Each selected lane receives a fresh database with all 120 migration files replayed and recorded checksums compared to the capture.

The three selected lanes are Command Center persistence, stock integrity, and receiving-to-POS-to-correction reconciliation. The latter includes synthetic cash/journals and a scoped temporary failure-injection trigger with cleanup. It uses synthetic zero-tax posting rules; it cannot qualify country accounting or production tax behavior. Only this owned cluster is stopped after the run. No live delivery, production access, shared schema promotion or application database reset is permitted.

## Tooling and discovery

The workflow validator passed; 196 package scripts remain unclassified. New broad discovery configurations are not run as general audit commands. Test paths are explicit, and real database files are excluded from mocked lanes. Node-loader and Jest-resolver checks both reject dependencies outside the task-owned clean Phase 11 package directory. Reuse of that install is recorded as reuse, not a second clean installation.

Existing August 9 knowledge graphs locate inventory action communities 111 and 93 and inventory movement hook community 27 (nodes inventory_inventoryactions_ts, inventory_inventorymovementactions_ts, useinventorymovementqueries_ts). They contain no matching new HR recovery or public preview nodes. These stale graphs are discovery evidence only; behavioral findings above come from captured source and tests.

The project UI/UX Pro Max focused query “modal dialog focus return recovery” returned ux-guidelines.csv entries for Interaction/Focus States, Feedback/Error Recovery, and Accessibility/Focus Appearance. Visible focus and clear recovery are applicable to the existing React/Next surface. The enhanced focus-appearance item is AAA guidance, not an AA certification. No generic palette or framework-upgrade advice was adopted. Existing master, shared Command Center and public/auth contracts remain authoritative.

New AF16 build/finalization/runtime helpers were inspected for their external effects and remain unexecuted. Their separate database, build and publication work is not certified by this phase. A sealed artifact and authenticated runtime acceptance remain separate release gates.

## Verification-driven fixture corrections

The first real database run exposed two fixture failures before the intended scenarios: a bare CLOSED update violated the retained period-control receipt trigger, and the second checkout cart omitted its required customer. The stock test now sets up a synthetic retained receipt and consistent close markers transactionally, following the existing opening-cutover fixture pattern. This repairs one shared test file and does not certify the close-approval workflow.

The captured cross-workflow test incorporates narrowly reviewed corrections already present in the shared workspace: customer binding, explicit zero purchase defaults and observing indirect backend blockers instead of only SQL text mentioning inventory levels. Its original bytes and all before/after hashes are retained. Later shared additions, including a new receiving/general-ledger scenario, were not silently added to the frozen test scope. No production service, migration or database guard was weakened.

Retries reuse only the initial run's named, synthetic databases after verifying cluster identity and all 120 migration checksums again. No database reset occurs. The first retry passed the seven workflow assertions but failed its final evidence write because the runner had not created the new report folder; the corrected runner repeats that complete suite and preserves both earlier receipts. Native browser evidence and its limits are documented in [visual review](VISUAL_REVIEW.md).

The two cross-workflow PostgreSQL files are outside both selected repository type-check configs. A third explicit, no-output config checks those files and their transitive imports; this does not widen or alter the shared project's configuration.
