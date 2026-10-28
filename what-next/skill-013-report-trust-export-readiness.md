# Report Trust and Export Certification Readiness Gate

Generated: 2026-07-27T02:46:00.843Z
Mode: fail
Status: ready

## Summary

- Checks ready: 17/17
- Blockers: 0

## Checks

- ready: service_owned_accounting_export_data
- ready: versioned_self_describing_export_manifest
- ready: tenant_scoped_period_status
- ready: balance_redaction_and_certification_disclosed
- ready: tamper_evident_content_and_audit
- ready: permission_and_fresh_auth_boundary
- ready: analytics_currency_is_service_owned
- ready: report_ui_has_no_hardcoded_usd
- ready: trust_banner_and_policy_wiring
- ready: ledger_backed_accountant_data_trust
- ready: explicit_accountant_consent_role_and_expiry
- ready: cross_client_access_is_server_resolved
- ready: delegated_export_honors_grant_role
- ready: accountant_portfolio_and_client_register_surfaces
- ready: accountant_access_grant_revoke_events
- ready: trust_pack_export_event_and_hash_contract
- ready: statutory_payroll_and_inventory_evidence_coverage

## Blockers

- None

## Certification Boundary

- Readiness means report provenance, currency, period status, access controls, and integrity evidence are explicit.
- This gate does not certify an export as an OHADA statutory filing or replace Close & Assurance certification.
