--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- public schema already exists in the new empty database


--
-- Name: AccountantAccessRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountantAccessRole" AS ENUM (
    'READ_ONLY',
    'REVIEWER',
    'PREPARER'
);


--
-- Name: AccountantAccessStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountantAccessStatus" AS ENUM (
    'ACTIVE',
    'REVOKED'
);


--
-- Name: AccountantClientInviteStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountantClientInviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED'
);


--
-- Name: AccountantReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountantReviewStatus" AS ENUM (
    'OPEN',
    'CHANGES_REQUESTED',
    'READY_TO_CLOSE',
    'APPROVED_FOR_CLOSE',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: AccountingPeriodStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingPeriodStatus" AS ENUM (
    'OPEN',
    'LOCKED',
    'CLOSED'
);


--
-- Name: AccountingPostingPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingPostingPurpose" AS ENUM (
    'MANUAL_JOURNAL',
    'SALE_COMPLETION',
    'PAYMENT_RECEIPT',
    'REFUND',
    'VOID',
    'CASH_DRAWER_CLOSE',
    'GOODS_RECEIPT',
    'SUPPLIER_INVOICE',
    'SUPPLIER_PAYMENT',
    'CUSTOMER_SETTLEMENT',
    'EXPENSE_APPROVAL',
    'INVENTORY_ADJUSTMENT',
    'STOCK_TRANSFER',
    'PAYROLL_RUN',
    'PAYROLL_PAYMENT',
    'PRODUCTION_BATCH',
    'OPENING_BALANCE',
    'ADJUSTMENT',
    'REVERSAL',
    'PAYROLL_EMPLOYEE_RECEIVABLE',
    'PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT',
    'PAYMENT_RECONCILIATION',
    'SUSPENSE_RECLASSIFICATION',
    'GOODS_ISSUE',
    'SALES_INVOICE',
    'PURCHASE_RETURN',
    'SUPPLIER_CREDIT_NOTE'
);


--
-- Name: AccountingSetupStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingSetupStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'READY',
    'LOCKED'
);


--
-- Name: AccountingSourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingSourceType" AS ENUM (
    'MANUAL',
    'POS_SALE',
    'POS_PAYMENT',
    'POS_REFUND',
    'POS_VOID',
    'CASH_DRAWER_CLOSE',
    'GOODS_RECEIPT',
    'SUPPLIER_INVOICE',
    'SUPPLIER_PAYMENT',
    'CUSTOMER_SETTLEMENT',
    'EXPENSE',
    'STOCK_ADJUSTMENT',
    'STOCK_TRANSFER',
    'PAYROLL_RUN',
    'PAYROLL_PAYMENT',
    'PRODUCTION_BATCH',
    'OPENING_BALANCE',
    'IMPORT',
    'PAYROLL_EMPLOYEE_BALANCE',
    'PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT',
    'CUSTOMER_RECEIVABLE_DOCUMENT',
    'CUSTOMER_STATEMENT_SNAPSHOT',
    'CUSTOMER_STATEMENT',
    'CUSTOMER_STATEMENT_DELIVERY',
    'CUSTOMER_STATEMENT_RECIPIENT_ACTION',
    'CUSTOMER_SETTLEMENT_ALLOCATION',
    'CUSTOMER_SETTLEMENT_REVERSAL',
    'ACCOUNTANT_CLIENT_INVITE',
    'STOCK_COUNT',
    'PAYMENT_RECONCILIATION',
    'PAYMENT_SUSPENSE',
    'SUPPLIER_PO_ACKNOWLEDGEMENT',
    'DELIVERY_GOODS_ISSUE',
    'DELIVERY_ORDER',
    'DELIVERY_INVOICE',
    'PURCHASE_RETURN',
    'SUPPLIER_CREDIT_NOTE'
);


--
-- Name: AdjustmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdjustmentStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: AdjustmentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdjustmentType" AS ENUM (
    'CYCLE_COUNT',
    'PHYSICAL_COUNT',
    'DAMAGED',
    'EXPIRED',
    'THEFT',
    'WRITE_OFF',
    'FOUND',
    'CORRECTION',
    'OTHER'
);


--
-- Name: AgentActivationState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentActivationState" AS ENUM (
    'DRAFT',
    'REVIEWED',
    'APPROVED',
    'PROVISIONED_INACTIVE',
    'PILOT_CERTIFIED',
    'ACTIVE_INTERNAL',
    'SUSPENDED',
    'RETIRED'
);


--
-- Name: AgentApprovalDecision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentApprovalDecision" AS ENUM (
    'APPROVED',
    'REJECTED',
    'REVOKED'
);


--
-- Name: AgentApprovalType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentApprovalType" AS ENUM (
    'PRODUCT',
    'SECURITY'
);


--
-- Name: AgentCertificationResult; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentCertificationResult" AS ENUM (
    'PASSED',
    'FAILED',
    'INVALIDATED'
);


--
-- Name: AgentDefinitionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentDefinitionStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'RETIRED'
);


--
-- Name: AgentEvidenceFreshness; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentEvidenceFreshness" AS ENUM (
    'FRESH',
    'STALE',
    'PARTIAL',
    'BLOCKED',
    'FAILED',
    'EMPTY',
    'UNKNOWN'
);


--
-- Name: AgentOwnerResponsibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentOwnerResponsibility" AS ENUM (
    'ROLLOUT',
    'ROLLBACK',
    'SUPPORT',
    'PILOT',
    'SECURITY_INCIDENT',
    'ON_CALL_BACKUP'
);


--
-- Name: AgentPolicyIncidentSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentPolicyIncidentSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: AgentPolicyIncidentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentPolicyIncidentStatus" AS ENUM (
    'OPEN',
    'RESOLVED',
    'DISMISSED'
);


--
-- Name: AgentReconcilerInvocationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentReconcilerInvocationStatus" AS ENUM (
    'RUNNING',
    'COMPLETED',
    'COMPLETED_WITH_WARNINGS',
    'FAILED'
);


--
-- Name: AgentRiskLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentRiskLevel" AS ENUM (
    'READ_ONLY',
    'DRAFT',
    'LOW_RISK',
    'SENSITIVE',
    'PROHIBITED'
);


--
-- Name: AgentRolloutMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentRolloutMode" AS ENUM (
    'INTERNAL',
    'SHADOW',
    'PILOT',
    'GENERAL'
);


--
-- Name: AgentRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentRunStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'BLOCKED',
    'CANCELLED'
);


--
-- Name: AgentStepKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentStepKind" AS ENUM (
    'CONTEXT',
    'TOOL',
    'EVIDENCE',
    'REDACTION',
    'SUMMARY',
    'POLICY'
);


--
-- Name: AgentStepStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentStepStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'BLOCKED'
);


--
-- Name: AgentToolType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentToolType" AS ENUM (
    'READ_ONLY',
    'DRAFT',
    'ACTION',
    'PROHIBITED'
);


--
-- Name: AiActionProposalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AiActionProposalStatus" AS ENUM (
    'DRAFT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: BranchDailyCloseRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BranchDailyCloseRunStatus" AS ENUM (
    'IN_REVIEW',
    'BLOCKED'
);


--
-- Name: BranchDailyCloseSignOffStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BranchDailyCloseSignOffStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'SUPERSEDED'
);


--
-- Name: BusinessEventAnomalySeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessEventAnomalySeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: BusinessEventAnomalyStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessEventAnomalyStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED',
    'DISMISSED'
);


--
-- Name: BusinessEventAuditAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessEventAuditAction" AS ENUM (
    'RECORDED',
    'APPLIED',
    'STATUS_CHANGED',
    'IDEMPOTENT_REPLAY',
    'IDEMPOTENCY_CONFLICT',
    'OUTBOX_RETRY',
    'OUTBOX_DELIVERED',
    'OUTBOX_DEAD_LETTERED'
);


--
-- Name: BusinessEventSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessEventSource" AS ENUM (
    'INTERNAL',
    'API',
    'POS',
    'OFFLINE_POS',
    'PROVIDER_WEBHOOK',
    'IMPORT',
    'WORKER',
    'SYSTEM'
);


--
-- Name: BusinessEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessEventStatus" AS ENUM (
    'RECORDED',
    'APPLIED',
    'REJECTED',
    'COMPENSATED',
    'FAILED'
);


--
-- Name: BusinessOutboxChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessOutboxChannel" AS ENUM (
    'NOTIFICATION',
    'EMAIL',
    'WEBHOOK',
    'AUTHORITY_SUBMISSION',
    'RECEIPT_PRINT',
    'SYNC_ACK',
    'REPORT_EXPORT',
    'FISCALIZATION'
);


--
-- Name: BusinessOutboxStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessOutboxStatus" AS ENUM (
    'PENDING',
    'LOCKED',
    'SENT',
    'FAILED',
    'DEAD_LETTER',
    'CANCELLED',
    'DEFERRED'
);


--
-- Name: CashDrawerTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashDrawerTransactionType" AS ENUM (
    'OPENING_BALANCE',
    'SALE',
    'RETURN',
    'CASH_IN',
    'CASH_OUT',
    'CLOSING_BALANCE',
    'RECONCILIATION',
    'REFUND',
    'PAYOUT'
);


--
-- Name: CashShortagePolicyMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashShortagePolicyMode" AS ENUM (
    'OBSERVE'
);


--
-- Name: CashShortagePolicyStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashShortagePolicyStatus" AS ENUM (
    'DRAFT',
    'APPROVED'
);


--
-- Name: CashShortageRoundingMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashShortageRoundingMode" AS ENUM (
    'HALF_UP',
    'HALF_EVEN'
);


--
-- Name: ChartAccountNormalBalance; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChartAccountNormalBalance" AS ENUM (
    'DEBIT',
    'CREDIT'
);


--
-- Name: ChartAccountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChartAccountType" AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE',
    'CONTRA_ASSET',
    'CONTRA_REVENUE',
    'MEMO'
);


--
-- Name: CloseChecklistStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CloseChecklistStatus" AS ENUM (
    'PASSED',
    'FAILED',
    'WARNING',
    'NOT_APPLICABLE',
    'UNAVAILABLE'
);


--
-- Name: CloseEvidenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CloseEvidenceType" AS ENUM (
    'JOURNAL_ENTRY',
    'POSTING_BATCH',
    'SOURCE_LINK',
    'FISCAL_DOCUMENT',
    'PROVIDER_EVENT',
    'STATEMENT_LINE',
    'RECONCILIATION_CERTIFICATE',
    'SUSPENSE_ITEM',
    'PAYMENT_EXCEPTION',
    'AUDIT_LOG',
    'REPORT_EXPORT',
    'DATA_TRUST_CERTIFICATE'
);


--
-- Name: CloseFindingDomain; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CloseFindingDomain" AS ENUM (
    'LEDGER',
    'PAYMENT_RECONCILIATION',
    'SUSPENSE',
    'CASH_DRAWER',
    'INVENTORY_VALUATION',
    'AR',
    'AP',
    'TAX',
    'PAYROLL',
    'MASTER_DATA',
    'SECURITY_CONTROL',
    'DATA_TRUST',
    'AUDIT'
);


--
-- Name: CloseFindingSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CloseFindingSeverity" AS ENUM (
    'INFO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: CloseFindingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CloseFindingStatus" AS ENUM (
    'OPEN',
    'ASSIGNED',
    'IN_REVIEW',
    'RESOLVED',
    'WAIVED_WITH_APPROVAL',
    'REOPENED'
);


--
-- Name: CloseRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CloseRunStatus" AS ENUM (
    'DRAFT',
    'RUNNING',
    'READY',
    'BLOCKED',
    'CERTIFIED',
    'EXPORTED',
    'VOIDED'
);


--
-- Name: ComplianceAdapterConfigStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceAdapterConfigStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'DISABLED',
    'REQUIRES_CONFIGURATION',
    'REQUIRES_EXPERT_REVIEW'
);


--
-- Name: ComplianceAdapterEnvironment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceAdapterEnvironment" AS ENUM (
    'FAKE_SANDBOX',
    'SANDBOX',
    'PRODUCTION',
    'MANUAL_PORTAL'
);


--
-- Name: ComplianceAdapterReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceAdapterReviewStatus" AS ENUM (
    'REQUIRES_EXPERT_REVIEW',
    'EXPERT_APPROVED',
    'REGULATOR_CONFIRMED'
);


--
-- Name: ComplianceEvidenceSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceEvidenceSource" AS ENUM (
    'PLATFORM',
    'AUTHORITY',
    'MANUAL_PORTAL',
    'ADAPTER'
);


--
-- Name: ComplianceEvidenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceEvidenceType" AS ENUM (
    'CANONICAL_PAYLOAD',
    'SUBMITTED_PAYLOAD',
    'AUTHORITY_RESPONSE',
    'AUTHORITY_REFERENCE',
    'QR_CODE_PAYLOAD',
    'MANUAL_PORTAL_PROOF',
    'ERROR_REPORT',
    'REVERSAL_PROOF'
);


--
-- Name: ComplianceSubmissionOperation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceSubmissionOperation" AS ENUM (
    'CERTIFY',
    'POLL_STATUS',
    'MANUAL_FALLBACK',
    'REVERSE'
);


--
-- Name: ComplianceSubmissionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ComplianceSubmissionStatus" AS ENUM (
    'PENDING',
    'LEASED',
    'SUBMITTED',
    'RETRY_SCHEDULED',
    'CERTIFIED',
    'REJECTED',
    'FAILED',
    'DEAD_LETTER',
    'CANCELLED'
);


--
-- Name: CustomerLocationSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerLocationSource" AS ENUM (
    'HISTORICAL_SALE',
    'POS_CREATION',
    'MANUAL'
);


--
-- Name: CustomerReceivableDocumentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerReceivableDocumentStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'PARTIALLY_PAID',
    'PAID',
    'CANCELLED',
    'VOIDED'
);


--
-- Name: CustomerSettlementStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerSettlementStatus" AS ENUM (
    'POSTED',
    'REVERSED'
);


--
-- Name: CustomerStatementAccessAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementAccessAction" AS ENUM (
    'VIEW',
    'DISPUTE',
    'PROMISE_TO_PAY'
);


--
-- Name: CustomerStatementAccessOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementAccessOutcome" AS ENUM (
    'GRANTED',
    'DENIED'
);


--
-- Name: CustomerStatementAccessTokenStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementAccessTokenStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);


--
-- Name: CustomerStatementConsentBasis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementConsentBasis" AS ENUM (
    'EXPLICIT',
    'RECIPIENT_REQUESTED'
);


--
-- Name: CustomerStatementDeliveryChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementDeliveryChannel" AS ENUM (
    'EMAIL',
    'WHATSAPP'
);


--
-- Name: CustomerStatementDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementDeliveryStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'DEFERRED',
    'FAILED',
    'DEAD_LETTER',
    'CANCELLED'
);


--
-- Name: CustomerStatementRecipientActionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementRecipientActionStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: CustomerStatementRecipientActionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatementRecipientActionType" AS ENUM (
    'DISPUTE',
    'PROMISE_TO_PAY'
);


--
-- Name: DeliveryBillingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeliveryBillingStatus" AS ENUM (
    'POSTED',
    'CREDITED'
);


--
-- Name: DeliveryGoodsIssueKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeliveryGoodsIssueKind" AS ENUM (
    'ISSUE',
    'REVERSAL'
);


--
-- Name: DeliveryReservationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeliveryReservationStatus" AS ENUM (
    'ACTIVE',
    'CONSUMED',
    'RELEASED'
);


--
-- Name: ExceptionSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExceptionSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: FiscalDocumentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FiscalDocumentStatus" AS ENUM (
    'DRAFT',
    'QUEUED',
    'SUBMITTED',
    'CERTIFIED',
    'REJECTED',
    'REVERSED'
);


--
-- Name: FiscalDocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FiscalDocumentType" AS ENUM (
    'POS_RECEIPT',
    'SALES_INVOICE',
    'CREDIT_NOTE',
    'DEBIT_NOTE'
);


--
-- Name: FiscalSequenceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FiscalSequenceStatus" AS ENUM (
    'ACTIVE',
    'LOCKED',
    'RETIRED'
);


--
-- Name: FiscalYearStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FiscalYearStatus" AS ENUM (
    'OPEN',
    'CLOSED',
    'LOCKED'
);


--
-- Name: GoodsReceiptInspectionOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GoodsReceiptInspectionOutcome" AS ENUM (
    'PASSED',
    'FAILED',
    'INCOMPLETE'
);


--
-- Name: GoodsReceiptInspectionResolutionDecision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GoodsReceiptInspectionResolutionDecision" AS ENUM (
    'ACCEPT',
    'REJECT'
);


--
-- Name: GoodsReceiptStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GoodsReceiptStatus" AS ENUM (
    'DRAFT',
    'HELD',
    'RECEIVED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: HrisAttendanceAnomalyStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisAttendanceAnomalyStatus" AS ENUM (
    'OPEN',
    'RESOLVED',
    'DISMISSED'
);


--
-- Name: HrisEmploymentAssignmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisEmploymentAssignmentStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'ENDED'
);


--
-- Name: HrisEmploymentAssignmentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisEmploymentAssignmentType" AS ENUM (
    'PRIMARY',
    'SECONDARY'
);


--
-- Name: HrisManagerDelegationAuthority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisManagerDelegationAuthority" AS ENUM (
    'PEOPLE_READ',
    'APPROVAL_DECISION'
);


--
-- Name: HrisManagerDelegationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisManagerDelegationStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'SUPERSEDED'
);


--
-- Name: HrisOperationalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisOperationalStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'RETIRED'
);


--
-- Name: HrisOrgUnitStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisOrgUnitStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: HrisOrgUnitType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisOrgUnitType" AS ENUM (
    'COMPANY',
    'DIVISION',
    'DEPARTMENT',
    'TEAM',
    'BRANCH',
    'COST_CENTER'
);


--
-- Name: HrisPositionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisPositionStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: HrisReportingRelationshipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisReportingRelationshipStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'SUPERSEDED'
);


--
-- Name: HrisReportingRelationshipType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisReportingRelationshipType" AS ENUM (
    'DIRECT',
    'MATRIX',
    'SCOPED_APPROVER'
);


--
-- Name: HrisTimeEntryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisTimeEntryStatus" AS ENUM (
    'IMPORTED',
    'VALIDATED',
    'REJECTED'
);


--
-- Name: HrisTimeImportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisTimeImportStatus" AS ENUM (
    'RECEIVED',
    'VALIDATED',
    'REJECTED'
);


--
-- Name: HrisTimeRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisTimeRequestStatus" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: HrisTimeRequestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HrisTimeRequestType" AS ENUM (
    'LEAVE',
    'OVERTIME',
    'ATTENDANCE_CORRECTION'
);


--
-- Name: InventoryTransactionTimeProvenance; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InventoryTransactionTimeProvenance" AS ENUM (
    'EXPLICIT_SOURCE_TIME',
    'LEGACY_CREATED_AT_APPROXIMATION'
);


--
-- Name: InviteStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: JournalEntryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JournalEntryStatus" AS ENUM (
    'DRAFT',
    'POSTED',
    'REVERSED',
    'VOIDED'
);


--
-- Name: JournalType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JournalType" AS ENUM (
    'GENERAL',
    'SALES',
    'PURCHASE',
    'CASH',
    'BANK',
    'INVENTORY',
    'PAYROLL',
    'ADJUSTMENT',
    'OPENING',
    'CLOSING'
);


--
-- Name: LedgerEntryType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LedgerEntryType" AS ENUM (
    'SALE',
    'PURCHASE',
    'PAYMENT',
    'REFUND',
    'CREDIT_NOTE',
    'DEBIT_NOTE',
    'ADJUSTMENT',
    'OPENING_BALANCE',
    'WRITE_OFF',
    'PAYMENT_REVERSAL'
);


--
-- Name: LedgerPostingBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LedgerPostingBatchStatus" AS ENUM (
    'PENDING',
    'POSTED',
    'FAILED',
    'REVERSED'
);


--
-- Name: Locale; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Locale" AS ENUM (
    'EN',
    'FR'
);


--
-- Name: LocationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LocationType" AS ENUM (
    'WAREHOUSE',
    'STORE',
    'DISTRIBUTION_CENTER',
    'SUPPLIER',
    'CUSTOMER',
    'MANUFACTURING',
    'QUARANTINE',
    'DAMAGED',
    'TRANSIT',
    'VIRTUAL'
);


--
-- Name: MatchRule; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MatchRule" AS ENUM (
    'EXACT_PROVIDER_TRANSACTION_ID',
    'EXACT_PROVIDER_REFERENCE',
    'REFERENCE_AMOUNT_DATE',
    'STATEMENT_FINGERPRINT',
    'BATCH_DECOMPOSITION',
    'FEE_AWARE',
    'MANUAL'
);


--
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'CANDIDATE',
    'AUTO_MATCHED',
    'PROPOSED',
    'NEEDS_REVIEW',
    'APPROVED',
    'REJECTED',
    'CORRECTED',
    'VOIDED'
);


--
-- Name: MobileMoneyProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MobileMoneyProvider" AS ENUM (
    'MTN_MOMO',
    'ORANGE_MONEY',
    'EU_MOBILE',
    'YUP',
    'OTHER'
);


--
-- Name: OnboardingImportIssueSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingImportIssueSeverity" AS ENUM (
    'ERROR',
    'WARNING'
);


--
-- Name: OnboardingImportRiskLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingImportRiskLevel" AS ENUM (
    'STANDARD',
    'HIGH'
);


--
-- Name: OnboardingImportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingImportStatus" AS ENUM (
    'UPLOADED',
    'VALIDATED',
    'BLOCKED',
    'APPROVED',
    'COMMITTING',
    'COMMITTED'
);


--
-- Name: OnboardingImportTarget; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingImportTarget" AS ENUM (
    'CUSTOMER',
    'SUPPLIER',
    'ITEM'
);


--
-- Name: OnboardingReadinessState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingReadinessState" AS ENUM (
    'NOT_STARTED',
    'IMPORTED',
    'RECONCILED',
    'BLOCKED',
    'WAIVED'
);


--
-- Name: POSCartState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSCartState" AS ENUM (
    'ACTIVE',
    'PARKED',
    'RETIRED'
);


--
-- Name: POSCommitResultStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSCommitResultStatus" AS ENUM (
    'CLAIMED',
    'COMMITTED',
    'COMPLETED'
);


--
-- Name: POSOfflineDeviceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineDeviceStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'REVOKED',
    'ROTATING'
);


--
-- Name: POSOfflineEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineEventStatus" AS ENUM (
    'PENDING_REPLAY',
    'RECORDED',
    'DUPLICATE_REPLAY',
    'CONFLICT',
    'QUARANTINED',
    'REPLAYED',
    'BLOCKED',
    'REJECTED'
);


--
-- Name: POSOfflineEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineEventType" AS ENUM (
    'OFFLINE_SALE_CAPTURED',
    'OFFLINE_TENDER_CLAIMED',
    'OFFLINE_RECEIPT_PROVISIONED',
    'OFFLINE_DRAWER_EVIDENCE',
    'OFFLINE_SESSION_EVIDENCE'
);


--
-- Name: POSOfflineSyncBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineSyncBatchStatus" AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'ACCEPTED',
    'PARTIAL_CONFLICT',
    'REJECTED',
    'FAILED'
);


--
-- Name: POSOfflineSyncCertificateStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineSyncCertificateStatus" AS ENUM (
    'OPEN',
    'BLOCKED',
    'CERTIFIED',
    'EXPIRED'
);


--
-- Name: POSOfflineSyncConflictSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineSyncConflictSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: POSOfflineSyncConflictStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineSyncConflictStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED',
    'DISMISSED'
);


--
-- Name: POSOfflineSyncConflictType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSOfflineSyncConflictType" AS ENUM (
    'IDEMPOTENCY_PAYLOAD_MISMATCH',
    'SEQUENCE_GAP',
    'SEQUENCE_DUPLICATE_MISMATCH',
    'HASH_CHAIN_FORK',
    'DEVICE_REVOKED',
    'SIGNATURE_INVALID',
    'OFFLINE_POLICY_EXPIRED',
    'STALE_REFERENCE_SNAPSHOT',
    'PROVISIONAL_RECEIPT_PENDING',
    'UNPOSTED_ACCEPTED_EVENT',
    'UNRECONCILED_TENDER_CLAIM'
);


--
-- Name: POSSessionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POSSessionStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'CLOSED',
    'RECONCILED'
);


--
-- Name: PaymentDirection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentDirection" AS ENUM (
    'INBOUND',
    'OUTBOUND',
    'INTERNAL'
);


--
-- Name: PaymentExceptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentExceptionStatus" AS ENUM (
    'OPEN',
    'ASSIGNED',
    'ACKNOWLEDGED',
    'ESCALATED',
    'RESOLUTION_PROPOSED',
    'RESOLVED',
    'DISMISSED',
    'REOPENED'
);


--
-- Name: PaymentExceptionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentExceptionType" AS ENUM (
    'DUPLICATE_PROVIDER_REFERENCE',
    'TAMPER_SIGNAL',
    'AMOUNT_MISMATCH',
    'MISSING_PROVIDER_EVENT',
    'MISSING_STATEMENT_LINE',
    'MISSING_INTERNAL_PAYMENT',
    'FEE_DEVIATION',
    'LATE_SETTLEMENT',
    'STALE_PENDING_PAYMENT',
    'UNMAPPED_PROVIDER_ACCOUNT',
    'MANUAL_REVIEW_REQUIRED',
    'SIGNATURE_FAILURE',
    'REPLAY_SPIKE',
    'SUSPENSE_POSTING_BLOCKED',
    'OTHER'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'MOBILE_MONEY',
    'BANK_TRANSFER',
    'CREDIT',
    'STORE_CREDIT',
    'CHEQUE',
    'MIXED'
);


--
-- Name: PaymentRailType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentRailType" AS ENUM (
    'CASH',
    'CARD',
    'MOBILE_MONEY',
    'BANK_TRANSFER',
    'WALLET',
    'QR',
    'CHEQUE',
    'INTERNAL_TRANSFER',
    'OTHER'
);


--
-- Name: PaymentReconciliationInboxSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentReconciliationInboxSource" AS ENUM (
    'PROVIDER_EVENT',
    'STATEMENT_FILE',
    'RECONCILIATION_RUN',
    'SUSPENSE_POST',
    'CERTIFICATE_EXPORT'
);


--
-- Name: PaymentReconciliationInboxStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentReconciliationInboxStatus" AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'DEAD_LETTER',
    'IGNORED'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PARTIAL',
    'PAID',
    'REFUNDED',
    'CANCELLED'
);


--
-- Name: PaymentTransactionState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentTransactionState" AS ENUM (
    'PENDING',
    'PROCESSING',
    'CONFIRMED',
    'SETTLED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'DISPUTED',
    'SUSPENSE',
    'UNKNOWN'
);


--
-- Name: PayrollAttendanceSnapshotStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollAttendanceSnapshotStatus" AS ENUM (
    'DRAFT',
    'FROZEN',
    'CORRECTED',
    'SUPERSEDED'
);


--
-- Name: PayrollCnpsFamilyAllowanceSector; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollCnpsFamilyAllowanceSector" AS ENUM (
    'GENERAL',
    'AGRICULTURE',
    'PRIVATE_EDUCATION'
);


--
-- Name: PayrollCnpsOccupationalRiskGroup; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollCnpsOccupationalRiskGroup" AS ENUM (
    'A',
    'B',
    'C'
);


--
-- Name: PayrollContractStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollContractStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'ENDED',
    'CANCELLED'
);


--
-- Name: PayrollContractType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollContractType" AS ENUM (
    'CDI',
    'CDD',
    'INTERNSHIP',
    'DAILY',
    'CONSULTANT',
    'OTHER'
);


--
-- Name: PayrollDeclarationEvidenceTransition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollDeclarationEvidenceTransition" AS ENUM (
    'SUBMIT',
    'ACCEPT',
    'REJECT',
    'MARK_PAYMENT_DUE',
    'MARK_PAID',
    'RECONCILE',
    'ARCHIVE',
    'AMEND'
);


--
-- Name: PayrollDeclarationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollDeclarationStatus" AS ENUM (
    'PREPARED',
    'SUBMITTED',
    'ACCEPTED',
    'REJECTED',
    'PAYMENT_DUE',
    'PAID',
    'RECONCILED',
    'ARCHIVED'
);


--
-- Name: PayrollEmployeeBalanceCaseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollEmployeeBalanceCaseStatus" AS ENUM (
    'OPEN',
    'PARTIALLY_SETTLED',
    'SETTLED',
    'CANCELLED',
    'WRITTEN_OFF'
);


--
-- Name: PayrollEmployeeBalanceCaseType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollEmployeeBalanceCaseType" AS ENUM (
    'RECEIVABLE',
    'REFUND'
);


--
-- Name: PayrollEmployeeBalanceEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollEmployeeBalanceEventType" AS ENUM (
    'OPEN',
    'SETTLE_CASH',
    'SETTLE_BANK',
    'SETTLE_MOBILE_MONEY',
    'SETTLE_DEDUCTION',
    'REFUND_PAYMENT',
    'WRITE_OFF',
    'CANCEL'
);


--
-- Name: PayrollEmployeeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollEmployeeStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'ARCHIVED'
);


--
-- Name: PayrollFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollFrequency" AS ENUM (
    'MONTHLY',
    'BI_MONTHLY',
    'WEEKLY',
    'OFF_CYCLE'
);


--
-- Name: PayrollPaymentBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollPaymentBatchStatus" AS ENUM (
    'DRAFT',
    'APPROVED',
    'RELEASED',
    'PARTIALLY_SETTLED',
    'SETTLED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: PayrollPaymentDestinationChangeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollPaymentDestinationChangeStatus" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'APPLIED'
);


--
-- Name: PayrollPayslipLineCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollPayslipLineCategory" AS ENUM (
    'EARNING',
    'EMPLOYEE_DEDUCTION',
    'EMPLOYER_CHARGE',
    'INFORMATION'
);


--
-- Name: PayrollPayslipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollPayslipStatus" AS ENUM (
    'DRAFT',
    'EMITTED',
    'CORRECTED',
    'VOIDED'
);


--
-- Name: PayrollPeriodStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollPeriodStatus" AS ENUM (
    'OPEN',
    'INPUTS_LOCKED',
    'CALCULATED',
    'APPROVED',
    'PAID',
    'POSTED',
    'CLOSED'
);


--
-- Name: PayrollRubriqueAssignmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRubriqueAssignmentStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'ENDED'
);


--
-- Name: PayrollRubriqueKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRubriqueKind" AS ENUM (
    'EARNING',
    'DEDUCTION',
    'EMPLOYER_CHARGE',
    'INFORMATION'
);


--
-- Name: PayrollRubriqueStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRubriqueStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'RETIRED'
);


--
-- Name: PayrollRubriqueValueType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRubriqueValueType" AS ENUM (
    'FIXED_AMOUNT',
    'RATE_BPS',
    'QUANTITY_RATE',
    'FORMULA_REFERENCE'
);


--
-- Name: PayrollRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRunStatus" AS ENUM (
    'DRAFT',
    'CALCULATED',
    'REVIEWED',
    'APPROVED',
    'EMITTED',
    'PAID',
    'POSTED',
    'ARCHIVED',
    'CANCELLED'
);


--
-- Name: PayrollRunTransitionEvidenceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRunTransitionEvidenceStatus" AS ENUM (
    'VERIFIED',
    'LEGACY_PARTIAL_EVIDENCE'
);


--
-- Name: PayrollRunTransitionOrigin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRunTransitionOrigin" AS ENUM (
    'RUNTIME',
    'LEGACY_BACKFILL'
);


--
-- Name: PayrollRunType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollRunType" AS ENUM (
    'ORDINARY',
    'COMPLEMENTARY',
    'OFF_CYCLE',
    'BONUS',
    'CORRECTION'
);


--
-- Name: PayrollSalaryChangeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayrollSalaryChangeStatus" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'APPLIED'
);


--
-- Name: PostingRuleAmountSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PostingRuleAmountSource" AS ENUM (
    'FIXED',
    'SOURCE_AMOUNT',
    'NET_AMOUNT',
    'GROSS_AMOUNT',
    'TAX_AMOUNT',
    'COST_AMOUNT',
    'QUANTITY_COST',
    'VARIANCE_AMOUNT',
    'NET_PAYABLE_AMOUNT',
    'EMPLOYEE_DEDUCTION_AMOUNT',
    'EMPLOYER_CHARGE_AMOUNT'
);


--
-- Name: PostingRuleLineSide; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PostingRuleLineSide" AS ENUM (
    'DEBIT',
    'CREDIT'
);


--
-- Name: ProductionBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductionBatchStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'VOIDED'
);


--
-- Name: ProviderAccountStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProviderAccountStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'ARCHIVED',
    'UNMAPPED'
);


--
-- Name: ProviderEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProviderEventStatus" AS ENUM (
    'RECEIVED',
    'VERIFIED',
    'REJECTED',
    'PROCESSED',
    'FAILED',
    'TAMPERED',
    'REPLAYED',
    'ARCHIVED'
);


--
-- Name: PublicReceiptAccessTokenStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PublicReceiptAccessTokenStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);


--
-- Name: PurchaseCorrectionDirection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseCorrectionDirection" AS ENUM (
    'CORRECTION',
    'REVERSAL'
);


--
-- Name: PurchaseOrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseOrderStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: ReconciliationRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReconciliationRunStatus" AS ENUM (
    'DRAFT',
    'RUNNING',
    'NEEDS_REVIEW',
    'BLOCKED',
    'READY_FOR_SIGNOFF',
    'SIGNED',
    'FAILED',
    'VOIDED'
);


--
-- Name: ReferralAttributionEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReferralAttributionEventType" AS ENUM (
    'IMPRESSION',
    'CLICK',
    'CONVERSION'
);


--
-- Name: ReferralAttributionSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReferralAttributionSource" AS ENUM (
    'CUSTOMER_STATEMENT',
    'ACCOUNTANT_INVITE'
);


--
-- Name: RefundStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RefundStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'PROCESSED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: SalesOrderChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SalesOrderChannel" AS ENUM (
    'POS',
    'DELIVERY'
);


--
-- Name: SalesOrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SalesOrderStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURNED'
);


--
-- Name: SerialStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SerialStatus" AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'SOLD',
    'DAMAGED',
    'RETURNED',
    'EXPIRED'
);


--
-- Name: SettlementAccountApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SettlementAccountApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'RETIRED'
);


--
-- Name: StatementFileStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StatementFileStatus" AS ENUM (
    'IMPORTED',
    'PROCESSING',
    'PROCESSED',
    'REJECTED',
    'ARCHIVED'
);


--
-- Name: StatementLineDirection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StatementLineDirection" AS ENUM (
    'CREDIT',
    'DEBIT',
    'FEE',
    'REVERSAL',
    'UNKNOWN'
);


--
-- Name: StatementLineStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StatementLineStatus" AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'DISPUTED',
    'IGNORED',
    'CORRECTED',
    'ARCHIVED'
);


--
-- Name: StockAdjustmentCorrectionKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockAdjustmentCorrectionKind" AS ENUM (
    'REVERSAL'
);


--
-- Name: StockCountStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockCountStatus" AS ENUM (
    'DRAFT',
    'FROZEN',
    'SUBMITTED',
    'APPROVED',
    'POSTED',
    'CANCELLED'
);


--
-- Name: SupplierBankAccountStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierBankAccountStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'SUSPENDED',
    'ARCHIVED'
);


--
-- Name: SupplierBankChangeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierBankChangeStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: SupplierInvoiceMatchExceptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierInvoiceMatchExceptionStatus" AS ENUM (
    'OPEN',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'RESOLVED'
);


--
-- Name: SupplierInvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierInvoiceStatus" AS ENUM (
    'DRAFT',
    'MATCHED',
    'POSTED',
    'PAYMENT_PENDING',
    'PAID',
    'CANCELLED',
    'DISPUTED'
);


--
-- Name: SupplierPaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPaymentStatus" AS ENUM (
    'DRAFT',
    'APPROVED',
    'RELEASED',
    'POSTED',
    'CANCELLED',
    'FAILED'
);


--
-- Name: SupplierPoAccessAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPoAccessAction" AS ENUM (
    'VIEW',
    'RESPOND'
);


--
-- Name: SupplierPoAccessOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPoAccessOutcome" AS ENUM (
    'GRANTED',
    'DENIED'
);


--
-- Name: SupplierPoAccessTokenStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPoAccessTokenStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);


--
-- Name: SupplierPoProposalActorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPoProposalActorType" AS ENUM (
    'SUPPLIER',
    'BUYER'
);


--
-- Name: SupplierPoProposalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPoProposalStatus" AS ENUM (
    'SUBMITTED',
    'BUYER_ACCEPTED',
    'BUYER_REJECTED'
);


--
-- Name: SupplierPoProposalType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierPoProposalType" AS ENUM (
    'ACCEPT',
    'REJECT',
    'REQUEST_CHANGE'
);


--
-- Name: SuspenseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SuspenseStatus" AS ENUM (
    'OPEN',
    'ASSIGNED',
    'IN_REVIEW',
    'POSTED_TO_SUSPENSE',
    'RESOLUTION_PROPOSED',
    'RESOLVED',
    'WRITTEN_OFF',
    'REOPENED'
);


--
-- Name: SuspenseType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SuspenseType" AS ENUM (
    'UNKNOWN_CREDIT',
    'MISSING_CALLBACK',
    'MISSING_STATEMENT_LINE',
    'AMOUNT_MISMATCH',
    'DUPLICATE_PROVIDER_ID',
    'ORPHAN_REFUND',
    'FEE_DEVIATION',
    'SETTLEMENT_SHORTFALL',
    'SIGNATURE_FAILURE',
    'REPLAY_SPIKE',
    'FAILED_BUT_DEBITED',
    'SUCCEEDED_BUT_NOT_CREDITED',
    'CASH_DEPOSIT_DELAY',
    'OTHER'
);


--
-- Name: TaxType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaxType" AS ENUM (
    'SALES',
    'VAT',
    'GST',
    'EXCISE',
    'IMPORT',
    'EXPORT'
);


--
-- Name: TenantModuleConfigurationCommandState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantModuleConfigurationCommandState" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'FAILED',
    'REQUESTED'
);


--
-- Name: TenantModuleLifecycleState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantModuleLifecycleState" AS ENUM (
    'REQUESTED',
    'PREPARING',
    'ACTIVE',
    'FAILED',
    'RETAINED'
);


--
-- Name: TenantModuleLifecycleStepState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantModuleLifecycleStepState" AS ENUM (
    'PENDING',
    'RUNNING',
    'WAITING_INPUT',
    'SUCCEEDED',
    'FAILED'
);


--
-- Name: ThreeWayMatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ThreeWayMatchStatus" AS ENUM (
    'MATCHED',
    'EXCEPTION',
    'APPROVED_EXCEPTION',
    'REJECTED'
);


--
-- Name: TransactionReferenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionReferenceType" AS ENUM (
    'SALES_ORDER',
    'PURCHASE_ORDER',
    'STOCK_TRANSFER',
    'STOCK_ADJUSTMENT',
    'GOODS_RECEIPT',
    'PRODUCTION_BATCH',
    'RETURN',
    'MANUAL'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'PURCHASE_RECEIPT',
    'SALES_RETURN',
    'TRANSFER_IN',
    'ADJUSTMENT_IN',
    'PRODUCTION_IN',
    'INITIAL_STOCK',
    'SALE',
    'PURCHASE_RETURN',
    'TRANSFER_OUT',
    'ADJUSTMENT_OUT',
    'PRODUCTION_OUT',
    'DAMAGED',
    'EXPIRED',
    'THEFT',
    'WRITE_OFF',
    'SAMPLE',
    'PROMOTION',
    'RESERVATION',
    'RESERVATION_RELEASE',
    'PURCHASE_RETURN_REVERSAL'
);


--
-- Name: TransferStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransferStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'IN_TRANSIT',
    'PARTIALLY_RECEIVED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: UnitType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UnitType" AS ENUM (
    'QUANTITY',
    'WEIGHT',
    'VOLUME',
    'LENGTH',
    'AREA',
    'TIME'
);


--
-- Name: WorkflowAssuranceAlertChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceAlertChannel" AS ENUM (
    'IN_APP',
    'EMAIL',
    'WEBHOOK',
    'SMS',
    'TASK_QUEUE'
);


--
-- Name: WorkflowAssuranceAlertDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceAlertDeliveryStatus" AS ENUM (
    'PENDING',
    'DELIVERED',
    'SKIPPED',
    'FAILED',
    'SUPPRESSED',
    'PROCESSING',
    'DEAD_LETTER'
);


--
-- Name: WorkflowAssuranceExecutionMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceExecutionMode" AS ENUM (
    'SYNCHRONOUS_GUARD',
    'AFTER_COMMIT_VALIDATOR',
    'SCHEDULED_SCAN',
    'PRE_CLOSE_GATE',
    'SNAPSHOT_BI_GUARD'
);


--
-- Name: WorkflowAssuranceIncidentEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceIncidentEventType" AS ENUM (
    'CREATED',
    'DUPLICATE_DETECTED',
    'SEVERITY_CHANGED',
    'ACKNOWLEDGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'WAIVER_REQUESTED',
    'WAIVER_APPROVED',
    'WAIVER_REJECTED',
    'SUPPRESSED',
    'REOPENED',
    'CLOSED',
    'ALERT_RECORDED',
    'SOURCE_CHANGED'
);


--
-- Name: WorkflowAssuranceIncidentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceIncidentStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'WAIVED',
    'SUPPRESSED',
    'REOPENED',
    'CLOSED'
);


--
-- Name: WorkflowAssuranceResultStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceResultStatus" AS ENUM (
    'PASSED',
    'WARNING',
    'FAILED',
    'BLOCKED',
    'SKIPPED',
    'ERROR'
);


--
-- Name: WorkflowAssuranceRunStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceRunStatus" AS ENUM (
    'RUNNING',
    'COMPLETED',
    'COMPLETED_WITH_WARNINGS',
    'FAILED'
);


--
-- Name: WorkflowAssuranceRunType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceRunType" AS ENUM (
    'MANUAL',
    'SCHEDULED',
    'AFTER_COMMIT',
    'PRE_CLOSE',
    'SNAPSHOT_GUARD'
);


--
-- Name: WorkflowAssuranceSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'HIGH',
    'BLOCKING',
    'COMPLIANCE_CRITICAL'
);


--
-- Name: WorkflowAssuranceWaiverStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceWaiverStatus" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'REVOKED'
);


--
-- Name: WorkflowAssuranceWorkflow; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowAssuranceWorkflow" AS ENUM (
    'CASH_COMMAND',
    'RECEIVABLES',
    'PAYABLES',
    'INVENTORY',
    'SALES_MARGIN',
    'PAYMENT_RECONCILIATION',
    'LEDGER',
    'BUSINESS_EVENT',
    'PURCHASING_AP',
    'PAYROLL',
    'COMPLIANCE',
    'CLOSE_ASSURANCE',
    'POS',
    'OFFLINE_POS',
    'SNAPSHOT_BI',
    'CROSS_MODULE',
    'AGENT_RUNTIME'
);


--
-- Name: accountant_client_invite_append_only_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accountant_client_invite_append_only_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Accountant client invitation evidence is append-only';
END;
$$;


--
-- Name: compliance_assert_immutable_content(jsonb, jsonb, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_assert_immutable_content(old_row jsonb, new_row jsonb, immutable_label text, allowed_keys text[] DEFAULT ARRAY[]::text[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  normalized_old JSONB := old_row;
  normalized_new JSONB := new_row;
  allowed_key TEXT;
BEGIN
  FOREACH allowed_key IN ARRAY allowed_keys LOOP
    normalized_old := normalized_old - allowed_key;
    normalized_new := normalized_new - allowed_key;
  END LOOP;

  IF normalized_old IS DISTINCT FROM normalized_new THEN
    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: %', immutable_label
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END;
$$;


--
-- Name: compliance_evidence_prevent_certified_document_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_evidence_prevent_certified_document_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_parent_status := "compliance_fiscal_status_for_evidence_relation"(
      OLD."fiscalDocumentId",
      OLD."submissionId"
    );
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_parent_status := "compliance_fiscal_status_for_evidence_relation"(
      NEW."fiscalDocumentId",
      NEW."submissionId"
    );
  END IF;

  IF old_parent_status IN ('CERTIFIED', 'REVERSED')
    OR new_parent_status IN ('CERTIFIED', 'REVERSED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: evidence artifact %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add evidence artifacts to immutable fiscal evidence: fiscal document %', NEW."fiscalDocumentId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: evidence artifact %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: compliance_fiscal_document_lines_prevent_certified_parent_mutat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_fiscal_document_lines_prevent_certified_parent_mutat() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    SELECT "status"::TEXT INTO old_parent_status
    FROM "fiscal_documents"
    WHERE "id" = OLD."fiscalDocumentId";
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT "status"::TEXT INTO new_parent_status
    FROM "fiscal_documents"
    WHERE "id" = NEW."fiscalDocumentId";
  END IF;

  IF old_parent_status IN ('CERTIFIED', 'REVERSED')
    OR new_parent_status IN ('CERTIFIED', 'REVERSED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: fiscal document line %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add lines to immutable fiscal evidence: fiscal document %', NEW."fiscalDocumentId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: fiscal document line %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: compliance_fiscal_documents_prevent_certified_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_fiscal_documents_prevent_certified_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('CERTIFIED', 'REVERSED') THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: fiscal document %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT = 'CERTIFIED' THEN
    IF NEW."status"::TEXT NOT IN ('CERTIFIED', 'REVERSED') THEN
      RAISE EXCEPTION 'Cannot reopen immutable fiscal evidence: fiscal document %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF NEW."status"::TEXT = 'REVERSED' THEN
      IF NEW."reversedAt" IS NULL THEN
        RAISE EXCEPTION 'Cannot reverse immutable fiscal evidence without reversal timestamp: fiscal document %', OLD."id"
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;

      PERFORM "compliance_assert_immutable_content"(
        to_jsonb(OLD),
        to_jsonb(NEW),
        'fiscal document ' || OLD."id",
        ARRAY['updatedAt', 'status', 'reversedAt', 'reversedById', 'reversalReason']::TEXT[]
      );
    ELSE
      PERFORM "compliance_assert_immutable_content"(
        to_jsonb(OLD),
        to_jsonb(NEW),
        'fiscal document ' || OLD."id",
        ARRAY['updatedAt']::TEXT[]
      );
    END IF;
  ELSIF OLD."status"::TEXT = 'REVERSED' THEN
    PERFORM "compliance_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'reversed fiscal document ' || OLD."id",
      ARRAY['updatedAt']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: compliance_fiscal_status_for_evidence_relation(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_fiscal_status_for_evidence_relation(direct_fiscal_document_id text, direct_submission_id text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_status TEXT;
BEGIN
  IF direct_fiscal_document_id IS NOT NULL THEN
    SELECT "status"::TEXT INTO parent_status
    FROM "fiscal_documents"
    WHERE "id" = direct_fiscal_document_id;

    IF parent_status IS NOT NULL THEN
      RETURN parent_status;
    END IF;
  END IF;

  IF direct_submission_id IS NOT NULL THEN
    SELECT fiscal_document."status"::TEXT INTO parent_status
    FROM "compliance_submissions" compliance_submission
    JOIN "fiscal_documents" fiscal_document
      ON fiscal_document."id" = compliance_submission."fiscalDocumentId"
    WHERE compliance_submission."id" = direct_submission_id;
  END IF;

  RETURN parent_status;
END;
$$;


--
-- Name: compliance_submissions_prevent_certified_document_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_submissions_prevent_certified_document_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    SELECT "status"::TEXT INTO old_parent_status
    FROM "fiscal_documents"
    WHERE "id" = OLD."fiscalDocumentId";
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT "status"::TEXT INTO new_parent_status
    FROM "fiscal_documents"
    WHERE "id" = NEW."fiscalDocumentId";
  END IF;

  IF old_parent_status IN ('CERTIFIED', 'REVERSED')
    OR new_parent_status IN ('CERTIFIED', 'REVERSED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: compliance submission %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add submissions to immutable fiscal evidence: fiscal document %', NEW."fiscalDocumentId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: compliance submission %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: customer_statement_access_tokens_guard_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.customer_statement_access_tokens_guard_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Customer statement access tokens cannot be deleted';
  END IF;

  IF (
    NEW."organizationId",
    NEW."statementSnapshotId",
    NEW."tokenHash",
    NEW."jtiHash",
    NEW."statementContentHash",
    NEW."recipientHash",
    NEW."referralAttributionId",
    NEW."allowView",
    NEW."allowDispute",
    NEW."allowPromiseToPay",
    NEW."issuedById",
    NEW."issuedAt",
    NEW."expiresAt",
    NEW."metadata",
    NEW."createdAt"
  ) IS DISTINCT FROM (
    OLD."organizationId",
    OLD."statementSnapshotId",
    OLD."tokenHash",
    OLD."jtiHash",
    OLD."statementContentHash",
    OLD."recipientHash",
    OLD."referralAttributionId",
    OLD."allowView",
    OLD."allowDispute",
    OLD."allowPromiseToPay",
    OLD."issuedById",
    OLD."issuedAt",
    OLD."expiresAt",
    OLD."metadata",
    OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'Customer statement access token identity is immutable';
  END IF;

  IF OLD."status" <> 'ACTIVE' AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'Terminal customer statement access token status cannot change';
  END IF;
  IF NEW."accessCount" < OLD."accessCount" THEN
    RAISE EXCEPTION 'Customer statement access count cannot decrease';
  END IF;
  IF OLD."lastAccessedAt" IS NOT NULL
     AND NEW."lastAccessedAt" < OLD."lastAccessedAt" THEN
    RAISE EXCEPTION 'Customer statement last access time cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: customer_statement_append_only_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.customer_statement_append_only_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Customer statement recipient evidence is append-only';
END;
$$;


--
-- Name: customer_statement_delivery_referral_append_only_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.customer_statement_delivery_referral_append_only_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Customer statement delivery and referral evidence is append-only';
END;
$$;


--
-- Name: customer_statement_snapshots_prevent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.customer_statement_snapshots_prevent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Customer statement snapshots are immutable and append-only';
END;
$$;


--
-- Name: payment_reconciliation_assert_immutable_evidence(jsonb, jsonb, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_reconciliation_assert_immutable_evidence(old_row jsonb, new_row jsonb, immutable_label text, allowed_keys text[] DEFAULT ARRAY[]::text[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  normalized_old JSONB := old_row;
  normalized_new JSONB := new_row;
  allowed_key TEXT;
BEGIN
  FOREACH allowed_key IN ARRAY allowed_keys LOOP
    normalized_old := normalized_old - allowed_key;
    normalized_new := normalized_new - allowed_key;
  END LOOP;

  IF normalized_old IS DISTINCT FROM normalized_new THEN
    RAISE EXCEPTION 'Cannot modify immutable payment reconciliation evidence: %', immutable_label
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END;
$$;


--
-- Name: payment_reconciliation_provider_events_prevent_evidence_mutatio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_reconciliation_provider_events_prevent_evidence_mutatio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payment reconciliation evidence: provider event %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payment_reconciliation_assert_immutable_evidence"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'provider event ' || OLD."id",
    ARRAY['updatedAt', 'status', 'processedAt', 'correlationId', 'traceId', 'archivedAt', 'legalHoldAt']::TEXT[]
  );

  RETURN NEW;
END;
$$;


--
-- Name: payment_reconciliation_statement_files_prevent_evidence_mutatio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_reconciliation_statement_files_prevent_evidence_mutatio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payment reconciliation evidence: statement file %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF OLD."encryptedObjectKey" IS NOT NULL
    AND NEW."encryptedObjectKey" IS DISTINCT FROM OLD."encryptedObjectKey" THEN
    RAISE EXCEPTION 'Cannot replace immutable payment reconciliation evidence storage key: statement file %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payment_reconciliation_assert_immutable_evidence"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'statement file ' || OLD."id",
    ARRAY['updatedAt', 'status', 'encryptedObjectKey', 'archivedAt', 'legalHoldAt']::TEXT[]
  );

  RETURN NEW;
END;
$$;


--
-- Name: payment_reconciliation_statement_lines_prevent_evidence_mutatio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_reconciliation_statement_lines_prevent_evidence_mutatio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payment reconciliation evidence: statement line %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payment_reconciliation_assert_immutable_evidence"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'statement line ' || OLD."id",
    ARRAY['updatedAt', 'status', 'archivedAt', 'legalHoldAt']::TEXT[]
  );

  RETURN NEW;
END;
$$;


--
-- Name: payment_transactions_enforce_authority_event_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payment_transactions_enforce_authority_event_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD."providerAuthorityEventId" IS NOT NULL
    AND OLD."providerAuthorityEventId" IS DISTINCT FROM NEW."providerAuthorityEventId" THEN
    RAISE EXCEPTION 'Payment transaction provider authority event is immutable once linked';
  END IF;

  IF NEW."providerAuthorityEventId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "provider_events" provider_event
    WHERE provider_event."id" = NEW."providerAuthorityEventId"
      AND provider_event."organizationId" = NEW."organizationId"
      AND provider_event."providerAccountId" = NEW."providerAccountId"
      AND provider_event."providerTransactionId" = NEW."providerTransactionId"
  ) THEN
    RAISE EXCEPTION 'Payment transaction authority event does not match its tenant, provider account, and provider transaction';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_assert_immutable_content(jsonb, jsonb, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_assert_immutable_content(old_row jsonb, new_row jsonb, immutable_label text, allowed_keys text[] DEFAULT ARRAY[]::text[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  normalized_old JSONB := old_row;
  normalized_new JSONB := new_row;
  allowed_key TEXT;
BEGIN
  FOREACH allowed_key IN ARRAY allowed_keys LOOP
    normalized_old := normalized_old - allowed_key;
    normalized_new := normalized_new - allowed_key;
  END LOOP;

  IF normalized_old IS DISTINCT FROM normalized_new THEN
    RAISE EXCEPTION 'Cannot modify immutable payroll evidence: %', immutable_label
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END;
$$;


--
-- Name: payroll_declaration_evidence_prevent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_declaration_evidence_prevent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: declaration evidence %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable payroll evidence: declaration evidence %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;


--
-- Name: payroll_declarations_prevent_payload_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_declarations_prevent_payload_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: declaration %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payroll_assert_immutable_content"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'declaration ' || OLD."id",
    ARRAY['updatedAt', 'metadata', 'status', 'dueDate']::TEXT[]
  );

  RETURN NEW;
END;
$$;


--
-- Name: payroll_employee_balance_events_prevent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_employee_balance_events_prevent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: employee balance event %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable payroll evidence: employee balance event %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;


--
-- Name: payroll_payment_allocations_prevent_released_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_payment_allocations_prevent_released_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_status TEXT;
  target_payment_batch_id TEXT;
BEGIN
  target_payment_batch_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."payrollPaymentBatchId"
    ELSE OLD."payrollPaymentBatchId"
  END;

  SELECT "status"::TEXT INTO parent_status
  FROM "payroll_payment_batches"
  WHERE "id" = target_payment_batch_id;

  IF parent_status IN ('RELEASED', 'PARTIALLY_SETTLED', 'SETTLED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payment allocation %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add allocations to immutable payroll payment batch %', NEW."payrollPaymentBatchId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payment allocation ' || OLD."id",
      ARRAY[]::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_payment_batches_prevent_released_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_payment_batches_prevent_released_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('RELEASED', 'PARTIALLY_SETTLED', 'SETTLED') THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payment batch %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT IN ('RELEASED', 'PARTIALLY_SETTLED', 'SETTLED') THEN
    IF OLD."status"::TEXT IS DISTINCT FROM NEW."status"::TEXT THEN
      IF NOT (
        (OLD."status"::TEXT = 'RELEASED' AND NEW."status"::TEXT IN ('PARTIALLY_SETTLED', 'SETTLED')) OR
        (OLD."status"::TEXT = 'PARTIALLY_SETTLED' AND NEW."status"::TEXT IN ('PARTIALLY_SETTLED', 'SETTLED')) OR
        (OLD."status"::TEXT = 'SETTLED' AND NEW."status"::TEXT = 'SETTLED')
      ) THEN
        RAISE EXCEPTION 'Cannot change immutable payroll payment lifecycle status from % to % for payment batch %', OLD."status", NEW."status", OLD."id"
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payment batch ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'notes', 'status', 'reconciliationStatus', 'paymentExceptionId']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_payslip_lines_prevent_emitted_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_payslip_lines_prevent_emitted_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_status TEXT;
  target_payslip_id TEXT;
BEGIN
  target_payslip_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."payslipId"
    ELSE OLD."payslipId"
  END;

  SELECT "status"::TEXT INTO parent_status
  FROM "payroll_payslips"
  WHERE "id" = target_payslip_id;

  IF parent_status IN ('EMITTED', 'CORRECTED', 'VOIDED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payslip line %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add payslip lines to immutable payslip %', NEW."payslipId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payslip line ' || OLD."id",
      ARRAY[]::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_payslips_prevent_emitted_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_payslips_prevent_emitted_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('EMITTED', 'CORRECTED', 'VOIDED') THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payslip %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT IN ('EMITTED', 'CORRECTED', 'VOIDED') THEN
    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payslip ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'status', 'voidedAt', 'archiveUri']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_run_lines_prevent_posted_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_lines_prevent_posted_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_status TEXT;
  target_payroll_run_id TEXT;
BEGIN
  target_payroll_run_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."payrollRunId"
    ELSE OLD."payrollRunId"
  END;

  SELECT "status"::TEXT INTO parent_status
  FROM "payroll_runs"
  WHERE "id" = target_payroll_run_id;

  IF parent_status IN ('POSTED', 'ARCHIVED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payroll run line %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add payroll run lines to immutable payroll run %', NEW."payrollRunId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payroll run line ' || OLD."id",
      ARRAY['updatedAt', 'metadata']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_run_transition_prevent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_transition_prevent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Payroll run transition evidence is immutable and append-only'
    USING ERRCODE = '23514';
END;
$$;


--
-- Name: payroll_run_transition_validate_runtime(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_run_transition_validate_runtime() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  source_run RECORD;
  expected_sequence INTEGER;
  expected_event_type TEXT;
  actual_event_type TEXT;
BEGIN
  IF NEW."origin" <> 'RUNTIME' THEN
    RETURN NEW;
  END IF;

  SELECT
    run."status",
    run."version",
    run."preparedById",
    run."reviewedById",
    run."approvedById"
  INTO source_run
  FROM "payroll_runs" run
  WHERE run."organizationId" = NEW."organizationId"
    AND run."id" = NEW."payrollRunId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll transition tenant/run scope mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF source_run."status" IS DISTINCT FROM NEW."fromStatus"
    OR source_run."version" IS DISTINCT FROM NEW."fromVersion"
  THEN
    RAISE EXCEPTION 'Payroll transition source status/version conflict'
      USING ERRCODE = '40001';
  END IF;

  SELECT COALESCE(MAX(existing."sequence"), 0) + 1
  INTO expected_sequence
  FROM "payroll_run_transitions" existing
  WHERE existing."organizationId" = NEW."organizationId"
    AND existing."payrollRunId" = NEW."payrollRunId";

  IF NEW."sequence" <> expected_sequence THEN
    RAISE EXCEPTION 'Payroll transition sequence conflict'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'REVIEWED'
    AND (
      source_run."preparedById" IS NULL
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."preparedById"
    )
  THEN
    RAISE EXCEPTION 'Payroll review violates separation of duties'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'APPROVED'
    AND (
      source_run."preparedById" IS NULL
      OR source_run."reviewedById" IS NULL
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."preparedById"
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."reviewedById"
    )
  THEN
    RAISE EXCEPTION 'Payroll approval violates separation of duties'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'EMITTED'
    AND source_run."approvedById" IS NULL
  THEN
    RAISE EXCEPTION 'Payroll emission requires persisted approval evidence'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'POSTED'
    AND (
      source_run."preparedById" IS NULL
      OR source_run."approvedById" IS NULL
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."preparedById"
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."approvedById"
    )
  THEN
    RAISE EXCEPTION 'Payroll posting violates separation of duties'
      USING ERRCODE = '23514';
  END IF;

  expected_event_type := CASE NEW."toStatus"
    WHEN 'REVIEWED' THEN 'PAYROLL_RUN_REVIEWED'
    WHEN 'APPROVED' THEN 'PAYROLL_RUN_APPROVED'
    WHEN 'EMITTED' THEN 'PAYSLIP_EMITTED'
    WHEN 'POSTED' THEN 'PAYROLL_POSTED'
    ELSE NULL
  END;

  SELECT event."eventType"
  INTO actual_event_type
  FROM "business_events" event
  WHERE event."organizationId" = NEW."organizationId"
    AND event."id" = NEW."businessEventId";

  IF actual_event_type IS DISTINCT FROM expected_event_type THEN
    RAISE EXCEPTION 'Payroll transition canonical event mismatch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payroll_runs_prevent_finalized_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_runs_prevent_finalized_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('POSTED', 'ARCHIVED') THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payroll run %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT IN ('POSTED', 'ARCHIVED') THEN
    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payroll run ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'status', 'archivedAt']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: pos_commit_results_enforce_lifecycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pos_commit_results_enforce_lifecycle() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'POS commit result evidence is immutable and cannot be deleted';
  END IF;

  IF OLD."id" IS DISTINCT FROM NEW."id"
    OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR OLD."locationId" IS DISTINCT FROM NEW."locationId"
    OR OLD."terminalId" IS DISTINCT FROM NEW."terminalId"
    OR OLD."sessionId" IS DISTINCT FROM NEW."sessionId"
    OR OLD."salesOrderId" IS DISTINCT FROM NEW."salesOrderId"
    OR OLD."actorId" IS DISTINCT FROM NEW."actorId"
    OR OLD."clientCommitId" IS DISTINCT FROM NEW."clientCommitId"
    OR OLD."requestHash" IS DISTINCT FROM NEW."requestHash"
    OR OLD."requestSchemaVersion" IS DISTINCT FROM NEW."requestSchemaVersion"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt" THEN
    RAISE EXCEPTION 'POS commit result identity and request evidence are immutable';
  END IF;

  IF OLD."status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed POS commit result evidence is immutable';
  END IF;

  IF OLD."status" = 'CLAIMED' AND NEW."status" <> 'COMMITTED' THEN
    RAISE EXCEPTION 'Invalid POS commit result transition from CLAIMED to %', NEW."status";
  END IF;

  IF OLD."status" = 'COMMITTED' AND NEW."status" <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Invalid POS commit result transition from COMMITTED to %', NEW."status";
  END IF;

  IF OLD."status" = 'COMMITTED'
    AND NEW."committedAt" IS DISTINCT FROM OLD."committedAt" THEN
    RAISE EXCEPTION 'POS commit result committed timestamp is immutable';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: pos_commit_results_enforce_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pos_commit_results_enforce_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "locations" location
    WHERE location."id" = NEW."locationId"
      AND location."organizationId" = NEW."organizationId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "pos_terminals" terminal
    WHERE terminal."id" = NEW."terminalId"
      AND terminal."organizationId" = NEW."organizationId"
      AND terminal."locationId" = NEW."locationId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "pos_sessions" pos_session
    WHERE pos_session."id" = NEW."sessionId"
      AND pos_session."organizationId" = NEW."organizationId"
      AND pos_session."locationId" = NEW."locationId"
      AND pos_session."terminalId" = NEW."terminalId"
      AND pos_session."userId" = NEW."actorId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "sales_orders" sale
    WHERE sale."id" = NEW."salesOrderId"
      AND sale."organizationId" = NEW."organizationId"
      AND sale."locationId" = NEW."locationId"
      AND sale."terminalId" = NEW."terminalId"
      AND sale."sessionId" = NEW."sessionId"
      AND sale."createdById" = NEW."actorId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "users" actor
    WHERE actor."id" = NEW."actorId"
      AND actor."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'POS commit result scope does not match its tenant-owned source records';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: prevent_approved_cash_shortage_policy_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_approved_cash_shortage_policy_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD."status" = 'APPROVED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'approved cash-shortage policies are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purchasing_correction_evidence_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_correction_evidence_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Purchase return and supplier credit evidence is immutable and append-only' USING ERRCODE = '23514';
END;
$$;


--
-- Name: purchasing_match_exception_lifecycle_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_match_exception_lifecycle_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Supplier invoice match exception evidence is immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
     OR NEW."supplierInvoiceId" IS DISTINCT FROM OLD."supplierInvoiceId"
     OR NEW."threeWayMatchId" IS DISTINCT FROM OLD."threeWayMatchId"
     OR NEW."policyVersion" IS DISTINCT FROM OLD."policyVersion"
     OR NEW."reason" IS DISTINCT FROM OLD."reason"
     OR NEW."evidenceReference" IS DISTINCT FROM OLD."evidenceReference"
     OR NEW."varianceAmount" IS DISTINCT FROM OLD."varianceAmount"
     OR NEW."priceVariance" IS DISTINCT FROM OLD."priceVariance"
     OR NEW."requestedById" IS DISTINCT FROM OLD."requestedById"
     OR NEW."requestedAt" IS DISTINCT FROM OLD."requestedAt"
     OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
     OR NEW."metadata" IS DISTINCT FROM OLD."metadata"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'Supplier invoice match exception request evidence is immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD."status" = 'OPEN' AND NEW."status" = 'APPROVED' THEN
    IF NEW."approvedById" IS NULL
       OR NEW."approvedById" = OLD."requestedById"
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS NULL
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Match exception approval requires an independent approver' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'OPEN' AND NEW."status" = 'REJECTED' THEN
    IF NEW."rejectedById" IS NULL
       OR NEW."rejectedById" = OLD."requestedById"
       OR NEW."approvedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS NULL
       OR NEW."decisionReason" IS NULL
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Match exception rejection requires an independent reviewer' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'OPEN' AND NEW."status" = 'EXPIRED' THEN
    IF NEW."approvedById" IS NOT NULL
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS NOT NULL
       OR NEW."decisionReason" IS NOT NULL
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Open match exception expiry cannot add a decision' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'APPROVED' AND NEW."status" = 'EXPIRED' THEN
    IF NEW."approvedById" IS DISTINCT FROM OLD."approvedById"
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS DISTINCT FROM OLD."decidedAt"
       OR NEW."decisionReason" IS DISTINCT FROM OLD."decisionReason"
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Approved match exception expiry must preserve approval evidence' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'APPROVED' AND NEW."status" = 'RESOLVED' THEN
    IF NEW."approvedById" IS DISTINCT FROM OLD."approvedById"
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NULL
       OR NEW."decidedAt" IS DISTINCT FROM OLD."decidedAt"
       OR NEW."resolvedAt" IS NULL
       OR NEW."decisionReason" IS DISTINCT FROM OLD."decisionReason" THEN
      RAISE EXCEPTION 'Resolved match exception must preserve approval and add posting resolution evidence' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid supplier invoice match exception lifecycle transition' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: purchasing_validate_credit_header(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_validate_credit_header() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE source_return RECORD; source_invoice RECORD; original_credit RECORD;
BEGIN
  SELECT * INTO source_return FROM "purchase_returns"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."purchaseReturnId";
  SELECT * INTO source_invoice FROM "supplier_invoices"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."supplierInvoiceId";
  IF source_return IS NULL OR source_invoice IS NULL
     OR source_return."purchaseOrderId" <> NEW."purchaseOrderId"
     OR source_return."goodsReceiptId" <> NEW."goodsReceiptId"
     OR source_return."supplierId" <> NEW."supplierId"
     OR source_invoice."purchaseOrderId" <> NEW."purchaseOrderId"
     OR source_invoice."supplierId" <> NEW."supplierId"
     OR source_invoice."postedAt" IS NULL THEN
    RAISE EXCEPTION 'Supplier credit source return / invoice chain is unsupported or cross-tenant' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'CORRECTION' AND (source_return."direction" <> 'CORRECTION' OR NEW."reversalOfSupplierCreditNoteId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Supplier credit correction must reference an original purchase return' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'CORRECTION' AND EXISTS (
    SELECT 1 FROM "purchase_returns" reversal
     WHERE reversal."organizationId" = NEW."organizationId"
       AND reversal."reversalOfPurchaseReturnId" = source_return."id"
  ) THEN
    RAISE EXCEPTION 'Supplier credit cannot be posted for a reversed purchase return' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'REVERSAL' THEN
    SELECT * INTO original_credit FROM "supplier_credit_notes"
      WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."reversalOfSupplierCreditNoteId";
    IF original_credit IS NULL OR original_credit."direction" <> 'CORRECTION'
       OR original_credit."purchaseReturnId" <> NEW."purchaseReturnId"
       OR original_credit."supplierInvoiceId" <> NEW."supplierInvoiceId" THEN
      RAISE EXCEPTION 'Supplier credit reversal must reference its tenant-scoped original credit' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purchasing_validate_credit_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_validate_credit_line() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE credit_header RECORD; return_line RECORD; invoice_line RECORD; net_credited DECIMAL(12,3);
BEGIN
  SELECT * INTO credit_header FROM "supplier_credit_notes"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."supplierCreditNoteId";
  SELECT * INTO return_line FROM "purchase_return_lines"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."sourcePurchaseReturnLineId";
  SELECT sil.* INTO invoice_line FROM "supplier_invoice_lines" sil
    JOIN "supplier_invoices" si ON si."id" = sil."supplierInvoiceId"
   WHERE si."organizationId" = NEW."organizationId"
     AND sil."id" = NEW."sourceSupplierInvoiceLineId"
     AND sil."supplierInvoiceId" = credit_header."supplierInvoiceId";
  IF credit_header IS NULL OR return_line IS NULL OR invoice_line IS NULL
     OR return_line."purchaseReturnId" <> credit_header."purchaseReturnId"
     OR return_line."sourceGoodsReceiptLineId" <> NEW."sourceGoodsReceiptLineId"
     OR invoice_line."goodsReceiptLineId" <> NEW."sourceGoodsReceiptLineId"
     OR invoice_line."itemId" <> NEW."itemId" OR return_line."itemId" <> NEW."itemId"
     OR return_line."invoicedQuantity" <> NEW."quantity" THEN
    RAISE EXCEPTION 'Supplier credit line must match its return, receipt and posted invoice evidence' USING ERRCODE = '23514';
  END IF;
  IF credit_header."direction" = 'CORRECTION' THEN
    SELECT COALESCE(SUM(CASE credit."direction" WHEN 'CORRECTION' THEN line."quantity" ELSE -line."quantity" END), 0)
      INTO net_credited FROM "supplier_credit_note_lines" line
      JOIN "supplier_credit_notes" credit ON credit."id" = line."supplierCreditNoteId"
     WHERE credit."organizationId" = NEW."organizationId"
       AND line."sourceSupplierInvoiceLineId" = NEW."sourceSupplierInvoiceLineId";
    IF net_credited + NEW."quantity" > invoice_line."quantity" THEN
      RAISE EXCEPTION 'Supplier credit quantity exceeds or duplicates source supplier invoice quantity' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF credit_header."direction" = 'REVERSAL' AND NOT EXISTS (
    SELECT 1 FROM "supplier_credit_note_lines" original
     WHERE original."supplierCreditNoteId" = credit_header."reversalOfSupplierCreditNoteId"
       AND original."sourcePurchaseReturnLineId" = NEW."sourcePurchaseReturnLineId"
       AND original."sourceSupplierInvoiceLineId" = NEW."sourceSupplierInvoiceLineId"
       AND original."quantity" = NEW."quantity" AND original."unitCost" = NEW."unitCost"
       AND original."taxAmount" = NEW."taxAmount" AND original."lineTotal" = NEW."lineTotal"
  ) THEN
    RAISE EXCEPTION 'Supplier credit reversal line must exactly mirror original evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purchasing_validate_match_exception_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_validate_match_exception_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  match_invoice_id TEXT;
  match_status "ThreeWayMatchStatus";
BEGIN
  SELECT "supplierInvoiceId", "status"
    INTO match_invoice_id, match_status
    FROM "three_way_matches"
   WHERE "organizationId" = NEW."organizationId"
     AND "id" = NEW."threeWayMatchId";

  IF match_invoice_id IS NULL
     OR match_invoice_id <> NEW."supplierInvoiceId"
     OR match_status <> 'EXCEPTION' THEN
    RAISE EXCEPTION 'Match exception source must be a tenant-scoped unresolved invoice match' USING ERRCODE = '23514';
  END IF;

  IF NEW."status" <> 'OPEN'
     OR NEW."expiresAt" <= NEW."requestedAt"
     OR NEW."approvedById" IS NOT NULL
     OR NEW."rejectedById" IS NOT NULL
     OR NEW."resolvedById" IS NOT NULL
     OR NEW."decidedAt" IS NOT NULL
     OR NEW."resolvedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Match exception must begin as an undecided OPEN request with future expiry' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: purchasing_validate_return_header(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_validate_return_header() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE source_receipt RECORD; source_order RECORD; original_return RECORD;
BEGIN
  SELECT "purchaseOrderId", "status", "inventoryPostedAt" INTO source_receipt
    FROM "goods_receipts" WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."goodsReceiptId";
  SELECT "supplierId" INTO source_order
    FROM "purchase_orders" WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."purchaseOrderId";
  IF source_receipt IS NULL OR source_order IS NULL
     OR source_receipt."purchaseOrderId" <> NEW."purchaseOrderId"
     OR source_order."supplierId" <> NEW."supplierId"
     OR source_receipt."inventoryPostedAt" IS NULL
     OR source_receipt."status" NOT IN ('RECEIVED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Purchase return source purchase order / goods receipt chain is unsupported or cross-tenant' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'CORRECTION' AND NEW."reversalOfPurchaseReturnId" IS NOT NULL THEN
    RAISE EXCEPTION 'Purchase return correction cannot reference a reversal source' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'REVERSAL' THEN
    SELECT * INTO original_return FROM "purchase_returns"
      WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."reversalOfPurchaseReturnId";
    IF original_return IS NULL OR original_return."direction" <> 'CORRECTION'
       OR original_return."purchaseOrderId" <> NEW."purchaseOrderId"
       OR original_return."goodsReceiptId" <> NEW."goodsReceiptId"
       OR original_return."supplierId" <> NEW."supplierId" THEN
      RAISE EXCEPTION 'Purchase return reversal must reference its tenant-scoped original correction' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "supplier_credit_notes" credit
       WHERE credit."organizationId" = NEW."organizationId"
         AND credit."purchaseReturnId" = original_return."id"
         AND credit."direction" = 'CORRECTION'
         AND NOT EXISTS (
           SELECT 1 FROM "supplier_credit_notes" reversal
            WHERE reversal."organizationId" = NEW."organizationId"
              AND reversal."reversalOfSupplierCreditNoteId" = credit."id"
         )
    ) THEN
      RAISE EXCEPTION 'Active supplier credit must be reversed before its purchase return' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purchasing_validate_return_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchasing_validate_return_line() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE return_header RECORD; receipt_line RECORD; movement RECORD; net_returned DECIMAL(12,3);
BEGIN
  SELECT * INTO return_header FROM "purchase_returns"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."purchaseReturnId";
  SELECT grl.* INTO receipt_line FROM "goods_receipt_lines" grl
    JOIN "goods_receipts" gr ON gr."id" = grl."goodsReceiptId"
   WHERE gr."organizationId" = NEW."organizationId"
     AND grl."id" = NEW."sourceGoodsReceiptLineId"
     AND grl."goodsReceiptId" = return_header."goodsReceiptId";
  SELECT * INTO movement FROM "inventory_transactions"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."inventoryTransactionId";
  IF return_header IS NULL OR receipt_line IS NULL
     OR receipt_line."purchaseOrderLineId" <> NEW."sourcePurchaseOrderLineId"
     OR receipt_line."itemId" <> NEW."itemId"
     OR movement IS NULL OR movement."referenceType" <> 'RETURN'
     OR movement."referenceId" <> NEW."purchaseReturnId"
     OR ABS(movement."quantity") <> NEW."quantity"
     OR (return_header."direction" = 'CORRECTION' AND (movement."type" <> 'PURCHASE_RETURN' OR movement."quantity" >= 0))
     OR (return_header."direction" = 'REVERSAL' AND (movement."type" <> 'PURCHASE_RETURN_REVERSAL' OR movement."quantity" <= 0)) THEN
    RAISE EXCEPTION 'Purchase return line is not backed by its tenant-scoped receipt and inventory movement' USING ERRCODE = '23514';
  END IF;
  IF return_header."direction" = 'CORRECTION' THEN
    SELECT COALESCE(SUM(CASE pr."direction" WHEN 'CORRECTION' THEN prl."quantity" ELSE -prl."quantity" END), 0)
      INTO net_returned FROM "purchase_return_lines" prl
      JOIN "purchase_returns" pr ON pr."id" = prl."purchaseReturnId"
     WHERE pr."organizationId" = NEW."organizationId"
       AND prl."sourceGoodsReceiptLineId" = NEW."sourceGoodsReceiptLineId";
    IF net_returned + NEW."quantity" > receipt_line."receivedQuantity" THEN
      RAISE EXCEPTION 'Purchase return quantity exceeds source goods receipt quantity' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM "purchase_return_lines" original
       WHERE original."purchaseReturnId" = return_header."reversalOfPurchaseReturnId"
         AND original."sourceGoodsReceiptLineId" = NEW."sourceGoodsReceiptLineId"
         AND original."quantity" = NEW."quantity"
         AND original."invoicedQuantity" = NEW."invoicedQuantity"
         AND original."uninvoicedQuantity" = NEW."uninvoicedQuantity"
         AND original."unitCost" = NEW."unitCost"
         AND movement."reversalOfTransactionId" = original."inventoryTransactionId"
    ) THEN
      RAISE EXCEPTION 'Purchase return reversal line must exactly mirror original stock evidence' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: receivable_prevent_allocation_relink(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.receivable_prevent_allocation_relink() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD."customerReceivableDocumentId" IS NOT NULL
    AND NEW."customerReceivableDocumentId" IS DISTINCT FROM OLD."customerReceivableDocumentId" THEN
    RAISE EXCEPTION 'Cannot relink customer settlement allocation % from immutable receivable document', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: receivable_prevent_document_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.receivable_prevent_document_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable customer receivable document %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable customer receivable document %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;


--
-- Name: receivable_prevent_state_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.receivable_prevent_state_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable customer receivable state %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable customer receivable state %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;


--
-- Name: reject_tenant_module_command_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_tenant_module_command_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Tenant module configuration command evidence is append-only';
END;
$$;


--
-- Name: supplier_po_access_tokens_guard_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.supplier_po_access_tokens_guard_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Supplier PO access tokens cannot be deleted';
  END IF;

  IF (
    NEW."organizationId",
    NEW."envelopeId",
    NEW."tokenHash",
    NEW."jtiHash",
    NEW."envelopeContentHash",
    NEW."recipientHash",
    NEW."allowView",
    NEW."allowRespond",
    NEW."idempotencyKey",
    NEW."correlationId",
    NEW."businessEventId",
    NEW."issuedById",
    NEW."issuedAt",
    NEW."expiresAt",
    NEW."metadata",
    NEW."createdAt"
  ) IS DISTINCT FROM (
    OLD."organizationId",
    OLD."envelopeId",
    OLD."tokenHash",
    OLD."jtiHash",
    OLD."envelopeContentHash",
    OLD."recipientHash",
    OLD."allowView",
    OLD."allowRespond",
    OLD."idempotencyKey",
    OLD."correlationId",
    OLD."businessEventId",
    OLD."issuedById",
    OLD."issuedAt",
    OLD."expiresAt",
    OLD."metadata",
    OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'Supplier PO access token identity is immutable';
  END IF;

  IF OLD."status" <> 'ACTIVE' AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'Terminal supplier PO access token status cannot change';
  END IF;
  IF NEW."accessCount" < OLD."accessCount" THEN
    RAISE EXCEPTION 'Supplier PO access count cannot decrease';
  END IF;
  IF OLD."lastAccessedAt" IS NOT NULL
     AND NEW."lastAccessedAt" < OLD."lastAccessedAt" THEN
    RAISE EXCEPTION 'Supplier PO last access time cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: supplier_po_append_only_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.supplier_po_append_only_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Supplier PO acknowledgement evidence is append-only';
END;
$$;


--
-- Name: workflow_assurance_check_findings_prevent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workflow_assurance_check_findings_prevent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable workflow assurance finding %', OLD."id"
      USING ERRCODE = '23514';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable workflow assurance finding %', OLD."id"
    USING ERRCODE = '23514';
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _UserRoles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_UserRoles" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: accountant_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_access_grants (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "accountantUserId" text NOT NULL,
    "accountantFirmName" text NOT NULL,
    "accountantFirmRegistrationNumber" text,
    role public."AccountantAccessRole" NOT NULL,
    status public."AccountantAccessStatus" DEFAULT 'ACTIVE'::public."AccountantAccessStatus" NOT NULL,
    "activeScopeKey" text,
    "consentGrantedById" text NOT NULL,
    "consentGrantedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "consentEvidenceHash" text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedById" text,
    "revokedAt" timestamp(3) without time zone,
    "revocationReason" text,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: accountant_client_invite_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_client_invite_states (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "inviteId" text NOT NULL,
    version integer NOT NULL,
    status public."AccountantClientInviteStatus" NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "actorId" text,
    "accountantUserId" text,
    "accessGrantId" text,
    reason text,
    "previousStateHash" text,
    "stateHash" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "businessEventId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT accountant_client_invite_states_acceptance_check CHECK (((status <> 'ACCEPTED'::public."AccountantClientInviteStatus") OR (("accountantUserId" IS NOT NULL) AND ("accessGrantId" IS NOT NULL)))),
    CONSTRAINT accountant_client_invite_states_first_state_check CHECK (((version > 1) OR ((status = 'PENDING'::public."AccountantClientInviteStatus") AND ("previousStateHash" IS NULL)))),
    CONSTRAINT accountant_client_invite_states_hash_check CHECK ((("stateHash" ~ '^[0-9a-f]{64}$'::text) AND ("evidenceHash" ~ '^[0-9a-f]{64}$'::text) AND (("previousStateHash" IS NULL) OR ("previousStateHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT accountant_client_invite_states_version_check CHECK ((version > 0))
);


--
-- Name: accountant_client_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_client_invites (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "attributionId" text NOT NULL,
    "inviteTokenHash" text NOT NULL,
    "emailHash" text NOT NULL,
    "redactedEmail" text NOT NULL,
    "accountantFirmName" text NOT NULL,
    "accountantFirmRegistrationNumber" text,
    role public."AccountantAccessRole" NOT NULL,
    "consentGrantedById" text NOT NULL,
    "consentGrantedAt" timestamp(3) without time zone NOT NULL,
    "consentEvidenceHash" text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" text NOT NULL,
    "correlationId" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "businessEventId" text NOT NULL,
    "outboxId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT accountant_client_invites_consent_check CHECK ((("consentEvidenceHash" ~ '^sha256:[0-9a-f]{64}$'::text) AND ((length(btrim("consentGrantedById")) >= 1) AND (length(btrim("consentGrantedById")) <= 191)) AND ("consentGrantedAt" <= "createdAt"))),
    CONSTRAINT accountant_client_invites_email_check CHECK ((("emailHash" ~ '^[0-9a-f]{64}$'::text) AND ((length(btrim("redactedEmail")) >= 3) AND (length(btrim("redactedEmail")) <= 191)))),
    CONSTRAINT accountant_client_invites_evidence_check CHECK (("evidenceHash" ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT accountant_client_invites_key_check CHECK ((((length(btrim("idempotencyKey")) >= 8) AND (length(btrim("idempotencyKey")) <= 191)) AND ((length(btrim("correlationId")) >= 8) AND (length(btrim("correlationId")) <= 191)))),
    CONSTRAINT accountant_client_invites_time_check CHECK ((("expiresAt" > "effectiveFrom") AND ("expiresAt" > "createdAt"))),
    CONSTRAINT accountant_client_invites_token_hash_check CHECK (("inviteTokenHash" ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: accountant_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_comments (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    "closeRunId" text NOT NULL,
    "findingId" text,
    "evidenceItemId" text,
    "reviewId" text,
    "authorId" text,
    body text NOT NULL,
    visibility text DEFAULT 'INTERNAL_AND_ACCOUNTANT'::text NOT NULL,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: accountant_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_reviews (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    "closeRunId" text NOT NULL,
    status public."AccountantReviewStatus" DEFAULT 'OPEN'::public."AccountantReviewStatus" NOT NULL,
    "reviewerId" text,
    "openedById" text,
    "reviewedAt" timestamp(3) without time zone,
    "decisionNotes" text,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: accounting_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_periods (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "fiscalYearId" text NOT NULL,
    "periodNumber" integer NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."AccountingPeriodStatus" DEFAULT 'OPEN'::public."AccountingPeriodStatus" NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "closedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: accounting_source_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_source_links (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "postingBatchId" text NOT NULL,
    "journalEntryId" text,
    "sourceType" public."AccountingSourceType" NOT NULL,
    "sourceId" text NOT NULL,
    "sourceNumber" text,
    "sourceDate" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    scope text,
    "accessToken" text,
    "accessTokenExpiresAt" timestamp(3) without time zone,
    "accountId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "idToken" text,
    password text,
    "providerId" text NOT NULL,
    "refreshToken" text,
    "refreshTokenExpiresAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: agent_activation_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_activation_approvals (
    id text NOT NULL,
    "packageId" text NOT NULL,
    "approvalType" public."AgentApprovalType" NOT NULL,
    decision public."AgentApprovalDecision" NOT NULL,
    "approverId" text NOT NULL,
    "evidenceHash" character varying(71) NOT NULL,
    "riskAcceptance" jsonb,
    "decidedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "idempotencyKey" character varying(191),
    "requestHash" character varying(71)
);


--
-- Name: agent_activation_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_activation_owners (
    id text NOT NULL,
    "packageId" text NOT NULL,
    responsibility public."AgentOwnerResponsibility" NOT NULL,
    "primaryUserId" text NOT NULL,
    "backupUserId" text,
    "escalationRouteRef" text NOT NULL,
    "runbookVersion" text NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "validUntil" timestamp(3) without time zone,
    "coverageStartsAt" timestamp(3) without time zone NOT NULL,
    "coverageEndsAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: agent_activation_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_activation_packages (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "agentKey" text NOT NULL,
    "releaseVersion" text NOT NULL,
    environment text NOT NULL,
    "commitSha" character varying(64) NOT NULL,
    "manifestHash" character varying(71) NOT NULL,
    manifest jsonb NOT NULL,
    "modelProviderPolicy" jsonb NOT NULL,
    "allowedRoleCodes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "activationStartsAt" timestamp(3) without time zone NOT NULL,
    "activationEndsAt" timestamp(3) without time zone NOT NULL,
    "residualRisks" jsonb,
    state public."AgentActivationState" DEFAULT 'DRAFT'::public."AgentActivationState" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "requestedById" text NOT NULL,
    "activatedById" text,
    "activatedAt" timestamp(3) without time zone,
    "suspendedAt" timestamp(3) without time zone,
    "suspensionReason" text,
    "lastReconciledAt" timestamp(3) without time zone,
    "reconciliationState" text,
    "alertTransportReady" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "retiredAt" timestamp(3) without time zone,
    "retiredById" text,
    "retirementReason" text
);


--
-- Name: agent_cost_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_cost_ledger (
    id text NOT NULL,
    "runId" text NOT NULL,
    "organizationId" text NOT NULL,
    "modelProvider" text NOT NULL,
    "modelName" text NOT NULL,
    "promptTokens" integer DEFAULT 0 NOT NULL,
    "completionTokens" integer DEFAULT 0 NOT NULL,
    "estimatedCost" numeric(19,6) DEFAULT 0 NOT NULL,
    currency text NOT NULL,
    "budgetBucket" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT agent_cost_ledger_nonnegative_check CHECK ((("promptTokens" >= 0) AND ("completionTokens" >= 0) AND ("estimatedCost" >= (0)::numeric)))
);


--
-- Name: agent_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_definitions (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    "ownerModuleSlug" text NOT NULL,
    status public."AgentDefinitionStatus" DEFAULT 'DRAFT'::public."AgentDefinitionStatus" NOT NULL,
    "rolloutMode" public."AgentRolloutMode" DEFAULT 'INTERNAL'::public."AgentRolloutMode" NOT NULL,
    "riskLevel" public."AgentRiskLevel" NOT NULL,
    "defaultModelPolicy" jsonb,
    "allowedToolKeys" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "allowedSkillKeys" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: agent_evidence_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_evidence_links (
    id text NOT NULL,
    "runId" text NOT NULL,
    "stepId" text,
    "subjectType" text NOT NULL,
    "subjectId" text NOT NULL,
    "sourceModule" text NOT NULL,
    "sourceTable" text,
    "sourceHash" text,
    "evidenceGrade" text NOT NULL,
    freshness public."AgentEvidenceFreshness" NOT NULL,
    available boolean DEFAULT true NOT NULL,
    "blockerCount" integer DEFAULT 0 NOT NULL,
    "redactionCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT agent_evidence_links_counts_check CHECK ((("blockerCount" >= 0) AND ("redactionCount" >= 0)))
);


--
-- Name: agent_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_feedback (
    id text NOT NULL,
    "runId" text NOT NULL,
    "organizationId" text NOT NULL,
    "actorId" text NOT NULL,
    helpful boolean,
    accepted boolean,
    "rejectedReason" text,
    "staleAnswer" boolean DEFAULT false NOT NULL,
    "wrongAnswer" boolean DEFAULT false NOT NULL,
    "unsafeAttempt" boolean DEFAULT false NOT NULL,
    "correctionText" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_pilot_certifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_pilot_certifications (
    id text NOT NULL,
    "packageId" text NOT NULL,
    "commitSha" character varying(64) NOT NULL,
    "manifestHash" character varying(71) NOT NULL,
    "suiteVersion" text NOT NULL,
    "ciRunId" text NOT NULL,
    result public."AgentCertificationResult" NOT NULL,
    "reportHash" character varying(71) NOT NULL,
    "passedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "idempotencyKey" character varying(191),
    "requestHash" character varying(71)
);


--
-- Name: agent_policy_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_policy_incidents (
    id text NOT NULL,
    "runId" text,
    "organizationId" text NOT NULL,
    "actorId" text NOT NULL,
    "incidentType" text NOT NULL,
    severity public."AgentPolicyIncidentSeverity" NOT NULL,
    "policyKey" text NOT NULL,
    "blockedToolKey" text,
    "safeSummary" text NOT NULL,
    status public."AgentPolicyIncidentStatus" DEFAULT 'OPEN'::public."AgentPolicyIncidentStatus" NOT NULL,
    "resolvedById" text,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_reconciler_invocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_reconciler_invocations (
    id text NOT NULL,
    environment text NOT NULL,
    "scheduleKey" character varying(100) NOT NULL,
    "runId" character varying(191) NOT NULL,
    "requestHash" character varying(71) NOT NULL,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    status public."AgentReconcilerInvocationStatus" DEFAULT 'RUNNING'::public."AgentReconcilerInvocationStatus" NOT NULL,
    "activeKey" character varying(100),
    "correlationId" character varying(191) NOT NULL,
    result jsonb,
    "failureCode" character varying(100),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "actorId" text NOT NULL,
    "agentDefinitionId" text,
    "agentKey" text NOT NULL,
    status public."AgentRunStatus" DEFAULT 'PENDING'::public."AgentRunStatus" NOT NULL,
    "sourceRoute" text NOT NULL,
    locale text NOT NULL,
    currency text NOT NULL,
    "periodStart" timestamp(3) without time zone,
    "periodEnd" timestamp(3) without time zone,
    "correlationId" text NOT NULL,
    "safeSummary" text,
    "failureCode" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "skillKey" text,
    "skillVersion" integer,
    "promptHash" text,
    "durationMs" integer,
    "toolCount" integer DEFAULT 0 NOT NULL,
    "evidenceCount" integer DEFAULT 0 NOT NULL,
    "redactionCount" integer DEFAULT 0 NOT NULL,
    "staleOutput" boolean DEFAULT false NOT NULL
);


--
-- Name: agent_skill_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_skill_definitions (
    id text NOT NULL,
    key text NOT NULL,
    version integer NOT NULL,
    domain text NOT NULL,
    "promptHash" text NOT NULL,
    "ownerModuleSlug" text NOT NULL,
    "requiredPermissions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "redactionCategories" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status public."AgentDefinitionStatus" DEFAULT 'DRAFT'::public."AgentDefinitionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: agent_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_steps (
    id text NOT NULL,
    "runId" text NOT NULL,
    "stepNumber" integer NOT NULL,
    kind public."AgentStepKind" NOT NULL,
    "toolKey" text,
    status public."AgentStepStatus" DEFAULT 'PENDING'::public."AgentStepStatus" NOT NULL,
    "inputHash" text,
    "outputHash" text,
    "safeSummary" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "errorCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "agent_steps_stepNumber_check" CHECK (("stepNumber" >= 0))
);


--
-- Name: agent_tool_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_tool_definitions (
    id text NOT NULL,
    key text NOT NULL,
    "ownerService" text NOT NULL,
    "moduleSlug" text NOT NULL,
    "requiredPermission" text NOT NULL,
    "riskLevel" public."AgentRiskLevel" NOT NULL,
    "toolType" public."AgentToolType" NOT NULL,
    "inputSchemaHash" text NOT NULL,
    "outputSchemaHash" text NOT NULL,
    "approvalPolicy" text NOT NULL,
    "idempotencyMode" text NOT NULL,
    status public."AgentDefinitionStatus" DEFAULT 'DRAFT'::public."AgentDefinitionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ai_action_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_action_proposals (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "runId" text NOT NULL,
    "createdById" text NOT NULL,
    "proposalType" text NOT NULL,
    "targetRoute" text NOT NULL,
    "requiredPermission" text NOT NULL,
    title text NOT NULL,
    detail text NOT NULL,
    "evidenceRefs" jsonb NOT NULL,
    "sourceHash" character varying(64) NOT NULL,
    "requestHash" character varying(64) NOT NULL,
    "idempotencyKey" character varying(191) NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "asOf" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    status public."AiActionProposalStatus" DEFAULT 'DRAFT'::public."AiActionProposalStatus" NOT NULL,
    "decidedById" text,
    "decidedAt" timestamp(3) without time zone,
    "decisionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    action text NOT NULL,
    changes jsonb,
    "userId" text,
    "ipAddress" text,
    "userAgent" text,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: branch_daily_close_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_daily_close_runs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "locationId" text NOT NULL,
    "businessDate" date NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    status public."BranchDailyCloseRunStatus" NOT NULL,
    "readinessState" character varying(32) NOT NULL,
    "evidenceCoverageState" character varying(16) NOT NULL,
    "supportedItemCount" integer NOT NULL,
    "unsupportedItemCount" integer NOT NULL,
    "blockerCount" integer NOT NULL,
    "evidenceObservedAt" timestamp(3) without time zone NOT NULL,
    "readinessSourceHash" character varying(71) NOT NULL,
    "evidenceHash" character varying(71) NOT NULL,
    "evidenceManifest" jsonb NOT NULL,
    "startedById" text NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" character varying(200) NOT NULL,
    "requestHash" character varying(71) NOT NULL,
    "correlationId" character varying(200) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT branch_daily_close_runs_count_check CHECK ((("supportedItemCount" >= 0) AND ("unsupportedItemCount" >= 0) AND (("supportedItemCount" + "unsupportedItemCount") > 0) AND ("blockerCount" >= 0))),
    CONSTRAINT branch_daily_close_runs_hash_check CHECK (((length(btrim(("readinessSourceHash")::text)) = 71) AND (length(btrim(("evidenceHash")::text)) = 71) AND (length(btrim(("requestHash")::text)) = 71))),
    CONSTRAINT branch_daily_close_runs_identity_check CHECK (((length(btrim(("idempotencyKey")::text)) > 0) AND (length(btrim(("correlationId")::text)) > 0))),
    CONSTRAINT branch_daily_close_runs_period_check CHECK (("periodStart" < "periodEnd")),
    CONSTRAINT branch_daily_close_runs_readiness_check CHECK (((("readinessState")::text = ANY ((ARRAY['READY_FOR_REVIEW'::character varying, 'ACTION_REQUIRED'::character varying, 'NO_ACTIVITY'::character varying, 'UNAVAILABLE'::character varying])::text[])) AND (("evidenceCoverageState")::text = ANY ((ARRAY['PARTIAL'::character varying, 'COMPLETE'::character varying])::text[]))))
);


--
-- Name: branch_daily_close_sign_offs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_daily_close_sign_offs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "branchDailyCloseRunId" text NOT NULL,
    status public."BranchDailyCloseSignOffStatus" DEFAULT 'ACTIVE'::public."BranchDailyCloseSignOffStatus" NOT NULL,
    "activeKey" character varying(200),
    "signedReadinessSourceHash" character varying(71) NOT NULL,
    "signedEvidenceHash" character varying(71) NOT NULL,
    "signedEvidenceObservedAt" timestamp(3) without time zone NOT NULL,
    "signedById" text NOT NULL,
    "signedAt" timestamp(3) without time zone NOT NULL,
    "authAssuranceLevel" character varying(2) NOT NULL,
    "freshAuthAt" timestamp(3) without time zone NOT NULL,
    "invalidatedById" text,
    "invalidatedAt" timestamp(3) without time zone,
    "invalidationReason" character varying(500),
    "supersedesSignOffId" text,
    "idempotencyKey" character varying(200) NOT NULL,
    "requestHash" character varying(71) NOT NULL,
    "correlationId" character varying(200) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT branch_daily_close_sign_offs_assurance_check CHECK (((("authAssuranceLevel")::text = 'L1'::text) AND ("freshAuthAt" <= "signedAt") AND ("freshAuthAt" >= ("signedAt" - '00:05:00'::interval)))),
    CONSTRAINT branch_daily_close_sign_offs_evidence_time_check CHECK (("signedEvidenceObservedAt" <= "signedAt")),
    CONSTRAINT branch_daily_close_sign_offs_hash_check CHECK (((length(btrim(("signedReadinessSourceHash")::text)) = 71) AND ("left"(("signedReadinessSourceHash")::text, 7) = 'sha256:'::text) AND (length(btrim(("signedEvidenceHash")::text)) = 71) AND ("left"(("signedEvidenceHash")::text, 7) = 'sha256:'::text) AND (length(btrim(("requestHash")::text)) = 71) AND ("left"(("requestHash")::text, 7) = 'sha256:'::text))),
    CONSTRAINT branch_daily_close_sign_offs_identity_check CHECK (((length(btrim(("idempotencyKey")::text)) > 0) AND (length(btrim(("correlationId")::text)) > 0) AND (("activeKey" IS NULL) OR (length(btrim(("activeKey")::text)) > 0)) AND (("supersedesSignOffId" IS NULL) OR ("supersedesSignOffId" <> id)))),
    CONSTRAINT branch_daily_close_sign_offs_lifecycle_check CHECK ((((status = 'ACTIVE'::public."BranchDailyCloseSignOffStatus") AND (("activeKey")::text = "branchDailyCloseRunId") AND ("invalidatedById" IS NULL) AND ("invalidatedAt" IS NULL) AND ("invalidationReason" IS NULL)) OR ((status = ANY (ARRAY['REVOKED'::public."BranchDailyCloseSignOffStatus", 'SUPERSEDED'::public."BranchDailyCloseSignOffStatus"])) AND ("activeKey" IS NULL) AND ("invalidatedById" IS NOT NULL) AND ("invalidatedAt" IS NOT NULL) AND (length(btrim(("invalidationReason")::text)) > 0) AND ("invalidatedAt" >= "signedAt"))))
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id text NOT NULL,
    slug text NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "descriptionEn" text,
    "descriptionFr" text,
    "logoUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: business_event_anomalies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_event_anomalies (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    "anomalyType" text NOT NULL,
    code text NOT NULL,
    severity public."BusinessEventAnomalySeverity" NOT NULL,
    status public."BusinessEventAnomalyStatus" DEFAULT 'OPEN'::public."BusinessEventAnomalyStatus" NOT NULL,
    summary text NOT NULL,
    fingerprint text NOT NULL,
    "occurrenceCount" integer DEFAULT 1 NOT NULL,
    "correlationId" text,
    metadata jsonb,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acknowledgedAt" timestamp(3) without time zone,
    "acknowledgedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    "resolutionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: business_event_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_event_audits (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    action public."BusinessEventAuditAction" NOT NULL,
    "eventSource" public."BusinessEventSource",
    "actorId" text,
    reason text,
    "payloadHash" text,
    "attemptedPayloadHash" text,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: business_event_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_event_outbox (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    channel public."BusinessOutboxChannel" NOT NULL,
    "eventName" text NOT NULL,
    destination text,
    "idempotencyKey" text NOT NULL,
    "payloadHash" text NOT NULL,
    payload jsonb NOT NULL,
    status public."BusinessOutboxStatus" DEFAULT 'PENDING'::public."BusinessOutboxStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "availableAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lockedBy" text,
    "processedAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "lastErrorCode" text,
    "lastErrorMessage" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "correlationId" text
);


--
-- Name: business_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "eventType" text NOT NULL,
    "eventSource" public."BusinessEventSource" DEFAULT 'INTERNAL'::public."BusinessEventSource" NOT NULL,
    "schemaVersion" integer DEFAULT 1 NOT NULL,
    status public."BusinessEventStatus" DEFAULT 'RECORDED'::public."BusinessEventStatus" NOT NULL,
    "idempotencyKey" text NOT NULL,
    "payloadHash" text NOT NULL,
    payload jsonb NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "actorId" text,
    "locationId" text,
    "registerId" text,
    "deviceId" text,
    "sourceType" public."AccountingSourceType",
    "sourceId" text,
    "postingBatchId" text,
    "documentHash" text,
    "failureCode" text,
    "failureMessage" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "correlationId" text
);


--
-- Name: cash_drawer_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_drawer_transactions (
    id text NOT NULL,
    type public."CashDrawerTransactionType" NOT NULL,
    amount numeric(14,2) NOT NULL,
    reason text,
    notes text,
    "cashDrawerId" text NOT NULL,
    "sessionId" text,
    "userId" text NOT NULL,
    "balanceBefore" numeric(14,2) NOT NULL,
    "balanceAfter" numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cash_drawers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_drawers (
    id text NOT NULL,
    name text NOT NULL,
    "drawerNumber" text NOT NULL,
    "currentBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "expectedBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "isOpen" boolean DEFAULT false NOT NULL,
    "locationId" text NOT NULL,
    "terminalId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: cash_shortage_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_shortage_policies (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    version integer NOT NULL,
    currency text NOT NULL,
    "reviewThreshold" numeric(19,4) NOT NULL,
    "highThreshold" numeric(19,4) NOT NULL,
    "minorUnitScale" integer NOT NULL,
    "roundingMode" public."CashShortageRoundingMode" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    mode public."CashShortagePolicyMode" DEFAULT 'OBSERVE'::public."CashShortagePolicyMode" NOT NULL,
    status public."CashShortagePolicyStatus" DEFAULT 'DRAFT'::public."CashShortagePolicyStatus" NOT NULL,
    "createdById" text NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "documentHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT cash_shortage_policies_approval_evidence_check CHECK ((((status = 'DRAFT'::public."CashShortagePolicyStatus") AND ("approvedById" IS NULL) AND ("approvedAt" IS NULL) AND ("documentHash" IS NULL)) OR ((status = 'APPROVED'::public."CashShortagePolicyStatus") AND ("approvedById" IS NOT NULL) AND ("approvedAt" IS NOT NULL) AND ("documentHash" ~ '^[a-f0-9]{64}$'::text)))),
    CONSTRAINT cash_shortage_policies_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT cash_shortage_policies_effective_window_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveTo" > "effectiveFrom"))),
    CONSTRAINT cash_shortage_policies_scale_check CHECK ((("minorUnitScale" >= 0) AND ("minorUnitScale" <= 4))),
    CONSTRAINT cash_shortage_policies_threshold_check CHECK ((("reviewThreshold" > (0)::numeric) AND ("highThreshold" >= "reviewThreshold") AND ("reviewThreshold" = round("reviewThreshold", "minorUnitScale")) AND ("highThreshold" = round("highThreshold", "minorUnitScale")))),
    CONSTRAINT cash_shortage_policies_version_check CHECK ((version > 0))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    slug text NOT NULL,
    "titleEn" text NOT NULL,
    "titleFr" text,
    "descriptionEn" text,
    "descriptionFr" text,
    "imageUrl" text,
    "parentId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "descriptionEn" text,
    "descriptionFr" text,
    type public."ChartAccountType" NOT NULL,
    "normalBalance" public."ChartAccountNormalBalance" NOT NULL,
    "parentId" text,
    "isControlAccount" boolean DEFAULT false NOT NULL,
    "isSystem" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "allowManualPost" boolean DEFAULT true NOT NULL,
    "mappingKey" text,
    "syscohadaClass" text,
    "syscohadaReference" text,
    currency text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: close_assurance_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.close_assurance_findings (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    "closeRunId" text NOT NULL,
    "checklistItemId" text,
    domain public."CloseFindingDomain" NOT NULL,
    severity public."CloseFindingSeverity" NOT NULL,
    status public."CloseFindingStatus" DEFAULT 'OPEN'::public."CloseFindingStatus" NOT NULL,
    title text NOT NULL,
    detail text NOT NULL,
    "sourceService" text NOT NULL,
    "sourceType" text,
    "sourceId" text,
    "ownerId" text,
    "assignedById" text,
    "assignedAt" timestamp(3) without time zone,
    "dueAt" timestamp(3) without time zone,
    "resolutionNotes" text,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedById" text,
    "waiverRequestedById" text,
    "waiverRequestedAt" timestamp(3) without time zone,
    "waiverReason" text,
    "waiverApprovedById" text,
    "waiverApprovedAt" timestamp(3) without time zone,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: close_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.close_checklist_items (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    "closeRunId" text NOT NULL,
    key text NOT NULL,
    domain public."CloseFindingDomain" NOT NULL,
    status public."CloseChecklistStatus" NOT NULL,
    severity public."CloseFindingSeverity" DEFAULT 'INFO'::public."CloseFindingSeverity" NOT NULL,
    label text NOT NULL,
    detail text NOT NULL,
    "sourceService" text NOT NULL,
    "evidenceCount" integer DEFAULT 0 NOT NULL,
    "blockerReason" text,
    "nextActionHref" text,
    "ownerId" text,
    "dueAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: close_evidence_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.close_evidence_items (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    "closeRunId" text NOT NULL,
    "checklistItemId" text,
    "findingId" text,
    "evidenceType" public."CloseEvidenceType" NOT NULL,
    "sourceTable" text,
    "sourceType" text,
    "sourceId" text,
    "sourceLabel" text NOT NULL,
    "sourceDate" timestamp(3) without time zone,
    "sourceHash" text,
    provenance text DEFAULT 'POSTED'::text NOT NULL,
    available boolean DEFAULT true NOT NULL,
    "unavailableReason" text,
    metadata jsonb,
    "correlationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: close_pack_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.close_pack_exports (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    "closeRunId" text NOT NULL,
    "fileType" text DEFAULT 'json'::text NOT NULL,
    "watermarkId" text NOT NULL,
    "contentHash" text NOT NULL,
    "rowCount" integer DEFAULT 0 NOT NULL,
    "isCertified" boolean DEFAULT false NOT NULL,
    "exportedById" text,
    "exportedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: close_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.close_runs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text NOT NULL,
    status public."CloseRunStatus" DEFAULT 'DRAFT'::public."CloseRunStatus" NOT NULL,
    "readinessScore" integer DEFAULT 0 NOT NULL,
    "criticalBlockerCount" integer DEFAULT 0 NOT NULL,
    "highBlockerCount" integer DEFAULT 0 NOT NULL,
    "evidenceCoveragePct" numeric(5,2),
    "asOf" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "runById" text,
    "correlationId" text,
    summary jsonb,
    provenance jsonb,
    metadata jsonb,
    "voidedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: compliance_adapter_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_adapter_configs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "countryCode" text NOT NULL,
    "authorityChannel" text NOT NULL,
    "adapterKey" text NOT NULL,
    environment public."ComplianceAdapterEnvironment" DEFAULT 'SANDBOX'::public."ComplianceAdapterEnvironment" NOT NULL,
    status public."ComplianceAdapterConfigStatus" DEFAULT 'REQUIRES_EXPERT_REVIEW'::public."ComplianceAdapterConfigStatus" NOT NULL,
    "countryPackVersion" text NOT NULL,
    "countryPackResolutionHash" text NOT NULL,
    "capabilityStatus" text NOT NULL,
    "credentialReference" text,
    "credentialExpiresAt" timestamp(3) without time zone,
    "credentialRotatedAt" timestamp(3) without time zone,
    "credentialRotatedById" text,
    "officialSpecTitle" text,
    "officialSpecVersion" text,
    "officialSpecPublishedAt" timestamp(3) without time zone,
    "officialSpecEffectiveFrom" timestamp(3) without time zone,
    "officialSpecReference" text,
    "officialSpecHash" text,
    "reviewStatus" public."ComplianceAdapterReviewStatus" DEFAULT 'REQUIRES_EXPERT_REVIEW'::public."ComplianceAdapterReviewStatus" NOT NULL,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewerQualification" text,
    "reviewerConflictDeclared" boolean,
    "reviewEvidenceHash" text,
    "publicMetadata" jsonb,
    "configHash" text,
    "createdById" text,
    "updatedById" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "disabledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: compliance_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_evidence (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "fiscalDocumentId" text,
    "submissionId" text,
    "evidenceType" public."ComplianceEvidenceType" NOT NULL,
    source public."ComplianceEvidenceSource" NOT NULL,
    "artifactHash" text NOT NULL,
    "hashAlgorithm" text DEFAULT 'sha256'::text NOT NULL,
    "storageUri" text,
    "authorityReference" text,
    "legalRef" text,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "capturedById" text,
    payload jsonb,
    "redactedPayload" jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: compliance_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_submissions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "fiscalDocumentId" text NOT NULL,
    "adapterConfigId" text,
    operation public."ComplianceSubmissionOperation" DEFAULT 'CERTIFY'::public."ComplianceSubmissionOperation" NOT NULL,
    status public."ComplianceSubmissionStatus" DEFAULT 'PENDING'::public."ComplianceSubmissionStatus" NOT NULL,
    "authorityChannel" text NOT NULL,
    "adapterKey" text,
    environment public."ComplianceAdapterEnvironment" DEFAULT 'SANDBOX'::public."ComplianceAdapterEnvironment" NOT NULL,
    "idempotencyKey" text NOT NULL,
    "payloadHash" text NOT NULL,
    "requestHash" text,
    "responseHash" text,
    "correlationId" text,
    "authorityReference" text,
    "errorCode" text,
    "errorMessage" text,
    "rejectionReason" text,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "nextAttemptAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leasedAt" timestamp(3) without time zone,
    "leasedUntil" timestamp(3) without time zone,
    "leasedBy" text,
    "submittedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "requestSummary" jsonb,
    "responseSummary" jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_ledger_entries (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "entryDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public."LedgerEntryType" NOT NULL,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    "balanceAfter" numeric(14,2) NOT NULL,
    description text NOT NULL,
    "referenceType" text,
    "referenceId" text,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customer_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_locations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "customerId" text NOT NULL,
    "locationId" text NOT NULL,
    source public."CustomerLocationSource" DEFAULT 'MANUAL'::public."CustomerLocationSource" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_receivable_document_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_receivable_document_states (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "documentId" text NOT NULL,
    version integer NOT NULL,
    status public."CustomerReceivableDocumentStatus" NOT NULL,
    "paidAmount" numeric(14,2) NOT NULL,
    "unpaidAmount" numeric(14,2) NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "actorId" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text NOT NULL,
    reason text,
    "previousStateHash" text,
    "stateHash" text NOT NULL,
    "businessEventId" text,
    "evidenceHash" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_receivable_document_states_hash_check CHECK (((("previousStateHash" IS NULL) OR ("previousStateHash" ~ '^[0-9a-f]{64}$'::text)) AND ("stateHash" ~ '^[0-9a-f]{64}$'::text) AND ("evidenceHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT customer_receivable_document_states_lineage_check CHECK ((((version = 1) AND ("previousStateHash" IS NULL)) OR ((version > 1) AND ("previousStateHash" IS NOT NULL)))),
    CONSTRAINT customer_receivable_document_states_money_check CHECK ((("paidAmount" >= (0)::numeric) AND ("unpaidAmount" >= (0)::numeric))),
    CONSTRAINT customer_receivable_document_states_reason_check CHECK (((status <> ALL (ARRAY['CANCELLED'::public."CustomerReceivableDocumentStatus", 'VOIDED'::public."CustomerReceivableDocumentStatus"])) OR ((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500)))),
    CONSTRAINT customer_receivable_document_states_version_check CHECK ((version >= 1))
);


--
-- Name: customer_receivable_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_receivable_documents (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "customerId" text NOT NULL,
    "sourceSalesOrderId" text NOT NULL,
    "documentNumber" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "sourceVersion" integer DEFAULT 1 NOT NULL,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paymentTermsDays" integer NOT NULL,
    currency text NOT NULL,
    "currencyPrecision" integer DEFAULT 2 NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    "taxAmount" numeric(14,2) NOT NULL,
    "shippingAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(14,2) NOT NULL,
    "initialPaidAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "initialUnpaidAmount" numeric(14,2) NOT NULL,
    "organizationSnapshot" jsonb NOT NULL,
    "customerSnapshot" jsonb NOT NULL,
    "sourceSnapshot" jsonb NOT NULL,
    metadata jsonb,
    "documentHash" text NOT NULL,
    "sourceEvidenceHash" text NOT NULL,
    "metadataHash" text NOT NULL,
    "issuedById" text NOT NULL,
    "supersedesDocumentId" text,
    "correctionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_receivable_documents_correction_check CHECK (((("supersedesDocumentId" IS NULL) AND ("correctionReason" IS NULL) AND (version = 1)) OR (("supersedesDocumentId" IS NOT NULL) AND ("supersedesDocumentId" <> id) AND ((char_length(btrim("correctionReason")) >= 3) AND (char_length(btrim("correctionReason")) <= 500)) AND (version > 1)))),
    CONSTRAINT customer_receivable_documents_hash_check CHECK ((("documentHash" ~ '^[0-9a-f]{64}$'::text) AND ("sourceEvidenceHash" ~ '^[0-9a-f]{64}$'::text) AND ("metadataHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT customer_receivable_documents_identity_check CHECK (((version >= 1) AND ("sourceVersion" >= 1) AND ((char_length(btrim("documentNumber")) >= 1) AND (char_length(btrim("documentNumber")) <= 120)) AND (char_length(btrim(currency)) = 3) AND (("currencyPrecision" >= 0) AND ("currencyPrecision" <= 6)) AND (("paymentTermsDays" >= 0) AND ("paymentTermsDays" <= 3650)) AND ("dueDate" >= "invoiceDate") AND ("issuedAt" >= "invoiceDate"))),
    CONSTRAINT customer_receivable_documents_money_check CHECK (((subtotal >= (0)::numeric) AND ("taxAmount" >= (0)::numeric) AND ("shippingAmount" >= (0)::numeric) AND ("discountAmount" >= (0)::numeric) AND ("totalAmount" > (0)::numeric) AND ("initialPaidAmount" >= (0)::numeric) AND ("initialUnpaidAmount" >= (0)::numeric) AND (("initialPaidAmount" + "initialUnpaidAmount") = "totalAmount")))
);


--
-- Name: customer_settlement_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_settlement_allocations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "customerSettlementId" text NOT NULL,
    "salesOrderId" text NOT NULL,
    "customerLedgerEntryId" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reversalCustomerLedgerEntryId" text,
    "customerReceivableDocumentId" text
);


--
-- Name: customer_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_settlements (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "customerId" text NOT NULL,
    "settlementNumber" text NOT NULL,
    status public."CustomerSettlementStatus" DEFAULT 'POSTED'::public."CustomerSettlementStatus" NOT NULL,
    method public."PaymentMethod" NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "settlementDate" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" text NOT NULL,
    "idempotencyPayloadHash" text NOT NULL,
    "correlationId" text NOT NULL,
    "externalReference" text,
    "documentHash" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "receivedById" text NOT NULL,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "postedBusinessEventId" text,
    "reversedAt" timestamp(3) without time zone,
    "reversedById" text,
    "reversalReason" text,
    "reversalIdempotencyKey" text,
    "reversalEvidenceHash" text,
    "reversalLedgerPostingBatchId" text,
    "reversalJournalEntryId" text,
    "reversalBusinessEventId" text,
    notes text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reversalDate" timestamp(3) without time zone,
    "reversalIdempotencyPayloadHash" text,
    "reversalCorrelationId" text,
    "reversalDocumentHash" text,
    "reversalAccountingSourceLinkId" text,
    CONSTRAINT customer_settlements_reversed_evidence_complete_check CHECK ((((status = 'POSTED'::public."CustomerSettlementStatus") AND ("reversalDate" IS NULL) AND ("reversedAt" IS NULL) AND ("reversedById" IS NULL) AND ("reversalReason" IS NULL) AND ("reversalIdempotencyKey" IS NULL) AND ("reversalIdempotencyPayloadHash" IS NULL) AND ("reversalCorrelationId" IS NULL) AND ("reversalDocumentHash" IS NULL) AND ("reversalEvidenceHash" IS NULL) AND ("reversalLedgerPostingBatchId" IS NULL) AND ("reversalJournalEntryId" IS NULL) AND ("reversalAccountingSourceLinkId" IS NULL) AND ("reversalBusinessEventId" IS NULL)) OR ((status = 'REVERSED'::public."CustomerSettlementStatus") AND ("reversalDate" IS NOT NULL) AND ("reversedAt" IS NOT NULL) AND ("reversedById" IS NOT NULL) AND ("reversedById" <> "receivedById") AND ("reversalReason" IS NOT NULL) AND ((char_length(btrim("reversalReason")) >= 3) AND (char_length(btrim("reversalReason")) <= 500)) AND ("reversalIdempotencyKey" IS NOT NULL) AND ((char_length(btrim("reversalIdempotencyKey")) >= 8) AND (char_length(btrim("reversalIdempotencyKey")) <= 160)) AND ("reversalIdempotencyPayloadHash" IS NOT NULL) AND (char_length("reversalIdempotencyPayloadHash") = 64) AND ("reversalCorrelationId" IS NOT NULL) AND ((char_length(btrim("reversalCorrelationId")) >= 8) AND (char_length(btrim("reversalCorrelationId")) <= 160)) AND ("reversalDocumentHash" IS NOT NULL) AND ("reversalDocumentHash" ~ '^[0-9a-f]{64}$'::text) AND ("reversalEvidenceHash" IS NOT NULL) AND ("reversalEvidenceHash" ~ '^[0-9a-f]{64}$'::text) AND ("reversalLedgerPostingBatchId" IS NOT NULL) AND ("reversalJournalEntryId" IS NOT NULL) AND ("reversalAccountingSourceLinkId" IS NOT NULL) AND ("reversalBusinessEventId" IS NOT NULL) AND ("reversalDate" >= "settlementDate"))))
);


--
-- Name: customer_statement_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_access_logs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "statementSnapshotId" text NOT NULL,
    "tokenId" text NOT NULL,
    action public."CustomerStatementAccessAction" NOT NULL,
    outcome public."CustomerStatementAccessOutcome" NOT NULL,
    "statementContentHash" text NOT NULL,
    "tokenHashPrefix" text NOT NULL,
    "ipHash" text,
    "userAgentHash" text,
    "responseHash" text,
    "denialReason" text,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_statement_access_logs_hash_check CHECK ((("statementContentHash" ~ '^[0-9a-f]{64}$'::text) AND ("tokenHashPrefix" ~ '^[0-9a-f]{12}$'::text) AND (("ipHash" IS NULL) OR ("ipHash" ~ '^[0-9a-f]{64}$'::text)) AND (("userAgentHash" IS NULL) OR ("userAgentHash" ~ '^[0-9a-f]{64}$'::text)) AND (("responseHash" IS NULL) OR ("responseHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT customer_statement_access_logs_outcome_check CHECK ((((outcome = 'GRANTED'::public."CustomerStatementAccessOutcome") AND ("denialReason" IS NULL)) OR ((outcome = 'DENIED'::public."CustomerStatementAccessOutcome") AND ((char_length(btrim("denialReason")) >= 3) AND (char_length(btrim("denialReason")) <= 120)))))
);


--
-- Name: customer_statement_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_access_tokens (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "statementSnapshotId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "jtiHash" text NOT NULL,
    "statementContentHash" text NOT NULL,
    "recipientHash" text,
    "allowView" boolean DEFAULT true NOT NULL,
    "allowDispute" boolean DEFAULT false NOT NULL,
    "allowPromiseToPay" boolean DEFAULT false NOT NULL,
    status public."CustomerStatementAccessTokenStatus" DEFAULT 'ACTIVE'::public."CustomerStatementAccessTokenStatus" NOT NULL,
    "issuedById" text NOT NULL,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedById" text,
    "revokedAt" timestamp(3) without time zone,
    "revocationReason" text,
    "lastAccessedAt" timestamp(3) without time zone,
    "accessCount" integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "referralAttributionId" text,
    CONSTRAINT customer_statement_access_tokens_access_check CHECK ((("accessCount" >= 0) AND ((("accessCount" = 0) AND ("lastAccessedAt" IS NULL)) OR (("accessCount" > 0) AND ("lastAccessedAt" IS NOT NULL))))),
    CONSTRAINT customer_statement_access_tokens_hash_check CHECK ((("tokenHash" ~ '^[0-9a-f]{64}$'::text) AND ("jtiHash" ~ '^[0-9a-f]{64}$'::text) AND ("statementContentHash" ~ '^[0-9a-f]{64}$'::text) AND (("recipientHash" IS NULL) OR ("recipientHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT customer_statement_access_tokens_metadata_check CHECK (((metadata IS NULL) OR (jsonb_typeof(metadata) = 'object'::text))),
    CONSTRAINT customer_statement_access_tokens_scope_check CHECK (("allowView" = true)),
    CONSTRAINT customer_statement_access_tokens_status_check CHECK ((((status = 'ACTIVE'::public."CustomerStatementAccessTokenStatus") AND ("revokedAt" IS NULL) AND ("revokedById" IS NULL) AND ("revocationReason" IS NULL)) OR ((status = 'REVOKED'::public."CustomerStatementAccessTokenStatus") AND ("revokedAt" IS NOT NULL) AND (char_length(btrim("revokedById")) > 0) AND ((char_length(btrim("revocationReason")) >= 3) AND (char_length(btrim("revocationReason")) <= 500))) OR ((status = 'EXPIRED'::public."CustomerStatementAccessTokenStatus") AND ("revokedAt" IS NULL) AND ("revokedById" IS NULL) AND ("revocationReason" IS NULL)))),
    CONSTRAINT customer_statement_access_tokens_time_check CHECK ((("issuedAt" < "expiresAt") AND (("lastAccessedAt" IS NULL) OR ("lastAccessedAt" >= "issuedAt"))))
);


--
-- Name: customer_statement_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_deliveries (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "statementSnapshotId" text NOT NULL,
    "tokenId" text NOT NULL,
    "attributionId" text NOT NULL,
    channel public."CustomerStatementDeliveryChannel" NOT NULL,
    "destinationHash" text NOT NULL,
    "redactedDestination" text NOT NULL,
    "consentBasis" public."CustomerStatementConsentBasis" NOT NULL,
    "consentEvidenceHash" text NOT NULL,
    "consentCapturedAt" timestamp(3) without time zone NOT NULL,
    "consentCapturedById" text NOT NULL,
    "statementContentHash" text NOT NULL,
    "payloadHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "correlationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    "outboxId" text NOT NULL,
    locale text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_statement_deliveries_consent_check CHECK ((("consentEvidenceHash" ~ '^sha256:[0-9a-f]{64}$'::text) AND ((length(btrim("consentCapturedById")) >= 1) AND (length(btrim("consentCapturedById")) <= 191)) AND ("consentCapturedAt" <= "createdAt"))),
    CONSTRAINT customer_statement_deliveries_destination_check CHECK ((("destinationHash" ~ '^sha256:[0-9a-f]{64}$'::text) AND ((length(btrim("redactedDestination")) >= 3) AND (length(btrim("redactedDestination")) <= 191)))),
    CONSTRAINT customer_statement_deliveries_hash_check CHECK ((("statementContentHash" ~ '^[0-9a-f]{64}$'::text) AND ("payloadHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT customer_statement_deliveries_key_check CHECK ((((length(btrim("idempotencyKey")) >= 8) AND (length(btrim("idempotencyKey")) <= 191)) AND ((length(btrim("correlationId")) >= 8) AND (length(btrim("correlationId")) <= 191)))),
    CONSTRAINT customer_statement_deliveries_locale_check CHECK ((locale = ANY (ARRAY['EN'::text, 'FR'::text])))
);


--
-- Name: customer_statement_delivery_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_delivery_states (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "deliveryId" text NOT NULL,
    version integer NOT NULL,
    status public."CustomerStatementDeliveryStatus" NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "providerReferenceHash" text,
    "errorCode" text,
    "previousStateHash" text,
    "stateHash" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "businessEventId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_statement_delivery_states_first_state_check CHECK (((version > 1) OR ((status = 'QUEUED'::public."CustomerStatementDeliveryStatus") AND ("previousStateHash" IS NULL)))),
    CONSTRAINT customer_statement_delivery_states_hash_check CHECK ((("stateHash" ~ '^[0-9a-f]{64}$'::text) AND ("evidenceHash" ~ '^[0-9a-f]{64}$'::text) AND (("previousStateHash" IS NULL) OR ("previousStateHash" ~ '^[0-9a-f]{64}$'::text)) AND (("providerReferenceHash" IS NULL) OR ("providerReferenceHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT customer_statement_delivery_states_version_check CHECK ((version > 0))
);


--
-- Name: customer_statement_recipient_action_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_recipient_action_states (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "actionId" text NOT NULL,
    version integer NOT NULL,
    status public."CustomerStatementRecipientActionStatus" NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "actorType" text NOT NULL,
    "actorId" text,
    reason text,
    "previousStateHash" text,
    "stateHash" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "businessEventId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_statement_recipient_action_states_actor_check CHECK (((version > 0) AND ((char_length(btrim("actorType")) >= 3) AND (char_length(btrim("actorType")) <= 40)) AND (("actorId" IS NULL) OR (char_length(btrim("actorId")) > 0)) AND ((reason IS NULL) OR ((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500))))),
    CONSTRAINT customer_statement_recipient_action_states_hash_check CHECK ((("stateHash" ~ '^[0-9a-f]{64}$'::text) AND ("evidenceHash" ~ '^[0-9a-f]{64}$'::text) AND (("previousStateHash" IS NULL) OR ("previousStateHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT customer_statement_recipient_action_states_lineage_check CHECK ((((version = 1) AND (status = 'OPEN'::public."CustomerStatementRecipientActionStatus") AND ("previousStateHash" IS NULL)) OR ((version > 1) AND ("previousStateHash" IS NOT NULL))))
);


--
-- Name: customer_statement_recipient_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_recipient_actions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "statementSnapshotId" text NOT NULL,
    "tokenId" text NOT NULL,
    "customerReceivableDocumentId" text,
    "actionType" public."CustomerStatementRecipientActionType" NOT NULL,
    "requestedAmount" numeric(14,2),
    "promisedFor" timestamp(3) without time zone,
    "recipientNote" text NOT NULL,
    "noteHash" text NOT NULL,
    "payloadHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "correlationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_statement_recipient_actions_key_check CHECK ((((char_length(btrim("idempotencyKey")) >= 8) AND (char_length(btrim("idempotencyKey")) <= 160)) AND ((char_length(btrim("correlationId")) >= 8) AND (char_length(btrim("correlationId")) <= 160)) AND (char_length(btrim("businessEventId")) > 0))),
    CONSTRAINT customer_statement_recipient_actions_note_check CHECK ((((char_length(btrim("recipientNote")) >= 3) AND (char_length(btrim("recipientNote")) <= 500)) AND ("noteHash" ~ '^[0-9a-f]{64}$'::text) AND ("payloadHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT customer_statement_recipient_actions_type_check CHECK (((("actionType" = 'DISPUTE'::public."CustomerStatementRecipientActionType") AND ("customerReceivableDocumentId" IS NOT NULL) AND ("requestedAmount" > (0)::numeric) AND ("promisedFor" IS NULL)) OR (("actionType" = 'PROMISE_TO_PAY'::public."CustomerStatementRecipientActionType") AND ("requestedAmount" > (0)::numeric) AND ("promisedFor" IS NOT NULL))))
);


--
-- Name: customer_statement_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_statement_snapshots (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "customerId" text NOT NULL,
    "statementNumber" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "asOf" timestamp(3) without time zone NOT NULL,
    "recordedThrough" timestamp(3) without time zone NOT NULL,
    "generatedAt" timestamp(3) without time zone NOT NULL,
    currency text NOT NULL,
    "currencyPrecision" integer DEFAULT 2 NOT NULL,
    "openingBalance" numeric(14,2) NOT NULL,
    "periodDebits" numeric(14,2) NOT NULL,
    "periodCredits" numeric(14,2) NOT NULL,
    "closingBalance" numeric(14,2) NOT NULL,
    "overdueBalance" numeric(14,2) NOT NULL,
    "itemCount" integer NOT NULL,
    "movementCount" integer NOT NULL,
    "sourceItemCount" integer NOT NULL,
    "includedItemCount" integer NOT NULL,
    "itemLimit" integer NOT NULL,
    truncated boolean DEFAULT false NOT NULL,
    "organizationSnapshot" jsonb NOT NULL,
    "customerSnapshot" jsonb NOT NULL,
    "statementPayload" jsonb NOT NULL,
    "sourceTables" jsonb NOT NULL,
    "sourceDocumentHashes" jsonb NOT NULL,
    "sourceStateHashes" jsonb NOT NULL,
    "sourceLedgerEntryIds" jsonb NOT NULL,
    "contentHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "idempotencyPayloadHash" text NOT NULL,
    "correlationId" text NOT NULL,
    "generatedById" text NOT NULL,
    "businessEventId" text NOT NULL,
    "supersedesStatementId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT customer_statement_count_check CHECK (((version > 0) AND ("itemCount" >= 0) AND ("movementCount" >= 0) AND ("sourceItemCount" >= 0) AND ("includedItemCount" >= 0) AND ("itemLimit" > 0) AND ("includedItemCount" = "itemCount") AND ("sourceItemCount" = "includedItemCount") AND (truncated = false))),
    CONSTRAINT customer_statement_currency_check CHECK (((currency ~ '^[A-Z]{3}$'::text) AND (("currencyPrecision" >= 0) AND ("currencyPrecision" <= 6)))),
    CONSTRAINT customer_statement_hash_check CHECK ((("contentHash" ~ '^[0-9a-f]{64}$'::text) AND ("idempotencyPayloadHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT customer_statement_identity_check CHECK ((((char_length(btrim("statementNumber")) >= 8) AND (char_length(btrim("statementNumber")) <= 80)) AND ((char_length(btrim("idempotencyKey")) >= 8) AND (char_length(btrim("idempotencyKey")) <= 160)) AND ((char_length(btrim("correlationId")) >= 8) AND (char_length(btrim("correlationId")) <= 160)) AND (char_length(btrim("generatedById")) > 0) AND (char_length(btrim("businessEventId")) > 0) AND (("supersedesStatementId" IS NULL) OR ("supersedesStatementId" <> id)))),
    CONSTRAINT customer_statement_json_shape_check CHECK (((jsonb_typeof("organizationSnapshot") = 'object'::text) AND (jsonb_typeof("customerSnapshot") = 'object'::text) AND (jsonb_typeof("statementPayload") = 'object'::text) AND (jsonb_typeof("sourceTables") = 'array'::text) AND (jsonb_typeof("sourceDocumentHashes") = 'array'::text) AND (jsonb_typeof("sourceStateHashes") = 'array'::text) AND (jsonb_typeof("sourceLedgerEntryIds") = 'array'::text))),
    CONSTRAINT customer_statement_money_check CHECK ((("openingBalance" >= (0)::numeric) AND ("periodDebits" >= (0)::numeric) AND ("closingBalance" >= (0)::numeric) AND ("overdueBalance" >= (0)::numeric) AND ("overdueBalance" <= "closingBalance") AND ((("openingBalance" + "periodDebits") - "periodCredits") = "closingBalance"))),
    CONSTRAINT customer_statement_scope_check CHECK ((("periodStart" <= "periodEnd") AND ("asOf" = "periodEnd") AND ("recordedThrough" >= "periodEnd") AND ("generatedAt" = "recordedThrough")))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    email text,
    phone text,
    address text,
    "taxId" text,
    "creditLimit" numeric(14,2),
    "paymentTerms" integer DEFAULT 30,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "preferredLocale" public."Locale" DEFAULT 'EN'::public."Locale" NOT NULL,
    "currentBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: daily_sales_report_cash_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_sales_report_cash_events (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "transactionType" public."CashDrawerTransactionType" NOT NULL,
    amount numeric(14,2) NOT NULL,
    reason text,
    notes text,
    "balanceBefore" numeric(14,2) NOT NULL,
    "balanceAfter" numeric(14,2) NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    "userId" text,
    "userName" text
);


--
-- Name: daily_sales_report_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_sales_report_items (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "itemId" text NOT NULL,
    "itemNameEn" text NOT NULL,
    "itemNameFr" text,
    "itemSku" text NOT NULL,
    "costPrice" numeric(12,2) NOT NULL,
    "sellingPrice" numeric(12,2) NOT NULL,
    "startingQuantity" numeric(12,3) NOT NULL,
    "quantitySold" numeric(12,3) NOT NULL,
    "endingQuantity" numeric(12,3) NOT NULL,
    "cashSales" numeric(14,2) NOT NULL,
    "cardSales" numeric(14,2) NOT NULL,
    "mobileMoneySales" numeric(14,2) DEFAULT 0 NOT NULL,
    "bankTransferSales" numeric(14,2) DEFAULT 0 NOT NULL,
    "creditSales" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalRevenue" numeric(14,2) NOT NULL,
    "totalCost" numeric(14,2) NOT NULL,
    "grossProfit" numeric(14,2) NOT NULL,
    margin numeric(5,2) NOT NULL
);


--
-- Name: daily_sales_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_sales_reports (
    id text NOT NULL,
    date date NOT NULL,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "totalRevenue" numeric(14,2) NOT NULL,
    "totalCost" numeric(14,2) NOT NULL,
    "grossProfit" numeric(14,2) NOT NULL,
    "grossMargin" numeric(5,2) NOT NULL,
    "totalQuantitySold" numeric(12,3) NOT NULL,
    "totalTransactions" integer NOT NULL,
    "averageTransactionValue" numeric(14,2) NOT NULL,
    "itemsSold" integer NOT NULL,
    "cashSales" numeric(14,2) NOT NULL,
    "cardSales" numeric(14,2) NOT NULL,
    "mobileMoneySales" numeric(14,2) DEFAULT 0 NOT NULL,
    "bankTransferSales" numeric(14,2) DEFAULT 0 NOT NULL,
    "creditSales" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalExpenses" numeric(14,2) DEFAULT 0 NOT NULL,
    "netProfit" numeric(14,2) DEFAULT 0 NOT NULL,
    "openingBalance" numeric(14,2) NOT NULL,
    "closingBalance" numeric(14,2) NOT NULL,
    "cashIn" numeric(14,2) NOT NULL,
    "cashOut" numeric(14,2) NOT NULL,
    variance numeric(14,2) NOT NULL,
    "reportGeneratedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reportGeneratedById" text,
    "isFinalized" boolean DEFAULT false NOT NULL,
    notes text
);


--
-- Name: delivery_billing_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_billing_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "billingOutcomeId" text NOT NULL,
    "salesOrderLineId" text NOT NULL,
    "itemId" text NOT NULL,
    "deliveredQuantity" numeric(12,3) NOT NULL,
    "billedQuantity" numeric(12,3) NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    "discountAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "taxRate" numeric(6,3) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: delivery_billing_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_billing_outcomes (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "salesOrderId" text NOT NULL,
    status public."DeliveryBillingStatus" DEFAULT 'POSTED'::public."DeliveryBillingStatus" NOT NULL,
    "invoiceNumber" text NOT NULL,
    currency character varying(3) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    "taxAmount" numeric(14,2) NOT NULL,
    "discountAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(14,2) NOT NULL,
    "documentHash" character varying(64) NOT NULL,
    "commandEventId" character varying(191) NOT NULL,
    "customerReceivableDocumentId" text,
    "customerLedgerEntryId" text,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "fiscalDocumentId" text,
    "postedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "postedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: delivery_goods_issue_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_goods_issue_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "goodsIssueId" text NOT NULL,
    "salesOrderLineId" text NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    "totalCost" numeric(14,2) NOT NULL,
    "inventoryTransactionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: delivery_goods_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_goods_issues (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "salesOrderId" text NOT NULL,
    "locationId" text NOT NULL,
    kind public."DeliveryGoodsIssueKind" DEFAULT 'ISSUE'::public."DeliveryGoodsIssueKind" NOT NULL,
    "issueNumber" text NOT NULL,
    "documentHash" character varying(64) NOT NULL,
    "commandEventId" character varying(191) NOT NULL,
    "totalCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "reversalOfGoodsIssueId" text,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "issuedById" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: delivery_reservation_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_reservation_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "reservationId" text NOT NULL,
    "salesOrderLineId" text NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "consumedQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: delivery_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_reservations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "salesOrderId" text NOT NULL,
    "locationId" text NOT NULL,
    status public."DeliveryReservationStatus" DEFAULT 'ACTIVE'::public."DeliveryReservationStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "documentHash" character varying(64) NOT NULL,
    "commandEventId" character varying(191) NOT NULL,
    "reservedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "releasedAt" timestamp(3) without time zone,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_sequences (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "documentType" character varying(32) NOT NULL,
    "scopeKey" character varying(64) DEFAULT 'GLOBAL'::character varying NOT NULL,
    "nextValue" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT document_sequences_next_value_check CHECK (("nextValue" > 0))
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id text NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "descriptionEn" text,
    "descriptionFr" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    "expenseNumber" text NOT NULL,
    description text NOT NULL,
    amount numeric(14,2) NOT NULL,
    "expenseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "categoryId" text NOT NULL,
    "locationId" text,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "receiptUrl" text,
    "supplierId" text,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: fiscal_document_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_document_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "fiscalDocumentId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "sourceLineId" text,
    "itemId" text,
    description text NOT NULL,
    quantity numeric(18,3) NOT NULL,
    "unitPrice" numeric(18,2) NOT NULL,
    "discountAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "taxRateBps" integer,
    "taxCode" text,
    "taxAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "lineSubtotal" numeric(18,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(18,2) DEFAULT 0 NOT NULL,
    "linePayload" jsonb,
    "lineHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: fiscal_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_documents (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "documentType" public."FiscalDocumentType" NOT NULL,
    status public."FiscalDocumentStatus" DEFAULT 'DRAFT'::public."FiscalDocumentStatus" NOT NULL,
    "sourceType" public."AccountingSourceType" NOT NULL,
    "sourceId" text NOT NULL,
    "sourceNumber" text,
    "sourceDate" timestamp(3) without time zone,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "postingBatchId" text NOT NULL,
    "journalEntryId" text,
    "accountingSourceLinkId" text,
    "countryCode" text NOT NULL,
    "countryPackVersion" text NOT NULL,
    "countryPackSchemaVersion" text NOT NULL,
    "countryPackResolutionHash" text NOT NULL,
    "countryPackLegalRef" text,
    "countryPackVerificationStatus" text,
    "certificationPolicySnapshot" jsonb,
    "requiredFieldsSnapshot" jsonb,
    "artifactExpectationsSnapshot" jsonb,
    "fiscalYear" text NOT NULL,
    "fiscalPeriodKey" text DEFAULT 'ANNUAL'::text NOT NULL,
    "sequenceScopeKey" text DEFAULT 'GLOBAL'::text NOT NULL,
    "sequenceId" text,
    "provisionalNumber" text,
    "legalNumber" text,
    "legalNumberAssignedAt" timestamp(3) without time zone,
    currency text DEFAULT 'XAF'::text NOT NULL,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "taxBreakdown" jsonb,
    "canonicalPayload" jsonb NOT NULL,
    "canonicalPayloadHash" text NOT NULL,
    "sourcePayloadHash" text,
    "idempotencyKey" text NOT NULL,
    "authorityChannel" text,
    "authorityReference" text,
    "certificationArtifactHash" text,
    "certifiedAt" timestamp(3) without time zone,
    "certifiedById" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "originalFiscalDocumentId" text,
    "reversedAt" timestamp(3) without time zone,
    "reversedById" text,
    "reversalReason" text,
    "createdById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: fiscal_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_sequences (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "countryCode" text NOT NULL,
    "documentType" public."FiscalDocumentType" NOT NULL,
    "fiscalYear" text NOT NULL,
    "fiscalPeriodKey" text DEFAULT 'ANNUAL'::text NOT NULL,
    "scopeKey" text DEFAULT 'GLOBAL'::text NOT NULL,
    prefix text,
    status public."FiscalSequenceStatus" DEFAULT 'ACTIVE'::public."FiscalSequenceStatus" NOT NULL,
    "nextNumber" integer DEFAULT 1 NOT NULL,
    "lastIssuedNumber" integer DEFAULT 0 NOT NULL,
    "lastIssuedAt" timestamp(3) without time zone,
    "lockedAt" timestamp(3) without time zone,
    "lockedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: fiscal_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_years (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."FiscalYearStatus" DEFAULT 'OPEN'::public."FiscalYearStatus" NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: goods_receipt_inspection_resolutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_inspection_resolutions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "goodsReceiptId" text NOT NULL,
    "inspectionId" text NOT NULL,
    decision public."GoodsReceiptInspectionResolutionDecision" NOT NULL,
    "resolvedById" text NOT NULL,
    reason text NOT NULL,
    "idempotencyKey" character varying(191) NOT NULL,
    "payloadHash" character varying(64) NOT NULL,
    "resolvedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT goods_receipt_inspection_resolutions_command_evidence_check CHECK ((((char_length(btrim(("idempotencyKey")::text)) >= 8) AND (char_length(btrim(("idempotencyKey")::text)) <= 191)) AND (("idempotencyKey")::text ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$'::text) AND (("payloadHash")::text ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT goods_receipt_inspection_resolutions_reason_check CHECK ((char_length(btrim(reason)) > 0))
);


--
-- Name: goods_receipt_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_inspections (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "goodsReceiptId" text NOT NULL,
    outcome public."GoodsReceiptInspectionOutcome" NOT NULL,
    "inspectedById" text NOT NULL,
    reason text,
    "evidenceNotes" text,
    "inspectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT goods_receipt_inspections_reason_check CHECK (((outcome = 'PASSED'::public."GoodsReceiptInspectionOutcome") OR ((reason IS NOT NULL) AND (char_length(btrim(reason)) > 0))))
);


--
-- Name: goods_receipt_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_lines (
    id text NOT NULL,
    "goodsReceiptId" text NOT NULL,
    "purchaseOrderLineId" text NOT NULL,
    "itemId" text NOT NULL,
    "receivedQuantity" numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    "lineTotal" numeric(14,2) NOT NULL,
    notes text,
    "batchNumber" text,
    "expiryDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "serialNumbers" text[] DEFAULT ARRAY[]::text[] NOT NULL
);


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipts (
    id text NOT NULL,
    "receiptNumber" text NOT NULL,
    "receiptDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."GoodsReceiptStatus" DEFAULT 'DRAFT'::public."GoodsReceiptStatus" NOT NULL,
    notes text,
    "purchaseOrderId" text NOT NULL,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "receivedById" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" character varying(191),
    "payloadHash" character varying(64),
    "finalizedAt" timestamp(3) without time zone,
    "inventoryPostedAt" timestamp(3) without time zone,
    CONSTRAINT goods_receipts_command_evidence_check CHECK (((("idempotencyKey" IS NULL) AND ("payloadHash" IS NULL)) OR (("idempotencyKey" IS NOT NULL) AND ((char_length(btrim(("idempotencyKey")::text)) >= 8) AND (char_length(btrim(("idempotencyKey")::text)) <= 191)) AND (("idempotencyKey")::text ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$'::text) AND ("payloadHash" IS NOT NULL) AND (("payloadHash")::text ~ '^[0-9a-f]{64}$'::text) AND ("finalizedAt" IS NOT NULL))))
);


--
-- Name: hris_attendance_anomalies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_attendance_anomalies (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "importBatchId" text NOT NULL,
    "timeEntryId" text,
    "employeeId" text,
    code text NOT NULL,
    severity text NOT NULL,
    status public."HrisAttendanceAnomalyStatus" DEFAULT 'OPEN'::public."HrisAttendanceAnomalyStatus" NOT NULL,
    detail jsonb,
    "evidenceHash" text NOT NULL,
    "resolvedById" text,
    "resolvedAt" timestamp(3) without time zone,
    "resolutionHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: hris_employment_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_employment_assignments (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "positionId" text NOT NULL,
    "orgUnitId" text NOT NULL,
    type public."HrisEmploymentAssignmentType" DEFAULT 'PRIMARY'::public."HrisEmploymentAssignmentType" NOT NULL,
    status public."HrisEmploymentAssignmentStatus" DEFAULT 'ACTIVE'::public."HrisEmploymentAssignmentStatus" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT hris_employment_assignments_effective_period_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveTo" > "effectiveFrom")))
);


--
-- Name: hris_leave_balance_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_leave_balance_entries (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "leavePolicyId" text NOT NULL,
    "deltaMinutes" integer NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "entryType" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text NOT NULL,
    "sourceHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hris_leave_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_leave_policies (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "countryCode" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "annualEntitlementMinutes" integer NOT NULL,
    "carryOverLimitMinutes" integer DEFAULT 0 NOT NULL,
    "accrualRule" jsonb NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    status public."HrisOperationalStatus" DEFAULT 'DRAFT'::public."HrisOperationalStatus" NOT NULL,
    "preparedById" text NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "sourceHash" text NOT NULL,
    "approvalEvidenceHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: hris_manager_delegations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_manager_delegations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "delegatorEmployeeId" text NOT NULL,
    "delegateEmployeeId" text NOT NULL,
    "scopeOrgUnitId" text,
    authority public."HrisManagerDelegationAuthority" NOT NULL,
    status public."HrisManagerDelegationStatus" DEFAULT 'ACTIVE'::public."HrisManagerDelegationStatus" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone NOT NULL,
    "approvalEvidenceHash" character varying(71) NOT NULL,
    "approvedById" text NOT NULL,
    "reasonHash" character varying(71) NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revocationReasonHash" character varying(71),
    "supersedesDelegationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT hris_manager_delegations_effective_period_check CHECK (("effectiveTo" > "effectiveFrom")),
    CONSTRAINT hris_manager_delegations_hash_check CHECK (((length(btrim(("approvalEvidenceHash")::text)) = 71) AND ("left"(("approvalEvidenceHash")::text, 7) = 'sha256:'::text) AND (length(btrim(("reasonHash")::text)) = 71) AND ("left"(("reasonHash")::text, 7) = 'sha256:'::text) AND (("revocationReasonHash" IS NULL) OR ((length(btrim(("revocationReasonHash")::text)) = 71) AND ("left"(("revocationReasonHash")::text, 7) = 'sha256:'::text))))),
    CONSTRAINT hris_manager_delegations_people_check CHECK (("delegatorEmployeeId" <> "delegateEmployeeId")),
    CONSTRAINT hris_manager_delegations_revocation_check CHECK ((((status = 'ACTIVE'::public."HrisManagerDelegationStatus") AND ("revokedAt" IS NULL) AND ("revocationReasonHash" IS NULL)) OR ((status = ANY (ARRAY['REVOKED'::public."HrisManagerDelegationStatus", 'SUPERSEDED'::public."HrisManagerDelegationStatus"])) AND ("revokedAt" IS NOT NULL) AND ("revocationReasonHash" IS NOT NULL)))),
    CONSTRAINT hris_manager_delegations_supersession_check CHECK ((("supersedesDelegationId" IS NULL) OR ("supersedesDelegationId" <> id)))
);


--
-- Name: hris_org_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_org_units (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type public."HrisOrgUnitType" NOT NULL,
    status public."HrisOrgUnitStatus" DEFAULT 'ACTIVE'::public."HrisOrgUnitStatus" NOT NULL,
    "parentId" text,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT hris_org_units_effective_period_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveTo" > "effectiveFrom"))),
    CONSTRAINT hris_org_units_parent_check CHECK ((("parentId" IS NULL) OR ("parentId" <> id)))
);


--
-- Name: hris_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_positions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "orgUnitId" text NOT NULL,
    "locationId" text,
    code text NOT NULL,
    title text NOT NULL,
    status public."HrisPositionStatus" DEFAULT 'ACTIVE'::public."HrisPositionStatus" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT hris_positions_effective_period_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveTo" > "effectiveFrom")))
);


--
-- Name: hris_public_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_public_holidays (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "calendarId" text NOT NULL,
    "holidayDate" timestamp(3) without time zone NOT NULL,
    name text NOT NULL,
    paid boolean DEFAULT true NOT NULL,
    "sourceHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hris_reporting_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_reporting_relationships (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "managerEmployeeId" text NOT NULL,
    "managerAssignmentId" text NOT NULL,
    "reportEmployeeId" text NOT NULL,
    "reportAssignmentId" text NOT NULL,
    type public."HrisReportingRelationshipType" DEFAULT 'DIRECT'::public."HrisReportingRelationshipType" NOT NULL,
    status public."HrisReportingRelationshipStatus" DEFAULT 'ACTIVE'::public."HrisReportingRelationshipStatus" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "approvalEvidenceHash" character varying(71) NOT NULL,
    "approvedById" text NOT NULL,
    "reasonHash" character varying(71) NOT NULL,
    "supersedesRelationshipId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT hris_reporting_relationships_assignment_check CHECK (("managerAssignmentId" <> "reportAssignmentId")),
    CONSTRAINT hris_reporting_relationships_effective_period_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveTo" > "effectiveFrom"))),
    CONSTRAINT hris_reporting_relationships_hash_check CHECK (((length(btrim(("approvalEvidenceHash")::text)) = 71) AND ("left"(("approvalEvidenceHash")::text, 7) = 'sha256:'::text) AND (length(btrim(("reasonHash")::text)) = 71) AND ("left"(("reasonHash")::text, 7) = 'sha256:'::text))),
    CONSTRAINT hris_reporting_relationships_people_check CHECK (("managerEmployeeId" <> "reportEmployeeId")),
    CONSTRAINT hris_reporting_relationships_supersession_check CHECK ((("supersedesRelationshipId" IS NULL) OR ("supersedesRelationshipId" <> id)))
);


--
-- Name: hris_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_time_entries (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "importBatchId" text NOT NULL,
    "employeeId" text NOT NULL,
    "workDate" timestamp(3) without time zone NOT NULL,
    "scheduledMinutes" integer NOT NULL,
    "workedMinutes" integer NOT NULL,
    "overtimeMinutes" integer DEFAULT 0 NOT NULL,
    "absenceMinutes" integer DEFAULT 0 NOT NULL,
    status public."HrisTimeEntryStatus" DEFAULT 'IMPORTED'::public."HrisTimeEntryStatus" NOT NULL,
    "sourceRecordId" text NOT NULL,
    "sourceHash" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: hris_time_import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_time_import_batches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "sourceSystem" text NOT NULL,
    "sourceFileName" text,
    "sourceHash" text NOT NULL,
    status public."HrisTimeImportStatus" DEFAULT 'RECEIVED'::public."HrisTimeImportStatus" NOT NULL,
    "rowCount" integer NOT NULL,
    "acceptedCount" integer DEFAULT 0 NOT NULL,
    "rejectedCount" integer DEFAULT 0 NOT NULL,
    "importedById" text NOT NULL,
    "validatedById" text,
    "validatedAt" timestamp(3) without time zone,
    "idempotencyKey" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: hris_time_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_time_requests (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "leavePolicyId" text,
    type public."HrisTimeRequestType" NOT NULL,
    status public."HrisTimeRequestStatus" DEFAULT 'REQUESTED'::public."HrisTimeRequestStatus" NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "requestedMinutes" integer NOT NULL,
    "proposedWorkedMinutes" integer,
    "proposedAbsenceMinutes" integer,
    reason text NOT NULL,
    "requestedById" text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    "requestEvidenceHash" text NOT NULL,
    "approvalEvidenceHash" text,
    "sourceHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "decisionBusinessEventId" text
);


--
-- Name: hris_work_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_work_calendars (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "countryCode" text NOT NULL,
    timezone text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status public."HrisOperationalStatus" DEFAULT 'DRAFT'::public."HrisOperationalStatus" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "sourceHash" text NOT NULL,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: hris_work_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hris_work_schedules (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "calendarId" text NOT NULL,
    name text NOT NULL,
    timezone text NOT NULL,
    "weeklyPattern" jsonb NOT NULL,
    "standardWeeklyMinutes" integer NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    status public."HrisOperationalStatus" DEFAULT 'DRAFT'::public."HrisOperationalStatus" NOT NULL,
    "preparedById" text NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "sourceHash" text NOT NULL,
    "approvalEvidenceHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: inventory_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_levels (
    id text NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    "quantityOnHand" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantityReserved" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantityAvailable" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantityInTransit" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantityOnOrder" numeric(12,3) DEFAULT 0 NOT NULL,
    "reorderPoint" numeric(12,3) DEFAULT 0 NOT NULL,
    "averageCost" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalValue" numeric(14,2) DEFAULT 0 NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    "lastCountDate" timestamp(3) without time zone,
    "lastTransactionAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id text NOT NULL,
    type public."TransactionType" NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalCost" numeric(14,2) DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "referenceType" public."TransactionReferenceType",
    "referenceId" text,
    "referenceNumber" text,
    "batchNumber" text,
    "serialNumbers" text[],
    "expiryDate" timestamp(3) without time zone,
    "balanceAfter" numeric(12,3) NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "recordedAt" timestamp(3) without time zone NOT NULL,
    "timeProvenance" public."InventoryTransactionTimeProvenance" NOT NULL,
    "reversalOfTransactionId" text,
    CONSTRAINT inventory_transactions_reversal_control_check CHECK ((("reversalOfTransactionId" IS NULL) OR ("reversalOfTransactionId" <> id)))
);


--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id text NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    "organizationId" text NOT NULL,
    "roleId" text NOT NULL,
    status public."InviteStatus" DEFAULT 'PENDING'::public."InviteStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: item_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_suppliers (
    id text NOT NULL,
    "itemId" text NOT NULL,
    "supplierId" text NOT NULL,
    "supplierSku" text,
    "supplierName" text,
    "isPreferred" boolean DEFAULT false NOT NULL,
    "leadTimeDays" integer,
    "minOrderQuantity" numeric(12,3),
    "unitCost" numeric(12,2),
    "lastPurchaseDate" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id text NOT NULL,
    slug text NOT NULL,
    sku text NOT NULL,
    barcode text,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "descriptionEn" text,
    "descriptionFr" text,
    "imageUrls" text[],
    thumbnail text,
    upc text,
    ean text,
    mpn text,
    isbn text,
    dimensions text,
    weight numeric(12,3),
    color text,
    size text,
    "costPrice" numeric(12,2) DEFAULT 0 NOT NULL,
    "sellingPrice" numeric(12,2) DEFAULT 0 NOT NULL,
    msrp numeric(12,2),
    "trackInventory" boolean DEFAULT true NOT NULL,
    "trackSerialNumbers" boolean DEFAULT false NOT NULL,
    "trackBatches" boolean DEFAULT false NOT NULL,
    "trackExpiry" boolean DEFAULT false NOT NULL,
    "minStockLevel" numeric(12,3) DEFAULT 0 NOT NULL,
    "maxStockLevel" numeric(12,3),
    "reorderLevel" numeric(12,3) DEFAULT 0 NOT NULL,
    "reorderQuantity" numeric(12,3),
    "isActive" boolean DEFAULT true NOT NULL,
    "isDiscontinued" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "categoryId" text,
    "brandId" text,
    "unitId" text,
    "taxRateId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "journalId" text NOT NULL,
    "periodId" text NOT NULL,
    "postingBatchId" text,
    "entryNumber" text NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    status public."JournalEntryStatus" DEFAULT 'DRAFT'::public."JournalEntryStatus" NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    memo text,
    reference text,
    "sourceType" public."AccountingSourceType",
    "sourceId" text,
    "postingPurpose" public."AccountingPostingPurpose",
    "reversalOfEntryId" text,
    "postedAt" timestamp(3) without time zone,
    "postedById" text,
    "reversedAt" timestamp(3) without time zone,
    "reversedById" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: journal_entry_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "journalEntryId" text NOT NULL,
    "accountId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    description text,
    debit numeric(18,2) DEFAULT 0 NOT NULL,
    credit numeric(18,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "exchangeRate" numeric(18,6) DEFAULT 1 NOT NULL,
    "baseDebit" numeric(18,2),
    "baseCredit" numeric(18,2),
    "locationId" text,
    "customerId" text,
    "supplierId" text,
    "itemId" text,
    dimensions jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: journals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journals (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    type public."JournalType" NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "allowManualEntries" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ledger_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_audit_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "postingBatchId" text,
    "journalEntryId" text,
    action text NOT NULL,
    "actorId" text,
    "resourceType" text NOT NULL,
    "resourceId" text,
    message text,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ledger_posting_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_posting_batches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "periodId" text,
    "sourceType" public."AccountingSourceType" NOT NULL,
    "sourceId" text NOT NULL,
    "postingPurpose" public."AccountingPostingPurpose" NOT NULL,
    "idempotencyKey" text NOT NULL,
    "sourceVersion" integer,
    status public."LedgerPostingBatchStatus" DEFAULT 'PENDING'::public."LedgerPostingBatchStatus" NOT NULL,
    "errorMessage" text,
    metadata jsonb,
    "postedAt" timestamp(3) without time zone,
    "reversedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: legacy_production_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_production_batches (
    id text NOT NULL,
    "batchNumber" text NOT NULL,
    "recipeId" text NOT NULL,
    "plannedQuantity" numeric(12,3) NOT NULL,
    "actualQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    status public."ProductionBatchStatus" DEFAULT 'PLANNED'::public."ProductionBatchStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "totalInputCost" numeric(14,2),
    "unitCost" numeric(12,2),
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TABLE legacy_production_batches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legacy_production_batches IS 'Archived production batch records retained after BOM capability retirement on 2026-07-26.';


--
-- Name: legacy_recipe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_recipe_ingredients (
    id text NOT NULL,
    "recipeId" text NOT NULL,
    "itemId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "wastePercent" numeric(5,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TABLE legacy_recipe_ingredients; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legacy_recipe_ingredients IS 'Archived recipe ingredient records retained after BOM capability retirement on 2026-07-26.';


--
-- Name: legacy_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_recipes (
    id text NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "outputItemId" text NOT NULL,
    "outputQuantity" numeric(12,3) NOT NULL,
    "laborCost" numeric(12,2),
    "overheadCost" numeric(12,2),
    version integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TABLE legacy_recipes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legacy_recipes IS 'Archived recipe records retained after BOM capability retirement on 2026-07-26.';


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type public."LocationType" DEFAULT 'WAREHOUSE'::public."LocationType" NOT NULL,
    address text,
    phone text,
    email text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "organizationId" text NOT NULL,
    "managerId" text,
    "allowNegativeStock" boolean DEFAULT false NOT NULL,
    "requiresApproval" boolean DEFAULT false NOT NULL
);


--
-- Name: match_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_records (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text,
    "paymentTransactionId" text,
    "providerEventId" text,
    "statementLineId" text,
    "reconciliationRunId" text,
    "ledgerPostingBatchId" text,
    rule public."MatchRule" NOT NULL,
    status public."MatchStatus" DEFAULT 'CANDIDATE'::public."MatchStatus" NOT NULL,
    confidence numeric(5,2) DEFAULT 0 NOT NULL,
    "amountMatched" numeric(14,2),
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "matchedById" text,
    "matchedAt" timestamp(3) without time zone,
    "correctionOfId" text,
    "correctionReason" text,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: onboarding_import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_import_batches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    target public."OnboardingImportTarget" NOT NULL,
    status public."OnboardingImportStatus" DEFAULT 'UPLOADED'::public."OnboardingImportStatus" NOT NULL,
    "sourceFilename" text NOT NULL,
    "sourceMimeType" text NOT NULL,
    "sourceByteSize" integer NOT NULL,
    "contentHash" text NOT NULL,
    "mappingId" text NOT NULL,
    "mappingVersion" integer NOT NULL,
    "schemaVersion" text NOT NULL,
    "sourceRecordCount" integer DEFAULT 0 NOT NULL,
    "validRecordCount" integer DEFAULT 0 NOT NULL,
    "errorRecordCount" integer DEFAULT 0 NOT NULL,
    "duplicateRecordCount" integer DEFAULT 0 NOT NULL,
    "sourceRequiredFieldTotals" jsonb NOT NULL,
    "preCommitRecordCount" integer,
    "postCommitRecordCount" integer,
    "destinationRequiredTotals" jsonb,
    "committedRecordCount" integer DEFAULT 0 NOT NULL,
    "uploadedById" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validatedAt" timestamp(3) without time zone,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "approvalDigest" text,
    "commitStartedAt" timestamp(3) without time zone,
    "committedAt" timestamp(3) without time zone,
    "replayCount" integer DEFAULT 0 NOT NULL,
    "lastReplayedAt" timestamp(3) without time zone,
    "evidenceManifest" jsonb,
    "evidenceHash" text,
    "lastSafeErrorCode" text,
    "retentionExpiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "riskLevel" public."OnboardingImportRiskLevel" DEFAULT 'STANDARD'::public."OnboardingImportRiskLevel" NOT NULL,
    "riskReasons" text[] NOT NULL
);


--
-- Name: onboarding_import_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_import_issues (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "batchId" text NOT NULL,
    "rowId" text,
    "rowNumber" integer NOT NULL,
    field text,
    severity public."OnboardingImportIssueSeverity" DEFAULT 'ERROR'::public."OnboardingImportIssueSeverity" NOT NULL,
    code text NOT NULL,
    "safeMessage" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: onboarding_import_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_import_mappings (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    target public."OnboardingImportTarget" NOT NULL,
    version integer NOT NULL,
    "schemaVersion" text DEFAULT '1'::text NOT NULL,
    "fieldMap" jsonb NOT NULL,
    "requiredFields" text[] NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: onboarding_import_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_import_rows (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "batchId" text NOT NULL,
    "rowNumber" integer NOT NULL,
    "sourceRowHash" text NOT NULL,
    "businessKey" text,
    "normalizedData" jsonb NOT NULL,
    valid boolean DEFAULT false NOT NULL,
    "commitAttemptedAt" timestamp(3) without time zone,
    "committedRecordId" text,
    "committedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: onboarding_readiness_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_readiness_milestones (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    target public."OnboardingImportTarget" NOT NULL,
    state public."OnboardingReadinessState" DEFAULT 'NOT_STARTED'::public."OnboardingReadinessState" NOT NULL,
    "evidenceBatchId" text,
    "sourceRecordCount" integer DEFAULT 0 NOT NULL,
    "committedCount" integer DEFAULT 0 NOT NULL,
    "blockerCount" integer DEFAULT 0 NOT NULL,
    "waivedById" text,
    "waivedAt" timestamp(3) without time zone,
    "waiverReason" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: organization_accounting_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_accounting_settings (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "accountingEnabled" boolean DEFAULT false NOT NULL,
    "setupStatus" public."AccountingSetupStatus" DEFAULT 'NOT_STARTED'::public."AccountingSetupStatus" NOT NULL,
    "countryPack" text,
    "baseCurrency" text DEFAULT 'XAF'::text NOT NULL,
    "fiscalYearStartMonth" integer DEFAULT 1 NOT NULL,
    "fiscalYearStartDay" integer DEFAULT 1 NOT NULL,
    "inventoryValuationPolicy" text DEFAULT 'WEIGHTED_AVERAGE'::text NOT NULL,
    "roundingMode" text DEFAULT 'HALF_UP'::text NOT NULL,
    "roundingScale" integer DEFAULT 2 NOT NULL,
    "taxRegime" text,
    "setupCompletedAt" timestamp(3) without time zone,
    "setupCompletedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "payrollCnpsFamilyAllowanceSector" public."PayrollCnpsFamilyAllowanceSector",
    "payrollCnpsOccupationalRiskGroup" public."PayrollCnpsOccupationalRiskGroup"
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    industry text,
    country text,
    state text,
    address text,
    currency text DEFAULT 'XAF'::text NOT NULL,
    timezone text DEFAULT 'Africa/Douala'::text NOT NULL,
    "defaultLocale" public."Locale" DEFAULT 'EN'::public."Locale" NOT NULL,
    "inventoryStartDate" timestamp(3) without time zone,
    "fiscalYearStart" text DEFAULT '01-01'::text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "assistedSetupRequested" boolean DEFAULT false NOT NULL,
    "branchCount" text,
    "businessType" text,
    "companySize" text,
    "countryCode" text,
    "onboardingCompletedAt" timestamp(3) without time zone,
    "onboardingSource" text,
    "primaryPain" text,
    "requestedModules" text[] DEFAULT ARRAY[]::text[],
    "setupRole" text,
    "taxIdentifier" text,
    "tradeName" text
);


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_history (
    id text NOT NULL,
    "userId" text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payment_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_exceptions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text,
    "paymentTransactionId" text,
    "providerEventId" text,
    "statementLineId" text,
    "reconciliationRunId" text,
    "suspenseItemId" text,
    type public."PaymentExceptionType" NOT NULL,
    severity public."ExceptionSeverity" DEFAULT 'MEDIUM'::public."ExceptionSeverity" NOT NULL,
    status public."PaymentExceptionStatus" DEFAULT 'OPEN'::public."PaymentExceptionStatus" NOT NULL,
    "ownerId" text,
    "sourceType" text,
    "sourceId" text,
    evidence jsonb,
    "resolutionNotes" text,
    "slaDeadline" timestamp(3) without time zone,
    "escalatedAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_rails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_rails (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    type public."PaymentRailType" NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "countryCode" text,
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "adapterKey" text,
    "isActive" boolean DEFAULT true NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_reconciliation_inbox_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reconciliation_inbox_items (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text,
    source public."PaymentReconciliationInboxSource" NOT NULL,
    status public."PaymentReconciliationInboxStatus" DEFAULT 'RECEIVED'::public."PaymentReconciliationInboxStatus" NOT NULL,
    "idempotencyKey" text NOT NULL,
    "externalId" text,
    "payloadHash" text NOT NULL,
    "payloadSummary" jsonb,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "nextAttemptAt" timestamp(3) without time zone,
    "processedAt" timestamp(3) without time zone,
    "correlationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "leasedBy" text,
    "leaseToken" text
);


--
-- Name: payment_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_refunds (
    id text NOT NULL,
    "refundNumber" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    reason text NOT NULL,
    status public."RefundStatus" DEFAULT 'PENDING'::public."RefundStatus" NOT NULL,
    "organizationId" text NOT NULL,
    "paymentId" text NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processorResponse" text,
    "processedById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "legacyPaymentId" text,
    "providerAccountId" text,
    "ledgerPostingBatchId" text,
    direction public."PaymentDirection" DEFAULT 'INBOUND'::public."PaymentDirection" NOT NULL,
    state public."PaymentTransactionState" DEFAULT 'PENDING'::public."PaymentTransactionState" NOT NULL,
    amount numeric(14,2) NOT NULL,
    "feeAmount" numeric(14,2),
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "providerTransactionId" text,
    "providerReference" text,
    "idempotencyKey" text,
    "sourceType" text,
    "sourceId" text,
    "payloadHash" text,
    "occurredAt" timestamp(3) without time zone,
    "confirmedAt" timestamp(3) without time zone,
    "settledAt" timestamp(3) without time zone,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "providerAuthorityEventId" text
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "paymentNumber" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    method public."PaymentMethod" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "idempotencyKey" text,
    "organizationId" text NOT NULL,
    "salesOrderId" text,
    "purchaseOrderId" text,
    "cashTendered" numeric(14,2),
    "changeGiven" numeric(14,2),
    "cardType" text,
    "cardLast4" text,
    "authorizationCode" text,
    "mobileMoneyProvider" public."MobileMoneyProvider",
    "mobileMoneyPhoneNumber" text,
    "mobileMoneyReference" text,
    "mobileMoneyStatus" text,
    "mobileMoneyFeesAmount" numeric(12,2),
    "bankReference" text,
    "bankName" text,
    "chequeNumber" text,
    "chequeBank" text,
    "chequeDate" timestamp(3) without time zone,
    "transactionId" text,
    "processedAt" timestamp(3) without time zone,
    "processorResponse" text,
    "processedById" text,
    "refundedAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_attendance_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_attendance_snapshots (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollPeriodId" text,
    "employeeId" text NOT NULL,
    status public."PayrollAttendanceSnapshotStatus" DEFAULT 'DRAFT'::public."PayrollAttendanceSnapshotStatus" NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "scheduledMinutes" integer DEFAULT 0 NOT NULL,
    "workedMinutes" integer DEFAULT 0 NOT NULL,
    "overtimeMinutes" integer DEFAULT 0 NOT NULL,
    "absenceMinutes" integer DEFAULT 0 NOT NULL,
    "leaveMinutes" integer DEFAULT 0 NOT NULL,
    "sourceHash" text NOT NULL,
    "frozenById" text,
    "frozenAt" timestamp(3) without time zone,
    "correctedFromId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_contracts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "contractNumber" text NOT NULL,
    type public."PayrollContractType" NOT NULL,
    status public."PayrollContractStatus" DEFAULT 'DRAFT'::public."PayrollContractStatus" NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "baseSalary" numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "workingHoursPerMonth" numeric(8,2),
    classification text,
    echelon text,
    convention text,
    "signedDocumentHash" text,
    "activatedBusinessEventId" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_declaration_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_declaration_evidence (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "declarationId" text NOT NULL,
    transition public."PayrollDeclarationEvidenceTransition" NOT NULL,
    "previousStatus" public."PayrollDeclarationStatus" NOT NULL,
    "nextStatus" public."PayrollDeclarationStatus" NOT NULL,
    authority text NOT NULL,
    "declarationType" text NOT NULL,
    "authorityChannel" text NOT NULL,
    "authorityEnvironment" text DEFAULT 'MANUAL_PORTAL'::text NOT NULL,
    "authorityReference" text,
    "authorityStatus" text NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "submittedById" text,
    "approvedById" text,
    "evidenceCapturedById" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "submittedPayloadHash" text,
    "authorityResponseHash" text,
    "portalReceiptHash" text,
    "supportingFileHash" text,
    "sourceRegisterHash" text,
    "countryPackResolutionHash" text NOT NULL,
    "automationCapabilityStatus" text DEFAULT 'AUTOMATION_BLOCKED'::text NOT NULL,
    "productionSubmissionSupported" boolean DEFAULT false NOT NULL,
    notes text,
    "idempotencyKey" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_declarations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_declarations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollRunId" text NOT NULL,
    authority text NOT NULL,
    "declarationType" text NOT NULL,
    status public."PayrollDeclarationStatus" DEFAULT 'PREPARED'::public."PayrollDeclarationStatus" NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "countryCode" text NOT NULL,
    "countryPackVersion" text NOT NULL,
    "countryPackSchemaVersion" text NOT NULL,
    "countryPackResolutionHash" text NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "payloadHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_employee_balance_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_employee_balance_cases (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "payrollRunId" text NOT NULL,
    "payslipId" text,
    "caseNumber" text NOT NULL,
    "caseType" public."PayrollEmployeeBalanceCaseType" NOT NULL,
    status public."PayrollEmployeeBalanceCaseStatus" DEFAULT 'OPEN'::public."PayrollEmployeeBalanceCaseStatus" NOT NULL,
    amount numeric(14,2) NOT NULL,
    "settledAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "outstandingAmount" numeric(14,2) NOT NULL,
    "sourceNetPayableAmount" numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    reason text NOT NULL,
    "openedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "openedById" text NOT NULL,
    "settledAt" timestamp(3) without time zone,
    "settledById" text,
    "documentHash" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "accountingSourceLinkId" text,
    "openedBusinessEventId" text,
    "idempotencyKey" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_employee_balance_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_employee_balance_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "balanceCaseId" text NOT NULL,
    "eventType" public."PayrollEmployeeBalanceEventType" NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "eventDate" timestamp(3) without time zone NOT NULL,
    "actorId" text NOT NULL,
    method public."PaymentMethod",
    "documentHash" text,
    "evidenceHash" text NOT NULL,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "accountingSourceLinkId" text,
    "businessEventId" text,
    "idempotencyKey" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_employee_rubrique_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_employee_rubrique_assignments (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "rubriqueId" text NOT NULL,
    status public."PayrollRubriqueAssignmentStatus" DEFAULT 'DRAFT'::public."PayrollRubriqueAssignmentStatus" NOT NULL,
    amount numeric(14,2),
    "rateBps" integer,
    quantity numeric(12,3),
    currency text DEFAULT 'XAF'::text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "evidenceDocumentHash" text,
    "approvalBusinessEventId" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_employees (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text,
    "employeeNumber" text NOT NULL,
    "displayName" text NOT NULL,
    "legalName" text,
    status public."PayrollEmployeeStatus" DEFAULT 'DRAFT'::public."PayrollEmployeeStatus" NOT NULL,
    "hireDate" timestamp(3) without time zone NOT NULL,
    "terminationDate" timestamp(3) without time zone,
    "countryCode" text,
    "locationId" text,
    department text,
    "jobTitle" text,
    "costCenter" text,
    "taxIdentifierMasked" text,
    "taxIdentifierHash" text,
    "socialIdentifierMasked" text,
    "socialIdentifierHash" text,
    "paymentMethod" public."PaymentMethod",
    "bankAccountMasked" text,
    "bankAccountHash" text,
    "mobileMoneyProvider" text,
    "mobileMoneyPhoneMasked" text,
    "mobileMoneyPhoneHash" text,
    "paymentDestinationHash" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_payment_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_payment_allocations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollPaymentBatchId" text NOT NULL,
    "employeeId" text NOT NULL,
    "payslipId" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_payment_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_payment_batches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollRunId" text NOT NULL,
    "batchNumber" text NOT NULL,
    status public."PayrollPaymentBatchStatus" DEFAULT 'DRAFT'::public."PayrollPaymentBatchStatus" NOT NULL,
    method public."PaymentMethod" NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" text,
    "bankFileHash" text,
    "documentHash" text,
    "evidenceHash" text,
    "requestedById" text NOT NULL,
    "approvedById" text,
    "releasedById" text,
    "approvedAt" timestamp(3) without time zone,
    "releasedAt" timestamp(3) without time zone,
    "ledgerPostingBatchId" text,
    "postedBusinessEventId" text,
    "paymentTransactionId" text,
    "paymentExceptionId" text,
    "reconciliationStatus" text,
    notes text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_payment_destination_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_payment_destination_change_requests (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    status public."PayrollPaymentDestinationChangeStatus" DEFAULT 'REQUESTED'::public."PayrollPaymentDestinationChangeStatus" NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "bankAccountMasked" text,
    "bankAccountHash" text,
    "mobileMoneyProvider" text,
    "mobileMoneyPhoneMasked" text,
    "mobileMoneyPhoneHash" text,
    "paymentDestinationHash" text NOT NULL,
    "requestedById" text NOT NULL,
    "approvedById" text,
    "rejectedById" text,
    "appliedById" text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "appliedAt" timestamp(3) without time zone,
    "requestReason" text NOT NULL,
    "decisionReason" text,
    "evidenceDocumentHash" text NOT NULL,
    "approvalEvidenceHash" text,
    "requestBusinessEventId" text,
    "approvalBusinessEventId" text,
    "appliedBusinessEventId" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_payslip_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_payslip_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payslipId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    category public."PayrollPayslipLineCategory" NOT NULL,
    "baseAmount" numeric(14,2),
    "rateBps" integer,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "sourceType" text,
    "sourceId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_payslips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_payslips (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollRunId" text NOT NULL,
    "runLineId" text NOT NULL,
    "employeeId" text NOT NULL,
    "payslipNumber" text NOT NULL,
    status public."PayrollPayslipStatus" DEFAULT 'DRAFT'::public."PayrollPayslipStatus" NOT NULL,
    "issuedAt" timestamp(3) without time zone,
    "voidedAt" timestamp(3) without time zone,
    "countryCode" text NOT NULL,
    "countryPackVersion" text NOT NULL,
    "countryPackSchemaVersion" text NOT NULL,
    "countryPackResolutionHash" text NOT NULL,
    "ruleSetHash" text NOT NULL,
    "grossAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "employeeDeductionAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "employerChargeAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "netPayableAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "documentHash" text NOT NULL,
    "archiveUri" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "emittedBusinessEventId" text
);


--
-- Name: payroll_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_periods (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "accountingPeriodId" text,
    name text NOT NULL,
    frequency public."PayrollFrequency" DEFAULT 'MONTHLY'::public."PayrollFrequency" NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "payDate" timestamp(3) without time zone NOT NULL,
    status public."PayrollPeriodStatus" DEFAULT 'OPEN'::public."PayrollPeriodStatus" NOT NULL,
    "countryCode" text NOT NULL,
    "countryPackVersion" text,
    "countryPackSchemaVersion" text,
    "countryPackResolutionHash" text,
    "countryPackCapabilityStatus" text,
    "inputLockedAt" timestamp(3) without time zone,
    "inputLockedById" text,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    "closedAt" timestamp(3) without time zone,
    "closedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_rubriques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_rubriques (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    kind public."PayrollRubriqueKind" NOT NULL,
    "valueType" public."PayrollRubriqueValueType" NOT NULL,
    status public."PayrollRubriqueStatus" DEFAULT 'DRAFT'::public."PayrollRubriqueStatus" NOT NULL,
    "taxableBase" boolean DEFAULT false NOT NULL,
    "socialBase" boolean DEFAULT false NOT NULL,
    "employerCharge" boolean DEFAULT false NOT NULL,
    "payslipLabel" text,
    "postingDebitAccountCode" text,
    "postingCreditAccountCode" text,
    "countryCode" text,
    "statutoryParameterPath" text,
    "countryPackVersion" text,
    "countryPackSchemaVersion" text,
    "countryPackResolutionHash" text,
    "countryPackLegalRef" text,
    "countryPackVerificationStatus" text,
    "countryPackCapabilityStatus" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_run_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_run_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollRunId" text NOT NULL,
    "employeeId" text NOT NULL,
    "contractId" text NOT NULL,
    "attendanceSnapshotId" text,
    "grossAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "taxableBaseAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "socialBaseAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "employeeDeductionAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "employerChargeAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "netPayableAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "calculationSnapshot" jsonb NOT NULL,
    "ruleProvenance" jsonb NOT NULL,
    "anomalyFlags" jsonb,
    "documentHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_run_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_run_transitions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollRunId" text NOT NULL,
    sequence integer NOT NULL,
    "fromStatus" public."PayrollRunStatus",
    "toStatus" public."PayrollRunStatus" NOT NULL,
    "fromVersion" integer,
    "toVersion" integer,
    "actorId" text,
    "transitionedAt" timestamp(3) without time zone,
    "businessEventId" text,
    "idempotencyKey" text,
    "payloadHash" text,
    origin public."PayrollRunTransitionOrigin" DEFAULT 'RUNTIME'::public."PayrollRunTransitionOrigin" NOT NULL,
    "evidenceStatus" public."PayrollRunTransitionEvidenceStatus" DEFAULT 'VERIFIED'::public."PayrollRunTransitionEvidenceStatus" NOT NULL,
    "legacyNote" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payroll_run_transitions_evidence_check CHECK ((((origin = 'RUNTIME'::public."PayrollRunTransitionOrigin") AND ("evidenceStatus" = 'VERIFIED'::public."PayrollRunTransitionEvidenceStatus") AND ("fromStatus" IS NOT NULL) AND ("fromVersion" IS NOT NULL) AND ("toVersion" = ("fromVersion" + 1)) AND ("actorId" IS NOT NULL) AND ("transitionedAt" IS NOT NULL) AND ("businessEventId" IS NOT NULL) AND ("idempotencyKey" IS NOT NULL) AND ("payloadHash" IS NOT NULL) AND ("legacyNote" IS NULL) AND ((("fromStatus" = 'CALCULATED'::public."PayrollRunStatus") AND ("toStatus" = 'REVIEWED'::public."PayrollRunStatus")) OR (("fromStatus" = 'REVIEWED'::public."PayrollRunStatus") AND ("toStatus" = 'APPROVED'::public."PayrollRunStatus")) OR (("fromStatus" = 'APPROVED'::public."PayrollRunStatus") AND ("toStatus" = 'EMITTED'::public."PayrollRunStatus")) OR (("fromStatus" = 'EMITTED'::public."PayrollRunStatus") AND ("toStatus" = 'POSTED'::public."PayrollRunStatus")))) OR ((origin = 'LEGACY_BACKFILL'::public."PayrollRunTransitionOrigin") AND ("evidenceStatus" = 'LEGACY_PARTIAL_EVIDENCE'::public."PayrollRunTransitionEvidenceStatus") AND ("fromStatus" IS NULL) AND ("fromVersion" IS NULL) AND ("idempotencyKey" IS NULL) AND ("payloadHash" IS NULL) AND ("legacyNote" IS NOT NULL) AND ("toStatus" = ANY (ARRAY['REVIEWED'::public."PayrollRunStatus", 'APPROVED'::public."PayrollRunStatus", 'EMITTED'::public."PayrollRunStatus", 'POSTED'::public."PayrollRunStatus"]))))),
    CONSTRAINT payroll_run_transitions_sequence_check CHECK ((sequence > 0)),
    CONSTRAINT payroll_run_transitions_version_check CHECK (((("fromVersion" IS NULL) OR ("fromVersion" > 0)) AND (("toVersion" IS NULL) OR ("toVersion" > 0))))
);


--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_runs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "payrollPeriodId" text NOT NULL,
    "originalRunId" text,
    "runNumber" text NOT NULL,
    "runType" public."PayrollRunType" DEFAULT 'ORDINARY'::public."PayrollRunType" NOT NULL,
    status public."PayrollRunStatus" DEFAULT 'DRAFT'::public."PayrollRunStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "countryCode" text NOT NULL,
    "countryPackVersion" text NOT NULL,
    "countryPackSchemaVersion" text NOT NULL,
    "countryPackResolutionHash" text NOT NULL,
    "countryPackCapabilityStatus" text NOT NULL,
    "ruleSetHash" text NOT NULL,
    "calculationHash" text NOT NULL,
    "attendanceSnapshotHash" text NOT NULL,
    "grossAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "employeeDeductionAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "employerChargeAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "netPayableAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "idempotencyKey" text,
    "documentHash" text,
    "evidenceHash" text,
    "ledgerPostingBatchId" text,
    "postedBusinessEventId" text,
    "journalEntryId" text,
    "accountingSourceLinkId" text,
    "preparedById" text,
    "reviewedById" text,
    "approvedById" text,
    "emittedById" text,
    "postedById" text,
    "approvedAt" timestamp(3) without time zone,
    "emittedAt" timestamp(3) without time zone,
    "postedAt" timestamp(3) without time zone,
    "archivedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBusinessEventId" text,
    "approvedBusinessEventId" text,
    "emittedBusinessEventId" text
);


--
-- Name: payroll_salary_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_salary_change_requests (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "employeeId" text NOT NULL,
    "sourceContractId" text NOT NULL,
    "supersedingContractId" text,
    status public."PayrollSalaryChangeStatus" DEFAULT 'REQUESTED'::public."PayrollSalaryChangeStatus" NOT NULL,
    "currentBaseSalary" numeric(14,2) NOT NULL,
    "proposedBaseSalary" numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "requestedById" text NOT NULL,
    "approvedById" text,
    "rejectedById" text,
    "appliedById" text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "appliedAt" timestamp(3) without time zone,
    "requestReason" text NOT NULL,
    "decisionReason" text,
    "evidenceDocumentHash" text NOT NULL,
    "approvalEvidenceHash" text,
    "requestBusinessEventId" text,
    "approvalBusinessEventId" text,
    "appliedBusinessEventId" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: picture_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.picture_assets (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text NOT NULL,
    "entityType" text DEFAULT 'item'::text NOT NULL,
    "providerKey" text,
    "providerUrl" text,
    "encryptionKey" text NOT NULL,
    "encryptionIv" text NOT NULL,
    "encryptionTag" text NOT NULL,
    "mimeType" text NOT NULL,
    "byteLength" integer NOT NULL,
    sha256 text NOT NULL,
    status text DEFAULT 'uploading'::text NOT NULL,
    "attachedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_cash_shortage_worker_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_cash_shortage_worker_checkpoints (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "checkKey" text NOT NULL,
    "workerKey" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "recordedFromInclusive" timestamp(3) without time zone NOT NULL,
    "recordedThroughExclusive" timestamp(3) without time zone NOT NULL,
    cursor jsonb,
    "lastProcessedCursor" jsonb,
    attempt integer DEFAULT 0 NOT NULL,
    "leaseOwnerId" text,
    "leaseToken" text,
    "leaseExpiresAt" timestamp(3) without time zone,
    "lastErrorCode" text,
    "lastErrorMessage" text,
    "nextAttemptAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "deadLetteredAt" timestamp(3) without time zone,
    "deadLetterReason" text,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT pos_cash_shortage_worker_checkpoints_attempt_check CHECK ((attempt >= 0)),
    CONSTRAINT pos_cash_shortage_worker_checkpoints_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'LEASED'::text, 'RETRY_SCHEDULED'::text, 'COMPLETED'::text, 'DEAD_LETTERED'::text]))),
    CONSTRAINT pos_cash_shortage_worker_checkpoints_window_check CHECK (("recordedFromInclusive" < "recordedThroughExclusive"))
);


--
-- Name: pos_checkout_workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_checkout_workspaces (
    "sessionId" text NOT NULL,
    "organizationId" text NOT NULL,
    "actorId" text NOT NULL,
    "leaseId" text,
    "leaseExpiresAt" timestamp(3) without time zone,
    "pendingRequest" jsonb,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_commit_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_commit_results (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "locationId" text NOT NULL,
    "terminalId" text NOT NULL,
    "sessionId" text NOT NULL,
    "salesOrderId" text NOT NULL,
    "actorId" text NOT NULL,
    "clientCommitId" character varying(191) NOT NULL,
    "requestHash" character varying(64) NOT NULL,
    "requestSchemaVersion" integer DEFAULT 1 NOT NULL,
    status public."POSCommitResultStatus" DEFAULT 'CLAIMED'::public."POSCommitResultStatus" NOT NULL,
    "resultEnvelope" jsonb,
    "resultHash" character varying(64),
    "committedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT pos_commit_results_request_identity_check CHECK ((((char_length(btrim(("clientCommitId")::text)) >= 8) AND (char_length(btrim(("clientCommitId")::text)) <= 191)) AND (("clientCommitId")::text ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$'::text) AND (("requestHash")::text ~ '^[0-9a-f]{64}$'::text) AND ("requestSchemaVersion" > 0))),
    CONSTRAINT pos_commit_results_result_hash_check CHECK ((("resultHash" IS NULL) OR (("resultHash")::text ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT pos_commit_results_state_shape_check CHECK ((((status = 'CLAIMED'::public."POSCommitResultStatus") AND ("resultEnvelope" IS NULL) AND ("resultHash" IS NULL) AND ("committedAt" IS NULL) AND ("completedAt" IS NULL)) OR ((status = 'COMMITTED'::public."POSCommitResultStatus") AND (jsonb_typeof("resultEnvelope") = 'object'::text) AND ("resultHash" IS NOT NULL) AND ("committedAt" IS NOT NULL) AND ("completedAt" IS NULL)) OR ((status = 'COMPLETED'::public."POSCommitResultStatus") AND (jsonb_typeof("resultEnvelope") = 'object'::text) AND ("resultHash" IS NOT NULL) AND ("committedAt" IS NOT NULL) AND ("completedAt" IS NOT NULL) AND ("completedAt" >= "committedAt"))))
);


--
-- Name: pos_offline_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_offline_devices (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "locationId" text NOT NULL,
    "terminalId" text NOT NULL,
    "deviceLabel" text NOT NULL,
    "deviceFingerprintHash" text NOT NULL,
    "publicKeyFingerprint" text,
    "signingPublicKeyPem" text,
    "policySnapshotHash" text,
    "sourceSnapshotHash" text,
    "policyExpiresAt" timestamp(3) without time zone,
    status public."POSOfflineDeviceStatus" DEFAULT 'ACTIVE'::public."POSOfflineDeviceStatus" NOT NULL,
    "lastSequence" integer DEFAULT 0 NOT NULL,
    "highWaterHash" text,
    "enrolledById" text,
    "enrolledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedById" text,
    "revokedAt" timestamp(3) without time zone,
    "revocationReason" text,
    "lastSeenAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_offline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_offline_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "deviceId" text NOT NULL,
    "terminalId" text NOT NULL,
    "locationId" text NOT NULL,
    "sessionId" text,
    "syncBatchId" text,
    "businessEventId" text,
    "eventType" public."POSOfflineEventType" NOT NULL,
    "schemaVersion" integer DEFAULT 1 NOT NULL,
    "deviceSeq" integer NOT NULL,
    "idempotencyKey" text NOT NULL,
    "provisionalReference" text,
    "payloadHash" text NOT NULL,
    "prevHash" text,
    "entryHash" text NOT NULL,
    signature text,
    "capturedAtDevice" timestamp(3) without time zone NOT NULL,
    "receivedAtServer" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."POSOfflineEventStatus" DEFAULT 'PENDING_REPLAY'::public."POSOfflineEventStatus" NOT NULL,
    payload jsonb NOT NULL,
    "policySnapshotHash" text,
    "sourceSnapshotHash" text,
    "postingBatchId" text,
    "documentHash" text,
    "blockerCode" text,
    "blockerMessage" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_offline_sync_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_offline_sync_batches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "deviceId" text NOT NULL,
    "terminalId" text NOT NULL,
    "locationId" text NOT NULL,
    "actorId" text,
    status public."POSOfflineSyncBatchStatus" DEFAULT 'RECEIVED'::public."POSOfflineSyncBatchStatus" NOT NULL,
    "firstSequence" integer,
    "lastSequence" integer,
    "eventCount" integer DEFAULT 0 NOT NULL,
    "acceptedCount" integer DEFAULT 0 NOT NULL,
    "duplicateCount" integer DEFAULT 0 NOT NULL,
    "conflictCount" integer DEFAULT 0 NOT NULL,
    "payloadHash" text,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_offline_sync_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_offline_sync_certificates (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "deviceId" text NOT NULL,
    "terminalId" text NOT NULL,
    "locationId" text NOT NULL,
    status public."POSOfflineSyncCertificateStatus" DEFAULT 'OPEN'::public."POSOfflineSyncCertificateStatus" NOT NULL,
    "certificationScope" text DEFAULT 'DEVICE'::text NOT NULL,
    "lastCertifiedSequence" integer DEFAULT 0 NOT NULL,
    "eventCount" integer DEFAULT 0 NOT NULL,
    "acceptedCount" integer DEFAULT 0 NOT NULL,
    "conflictCount" integer DEFAULT 0 NOT NULL,
    "pendingReplayCount" integer DEFAULT 0 NOT NULL,
    "closeBlocker" boolean DEFAULT true NOT NULL,
    "blockerCode" text,
    "blockerMessage" text,
    "certificateHash" text,
    "certifiedAt" timestamp(3) without time zone,
    "certifiedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_offline_sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_offline_sync_conflicts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "deviceId" text NOT NULL,
    "eventId" text,
    "syncBatchId" text,
    "conflictType" public."POSOfflineSyncConflictType" NOT NULL,
    severity public."POSOfflineSyncConflictSeverity" DEFAULT 'HIGH'::public."POSOfflineSyncConflictSeverity" NOT NULL,
    status public."POSOfflineSyncConflictStatus" DEFAULT 'OPEN'::public."POSOfflineSyncConflictStatus" NOT NULL,
    "expectedSequence" integer,
    "actualSequence" integer,
    "expectedHash" text,
    "actualHash" text,
    "existingPayloadHash" text,
    "incomingPayloadHash" text,
    message text NOT NULL,
    "resolutionNote" text,
    "resolvedById" text,
    "resolvedAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_sessions (
    id text NOT NULL,
    "sessionNumber" text NOT NULL,
    status public."POSSessionStatus" DEFAULT 'ACTIVE'::public."POSSessionStatus" NOT NULL,
    "startTime" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endTime" timestamp(3) without time zone,
    "terminalId" text NOT NULL,
    "locationId" text NOT NULL,
    "userId" text NOT NULL,
    "openingBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "closingBalance" numeric(14,2),
    "expectedBalance" numeric(14,2),
    variance numeric(14,2),
    "totalSales" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalTax" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalDiscount" numeric(14,2) DEFAULT 0 NOT NULL,
    "transactionCount" integer DEFAULT 0 NOT NULL,
    "cashTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "cardTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "mobileMoneyTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "bankTransferTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "creditTotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "organizationId" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pos_terminals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_terminals (
    id text NOT NULL,
    "terminalNumber" text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "hasCashDrawer" boolean DEFAULT true NOT NULL,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "currentSessionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: posting_rule_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posting_rule_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "postingRuleId" text NOT NULL,
    "accountId" text,
    "lineNumber" integer NOT NULL,
    side public."PostingRuleLineSide" NOT NULL,
    "mappingKey" text,
    "amountSource" public."PostingRuleAmountSource" NOT NULL,
    multiplier numeric(10,4) DEFAULT 1 NOT NULL,
    condition jsonb,
    description text,
    dimensions jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: posting_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posting_rules (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    code text NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "descriptionEn" text,
    "descriptionFr" text,
    "sourceType" public."AccountingSourceType" NOT NULL,
    "postingPurpose" public."AccountingPostingPurpose" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    "effectiveFrom" timestamp(3) without time zone,
    "effectiveTo" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: provider_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_accounts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "paymentRailId" text NOT NULL,
    "providerCode" text NOT NULL,
    "displayName" text NOT NULL,
    status public."ProviderAccountStatus" DEFAULT 'DRAFT'::public."ProviderAccountStatus" NOT NULL,
    "countryCode" text,
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "externalAccountMasked" text,
    "externalAccountHash" text NOT NULL,
    "externalMerchantIdHash" text,
    "msisdnMasked" text,
    "msisdnHash" text,
    "settlementLagDays" integer DEFAULT 0 NOT NULL,
    "statementSource" text,
    metadata jsonb,
    "archivedAt" timestamp(3) without time zone,
    "legalHoldAt" timestamp(3) without time zone,
    "settlementLedgerAccountId" text,
    "suspenseLedgerAccountId" text,
    "feeLedgerAccountId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: provider_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "providerEventId" text NOT NULL,
    "providerTransactionId" text,
    "providerReference" text,
    "eventType" text NOT NULL,
    status public."ProviderEventStatus" DEFAULT 'RECEIVED'::public."ProviderEventStatus" NOT NULL,
    direction public."PaymentDirection",
    amount numeric(14,2),
    "feeAmount" numeric(14,2),
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "occurredAt" timestamp(3) without time zone,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "idempotencyKey" text,
    "correlationId" text,
    "traceId" text,
    "rawPayload" jsonb NOT NULL,
    "redactedPayload" jsonb,
    "rawPayloadHash" text NOT NULL,
    "headersHash" text,
    "signatureHash" text,
    "signatureValid" boolean DEFAULT false NOT NULL,
    "providerCustomerReferenceMasked" text,
    "providerCustomerReferenceHash" text,
    "archivedAt" timestamp(3) without time zone,
    "legalHoldAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: public_identity_abuse_buckets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_identity_abuse_buckets (
    id text NOT NULL,
    scope text NOT NULL,
    "subjectHash" text NOT NULL,
    "windowStartedAt" timestamp(3) without time zone NOT NULL,
    "requestCount" integer DEFAULT 0 NOT NULL,
    "blockedUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: public_receipt_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_receipt_access_tokens (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "salesOrderId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "jtiHash" text NOT NULL,
    status public."PublicReceiptAccessTokenStatus" DEFAULT 'ACTIVE'::public."PublicReceiptAccessTokenStatus" NOT NULL,
    "issuedById" text,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedById" text,
    "revokedAt" timestamp(3) without time zone,
    "revocationReason" text,
    "lastAccessedAt" timestamp(3) without time zone,
    "accessCount" integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: purchase_order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_lines (
    id text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    "itemId" text NOT NULL,
    "orderedQuantity" numeric(12,3) NOT NULL,
    "receivedQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    "taxRate" numeric(6,3) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(14,2) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    status public."PurchaseOrderStatus" DEFAULT 'DRAFT'::public."PurchaseOrderStatus" NOT NULL,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expectedDeliveryDate" timestamp(3) without time zone,
    "actualDeliveryDate" timestamp(3) without time zone,
    "paymentTerms" text,
    notes text,
    "internalNotes" text,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "shippingCost" numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "supplierId" text NOT NULL,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: purchase_return_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_return_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "purchaseReturnId" text NOT NULL,
    "sourceGoodsReceiptLineId" text NOT NULL,
    "sourcePurchaseOrderLineId" text NOT NULL,
    "itemId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "invoicedQuantity" numeric(12,3) NOT NULL,
    "uninvoicedQuantity" numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    "inventoryAmount" numeric(14,2) NOT NULL,
    "supplierClaimAmount" numeric(14,2) NOT NULL,
    "grniAmount" numeric(14,2) NOT NULL,
    "inventoryTransactionId" text NOT NULL,
    "evidenceHash" character varying(71) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT purchase_return_amount_split CHECK ((("inventoryAmount" >= (0)::numeric) AND ("supplierClaimAmount" >= (0)::numeric) AND ("grniAmount" >= (0)::numeric) AND (("supplierClaimAmount" + "grniAmount") = "inventoryAmount"))),
    CONSTRAINT purchase_return_positive_quantity CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_return_quantity_split CHECK ((("invoicedQuantity" >= (0)::numeric) AND ("uninvoicedQuantity" >= (0)::numeric) AND (("invoicedQuantity" + "uninvoicedQuantity") = quantity)))
);


--
-- Name: purchase_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_returns (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    "goodsReceiptId" text NOT NULL,
    "supplierId" text NOT NULL,
    "returnNumber" text NOT NULL,
    direction public."PurchaseCorrectionDirection" DEFAULT 'CORRECTION'::public."PurchaseCorrectionDirection" NOT NULL,
    "reversalOfPurchaseReturnId" text,
    reason text NOT NULL,
    "idempotencyKey" character varying(191) NOT NULL,
    "payloadHash" character varying(71) NOT NULL,
    "documentHash" character varying(71) NOT NULL,
    "evidenceHash" character varying(71) NOT NULL,
    "inventoryBusinessEventId" text NOT NULL,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "postedById" text NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: reconciliation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_runs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "paymentRailId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "accountingPeriodId" text,
    "businessDate" timestamp(3) without time zone NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    status public."ReconciliationRunStatus" DEFAULT 'DRAFT'::public."ReconciliationRunStatus" NOT NULL,
    "totalInternalAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalExternalAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "matchedAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "suspenseAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "exceptionCount" integer DEFAULT 0 NOT NULL,
    "matchCount" integer DEFAULT 0 NOT NULL,
    "runById" text,
    "signedById" text,
    "signedAt" timestamp(3) without time zone,
    "certificateHash" text,
    "certificatePayload" jsonb,
    "invariantResult" jsonb,
    "correlationId" text,
    metadata jsonb,
    "voidedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: referral_attribution_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_attribution_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "attributionId" text NOT NULL,
    "targetOrganizationId" text,
    "eventType" public."ReferralAttributionEventType" NOT NULL,
    "sourceEventKey" text NOT NULL,
    "subjectHash" text,
    "payloadHash" text NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT referral_attribution_events_hash_check CHECK ((("payloadHash" ~ '^[0-9a-f]{64}$'::text) AND (("subjectHash" IS NULL) OR ("subjectHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT referral_attribution_events_key_check CHECK (((length(btrim("sourceEventKey")) >= 1) AND (length(btrim("sourceEventKey")) <= 191))),
    CONSTRAINT referral_attribution_events_metadata_check CHECK (((metadata IS NULL) OR (jsonb_typeof(metadata) = 'object'::text)))
);


--
-- Name: referral_attributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_attributions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "statementSnapshotId" text,
    "sourceType" public."ReferralAttributionSource" NOT NULL,
    "sourceId" text NOT NULL,
    "referralCode" text NOT NULL,
    campaign text NOT NULL,
    channel text,
    "createdById" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT referral_attributions_code_check CHECK (("referralCode" ~ '^[A-Za-z0-9_-]{12,64}$'::text)),
    CONSTRAINT referral_attributions_hash_check CHECK (("evidenceHash" ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT referral_attributions_source_check CHECK (((("sourceType" = 'CUSTOMER_STATEMENT'::public."ReferralAttributionSource") AND ("statementSnapshotId" IS NOT NULL) AND ("sourceId" = "statementSnapshotId")) OR ("sourceType" = 'ACCOUNTANT_INVITE'::public."ReferralAttributionSource"))),
    CONSTRAINT referral_attributions_text_check CHECK ((((length(btrim("sourceId")) >= 1) AND (length(btrim("sourceId")) <= 191)) AND ((length(btrim(campaign)) >= 1) AND (length(btrim(campaign)) <= 120)) AND ((length(btrim("createdById")) >= 1) AND (length(btrim("createdById")) <= 191))))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    code text NOT NULL,
    description text,
    "nameEn" text NOT NULL,
    "nameFr" text,
    permissions text[],
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: sales_order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_order_lines (
    id text NOT NULL,
    "salesOrderId" text NOT NULL,
    "itemId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    "taxRate" numeric(6,3) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(14,2) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reservedQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "deliveredQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "billedQuantity" numeric(12,3) DEFAULT 0 NOT NULL
);


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_orders (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    status public."SalesOrderStatus" DEFAULT 'DRAFT'::public."SalesOrderStatus" NOT NULL,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone,
    notes text,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "shippingCost" numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "customerId" text NOT NULL,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "terminalId" text,
    "sessionId" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    channel public."SalesOrderChannel" DEFAULT 'POS'::public."SalesOrderChannel" NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    "deliveryAddress" jsonb,
    "priceTaxSnapshotHash" character varying(64),
    "confirmedAt" timestamp(3) without time zone,
    "confirmedById" text,
    "deliveredAt" timestamp(3) without time zone,
    "deliveredById" text,
    "posCartState" public."POSCartState" DEFAULT 'ACTIVE'::public."POSCartState" NOT NULL
);


--
-- Name: serial_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.serial_numbers (
    id text NOT NULL,
    "serialNumber" text NOT NULL,
    status public."SerialStatus" DEFAULT 'AVAILABLE'::public."SerialStatus" NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text,
    "organizationId" text NOT NULL,
    "batchNumber" text,
    "expiryDate" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "ipAddress" text,
    token text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userAgent" text,
    "assuranceVerifiedAt" timestamp(3) without time zone,
    "assuranceMethod" text,
    "assuranceOrganizationId" text,
    "assuranceLevel" integer DEFAULT 0 NOT NULL,
    "assuranceFailureCount" integer DEFAULT 0 NOT NULL,
    "assuranceLockedUntil" timestamp(3) without time zone
);


--
-- Name: settlement_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_accounts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "ledgerAccountId" text,
    "accountReferenceMasked" text,
    "accountReferenceHash" text,
    "approvalStatus" public."SettlementAccountApprovalStatus" DEFAULT 'PENDING'::public."SettlementAccountApprovalStatus" NOT NULL,
    "requestedById" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: statement_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statement_files (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "sourceType" text NOT NULL,
    "fileName" text,
    "fileHash" text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    status public."StatementFileStatus" DEFAULT 'IMPORTED'::public."StatementFileStatus" NOT NULL,
    "importedById" text,
    "importedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "correlationId" text,
    "encryptedObjectKey" text,
    metadata jsonb,
    "archivedAt" timestamp(3) without time zone,
    "legalHoldAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: statement_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statement_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "statementFileId" text NOT NULL,
    "providerAccountId" text NOT NULL,
    fingerprint text NOT NULL,
    "lineNumber" integer,
    "providerTransactionId" text,
    "providerReference" text,
    direction public."StatementLineDirection" DEFAULT 'UNKNOWN'::public."StatementLineDirection" NOT NULL,
    status public."StatementLineStatus" DEFAULT 'UNMATCHED'::public."StatementLineStatus" NOT NULL,
    amount numeric(14,2) NOT NULL,
    "feeAmount" numeric(14,2),
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "postedAt" timestamp(3) without time zone,
    description text,
    "counterpartyMasked" text,
    "counterpartyHash" text,
    "rawLineHash" text,
    metadata jsonb,
    "archivedAt" timestamp(3) without time zone,
    "legalHoldAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_adjustment_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustment_lines (
    id text NOT NULL,
    "adjustmentId" text NOT NULL,
    "itemId" text NOT NULL,
    "systemQuantity" numeric(12,3) NOT NULL,
    "actualQuantity" numeric(12,3) NOT NULL,
    "adjustedQuantity" numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2),
    "totalCost" numeric(14,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "evidenceHash" text,
    metadata jsonb,
    "stockCountLineId" text
);


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustments (
    id text NOT NULL,
    "adjustmentNumber" text NOT NULL,
    type public."AdjustmentType" NOT NULL,
    reason text NOT NULL,
    status public."AdjustmentStatus" DEFAULT 'DRAFT'::public."AdjustmentStatus" NOT NULL,
    "adjustmentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "documentHash" text,
    "evidenceHash" text,
    "ledgerPostingBatchId" text,
    metadata jsonb,
    "postedBusinessEventId" text,
    "sourceCountSessionId" text,
    "correctionKind" public."StockAdjustmentCorrectionKind",
    "reversalOfAdjustmentId" text,
    CONSTRAINT stock_adjustments_reversal_control_check CHECK (((("reversalOfAdjustmentId" IS NULL) AND ("correctionKind" IS NULL)) OR (("reversalOfAdjustmentId" IS NOT NULL) AND ("reversalOfAdjustmentId" <> id) AND ("correctionKind" = 'REVERSAL'::public."StockAdjustmentCorrectionKind") AND ("createdById" IS NOT NULL) AND ("approvedById" IS NOT NULL) AND ("createdById" <> "approvedById") AND (length(btrim(reason)) > 0))))
);


--
-- Name: stock_count_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_count_lines (
    id text NOT NULL,
    "stockCountSessionId" text NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    "systemQuantity" numeric(12,3) NOT NULL,
    "countedQuantity" numeric(12,3),
    "varianceQuantity" numeric(12,3),
    "unitCost" numeric(12,2),
    "varianceValue" numeric(14,2),
    "reasonCode" text,
    "evidenceHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_count_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_count_sessions (
    id text NOT NULL,
    "countNumber" text NOT NULL,
    status public."StockCountStatus" DEFAULT 'DRAFT'::public."StockCountStatus" NOT NULL,
    "countDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "snapshotHash" text,
    "countSheetHash" text,
    notes text,
    metadata jsonb,
    "locationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "submittedById" text,
    "submittedAt" timestamp(3) without time zone,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "postedById" text,
    "postedAt" timestamp(3) without time zone,
    "postedBusinessEventId" text,
    "postedAdjustmentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_transfer_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfer_lines (
    id text NOT NULL,
    "transferId" text NOT NULL,
    "itemId" text NOT NULL,
    "requestedQuantity" numeric(12,3) NOT NULL,
    "shippedQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "receivedQuantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "unitCost" numeric(12,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfers (
    id text NOT NULL,
    "transferNumber" text NOT NULL,
    status public."TransferStatus" DEFAULT 'DRAFT'::public."TransferStatus" NOT NULL,
    "transferDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expectedDate" timestamp(3) without time zone,
    "actualDate" timestamp(3) without time zone,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "fromLocationId" text NOT NULL,
    "toLocationId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdById" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_bank_accounts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierId" text NOT NULL,
    "bankName" text,
    "accountName" text,
    "accountNumberMasked" text,
    "accountNumberHash" text,
    "mobileMoneyProvider" text,
    "mobileMoneyPhoneMasked" text,
    "mobileMoneyPhoneHash" text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    status public."SupplierBankAccountStatus" DEFAULT 'PENDING_APPROVAL'::public."SupplierBankAccountStatus" NOT NULL,
    "requestedById" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "suspendedAt" timestamp(3) without time zone,
    "evidenceHash" text,
    "documentHash" text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_bank_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_bank_change_requests (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierId" text NOT NULL,
    "bankAccountId" text,
    status public."SupplierBankChangeStatus" DEFAULT 'PENDING'::public."SupplierBankChangeStatus" NOT NULL,
    "requestedById" text NOT NULL,
    "approvedById" text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    reason text,
    "newBankName" text,
    "newAccountName" text,
    "newAccountNumberMasked" text,
    "newAccountNumberHash" text,
    "newMobileMoneyProvider" text,
    "newMobileMoneyPhoneMasked" text,
    "newMobileMoneyPhoneHash" text,
    "changeHash" text NOT NULL,
    "documentHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_credit_note_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_credit_note_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierCreditNoteId" text NOT NULL,
    "sourcePurchaseReturnLineId" text NOT NULL,
    "sourceSupplierInvoiceLineId" text NOT NULL,
    "sourceGoodsReceiptLineId" text NOT NULL,
    "itemId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    "taxRate" numeric(6,3) NOT NULL,
    "taxAmount" numeric(14,2) NOT NULL,
    "lineTotal" numeric(14,2) NOT NULL,
    "evidenceHash" character varying(71) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_credit_line_nonnegative_amounts CHECK ((("unitCost" >= (0)::numeric) AND ("taxRate" >= (0)::numeric) AND ("taxAmount" >= (0)::numeric) AND ("lineTotal" > (0)::numeric))),
    CONSTRAINT supplier_credit_line_positive_quantity CHECK ((quantity > (0)::numeric))
);


--
-- Name: supplier_credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_credit_notes (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierId" text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    "goodsReceiptId" text NOT NULL,
    "purchaseReturnId" text NOT NULL,
    "supplierInvoiceId" text NOT NULL,
    direction public."PurchaseCorrectionDirection" DEFAULT 'CORRECTION'::public."PurchaseCorrectionDirection" NOT NULL,
    "reversalOfSupplierCreditNoteId" text,
    "creditNoteNumber" text NOT NULL,
    "normalizedCreditNoteNumber" text NOT NULL,
    "creditDate" timestamp(3) without time zone NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    "taxAmount" numeric(14,2) NOT NULL,
    total numeric(14,2) NOT NULL,
    "idempotencyKey" character varying(191) NOT NULL,
    "payloadHash" character varying(71) NOT NULL,
    "documentHash" character varying(71) NOT NULL,
    "evidenceHash" character varying(71) NOT NULL,
    "ledgerPostingBatchId" text,
    "journalEntryId" text,
    "postedBusinessEventId" text NOT NULL,
    "postedById" text NOT NULL,
    reason text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_credit_nonnegative_amounts CHECK (((subtotal >= (0)::numeric) AND ("taxAmount" >= (0)::numeric) AND (total > (0)::numeric) AND ((subtotal + "taxAmount") = total)))
);


--
-- Name: supplier_invoice_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_invoice_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierInvoiceId" text NOT NULL,
    "purchaseOrderLineId" text,
    "goodsReceiptLineId" text,
    "itemId" text,
    description text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    "taxRate" numeric(6,3) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(14,2) NOT NULL,
    "matchStatus" public."ThreeWayMatchStatus" DEFAULT 'MATCHED'::public."ThreeWayMatchStatus" NOT NULL,
    notes text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_invoice_match_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_invoice_match_exceptions (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierInvoiceId" text NOT NULL,
    "threeWayMatchId" text NOT NULL,
    status public."SupplierInvoiceMatchExceptionStatus" DEFAULT 'OPEN'::public."SupplierInvoiceMatchExceptionStatus" NOT NULL,
    "policyVersion" text NOT NULL,
    reason text NOT NULL,
    "evidenceReference" text NOT NULL,
    "varianceAmount" numeric(14,2) NOT NULL,
    "priceVariance" numeric(14,2) NOT NULL,
    "requestedById" text NOT NULL,
    "approvedById" text,
    "rejectedById" text,
    "resolvedById" text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "decidedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "decisionReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_invoices (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierId" text NOT NULL,
    "purchaseOrderId" text,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status public."SupplierInvoiceStatus" DEFAULT 'DRAFT'::public."SupplierInvoiceStatus" NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    "amountPaid" numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "duplicateFingerprint" text NOT NULL,
    "idempotencyKey" text,
    "documentHash" text,
    "evidenceHash" text,
    "postedBusinessEventId" text,
    "ledgerPostingBatchId" text,
    "createdById" text,
    "approvedById" text,
    "postedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    notes text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_ledger_entries (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "entryDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public."LedgerEntryType" NOT NULL,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    "balanceAfter" numeric(14,2) NOT NULL,
    description text NOT NULL,
    "referenceType" text,
    "referenceId" text,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: supplier_payment_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payment_allocations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierPaymentId" text NOT NULL,
    "supplierInvoiceId" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payments (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierId" text NOT NULL,
    "bankAccountId" text,
    "paymentNumber" text NOT NULL,
    status public."SupplierPaymentStatus" DEFAULT 'DRAFT'::public."SupplierPaymentStatus" NOT NULL,
    method public."PaymentMethod" NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'XAF'::text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "idempotencyKey" text,
    "documentHash" text,
    "evidenceHash" text,
    "requestedById" text NOT NULL,
    "approvedById" text,
    "releasedById" text,
    "approvedAt" timestamp(3) without time zone,
    "releasedAt" timestamp(3) without time zone,
    "ledgerPostingBatchId" text,
    "postedBusinessEventId" text,
    notes text,
    metadata jsonb,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_po_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_po_access_logs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "envelopeId" text NOT NULL,
    "tokenId" text NOT NULL,
    action public."SupplierPoAccessAction" NOT NULL,
    outcome public."SupplierPoAccessOutcome" NOT NULL,
    "envelopeContentHash" text NOT NULL,
    "tokenHashPrefix" text NOT NULL,
    "ipHash" text,
    "userAgentHash" text,
    "responseHash" text,
    "denialReason" text,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_po_access_logs_hash_check CHECK ((("envelopeContentHash" ~ '^[0-9a-f]{64}$'::text) AND ("tokenHashPrefix" ~ '^[0-9a-f]{12}$'::text) AND (("ipHash" IS NULL) OR ("ipHash" ~ '^[0-9a-f]{64}$'::text)) AND (("userAgentHash" IS NULL) OR ("userAgentHash" ~ '^[0-9a-f]{64}$'::text)) AND (("responseHash" IS NULL) OR ("responseHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT supplier_po_access_logs_outcome_check CHECK ((((outcome = 'GRANTED'::public."SupplierPoAccessOutcome") AND ("denialReason" IS NULL)) OR ((outcome = 'DENIED'::public."SupplierPoAccessOutcome") AND ((char_length(btrim("denialReason")) >= 3) AND (char_length(btrim("denialReason")) <= 120)))))
);


--
-- Name: supplier_po_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_po_access_tokens (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "envelopeId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "jtiHash" text NOT NULL,
    "envelopeContentHash" text NOT NULL,
    "recipientHash" text,
    "allowView" boolean DEFAULT true NOT NULL,
    "allowRespond" boolean DEFAULT true NOT NULL,
    status public."SupplierPoAccessTokenStatus" DEFAULT 'ACTIVE'::public."SupplierPoAccessTokenStatus" NOT NULL,
    "idempotencyKey" text NOT NULL,
    "correlationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    "issuedById" text NOT NULL,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedById" text,
    "revokedAt" timestamp(3) without time zone,
    "revocationReason" text,
    "lastAccessedAt" timestamp(3) without time zone,
    "accessCount" integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT supplier_po_access_tokens_access_check CHECK ((("accessCount" >= 0) AND ((("accessCount" = 0) AND ("lastAccessedAt" IS NULL)) OR (("accessCount" > 0) AND ("lastAccessedAt" IS NOT NULL))))),
    CONSTRAINT supplier_po_access_tokens_hash_check CHECK ((("tokenHash" ~ '^[0-9a-f]{64}$'::text) AND ("jtiHash" ~ '^[0-9a-f]{64}$'::text) AND ("envelopeContentHash" ~ '^[0-9a-f]{64}$'::text) AND (("recipientHash" IS NULL) OR ("recipientHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT supplier_po_access_tokens_key_check CHECK ((((char_length(btrim("idempotencyKey")) >= 8) AND (char_length(btrim("idempotencyKey")) <= 160)) AND ((char_length(btrim("correlationId")) >= 8) AND (char_length(btrim("correlationId")) <= 160)) AND (char_length(btrim("businessEventId")) > 0))),
    CONSTRAINT supplier_po_access_tokens_metadata_check CHECK (((metadata IS NULL) OR (jsonb_typeof(metadata) = 'object'::text))),
    CONSTRAINT supplier_po_access_tokens_scope_check CHECK (("allowView" = true)),
    CONSTRAINT supplier_po_access_tokens_status_check CHECK ((((status = 'ACTIVE'::public."SupplierPoAccessTokenStatus") AND ("revokedAt" IS NULL) AND ("revokedById" IS NULL) AND ("revocationReason" IS NULL)) OR ((status = 'REVOKED'::public."SupplierPoAccessTokenStatus") AND ("revokedAt" IS NOT NULL) AND (char_length(btrim("revokedById")) > 0) AND ((char_length(btrim("revocationReason")) >= 3) AND (char_length(btrim("revocationReason")) <= 500))) OR ((status = 'EXPIRED'::public."SupplierPoAccessTokenStatus") AND ("revokedAt" IS NULL) AND ("revokedById" IS NULL) AND ("revocationReason" IS NULL)))),
    CONSTRAINT supplier_po_access_tokens_time_check CHECK ((("issuedAt" < "expiresAt") AND (("lastAccessedAt" IS NULL) OR ("lastAccessedAt" >= "issuedAt"))))
);


--
-- Name: supplier_po_envelopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_po_envelopes (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    "supplierId" text NOT NULL,
    "preferredLocale" public."Locale" DEFAULT 'EN'::public."Locale" NOT NULL,
    payload jsonb NOT NULL,
    "sourceStateHash" text NOT NULL,
    "contentHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "correlationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_po_envelopes_hash_check CHECK ((("sourceStateHash" ~ '^[0-9a-f]{64}$'::text) AND ("contentHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT supplier_po_envelopes_key_check CHECK ((((char_length(btrim("idempotencyKey")) >= 8) AND (char_length(btrim("idempotencyKey")) <= 160)) AND ((char_length(btrim("correlationId")) >= 8) AND (char_length(btrim("correlationId")) <= 160)) AND (char_length(btrim("businessEventId")) > 0) AND (char_length(btrim("createdById")) > 0))),
    CONSTRAINT supplier_po_envelopes_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text))
);


--
-- Name: supplier_po_proposal_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_po_proposal_lines (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "proposalId" text NOT NULL,
    "purchaseOrderLineId" text NOT NULL,
    "originalOrderedQuantity" numeric(12,3) NOT NULL,
    "requestedQuantity" numeric(12,3) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_po_proposal_lines_quantity_check CHECK ((("originalOrderedQuantity" > (0)::numeric) AND ("requestedQuantity" > (0)::numeric) AND ("originalOrderedQuantity" <> "requestedQuantity")))
);


--
-- Name: supplier_po_proposal_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_po_proposal_states (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "proposalId" text NOT NULL,
    version integer NOT NULL,
    status public."SupplierPoProposalStatus" NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "actorType" public."SupplierPoProposalActorType" NOT NULL,
    "actorId" text,
    reason text,
    "previousStateHash" text,
    "stateHash" text NOT NULL,
    "evidenceHash" text NOT NULL,
    "businessEventId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_po_proposal_states_hash_check CHECK ((("stateHash" ~ '^[0-9a-f]{64}$'::text) AND ("evidenceHash" ~ '^[0-9a-f]{64}$'::text) AND (("previousStateHash" IS NULL) OR ("previousStateHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT supplier_po_proposal_states_lineage_check CHECK ((((version = 1) AND (status = 'SUBMITTED'::public."SupplierPoProposalStatus") AND ("actorType" = 'SUPPLIER'::public."SupplierPoProposalActorType") AND ("actorId" IS NULL) AND ("previousStateHash" IS NULL) AND (reason IS NULL)) OR ((version = 2) AND (status = ANY (ARRAY['BUYER_ACCEPTED'::public."SupplierPoProposalStatus", 'BUYER_REJECTED'::public."SupplierPoProposalStatus"])) AND ("actorType" = 'BUYER'::public."SupplierPoProposalActorType") AND (char_length(btrim("actorId")) > 0) AND ("previousStateHash" IS NOT NULL) AND ((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500)))))
);


--
-- Name: supplier_po_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_po_proposals (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "envelopeId" text NOT NULL,
    "tokenId" text NOT NULL,
    "proposalType" public."SupplierPoProposalType" NOT NULL,
    "requestedDeliveryDate" timestamp(3) without time zone,
    "supplierNote" text,
    "noteHash" text,
    "payloadHash" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "correlationId" text NOT NULL,
    "businessEventId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT supplier_po_proposals_hash_check CHECK ((("payloadHash" ~ '^[0-9a-f]{64}$'::text) AND (("noteHash" IS NULL) OR ("noteHash" ~ '^[0-9a-f]{64}$'::text)))),
    CONSTRAINT supplier_po_proposals_key_check CHECK ((((char_length(btrim("idempotencyKey")) >= 8) AND (char_length(btrim("idempotencyKey")) <= 160)) AND ((char_length(btrim("correlationId")) >= 8) AND (char_length(btrim("correlationId")) <= 160)) AND (char_length(btrim("businessEventId")) > 0))),
    CONSTRAINT supplier_po_proposals_note_check CHECK (((("supplierNote" IS NULL) AND ("noteHash" IS NULL)) OR (((char_length(btrim("supplierNote")) >= 3) AND (char_length(btrim("supplierNote")) <= 500)) AND ("noteHash" IS NOT NULL)))),
    CONSTRAINT supplier_po_proposals_type_check CHECK (((("proposalType" = 'ACCEPT'::public."SupplierPoProposalType") AND ("requestedDeliveryDate" IS NULL)) OR (("proposalType" = 'REJECT'::public."SupplierPoProposalType") AND ("requestedDeliveryDate" IS NULL) AND ("supplierNote" IS NOT NULL)) OR (("proposalType" = 'REQUEST_CHANGE'::public."SupplierPoProposalType") AND ("supplierNote" IS NOT NULL))))
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    "contactPerson" text,
    email text,
    phone text,
    address text,
    city text,
    state text,
    "zipCode" text,
    country text,
    "taxId" text,
    "paymentTerms" integer DEFAULT 30,
    "creditLimit" numeric(14,2),
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "preferredLocale" public."Locale" DEFAULT 'EN'::public."Locale" NOT NULL,
    "currentBalance" numeric(14,2) DEFAULT 0 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: suspense_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspense_items (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "providerAccountId" text,
    "paymentTransactionId" text,
    "reconciliationRunId" text,
    "suspenseLedgerAccountId" text,
    "ledgerPostingBatchId" text,
    type public."SuspenseType" NOT NULL,
    status public."SuspenseStatus" DEFAULT 'OPEN'::public."SuspenseStatus" NOT NULL,
    severity public."ExceptionSeverity" DEFAULT 'MEDIUM'::public."ExceptionSeverity" NOT NULL,
    direction public."PaymentDirection" DEFAULT 'INBOUND'::public."PaymentDirection" NOT NULL,
    amount numeric(14,2) NOT NULL,
    "currencyCode" text DEFAULT 'XAF'::text NOT NULL,
    "ownerId" text,
    "slaDeadline" timestamp(3) without time zone,
    evidence jsonb,
    "resolutionNotes" text,
    "postedAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    "correlationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: tax_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rates (
    id text NOT NULL,
    rate numeric(6,3) NOT NULL,
    type public."TaxType" DEFAULT 'SALES'::public."TaxType" NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: tenant_module_configuration_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_configuration_commands (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "payloadHash" text NOT NULL,
    "expectedRevision" integer NOT NULL,
    "resultRevision" integer,
    state public."TenantModuleConfigurationCommandState" NOT NULL,
    "selectedModules" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "previousModules" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "previewHash" text,
    "reviewSnapshot" jsonb,
    "errorCode" text,
    "actorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT tenant_module_configuration_commands_revision_check CHECK ((("expectedRevision" >= 0) AND (("resultRevision" IS NULL) OR ("resultRevision" = ("expectedRevision" + 1))))),
    CONSTRAINT tenant_module_configuration_commands_state_check CHECK ((((state = 'ACTIVE'::public."TenantModuleConfigurationCommandState") AND ("resultRevision" IS NOT NULL) AND ("errorCode" IS NULL) AND ("previewHash" IS NOT NULL)) OR ((state = 'FAILED'::public."TenantModuleConfigurationCommandState") AND ("resultRevision" IS NULL) AND ("errorCode" IS NOT NULL)) OR ((state = 'DRAFT'::public."TenantModuleConfigurationCommandState") AND ("resultRevision" IS NULL) AND ("errorCode" IS NULL)) OR ((state = 'REQUESTED'::public."TenantModuleConfigurationCommandState") AND ("resultRevision" IS NULL) AND ("errorCode" IS NULL) AND ("previewHash" IS NOT NULL))))
);


--
-- Name: tenant_module_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_configurations (
    "organizationId" text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    "selectedModules" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "activeModules" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "legacyUnknownValues" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "manifestHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "activeRevision" integer DEFAULT 0 NOT NULL,
    "newWorkStoppedModules" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "newWorkStoppedAt" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT module_active_revision_check CHECK ((("activeRevision" >= 0) AND ("activeRevision" <= revision) AND (jsonb_typeof("newWorkStoppedAt") = 'object'::text))),
    CONSTRAINT tenant_module_configurations_revision_check CHECK ((revision >= 0))
);


--
-- Name: tenant_module_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_grants (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "moduleSlug" text NOT NULL,
    status text NOT NULL,
    source text NOT NULL,
    "startsAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone,
    "readOnly" boolean DEFAULT false NOT NULL,
    trial boolean DEFAULT false NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT tenant_module_grants_revision_check CHECK ((revision >= 1)),
    CONSTRAINT tenant_module_grants_source_check CHECK ((source = ANY (ARRAY['requested_modules'::text, 'legacy_default'::text, 'system_default'::text, 'manual_override'::text, 'plan'::text, 'trial'::text]))),
    CONSTRAINT tenant_module_grants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trial'::text, 'read_only'::text, 'suspended'::text, 'expired'::text, 'unavailable'::text, 'legacy_default'::text, 'system_default'::text]))),
    CONSTRAINT tenant_module_grants_validity_check CHECK ((("startsAt" IS NULL) OR ("endsAt" IS NULL) OR ("endsAt" > "startsAt")))
);


--
-- Name: tenant_module_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_lifecycle_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "operationId" text NOT NULL,
    sequence integer NOT NULL,
    "eventKey" text NOT NULL,
    "eventType" text NOT NULL,
    state public."TenantModuleLifecycleState" NOT NULL,
    "actorId" text NOT NULL,
    evidence jsonb NOT NULL,
    "evidenceHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT tenant_module_lifecycle_events_sequence_check CHECK ((sequence >= 0))
);


--
-- Name: tenant_module_lifecycle_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_lifecycle_operations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "commandId" text NOT NULL,
    "desiredRevision" integer NOT NULL,
    "baseActiveRevision" integer NOT NULL,
    "desiredModules" text[] NOT NULL,
    "stopNewWorkModules" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "authorityHash" text NOT NULL,
    "setupInputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
    state public."TenantModuleLifecycleState" DEFAULT 'REQUESTED'::public."TenantModuleLifecycleState" NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    "leaseToken" text,
    "leaseUntil" timestamp(3) without time zone,
    "errorCode" text,
    "actorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    CONSTRAINT module_lifecycle_lease_check CHECK ((("leaseToken" IS NULL) = ("leaseUntil" IS NULL))),
    CONSTRAINT module_lifecycle_revision_check CHECK ((("desiredRevision" > "baseActiveRevision") AND ("baseActiveRevision" >= 0) AND (version >= 0)))
);


--
-- Name: tenant_module_lifecycle_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_module_lifecycle_steps (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "operationId" text NOT NULL,
    "moduleSlug" text NOT NULL,
    "stepKey" text NOT NULL,
    "inputHash" text NOT NULL,
    state public."TenantModuleLifecycleStepState" DEFAULT 'PENDING'::public."TenantModuleLifecycleStepState" NOT NULL,
    code text NOT NULL,
    href text,
    attempts integer DEFAULT 0 NOT NULL,
    evidence jsonb,
    "evidenceHash" text,
    "checkedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT tenant_module_lifecycle_steps_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: three_way_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.three_way_matches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierInvoiceId" text NOT NULL,
    "purchaseOrderId" text,
    "goodsReceiptId" text,
    status public."ThreeWayMatchStatus" DEFAULT 'MATCHED'::public."ThreeWayMatchStatus" NOT NULL,
    "matchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "matchedById" text,
    "toleranceAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "varianceAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "quantityVariance" numeric(12,3) DEFAULT 0 NOT NULL,
    "priceVariance" numeric(14,2) DEFAULT 0 NOT NULL,
    "evidenceHash" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id text NOT NULL,
    symbol text NOT NULL,
    type public."UnitType" DEFAULT 'QUANTITY'::public."UnitType" NOT NULL,
    "nameEn" text NOT NULL,
    "nameFr" text,
    "baseUnit" text,
    "conversionRate" numeric(18,6),
    "isActive" boolean DEFAULT true NOT NULL,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "firstName" text,
    "lastName" text,
    phone text,
    image text,
    "jobTitle" text,
    password text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "preferredLocale" public."Locale" DEFAULT 'EN'::public."Locale" NOT NULL,
    "verificationToken" text,
    "verificationTokenExpires" timestamp(3) without time zone,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lastFailedLogin" timestamp(3) without time zone,
    "lastLogin" timestamp(3) without time zone,
    "mfaSecret" text,
    "mfaEnabledAt" timestamp(3) without time zone,
    "mfaBackupCodes" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "organizationId" text NOT NULL,
    name text,
    "emailVerified" boolean DEFAULT false NOT NULL
);


--
-- Name: verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verifications (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone
);


--
-- Name: workflow_assurance_alert_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_alert_deliveries (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "incidentId" text NOT NULL,
    channel public."WorkflowAssuranceAlertChannel" NOT NULL,
    status public."WorkflowAssuranceAlertDeliveryStatus" DEFAULT 'PENDING'::public."WorkflowAssuranceAlertDeliveryStatus" NOT NULL,
    "dedupeKey" text NOT NULL,
    "recipientId" text,
    "recipientRole" text,
    title text NOT NULL,
    message text NOT NULL,
    "actionRoute" text,
    "deliveredAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "failureCode" text,
    "failureReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "nextAttemptAt" timestamp(3) without time zone,
    "lockedAt" timestamp(3) without time zone,
    "lockedBy" text,
    "externalReference" text
);


--
-- Name: workflow_assurance_check_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_check_definitions (
    id text NOT NULL,
    "checkKey" text NOT NULL,
    version integer NOT NULL,
    workflow public."WorkflowAssuranceWorkflow" NOT NULL,
    "moduleSlug" text NOT NULL,
    "invariantName" text NOT NULL,
    "executionMode" public."WorkflowAssuranceExecutionMode" NOT NULL,
    "defaultSeverity" public."WorkflowAssuranceSeverity" DEFAULT 'WARNING'::public."WorkflowAssuranceSeverity" NOT NULL,
    "requiredPermission" text NOT NULL,
    "ownerRole" text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "enforceMode" boolean DEFAULT false NOT NULL,
    "sourceTables" jsonb NOT NULL,
    "actionRoute" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: workflow_assurance_check_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_check_findings (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "checkRunId" text NOT NULL,
    "incidentId" text,
    ordinal integer NOT NULL,
    status public."WorkflowAssuranceResultStatus" NOT NULL,
    severity public."WorkflowAssuranceSeverity" NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text NOT NULL,
    "sourceHash" text NOT NULL,
    fingerprint text NOT NULL,
    "scannedCount" integer DEFAULT 0 NOT NULL,
    "passedCount" integer DEFAULT 0 NOT NULL,
    "warningCount" integer DEFAULT 0 NOT NULL,
    "failedCount" integer DEFAULT 0 NOT NULL,
    "blockedCount" integer DEFAULT 0 NOT NULL,
    "skippedCount" integer DEFAULT 0 NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    message text NOT NULL,
    "recommendedAction" text,
    "evidenceLinks" jsonb NOT NULL,
    "resultMetadata" jsonb,
    "errorCode" text,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT workflow_assurance_check_findings_counts_check CHECK ((("scannedCount" >= 0) AND ("passedCount" >= 0) AND ("warningCount" >= 0) AND ("failedCount" >= 0) AND ("blockedCount" >= 0) AND ("skippedCount" >= 0) AND ("errorCount" >= 0))),
    CONSTRAINT workflow_assurance_check_findings_ordinal_check CHECK (((ordinal >= 0) AND (ordinal <= 99))),
    CONSTRAINT workflow_assurance_check_findings_source_identity_check CHECK (((length(btrim("sourceType")) > 0) AND (length(btrim("sourceId")) > 0) AND ("sourceType" = btrim("sourceType")) AND ("sourceId" = btrim("sourceId"))))
);


--
-- Name: workflow_assurance_check_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_check_runs (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "definitionId" text NOT NULL,
    "checkKey" text NOT NULL,
    "definitionVersion" integer NOT NULL,
    "runType" public."WorkflowAssuranceRunType" NOT NULL,
    "runStatus" public."WorkflowAssuranceRunStatus" DEFAULT 'RUNNING'::public."WorkflowAssuranceRunStatus" NOT NULL,
    "resultStatus" public."WorkflowAssuranceResultStatus",
    severity public."WorkflowAssuranceSeverity",
    "actorId" text,
    "sourceType" text,
    "sourceId" text,
    "sourceHash" text,
    fingerprint text,
    "periodId" text,
    "locationId" text,
    "scannedCount" integer DEFAULT 0 NOT NULL,
    "passedCount" integer DEFAULT 0 NOT NULL,
    "warningCount" integer DEFAULT 0 NOT NULL,
    "failedCount" integer DEFAULT 0 NOT NULL,
    "blockedCount" integer DEFAULT 0 NOT NULL,
    "skippedCount" integer DEFAULT 0 NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "durationMs" integer,
    "resultSummary" jsonb,
    "errorCode" text,
    "errorMessage" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "executionKey" character varying(200),
    "executionDigest" character varying(71),
    CONSTRAINT workflow_assurance_check_runs_execution_identity_check CHECK (((("executionKey" IS NULL) AND ("executionDigest" IS NULL)) OR (("executionKey" IS NOT NULL) AND ("executionDigest" IS NOT NULL) AND (length(btrim(("executionKey")::text)) > 0) AND (("executionKey")::text = btrim(("executionKey")::text)) AND (("executionDigest")::text ~ '^sha256:[0-9a-f]{64}$'::text))))
);


--
-- Name: workflow_assurance_incident_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_incident_events (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "incidentId" text NOT NULL,
    "eventType" public."WorkflowAssuranceIncidentEventType" NOT NULL,
    "fromStatus" public."WorkflowAssuranceIncidentStatus",
    "toStatus" public."WorkflowAssuranceIncidentStatus",
    "actorId" text,
    message text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: workflow_assurance_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_incidents (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "definitionId" text NOT NULL,
    "checkRunId" text,
    "checkKey" text NOT NULL,
    "definitionVersion" integer NOT NULL,
    workflow public."WorkflowAssuranceWorkflow" NOT NULL,
    "moduleSlug" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text NOT NULL,
    "sourceHash" text NOT NULL,
    fingerprint text NOT NULL,
    title text NOT NULL,
    detail text NOT NULL,
    severity public."WorkflowAssuranceSeverity" NOT NULL,
    status public."WorkflowAssuranceIncidentStatus" DEFAULT 'OPEN'::public."WorkflowAssuranceIncidentStatus" NOT NULL,
    "evidenceGrade" text DEFAULT 'blocked'::text NOT NULL,
    "sourceLinks" jsonb,
    "assignedRole" text,
    "ownerId" text,
    "dueAt" timestamp(3) without time zone,
    "actionRoute" text NOT NULL,
    "firstDetectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastDetectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedById" text,
    "reopenedAt" timestamp(3) without time zone,
    "suppressedAt" timestamp(3) without time zone,
    "suppressedById" text,
    "closedAt" timestamp(3) without time zone,
    "occurrenceCount" integer DEFAULT 1 NOT NULL,
    "resolutionNote" text,
    "suppressionReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: workflow_assurance_waivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_assurance_waivers (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "incidentId" text NOT NULL,
    status public."WorkflowAssuranceWaiverStatus" DEFAULT 'REQUESTED'::public."WorkflowAssuranceWaiverStatus" NOT NULL,
    "requesterId" text NOT NULL,
    "approverId" text,
    reason text NOT NULL,
    "evidenceHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _UserRoles _UserRoles_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_UserRoles"
    ADD CONSTRAINT "_UserRoles_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accountant_access_grants accountant_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_access_grants
    ADD CONSTRAINT accountant_access_grants_pkey PRIMARY KEY (id);


--
-- Name: accountant_client_invite_states accountant_client_invite_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invite_states
    ADD CONSTRAINT accountant_client_invite_states_pkey PRIMARY KEY (id);


--
-- Name: accountant_client_invites accountant_client_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invites
    ADD CONSTRAINT accountant_client_invites_pkey PRIMARY KEY (id);


--
-- Name: accountant_comments accountant_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT accountant_comments_pkey PRIMARY KEY (id);


--
-- Name: accountant_reviews accountant_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_reviews
    ADD CONSTRAINT accountant_reviews_pkey PRIMARY KEY (id);


--
-- Name: accounting_periods accounting_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_pkey PRIMARY KEY (id);


--
-- Name: accounting_source_links accounting_source_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_source_links
    ADD CONSTRAINT accounting_source_links_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: agent_activation_approvals agent_activation_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activation_approvals
    ADD CONSTRAINT agent_activation_approvals_pkey PRIMARY KEY (id);


--
-- Name: agent_activation_owners agent_activation_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activation_owners
    ADD CONSTRAINT agent_activation_owners_pkey PRIMARY KEY (id);


--
-- Name: agent_activation_packages agent_activation_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activation_packages
    ADD CONSTRAINT agent_activation_packages_pkey PRIMARY KEY (id);


--
-- Name: agent_cost_ledger agent_cost_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_cost_ledger
    ADD CONSTRAINT agent_cost_ledger_pkey PRIMARY KEY (id);


--
-- Name: agent_definitions agent_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_definitions
    ADD CONSTRAINT agent_definitions_pkey PRIMARY KEY (id);


--
-- Name: agent_evidence_links agent_evidence_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_evidence_links
    ADD CONSTRAINT agent_evidence_links_pkey PRIMARY KEY (id);


--
-- Name: agent_feedback agent_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_feedback
    ADD CONSTRAINT agent_feedback_pkey PRIMARY KEY (id);


--
-- Name: agent_pilot_certifications agent_pilot_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pilot_certifications
    ADD CONSTRAINT agent_pilot_certifications_pkey PRIMARY KEY (id);


--
-- Name: agent_policy_incidents agent_policy_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_policy_incidents
    ADD CONSTRAINT agent_policy_incidents_pkey PRIMARY KEY (id);


--
-- Name: agent_reconciler_invocations agent_reconciler_invocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_reconciler_invocations
    ADD CONSTRAINT agent_reconciler_invocations_pkey PRIMARY KEY (id);


--
-- Name: agent_runs agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);


--
-- Name: agent_skill_definitions agent_skill_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_skill_definitions
    ADD CONSTRAINT agent_skill_definitions_pkey PRIMARY KEY (id);


--
-- Name: agent_steps agent_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_steps
    ADD CONSTRAINT agent_steps_pkey PRIMARY KEY (id);


--
-- Name: agent_tool_definitions agent_tool_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_tool_definitions
    ADD CONSTRAINT agent_tool_definitions_pkey PRIMARY KEY (id);


--
-- Name: ai_action_proposals ai_action_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_proposals
    ADD CONSTRAINT ai_action_proposals_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: branch_daily_close_runs branch_daily_close_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_runs
    ADD CONSTRAINT branch_daily_close_runs_pkey PRIMARY KEY (id);


--
-- Name: branch_daily_close_sign_offs branch_daily_close_sign_offs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_sign_offs
    ADD CONSTRAINT branch_daily_close_sign_offs_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: business_event_anomalies business_event_anomalies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_anomalies
    ADD CONSTRAINT business_event_anomalies_pkey PRIMARY KEY (id);


--
-- Name: business_event_audits business_event_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_audits
    ADD CONSTRAINT business_event_audits_pkey PRIMARY KEY (id);


--
-- Name: business_event_outbox business_event_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_outbox
    ADD CONSTRAINT business_event_outbox_pkey PRIMARY KEY (id);


--
-- Name: business_events business_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_events
    ADD CONSTRAINT business_events_pkey PRIMARY KEY (id);


--
-- Name: cash_drawer_transactions cash_drawer_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawer_transactions
    ADD CONSTRAINT cash_drawer_transactions_pkey PRIMARY KEY (id);


--
-- Name: cash_drawers cash_drawers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawers
    ADD CONSTRAINT cash_drawers_pkey PRIMARY KEY (id);


--
-- Name: cash_shortage_policies cash_shortage_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shortage_policies
    ADD CONSTRAINT cash_shortage_policies_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: close_assurance_findings close_assurance_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_assurance_findings
    ADD CONSTRAINT close_assurance_findings_pkey PRIMARY KEY (id);


--
-- Name: close_checklist_items close_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_checklist_items
    ADD CONSTRAINT close_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: close_evidence_items close_evidence_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_evidence_items
    ADD CONSTRAINT close_evidence_items_pkey PRIMARY KEY (id);


--
-- Name: close_pack_exports close_pack_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_pack_exports
    ADD CONSTRAINT close_pack_exports_pkey PRIMARY KEY (id);


--
-- Name: close_runs close_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_runs
    ADD CONSTRAINT close_runs_pkey PRIMARY KEY (id);


--
-- Name: compliance_adapter_configs compliance_adapter_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_adapter_configs
    ADD CONSTRAINT compliance_adapter_configs_pkey PRIMARY KEY (id);


--
-- Name: compliance_evidence compliance_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_evidence
    ADD CONSTRAINT compliance_evidence_pkey PRIMARY KEY (id);


--
-- Name: compliance_submissions compliance_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT compliance_submissions_pkey PRIMARY KEY (id);


--
-- Name: customer_ledger_entries customer_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger_entries
    ADD CONSTRAINT customer_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: customer_locations customer_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_pkey PRIMARY KEY (id);


--
-- Name: customer_receivable_document_states customer_receivable_document_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_document_states
    ADD CONSTRAINT customer_receivable_document_states_pkey PRIMARY KEY (id);


--
-- Name: customer_receivable_documents customer_receivable_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_documents
    ADD CONSTRAINT customer_receivable_documents_pkey PRIMARY KEY (id);


--
-- Name: customer_settlement_allocations customer_settlement_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT customer_settlement_allocations_pkey PRIMARY KEY (id);


--
-- Name: customer_settlements customer_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlements
    ADD CONSTRAINT customer_settlements_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_access_logs customer_statement_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_logs
    ADD CONSTRAINT customer_statement_access_logs_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_access_tokens customer_statement_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_tokens
    ADD CONSTRAINT customer_statement_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_deliveries customer_statement_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT customer_statement_deliveries_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_delivery_states customer_statement_delivery_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_delivery_states
    ADD CONSTRAINT customer_statement_delivery_states_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_recipient_action_states customer_statement_recipient_action_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_action_states
    ADD CONSTRAINT customer_statement_recipient_action_states_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_recipient_actions customer_statement_recipient_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_actions
    ADD CONSTRAINT customer_statement_recipient_actions_pkey PRIMARY KEY (id);


--
-- Name: customer_statement_snapshots customer_statement_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_snapshots
    ADD CONSTRAINT customer_statement_snapshots_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_report_cash_events daily_sales_report_cash_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_report_cash_events
    ADD CONSTRAINT daily_sales_report_cash_events_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_report_items daily_sales_report_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_report_items
    ADD CONSTRAINT daily_sales_report_items_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_reports daily_sales_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_reports
    ADD CONSTRAINT daily_sales_reports_pkey PRIMARY KEY (id);


--
-- Name: delivery_billing_lines delivery_billing_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_billing_lines
    ADD CONSTRAINT delivery_billing_lines_pkey PRIMARY KEY (id);


--
-- Name: delivery_billing_outcomes delivery_billing_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_billing_outcomes
    ADD CONSTRAINT delivery_billing_outcomes_pkey PRIMARY KEY (id);


--
-- Name: delivery_goods_issue_lines delivery_goods_issue_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_goods_issue_lines
    ADD CONSTRAINT delivery_goods_issue_lines_pkey PRIMARY KEY (id);


--
-- Name: delivery_goods_issues delivery_goods_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_goods_issues
    ADD CONSTRAINT delivery_goods_issues_pkey PRIMARY KEY (id);


--
-- Name: delivery_reservation_lines delivery_reservation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reservation_lines
    ADD CONSTRAINT delivery_reservation_lines_pkey PRIMARY KEY (id);


--
-- Name: delivery_reservations delivery_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reservations
    ADD CONSTRAINT delivery_reservations_pkey PRIMARY KEY (id);


--
-- Name: document_sequences document_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_sequences
    ADD CONSTRAINT document_sequences_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fiscal_document_lines fiscal_document_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_document_lines
    ADD CONSTRAINT fiscal_document_lines_pkey PRIMARY KEY (id);


--
-- Name: fiscal_documents fiscal_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT fiscal_documents_pkey PRIMARY KEY (id);


--
-- Name: fiscal_sequences fiscal_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_sequences
    ADD CONSTRAINT fiscal_sequences_pkey PRIMARY KEY (id);


--
-- Name: fiscal_years fiscal_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_inspection_resolutions goods_receipt_inspection_resolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspection_resolutions
    ADD CONSTRAINT goods_receipt_inspection_resolutions_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_inspections goods_receipt_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspections
    ADD CONSTRAINT goods_receipt_inspections_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_lines goods_receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: hris_attendance_anomalies hris_attendance_anomalies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_attendance_anomalies
    ADD CONSTRAINT hris_attendance_anomalies_pkey PRIMARY KEY (id);


--
-- Name: hris_employment_assignments hris_employment_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_employment_assignments
    ADD CONSTRAINT hris_employment_assignments_pkey PRIMARY KEY (id);


--
-- Name: hris_leave_balance_entries hris_leave_balance_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_leave_balance_entries
    ADD CONSTRAINT hris_leave_balance_entries_pkey PRIMARY KEY (id);


--
-- Name: hris_leave_policies hris_leave_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_leave_policies
    ADD CONSTRAINT hris_leave_policies_pkey PRIMARY KEY (id);


--
-- Name: hris_manager_delegations hris_manager_delegations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_manager_delegations
    ADD CONSTRAINT hris_manager_delegations_pkey PRIMARY KEY (id);


--
-- Name: hris_org_units hris_org_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_org_units
    ADD CONSTRAINT hris_org_units_pkey PRIMARY KEY (id);


--
-- Name: hris_positions hris_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_positions
    ADD CONSTRAINT hris_positions_pkey PRIMARY KEY (id);


--
-- Name: hris_public_holidays hris_public_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_public_holidays
    ADD CONSTRAINT hris_public_holidays_pkey PRIMARY KEY (id);


--
-- Name: hris_reporting_relationships hris_reporting_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT hris_reporting_relationships_pkey PRIMARY KEY (id);


--
-- Name: hris_time_entries hris_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_entries
    ADD CONSTRAINT hris_time_entries_pkey PRIMARY KEY (id);


--
-- Name: hris_time_import_batches hris_time_import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_import_batches
    ADD CONSTRAINT hris_time_import_batches_pkey PRIMARY KEY (id);


--
-- Name: hris_time_requests hris_time_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_requests
    ADD CONSTRAINT hris_time_requests_pkey PRIMARY KEY (id);


--
-- Name: hris_work_calendars hris_work_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_work_calendars
    ADD CONSTRAINT hris_work_calendars_pkey PRIMARY KEY (id);


--
-- Name: hris_work_schedules hris_work_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_work_schedules
    ADD CONSTRAINT hris_work_schedules_pkey PRIMARY KEY (id);


--
-- Name: inventory_levels inventory_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_levels
    ADD CONSTRAINT inventory_levels_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: item_suppliers item_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT item_suppliers_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entry_lines journal_entry_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (id);


--
-- Name: journals journals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journals
    ADD CONSTRAINT journals_pkey PRIMARY KEY (id);


--
-- Name: ledger_audit_events ledger_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_audit_events
    ADD CONSTRAINT ledger_audit_events_pkey PRIMARY KEY (id);


--
-- Name: ledger_posting_batches ledger_posting_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_batches
    ADD CONSTRAINT ledger_posting_batches_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: match_records match_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT match_records_pkey PRIMARY KEY (id);


--
-- Name: onboarding_import_batches onboarding_import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_batches
    ADD CONSTRAINT onboarding_import_batches_pkey PRIMARY KEY (id);


--
-- Name: onboarding_import_issues onboarding_import_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_issues
    ADD CONSTRAINT onboarding_import_issues_pkey PRIMARY KEY (id);


--
-- Name: onboarding_import_mappings onboarding_import_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_mappings
    ADD CONSTRAINT onboarding_import_mappings_pkey PRIMARY KEY (id);


--
-- Name: onboarding_import_rows onboarding_import_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_rows
    ADD CONSTRAINT onboarding_import_rows_pkey PRIMARY KEY (id);


--
-- Name: onboarding_readiness_milestones onboarding_readiness_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_readiness_milestones
    ADD CONSTRAINT onboarding_readiness_milestones_pkey PRIMARY KEY (id);


--
-- Name: organization_accounting_settings organization_accounting_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_accounting_settings
    ADD CONSTRAINT organization_accounting_settings_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: payment_exceptions payment_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT payment_exceptions_pkey PRIMARY KEY (id);


--
-- Name: payment_rails payment_rails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_rails
    ADD CONSTRAINT payment_rails_pkey PRIMARY KEY (id);


--
-- Name: payment_reconciliation_inbox_items payment_reconciliation_inbox_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_inbox_items
    ADD CONSTRAINT payment_reconciliation_inbox_items_pkey PRIMARY KEY (id);


--
-- Name: payment_refunds payment_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT payment_refunds_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payroll_attendance_snapshots payroll_attendance_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_attendance_snapshots
    ADD CONSTRAINT payroll_attendance_snapshots_pkey PRIMARY KEY (id);


--
-- Name: payroll_contracts payroll_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_contracts
    ADD CONSTRAINT payroll_contracts_pkey PRIMARY KEY (id);


--
-- Name: payroll_declaration_evidence payroll_declaration_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_declaration_evidence
    ADD CONSTRAINT payroll_declaration_evidence_pkey PRIMARY KEY (id);


--
-- Name: payroll_declarations payroll_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_declarations
    ADD CONSTRAINT payroll_declarations_pkey PRIMARY KEY (id);


--
-- Name: payroll_employee_balance_cases payroll_employee_balance_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_cases
    ADD CONSTRAINT payroll_employee_balance_cases_pkey PRIMARY KEY (id);


--
-- Name: payroll_employee_balance_events payroll_employee_balance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_events
    ADD CONSTRAINT payroll_employee_balance_events_pkey PRIMARY KEY (id);


--
-- Name: payroll_employee_rubrique_assignments payroll_employee_rubrique_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_rubrique_assignments
    ADD CONSTRAINT payroll_employee_rubrique_assignments_pkey PRIMARY KEY (id);


--
-- Name: payroll_employees payroll_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employees
    ADD CONSTRAINT payroll_employees_pkey PRIMARY KEY (id);


--
-- Name: payroll_payment_allocations payroll_payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_allocations
    ADD CONSTRAINT payroll_payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: payroll_payment_batches payroll_payment_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_batches
    ADD CONSTRAINT payroll_payment_batches_pkey PRIMARY KEY (id);


--
-- Name: payroll_payment_destination_change_requests payroll_payment_destination_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_destination_change_requests
    ADD CONSTRAINT payroll_payment_destination_change_requests_pkey PRIMARY KEY (id);


--
-- Name: payroll_payslip_lines payroll_payslip_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslip_lines
    ADD CONSTRAINT payroll_payslip_lines_pkey PRIMARY KEY (id);


--
-- Name: payroll_payslips payroll_payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslips
    ADD CONSTRAINT payroll_payslips_pkey PRIMARY KEY (id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);


--
-- Name: payroll_rubriques payroll_rubriques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_rubriques
    ADD CONSTRAINT payroll_rubriques_pkey PRIMARY KEY (id);


--
-- Name: payroll_run_lines payroll_run_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_lines
    ADD CONSTRAINT payroll_run_lines_pkey PRIMARY KEY (id);


--
-- Name: payroll_run_transitions payroll_run_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_transitions
    ADD CONSTRAINT payroll_run_transitions_pkey PRIMARY KEY (id);


--
-- Name: payroll_runs payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);


--
-- Name: payroll_salary_change_requests payroll_salary_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_change_requests
    ADD CONSTRAINT payroll_salary_change_requests_pkey PRIMARY KEY (id);


--
-- Name: picture_assets picture_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picture_assets
    ADD CONSTRAINT picture_assets_pkey PRIMARY KEY (id);


--
-- Name: pos_cash_shortage_worker_checkpoints pos_cash_shortage_worker_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_cash_shortage_worker_checkpoints
    ADD CONSTRAINT pos_cash_shortage_worker_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: pos_checkout_workspaces pos_checkout_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_checkout_workspaces
    ADD CONSTRAINT pos_checkout_workspaces_pkey PRIMARY KEY ("sessionId");


--
-- Name: pos_commit_results pos_commit_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT pos_commit_results_pkey PRIMARY KEY (id);


--
-- Name: pos_offline_devices pos_offline_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_devices
    ADD CONSTRAINT pos_offline_devices_pkey PRIMARY KEY (id);


--
-- Name: pos_offline_events pos_offline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT pos_offline_events_pkey PRIMARY KEY (id);


--
-- Name: pos_offline_sync_batches pos_offline_sync_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_batches
    ADD CONSTRAINT pos_offline_sync_batches_pkey PRIMARY KEY (id);


--
-- Name: pos_offline_sync_certificates pos_offline_sync_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_certificates
    ADD CONSTRAINT pos_offline_sync_certificates_pkey PRIMARY KEY (id);


--
-- Name: pos_offline_sync_conflicts pos_offline_sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_conflicts
    ADD CONSTRAINT pos_offline_sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: pos_sessions pos_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_pkey PRIMARY KEY (id);


--
-- Name: pos_terminals pos_terminals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_terminals
    ADD CONSTRAINT pos_terminals_pkey PRIMARY KEY (id);


--
-- Name: posting_rule_lines posting_rule_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rule_lines
    ADD CONSTRAINT posting_rule_lines_pkey PRIMARY KEY (id);


--
-- Name: posting_rules posting_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rules
    ADD CONSTRAINT posting_rules_pkey PRIMARY KEY (id);


--
-- Name: legacy_production_batches production_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_production_batches
    ADD CONSTRAINT production_batches_pkey PRIMARY KEY (id);


--
-- Name: provider_accounts provider_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT provider_accounts_pkey PRIMARY KEY (id);


--
-- Name: provider_events provider_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_events
    ADD CONSTRAINT provider_events_pkey PRIMARY KEY (id);


--
-- Name: public_identity_abuse_buckets public_identity_abuse_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_identity_abuse_buckets
    ADD CONSTRAINT public_identity_abuse_buckets_pkey PRIMARY KEY (id);


--
-- Name: public_receipt_access_tokens public_receipt_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_receipt_access_tokens
    ADD CONSTRAINT public_receipt_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_lines purchase_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_return_lines purchase_return_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_lines
    ADD CONSTRAINT purchase_return_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_returns purchase_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_pkey PRIMARY KEY (id);


--
-- Name: legacy_recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: legacy_recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_runs reconciliation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_pkey PRIMARY KEY (id);


--
-- Name: referral_attribution_events referral_attribution_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attribution_events
    ADD CONSTRAINT referral_attribution_events_pkey PRIMARY KEY (id);


--
-- Name: referral_attributions referral_attributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attributions
    ADD CONSTRAINT referral_attributions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_order_lines sales_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_lines
    ADD CONSTRAINT sales_order_lines_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settlement_accounts settlement_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_accounts
    ADD CONSTRAINT settlement_accounts_pkey PRIMARY KEY (id);


--
-- Name: statement_files statement_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_files
    ADD CONSTRAINT statement_files_pkey PRIMARY KEY (id);


--
-- Name: statement_lines statement_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_lines
    ADD CONSTRAINT statement_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustment_lines stock_adjustment_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_lines
    ADD CONSTRAINT stock_adjustment_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: stock_count_lines stock_count_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_lines
    ADD CONSTRAINT stock_count_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_count_sessions stock_count_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT stock_count_sessions_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_lines stock_transfer_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_lines
    ADD CONSTRAINT stock_transfer_lines_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: supplier_bank_accounts supplier_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_accounts
    ADD CONSTRAINT supplier_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: supplier_bank_change_requests supplier_bank_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_change_requests
    ADD CONSTRAINT supplier_bank_change_requests_pkey PRIMARY KEY (id);


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_note_lines
    ADD CONSTRAINT supplier_credit_note_lines_pkey PRIMARY KEY (id);


--
-- Name: supplier_credit_notes supplier_credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT supplier_credit_notes_pkey PRIMARY KEY (id);


--
-- Name: supplier_invoice_lines supplier_invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT supplier_invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: supplier_invoice_match_exceptions supplier_invoice_match_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_match_exceptions
    ADD CONSTRAINT supplier_invoice_match_exceptions_pkey PRIMARY KEY (id);


--
-- Name: supplier_invoices supplier_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_pkey PRIMARY KEY (id);


--
-- Name: supplier_ledger_entries supplier_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_ledger_entries
    ADD CONSTRAINT supplier_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: supplier_payment_allocations supplier_payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payment_allocations
    ADD CONSTRAINT supplier_payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: supplier_po_access_logs supplier_po_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_logs
    ADD CONSTRAINT supplier_po_access_logs_pkey PRIMARY KEY (id);


--
-- Name: supplier_po_access_tokens supplier_po_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_tokens
    ADD CONSTRAINT supplier_po_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: supplier_po_envelopes supplier_po_envelopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_envelopes
    ADD CONSTRAINT supplier_po_envelopes_pkey PRIMARY KEY (id);


--
-- Name: supplier_po_proposal_lines supplier_po_proposal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposal_lines
    ADD CONSTRAINT supplier_po_proposal_lines_pkey PRIMARY KEY (id);


--
-- Name: supplier_po_proposal_states supplier_po_proposal_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposal_states
    ADD CONSTRAINT supplier_po_proposal_states_pkey PRIMARY KEY (id);


--
-- Name: supplier_po_proposals supplier_po_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposals
    ADD CONSTRAINT supplier_po_proposals_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suspense_items suspense_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT suspense_items_pkey PRIMARY KEY (id);


--
-- Name: tax_rates tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_pkey PRIMARY KEY (id);


--
-- Name: tenant_module_configuration_commands tenant_module_configuration_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_configuration_commands
    ADD CONSTRAINT tenant_module_configuration_commands_pkey PRIMARY KEY (id);


--
-- Name: tenant_module_configurations tenant_module_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_configurations
    ADD CONSTRAINT tenant_module_configurations_pkey PRIMARY KEY ("organizationId");


--
-- Name: tenant_module_grants tenant_module_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_grants
    ADD CONSTRAINT tenant_module_grants_pkey PRIMARY KEY (id);


--
-- Name: tenant_module_lifecycle_events tenant_module_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_events
    ADD CONSTRAINT tenant_module_lifecycle_events_pkey PRIMARY KEY (id);


--
-- Name: tenant_module_lifecycle_operations tenant_module_lifecycle_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_operations
    ADD CONSTRAINT tenant_module_lifecycle_operations_pkey PRIMARY KEY (id);


--
-- Name: tenant_module_lifecycle_steps tenant_module_lifecycle_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_steps
    ADD CONSTRAINT tenant_module_lifecycle_steps_pkey PRIMARY KEY (id);


--
-- Name: three_way_matches three_way_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_way_matches
    ADD CONSTRAINT three_way_matches_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_alert_deliveries workflow_assurance_alert_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_alert_deliveries
    ADD CONSTRAINT workflow_assurance_alert_deliveries_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_check_definitions workflow_assurance_check_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_definitions
    ADD CONSTRAINT workflow_assurance_check_definitions_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_check_findings workflow_assurance_check_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_findings
    ADD CONSTRAINT workflow_assurance_check_findings_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_check_runs workflow_assurance_check_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_runs
    ADD CONSTRAINT workflow_assurance_check_runs_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_incident_events workflow_assurance_incident_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incident_events
    ADD CONSTRAINT workflow_assurance_incident_events_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_incidents workflow_assurance_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incidents
    ADD CONSTRAINT workflow_assurance_incidents_pkey PRIMARY KEY (id);


--
-- Name: workflow_assurance_waivers workflow_assurance_waivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_waivers
    ADD CONSTRAINT workflow_assurance_waivers_pkey PRIMARY KEY (id);


--
-- Name: _UserRoles_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_UserRoles_B_index" ON public."_UserRoles" USING btree ("B");


--
-- Name: accountant_access_grants_accountantUserId_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_access_grants_accountantUserId_status_expiresAt_idx" ON public.accountant_access_grants USING btree ("accountantUserId", status, "expiresAt");


--
-- Name: accountant_access_grants_activeScopeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accountant_access_grants_activeScopeKey_key" ON public.accountant_access_grants USING btree ("activeScopeKey");


--
-- Name: accountant_access_grants_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_access_grants_correlationId_idx" ON public.accountant_access_grants USING btree ("correlationId");


--
-- Name: accountant_access_grants_organizationId_accountantUserId_cr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_access_grants_organizationId_accountantUserId_cr_idx" ON public.accountant_access_grants USING btree ("organizationId", "accountantUserId", "createdAt");


--
-- Name: accountant_access_grants_organizationId_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_access_grants_organizationId_status_expiresAt_idx" ON public.accountant_access_grants USING btree ("organizationId", status, "expiresAt");


--
-- Name: accountant_client_invite_states_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX accountant_client_invite_states_hash_key ON public.accountant_client_invite_states USING btree ("organizationId", "stateHash");


--
-- Name: accountant_client_invite_states_identity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX accountant_client_invite_states_identity_key ON public.accountant_client_invite_states USING btree ("organizationId", "inviteId", version);


--
-- Name: accountant_client_invite_states_timeline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accountant_client_invite_states_timeline_idx ON public.accountant_client_invite_states USING btree ("organizationId", "inviteId", "occurredAt");


--
-- Name: accountant_client_invite_states_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accountant_client_invite_states_user_status_idx ON public.accountant_client_invite_states USING btree ("accountantUserId", status, "occurredAt");


--
-- Name: accountant_client_invites_attributionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accountant_client_invites_attributionId_key" ON public.accountant_client_invites USING btree ("attributionId");


--
-- Name: accountant_client_invites_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accountant_client_invites_created_idx ON public.accountant_client_invites USING btree ("organizationId", "createdAt");


--
-- Name: accountant_client_invites_email_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accountant_client_invites_email_expiry_idx ON public.accountant_client_invites USING btree ("organizationId", "emailHash", "expiresAt");


--
-- Name: accountant_client_invites_inviteTokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accountant_client_invites_inviteTokenHash_key" ON public.accountant_client_invites USING btree ("inviteTokenHash");


--
-- Name: accountant_client_invites_org_attribution_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX accountant_client_invites_org_attribution_key ON public.accountant_client_invites USING btree ("organizationId", "attributionId");


--
-- Name: accountant_client_invites_org_correlation_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX accountant_client_invites_org_correlation_key ON public.accountant_client_invites USING btree ("organizationId", "correlationId");


--
-- Name: accountant_client_invites_org_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX accountant_client_invites_org_idempotency_key ON public.accountant_client_invites USING btree ("organizationId", "idempotencyKey");


--
-- Name: accountant_client_invites_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accountant_client_invites_organizationId_id_key" ON public.accountant_client_invites USING btree ("organizationId", id);


--
-- Name: accountant_client_invites_outboxId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accountant_client_invites_outboxId_key" ON public.accountant_client_invites USING btree ("outboxId");


--
-- Name: accountant_comments_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_authorId_idx" ON public.accountant_comments USING btree ("authorId");


--
-- Name: accountant_comments_closeRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_closeRunId_idx" ON public.accountant_comments USING btree ("closeRunId");


--
-- Name: accountant_comments_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_correlationId_idx" ON public.accountant_comments USING btree ("correlationId");


--
-- Name: accountant_comments_evidenceItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_evidenceItemId_idx" ON public.accountant_comments USING btree ("evidenceItemId");


--
-- Name: accountant_comments_findingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_findingId_idx" ON public.accountant_comments USING btree ("findingId");


--
-- Name: accountant_comments_organizationId_periodId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_organizationId_periodId_createdAt_idx" ON public.accountant_comments USING btree ("organizationId", "periodId", "createdAt");


--
-- Name: accountant_comments_reviewId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_comments_reviewId_idx" ON public.accountant_comments USING btree ("reviewId");


--
-- Name: accountant_reviews_closeRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_reviews_closeRunId_idx" ON public.accountant_reviews USING btree ("closeRunId");


--
-- Name: accountant_reviews_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_reviews_correlationId_idx" ON public.accountant_reviews USING btree ("correlationId");


--
-- Name: accountant_reviews_organizationId_periodId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_reviews_organizationId_periodId_status_idx" ON public.accountant_reviews USING btree ("organizationId", "periodId", status);


--
-- Name: accountant_reviews_organizationId_reviewerId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accountant_reviews_organizationId_reviewerId_status_idx" ON public.accountant_reviews USING btree ("organizationId", "reviewerId", status);


--
-- Name: accounting_periods_fiscalYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounting_periods_fiscalYearId_idx" ON public.accounting_periods USING btree ("fiscalYearId");


--
-- Name: accounting_periods_organizationId_fiscalYearId_periodNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accounting_periods_organizationId_fiscalYearId_periodNumber_key" ON public.accounting_periods USING btree ("organizationId", "fiscalYearId", "periodNumber");


--
-- Name: accounting_periods_organizationId_status_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounting_periods_organizationId_status_startDate_idx" ON public.accounting_periods USING btree ("organizationId", status, "startDate");


--
-- Name: accounting_source_links_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounting_source_links_journalEntryId_idx" ON public.accounting_source_links USING btree ("journalEntryId");


--
-- Name: accounting_source_links_organizationId_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounting_source_links_organizationId_sourceType_sourceId_idx" ON public.accounting_source_links USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: accounting_source_links_postingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounting_source_links_postingBatchId_idx" ON public.accounting_source_links USING btree ("postingBatchId");


--
-- Name: accounts_providerId_accountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON public.accounts USING btree ("providerId", "accountId");


--
-- Name: accounts_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_userId_idx" ON public.accounts USING btree ("userId");


--
-- Name: agent_activation_approvals_approverId_decidedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_approvals_approverId_decidedAt_idx" ON public.agent_activation_approvals USING btree ("approverId", "decidedAt");


--
-- Name: agent_activation_approvals_packageId_approvalType_decision_expi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_approvals_packageId_approvalType_decision_expi" ON public.agent_activation_approvals USING btree ("packageId", "approvalType", decision, "expiresAt");


--
-- Name: agent_activation_approvals_packageId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_activation_approvals_packageId_idempotencyKey_key" ON public.agent_activation_approvals USING btree ("packageId", "idempotencyKey");


--
-- Name: agent_activation_owners_packageId_acceptedAt_validUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_owners_packageId_acceptedAt_validUntil_idx" ON public.agent_activation_owners USING btree ("packageId", "acceptedAt", "validUntil");


--
-- Name: agent_activation_owners_packageId_responsibility_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_activation_owners_packageId_responsibility_key" ON public.agent_activation_owners USING btree ("packageId", responsibility);


--
-- Name: agent_activation_owners_primaryUserId_responsibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_owners_primaryUserId_responsibility_idx" ON public.agent_activation_owners USING btree ("primaryUserId", responsibility);


--
-- Name: agent_activation_packages_environment_agentKey_releaseVersion_k; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_activation_packages_environment_agentKey_releaseVersion_k" ON public.agent_activation_packages USING btree (environment, "agentKey", "releaseVersion");


--
-- Name: agent_activation_packages_environment_agentKey_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_packages_environment_agentKey_state_idx" ON public.agent_activation_packages USING btree (environment, "agentKey", state);


--
-- Name: agent_activation_packages_manifestHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_packages_manifestHash_idx" ON public.agent_activation_packages USING btree ("manifestHash");


--
-- Name: agent_activation_packages_organizationId_agentKey_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_packages_organizationId_agentKey_state_idx" ON public.agent_activation_packages USING btree ("organizationId", "agentKey", state);


--
-- Name: agent_activation_packages_organizationId_retiredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_activation_packages_organizationId_retiredAt_idx" ON public.agent_activation_packages USING btree ("organizationId", "retiredAt");


--
-- Name: agent_cost_ledger_modelProvider_modelName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_cost_ledger_modelProvider_modelName_idx" ON public.agent_cost_ledger USING btree ("modelProvider", "modelName");


--
-- Name: agent_cost_ledger_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_cost_ledger_organizationId_createdAt_idx" ON public.agent_cost_ledger USING btree ("organizationId", "createdAt");


--
-- Name: agent_cost_ledger_runId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_cost_ledger_runId_idx" ON public.agent_cost_ledger USING btree ("runId");


--
-- Name: agent_definitions_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_definitions_key_key ON public.agent_definitions USING btree (key);


--
-- Name: agent_definitions_ownerModuleSlug_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_definitions_ownerModuleSlug_status_idx" ON public.agent_definitions USING btree ("ownerModuleSlug", status);


--
-- Name: agent_evidence_links_runId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_evidence_links_runId_idx" ON public.agent_evidence_links USING btree ("runId");


--
-- Name: agent_evidence_links_stepId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_evidence_links_stepId_idx" ON public.agent_evidence_links USING btree ("stepId");


--
-- Name: agent_evidence_links_subjectType_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_evidence_links_subjectType_subjectId_idx" ON public.agent_evidence_links USING btree ("subjectType", "subjectId");


--
-- Name: agent_feedback_organizationId_actorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_feedback_organizationId_actorId_createdAt_idx" ON public.agent_feedback USING btree ("organizationId", "actorId", "createdAt");


--
-- Name: agent_feedback_runId_actorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_feedback_runId_actorId_key" ON public.agent_feedback USING btree ("runId", "actorId");


--
-- Name: agent_feedback_runId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_feedback_runId_idx" ON public.agent_feedback USING btree ("runId");


--
-- Name: agent_pilot_certifications_commitSha_manifestHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_pilot_certifications_commitSha_manifestHash_idx" ON public.agent_pilot_certifications USING btree ("commitSha", "manifestHash");


--
-- Name: agent_pilot_certifications_packageId_ciRunId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_pilot_certifications_packageId_ciRunId_key" ON public.agent_pilot_certifications USING btree ("packageId", "ciRunId");


--
-- Name: agent_pilot_certifications_packageId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_pilot_certifications_packageId_idempotencyKey_key" ON public.agent_pilot_certifications USING btree ("packageId", "idempotencyKey");


--
-- Name: agent_pilot_certifications_packageId_result_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_pilot_certifications_packageId_result_expiresAt_idx" ON public.agent_pilot_certifications USING btree ("packageId", result, "expiresAt");


--
-- Name: agent_policy_incidents_actorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_policy_incidents_actorId_createdAt_idx" ON public.agent_policy_incidents USING btree ("actorId", "createdAt");


--
-- Name: agent_policy_incidents_organizationId_severity_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_policy_incidents_organizationId_severity_status_idx" ON public.agent_policy_incidents USING btree ("organizationId", severity, status);


--
-- Name: agent_policy_incidents_runId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_policy_incidents_runId_idx" ON public.agent_policy_incidents USING btree ("runId");


--
-- Name: agent_reconciler_active_lease; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_reconciler_active_lease ON public.agent_reconciler_invocations USING btree (environment, "activeKey");


--
-- Name: agent_reconciler_invocation_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_reconciler_invocation_identity ON public.agent_reconciler_invocations USING btree (environment, "scheduleKey", "runId");


--
-- Name: agent_reconciler_invocation_schedule_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_reconciler_invocation_schedule_idx ON public.agent_reconciler_invocations USING btree (environment, "scheduleKey", "scheduledAt");


--
-- Name: agent_reconciler_invocation_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_reconciler_invocation_status_idx ON public.agent_reconciler_invocations USING btree (environment, status, "startedAt");


--
-- Name: agent_runs_actorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_runs_actorId_createdAt_idx" ON public.agent_runs USING btree ("actorId", "createdAt");


--
-- Name: agent_runs_agentKey_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_runs_agentKey_status_createdAt_idx" ON public.agent_runs USING btree ("agentKey", status, "createdAt");


--
-- Name: agent_runs_id_organizationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_runs_id_organizationId_key" ON public.agent_runs USING btree (id, "organizationId");


--
-- Name: agent_runs_organizationId_actorId_agentKey_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_runs_organizationId_actorId_agentKey_correlationId_key" ON public.agent_runs USING btree ("organizationId", "actorId", "agentKey", "correlationId");


--
-- Name: agent_runs_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_runs_organizationId_createdAt_idx" ON public.agent_runs USING btree ("organizationId", "createdAt");


--
-- Name: agent_skill_definitions_key_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_skill_definitions_key_version_key ON public.agent_skill_definitions USING btree (key, version);


--
-- Name: agent_skill_definitions_ownerModuleSlug_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_skill_definitions_ownerModuleSlug_status_idx" ON public.agent_skill_definitions USING btree ("ownerModuleSlug", status);


--
-- Name: agent_steps_id_runId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_steps_id_runId_key" ON public.agent_steps USING btree (id, "runId");


--
-- Name: agent_steps_runId_stepNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "agent_steps_runId_stepNumber_key" ON public.agent_steps USING btree ("runId", "stepNumber");


--
-- Name: agent_steps_toolKey_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_steps_toolKey_status_idx" ON public.agent_steps USING btree ("toolKey", status);


--
-- Name: agent_tool_definitions_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_tool_definitions_key_key ON public.agent_tool_definitions USING btree (key);


--
-- Name: agent_tool_definitions_moduleSlug_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "agent_tool_definitions_moduleSlug_status_idx" ON public.agent_tool_definitions USING btree ("moduleSlug", status);


--
-- Name: ai_action_proposals_expiresAt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ai_action_proposals_expiresAt_status_idx" ON public.ai_action_proposals USING btree ("expiresAt", status);


--
-- Name: ai_action_proposals_id_organizationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ai_action_proposals_id_organizationId_key" ON public.ai_action_proposals USING btree (id, "organizationId");


--
-- Name: ai_action_proposals_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ai_action_proposals_organizationId_idempotencyKey_key" ON public.ai_action_proposals USING btree ("organizationId", "idempotencyKey");


--
-- Name: ai_action_proposals_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ai_action_proposals_organizationId_status_createdAt_idx" ON public.ai_action_proposals USING btree ("organizationId", status, "createdAt");


--
-- Name: ai_action_proposals_runId_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ai_action_proposals_runId_organizationId_idx" ON public.ai_action_proposals USING btree ("runId", "organizationId");


--
-- Name: audit_logs_entityType_entityId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON public.audit_logs USING btree ("entityType", "entityId", "createdAt");


--
-- Name: audit_logs_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON public.audit_logs USING btree ("organizationId", "createdAt");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: branch_daily_close_runs_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_runs_correlationId_idx" ON public.branch_daily_close_runs USING btree ("correlationId");


--
-- Name: branch_daily_close_runs_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_id_key" ON public.branch_daily_close_runs USING btree ("organizationId", id);


--
-- Name: branch_daily_close_runs_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_idempotencyKey_key" ON public.branch_daily_close_runs USING btree ("organizationId", "idempotencyKey");


--
-- Name: branch_daily_close_runs_organizationId_locationId_businessDate_; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_locationId_businessDate_" ON public.branch_daily_close_runs USING btree ("organizationId", "locationId", "businessDate");


--
-- Name: branch_daily_close_runs_organizationId_locationId_status_busine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_runs_organizationId_locationId_status_busine" ON public.branch_daily_close_runs USING btree ("organizationId", "locationId", status, "businessDate");


--
-- Name: branch_daily_close_runs_organizationId_status_businessDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_runs_organizationId_status_businessDate_idx" ON public.branch_daily_close_runs USING btree ("organizationId", status, "businessDate");


--
-- Name: branch_daily_close_runs_startedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_runs_startedById_idx" ON public.branch_daily_close_runs USING btree ("startedById");


--
-- Name: branch_daily_close_sign_offs_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_sign_offs_correlationId_idx" ON public.branch_daily_close_sign_offs USING btree ("correlationId");


--
-- Name: branch_daily_close_sign_offs_invalidatedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_sign_offs_invalidatedById_idx" ON public.branch_daily_close_sign_offs USING btree ("invalidatedById");


--
-- Name: branch_daily_close_sign_offs_organizationId_activeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_activeKey_key" ON public.branch_daily_close_sign_offs USING btree ("organizationId", "activeKey");


--
-- Name: branch_daily_close_sign_offs_organizationId_branchDailyCloseRun; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_sign_offs_organizationId_branchDailyCloseRun" ON public.branch_daily_close_sign_offs USING btree ("organizationId", "branchDailyCloseRunId", status, "signedAt");


--
-- Name: branch_daily_close_sign_offs_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_id_key" ON public.branch_daily_close_sign_offs USING btree ("organizationId", id);


--
-- Name: branch_daily_close_sign_offs_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_idempotencyKey_key" ON public.branch_daily_close_sign_offs USING btree ("organizationId", "idempotencyKey");


--
-- Name: branch_daily_close_sign_offs_signedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_sign_offs_signedById_idx" ON public.branch_daily_close_sign_offs USING btree ("signedById");


--
-- Name: branch_daily_close_sign_offs_supersedesSignOffId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "branch_daily_close_sign_offs_supersedesSignOffId_idx" ON public.branch_daily_close_sign_offs USING btree ("supersedesSignOffId");


--
-- Name: brands_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "brands_organizationId_idx" ON public.brands USING btree ("organizationId");


--
-- Name: brands_organizationId_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "brands_organizationId_slug_key" ON public.brands USING btree ("organizationId", slug);


--
-- Name: business_event_anomalies_businessEventId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_anomalies_businessEventId_createdAt_idx" ON public.business_event_anomalies USING btree ("businessEventId", "createdAt");


--
-- Name: business_event_anomalies_organizationId_businessEventId_anomaly; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "business_event_anomalies_organizationId_businessEventId_anomaly" ON public.business_event_anomalies USING btree ("organizationId", "businessEventId", "anomalyType", fingerprint);


--
-- Name: business_event_anomalies_organizationId_status_severity_lastSee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_anomalies_organizationId_status_severity_lastSee" ON public.business_event_anomalies USING btree ("organizationId", status, severity, "lastSeenAt");


--
-- Name: business_event_audits_businessEventId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_audits_businessEventId_createdAt_idx" ON public.business_event_audits USING btree ("businessEventId", "createdAt");


--
-- Name: business_event_audits_organizationId_action_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_audits_organizationId_action_createdAt_idx" ON public.business_event_audits USING btree ("organizationId", action, "createdAt");


--
-- Name: business_event_audits_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_audits_organizationId_createdAt_idx" ON public.business_event_audits USING btree ("organizationId", "createdAt");


--
-- Name: business_event_outbox_businessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_outbox_businessEventId_idx" ON public.business_event_outbox USING btree ("businessEventId");


--
-- Name: business_event_outbox_organizationId_channel_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "business_event_outbox_organizationId_channel_idempotencyKey_key" ON public.business_event_outbox USING btree ("organizationId", channel, "idempotencyKey");


--
-- Name: business_event_outbox_organizationId_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_outbox_organizationId_correlationId_idx" ON public.business_event_outbox USING btree ("organizationId", "correlationId");


--
-- Name: business_event_outbox_organizationId_status_availableAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_event_outbox_organizationId_status_availableAt_idx" ON public.business_event_outbox USING btree ("organizationId", status, "availableAt");


--
-- Name: business_events_organizationId_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_events_organizationId_correlationId_idx" ON public.business_events USING btree ("organizationId", "correlationId");


--
-- Name: business_events_organizationId_eventSource_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "business_events_organizationId_eventSource_idempotencyKey_key" ON public.business_events USING btree ("organizationId", "eventSource", "idempotencyKey");


--
-- Name: business_events_organizationId_eventType_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_events_organizationId_eventType_occurredAt_idx" ON public.business_events USING btree ("organizationId", "eventType", "occurredAt");


--
-- Name: business_events_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "business_events_organizationId_id_key" ON public.business_events USING btree ("organizationId", id);


--
-- Name: business_events_organizationId_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_events_organizationId_sourceType_sourceId_idx" ON public.business_events USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: business_events_organizationId_status_recordedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_events_organizationId_status_recordedAt_idx" ON public.business_events USING btree ("organizationId", status, "recordedAt");


--
-- Name: business_events_payloadHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_events_payloadHash_idx" ON public.business_events USING btree ("payloadHash");


--
-- Name: cash_drawer_transactions_cashDrawerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_drawer_transactions_cashDrawerId_createdAt_idx" ON public.cash_drawer_transactions USING btree ("cashDrawerId", "createdAt");


--
-- Name: cash_drawer_transactions_sessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_drawer_transactions_sessionId_idx" ON public.cash_drawer_transactions USING btree ("sessionId");


--
-- Name: cash_drawer_transactions_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_drawer_transactions_type_idx ON public.cash_drawer_transactions USING btree (type);


--
-- Name: cash_drawers_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_drawers_locationId_idx" ON public.cash_drawers USING btree ("locationId");


--
-- Name: cash_drawers_terminalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_drawers_terminalId_idx" ON public.cash_drawers USING btree ("terminalId");


--
-- Name: cash_shortage_policies_approvedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_shortage_policies_approvedById_idx" ON public.cash_shortage_policies USING btree ("approvedById");


--
-- Name: cash_shortage_policies_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_shortage_policies_createdById_idx" ON public.cash_shortage_policies USING btree ("createdById");


--
-- Name: cash_shortage_policies_organizationId_currency_status_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_shortage_policies_organizationId_currency_status_effective" ON public.cash_shortage_policies USING btree ("organizationId", currency, status, "effectiveFrom");


--
-- Name: cash_shortage_policies_organizationId_currency_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "cash_shortage_policies_organizationId_currency_version_key" ON public.cash_shortage_policies USING btree ("organizationId", currency, version);


--
-- Name: categories_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "categories_organizationId_idx" ON public.categories USING btree ("organizationId");


--
-- Name: categories_organizationId_isActive_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "categories_organizationId_isActive_deletedAt_idx" ON public.categories USING btree ("organizationId", "isActive", "deletedAt");


--
-- Name: categories_organizationId_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "categories_organizationId_parentId_idx" ON public.categories USING btree ("organizationId", "parentId");


--
-- Name: categories_organizationId_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "categories_organizationId_slug_key" ON public.categories USING btree ("organizationId", slug);


--
-- Name: chart_of_accounts_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "chart_of_accounts_organizationId_code_key" ON public.chart_of_accounts USING btree ("organizationId", code);


--
-- Name: chart_of_accounts_organizationId_mappingKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "chart_of_accounts_organizationId_mappingKey_key" ON public.chart_of_accounts USING btree ("organizationId", "mappingKey");


--
-- Name: chart_of_accounts_organizationId_type_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chart_of_accounts_organizationId_type_isActive_idx" ON public.chart_of_accounts USING btree ("organizationId", type, "isActive");


--
-- Name: chart_of_accounts_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chart_of_accounts_parentId_idx" ON public.chart_of_accounts USING btree ("parentId");


--
-- Name: close_assurance_findings_checklistItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_assurance_findings_checklistItemId_idx" ON public.close_assurance_findings USING btree ("checklistItemId");


--
-- Name: close_assurance_findings_closeRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_assurance_findings_closeRunId_idx" ON public.close_assurance_findings USING btree ("closeRunId");


--
-- Name: close_assurance_findings_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_assurance_findings_correlationId_idx" ON public.close_assurance_findings USING btree ("correlationId");


--
-- Name: close_assurance_findings_organizationId_domain_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_assurance_findings_organizationId_domain_severity_idx" ON public.close_assurance_findings USING btree ("organizationId", domain, severity);


--
-- Name: close_assurance_findings_organizationId_ownerId_status_dueAt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_assurance_findings_organizationId_ownerId_status_dueAt_id" ON public.close_assurance_findings USING btree ("organizationId", "ownerId", status, "dueAt");


--
-- Name: close_assurance_findings_organizationId_periodId_status_severit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_assurance_findings_organizationId_periodId_status_severit" ON public.close_assurance_findings USING btree ("organizationId", "periodId", status, severity);


--
-- Name: close_checklist_items_closeRunId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "close_checklist_items_closeRunId_key_key" ON public.close_checklist_items USING btree ("closeRunId", key);


--
-- Name: close_checklist_items_organizationId_domain_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_checklist_items_organizationId_domain_status_idx" ON public.close_checklist_items USING btree ("organizationId", domain, status);


--
-- Name: close_checklist_items_organizationId_ownerId_status_dueAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_checklist_items_organizationId_ownerId_status_dueAt_idx" ON public.close_checklist_items USING btree ("organizationId", "ownerId", status, "dueAt");


--
-- Name: close_checklist_items_organizationId_periodId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_checklist_items_organizationId_periodId_status_idx" ON public.close_checklist_items USING btree ("organizationId", "periodId", status);


--
-- Name: close_evidence_items_checklistItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_evidence_items_checklistItemId_idx" ON public.close_evidence_items USING btree ("checklistItemId");


--
-- Name: close_evidence_items_closeRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_evidence_items_closeRunId_idx" ON public.close_evidence_items USING btree ("closeRunId");


--
-- Name: close_evidence_items_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_evidence_items_correlationId_idx" ON public.close_evidence_items USING btree ("correlationId");


--
-- Name: close_evidence_items_findingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_evidence_items_findingId_idx" ON public.close_evidence_items USING btree ("findingId");


--
-- Name: close_evidence_items_organizationId_periodId_evidenceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_evidence_items_organizationId_periodId_evidenceType_idx" ON public.close_evidence_items USING btree ("organizationId", "periodId", "evidenceType");


--
-- Name: close_evidence_items_organizationId_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_evidence_items_organizationId_sourceType_sourceId_idx" ON public.close_evidence_items USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: close_pack_exports_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_pack_exports_correlationId_idx" ON public.close_pack_exports USING btree ("correlationId");


--
-- Name: close_pack_exports_organizationId_closeRunId_contentHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "close_pack_exports_organizationId_closeRunId_contentHash_key" ON public.close_pack_exports USING btree ("organizationId", "closeRunId", "contentHash");


--
-- Name: close_pack_exports_organizationId_periodId_exportedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_pack_exports_organizationId_periodId_exportedAt_idx" ON public.close_pack_exports USING btree ("organizationId", "periodId", "exportedAt");


--
-- Name: close_pack_exports_organizationId_watermarkId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_pack_exports_organizationId_watermarkId_idx" ON public.close_pack_exports USING btree ("organizationId", "watermarkId");


--
-- Name: close_runs_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_runs_correlationId_idx" ON public.close_runs USING btree ("correlationId");


--
-- Name: close_runs_organizationId_periodId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_runs_organizationId_periodId_status_createdAt_idx" ON public.close_runs USING btree ("organizationId", "periodId", status, "createdAt");


--
-- Name: close_runs_organizationId_status_asOf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_runs_organizationId_status_asOf_idx" ON public.close_runs USING btree ("organizationId", status, "asOf");


--
-- Name: close_runs_periodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_runs_periodId_idx" ON public.close_runs USING btree ("periodId");


--
-- Name: close_runs_runById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "close_runs_runById_idx" ON public.close_runs USING btree ("runById");


--
-- Name: compliance_adapter_configs_organizationId_countryCode_autho_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "compliance_adapter_configs_organizationId_countryCode_autho_key" ON public.compliance_adapter_configs USING btree ("organizationId", "countryCode", "authorityChannel", environment);


--
-- Name: compliance_adapter_configs_organizationId_status_countryCod_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_adapter_configs_organizationId_status_countryCod_idx" ON public.compliance_adapter_configs USING btree ("organizationId", status, "countryCode");


--
-- Name: compliance_evidence_authorityReference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_evidence_authorityReference_idx" ON public.compliance_evidence USING btree ("authorityReference");


--
-- Name: compliance_evidence_organizationId_evidenceType_artifactHas_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "compliance_evidence_organizationId_evidenceType_artifactHas_key" ON public.compliance_evidence USING btree ("organizationId", "evidenceType", "artifactHash");


--
-- Name: compliance_evidence_organizationId_fiscalDocumentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_evidence_organizationId_fiscalDocumentId_idx" ON public.compliance_evidence USING btree ("organizationId", "fiscalDocumentId");


--
-- Name: compliance_evidence_organizationId_submissionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_evidence_organizationId_submissionId_idx" ON public.compliance_evidence USING btree ("organizationId", "submissionId");


--
-- Name: compliance_submissions_adapterConfigId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_submissions_adapterConfigId_idx" ON public.compliance_submissions USING btree ("adapterConfigId");


--
-- Name: compliance_submissions_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_submissions_correlationId_idx" ON public.compliance_submissions USING btree ("correlationId");


--
-- Name: compliance_submissions_fiscalDocumentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_submissions_fiscalDocumentId_idx" ON public.compliance_submissions USING btree ("fiscalDocumentId");


--
-- Name: compliance_submissions_organizationId_authorityChannel_oper_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "compliance_submissions_organizationId_authorityChannel_oper_key" ON public.compliance_submissions USING btree ("organizationId", "authorityChannel", operation, "idempotencyKey");


--
-- Name: compliance_submissions_organizationId_authorityChannel_stat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_submissions_organizationId_authorityChannel_stat_idx" ON public.compliance_submissions USING btree ("organizationId", "authorityChannel", status);


--
-- Name: compliance_submissions_organizationId_status_nextAttemptAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compliance_submissions_organizationId_status_nextAttemptAt_idx" ON public.compliance_submissions USING btree ("organizationId", status, "nextAttemptAt");


--
-- Name: customer_ledger_entries_customerId_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_ledger_entries_customerId_entryDate_idx" ON public.customer_ledger_entries USING btree ("customerId", "entryDate");


--
-- Name: customer_ledger_entries_organizationId_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_ledger_entries_organizationId_entryDate_idx" ON public.customer_ledger_entries USING btree ("organizationId", "entryDate");


--
-- Name: customer_ledger_entries_referenceType_referenceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_ledger_entries_referenceType_referenceId_idx" ON public.customer_ledger_entries USING btree ("referenceType", "referenceId");


--
-- Name: customer_locations_org_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_locations_org_customer_idx ON public.customer_locations USING btree ("organizationId", "customerId");


--
-- Name: customer_locations_org_customer_location_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_locations_org_customer_location_key ON public.customer_locations USING btree ("organizationId", "customerId", "locationId");


--
-- Name: customer_locations_org_location_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_locations_org_location_customer_idx ON public.customer_locations USING btree ("organizationId", "locationId", "customerId");


--
-- Name: customer_receivable_document_states_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_receivable_document_states_organizationId_id_key" ON public.customer_receivable_document_states USING btree ("organizationId", id);


--
-- Name: customer_receivable_documents_customer_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_receivable_documents_customer_due_idx ON public.customer_receivable_documents USING btree ("organizationId", "customerId", "dueDate");


--
-- Name: customer_receivable_documents_customer_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_receivable_documents_customer_invoice_idx ON public.customer_receivable_documents USING btree ("organizationId", "customerId", "invoiceDate");


--
-- Name: customer_receivable_documents_document_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_receivable_documents_document_version_key ON public.customer_receivable_documents USING btree ("organizationId", "documentNumber", version);


--
-- Name: customer_receivable_documents_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_receivable_documents_organizationId_id_key" ON public.customer_receivable_documents USING btree ("organizationId", id);


--
-- Name: customer_receivable_documents_source_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_receivable_documents_source_version_key ON public.customer_receivable_documents USING btree ("organizationId", "sourceSalesOrderId", version);


--
-- Name: customer_receivable_documents_supersedes_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_receivable_documents_supersedes_idx ON public.customer_receivable_documents USING btree ("organizationId", "supersedesDocumentId");


--
-- Name: customer_receivable_states_document_effective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_receivable_states_document_effective_idx ON public.customer_receivable_document_states USING btree ("organizationId", "documentId", "effectiveAt");


--
-- Name: customer_receivable_states_document_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_receivable_states_document_version_key ON public.customer_receivable_document_states USING btree ("organizationId", "documentId", version);


--
-- Name: customer_receivable_states_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_receivable_states_source_idx ON public.customer_receivable_document_states USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: customer_receivable_states_state_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_receivable_states_state_hash_key ON public.customer_receivable_document_states USING btree ("organizationId", "stateHash");


--
-- Name: customer_settlement_allocations_customerLedgerEntryId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_settlement_allocations_customerLedgerEntryId_key" ON public.customer_settlement_allocations USING btree ("customerLedgerEntryId");


--
-- Name: customer_settlement_allocations_customerSettlementId_salesOrder; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_settlement_allocations_customerSettlementId_salesOrder" ON public.customer_settlement_allocations USING btree ("customerSettlementId", "salesOrderId");


--
-- Name: customer_settlement_allocations_organizationId_salesOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_settlement_allocations_organizationId_salesOrderId_idx" ON public.customer_settlement_allocations USING btree ("organizationId", "salesOrderId");


--
-- Name: customer_settlement_allocations_receivable_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_settlement_allocations_receivable_idx ON public.customer_settlement_allocations USING btree ("organizationId", "customerReceivableDocumentId");


--
-- Name: customer_settlement_allocations_reversalCustomerLedgerEntryId_k; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_settlement_allocations_reversalCustomerLedgerEntryId_k" ON public.customer_settlement_allocations USING btree ("reversalCustomerLedgerEntryId");


--
-- Name: customer_settlement_allocations_settlement_receivable_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_settlement_allocations_settlement_receivable_key ON public.customer_settlement_allocations USING btree ("customerSettlementId", "customerReceivableDocumentId");


--
-- Name: customer_settlements_external_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_settlements_external_reference_key ON public.customer_settlements USING btree ("organizationId", method, "externalReference");


--
-- Name: customer_settlements_organizationId_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_settlements_organizationId_correlationId_key" ON public.customer_settlements USING btree ("organizationId", "correlationId");


--
-- Name: customer_settlements_organizationId_customerId_status_settlemen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_settlements_organizationId_customerId_status_settlemen" ON public.customer_settlements USING btree ("organizationId", "customerId", status, "settlementDate");


--
-- Name: customer_settlements_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_settlements_organizationId_idempotencyKey_key" ON public.customer_settlements USING btree ("organizationId", "idempotencyKey");


--
-- Name: customer_settlements_organizationId_settlementDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_settlements_organizationId_settlementDate_idx" ON public.customer_settlements USING btree ("organizationId", "settlementDate");


--
-- Name: customer_settlements_organizationId_settlementNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_settlements_organizationId_settlementNumber_key" ON public.customer_settlements USING btree ("organizationId", "settlementNumber");


--
-- Name: customer_settlements_reversal_correlation_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_settlements_reversal_correlation_key ON public.customer_settlements USING btree ("organizationId", "reversalCorrelationId");


--
-- Name: customer_settlements_reversal_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_settlements_reversal_idempotency_key ON public.customer_settlements USING btree ("organizationId", "reversalIdempotencyKey");


--
-- Name: customer_statement_access_logs_organizationId_statementSnapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_access_logs_organizationId_statementSnapshot" ON public.customer_statement_access_logs USING btree ("organizationId", "statementSnapshotId", "occurredAt");


--
-- Name: customer_statement_access_logs_organizationId_tokenId_occurredA; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_access_logs_organizationId_tokenId_occurredA" ON public.customer_statement_access_logs USING btree ("organizationId", "tokenId", "occurredAt");


--
-- Name: customer_statement_access_tokens_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_access_tokens_organizationId_id_key" ON public.customer_statement_access_tokens USING btree ("organizationId", id);


--
-- Name: customer_statement_access_tokens_organizationId_jtiHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_access_tokens_organizationId_jtiHash_key" ON public.customer_statement_access_tokens USING btree ("organizationId", "jtiHash");


--
-- Name: customer_statement_access_tokens_organizationId_statementSnapsh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_access_tokens_organizationId_statementSnapsh" ON public.customer_statement_access_tokens USING btree ("organizationId", "statementSnapshotId", status);


--
-- Name: customer_statement_access_tokens_organizationId_status_expiresA; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_access_tokens_organizationId_status_expiresA" ON public.customer_statement_access_tokens USING btree ("organizationId", status, "expiresAt");


--
-- Name: customer_statement_access_tokens_organizationId_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_access_tokens_organizationId_tokenHash_key" ON public.customer_statement_access_tokens USING btree ("organizationId", "tokenHash");


--
-- Name: customer_statement_deliveries_destination_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_statement_deliveries_destination_idx ON public.customer_statement_deliveries USING btree ("organizationId", "destinationHash", "createdAt");


--
-- Name: customer_statement_deliveries_organizationId_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_deliveries_organizationId_correlationId_key" ON public.customer_statement_deliveries USING btree ("organizationId", "correlationId");


--
-- Name: customer_statement_deliveries_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_deliveries_organizationId_id_key" ON public.customer_statement_deliveries USING btree ("organizationId", id);


--
-- Name: customer_statement_deliveries_outboxId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_deliveries_outboxId_key" ON public.customer_statement_deliveries USING btree ("outboxId");


--
-- Name: customer_statement_deliveries_statement_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_statement_deliveries_statement_channel_idx ON public.customer_statement_deliveries USING btree ("organizationId", "statementSnapshotId", channel, "createdAt");


--
-- Name: customer_statement_deliveries_statement_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_deliveries_statement_idempotency_key ON public.customer_statement_deliveries USING btree ("organizationId", "statementSnapshotId", "idempotencyKey");


--
-- Name: customer_statement_delivery_states_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_delivery_states_hash_key ON public.customer_statement_delivery_states USING btree ("organizationId", "stateHash");


--
-- Name: customer_statement_delivery_states_identity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_delivery_states_identity_key ON public.customer_statement_delivery_states USING btree ("organizationId", "deliveryId", version);


--
-- Name: customer_statement_delivery_states_timeline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_statement_delivery_states_timeline_idx ON public.customer_statement_delivery_states USING btree ("organizationId", "deliveryId", "occurredAt");


--
-- Name: customer_statement_recipient_action_states_action_effective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_statement_recipient_action_states_action_effective_idx ON public.customer_statement_recipient_action_states USING btree ("organizationId", "actionId", "effectiveAt");


--
-- Name: customer_statement_recipient_action_states_action_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_recipient_action_states_action_version_key ON public.customer_statement_recipient_action_states USING btree ("organizationId", "actionId", version);


--
-- Name: customer_statement_recipient_action_states_state_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_recipient_action_states_state_hash_key ON public.customer_statement_recipient_action_states USING btree ("organizationId", "stateHash");


--
-- Name: customer_statement_recipient_actions_organizationId_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_recipient_actions_organizationId_correlation" ON public.customer_statement_recipient_actions USING btree ("organizationId", "correlationId");


--
-- Name: customer_statement_recipient_actions_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_recipient_actions_organizationId_id_key" ON public.customer_statement_recipient_actions USING btree ("organizationId", id);


--
-- Name: customer_statement_recipient_actions_receivable_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_statement_recipient_actions_receivable_idx ON public.customer_statement_recipient_actions USING btree ("organizationId", "customerReceivableDocumentId");


--
-- Name: customer_statement_recipient_actions_statement_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_recipient_actions_statement_idempotency_key ON public.customer_statement_recipient_actions USING btree ("organizationId", "statementSnapshotId", "idempotencyKey");


--
-- Name: customer_statement_recipient_actions_statement_type_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_statement_recipient_actions_statement_type_created_idx ON public.customer_statement_recipient_actions USING btree ("organizationId", "statementSnapshotId", "actionType", "createdAt");


--
-- Name: customer_statement_scope_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_statement_scope_version_key ON public.customer_statement_snapshots USING btree ("organizationId", "customerId", "periodStart", "periodEnd", currency, version);


--
-- Name: customer_statement_snapshots_organizationId_contentHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_contentHash_key" ON public.customer_statement_snapshots USING btree ("organizationId", "contentHash");


--
-- Name: customer_statement_snapshots_organizationId_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_correlationId_key" ON public.customer_statement_snapshots USING btree ("organizationId", "correlationId");


--
-- Name: customer_statement_snapshots_organizationId_customerId_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_snapshots_organizationId_customerId_currency" ON public.customer_statement_snapshots USING btree ("organizationId", "customerId", currency, "periodEnd");


--
-- Name: customer_statement_snapshots_organizationId_customerId_periodEn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_snapshots_organizationId_customerId_periodEn" ON public.customer_statement_snapshots USING btree ("organizationId", "customerId", "periodEnd");


--
-- Name: customer_statement_snapshots_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_id_key" ON public.customer_statement_snapshots USING btree ("organizationId", id);


--
-- Name: customer_statement_snapshots_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_idempotencyKey_key" ON public.customer_statement_snapshots USING btree ("organizationId", "idempotencyKey");


--
-- Name: customer_statement_snapshots_organizationId_statementNumber_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_statementNumber_ver" ON public.customer_statement_snapshots USING btree ("organizationId", "statementNumber", version);


--
-- Name: customer_statement_snapshots_organizationId_supersedesStatement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_statement_snapshots_organizationId_supersedesStatement" ON public.customer_statement_snapshots USING btree ("organizationId", "supersedesStatementId");


--
-- Name: customers_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_email_idx ON public.customers USING btree (email);


--
-- Name: customers_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customers_organizationId_code_key" ON public.customers USING btree ("organizationId", code);


--
-- Name: customers_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customers_organizationId_id_key" ON public.customers USING btree ("organizationId", id);


--
-- Name: customers_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customers_organizationId_idx" ON public.customers USING btree ("organizationId");


--
-- Name: customers_organizationId_isActive_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customers_organizationId_isActive_deletedAt_idx" ON public.customers USING btree ("organizationId", "isActive", "deletedAt");


--
-- Name: customers_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_phone_idx ON public.customers USING btree (phone);


--
-- Name: daily_sales_report_cash_events_reportId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_sales_report_cash_events_reportId_idx" ON public.daily_sales_report_cash_events USING btree ("reportId");


--
-- Name: daily_sales_report_items_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_sales_report_items_itemId_idx" ON public.daily_sales_report_items USING btree ("itemId");


--
-- Name: daily_sales_report_items_reportId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_sales_report_items_reportId_idx" ON public.daily_sales_report_items USING btree ("reportId");


--
-- Name: daily_sales_reports_date_locationId_organizationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "daily_sales_reports_date_locationId_organizationId_key" ON public.daily_sales_reports USING btree (date, "locationId", "organizationId");


--
-- Name: daily_sales_reports_locationId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_sales_reports_locationId_date_idx" ON public.daily_sales_reports USING btree ("locationId", date);


--
-- Name: daily_sales_reports_organizationId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_sales_reports_organizationId_date_idx" ON public.daily_sales_reports USING btree ("organizationId", date);


--
-- Name: delivery_billing_lines_billingOutcomeId_salesOrderLineId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_billing_lines_billingOutcomeId_salesOrderLineId_key" ON public.delivery_billing_lines USING btree ("billingOutcomeId", "salesOrderLineId");


--
-- Name: delivery_billing_lines_organizationId_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "delivery_billing_lines_organizationId_itemId_idx" ON public.delivery_billing_lines USING btree ("organizationId", "itemId");


--
-- Name: delivery_billing_outcomes_organizationId_commandEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_billing_outcomes_organizationId_commandEventId_key" ON public.delivery_billing_outcomes USING btree ("organizationId", "commandEventId");


--
-- Name: delivery_billing_outcomes_organizationId_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_billing_outcomes_organizationId_invoiceNumber_key" ON public.delivery_billing_outcomes USING btree ("organizationId", "invoiceNumber");


--
-- Name: delivery_billing_outcomes_organizationId_status_postedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "delivery_billing_outcomes_organizationId_status_postedAt_idx" ON public.delivery_billing_outcomes USING btree ("organizationId", status, "postedAt");


--
-- Name: delivery_billing_outcomes_salesOrderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_billing_outcomes_salesOrderId_key" ON public.delivery_billing_outcomes USING btree ("salesOrderId");


--
-- Name: delivery_goods_issue_lines_goodsIssueId_salesOrderLineId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_goods_issue_lines_goodsIssueId_salesOrderLineId_key" ON public.delivery_goods_issue_lines USING btree ("goodsIssueId", "salesOrderLineId");


--
-- Name: delivery_goods_issue_lines_organizationId_itemId_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "delivery_goods_issue_lines_organizationId_itemId_locationId_idx" ON public.delivery_goods_issue_lines USING btree ("organizationId", "itemId", "locationId");


--
-- Name: delivery_goods_issues_organizationId_commandEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_goods_issues_organizationId_commandEventId_key" ON public.delivery_goods_issues USING btree ("organizationId", "commandEventId");


--
-- Name: delivery_goods_issues_organizationId_issueNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_goods_issues_organizationId_issueNumber_key" ON public.delivery_goods_issues USING btree ("organizationId", "issueNumber");


--
-- Name: delivery_goods_issues_organizationId_salesOrderId_kind_issuedAt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "delivery_goods_issues_organizationId_salesOrderId_kind_issuedAt" ON public.delivery_goods_issues USING btree ("organizationId", "salesOrderId", kind, "issuedAt");


--
-- Name: delivery_goods_issues_reversalOfGoodsIssueId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_goods_issues_reversalOfGoodsIssueId_key" ON public.delivery_goods_issues USING btree ("reversalOfGoodsIssueId");


--
-- Name: delivery_reservation_lines_organizationId_itemId_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "delivery_reservation_lines_organizationId_itemId_locationId_idx" ON public.delivery_reservation_lines USING btree ("organizationId", "itemId", "locationId");


--
-- Name: delivery_reservation_lines_reservationId_salesOrderLineId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_reservation_lines_reservationId_salesOrderLineId_key" ON public.delivery_reservation_lines USING btree ("reservationId", "salesOrderLineId");


--
-- Name: delivery_reservations_organizationId_commandEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_reservations_organizationId_commandEventId_key" ON public.delivery_reservations USING btree ("organizationId", "commandEventId");


--
-- Name: delivery_reservations_organizationId_locationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "delivery_reservations_organizationId_locationId_status_idx" ON public.delivery_reservations USING btree ("organizationId", "locationId", status);


--
-- Name: delivery_reservations_organizationId_salesOrderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "delivery_reservations_organizationId_salesOrderId_key" ON public.delivery_reservations USING btree ("organizationId", "salesOrderId");


--
-- Name: document_sequences_organizationId_documentType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "document_sequences_organizationId_documentType_idx" ON public.document_sequences USING btree ("organizationId", "documentType");


--
-- Name: document_sequences_organizationId_documentType_scopeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "document_sequences_organizationId_documentType_scopeKey_key" ON public.document_sequences USING btree ("organizationId", "documentType", "scopeKey");


--
-- Name: expense_categories_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_categories_organizationId_idx" ON public.expense_categories USING btree ("organizationId");


--
-- Name: expense_categories_organizationId_nameEn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expense_categories_organizationId_nameEn_key" ON public.expense_categories USING btree ("organizationId", "nameEn");


--
-- Name: expenses_organizationId_categoryId_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_organizationId_categoryId_expenseDate_idx" ON public.expenses USING btree ("organizationId", "categoryId", "expenseDate");


--
-- Name: expenses_organizationId_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_organizationId_expenseDate_idx" ON public.expenses USING btree ("organizationId", "expenseDate");


--
-- Name: expenses_organizationId_expenseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expenses_organizationId_expenseNumber_key" ON public.expenses USING btree ("organizationId", "expenseNumber");


--
-- Name: expenses_supplierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_supplierId_idx" ON public.expenses USING btree ("supplierId");


--
-- Name: fiscal_document_lines_fiscalDocumentId_lineNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fiscal_document_lines_fiscalDocumentId_lineNumber_key" ON public.fiscal_document_lines USING btree ("fiscalDocumentId", "lineNumber");


--
-- Name: fiscal_document_lines_organizationId_fiscalDocumentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_document_lines_organizationId_fiscalDocumentId_idx" ON public.fiscal_document_lines USING btree ("organizationId", "fiscalDocumentId");


--
-- Name: fiscal_document_lines_organizationId_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_document_lines_organizationId_itemId_idx" ON public.fiscal_document_lines USING btree ("organizationId", "itemId");


--
-- Name: fiscal_documents_accountingSourceLinkId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_accountingSourceLinkId_idx" ON public.fiscal_documents USING btree ("accountingSourceLinkId");


--
-- Name: fiscal_documents_authorityReference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_authorityReference_idx" ON public.fiscal_documents USING btree ("authorityReference");


--
-- Name: fiscal_documents_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_journalEntryId_idx" ON public.fiscal_documents USING btree ("journalEntryId");


--
-- Name: fiscal_documents_organizationId_countryCode_documentType_fi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_organizationId_countryCode_documentType_fi_idx" ON public.fiscal_documents USING btree ("organizationId", "countryCode", "documentType", "fiscalYear");


--
-- Name: fiscal_documents_organizationId_countryCode_documentType_fi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fiscal_documents_organizationId_countryCode_documentType_fi_key" ON public.fiscal_documents USING btree ("organizationId", "countryCode", "documentType", "fiscalYear", "fiscalPeriodKey", "sequenceScopeKey", "legalNumber");


--
-- Name: fiscal_documents_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fiscal_documents_organizationId_idempotencyKey_key" ON public.fiscal_documents USING btree ("organizationId", "idempotencyKey");


--
-- Name: fiscal_documents_organizationId_sourceType_sourceId_documen_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fiscal_documents_organizationId_sourceType_sourceId_documen_key" ON public.fiscal_documents USING btree ("organizationId", "sourceType", "sourceId", "documentType");


--
-- Name: fiscal_documents_organizationId_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_organizationId_sourceType_sourceId_idx" ON public.fiscal_documents USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: fiscal_documents_organizationId_status_issueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_organizationId_status_issueDate_idx" ON public.fiscal_documents USING btree ("organizationId", status, "issueDate");


--
-- Name: fiscal_documents_originalFiscalDocumentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_originalFiscalDocumentId_idx" ON public.fiscal_documents USING btree ("originalFiscalDocumentId");


--
-- Name: fiscal_documents_postingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_postingBatchId_idx" ON public.fiscal_documents USING btree ("postingBatchId");


--
-- Name: fiscal_documents_sequenceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_documents_sequenceId_idx" ON public.fiscal_documents USING btree ("sequenceId");


--
-- Name: fiscal_sequences_organizationId_countryCode_documentType_fi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fiscal_sequences_organizationId_countryCode_documentType_fi_key" ON public.fiscal_sequences USING btree ("organizationId", "countryCode", "documentType", "fiscalYear", "fiscalPeriodKey", "scopeKey");


--
-- Name: fiscal_sequences_organizationId_status_countryCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_sequences_organizationId_status_countryCode_idx" ON public.fiscal_sequences USING btree ("organizationId", status, "countryCode");


--
-- Name: fiscal_years_organizationId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "fiscal_years_organizationId_name_key" ON public.fiscal_years USING btree ("organizationId", name);


--
-- Name: fiscal_years_organizationId_status_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_years_organizationId_status_startDate_idx" ON public.fiscal_years USING btree ("organizationId", status, "startDate");


--
-- Name: goods_receipt_inspection_resolutions_goodsReceiptId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipt_inspection_resolutions_goodsReceiptId_key" ON public.goods_receipt_inspection_resolutions USING btree ("goodsReceiptId");


--
-- Name: goods_receipt_inspection_resolutions_inspectionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipt_inspection_resolutions_inspectionId_key" ON public.goods_receipt_inspection_resolutions USING btree ("inspectionId");


--
-- Name: goods_receipt_inspections_goodsReceiptId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipt_inspections_goodsReceiptId_key" ON public.goods_receipt_inspections USING btree ("goodsReceiptId");


--
-- Name: goods_receipt_lines_goodsReceiptId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipt_lines_goodsReceiptId_idx" ON public.goods_receipt_lines USING btree ("goodsReceiptId");


--
-- Name: goods_receipt_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipt_lines_itemId_idx" ON public.goods_receipt_lines USING btree ("itemId");


--
-- Name: goods_receipt_lines_purchaseOrderLineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipt_lines_purchaseOrderLineId_idx" ON public.goods_receipt_lines USING btree ("purchaseOrderLineId");


--
-- Name: goods_receipts_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_locationId_idx" ON public.goods_receipts USING btree ("locationId");


--
-- Name: goods_receipts_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipts_organizationId_id_key" ON public.goods_receipts USING btree ("organizationId", id);


--
-- Name: goods_receipts_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipts_organizationId_idempotencyKey_key" ON public.goods_receipts USING btree ("organizationId", "idempotencyKey");


--
-- Name: goods_receipts_organizationId_purchaseOrderId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_organizationId_purchaseOrderId_status_idx" ON public.goods_receipts USING btree ("organizationId", "purchaseOrderId", status);


--
-- Name: goods_receipts_organizationId_receiptNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipts_organizationId_receiptNumber_key" ON public.goods_receipts USING btree ("organizationId", "receiptNumber");


--
-- Name: goods_receipts_organizationId_status_receiptDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_organizationId_status_receiptDate_idx" ON public.goods_receipts USING btree ("organizationId", status, "receiptDate");


--
-- Name: goods_receipts_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_purchaseOrderId_idx" ON public.goods_receipts USING btree ("purchaseOrderId");


--
-- Name: gr_inspection_org_outcome_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gr_inspection_org_outcome_at_idx ON public.goods_receipt_inspections USING btree ("organizationId", outcome, "inspectedAt");


--
-- Name: gr_inspection_org_receipt_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX gr_inspection_org_receipt_key ON public.goods_receipt_inspections USING btree ("organizationId", "goodsReceiptId");


--
-- Name: gr_inspection_resolution_org_decision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gr_inspection_resolution_org_decision_idx ON public.goods_receipt_inspection_resolutions USING btree ("organizationId", decision, "resolvedAt");


--
-- Name: gr_inspection_resolution_org_idem_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX gr_inspection_resolution_org_idem_key ON public.goods_receipt_inspection_resolutions USING btree ("organizationId", "idempotencyKey");


--
-- Name: hris_attendance_anomalies_organizationId_employeeId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_attendance_anomalies_organizationId_employeeId_status_idx" ON public.hris_attendance_anomalies USING btree ("organizationId", "employeeId", status);


--
-- Name: hris_attendance_anomalies_organizationId_status_severity_cr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_attendance_anomalies_organizationId_status_severity_cr_idx" ON public.hris_attendance_anomalies USING btree ("organizationId", status, severity, "createdAt");


--
-- Name: hris_employment_assignments_organizationId_employeeId_type_stat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_employment_assignments_organizationId_employeeId_type_stat" ON public.hris_employment_assignments USING btree ("organizationId", "employeeId", type, status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_employment_assignments_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_employment_assignments_organizationId_id_key" ON public.hris_employment_assignments USING btree ("organizationId", id);


--
-- Name: hris_employment_assignments_organizationId_orgUnitId_status_eff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_employment_assignments_organizationId_orgUnitId_status_eff" ON public.hris_employment_assignments USING btree ("organizationId", "orgUnitId", status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_employment_assignments_organizationId_positionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_employment_assignments_organizationId_positionId_idx" ON public.hris_employment_assignments USING btree ("organizationId", "positionId");


--
-- Name: hris_leave_balance_entries_organizationId_employeeId_leaveP_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_leave_balance_entries_organizationId_employeeId_leaveP_idx" ON public.hris_leave_balance_entries USING btree ("organizationId", "employeeId", "leavePolicyId", "effectiveAt");


--
-- Name: hris_leave_balance_entries_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_leave_balance_entries_organizationId_idempotencyKey_key" ON public.hris_leave_balance_entries USING btree ("organizationId", "idempotencyKey");


--
-- Name: hris_leave_balance_entries_organizationId_sourceType_source_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_leave_balance_entries_organizationId_sourceType_source_key" ON public.hris_leave_balance_entries USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: hris_leave_policies_organizationId_code_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_leave_policies_organizationId_code_version_key" ON public.hris_leave_policies USING btree ("organizationId", code, version);


--
-- Name: hris_leave_policies_organizationId_countryCode_status_effec_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_leave_policies_organizationId_countryCode_status_effec_idx" ON public.hris_leave_policies USING btree ("organizationId", "countryCode", status, "effectiveFrom");


--
-- Name: hris_manager_delegations_organizationId_delegateEmployeeId_auth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_manager_delegations_organizationId_delegateEmployeeId_auth" ON public.hris_manager_delegations USING btree ("organizationId", "delegateEmployeeId", authority, status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_manager_delegations_organizationId_delegatorEmployeeId_sta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_manager_delegations_organizationId_delegatorEmployeeId_sta" ON public.hris_manager_delegations USING btree ("organizationId", "delegatorEmployeeId", status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_manager_delegations_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_manager_delegations_organizationId_id_key" ON public.hris_manager_delegations USING btree ("organizationId", id);


--
-- Name: hris_manager_delegations_organizationId_scopeOrgUnitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_manager_delegations_organizationId_scopeOrgUnitId_idx" ON public.hris_manager_delegations USING btree ("organizationId", "scopeOrgUnitId");


--
-- Name: hris_manager_delegations_organizationId_supersedesDelegationId_; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_manager_delegations_organizationId_supersedesDelegationId_" ON public.hris_manager_delegations USING btree ("organizationId", "supersedesDelegationId");


--
-- Name: hris_org_units_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_org_units_organizationId_code_key" ON public.hris_org_units USING btree ("organizationId", code);


--
-- Name: hris_org_units_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_org_units_organizationId_id_key" ON public.hris_org_units USING btree ("organizationId", id);


--
-- Name: hris_org_units_organizationId_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_org_units_organizationId_parentId_idx" ON public.hris_org_units USING btree ("organizationId", "parentId");


--
-- Name: hris_org_units_organizationId_type_status_effectiveFrom_effecti; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_org_units_organizationId_type_status_effectiveFrom_effecti" ON public.hris_org_units USING btree ("organizationId", type, status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_positions_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_positions_organizationId_code_key" ON public.hris_positions USING btree ("organizationId", code);


--
-- Name: hris_positions_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_positions_organizationId_id_key" ON public.hris_positions USING btree ("organizationId", id);


--
-- Name: hris_positions_organizationId_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_positions_organizationId_locationId_idx" ON public.hris_positions USING btree ("organizationId", "locationId");


--
-- Name: hris_positions_organizationId_orgUnitId_status_effectiveFrom_ef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_positions_organizationId_orgUnitId_status_effectiveFrom_ef" ON public.hris_positions USING btree ("organizationId", "orgUnitId", status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_public_holidays_organizationId_calendarId_holidayDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_public_holidays_organizationId_calendarId_holidayDate_key" ON public.hris_public_holidays USING btree ("organizationId", "calendarId", "holidayDate");


--
-- Name: hris_public_holidays_organizationId_holidayDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_public_holidays_organizationId_holidayDate_idx" ON public.hris_public_holidays USING btree ("organizationId", "holidayDate");


--
-- Name: hris_reporting_relationships_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_reporting_relationships_organizationId_id_key" ON public.hris_reporting_relationships USING btree ("organizationId", id);


--
-- Name: hris_reporting_relationships_organizationId_managerAssignmentId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_reporting_relationships_organizationId_managerAssignmentId" ON public.hris_reporting_relationships USING btree ("organizationId", "managerAssignmentId");


--
-- Name: hris_reporting_relationships_organizationId_managerEmployeeId_s; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_reporting_relationships_organizationId_managerEmployeeId_s" ON public.hris_reporting_relationships USING btree ("organizationId", "managerEmployeeId", status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_reporting_relationships_organizationId_reportAssignmentId_; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_reporting_relationships_organizationId_reportAssignmentId_" ON public.hris_reporting_relationships USING btree ("organizationId", "reportAssignmentId");


--
-- Name: hris_reporting_relationships_organizationId_reportEmployeeId_st; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_reporting_relationships_organizationId_reportEmployeeId_st" ON public.hris_reporting_relationships USING btree ("organizationId", "reportEmployeeId", status, "effectiveFrom", "effectiveTo");


--
-- Name: hris_reporting_relationships_organizationId_supersedesRelations; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_reporting_relationships_organizationId_supersedesRelations" ON public.hris_reporting_relationships USING btree ("organizationId", "supersedesRelationshipId");


--
-- Name: hris_time_entries_organizationId_employeeId_workDate_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_time_entries_organizationId_employeeId_workDate_status_idx" ON public.hris_time_entries USING btree ("organizationId", "employeeId", "workDate", status);


--
-- Name: hris_time_entries_organizationId_importBatchId_sourceRecord_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_time_entries_organizationId_importBatchId_sourceRecord_key" ON public.hris_time_entries USING btree ("organizationId", "importBatchId", "sourceRecordId");


--
-- Name: hris_time_import_batches_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_time_import_batches_organizationId_idempotencyKey_key" ON public.hris_time_import_batches USING btree ("organizationId", "idempotencyKey");


--
-- Name: hris_time_import_batches_organizationId_sourceHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_time_import_batches_organizationId_sourceHash_key" ON public.hris_time_import_batches USING btree ("organizationId", "sourceHash");


--
-- Name: hris_time_import_batches_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_time_import_batches_organizationId_status_createdAt_idx" ON public.hris_time_import_batches USING btree ("organizationId", status, "createdAt");


--
-- Name: hris_time_requests_organizationId_decisionBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_time_requests_organizationId_decisionBusinessEventId_idx" ON public.hris_time_requests USING btree ("organizationId", "decisionBusinessEventId");


--
-- Name: hris_time_requests_organizationId_employeeId_status_type_pe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_time_requests_organizationId_employeeId_status_type_pe_idx" ON public.hris_time_requests USING btree ("organizationId", "employeeId", status, type, "periodStart");


--
-- Name: hris_time_requests_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_time_requests_organizationId_idempotencyKey_key" ON public.hris_time_requests USING btree ("organizationId", "idempotencyKey");


--
-- Name: hris_time_requests_organizationId_status_requestedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_time_requests_organizationId_status_requestedAt_idx" ON public.hris_time_requests USING btree ("organizationId", status, "requestedAt");


--
-- Name: hris_work_calendars_organizationId_code_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_work_calendars_organizationId_code_version_key" ON public.hris_work_calendars USING btree ("organizationId", code, version);


--
-- Name: hris_work_calendars_organizationId_countryCode_status_effec_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_work_calendars_organizationId_countryCode_status_effec_idx" ON public.hris_work_calendars USING btree ("organizationId", "countryCode", status, "effectiveFrom");


--
-- Name: hris_work_schedules_organizationId_employeeId_effectiveFrom_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hris_work_schedules_organizationId_employeeId_effectiveFrom_key" ON public.hris_work_schedules USING btree ("organizationId", "employeeId", "effectiveFrom");


--
-- Name: hris_work_schedules_organizationId_employeeId_status_effect_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "hris_work_schedules_organizationId_employeeId_status_effect_idx" ON public.hris_work_schedules USING btree ("organizationId", "employeeId", status, "effectiveFrom");


--
-- Name: inventory_levels_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_levels_itemId_idx" ON public.inventory_levels USING btree ("itemId");


--
-- Name: inventory_levels_itemId_locationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "inventory_levels_itemId_locationId_key" ON public.inventory_levels USING btree ("itemId", "locationId");


--
-- Name: inventory_levels_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_levels_locationId_idx" ON public.inventory_levels USING btree ("locationId");


--
-- Name: inventory_transactions_itemId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_transactions_itemId_createdAt_idx" ON public.inventory_transactions USING btree ("itemId", "createdAt");


--
-- Name: inventory_transactions_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_transactions_itemId_idx" ON public.inventory_transactions USING btree ("itemId");


--
-- Name: inventory_transactions_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_transactions_locationId_idx" ON public.inventory_transactions USING btree ("locationId");


--
-- Name: inventory_transactions_org_effective_recorded_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_transactions_org_effective_recorded_id_idx ON public.inventory_transactions USING btree ("organizationId", "effectiveAt", "recordedAt", id);


--
-- Name: inventory_transactions_org_recorded_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_transactions_org_recorded_id_idx ON public.inventory_transactions USING btree ("organizationId", "recordedAt", id);


--
-- Name: inventory_transactions_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_transactions_organizationId_createdAt_idx" ON public.inventory_transactions USING btree ("organizationId", "createdAt");


--
-- Name: inventory_transactions_referenceType_referenceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "inventory_transactions_referenceType_referenceId_idx" ON public.inventory_transactions USING btree ("referenceType", "referenceId");


--
-- Name: inventory_transactions_reversalOfTransactionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "inventory_transactions_reversalOfTransactionId_key" ON public.inventory_transactions USING btree ("reversalOfTransactionId");


--
-- Name: inventory_transactions_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_transactions_type_idx ON public.inventory_transactions USING btree (type);


--
-- Name: invites_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invites_email_idx ON public.invites USING btree (email);


--
-- Name: invites_email_organizationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "invites_email_organizationId_key" ON public.invites USING btree (email, "organizationId");


--
-- Name: invites_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invites_organizationId_status_idx" ON public.invites USING btree ("organizationId", status);


--
-- Name: invites_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invites_token_key ON public.invites USING btree (token);


--
-- Name: invites_token_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invites_token_status_idx ON public.invites USING btree (token, status);


--
-- Name: item_suppliers_itemId_supplierId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "item_suppliers_itemId_supplierId_key" ON public.item_suppliers USING btree ("itemId", "supplierId");


--
-- Name: item_suppliers_supplierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_suppliers_supplierId_idx" ON public.item_suppliers USING btree ("supplierId");


--
-- Name: items_barcode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX items_barcode_idx ON public.items USING btree (barcode);


--
-- Name: items_organizationId_barcode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "items_organizationId_barcode_key" ON public.items USING btree ("organizationId", barcode);


--
-- Name: items_organizationId_brandId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "items_organizationId_brandId_idx" ON public.items USING btree ("organizationId", "brandId");


--
-- Name: items_organizationId_categoryId_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "items_organizationId_categoryId_deletedAt_idx" ON public.items USING btree ("organizationId", "categoryId", "deletedAt");


--
-- Name: items_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "items_organizationId_idx" ON public.items USING btree ("organizationId");


--
-- Name: items_organizationId_isActive_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "items_organizationId_isActive_deletedAt_idx" ON public.items USING btree ("organizationId", "isActive", "deletedAt");


--
-- Name: items_organizationId_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "items_organizationId_sku_key" ON public.items USING btree ("organizationId", sku);


--
-- Name: items_organizationId_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "items_organizationId_slug_key" ON public.items USING btree ("organizationId", slug);


--
-- Name: journal_entries_journalId_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_journalId_entryDate_idx" ON public.journal_entries USING btree ("journalId", "entryDate");


--
-- Name: journal_entries_organizationId_entryNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "journal_entries_organizationId_entryNumber_key" ON public.journal_entries USING btree ("organizationId", "entryNumber");


--
-- Name: journal_entries_organizationId_status_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_organizationId_status_entryDate_idx" ON public.journal_entries USING btree ("organizationId", status, "entryDate");


--
-- Name: journal_entries_periodId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_periodId_status_idx" ON public.journal_entries USING btree ("periodId", status);


--
-- Name: journal_entries_postingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_postingBatchId_idx" ON public.journal_entries USING btree ("postingBatchId");


--
-- Name: journal_entries_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_sourceType_sourceId_idx" ON public.journal_entries USING btree ("sourceType", "sourceId");


--
-- Name: journal_entry_lines_accountId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entry_lines_accountId_createdAt_idx" ON public.journal_entry_lines USING btree ("accountId", "createdAt");


--
-- Name: journal_entry_lines_journalEntryId_lineNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "journal_entry_lines_journalEntryId_lineNumber_key" ON public.journal_entry_lines USING btree ("journalEntryId", "lineNumber");


--
-- Name: journal_entry_lines_organizationId_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entry_lines_organizationId_accountId_idx" ON public.journal_entry_lines USING btree ("organizationId", "accountId");


--
-- Name: journal_entry_lines_organizationId_currency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entry_lines_organizationId_currency_idx" ON public.journal_entry_lines USING btree ("organizationId", currency);


--
-- Name: journals_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "journals_organizationId_code_key" ON public.journals USING btree ("organizationId", code);


--
-- Name: journals_organizationId_type_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journals_organizationId_type_isActive_idx" ON public.journals USING btree ("organizationId", type, "isActive");


--
-- Name: ledger_audit_events_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ledger_audit_events_journalEntryId_idx" ON public.ledger_audit_events USING btree ("journalEntryId");


--
-- Name: ledger_audit_events_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ledger_audit_events_organizationId_createdAt_idx" ON public.ledger_audit_events USING btree ("organizationId", "createdAt");


--
-- Name: ledger_audit_events_postingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ledger_audit_events_postingBatchId_idx" ON public.ledger_audit_events USING btree ("postingBatchId");


--
-- Name: ledger_audit_events_resourceType_resourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ledger_audit_events_resourceType_resourceId_idx" ON public.ledger_audit_events USING btree ("resourceType", "resourceId");


--
-- Name: ledger_posting_batches_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ledger_posting_batches_organizationId_idempotencyKey_key" ON public.ledger_posting_batches USING btree ("organizationId", "idempotencyKey");


--
-- Name: ledger_posting_batches_organizationId_sourceType_sourceId_p_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ledger_posting_batches_organizationId_sourceType_sourceId_p_key" ON public.ledger_posting_batches USING btree ("organizationId", "sourceType", "sourceId", "postingPurpose");


--
-- Name: ledger_posting_batches_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ledger_posting_batches_organizationId_status_createdAt_idx" ON public.ledger_posting_batches USING btree ("organizationId", status, "createdAt");


--
-- Name: ledger_posting_batches_periodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ledger_posting_batches_periodId_idx" ON public.ledger_posting_batches USING btree ("periodId");


--
-- Name: locations_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "locations_organizationId_code_key" ON public.locations USING btree ("organizationId", code);


--
-- Name: locations_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "locations_organizationId_id_key" ON public.locations USING btree ("organizationId", id);


--
-- Name: locations_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "locations_organizationId_idx" ON public.locations USING btree ("organizationId");


--
-- Name: locations_organizationId_type_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "locations_organizationId_type_isActive_idx" ON public.locations USING btree ("organizationId", type, "isActive");


--
-- Name: match_records_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_correlationId_idx" ON public.match_records USING btree ("correlationId");


--
-- Name: match_records_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_ledgerPostingBatchId_idx" ON public.match_records USING btree ("ledgerPostingBatchId");


--
-- Name: match_records_matchedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_matchedById_idx" ON public.match_records USING btree ("matchedById");


--
-- Name: match_records_organizationId_paymentTransactionId_providerE_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "match_records_organizationId_paymentTransactionId_providerE_key" ON public.match_records USING btree ("organizationId", "paymentTransactionId", "providerEventId", "statementLineId", rule);


--
-- Name: match_records_organizationId_providerAccountId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_organizationId_providerAccountId_status_idx" ON public.match_records USING btree ("organizationId", "providerAccountId", status);


--
-- Name: match_records_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_organizationId_status_createdAt_idx" ON public.match_records USING btree ("organizationId", status, "createdAt");


--
-- Name: match_records_paymentTransactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_paymentTransactionId_idx" ON public.match_records USING btree ("paymentTransactionId");


--
-- Name: match_records_providerEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_providerEventId_idx" ON public.match_records USING btree ("providerEventId");


--
-- Name: match_records_reconciliationRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_reconciliationRunId_idx" ON public.match_records USING btree ("reconciliationRunId");


--
-- Name: match_records_statementLineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "match_records_statementLineId_idx" ON public.match_records USING btree ("statementLineId");


--
-- Name: module_lifecycle_event_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX module_lifecycle_event_key ON public.tenant_module_lifecycle_events USING btree ("organizationId", "operationId", "eventKey");


--
-- Name: module_lifecycle_event_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX module_lifecycle_event_sequence ON public.tenant_module_lifecycle_events USING btree ("organizationId", "operationId", sequence);


--
-- Name: module_lifecycle_step_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX module_lifecycle_step_identity ON public.tenant_module_lifecycle_steps USING btree ("organizationId", "operationId", "moduleSlug", "stepKey");


--
-- Name: onboarding_import_batches_org_risk_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_batches_org_risk_status_idx ON public.onboarding_import_batches USING btree ("organizationId", "riskLevel", status, "createdAt");


--
-- Name: onboarding_import_batches_org_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_batches_org_status_created_idx ON public.onboarding_import_batches USING btree ("organizationId", status, "createdAt");


--
-- Name: onboarding_import_batches_org_target_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_batches_org_target_created_idx ON public.onboarding_import_batches USING btree ("organizationId", target, "createdAt");


--
-- Name: onboarding_import_batches_org_target_hash_mapping_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX onboarding_import_batches_org_target_hash_mapping_key ON public.onboarding_import_batches USING btree ("organizationId", target, "contentHash", "mappingVersion");


--
-- Name: onboarding_import_issues_batch_row_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_issues_batch_row_idx ON public.onboarding_import_issues USING btree ("batchId", "rowNumber");


--
-- Name: onboarding_import_issues_org_batch_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_issues_org_batch_severity_idx ON public.onboarding_import_issues USING btree ("organizationId", "batchId", severity);


--
-- Name: onboarding_import_mappings_org_target_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_mappings_org_target_created_idx ON public.onboarding_import_mappings USING btree ("organizationId", target, "createdAt");


--
-- Name: onboarding_import_mappings_org_target_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX onboarding_import_mappings_org_target_version_key ON public.onboarding_import_mappings USING btree ("organizationId", target, version);


--
-- Name: onboarding_import_rows_batch_record_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_rows_batch_record_idx ON public.onboarding_import_rows USING btree ("batchId", "committedRecordId");


--
-- Name: onboarding_import_rows_batch_row_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX onboarding_import_rows_batch_row_key ON public.onboarding_import_rows USING btree ("batchId", "rowNumber");


--
-- Name: onboarding_import_rows_org_batch_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_import_rows_org_batch_key_idx ON public.onboarding_import_rows USING btree ("organizationId", "batchId", "businessKey");


--
-- Name: onboarding_readiness_org_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_readiness_org_state_idx ON public.onboarding_readiness_milestones USING btree ("organizationId", state);


--
-- Name: onboarding_readiness_org_target_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX onboarding_readiness_org_target_key ON public.onboarding_readiness_milestones USING btree ("organizationId", target);


--
-- Name: organization_accounting_settings_organizationId_accountingE_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "organization_accounting_settings_organizationId_accountingE_idx" ON public.organization_accounting_settings USING btree ("organizationId", "accountingEnabled");


--
-- Name: organization_accounting_settings_organizationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "organization_accounting_settings_organizationId_key" ON public.organization_accounting_settings USING btree ("organizationId");


--
-- Name: organization_accounting_settings_setupStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "organization_accounting_settings_setupStatus_idx" ON public.organization_accounting_settings USING btree ("setupStatus");


--
-- Name: organizations_isActive_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "organizations_isActive_deletedAt_idx" ON public.organizations USING btree ("isActive", "deletedAt");


--
-- Name: organizations_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_slug_idx ON public.organizations USING btree (slug);


--
-- Name: organizations_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);


--
-- Name: password_history_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_history_userId_createdAt_idx" ON public.password_history USING btree ("userId", "createdAt");


--
-- Name: pay_dest_change_employee_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pay_dest_change_employee_status_idx ON public.payroll_payment_destination_change_requests USING btree ("organizationId", "employeeId", status, "requestedAt");


--
-- Name: pay_dest_change_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pay_dest_change_hash_idx ON public.payroll_payment_destination_change_requests USING btree ("organizationId", "paymentDestinationHash");


--
-- Name: payment_exceptions_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_correlationId_idx" ON public.payment_exceptions USING btree ("correlationId");


--
-- Name: payment_exceptions_organizationId_ownerId_status_slaDeadlin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_organizationId_ownerId_status_slaDeadlin_idx" ON public.payment_exceptions USING btree ("organizationId", "ownerId", status, "slaDeadline");


--
-- Name: payment_exceptions_organizationId_providerAccountId_type_st_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_organizationId_providerAccountId_type_st_idx" ON public.payment_exceptions USING btree ("organizationId", "providerAccountId", type, status);


--
-- Name: payment_exceptions_organizationId_status_severity_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_organizationId_status_severity_createdAt_idx" ON public.payment_exceptions USING btree ("organizationId", status, severity, "createdAt");


--
-- Name: payment_exceptions_paymentTransactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_paymentTransactionId_idx" ON public.payment_exceptions USING btree ("paymentTransactionId");


--
-- Name: payment_exceptions_providerEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_providerEventId_idx" ON public.payment_exceptions USING btree ("providerEventId");


--
-- Name: payment_exceptions_reconciliationRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_reconciliationRunId_idx" ON public.payment_exceptions USING btree ("reconciliationRunId");


--
-- Name: payment_exceptions_statementLineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_statementLineId_idx" ON public.payment_exceptions USING btree ("statementLineId");


--
-- Name: payment_exceptions_suspenseItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_exceptions_suspenseItemId_idx" ON public.payment_exceptions USING btree ("suspenseItemId");


--
-- Name: payment_rails_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_rails_organizationId_code_key" ON public.payment_rails USING btree ("organizationId", code);


--
-- Name: payment_rails_organizationId_currencyCode_countryCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_rails_organizationId_currencyCode_countryCode_idx" ON public.payment_rails USING btree ("organizationId", "currencyCode", "countryCode");


--
-- Name: payment_rails_organizationId_type_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_rails_organizationId_type_isActive_idx" ON public.payment_rails USING btree ("organizationId", type, "isActive");


--
-- Name: payment_reconciliation_inbox_items_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_reconciliation_inbox_items_correlationId_idx" ON public.payment_reconciliation_inbox_items USING btree ("correlationId");


--
-- Name: payment_reconciliation_inbox_items_org_lease_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_reconciliation_inbox_items_org_lease_token_idx ON public.payment_reconciliation_inbox_items USING btree ("organizationId", "leaseToken");


--
-- Name: payment_reconciliation_inbox_items_org_status_leased_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_reconciliation_inbox_items_org_status_leased_by_idx ON public.payment_reconciliation_inbox_items USING btree ("organizationId", status, "leasedBy");


--
-- Name: payment_reconciliation_inbox_items_organizationId_source_ex_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_reconciliation_inbox_items_organizationId_source_ex_idx" ON public.payment_reconciliation_inbox_items USING btree ("organizationId", source, "externalId");


--
-- Name: payment_reconciliation_inbox_items_organizationId_source_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_reconciliation_inbox_items_organizationId_source_id_key" ON public.payment_reconciliation_inbox_items USING btree ("organizationId", source, "idempotencyKey");


--
-- Name: payment_reconciliation_inbox_items_organizationId_status_ne_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_reconciliation_inbox_items_organizationId_status_ne_idx" ON public.payment_reconciliation_inbox_items USING btree ("organizationId", status, "nextAttemptAt");


--
-- Name: payment_reconciliation_inbox_items_providerAccountId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_reconciliation_inbox_items_providerAccountId_status_idx" ON public.payment_reconciliation_inbox_items USING btree ("providerAccountId", status);


--
-- Name: payment_refunds_organizationId_refundNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_refunds_organizationId_refundNumber_key" ON public.payment_refunds USING btree ("organizationId", "refundNumber");


--
-- Name: payment_refunds_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_refunds_organizationId_status_createdAt_idx" ON public.payment_refunds USING btree ("organizationId", status, "createdAt");


--
-- Name: payment_refunds_paymentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_refunds_paymentId_idx" ON public.payment_refunds USING btree ("paymentId");


--
-- Name: payment_transactions_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_correlationId_idx" ON public.payment_transactions USING btree ("correlationId");


--
-- Name: payment_transactions_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_ledgerPostingBatchId_idx" ON public.payment_transactions USING btree ("ledgerPostingBatchId");


--
-- Name: payment_transactions_legacyPaymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_transactions_legacyPaymentId_key" ON public.payment_transactions USING btree ("legacyPaymentId");


--
-- Name: payment_transactions_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_transactions_organizationId_idempotencyKey_key" ON public.payment_transactions USING btree ("organizationId", "idempotencyKey");


--
-- Name: payment_transactions_organizationId_providerAccountId_provi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_transactions_organizationId_providerAccountId_provi_key" ON public.payment_transactions USING btree ("organizationId", "providerAccountId", "providerTransactionId");


--
-- Name: payment_transactions_organizationId_providerAuthorityEventId_ke; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_transactions_organizationId_providerAuthorityEventId_ke" ON public.payment_transactions USING btree ("organizationId", "providerAuthorityEventId");


--
-- Name: payment_transactions_organizationId_providerReference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_organizationId_providerReference_idx" ON public.payment_transactions USING btree ("organizationId", "providerReference");


--
-- Name: payment_transactions_organizationId_state_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_organizationId_state_createdAt_idx" ON public.payment_transactions USING btree ("organizationId", state, "createdAt");


--
-- Name: payment_transactions_providerAccountId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_transactions_providerAccountId_state_idx" ON public.payment_transactions USING btree ("providerAccountId", state);


--
-- Name: payment_transactions_providerAuthorityEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_transactions_providerAuthorityEventId_key" ON public.payment_transactions USING btree ("providerAuthorityEventId");


--
-- Name: payments_mobileMoneyReference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_mobileMoneyReference_idx" ON public.payments USING btree ("mobileMoneyReference");


--
-- Name: payments_org_method_auth_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_org_method_auth_key ON public.payments USING btree ("organizationId", method, "authorizationCode");


--
-- Name: payments_org_method_bank_ref_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_org_method_bank_ref_key ON public.payments USING btree ("organizationId", method, "bankReference");


--
-- Name: payments_org_method_txn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_org_method_txn_key ON public.payments USING btree ("organizationId", method, "transactionId");


--
-- Name: payments_org_momo_ref_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_org_momo_ref_key ON public.payments USING btree ("organizationId", "mobileMoneyProvider", "mobileMoneyReference");


--
-- Name: payments_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_organizationId_createdAt_idx" ON public.payments USING btree ("organizationId", "createdAt");


--
-- Name: payments_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payments_organizationId_idempotencyKey_key" ON public.payments USING btree ("organizationId", "idempotencyKey");


--
-- Name: payments_organizationId_method_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_organizationId_method_status_idx" ON public.payments USING btree ("organizationId", method, status);


--
-- Name: payments_organizationId_paymentNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payments_organizationId_paymentNumber_key" ON public.payments USING btree ("organizationId", "paymentNumber");


--
-- Name: payments_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_purchaseOrderId_idx" ON public.payments USING btree ("purchaseOrderId");


--
-- Name: payments_salesOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_salesOrderId_idx" ON public.payments USING btree ("salesOrderId");


--
-- Name: payroll_attendance_snapshots_correctedFromId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_attendance_snapshots_correctedFromId_idx" ON public.payroll_attendance_snapshots USING btree ("correctedFromId");


--
-- Name: payroll_attendance_snapshots_organizationId_employeeId_peri_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_attendance_snapshots_organizationId_employeeId_peri_idx" ON public.payroll_attendance_snapshots USING btree ("organizationId", "employeeId", "periodStart", "periodEnd");


--
-- Name: payroll_attendance_snapshots_organizationId_status_frozenAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_attendance_snapshots_organizationId_status_frozenAt_idx" ON public.payroll_attendance_snapshots USING btree ("organizationId", status, "frozenAt");


--
-- Name: payroll_attendance_snapshots_payrollPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_attendance_snapshots_payrollPeriodId_idx" ON public.payroll_attendance_snapshots USING btree ("payrollPeriodId");


--
-- Name: payroll_contracts_organizationId_contractNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_contracts_organizationId_contractNumber_key" ON public.payroll_contracts USING btree ("organizationId", "contractNumber");


--
-- Name: payroll_contracts_organizationId_employeeId_status_effectiv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_contracts_organizationId_employeeId_status_effectiv_idx" ON public.payroll_contracts USING btree ("organizationId", "employeeId", status, "effectiveFrom");


--
-- Name: payroll_contracts_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_contracts_organizationId_status_idx" ON public.payroll_contracts USING btree ("organizationId", status);


--
-- Name: payroll_declaration_evidence_organizationId_declarationId_creat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_declaration_evidence_organizationId_declarationId_creat" ON public.payroll_declaration_evidence USING btree ("organizationId", "declarationId", "createdAt");


--
-- Name: payroll_declaration_evidence_organizationId_declarationId_trans; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_declaration_evidence_organizationId_declarationId_trans" ON public.payroll_declaration_evidence USING btree ("organizationId", "declarationId", transition, "idempotencyKey");


--
-- Name: payroll_declaration_evidence_organizationId_transition_createdA; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_declaration_evidence_organizationId_transition_createdA" ON public.payroll_declaration_evidence USING btree ("organizationId", transition, "createdAt");


--
-- Name: payroll_declarations_organizationId_payrollRunId_authority__key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_declarations_organizationId_payrollRunId_authority__key" ON public.payroll_declarations USING btree ("organizationId", "payrollRunId", authority, "declarationType");


--
-- Name: payroll_declarations_organizationId_status_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_declarations_organizationId_status_dueDate_idx" ON public.payroll_declarations USING btree ("organizationId", status, "dueDate");


--
-- Name: payroll_employee_balance_cases_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_cases_ledgerPostingBatchId_idx" ON public.payroll_employee_balance_cases USING btree ("ledgerPostingBatchId");


--
-- Name: payroll_employee_balance_cases_organizationId_caseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employee_balance_cases_organizationId_caseNumber_key" ON public.payroll_employee_balance_cases USING btree ("organizationId", "caseNumber");


--
-- Name: payroll_employee_balance_cases_organizationId_employeeId_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_cases_organizationId_employeeId_status" ON public.payroll_employee_balance_cases USING btree ("organizationId", "employeeId", status);


--
-- Name: payroll_employee_balance_cases_organizationId_idempotencyKey_ke; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employee_balance_cases_organizationId_idempotencyKey_ke" ON public.payroll_employee_balance_cases USING btree ("organizationId", "idempotencyKey");


--
-- Name: payroll_employee_balance_cases_organizationId_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_cases_organizationId_payrollRunId_idx" ON public.payroll_employee_balance_cases USING btree ("organizationId", "payrollRunId");


--
-- Name: payroll_employee_balance_cases_payslipId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_cases_payslipId_idx" ON public.payroll_employee_balance_cases USING btree ("payslipId");


--
-- Name: payroll_employee_balance_events_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_events_ledgerPostingBatchId_idx" ON public.payroll_employee_balance_events USING btree ("ledgerPostingBatchId");


--
-- Name: payroll_employee_balance_events_organizationId_balanceCaseId_cr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_events_organizationId_balanceCaseId_cr" ON public.payroll_employee_balance_events USING btree ("organizationId", "balanceCaseId", "createdAt");


--
-- Name: payroll_employee_balance_events_organizationId_balanceCaseId_ev; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employee_balance_events_organizationId_balanceCaseId_ev" ON public.payroll_employee_balance_events USING btree ("organizationId", "balanceCaseId", "eventType", "idempotencyKey");


--
-- Name: payroll_employee_balance_events_organizationId_eventType_create; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_balance_events_organizationId_eventType_create" ON public.payroll_employee_balance_events USING btree ("organizationId", "eventType", "createdAt");


--
-- Name: payroll_employee_balance_events_organizationId_idempotencyKey_k; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employee_balance_events_organizationId_idempotencyKey_k" ON public.payroll_employee_balance_events USING btree ("organizationId", "idempotencyKey");


--
-- Name: payroll_employee_rubrique_assignments_organizationId_effectiveF; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_rubrique_assignments_organizationId_effectiveF" ON public.payroll_employee_rubrique_assignments USING btree ("organizationId", "effectiveFrom");


--
-- Name: payroll_employee_rubrique_assignments_organizationId_employeeId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_rubrique_assignments_organizationId_employeeId" ON public.payroll_employee_rubrique_assignments USING btree ("organizationId", "employeeId", status, "effectiveFrom");


--
-- Name: payroll_employee_rubrique_assignments_organizationId_rubriqueId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employee_rubrique_assignments_organizationId_rubriqueId" ON public.payroll_employee_rubrique_assignments USING btree ("organizationId", "rubriqueId", status);


--
-- Name: payroll_employees_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employees_locationId_idx" ON public.payroll_employees USING btree ("locationId");


--
-- Name: payroll_employees_organizationId_employeeNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employees_organizationId_employeeNumber_key" ON public.payroll_employees USING btree ("organizationId", "employeeNumber");


--
-- Name: payroll_employees_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employees_organizationId_id_key" ON public.payroll_employees USING btree ("organizationId", id);


--
-- Name: payroll_employees_organizationId_paymentDestinationHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employees_organizationId_paymentDestinationHash_idx" ON public.payroll_employees USING btree ("organizationId", "paymentDestinationHash");


--
-- Name: payroll_employees_organizationId_socialIdentifierHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employees_organizationId_socialIdentifierHash_idx" ON public.payroll_employees USING btree ("organizationId", "socialIdentifierHash");


--
-- Name: payroll_employees_organizationId_status_hireDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_employees_organizationId_status_hireDate_idx" ON public.payroll_employees USING btree ("organizationId", status, "hireDate");


--
-- Name: payroll_employees_organizationId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_employees_organizationId_userId_key" ON public.payroll_employees USING btree ("organizationId", "userId");


--
-- Name: payroll_payment_allocations_organizationId_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_allocations_organizationId_employeeId_idx" ON public.payroll_payment_allocations USING btree ("organizationId", "employeeId");


--
-- Name: payroll_payment_allocations_payrollPaymentBatchId_payslipId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_payment_allocations_payrollPaymentBatchId_payslipId_key" ON public.payroll_payment_allocations USING btree ("payrollPaymentBatchId", "payslipId");


--
-- Name: payroll_payment_allocations_payslipId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_allocations_payslipId_idx" ON public.payroll_payment_allocations USING btree ("payslipId");


--
-- Name: payroll_payment_batches_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_batches_ledgerPostingBatchId_idx" ON public.payroll_payment_batches USING btree ("ledgerPostingBatchId");


--
-- Name: payroll_payment_batches_organizationId_batchNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_payment_batches_organizationId_batchNumber_key" ON public.payroll_payment_batches USING btree ("organizationId", "batchNumber");


--
-- Name: payroll_payment_batches_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_payment_batches_organizationId_idempotencyKey_key" ON public.payroll_payment_batches USING btree ("organizationId", "idempotencyKey");


--
-- Name: payroll_payment_batches_organizationId_status_paymentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_batches_organizationId_status_paymentDate_idx" ON public.payroll_payment_batches USING btree ("organizationId", status, "paymentDate");


--
-- Name: payroll_payment_batches_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_batches_payrollRunId_idx" ON public.payroll_payment_batches USING btree ("payrollRunId");


--
-- Name: payroll_payment_destination_change_requests_approvedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_destination_change_requests_approvedById_idx" ON public.payroll_payment_destination_change_requests USING btree ("approvedById");


--
-- Name: payroll_payment_destination_change_requests_requestedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payment_destination_change_requests_requestedById_idx" ON public.payroll_payment_destination_change_requests USING btree ("requestedById");


--
-- Name: payroll_payslip_lines_organizationId_payslipId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payslip_lines_organizationId_payslipId_idx" ON public.payroll_payslip_lines USING btree ("organizationId", "payslipId");


--
-- Name: payroll_payslip_lines_payslipId_lineNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_payslip_lines_payslipId_lineNumber_key" ON public.payroll_payslip_lines USING btree ("payslipId", "lineNumber");


--
-- Name: payroll_payslips_organizationId_emittedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payslips_organizationId_emittedBusinessEventId_idx" ON public.payroll_payslips USING btree ("organizationId", "emittedBusinessEventId");


--
-- Name: payroll_payslips_organizationId_employeeId_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payslips_organizationId_employeeId_issuedAt_idx" ON public.payroll_payslips USING btree ("organizationId", "employeeId", "issuedAt");


--
-- Name: payroll_payslips_organizationId_payrollRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_payslips_organizationId_payrollRunId_idx" ON public.payroll_payslips USING btree ("organizationId", "payrollRunId");


--
-- Name: payroll_payslips_organizationId_payslipNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_payslips_organizationId_payslipNumber_key" ON public.payroll_payslips USING btree ("organizationId", "payslipNumber");


--
-- Name: payroll_payslips_runLineId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_payslips_runLineId_key" ON public.payroll_payslips USING btree ("runLineId");


--
-- Name: payroll_periods_accountingPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_periods_accountingPeriodId_idx" ON public.payroll_periods USING btree ("accountingPeriodId");


--
-- Name: payroll_periods_organizationId_periodStart_periodEnd_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_periods_organizationId_periodStart_periodEnd_key" ON public.payroll_periods USING btree ("organizationId", "periodStart", "periodEnd");


--
-- Name: payroll_periods_organizationId_status_periodStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_periods_organizationId_status_periodStart_idx" ON public.payroll_periods USING btree ("organizationId", status, "periodStart");


--
-- Name: payroll_rubriques_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_rubriques_organizationId_code_key" ON public.payroll_rubriques USING btree ("organizationId", code);


--
-- Name: payroll_rubriques_organizationId_status_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_rubriques_organizationId_status_kind_idx" ON public.payroll_rubriques USING btree ("organizationId", status, kind);


--
-- Name: payroll_rubriques_organizationId_statutoryParameterPath_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_rubriques_organizationId_statutoryParameterPath_idx" ON public.payroll_rubriques USING btree ("organizationId", "statutoryParameterPath");


--
-- Name: payroll_run_lines_attendanceSnapshotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_run_lines_attendanceSnapshotId_idx" ON public.payroll_run_lines USING btree ("attendanceSnapshotId");


--
-- Name: payroll_run_lines_contractId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_run_lines_contractId_idx" ON public.payroll_run_lines USING btree ("contractId");


--
-- Name: payroll_run_lines_organizationId_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_run_lines_organizationId_employeeId_idx" ON public.payroll_run_lines USING btree ("organizationId", "employeeId");


--
-- Name: payroll_run_lines_payrollRunId_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_run_lines_payrollRunId_employeeId_key" ON public.payroll_run_lines USING btree ("payrollRunId", "employeeId");


--
-- Name: payroll_run_transitions_organizationId_businessEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_businessEventId_key" ON public.payroll_run_transitions USING btree ("organizationId", "businessEventId");


--
-- Name: payroll_run_transitions_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_idempotencyKey_key" ON public.payroll_run_transitions USING btree ("organizationId", "idempotencyKey");


--
-- Name: payroll_run_transitions_organizationId_payrollRunId_createdAt_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_run_transitions_organizationId_payrollRunId_createdAt_i" ON public.payroll_run_transitions USING btree ("organizationId", "payrollRunId", "createdAt");


--
-- Name: payroll_run_transitions_organizationId_payrollRunId_sequence_ke; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_payrollRunId_sequence_ke" ON public.payroll_run_transitions USING btree ("organizationId", "payrollRunId", sequence);


--
-- Name: payroll_run_transitions_organizationId_payrollRunId_toStatus_ke; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_payrollRunId_toStatus_ke" ON public.payroll_run_transitions USING btree ("organizationId", "payrollRunId", "toStatus");


--
-- Name: payroll_run_transitions_organizationId_toStatus_transitionedAt_; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_run_transitions_organizationId_toStatus_transitionedAt_" ON public.payroll_run_transitions USING btree ("organizationId", "toStatus", "transitionedAt");


--
-- Name: payroll_runs_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_ledgerPostingBatchId_idx" ON public.payroll_runs USING btree ("ledgerPostingBatchId");


--
-- Name: payroll_runs_organizationId_approvedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_organizationId_approvedBusinessEventId_idx" ON public.payroll_runs USING btree ("organizationId", "approvedBusinessEventId");


--
-- Name: payroll_runs_organizationId_emittedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_organizationId_emittedBusinessEventId_idx" ON public.payroll_runs USING btree ("organizationId", "emittedBusinessEventId");


--
-- Name: payroll_runs_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_runs_organizationId_id_key" ON public.payroll_runs USING btree ("organizationId", id);


--
-- Name: payroll_runs_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_runs_organizationId_idempotencyKey_key" ON public.payroll_runs USING btree ("organizationId", "idempotencyKey");


--
-- Name: payroll_runs_organizationId_payrollPeriodId_runType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_organizationId_payrollPeriodId_runType_idx" ON public.payroll_runs USING btree ("organizationId", "payrollPeriodId", "runType");


--
-- Name: payroll_runs_organizationId_reviewedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_organizationId_reviewedBusinessEventId_idx" ON public.payroll_runs USING btree ("organizationId", "reviewedBusinessEventId");


--
-- Name: payroll_runs_organizationId_runNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_runs_organizationId_runNumber_key" ON public.payroll_runs USING btree ("organizationId", "runNumber");


--
-- Name: payroll_runs_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_organizationId_status_createdAt_idx" ON public.payroll_runs USING btree ("organizationId", status, "createdAt");


--
-- Name: payroll_runs_originalRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_originalRunId_idx" ON public.payroll_runs USING btree ("originalRunId");


--
-- Name: payroll_runs_postedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_runs_postedBusinessEventId_idx" ON public.payroll_runs USING btree ("postedBusinessEventId");


--
-- Name: payroll_salary_change_requests_approvedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_salary_change_requests_approvedById_idx" ON public.payroll_salary_change_requests USING btree ("approvedById");


--
-- Name: payroll_salary_change_requests_organizationId_employeeId_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_salary_change_requests_organizationId_employeeId_status" ON public.payroll_salary_change_requests USING btree ("organizationId", "employeeId", status, "effectiveFrom");


--
-- Name: payroll_salary_change_requests_organizationId_sourceContractId_; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_salary_change_requests_organizationId_sourceContractId_" ON public.payroll_salary_change_requests USING btree ("organizationId", "sourceContractId");


--
-- Name: payroll_salary_change_requests_organizationId_supersedingContra; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_salary_change_requests_organizationId_supersedingContra" ON public.payroll_salary_change_requests USING btree ("organizationId", "supersedingContractId");


--
-- Name: payroll_salary_change_requests_requestedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_salary_change_requests_requestedById_idx" ON public.payroll_salary_change_requests USING btree ("requestedById");


--
-- Name: picture_assets_organizationId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "picture_assets_organizationId_status_createdAt_idx" ON public.picture_assets USING btree ("organizationId", status, "createdAt");


--
-- Name: picture_assets_providerKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "picture_assets_providerKey_key" ON public.picture_assets USING btree ("providerKey");


--
-- Name: pos_cash_shortage_worker_checkpoints_check_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pos_cash_shortage_worker_checkpoints_check_status_idx ON public.pos_cash_shortage_worker_checkpoints USING btree ("organizationId", "checkKey", "workerKey", status);


--
-- Name: pos_cash_shortage_worker_checkpoints_lease_recovery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pos_cash_shortage_worker_checkpoints_lease_recovery_idx ON public.pos_cash_shortage_worker_checkpoints USING btree ("organizationId", status, "leaseExpiresAt");


--
-- Name: pos_cash_shortage_worker_checkpoints_lease_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pos_cash_shortage_worker_checkpoints_lease_token_idx ON public.pos_cash_shortage_worker_checkpoints USING btree ("leaseToken");


--
-- Name: pos_cash_shortage_worker_checkpoints_ready_work_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pos_cash_shortage_worker_checkpoints_ready_work_idx ON public.pos_cash_shortage_worker_checkpoints USING btree ("organizationId", status, "nextAttemptAt");


--
-- Name: pos_cash_shortage_worker_checkpoints_window_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pos_cash_shortage_worker_checkpoints_window_key ON public.pos_cash_shortage_worker_checkpoints USING btree ("organizationId", "checkKey", "workerKey", "recordedFromInclusive", "recordedThroughExclusive");


--
-- Name: pos_checkout_workspaces_organizationId_actorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_checkout_workspaces_organizationId_actorId_idx" ON public.pos_checkout_workspaces USING btree ("organizationId", "actorId");


--
-- Name: pos_commit_results_organizationId_locationId_status_createdAt_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_commit_results_organizationId_locationId_status_createdAt_i" ON public.pos_commit_results USING btree ("organizationId", "locationId", status, "createdAt");


--
-- Name: pos_commit_results_organizationId_salesOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_commit_results_organizationId_salesOrderId_idx" ON public.pos_commit_results USING btree ("organizationId", "salesOrderId");


--
-- Name: pos_commit_results_organizationId_sessionId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_commit_results_organizationId_sessionId_createdAt_idx" ON public.pos_commit_results USING btree ("organizationId", "sessionId", "createdAt");


--
-- Name: pos_commit_results_organizationId_terminalId_clientCommitId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_commit_results_organizationId_terminalId_clientCommitId_key" ON public.pos_commit_results USING btree ("organizationId", "terminalId", "clientCommitId");


--
-- Name: pos_offline_devices_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_devices_locationId_idx" ON public.pos_offline_devices USING btree ("locationId");


--
-- Name: pos_offline_devices_organizationId_deviceFingerprintHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_offline_devices_organizationId_deviceFingerprintHash_key" ON public.pos_offline_devices USING btree ("organizationId", "deviceFingerprintHash");


--
-- Name: pos_offline_devices_organizationId_status_lastSeenAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_devices_organizationId_status_lastSeenAt_idx" ON public.pos_offline_devices USING btree ("organizationId", status, "lastSeenAt");


--
-- Name: pos_offline_devices_organizationId_status_policyExpiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_devices_organizationId_status_policyExpiresAt_idx" ON public.pos_offline_devices USING btree ("organizationId", status, "policyExpiresAt");


--
-- Name: pos_offline_devices_organizationId_terminalId_deviceLabel_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_offline_devices_organizationId_terminalId_deviceLabel_key" ON public.pos_offline_devices USING btree ("organizationId", "terminalId", "deviceLabel");


--
-- Name: pos_offline_devices_terminalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_devices_terminalId_idx" ON public.pos_offline_devices USING btree ("terminalId");


--
-- Name: pos_offline_events_businessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_events_businessEventId_idx" ON public.pos_offline_events USING btree ("businessEventId");


--
-- Name: pos_offline_events_organizationId_deviceId_deviceSeq_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_offline_events_organizationId_deviceId_deviceSeq_key" ON public.pos_offline_events USING btree ("organizationId", "deviceId", "deviceSeq");


--
-- Name: pos_offline_events_organizationId_deviceId_entryHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_offline_events_organizationId_deviceId_entryHash_key" ON public.pos_offline_events USING btree ("organizationId", "deviceId", "entryHash");


--
-- Name: pos_offline_events_organizationId_eventType_capturedAtDevic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_events_organizationId_eventType_capturedAtDevic_idx" ON public.pos_offline_events USING btree ("organizationId", "eventType", "capturedAtDevice");


--
-- Name: pos_offline_events_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_offline_events_organizationId_idempotencyKey_key" ON public.pos_offline_events USING btree ("organizationId", "idempotencyKey");


--
-- Name: pos_offline_events_organizationId_status_receivedAtServer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_events_organizationId_status_receivedAtServer_idx" ON public.pos_offline_events USING btree ("organizationId", status, "receivedAtServer");


--
-- Name: pos_offline_events_syncBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_events_syncBatchId_idx" ON public.pos_offline_events USING btree ("syncBatchId");


--
-- Name: pos_offline_sync_batches_deviceId_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_batches_deviceId_receivedAt_idx" ON public.pos_offline_sync_batches USING btree ("deviceId", "receivedAt");


--
-- Name: pos_offline_sync_batches_organizationId_status_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_batches_organizationId_status_receivedAt_idx" ON public.pos_offline_sync_batches USING btree ("organizationId", status, "receivedAt");


--
-- Name: pos_offline_sync_certificates_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_certificates_locationId_idx" ON public.pos_offline_sync_certificates USING btree ("locationId");


--
-- Name: pos_offline_sync_certificates_organizationId_deviceId_certi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_offline_sync_certificates_organizationId_deviceId_certi_key" ON public.pos_offline_sync_certificates USING btree ("organizationId", "deviceId", "certificationScope");


--
-- Name: pos_offline_sync_certificates_organizationId_status_closeBl_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_certificates_organizationId_status_closeBl_idx" ON public.pos_offline_sync_certificates USING btree ("organizationId", status, "closeBlocker");


--
-- Name: pos_offline_sync_certificates_terminalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_certificates_terminalId_idx" ON public.pos_offline_sync_certificates USING btree ("terminalId");


--
-- Name: pos_offline_sync_conflicts_deviceId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_conflicts_deviceId_status_idx" ON public.pos_offline_sync_conflicts USING btree ("deviceId", status);


--
-- Name: pos_offline_sync_conflicts_eventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_conflicts_eventId_idx" ON public.pos_offline_sync_conflicts USING btree ("eventId");


--
-- Name: pos_offline_sync_conflicts_organizationId_status_severity_c_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_conflicts_organizationId_status_severity_c_idx" ON public.pos_offline_sync_conflicts USING btree ("organizationId", status, severity, "createdAt");


--
-- Name: pos_offline_sync_conflicts_syncBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_offline_sync_conflicts_syncBatchId_idx" ON public.pos_offline_sync_conflicts USING btree ("syncBatchId");


--
-- Name: pos_sessions_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_sessions_locationId_idx" ON public.pos_sessions USING btree ("locationId");


--
-- Name: pos_sessions_organizationId_sessionNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_sessions_organizationId_sessionNumber_key" ON public.pos_sessions USING btree ("organizationId", "sessionNumber");


--
-- Name: pos_sessions_status_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_sessions_status_startTime_idx" ON public.pos_sessions USING btree (status, "startTime");


--
-- Name: pos_sessions_terminalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_sessions_terminalId_idx" ON public.pos_sessions USING btree ("terminalId");


--
-- Name: pos_sessions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_sessions_userId_idx" ON public.pos_sessions USING btree ("userId");


--
-- Name: pos_terminals_currentSessionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_terminals_currentSessionId_key" ON public.pos_terminals USING btree ("currentSessionId");


--
-- Name: pos_terminals_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_terminals_locationId_idx" ON public.pos_terminals USING btree ("locationId");


--
-- Name: pos_terminals_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pos_terminals_organizationId_idx" ON public.pos_terminals USING btree ("organizationId");


--
-- Name: pos_terminals_organizationId_terminalNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pos_terminals_organizationId_terminalNumber_key" ON public.pos_terminals USING btree ("organizationId", "terminalNumber");


--
-- Name: posting_rule_lines_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "posting_rule_lines_accountId_idx" ON public.posting_rule_lines USING btree ("accountId");


--
-- Name: posting_rule_lines_organizationId_mappingKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "posting_rule_lines_organizationId_mappingKey_idx" ON public.posting_rule_lines USING btree ("organizationId", "mappingKey");


--
-- Name: posting_rule_lines_postingRuleId_lineNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "posting_rule_lines_postingRuleId_lineNumber_key" ON public.posting_rule_lines USING btree ("postingRuleId", "lineNumber");


--
-- Name: posting_rules_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "posting_rules_organizationId_code_key" ON public.posting_rules USING btree ("organizationId", code);


--
-- Name: posting_rules_organizationId_sourceType_postingPurpose_isAc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "posting_rules_organizationId_sourceType_postingPurpose_isAc_idx" ON public.posting_rules USING btree ("organizationId", "sourceType", "postingPurpose", "isActive");


--
-- Name: production_batches_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "production_batches_locationId_idx" ON public.legacy_production_batches USING btree ("locationId");


--
-- Name: production_batches_organizationId_batchNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "production_batches_organizationId_batchNumber_key" ON public.legacy_production_batches USING btree ("organizationId", "batchNumber");


--
-- Name: production_batches_organizationId_status_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "production_batches_organizationId_status_startedAt_idx" ON public.legacy_production_batches USING btree ("organizationId", status, "startedAt");


--
-- Name: production_batches_recipeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "production_batches_recipeId_idx" ON public.legacy_production_batches USING btree ("recipeId");


--
-- Name: provider_accounts_organizationId_paymentRailId_externalAcco_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "provider_accounts_organizationId_paymentRailId_externalAcco_key" ON public.provider_accounts USING btree ("organizationId", "paymentRailId", "externalAccountHash");


--
-- Name: provider_accounts_organizationId_providerCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "provider_accounts_organizationId_providerCode_key" ON public.provider_accounts USING btree ("organizationId", "providerCode");


--
-- Name: provider_accounts_organizationId_status_currencyCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_accounts_organizationId_status_currencyCode_idx" ON public.provider_accounts USING btree ("organizationId", status, "currencyCode");


--
-- Name: provider_accounts_paymentRailId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_accounts_paymentRailId_status_idx" ON public.provider_accounts USING btree ("paymentRailId", status);


--
-- Name: provider_accounts_settlementLedgerAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_accounts_settlementLedgerAccountId_idx" ON public.provider_accounts USING btree ("settlementLedgerAccountId");


--
-- Name: provider_accounts_suspenseLedgerAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_accounts_suspenseLedgerAccountId_idx" ON public.provider_accounts USING btree ("suspenseLedgerAccountId");


--
-- Name: provider_events_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_events_correlationId_idx" ON public.provider_events USING btree ("correlationId");


--
-- Name: provider_events_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "provider_events_organizationId_id_key" ON public.provider_events USING btree ("organizationId", id);


--
-- Name: provider_events_organizationId_providerAccountId_idempotenc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "provider_events_organizationId_providerAccountId_idempotenc_key" ON public.provider_events USING btree ("organizationId", "providerAccountId", "idempotencyKey");


--
-- Name: provider_events_organizationId_providerAccountId_providerEv_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "provider_events_organizationId_providerAccountId_providerEv_key" ON public.provider_events USING btree ("organizationId", "providerAccountId", "providerEventId");


--
-- Name: provider_events_organizationId_providerAccountId_status_rec_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_events_organizationId_providerAccountId_status_rec_idx" ON public.provider_events USING btree ("organizationId", "providerAccountId", status, "receivedAt");


--
-- Name: provider_events_organizationId_providerReference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_events_organizationId_providerReference_idx" ON public.provider_events USING btree ("organizationId", "providerReference");


--
-- Name: provider_events_organizationId_providerTransactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "provider_events_organizationId_providerTransactionId_idx" ON public.provider_events USING btree ("organizationId", "providerTransactionId");


--
-- Name: public_identity_abuse_buckets_blockedUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "public_identity_abuse_buckets_blockedUntil_idx" ON public.public_identity_abuse_buckets USING btree ("blockedUntil");


--
-- Name: public_identity_abuse_buckets_scope_subjectHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "public_identity_abuse_buckets_scope_subjectHash_key" ON public.public_identity_abuse_buckets USING btree (scope, "subjectHash");


--
-- Name: public_identity_abuse_buckets_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "public_identity_abuse_buckets_updatedAt_idx" ON public.public_identity_abuse_buckets USING btree ("updatedAt");


--
-- Name: public_receipt_access_tokens_org_jti_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX public_receipt_access_tokens_org_jti_hash_key ON public.public_receipt_access_tokens USING btree ("organizationId", "jtiHash");


--
-- Name: public_receipt_access_tokens_org_sale_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX public_receipt_access_tokens_org_sale_status_idx ON public.public_receipt_access_tokens USING btree ("organizationId", "salesOrderId", status);


--
-- Name: public_receipt_access_tokens_org_status_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX public_receipt_access_tokens_org_status_expires_idx ON public.public_receipt_access_tokens USING btree ("organizationId", status, "expiresAt");


--
-- Name: public_receipt_access_tokens_org_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX public_receipt_access_tokens_org_token_hash_key ON public.public_receipt_access_tokens USING btree ("organizationId", "tokenHash");


--
-- Name: purchase_order_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_order_lines_itemId_idx" ON public.purchase_order_lines USING btree ("itemId");


--
-- Name: purchase_order_lines_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_order_lines_purchaseOrderId_idx" ON public.purchase_order_lines USING btree ("purchaseOrderId");


--
-- Name: purchase_orders_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_locationId_idx" ON public.purchase_orders USING btree ("locationId");


--
-- Name: purchase_orders_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_orders_organizationId_id_key" ON public.purchase_orders USING btree ("organizationId", id);


--
-- Name: purchase_orders_organizationId_orderDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_organizationId_orderDate_idx" ON public.purchase_orders USING btree ("organizationId", "orderDate");


--
-- Name: purchase_orders_organizationId_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_orders_organizationId_orderNumber_key" ON public.purchase_orders USING btree ("organizationId", "orderNumber");


--
-- Name: purchase_orders_organizationId_status_orderDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_organizationId_status_orderDate_idx" ON public.purchase_orders USING btree ("organizationId", status, "orderDate");


--
-- Name: purchase_orders_supplierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_supplierId_idx" ON public.purchase_orders USING btree ("supplierId");


--
-- Name: purchase_return_lines_inventoryTransactionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_return_lines_inventoryTransactionId_key" ON public.purchase_return_lines USING btree ("inventoryTransactionId");


--
-- Name: purchase_return_lines_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_return_lines_organizationId_id_key" ON public.purchase_return_lines USING btree ("organizationId", id);


--
-- Name: purchase_return_lines_po_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_return_lines_po_line_idx ON public.purchase_return_lines USING btree ("organizationId", "sourcePurchaseOrderLineId");


--
-- Name: purchase_return_lines_receipt_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_return_lines_receipt_line_idx ON public.purchase_return_lines USING btree ("organizationId", "sourceGoodsReceiptLineId");


--
-- Name: purchase_return_lines_source_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX purchase_return_lines_source_key ON public.purchase_return_lines USING btree ("organizationId", "purchaseReturnId", "sourceGoodsReceiptLineId");


--
-- Name: purchase_returns_direction_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_returns_direction_occurred_idx ON public.purchase_returns USING btree ("organizationId", direction, "occurredAt");


--
-- Name: purchase_returns_organizationId_evidenceHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_returns_organizationId_evidenceHash_key" ON public.purchase_returns USING btree ("organizationId", "evidenceHash");


--
-- Name: purchase_returns_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_returns_organizationId_id_key" ON public.purchase_returns USING btree ("organizationId", id);


--
-- Name: purchase_returns_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_returns_organizationId_idempotencyKey_key" ON public.purchase_returns USING btree ("organizationId", "idempotencyKey");


--
-- Name: purchase_returns_organizationId_returnNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_returns_organizationId_returnNumber_key" ON public.purchase_returns USING btree ("organizationId", "returnNumber");


--
-- Name: purchase_returns_po_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_returns_po_occurred_idx ON public.purchase_returns USING btree ("organizationId", "purchaseOrderId", "occurredAt");


--
-- Name: purchase_returns_receipt_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_returns_receipt_occurred_idx ON public.purchase_returns USING btree ("organizationId", "goodsReceiptId", "occurredAt");


--
-- Name: purchase_returns_reversalOfPurchaseReturnId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_returns_reversalOfPurchaseReturnId_key" ON public.purchase_returns USING btree ("reversalOfPurchaseReturnId");


--
-- Name: recipe_ingredients_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipe_ingredients_itemId_idx" ON public.legacy_recipe_ingredients USING btree ("itemId");


--
-- Name: recipe_ingredients_recipeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipe_ingredients_recipeId_idx" ON public.legacy_recipe_ingredients USING btree ("recipeId");


--
-- Name: recipes_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipes_organizationId_idx" ON public.legacy_recipes USING btree ("organizationId");


--
-- Name: recipes_organizationId_isActive_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipes_organizationId_isActive_deletedAt_idx" ON public.legacy_recipes USING btree ("organizationId", "isActive", "deletedAt");


--
-- Name: recipes_outputItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recipes_outputItemId_idx" ON public.legacy_recipes USING btree ("outputItemId");


--
-- Name: reconciliation_runs_accountingPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_accountingPeriodId_idx" ON public.reconciliation_runs USING btree ("accountingPeriodId");


--
-- Name: reconciliation_runs_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_correlationId_idx" ON public.reconciliation_runs USING btree ("correlationId");


--
-- Name: reconciliation_runs_organizationId_providerAccountId_busine_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "reconciliation_runs_organizationId_providerAccountId_busine_key" ON public.reconciliation_runs USING btree ("organizationId", "providerAccountId", "businessDate");


--
-- Name: reconciliation_runs_organizationId_providerAccountId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_organizationId_providerAccountId_status_idx" ON public.reconciliation_runs USING btree ("organizationId", "providerAccountId", status, "periodStart");


--
-- Name: reconciliation_runs_organizationId_status_businessDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_organizationId_status_businessDate_idx" ON public.reconciliation_runs USING btree ("organizationId", status, "businessDate");


--
-- Name: reconciliation_runs_paymentRailId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_paymentRailId_idx" ON public.reconciliation_runs USING btree ("paymentRailId");


--
-- Name: reconciliation_runs_runById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_runById_idx" ON public.reconciliation_runs USING btree ("runById");


--
-- Name: reconciliation_runs_signedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reconciliation_runs_signedById_idx" ON public.reconciliation_runs USING btree ("signedById");


--
-- Name: referral_attribution_events_conversion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_attribution_events_conversion_idx ON public.referral_attribution_events USING btree ("targetOrganizationId", "eventType");


--
-- Name: referral_attribution_events_funnel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_attribution_events_funnel_idx ON public.referral_attribution_events USING btree ("organizationId", "eventType", "occurredAt");


--
-- Name: referral_attribution_events_identity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referral_attribution_events_identity_key ON public.referral_attribution_events USING btree ("organizationId", "attributionId", "eventType", "sourceEventKey");


--
-- Name: referral_attributions_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_attributions_campaign_idx ON public.referral_attributions USING btree ("organizationId", campaign, "createdAt");


--
-- Name: referral_attributions_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "referral_attributions_organizationId_id_key" ON public.referral_attributions USING btree ("organizationId", id);


--
-- Name: referral_attributions_referralCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "referral_attributions_referralCode_key" ON public.referral_attributions USING btree ("referralCode");


--
-- Name: referral_attributions_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_attributions_source_idx ON public.referral_attributions USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: roles_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "roles_organizationId_code_key" ON public.roles USING btree ("organizationId", code);


--
-- Name: roles_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "roles_organizationId_idx" ON public.roles USING btree ("organizationId");


--
-- Name: sales_order_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_order_lines_itemId_idx" ON public.sales_order_lines USING btree ("itemId");


--
-- Name: sales_order_lines_salesOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_order_lines_salesOrderId_idx" ON public.sales_order_lines USING btree ("salesOrderId");


--
-- Name: sales_orders_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_customerId_idx" ON public.sales_orders USING btree ("customerId");


--
-- Name: sales_orders_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_locationId_idx" ON public.sales_orders USING btree ("locationId");


--
-- Name: sales_orders_organizationId_channel_status_orderDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_organizationId_channel_status_orderDate_idx" ON public.sales_orders USING btree ("organizationId", channel, status, "orderDate");


--
-- Name: sales_orders_organizationId_locationId_orderDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_organizationId_locationId_orderDate_idx" ON public.sales_orders USING btree ("organizationId", "locationId", "orderDate");


--
-- Name: sales_orders_organizationId_orderDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_organizationId_orderDate_idx" ON public.sales_orders USING btree ("organizationId", "orderDate");


--
-- Name: sales_orders_organizationId_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "sales_orders_organizationId_orderNumber_key" ON public.sales_orders USING btree ("organizationId", "orderNumber");


--
-- Name: sales_orders_organizationId_paymentStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_organizationId_paymentStatus_idx" ON public.sales_orders USING btree ("organizationId", "paymentStatus");


--
-- Name: sales_orders_organizationId_status_orderDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sales_orders_organizationId_status_orderDate_idx" ON public.sales_orders USING btree ("organizationId", status, "orderDate");


--
-- Name: sales_orders_pos_cart_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_orders_pos_cart_scope_idx ON public.sales_orders USING btree ("organizationId", "createdById", "sessionId", "posCartState") WHERE ((channel = 'POS'::public."SalesOrderChannel") AND (status = 'DRAFT'::public."SalesOrderStatus") AND ("deletedAt" IS NULL));


--
-- Name: serial_numbers_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "serial_numbers_itemId_idx" ON public.serial_numbers USING btree ("itemId");


--
-- Name: serial_numbers_organizationId_serialNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "serial_numbers_organizationId_serialNumber_key" ON public.serial_numbers USING btree ("organizationId", "serialNumber");


--
-- Name: serial_numbers_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "serial_numbers_organizationId_status_idx" ON public.serial_numbers USING btree ("organizationId", status);


--
-- Name: sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_expiresAt_idx" ON public.sessions USING btree ("expiresAt");


--
-- Name: sessions_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token);


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: settlement_accounts_accountReferenceHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "settlement_accounts_accountReferenceHash_idx" ON public.settlement_accounts USING btree ("accountReferenceHash");


--
-- Name: settlement_accounts_organizationId_ledgerAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "settlement_accounts_organizationId_ledgerAccountId_idx" ON public.settlement_accounts USING btree ("organizationId", "ledgerAccountId");


--
-- Name: settlement_accounts_organizationId_providerAccountId_approv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "settlement_accounts_organizationId_providerAccountId_approv_idx" ON public.settlement_accounts USING btree ("organizationId", "providerAccountId", "approvalStatus");


--
-- Name: statement_files_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_files_correlationId_idx" ON public.statement_files USING btree ("correlationId");


--
-- Name: statement_files_importedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_files_importedById_idx" ON public.statement_files USING btree ("importedById");


--
-- Name: statement_files_organizationId_providerAccountId_fileHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "statement_files_organizationId_providerAccountId_fileHash_key" ON public.statement_files USING btree ("organizationId", "providerAccountId", "fileHash");


--
-- Name: statement_files_organizationId_providerAccountId_status_per_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_files_organizationId_providerAccountId_status_per_idx" ON public.statement_files USING btree ("organizationId", "providerAccountId", status, "periodStart");


--
-- Name: statement_lines_organizationId_providerAccountId_fingerprin_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "statement_lines_organizationId_providerAccountId_fingerprin_key" ON public.statement_lines USING btree ("organizationId", "providerAccountId", fingerprint);


--
-- Name: statement_lines_organizationId_providerAccountId_status_occ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_lines_organizationId_providerAccountId_status_occ_idx" ON public.statement_lines USING btree ("organizationId", "providerAccountId", status, "occurredAt");


--
-- Name: statement_lines_organizationId_providerReference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_lines_organizationId_providerReference_idx" ON public.statement_lines USING btree ("organizationId", "providerReference");


--
-- Name: statement_lines_organizationId_providerTransactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_lines_organizationId_providerTransactionId_idx" ON public.statement_lines USING btree ("organizationId", "providerTransactionId");


--
-- Name: statement_lines_statementFileId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "statement_lines_statementFileId_idx" ON public.statement_lines USING btree ("statementFileId");


--
-- Name: stock_adjustment_lines_adjustmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustment_lines_adjustmentId_idx" ON public.stock_adjustment_lines USING btree ("adjustmentId");


--
-- Name: stock_adjustment_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustment_lines_itemId_idx" ON public.stock_adjustment_lines USING btree ("itemId");


--
-- Name: stock_adjustment_lines_stockCountLineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustment_lines_stockCountLineId_idx" ON public.stock_adjustment_lines USING btree ("stockCountLineId");


--
-- Name: stock_adjustments_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustments_ledgerPostingBatchId_idx" ON public.stock_adjustments USING btree ("ledgerPostingBatchId");


--
-- Name: stock_adjustments_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustments_locationId_idx" ON public.stock_adjustments USING btree ("locationId");


--
-- Name: stock_adjustments_organizationId_adjustmentNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_adjustments_organizationId_adjustmentNumber_key" ON public.stock_adjustments USING btree ("organizationId", "adjustmentNumber");


--
-- Name: stock_adjustments_organizationId_status_adjustmentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustments_organizationId_status_adjustmentDate_idx" ON public.stock_adjustments USING btree ("organizationId", status, "adjustmentDate");


--
-- Name: stock_adjustments_postedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustments_postedBusinessEventId_idx" ON public.stock_adjustments USING btree ("postedBusinessEventId");


--
-- Name: stock_adjustments_reversalOfAdjustmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_adjustments_reversalOfAdjustmentId_key" ON public.stock_adjustments USING btree ("reversalOfAdjustmentId");


--
-- Name: stock_adjustments_sourceCountSessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_adjustments_sourceCountSessionId_idx" ON public.stock_adjustments USING btree ("sourceCountSessionId");


--
-- Name: stock_count_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_lines_itemId_idx" ON public.stock_count_lines USING btree ("itemId");


--
-- Name: stock_count_lines_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_lines_locationId_idx" ON public.stock_count_lines USING btree ("locationId");


--
-- Name: stock_count_lines_stockCountSessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_lines_stockCountSessionId_idx" ON public.stock_count_lines USING btree ("stockCountSessionId");


--
-- Name: stock_count_lines_stockCountSessionId_itemId_locationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_count_lines_stockCountSessionId_itemId_locationId_key" ON public.stock_count_lines USING btree ("stockCountSessionId", "itemId", "locationId");


--
-- Name: stock_count_sessions_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_sessions_locationId_idx" ON public.stock_count_sessions USING btree ("locationId");


--
-- Name: stock_count_sessions_organizationId_countNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_count_sessions_organizationId_countNumber_key" ON public.stock_count_sessions USING btree ("organizationId", "countNumber");


--
-- Name: stock_count_sessions_organizationId_status_countDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_sessions_organizationId_status_countDate_idx" ON public.stock_count_sessions USING btree ("organizationId", status, "countDate");


--
-- Name: stock_count_sessions_postedAdjustmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_sessions_postedAdjustmentId_idx" ON public.stock_count_sessions USING btree ("postedAdjustmentId");


--
-- Name: stock_count_sessions_postedBusinessEventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_count_sessions_postedBusinessEventId_idx" ON public.stock_count_sessions USING btree ("postedBusinessEventId");


--
-- Name: stock_transfer_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_transfer_lines_itemId_idx" ON public.stock_transfer_lines USING btree ("itemId");


--
-- Name: stock_transfer_lines_transferId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_transfer_lines_transferId_idx" ON public.stock_transfer_lines USING btree ("transferId");


--
-- Name: stock_transfers_fromLocationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_transfers_fromLocationId_idx" ON public.stock_transfers USING btree ("fromLocationId");


--
-- Name: stock_transfers_organizationId_status_transferDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_transfers_organizationId_status_transferDate_idx" ON public.stock_transfers USING btree ("organizationId", status, "transferDate");


--
-- Name: stock_transfers_organizationId_transferNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_transfers_organizationId_transferNumber_key" ON public.stock_transfers USING btree ("organizationId", "transferNumber");


--
-- Name: stock_transfers_toLocationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_transfers_toLocationId_idx" ON public.stock_transfers USING btree ("toLocationId");


--
-- Name: supplier_bank_accounts_organizationId_accountNumberHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_bank_accounts_organizationId_accountNumberHash_idx" ON public.supplier_bank_accounts USING btree ("organizationId", "accountNumberHash");


--
-- Name: supplier_bank_accounts_organizationId_mobileMoneyPhoneHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_bank_accounts_organizationId_mobileMoneyPhoneHash_idx" ON public.supplier_bank_accounts USING btree ("organizationId", "mobileMoneyPhoneHash");


--
-- Name: supplier_bank_accounts_organizationId_supplierId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_bank_accounts_organizationId_supplierId_status_idx" ON public.supplier_bank_accounts USING btree ("organizationId", "supplierId", status);


--
-- Name: supplier_bank_change_requests_bankAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_bank_change_requests_bankAccountId_idx" ON public.supplier_bank_change_requests USING btree ("bankAccountId");


--
-- Name: supplier_bank_change_requests_organizationId_supplierId_sta_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_bank_change_requests_organizationId_supplierId_sta_idx" ON public.supplier_bank_change_requests USING btree ("organizationId", "supplierId", status, "requestedAt");


--
-- Name: supplier_credit_note_lines_invoice_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_credit_note_lines_invoice_line_idx ON public.supplier_credit_note_lines USING btree ("organizationId", "sourceSupplierInvoiceLineId");


--
-- Name: supplier_credit_note_lines_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_credit_note_lines_organizationId_id_key" ON public.supplier_credit_note_lines USING btree ("organizationId", id);


--
-- Name: supplier_credit_note_lines_receipt_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_credit_note_lines_receipt_line_idx ON public.supplier_credit_note_lines USING btree ("organizationId", "sourceGoodsReceiptLineId");


--
-- Name: supplier_credit_note_lines_source_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_note_lines_source_key ON public.supplier_credit_note_lines USING btree ("organizationId", "supplierCreditNoteId", "sourcePurchaseReturnLineId");


--
-- Name: supplier_credit_notes_evidence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_notes_evidence_key ON public.supplier_credit_notes USING btree ("organizationId", "evidenceHash");


--
-- Name: supplier_credit_notes_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_notes_idempotency_key ON public.supplier_credit_notes USING btree ("organizationId", "idempotencyKey");


--
-- Name: supplier_credit_notes_invoice_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_credit_notes_invoice_date_idx ON public.supplier_credit_notes USING btree ("organizationId", "supplierInvoiceId", "creditDate");


--
-- Name: supplier_credit_notes_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_credit_notes_organizationId_id_key" ON public.supplier_credit_notes USING btree ("organizationId", id);


--
-- Name: supplier_credit_notes_po_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_credit_notes_po_date_idx ON public.supplier_credit_notes USING btree ("organizationId", "purchaseOrderId", "creditDate");


--
-- Name: supplier_credit_notes_receipt_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_credit_notes_receipt_date_idx ON public.supplier_credit_notes USING btree ("organizationId", "goodsReceiptId", "creditDate");


--
-- Name: supplier_credit_notes_return_direction_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_notes_return_direction_key ON public.supplier_credit_notes USING btree ("organizationId", "purchaseReturnId", direction);


--
-- Name: supplier_credit_notes_reversal_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_notes_reversal_key ON public.supplier_credit_notes USING btree ("reversalOfSupplierCreditNoteId");


--
-- Name: supplier_credit_notes_supplier_document_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_notes_supplier_document_key ON public.supplier_credit_notes USING btree ("organizationId", "supplierId", "documentHash");


--
-- Name: supplier_credit_notes_supplier_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_credit_notes_supplier_number_key ON public.supplier_credit_notes USING btree ("organizationId", "supplierId", "normalizedCreditNoteNumber");


--
-- Name: supplier_invoice_lines_goodsReceiptLineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoice_lines_goodsReceiptLineId_idx" ON public.supplier_invoice_lines USING btree ("goodsReceiptLineId");


--
-- Name: supplier_invoice_lines_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoice_lines_itemId_idx" ON public.supplier_invoice_lines USING btree ("itemId");


--
-- Name: supplier_invoice_lines_organizationId_supplierInvoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoice_lines_organizationId_supplierInvoiceId_idx" ON public.supplier_invoice_lines USING btree ("organizationId", "supplierInvoiceId");


--
-- Name: supplier_invoice_lines_purchaseOrderLineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoice_lines_purchaseOrderLineId_idx" ON public.supplier_invoice_lines USING btree ("purchaseOrderLineId");


--
-- Name: supplier_invoice_match_exceptions_active_match_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_invoice_match_exceptions_active_match_key ON public.supplier_invoice_match_exceptions USING btree ("organizationId", "threeWayMatchId") WHERE (status = ANY (ARRAY['OPEN'::public."SupplierInvoiceMatchExceptionStatus", 'APPROVED'::public."SupplierInvoiceMatchExceptionStatus"]));


--
-- Name: supplier_invoice_match_exceptions_invoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_invoice_match_exceptions_invoice_status_idx ON public.supplier_invoice_match_exceptions USING btree ("organizationId", "supplierInvoiceId", status);


--
-- Name: supplier_invoice_match_exceptions_match_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_invoice_match_exceptions_match_status_idx ON public.supplier_invoice_match_exceptions USING btree ("organizationId", "threeWayMatchId", status);


--
-- Name: supplier_invoice_match_exceptions_org_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_invoice_match_exceptions_org_id_key ON public.supplier_invoice_match_exceptions USING btree ("organizationId", id);


--
-- Name: supplier_invoice_match_exceptions_status_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_invoice_match_exceptions_status_expiry_idx ON public.supplier_invoice_match_exceptions USING btree ("organizationId", status, "expiresAt");


--
-- Name: supplier_invoices_organizationId_duplicateFingerprint_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_invoices_organizationId_duplicateFingerprint_key" ON public.supplier_invoices USING btree ("organizationId", "duplicateFingerprint");


--
-- Name: supplier_invoices_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_invoices_organizationId_id_key" ON public.supplier_invoices USING btree ("organizationId", id);


--
-- Name: supplier_invoices_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_invoices_organizationId_idempotencyKey_key" ON public.supplier_invoices USING btree ("organizationId", "idempotencyKey");


--
-- Name: supplier_invoices_organizationId_status_invoiceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoices_organizationId_status_invoiceDate_idx" ON public.supplier_invoices USING btree ("organizationId", status, "invoiceDate");


--
-- Name: supplier_invoices_organizationId_supplierId_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_invoices_organizationId_supplierId_invoiceNumber_key" ON public.supplier_invoices USING btree ("organizationId", "supplierId", "invoiceNumber");


--
-- Name: supplier_invoices_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoices_purchaseOrderId_idx" ON public.supplier_invoices USING btree ("purchaseOrderId");


--
-- Name: supplier_invoices_supplierId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_invoices_supplierId_status_idx" ON public.supplier_invoices USING btree ("supplierId", status);


--
-- Name: supplier_ledger_entries_organizationId_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_ledger_entries_organizationId_entryDate_idx" ON public.supplier_ledger_entries USING btree ("organizationId", "entryDate");


--
-- Name: supplier_ledger_entries_referenceType_referenceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_ledger_entries_referenceType_referenceId_idx" ON public.supplier_ledger_entries USING btree ("referenceType", "referenceId");


--
-- Name: supplier_ledger_entries_supplierId_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_ledger_entries_supplierId_entryDate_idx" ON public.supplier_ledger_entries USING btree ("supplierId", "entryDate");


--
-- Name: supplier_payment_allocations_organizationId_supplierInvoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_payment_allocations_organizationId_supplierInvoice_idx" ON public.supplier_payment_allocations USING btree ("organizationId", "supplierInvoiceId");


--
-- Name: supplier_payment_allocations_supplierPaymentId_supplierInvo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_payment_allocations_supplierPaymentId_supplierInvo_key" ON public.supplier_payment_allocations USING btree ("supplierPaymentId", "supplierInvoiceId");


--
-- Name: supplier_payments_bankAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_payments_bankAccountId_idx" ON public.supplier_payments USING btree ("bankAccountId");


--
-- Name: supplier_payments_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_payments_organizationId_idempotencyKey_key" ON public.supplier_payments USING btree ("organizationId", "idempotencyKey");


--
-- Name: supplier_payments_organizationId_paymentNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_payments_organizationId_paymentNumber_key" ON public.supplier_payments USING btree ("organizationId", "paymentNumber");


--
-- Name: supplier_payments_organizationId_status_paymentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_payments_organizationId_status_paymentDate_idx" ON public.supplier_payments USING btree ("organizationId", status, "paymentDate");


--
-- Name: supplier_payments_supplierId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_payments_supplierId_status_idx" ON public.supplier_payments USING btree ("supplierId", status);


--
-- Name: supplier_po_access_logs_organizationId_envelopeId_occurredAt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_access_logs_organizationId_envelopeId_occurredAt_id" ON public.supplier_po_access_logs USING btree ("organizationId", "envelopeId", "occurredAt");


--
-- Name: supplier_po_access_logs_organizationId_tokenId_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_access_logs_organizationId_tokenId_occurredAt_idx" ON public.supplier_po_access_logs USING btree ("organizationId", "tokenId", "occurredAt");


--
-- Name: supplier_po_access_tokens_organizationId_businessEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_businessEventId_key" ON public.supplier_po_access_tokens USING btree ("organizationId", "businessEventId");


--
-- Name: supplier_po_access_tokens_organizationId_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_correlationId_key" ON public.supplier_po_access_tokens USING btree ("organizationId", "correlationId");


--
-- Name: supplier_po_access_tokens_organizationId_envelopeId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_access_tokens_organizationId_envelopeId_status_idx" ON public.supplier_po_access_tokens USING btree ("organizationId", "envelopeId", status);


--
-- Name: supplier_po_access_tokens_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_id_key" ON public.supplier_po_access_tokens USING btree ("organizationId", id);


--
-- Name: supplier_po_access_tokens_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_idempotencyKey_key" ON public.supplier_po_access_tokens USING btree ("organizationId", "idempotencyKey");


--
-- Name: supplier_po_access_tokens_organizationId_jtiHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_jtiHash_key" ON public.supplier_po_access_tokens USING btree ("organizationId", "jtiHash");


--
-- Name: supplier_po_access_tokens_organizationId_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_access_tokens_organizationId_status_expiresAt_idx" ON public.supplier_po_access_tokens USING btree ("organizationId", status, "expiresAt");


--
-- Name: supplier_po_access_tokens_organizationId_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_tokenHash_key" ON public.supplier_po_access_tokens USING btree ("organizationId", "tokenHash");


--
-- Name: supplier_po_envelopes_organizationId_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_envelopes_organizationId_correlationId_key" ON public.supplier_po_envelopes USING btree ("organizationId", "correlationId");


--
-- Name: supplier_po_envelopes_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_envelopes_organizationId_id_key" ON public.supplier_po_envelopes USING btree ("organizationId", id);


--
-- Name: supplier_po_envelopes_organizationId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_envelopes_organizationId_idempotencyKey_key" ON public.supplier_po_envelopes USING btree ("organizationId", "idempotencyKey");


--
-- Name: supplier_po_envelopes_organizationId_purchaseOrderId_createdAt_; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_envelopes_organizationId_purchaseOrderId_createdAt_" ON public.supplier_po_envelopes USING btree ("organizationId", "purchaseOrderId", "createdAt");


--
-- Name: supplier_po_envelopes_organizationId_supplierId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_envelopes_organizationId_supplierId_createdAt_idx" ON public.supplier_po_envelopes USING btree ("organizationId", "supplierId", "createdAt");


--
-- Name: supplier_po_envelopes_po_content_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_po_envelopes_po_content_key ON public.supplier_po_envelopes USING btree ("organizationId", "purchaseOrderId", "contentHash");


--
-- Name: supplier_po_proposal_lines_organizationId_purchaseOrderLineId_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_proposal_lines_organizationId_purchaseOrderLineId_i" ON public.supplier_po_proposal_lines USING btree ("organizationId", "purchaseOrderLineId");


--
-- Name: supplier_po_proposal_lines_proposal_line_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_po_proposal_lines_proposal_line_key ON public.supplier_po_proposal_lines USING btree ("organizationId", "proposalId", "purchaseOrderLineId");


--
-- Name: supplier_po_proposal_states_organizationId_proposalId_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "supplier_po_proposal_states_organizationId_proposalId_effective" ON public.supplier_po_proposal_states USING btree ("organizationId", "proposalId", "effectiveAt");


--
-- Name: supplier_po_proposal_states_organizationId_stateHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_proposal_states_organizationId_stateHash_key" ON public.supplier_po_proposal_states USING btree ("organizationId", "stateHash");


--
-- Name: supplier_po_proposal_states_proposal_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_po_proposal_states_proposal_version_key ON public.supplier_po_proposal_states USING btree ("organizationId", "proposalId", version);


--
-- Name: supplier_po_proposals_envelope_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_po_proposals_envelope_idempotency_key ON public.supplier_po_proposals USING btree ("organizationId", "envelopeId", "idempotencyKey");


--
-- Name: supplier_po_proposals_envelope_type_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_po_proposals_envelope_type_created_idx ON public.supplier_po_proposals USING btree ("organizationId", "envelopeId", "proposalType", "createdAt");


--
-- Name: supplier_po_proposals_organizationId_correlationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_proposals_organizationId_correlationId_key" ON public.supplier_po_proposals USING btree ("organizationId", "correlationId");


--
-- Name: supplier_po_proposals_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_proposals_organizationId_id_key" ON public.supplier_po_proposals USING btree ("organizationId", id);


--
-- Name: supplier_po_proposals_tokenId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "supplier_po_proposals_tokenId_key" ON public.supplier_po_proposals USING btree ("tokenId");


--
-- Name: suppliers_organizationId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "suppliers_organizationId_code_key" ON public.suppliers USING btree ("organizationId", code);


--
-- Name: suppliers_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suppliers_organizationId_idx" ON public.suppliers USING btree ("organizationId");


--
-- Name: suppliers_organizationId_isActive_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suppliers_organizationId_isActive_deletedAt_idx" ON public.suppliers USING btree ("organizationId", "isActive", "deletedAt");


--
-- Name: suspense_items_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_correlationId_idx" ON public.suspense_items USING btree ("correlationId");


--
-- Name: suspense_items_ledgerPostingBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_ledgerPostingBatchId_idx" ON public.suspense_items USING btree ("ledgerPostingBatchId");


--
-- Name: suspense_items_organizationId_ownerId_status_slaDeadline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_organizationId_ownerId_status_slaDeadline_idx" ON public.suspense_items USING btree ("organizationId", "ownerId", status, "slaDeadline");


--
-- Name: suspense_items_organizationId_providerAccountId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_organizationId_providerAccountId_status_idx" ON public.suspense_items USING btree ("organizationId", "providerAccountId", status);


--
-- Name: suspense_items_organizationId_status_severity_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_organizationId_status_severity_createdAt_idx" ON public.suspense_items USING btree ("organizationId", status, severity, "createdAt");


--
-- Name: suspense_items_paymentTransactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_paymentTransactionId_idx" ON public.suspense_items USING btree ("paymentTransactionId");


--
-- Name: suspense_items_reconciliationRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_reconciliationRunId_idx" ON public.suspense_items USING btree ("reconciliationRunId");


--
-- Name: suspense_items_suspenseLedgerAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "suspense_items_suspenseLedgerAccountId_idx" ON public.suspense_items USING btree ("suspenseLedgerAccountId");


--
-- Name: tax_rates_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tax_rates_organizationId_idx" ON public.tax_rates USING btree ("organizationId");


--
-- Name: tax_rates_organizationId_nameEn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tax_rates_organizationId_nameEn_key" ON public.tax_rates USING btree ("organizationId", "nameEn");


--
-- Name: tenant_module_commands_org_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_module_commands_org_idempotency_key ON public.tenant_module_configuration_commands USING btree ("organizationId", "idempotencyKey");


--
-- Name: tenant_module_commands_org_state_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_module_commands_org_state_created_idx ON public.tenant_module_configuration_commands USING btree ("organizationId", state, "createdAt");


--
-- Name: tenant_module_configuration_commands_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tenant_module_configuration_commands_organizationId_id_key" ON public.tenant_module_configuration_commands USING btree ("organizationId", id);


--
-- Name: tenant_module_grants_organizationId_moduleSlug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tenant_module_grants_organizationId_moduleSlug_key" ON public.tenant_module_grants USING btree ("organizationId", "moduleSlug");


--
-- Name: tenant_module_grants_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tenant_module_grants_organizationId_status_idx" ON public.tenant_module_grants USING btree ("organizationId", status);


--
-- Name: tenant_module_lifecycle_operations_commandId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_commandId_key" ON public.tenant_module_lifecycle_operations USING btree ("commandId");


--
-- Name: tenant_module_lifecycle_operations_organizationId_commandId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_organizationId_commandId_key" ON public.tenant_module_lifecycle_operations USING btree ("organizationId", "commandId");


--
-- Name: tenant_module_lifecycle_operations_organizationId_desiredRevisi; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_organizationId_desiredRevisi" ON public.tenant_module_lifecycle_operations USING btree ("organizationId", "desiredRevision");


--
-- Name: tenant_module_lifecycle_operations_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_organizationId_id_key" ON public.tenant_module_lifecycle_operations USING btree ("organizationId", id);


--
-- Name: tenant_module_lifecycle_operations_organizationId_state_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tenant_module_lifecycle_operations_organizationId_state_created" ON public.tenant_module_lifecycle_operations USING btree ("organizationId", state, "createdAt");


--
-- Name: three_way_matches_goodsReceiptId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "three_way_matches_goodsReceiptId_idx" ON public.three_way_matches USING btree ("goodsReceiptId");


--
-- Name: three_way_matches_organizationId_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "three_way_matches_organizationId_id_key" ON public.three_way_matches USING btree ("organizationId", id);


--
-- Name: three_way_matches_organizationId_status_matchedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "three_way_matches_organizationId_status_matchedAt_idx" ON public.three_way_matches USING btree ("organizationId", status, "matchedAt");


--
-- Name: three_way_matches_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "three_way_matches_purchaseOrderId_idx" ON public.three_way_matches USING btree ("purchaseOrderId");


--
-- Name: three_way_matches_supplierInvoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "three_way_matches_supplierInvoiceId_idx" ON public.three_way_matches USING btree ("supplierInvoiceId");


--
-- Name: units_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "units_organizationId_idx" ON public.units USING btree ("organizationId");


--
-- Name: units_organizationId_nameEn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "units_organizationId_nameEn_key" ON public.units USING btree ("organizationId", "nameEn");


--
-- Name: units_organizationId_symbol_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "units_organizationId_symbol_key" ON public.units USING btree ("organizationId", symbol);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_organizationId_idx" ON public.users USING btree ("organizationId");


--
-- Name: users_organizationId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_organizationId_isActive_idx" ON public.users USING btree ("organizationId", "isActive");


--
-- Name: users_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_phone_idx ON public.users USING btree (phone);


--
-- Name: users_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_phone_key ON public.users USING btree (phone);


--
-- Name: workflow_assurance_alert_deliveries_channel_status_nextAttemptA; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_alert_deliveries_channel_status_nextAttemptA" ON public.workflow_assurance_alert_deliveries USING btree (channel, status, "nextAttemptAt");


--
-- Name: workflow_assurance_alert_deliveries_incidentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_alert_deliveries_incidentId_idx" ON public.workflow_assurance_alert_deliveries USING btree ("incidentId");


--
-- Name: workflow_assurance_alert_deliveries_organizationId_channel_stat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_alert_deliveries_organizationId_channel_stat" ON public.workflow_assurance_alert_deliveries USING btree ("organizationId", channel, status);


--
-- Name: workflow_assurance_alert_deliveries_organizationId_incidentId_c; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "workflow_assurance_alert_deliveries_organizationId_incidentId_c" ON public.workflow_assurance_alert_deliveries USING btree ("organizationId", "incidentId", channel, "dedupeKey");


--
-- Name: workflow_assurance_alert_deliveries_organizationId_status_creat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_alert_deliveries_organizationId_status_creat" ON public.workflow_assurance_alert_deliveries USING btree ("organizationId", status, "createdAt");


--
-- Name: workflow_assurance_check_definitions_checkKey_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "workflow_assurance_check_definitions_checkKey_version_key" ON public.workflow_assurance_check_definitions USING btree ("checkKey", version);


--
-- Name: workflow_assurance_check_definitions_executionMode_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_definitions_executionMode_enabled_idx" ON public.workflow_assurance_check_definitions USING btree ("executionMode", enabled);


--
-- Name: workflow_assurance_check_definitions_moduleSlug_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_definitions_moduleSlug_enabled_idx" ON public.workflow_assurance_check_definitions USING btree ("moduleSlug", enabled);


--
-- Name: workflow_assurance_check_definitions_workflow_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workflow_assurance_check_definitions_workflow_enabled_idx ON public.workflow_assurance_check_definitions USING btree (workflow, enabled);


--
-- Name: workflow_assurance_check_findings_checkRunId_fingerprint_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "workflow_assurance_check_findings_checkRunId_fingerprint_key" ON public.workflow_assurance_check_findings USING btree ("checkRunId", fingerprint);


--
-- Name: workflow_assurance_check_findings_checkRunId_ordinal_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "workflow_assurance_check_findings_checkRunId_ordinal_key" ON public.workflow_assurance_check_findings USING btree ("checkRunId", ordinal);


--
-- Name: workflow_assurance_check_findings_incidentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_findings_incidentId_idx" ON public.workflow_assurance_check_findings USING btree ("incidentId");


--
-- Name: workflow_assurance_check_findings_organizationId_sourceType_sou; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_findings_organizationId_sourceType_sou" ON public.workflow_assurance_check_findings USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: workflow_assurance_check_runs_definitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_runs_definitionId_idx" ON public.workflow_assurance_check_runs USING btree ("definitionId");


--
-- Name: workflow_assurance_check_runs_organizationId_checkKey_startedAt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_runs_organizationId_checkKey_startedAt" ON public.workflow_assurance_check_runs USING btree ("organizationId", "checkKey", "startedAt");


--
-- Name: workflow_assurance_check_runs_organizationId_resultStatus_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_runs_organizationId_resultStatus_start" ON public.workflow_assurance_check_runs USING btree ("organizationId", "resultStatus", "startedAt");


--
-- Name: workflow_assurance_check_runs_organizationId_runStatus_startedA; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_runs_organizationId_runStatus_startedA" ON public.workflow_assurance_check_runs USING btree ("organizationId", "runStatus", "startedAt");


--
-- Name: workflow_assurance_check_runs_organizationId_sourceType_sourceI; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_check_runs_organizationId_sourceType_sourceI" ON public.workflow_assurance_check_runs USING btree ("organizationId", "sourceType", "sourceId");


--
-- Name: workflow_assurance_incident_events_actorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incident_events_actorId_createdAt_idx" ON public.workflow_assurance_incident_events USING btree ("actorId", "createdAt");


--
-- Name: workflow_assurance_incident_events_organizationId_eventType_cre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incident_events_organizationId_eventType_cre" ON public.workflow_assurance_incident_events USING btree ("organizationId", "eventType", "createdAt");


--
-- Name: workflow_assurance_incident_events_organizationId_incidentId_cr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incident_events_organizationId_incidentId_cr" ON public.workflow_assurance_incident_events USING btree ("organizationId", "incidentId", "createdAt");


--
-- Name: workflow_assurance_incident_identity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workflow_assurance_incident_identity_key ON public.workflow_assurance_incidents USING btree ("organizationId", "checkKey", "definitionVersion", "sourceType", "sourceId");


--
-- Name: workflow_assurance_incidents_checkRunId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incidents_checkRunId_idx" ON public.workflow_assurance_incidents USING btree ("checkRunId");


--
-- Name: workflow_assurance_incidents_definitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incidents_definitionId_idx" ON public.workflow_assurance_incidents USING btree ("definitionId");


--
-- Name: workflow_assurance_incidents_organizationId_ownerId_status_dueA; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incidents_organizationId_ownerId_status_dueA" ON public.workflow_assurance_incidents USING btree ("organizationId", "ownerId", status, "dueAt");


--
-- Name: workflow_assurance_incidents_organizationId_status_severity_las; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incidents_organizationId_status_severity_las" ON public.workflow_assurance_incidents USING btree ("organizationId", status, severity, "lastDetectedAt");


--
-- Name: workflow_assurance_incidents_organizationId_workflow_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_incidents_organizationId_workflow_status_idx" ON public.workflow_assurance_incidents USING btree ("organizationId", workflow, status);


--
-- Name: workflow_assurance_run_execution_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workflow_assurance_run_execution_key ON public.workflow_assurance_check_runs USING btree ("organizationId", "checkKey", "definitionVersion", "executionKey");


--
-- Name: workflow_assurance_waivers_organizationId_expiresAt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_waivers_organizationId_expiresAt_status_idx" ON public.workflow_assurance_waivers USING btree ("organizationId", "expiresAt", status);


--
-- Name: workflow_assurance_waivers_organizationId_incidentId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_waivers_organizationId_incidentId_status_idx" ON public.workflow_assurance_waivers USING btree ("organizationId", "incidentId", status);


--
-- Name: workflow_assurance_waivers_organizationId_requesterId_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workflow_assurance_waivers_organizationId_requesterId_status_id" ON public.workflow_assurance_waivers USING btree ("organizationId", "requesterId", status);


--
-- Name: accountant_client_invite_states accountant_client_invite_states_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accountant_client_invite_states_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.accountant_client_invite_states FOR EACH ROW EXECUTE FUNCTION public.accountant_client_invite_append_only_guard();


--
-- Name: accountant_client_invites accountant_client_invites_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accountant_client_invites_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.accountant_client_invites FOR EACH ROW EXECUTE FUNCTION public.accountant_client_invite_append_only_guard();


--
-- Name: cash_shortage_policies cash_shortage_policies_approved_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cash_shortage_policies_approved_immutable BEFORE UPDATE ON public.cash_shortage_policies FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_cash_shortage_policy_update();


--
-- Name: compliance_evidence compliance_evidence_prevent_certified_document_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER compliance_evidence_prevent_certified_document_mutation_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.compliance_evidence FOR EACH ROW EXECUTE FUNCTION public.compliance_evidence_prevent_certified_document_mutation();


--
-- Name: fiscal_document_lines compliance_fiscal_document_lines_prevent_certified_parent_mutat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER compliance_fiscal_document_lines_prevent_certified_parent_mutat BEFORE INSERT OR DELETE OR UPDATE ON public.fiscal_document_lines FOR EACH ROW EXECUTE FUNCTION public.compliance_fiscal_document_lines_prevent_certified_parent_mutat();


--
-- Name: fiscal_documents compliance_fiscal_documents_prevent_certified_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER compliance_fiscal_documents_prevent_certified_mutation_trigger BEFORE DELETE OR UPDATE ON public.fiscal_documents FOR EACH ROW EXECUTE FUNCTION public.compliance_fiscal_documents_prevent_certified_mutation();


--
-- Name: compliance_submissions compliance_submissions_prevent_certified_document_mutation_trig; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER compliance_submissions_prevent_certified_document_mutation_trig BEFORE INSERT OR DELETE OR UPDATE ON public.compliance_submissions FOR EACH ROW EXECUTE FUNCTION public.compliance_submissions_prevent_certified_document_mutation();


--
-- Name: customer_receivable_document_states customer_receivable_document_states_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_receivable_document_states_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_receivable_document_states FOR EACH ROW EXECUTE FUNCTION public.receivable_prevent_state_mutation();


--
-- Name: customer_receivable_documents customer_receivable_documents_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_receivable_documents_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_receivable_documents FOR EACH ROW EXECUTE FUNCTION public.receivable_prevent_document_mutation();


--
-- Name: customer_settlement_allocations customer_settlement_allocations_prevent_receivable_relink_trigg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_settlement_allocations_prevent_receivable_relink_trigg BEFORE UPDATE OF "customerReceivableDocumentId" ON public.customer_settlement_allocations FOR EACH ROW EXECUTE FUNCTION public.receivable_prevent_allocation_relink();


--
-- Name: customer_statement_access_logs customer_statement_access_logs_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_access_logs_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_statement_access_logs FOR EACH ROW EXECUTE FUNCTION public.customer_statement_append_only_guard();


--
-- Name: customer_statement_access_tokens customer_statement_access_tokens_guard_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_access_tokens_guard_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_statement_access_tokens FOR EACH ROW EXECUTE FUNCTION public.customer_statement_access_tokens_guard_mutation();


--
-- Name: customer_statement_deliveries customer_statement_deliveries_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_deliveries_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_statement_deliveries FOR EACH ROW EXECUTE FUNCTION public.customer_statement_delivery_referral_append_only_guard();


--
-- Name: customer_statement_delivery_states customer_statement_delivery_states_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_delivery_states_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_statement_delivery_states FOR EACH ROW EXECUTE FUNCTION public.customer_statement_delivery_referral_append_only_guard();


--
-- Name: customer_statement_recipient_action_states customer_statement_recipient_action_states_prevent_mutation_tri; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_recipient_action_states_prevent_mutation_tri BEFORE DELETE OR UPDATE ON public.customer_statement_recipient_action_states FOR EACH ROW EXECUTE FUNCTION public.customer_statement_append_only_guard();


--
-- Name: customer_statement_recipient_actions customer_statement_recipient_actions_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_recipient_actions_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_statement_recipient_actions FOR EACH ROW EXECUTE FUNCTION public.customer_statement_append_only_guard();


--
-- Name: customer_statement_snapshots customer_statement_snapshots_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_statement_snapshots_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.customer_statement_snapshots FOR EACH ROW EXECUTE FUNCTION public.customer_statement_snapshots_prevent_mutation();


--
-- Name: provider_events payment_reconciliation_provider_events_prevent_evidence_mutatio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payment_reconciliation_provider_events_prevent_evidence_mutatio BEFORE DELETE OR UPDATE ON public.provider_events FOR EACH ROW EXECUTE FUNCTION public.payment_reconciliation_provider_events_prevent_evidence_mutatio();


--
-- Name: statement_files payment_reconciliation_statement_files_prevent_evidence_mutatio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payment_reconciliation_statement_files_prevent_evidence_mutatio BEFORE DELETE OR UPDATE ON public.statement_files FOR EACH ROW EXECUTE FUNCTION public.payment_reconciliation_statement_files_prevent_evidence_mutatio();


--
-- Name: statement_lines payment_reconciliation_statement_lines_prevent_evidence_mutatio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payment_reconciliation_statement_lines_prevent_evidence_mutatio BEFORE DELETE OR UPDATE ON public.statement_lines FOR EACH ROW EXECUTE FUNCTION public.payment_reconciliation_statement_lines_prevent_evidence_mutatio();


--
-- Name: payment_transactions payment_transactions_enforce_authority_event_scope_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payment_transactions_enforce_authority_event_scope_trigger BEFORE INSERT OR UPDATE OF "providerAuthorityEventId", "organizationId", "providerAccountId", "providerTransactionId" ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.payment_transactions_enforce_authority_event_scope();


--
-- Name: payroll_declaration_evidence payroll_declaration_evidence_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_declaration_evidence_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.payroll_declaration_evidence FOR EACH ROW EXECUTE FUNCTION public.payroll_declaration_evidence_prevent_mutation();


--
-- Name: payroll_declarations payroll_declarations_prevent_payload_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_declarations_prevent_payload_mutation_trigger BEFORE DELETE OR UPDATE ON public.payroll_declarations FOR EACH ROW EXECUTE FUNCTION public.payroll_declarations_prevent_payload_mutation();


--
-- Name: payroll_employee_balance_events payroll_employee_balance_events_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_employee_balance_events_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.payroll_employee_balance_events FOR EACH ROW EXECUTE FUNCTION public.payroll_employee_balance_events_prevent_mutation();


--
-- Name: payroll_payment_allocations payroll_payment_allocations_prevent_released_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_payment_allocations_prevent_released_mutation_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.payroll_payment_allocations FOR EACH ROW EXECUTE FUNCTION public.payroll_payment_allocations_prevent_released_mutation();


--
-- Name: payroll_payment_batches payroll_payment_batches_prevent_released_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_payment_batches_prevent_released_mutation_trigger BEFORE DELETE OR UPDATE ON public.payroll_payment_batches FOR EACH ROW EXECUTE FUNCTION public.payroll_payment_batches_prevent_released_mutation();


--
-- Name: payroll_payslip_lines payroll_payslip_lines_prevent_emitted_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_payslip_lines_prevent_emitted_mutation_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.payroll_payslip_lines FOR EACH ROW EXECUTE FUNCTION public.payroll_payslip_lines_prevent_emitted_mutation();


--
-- Name: payroll_payslips payroll_payslips_prevent_emitted_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_payslips_prevent_emitted_mutation_trigger BEFORE DELETE OR UPDATE ON public.payroll_payslips FOR EACH ROW EXECUTE FUNCTION public.payroll_payslips_prevent_emitted_mutation();


--
-- Name: payroll_run_lines payroll_run_lines_prevent_posted_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_run_lines_prevent_posted_mutation_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.payroll_run_lines FOR EACH ROW EXECUTE FUNCTION public.payroll_run_lines_prevent_posted_mutation();


--
-- Name: payroll_run_transitions payroll_run_transitions_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_run_transitions_append_only BEFORE DELETE OR UPDATE ON public.payroll_run_transitions FOR EACH ROW EXECUTE FUNCTION public.payroll_run_transition_prevent_mutation();


--
-- Name: payroll_run_transitions payroll_run_transitions_validate_runtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_run_transitions_validate_runtime BEFORE INSERT ON public.payroll_run_transitions FOR EACH ROW EXECUTE FUNCTION public.payroll_run_transition_validate_runtime();


--
-- Name: payroll_runs payroll_runs_prevent_finalized_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_runs_prevent_finalized_mutation_trigger BEFORE DELETE OR UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.payroll_runs_prevent_finalized_mutation();


--
-- Name: pos_commit_results pos_commit_results_enforce_lifecycle_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pos_commit_results_enforce_lifecycle_trigger BEFORE DELETE OR UPDATE ON public.pos_commit_results FOR EACH ROW EXECUTE FUNCTION public.pos_commit_results_enforce_lifecycle();


--
-- Name: pos_commit_results pos_commit_results_enforce_scope_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pos_commit_results_enforce_scope_trigger BEFORE INSERT ON public.pos_commit_results FOR EACH ROW EXECUTE FUNCTION public.pos_commit_results_enforce_scope();


--
-- Name: purchase_return_lines purchase_return_lines_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_return_lines_append_only BEFORE DELETE OR UPDATE ON public.purchase_return_lines FOR EACH ROW EXECUTE FUNCTION public.purchasing_correction_evidence_append_only();


--
-- Name: purchase_return_lines purchase_return_lines_validate_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_return_lines_validate_source BEFORE INSERT ON public.purchase_return_lines FOR EACH ROW EXECUTE FUNCTION public.purchasing_validate_return_line();


--
-- Name: purchase_returns purchase_returns_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_returns_append_only BEFORE DELETE OR UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.purchasing_correction_evidence_append_only();


--
-- Name: purchase_returns purchase_returns_validate_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_returns_validate_source BEFORE INSERT ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.purchasing_validate_return_header();


--
-- Name: referral_attribution_events referral_attribution_events_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER referral_attribution_events_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.referral_attribution_events FOR EACH ROW EXECUTE FUNCTION public.customer_statement_delivery_referral_append_only_guard();


--
-- Name: referral_attributions referral_attributions_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER referral_attributions_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.referral_attributions FOR EACH ROW EXECUTE FUNCTION public.customer_statement_delivery_referral_append_only_guard();


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_credit_note_lines_append_only BEFORE DELETE OR UPDATE ON public.supplier_credit_note_lines FOR EACH ROW EXECUTE FUNCTION public.purchasing_correction_evidence_append_only();


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_validate_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_credit_note_lines_validate_source BEFORE INSERT ON public.supplier_credit_note_lines FOR EACH ROW EXECUTE FUNCTION public.purchasing_validate_credit_line();


--
-- Name: supplier_credit_notes supplier_credit_notes_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_credit_notes_append_only BEFORE DELETE OR UPDATE ON public.supplier_credit_notes FOR EACH ROW EXECUTE FUNCTION public.purchasing_correction_evidence_append_only();


--
-- Name: supplier_credit_notes supplier_credit_notes_validate_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_credit_notes_validate_source BEFORE INSERT ON public.supplier_credit_notes FOR EACH ROW EXECUTE FUNCTION public.purchasing_validate_credit_header();


--
-- Name: supplier_invoice_match_exceptions supplier_invoice_match_exceptions_lifecycle_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_invoice_match_exceptions_lifecycle_only BEFORE DELETE OR UPDATE ON public.supplier_invoice_match_exceptions FOR EACH ROW EXECUTE FUNCTION public.purchasing_match_exception_lifecycle_only();


--
-- Name: supplier_invoice_match_exceptions supplier_invoice_match_exceptions_validate_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_invoice_match_exceptions_validate_insert BEFORE INSERT ON public.supplier_invoice_match_exceptions FOR EACH ROW EXECUTE FUNCTION public.purchasing_validate_match_exception_insert();


--
-- Name: supplier_po_access_logs supplier_po_access_logs_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_po_access_logs_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.supplier_po_access_logs FOR EACH ROW EXECUTE FUNCTION public.supplier_po_append_only_guard();


--
-- Name: supplier_po_access_tokens supplier_po_access_tokens_guard_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_po_access_tokens_guard_mutation_trigger BEFORE DELETE OR UPDATE ON public.supplier_po_access_tokens FOR EACH ROW EXECUTE FUNCTION public.supplier_po_access_tokens_guard_mutation();


--
-- Name: supplier_po_envelopes supplier_po_envelopes_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_po_envelopes_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.supplier_po_envelopes FOR EACH ROW EXECUTE FUNCTION public.supplier_po_append_only_guard();


--
-- Name: supplier_po_proposal_lines supplier_po_proposal_lines_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_po_proposal_lines_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.supplier_po_proposal_lines FOR EACH ROW EXECUTE FUNCTION public.supplier_po_append_only_guard();


--
-- Name: supplier_po_proposal_states supplier_po_proposal_states_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_po_proposal_states_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.supplier_po_proposal_states FOR EACH ROW EXECUTE FUNCTION public.supplier_po_append_only_guard();


--
-- Name: supplier_po_proposals supplier_po_proposals_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_po_proposals_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.supplier_po_proposals FOR EACH ROW EXECUTE FUNCTION public.supplier_po_append_only_guard();


--
-- Name: tenant_module_configuration_commands tenant_module_configuration_commands_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_module_configuration_commands_append_only BEFORE DELETE OR UPDATE ON public.tenant_module_configuration_commands FOR EACH ROW EXECUTE FUNCTION public.reject_tenant_module_command_mutation();


--
-- Name: tenant_module_lifecycle_events tenant_module_lifecycle_events_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_module_lifecycle_events_append_only BEFORE DELETE OR UPDATE ON public.tenant_module_lifecycle_events FOR EACH ROW EXECUTE FUNCTION public.reject_tenant_module_command_mutation();


--
-- Name: workflow_assurance_check_findings workflow_assurance_check_findings_prevent_mutation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workflow_assurance_check_findings_prevent_mutation_trigger BEFORE DELETE OR UPDATE ON public.workflow_assurance_check_findings FOR EACH ROW EXECUTE FUNCTION public.workflow_assurance_check_findings_prevent_mutation();


--
-- Name: _UserRoles _UserRoles_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_UserRoles"
    ADD CONSTRAINT "_UserRoles_A_fkey" FOREIGN KEY ("A") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserRoles _UserRoles_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_UserRoles"
    ADD CONSTRAINT "_UserRoles_B_fkey" FOREIGN KEY ("B") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_access_grants accountant_access_grants_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_access_grants
    ADD CONSTRAINT "accountant_access_grants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_client_invite_states accountant_client_invite_states_inviteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invite_states
    ADD CONSTRAINT "accountant_client_invite_states_inviteId_fkey" FOREIGN KEY ("organizationId", "inviteId") REFERENCES public.accountant_client_invites("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accountant_client_invite_states accountant_client_invite_states_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invite_states
    ADD CONSTRAINT "accountant_client_invite_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accountant_client_invites accountant_client_invites_attributionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invites
    ADD CONSTRAINT "accountant_client_invites_attributionId_fkey" FOREIGN KEY ("organizationId", "attributionId") REFERENCES public.referral_attributions("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accountant_client_invites accountant_client_invites_businessEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invites
    ADD CONSTRAINT "accountant_client_invites_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES public.business_events(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accountant_client_invites accountant_client_invites_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invites
    ADD CONSTRAINT "accountant_client_invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accountant_client_invites accountant_client_invites_outboxId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_client_invites
    ADD CONSTRAINT "accountant_client_invites_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES public.business_event_outbox(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accountant_comments accountant_comments_closeRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT "accountant_comments_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES public.close_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_comments accountant_comments_evidenceItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT "accountant_comments_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES public.close_evidence_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accountant_comments accountant_comments_findingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT "accountant_comments_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES public.close_assurance_findings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accountant_comments accountant_comments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT "accountant_comments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_comments accountant_comments_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT "accountant_comments_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_comments accountant_comments_reviewId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_comments
    ADD CONSTRAINT "accountant_comments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES public.accountant_reviews(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accountant_reviews accountant_reviews_closeRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_reviews
    ADD CONSTRAINT "accountant_reviews_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES public.close_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_reviews accountant_reviews_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_reviews
    ADD CONSTRAINT "accountant_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accountant_reviews accountant_reviews_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_reviews
    ADD CONSTRAINT "accountant_reviews_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounting_periods accounting_periods_fiscalYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT "accounting_periods_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounting_periods accounting_periods_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT "accounting_periods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounting_source_links accounting_source_links_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_source_links
    ADD CONSTRAINT "accounting_source_links_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounting_source_links accounting_source_links_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_source_links
    ADD CONSTRAINT "accounting_source_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounting_source_links accounting_source_links_postingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_source_links
    ADD CONSTRAINT "accounting_source_links_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_activation_approvals agent_activation_approvals_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activation_approvals
    ADD CONSTRAINT "agent_activation_approvals_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public.agent_activation_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_activation_owners agent_activation_owners_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activation_owners
    ADD CONSTRAINT "agent_activation_owners_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public.agent_activation_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_activation_packages agent_activation_packages_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activation_packages
    ADD CONSTRAINT "agent_activation_packages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_cost_ledger agent_cost_ledger_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_cost_ledger
    ADD CONSTRAINT "agent_cost_ledger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_cost_ledger agent_cost_ledger_runId_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_cost_ledger
    ADD CONSTRAINT "agent_cost_ledger_runId_organizationId_fkey" FOREIGN KEY ("runId", "organizationId") REFERENCES public.agent_runs(id, "organizationId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_evidence_links agent_evidence_links_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_evidence_links
    ADD CONSTRAINT "agent_evidence_links_runId_fkey" FOREIGN KEY ("runId") REFERENCES public.agent_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_evidence_links agent_evidence_links_stepId_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_evidence_links
    ADD CONSTRAINT "agent_evidence_links_stepId_runId_fkey" FOREIGN KEY ("stepId", "runId") REFERENCES public.agent_steps(id, "runId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_feedback agent_feedback_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_feedback
    ADD CONSTRAINT "agent_feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_feedback agent_feedback_runId_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_feedback
    ADD CONSTRAINT "agent_feedback_runId_organizationId_fkey" FOREIGN KEY ("runId", "organizationId") REFERENCES public.agent_runs(id, "organizationId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_pilot_certifications agent_pilot_certifications_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pilot_certifications
    ADD CONSTRAINT "agent_pilot_certifications_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public.agent_activation_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_policy_incidents agent_policy_incidents_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_policy_incidents
    ADD CONSTRAINT "agent_policy_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_policy_incidents agent_policy_incidents_runId_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_policy_incidents
    ADD CONSTRAINT "agent_policy_incidents_runId_organizationId_fkey" FOREIGN KEY ("runId", "organizationId") REFERENCES public.agent_runs(id, "organizationId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_runs agent_runs_agentDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT "agent_runs_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES public.agent_definitions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: agent_runs agent_runs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT "agent_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_steps agent_steps_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_steps
    ADD CONSTRAINT "agent_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES public.agent_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_action_proposals ai_action_proposals_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_proposals
    ADD CONSTRAINT "ai_action_proposals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_action_proposals ai_action_proposals_runId_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_proposals
    ADD CONSTRAINT "ai_action_proposals_runId_organizationId_fkey" FOREIGN KEY ("runId", "organizationId") REFERENCES public.agent_runs(id, "organizationId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: branch_daily_close_runs branch_daily_close_runs_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_runs
    ADD CONSTRAINT "branch_daily_close_runs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: branch_daily_close_runs branch_daily_close_runs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_runs
    ADD CONSTRAINT "branch_daily_close_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_daily_close_runs branch_daily_close_runs_startedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_runs
    ADD CONSTRAINT "branch_daily_close_runs_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: branch_daily_close_sign_offs branch_daily_close_sign_offs_invalidatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_sign_offs
    ADD CONSTRAINT "branch_daily_close_sign_offs_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: branch_daily_close_sign_offs branch_daily_close_sign_offs_organizationId_branchDailyCloseRun; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_sign_offs
    ADD CONSTRAINT "branch_daily_close_sign_offs_organizationId_branchDailyCloseRun" FOREIGN KEY ("organizationId", "branchDailyCloseRunId") REFERENCES public.branch_daily_close_runs("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: branch_daily_close_sign_offs branch_daily_close_sign_offs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_sign_offs
    ADD CONSTRAINT "branch_daily_close_sign_offs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: branch_daily_close_sign_offs branch_daily_close_sign_offs_organizationId_supersedesSignOffId; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_sign_offs
    ADD CONSTRAINT "branch_daily_close_sign_offs_organizationId_supersedesSignOffId" FOREIGN KEY ("organizationId", "supersedesSignOffId") REFERENCES public.branch_daily_close_sign_offs("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: branch_daily_close_sign_offs branch_daily_close_sign_offs_signedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_daily_close_sign_offs
    ADD CONSTRAINT "branch_daily_close_sign_offs_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: brands brands_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT "brands_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_event_anomalies business_event_anomalies_businessEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_anomalies
    ADD CONSTRAINT "business_event_anomalies_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES public.business_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_event_anomalies business_event_anomalies_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_anomalies
    ADD CONSTRAINT "business_event_anomalies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_event_audits business_event_audits_businessEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_audits
    ADD CONSTRAINT "business_event_audits_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES public.business_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_event_audits business_event_audits_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_audits
    ADD CONSTRAINT "business_event_audits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_event_outbox business_event_outbox_businessEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_outbox
    ADD CONSTRAINT "business_event_outbox_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES public.business_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_event_outbox business_event_outbox_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_event_outbox
    ADD CONSTRAINT "business_event_outbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_events business_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_events
    ADD CONSTRAINT "business_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cash_drawer_transactions cash_drawer_transactions_cashDrawerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawer_transactions
    ADD CONSTRAINT "cash_drawer_transactions_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES public.cash_drawers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_drawer_transactions cash_drawer_transactions_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawer_transactions
    ADD CONSTRAINT "cash_drawer_transactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.pos_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_drawer_transactions cash_drawer_transactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawer_transactions
    ADD CONSTRAINT "cash_drawer_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_drawers cash_drawers_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawers
    ADD CONSTRAINT "cash_drawers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_drawers cash_drawers_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_drawers
    ADD CONSTRAINT "cash_drawers_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_shortage_policies cash_shortage_policies_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shortage_policies
    ADD CONSTRAINT "cash_shortage_policies_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_shortage_policies cash_shortage_policies_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shortage_policies
    ADD CONSTRAINT "cash_shortage_policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_shortage_policies cash_shortage_policies_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shortage_policies
    ADD CONSTRAINT "cash_shortage_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chart_of_accounts chart_of_accounts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chart_of_accounts chart_of_accounts_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: close_assurance_findings close_assurance_findings_checklistItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_assurance_findings
    ADD CONSTRAINT "close_assurance_findings_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES public.close_checklist_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: close_assurance_findings close_assurance_findings_closeRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_assurance_findings
    ADD CONSTRAINT "close_assurance_findings_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES public.close_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_assurance_findings close_assurance_findings_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_assurance_findings
    ADD CONSTRAINT "close_assurance_findings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_assurance_findings close_assurance_findings_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_assurance_findings
    ADD CONSTRAINT "close_assurance_findings_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_checklist_items close_checklist_items_closeRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_checklist_items
    ADD CONSTRAINT "close_checklist_items_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES public.close_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_checklist_items close_checklist_items_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_checklist_items
    ADD CONSTRAINT "close_checklist_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_checklist_items close_checklist_items_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_checklist_items
    ADD CONSTRAINT "close_checklist_items_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_evidence_items close_evidence_items_checklistItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_evidence_items
    ADD CONSTRAINT "close_evidence_items_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES public.close_checklist_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: close_evidence_items close_evidence_items_closeRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_evidence_items
    ADD CONSTRAINT "close_evidence_items_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES public.close_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_evidence_items close_evidence_items_findingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_evidence_items
    ADD CONSTRAINT "close_evidence_items_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES public.close_assurance_findings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: close_evidence_items close_evidence_items_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_evidence_items
    ADD CONSTRAINT "close_evidence_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_evidence_items close_evidence_items_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_evidence_items
    ADD CONSTRAINT "close_evidence_items_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_pack_exports close_pack_exports_closeRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_pack_exports
    ADD CONSTRAINT "close_pack_exports_closeRunId_fkey" FOREIGN KEY ("closeRunId") REFERENCES public.close_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_pack_exports close_pack_exports_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_pack_exports
    ADD CONSTRAINT "close_pack_exports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_pack_exports close_pack_exports_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_pack_exports
    ADD CONSTRAINT "close_pack_exports_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_runs close_runs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_runs
    ADD CONSTRAINT "close_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: close_runs close_runs_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.close_runs
    ADD CONSTRAINT "close_runs_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: compliance_adapter_configs compliance_adapter_configs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_adapter_configs
    ADD CONSTRAINT "compliance_adapter_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compliance_evidence compliance_evidence_fiscalDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_evidence
    ADD CONSTRAINT "compliance_evidence_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES public.fiscal_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compliance_evidence compliance_evidence_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_evidence
    ADD CONSTRAINT "compliance_evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compliance_evidence compliance_evidence_submissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_evidence
    ADD CONSTRAINT "compliance_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public.compliance_submissions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compliance_submissions compliance_submissions_adapterConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT "compliance_submissions_adapterConfigId_fkey" FOREIGN KEY ("adapterConfigId") REFERENCES public.compliance_adapter_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compliance_submissions compliance_submissions_fiscalDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT "compliance_submissions_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES public.fiscal_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compliance_submissions compliance_submissions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_submissions
    ADD CONSTRAINT "compliance_submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_ledger_entries customer_ledger_entries_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger_entries
    ADD CONSTRAINT "customer_ledger_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_ledger_entries customer_ledger_entries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger_entries
    ADD CONSTRAINT "customer_ledger_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_locations customer_locations_customer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_customer_fkey FOREIGN KEY ("organizationId", "customerId") REFERENCES public.customers("organizationId", id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_locations customer_locations_location_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_location_fkey FOREIGN KEY ("organizationId", "locationId") REFERENCES public.locations("organizationId", id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_locations customer_locations_organization_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_organization_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_receivable_document_states customer_receivable_document_states_document_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_document_states
    ADD CONSTRAINT customer_receivable_document_states_document_fkey FOREIGN KEY ("organizationId", "documentId") REFERENCES public.customer_receivable_documents("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_receivable_document_states customer_receivable_document_states_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_document_states
    ADD CONSTRAINT "customer_receivable_document_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_receivable_documents customer_receivable_documents_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_documents
    ADD CONSTRAINT "customer_receivable_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_receivable_documents customer_receivable_documents_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_documents
    ADD CONSTRAINT "customer_receivable_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_receivable_documents customer_receivable_documents_sourceSalesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_documents
    ADD CONSTRAINT "customer_receivable_documents_sourceSalesOrderId_fkey" FOREIGN KEY ("sourceSalesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_receivable_documents customer_receivable_documents_supersedes_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_receivable_documents
    ADD CONSTRAINT customer_receivable_documents_supersedes_fkey FOREIGN KEY ("organizationId", "supersedesDocumentId") REFERENCES public.customer_receivable_documents("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_settlement_allocations customer_settlement_allocations_customerLedgerEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT "customer_settlement_allocations_customerLedgerEntryId_fkey" FOREIGN KEY ("customerLedgerEntryId") REFERENCES public.customer_ledger_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_settlement_allocations customer_settlement_allocations_customerSettlementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT "customer_settlement_allocations_customerSettlementId_fkey" FOREIGN KEY ("customerSettlementId") REFERENCES public.customer_settlements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_settlement_allocations customer_settlement_allocations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT "customer_settlement_allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_settlement_allocations customer_settlement_allocations_receivable_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT customer_settlement_allocations_receivable_fkey FOREIGN KEY ("organizationId", "customerReceivableDocumentId") REFERENCES public.customer_receivable_documents("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_settlement_allocations customer_settlement_allocations_reversalCustomerLedgerEntryId_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT "customer_settlement_allocations_reversalCustomerLedgerEntryId_f" FOREIGN KEY ("reversalCustomerLedgerEntryId") REFERENCES public.customer_ledger_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_settlement_allocations customer_settlement_allocations_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlement_allocations
    ADD CONSTRAINT "customer_settlement_allocations_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_settlements customer_settlements_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlements
    ADD CONSTRAINT "customer_settlements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_settlements customer_settlements_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_settlements
    ADD CONSTRAINT "customer_settlements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_statement_access_logs customer_statement_access_logs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_logs
    ADD CONSTRAINT "customer_statement_access_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_access_logs customer_statement_access_logs_statementSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_logs
    ADD CONSTRAINT "customer_statement_access_logs_statementSnapshotId_fkey" FOREIGN KEY ("organizationId", "statementSnapshotId") REFERENCES public.customer_statement_snapshots("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_access_logs customer_statement_access_logs_tokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_logs
    ADD CONSTRAINT "customer_statement_access_logs_tokenId_fkey" FOREIGN KEY ("organizationId", "tokenId") REFERENCES public.customer_statement_access_tokens("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_access_tokens customer_statement_access_tokens_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_tokens
    ADD CONSTRAINT "customer_statement_access_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_access_tokens customer_statement_access_tokens_referralAttributionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_tokens
    ADD CONSTRAINT "customer_statement_access_tokens_referralAttributionId_fkey" FOREIGN KEY ("organizationId", "referralAttributionId") REFERENCES public.referral_attributions("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_access_tokens customer_statement_access_tokens_statementSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_access_tokens
    ADD CONSTRAINT "customer_statement_access_tokens_statementSnapshotId_fkey" FOREIGN KEY ("organizationId", "statementSnapshotId") REFERENCES public.customer_statement_snapshots("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_deliveries customer_statement_deliveries_attributionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT "customer_statement_deliveries_attributionId_fkey" FOREIGN KEY ("organizationId", "attributionId") REFERENCES public.referral_attributions("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_deliveries customer_statement_deliveries_businessEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT "customer_statement_deliveries_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES public.business_events(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_deliveries customer_statement_deliveries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT "customer_statement_deliveries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_deliveries customer_statement_deliveries_outboxId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT "customer_statement_deliveries_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES public.business_event_outbox(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_deliveries customer_statement_deliveries_statementSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT "customer_statement_deliveries_statementSnapshotId_fkey" FOREIGN KEY ("organizationId", "statementSnapshotId") REFERENCES public.customer_statement_snapshots("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_deliveries customer_statement_deliveries_tokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_deliveries
    ADD CONSTRAINT "customer_statement_deliveries_tokenId_fkey" FOREIGN KEY ("organizationId", "tokenId") REFERENCES public.customer_statement_access_tokens("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_delivery_states customer_statement_delivery_states_deliveryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_delivery_states
    ADD CONSTRAINT "customer_statement_delivery_states_deliveryId_fkey" FOREIGN KEY ("organizationId", "deliveryId") REFERENCES public.customer_statement_deliveries("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_delivery_states customer_statement_delivery_states_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_delivery_states
    ADD CONSTRAINT "customer_statement_delivery_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_recipient_action_states customer_statement_recipient_action_states_actionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_action_states
    ADD CONSTRAINT "customer_statement_recipient_action_states_actionId_fkey" FOREIGN KEY ("organizationId", "actionId") REFERENCES public.customer_statement_recipient_actions("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_recipient_action_states customer_statement_recipient_action_states_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_action_states
    ADD CONSTRAINT "customer_statement_recipient_action_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_recipient_actions customer_statement_recipient_actions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_actions
    ADD CONSTRAINT "customer_statement_recipient_actions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_recipient_actions customer_statement_recipient_actions_receivableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_actions
    ADD CONSTRAINT "customer_statement_recipient_actions_receivableId_fkey" FOREIGN KEY ("organizationId", "customerReceivableDocumentId") REFERENCES public.customer_receivable_documents("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_recipient_actions customer_statement_recipient_actions_statementSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_actions
    ADD CONSTRAINT "customer_statement_recipient_actions_statementSnapshotId_fkey" FOREIGN KEY ("organizationId", "statementSnapshotId") REFERENCES public.customer_statement_snapshots("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_recipient_actions customer_statement_recipient_actions_tokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_recipient_actions
    ADD CONSTRAINT "customer_statement_recipient_actions_tokenId_fkey" FOREIGN KEY ("organizationId", "tokenId") REFERENCES public.customer_statement_access_tokens("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_snapshots customer_statement_snapshots_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_snapshots
    ADD CONSTRAINT "customer_statement_snapshots_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_snapshots customer_statement_snapshots_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_snapshots
    ADD CONSTRAINT "customer_statement_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_statement_snapshots customer_statement_snapshots_supersedesStatementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_statement_snapshots
    ADD CONSTRAINT "customer_statement_snapshots_supersedesStatementId_fkey" FOREIGN KEY ("organizationId", "supersedesStatementId") REFERENCES public.customer_statement_snapshots("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customers customers_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: daily_sales_report_cash_events daily_sales_report_cash_events_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_report_cash_events
    ADD CONSTRAINT "daily_sales_report_cash_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public.daily_sales_reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: daily_sales_report_items daily_sales_report_items_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_report_items
    ADD CONSTRAINT "daily_sales_report_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: daily_sales_report_items daily_sales_report_items_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_report_items
    ADD CONSTRAINT "daily_sales_report_items_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public.daily_sales_reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: daily_sales_reports daily_sales_reports_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_reports
    ADD CONSTRAINT "daily_sales_reports_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: daily_sales_reports daily_sales_reports_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_reports
    ADD CONSTRAINT "daily_sales_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: daily_sales_reports daily_sales_reports_reportGeneratedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_reports
    ADD CONSTRAINT "daily_sales_reports_reportGeneratedById_fkey" FOREIGN KEY ("reportGeneratedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: delivery_billing_lines delivery_billing_lines_billingOutcomeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_billing_lines
    ADD CONSTRAINT "delivery_billing_lines_billingOutcomeId_fkey" FOREIGN KEY ("billingOutcomeId") REFERENCES public.delivery_billing_outcomes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_billing_lines delivery_billing_lines_salesOrderLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_billing_lines
    ADD CONSTRAINT "delivery_billing_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES public.sales_order_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_billing_outcomes delivery_billing_outcomes_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_billing_outcomes
    ADD CONSTRAINT "delivery_billing_outcomes_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_goods_issue_lines delivery_goods_issue_lines_goodsIssueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_goods_issue_lines
    ADD CONSTRAINT "delivery_goods_issue_lines_goodsIssueId_fkey" FOREIGN KEY ("goodsIssueId") REFERENCES public.delivery_goods_issues(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_goods_issue_lines delivery_goods_issue_lines_salesOrderLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_goods_issue_lines
    ADD CONSTRAINT "delivery_goods_issue_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES public.sales_order_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_goods_issues delivery_goods_issues_reversalOfGoodsIssueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_goods_issues
    ADD CONSTRAINT "delivery_goods_issues_reversalOfGoodsIssueId_fkey" FOREIGN KEY ("reversalOfGoodsIssueId") REFERENCES public.delivery_goods_issues(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_goods_issues delivery_goods_issues_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_goods_issues
    ADD CONSTRAINT "delivery_goods_issues_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_reservation_lines delivery_reservation_lines_reservationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reservation_lines
    ADD CONSTRAINT "delivery_reservation_lines_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES public.delivery_reservations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_reservation_lines delivery_reservation_lines_salesOrderLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reservation_lines
    ADD CONSTRAINT "delivery_reservation_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES public.sales_order_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_reservations delivery_reservations_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reservations
    ADD CONSTRAINT "delivery_reservations_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_sequences document_sequences_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_sequences
    ADD CONSTRAINT "document_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_categories expense_categories_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "expense_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fiscal_document_lines fiscal_document_lines_fiscalDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_document_lines
    ADD CONSTRAINT "fiscal_document_lines_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES public.fiscal_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_document_lines fiscal_document_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_document_lines
    ADD CONSTRAINT "fiscal_document_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_documents fiscal_documents_accountingSourceLinkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT "fiscal_documents_accountingSourceLinkId_fkey" FOREIGN KEY ("accountingSourceLinkId") REFERENCES public.accounting_source_links(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_documents fiscal_documents_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT "fiscal_documents_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_documents fiscal_documents_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT "fiscal_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_documents fiscal_documents_originalFiscalDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT "fiscal_documents_originalFiscalDocumentId_fkey" FOREIGN KEY ("originalFiscalDocumentId") REFERENCES public.fiscal_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_documents fiscal_documents_postingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT "fiscal_documents_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_documents fiscal_documents_sequenceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_documents
    ADD CONSTRAINT "fiscal_documents_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES public.fiscal_sequences(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_sequences fiscal_sequences_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_sequences
    ADD CONSTRAINT "fiscal_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fiscal_years fiscal_years_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT "fiscal_years_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: goods_receipt_inspection_resolutions goods_receipt_inspection_resolutions_goodsReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspection_resolutions
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_inspection_resolutions goods_receipt_inspection_resolutions_inspectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspection_resolutions
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES public.goods_receipt_inspections(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_inspection_resolutions goods_receipt_inspection_resolutions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspection_resolutions
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_inspection_resolutions goods_receipt_inspection_resolutions_resolvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspection_resolutions
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_inspections goods_receipt_inspections_goodsReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspections
    ADD CONSTRAINT "goods_receipt_inspections_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_inspections goods_receipt_inspections_inspectedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspections
    ADD CONSTRAINT "goods_receipt_inspections_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_inspections goods_receipt_inspections_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_inspections
    ADD CONSTRAINT "goods_receipt_inspections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_lines goods_receipt_lines_goodsReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT "goods_receipt_lines_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: goods_receipt_lines goods_receipt_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT "goods_receipt_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_lines goods_receipt_lines_purchaseOrderLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT "goods_receipt_lines_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES public.purchase_order_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_receivedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hris_attendance_anomalies hris_attendance_anomalies_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_attendance_anomalies
    ADD CONSTRAINT "hris_attendance_anomalies_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hris_attendance_anomalies hris_attendance_anomalies_importBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_attendance_anomalies
    ADD CONSTRAINT "hris_attendance_anomalies_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES public.hris_time_import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_attendance_anomalies hris_attendance_anomalies_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_attendance_anomalies
    ADD CONSTRAINT "hris_attendance_anomalies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_attendance_anomalies hris_attendance_anomalies_timeEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_attendance_anomalies
    ADD CONSTRAINT "hris_attendance_anomalies_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES public.hris_time_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hris_employment_assignments hris_employment_assignments_organizationId_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_employment_assignments
    ADD CONSTRAINT "hris_employment_assignments_organizationId_employeeId_fkey" FOREIGN KEY ("organizationId", "employeeId") REFERENCES public.payroll_employees("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_employment_assignments hris_employment_assignments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_employment_assignments
    ADD CONSTRAINT "hris_employment_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_employment_assignments hris_employment_assignments_organizationId_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_employment_assignments
    ADD CONSTRAINT "hris_employment_assignments_organizationId_orgUnitId_fkey" FOREIGN KEY ("organizationId", "orgUnitId") REFERENCES public.hris_org_units("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_employment_assignments hris_employment_assignments_organizationId_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_employment_assignments
    ADD CONSTRAINT "hris_employment_assignments_organizationId_positionId_fkey" FOREIGN KEY ("organizationId", "positionId") REFERENCES public.hris_positions("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_leave_balance_entries hris_leave_balance_entries_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_leave_balance_entries
    ADD CONSTRAINT "hris_leave_balance_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_leave_balance_entries hris_leave_balance_entries_leavePolicyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_leave_balance_entries
    ADD CONSTRAINT "hris_leave_balance_entries_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES public.hris_leave_policies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_leave_balance_entries hris_leave_balance_entries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_leave_balance_entries
    ADD CONSTRAINT "hris_leave_balance_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_leave_policies hris_leave_policies_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_leave_policies
    ADD CONSTRAINT "hris_leave_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_manager_delegations hris_manager_delegations_organizationId_delegateEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_manager_delegations
    ADD CONSTRAINT "hris_manager_delegations_organizationId_delegateEmployeeId_fkey" FOREIGN KEY ("organizationId", "delegateEmployeeId") REFERENCES public.payroll_employees("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_manager_delegations hris_manager_delegations_organizationId_delegatorEmployeeId_fke; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_manager_delegations
    ADD CONSTRAINT "hris_manager_delegations_organizationId_delegatorEmployeeId_fke" FOREIGN KEY ("organizationId", "delegatorEmployeeId") REFERENCES public.payroll_employees("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_manager_delegations hris_manager_delegations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_manager_delegations
    ADD CONSTRAINT "hris_manager_delegations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_manager_delegations hris_manager_delegations_organizationId_scopeOrgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_manager_delegations
    ADD CONSTRAINT "hris_manager_delegations_organizationId_scopeOrgUnitId_fkey" FOREIGN KEY ("organizationId", "scopeOrgUnitId") REFERENCES public.hris_org_units("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_manager_delegations hris_manager_delegations_organizationId_supersedesDelegationId_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_manager_delegations
    ADD CONSTRAINT "hris_manager_delegations_organizationId_supersedesDelegationId_" FOREIGN KEY ("organizationId", "supersedesDelegationId") REFERENCES public.hris_manager_delegations("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_org_units hris_org_units_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_org_units
    ADD CONSTRAINT "hris_org_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_org_units hris_org_units_organizationId_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_org_units
    ADD CONSTRAINT "hris_org_units_organizationId_parentId_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES public.hris_org_units("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_positions hris_positions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_positions
    ADD CONSTRAINT "hris_positions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_positions hris_positions_organizationId_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_positions
    ADD CONSTRAINT "hris_positions_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES public.locations("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_positions hris_positions_organizationId_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_positions
    ADD CONSTRAINT "hris_positions_organizationId_orgUnitId_fkey" FOREIGN KEY ("organizationId", "orgUnitId") REFERENCES public.hris_org_units("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_public_holidays hris_public_holidays_calendarId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_public_holidays
    ADD CONSTRAINT "hris_public_holidays_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES public.hris_work_calendars(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_public_holidays hris_public_holidays_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_public_holidays
    ADD CONSTRAINT "hris_public_holidays_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_reporting_relationships hris_reporting_relationships_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT "hris_reporting_relationships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_reporting_relationships hris_reporting_relationships_organizationId_managerAssignmentId; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT "hris_reporting_relationships_organizationId_managerAssignmentId" FOREIGN KEY ("organizationId", "managerAssignmentId") REFERENCES public.hris_employment_assignments("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_reporting_relationships hris_reporting_relationships_organizationId_managerEmployeeId_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT "hris_reporting_relationships_organizationId_managerEmployeeId_f" FOREIGN KEY ("organizationId", "managerEmployeeId") REFERENCES public.payroll_employees("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_reporting_relationships hris_reporting_relationships_organizationId_reportAssignmentId_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT "hris_reporting_relationships_organizationId_reportAssignmentId_" FOREIGN KEY ("organizationId", "reportAssignmentId") REFERENCES public.hris_employment_assignments("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_reporting_relationships hris_reporting_relationships_organizationId_reportEmployeeId_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT "hris_reporting_relationships_organizationId_reportEmployeeId_fk" FOREIGN KEY ("organizationId", "reportEmployeeId") REFERENCES public.payroll_employees("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_reporting_relationships hris_reporting_relationships_organizationId_supersedesRelations; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_reporting_relationships
    ADD CONSTRAINT "hris_reporting_relationships_organizationId_supersedesRelations" FOREIGN KEY ("organizationId", "supersedesRelationshipId") REFERENCES public.hris_reporting_relationships("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_time_entries hris_time_entries_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_entries
    ADD CONSTRAINT "hris_time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_time_entries hris_time_entries_importBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_entries
    ADD CONSTRAINT "hris_time_entries_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES public.hris_time_import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_time_entries hris_time_entries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_entries
    ADD CONSTRAINT "hris_time_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_time_import_batches hris_time_import_batches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_import_batches
    ADD CONSTRAINT "hris_time_import_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_time_requests hris_time_requests_decision_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_requests
    ADD CONSTRAINT hris_time_requests_decision_event_tenant_fkey FOREIGN KEY ("organizationId", "decisionBusinessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_time_requests hris_time_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_requests
    ADD CONSTRAINT "hris_time_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_time_requests hris_time_requests_leavePolicyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_requests
    ADD CONSTRAINT "hris_time_requests_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES public.hris_leave_policies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_time_requests hris_time_requests_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_time_requests
    ADD CONSTRAINT "hris_time_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_work_calendars hris_work_calendars_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_work_calendars
    ADD CONSTRAINT "hris_work_calendars_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: hris_work_schedules hris_work_schedules_calendarId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_work_schedules
    ADD CONSTRAINT "hris_work_schedules_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES public.hris_work_calendars(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_work_schedules hris_work_schedules_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_work_schedules
    ADD CONSTRAINT "hris_work_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hris_work_schedules hris_work_schedules_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hris_work_schedules
    ADD CONSTRAINT "hris_work_schedules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventory_levels inventory_levels_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_levels
    ADD CONSTRAINT "inventory_levels_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventory_levels inventory_levels_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_levels
    ADD CONSTRAINT "inventory_levels_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT "inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory_transactions inventory_transactions_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT "inventory_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory_transactions inventory_transactions_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT "inventory_transactions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory_transactions inventory_transactions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT "inventory_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory_transactions inventory_transactions_reversalOfTransactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT "inventory_transactions_reversalOfTransactionId_fkey" FOREIGN KEY ("reversalOfTransactionId") REFERENCES public.inventory_transactions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invites invites_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT "invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invites invites_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT "invites_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: item_suppliers item_suppliers_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT "item_suppliers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: item_suppliers item_suppliers_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT "item_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: items items_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT "items_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: items items_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: items items_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT "items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: items items_taxRateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT "items_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES public.tax_rates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: items items_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT "items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_journalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES public.journals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_entries journal_entries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_entries journal_entries_postingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_reversalOfEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_reversalOfEntryId_fkey" FOREIGN KEY ("reversalOfEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entry_lines journal_entry_lines_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT "journal_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_entry_lines journal_entry_lines_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT "journal_entry_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journal_entry_lines journal_entry_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT "journal_entry_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journals journals_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journals
    ADD CONSTRAINT "journals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ledger_audit_events ledger_audit_events_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_audit_events
    ADD CONSTRAINT "ledger_audit_events_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ledger_audit_events ledger_audit_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_audit_events
    ADD CONSTRAINT "ledger_audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ledger_audit_events ledger_audit_events_postingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_audit_events
    ADD CONSTRAINT "ledger_audit_events_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ledger_posting_batches ledger_posting_batches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_batches
    ADD CONSTRAINT "ledger_posting_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ledger_posting_batches ledger_posting_batches_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_posting_batches
    ADD CONSTRAINT "ledger_posting_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: locations locations_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "locations_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: locations locations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_records match_records_ledgerPostingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_ledgerPostingBatchId_fkey" FOREIGN KEY ("ledgerPostingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_records match_records_matchedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_matchedById_fkey" FOREIGN KEY ("matchedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_records match_records_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_records match_records_paymentTransactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_records match_records_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_records match_records_providerEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES public.provider_events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_records match_records_reconciliationRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES public.reconciliation_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_records match_records_statementLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_records
    ADD CONSTRAINT "match_records_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES public.statement_lines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_module_lifecycle_operations module_lifecycle_command_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_operations
    ADD CONSTRAINT module_lifecycle_command_fk FOREIGN KEY ("organizationId", "commandId") REFERENCES public.tenant_module_configuration_commands("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_lifecycle_operations module_lifecycle_configuration_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_operations
    ADD CONSTRAINT module_lifecycle_configuration_fk FOREIGN KEY ("organizationId") REFERENCES public.tenant_module_configurations("organizationId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_lifecycle_events module_lifecycle_event_operation_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_events
    ADD CONSTRAINT module_lifecycle_event_operation_fk FOREIGN KEY ("organizationId", "operationId") REFERENCES public.tenant_module_lifecycle_operations("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_lifecycle_steps module_lifecycle_step_operation_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_lifecycle_steps
    ADD CONSTRAINT module_lifecycle_step_operation_fk FOREIGN KEY ("organizationId", "operationId") REFERENCES public.tenant_module_lifecycle_operations("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: onboarding_import_batches onboarding_import_batches_mapping_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_batches
    ADD CONSTRAINT onboarding_import_batches_mapping_fkey FOREIGN KEY ("mappingId") REFERENCES public.onboarding_import_mappings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: onboarding_import_batches onboarding_import_batches_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_batches
    ADD CONSTRAINT onboarding_import_batches_org_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_import_issues onboarding_import_issues_batch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_issues
    ADD CONSTRAINT onboarding_import_issues_batch_fkey FOREIGN KEY ("batchId") REFERENCES public.onboarding_import_batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_import_issues onboarding_import_issues_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_issues
    ADD CONSTRAINT onboarding_import_issues_org_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_import_issues onboarding_import_issues_row_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_issues
    ADD CONSTRAINT onboarding_import_issues_row_fkey FOREIGN KEY ("rowId") REFERENCES public.onboarding_import_rows(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_import_mappings onboarding_import_mappings_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_mappings
    ADD CONSTRAINT onboarding_import_mappings_org_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_import_rows onboarding_import_rows_batch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_rows
    ADD CONSTRAINT onboarding_import_rows_batch_fkey FOREIGN KEY ("batchId") REFERENCES public.onboarding_import_batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_import_rows onboarding_import_rows_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_import_rows
    ADD CONSTRAINT onboarding_import_rows_org_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_readiness_milestones onboarding_readiness_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_readiness_milestones
    ADD CONSTRAINT onboarding_readiness_org_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: organization_accounting_settings organization_accounting_settings_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_accounting_settings
    ADD CONSTRAINT "organization_accounting_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_history password_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_exceptions payment_exceptions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_exceptions payment_exceptions_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_exceptions payment_exceptions_paymentTransactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_exceptions payment_exceptions_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_exceptions payment_exceptions_providerEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES public.provider_events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_exceptions payment_exceptions_reconciliationRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES public.reconciliation_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_exceptions payment_exceptions_statementLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES public.statement_lines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_exceptions payment_exceptions_suspenseItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_exceptions
    ADD CONSTRAINT "payment_exceptions_suspenseItemId_fkey" FOREIGN KEY ("suspenseItemId") REFERENCES public.suspense_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_rails payment_rails_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_rails
    ADD CONSTRAINT "payment_rails_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_reconciliation_inbox_items payment_reconciliation_inbox_items_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_inbox_items
    ADD CONSTRAINT "payment_reconciliation_inbox_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_reconciliation_inbox_items payment_reconciliation_inbox_items_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reconciliation_inbox_items
    ADD CONSTRAINT "payment_reconciliation_inbox_items_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_refunds payment_refunds_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT "payment_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_refunds payment_refunds_processedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT "payment_refunds_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_ledgerPostingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_ledgerPostingBatchId_fkey" FOREIGN KEY ("ledgerPostingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_legacyPaymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_legacyPaymentId_fkey" FOREIGN KEY ("legacyPaymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_organizationId_providerAuthorityEventId_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_organizationId_providerAuthorityEventId_fk" FOREIGN KEY ("organizationId", "providerAuthorityEventId") REFERENCES public.provider_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_transactions payment_transactions_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "payment_transactions_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_processedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_attendance_snapshots payroll_attendance_snapshots_correctedFromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_attendance_snapshots
    ADD CONSTRAINT "payroll_attendance_snapshots_correctedFromId_fkey" FOREIGN KEY ("correctedFromId") REFERENCES public.payroll_attendance_snapshots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_attendance_snapshots payroll_attendance_snapshots_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_attendance_snapshots
    ADD CONSTRAINT "payroll_attendance_snapshots_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_attendance_snapshots payroll_attendance_snapshots_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_attendance_snapshots
    ADD CONSTRAINT "payroll_attendance_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_attendance_snapshots payroll_attendance_snapshots_payrollPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_attendance_snapshots
    ADD CONSTRAINT "payroll_attendance_snapshots_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES public.payroll_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_contracts payroll_contracts_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_contracts
    ADD CONSTRAINT "payroll_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_contracts payroll_contracts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_contracts
    ADD CONSTRAINT "payroll_contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_declaration_evidence payroll_declaration_evidence_declarationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_declaration_evidence
    ADD CONSTRAINT "payroll_declaration_evidence_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES public.payroll_declarations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_declaration_evidence payroll_declaration_evidence_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_declaration_evidence
    ADD CONSTRAINT "payroll_declaration_evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_declarations payroll_declarations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_declarations
    ADD CONSTRAINT "payroll_declarations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_declarations payroll_declarations_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_declarations
    ADD CONSTRAINT "payroll_declarations_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public.payroll_runs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_employee_balance_cases payroll_employee_balance_cases_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_cases
    ADD CONSTRAINT "payroll_employee_balance_cases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_employee_balance_cases payroll_employee_balance_cases_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_cases
    ADD CONSTRAINT "payroll_employee_balance_cases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_employee_balance_cases payroll_employee_balance_cases_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_cases
    ADD CONSTRAINT "payroll_employee_balance_cases_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public.payroll_runs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_employee_balance_cases payroll_employee_balance_cases_payslipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_cases
    ADD CONSTRAINT "payroll_employee_balance_cases_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES public.payroll_payslips(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_employee_balance_events payroll_employee_balance_events_balanceCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_events
    ADD CONSTRAINT "payroll_employee_balance_events_balanceCaseId_fkey" FOREIGN KEY ("balanceCaseId") REFERENCES public.payroll_employee_balance_cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_employee_balance_events payroll_employee_balance_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_balance_events
    ADD CONSTRAINT "payroll_employee_balance_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_employee_rubrique_assignments payroll_employee_rubrique_assignments_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_rubrique_assignments
    ADD CONSTRAINT "payroll_employee_rubrique_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_employee_rubrique_assignments payroll_employee_rubrique_assignments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_rubrique_assignments
    ADD CONSTRAINT "payroll_employee_rubrique_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_employee_rubrique_assignments payroll_employee_rubrique_assignments_rubriqueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employee_rubrique_assignments
    ADD CONSTRAINT "payroll_employee_rubrique_assignments_rubriqueId_fkey" FOREIGN KEY ("rubriqueId") REFERENCES public.payroll_rubriques(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_employees payroll_employees_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_employees
    ADD CONSTRAINT "payroll_employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payment_allocations payroll_payment_allocations_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_allocations
    ADD CONSTRAINT "payroll_payment_allocations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payment_allocations payroll_payment_allocations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_allocations
    ADD CONSTRAINT "payroll_payment_allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payment_allocations payroll_payment_allocations_payrollPaymentBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_allocations
    ADD CONSTRAINT "payroll_payment_allocations_payrollPaymentBatchId_fkey" FOREIGN KEY ("payrollPaymentBatchId") REFERENCES public.payroll_payment_batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payment_allocations payroll_payment_allocations_payslipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_allocations
    ADD CONSTRAINT "payroll_payment_allocations_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES public.payroll_payslips(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payment_batches payroll_payment_batches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_batches
    ADD CONSTRAINT "payroll_payment_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payment_batches payroll_payment_batches_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_batches
    ADD CONSTRAINT "payroll_payment_batches_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public.payroll_runs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payment_destination_change_requests payroll_payment_destination_change_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_destination_change_requests
    ADD CONSTRAINT "payroll_payment_destination_change_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payment_destination_change_requests payroll_payment_destination_change_requests_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payment_destination_change_requests
    ADD CONSTRAINT "payroll_payment_destination_change_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payslip_lines payroll_payslip_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslip_lines
    ADD CONSTRAINT "payroll_payslip_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payslip_lines payroll_payslip_lines_payslipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslip_lines
    ADD CONSTRAINT "payroll_payslip_lines_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES public.payroll_payslips(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payslips payroll_payslips_emitted_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslips
    ADD CONSTRAINT payroll_payslips_emitted_event_tenant_fkey FOREIGN KEY ("organizationId", "emittedBusinessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payslips payroll_payslips_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslips
    ADD CONSTRAINT "payroll_payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payslips payroll_payslips_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslips
    ADD CONSTRAINT "payroll_payslips_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_payslips payroll_payslips_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslips
    ADD CONSTRAINT "payroll_payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public.payroll_runs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_payslips payroll_payslips_runLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_payslips
    ADD CONSTRAINT "payroll_payslips_runLineId_fkey" FOREIGN KEY ("runLineId") REFERENCES public.payroll_run_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_periods payroll_periods_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT "payroll_periods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_rubriques payroll_rubriques_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_rubriques
    ADD CONSTRAINT "payroll_rubriques_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_run_lines payroll_run_lines_attendanceSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_lines
    ADD CONSTRAINT "payroll_run_lines_attendanceSnapshotId_fkey" FOREIGN KEY ("attendanceSnapshotId") REFERENCES public.payroll_attendance_snapshots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_run_lines payroll_run_lines_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_lines
    ADD CONSTRAINT "payroll_run_lines_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.payroll_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_run_lines payroll_run_lines_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_lines
    ADD CONSTRAINT "payroll_run_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_run_lines payroll_run_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_lines
    ADD CONSTRAINT "payroll_run_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_run_lines payroll_run_lines_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_lines
    ADD CONSTRAINT "payroll_run_lines_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public.payroll_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_run_transitions payroll_run_transitions_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_transitions
    ADD CONSTRAINT payroll_run_transitions_event_tenant_fkey FOREIGN KEY ("organizationId", "businessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_run_transitions payroll_run_transitions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_transitions
    ADD CONSTRAINT "payroll_run_transitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_run_transitions payroll_run_transitions_run_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_transitions
    ADD CONSTRAINT payroll_run_transitions_run_tenant_fkey FOREIGN KEY ("organizationId", "payrollRunId") REFERENCES public.payroll_runs("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_runs payroll_runs_approved_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_approved_event_tenant_fkey FOREIGN KEY ("organizationId", "approvedBusinessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_runs payroll_runs_emitted_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_emitted_event_tenant_fkey FOREIGN KEY ("organizationId", "emittedBusinessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_runs payroll_runs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT "payroll_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_runs payroll_runs_originalRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT "payroll_runs_originalRunId_fkey" FOREIGN KEY ("originalRunId") REFERENCES public.payroll_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_runs payroll_runs_payrollPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT "payroll_runs_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES public.payroll_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_runs payroll_runs_posted_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_posted_event_tenant_fkey FOREIGN KEY ("organizationId", "postedBusinessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_runs payroll_runs_reviewed_event_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_reviewed_event_tenant_fkey FOREIGN KEY ("organizationId", "reviewedBusinessEventId") REFERENCES public.business_events("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_salary_change_requests payroll_salary_change_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_change_requests
    ADD CONSTRAINT "payroll_salary_change_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.payroll_employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_salary_change_requests payroll_salary_change_requests_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_change_requests
    ADD CONSTRAINT "payroll_salary_change_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_salary_change_requests payroll_salary_change_requests_sourceContractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_change_requests
    ADD CONSTRAINT "payroll_salary_change_requests_sourceContractId_fkey" FOREIGN KEY ("sourceContractId") REFERENCES public.payroll_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_salary_change_requests payroll_salary_change_requests_supersedingContractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_change_requests
    ADD CONSTRAINT "payroll_salary_change_requests_supersedingContractId_fkey" FOREIGN KEY ("supersedingContractId") REFERENCES public.payroll_contracts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_cash_shortage_worker_checkpoints pos_cash_shortage_worker_checkpoints_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_cash_shortage_worker_checkpoints
    ADD CONSTRAINT "pos_cash_shortage_worker_checkpoints_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pos_checkout_workspaces pos_checkout_workspaces_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_checkout_workspaces
    ADD CONSTRAINT "pos_checkout_workspaces_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.pos_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_commit_results pos_commit_results_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT "pos_commit_results_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_commit_results pos_commit_results_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT "pos_commit_results_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_commit_results pos_commit_results_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT "pos_commit_results_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_commit_results pos_commit_results_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT "pos_commit_results_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_commit_results pos_commit_results_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT "pos_commit_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.pos_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_commit_results pos_commit_results_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_commit_results
    ADD CONSTRAINT "pos_commit_results_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_devices pos_offline_devices_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_devices
    ADD CONSTRAINT "pos_offline_devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_devices pos_offline_devices_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_devices
    ADD CONSTRAINT "pos_offline_devices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pos_offline_devices pos_offline_devices_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_devices
    ADD CONSTRAINT "pos_offline_devices_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_events pos_offline_events_businessEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES public.business_events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_offline_events pos_offline_events_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.pos_offline_devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_events pos_offline_events_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_events pos_offline_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pos_offline_events pos_offline_events_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.pos_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_offline_events pos_offline_events_syncBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES public.pos_offline_sync_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_offline_events pos_offline_events_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_events
    ADD CONSTRAINT "pos_offline_events_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_sync_batches pos_offline_sync_batches_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_batches
    ADD CONSTRAINT "pos_offline_sync_batches_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.pos_offline_devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_sync_batches pos_offline_sync_batches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_batches
    ADD CONSTRAINT "pos_offline_sync_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pos_offline_sync_certificates pos_offline_sync_certificates_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_certificates
    ADD CONSTRAINT "pos_offline_sync_certificates_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.pos_offline_devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_sync_certificates pos_offline_sync_certificates_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_certificates
    ADD CONSTRAINT "pos_offline_sync_certificates_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_sync_certificates pos_offline_sync_certificates_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_certificates
    ADD CONSTRAINT "pos_offline_sync_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pos_offline_sync_certificates pos_offline_sync_certificates_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_certificates
    ADD CONSTRAINT "pos_offline_sync_certificates_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_sync_conflicts pos_offline_sync_conflicts_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_conflicts
    ADD CONSTRAINT "pos_offline_sync_conflicts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.pos_offline_devices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_offline_sync_conflicts pos_offline_sync_conflicts_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_conflicts
    ADD CONSTRAINT "pos_offline_sync_conflicts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.pos_offline_events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_offline_sync_conflicts pos_offline_sync_conflicts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_conflicts
    ADD CONSTRAINT "pos_offline_sync_conflicts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pos_offline_sync_conflicts pos_offline_sync_conflicts_syncBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_offline_sync_conflicts
    ADD CONSTRAINT "pos_offline_sync_conflicts_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES public.pos_offline_sync_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_sessions pos_sessions_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT "pos_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_sessions pos_sessions_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT "pos_sessions_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_sessions pos_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT "pos_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_terminals pos_terminals_currentSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_terminals
    ADD CONSTRAINT "pos_terminals_currentSessionId_fkey" FOREIGN KEY ("currentSessionId") REFERENCES public.pos_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pos_terminals pos_terminals_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_terminals
    ADD CONSTRAINT "pos_terminals_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pos_terminals pos_terminals_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_terminals
    ADD CONSTRAINT "pos_terminals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: posting_rule_lines posting_rule_lines_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rule_lines
    ADD CONSTRAINT "posting_rule_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: posting_rule_lines posting_rule_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rule_lines
    ADD CONSTRAINT "posting_rule_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: posting_rule_lines posting_rule_lines_postingRuleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rule_lines
    ADD CONSTRAINT "posting_rule_lines_postingRuleId_fkey" FOREIGN KEY ("postingRuleId") REFERENCES public.posting_rules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: posting_rules posting_rules_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rules
    ADD CONSTRAINT "posting_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_production_batches production_batches_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_production_batches
    ADD CONSTRAINT "production_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: legacy_production_batches production_batches_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_production_batches
    ADD CONSTRAINT "production_batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: legacy_production_batches production_batches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_production_batches
    ADD CONSTRAINT "production_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: legacy_production_batches production_batches_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_production_batches
    ADD CONSTRAINT "production_batches_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.legacy_recipes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: provider_accounts provider_accounts_feeLedgerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT "provider_accounts_feeLedgerAccountId_fkey" FOREIGN KEY ("feeLedgerAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provider_accounts provider_accounts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT "provider_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: provider_accounts provider_accounts_paymentRailId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT "provider_accounts_paymentRailId_fkey" FOREIGN KEY ("paymentRailId") REFERENCES public.payment_rails(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: provider_accounts provider_accounts_settlementLedgerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT "provider_accounts_settlementLedgerAccountId_fkey" FOREIGN KEY ("settlementLedgerAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provider_accounts provider_accounts_suspenseLedgerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_accounts
    ADD CONSTRAINT "provider_accounts_suspenseLedgerAccountId_fkey" FOREIGN KEY ("suspenseLedgerAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provider_events provider_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_events
    ADD CONSTRAINT "provider_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: provider_events provider_events_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_events
    ADD CONSTRAINT "provider_events_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: public_receipt_access_tokens public_receipt_access_tokens_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_receipt_access_tokens
    ADD CONSTRAINT "public_receipt_access_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: public_receipt_access_tokens public_receipt_access_tokens_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_receipt_access_tokens
    ADD CONSTRAINT "public_receipt_access_tokens_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT "purchase_order_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_order_lines purchase_order_lines_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT "purchase_order_lines_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_return_lines purchase_return_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_lines
    ADD CONSTRAINT "purchase_return_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_return_lines purchase_return_lines_po_line_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_lines
    ADD CONSTRAINT purchase_return_lines_po_line_fkey FOREIGN KEY ("sourcePurchaseOrderLineId") REFERENCES public.purchase_order_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_return_lines purchase_return_lines_receipt_line_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_lines
    ADD CONSTRAINT purchase_return_lines_receipt_line_fkey FOREIGN KEY ("sourceGoodsReceiptLineId") REFERENCES public.goods_receipt_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_return_lines purchase_return_lines_return_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_lines
    ADD CONSTRAINT purchase_return_lines_return_tenant_fkey FOREIGN KEY ("organizationId", "purchaseReturnId") REFERENCES public.purchase_returns("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_returns purchase_returns_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT "purchase_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_returns purchase_returns_po_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_po_tenant_fkey FOREIGN KEY ("organizationId", "purchaseOrderId") REFERENCES public.purchase_orders("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_returns purchase_returns_receipt_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_receipt_tenant_fkey FOREIGN KEY ("organizationId", "goodsReceiptId") REFERENCES public.goods_receipts("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_returns purchase_returns_reversal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_reversal_fkey FOREIGN KEY ("reversalOfPurchaseReturnId") REFERENCES public.purchase_returns(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_returns purchase_returns_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT "purchase_returns_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: legacy_recipe_ingredients recipe_ingredients_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_recipe_ingredients
    ADD CONSTRAINT "recipe_ingredients_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: legacy_recipe_ingredients recipe_ingredients_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_recipe_ingredients
    ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.legacy_recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_recipes recipes_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_recipes
    ADD CONSTRAINT "recipes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_recipes recipes_outputItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_recipes
    ADD CONSTRAINT "recipes_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliation_runs reconciliation_runs_accountingPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "reconciliation_runs_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES public.accounting_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reconciliation_runs reconciliation_runs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "reconciliation_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reconciliation_runs reconciliation_runs_paymentRailId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "reconciliation_runs_paymentRailId_fkey" FOREIGN KEY ("paymentRailId") REFERENCES public.payment_rails(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliation_runs reconciliation_runs_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "reconciliation_runs_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliation_runs reconciliation_runs_runById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "reconciliation_runs_runById_fkey" FOREIGN KEY ("runById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reconciliation_runs reconciliation_runs_signedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "reconciliation_runs_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: referral_attribution_events referral_attribution_events_attributionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attribution_events
    ADD CONSTRAINT "referral_attribution_events_attributionId_fkey" FOREIGN KEY ("organizationId", "attributionId") REFERENCES public.referral_attributions("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: referral_attribution_events referral_attribution_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attribution_events
    ADD CONSTRAINT "referral_attribution_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: referral_attribution_events referral_attribution_events_targetOrganizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attribution_events
    ADD CONSTRAINT "referral_attribution_events_targetOrganizationId_fkey" FOREIGN KEY ("targetOrganizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: referral_attributions referral_attributions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attributions
    ADD CONSTRAINT "referral_attributions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: referral_attributions referral_attributions_statementSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attributions
    ADD CONSTRAINT "referral_attributions_statementSnapshotId_fkey" FOREIGN KEY ("organizationId", "statementSnapshotId") REFERENCES public.customer_statement_snapshots("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: roles roles_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales_order_lines sales_order_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_lines
    ADD CONSTRAINT "sales_order_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_order_lines sales_order_lines_salesOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_lines
    ADD CONSTRAINT "sales_order_lines_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public.sales_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT "sales_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_orders sales_orders_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT "sales_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_orders sales_orders_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT "sales_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales_orders sales_orders_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT "sales_orders_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.pos_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT "sales_orders_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.pos_terminals(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: serial_numbers serial_numbers_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT "serial_numbers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: serial_numbers serial_numbers_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT "serial_numbers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: serial_numbers serial_numbers_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT "serial_numbers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: settlement_accounts settlement_accounts_ledgerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_accounts
    ADD CONSTRAINT "settlement_accounts_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: settlement_accounts settlement_accounts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_accounts
    ADD CONSTRAINT "settlement_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: settlement_accounts settlement_accounts_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_accounts
    ADD CONSTRAINT "settlement_accounts_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: statement_files statement_files_importedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_files
    ADD CONSTRAINT "statement_files_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: statement_files statement_files_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_files
    ADD CONSTRAINT "statement_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: statement_files statement_files_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_files
    ADD CONSTRAINT "statement_files_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: statement_lines statement_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_lines
    ADD CONSTRAINT "statement_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: statement_lines statement_lines_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_lines
    ADD CONSTRAINT "statement_lines_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: statement_lines statement_lines_statementFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_lines
    ADD CONSTRAINT "statement_lines_statementFileId_fkey" FOREIGN KEY ("statementFileId") REFERENCES public.statement_files(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_adjustment_lines stock_adjustment_lines_adjustmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_lines
    ADD CONSTRAINT "stock_adjustment_lines_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES public.stock_adjustments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_adjustment_lines stock_adjustment_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_lines
    ADD CONSTRAINT "stock_adjustment_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_adjustments stock_adjustments_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT "stock_adjustments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_adjustments stock_adjustments_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT "stock_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_adjustments stock_adjustments_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT "stock_adjustments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_adjustments stock_adjustments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT "stock_adjustments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_adjustments stock_adjustments_reversalOfAdjustmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT "stock_adjustments_reversalOfAdjustmentId_fkey" FOREIGN KEY ("reversalOfAdjustmentId") REFERENCES public.stock_adjustments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_count_lines stock_count_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_lines
    ADD CONSTRAINT "stock_count_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_count_lines stock_count_lines_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_lines
    ADD CONSTRAINT "stock_count_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_count_lines stock_count_lines_stockCountSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_lines
    ADD CONSTRAINT "stock_count_lines_stockCountSessionId_fkey" FOREIGN KEY ("stockCountSessionId") REFERENCES public.stock_count_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_count_sessions stock_count_sessions_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT "stock_count_sessions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_count_sessions stock_count_sessions_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT "stock_count_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_count_sessions stock_count_sessions_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT "stock_count_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_count_sessions stock_count_sessions_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT "stock_count_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_count_sessions stock_count_sessions_postedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT "stock_count_sessions_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_count_sessions stock_count_sessions_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_count_sessions
    ADD CONSTRAINT "stock_count_sessions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_transfer_lines stock_transfer_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_lines
    ADD CONSTRAINT "stock_transfer_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_transfer_lines stock_transfer_lines_transferId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_lines
    ADD CONSTRAINT "stock_transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES public.stock_transfers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT "stock_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_transfers stock_transfers_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT "stock_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_transfers stock_transfers_fromLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT "stock_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_transfers stock_transfers_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT "stock_transfers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_transfers stock_transfers_toLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT "stock_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_bank_accounts supplier_bank_accounts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_accounts
    ADD CONSTRAINT "supplier_bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_bank_accounts supplier_bank_accounts_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_accounts
    ADD CONSTRAINT "supplier_bank_accounts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_bank_change_requests supplier_bank_change_requests_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_change_requests
    ADD CONSTRAINT "supplier_bank_change_requests_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.supplier_bank_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_bank_change_requests supplier_bank_change_requests_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_change_requests
    ADD CONSTRAINT "supplier_bank_change_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_bank_change_requests supplier_bank_change_requests_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_bank_change_requests
    ADD CONSTRAINT "supplier_bank_change_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_credit_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_note_lines
    ADD CONSTRAINT supplier_credit_note_lines_credit_tenant_fkey FOREIGN KEY ("organizationId", "supplierCreditNoteId") REFERENCES public.supplier_credit_notes("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_invoice_line_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_note_lines
    ADD CONSTRAINT supplier_credit_note_lines_invoice_line_fkey FOREIGN KEY ("sourceSupplierInvoiceLineId") REFERENCES public.supplier_invoice_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_note_lines
    ADD CONSTRAINT "supplier_credit_note_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_receipt_line_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_note_lines
    ADD CONSTRAINT supplier_credit_note_lines_receipt_line_fkey FOREIGN KEY ("sourceGoodsReceiptLineId") REFERENCES public.goods_receipt_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_note_lines supplier_credit_note_lines_return_line_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_note_lines
    ADD CONSTRAINT supplier_credit_note_lines_return_line_tenant_fkey FOREIGN KEY ("organizationId", "sourcePurchaseReturnLineId") REFERENCES public.purchase_return_lines("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_invoice_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT supplier_credit_notes_invoice_tenant_fkey FOREIGN KEY ("organizationId", "supplierInvoiceId") REFERENCES public.supplier_invoices("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT "supplier_credit_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_po_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT supplier_credit_notes_po_tenant_fkey FOREIGN KEY ("organizationId", "purchaseOrderId") REFERENCES public.purchase_orders("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_receipt_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT supplier_credit_notes_receipt_tenant_fkey FOREIGN KEY ("organizationId", "goodsReceiptId") REFERENCES public.goods_receipts("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_return_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT supplier_credit_notes_return_tenant_fkey FOREIGN KEY ("organizationId", "purchaseReturnId") REFERENCES public.purchase_returns("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_reversal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT supplier_credit_notes_reversal_fkey FOREIGN KEY ("reversalOfSupplierCreditNoteId") REFERENCES public.supplier_credit_notes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_credit_notes supplier_credit_notes_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_credit_notes
    ADD CONSTRAINT "supplier_credit_notes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_goodsReceiptLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT "supplier_invoice_lines_goodsReceiptLineId_fkey" FOREIGN KEY ("goodsReceiptLineId") REFERENCES public.goods_receipt_lines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT "supplier_invoice_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT "supplier_invoice_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_purchaseOrderLineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT "supplier_invoice_lines_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES public.purchase_order_lines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_supplierInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT "supplier_invoice_lines_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES public.supplier_invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_invoice_match_exceptions supplier_invoice_match_exceptions_invoice_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_match_exceptions
    ADD CONSTRAINT supplier_invoice_match_exceptions_invoice_tenant_fkey FOREIGN KEY ("organizationId", "supplierInvoiceId") REFERENCES public.supplier_invoices("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_invoice_match_exceptions supplier_invoice_match_exceptions_match_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_match_exceptions
    ADD CONSTRAINT supplier_invoice_match_exceptions_match_tenant_fkey FOREIGN KEY ("organizationId", "threeWayMatchId") REFERENCES public.three_way_matches("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_invoice_match_exceptions supplier_invoice_match_exceptions_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoice_match_exceptions
    ADD CONSTRAINT supplier_invoice_match_exceptions_org_fkey FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_invoices supplier_invoices_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT "supplier_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_invoices supplier_invoices_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT "supplier_invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_invoices supplier_invoices_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT "supplier_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_ledger_entries supplier_ledger_entries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_ledger_entries
    ADD CONSTRAINT "supplier_ledger_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_ledger_entries supplier_ledger_entries_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_ledger_entries
    ADD CONSTRAINT "supplier_ledger_entries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_payment_allocations supplier_payment_allocations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payment_allocations
    ADD CONSTRAINT "supplier_payment_allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_payment_allocations supplier_payment_allocations_supplierInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payment_allocations
    ADD CONSTRAINT "supplier_payment_allocations_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES public.supplier_invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_payment_allocations supplier_payment_allocations_supplierPaymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payment_allocations
    ADD CONSTRAINT "supplier_payment_allocations_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES public.supplier_payments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_payments supplier_payments_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT "supplier_payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.supplier_bank_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT "supplier_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_payments supplier_payments_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_access_logs supplier_po_access_logs_envelopeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_logs
    ADD CONSTRAINT "supplier_po_access_logs_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES public.supplier_po_envelopes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_access_logs supplier_po_access_logs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_logs
    ADD CONSTRAINT "supplier_po_access_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_access_logs supplier_po_access_logs_tokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_logs
    ADD CONSTRAINT "supplier_po_access_logs_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES public.supplier_po_access_tokens(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_access_tokens supplier_po_access_tokens_envelopeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_tokens
    ADD CONSTRAINT "supplier_po_access_tokens_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES public.supplier_po_envelopes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_access_tokens supplier_po_access_tokens_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_access_tokens
    ADD CONSTRAINT "supplier_po_access_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_envelopes supplier_po_envelopes_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_envelopes
    ADD CONSTRAINT "supplier_po_envelopes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_envelopes supplier_po_envelopes_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_envelopes
    ADD CONSTRAINT "supplier_po_envelopes_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_envelopes supplier_po_envelopes_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_envelopes
    ADD CONSTRAINT "supplier_po_envelopes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposal_lines supplier_po_proposal_lines_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposal_lines
    ADD CONSTRAINT "supplier_po_proposal_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposal_lines supplier_po_proposal_lines_proposalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposal_lines
    ADD CONSTRAINT "supplier_po_proposal_lines_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES public.supplier_po_proposals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposal_states supplier_po_proposal_states_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposal_states
    ADD CONSTRAINT "supplier_po_proposal_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposal_states supplier_po_proposal_states_proposalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposal_states
    ADD CONSTRAINT "supplier_po_proposal_states_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES public.supplier_po_proposals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposals supplier_po_proposals_envelopeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposals
    ADD CONSTRAINT "supplier_po_proposals_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES public.supplier_po_envelopes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposals supplier_po_proposals_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposals
    ADD CONSTRAINT "supplier_po_proposals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_po_proposals supplier_po_proposals_tokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_po_proposals
    ADD CONSTRAINT "supplier_po_proposals_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES public.supplier_po_access_tokens(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: suppliers suppliers_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: suspense_items suspense_items_ledgerPostingBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_ledgerPostingBatchId_fkey" FOREIGN KEY ("ledgerPostingBatchId") REFERENCES public.ledger_posting_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspense_items suspense_items_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: suspense_items suspense_items_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspense_items suspense_items_paymentTransactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspense_items suspense_items_providerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES public.provider_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspense_items suspense_items_reconciliationRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES public.reconciliation_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspense_items suspense_items_suspenseLedgerAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspense_items
    ADD CONSTRAINT "suspense_items_suspenseLedgerAccountId_fkey" FOREIGN KEY ("suspenseLedgerAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tax_rates tax_rates_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT "tax_rates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_module_configuration_commands tenant_module_commands_configuration_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_configuration_commands
    ADD CONSTRAINT tenant_module_commands_configuration_fkey FOREIGN KEY ("organizationId") REFERENCES public.tenant_module_configurations("organizationId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_configuration_commands tenant_module_configuration_commands_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_configuration_commands
    ADD CONSTRAINT "tenant_module_configuration_commands_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_configurations tenant_module_configurations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_configurations
    ADD CONSTRAINT "tenant_module_configurations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_grants tenant_module_grants_configuration_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_grants
    ADD CONSTRAINT tenant_module_grants_configuration_fkey FOREIGN KEY ("organizationId") REFERENCES public.tenant_module_configurations("organizationId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_module_grants tenant_module_grants_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_module_grants
    ADD CONSTRAINT "tenant_module_grants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: three_way_matches three_way_matches_goodsReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_way_matches
    ADD CONSTRAINT "three_way_matches_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: three_way_matches three_way_matches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_way_matches
    ADD CONSTRAINT "three_way_matches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: three_way_matches three_way_matches_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_way_matches
    ADD CONSTRAINT "three_way_matches_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: three_way_matches three_way_matches_supplierInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_way_matches
    ADD CONSTRAINT "three_way_matches_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES public.supplier_invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: units units_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_alert_deliveries workflow_assurance_alert_deliveries_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_alert_deliveries
    ADD CONSTRAINT "workflow_assurance_alert_deliveries_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.workflow_assurance_incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_alert_deliveries workflow_assurance_alert_deliveries_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_alert_deliveries
    ADD CONSTRAINT "workflow_assurance_alert_deliveries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_check_findings workflow_assurance_check_findings_checkRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_findings
    ADD CONSTRAINT "workflow_assurance_check_findings_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES public.workflow_assurance_check_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_check_findings workflow_assurance_check_findings_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_findings
    ADD CONSTRAINT "workflow_assurance_check_findings_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.workflow_assurance_incidents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: workflow_assurance_check_findings workflow_assurance_check_findings_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_findings
    ADD CONSTRAINT "workflow_assurance_check_findings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_check_runs workflow_assurance_check_runs_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_runs
    ADD CONSTRAINT "workflow_assurance_check_runs_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public.workflow_assurance_check_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: workflow_assurance_check_runs workflow_assurance_check_runs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_check_runs
    ADD CONSTRAINT "workflow_assurance_check_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_incident_events workflow_assurance_incident_events_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incident_events
    ADD CONSTRAINT "workflow_assurance_incident_events_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.workflow_assurance_incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_incident_events workflow_assurance_incident_events_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incident_events
    ADD CONSTRAINT "workflow_assurance_incident_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_incidents workflow_assurance_incidents_checkRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incidents
    ADD CONSTRAINT "workflow_assurance_incidents_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES public.workflow_assurance_check_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: workflow_assurance_incidents workflow_assurance_incidents_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incidents
    ADD CONSTRAINT "workflow_assurance_incidents_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public.workflow_assurance_check_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: workflow_assurance_incidents workflow_assurance_incidents_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_incidents
    ADD CONSTRAINT "workflow_assurance_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_waivers workflow_assurance_waivers_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_waivers
    ADD CONSTRAINT "workflow_assurance_waivers_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.workflow_assurance_incidents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_assurance_waivers workflow_assurance_waivers_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_assurance_waivers
    ADD CONSTRAINT "workflow_assurance_waivers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

