-- CreateEnum
CREATE TYPE "ComplianceAdapterReviewStatus" AS ENUM ('REQUIRES_EXPERT_REVIEW', 'EXPERT_APPROVED', 'REGULATOR_CONFIRMED');

-- DropForeignKey
ALTER TABLE "accountant_client_invites" DROP CONSTRAINT "accountant_client_invites_businessEventId_fkey";

-- DropForeignKey
ALTER TABLE "accountant_client_invites" DROP CONSTRAINT "accountant_client_invites_outboxId_fkey";

-- DropForeignKey
ALTER TABLE "customer_statement_deliveries" DROP CONSTRAINT "customer_statement_deliveries_businessEventId_fkey";

-- DropForeignKey
ALTER TABLE "customer_statement_deliveries" DROP CONSTRAINT "customer_statement_deliveries_outboxId_fkey";

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

-- DropIndex
DROP INDEX "workflow_assurance_incidents_organizationId_checkKey_source_key";

-- AlterTable
ALTER TABLE "compliance_adapter_configs" ADD COLUMN     "credentialExpiresAt" TIMESTAMP(3),
ADD COLUMN     "credentialRotatedAt" TIMESTAMP(3),
ADD COLUMN     "credentialRotatedById" TEXT,
ADD COLUMN     "officialSpecEffectiveFrom" TIMESTAMP(3),
ADD COLUMN     "officialSpecHash" TEXT,
ADD COLUMN     "officialSpecPublishedAt" TIMESTAMP(3),
ADD COLUMN     "officialSpecReference" TEXT,
ADD COLUMN     "officialSpecTitle" TEXT,
ADD COLUMN     "officialSpecVersion" TEXT,
ADD COLUMN     "reviewEvidenceHash" TEXT,
ADD COLUMN     "reviewStatus" "ComplianceAdapterReviewStatus" NOT NULL DEFAULT 'REQUIRES_EXPERT_REVIEW',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "reviewerConflictDeclared" BOOLEAN,
ADD COLUMN     "reviewerQualification" TEXT;

-- AlterTable
ALTER TABLE "pos_offline_devices" ADD COLUMN     "policySnapshotHash" TEXT,
ADD COLUMN     "signingPublicKeyPem" TEXT,
ADD COLUMN     "sourceSnapshotHash" TEXT;

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
ALTER TABLE "branch_daily_close_sign_offs" RENAME CONSTRAINT "branch_daily_close_sign_offs_organizationId_branchDailyCloseRun" TO "branch_daily_close_sign_offs_organizationId_branchDailyClo_fkey";

-- RenameForeignKey
ALTER TABLE "branch_daily_close_sign_offs" RENAME CONSTRAINT "branch_daily_close_sign_offs_organizationId_supersedesSignOffId" TO "branch_daily_close_sign_offs_organizationId_supersedesSign_fkey";

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
ALTER TABLE "hris_manager_delegations" RENAME CONSTRAINT "hris_manager_delegations_organizationId_delegatorEmployeeId_fke" TO "hris_manager_delegations_organizationId_delegatorEmployeeI_fkey";

-- RenameForeignKey
ALTER TABLE "hris_manager_delegations" RENAME CONSTRAINT "hris_manager_delegations_organizationId_supersedesDelegationId_" TO "hris_manager_delegations_organizationId_supersedesDelegati_fkey";

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
ALTER TABLE "referral_attribution_events" RENAME CONSTRAINT "referral_attribution_events_attributionId_fkey" TO "referral_attribution_events_organizationId_attributionId_fkey";

-- RenameForeignKey
ALTER TABLE "referral_attributions" RENAME CONSTRAINT "referral_attributions_statementSnapshotId_fkey" TO "referral_attributions_organizationId_statementSnapshotId_fkey";

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
ALTER INDEX "cash_shortage_policies_organizationId_currency_status_effective" RENAME TO "cash_shortage_policies_organizationId_currency_status_effec_idx";

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
ALTER INDEX "workflow_assurance_alert_deliveries_channel_status_nextAttemptA" RENAME TO "workflow_assurance_alert_deliveries_channel_status_nextAtte_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_check_findings_organizationId_sourceType_sou" RENAME TO "workflow_assurance_check_findings_organizationId_sourceType_idx";

-- RenameIndex
ALTER INDEX "workflow_assurance_run_execution_key" RENAME TO "workflow_assurance_check_runs_organizationId_checkKey_defin_key";

-- RenameIndex
ALTER INDEX "workflow_assurance_incident_identity_key" RENAME TO "workflow_assurance_incidents_organizationId_checkKey_defini_key";
