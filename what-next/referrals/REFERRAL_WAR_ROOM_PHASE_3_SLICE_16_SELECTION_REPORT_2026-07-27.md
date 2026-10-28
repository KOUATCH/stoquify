# Referral War Room Phase 3 Slice 16 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 16 selects disabled POS cash-shortage definition blocker reconciliation.

This slice will update the disabled `pos.closed_shift_cash_shortage.review` Workflow Assurance definition metadata so it no longer pretends the worker checkpoint contract is unresolved after Slice 15 certification. The definition must remain disabled and observe-only.

## Why This Slice

Slice 15 certified a dormant checkpoint/watermark/lease contract for a future worker. The registry definition still lists `worker_checkpoint_contract` under `activationBlockedBy`, which makes the inventory stale and overstates unresolved work.

The next safe move is to reconcile metadata truth before discussing runner registration or activation. This avoids letting stale blockers hide the real remaining gates.

## Expected Product Code

- Update the disabled POS cash-shortage definition metadata in `services/assurance/assurance-registry-contracts.ts`.
- Add or adjust focused tests in `services/assurance/__tests__/assurance-registry-contracts.test.ts`.
- Do not touch the active runner map in `services/assurance/assurance-registry.service.ts`.

## Guardrails

- Keep `enabled: false`.
- Keep `enforceMode: false`.
- Keep `runner_registration` and `production_policy_entry` blocked.
- Do not add worker, scheduler, route, action, dashboard, notification, AI, WhatsApp, or inventory-loss behavior.
- Do not call `loadPosShiftCashShortageEvaluationBatch`.

## Verification Plan

- Run focused registry contract tests.
- Re-run POS cash-shortage runner-input and checkpoint tests.
- Re-run Workflow Assurance release/runtime gates, typecheck, focused ESLint, service-boundary gate, static no-activation scan, and diff hygiene.

