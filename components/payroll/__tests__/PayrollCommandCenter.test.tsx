import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import PayrollCommandCenter from "../PayrollCommandCenter"
import type { PayrollCommandReadModel } from "@/actions/payroll/payroll-command-read-model.actions"
import {
  approvePayrollCountryPackReviewIntakeAction,
  evaluatePayrollCountryPackReviewIntakeAction,
  recordPayrollCountryPackReviewIntakeAction,
} from "@/actions/payroll/payroll-country-pack-review-intake.actions"

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))
jest.mock("@/actions/payroll/payroll-pilot-certification.actions", () => ({
  certifyPayrollPilotCycleAction: jest.fn(),
}))
jest.mock("@/actions/payroll/payroll-country-pack-review-intake.actions", () => ({
  evaluatePayrollCountryPackReviewIntakeAction: jest.fn(),
  recordPayrollCountryPackReviewIntakeAction: jest.fn(),
  approvePayrollCountryPackReviewIntakeAction: jest.fn(),
}))
const mockEvaluateCountryPackReviewIntake = evaluatePayrollCountryPackReviewIntakeAction as jest.Mock
const mockRecordCountryPackReviewIntake = recordPayrollCountryPackReviewIntakeAction as jest.Mock
const mockApproveCountryPackReviewIntake = approvePayrollCountryPackReviewIntakeAction as jest.Mock

jest.setTimeout(15000)
jest.mock("lucide-react", () => {
  const React = require("react")
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    MockIcon.displayName = `Mock${name}Icon`
    return MockIcon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target]
        return makeIcon(String(prop))
      },
    },
  )
})

