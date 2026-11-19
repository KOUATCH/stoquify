-- DropForeignKey
ALTER TABLE "accountant_client_invites" DROP CONSTRAINT "accountant_client_invites_businessEventId_fkey";

-- DropForeignKey
ALTER TABLE "accountant_client_invites" DROP CONSTRAINT "accountant_client_invites_outboxId_fkey";

-- DropForeignKey
ALTER TABLE "customer_statement_deliveries" DROP CONSTRAINT "customer_statement_deliveries_businessEventId_fkey";

-- DropForeignKey
ALTER TABLE "customer_statement_deliveries" DROP CONSTRAINT "customer_statement_deliveries_outboxId_fkey";

-- DropForeignKey
ALTER TABLE "firm_obligation_revisions" DROP CONSTRAINT "firm_obligation_revisions_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "firm_obligation_revisions" DROP CONSTRAINT "firm_obligation_revisions_periodId_fkey";

-- DropForeignKey
ALTER TABLE "hris_lifecycle_tasks" DROP CONSTRAINT "hris_task_employee_fk";

-- DropForeignKey
ALTER TABLE "hris_setup_reviewer_grants" DROP CONSTRAINT "hris_setup_employee_tenant_fk";

-- DropForeignKey
ALTER TABLE "hris_setup_reviewer_grants" DROP CONSTRAINT "hris_setup_grantor_tenant_fk";

-- DropForeignKey
ALTER TABLE "hris_setup_reviewer_grants" DROP CONSTRAINT "hris_setup_reviewer_grants_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "hris_setup_reviewer_grants" DROP CONSTRAINT "hris_setup_reviewer_tenant_fk";

-- DropForeignKey
ALTER TABLE "legacy_production_batches" DROP CONSTRAINT "production_batches_createdById_fkey";

-- DropForeignKey
ALTER TABLE "legacy_production_batches" DROP CONSTRAINT "production_batches_locationId_fkey";

-- DropForeignKey
ALTER TABLE "legacy_production_batches" DROP CONSTRAINT "production_batches_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "legacy_production_batches" DROP CONSTRAINT "production_batches_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "legacy_recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_itemId_fkey";

-- DropForeignKey
ALTER TABLE "legacy_recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "legacy_recipes" DROP CONSTRAINT "recipes_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "legacy_recipes" DROP CONSTRAINT "recipes_outputItemId_fkey";

-- AlterTable
ALTER TABLE "payroll_employee_balance_cases" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payroll_payment_destination_change_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_assurance_alert_deliveries" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_assurance_check_definitions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_assurance_check_runs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_assurance_incidents" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_assurance_waivers" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "legacy_production_batches";

-- DropTable
DROP TABLE "legacy_recipe_ingredients";

-- DropTable
DROP TABLE "legacy_recipes";

-- DropEnum
DROP TYPE "ProductionBatchStatus";

-- RenameForeignKey
ALTER TABLE "accountant_client_invite_states" RENAME CONSTRAINT "accountant_client_invite_states_inviteId_fkey" TO "accountant_client_invite_states_organizationId_inviteId_fkey";

-- RenameForeignKey
ALTER TABLE "accountant_client_invites" RENAME CONSTRAINT "accountant_client_invites_attributionId_fkey" TO "accountant_client_invites_organizationId_attributionId_fkey";

-- RenameForeignKey
ALTER TABLE "balance_sheet_evidence" RENAME CONSTRAINT "balance_sheet_account_tenant_fk" TO "balance_sheet_evidence_organizationId_ledgerAccountId_fkey";

-- RenameForeignKey
ALTER TABLE "balance_sheet_evidence" RENAME CONSTRAINT "balance_sheet_period_tenant_fk" TO "balance_sheet_evidence_organizationId_periodId_fkey";

-- RenameForeignKey
ALTER TABLE "bank_balance_evidence" RENAME CONSTRAINT "bank_balance_account_tenant_fk" TO "bank_balance_evidence_organizationId_providerAccountId_fkey";

-- RenameForeignKey
ALTER TABLE "bank_balance_evidence" RENAME CONSTRAINT "bank_balance_period_tenant_fk" TO "bank_balance_evidence_organizationId_periodId_fkey";

-- RenameForeignKey
ALTER TABLE "bank_balance_evidence" RENAME CONSTRAINT "bank_balance_statement_tenant_fk" TO "bank_balance_evidence_organizationId_statementFileId_fkey";

-- RenameForeignKey
ALTER TABLE "branch_daily_close_sign_offs" RENAME CONSTRAINT "branch_daily_close_sign_offs_organizationId_branchDailyCloseRun" TO "branch_daily_close_sign_offs_organizationId_branchDailyClo_fkey";

-- RenameForeignKey
ALTER TABLE "branch_daily_close_sign_offs" RENAME CONSTRAINT "branch_daily_close_sign_offs_organizationId_supersedesSignOffId" TO "branch_daily_close_sign_offs_organizationId_supersedesSign_fkey";

-- RenameForeignKey
ALTER TABLE "customer_locations" RENAME CONSTRAINT "customer_locations_customer_fkey" TO "customer_locations_organizationId_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "customer_locations" RENAME CONSTRAINT "customer_locations_location_fkey" TO "customer_locations_organizationId_locationId_fkey";

