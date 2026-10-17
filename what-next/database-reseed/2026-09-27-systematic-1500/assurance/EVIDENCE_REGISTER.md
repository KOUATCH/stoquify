# Reseed evidence register

Scope: local synthetic development data, minimum 1,500 on-hand units per item across its organization. This register records actual evidence and outstanding requirements. It grants no production, legal, security, accounting, accessibility, or release certification.

## Final applied source checkpoint

The preserved original local database `stoquify_replay_next_20260830` was reseeded after candidate validation. The independent read-only business audit at 11:30:55 UTC recorded 216 physical tables and 23,972 rows, with 74 empty tables. After normal browser authentication and audit activity, the refreshed `source-final-profile.json` records **216 tables and 23,988 rows**; the stock floor and identity-preservation checks still pass. Empty technical/approval/runtime models were not filled with invented evidence.

The source preservation report confirms no baseline names/identities/grants removed or changed: 81 users and credential accounts, 79 roles, 26 payroll employees and 81 role memberships were added. All 41 items meet the 1,500 total-on-hand requirement. The final coordinator integrity report checked all 572 foreign keys with no orphan, cross-tenant reference, inventory availability/valuation, missing item-reference or movement/projection findings. See run-root `source-final-preservation-check.json`, `source-final-stock.json` and `source-final-integrity.json`.

Both candidate and applied source business audits pass **14 of 17 invariant families**. The three retained legacy failures are **24 receipt/movement source mismatches, 24 invalid sales-line calculations, and 24 sales header/line tax mismatches**. The sales findings concern the same 24 issued/posted sales fixtures, not 48 independent documents. **All 24 draft AP repairs were applied and their header/line/tax tie-outs now pass.** No immutable sales, provider, payroll or fiscal evidence was rewritten. The source and candidate generic-payload scans each retain 192 suspect fields across eight model/field pairs.

Canonical candidate and independently executed source inventory reconciliation both have zero monetary drift for the seeded organizations (57,620,125.00 and 56,858,075.00 XAF), while retaining a blocked evidence result for 48 legacy movements lacking stock business events. The source result is recorded in run-root `source-inventory-canonical-reconciliation.json` at 2026-09-27 11:31:08 UTC, in a read-only transaction. Quantity/projection correctness does not close historical source-evidence failures.

Source scenarios actually created 29 customer-location links, two module composition drafts and two time-policy foundations with 120 attendance inputs. The module drafts preserve legacy active modules; accounting/provider/payroll/compliance setup remains `WAITING_INPUT` where the service reports it. The time foundations remain `DRAFT` / `NOT_CERTIFIED_FOR_PAYROLL`. These statuses are truthful unfinished workflows, not failed row generation or evidence that can be supplied by Markdown.

## Current evidence

| Evidence | Producer | What it establishes | Limit |
|---|---|---|---|
| `schema-coverage.json` / `model-coverage.md` | `build-assurance.cjs --metadata-only` | 211 current Prisma models, 207 enums, per-field types/keys/FKs/indexes, application-reference candidates, SQL migration declarations, all model population decisions and baseline counts | Source metadata is distinct from live catalog checks. Direct seed references are discovery hints, not workflow proof |
| Run-root `baseline-profile.json` | Coordinator baseline audit | Original target identity, 216 physical tables and 14,851 rows, identity/role preservation baseline | Point-in-time before candidate changes |
| `gate-execution-results.json` and individual gate artifacts | Actual repository static gates | Independent pass/fail results; no short-circuit after first failure | Static source/evidence checks do not prove runtime behavior |
| `business-invariants.json` / `.md` and `source-business-invariants.json` / `.md` | `audit-business-invariants.cjs`, with `--source` for original target | Independent read-only candidate and applied-source journal, sales/AP, payroll, refund, reconciliation-proof, stock-count arithmetic checks and generic JSON scan | Separate timestamped snapshots; candidate artifact is never overwritten with source evidence |
| `financial-fixture-inspection.json` | `inspect-financial-fixtures.cjs` | Specific malformed fixtures, payment/issued-document relationships and live immutability trigger definitions | No database writes; IDs and amounts only |
| `prisma/systematic-reseed-financial-repair.ts` | Controlled draft fixture repair | Preview/apply with protected-evidence checks and audited before/after | Does not repair issued sales, post invoices, certify tax treatment, or release payments |

## Gate status and ownership

| Gate | Executed result | Classification / next action | Owner |
|---|---|---|---|
| Inventory valuation truth | PASS | Keep final quantity/projection/valuation/runtime reconciliation evidence alongside static result | Inventory / accounting |
| Ledger close truth | PASS | Journal balance checks pass; actual source-document correctness still required | Accounting |
| Payment cash truth | PASS | Refund bounds and signed-run actor/timestamp checks pass; immutable provider payload authenticity remains a separate concern | Payments |
| Purchasing AP consolidation | PASS: 11/11 after source-contract repair | Checks follow extracted PO maker/checker, caller-owned receiving transactions, session/fresh-auth/revision-bound supplier approval and the fail-closed legacy adapter. All 11 checks retained; 33 focused regressions pass | Purchasing / QA |
| Role operating cockpit | PASS: 9/9 after gate contract repair | Current service-owned name/currency/timezone, organization scope, EN/FR recovery keys and stale-session/permission/no-organization branches are now checked. All nine original checks retained; 28 focused regression tests pass | Frontend / IAM / QA |
| Statutory country pack development | PASS | Supports development/sandbox only | Country pack |
| Statutory country pack production | FAIL: `source_artifact_expert_approval` | Requires actual reviewer identity, reviewed/effective dates, approved fixture-family list, signed-off approval artifact and verified SHA256 bound to source manifest; synthetic reseed documentation cannot satisfy it | Qualified country-pack reviewer |
| Workflow assurance release | PASS | Canonical static registry structure passes; generic seeded definitions/runs are not equivalent to executions of that registry | Workflow assurance |

