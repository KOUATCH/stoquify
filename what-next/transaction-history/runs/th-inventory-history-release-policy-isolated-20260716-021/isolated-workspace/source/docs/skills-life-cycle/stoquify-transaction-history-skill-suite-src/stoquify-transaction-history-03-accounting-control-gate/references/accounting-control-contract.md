# Accounting Control Contract

Read this contract before assigning any financial-history claim or Stage 03 lane status.

## Common cutoff

Bind every calculation to:

- one trusted `organizationId` and access scope;
- one currency and, for quantity, one unit of measure;
- effective interval `[start, end)` in organization time;
- immutable `recordedThrough` knowledge cutoff;
- complete source population and normalized filters.

Use `effectiveAt` for economic effect and `recordedAt` for when Stoquify persisted or learned the fact. Keep `postedAt`, `matchedAt`, `settledAt`, and `certifiedAt` as distinct lifecycle times. Never silently substitute `createdAt` for both effective and recorded time. If a source lacks either required time, block historical as-of and cutoff claims.

## Balance and tie-out invariants

Prove, by lane and currency:

```text
opening + signed movement = closing
subledger closing + approved reconciling items = GL control-account closing
variance = left side - right side = 0
```

Derive opening from all effective activity before `start` known by `recordedThrough`; do not initialize a filtered running balance at zero. Include backdated records according to the declared recorded-through policy.

Apply these signs:

| Lane | Positive movement | Negative movement | Required comparison |
| --- | --- | --- | --- |
| Inventory quantity/value | receipts, returns in, positive adjustments | issues, returns out, write-offs, negative adjustments | immutable movements to as-of stock/valuation, then class 3 GL |
| Physical cash | opening float and cash inflows | refunds, payouts and cash out | expected closing to counted closing; variance is counted minus expected |
| AP positive payable | invoices and debit-note increases | allocated payments, credits, write-offs and reversals | supplier open items to AP control account |
| AR positive receivable | invoices and debit adjustments | allocated receipts, credits, refunds, write-offs and reversals | customer open items to AR control account |

Exclude electronic tenders from physical cash. Separate transaction currency, base currency, FX rate, rounding, and approved reconciling items. Group and explain every non-zero difference; materiality never converts a difference to zero.

## Posting and source provenance

Require this traversable chain for a `posted` claim:

```text
domain source/version
  -> source link
  -> POSTED posting batch and purpose
  -> balanced POSTED journal entry
  -> journal lines and control/dimension identifiers
```

Require tenant consistency, open/effective period control, idempotency, debit=credit by currency, source identity, and no orphan batch, journal, or link. A domain status named `POSTED` with a failed/pending ledger batch is only operational and blocked from accounting-posted claims. A polymorphic source ID without verified source existence is partial provenance.

## Corrections and reversals

- Permit draft edits only with authorization and audit evidence.
- Treat a posted domain record, batch, journal, allocation, and evidence snapshot as immutable.
- Correct through an append-only credit/debit note, allocation reversal, refund, write-off correction, or reversing journal linked to the original.
- Preserve the original; reverse all original debit/credit, base amounts, currency, dimensions, and source identity exactly once.
- Post into an allowed effective period. When the original period is closed, use the approved current-period or prior-period-adjustment policy and disclose the affected prior period.
- Make retries idempotent and prevent duplicate reversals. Recompute roll-forward, control tie-out, reconciliation, and close evidence after correction.

## Reconciliation and close

Call a result `reconciled` only when independent provider/statement, counted-cash, or GL-control evidence exists; matching rules and manual decisions are persisted; maker and checker are separated where judgment exists; complete counts/totals are uncapped; and all exceptions, suspense, and reconciling items are resolved or explicitly approved.

Treat as close blockers:

- draft journals; pending/failed batches; missing source links or journals; unbalanced entries;
- non-zero subledger/control or inventory/class-3 differences;
- open reconciliation exceptions or suspense; unsigned/unapproved runs; stale source manifests;
- unapproved cash variance, unresolved offline ambiguity, or shared-drawer attribution gaps;
- missing correction/reversal support for posted activity in scope;
- unavailable, partial, stale, or capped evidence used by a close assertion;
- blocked AR prerequisites.

Period close and close certification must consume the same blockers. `UNAVAILABLE` is blocking for the affected assertion; it is not a medium warning or a zero balance.

## Evidence-grade vocabulary

| Grade | Maximum honest claim |
| --- | --- |
| `unsupported` | preview, recent snippet, capped/unknown population, or absent semantics; no financial claim |
| `operational` | service-owned persisted business activity with traceable identity, but no complete GL posting chain |
| `posted` | operational evidence plus complete posted batch, balanced journal, source link, and period controls |
| `reconciled` | posted evidence plus complete independent reconciliation or subledger/control tie-out with no unresolved blocker |
| `system-certified` | reconciled evidence plus persisted review/certification, immutable snapshot/cutoff, invalidation rules, and passed close gates |

Describe hashes as integrity/drift fingerprints unless a verified signature and trust chain exist. Describe system-certified output as non-statutory unless qualified authority and filing controls are proven.

## OHADA/SYSCOHADA provenance

For an OHADA-facing accounting claim, persist or reconstruct without mutable lookup:

- country code, accounting regime, country-pack ID/version/schema version, effective date, resolution hash, legal reference, verification/capability status, and relevant parameter path/value;
- chart account ID/code, SYSCOHADA class/reference, control-account designation, normal balance, and active/effective state;
- posting-rule ID, immutable version or snapshot hash, effective interval, purpose, line IDs, mappings, amount source, dimensions, and selected journal;
- source, batch, journal, period, currency/FX, actor/approval, and correction/reversal links.

If a posting rule or chart mapping can be updated in place without a versioned snapshot on the posted evidence, report configuration provenance as partial. Country-pack provenance for one AP tax decision does not prove POS, inventory, AR, reporting, or statutory-filing provenance. Require qualified OHADA review before statutory language.

## Automatic AR gate

Set `ar` to blocked unless service-owned code, persistence, constraints, and focused tests prove all of:

1. customer invoice versus sales-order identity and posting;
2. receipt-to-open-item allocation, partial/multi-item allocation, idempotency, and allocation reversal;
3. contractual due dates, open-item state, settlement status, and aging basis;
4. credit notes, refunds, write-offs/bad debt, approvals, and corrections;
5. immutable posted reversal links for invoices, allocations, credits, refunds, and write-offs;
6. customer subledger entries linked to source, posting batch, journal entry, and AR control account;
7. opening-plus-movement closing proof and AR-to-GL tie-out at identical cutoffs.

Mutable customer balance, generic ledger rows, sales-order payment totals, inferred due dates, recent activity, or client arithmetic cannot satisfy this gate.

## Minimum tests

Run applicable tests with complete server-side populations:

- opening + movement = closing, including same-time rows, backdated entries, recorded-through cutoff, FX, and rounding;
- AP/AR/customer/supplier/inventory subledger to GL control-account tie-out, including one deliberate variance;
- source -> batch -> journal -> lines -> source-link completeness and tenant isolation;
- failed/pending batch downgrades a domain-posted row and blocks close;
- posted mutation/delete rejected; exact one-time reversal and replacement preserve the original and net to zero;
- allocation, allocation reversal, partial settlement, credit, refund, write-off and due-date aging boundaries;
- provider/statement independence, mismatch exclusion from matched totals, suspense/exception blockers, maker-checker, sign-off and void/correction;
- physical cash expected/count/variance excludes electronic tenders and requires approval;
- unavailable/stale/capped evidence blocks close and certification; period close cannot bypass the same gate;
- country-pack and posting-rule snapshot drift remains explainable after configuration changes.

Treat existing passing unit tests as scoped evidence only. Require a new regression test for every defect fixed in `implement` mode and record every executed command and exit code.