-- RenameForeignKey
ALTER TABLE "customer_locations" RENAME CONSTRAINT "customer_locations_organization_fkey" TO "customer_locations_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "customer_receivable_document_states" RENAME CONSTRAINT "customer_receivable_document_states_document_fkey" TO "customer_receivable_document_states_organizationId_documen_fkey";

-- RenameForeignKey
ALTER TABLE "customer_receivable_documents" RENAME CONSTRAINT "customer_receivable_documents_supersedes_fkey" TO "customer_receivable_documents_organizationId_supersedesDoc_fkey";

-- RenameForeignKey
ALTER TABLE "customer_settlement_allocations" RENAME CONSTRAINT "customer_settlement_allocations_receivable_fkey" TO "customer_settlement_allocations_organizationId_customerRec_fkey";

-- RenameForeignKey
ALTER TABLE "customer_settlement_allocations" RENAME CONSTRAINT "customer_settlement_allocations_reversalCustomerLedgerEntryId_f" TO "customer_settlement_allocations_reversalCustomerLedgerEntr_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_access_logs" RENAME CONSTRAINT "customer_statement_access_logs_statementSnapshotId_fkey" TO "customer_statement_access_logs_organizationId_statementSna_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_access_logs" RENAME CONSTRAINT "customer_statement_access_logs_tokenId_fkey" TO "customer_statement_access_logs_organizationId_tokenId_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_access_tokens" RENAME CONSTRAINT "customer_statement_access_tokens_referralAttributionId_fkey" TO "customer_statement_access_tokens_organizationId_referralAt_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_access_tokens" RENAME CONSTRAINT "customer_statement_access_tokens_statementSnapshotId_fkey" TO "customer_statement_access_tokens_organizationId_statementS_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_deliveries" RENAME CONSTRAINT "customer_statement_deliveries_attributionId_fkey" TO "customer_statement_deliveries_organizationId_attributionId_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_deliveries" RENAME CONSTRAINT "customer_statement_deliveries_statementSnapshotId_fkey" TO "customer_statement_deliveries_organizationId_statementSnap_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_deliveries" RENAME CONSTRAINT "customer_statement_deliveries_tokenId_fkey" TO "customer_statement_deliveries_organizationId_tokenId_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_delivery_states" RENAME CONSTRAINT "customer_statement_delivery_states_deliveryId_fkey" TO "customer_statement_delivery_states_organizationId_delivery_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_recipient_action_states" RENAME CONSTRAINT "customer_statement_recipient_action_states_actionId_fkey" TO "customer_statement_recipient_action_states_organizationId__fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_recipient_actions" RENAME CONSTRAINT "customer_statement_recipient_actions_receivableId_fkey" TO "customer_statement_recipient_actions_organizationId_custom_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_recipient_actions" RENAME CONSTRAINT "customer_statement_recipient_actions_statementSnapshotId_fkey" TO "customer_statement_recipient_actions_organizationId_statem_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_recipient_actions" RENAME CONSTRAINT "customer_statement_recipient_actions_tokenId_fkey" TO "customer_statement_recipient_actions_organizationId_tokenI_fkey";

-- RenameForeignKey
ALTER TABLE "customer_statement_snapshots" RENAME CONSTRAINT "customer_statement_snapshots_supersedesStatementId_fkey" TO "customer_statement_snapshots_organizationId_supersedesStat_fkey";

-- RenameForeignKey
ALTER TABLE "hris_employee_documents" RENAME CONSTRAINT "hris_documents_employee_fk" TO "hris_employee_documents_organizationId_employeeId_fkey";

-- RenameForeignKey
ALTER TABLE "hris_employee_documents" RENAME CONSTRAINT "hris_documents_lineage_fk" TO "hris_employee_documents_organizationId_employeeId_replaces_fkey";

-- RenameForeignKey
ALTER TABLE "hris_manager_delegations" RENAME CONSTRAINT "hris_manager_delegations_organizationId_delegatorEmployeeId_fke" TO "hris_manager_delegations_organizationId_delegatorEmployeeI_fkey";

-- RenameForeignKey
ALTER TABLE "hris_manager_delegations" RENAME CONSTRAINT "hris_manager_delegations_organizationId_supersedesDelegationId_" TO "hris_manager_delegations_organizationId_supersedesDelegati_fkey";

-- RenameForeignKey
ALTER TABLE "hris_personal_correction_cases" RENAME CONSTRAINT "hris_personal_case_employee_fk" TO "hris_personal_correction_cases_organizationId_employeeId_fkey";

-- RenameForeignKey
ALTER TABLE "hris_reporting_relationships" RENAME CONSTRAINT "hris_reporting_relationships_organizationId_managerAssignmentId" TO "hris_reporting_relationships_organizationId_managerAssignm_fkey";

-- RenameForeignKey
ALTER TABLE "hris_reporting_relationships" RENAME CONSTRAINT "hris_reporting_relationships_organizationId_managerEmployeeId_f" TO "hris_reporting_relationships_organizationId_managerEmploye_fkey";

-- RenameForeignKey
ALTER TABLE "hris_reporting_relationships" RENAME CONSTRAINT "hris_reporting_relationships_organizationId_reportAssignmentId_" TO "hris_reporting_relationships_organizationId_reportAssignme_fkey";

