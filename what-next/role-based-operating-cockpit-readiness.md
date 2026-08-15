# Role-Based Operating Cockpit Readiness Gate

Generated: 2026-08-12T19:19:06.345Z
Mode: fail
Status: blocked

## Scope

- Workspace: Daily Digest
- Route: /[locale]/dashboard/daily-digest
- Service: services/daily-habit/daily-habit-digest.service.ts

## Summary

- Checks ready: 7/9
- Blockers: 2

## Checks

- ready: tenant_metadata_is_service_owned
- blocked: route_propagates_roles_without_currency_override
- ready: digest_configs_are_permission_filtered
- ready: owner_and_manager_dashboard_roles_are_separated
- ready: hidden_workspace_evidence_is_explicit
- blocked: no_workspace_permission_and_session_states
- ready: command_center_anatomy_is_present
- ready: canonical_dashboard_tokens_and_accessibility
- ready: cockpit_gate_is_in_policy_chain

## Blockers

- route_propagates_roles_without_currency_override
- no_workspace_permission_and_session_states

## Boundary

- Readiness applies to the Daily Digest cockpit slice, not every Stoquify role surface.
- Metrics remain read-only, service-owned, permission-filtered, and explicit about hidden workspaces.
