# AqStoqFlow Module Vocabulary Freeze Lane Reference

## Lane Mission

Freeze one stable module language before downstream control-plane work starts.

## Lane Focus

Reconcile COMMERCIAL_MODULE_SLUGS, ADR vocabulary, current catalog metadata, route prefixes, aliases, and dependency semantics.

## Required Outputs

docs/modules/AQSTOQFLOW_CANONICAL_MODULE_VOCABULARY_2026-07-12.md; docs/modules/AQSTOQFLOW_MODULE_DEPENDENCY_MATRIX_2026-07-12.md

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