-- RenameForeignKey
ALTER TABLE "hris_reporting_relationships" RENAME CONSTRAINT "hris_reporting_relationships_organizationId_reportEmployeeId_fk" TO "hris_reporting_relationships_organizationId_reportEmployee_fkey";

-- RenameForeignKey
ALTER TABLE "hris_reporting_relationships" RENAME CONSTRAINT "hris_reporting_relationships_organizationId_supersedesRelations" TO "hris_reporting_relationships_organizationId_supersedesRela_fkey";

-- RenameForeignKey
ALTER TABLE "hris_time_requests" RENAME CONSTRAINT "hris_time_requests_decision_event_tenant_fkey" TO "hris_time_requests_organizationId_decisionBusinessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_batches" RENAME CONSTRAINT "onboarding_import_batches_mapping_fkey" TO "onboarding_import_batches_mappingId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_batches" RENAME CONSTRAINT "onboarding_import_batches_org_fkey" TO "onboarding_import_batches_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_issues" RENAME CONSTRAINT "onboarding_import_issues_batch_fkey" TO "onboarding_import_issues_batchId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_issues" RENAME CONSTRAINT "onboarding_import_issues_org_fkey" TO "onboarding_import_issues_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_issues" RENAME CONSTRAINT "onboarding_import_issues_row_fkey" TO "onboarding_import_issues_rowId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_mappings" RENAME CONSTRAINT "onboarding_import_mappings_org_fkey" TO "onboarding_import_mappings_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_rows" RENAME CONSTRAINT "onboarding_import_rows_batch_fkey" TO "onboarding_import_rows_batchId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_import_rows" RENAME CONSTRAINT "onboarding_import_rows_org_fkey" TO "onboarding_import_rows_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "onboarding_readiness_milestones" RENAME CONSTRAINT "onboarding_readiness_org_fkey" TO "onboarding_readiness_milestones_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "payment_transactions" RENAME CONSTRAINT "payment_transactions_organizationId_providerAuthorityEventId_fk" TO "payment_transactions_organizationId_providerAuthorityEvent_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_payslips" RENAME CONSTRAINT "payroll_payslips_emitted_event_tenant_fkey" TO "payroll_payslips_organizationId_emittedBusinessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_run_transitions" RENAME CONSTRAINT "payroll_run_transitions_event_tenant_fkey" TO "payroll_run_transitions_organizationId_businessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_run_transitions" RENAME CONSTRAINT "payroll_run_transitions_run_tenant_fkey" TO "payroll_run_transitions_organizationId_payrollRunId_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_runs" RENAME CONSTRAINT "payroll_runs_approved_event_tenant_fkey" TO "payroll_runs_organizationId_approvedBusinessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_runs" RENAME CONSTRAINT "payroll_runs_emitted_event_tenant_fkey" TO "payroll_runs_organizationId_emittedBusinessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_runs" RENAME CONSTRAINT "payroll_runs_posted_event_tenant_fkey" TO "payroll_runs_organizationId_postedBusinessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "payroll_runs" RENAME CONSTRAINT "payroll_runs_reviewed_event_tenant_fkey" TO "payroll_runs_organizationId_reviewedBusinessEventId_fkey";

-- RenameForeignKey
ALTER TABLE "reconciliation_no_activity_evidence" RENAME CONSTRAINT "no_activity_account_tenant_fk" TO "reconciliation_no_activity_evidence_organizationId_provide_fkey";

-- RenameForeignKey
ALTER TABLE "reconciliation_no_activity_evidence" RENAME CONSTRAINT "no_activity_period_tenant_fk" TO "reconciliation_no_activity_evidence_organizationId_periodI_fkey";

-- RenameForeignKey
ALTER TABLE "referral_attribution_events" RENAME CONSTRAINT "referral_attribution_events_attributionId_fkey" TO "referral_attribution_events_organizationId_attributionId_fkey";

-- RenameForeignKey
ALTER TABLE "referral_attributions" RENAME CONSTRAINT "referral_attributions_statementSnapshotId_fkey" TO "referral_attributions_organizationId_statementSnapshotId_fkey";

-- RenameForeignKey
ALTER TABLE "supplier_invoice_match_exceptions" RENAME CONSTRAINT "supplier_invoice_match_exceptions_invoice_tenant_fkey" TO "supplier_invoice_match_exceptions_organizationId_supplierI_fkey";

-- RenameForeignKey
ALTER TABLE "supplier_invoice_match_exceptions" RENAME CONSTRAINT "supplier_invoice_match_exceptions_match_tenant_fkey" TO "supplier_invoice_match_exceptions_organizationId_threeWayM_fkey";

-- RenameForeignKey
ALTER TABLE "supplier_invoice_match_exceptions" RENAME CONSTRAINT "supplier_invoice_match_exceptions_org_fkey" TO "supplier_invoice_match_exceptions_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "firm_obligation_revisions" ADD CONSTRAINT "firm_obligation_revisions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_setup_reviewer_grants" ADD CONSTRAINT "hris_setup_reviewer_grants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_setup_reviewer_grants" ADD CONSTRAINT "hris_setup_reviewer_grants_organizationId_reviewerUserId_fkey" FOREIGN KEY ("organizationId", "reviewerUserId") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_setup_reviewer_grants" ADD CONSTRAINT "hris_setup_reviewer_grants_organizationId_employeeId_fkey" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_setup_reviewer_grants" ADD CONSTRAINT "hris_setup_reviewer_grants_organizationId_createdById_fkey" FOREIGN KEY ("organizationId", "createdById") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_lifecycle_tasks" ADD CONSTRAINT "hris_task_employee_fk" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "accountant_client_invite_states_hash_key" RENAME TO "accountant_client_invite_states_organizationId_stateHash_key";

