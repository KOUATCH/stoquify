# AqStoqFlow Module Entitlement Schema Lane Reference

## Lane Mission

Move module access truth from onboarding intent toward durable tenant entitlements.

## Lane Focus

Design additive schema, effective entitlement read model, dry-run migration, unknown requested-module reporting, and entitlement event evidence.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_ENTITLEMENT_SCHEMA_AND_MIGRATION_PLAN_2026-07-12.md

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