Role-cockpit marker drift was repaired: the old gate searched for `select: { name: true, currency: true }`, whereas the current service legitimately selects `name`, `currency`, **and `timezone`**. The loading route obtains `dailyDigestRecovery` translations instead of embedding `Preparing Daily Digest` directly. The gate now inspects the actual selection fields and localized contracts, with mutation tests proving removed fields, tenant scoping, auth-state branches, translation keys, alert semantics and recovery wiring still fail. This resolves static evidence drift; browser behavior remains a separate verification requirement.

All eight static gates were re-executed after repairs: **seven pass; the production statutory expert-approval gate remains blocked**. AP marker drift was similarly verified against current code: `assertPurchaseApprovalOrder` rejects missing/same maker identity before mutation; receiving wrappers preserve a caller transaction or open one; reviewed supplier approval binds current session, permission, five-minute password assurance, reviewed revision and posting transaction. Negative regression mutations demonstrate that these protections still fail the gate when removed. This static result does not cure invalid historical receipt/sales fixtures.

## Data evidence exceptions

Initial candidate audit found 24 sales lines with invalid arithmetic and 24 sales-header/line tax mismatches. Each affected sales order has a journal, accounting source link, issued receivable document and payment. Their posted/issued history cannot be rewritten to achieve a green check. The original generator independently invented sales header totals and line totals in `prisma/comprehensive-seed.ts`, `seedSalesAndPayments`. Correction requires a documented reversal/correction lineage or an explicit preserved historical-fixture exclusion from trusted demonstrations. Mere status changes do not cure these records.

The 24 AP invoices initially had DRAFT status, zero header totals, no document/approval/posting hashes and no receipt/PO-linked lines. Their pending payment allocations reference DRAFT supplier payments with no released or posted proof. The guarded repair recomputed draft arithmetic from existing quantity/unit-cost/tax-rate snapshots and downgraded unsupported match claims to unresolved exceptions in both candidate and source, with before/after audit records. These remain draft invoices pending real receipt/match evidence.

The initial generic-payload scan found 192 fields across eight model/field pairs (24 each): `PayrollRunLine.calculationSnapshot`, `PayrollRunLine.ruleProvenance`, `POSOfflineEvent.payload`, `ProviderEvent.rawPayload`, `BusinessEvent.payload`, `BusinessEventOutbox.payload`, `FiscalDocument.canonicalPayload`, `WorkflowAssuranceCheckDefinition.sourceTables`.

| Payload family | Integrity boundary | Legitimate next action |
|---|---|---|
| Provider raw payload | Live trigger protects raw payload/hash/signature evidence in every state | Preserve; retain explicit synthetic/legacy limitation; ingest new legitimate sandbox-shaped events through adapter services |
| Fiscal canonical payload | CERTIFIED/REVERSED content is immutable; certified document can only follow supported reversal transition | Preserve; create properly labelled sandbox fiscal scenarios through fiscal-document/outbox services; never invent authority approval |
| Payroll calculation/provenance | POSTED/ARCHIVED run-line content is immutable; already calculated/emitted history also has downstream truth obligations | Preserve sealed history; compute new or corrective runs through payroll services with actual source manifests |
| Offline event | Payload hashes/sequence/signature chain are operational evidence even without a database immutability trigger | Retain historical source bytes; create fresh signed local device events through the supported offline flow |
| Applied business event | Owning service binds payload hash and downstream posting history | Do not rewrite applied event payload; create an explicit corrective event with its own lineage |
| Pending outbox | Mutable delivery state does not authorize changing original event payload | Do not dispatch malformed jobs; quarantine through supported failure/hold handling with a concrete reason and fresh local command if replacement is needed |
| Generic workflow definition | `seed.*` key has no canonical checker or real action route | Preserve traceability; disable unsupported fixture definitions and replace operational coverage with actual canonical registry execution. Do not manufacture a successful check run |

These exceptions are data/history limitations, not missing Markdown documents. This register resolves the documentation gap by stating the real requirements and evidence boundaries; it does not mark the underlying limitations solved.

Inventory lane additionally identified immutable receipt movement/source-document disagreement. Example: each organization's `item_009` at `location_009` had projection 143 at cost 350; its original immutable receipt movement recorded 29 at 2,575, while the referenced goods receipt line recorded 27 at 2,350, followed by a sale movement of -6 at 2,575. A projection replay or correctly recorded stock top-up can restore quantity/valuation projection consistency without curing that original receipt/source mismatch. Keep source-document correctness separate from movement/projection correctness in final results. Source: inventory lane inspection of `seedInventoryTransactions` and linked candidate records.

## Evidence still required for complete handover

Final coordinator results must link restorable backup proof, candidate/original target decisions, before/after identity and role reconciliation, all-item 1,500 stock report, canonical workflow scenario results, final read-only invariant rerun, idempotence/interruption recovery results, and browser evidence. Any absent item stays unverified. Empty transient token/session/approval tables are valid when no corresponding workflow occurred; rows must never be added only to meet a count target.