-- RenameIndex
ALTER INDEX "accountant_client_invite_states_identity_key" RENAME TO "accountant_client_invite_states_organizationId_inviteId_ver_key";

-- RenameIndex
ALTER INDEX "accountant_client_invite_states_timeline_idx" RENAME TO "accountant_client_invite_states_organizationId_inviteId_occ_idx";

-- RenameIndex
ALTER INDEX "accountant_client_invite_states_user_status_idx" RENAME TO "accountant_client_invite_states_accountantUserId_status_occ_idx";

-- RenameIndex
ALTER INDEX "accountant_client_invites_created_idx" RENAME TO "accountant_client_invites_organizationId_createdAt_idx";

-- RenameIndex
ALTER INDEX "accountant_client_invites_email_expiry_idx" RENAME TO "accountant_client_invites_organizationId_emailHash_expiresA_idx";

-- RenameIndex
ALTER INDEX "accountant_client_invites_org_attribution_key" RENAME TO "accountant_client_invites_organizationId_attributionId_key";

-- RenameIndex
ALTER INDEX "accountant_client_invites_org_correlation_key" RENAME TO "accountant_client_invites_organizationId_correlationId_key";

-- RenameIndex
ALTER INDEX "accountant_client_invites_org_idempotency_key" RENAME TO "accountant_client_invites_organizationId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "agent_activation_approvals_packageId_approvalType_decision_expi" RENAME TO "agent_activation_approvals_packageId_approvalType_decision__idx";

-- RenameIndex
ALTER INDEX "agent_activation_packages_environment_agentKey_releaseVersion_k" RENAME TO "agent_activation_packages_environment_agentKey_releaseVersi_key";

-- RenameIndex
ALTER INDEX "agent_reconciler_active_lease" RENAME TO "agent_reconciler_invocations_environment_activeKey_key";

-- RenameIndex
ALTER INDEX "agent_reconciler_invocation_identity" RENAME TO "agent_reconciler_invocations_environment_scheduleKey_runId_key";

-- RenameIndex
ALTER INDEX "branch_daily_close_runs_organizationId_locationId_businessDate_" RENAME TO "branch_daily_close_runs_organizationId_locationId_businessD_key";

-- RenameIndex
ALTER INDEX "branch_daily_close_runs_organizationId_locationId_status_busine" RENAME TO "branch_daily_close_runs_organizationId_locationId_status_bu_idx";

-- RenameIndex
ALTER INDEX "branch_daily_close_sign_offs_organizationId_branchDailyCloseRun" RENAME TO "branch_daily_close_sign_offs_organizationId_branchDailyClos_idx";

-- RenameIndex
ALTER INDEX "business_event_anomalies_organizationId_businessEventId_anomaly" RENAME TO "business_event_anomalies_organizationId_businessEventId_ano_key";

-- RenameIndex
ALTER INDEX "business_event_anomalies_organizationId_status_severity_lastSee" RENAME TO "business_event_anomalies_organizationId_status_severity_las_idx";

-- RenameIndex
ALTER INDEX "cash_shortage_policies_organizationId_currency_status_effective" RENAME TO "cash_shortage_policies_organizationId_currency_status_effec_idx";

-- RenameIndex
ALTER INDEX "close_assurance_findings_organizationId_ownerId_status_dueAt_id" RENAME TO "close_assurance_findings_organizationId_ownerId_status_dueA_idx";

-- RenameIndex
ALTER INDEX "close_assurance_findings_organizationId_periodId_status_severit" RENAME TO "close_assurance_findings_organizationId_periodId_status_sev_idx";

-- RenameIndex
ALTER INDEX "customer_locations_org_customer_idx" RENAME TO "customer_locations_organizationId_customerId_idx";

-- RenameIndex
ALTER INDEX "customer_locations_org_customer_location_key" RENAME TO "customer_locations_organizationId_customerId_locationId_key";

-- RenameIndex
ALTER INDEX "customer_locations_org_location_customer_idx" RENAME TO "customer_locations_organizationId_locationId_customerId_idx";

-- RenameIndex
ALTER INDEX "customer_receivable_states_document_effective_idx" RENAME TO "customer_receivable_document_states_organizationId_document_idx";

-- RenameIndex
ALTER INDEX "customer_receivable_states_document_version_key" RENAME TO "customer_receivable_document_states_organizationId_document_key";

-- RenameIndex
ALTER INDEX "customer_receivable_states_source_idx" RENAME TO "customer_receivable_document_states_organizationId_sourceTy_idx";

-- RenameIndex
ALTER INDEX "customer_receivable_states_state_hash_key" RENAME TO "customer_receivable_document_states_organizationId_stateHas_key";

-- RenameIndex
ALTER INDEX "customer_receivable_documents_customer_due_idx" RENAME TO "customer_receivable_documents_organizationId_customerId_due_idx";

-- RenameIndex
ALTER INDEX "customer_receivable_documents_customer_invoice_idx" RENAME TO "customer_receivable_documents_organizationId_customerId_inv_idx";

