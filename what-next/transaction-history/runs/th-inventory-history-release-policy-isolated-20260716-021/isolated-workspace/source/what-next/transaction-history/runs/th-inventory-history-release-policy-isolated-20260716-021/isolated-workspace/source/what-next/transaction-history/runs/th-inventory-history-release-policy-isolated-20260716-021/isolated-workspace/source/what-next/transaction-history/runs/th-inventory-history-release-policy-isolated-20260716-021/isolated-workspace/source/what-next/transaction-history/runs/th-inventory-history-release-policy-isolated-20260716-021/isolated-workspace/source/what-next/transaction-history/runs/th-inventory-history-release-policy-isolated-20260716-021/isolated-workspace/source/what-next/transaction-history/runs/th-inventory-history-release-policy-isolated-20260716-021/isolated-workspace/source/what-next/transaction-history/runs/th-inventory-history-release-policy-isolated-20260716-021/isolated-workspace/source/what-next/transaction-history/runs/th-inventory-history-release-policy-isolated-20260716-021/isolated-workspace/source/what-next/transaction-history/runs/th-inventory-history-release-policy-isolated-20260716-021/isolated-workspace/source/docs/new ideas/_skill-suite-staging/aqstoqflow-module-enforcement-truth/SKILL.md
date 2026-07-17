---
name: aqstoqflow-module-enforcement-truth
description: Reconcile Stoquify/AqStoqFlow module enforcement behavior with operator-visible truth. Use when observe mode, explicit enforce callers, API guards, action-wrapper defaults, pilot cohorts, kill switches, policy versions, or Module Control Center status disagree or cannot be explained safely.
---

# AqStoqFlow Module Enforcement Truth

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Create one service-owned explanation of effective module policy without enabling broad enforcement. Make every enforced surface registered, versioned, observable, and rollback-capable.

## Required Sources

1. `services/modules/module-control-contracts.ts`
2. `services/modules/module-entitlement.service.ts`
3. `services/_shared/protect.ts`
4. `lib/security/server-authz.ts`
5. `actions/modules/module-control.actions.ts`
6. `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
7. `scripts/module-surface-inventory.js`
8. Current surface inventory and baseline
9. `references/enforcement-policy-contract.md`

## Invariants

- Effective policy is resolved centrally from a versioned policy, surface registration, pilot cohort, and kill switch.
- Shared wrappers never silently convert an unspecified module mode into enforcement.
- Operator UI reports effective runtime behavior, not a global constant.
- Every enforced surface has owner, permission, intent, unavailable behavior, audit policy, and rollback proof.
- Empty explicit entitlements mean no grants; they never fall back to legacy full-suite access.
- Missing organizations, expired grants, inactive dependencies, and duplicate grants resolve deterministically and fail safely.

## Workflow

1. Inventory every production `observe` and `enforce` caller, including wrapper defaults and API helpers.
2. Compare runtime decisions with Module Control Center claims and record every contradiction.
3. Define a central policy resolver and versioned decision contract.
4. Remove implicit enforcement defaults; require an explicit registered policy for enforcement.
5. Add per-pilot kill switches and a truthful read model for global, pilot, and surface-level state.
6. Correct entitlement edge cases in shadow mode before changing broad access behavior.
7. Add focused resolver, wrapper, API, UI-read-model, and rollback tests.
8. Refresh the inventory and save an enforcement-truth report.

## Verification

- No implicit enforce default remains.
- Every explicit enforce caller appears in the registered policy evidence.
- Operator status matches effective decisions for observe, pilot, enforce, and kill-switch states.
- Empty explicit entitlements, missing tenant, validity windows, duplicate grants, dependency state, and read-only intents have deterministic tests.
- Kill-switch rollback smoke passes without deleting entitlement history.

## Stop Conditions

Do not enable new enforced surfaces. Stop if an existing enforced path lacks a rollback route, tenant-safe denial behavior, or complete registration.

## Completion Report

Record caller counts, contradictions resolved, policy version, tests, rollback result, remaining enforced exceptions, and the next eligible pilot.
