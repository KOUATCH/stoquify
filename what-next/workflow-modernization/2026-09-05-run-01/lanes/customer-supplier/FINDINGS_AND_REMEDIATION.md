# Customer and supplier workflow lane — first batch

Evidence date: 2026-09-05. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. The shared working tree already contains other agents' and user changes. This lane preserves them. The parent owns the complete baseline and register merge; the lane register is an explicit, incomplete discovery denominator, not a claim of platform coverage.

Read the complete workflow-modernization brief, root `AGENTS.md`, the enterprise-form-service-workflow skill, relevant current route/action/component/hook/schema/service source, and the historical Astra traces. Graph hints checked include customer action community 13; customer/supplier management hook communities 18/19; customer statement portal community 7; customer statement actions community 81. Important behavior below was verified against current source, not inferred from the graphs.

## Delivered fix: CS-F01 / CS-F02 — time-dependent retry failure

`submitCustomerStatementRecipientActionInTx` and `submitSupplierPoProposal` validated their relative future-date windows before checking for an existing response with the same idempotency identity. An accepted promise or supplier change request, retried after its requested date passed while the token remained valid, was rejected. The stored evidence had not changed. Changing the payload under the same key also returned the date error before the intended identity-conflict error.

The new tests first create a result through each service using an injected transaction double, retain the exact generated payload/state hashes, then retry the same command two days later. Before the source correction, **4 tests failed and 16 passed**: both exact replays failed, and both changed-payload cases returned the wrong failure. This is an executed unit reproduction, not a real PostgreSQL or browser observation.

The correction keeps token verification, current expiry/revocation/object scope, immutable snapshot/envelope integrity, static input checks, amount constraints, and payload identity before replay. Only the relative date-window check moves below the existing-result branch. A new response still needs a future date within the same 365-day customer or 730-day supplier bound. An exact authorized retry returns the original result and records the existing access audit; it creates no new proposal/action, lifecycle state, business event or successful-creation audit. Changed payloads remain conflicts.

Changed production files:

- `services/accounting/customer-statement-recipient-action.service.ts`
- `services/purchase-order/supplier-po-acknowledgement.service.ts`

Focused tests:

- Extended `services/accounting/__tests__/customer-statement-recipient-action.service.test.ts`.
- Added `services/purchase-order/__tests__/supplier-po-proposal-retry.test.ts`.

After the correction, **34/34 tests across six suites passed in 4.518 seconds**. This includes adjacent customer access/token and supplier token/authority-boundary tests. Four-file lint passed. No UI, translation, schema, shared authorization, provider, or POS/offline change was made. Browser, real-database concurrency and persisted side-effect verification remain outstanding and are coordinated through the parent.

## Other concrete findings retained for the next batches

| ID | Finding and impact | Evidence / next work |
| --- | --- | --- |
| CS-F03 | Management creation previously misreported successful inserts as failures when aggregate reload or route invalidation failed. Corrected in the second batch with committed identity receipts, separate cache status and EN/FR refresh guidance. | See `CREATE_OUTCOME_REMEDIATION.md` and `evidence/CREATE_OUTCOME_VERIFICATION.json`: 46 focused tests passed. Real runtime verification remains pending; network-unknown outcomes and analogous update reload ambiguity are not claimed resolved. |
| CS-F04 | Automatic codes use tenant row count + 1. An explicit existing `CUST-0002`/`SUP-0002` with one record makes the next automatic creation hit the same existing code; concurrent automatic creates can also collide. | `nextCustomerCode` and `nextSupplierCode`. Source-confirmed allocation weakness; not a demonstrated lost write. Add deterministic collision/concurrency tests before choosing the existing allocator or a bounded retry. |
| CS-F05 | Legacy/direct customer deletion now shares the management retention owner, keeps the actual archive/deactivation receipt, and rejects missing objects. The legacy hook rejects actual failed action envelopes and explains EN/FR removal/refresh status. | See `LEGACY_RETENTION_REMEDIATION.md`: baseline 15 failures, final 43 passing focused checks. PostgreSQL/browser removal verification, the existing retention race, and inactive-customer settlement continuation remain open in `RETENTION_REMAINING_BOUNDARIES.md`. |
| CS-F06 | The public customer-statement portal uses literal English loading, error, submission and recovery text; it does not currently expose the supplier portal's locale-aware experience. | `app/customer-statement/[statementId]/CustomerStatementPortal.tsx` and its unlocalized route. Source-confirmed EN/FR gap; requires explicit locale/snapshot propagation and full changed-interface verification in a later UI batch. |
| CS-F07 | Public statement/envelope success responses set private no-store, no-referrer and nosniff headers; the error branches return a generic envelope without those same headers. | Four public route handlers and `lib/error-handling/route-response.ts`. Source-confirmed header inconsistency; deployed caching/privacy behavior has not been measured. Scope a domain-local response wrapper or coordinate a shared correction with the parent. |
| CS-F08 | Actual PostgreSQL token issuance failed when optional metadata was omitted because JSON null violates the existing object-or-SQL-NULL constraint. | Corrected the issuance default to `Prisma.DbNull` without schema changes. See `ACCESS_METADATA_REMEDIATION.md`: 1 failing baseline and 25 passing focused checks; exact isolated real-PG rerun requested. |

No outstanding engineering finding is classified as an external approval requirement. No external messages, database operations, migrations, provider calls or browser sessions were executed by this lane in the first batch.

## Current workflow map and effects

Customer management uses dashboard/standalone pages → `useCustomerManagement` or legacy customer hooks/actions → tenant-scoped customer service → Customer and related sales/receivable/statement history. Supplier management follows the analogous flow and invalidates supplier/item query keys. These source paths were identified; all CRUD success/denial/concurrency/browser cases are not yet verified.

Customer statement generation freezes an accounting snapshot; controlled delivery issues bounded access and queues a worker-owned delivery. The public view checks the signed token against live status and snapshot hash. Dispute and promise submissions create hash-bound recipient evidence, not payments or ledger postings. Supplier invitation freezes a redacted purchase-order envelope; the public accept/reject/change response is a proposal. Buyer review records its decision and does not itself modify the authoritative order, inventory, AP or ledger. The first fix preserves these boundaries.

## Reviewer implications and operating guidance

- Architecture/backend/data/security: service-owned retry identity and existing serializable boundaries remain; real database races and access-revocation concurrency are unverified.
- Finance/audit/purchasing: retained proposal evidence is reused; the change does not assert settlement, posting, approval, or authoritative order modification.
- UX/localization/accessibility: fewer false failures on an exact retry; no interface changes in this batch, and runtime/EN/FR/keyboard/mobile coverage remains incomplete.
- Operations/SRE/events: successful access audit remains intentional on replay; no additional business/outbox effects. No latency or production-readiness claim.
- Statutory/country rules, HR/payroll, POS/offline, AI/agent execution and billing-provider behavior: not applicable to this bounded date-check relocation; their policies and code are unchanged.

For an interrupted response, retry the same command identity and payload while the invitation remains valid. If a link expires or is revoked, the existing authorized sender must issue appropriate new access under current controls; the change does not bypass that requirement. A new commitment requires a valid future date. There is no new customer-supplied field, approval document, migration or setup operation.

Rollout is an ordinary application change after the parent's complete validation. Existing records need no migration. Reverting these two source changes restores the old retry defect; it does not require changing or deleting durable evidence. Future verification must use isolated synthetic tokens and never issue real messages or payments.
