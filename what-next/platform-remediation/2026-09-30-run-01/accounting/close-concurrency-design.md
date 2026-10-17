# R07 remaining concurrency contract

Read-only design analysis, 2026-09-30. This document distinguishes the implemented assessment-race correction from the still-unqualified period-close/source-write boundary. No database migration or live interleaving experiment was performed.

## Implemented minimum correction

`runCloseAssurance` previously built all source evidence before creating a run. A concurrent event could change evidence and look for runs to invalidate while the new run did not exist. The stale draft would then be inserted as READY, with no invalidation marker.

The local correction first persists RUNNING for the resolved tenant/period, then starts collectors. Central invalidation now discovers RUNNING, READY, CERTIFIED and EXPORTED runs (and retains certified-export associations), and changes those states to BLOCKED. Finalization compares and sets only the original RUNNING row, in the same transaction as its checklist/findings/evidence/audit. A failed comparison skips stale evidence writes and reads the retained current run for the response. Collection or transaction failures attempt RUNNING→BLOCKED without replacing an event's prior BLOCKED metadata. A process crash can leave RUNNING, which denies close; operational timeout/recovery remains necessary.

This fixes the missed-target window for participating producers. It does not turn six independently queried read models into a globally serializable assessment or prove that every relevant producer participates.

## Current lock and write order

| Path | Observed order / mechanism | Close boundary implication |
|---|---|---|
| `periods.service.ts::closeAccountingPeriod` | Accounting period FOR UPDATE → current ledger/reconciliation preflight → control audit → latest run/findings/checklist read → period CLOSED update. | Excludes writers that already hold the same period row FOR SHARE; does not itself lock every source or run row. |
| `posting.service.ts::postJournalEntry` | Entry read → open period FOR SHARE → nominal/base checks/accounts → posting effects → recorded invalidation. | Relevant period lock remains held through commit. Generic posting is now MANUAL-only. |
| `posting.service.ts::reverseJournalEntry` | Original journal FOR UPDATE → target open period FOR SHARE → reversal → invalidation of original and target periods. | Existing order is journal→period, not a universal period-first hierarchy. Original period may already be closed; generic reversal must not imply automatic reopening. |
| `inventory-stock-event.service.ts` default stock path | `assertOpenInventoryPeriod` delegates to open period FOR SHARE → event and stock writes → invalidation. | Default value-moving event path participates. `requiresOpenPeriod:false` is used by stock and delivery reservations; stock reservation intentionally skips valuation invalidation, delivery reservation currently does not. Classify their evidence effect before broadening locks. |
| `statement-import.service.ts` | Module admission and provider-account locking/statement writes → invalidation near end. | Provider-account lock is not accounting-period admission. Moving a new period lock after existing locks creates a different global order; inspect nested helper order before implementation. |
| `provider-event.service.ts` | Provider event/inbox/evidence and business event writes → invalidation. | No explicit period lock in this entry point. Late provider evidence must remain ingestible; blindly rejecting it because its economic date belongs to a closed period would be a policy change. |
| `payment-exception-closure.service.ts` | Current authority → exception FOR UPDATE → source verification/CAS; certain source approvals call open period FOR SHARE → exception/suspense/run updates → invalidation. | Some branches have period admission, others are evidence-only. Existing order includes exception→period. |
| `payment-suspense-workflow.service.ts` | Suspense row lock, then open period before financial posting, then invalidation. | Financial branch is admitted; domain lock order must be preserved or deliberately migrated. |
| `payment-suspense-resolution.service.ts` | Suspense and clearing-journal locks → decisions/source updates → invalidation. | A CloseRun lock added only at the final invalidation stage would serialize metadata, not prior source admission. |
| `payment-exception-link.service.ts` | Suspense lock/source updates → invalidation. | Shares no demonstrated universal close-period contract. |
| `reconciliation-additional-sources.service.ts` | Open-period check in source repair helper plus source operations → invalidation. | Follow the actual caller/helper chain before classifying each repair as protected. |
| `payroll-control.service.ts` | Existing versioned payroll transition with serializable transaction/retry; period/run CAS; invalidation after transition. | Serializable payroll-local transactions do not establish serialization against a default-isolation closer that does not read/write the same dependency graph. |
| `payroll/payment-reconciliation.service.ts` | Serializable transaction with batch/payment/exception evidence reads and settlement writes → invalidation. | Has strong local transactional checks; no universal accounting-period lock was demonstrated here. |
| `payroll/declaration-lifecycle.service.ts`, `payroll-employee-balance.service.ts`, reconciliation certification | Existing lifecycle/authority/receipt checks and updates → central invalidation. | Require full per-command lock inventory; direct invalidation presence alone is not close admission proof. |
| `close-assurance.service.ts` | RUNNING persisted → six root-client collectors → conditional finalization transaction. | In-flight invalidation wins the conditional finalize; lock/version contract for collector completeness and close admission still needs database proof. |

These orders are grounded in current code, not claimed to be a complete transitive lock graph.

## Why a CloseRun lock alone is insufficient

Consider writer W and closer C:

1. W changes a provider/reconciliation source in its transaction without taking the period lock.
2. C takes period FOR UPDATE, reads the previously committed source/run state, and chooses READY.
3. If C also locks CloseRun, W's subsequent invalidation waits on that row.
4. C commits CLOSED; W then acquires the run lock, marks it stale/BLOCKED, and commits the source change.

The extra run lock has delayed the warning until after close. It did not establish source truth at the close decision. A conditional period update that rechecks the unchanged run status has the same limitation if invalidation is still waiting. Increasing only the closer's isolation level is not proof either: participating dependencies and retry behavior must be demonstrated across all writers.

## Minimum safe next implementation slice

1. **Classify writes by effect and date.** Separate operations that modify financial facts of an open period from append-only late evidence, corrections posted into a later open period, and nonfinancial lifecycle metadata. Define whether late evidence keeps the period closed with an explicit invalidated-assurance state or invokes an authorized reopening workflow. This is a product/accounting decision; never drop provider evidence.
2. **Define one admission contract before source mutation.** Financial writes whose effect belongs in an open period must acquire the target period's shared lock and verify OPEN while holding it. The closer retains its exclusive lock. Acquire multiple periods deterministically. Integrate this at command entry after authority resolution but before domain mutation; an invalidation callback at transaction end is too late to establish admission.
3. **Resolve real lock-order conflicts.** Existing journal→period and suspense/exception→period paths mean an invented universal period→domain order cannot simply be pasted into one helper. Inventory these pairs and move entry-point acquisition consistently, preserving existing organization/authority locks and CAS. Use bounded retry for verified deadlocks/serialization failures; never retry external disbursement side effects blindly.
4. **Preserve source evidence versions.** For late evidence that is allowed after closure, atomically record a new source revision and invalidated assurance state. Close success must return the exact consumed run/version. A durable per-period source revision is an option if existing events cannot provide complete monotonic coverage; it is not implemented or presumed available. Keep before/after references, not mutable replacement of certified evidence.
5. **Version all six collector contracts.** Refactor collectors to accept an explicit transaction/evidence snapshot where feasible. Otherwise prove that every relevant committed change invalidates the RUNNING assessment, including changes in collector inputs outside the nominal selected-period date window. Keep collectors' unavailability and unsupported capabilities blocking as currently required.

A narrow optional intermediate mitigation is to lock/read the selected run before the closer's final state transition so pre-existing invalidations cannot be missed. It must be labeled an improvement to run consistency only, not source-write exclusion. It is not a substitute for items 1–5.

## Coverage numbers and unknown denominator

- The current invalidation source registry has **27 named source codes**, spanning ledger, inventory, payroll and payment/reconciliation events.
- Static search finds **14 external service modules** directly calling the central transaction helper, in addition to the central implementation. Two of these are journal/inventory wrapper modules used by additional producer services.
- Close assessment currently calls **six top-level source collectors**: ledger preflight, ledger reconciliation, payment reconciliation dashboard, accountant/data trust, inventory valuation, and tenant operating snapshot.
- These counts measure discoverable registry/call structure, **not the percentage of economic writers covered**. A reviewed producer denominator has not been established; untracked writer count and coverage percentage remain **unknown**, not zero or 100%.
- Documented exclusions/variants include stock reservations and delivery reservations. Domain writes bypassing the central helper, database maintenance, imports and direct SQL must be reconciled against the schema's authoritative-writer register before a coverage percentage can be asserted.

## Required PostgreSQL interleaving proof

Use a disposable verified fixture database, two independent connections, explicit synchronization barriers and retained SQL/transaction logs. No live customer data or provider side effects.

| Interleaving | Required outcome |
|---|---|
| RUNNING saved → pause collector → participating writer commits invalidation → finalize | Finalization loses CAS; retained run stays BLOCKED/stale; no fresh checklist/evidence/completed audit is committed. |
| Collector or persistence transaction throws | No READY/CERTIFIED outcome; RUNNING becomes BLOCKED when cleanup is available; previously recorded invalidation reason survives. |
| Writer takes shared period admission before close | Closer waits; after writer commit, preflight/assurance reflect the write and reject stale readiness. |
| Closer takes exclusive admission before financial writer | Writer waits and then receives the defined closed-period rejection; its entire economic transaction rolls back, including outbox and ledger effects. |
| Provider event arrives after close | Evidence is retained exactly once; approved late-evidence policy is applied; no stale pack is represented as fresh. |
| Reverse a prior-period entry into a later period while two closes run | Deterministic multi-period ordering; no hidden deadlock loop; original/reversal links and both affected assurance states remain valid. |
| Writer changes source between two collectors | Assessment is blocked by source revision/invalidation or reads one qualified snapshot; cannot finalize a mixed-source READY result. |
| New assessment starts after older run selected for close | Close consumes an explicitly defined latest version or aborts/retries; no ambiguous run identity in audit. |
| Invalidated source transaction rolls back | Its data and invalidation rollback together; no phantom failed close or missing committed evidence. |
| Duplicate event/retry and cross-tenant attempts | One retained effect, no lost invalidation, bounded retry and no foreign period/run access. |

Current Jest interleaving tests prove application branching and compare-and-set intent. They do not establish these database outcomes. R07 remains partial until this matrix and the producer denominator are qualified.
