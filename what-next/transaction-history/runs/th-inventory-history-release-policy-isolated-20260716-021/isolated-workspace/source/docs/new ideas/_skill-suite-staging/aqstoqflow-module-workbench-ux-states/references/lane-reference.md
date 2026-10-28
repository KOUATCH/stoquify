# AqStoqFlow Module Workbench UX States Lane Reference

## Lane Mission

Make module state professional and role-aware while keeping security server-side.

## Lane Focus

Define service-owned state contracts, owner/admin flows, normal-user safe states, read-only history, suspension copy, dependency gaps, and sidebar behavior guardrails.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_WORKBENCH_UX_STATES_2026-07-12.md

## Required Guardrails

- Preserve observe/report mode unless explicitly approved otherwise.
- Keep UI state subordinate to server-side module access controls.
- Keep package and billing strategy separate from runtime authorization truth.
- Preserve tenant isolation and organization scoping.
- Require audit and evidence for entitlement decisions, denies, overrides, migrations, and release gates where relevant.

## Handoff Back To Orchestrator

Return to `aqstoqflow-module-control-plane-orchestrator` after this lane with:

- artifacts produced;
- verification results;
- blockers;
- next safest lane;
- whether any downstream skill should be installed or run next.