function commandData(): PayrollCommandReadModel {
  return {
    organizationId: "org-1",
    asOf: "2026-06-26T08:00:00.000Z",
    currentPeriod: {
      id: "period-1",
      name: "June 2026",
      status: "INPUTS_LOCKED",
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T23:59:59.000Z",
      payDate: "2026-06-30T00:00:00.000Z",
      inputLockedAt: "2026-06-25T12:00:00.000Z",
      countryCode: "CM",
      countryPackVersion: "cm-payroll-2026.1",
      countryPackResolutionHash: "sha256:country-pack",
      countryPackCapabilityStatus: "EXPERT_REVIEW_REQUIRED",
      accountingPeriodId: "acct-period-1",
      selection: "calendar-match",
    },
    roleScope: {
      canReadCommand: true,
      canReadSalaryAmounts: false,
      canManageEmployees: false,
      canManageContracts: false,
      canManageCompensation: false,
      canReviewRuns: true,
      canCalculateRuns: false,
      canApproveRuns: false,
      canReleasePayments: false,
      canPrepareDeclarations: false,
      canExportPayroll: false,
      canReadPaymentEvidence: true,
      canReadAttendanceReadiness: true,
    },
    redaction: {
      payrollAmounts: {
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-payroll-person-redaction-policy",
        replacement: "[REDACTED:PAYROLL]",
        requiredPermissions: ["payroll.payslips.read", "EMPLOYEE_SALARY_READ"],
      },
    },
    trustedCounts: {
      activeEmployees: 2,
      linkedEmployees: 1,
      unmappedEmployees: 1,
      activeContracts: 1,
      activeRubriqueAssignments: 3,
      frozenAttendanceSnapshots: 1,
      pendingSalaryChangeRequests: 1,
      approvedSalaryChangeRequests: 0,
      pendingPaymentDestinationChanges: 1,
      approvedPaymentDestinations: 1,
      missingPaymentDestinations: 0,
      pendingPaymentDestinations: 1,
      attendanceReadyEmployees: 1,
      attendanceDriftEmployees: 1,
      openPeriods: 1,
      calculatedRuns: 1,
      postedRuns: 0,
      releasedPaymentBatches: 0,
      openDeclarations: 1,
      ledgerBlockers: 2,
      reconciliationExceptions: 1,
      activeEmployeeBalanceCases: 1,
      openEmployeeBalanceCases: 1,
      partiallySettledEmployeeBalanceCases: 0,
      currentPeriodRuns: 1,
      currentPeriodPaymentBatches: 1,
      currentPeriodDeclarations: 1,
    },
    readiness: {
      employees: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_EMPLOYEE_USER_MAPPING_GAP"], source: "payroll.employee_source", message: "Employee/user mappings need cleanup.", counts: { activeEmployees: 2 } },
      contracts: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_ACTIVE_CONTRACT_GAP"], source: "payroll.contracts", message: "Active contract coverage is incomplete.", counts: { activeContracts: 1 } },
      compensation: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_SALARY_CHANGE_QUEUE_OPEN"], source: "payroll.compensation", message: "Salary change queue requires maker-checker follow-up." },
      attendance: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_ATTENDANCE_FREEZE_GAP"], source: "payroll.attendance_readiness", message: "Attendance freeze coverage is incomplete." },
      paymentDestinations: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP"], source: "payroll.payment_destination", message: "Payment destination evidence requires approval/application." },
      employeeBalances: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN"], source: "payroll.employee_balance", message: "Employee balance recovery cases require settlement or review before close/payment certification." },
      payrollRun: { state: "READY", blockerCodes: [], source: "payroll.runs", message: "Current-period payroll run data is available." },
      payrollRegister: { state: "READY", blockerCodes: [], source: "payroll.register", message: "Payroll register lines are present." },
      payments: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN"], source: "payroll.payments", message: "Payroll payment reconciliation exceptions are open." },
      declarations: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_DECLARATION_ACTION_REQUIRED"], source: "payroll.declarations", message: "Declaration data is available for the current period." },
      posting: { state: "BLOCKED", blockerCodes: ["PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN"], source: "payroll.ledger_posting", message: "Ledger posting blockers must be cleared." },
      close: { state: "BLOCKED", blockerCodes: ["PAYROLL_CLOSE_CRITICAL_BLOCKERS_OPEN"], source: "accounting.close_assurance", message: "Critical close blockers are open." },
      adapterOperations: { state: "BLOCKED", blockerCodes: ["PAYROLL_PROVIDER_OPERATIONS_BLOCKED", "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER", "PAYROLL_ADAPTER_CERTIFICATION_GAPS", "PAYROLL_ADAPTER_CHAOS_GATE_MISSING"], source: "payroll.adapter_operations", message: "Adapter operations have provider or authority dead-letter blockers." },
      pilotCertification: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_PILOT_CYCLE_SIGNOFF_REQUIRED"], source: "payroll.pilot_cycle_certification", message: "Controlled pilot-cycle evidence is clean and awaiting required signoffs." },
      finalRelease: { state: "BLOCKED", blockerCodes: ["FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY"], source: "payroll.final_release_readiness", message: "Final release evidence pack still has open production-readiness blockers." },
    },
    blockers: [
      { code: "PAYROLL_ACTIVE_CONTRACT_GAP", domain: "hr", severity: "high", message: "Some active payroll employees do not have an active contract.", source: "services/payroll/contract.service.ts", count: 1 },
      { code: "PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN", domain: "posting", severity: "critical", message: "Payroll posting blockers remain open.", source: "services/payroll/payroll-control.service.ts", count: 2 },
      { code: "PAYROLL_PROVIDER_OPERATIONS_BLOCKED", domain: "adapter", severity: "critical", message: "Provider operations have blocked evidence.", source: "services/payroll/adapter-operations-read-model.service.ts", count: 1 },
      { code: "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER", domain: "adapter", severity: "critical", message: "Authority adapter execution is dead-lettered.", source: "services/payroll/adapter-operations-read-model.service.ts", count: 1 },
      { code: "PAYROLL_ADAPTER_CERTIFICATION_GAPS", domain: "adapter", severity: "high", message: "Adapter certification proof is incomplete.", source: "services/payroll/adapter-operations-read-model.service.ts", count: 2 },
      { code: "PAYROLL_ADAPTER_CHAOS_GATE_MISSING", domain: "adapter", severity: "high", message: "Adapter chaos release gate proof is incomplete.", source: "services/payroll/payroll-adapter-chaos-release-gate.service.ts", count: 2 },
      { code: "PAYROLL_FINAL_RELEASE_READINESS_BLOCKED", domain: "certification", severity: "critical", message: "Final HR/payroll production release readiness still has open evidence blockers.", source: "services/payroll/payroll-final-release-readiness.service.ts", count: 1 },
    ],
    nextActions: [
      { id: "activate-payroll-contracts", label: "Activate missing payroll contracts", priority: "high", requiredPermission: "payroll.contracts.manage", source: "payroll.contracts", blockedBy: ["PAYROLL_ACTIVE_CONTRACT_GAP"], href: "/dashboard/payroll/contracts", allowed: true },
      { id: "resolve-payroll-payment-exceptions", label: "Resolve payroll payment reconciliation exceptions", priority: "high", requiredPermission: "payments.reconciliation.exception.resolve", source: "payroll.payment_reconciliation", blockedBy: ["PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN"], href: "/dashboard/finance/reconciliation", allowed: true },
      { id: "prepare-payroll-declarations", label: "Prepare payroll declarations", priority: "normal", requiredPermission: "payroll.declarations.prepare", source: "payroll.declarations", blockedBy: ["PAYROLL_RUN_NOT_POSTED"], href: null, allowed: false },
      { id: "clear-salary-change-queue", label: "Clear pending salary change approvals", priority: "normal", requiredPermission: "payroll.salary_changes.approve", source: "payroll.compensation", blockedBy: ["PAYROLL_SALARY_CHANGE_QUEUE_OPEN"], href: "/dashboard/payroll/compensation", allowed: false },
      { id: "review-payroll-adapter-operations", label: "Review payroll adapter operations", priority: "critical", requiredPermission: "payroll.payments.reconcile", source: "payroll.adapter_operations", blockedBy: ["PAYROLL_PROVIDER_OPERATIONS_BLOCKED", "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER", "PAYROLL_ADAPTER_CERTIFICATION_GAPS", "PAYROLL_ADAPTER_CHAOS_GATE_MISSING"], href: "/dashboard/payroll/payments", allowed: true },
    ],
    adapterOperations: {
      summary: {
        providerAccounts: 1,
        providerReady: 0,
        providerActionRequired: 0,
        providerBlocked: 1,
        staleStatementProviders: 1,
        laggingCallbackProviders: 1,
        deadLetterInboxItems: 1,
        failedInboxItems: 1,
        processingInboxItems: 1,
        retryDueInboxItems: 1,
        staleProcessingInboxItems: 1,
        settlementWorkerLeasedItems: 1,
        settlementWorkerRetryScheduledItems: 1,
        settlementWorkerDeadLetteredItems: 1,
        settlementWorkerCompletedItems: 1,
        settlementWorkerUnknownItems: 0,
        openPaymentExceptions: 1,
        replayOrTamperEvents: 1,
        authorityExecutions: 1,
        authorityDeadLetter: 1,
        authorityRetryScheduled: 0,
        authorityHarnessGaps: 1,
        paymentAdapterGaps: 1,
        adapterChaosGateBlockers: 2,
        authorityChaosGateMissing: 1,
        providerChaosGateMissing: 1,
      },
      providerHealth: [
        {
          providerAccountId: "provider-1",
          providerCode: "MOMO-CM",
          displayName: "Mobile Money CM",
          status: "ACTIVE",
          state: "BLOCKED",
          currencyCode: "XAF",
          countryCode: "CM",
          statementSource: "API",
          latestStatementImportedAt: "2026-06-20T07:00:00.000Z",
          latestStatementFileHash: "sha256:statement-file",
          latestProviderEventReceivedAt: "2026-06-26T06:00:00.000Z",
          latestReconciliationRunId: "recon-1",
          latestReconciliationStatus: "BLOCKED",
          latestReconciliationGuard: "same_provider_business_date",
          latestReconciliationRunDedupeKey: "org-1:provider-1:2026-06-30",
          openExceptionCount: 1,
          deadLetterInboxCount: 1,
          failedInboxCount: 1,
          processingInboxCount: 1,
          retryDueInboxCount: 1,
          staleProcessingInboxCount: 1,
          laggingCallbackCount: 1,
          replayOrTamperEventCount: 1,
          duplicateRiskCount: 1,
          settlementWorker: {
            leasedCount: 1,
            retryScheduledCount: 1,
            deadLetteredCount: 1,
            completedCount: 1,
            unknownCount: 0,
            latestAction: "RETRY_SCHEDULED",
            latestActionSource: "WORKER_METADATA",
            latestActionAt: "2026-06-26T06:45:00.000Z",
            nextRetryAt: "2026-06-26T07:15:00.000Z",
            lastErrorCode: "PROVIDER_TIMEOUT",
            evidenceRefs: [
              {
                inboxItemId: "inbox-2",
                source: "PROVIDER_EVENT",
                status: "FAILED",
                payloadHash: "sha256:failed-payload",
                externalId: "provider-event-failed",
                correlationId: "corr-failed",
                workerAction: "RETRY_SCHEDULED",
                workerActionSource: "WORKER_METADATA",
                workerActionAt: "2026-06-26T06:45:00.000Z",
                nextAttemptAt: "2026-06-26T07:15:00.000Z",
                lastErrorCode: "PROVIDER_TIMEOUT",
                redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
              },
              {
                inboxItemId: "inbox-4",
                source: "PROVIDER_EVENT",
                status: "PROCESSED",
                payloadHash: "sha256:completed-payload",
                externalId: "provider-event-completed",
                correlationId: "corr-completed",
                workerAction: "COMPLETED",
                workerActionSource: "WORKER_METADATA",
                workerActionAt: "2026-06-26T06:30:00.000Z",
                nextAttemptAt: null,
                lastErrorCode: null,
                redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
              },
            ],
          },
          missingSettlementLedger: false,
          missingSuspenseLedger: true,
          blockers: ["PROVIDER_DEAD_LETTER_INBOX", "PROVIDER_REPLAY_OR_TAMPER_EVENT", "PROVIDER_INBOX_PROCESSING_STALE", "PROVIDER_RECONCILIATION_RUN_OPEN", "PROVIDER_LEDGER_MAPPING_MISSING"],
          nextAction: "Triage dead-letter provider inbox items with hashed payload evidence and idempotency proof.",
        },
      ],
      authorityExecutions: [
        {
          declarationId: "decl-1",
          declarationEvidenceId: "decl-evidence-1",
          authority: "CNPS",
          declarationType: "SOCIAL_SECURITY",
          status: "REJECTED",
          executionStatus: "DEAD_LETTER",
          authorityAdapterKey: "cm-cnps-v1",
          authorityCertificationHarnessHash: null,
          authorityAdapterProofHash: "sha256:authority-proof",
          adapterChaosReleaseGateHash: null,
          nextAttemptAt: "2026-06-26T09:00:00.000Z",
          leasedBy: null,
          attempts: 3,
          errorCode: "HTTP_500",
          updatedAt: "2026-06-26T07:00:00.000Z",
          blockers: ["AUTHORITY_CERTIFICATION_HARNESS_MISSING", "AUTHORITY_EXECUTION_DEAD_LETTER", "AUTHORITY_CHAOS_GATE_PROOF_MISSING"],
          nextAction: "Triage the authority adapter dead-letter and record corrected replay or manual authority evidence.",
        },
      ],
      paymentAdapterGaps: [
        {
          payrollPaymentBatchId: "batch-1",
          batchNumber: "PB-2026-06",
          status: "DRAFT",
          method: "BANK_TRANSFER",
          reconciliationStatus: null,
          paymentAdapterStatus: "SUPPORTED_CERTIFIED",
          productionPaymentAutomationSupported: true,
          providerCertificationHarnessHash: null,
          paymentAdapterProofHash: null,
          adapterChaosReleaseGateHash: null,
          paymentProviderAdapterContractHash: "sha256:provider-contract",
          paymentExceptionId: "payment-exception-1",
          blockers: ["PROVIDER_CERTIFICATION_HARNESS_MISSING", "PROVIDER_CHAOS_GATE_PROOF_MISSING", "PAYMENT_EXCEPTION_OPEN"],
          nextAction: "Attach the provider certification harness hash before payment automation claims.",
        },
      ],
      adapterChaosGate: {
        state: "ACTION_REQUIRED",
        authorityAutomationClaims: 1,
        providerAutomationClaims: 1,
        authorityProofCount: 0,
        providerProofCount: 0,
        missingAuthorityProofCount: 1,
        missingProviderProofCount: 1,
        latestAuthorityProofHash: null,
        latestProviderProofHash: null,
        blockerCodes: ["AUTHORITY_CHAOS_GATE_PROOF_MISSING", "PROVIDER_CHAOS_GATE_PROOF_MISSING"],
        nextAction: "Run and persist the certified authority adapter chaos release gate before automated filing readiness can be claimed.",
      },
      redaction: {
        policy: "payroll-adapter-operations-redacted",
        rawPayloadsIncluded: false,
        credentialSecretsIncluded: false,
        salaryOrEmployeeIdentityIncluded: false,
      },
    },
    evidence: {
      latestRun: {
        id: "run-1",
        runNumber: "PR-2026-06",
        status: "CALCULATED",
        documentHash: "sha256:run-doc",
        evidenceHash: "sha256:run-evidence",
        calculationHash: "sha256:calc",
        attendanceSnapshotHash: "sha256:attendance",
        countryPackResolutionHash: "sha256:country-pack",
        ledgerPostingBatchId: null,
        postedBusinessEventId: null,
        payslipCount: 2,
        lineCount: 2,
        paymentBatchCount: 1,
        declarationCount: 1,
        updatedAt: "2026-06-26T07:00:00.000Z",
      },
      latestPaymentBatch: {
        id: "batch-1",
        batchNumber: "PB-2026-06",
        status: "DRAFT",
        documentHash: "sha256:batch-doc",
        evidenceHash: null,
        bankFileHash: null,
        ledgerPostingBatchId: null,
        postedBusinessEventId: null,
        reconciliationStatus: null,
        updatedAt: "2026-06-26T07:00:00.000Z",
      },
      latestDeclaration: {
        id: "decl-1",
        authority: "CNPS",
        declarationType: "SOCIAL_SECURITY",
        status: "REJECTED",
        payloadHash: "sha256:decl-payload",
        countryPackResolutionHash: "sha256:country-pack",
        dueDate: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-06-26T07:00:00.000Z",
      },
      closeRun: {
        id: "close-1",
        status: "READY_TO_CLOSE",
        readinessScore: 72,
        criticalBlockerCount: 1,
        highBlockerCount: 2,
        evidenceCoveragePct: "87.50",
        asOf: "2026-06-26T07:00:00.000Z",
      },
      pilotCertification: {
        status: "READY_FOR_SIGNOFF",
        auditLogId: "pilot-audit-1",
        certificateHash: "sha256:pilot-certificate",
        generatedAt: "2026-06-26T07:50:00.000Z",
        evaluatedAt: "2026-06-26T07:55:00.000Z",
        blockerCount: 0,
        blockerCodes: [],
        missingSignoffRoles: ["security-privacy"],
        releaseGateCount: 4,
        redactionPolicy: "payroll-controlled-pilot-cycle-certificate-redaction",
      },
      pilotCertificationInput: {
        payrollRunId: "run-1",
        runNumber: "PR-2026-06",
        expectedSourceRegisterHash: "sha256:run-evidence",
        expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        expectedProofBackfillCertificateHash: "sha256:proof-backfill-certificate",
        proofBackfillStatus: "READY_FOR_CLOSE_RECHECK",
        proofBackfillAuditLogId: "proof-backfill-audit-1",
        inputComplete: true,
        missingInputs: [],
      },
      finalRelease: {
        decision: "NOT_READY",
        generatedAt: "2026-06-26T07:58:00.000Z",
        packHash: "sha256:final-release-pack",
        blockerCount: 1,
        criticalBlockerCount: 1,
        highBlockerCount: 0,
        gateCount: 3,
        passGateCount: 2,
        actionRequiredGateCount: 0,
        blockedGateCount: 1,
        missingGateCount: 0,
        blockerCodes: ["FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY"],
        releaseGateRequirementCount: 1,
        statutorySetup: {
          status: "BLOCKED",
          evidenceHash: "sha256:statutory-scenario-coverage",
          blockerCodes: ["FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY"],
          families: "8/9",
          missingReviewEvidenceCount: 1,
          sourceEvidenceHashCount: 1,
          requiredReviewTopicCount: 2,
          requiredReviewTopics: "taxableSalaryBase, bracketsAndRates",
        },
        countryPackReviewIntake: {
          status: "APPROVED",
          evidenceHash: "sha256:country-pack-review-approval",
          blockerCodes: [],
          approvalHash: "sha256:country-pack-review-approval",
          approvedAt: "2026-06-26T07:57:00.000Z",
          certificateHash: "sha256:country-pack-review-certificate",
          proposedPackVersion: "CM-2026.2",
          targetFamilyCount: 1,
          targetFamilies: ["IRPP_PERIOD"],
          freshAuthSatisfied: true,
          approvalEvidenceHashPresent: true,
        },
        gates: [
          {
            key: "statutory_setup",
            label: "Statutory setup and country-pack readiness",
            status: "BLOCKED",
            blockerCodes: ["FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY"],
            evidenceHash: "sha256:statutory-scenario-coverage",
            source: "PayrollProofBackfillReconciliationCertificate.setupGate.statutoryScenarioCoverage",
          },
          {
            key: "country_pack_review_intake",
            label: "Country-pack legal-owner review approval",
            status: "PASS",
            blockerCodes: [],
            evidenceHash: "sha256:country-pack-review-approval",
            source: "PayrollCountryPackReviewIntakeApproval",
          },
          {
            key: "policy_runtime",
            label: "Policy and payroll immutability runtime",
            status: "PASS",
            blockerCodes: [],
            evidenceHash: "sha256:policy-runtime",
            source: "what-next/payroll/payroll-immutability-runtime-check.json",
          },
        ],
        redactionPolicy: "payroll-final-release-readiness-pack-redaction",
      },
    },
    freshness: [
      { source: "payroll.period", asOf: "2026-06-26T07:00:00.000Z", status: "fresh", ageHours: 1 },
      { source: "payroll.workbench", asOf: "2026-06-26T07:30:00.000Z", status: "fresh", ageHours: 0.5 },
      { source: "payroll.pilot_cycle_certification", asOf: "2026-06-26T07:55:00.000Z", status: "fresh", ageHours: 0.1 },
      { source: "payroll.final_release_readiness", asOf: "2026-06-26T07:58:00.000Z", status: "fresh", ageHours: 0 },
    ],
    sourceScope: {
      limit: 25,
      employeeSourceReturned: 2,
      paymentEvidenceReturned: 2,
      employeeBalanceReturned: 1,
      employeeCoverageComplete: true,
      paymentEvidenceCoverageComplete: true,
      employeeBalanceCoverageComplete: true,
      sourceServices: ["services/payroll/adapter-operations-read-model.service.ts", "services/payroll/payroll-control.service.ts", "services/payroll/payroll-pilot-cycle-certification.service.ts", "services/payroll/payroll-final-release-readiness.service.ts"],
    },
    workbench: {
      organizationId: "org-1",
      asOf: "2026-06-26T07:30:00.000Z",
      counts: {
        openPeriods: 1,
        calculatedRuns: 1,
        postedRuns: 0,
        releasedPaymentBatches: 0,
        openDeclarations: 1,
        ledgerBlockers: 2,
        reconciliationExceptions: 1,
      },
      queues: {
        recentRuns: [
          {
            id: "run-1",
            runNumber: "PR-2026-06",
            periodName: "June 2026",
            status: "CALCULATED",
            netPayableAmount: "[REDACTED:PAYROLL]",
            currency: "XAF",
            payDate: "2026-06-30T00:00:00.000Z",
            ledgerPostingBatchId: null,
            postedBusinessEventId: null,
            payslipCount: 2,
            paymentBatchCount: 1,
            declarationCount: 1,
            countryPackVersion: "cm-payroll-2026.1",
            countryPackResolutionHash: "sha256:country-pack",
          },
        ],
        paymentBatches: [],
        declarations: [],
        ledgerBlockers: [],
      },
    },
  }
}

