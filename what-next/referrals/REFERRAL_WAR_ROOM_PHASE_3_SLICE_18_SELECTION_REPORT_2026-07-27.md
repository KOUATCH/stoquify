# Referral War Room Phase 3 Slice 18 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 18 selects the POS cash-shortage registry run-window contract.

This slice will add the minimal typed bridge required for a future Workflow Assurance runner registration to pass an explicit recorded-time window into the dormant POS cash-shortage runner. It will not register the runner, schedule work, persist check runs, create incidents, or activate production detection.

## Why This Slice

Slice 17 certified a dormant runner composition helper, but that helper requires `recordedFromInclusive` and `recordedThroughExclusive`. The generic `WorkflowAssuranceRunInput` currently does not expose a recorded-time window. Registering the runner before this contract would force an unsafe default window or immediate runtime failure.

This slice makes the runner input explicit before runner registration.

## Expected Product Code

- Extend `WorkflowAssuranceRunInput` with optional recorded-window, cursor, and limit fields suitable for bounded scheduled scans.
- Add a POS-specific bridge helper in `services/leakage/pos-shift-cash-shortage-dormant-runner.ts`.
- Add focused tests proving missing windows fail before loading evidence and explicit windows compose successfully.

## Guardrails

- No `CHECK_RUNNERS` entry.
- No registry service invocation path.
- No worker, scheduler, route, action, dashboard, notification, production policy entry, inventory behavior, AI authority, or WhatsApp authority.
- No default date window.
- No source, period, or location narrowing.

## Verification Plan

- Run focused dormant runner and registry contract tests.
- Re-run POS cash-shortage runner-input, batch, adapter, checkpoint, and lifecycle tests.
- Re-run typecheck, focused ESLint, Workflow Assurance release/runtime gates, service-boundary gate, static no-activation scan, and diff hygiene.

