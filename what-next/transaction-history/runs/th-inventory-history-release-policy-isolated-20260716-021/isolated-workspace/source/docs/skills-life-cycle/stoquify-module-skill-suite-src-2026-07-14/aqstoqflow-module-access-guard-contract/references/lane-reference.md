# AqStoqFlow Module Access Guard Contract Lane Reference

## Lane Mission

Converge scattered module checks into one safe server-side access contract.

## Lane Focus

Define requireModuleAccess shape, wrappers, guard order, RBAC interaction, safe errors, audit event handling, and before-data-access tests.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_ACCESS_GUARD_CONTRACT_2026-07-12.md

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
