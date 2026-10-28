# AqStoqFlow Module Package Strategy Lane Reference

## Lane Mission

Make the module system commercially usable without confusing internal platform domains with sellable modules.

## Lane Focus

Define package tiers, add-ons, trials, upgrade/downgrade behavior, dependency pricing, read-only retention, and product-language guardrails.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_PACKAGE_STRATEGY_2026-07-12.md

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