-- RenameIndex
ALTER INDEX "customer_receivable_documents_document_version_key" RENAME TO "customer_receivable_documents_organizationId_documentNumber_key";

-- RenameIndex
ALTER INDEX "customer_receivable_documents_source_version_key" RENAME TO "customer_receivable_documents_organizationId_sourceSalesOrd_key";

-- RenameIndex
ALTER INDEX "customer_receivable_documents_supersedes_idx" RENAME TO "customer_receivable_documents_organizationId_supersedesDocu_idx";

-- RenameIndex
ALTER INDEX "customer_settlement_allocations_customerSettlementId_salesOrder" RENAME TO "customer_settlement_allocations_customerSettlementId_salesO_key";

-- RenameIndex
ALTER INDEX "customer_settlement_allocations_receivable_idx" RENAME TO "customer_settlement_allocations_organizationId_customerRece_idx";

-- RenameIndex
ALTER INDEX "customer_settlement_allocations_reversalCustomerLedgerEntryId_k" RENAME TO "customer_settlement_allocations_reversalCustomerLedgerEntry_key";

-- RenameIndex
ALTER INDEX "customer_settlement_allocations_settlement_receivable_key" RENAME TO "customer_settlement_allocations_customerSettlementId_custom_key";

-- RenameIndex
ALTER INDEX "customer_settlements_organizationId_customerId_status_settlemen" RENAME TO "customer_settlements_organizationId_customerId_status_settl_idx";

-- RenameIndex
ALTER INDEX "customer_statement_access_logs_organizationId_statementSnapshot" RENAME TO "customer_statement_access_logs_organizationId_statementSnap_idx";

-- RenameIndex
ALTER INDEX "customer_statement_access_logs_organizationId_tokenId_occurredA" RENAME TO "customer_statement_access_logs_organizationId_tokenId_occur_idx";

-- RenameIndex
ALTER INDEX "customer_statement_access_tokens_organizationId_statementSnapsh" RENAME TO "customer_statement_access_tokens_organizationId_statementSn_idx";

-- RenameIndex
ALTER INDEX "customer_statement_access_tokens_organizationId_status_expiresA" RENAME TO "customer_statement_access_tokens_organizationId_status_expi_idx";

-- RenameIndex
ALTER INDEX "customer_statement_deliveries_destination_idx" RENAME TO "customer_statement_deliveries_organizationId_destinationHas_idx";

-- RenameIndex
ALTER INDEX "customer_statement_deliveries_statement_channel_idx" RENAME TO "customer_statement_deliveries_organizationId_statementSnaps_idx";

-- RenameIndex
ALTER INDEX "customer_statement_deliveries_statement_idempotency_key" RENAME TO "customer_statement_deliveries_organizationId_statementSnaps_key";

-- RenameIndex
ALTER INDEX "customer_statement_delivery_states_hash_key" RENAME TO "customer_statement_delivery_states_organizationId_stateHash_key";

-- RenameIndex
ALTER INDEX "customer_statement_delivery_states_identity_key" RENAME TO "customer_statement_delivery_states_organizationId_deliveryI_key";

-- RenameIndex
ALTER INDEX "customer_statement_delivery_states_timeline_idx" RENAME TO "customer_statement_delivery_states_organizationId_deliveryI_idx";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_action_states_action_effective_idx" RENAME TO "customer_statement_recipient_action_states_organizationId_a_idx";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_action_states_action_version_key" RENAME TO "customer_statement_recipient_action_states_organizationId_a_key";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_action_states_state_hash_key" RENAME TO "customer_statement_recipient_action_states_organizationId_s_key";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_actions_organizationId_correlation" RENAME TO "customer_statement_recipient_actions_organizationId_correla_key";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_actions_receivable_idx" RENAME TO "customer_statement_recipient_actions_organizationId_custome_idx";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_actions_statement_idempotency_key" RENAME TO "customer_statement_recipient_actions_organizationId_stateme_key";

-- RenameIndex
ALTER INDEX "customer_statement_recipient_actions_statement_type_created_idx" RENAME TO "customer_statement_recipient_actions_organizationId_stateme_idx";

-- RenameIndex
ALTER INDEX "customer_statement_snapshots_organizationId_customerId_currency" RENAME TO "customer_statement_snapshots_organizationId_customerId_curr_idx";

-- RenameIndex
ALTER INDEX "customer_statement_snapshots_organizationId_customerId_periodEn" RENAME TO "customer_statement_snapshots_organizationId_customerId_peri_idx";

-- RenameIndex
ALTER INDEX "customer_statement_snapshots_organizationId_statementNumber_ver" RENAME TO "customer_statement_snapshots_organizationId_statementNumber_key";

-- RenameIndex
ALTER INDEX "customer_statement_snapshots_organizationId_supersedesStatement" RENAME TO "customer_statement_snapshots_organizationId_supersedesState_idx";

-- RenameIndex
ALTER INDEX "delivery_goods_issues_organizationId_salesOrderId_kind_issuedAt" RENAME TO "delivery_goods_issues_organizationId_salesOrderId_kind_issu_idx";

-- RenameIndex
ALTER INDEX "financial_opening_revisions_organizationId_cutoverDate_revision" RENAME TO "financial_opening_revisions_organizationId_cutoverDate_revi_key";

