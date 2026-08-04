# Referral War Room Phase 3 Slice 17 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 17 selects dormant POS cash-shortage runner composition.

This slice will add a server-side composition helper that wires the already-certified runner-input gate, POS cash-shortage batch loader, and assurance adapter into one dormant runner contract. It will not register the runner in Workflow Assurance, schedule work, persist check runs, create incidents, or activate production detection.

## Why This Slice

Slice 13 certified the explicit runner-input gate. Slice 15 certified checkpoint safety. Slice 16 reconciled disabled-definition blockers. The remaining implementation gap before runner registration can be considered is a single, testable composition boundary for loading a bounded page and adapting it to Workflow Assurance output.

This slice proves the runner logic shape without changing active registry behavior.

## Expected Product Code

- Add `services/leakage/pos-shift-cash-shortage-dormant-runner.ts`.
- Add `services/leakage/__tests__/pos-shift-cash-shortage-dormant-runner.test.ts`.
- Keep `services/assurance/assurance-registry.service.ts` untouched.

## Guardrails

- The runner helper must require the disabled staged definition through the existing runner-input gate.
- The helper may call the POS batch loader only when directly invoked; it must not be registered or scheduled.
- No active `CHECK_RUNNERS` entry.
- No check-run persistence.
- No incident creation or resolution command.
- No worker activation, scheduler, route, action, dashboard, notification, inventory behavior, production policy entry, AI authority, or WhatsApp authority.

## Verification Plan

- Run focused dormant runner tests.
- Re-run POS cash-shortage runner-input, batch, adapter, checkpoint, and registry contract tests.
- Re-run typecheck, focused ESLint, Workflow Assurance release/runtime gates, service-boundary gate, static no-activation scan, and diff hygiene.

