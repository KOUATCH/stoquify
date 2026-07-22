# Phase 3 / Slice 7 Selection Report: POS Shift-Close Applied-State Evidence Completion

Date: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Orchestrator: `stoquify-referral-war-room-orchestrator`  
Selected pillar skill: `stoquify-cash-leakage-radar`  
Supporting skill: `007-aqstoqflow-pos-ledger-controls`

## Decision

Select one narrow source-foundation slice: make every newly committed `pos.shift.closed` version-1 business event reach `APPLIED` inside the same Serializable POS close transaction that owns the session, drawer, terminal, closing transaction, outbox, and audit evidence.

This slice must complete before registry multi-finding persistence or a durable detector worker is designed. It changes no detector threshold, registry definition, incident, scheduler, checkpoint, route, action, UI, notification policy, inventory workflow, AI authority, or WhatsApp authority.

## Evidence And Dependency Review

- The certified Slice 6 batch deliberately reads only tenant-scoped `pos.shift.closed` events with `eventSource = POS`, schema version 1, `status = APPLIED`, and `sourceType = CASH_DRAWER_CLOSE`.
- `recordBusinessEventInTx` creates business events without an explicit status, so Prisma applies the schema default `RECORDED`.
- `closePOSShift` records the close event in its Serializable transaction but does not call the existing `markBusinessEventAppliedInTx` transition.
- The result is a source-to-loader contract gap: a correctly closed future shift is durable but remains invisible to the strict batch.
- Other source-owned workflows use `recordBusinessEventInTx` followed by `markBusinessEventAppliedInTx` in the same transaction once the domain effect is complete.
- The configured PostgreSQL runtime now reports all 23 migrations applied. Read-only counts show zero cash-shortage policies, zero approved policies, zero eligible close events, zero assurance incidents, and zero cash-shortage registry definitions.
- The focused pre-change baseline passes 4 suites and 73 tests across POS close, business-event, evaluator, and batch contracts.

## Why This Slice Comes First

1. A detector cannot evaluate evidence that its source workflow never makes eligible.
2. Relaxing the batch to accept every `RECORDED` event would weaken the certified loader contract and blur event lifecycle meaning.
3. Registry cardinality cannot repair an absent source event in its accepted state.
4. Worker checkpointing would automate an empty scan and add persistence before source truth is complete.
5. Incident lifecycle hardening remains required before money-protection cases can be resolved or suppressed, but this slice creates no incident and exposes no lifecycle command.

## Authorized Scope

- Import and call `markBusinessEventAppliedInTx` from the POS close source service.
- Perform the transition immediately after event/outbox recording and before close audit completion, inside the existing Serializable transaction.
- Require exact replay evidence to retain `APPLIED` status and a processing timestamp.
- Add focused unit assertions for tenant-bound event transition, call ordering, replay validation, and rollback-safe failure behavior.
- Extend PostgreSQL certification to prove the committed close event is `APPLIED`, has `processedAt`, and remains part of the existing all-or-nothing transaction.
- Refresh only the war-room status and dated Slice 7 evidence reports.

## Explicit Non-Goals

- No historical status backfill.
- No production cash-shortage threshold or policy row.
- No registry runner, definition, result cardinality, check-run persistence, incident, or control-tower change.
- No worker, checkpoint, lease, watermark, overlap, retry, cron, or scheduler activation.
- No generic incident transition, assignment, permission, source-recheck, maker-checker, or waiver change.
- No route, action, dashboard, notification delivery, inventory behavior, predictive scoring, AI, or WhatsApp behavior.

## Expected Files

- `services/pos/pos.service.ts`
- `services/pos/__tests__/pos-shift-close.service.test.ts`
- `services/pos/__tests__/pos-shift-close.postgres.test.ts`
- `what-next/referrals/POS_SHIFT_CLOSE_APPLIED_EVENT_COMPLETION_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

```text
npm test -- --runInBand services/pos/__tests__/pos-shift-close.service.test.ts services/events/__tests__/business-event.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts
RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION=1 npm test -- --runInBand services/pos/__tests__/pos-shift-close.postgres.test.ts
npm run typecheck
npx eslint services/pos/pos.service.ts services/pos/__tests__/pos-shift-close.service.test.ts services/pos/__tests__/pos-shift-close.postgres.test.ts
npm run service:boundary:fail
npm run module:surface:fail
```

The PostgreSQL command will be expressed with PowerShell environment syntax when executed locally.

## Risks And Guardrails

- `APPLIED` must describe the already-completed POS close effect; it must not claim notification delivery or downstream detector execution.
- The event transition must remain inside the same transaction. A post-commit update would create a split-brain close.
- Exact replay must fail closed on a non-applied or incomplete event instead of silently repairing historical evidence.
- No existing event is backfilled. Any future backfill requires a separate evidence audit and explicit selection.
- The batch cursor remains deterministic pagination only, not a durable commit watermark. Worker overlap and fencing remain unresolved.
- Generic incident resolution and suppression remain unsafe for money-protection cases until source recheck, transition, tenant-assignment, and maker-checker controls are separately completed.

## Handoff

Run `/stoquify-leakage-radar` for this selected source-only slice, certify it, then return control to `/stoquify-referral-war-room` without inferring authorization for the next dependency.