-- RenameIndex
ALTER INDEX "financial_opening_revisions_organizationId_cutoverDate_sourceHa" RENAME TO "financial_opening_revisions_organizationId_cutoverDate_sour_idx";

-- RenameIndex
ALTER INDEX "hris_employment_assignments_organizationId_employeeId_type_stat" RENAME TO "hris_employment_assignments_organizationId_employeeId_type__idx";

-- RenameIndex
ALTER INDEX "hris_employment_assignments_organizationId_orgUnitId_status_eff" RENAME TO "hris_employment_assignments_organizationId_orgUnitId_status_idx";

-- RenameIndex
ALTER INDEX "hris_manager_delegations_organizationId_delegateEmployeeId_auth" RENAME TO "hris_manager_delegations_organizationId_delegateEmployeeId__idx";

-- RenameIndex
ALTER INDEX "hris_manager_delegations_organizationId_delegatorEmployeeId_sta" RENAME TO "hris_manager_delegations_organizationId_delegatorEmployeeId_idx";

-- RenameIndex
ALTER INDEX "hris_manager_delegations_organizationId_supersedesDelegationId_" RENAME TO "hris_manager_delegations_organizationId_supersedesDelegatio_idx";

-- RenameIndex
ALTER INDEX "hris_org_units_organizationId_type_status_effectiveFrom_effecti" RENAME TO "hris_org_units_organizationId_type_status_effectiveFrom_eff_idx";

-- RenameIndex
ALTER INDEX "hris_positions_organizationId_orgUnitId_status_effectiveFrom_ef" RENAME TO "hris_positions_organizationId_orgUnitId_status_effectiveFro_idx";

-- RenameIndex
ALTER INDEX "hris_reporting_relationships_organizationId_managerAssignmentId" RENAME TO "hris_reporting_relationships_organizationId_managerAssignme_idx";

-- RenameIndex
ALTER INDEX "hris_reporting_relationships_organizationId_managerEmployeeId_s" RENAME TO "hris_reporting_relationships_organizationId_managerEmployee_idx";

-- RenameIndex
ALTER INDEX "hris_reporting_relationships_organizationId_reportAssignmentId_" RENAME TO "hris_reporting_relationships_organizationId_reportAssignmen_idx";

-- RenameIndex
ALTER INDEX "hris_reporting_relationships_organizationId_reportEmployeeId_st" RENAME TO "hris_reporting_relationships_organizationId_reportEmployeeI_idx";

-- RenameIndex
ALTER INDEX "hris_reporting_relationships_organizationId_supersedesRelations" RENAME TO "hris_reporting_relationships_organizationId_supersedesRelat_idx";

-- RenameIndex
ALTER INDEX "inventory_transactions_org_effective_recorded_id_idx" RENAME TO "inventory_transactions_organizationId_effectiveAt_recordedA_idx";

-- RenameIndex
ALTER INDEX "inventory_transactions_org_recorded_id_idx" RENAME TO "inventory_transactions_organizationId_recordedAt_id_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_batches_org_risk_status_idx" RENAME TO "onboarding_import_batches_organizationId_riskLevel_status_c_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_batches_org_status_created_idx" RENAME TO "onboarding_import_batches_organizationId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_batches_org_target_created_idx" RENAME TO "onboarding_import_batches_organizationId_target_createdAt_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_batches_org_target_hash_mapping_key" RENAME TO "onboarding_import_batches_organizationId_target_contentHash_key";

-- RenameIndex
ALTER INDEX "onboarding_import_issues_batch_row_idx" RENAME TO "onboarding_import_issues_batchId_rowNumber_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_issues_org_batch_severity_idx" RENAME TO "onboarding_import_issues_organizationId_batchId_severity_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_mappings_org_target_created_idx" RENAME TO "onboarding_import_mappings_organizationId_target_createdAt_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_mappings_org_target_version_key" RENAME TO "onboarding_import_mappings_organizationId_target_version_key";

-- RenameIndex
ALTER INDEX "onboarding_import_rows_batch_record_idx" RENAME TO "onboarding_import_rows_batchId_committedRecordId_idx";

-- RenameIndex
ALTER INDEX "onboarding_import_rows_batch_row_key" RENAME TO "onboarding_import_rows_batchId_rowNumber_key";

-- RenameIndex
ALTER INDEX "onboarding_import_rows_org_batch_key_idx" RENAME TO "onboarding_import_rows_organizationId_batchId_businessKey_idx";

-- RenameIndex
ALTER INDEX "onboarding_readiness_org_state_idx" RENAME TO "onboarding_readiness_milestones_organizationId_state_idx";

-- RenameIndex
ALTER INDEX "onboarding_readiness_org_target_key" RENAME TO "onboarding_readiness_milestones_organizationId_target_key";

-- RenameIndex
ALTER INDEX "payment_reconciliation_inbox_items_org_lease_token_idx" RENAME TO "payment_reconciliation_inbox_items_organizationId_leaseToke_idx";

-- RenameIndex
ALTER INDEX "payment_reconciliation_inbox_items_org_status_leased_by_idx" RENAME TO "payment_reconciliation_inbox_items_organizationId_status_le_idx";

-- RenameIndex
ALTER INDEX "payment_transactions_organizationId_providerAuthorityEventId_ke" RENAME TO "payment_transactions_organizationId_providerAuthorityEventI_key";

