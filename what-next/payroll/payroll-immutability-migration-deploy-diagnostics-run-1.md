# Payroll Immutability Migration Deploy Diagnostics

Generated: 2026-08-12T19:21:00.789Z
Command: `prisma migrate deploy`
Target: `localhost/stockflow_immutability_test`
Exit code: 0
Prisma error code: none
Secret database URL values printed: no

## Full Redacted Standard Output

```text
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "stockflow_immutability_test", schema "public" at "localhost:5432"

62 migrations found in prisma/migrations

Applying migration `20260528124341_refine_item_barcode`
Applying migration `20260611120000_payment_provider_reference_uniqueness`
Applying migration `20260611130000_accounting_auth_baseline_bridge`
Applying migration `20260618154500_repair_accounting_source_links`
Applying migration `20260618160000_payroll_foundation_bridge`
Applying migration `20260618161000_ap_stock_count_foundation_bridge`
Applying migration `20260619120000_backfill_purchase_receive_permission`
Applying migration `20260621103000_workflow_assurance_registry_foundation`
Applying migration `20260621113000_workflow_assurance_incident_spine`
Applying migration `20260625110000_payroll_kernel_immutability`
Applying migration `20260626093000_payroll_compensation_approval`
Applying migration `20260626103000_payroll_payment_evidence_readiness`
Applying migration `20260626123000_payroll_cnps_country_pack_expansion`
Applying migration `20260626133000_payroll_declaration_lifecycle_evidence`
Applying migration `20260626143000_payroll_payment_reconciliation_lifecycle`
Applying migration `20260628123000_payroll_employee_balance_lifecycle`
Applying migration `20260630090000_payment_reconciliation_foundation`
Applying migration `20260630100000_payment_reconciliation_inbox_worker_leases`
Applying migration `20260703110000_public_receipt_access_tokens`
Applying migration `20260711133000_public_identity_abuse_limits`
Applying migration `20260714194500_inventory_history_accounting_time_controls`
Applying migration `20260714203000_session_assurance`
Applying migration `20260715090000_inventory_correction_reversal_lineage`
Applying migration `20260718100000_branch_daily_close_review_foundation`
Applying migration `20260718130000_branch_daily_close_sign_off_foundation`
Applying migration `20260719190000_hris_org_manager_scope_foundation`
Applying migration `20260719203000_workflow_assurance_stable_case_identity`
Applying migration `20260720090000_close_assurance_schema_foundation`
Applying migration `20260720130000_cash_shortage_policy_governance`
Applying migration `20260720210000_workflow_assurance_multi_finding_persistence`
Applying migration `20260722143000_agent_runtime_phase_1_foundation`
Applying migration `20260722150000_agent_runtime_tenant_consistency`
Applying migration `20260722153000_agent_runtime_incident_cascade_consistency`
Applying migration `20260722160000_agent_runtime_phase_2a_provenance`
Applying migration `20260722161000_agent_runtime_phase_2a_operational_controls`
Applying migration `20260722162000_agent_runtime_tenant_scoped_correlation`
Applying migration `20260723100000_agent_runtime_release_control`
Applying migration `20260724100000_agent_runtime_release_hardening`
Applying migration `20260724113000_agent_runtime_retirement_alert_dead_letter`
Applying migration `20260724193000_agent_reconciler_invocation_ledger`
Applying migration `20260726140000_business_event_foundation_bridge`
Applying migration `20260726143000_regulatory_isolation_outbox`
Applying migration `20260726190000_retire_production_bom_capability`
Applying migration `20260726213000_hris_operational_time_management`
Applying migration `20260727090000_accountant_access_portfolio`
Applying migration `20260727110000_offline_pos_sync_foundation`
Applying migration `20260727110100_offline_pos_sync_foundation_reconciliation`
Applying migration `20260727143000_country_adapter_pilot_foundation`
Applying migration `20260727170000_ai_copilot_proposal_guardrails`
Applying migration `20260728100000_pos_cash_shortage_checkpoint_persistence`
Applying migration `20260730150000_organization_onboarding_entitlement_bridge`
Applying migration `20260730160000_pos_sales_dependency_entitlement`
Applying migration `20260801153000_certified_fiscal_evidence_immutability`
Applying migration `20260808120000_customer_settlement_allocation_foundation`
Applying migration `20260808133000_customer_settlement_compensating_reversal_foundation`
Applying migration `20260809100000_customer_receivable_document_foundation`
Applying migration `20260809113000_customer_statement_snapshot_foundation`
Applying migration `20260809130000_customer_statement_external_access`
Applying migration `20260809143000_customer_statement_delivery_referral`
Applying migration `20260809160000_accountant_client_invite_onboarding`
Applying migration `20260809170000_referral_accounting_source_types`
Applying migration `20260809180000_accounting_enum_completion`

The following migration(s) have been applied:

migrations/
  └─ 20260528124341_refine_item_barcode/
    └─ migration.sql
  └─ 20260611120000_payment_provider_reference_uniqueness/
    └─ migration.sql
  └─ 20260611130000_accounting_auth_baseline_bridge/
    └─ migration.sql
  └─ 20260618154500_repair_accounting_source_links/
    └─ migration.sql
  └─ 20260618160000_payroll_foundation_bridge/
    └─ migration.sql
  └─ 20260618161000_ap_stock_count_foundation_bridge/
    └─ migration.sql
  └─ 20260619120000_backfill_purchase_receive_permission/
    └─ migration.sql
  └─ 20260621103000_workflow_assurance_registry_foundation/
    └─ migration.sql
  └─ 20260621113000_workflow_assurance_incident_spine/
    └─ migration.sql
  └─ 20260625110000_payroll_kernel_immutability/
    └─ migration.sql
  └─ 20260626093000_payroll_compensation_approval/
    └─ migration.sql
  └─ 20260626103000_payroll_payment_evidence_readiness/
    └─ migration.sql
  └─ 20260626123000_payroll_cnps_country_pack_expansion/
    └─ migration.sql
  └─ 20260626133000_payroll_declaration_lifecycle_evidence/
    └─ migration.sql
  └─ 20260626143000_payroll_payment_reconciliation_lifecycle/
    └─ migration.sql
  └─ 20260628123000_payroll_employee_balance_lifecycle/
    └─ migration.sql
  └─ 20260630090000_payment_reconciliation_foundation/
    └─ migration.sql
  └─ 20260630100000_payment_reconciliation_inbox_worker_leases/
    └─ migration.sql
  └─ 20260703110000_public_receipt_access_tokens/
    └─ migration.sql
  └─ 20260711133000_public_identity_abuse_limits/
    └─ migration.sql
  └─ 20260714194500_inventory_history_accounting_time_controls/
    └─ migration.sql
  └─ 20260714203000_session_assurance/
    └─ migration.sql
  └─ 20260715090000_inventory_correction_reversal_lineage/
    └─ migration.sql
  └─ 20260718100000_branch_daily_close_review_foundation/
    └─ migration.sql
  └─ 20260718130000_branch_daily_close_sign_off_foundation/
    └─ migration.sql
  └─ 20260719190000_hris_org_manager_scope_foundation/
    └─ migration.sql
  └─ 20260719203000_workflow_assurance_stable_case_identity/
    └─ migration.sql
  └─ 20260720090000_close_assurance_schema_foundation/
    └─ migration.sql
  └─ 20260720130000_cash_shortage_policy_governance/
    └─ migration.sql
  └─ 20260720210000_workflow_assurance_multi_finding_persistence/
    └─ migration.sql
  └─ 20260722143000_agent_runtime_phase_1_foundation/
    └─ migration.sql
  └─ 20260722150000_agent_runtime_tenant_consistency/
    └─ migration.sql
  └─ 20260722153000_agent_runtime_incident_cascade_consistency/
    └─ migration.sql
  └─ 20260722160000_agent_runtime_phase_2a_provenance/
    └─ migration.sql
  └─ 20260722161000_agent_runtime_phase_2a_operational_controls/
    └─ migration.sql
  └─ 20260722162000_agent_runtime_tenant_scoped_correlation/
    └─ migration.sql
  └─ 20260723100000_agent_runtime_release_control/
    └─ migration.sql
  └─ 20260724100000_agent_runtime_release_hardening/
    └─ migration.sql
  └─ 20260724113000_agent_runtime_retirement_alert_dead_letter/
    └─ migration.sql
  └─ 20260724193000_agent_reconciler_invocation_ledger/
    └─ migration.sql
  └─ 20260726140000_business_event_foundation_bridge/
    └─ migration.sql
  └─ 20260726143000_regulatory_isolation_outbox/
    └─ migration.sql
  └─ 20260726190000_retire_production_bom_capability/
    └─ migration.sql
  └─ 20260726213000_hris_operational_time_management/
    └─ migration.sql
  └─ 20260727090000_accountant_access_portfolio/
    └─ migration.sql
  └─ 20260727110000_offline_pos_sync_foundation/
    └─ migration.sql
  └─ 20260727110100_offline_pos_sync_foundation_reconciliation/
    └─ migration.sql
  └─ 20260727143000_country_adapter_pilot_foundation/
    └─ migration.sql
  └─ 20260727170000_ai_copilot_proposal_guardrails/
    └─ migration.sql
  └─ 20260728100000_pos_cash_shortage_checkpoint_persistence/
    └─ migration.sql
  └─ 20260730150000_organization_onboarding_entitlement_bridge/
    └─ migration.sql
  └─ 20260730160000_pos_sales_dependency_entitlement/
    └─ migration.sql
  └─ 20260801153000_certified_fiscal_evidence_immutability/
    └─ migration.sql
  └─ 20260808120000_customer_settlement_allocation_foundation/
    └─ migration.sql
  └─ 20260808133000_customer_settlement_compensating_reversal_foundation/
    └─ migration.sql
  └─ 20260809100000_customer_receivable_document_foundation/
    └─ migration.sql
  └─ 20260809113000_customer_statement_snapshot_foundation/
    └─ migration.sql
  └─ 20260809130000_customer_statement_external_access/
    └─ migration.sql
  └─ 20260809143000_customer_statement_delivery_referral/
    └─ migration.sql
  └─ 20260809160000_accountant_client_invite_onboarding/
    └─ migration.sql
  └─ 20260809170000_referral_accounting_source_types/
    └─ migration.sql
  └─ 20260809180000_accounting_enum_completion/
    └─ migration.sql
      
All migrations have been successfully applied.

```

## Full Redacted Standard Error

```text
Loaded Prisma config from prisma.config.ts.

Prisma config detected, skipping environment variable loading.

```

## Full Redacted Spawn Error

```text
(empty)
```
