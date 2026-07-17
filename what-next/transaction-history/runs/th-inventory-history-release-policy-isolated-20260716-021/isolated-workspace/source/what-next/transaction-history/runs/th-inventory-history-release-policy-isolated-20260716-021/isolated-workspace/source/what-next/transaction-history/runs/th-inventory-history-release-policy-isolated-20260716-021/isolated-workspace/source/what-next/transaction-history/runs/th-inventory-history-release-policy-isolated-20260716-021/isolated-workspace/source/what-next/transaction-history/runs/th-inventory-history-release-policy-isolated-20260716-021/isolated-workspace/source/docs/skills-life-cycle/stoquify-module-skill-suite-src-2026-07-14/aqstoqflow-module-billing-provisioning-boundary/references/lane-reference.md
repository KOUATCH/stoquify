# AqStoqFlow Module Billing Provisioning Boundary Lane Reference

## Lane Mission

Keep billing provider events as inputs while internal subscription and entitlement state remains authoritative.

## Lane Focus

Define provider adapter, idempotency keys, subscription reconciliation, override audit, dunning, suspension, read-only, and reactivation workflows.

## Required Outputs

docs/modules/AQSTOQFLOW_MODULE_BILLING_PROVISIONING_BOUNDARY_2026-07-12.md

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