function reviewCertificate(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE",
    version: 1,
    status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
    generatedAt: "2026-07-01T09:00:00.000Z",
    countryCode: "CM",
    basePackVersion: "cm-payroll-2026.1",
    basePackHash: "sha256:base-pack",
    proposedPackVersion: "CM-2026.2",
    proposedPackHash: "sha256:proposed-pack",
    computedProposedPackHash: "sha256:proposed-pack",
    proposedPackHashMatches: true,
    targetFamilies: [
      {
        family: "IRPP_PERIOD",
        status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
        proposedCoverageStatus: "READY",
        proposedCapabilityStatus: "READY",
        certificationStatus: "PASS",
        executableScenarioCount: 2,
        passedScenarioCount: 2,
        failedScenarioCount: 0,
        fixtureIds: ["fixture-1"],
        baseRequiredReviewTopics: ["taxableSalaryBase"],
        coveredReviewTopics: ["taxableSalaryBase"],
        missingReviewTopics: [],
        invalidReviewTopics: [],
        reviewEvidenceSourceHashes: ["sha256:legal-source"],
        proposedIssueCodes: [],
        proposedBlockerCode: null,
        proposedBlockerMessage: null,
      },
    ],
    publishValidation: {
      valid: true,
      canPublish: true,
      issueCount: 0,
      issueCodes: [],
      issues: [],
    },
    blockers: [],
    redaction: {
      rawLegalDocumentsIncluded: false,
      rawFormulaSourceDocumentsIncluded: false,
      rawEmployeeDataIncluded: false,
      rawSalaryDataIncluded: false,
    },
    certificateHash: "sha256:intake-certificate",
    ...overrides,
  } as any
}