-- RenameIndex
ALTER INDEX "payroll_declaration_evidence_organizationId_declarationId_creat" RENAME TO "payroll_declaration_evidence_organizationId_declarationId_c_idx";

-- RenameIndex
ALTER INDEX "payroll_declaration_evidence_organizationId_declarationId_trans" RENAME TO "payroll_declaration_evidence_organizationId_declarationId_t_key";

-- RenameIndex
ALTER INDEX "payroll_declaration_evidence_organizationId_transition_createdA" RENAME TO "payroll_declaration_evidence_organizationId_transition_crea_idx";

-- RenameIndex
ALTER INDEX "payroll_employee_balance_cases_organizationId_employeeId_status" RENAME TO "payroll_employee_balance_cases_organizationId_employeeId_st_idx";

-- RenameIndex
ALTER INDEX "payroll_employee_balance_cases_organizationId_idempotencyKey_ke" RENAME TO "payroll_employee_balance_cases_organizationId_idempotencyKe_key";

-- RenameIndex
ALTER INDEX "payroll_employee_balance_events_organizationId_balanceCaseId_cr" RENAME TO "payroll_employee_balance_events_organizationId_balanceCaseI_idx";

-- RenameIndex
ALTER INDEX "payroll_employee_balance_events_organizationId_balanceCaseId_ev" RENAME TO "payroll_employee_balance_events_organizationId_balanceCaseI_key";

-- RenameIndex
ALTER INDEX "payroll_employee_balance_events_organizationId_eventType_create" RENAME TO "payroll_employee_balance_events_organizationId_eventType_cr_idx";

-- RenameIndex
ALTER INDEX "payroll_employee_balance_events_organizationId_idempotencyKey_k" RENAME TO "payroll_employee_balance_events_organizationId_idempotencyK_key";

-- RenameIndex
ALTER INDEX "payroll_employee_rubrique_assignments_organizationId_effectiveF" RENAME TO "payroll_employee_rubrique_assignments_organizationId_effect_idx";

-- RenameIndex
ALTER INDEX "payroll_employee_rubrique_assignments_organizationId_employeeId" RENAME TO "payroll_employee_rubrique_assignments_organizationId_employ_idx";

-- RenameIndex
ALTER INDEX "payroll_employee_rubrique_assignments_organizationId_rubriqueId" RENAME TO "payroll_employee_rubrique_assignments_organizationId_rubriq_idx";

-- RenameIndex
ALTER INDEX "pay_dest_change_hash_idx" RENAME TO "payroll_payment_destination_change_requests_organizationId__idx";

-- RenameIndex
ALTER INDEX "payroll_run_transitions_organizationId_payrollRunId_createdAt_i" RENAME TO "payroll_run_transitions_organizationId_payrollRunId_created_idx";

-- RenameIndex
ALTER INDEX "payroll_run_transitions_organizationId_payrollRunId_sequence_ke" RENAME TO "payroll_run_transitions_organizationId_payrollRunId_sequenc_key";

-- RenameIndex
ALTER INDEX "payroll_run_transitions_organizationId_payrollRunId_toStatus_ke" RENAME TO "payroll_run_transitions_organizationId_payrollRunId_toStatu_key";

-- RenameIndex
ALTER INDEX "payroll_run_transitions_organizationId_toStatus_transitionedAt_" RENAME TO "payroll_run_transitions_organizationId_toStatus_transitione_idx";

-- RenameIndex
ALTER INDEX "payroll_salary_change_requests_organizationId_employeeId_status" RENAME TO "payroll_salary_change_requests_organizationId_employeeId_st_idx";

-- RenameIndex
ALTER INDEX "payroll_salary_change_requests_organizationId_sourceContractId_" RENAME TO "payroll_salary_change_requests_organizationId_sourceContrac_idx";

-- RenameIndex
ALTER INDEX "payroll_salary_change_requests_organizationId_supersedingContra" RENAME TO "payroll_salary_change_requests_organizationId_supersedingCo_idx";

-- RenameIndex
ALTER INDEX "pos_commit_results_organizationId_locationId_status_createdAt_i" RENAME TO "pos_commit_results_organizationId_locationId_status_created_idx";

-- RenameIndex
ALTER INDEX "public_receipt_access_tokens_org_jti_hash_key" RENAME TO "public_receipt_access_tokens_organizationId_jtiHash_key";

-- RenameIndex
ALTER INDEX "public_receipt_access_tokens_org_sale_status_idx" RENAME TO "public_receipt_access_tokens_organizationId_salesOrderId_st_idx";

-- RenameIndex
ALTER INDEX "public_receipt_access_tokens_org_status_expires_idx" RENAME TO "public_receipt_access_tokens_organizationId_status_expiresA_idx";

-- RenameIndex
ALTER INDEX "public_receipt_access_tokens_org_token_hash_key" RENAME TO "public_receipt_access_tokens_organizationId_tokenHash_key";

-- RenameIndex
ALTER INDEX "referral_attribution_events_conversion_idx" RENAME TO "referral_attribution_events_targetOrganizationId_eventType_idx";

-- RenameIndex
ALTER INDEX "referral_attribution_events_funnel_idx" RENAME TO "referral_attribution_events_organizationId_eventType_occurr_idx";

