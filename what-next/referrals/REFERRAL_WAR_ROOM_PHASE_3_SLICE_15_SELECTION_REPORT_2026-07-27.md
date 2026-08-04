# Referral War Room Phase 3 Slice 15 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 15 selects a dormant POS cash-shortage worker checkpoint contract.

This slice will add a pure checkpoint policy helper for a future POS cash-shortage review worker. It will validate checkpoint lease ownership, recorded-time windows, cursor/watermark movement, retry/dead-letter transitions, and batch-result alignment without loading events, writing state, registering a runner, scheduling work, creating incidents, or exposing UI.

## Why This Slice

Slice 13 created an explicit runner-input gate, and Slice 14 created a dormant incident lifecycle policy. The remaining gap before any future runner can be safely discussed is checkpoint control: a future worker must not reprocess overlapping pages, advance a stale watermark, continue after an expired lease, or silently retry forever.

This is the smallest high-value slice because it creates the worker safety contract without activating the worker.

## Expected Product Code

- Add `services/leakage/pos-cash-shortage-worker-checkpoint-contract.ts`.
- Add `services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts`.
- Reuse the existing POS cash-shortage batch input schema for recorded-window, cursor, and limit validation.
- Reuse the existing POS cash-shortage batch result type for future batch-result alignment.

## Guardrails

- No call to `loadPosShiftCashShortageEvaluationBatch`.
- No database read or write.
- No Workflow Assurance registry registration.
- No incident creation or resolution command.
- No route, action, scheduler, dashboard, notification, AI, WhatsApp, or inventory-loss behavior.
- No production policy entry or threshold activation.

## Verification Plan

- Run focused checkpoint contract tests.
- Re-run POS cash-shortage batch, runner-input, adapter, and incident lifecycle tests.
- Re-run typecheck, focused ESLint, Workflow Assurance release/runtime gates, service-boundary gate, static activation scan, and diff hygiene.

