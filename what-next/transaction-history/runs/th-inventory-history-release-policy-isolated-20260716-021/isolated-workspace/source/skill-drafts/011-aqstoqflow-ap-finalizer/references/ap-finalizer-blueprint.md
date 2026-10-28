# 011 AP Finalizer Blueprint

## Three Options

### Option 1: Backend-First Finance Closure

Complete SYSCOHADA postings, AP open items, reconciliation evidence, and country-pack validation before UI.

Use when accounting correctness is the single dominant risk.

Advantages:

- strongest accounting foundation early
- fewer UI rewrites after posting rules settle
- best for audit-first teams

Tradeoffs:

- product stakeholders cannot inspect the workflow quickly
- UI and operator visibility remain open longer
- can stall on country-pack or account-map details

### Option 2: Vertical Gate Closure

Close the work in thin slices:

1. AP workbench UI and status DTOs
2. balanced SYSCOHADA posting recipes
3. outbound supplier payment reconciliation
4. country-pack VAT/withholding validation
5. verification and release evidence

Use this by default.

Advantages:

- smallest blast radius
- clear progress after each gate
- matches the numbered-suite stop/advance model
- keeps unfinished accounting or reconciliation visible instead of hidden

Tradeoffs:

- requires discipline to avoid unrelated purchasing redesign
- some blocker states remain visible until their slice closes

### Option 3: Full 011 Freeze

Pause other numbered-suite work and complete all remaining AP surfaces in one integrated push.

Use only when a dedicated team owns the whole 011 boundary in one sprint.

Advantages:

- one comprehensive acceptance pass
- fewer intermediate states

Tradeoffs:

- largest merge and regression risk
- slower feedback loop
- harder to isolate failures

## Target Architecture

```text
AP Workbench UI
-> typed server actions
-> RBAC, module gate, fresh-auth, SoD
-> AP service transaction
-> business event + idempotency + source documents
-> country-pack VAT/input VAT/withholding resolver
-> SYSCOHADA posting recipe resolver
-> journal + supplier open item + audit + outbox
-> outbound PaymentTransaction / reconciliation blocker
-> workbench and close-control truthful status fields
```

## Data Status Fields To Surface

Expose truthful, certification-ready fields in workbench DTOs. Names may adapt to the repo, but the concepts should exist:

- `ledgerStatus`: `POSTED`, `BLOCKED`, `NOT_REQUIRED`, or `ERROR`
- `ledgerPostingBatchId`
- `ledgerBlockerCode`
- `ledgerBlockerMessage`
- `reconciliationStatus`: `NOT_REQUIRED`, `PENDING_EVIDENCE`, `PENDING_MATCH`, `MATCHED`, `SUSPENSE`, or `BLOCKED`
- `paymentTransactionId`
- `matchRecordId`
- `suspenseItemId`
- `countryPackStatus`: `RESOLVED`, `DRAFT`, `REQUIRES_EXPERT_REVIEW`, `UNSUPPORTED`, or `MISSING`
- `countryPackVersion`
- `countryPackResolutionHash`
- `taxTreatmentStatus`
- `withholdingTreatmentStatus`
- `operatorActionRequired`
- `asOf`

## Ledger Acceptance

Supplier invoice posting must:

- use server recomputed totals
- reject duplicate supplier invoice keys
- validate open fiscal period
- resolve active, leaf, tenant-scoped accounts
- emit balanced debits and credits
- link supplier, invoice, lines, country-pack provenance, and source documents
- create AP supplier open item or equivalent subledger evidence
- fail closed with an explicit blocker on missing/invalid mapping

Supplier payment posting must:

- require approved supplier bank destination where relevant
- require approved and open AP allocations
- debit supplier AP
- credit configured treasury/clearing account
- include withholding liability only through country-pack controlled rules
- update AP allocation/lettrage state in the same transaction
- create reconciliation evidence/blocker in the same release path

## Reconciliation Acceptance

Supplier payment release must not create an invisible final state. One of these must exist:

- matched evidence through `MatchRecord`
- itemized `SuspenseItem`
- pending outbound `PaymentTransaction` with clear reconciliation-required state
- explicit reconciliation blocker visible to workbench and close controls

No `PaymentTransaction` should reach a final state without match or suspense.

## Country-Pack Acceptance

AP tax behavior must:

- treat input VAT and withholding as country-pack parameters
- resolve by country/entity/date/purpose
- return provenance with pack version and resolution hash
- store or expose provenance on material AP artifacts
- block or degrade when capability is missing, draft, unsupported, uncited, or requires expert review
- avoid hardcoded legal rates, country branches, and silent zero defaults

## Focused Test Matrix

Required tests:

- AP action rejects tenant/client mass assignment
- AP action rejects missing permission
- sensitive action rejects stale auth
- maker-checker rejects self approval
- duplicate invoice returns typed safe error
- same idempotency key with changed payload rejects and audits
- posting recipe balances debits and credits
- missing account map creates visible blocker
- rollback leaves no partial invoice/payment/posting state
- payment release creates outbound reconciliation evidence or blocker
- final payment state requires match, suspense, or blocker
- country-pack missing VAT/withholding capability blocks or degrades truthfully
- workbench renders empty, loading, denied, degraded, retry, stale, and blocker states

## Advancement Rule

Advance to `012-aqstoqflow-payroll-presence-engine` only when:

- AP workbench UI gate is complete
- balanced ledger gate is complete or explicit blockers remain intentionally visible
- outbound reconciliation gate is complete
- country-pack VAT/withholding gate is complete enough to block/degrade truthfully
- RBAC, fresh-auth, SoD, typed-error, notification, audit, idempotency, rollback, and verification gates pass
- release report says 011 is complete enough to advance