-- RenameIndex
ALTER INDEX "referral_attribution_events_identity_key" RENAME TO "referral_attribution_events_organizationId_attributionId_ev_key";

-- RenameIndex
ALTER INDEX "referral_attributions_campaign_idx" RENAME TO "referral_attributions_organizationId_campaign_createdAt_idx";

-- RenameIndex
ALTER INDEX "referral_attributions_source_idx" RENAME TO "referral_attributions_organizationId_sourceType_sourceId_idx";

-- RenameIndex
ALTER INDEX "supplier_invoice_match_exceptions_invoice_status_idx" RENAME TO "supplier_invoice_match_exceptions_organizationId_supplierIn_idx";

-- RenameIndex
ALTER INDEX "supplier_invoice_match_exceptions_match_status_idx" RENAME TO "supplier_invoice_match_exceptions_organizationId_threeWayMa_idx";

-- RenameIndex
ALTER INDEX "supplier_invoice_match_exceptions_org_id_key" RENAME TO "supplier_invoice_match_exceptions_organizationId_id_key";

-- RenameIndex
ALTER INDEX "supplier_invoice_match_exceptions_status_expiry_idx" RENAME TO "supplier_invoice_match_exceptions_organizationId_status_exp_idx";

-- RenameIndex
ALTER INDEX "supplier_po_access_logs_organizationId_envelopeId_occurredAt_id" RENAME TO "supplier_po_access_logs_organizationId_envelopeId_occurredA_idx";

-- RenameIndex
ALTER INDEX "supplier_po_envelopes_organizationId_purchaseOrderId_createdAt_" RENAME TO "supplier_po_envelopes_organizationId_purchaseOrderId_create_idx";

-- RenameIndex
ALTER INDEX "supplier_po_envelopes_po_content_key" RENAME TO "supplier_po_envelopes_organizationId_purchaseOrderId_conten_key";

-- RenameIndex
ALTER INDEX "supplier_po_proposal_lines_organizationId_purchaseOrderLineId_i" RENAME TO "supplier_po_proposal_lines_organizationId_purchaseOrderLine_idx";

-- RenameIndex
ALTER INDEX "supplier_po_proposal_lines_proposal_line_key" RENAME TO "supplier_po_proposal_lines_organizationId_proposalId_purcha_key";

-- RenameIndex
ALTER INDEX "supplier_po_proposal_states_organizationId_proposalId_effective" RENAME TO "supplier_po_proposal_states_organizationId_proposalId_effec_idx";

-- RenameIndex
ALTER INDEX "supplier_po_proposal_states_proposal_version_key" RENAME TO "supplier_po_proposal_states_organizationId_proposalId_versi_key";

-- RenameIndex
ALTER INDEX "supplier_po_proposals_envelope_idempotency_key" RENAME TO "supplier_po_proposals_organizationId_envelopeId_idempotency_key";

-- RenameIndex
ALTER INDEX "supplier_po_proposals_envelope_type_created_idx" RENAME TO "supplier_po_proposals_organizationId_envelopeId_proposalTyp_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_alert_deliveries_channel_status_nextAttemptA" RENAME TO "workflow_assurance_alert_deliveries_channel_status_nextAtte_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_alert_deliveries_organizationId_channel_stat" RENAME TO "workflow_assurance_alert_deliveries_organizationId_channel__idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_alert_deliveries_organizationId_incidentId_c" RENAME TO "workflow_assurance_alert_deliveries_organizationId_incident_key";

-- RenameIndex
ALTER INDEX "workflow_assurance_alert_deliveries_organizationId_status_creat" RENAME TO "workflow_assurance_alert_deliveries_organizationId_status_c_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_check_findings_organizationId_sourceType_sou" RENAME TO "workflow_assurance_check_findings_organizationId_sourceType_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_check_runs_organizationId_checkKey_startedAt" RENAME TO "workflow_assurance_check_runs_organizationId_checkKey_start_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_check_runs_organizationId_resultStatus_start" RENAME TO "workflow_assurance_check_runs_organizationId_resultStatus_s_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_check_runs_organizationId_runStatus_startedA" RENAME TO "workflow_assurance_check_runs_organizationId_runStatus_star_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_check_runs_organizationId_sourceType_sourceI" RENAME TO "workflow_assurance_check_runs_organizationId_sourceType_sou_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_run_execution_key" RENAME TO "workflow_assurance_check_runs_organizationId_checkKey_defin_key";

-- RenameIndex
ALTER INDEX "workflow_assurance_incident_events_organizationId_eventType_cre" RENAME TO "workflow_assurance_incident_events_organizationId_eventType_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_incident_events_organizationId_incidentId_cr" RENAME TO "workflow_assurance_incident_events_organizationId_incidentI_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_incident_identity_key" RENAME TO "workflow_assurance_incidents_organizationId_checkKey_defini_key";

-- RenameIndex
ALTER INDEX "workflow_assurance_incidents_organizationId_ownerId_status_dueA" RENAME TO "workflow_assurance_incidents_organizationId_ownerId_status__idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_incidents_organizationId_status_severity_las" RENAME TO "workflow_assurance_incidents_organizationId_status_severity_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_waivers_organizationId_requesterId_status_id" RENAME TO "workflow_assurance_waivers_organizationId_requesterId_statu_idx";
