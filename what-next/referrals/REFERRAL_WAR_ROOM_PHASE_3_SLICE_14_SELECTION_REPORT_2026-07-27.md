# Referral War Room Phase 3 Slice 14 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 14 selects a dormant POS cash-shortage incident lifecycle policy contract.

This slice will add a pure policy helper that decides whether a future POS cash-shortage incident resolution request has enough evidence to proceed to the generic Workflow Assurance incident service. It will not call the incident service, register a runner, create incidents, resolve incidents, schedule work, or expose UI.

## Why This Slice

Slice 13 certified runner-input gating, but the war-room status still blocks POS-specific owning-source recheck and maker-checker closure before any production Leakage Radar resolution workflow.

The live evidence supports a narrow contract now:

- POS cash-shortage findings use the disabled `pos.closed_shift_cash_shortage.review` key.
- Source findings use `POSSession` evidence when the close source is trusted.
- Adapter metadata includes event, source, amount-at-risk, location, terminal, drawer, policy, cashier, and closer evidence for triggered findings.
- Generic Workflow Assurance incidents already require current-source-hash confirmation for resolution.

## Scope

Add:

- A pure POS cash-shortage lifecycle policy under `services/leakage/`.
- Focused tests for source-hash confirmation, POS source identity, required evidence metadata, maker-checker reviewer independence, and blocked/non-POS rejection.
- Static tests proving no generic incident service call, route, action, registry runner, worker, or scheduler is activated.

Do not add:

- Incident persistence, resolution, waiver, or assignment commands.
- New route, server action, component, dashboard, notification, worker, scheduler, or registry runner.
- New permission vocabulary.
- Production policy entry, detector activation, inventory behavior, AI authority, or WhatsApp authority.

## Acceptance Criteria

- The policy accepts only `pos.closed_shift_cash_shortage.review` incidents.
- The policy accepts only concrete `POSSession` shortage findings, not aggregate batches or blocked source-repair findings.
- The policy requires `currentSourceHash` to match the incident source hash.
- The policy requires the actor to hold the certified POS read permission for this dormant pre-command gate.
- The policy requires independent reviewer evidence: the actor cannot be the cashier, closer, or POS source actor captured in incident metadata.
- The policy requires a resolution note and evidence hash.
- The policy returns a deterministic approval payload for a future command, without mutating state.
- No runtime activation is introduced.

## Verification Plan

- Run the new focused lifecycle policy tests.
- Re-run POS cash-shortage adapter and runner-input tests.
- Re-run generic assurance incident lifecycle tests.
- Re-run typecheck, focused ESLint, Workflow Assurance release/runtime gates, service-boundary gate, static activation scan, and diff hygiene.
