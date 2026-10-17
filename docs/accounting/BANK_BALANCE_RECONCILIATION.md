# Phase 5: bank balance reconciliation

Implemented 2026-10-16. This extends the shared close scope, per-account coverage and source revision controls from Phases 1–3. It adds a separate balance control; payment matching, explicit no-activity evidence and AP exception classification still apply.

## Supported scope

Each BANK_TRANSFER or CHEQUE provider account known through the close recording cutoff requires an independently approved balance reconciliation for the requested completed accounting period. Archived accounts remain included. Results retain the account and its currency; there is no cross-currency netting or FX conversion.

The first implementation requires one imported/processed statement with exactly the stored inclusive period endpoints, a retained source reference and matching SHA-256 document hash. Opening and closing balances are transcribed from that statement by the preparer and checked by a different reviewer. The service verifies the hash against the imported file and verifies arithmetic against imported lines; it does not fetch the bank or independently authenticate document contents. Multiple partial statements must not be presented as a complete balance reconciliation.

The provider's settlement ledger mapping must identify a same-tenant, debit-normal ASSET account. A nullable ledger currency is accepted only when every included journal and line uses the provider currency. Conflicting approved settlement mappings or another provider sharing the ledger account block evidence. The control cannot allocate a shared general-ledger balance between bank accounts.

## Three required equalities

All calculations use exact decimal arithmetic and Stoquify's existing two-decimal monetary storage. A one-cent discrepancy blocks approval; there is no tolerance or balancing plug.

| Control | Required equality |
|---|---|
| Statement roll-forward | Opening bank balance + signed statement movement = closing bank balance |
| Opening balance | Opening bank balance + evidenced opening timing items = cumulative posted bank ledger balance before period start |
| Closing balance | Closing bank balance + evidenced closing timing items = cumulative posted bank ledger balance through period end |

Bank credits add to statement cash; bank debits and explicit fee lines subtract. UNKNOWN/REVERSAL directions, negative imported amounts, nonzero separate `feeAmount`, mixed currency, out-of-period lines and unavailable recording-cutoff evidence block collection. Ambiguous imports must be corrected through existing import/correction controls; this service does not rewrite statement evidence.

Book balances sum debit minus credit across all POSTED/REVERSED journal lines for the mapped account through the economic boundary, including earlier periods. Original reversed entries and their posted reversals contribute naturally. Missing posting dates, contradictory tenant/currency evidence or post-cutoff records prevent an apparent zero from being treated as proof. This is current-state verification with a cutoff, not historical reconstruction.

## Timing items and corrections

A timing item identifies an existing posted bank-ledger line, its OPENING or CLOSING boundary, a supporting source reference and document hash. Its signed amount is derived from the ledger line: a positive amount is a deposit in transit; a negative amount is an outstanding payment. Callers cannot supply adjustment amounts. The same line may appear at both boundaries when an item carries forward, but cannot appear twice at one boundary.

The line must have a posting batch and precede the chosen boundary. Any non-rejected/non-voided/non-corrected bank match for that batch or its payment through the boundary prevents using the item as outstanding. This is conservative at batch level. Supporting references/hashes establish the review trail; the service does not automatically validate the external timing document.

Unrecorded bank charges, interest, duplicate postings and other book errors need normal authorized accounting corrections before approval. They cannot be entered as arbitrary reconciliation adjustments. A no-activity assertion alone cannot establish an opening or closing bank balance, even when payment coverage accepts that assertion.

## Evidence lifecycle and authority

`bank_balance_evidence` retains the input, source snapshot, content hash, organization/account/period/statement identities, preparer and lifecycle decisions. Composite foreign keys bind parent resources to the tenant. Database checks require independent approval; a trigger prevents payload edits, deletion, approval rewriting and resurrection after revocation.

1. A preparer with `payments.reconciliation.run` and authentication within five minutes proposes evidence. Unbalanced proposals can be retained for review; invalid or unavailable source inputs cannot.
2. A different reviewer with `payments.reconciliation.sign` and fresh authentication approves the expected evidence hash. Approval recomputes source evidence and requires all three differences to be zero.
3. Revocation requires the signing permission, fresh authentication and a reason of at least ten characters. Prior approval remains retained. Corrections use a new proposal and idempotency key.
4. `payments.reconciliation.read` permits tenant-scoped evidence retrieval. Actor and organization authority come from the protected server action context, never proposal fields.

Proposal replay is stable for the same tenant, key, preparer and input; changed payload or actor conflicts. Decision replay requires the same actor and, for revocation, the same reason. Approval replay still checks current source evidence. Actions enforce the payment-reconciliation module and use existing audit/error handling.

Mutation transactions use Read Committed, ordered tenant-period locks, then the tenant source-revision lock. Source reads and evidence writes occur while that guard is held. Proposal/decision timestamps use the database clock after lock waits. There is no implicit retry that could hide a failed transaction; callers must handle a conflict or retry through the existing action flow.

## Close readiness and stale evidence

The collector selects the latest proposal per account/period visible through the cutoff. Missing, pending, revoked, ambiguous, self-approved, post-cutoff-approved, altered or stale evidence blocks readiness. A replacement proposal never falls back to an older approval. Each approved snapshot is recomputed against current sources, including statement lines, cumulative ledger lines, bank identity and approved settlement mappings.

Accountant portal data exposes the per-account balances and a high-severity `payments.bank-balance` blocker. Close Assurance adds an explicit payment-reconciliation finding, fails the payment checklist, retains evidence receipts and saves the summary in run metadata. The summary also participates in the hashed accountant trust-pack payload. Missing bank evidence cannot leave a run READY merely because transaction matching passed.

The new evidence table participates in Phase 3 source revision invalidation. Proposal, approval and revocation invalidate existing tenant close assessments/exports. Existing triggers cover ledger, statement, provider, mapping and match changes. A source change preserves the historical approval but prevents that approval from satisfying current readiness; new evidence and a new assessment are required. Publication and certification still compare the guarded source revision, so collection racing a committed source change cannot publish a current certificate.

## Files and rollout

- `services/reconciliation/bank-balance-contract.ts`: strict inputs, canonical hashes and arithmetic.
- `bank-balance-sources.service.ts`: actual bank/statement/ledger source checks and timing derivation.
- `bank-balance-evidence.service.ts`: protected lifecycle, replay and transaction boundaries.
- `bank-balance-close.service.ts`: complete per-account readiness collection.
- `actions/payments/bank-balance-evidence.actions.ts`: server-owned authority and module enforcement.
- `services/accounting/data-trust.service.ts` and `close-assurance.service.ts`: blockers, findings, receipts, metadata and export evidence.
- `prisma/schema.prisma` and migration `20261016220000_bank_balance_evidence`: retained model, tenant constraints, immutability and invalidation.

The migration advances source revisions for tenants with retained close runs, invalidating evidence produced before this new control. Apply schema/code through existing release controls and collect/review bank evidence before reassessing close. No application database migration was performed during implementation. Do not roll back by deleting evidence, dropping retention controls or restoring old READY flags; preserve proof and use a forward correction through release controls.

This phase provides backend actions and existing close/portal blocker integration. It does not add a dedicated bank reconciliation entry screen, statement stitching, shared-ledger allocation, FX reconciliation, automatic bank authenticity checks or a full historical account applicability model. Browser behavior and production-volume performance require separate verification. See [execution evidence](BANK_BALANCE_RECONCILIATION_EVIDENCE_2026-10-16.md).
