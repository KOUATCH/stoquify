# AqStoqFlow Module Release Gates And Rollback Lane Reference

## Lane Mission

Make module control-plane progress permanent through release ratchets and rollback evidence.

## Lane Focus

Define gate ladder, report/warn/fail modes, baseline ratchets, policy integration, rollback smoke checks, and release evidence artifacts.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_RELEASE_GATES_AND_ROLLBACK_2026-07-12.md

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
