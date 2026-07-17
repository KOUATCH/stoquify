# AqStoqFlow Module Enforcement Pilot Lane Reference

## Lane Mission

Move from observe mode to hard enforcement only through explicit, bounded, reversible pilots.

## Lane Focus

Select pilot candidate, check prerequisites, define rollback, verify all surfaces, and record deny/audit evidence. Never enable broad enforcement by default.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_ENFORCEMENT_PILOT_PLAN_2026-07-12.md

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