function recordedReviewCertificate(overrides: Record<string, unknown> = {}) {
  return {
    ...reviewCertificate(overrides),
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: "intake-audit-1",
      entityType: "PayrollCountryPackReviewIntakeCertificate",
      auditAction: "PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE_RECORDED",
    },
  } as any
}

function reviewApproval(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVAL",
    version: 1,
    status: "APPROVED",
    approvedAt: "2026-07-01T09:05:00.000Z",
    organizationRef: "org-1",
    actorRef: "user-1",
    sourceCertificate: {
      auditLogRef: "intake-audit-1",
      certificateHash: "sha256:intake-certificate",
      countryCode: "CM",
      proposedPackVersion: "CM-2026.2",
      proposedPackHash: "sha256:proposed-pack",
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      targetFamilies: ["IRPP_PERIOD"],
    },
    approval: {
      approvalEvidenceHash: "sha256:legal-owner-approval",
      lastAuthAt: "2026-07-01T09:04:00.000Z",
      freshAuthMaxAgeSeconds: 300,
      freshAuthSatisfied: true,
    },
    redaction: {
      rawLegalDocumentsIncluded: false,
      rawFormulaSourceDocumentsIncluded: false,
      rawEmployeeDataIncluded: false,
      rawSalaryDataIncluded: false,
      approvalNotesIncluded: false,
    },
    approvalHash: "sha256:intake-approval",
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: "approval-audit-1",
      entityType: "PayrollCountryPackReviewIntakeApproval",
      auditAction: "PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVED",
    },
    ...overrides,
  } as any
}
describe("PayrollCommandCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEvaluateCountryPackReviewIntake.mockResolvedValue({ success: true, data: reviewCertificate(), error: null, status: 200 })
    mockRecordCountryPackReviewIntake.mockResolvedValue({ success: true, data: recordedReviewCertificate(), error: null, status: 200 })
    mockApproveCountryPackReviewIntake.mockResolvedValue({ success: true, data: reviewApproval(), error: null, status: 200 })
  })

  it("renders command data, service-owned next-action links, pending routes, and proof drawer hashes", () => {
    render(<PayrollCommandCenter data={commandData()} locale="en" />)

    expect(screen.getByRole("heading", { name: "HR, payroll, evidence, and close control" })).toBeInTheDocument()
    expect(screen.getAllByText("PAYROLL_ACTIVE_CONTRACT_GAP").length).toBeGreaterThan(0)
    expect(screen.getByText("[REDACTED:PAYROLL]")).toBeInTheDocument()
    expect(screen.getAllByText("Pending route").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Need access").length).toBeGreaterThan(0)
    expect(screen.getByRole("heading", { name: "Adapter operations" })).toBeInTheDocument()
    expect(screen.getByText("Pilot cert")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Pilot certification gate" })).toBeInTheDocument()
    expect(screen.getAllByText("PR-2026-06").length).toBeGreaterThan(0)
    expect(screen.getAllByText("sha256:proof-backfill-certificate").length).toBeGreaterThan(0)
    expect(screen.getAllByText("READY_FOR_SIGNOFF").length).toBeGreaterThan(0)
    expect(screen.getByRole("heading", { name: "Final release readiness" })).toBeInTheDocument()
    expect(screen.getAllByText("sha256:final-release-pack").length).toBeGreaterThan(0)
    expect(screen.getByText("payroll-final-release-readiness-pack-redaction")).toBeInTheDocument()
    expect(screen.getByText("Statutory setup and country-pack readiness")).toBeInTheDocument()
    expect(screen.getByText("Policy and payroll immutability runtime")).toBeInTheDocument()
    expect(screen.getAllByText("1 blockers").length).toBeGreaterThan(0)
    expect(screen.getByText("Mobile Money CM")).toBeInTheDocument()
    expect(screen.getByText("Provider health")).toBeInTheDocument()
    expect(screen.getByText("Authority executions")).toBeInTheDocument()
    expect(screen.getByText("Payment adapter gaps")).toBeInTheDocument()
    expect(screen.getByText("Chaos release gate")).toBeInTheDocument()
    expect(screen.getByText("payroll-adapter-operations-redacted")).toBeInTheDocument()
    expect(screen.getByText("same_provider_business_date")).toBeInTheDocument()
    expect(screen.getByText("org-1:provider-1:2026-06-30")).toBeInTheDocument()
    expect(screen.getAllByText("Settlement worker").length).toBeGreaterThan(0)
    expect(screen.getAllByText("RETRY_SCHEDULED").length).toBeGreaterThan(0)
    expect(screen.getByText(/sha256:failed-payload/)).toBeInTheDocument()
    expect(screen.getAllByText("PROVIDER_DEAD_LETTER_INBOX").length).toBeGreaterThan(0)
    expect(screen.getAllByText("AUTHORITY_CERTIFICATION_HARNESS_MISSING").length).toBeGreaterThan(0)
    expect(screen.getAllByText("PROVIDER_CERTIFICATION_HARNESS_MISSING").length).toBeGreaterThan(0)
    expect(screen.getAllByText("PAYROLL_ADAPTER_CHAOS_GATE_MISSING").length).toBeGreaterThan(0)
    expect(screen.getAllByText("AUTHORITY_CHAOS_GATE_PROOF_MISSING").length).toBeGreaterThan(0)
    expect(screen.getAllByText("PROVIDER_CHAOS_GATE_PROOF_MISSING").length).toBeGreaterThan(0)

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual(expect.arrayContaining(["/en/dashboard/payroll/contracts", "/en/dashboard/finance/reconciliation", "/en/dashboard/payroll/payments"]))
    expect(hrefs).not.toEqual(expect.arrayContaining(["/en/dashboard/payroll/compensation", "/en/dashboard/payroll/runs", "/en/dashboard/presence"]))

    const proofButtons = screen.getAllByRole("button", { name: "Proof" })
    fireEvent.click(proofButtons[0])

    expect(screen.getByText("Certificate hash")).toBeInTheDocument()
    expect(screen.getByText("sha256:pilot-certificate")).toBeInTheDocument()
    expect(screen.getByText("security-privacy")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.click(proofButtons[1])

    expect(screen.getByText("Country pack hash")).toBeInTheDocument()
    expect(screen.getAllByText("sha256:country-pack").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.click(proofButtons[proofButtons.length - 2])

    expect(screen.getByText("Pack hash")).toBeInTheDocument()
    expect(screen.getAllByText("sha256:final-release-pack").length).toBeGreaterThan(0)
    expect(screen.getByText("Blocker codes")).toBeInTheDocument()
    expect(screen.getByText("FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY")).toBeInTheDocument()
    expect(screen.getByText("Required review topics")).toBeInTheDocument()
    expect(screen.getByText("taxableSalaryBase, bracketsAndRates")).toBeInTheDocument()
    expect(screen.getByText("Country-pack review status")).toBeInTheDocument()
    expect(screen.getByText("Country-pack approval hash")).toBeInTheDocument()
    expect(screen.getAllByText("sha256:country-pack-review-approval").length).toBeGreaterThan(0)
    expect(screen.getByText("Country-pack certificate hash")).toBeInTheDocument()
    expect(screen.getByText("sha256:country-pack-review-certificate")).toBeInTheDocument()
    expect(screen.getByText("Country-pack target families")).toBeInTheDocument()
    expect(screen.getByText("IRPP_PERIOD")).toBeInTheDocument()
    expect(screen.getByText("Country-pack fresh auth")).toBeInTheDocument()
    expect(screen.getByText("Release gate requirements")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.click(proofButtons[proofButtons.length - 1])

    expect(screen.getByText("Raw payloads included")).toBeInTheDocument()
    expect(screen.getByText("Credential secrets included")).toBeInTheDocument()
    expect(screen.getByText("Salary or identity included")).toBeInTheDocument()
    expect(screen.getByText("Worker retry scheduled")).toBeInTheDocument()
    expect(screen.getByText("MOMO-CM worker evidence hashes")).toBeInTheDocument()
    expect(screen.getByText("Chaos gate state")).toBeInTheDocument()
    expect(screen.getByText("Authority chaos missing")).toBeInTheDocument()
    expect(screen.getByText("Provider chaos missing")).toBeInTheDocument()
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(3)
  })

  it("submits country-pack review intake evaluation, recording, and approval actions", async () => {
    const proposedPack = { header: { countryCode: "CM", version: "CM-2026.2" } }
    render(<PayrollCommandCenter data={commandData()} locale="en" />)

    fireEvent.change(screen.getByLabelText("Proposed country-pack JSON"), {
      target: { value: JSON.stringify(proposedPack) },
    })
    fireEvent.change(screen.getByLabelText("Legal reference 1"), {
      target: { value: "CM-DGI-REVIEW-2026" },
    })
    fireEvent.change(screen.getByLabelText("Evidence hash 1"), {
      target: { value: "sha256:legal-source" },
    })
    fireEvent.change(screen.getByLabelText("Reviewer 1"), {
      target: { value: "legal-owner-1" },
    })
    fireEvent.change(screen.getByLabelText("Reviewed on 1"), {
      target: { value: "2026-07-01" },
    })
    fireEvent.change(screen.getByLabelText("Approval evidence hash"), {
      target: { value: "sha256:legal-owner-approval" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Evaluate pack" }))

    await waitFor(() => {
      expect(mockEvaluateCountryPackReviewIntake).toHaveBeenCalledWith(
        expect.objectContaining({
          proposedPack,
          basePackVersion: "cm-payroll-2026.1",
          countryCode: "CM",
          targetFamilies: ["IRPP_PERIOD"],
          reviewTopicEvidence: expect.arrayContaining([
            expect.objectContaining({
              topic: "taxableSalaryBase",
              legalRef: "CM-DGI-REVIEW-2026",
              sourceEvidenceHash: "sha256:legal-source",
              reviewedBy: "legal-owner-1",
              reviewedOn: "2026-07-01",
            }),
          ]),
          generatedAt: expect.any(String),
        }),
      )
    })
    expect(await screen.findByText("sha256:intake-certificate; blockers 0")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Record certificate" }))

    await waitFor(() => {
      expect(mockRecordCountryPackReviewIntake).toHaveBeenCalledWith(
        expect.objectContaining({ proposedPack }),
      )
    })
    expect(await screen.findByText("sha256:intake-certificate; audit intake-audit-1; blockers 0")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Approve certificate" }))

    await waitFor(() => {
      expect(mockApproveCountryPackReviewIntake).toHaveBeenCalledWith({
        expectedCertificateHash: "sha256:intake-certificate",
        approvalEvidenceHash: "sha256:legal-owner-approval",
      })
    })
    expect(await screen.findByText("sha256:intake-approval; audit approval-audit-1")).toBeInTheDocument()
  })

  it("renders fresh-auth denial returned by the country-pack review record action", async () => {
    mockRecordCountryPackReviewIntake.mockResolvedValueOnce({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      correlationId: "corr-fresh-auth",
    })

    render(<PayrollCommandCenter data={commandData()} locale="en" />)

    fireEvent.change(screen.getByLabelText("Proposed country-pack JSON"), {
      target: { value: JSON.stringify({ header: { countryCode: "CM" } }) },
    })
    fireEvent.click(screen.getByRole("button", { name: "Record certificate" }))

    expect(await screen.findByText("FRESH_AUTH_REQUIRED")).toBeInTheDocument()
    expect(screen.getByText("Fresh authentication required")).toBeInTheDocument()
    expect(screen.getByText("corr-fresh-auth")).toBeInTheDocument()
  })
})
