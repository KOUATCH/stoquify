# Referral War Room Phase 3 Slice 13 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 13 selects a dormant POS cash-shortage Workflow Assurance runner-input gating contract.

This slice adds a pure contract that translates an explicit Workflow Assurance run request plus a bounded recorded-time window into the already-certified POS cash-shortage batch input shape. It does not register a runner, load evidence, persist incidents, schedule work, or activate the disabled registry definition.

## Why This Slice

Slice 12 created the disabled code-owned definition `pos.closed_shift_cash_shortage.review`. The remaining pre-activation gap is the runner boundary: a future runner must not accidentally execute from a broad registry scan, source-specific request, active/enforced definition, or unbounded time window.

The live code already has:

- `loadPosShiftCashShortageBatchInputSchema` with tenant, recorded-time window, cursor, and 1-100 page-size validation.
- `loadPosShiftCashShortageEvaluationBatch`, which reads only applied POS cash-drawer close business events.
- `createPosShiftCashShortageAssuranceOutput`, which formats already-loaded batch results into Workflow Assurance evidence.
- A disabled staged registry definition with metadata showing runner registration remains blocked.

## Scope

Add:

- A pure POS cash-shortage runner-input builder under `services/leakage/`.
- Focused tests proving the builder accepts only explicit, disabled, staged, POS cash-shortage requests.
- Static no-activation checks proving the assurance registry still has no POS cash-shortage runner registration.

Do not add:

- `CHECK_RUNNERS` registration.
- Worker, scheduler, checkpoint, or durable case activation.
- UI.
- AI copilot or WhatsApp source-of-truth behavior.

## Acceptance Criteria

- The builder requires `runInput.checkKey === "pos.closed_shift_cash_shortage.review"`.
- The builder rejects source-specific registry input (`sourceType` or `sourceId`) because this check is window/page based.
- The builder rejects active or enforced definitions.
- The builder requires the disabled staged-definition metadata created in Slice 12.
- The builder delegates date, cursor, and limit validation to `loadPosShiftCashShortageBatchInputSchema`.
- The returned object is exactly the bounded batch input needed by the existing loader.
- No registry runner, worker, scheduler, or production detector is activated.

## Verification Plan

- Run the new focused runner-input tests.
- Re-run POS cash-shortage batch and adapter tests.
- Re-run assurance registry contract/service tests.
- Re-run Workflow Assurance release gate and runtime checks.
- Re-run typecheck and focused lint.
- Run a static activation scan for registry references to the POS cash-shortage check key and loader.
