---
name: aqstoqflow-module-control-center-packages
description: Compatibility router for older AqStoqFlow Module Control Center package UI requests. Use when this legacy skill is invoked; delegate service-owned module administration UX to aqstoqflow-module-package-read-model and aqstoqflow-module-workbench-ux-states.
---

# AqStoqFlow Module Control Center Packages

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Preserve legacy invocation without maintaining a second package-administration UI contract.

## Workflow

1. Confirm the service-owned package and effective-entitlement read model exists.
2. Load `aqstoqflow-module-package-read-model` and `aqstoqflow-module-workbench-ux-states`.
3. Route data-contract work to the read-model skill and interaction work to the Workbench skill.
4. Preserve permission, tenant, direct-route, unavailable-state, evidence, and accessibility requirements.
5. Do not add UI-derived package or entitlement truth.

## Stop Conditions

Stop when read-model prerequisites are absent, privileged security gates are open, or the request would implement dashboard-only business logic.

## Completion Report

Name the delegated skill, prerequisites, UI surface, verification evidence, blockers, and next gate.
