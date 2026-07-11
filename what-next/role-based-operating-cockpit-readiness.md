# Role-Based Operating Cockpit Readiness Gate

Generated: 2026-07-11T20:17:33.893Z
Mode: fail
Status: ready

## Scope

- Workspace: Daily Digest
- Route: /[locale]/dashboard/daily-digest
- Service: services/daily-habit/daily-habit-digest.service.ts

## Summary

- Checks ready: 9/9
- Blockers: 0

## Checks

- ready: tenant_metadata_is_service_owned
- ready: route_propagates_roles_without_currency_override
- ready: digest_configs_are_permission_filtered
- ready: owner_and_manager_dashboard_roles_are_separated
- ready: hidden_workspace_evidence_is_explicit
- ready: no_workspace_permission_and_session_states
- ready: command_center_anatomy_is_present
- ready: canonical_dashboard_tokens_and_accessibility
- ready: cockpit_gate_is_in_policy_chain

## Blockers

- None

## Boundary

- Readiness applies to the Daily Digest cockpit slice, not every Stoquify role surface.
- Metrics remain read-only, service-owned, permission-filtered, and explicit about hidden workspaces.
