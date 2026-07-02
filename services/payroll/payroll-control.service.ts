import { createHash } from "crypto";
import {
  AccountingPostingPurpose,
  AccountingSourceType,
  ExceptionSeverity,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PayrollAttendanceSnapshotStatus,
  PayrollDeclarationStatus,
  PayrollEmployeeBalanceCaseStatus,
  PayrollEmployeeStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipLineCategory,
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRubriqueKind,
  PayrollRubriqueStatus,
  PayrollRubriqueValueType,
  PayrollRunStatus,
  PayrollRunType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { db } from "@/prisma/db";
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service";
import {
  createLedgerPostingBatch,
  linkAccountingSource,
} from "@/services/accounting/posting.service";
import { getOpenPeriodForDate } from "@/services/accounting/periods.service";
import { getActivePostingRule } from "@/services/accounting/posting-rules.service";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import {
  auditSensitiveActionDecision,
  assertSensitiveActionAllowed,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";
import { getCountryPack } from "@/services/regulatory/country-packs/registry";
import {
  resolveRegulatoryParameter,
  type RegulatoryResolutionResult,
} from "@/services/regulatory/country-packs/resolve";
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";
import {
  evaluateRedaction,
  type RedactionDecision,
} from "@/services/security/redaction-policy.service";
import { assertApprovedPaymentDestinationEvidence } from "./payment-evidence.service";
import { evaluatePayrollTaxRule } from "./payroll-tax-rule-evaluator";
import { resolvePayrollPaymentProviderAdapterContract } from "./payroll-adapter-registry.service";
import {
  buildPayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryScenarioReviewEvidenceSummary,
} from "./payroll-statutory-scenario-coverage.service";

import {
  approveAndPostPayrollRunInputSchema,
  calculatePayrollRunInputSchema,
  createPayrollPeriodInputSchema,
  freezeAttendanceSnapshotInputSchema,
  preparePayrollDeclarationsInputSchema,
  releasePayrollPaymentBatchInputSchema,
  type ApproveAndPostPayrollRunInput,
  type CalculatePayrollRunInput,
  type CreatePayrollPeriodInput,
  type FreezeAttendanceSnapshotInput,
  type PreparePayrollDeclarationsInput,
  type ReleasePayrollPaymentBatchInput,
} from "./payroll-control.schemas";

type DbClient = typeof db | Prisma.TransactionClient;
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0];

type PayrollPostingAmounts = {
  sourceAmount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  netPayableAmount: Prisma.Decimal;
  employeeDeductionAmount: Prisma.Decimal;
  employerChargeAmount: Prisma.Decimal;
};

type PayrollComponentPostingProofStatus = "MATCHED" | "MISSING" | "MISMATCH";

type PayrollComponentProofAmountKey =
  | "grossAmount"
  | "taxableBaseAmount"
  | "socialBaseAmount"
  | "employeePensionContributionAmount"
  | "employerPensionContributionAmount"
  | "familyAllowanceContributionAmount"
  | "occupationalRiskContributionAmount"
  | "incomeTaxWithholdingAmount"
  | "overtimePremiumAmount"
  | "payrollRubriqueGrossAmount"
  | "payrollRubriqueTaxableBaseAmount"
  | "payrollRubriqueSocialBaseAmount"
  | "payrollRubriqueEmployeeDeductionAmount"
  | "payrollRubriqueEmployerChargeAmount"
  | "employeeDeductionAmount"
  | "employerChargeAmount"
  | "netPayableAmount";

type PayrollComponentPostingLine = {
  id: string;
  calculationSnapshot?: Prisma.JsonValue | null;
  grossAmount?: Prisma.Decimal.Value | null;
  taxableBaseAmount?: Prisma.Decimal.Value | null;
  socialBaseAmount?: Prisma.Decimal.Value | null;
  employeeDeductionAmount?: Prisma.Decimal.Value | null;
  employerChargeAmount?: Prisma.Decimal.Value | null;
  netPayableAmount?: Prisma.Decimal.Value | null;
  currency: string;
};

type PayrollComponentPostingProof = {
  proofHash: string;
  status: PayrollComponentPostingProofStatus;
  lineCount: number;
  matchedLineCount: number;
  missingLineCount: number;
  mismatchedLineCount: number;
  blockedStatutoryComponentCount: number;
  lineProofHashes: string[];
  issues: string[];
};

type PayrollCountryPackRegisterProof = {
  proofHash: string;
  status: PayrollComponentPostingProofStatus;
  lineCount: number;
  matchedLineCount: number;
  missingLineCount: number;
  mismatchedLineCount: number;
  lineProofHashes: string[];
  issues: string[];
  countryPackResolutionHash: string | null;
  statutoryScenarioCoverageHash: string | null;
  reviewEvidenceSourceHashes: string[];
  legalRefs: string[];
};

type PayrollComponentReviewStatus =
  | "REVIEWED"
  | "BLOCKED_REQUIRES_EXPERT_REVIEW";

type PayrollComponentMapping = {
  kind: "AQSTOQFLOW_PAYROLL_COMPONENT_MAPPING";
  version: 1;
  payrollRunId: string;
  runNumber: string;
  currency: string;
  reviewStatus: PayrollComponentReviewStatus;
  reviewDefault: "BLOCK_UNTIL_REVIEWED_FIXTURES";
  taxableBaseAmount: string;
  incomeTaxWithholdingAmount: string;
  statutoryPayableAmount: string;
  declarationLiabilityAmount: string;
  incomeTaxCalculationStatus: string | null;
  incomeTaxApplied: boolean;
  incomeTaxWithholdingEnabled: boolean;
  blockedStatutoryComponentCount: number;
  requiredLedgerMappingKeys: string[];
  componentMappingHash: string;
};

type PayrollPaymentPostingStatus = {
  ledgerBatch: {
    id: string;
    status?: LedgerPostingBatchStatus | null;
    errorMessage?: string | null;
  };
  ledgerStatus: "POSTED" | "BLOCKED_PENDING_RULES";
  blockerCode?: string | null;
  blockerMessage?: string | null;
  journalEntryId?: string | null;
  accountingSourceLinkId?: string | null;
};

export type PayrollWorkbenchData = {
  organizationId: string;
  asOf: string;
  counts: {
    openPeriods: number;
    calculatedRuns: number;
    postedRuns: number;
    releasedPaymentBatches: number;
    openDeclarations: number;
    ledgerBlockers: number;
    reconciliationExceptions: number;
  };
  queues: {
    recentRuns: Array<{
      id: string;
      runNumber: string;
      periodName: string;
      status: PayrollRunStatus;
      netPayableAmount: string;
      currency: string;
      payDate: string;
      ledgerPostingBatchId: string | null;
      postedBusinessEventId: string | null;
      payslipCount: number;
      paymentBatchCount: number;
      declarationCount: number;
      countryPackVersion: string;
      countryPackResolutionHash: string;
    }>;
    paymentBatches: Array<{
      id: string;
      batchNumber: string;
      payrollRunId: string;
      runNumber: string;
      status: PayrollPaymentBatchStatus;
      amount: string;
      currency: string;
      method: PaymentMethod;
      paymentDate: string;
      ledgerPostingBatchId: string | null;
      postedBusinessEventId: string | null;
      paymentTransactionId: string | null;
      paymentExceptionId: string | null;
      reconciliationStatus: string | null;
      ledgerStatus: string | null;
      ledgerBlockerCode: string | null;
      ledgerBlockerMessage: string | null;
    }>;
    declarations: Array<{
      id: string;
      payrollRunId: string;
      runNumber: string;
      authority: string;
      declarationType: string;
      status: PayrollDeclarationStatus;
      amount: string;
      currency: string;
      dueDate: string | null;
      countryPackVersion: string;
      countryPackResolutionHash: string;
      expertReviewRequired: boolean;
    }>;
    ledgerBlockers: Array<{
      id: string;
      sourceType: AccountingSourceType;
      sourceId: string;
      postingPurpose: AccountingPostingPurpose;
      status: LedgerPostingBatchStatus;
      errorMessage: string | null;
      createdAt: string;
    }>;
  };
};

type PayrollWorkbenchReadInput = {
  organizationId: string;
  limit?: number;
  actorId?: string | null;
  actorPermissions?: readonly string[];
  moduleDecision?: ModuleEntitlementDecision | null;
};

const payrollDateInputSchema = z.union([z.date(), z.string().trim().min(1)]);

const PAYROLL_PAYMENT_REQUESTER_CANDIDATE_PERMISSIONS = [
  "payroll.payments.request",
] as const;
const PAYROLL_PAYMENT_REQUESTER_CANDIDATE_LIMIT = 25;
const payrollPaymentRequesterCandidatePermissionSet = new Set<string>(
  PAYROLL_PAYMENT_REQUESTER_CANDIDATE_PERMISSIONS,
);
export const payrollRunWorkbenchInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  status: z.nativeEnum(PayrollRunStatus).optional(),
  limit: z.number().int().positive().max(250).default(80),
  now: payrollDateInputSchema.optional(),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
});

export type PayrollRunWorkbenchInput = z.input<
  typeof payrollRunWorkbenchInputSchema
>;

export type PayrollRunWorkbenchData = {
  organizationId: string;
  asOf: string;
  statusFilter: PayrollRunStatus | null;
  redaction: {
    payrollAmounts: {
      allowed: boolean;
      mode: string;
      reasonCode: string;
      policy: string;
      replacement: string;
      requiredPermissions: string[];
    };
    correctionProofIdentifiers: {
      allowed: boolean;
      mode: string;
      reasonCode: string;
      policy: string;
      replacement: string;
      requiredPermissions: string[];
    };
  };
  paymentRequesterCandidates: Array<{
    userId: string;
    displayName: string;
    email: string;
    roleLabels: string[];
    matchedPermissions: string[];
  }>;
  summary: {
    totalRuns: number;
    activeRuns: number;
    postedRuns: number;
    correctionRuns: number;
    returnedRuns: number;
    blockedRuns: number;
    accountingBlockedRuns: number;
    paymentBlockedRuns: number;
    declarationBlockedRuns: number;
    registerProofMissingRuns: number;
    netPayableInScope: string;
    coverageComplete: boolean;
  };
  runs: Array<{
    id: string;
    runNumber: string;
    runType: PayrollRunType;
    status: PayrollRunStatus;
    version: number;
    period: {
      id: string;
      name: string;
      status: PayrollPeriodStatus;
      periodStart: string;
      periodEnd: string;
      payDate: string;
    };
    amounts: {
      grossAmount: string;
      employeeDeductionAmount: string;
      employerChargeAmount: string;
      netPayableAmount: string;
      currency: string;
    };
    country: {
      countryCode: string;
      countryPackVersion: string;
      countryPackSchemaVersion: string;
      countryPackResolutionHash: string;
      countryPackCapabilityStatus: string;
      ruleSetHash: string;
    };
    proof: {
      calculationHash: string;
      attendanceSnapshotHash: string;
      documentHash: string | null;
      evidenceHash: string | null;
      componentRegisterProofHash: string | null;
      payrollComponentMappingHash: string | null;
      registerProofPresent: boolean;
      preparedById: string | null;
      reviewedById: string | null;
      approvedById: string | null;
      emittedById: string | null;
      postedById: string | null;
      approvedAt: string | null;
      emittedAt: string | null;
      postedAt: string | null;
    };
    correction: {
      correctionRun: boolean;
      originalRunId: string | null;
      originalRunNumber: string | null;
      originalRunDocumentHash: string | null;
      originalRunEvidenceHash: string | null;
      originalCalculationHash: string | null;
      correctionEvidenceHash: string | null;
      correctiveRunCount: number;
    };
    accounting: {
      ledgerPostingBatchId: string | null;
      postedBusinessEventId: string | null;
      journalEntryId: string | null;
      accountingSourceLinkId: string | null;
      ledgerBatches: Array<{
        id: string;
        postingPurpose: AccountingPostingPurpose;
        status: LedgerPostingBatchStatus;
        errorMessage: string | null;
        postedAt: string | null;
        createdAt: string;
      }>;
    };
    counts: {
      lines: number;
      payslips: number;
      declarations: number;
      paymentBatches: number;
      employeeBalanceCases: number;
      correctiveRuns: number;
    };
    declarations: Array<{
      id: string;
      authority: string;
      declarationType: string;
      status: PayrollDeclarationStatus;
      amount: string;
      currency: string;
      dueDate: string | null;
      payloadHash: string | null;
      latestEvidenceHash: string | null;
      sourceRegisterHash: string | null;
      automationCapabilityStatus: string | null;
      productionSubmissionSupported: boolean;
    }>;
    paymentBatches: Array<{
      id: string;
      batchNumber: string;
      status: PayrollPaymentBatchStatus;
      method: PaymentMethod;
      amount: string;
      currency: string;
      paymentDate: string;
      ledgerPostingBatchId: string | null;
      postedBusinessEventId: string | null;
      evidenceHash: string | null;
      paymentTransactionId: string | null;
      paymentExceptionId: string | null;
      reconciliationStatus: string | null;
      latestSettlementSourceRegisterHash: string | null;
    }>;
    paymentAllocationCandidates: Array<{
      payslipId: string;
      payslipNumber: string;
      employeeId: string;
      employeeNumber: string | null;
      employeeDisplayName: string | null;
      amount: string;
      currency: string;
      status: PayrollPayslipStatus;
      paymentDestinationProofPresent: boolean;
    }>;
    employeeBalanceCases: Array<{
      id: string;
      caseNumber: string;
      caseType: string;
      status: PayrollEmployeeBalanceCaseStatus;
      outstandingAmount: string;
      currency: string;
      evidenceHash: string;
      ledgerPostingBatchId: string | null;
    }>;
    nextActions: Array<{
      id: string;
      label: string;
      requiredPermission: string;
      requiresFreshAuth: boolean;
      requiresSeparateApprover: boolean;
      href: string | null;
    }>;
    blockers: Array<{
      id: string;
      severity: "info" | "medium" | "high" | "critical";
      title: string;
      detail: string;
      nextAction: string;
    }>;
  }>;
  sourceScope: {
    limit: number;
    returned: number;
    coverageComplete: boolean;
    sourceService: string;
  };
};

type CnpsPensionRates = {
  employee?: number;
  employer?: number;
  monthlyCeilingMinorUnits?: number;
};

type CnpsFamilyAllowanceRates = {
  general?: number;
  agriculture?: number;
  privateEducation?: number;
  paidBy?: "EMPLOYER";
};

type CnpsOccupationalRiskRates = {
  groupA?: number;
  groupB?: number;
  groupC?: number;
  paidBy?: "EMPLOYER";
  classificationRequired?: boolean;
};

type PayrollIncomeTaxRules = {
  productionCalculationSupported?: boolean;
  calculationMode?: string;
  employeeWithholdingRequired?: boolean;
  declarationCode?: string;
  requiredReviewedCoverage?: string[];
};

type CnpsFamilyAllowanceSector =
  | "GENERAL"
  | "AGRICULTURE"
  | "PRIVATE_EDUCATION";
type CnpsOccupationalRiskGroup = "A" | "B" | "C";

type PayrollStatutoryLegalProvenanceEntry = {
  parameterPath: string;
  legalRef: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  verifiedOn: string;
  verifiedBy: string;
  verificationStatus: string;
  capabilityStatus: string;
  resolutionHash: string;
};

type PayrollRoundingPolicy = {
  kind: "AQSTOQFLOW_PAYROLL_ROUNDING_POLICY";
  version: 1;
  mode: "HALF_UP";
  scale: 2;
  amountScale: 2;
  source: "organization_accounting_settings" | "default_accounting_policy";
  roundingPolicyHash: string;
};

type PayrollYearToDatePolicy = {
  kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY";
  version: 1;
  basis: "TENANT_FISCAL_YEAR" | "DEFAULT_CALENDAR_YEAR";
  yearStartMonth: number;
  yearStartDay: number;
  periodStart: string;
  periodEnd: string;
  source: "organization_accounting_settings" | "default_accounting_policy";
  ytdPolicyHash: string;
};

type PayrollCountryPackStatus = {
  countryCode: string;
  countryPackVersion: string;
  countryPackSchemaVersion: string;
  countryPackResolutionHash: string;
  countryPackCapabilityStatus: string;
  cnpsFamilyAllowanceSector: CnpsFamilyAllowanceSector;
  cnpsOccupationalRiskGroup: CnpsOccupationalRiskGroup;
  roundingPolicy: PayrollRoundingPolicy;
  roundingPolicyHash: string;
  yearToDatePolicy: PayrollYearToDatePolicy;
  yearToDatePolicyHash: string;
  legalProvenance: PayrollStatutoryLegalProvenanceEntry[];
  pensionRates: RegulatoryResolutionResult<CnpsPensionRates>;
  familyAllowanceRates: RegulatoryResolutionResult<CnpsFamilyAllowanceRates>;
  occupationalRiskRates: RegulatoryResolutionResult<CnpsOccupationalRiskRates>;
  employerRules: RegulatoryResolutionResult<Record<string, unknown>>;
  incomeTaxRules: RegulatoryResolutionResult<PayrollIncomeTaxRules>;
};

type PayrollStatutoryScenarioCoverageSnapshot = {
  status: "READY" | "BLOCKED" | "UNAVAILABLE";
  countryCode: string;
  packVersion: string;
  coverageHash: string;
  executableScenarioCount: number;
  readyFamilyCount: number;
  requiredFamilyCount: number;
  blockerCodes: string[];
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary;
};

function emptyStatutoryScenarioReviewEvidence(): PayrollStatutoryScenarioReviewEvidenceSummary {
  return {
    presentCount: 0,
    missingCount: 0,
    reviewedBy: [],
    reviewedOn: [],
    legalRefs: [],
    sourceEvidenceHashes: [],
  };
}

function payrollStatutoryScenarioCoverageSnapshot(
  countryPack: PayrollCountryPackStatus,
): PayrollStatutoryScenarioCoverageSnapshot {
  const unavailablePayload = {
    status: "UNAVAILABLE" as const,
    countryCode: countryPack.countryCode,
    packVersion: countryPack.countryPackVersion,
    executableScenarioCount: 0,
    readyFamilyCount: 0,
    requiredFamilyCount: 0,
    blockerCodes: ["PAYROLL_STATUTORY_SCENARIO_COUNTRY_PACK_UNAVAILABLE"],
    reviewEvidence: emptyStatutoryScenarioReviewEvidence(),
  };
  const pack = getCountryPack(
    countryPack.countryCode,
    countryPack.countryPackVersion,
  );

  if (!pack) {
    return {
      ...unavailablePayload,
      coverageHash: prefixedHash(unavailablePayload),
    };
  }

  const summary = buildPayrollStatutoryScenarioCoverageSummary(pack);
  const payload = {
    status: summary.status,
    countryCode: summary.countryCode,
    packVersion: summary.packVersion,
    executableScenarioCount: summary.executableScenarioCount,
    readyFamilyCount: summary.readyFamilyCount,
    requiredFamilyCount: summary.requiredFamilyCount,
    blockerCodes: summary.blockers.map((blocker) => blocker.code).sort(),
    reviewEvidence: summary.reviewEvidence,
  };

  return {
    ...payload,
    coverageHash: prefixedHash(payload),
  };
}

type PayrollCalculationRubriqueAssignment =
  Prisma.PayrollEmployeeRubriqueAssignmentGetPayload<{
    include: { rubrique: true };
  }>;

type PayrollRubriqueFormulaTrace = {
  parameterPath: string;
  calculationMode: string;
  payrollEffect: string;
  componentCode: string | null;
  baseAmount: string;
  rateBps: string | null;
  unitAmount: string | null;
  quantity: string | null;
  floorAmount: string | null;
  capAmount: string | null;
  countryPackVersion: string;
  countryPackSchemaVersion: string;
  countryPackResolutionHash: string;
  legalRef: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  verifiedOn: string;
  verifiedBy: string;
  verificationStatus: string;
  capabilityStatus: string;
};

type PayrollRubriqueComponentCalculation = {
  assignmentId: string;
  rubriqueId: string;
  code: string;
  label: string;
  kind: PayrollRubriqueKind;
  valueType: PayrollRubriqueValueType;
  amount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  taxableBaseAmount: Prisma.Decimal;
  socialBaseAmount: Prisma.Decimal;
  employeeDeductionAmount: Prisma.Decimal;
  employerChargeAmount: Prisma.Decimal;
  netPayableImpactAmount: Prisma.Decimal;
  currency: string;
  evidenceDocumentHashPresent: boolean;
  approvalBusinessEventId: string;
  formulaTrace: PayrollRubriqueFormulaTrace | null;
};

type PayrollAttendancePolicyCalculation = {
  paidMinutes: number;
  attendanceRatio: number;
  overtimePremiumAmount: Prisma.Decimal;
  overtimeTaxableBaseAmount: Prisma.Decimal;
  overtimeSocialBaseAmount: Prisma.Decimal;
  attendancePolicyProvenance: PayrollStatutoryLegalProvenanceEntry[];
};

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function";
}

async function inTransaction<T>(
  client: DbClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (hasTransaction(client)) {
    return client.$transaction((tx) => work(tx));
  }

  return work(client as Prisma.TransactionClient);
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" ? entry : null;
}

function payrollRunCorrectionMetadata(run: {
  runType?: PayrollRunType | string | null;
  originalRunId?: string | null;
  metadata?: unknown;
}) {
  const runRecord = asRecord(run);
  const metadataRecord = asRecord(run.metadata);
  const correction = asRecord(
    metadataRecord.correction ?? runRecord.correction,
  );
  const runType = run.runType
    ? String(run.runType)
    : metadataString(runRecord, "payrollRunType");
  const originalRunId =
    run.originalRunId ??
    metadataString(runRecord, "originalRunId") ??
    metadataString(correction, "originalRunId");
  const correctionRun =
    runType === PayrollRunType.CORRECTION || Boolean(originalRunId);

  if (correctionRun && !originalRunId) {
    throw new BusinessRuleError(
      "Payroll correction evidence requires original run linkage.",
    );
  }

  const base = {
    payrollRunType: runType,
    correctionRun,
  };

  if (!correctionRun) return base;

  const correctionEvidence = {
    originalRunId,
    originalRunNumber:
      metadataString(runRecord, "originalRunNumber") ??
      metadataString(correction, "originalRunNumber"),
    originalRunStatus:
      metadataString(runRecord, "originalRunStatus") ??
      metadataString(correction, "originalRunStatus"),
    originalRunDocumentHash:
      metadataString(runRecord, "originalRunDocumentHash") ??
      metadataString(correction, "originalRunDocumentHash"),
    originalRunEvidenceHash:
      metadataString(runRecord, "originalRunEvidenceHash") ??
      metadataString(correction, "originalRunEvidenceHash"),
    originalCalculationHash:
      metadataString(runRecord, "originalCalculationHash") ??
      metadataString(correction, "originalCalculationHash"),
    correctionEvidenceHash:
      metadataString(runRecord, "correctionEvidenceHash") ??
      metadataString(correction, "correctionEvidenceHash"),
  };
  const missingEvidence = Object.entries(correctionEvidence)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingEvidence.length > 0) {
    throw new BusinessRuleError(
      `Payroll correction evidence requires immutable original run linkage and correction evidence hash. Missing: ${missingEvidence.join(", ")}.`,
    );
  }

  return {
    ...base,
    ...correctionEvidence,
  };
}

function payrollDeclarationCorrectionWorkflow(input: {
  correctionMetadata: ReturnType<typeof payrollRunCorrectionMetadata>;
  declarationLiabilityAmount: Prisma.Decimal;
}) {
  const signedAmount = input.declarationLiabilityAmount.toDecimalPlaces(2);
  const correctionRun = input.correctionMetadata.correctionRun === true;
  const declarationAmount = correctionRun
    ? signedAmount.abs().toDecimalPlaces(2)
    : signedAmount.toDecimalPlaces(2);
  const isCredit = correctionRun && signedAmount.lt(0);
  const isAdditionalLiability = correctionRun && signedAmount.gt(0);
  const isZeroDelta = correctionRun && signedAmount.eq(0);
  const declarationCorrectionMode = !correctionRun
    ? "ORDINARY_DECLARATION"
    : isCredit
      ? "CORRECTION_STATUTORY_CREDIT"
      : isAdditionalLiability
        ? "CORRECTION_ADDITIONAL_LIABILITY"
        : "CORRECTION_ZERO_DELTA";

  return {
    declarationAmount,
    correctionExpertReviewRequired: correctionRun,
    metadata: {
      declarationCorrectionMode,
      declarationSignedAmount: signedAmount.toFixed(2),
      declarationAmount: declarationAmount.toFixed(2),
      declarationPayableAmount: isAdditionalLiability
        ? signedAmount.toFixed(2)
        : "0.00",
      statutoryCreditAmount: isCredit ? declarationAmount.toFixed(2) : "0.00",
      additionalLiabilityAmount: isAdditionalLiability
        ? signedAmount.toFixed(2)
        : "0.00",
      authorityAmendmentRequired: correctionRun,
      authorityLifecycleTransition: correctionRun ? "AMEND" : null,
      manualAuthorityWorkflowOnly: correctionRun,
      correctionDeclarationRequiresAuthorityEvidence: correctionRun,
      correctionDeclarationCreditExpected: isCredit,
      correctionDeclarationAdditionalLiabilityExpected: isAdditionalLiability,
      correctionDeclarationZeroDelta: isZeroDelta,
    },
  };
}

function payrollRunProofMetadata(metadata: unknown) {
  const componentRegisterProofHash = metadataString(
    metadata,
    "componentRegisterProofHash",
  );
  const componentRegisterProofStatus = metadataString(
    metadata,
    "componentRegisterProofStatus",
  );
  const payrollComponentMappingHash = metadataString(
    metadata,
    "payrollComponentMappingHash",
  );
  const payrollComponentMappingStatus = metadataString(
    metadata,
    "payrollComponentMappingStatus",
  );

  if (
    !componentRegisterProofHash ||
    componentRegisterProofStatus !== "MATCHED"
  ) {
    throw new BusinessRuleError(
      "Payroll payment release requires matched statutory component register proof from the posted run.",
    );
  }
  if (!payrollComponentMappingHash || !payrollComponentMappingStatus) {
    throw new BusinessRuleError(
      "Payroll payment release requires payroll component mapping proof from the posted run.",
    );
  }

  return {
    componentRegisterProofHash,
    componentRegisterProofStatus,
    payrollComponentMappingHash,
    payrollComponentMappingStatus,
  };
}

function payrollRoundingPolicyProofMetadata(metadata: unknown) {
  const roundingPolicy = asRecord(asRecord(metadata).roundingPolicy);
  const roundingPolicyHash =
    metadataString(metadata, "roundingPolicyHash") ??
    metadataString(roundingPolicy, "roundingPolicyHash");

  if (!roundingPolicyHash) return {};

  return {
    roundingPolicy,
    roundingPolicyHash,
  };
}

function metadataStringList(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return Array.isArray(entry)
    ? entry.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function payrollYearToDateProofMetadata(metadata: unknown) {
  const metadataRecord = asRecord(metadata);
  const yearToDatePolicy = asRecord(metadataRecord.yearToDatePolicy);
  const yearToDatePolicyHash =
    metadataString(metadataRecord, "yearToDatePolicyHash") ??
    metadataString(yearToDatePolicy, "ytdPolicyHash");
  const yearToDateAccumulatorHashes = metadataStringList(
    metadataRecord,
    "yearToDateAccumulatorHashes",
  ).sort();

  if (!yearToDatePolicyHash && yearToDateAccumulatorHashes.length === 0) {
    return {};
  }

  return {
    yearToDatePolicy,
    yearToDatePolicyHash,
    yearToDateAccumulatorHashes,
  };
}
function payrollPaymentAdapterProofMetadata(input: {
  method: PaymentMethod;
  bankFileHash?: string | null;
  metadata?: unknown;
}) {
  const requestedMetadata = asRecord(input.metadata);
  const adapterContract = resolvePayrollPaymentProviderAdapterContract({
    method: input.method,
    bankFileHash: input.bankFileHash,
    requestedAdapterKey: metadataString(
      requestedMetadata,
      "paymentProviderAdapterKey",
    ),
    requestedStatus:
      metadataString(requestedMetadata, "requestedPaymentAdapterStatus") ??
      metadataString(requestedMetadata, "paymentAdapterStatus"),
    providerCredentialProofHash: metadataString(
      requestedMetadata,
      "providerCredentialProofHash",
    ),
    providerPayloadMappingHash: metadataString(
      requestedMetadata,
      "providerPayloadMappingHash",
    ),
    providerResponseMappingHash: metadataString(
      requestedMetadata,
      "providerResponseMappingHash",
    ),
    providerAdapterRequestHash: metadataString(
      requestedMetadata,
      "providerAdapterRequestHash",
    ),
    providerAdapterResponseHash: metadataString(
      requestedMetadata,
      "providerAdapterResponseHash",
    ),
    providerSettlementReceiptHash: metadataString(
      requestedMetadata,
      "providerSettlementReceiptHash",
    ),
    providerCertificationHarnessHash: metadataString(
      requestedMetadata,
      "providerCertificationHarnessHash",
    ),
    providerIdempotencyKey: metadataString(
      requestedMetadata,
      "providerIdempotencyKey",
    ),
    providerAttempt:
      typeof requestedMetadata.providerAttempt === "number"
        ? requestedMetadata.providerAttempt
        : null,
  });

  if (adapterContract.disbursementFileRequired && !input.bankFileHash) {
    throw new BusinessRuleError(
      "Payroll bank or mobile-money payment release requires disbursement file evidence before provider settlement.",
    );
  }

  const adapterChaosReleaseGateHash = metadataString(
    requestedMetadata,
    "adapterChaosReleaseGateHash",
  );
  if (
    adapterContract.productionPaymentAutomationSupported &&
    !adapterChaosReleaseGateHash
  ) {
    throw new BusinessRuleError(
      "Payroll payment provider automation requires certified adapter chaos release gate proof before release.",
    );
  }

  const proof = {
    kind: "AQSTOQFLOW_PAYROLL_PAYMENT_PROVIDER_ADAPTER_PROOF",
    version: 1,
    method: input.method,
    paymentProviderAdapterKey: adapterContract.paymentProviderAdapterKey,
    paymentAdapterStatus: adapterContract.paymentAdapterStatus,
    paymentAdapterRegistryVersion:
      adapterContract.paymentAdapterRegistryVersion,
    paymentProviderAdapterContractHash:
      adapterContract.paymentProviderAdapterContractHash,
    disbursementFileRequired: adapterContract.disbursementFileRequired,
    paymentDisbursementFileHash: adapterContract.paymentDisbursementFileHash,
    providerCredentialProofHash: adapterContract.providerCredentialProofHash,
    providerPayloadMappingHash: adapterContract.providerPayloadMappingHash,
    providerResponseMappingHash: adapterContract.providerResponseMappingHash,
    providerAdapterRequestHash: adapterContract.providerAdapterRequestHash,
    providerAdapterResponseHash: adapterContract.providerAdapterResponseHash,
    providerSettlementReceiptHash:
      adapterContract.providerSettlementReceiptHash,
    providerCertificationHarnessHash:
      adapterContract.providerCertificationHarnessHash,
    providerIdempotencyKey: adapterContract.providerIdempotencyKey,
    providerAttempt: adapterContract.providerAttempt,
    providerSettlementProofRequired:
      adapterContract.providerSettlementProofRequired,
    productionPaymentAutomationSupported:
      adapterContract.productionPaymentAutomationSupported,
    paymentAdapterRegistryDecision: adapterContract.registryDecision,
    paymentAdapterCertificationBlockers: adapterContract.certificationBlockers,
    paymentAdapterCertificationProofComplete:
      adapterContract.certificationProofComplete,
    adapterChaosReleaseGateHash: adapterChaosReleaseGateHash ?? null,
    acceptedSettlementEvidence: adapterContract.acceptedSettlementEvidence,
    paymentProviderAdapterContract: adapterContract.contract,
  };

  return {
    ...adapterContract,
    adapterChaosReleaseGateHash: adapterChaosReleaseGateHash ?? null,
    paymentAdapterProofHash: prefixedHash(proof),
    paymentAdapterProof: proof,
  };
}

function legalProvenanceEntry<TValue>(
  resolution: RegulatoryResolutionResult<TValue>,
): PayrollStatutoryLegalProvenanceEntry {
  return {
    parameterPath: resolution.parameterPath,
    legalRef: resolution.legalRef,
    effectiveFrom: resolution.effectiveFrom,
    effectiveTo: resolution.effectiveTo,
    verifiedOn: resolution.verifiedOn,
    verifiedBy: resolution.verifiedBy,
    verificationStatus: resolution.verificationStatus,
    capabilityStatus: resolution.capabilityStatus,
    resolutionHash: resolution.resolutionHash,
  };
}

function isLegalProvenanceEntry(
  value: unknown,
): value is PayrollStatutoryLegalProvenanceEntry {
  const entry = asRecord(value);
  return (
    typeof entry.parameterPath === "string" &&
    typeof entry.legalRef === "string" &&
    typeof entry.effectiveFrom === "string" &&
    (typeof entry.effectiveTo === "string" || entry.effectiveTo === null) &&
    typeof entry.verifiedOn === "string" &&
    typeof entry.verifiedBy === "string" &&
    typeof entry.verificationStatus === "string" &&
    typeof entry.capabilityStatus === "string" &&
    typeof entry.resolutionHash === "string"
  );
}

function legalProvenanceFromMetadata(
  metadata: unknown,
): PayrollStatutoryLegalProvenanceEntry[] {
  const countryPackStatus = asRecord(asRecord(metadata).countryPackStatus);
  const entries = countryPackStatus.legalProvenance;
  return Array.isArray(entries) ? entries.filter(isLegalProvenanceEntry) : [];
}

function parseDate(value: Date | string | undefined, fallback = new Date()) {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new BusinessRuleError("Invalid payroll date.");
  return parsed;
}

function decimal2(value: Prisma.Decimal.Value | bigint | null | undefined) {
  return new Prisma.Decimal(
    typeof value === "bigint" ? value.toString() : (value ?? 0),
  ).toDecimalPlaces(2);
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "CAMEROON") return "CM";
  return normalized.length === 2 ? normalized : null;
}

function normalizeCurrency(value?: string | null) {
  return (value || "XAF").trim().toUpperCase();
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function resolvePayrollRoundingPolicy(settings: {
  roundingMode?: string | null;
  roundingScale?: number | null;
} | null | undefined): PayrollRoundingPolicy {
  const rawMode = settings?.roundingMode?.trim().toUpperCase() || "HALF_UP";
  const scale = settings?.roundingScale ?? 2;
  const source: PayrollRoundingPolicy["source"] = settings
    ? "organization_accounting_settings"
    : "default_accounting_policy";

  if (rawMode !== "HALF_UP") {
    throw new BusinessRuleError(
      "Payroll calculation requires HALF_UP rounding policy until additional rounding modes are explicitly certified.",
    );
  }
  if (scale !== 2) {
    throw new BusinessRuleError(
      "Payroll calculation requires a scale-2 rounding policy until additional currency scales are explicitly certified.",
    );
  }

  const payload = {
    kind: "AQSTOQFLOW_PAYROLL_ROUNDING_POLICY" as const,
    version: 1 as const,
    mode: "HALF_UP" as const,
    scale: 2 as const,
    amountScale: 2 as const,
    source,
  };

  return {
    ...payload,
    roundingPolicyHash: prefixedHash(payload),
  };
}

function payrollUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BusinessRuleError(
      "Payroll YTD policy requires a valid fiscal year start month and day.",
    );
  }
  return date;
}

function payrollUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function resolvePayrollYearToDatePolicy(
  settings:
    | {
        fiscalYearStartMonth?: number | null;
        fiscalYearStartDay?: number | null;
      }
    | null
    | undefined,
  effectiveAt: Date,
): PayrollYearToDatePolicy {
  const yearStartMonth = settings?.fiscalYearStartMonth ?? 1;
  const yearStartDay = settings?.fiscalYearStartDay ?? 1;
  const effectiveDay = payrollUtcDay(effectiveAt);
  let start = payrollUtcDate(
    effectiveDay.getUTCFullYear(),
    yearStartMonth,
    yearStartDay,
  );
  if (start.getTime() > effectiveDay.getTime()) {
    start = payrollUtcDate(
      effectiveDay.getUTCFullYear() - 1,
      yearStartMonth,
      yearStartDay,
    );
  }

  const source: PayrollYearToDatePolicy["source"] = settings
    ? "organization_accounting_settings"
    : "default_accounting_policy";
  const payload = {
    kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY" as const,
    version: 1 as const,
    basis: settings
      ? ("TENANT_FISCAL_YEAR" as const)
      : ("DEFAULT_CALENDAR_YEAR" as const),
    yearStartMonth,
    yearStartDay,
    periodStart: start.toISOString(),
    periodEnd: effectiveDay.toISOString(),
    source,
  };

  return {
    ...payload,
    ytdPolicyHash: prefixedHash(payload),
  };
}

const PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS: PayrollComponentProofAmountKey[] = [
  "grossAmount",
  "taxableBaseAmount",
  "socialBaseAmount",
  "employeePensionContributionAmount",
  "employerPensionContributionAmount",
  "familyAllowanceContributionAmount",
  "occupationalRiskContributionAmount",
  "incomeTaxWithholdingAmount",
  "overtimePremiumAmount",
  "payrollRubriqueGrossAmount",
  "payrollRubriqueTaxableBaseAmount",
  "payrollRubriqueSocialBaseAmount",
  "payrollRubriqueEmployeeDeductionAmount",
  "payrollRubriqueEmployerChargeAmount",
  "employeeDeductionAmount",
  "employerChargeAmount",
  "netPayableAmount",
];

const PAYROLL_COMPONENT_PROOF_OPTIONAL_AMOUNT_KEYS =
  new Set<PayrollComponentProofAmountKey>([
    "incomeTaxWithholdingAmount",
    "overtimePremiumAmount",
    "payrollRubriqueGrossAmount",
    "payrollRubriqueTaxableBaseAmount",
    "payrollRubriqueSocialBaseAmount",
    "payrollRubriqueEmployeeDeductionAmount",
    "payrollRubriqueEmployerChargeAmount",
  ]);

const PAYROLL_COMPONENT_PROOF_REQUIRED_AMOUNT_KEYS =
  PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS.filter(
    (key) => !PAYROLL_COMPONENT_PROOF_OPTIONAL_AMOUNT_KEYS.has(key),
  );

type PayrollYearToDateAmountKey =
  | PayrollComponentProofAmountKey
  | "statutoryPayableAmount";

const PAYROLL_YEAR_TO_DATE_AMOUNT_KEYS: PayrollYearToDateAmountKey[] = [
  ...PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS,
  "statutoryPayableAmount",
];

type PayrollYearToDateAmounts = Record<
  PayrollYearToDateAmountKey,
  Prisma.Decimal
>;

type PayrollYearToDatePriorLine = PayrollComponentPostingLine & {
  employeeId: string;
  documentHash?: string | null;
  sourceRunId: string;
  sourceRunNumber: string;
  sourceRunStatus: string;
  sourceRunDocumentHash?: string | null;
  sourcePayDate: string;
};

type PayrollYearToDatePriorRun = {
  id: string;
  runNumber: string;
  status: PayrollRunStatus | string;
  documentHash?: string | null;
  payrollPeriod: {
    payDate: Date;
  };
  lines: Array<{
    id: string;
    employeeId: string;
    calculationSnapshot?: Prisma.JsonValue | null;
    grossAmount?: Prisma.Decimal.Value | null;
    taxableBaseAmount?: Prisma.Decimal.Value | null;
    socialBaseAmount?: Prisma.Decimal.Value | null;
    employeeDeductionAmount?: Prisma.Decimal.Value | null;
    employerChargeAmount?: Prisma.Decimal.Value | null;
    netPayableAmount?: Prisma.Decimal.Value | null;
    currency: string;
    documentHash?: string | null;
  }>;
};

function emptyPayrollYearToDateAmounts(): PayrollYearToDateAmounts {
  return Object.fromEntries(
    PAYROLL_YEAR_TO_DATE_AMOUNT_KEYS.map((key) => [
      key,
      new Prisma.Decimal(0),
    ]),
  ) as PayrollYearToDateAmounts;
}

function payrollYearToDateAmountStrings(amounts: PayrollYearToDateAmounts) {
  return Object.fromEntries(
    PAYROLL_YEAR_TO_DATE_AMOUNT_KEYS.map((key) => [
      key,
      amounts[key].toFixed(2),
    ]),
  ) as Record<PayrollYearToDateAmountKey, string>;
}

function payrollYearToDateLineAmount(
  line: PayrollYearToDatePriorLine,
  key: PayrollYearToDateAmountKey,
) {
  const snapshot = componentSnapshotRecord(line.calculationSnapshot);
  if (key === "statutoryPayableAmount") {
    const componentMapping = componentSnapshotRecord(
      snapshot?.componentMapping,
    );
    return (
      decimalFromUnknown(componentMapping?.statutoryPayableAmount) ??
      decimalFromUnknown(snapshot?.statutoryPayableAmount) ??
      new Prisma.Decimal(0)
    );
  }

  return (
    componentSnapshotDecimal(snapshot, key) ??
    lineComponentDecimal(line, key) ??
    new Prisma.Decimal(0)
  );
}

function payrollYearToDatePriorLinesByEmployeeId(
  runs: PayrollYearToDatePriorRun[],
  employeeIds: string[],
) {
  const grouped = new Map<string, PayrollYearToDatePriorLine[]>(
    employeeIds.map((employeeId) => [employeeId, []]),
  );

  for (const run of runs) {
    for (const line of run.lines ?? []) {
      if (!grouped.has(line.employeeId)) continue;
      grouped.get(line.employeeId)?.push({
        ...line,
        sourceRunId: run.id,
        sourceRunNumber: run.runNumber,
        sourceRunStatus: String(run.status),
        sourceRunDocumentHash: run.documentHash ?? null,
        sourcePayDate: run.payrollPeriod.payDate.toISOString(),
      });
    }
  }

  for (const lines of grouped.values()) {
    lines.sort((a, b) => {
      const byPayDate = a.sourcePayDate.localeCompare(b.sourcePayDate);
      if (byPayDate !== 0) return byPayDate;
      const byRun = a.sourceRunId.localeCompare(b.sourceRunId);
      if (byRun !== 0) return byRun;
      return a.id.localeCompare(b.id);
    });
  }

  return grouped;
}

function buildPayrollYearToDateAccumulatorProof(input: {
  policy: PayrollYearToDatePolicy;
  employeeId: string;
  currency: string;
  currentPeriodId: string;
  currentPayDate: Date;
  correctionRun: boolean;
  priorLines: PayrollYearToDatePriorLine[];
  currentAmounts: PayrollYearToDateAmounts;
}) {
  const priorAmounts = emptyPayrollYearToDateAmounts();
  let missingPriorCalculationSnapshotCount = 0;
  let missingPriorLineDocumentHashCount = 0;
  const priorRunIds = new Set<string>();
  const priorRunDocumentHashes = new Set<string>();
  const priorRunLineDocumentHashes: string[] = [];

  for (const line of input.priorLines) {
    priorRunIds.add(line.sourceRunId);
    if (line.sourceRunDocumentHash) {
      priorRunDocumentHashes.add(line.sourceRunDocumentHash);
    }
    if (line.documentHash) {
      priorRunLineDocumentHashes.push(line.documentHash);
    } else {
      missingPriorLineDocumentHashCount += 1;
    }
    if (!componentSnapshotRecord(line.calculationSnapshot)) {
      missingPriorCalculationSnapshotCount += 1;
    }

    for (const key of PAYROLL_YEAR_TO_DATE_AMOUNT_KEYS) {
      priorAmounts[key] = priorAmounts[key]
        .plus(payrollYearToDateLineAmount(line, key))
        .toDecimalPlaces(2);
    }
  }

  const yearToDateAmounts = emptyPayrollYearToDateAmounts();
  for (const key of PAYROLL_YEAR_TO_DATE_AMOUNT_KEYS) {
    yearToDateAmounts[key] = priorAmounts[key]
      .plus(input.currentAmounts[key])
      .toDecimalPlaces(2);
  }

  const payload = {
    kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_ACCUMULATOR_PROOF" as const,
    version: 1 as const,
    accumulatorBasis:
      "POSTED_PAID_PRIOR_LINES_PLUS_CURRENT_EFFECTIVE_LINE" as const,
    employeeId: input.employeeId,
    currency: input.currency,
    currentPeriodId: input.currentPeriodId,
    currentPayDate: payrollUtcDay(input.currentPayDate).toISOString(),
    correctionRun: input.correctionRun,
    yearToDatePolicyHash: input.policy.ytdPolicyHash,
    policy: input.policy,
    priorLineCount: input.priorLines.length,
    priorRunIds: [...priorRunIds].sort(),
    priorRunDocumentHashes: [...priorRunDocumentHashes].sort(),
    priorRunLineDocumentHashes: priorRunLineDocumentHashes.sort(),
    missingPriorCalculationSnapshotCount,
    missingPriorLineDocumentHashCount,
    priorAmounts: payrollYearToDateAmountStrings(priorAmounts),
    currentAmounts: payrollYearToDateAmountStrings(input.currentAmounts),
    yearToDateAmounts: payrollYearToDateAmountStrings(yearToDateAmounts),
  };

  return {
    ...payload,
    ytdAccumulatorHash: prefixedHash(payload),
  };
}

const PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS = [
  "PAYROLL_GROSS_EXPENSE",
  "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
  "EMPLOYEE_PAYABLES",
  "PAYROLL_WITHHOLDING_PAYABLE",
  "SOCIAL_CONTRIBUTIONS_PAYABLE",
] as const;

const PAYROLL_LEDGER_COMPONENTS_BY_MAPPING_KEY: Record<string, string[]> = {
  PAYROLL_GROSS_EXPENSE: [
    "grossAmount",
    "taxableBaseAmount",
    "overtimePremiumAmount",
    "payrollRubriqueGrossAmount",
  ],
  PAYROLL_EMPLOYER_CHARGE_EXPENSE: [
    "employerPensionContributionAmount",
    "familyAllowanceContributionAmount",
    "occupationalRiskContributionAmount",
    "payrollRubriqueEmployerChargeAmount",
  ],
  EMPLOYEE_PAYABLES: ["netPayableAmount"],
  PAYROLL_WITHHOLDING_PAYABLE: [
    "employeePensionContributionAmount",
    "incomeTaxWithholdingAmount",
    "payrollRubriqueEmployeeDeductionAmount",
    "taxableBaseAmount",
  ],
  SOCIAL_CONTRIBUTIONS_PAYABLE: [
    "employerPensionContributionAmount",
    "familyAllowanceContributionAmount",
    "occupationalRiskContributionAmount",
    "payrollRubriqueEmployerChargeAmount",
  ],
};

function componentSnapshotRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function componentSnapshotDecimal(
  snapshot: Record<string, unknown> | null,
  key: PayrollComponentProofAmountKey,
) {
  const value = snapshot?.[key];
  if (value === null || typeof value === "undefined" || value === "")
    return null;
  if (typeof value !== "string" && typeof value !== "number") return null;

  try {
    return decimal2(value);
  } catch {
    return null;
  }
}

function componentSnapshotString(
  snapshot: Record<string, unknown> | null,
  key: string,
) {
  const value = snapshot?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function lineComponentDecimal(
  line: PayrollComponentPostingLine,
  key: PayrollComponentProofAmountKey,
) {
  switch (key) {
    case "grossAmount":
      return typeof line.grossAmount === "undefined"
        ? null
        : decimal2(line.grossAmount);
    case "taxableBaseAmount":
      return typeof line.taxableBaseAmount === "undefined"
        ? null
        : decimal2(line.taxableBaseAmount);
    case "socialBaseAmount":
      return typeof line.socialBaseAmount === "undefined"
        ? null
        : decimal2(line.socialBaseAmount);
    case "employeeDeductionAmount":
      return typeof line.employeeDeductionAmount === "undefined"
        ? null
        : decimal2(line.employeeDeductionAmount);
    case "employerChargeAmount":
      return typeof line.employerChargeAmount === "undefined"
        ? null
        : decimal2(line.employerChargeAmount);
    case "netPayableAmount":
      return typeof line.netPayableAmount === "undefined"
        ? null
        : decimal2(line.netPayableAmount);
    default:
      return null;
  }
}

function decimalFromUnknown(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  try {
    return decimal2(value);
  } catch {
    return null;
  }
}

function payslipCategoryForRubriqueKind(value: unknown) {
  switch (value) {
    case PayrollRubriqueKind.EARNING:
      return PayrollPayslipLineCategory.EARNING;
    case PayrollRubriqueKind.DEDUCTION:
      return PayrollPayslipLineCategory.EMPLOYEE_DEDUCTION;
    case PayrollRubriqueKind.EMPLOYER_CHARGE:
      return PayrollPayslipLineCategory.EMPLOYER_CHARGE;
    default:
      return PayrollPayslipLineCategory.INFORMATION;
  }
}

function buildPayrollPayslipLines(input: {
  organizationId: string;
  runLineId: string;
  currency: string;
  grossAmount: Prisma.Decimal.Value;
  employeeDeductionAmount: Prisma.Decimal.Value;
  employerChargeAmount: Prisma.Decimal.Value;
  netPayableAmount: Prisma.Decimal.Value;
  calculationSnapshot?: Prisma.JsonValue | null;
}): Prisma.PayrollPayslipLineUncheckedCreateWithoutPayslipInput[] {
  const lines: Prisma.PayrollPayslipLineUncheckedCreateWithoutPayslipInput[] =
    [];
  const pushLine = (line: {
    code: string;
    label: string;
    category: PayrollPayslipLineCategory;
    amount: Prisma.Decimal.Value;
  }) => {
    lines.push({
      organizationId: input.organizationId,
      lineNumber: lines.length + 1,
      code: line.code,
      label: line.label,
      category: line.category,
      amount: decimal2(line.amount),
      currency: input.currency,
      sourceType: "PayrollRunLine",
      sourceId: input.runLineId,
    });
  };

  pushLine({
    code: "GROSS",
    label: "Gross pay",
    category: PayrollPayslipLineCategory.EARNING,
    amount: input.grossAmount,
  });

  const snapshot = componentSnapshotRecord(input.calculationSnapshot);
  const overtimePremiumAmount = componentSnapshotDecimal(
    snapshot,
    "overtimePremiumAmount",
  );
  if (overtimePremiumAmount?.gt(0)) {
    pushLine({
      code: "OVERTIME_PREMIUM",
      label: "Overtime premium",
      category: PayrollPayslipLineCategory.EARNING,
      amount: overtimePremiumAmount,
    });
  }

  const rubriqueComponents = snapshot?.payrollRubriqueComponents;
  if (Array.isArray(rubriqueComponents)) {
    for (const rawComponent of rubriqueComponents) {
      const component = asRecord(rawComponent);
      const amount = decimalFromUnknown(component.amount);
      const code = metadataString(component, "code");
      const label = metadataString(component, "label") ?? code;
      if (!amount || amount.eq(0) || !code || !label) continue;
      pushLine({
        code,
        label,
        category: payslipCategoryForRubriqueKind(component.kind),
        amount,
      });
    }
  }

  pushLine({
    code: "EMPLOYEE_DEDUCTION",
    label: "Employee deductions",
    category: PayrollPayslipLineCategory.EMPLOYEE_DEDUCTION,
    amount: input.employeeDeductionAmount,
  });
  pushLine({
    code: "EMPLOYER_CHARGE",
    label: "Employer charges",
    category: PayrollPayslipLineCategory.EMPLOYER_CHARGE,
    amount: input.employerChargeAmount,
  });
  pushLine({
    code: "NET_PAYABLE",
    label: "Net payable",
    category: PayrollPayslipLineCategory.INFORMATION,
    amount: input.netPayableAmount,
  });

  return lines;
}

function addPayrollComponentIssue(issues: string[], code: string) {
  if (!issues.includes(code)) issues.push(code);
}

function buildPayrollComponentPostingProof(input: {
  payrollRunId: string;
  runNumber: string;
  lines: PayrollComponentPostingLine[];
}): PayrollComponentPostingProof {
  const lineProofs = input.lines.map((line) => {
    const snapshot = componentSnapshotRecord(line.calculationSnapshot);
    const issues: string[] = [];
    const amounts = Object.fromEntries(
      PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS.map((key) => [
        key,
        componentSnapshotDecimal(snapshot, key),
      ]),
    ) as Record<PayrollComponentProofAmountKey, Prisma.Decimal | null>;

    if (!snapshot)
      addPayrollComponentIssue(issues, "missing:calculationSnapshot");
    for (const key of PAYROLL_COMPONENT_PROOF_REQUIRED_AMOUNT_KEYS) {
      if (!amounts[key]) addPayrollComponentIssue(issues, `missing:${key}`);
    }

    for (const key of PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS) {
      const lineAmount = lineComponentDecimal(line, key);
      if (lineAmount && amounts[key] && !lineAmount.equals(amounts[key])) {
        addPayrollComponentIssue(issues, `mismatch:${key}`);
      }
    }

    const incomeTaxCalculationStatus = componentSnapshotString(
      snapshot,
      "incomeTaxCalculationStatus",
    );
    if (!incomeTaxCalculationStatus)
      addPayrollComponentIssue(issues, "missing:incomeTaxCalculationStatus");
    const incomeTaxApplied = snapshot?.incomeTaxApplied === true;
    if (incomeTaxApplied && !amounts.incomeTaxWithholdingAmount) {
      addPayrollComponentIssue(issues, "missing:incomeTaxWithholdingAmount");
    }

    const snapshotCurrency = componentSnapshotString(snapshot, "currency");
    if (!snapshotCurrency) addPayrollComponentIssue(issues, "missing:currency");
    if (snapshotCurrency && snapshotCurrency !== line.currency)
      addPayrollComponentIssue(issues, "mismatch:currency");

    const incomeTaxAmount =
      amounts.incomeTaxWithholdingAmount ?? new Prisma.Decimal(0);
    const rubriqueEmployeeDeductionAmount =
      amounts.payrollRubriqueEmployeeDeductionAmount ?? new Prisma.Decimal(0);
    if (
      amounts.employeePensionContributionAmount &&
      amounts.employeeDeductionAmount
    ) {
      const employeeComponentTotal = amounts.employeePensionContributionAmount
        .plus(incomeTaxAmount)
        .plus(rubriqueEmployeeDeductionAmount)
        .toDecimalPlaces(2);
      if (!employeeComponentTotal.equals(amounts.employeeDeductionAmount)) {
        addPayrollComponentIssue(issues, "mismatch:employeeDeductionAmount");
      }
    }

    if (
      amounts.employerPensionContributionAmount &&
      amounts.familyAllowanceContributionAmount &&
      amounts.occupationalRiskContributionAmount &&
      amounts.employerChargeAmount
    ) {
      const rubriqueEmployerChargeAmount =
        amounts.payrollRubriqueEmployerChargeAmount ?? new Prisma.Decimal(0);
      const employerComponentTotal = amounts.employerPensionContributionAmount
        .plus(amounts.familyAllowanceContributionAmount)
        .plus(amounts.occupationalRiskContributionAmount)
        .plus(rubriqueEmployerChargeAmount)
        .toDecimalPlaces(2);
      if (!employerComponentTotal.equals(amounts.employerChargeAmount)) {
        addPayrollComponentIssue(issues, "mismatch:employerChargeAmount");
      }
    }

    if (
      amounts.grossAmount &&
      amounts.employeeDeductionAmount &&
      amounts.netPayableAmount
    ) {
      const netComponentTotal = amounts.grossAmount
        .minus(amounts.employeeDeductionAmount)
        .toDecimalPlaces(2);
      if (!netComponentTotal.equals(amounts.netPayableAmount)) {
        addPayrollComponentIssue(issues, "mismatch:netPayableAmount");
      }
    }

    const status: PayrollComponentPostingProofStatus = issues.some((issue) =>
      issue.startsWith("missing:"),
    )
      ? "MISSING"
      : issues.length > 0
        ? "MISMATCH"
        : "MATCHED";
    const lineProofHash = prefixedHash({
      kind: "AQSTOQFLOW_PAYROLL_LEDGER_COMPONENT_LINE_PROOF",
      version: 1,
      runLineId: line.id,
      status,
      issues: [...issues].sort(),
      currency: snapshotCurrency ?? line.currency,
      incomeTaxCalculationStatus,
      incomeTaxApplied,
      blockedStatutoryComponentCount: incomeTaxCalculationStatus?.startsWith(
        "BLOCKED",
      )
        ? 1
        : 0,
      components: Object.fromEntries(
        PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS.map((key) => [
          key,
          amounts[key]?.toFixed(2) ?? null,
        ]),
      ),
    });

    return {
      lineId: line.id,
      status,
      issues,
      lineProofHash,
      blockedStatutoryComponentCount: incomeTaxCalculationStatus?.startsWith(
        "BLOCKED",
      )
        ? 1
        : 0,
    };
  });

  const missingLineCount = lineProofs.filter(
    (proof) => proof.status === "MISSING",
  ).length;
  const mismatchedLineCount = lineProofs.filter(
    (proof) => proof.status === "MISMATCH",
  ).length;
  const status: PayrollComponentPostingProofStatus =
    missingLineCount > 0
      ? "MISSING"
      : mismatchedLineCount > 0
        ? "MISMATCH"
        : "MATCHED";
  const lineProofHashes = lineProofs.map((proof) => proof.lineProofHash).sort();
  const issues = lineProofs
    .flatMap((proof) => proof.issues.map((issue) => `${proof.lineId}:${issue}`))
    .sort();

  return {
    proofHash: prefixedHash({
      kind: "AQSTOQFLOW_PAYROLL_LEDGER_COMPONENT_REGISTER_PROOF",
      version: 1,
      payrollRunId: input.payrollRunId,
      runNumber: input.runNumber,
      status,
      lineProofHashes,
      issues,
    }),
    status,
    lineCount: lineProofs.length,
    matchedLineCount: lineProofs.filter((proof) => proof.status === "MATCHED")
      .length,
    missingLineCount,
    mismatchedLineCount,
    blockedStatutoryComponentCount: lineProofs.reduce(
      (total, proof) => total + proof.blockedStatutoryComponentCount,
      0,
    ),
    lineProofHashes,
    issues,
  };
}

function payrollRunStatutoryScenarioCoverageHash(metadata: unknown) {
  const metadataRecord = asRecord(metadata);
  const coverage = asRecord(metadataRecord.statutoryScenarioCoverage);
  return (
    metadataString(metadataRecord, "statutoryScenarioCoverageHash") ??
    metadataString(coverage, "coverageHash")
  );
}

function payrollRunStatutoryReviewEvidence(metadata: unknown) {
  const coverage = asRecord(asRecord(metadata).statutoryScenarioCoverage);
  const reviewEvidence = asRecord(coverage.reviewEvidence);
  return {
    sourceEvidenceHashes: metadataStringList(
      reviewEvidence,
      "sourceEvidenceHashes",
    ).sort(),
    legalRefs: metadataStringList(reviewEvidence, "legalRefs").sort(),
  };
}

function buildPayrollCountryPackRegisterProof(input: {
  payrollRunId: string;
  runNumber: string;
  countryCode: string;
  countryPackVersion: string;
  countryPackSchemaVersion: string;
  countryPackResolutionHash: string;
  countryPackCapabilityStatus: string;
  metadata?: unknown;
  lines: PayrollComponentPostingLine[];
}): PayrollCountryPackRegisterProof {
  const statutoryScenarioCoverageHash = payrollRunStatutoryScenarioCoverageHash(
    input.metadata,
  );
  const reviewEvidence = payrollRunStatutoryReviewEvidence(input.metadata);
  const lineProofs = input.lines.map((line) => {
    const snapshot = componentSnapshotRecord(line.calculationSnapshot);
    const provenance = componentSnapshotRecord(
      snapshot?.countryPackProvenance,
    );
    const issues: string[] = [];

    if (!snapshot) addPayrollComponentIssue(issues, "missing:calculationSnapshot");
    if (!provenance)
      addPayrollComponentIssue(issues, "missing:countryPackProvenance");

    const countryCode =
      componentSnapshotString(provenance, "countryCode") ??
      componentSnapshotString(snapshot, "countryCode");
    const countryPackVersion =
      componentSnapshotString(provenance, "packVersion") ??
      componentSnapshotString(snapshot, "countryPackVersion");
    const countryPackSchemaVersion =
      componentSnapshotString(provenance, "schemaVersion") ??
      componentSnapshotString(snapshot, "countryPackSchemaVersion");
    const countryPackCapabilityStatus =
      componentSnapshotString(provenance, "capabilityStatus") ??
      componentSnapshotString(snapshot, "countryPackCapabilityStatus");
    const countryPackResolutionHash =
      componentSnapshotString(provenance, "resolutionHash") ??
      componentSnapshotString(snapshot, "countryPackResolutionHash");
    const lineStatutoryScenarioCoverageHash = componentSnapshotString(
      provenance,
      "statutoryScenarioCoverageHash",
    );
    const lineStatutoryScenarioCoverageStatus = componentSnapshotString(
      provenance,
      "statutoryScenarioCoverageStatus",
    );
    const roundingPolicyHash =
      componentSnapshotString(provenance, "roundingPolicyHash") ??
      componentSnapshotString(snapshot, "roundingPolicyHash");
    const yearToDatePolicyHash =
      componentSnapshotString(provenance, "yearToDatePolicyHash") ??
      componentSnapshotString(snapshot, "yearToDatePolicyHash");
    const provenanceHash = componentSnapshotString(
      snapshot,
      "countryPackProvenanceHash",
    );
    const computedHash = provenance ? prefixedHash(provenance) : null;

    const requireMatched = (
      actual: string | null,
      expected: string | null | undefined,
      key: string,
    ) => {
      if (!actual) {
        addPayrollComponentIssue(issues, `missing:${key}`);
        return;
      }
      if (expected && actual !== expected) {
        addPayrollComponentIssue(issues, `mismatch:${key}`);
      }
    };

    requireMatched(countryCode, input.countryCode, "countryCode");
    requireMatched(
      countryPackVersion,
      input.countryPackVersion,
      "countryPackVersion",
    );
    requireMatched(
      countryPackSchemaVersion,
      input.countryPackSchemaVersion,
      "countryPackSchemaVersion",
    );
    requireMatched(
      countryPackCapabilityStatus,
      input.countryPackCapabilityStatus,
      "countryPackCapabilityStatus",
    );
    requireMatched(
      countryPackResolutionHash,
      input.countryPackResolutionHash,
      "countryPackResolutionHash",
    );
    requireMatched(
      lineStatutoryScenarioCoverageHash,
      statutoryScenarioCoverageHash,
      "statutoryScenarioCoverageHash",
    );
    if (!lineStatutoryScenarioCoverageStatus)
      addPayrollComponentIssue(issues, "missing:statutoryScenarioCoverageStatus");
    if (!roundingPolicyHash)
      addPayrollComponentIssue(issues, "missing:roundingPolicyHash");
    if (!yearToDatePolicyHash)
      addPayrollComponentIssue(issues, "missing:yearToDatePolicyHash");
    if (!provenanceHash)
      addPayrollComponentIssue(issues, "missing:countryPackProvenanceHash");
    if (provenanceHash && computedHash && provenanceHash !== computedHash) {
      addPayrollComponentIssue(issues, "mismatch:countryPackProvenanceHash");
    }

    const status: PayrollComponentPostingProofStatus = issues.some((issue) =>
      issue.startsWith("missing:"),
    )
      ? "MISSING"
      : issues.length > 0
        ? "MISMATCH"
        : "MATCHED";
    const lineProofHash = prefixedHash({
      kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_LINE_PROOF",
      version: 1,
      runLineId: line.id,
      status,
      issues: [...issues].sort(),
      countryCode,
      countryPackVersion,
      countryPackSchemaVersion,
      countryPackCapabilityStatus,
      countryPackResolutionHash,
      statutoryScenarioCoverageHash: lineStatutoryScenarioCoverageHash,
      statutoryScenarioCoverageStatus: lineStatutoryScenarioCoverageStatus,
      roundingPolicyHash,
      yearToDatePolicyHash,
      provenanceHash,
      computedHash,
    });

    return { lineId: line.id, status, issues, lineProofHash };
  });

  const missingLineCount = lineProofs.filter(
    (proof) => proof.status === "MISSING",
  ).length;
  const mismatchedLineCount = lineProofs.filter(
    (proof) => proof.status === "MISMATCH",
  ).length;
  const status: PayrollComponentPostingProofStatus =
    missingLineCount > 0
      ? "MISSING"
      : mismatchedLineCount > 0
        ? "MISMATCH"
        : "MATCHED";
  const lineProofHashes = lineProofs.map((proof) => proof.lineProofHash).sort();
  const issues = lineProofs
    .flatMap((proof) => proof.issues.map((issue) => `${proof.lineId}:${issue}`))
    .sort();

  return {
    proofHash: prefixedHash({
      kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REGISTER_PROOF",
      version: 1,
      payrollRunId: input.payrollRunId,
      runNumber: input.runNumber,
      status,
      countryPackResolutionHash: input.countryPackResolutionHash,
      statutoryScenarioCoverageHash,
      lineProofHashes,
      issues,
    }),
    status,
    lineCount: lineProofs.length,
    matchedLineCount: lineProofs.filter((proof) => proof.status === "MATCHED")
      .length,
    missingLineCount,
    mismatchedLineCount,
    lineProofHashes,
    issues,
    countryPackResolutionHash: input.countryPackResolutionHash,
    statutoryScenarioCoverageHash,
    reviewEvidenceSourceHashes: reviewEvidence.sourceEvidenceHashes,
    legalRefs: reviewEvidence.legalRefs,
  };
}

function totalComponentAmount(
  lines: PayrollComponentPostingLine[],
  key: PayrollComponentProofAmountKey,
) {
  return lines
    .reduce((total, line) => {
      const snapshot = componentSnapshotRecord(line.calculationSnapshot);
      return total.plus(
        componentSnapshotDecimal(snapshot, key) ?? new Prisma.Decimal(0),
      );
    }, new Prisma.Decimal(0))
    .toDecimalPlaces(2);
}

function incomeTaxCalculationStatusForLines(
  lines: PayrollComponentPostingLine[],
) {
  const statuses = lines
    .map((line) =>
      componentSnapshotString(
        componentSnapshotRecord(line.calculationSnapshot),
        "incomeTaxCalculationStatus",
      ),
    )
    .filter((value): value is string => Boolean(value));
  return statuses.length === 0
    ? null
    : Array.from(new Set(statuses)).sort().join("|");
}

function incomeTaxAppliedForLines(lines: PayrollComponentPostingLine[]) {
  return lines.some(
    (line) =>
      componentSnapshotRecord(line.calculationSnapshot)?.incomeTaxApplied ===
      true,
  );
}

function buildPayrollComponentMapping(input: {
  payrollRunId: string;
  runNumber: string;
  currency: string;
  lines: PayrollComponentPostingLine[];
  componentProof: PayrollComponentPostingProof;
}): PayrollComponentMapping {
  const employeePension = totalComponentAmount(
    input.lines,
    "employeePensionContributionAmount",
  );
  const employerPension = totalComponentAmount(
    input.lines,
    "employerPensionContributionAmount",
  );
  const familyAllowance = totalComponentAmount(
    input.lines,
    "familyAllowanceContributionAmount",
  );
  const occupationalRisk = totalComponentAmount(
    input.lines,
    "occupationalRiskContributionAmount",
  );
  const incomeTaxWithholding = totalComponentAmount(
    input.lines,
    "incomeTaxWithholdingAmount",
  );
  const statutoryPayable = employeePension
    .plus(incomeTaxWithholding)
    .plus(employerPension)
    .plus(familyAllowance)
    .plus(occupationalRisk)
    .toDecimalPlaces(2);
  const declarationLiability = statutoryPayable;
  const incomeTaxCalculationStatus = incomeTaxCalculationStatusForLines(
    input.lines,
  );
  const incomeTaxApplied = incomeTaxAppliedForLines(input.lines);
  const reviewStatus: PayrollComponentReviewStatus =
    input.componentProof.blockedStatutoryComponentCount > 0 ||
    incomeTaxCalculationStatus?.includes("BLOCKED")
      ? "BLOCKED_REQUIRES_EXPERT_REVIEW"
      : "REVIEWED";
  const payload = {
    kind: "AQSTOQFLOW_PAYROLL_COMPONENT_MAPPING" as const,
    version: 1 as const,
    payrollRunId: input.payrollRunId,
    runNumber: input.runNumber,
    currency: normalizeCurrency(input.currency),
    reviewStatus,
    reviewDefault: "BLOCK_UNTIL_REVIEWED_FIXTURES" as const,
    taxableBaseAmount: totalComponentAmount(
      input.lines,
      "taxableBaseAmount",
    ).toFixed(2),
    incomeTaxWithholdingAmount: incomeTaxWithholding.toFixed(2),
    statutoryPayableAmount: statutoryPayable.toFixed(2),
    declarationLiabilityAmount: declarationLiability.toFixed(2),
    incomeTaxCalculationStatus,
    incomeTaxApplied,
    incomeTaxWithholdingEnabled:
      incomeTaxApplied && reviewStatus === "REVIEWED",
    blockedStatutoryComponentCount:
      input.componentProof.blockedStatutoryComponentCount,
    requiredLedgerMappingKeys: [...PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS],
  };

  return {
    ...payload,
    componentMappingHash: prefixedHash(payload),
  };
}

function payrollComponentMappingLineMetadata(input: {
  mappingKey: string | null;
  amountSource: PostingRuleAmountSource;
  componentMapping: PayrollComponentMapping;
}) {
  const normalizedMappingKey = normalizeMappingKey(input.mappingKey);
  const components = normalizedMappingKey
    ? (PAYROLL_LEDGER_COMPONENTS_BY_MAPPING_KEY[normalizedMappingKey] ?? [])
    : [];
  return {
    payrollComponentMappingHash: input.componentMapping.componentMappingHash,
    payrollComponentMappingStatus: input.componentMapping.reviewStatus,
    payrollComponentMappingComponents: components,
    incomeTaxCalculationStatus:
      input.componentMapping.incomeTaxCalculationStatus,
    incomeTaxWithholdingEnabled:
      input.componentMapping.incomeTaxWithholdingEnabled,
    taxableBaseAmount: input.componentMapping.taxableBaseAmount,
    incomeTaxWithholdingAmount:
      input.componentMapping.incomeTaxWithholdingAmount,
    statutoryPayableAmount: input.componentMapping.statutoryPayableAmount,
    declarationLiabilityAmount:
      input.componentMapping.declarationLiabilityAmount,
    payrollComponentMappingLineHash: prefixedHash({
      kind: "AQSTOQFLOW_PAYROLL_COMPONENT_LEDGER_LINE_MAPPING",
      version: 1,
      componentMappingHash: input.componentMapping.componentMappingHash,
      mappingKey: normalizedMappingKey,
      amountSource: input.amountSource,
      components,
    }),
  };
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function assertRegulatorReviewedPayrollResolution(
  resolution: RegulatoryResolutionResult,
  label: string,
) {
  if (
    resolution.verificationStatus !== "EXPERT_REVIEWED" &&
    resolution.verificationStatus !== "REGULATOR_CONFIRMED"
  ) {
    throw new BusinessRuleError(
      `${label} requires EXPERT_REVIEWED or REGULATOR_CONFIRMED country-pack provenance.`,
    );
  }
}

function assertSupportedPayrollResolutionReviewed(
  resolution: RegulatoryResolutionResult,
  label: string,
) {
  if (
    resolution.capabilityStatus === "SUPPORTED" ||
    resolution.capabilityStatus === "SUPPORTED_CERTIFIED"
  ) {
    assertRegulatorReviewedPayrollResolution(resolution, label);
  }
}

function aggregatePayrollCapabilityStatus(statuses: readonly string[]) {
  if (statuses.includes("REQUIRES_EXPERT_REVIEW"))
    return "REQUIRES_EXPERT_REVIEW";
  if (statuses.includes("UNSUPPORTED")) return "UNSUPPORTED";
  if (statuses.includes("PARTIALLY_SUPPORTED")) return "PARTIALLY_SUPPORTED";
  if (
    statuses.length > 0 &&
    statuses.every((status) => status === "SUPPORTED_CERTIFIED")
  ) {
    return "SUPPORTED_CERTIFIED";
  }
  if (
    statuses.length > 0 &&
    statuses.every(
      (status) => status === "SUPPORTED" || status === "SUPPORTED_CERTIFIED",
    )
  ) {
    return "SUPPORTED";
  }
  return statuses[0] ?? "UNKNOWN";
}

function normalizeFamilyAllowanceSector(
  value?: string | null,
): CnpsFamilyAllowanceSector | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "AGRICULTURE") return "AGRICULTURE";
  if (normalized === "PRIVATE_EDUCATION") return "PRIVATE_EDUCATION";
  return null;
}

function normalizeOccupationalRiskGroup(
  value?: string | null,
): CnpsOccupationalRiskGroup | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C"
    ? normalized
    : null;
}

function familyAllowanceRateForSector(
  rates: CnpsFamilyAllowanceRates,
  sector: CnpsFamilyAllowanceSector,
) {
  let rate: unknown;
  switch (sector) {
    case "GENERAL":
      rate = rates.general;
      break;
    case "AGRICULTURE":
      rate = rates.agriculture;
      break;
    case "PRIVATE_EDUCATION":
      rate = rates.privateEducation;
      break;
    default:
      rate = undefined;
  }

  return requireReviewedBpsRate(
    rate,
    `CNPS family allowance rate for sector ${sector}`,
  );
}

function occupationalRiskRateForGroup(
  rates: CnpsOccupationalRiskRates,
  group: CnpsOccupationalRiskGroup,
) {
  let rate: unknown;
  switch (group) {
    case "A":
      rate = rates.groupA;
      break;
    case "B":
      rate = rates.groupB;
      break;
    case "C":
      rate = rates.groupC;
      break;
    default:
      rate = undefined;
  }

  return requireReviewedBpsRate(
    rate,
    `CNPS occupational risk rate for group ${group}`,
  );
}

function requireReviewedBpsRate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") {
    throw new BusinessRuleError(
      `${label} is missing or invalid in the reviewed payroll country pack.`,
    );
  }

  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new BusinessRuleError(
      `${label} is missing or invalid in the reviewed payroll country pack.`,
    );
  }
  return rate;
}

function requirePositiveReviewedAmount(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") {
    throw new BusinessRuleError(
      `${label} is missing or invalid in the reviewed payroll country pack.`,
    );
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new BusinessRuleError(
      `${label} is missing or invalid in the reviewed payroll country pack.`,
    );
  }
  return new Prisma.Decimal(numericValue);
}

function requireSupportedReviewedPayrollPolicy(
  resolution: RegulatoryResolutionResult<Record<string, unknown>>,
  label: string,
) {
  if (
    resolution.capabilityStatus !== "SUPPORTED" &&
    resolution.capabilityStatus !== "SUPPORTED_CERTIFIED"
  ) {
    throw new BusinessRuleError(
      `${label} requires a supported reviewed country-pack policy before payroll calculation.`,
    );
  }
  assertSupportedPayrollResolutionReviewed(resolution, label);
  return resolution;
}

function resolveReviewedPayrollAttendancePolicy(input: {
  countryPack: PayrollCountryPackStatus;
  payDate: Date;
  parameterPath: "payroll.attendance.leave" | "payroll.attendance.overtime";
  purpose: string;
  label: string;
}) {
  const resolution = resolveRegulatoryParameter<Record<string, unknown>>(
    input.parameterPath,
    {
      countryCode: input.countryPack.countryCode,
      date: input.payDate,
      pinnedPackVersion: input.countryPack.countryPackVersion,
      purpose: input.purpose,
      entityProfile: { countryCode: input.countryPack.countryCode },
    },
  );
  return requireSupportedReviewedPayrollPolicy(resolution, input.label);
}

function requirePayrollPolicyMode(
  value: unknown,
  label: string,
  allowedModes: readonly string[],
) {
  const mode = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!allowedModes.includes(mode)) {
    throw new BusinessRuleError(
      `${label} has an unsupported reviewed country-pack calculation mode.`,
    );
  }
  return mode;
}

function calculatePayrollAttendancePolicy(input: {
  countryPack: PayrollCountryPackStatus;
  payDate: Date;
  baseSalary: Prisma.Decimal;
  scheduledMinutes: number;
  workedMinutes: number;
  leaveMinutes: number;
  overtimeMinutes: number;
}): PayrollAttendancePolicyCalculation {
  let paidMinutes = Math.max(0, input.workedMinutes);
  const attendancePolicyProvenance: PayrollStatutoryLegalProvenanceEntry[] = [];
  let overtimePremiumAmount = new Prisma.Decimal(0);
  let overtimeTaxableBaseAmount = new Prisma.Decimal(0);
  let overtimeSocialBaseAmount = new Prisma.Decimal(0);

  if (input.leaveMinutes > 0) {
    const leaveResolution = resolveReviewedPayrollAttendancePolicy({
      countryPack: input.countryPack,
      payDate: input.payDate,
      parameterPath: "payroll.attendance.leave",
      purpose: "PAYROLL_LEAVE_CALCULATION",
      label: "Payroll leave policy",
    });
    const leavePolicy = asRecord(leaveResolution.value);
    const leaveMode = requirePayrollPolicyMode(
      leavePolicy.calculationMode,
      "Payroll leave policy",
      ["PAID_TIME_RATIO", "UNPAID_TIME_RATIO"],
    );
    if (leaveMode === "PAID_TIME_RATIO") {
      paidMinutes += Math.max(0, input.leaveMinutes);
    }
    attendancePolicyProvenance.push(legalProvenanceEntry(leaveResolution));
  }

  const attendanceRatio =
    input.scheduledMinutes > 0
      ? Math.min(1, paidMinutes / input.scheduledMinutes)
      : 1;

  if (input.overtimeMinutes > 0) {
    if (input.scheduledMinutes <= 0) {
      throw new BusinessRuleError(
        "Payroll overtime calculation requires scheduled minutes.",
      );
    }
    const overtimeResolution = resolveReviewedPayrollAttendancePolicy({
      countryPack: input.countryPack,
      payDate: input.payDate,
      parameterPath: "payroll.attendance.overtime",
      purpose: "PAYROLL_OVERTIME_CALCULATION",
      label: "Payroll overtime policy",
    });
    const overtimePolicy = asRecord(overtimeResolution.value);
    requirePayrollPolicyMode(
      overtimePolicy.calculationMode,
      "Payroll overtime policy",
      ["OVERTIME_RATE_BPS"],
    );
    const rateBps = requireReviewedBpsRate(
      overtimePolicy.rateBps,
      "Payroll overtime premium rate",
    );
    const overtimeBase = input.baseSalary
      .times(input.overtimeMinutes)
      .div(input.scheduledMinutes);
    overtimePremiumAmount = overtimeBase
      .times(rateBps)
      .div(10000)
      .toDecimalPlaces(2);
    if (overtimePolicy.taxableBase === true) {
      overtimeTaxableBaseAmount = overtimePremiumAmount;
    }
    if (overtimePolicy.socialBase === true) {
      overtimeSocialBaseAmount = overtimePremiumAmount;
    }
    attendancePolicyProvenance.push(legalProvenanceEntry(overtimeResolution));
  }

  return {
    paidMinutes,
    attendanceRatio,
    overtimePremiumAmount,
    overtimeTaxableBaseAmount,
    overtimeSocialBaseAmount,
    attendancePolicyProvenance,
  };
}

function requireRubriqueAmount(
  value: Prisma.Decimal.Value | null | undefined,
  label: string,
) {
  if (value === null || typeof value === "undefined") {
    throw new BusinessRuleError(
      `${label} is required before payroll calculation.`,
    );
  }
  const amount = decimal2(value);
  if (amount.lt(0)) {
    throw new BusinessRuleError(`${label} cannot be negative.`);
  }
  return amount;
}

function requireRubriqueQuantity(
  value: Prisma.Decimal.Value | null | undefined,
  label: string,
) {
  if (value === null || typeof value === "undefined") {
    throw new BusinessRuleError(
      `${label} is required before payroll calculation.`,
    );
  }
  const quantity = new Prisma.Decimal(value);
  if (quantity.lt(0)) {
    throw new BusinessRuleError(`${label} cannot be negative.`);
  }
  return quantity;
}

function requireRubriqueRateBps(
  value: number | null | undefined,
  label: string,
) {
  if (value === null || typeof value === "undefined") {
    throw new BusinessRuleError(
      `${label} is required before payroll calculation.`,
    );
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new BusinessRuleError(`${label} cannot be negative.`);
  }
  return value;
}

function optionalRubriqueFormulaAmount(value: unknown, label: string) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }
  const amount = decimal2(value as Prisma.Decimal.Value);
  if (amount.lt(0)) {
    throw new BusinessRuleError(`${label} cannot be negative.`);
  }
  return amount;
}

function requireRubriqueFormulaAmount(value: unknown, label: string) {
  const amount = optionalRubriqueFormulaAmount(value, label);
  if (!amount) {
    throw new BusinessRuleError(
      `${label} is required before payroll calculation.`,
    );
  }
  return amount;
}

function normalizeFormulaString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : null;
}

function requireRubriqueFormulaPayrollEffect(
  assignment: PayrollCalculationRubriqueAssignment,
  rule: Record<string, unknown>,
) {
  const effect = normalizeFormulaString(rule.payrollEffect);
  if (
    effect !== PayrollRubriqueKind.EARNING &&
    effect !== PayrollRubriqueKind.DEDUCTION &&
    effect !== PayrollRubriqueKind.EMPLOYER_CHARGE &&
    effect !== PayrollRubriqueKind.INFORMATION
  ) {
    throw new BusinessRuleError(
      `Payroll rubrique ${assignment.rubrique.code} formula requires payrollEffect EARNING, DEDUCTION, EMPLOYER_CHARGE, or INFORMATION.`,
    );
  }
  if (effect !== assignment.rubrique.kind) {
    throw new BusinessRuleError(
      `Payroll rubrique ${assignment.rubrique.code} formula payrollEffect must match the rubrique kind.`,
    );
  }
  return effect;
}

function assertRubriqueFormulaBooleanMatches(
  assignment: PayrollCalculationRubriqueAssignment,
  rule: Record<string, unknown>,
  key: "taxableBase" | "socialBase" | "employerCharge",
  expected: boolean,
) {
  const value = rule[key];
  if (typeof value === "boolean" && value !== expected) {
    throw new BusinessRuleError(
      `Payroll rubrique ${assignment.rubrique.code} formula ${key} must match the rubrique configuration.`,
    );
  }
}

function applyRubriqueFormulaAmountBounds(
  assignment: PayrollCalculationRubriqueAssignment,
  rule: Record<string, unknown>,
  amount: Prisma.Decimal,
) {
  const label = `Payroll rubrique ${assignment.rubrique.code}`;
  const floorAmount = optionalRubriqueFormulaAmount(
    rule.floorAmount,
    `${label} formula floor amount`,
  );
  const capAmount = optionalRubriqueFormulaAmount(
    rule.capAmount,
    `${label} formula cap amount`,
  );
  if (floorAmount && capAmount && capAmount.lt(floorAmount)) {
    throw new BusinessRuleError(
      `${label} formula cap amount cannot be lower than floor amount.`,
    );
  }

  let bounded = amount;
  if (floorAmount && bounded.lt(floorAmount)) bounded = floorAmount;
  if (capAmount && bounded.gt(capAmount)) bounded = capAmount;
  return {
    amount: bounded.toDecimalPlaces(2),
    floorAmount,
    capAmount,
  };
}

function calculatePayrollRubriqueFormulaAmount(input: {
  assignment: PayrollCalculationRubriqueAssignment;
  rateBaseAmount: Prisma.Decimal;
  countryPack: PayrollCountryPackStatus;
  payDate: Date;
}) {
  const { assignment } = input;
  const label = `Payroll rubrique ${assignment.rubrique.code}`;
  const parameterPath = assignment.rubrique.statutoryParameterPath?.trim();
  if (!parameterPath) {
    throw new BusinessRuleError(
      `${label} formula requires a statutory country-pack parameter path before calculation.`,
    );
  }

  const rubriqueCountryCode = normalizeCountryCode(
    assignment.rubrique.countryCode,
  );
  if (
    rubriqueCountryCode &&
    rubriqueCountryCode !== input.countryPack.countryCode
  ) {
    throw new BusinessRuleError(
      `${label} formula country must match the payroll country pack.`,
    );
  }

  const resolution = resolveRegulatoryParameter<Record<string, unknown>>(
    parameterPath,
    {
      countryCode: input.countryPack.countryCode,
      date: input.payDate,
      pinnedPackVersion:
        assignment.rubrique.countryPackVersion ??
        input.countryPack.countryPackVersion,
      purpose: "PAYROLL_RUBRIQUE_FORMULA_CALCULATION",
      entityProfile: {
        countryCode: input.countryPack.countryCode,
      },
    },
  );
  requireSupportedReviewedPayrollPolicy(resolution, `${label} formula`);

  const rule = asRecord(resolution.value);
  const calculationMode = requirePayrollPolicyMode(
    rule.calculationMode,
    `${label} formula`,
    ["FIXED_AMOUNT", "INPUT_AMOUNT", "RATE_BPS", "QUANTITY_RATE"],
  );
  const payrollEffect = requireRubriqueFormulaPayrollEffect(assignment, rule);
  assertRubriqueFormulaBooleanMatches(
    assignment,
    rule,
    "taxableBase",
    assignment.rubrique.taxableBase,
  );
  assertRubriqueFormulaBooleanMatches(
    assignment,
    rule,
    "socialBase",
    assignment.rubrique.socialBase,
  );
  assertRubriqueFormulaBooleanMatches(
    assignment,
    rule,
    "employerCharge",
    assignment.rubrique.employerCharge,
  );

  const componentCode = normalizeFormulaString(rule.componentCode);
  if (
    componentCode &&
    componentCode !== assignment.rubrique.code.toUpperCase()
  ) {
    throw new BusinessRuleError(
      `${label} formula componentCode must match the rubrique code.`,
    );
  }

  let amount: Prisma.Decimal;
  let baseAmount = new Prisma.Decimal(0);
  let rateBps: number | null = null;
  let unitAmount: Prisma.Decimal | null = null;
  let quantity: Prisma.Decimal | null = null;

  if (calculationMode === "FIXED_AMOUNT") {
    amount = requireRubriqueFormulaAmount(
      rule.amount,
      `${label} formula amount`,
    );
  } else if (calculationMode === "INPUT_AMOUNT") {
    amount = requireRubriqueAmount(
      assignment.amount,
      `${label} formula input amount`,
    );
  } else if (calculationMode === "RATE_BPS") {
    baseAmount = input.rateBaseAmount;
    rateBps = requireReviewedBpsRate(rule.rateBps, `${label} formula rate`);
    amount = baseAmount.times(rateBps).div(10000).toDecimalPlaces(2);
  } else {
    quantity = requireRubriqueQuantity(
      assignment.quantity,
      `${label} formula quantity`,
    );
    unitAmount = requireRubriqueFormulaAmount(
      rule.unitAmount,
      `${label} formula unit amount`,
    );
    amount = quantity.times(unitAmount).toDecimalPlaces(2);
  }

  const bounded = applyRubriqueFormulaAmountBounds(assignment, rule, amount);
  return {
    amount: bounded.amount,
    formulaTrace: {
      parameterPath: resolution.parameterPath,
      calculationMode,
      payrollEffect,
      componentCode,
      baseAmount: baseAmount.toFixed(2),
      rateBps: rateBps == null ? null : String(rateBps),
      unitAmount: unitAmount ? unitAmount.toFixed(2) : null,
      quantity: quantity ? quantity.toDecimalPlaces(3).toFixed(3) : null,
      floorAmount: bounded.floorAmount ? bounded.floorAmount.toFixed(2) : null,
      capAmount: bounded.capAmount ? bounded.capAmount.toFixed(2) : null,
      countryPackVersion: resolution.packVersion,
      countryPackSchemaVersion: resolution.schemaVersion,
      countryPackResolutionHash: resolution.resolutionHash,
      legalRef: resolution.legalRef,
      effectiveFrom: resolution.effectiveFrom,
      effectiveTo: resolution.effectiveTo,
      verifiedOn: resolution.verifiedOn,
      verifiedBy: resolution.verifiedBy,
      verificationStatus: resolution.verificationStatus,
      capabilityStatus: resolution.capabilityStatus,
    },
  };
}

function calculatePayrollRubriqueAmount(input: {
  assignment: PayrollCalculationRubriqueAssignment;
  rateBaseAmount: Prisma.Decimal;
  countryPack: PayrollCountryPackStatus;
  payDate: Date;
}) {
  const { assignment } = input;
  const label = `Payroll rubrique ${assignment.rubrique.code}`;
  switch (assignment.rubrique.valueType) {
    case PayrollRubriqueValueType.FIXED_AMOUNT:
      return {
        amount: requireRubriqueAmount(assignment.amount, `${label} amount`),
        formulaTrace: null,
      };
    case PayrollRubriqueValueType.RATE_BPS:
      return {
        amount: input.rateBaseAmount
          .times(requireRubriqueRateBps(assignment.rateBps, `${label} rate`))
          .div(10000)
          .toDecimalPlaces(2),
        formulaTrace: null,
      };
    case PayrollRubriqueValueType.QUANTITY_RATE:
      return {
        amount: requireRubriqueAmount(assignment.amount, `${label} unit amount`)
          .times(
            requireRubriqueQuantity(assignment.quantity, `${label} quantity`),
          )
          .toDecimalPlaces(2),
        formulaTrace: null,
      };
    case PayrollRubriqueValueType.FORMULA_REFERENCE:
      return calculatePayrollRubriqueFormulaAmount(input);
    default:
      throw new BusinessRuleError(`${label} has an unsupported value type.`);
  }
}

function calculatePayrollRubriqueComponents(input: {
  assignments: PayrollCalculationRubriqueAssignment[];
  rateBaseAmount: Prisma.Decimal;
  currency: string;
  countryPack: PayrollCountryPackStatus;
  payDate: Date;
}) {
  const zero = new Prisma.Decimal(0);
  const components: PayrollRubriqueComponentCalculation[] =
    input.assignments.map((assignment) => {
      const rubrique = assignment.rubrique;
      const approvalBusinessEventId =
        assignment.approvalBusinessEventId?.trim();
      if (!approvalBusinessEventId) {
        throw new BusinessRuleError(
          `Payroll rubrique ${rubrique.code} requires approval history before calculation.`,
        );
      }
      if (rubrique.status !== PayrollRubriqueStatus.ACTIVE) {
        throw new BusinessRuleError(
          `Payroll rubrique ${rubrique.code} must be active before calculation.`,
        );
      }
      if (normalizeCurrency(assignment.currency) !== input.currency) {
        throw new BusinessRuleError(
          `Payroll rubrique ${rubrique.code} currency must match the payroll contract currency.`,
        );
      }

      const formulaCalculation = calculatePayrollRubriqueAmount({
        assignment,
        rateBaseAmount: input.rateBaseAmount,
        countryPack: input.countryPack,
        payDate: input.payDate,
      });
      const amount = formulaCalculation.amount;
      const baseSign = rubrique.kind === PayrollRubriqueKind.DEDUCTION ? -1 : 1;
      const grossAmount =
        rubrique.kind === PayrollRubriqueKind.EARNING ? amount : zero;
      const taxableBaseAmount = rubrique.taxableBase
        ? amount.times(baseSign).toDecimalPlaces(2)
        : zero;
      const socialBaseAmount = rubrique.socialBase
        ? amount.times(baseSign).toDecimalPlaces(2)
        : zero;
      const employeeDeductionAmount =
        rubrique.kind === PayrollRubriqueKind.DEDUCTION ? amount : zero;
      const employerChargeAmount =
        rubrique.kind === PayrollRubriqueKind.EMPLOYER_CHARGE ||
        rubrique.employerCharge
          ? amount
          : zero;
      const netPayableImpactAmount =
        rubrique.kind === PayrollRubriqueKind.EARNING
          ? amount
          : rubrique.kind === PayrollRubriqueKind.DEDUCTION
            ? amount.times(-1).toDecimalPlaces(2)
            : zero;

      return {
        assignmentId: assignment.id,
        rubriqueId: rubrique.id,
        code: rubrique.code,
        label: rubrique.payslipLabel ?? rubrique.label,
        kind: rubrique.kind,
        valueType: rubrique.valueType,
        amount,
        grossAmount,
        taxableBaseAmount,
        socialBaseAmount,
        employeeDeductionAmount,
        employerChargeAmount,
        netPayableImpactAmount,
        currency: input.currency,
        evidenceDocumentHashPresent: Boolean(assignment.evidenceDocumentHash),
        approvalBusinessEventId,
        formulaTrace: formulaCalculation.formulaTrace,
      };
    });

  const totals = components.reduce(
    (acc, component) => ({
      grossAmount: acc.grossAmount
        .plus(component.grossAmount)
        .toDecimalPlaces(2),
      taxableBaseAmount: acc.taxableBaseAmount
        .plus(component.taxableBaseAmount)
        .toDecimalPlaces(2),
      socialBaseAmount: acc.socialBaseAmount
        .plus(component.socialBaseAmount)
        .toDecimalPlaces(2),
      employeeDeductionAmount: acc.employeeDeductionAmount
        .plus(component.employeeDeductionAmount)
        .toDecimalPlaces(2),
      employerChargeAmount: acc.employerChargeAmount
        .plus(component.employerChargeAmount)
        .toDecimalPlaces(2),
      netPayableImpactAmount: acc.netPayableImpactAmount
        .plus(component.netPayableImpactAmount)
        .toDecimalPlaces(2),
    }),
    {
      grossAmount: zero,
      taxableBaseAmount: zero,
      socialBaseAmount: zero,
      employeeDeductionAmount: zero,
      employerChargeAmount: zero,
      netPayableImpactAmount: zero,
    },
  );

  const formulaPolicyProvenance = components.flatMap((component) => {
    if (!component.formulaTrace) return [];
    return [
      {
        parameterPath: component.formulaTrace.parameterPath,
        legalRef: component.formulaTrace.legalRef,
        effectiveFrom: component.formulaTrace.effectiveFrom,
        effectiveTo: component.formulaTrace.effectiveTo,
        verifiedOn: component.formulaTrace.verifiedOn,
        verifiedBy: component.formulaTrace.verifiedBy,
        verificationStatus: component.formulaTrace.verificationStatus,
        capabilityStatus: component.formulaTrace.capabilityStatus,
        resolutionHash: component.formulaTrace.countryPackResolutionHash,
      },
    ];
  });

  return { components, formulaPolicyProvenance, ...totals };
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string | null;
    changes?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: input.changes ?? undefined,
    },
  });
}

async function writePayrollWorkbenchReadAudit(
  client: DbClient,
  input: {
    organizationId: string;
    actorId?: string | null;
    amountDecision: RedactionDecision;
    returnedRunCount: number;
    returnedPaymentBatchCount: number;
    returnedDeclarationCount: number;
  },
) {
  return client.auditLog.create({
    data: {
      entityType: "PayrollWorkbench",
      entityId: input.organizationId,
      action: "PAYROLL_WORKBENCH_SALARY_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        amountAccess: {
          allowed: input.amountDecision.allowed,
          mode: input.amountDecision.mode,
          reasonCode: input.amountDecision.reasonCode,
          policy: input.amountDecision.policy,
          requiredPermissions: input.amountDecision.requiredPermissions,
        },
        returnedRecordCounts: {
          recentRuns: input.returnedRunCount,
          paymentBatches: input.returnedPaymentBatchCount,
          declarations: input.returnedDeclarationCount,
        },
      }),
    },
  });
}

function payrollAmountForReadModel(
  amount: Prisma.Decimal.Value | bigint | null | undefined,
  decision: RedactionDecision,
) {
  if (!decision.allowed) return decision.replacement;
  return decimal2(amount).toFixed(2);
}

function assertIdempotencyPayloadMatches(
  metadata: unknown,
  requestPayloadHash: string | null,
  message: string,
) {
  if (!requestPayloadHash) return;
  const existingPayloadHash = metadataString(
    metadata,
    "idempotencyPayloadHash",
  );
  if (existingPayloadHash && existingPayloadHash !== requestPayloadHash) {
    throw new ConflictError(message);
  }
}

async function resolvePayrollCountryPackStatus(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    countryCode?: string | null;
    effectiveAt: Date;
  },
): Promise<PayrollCountryPackStatus> {
  const organization = await tx.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: {
      country: true,
      countryCode: true,
      accountingSettings: {
        select: {
          countryPack: true,
          taxRegime: true,
          roundingMode: true,
          roundingScale: true,
          fiscalYearStartMonth: true,
          fiscalYearStartDay: true,
          payrollCnpsFamilyAllowanceSector: true,
          payrollCnpsOccupationalRiskGroup: true,
        },
      },
    },
  });

  const countryCode =
    normalizeCountryCode(input.countryCode) ??
    normalizeCountryCode(organization?.countryCode) ??
    normalizeCountryCode(organization?.country);
  if (!countryCode) {
    throw new BusinessRuleError(
      "Organization country is required before payroll country-pack calculation.",
    );
  }

  const cnpsFamilyAllowanceSector = normalizeFamilyAllowanceSector(
    organization?.accountingSettings?.payrollCnpsFamilyAllowanceSector,
  );
  if (!cnpsFamilyAllowanceSector) {
    throw new BusinessRuleError(
      "Payroll CNPS family allowance sector is required before Cameroon payroll calculation.",
    );
  }

  const cnpsOccupationalRiskGroup = normalizeOccupationalRiskGroup(
    organization?.accountingSettings?.payrollCnpsOccupationalRiskGroup,
  );
  if (!cnpsOccupationalRiskGroup) {
    throw new BusinessRuleError(
      "Payroll CNPS occupational risk group is required before Cameroon payroll calculation.",
    );
  }

  const context = {
    countryCode,
    date: input.effectiveAt,
    pinnedPackVersion:
      organization?.accountingSettings?.countryPack ?? undefined,
    entityProfile: {
      countryCode,
      taxRegime: organization?.accountingSettings?.taxRegime ?? null,
      payrollRiskGroup: cnpsOccupationalRiskGroup,
    },
  };

  const pensionRates = resolveRegulatoryParameter<CnpsPensionRates>(
    "payroll.cnps.pensionRatesBps",
    {
      ...context,
      purpose: "PAYROLL_CNPS_PENSION",
    },
  );
  const familyAllowanceRates =
    resolveRegulatoryParameter<CnpsFamilyAllowanceRates>(
      "payroll.cnps.familyAllowanceRatesBps",
      {
        ...context,
        purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE",
      },
    );
  const occupationalRiskRates =
    resolveRegulatoryParameter<CnpsOccupationalRiskRates>(
      "payroll.cnps.occupationalRiskRatesBps",
      {
        ...context,
        purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK",
      },
    );
  const employerRules = resolveRegulatoryParameter<Record<string, unknown>>(
    "payroll.cnps.employerRules",
    {
      ...context,
      purpose: "PAYROLL_EMPLOYER_RULES",
    },
  );
  const incomeTaxRules = resolveRegulatoryParameter<PayrollIncomeTaxRules>(
    "payroll.irpp.incomeTaxRules",
    {
      ...context,
      purpose: "PAYROLL_IRPP_INCOME_TAX",
    },
  );

  assertRegulatorReviewedPayrollResolution(pensionRates, "CNPS pension rates");
  assertRegulatorReviewedPayrollResolution(
    familyAllowanceRates,
    "CNPS family allowance rates",
  );
  assertRegulatorReviewedPayrollResolution(
    occupationalRiskRates,
    "CNPS occupational risk rates",
  );
  assertRegulatorReviewedPayrollResolution(
    employerRules,
    "CNPS employer rules",
  );
  assertSupportedPayrollResolutionReviewed(
    incomeTaxRules,
    "IRPP income-tax rules",
  );

  const legalProvenance = [
    legalProvenanceEntry(pensionRates),
    legalProvenanceEntry(familyAllowanceRates),
    legalProvenanceEntry(occupationalRiskRates),
    legalProvenanceEntry(employerRules),
    legalProvenanceEntry(incomeTaxRules),
  ];
  const countryPackCapabilityStatus = aggregatePayrollCapabilityStatus(
    legalProvenance.map((entry) => entry.capabilityStatus),
  );
  const roundingPolicy = resolvePayrollRoundingPolicy(
    organization?.accountingSettings,
  );
  const yearToDatePolicy = resolvePayrollYearToDatePolicy(
    organization?.accountingSettings,
    input.effectiveAt,
  );

  return {
    countryCode,
    countryPackVersion: pensionRates.packVersion,
    countryPackSchemaVersion: pensionRates.schemaVersion,
    countryPackResolutionHash: prefixedHash({
      pensionRates: pensionRates.resolutionHash,
      familyAllowanceRates: familyAllowanceRates.resolutionHash,
      occupationalRiskRates: occupationalRiskRates.resolutionHash,
      employerRules: employerRules.resolutionHash,
      incomeTaxRules: incomeTaxRules.resolutionHash,
      roundingPolicyHash: roundingPolicy.roundingPolicyHash,
      yearToDatePolicyHash: yearToDatePolicy.ytdPolicyHash,
      cnpsFamilyAllowanceSector,
      cnpsOccupationalRiskGroup,
    }),
    countryPackCapabilityStatus,
    cnpsFamilyAllowanceSector,
    cnpsOccupationalRiskGroup,
    roundingPolicy,
    roundingPolicyHash: roundingPolicy.roundingPolicyHash,
    yearToDatePolicy,
    yearToDatePolicyHash: yearToDatePolicy.ytdPolicyHash,
    legalProvenance,
    pensionRates,
    familyAllowanceRates,
    occupationalRiskRates,
    employerRules,
    incomeTaxRules,
  };
}

async function nextPayrollRunNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  runDate: Date,
) {
  const prefix = `PAY-${compactDate(runDate)}`;
  const count = await tx.payrollRun.count({
    where: {
      organizationId,
      runNumber: { startsWith: prefix },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function nextPayrollEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = `PAYJ-${compactDate(entryDate)}`;
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: prefix },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

function conditionMatches(
  condition: Prisma.JsonValue | null | undefined,
  context: Record<string, unknown>,
) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition))
    return true;

  return Object.entries(condition as Record<string, unknown>).every(
    ([key, expected]) => {
      const actual = context[key];
      if (Array.isArray(expected)) return expected.includes(actual);
      return actual === expected;
    },
  );
}

function amountForSource(
  source: PostingRuleAmountSource,
  amounts: PayrollPostingAmounts,
) {
  switch (source) {
    case PostingRuleAmountSource.FIXED:
      return new Prisma.Decimal(1);
    case PostingRuleAmountSource.SOURCE_AMOUNT:
      return amounts.sourceAmount;
    case PostingRuleAmountSource.GROSS_AMOUNT:
      return amounts.grossAmount;
    case PostingRuleAmountSource.NET_PAYABLE_AMOUNT:
      return amounts.netPayableAmount;
    case PostingRuleAmountSource.EMPLOYEE_DEDUCTION_AMOUNT:
      return amounts.employeeDeductionAmount;
    case PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT:
      return amounts.employerChargeAmount;
    default:
      return new Prisma.Decimal(0);
  }
}

async function createPayrollLedgerPosting(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId: string;
    payrollRunId: string;
    runNumber: string;
    entryDate: Date;
    actorId: string;
    currency: string;
    documentHash: string;
    amounts: PayrollPostingAmounts;
    metadata: Record<string, unknown>;
  },
) {
  const rule = await getActivePostingRule(
    input.organizationId,
    {
      sourceType: AccountingSourceType.PAYROLL_RUN,
      postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      effectiveAt: input.entryDate,
    },
    tx,
  );

  if (!rule) {
    throw new BusinessRuleError(
      "Payroll posting requires configured SYSCOHADA payroll posting rules.",
    );
  }

  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: JournalType.PAYROLL,
      isDefault: true,
      isActive: true,
    },
    select: { id: true, code: true },
  });
  if (!journal) {
    throw new BusinessRuleError(
      "Payroll posting requires an active default payroll journal.",
    );
  }

  const mappingKeys = rule.lines
    .map((line) => normalizeMappingKey(line.mappingKey))
    .filter(Boolean) as string[];
  const mappedAccounts = mappingKeys.length
    ? await tx.chartOfAccount.findMany({
        where: {
          organizationId: input.organizationId,
          mappingKey: { in: Array.from(new Set(mappingKeys)) },
          deletedAt: null,
          isActive: true,
        },
        include: { _count: { select: { children: true } } },
      })
    : [];
  const accountByMapping = new Map(
    mappedAccounts.map((account) => [
      normalizeMappingKey(account.mappingKey),
      account,
    ]),
  );

  const postingLines = rule.lines
    .filter((line) => conditionMatches(line.condition, input.metadata))
    .map((line) => {
      const account =
        line.account ??
        accountByMapping.get(normalizeMappingKey(line.mappingKey));
      if (!account) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} line ${line.lineNumber} does not resolve to an account.`,
        );
      }
      if (!account.isActive || account.deletedAt) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} account ${account.code} is not active.`,
        );
      }
      const childCount =
        "_count" in account
          ? Number(
              (account as { _count?: { children?: number } })._count
                ?.children ?? 0,
            )
          : 0;
      if (childCount > 0) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} account ${account.code} must be a leaf account.`,
        );
      }

      const signedAmount = amountForSource(line.amountSource, input.amounts)
        .times(new Prisma.Decimal(line.multiplier ?? 1))
        .toDecimalPlaces(2);
      const correctionReversal =
        signedAmount.lt(0) && asRecord(input.metadata).correctionRun === true;
      if (signedAmount.lt(0) && !correctionReversal) {
        throw new BusinessRuleError(
          `Payroll posting rule ${rule.code} line ${line.lineNumber} produced a negative amount.`,
        );
      }
      const amount = signedAmount.abs().toDecimalPlaces(2);
      if (amount.eq(0)) return null;
      const postingSide = correctionReversal
        ? line.side === PostingRuleLineSide.DEBIT
          ? PostingRuleLineSide.CREDIT
          : PostingRuleLineSide.DEBIT
        : line.side;

      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description ?? `Payroll run ${input.runNumber}`,
        debit:
          postingSide === PostingRuleLineSide.DEBIT
            ? amount
            : new Prisma.Decimal(0),
        credit:
          postingSide === PostingRuleLineSide.CREDIT
            ? amount
            : new Prisma.Decimal(0),
        mappingKey: normalizeMappingKey(line.mappingKey),
        amountSource: line.amountSource,
        signedAmount,
        correctionReversal,
      };
    })
    .filter(Boolean) as Array<{
    accountId: string;
    lineNumber: number;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    mappingKey: string | null;
    amountSource: PostingRuleAmountSource;
    signedAmount: Prisma.Decimal;
    correctionReversal: boolean;
  }>;

  const debitTotal = postingLines
    .reduce((total, line) => total.plus(line.debit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  const creditTotal = postingLines
    .reduce((total, line) => total.plus(line.credit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  if (!debitTotal.eq(creditTotal)) {
    throw new BusinessRuleError(
      `Payroll posting rule ${rule.code} is not balanced: debit ${debitTotal.toFixed(2)} credit ${creditTotal.toFixed(2)}.`,
    );
  }

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: input.payrollRunId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      idempotencyKey: `payroll-run:${input.payrollRunId}:posting`,
      metadata: safeJson({
        runNumber: input.runNumber,
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
    tx,
  );

  const postedAt = new Date();
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.POSTED,
      postedAt,
      errorMessage: null,
    },
  });
  const componentRegisterProofHash = metadataString(
    input.metadata,
    "componentRegisterProofHash",
  );
  const componentRegisterProofStatus = metadataString(
    input.metadata,
    "componentRegisterProofStatus",
  );
  const payrollComponentMapping = asRecord(input.metadata)
    .payrollComponentMapping as PayrollComponentMapping | undefined;
  const payrollComponentMappingHash = metadataString(
    input.metadata,
    "payrollComponentMappingHash",
  );
  const payrollComponentMappingStatus = metadataString(
    input.metadata,
    "payrollComponentMappingStatus",
  );
  const correctionMetadata = payrollRunCorrectionMetadata(input.metadata);

  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: input.periodId,
      postingBatchId: postedBatch.id,
      entryNumber: await nextPayrollEntryNumber(
        tx,
        input.organizationId,
        input.entryDate,
      ),
      entryDate: input.entryDate,
      status: JournalEntryStatus.POSTED,
      currency: normalizeCurrency(input.currency),
      memo: `Payroll run ${input.runNumber}`,
      reference: input.runNumber,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: input.payrollRunId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
      postedAt,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: postingLines.map((line) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: normalizeCurrency(input.currency),
          baseDebit: line.debit,
          baseCredit: line.credit,
          metadata: safeJson({
            mappingKey: line.mappingKey,
            amountSource: line.amountSource,
            signedAmount: line.signedAmount.toFixed(2),
            correctionReversal: line.correctionReversal,
            payrollRunId: input.payrollRunId,
            ...correctionMetadata,
            componentRegisterProofHash,
            componentRegisterProofStatus,
            payrollComponentMappingHash,
            payrollComponentMappingStatus,
            ...(payrollComponentMapping
              ? payrollComponentMappingLineMetadata({
                  mappingKey: line.mappingKey,
                  amountSource: line.amountSource,
                  componentMapping: payrollComponentMapping,
                })
              : {}),
          }),
        })),
      },
    },
    include: { lines: true },
  });

  const sourceLink = await linkAccountingSource(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: input.payrollRunId,
      sourceNumber: input.runNumber,
      sourceDate: input.entryDate,
      metadata: safeJson({
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
    tx,
  );

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "PAYROLL_RUN_POSTED",
      resourceType: "PayrollRun",
      resourceId: input.payrollRunId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `Payroll run ${input.runNumber} posted`,
      metadata: safeJson({
        runNumber: input.runNumber,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
        ruleCode: rule.code,
        documentHash: input.documentHash,
        ...correctionMetadata,
        componentRegisterProofHash,
        componentRegisterProofStatus,
        payrollComponentMappingHash,
        payrollComponentMappingStatus,
      }),
    },
  });

  return {
    ledgerBatch: postedBatch,
    journalEntry,
    accountingSourceLinkId: sourceLink.id,
  };
}

async function createPayrollLedgerBlocker(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId?: string | null;
    sourceType: AccountingSourceType;
    sourceId: string;
    postingPurpose: AccountingPostingPurpose;
    actorId?: string | null;
    documentHash?: string | null;
    blockerCode: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      idempotencyKey: `${input.sourceType}:${input.sourceId}:${input.postingPurpose}:blocked`,
      metadata: safeJson({
        blockerCode: input.blockerCode,
        documentHash: input.documentHash ?? null,
        details: input.metadata ?? null,
      }),
    },
    tx,
  );

  const blocked = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.FAILED,
      errorMessage: input.message,
      metadata: safeJson({
        blockerCode: input.blockerCode,
        documentHash: input.documentHash ?? null,
        details: input.metadata ?? null,
      }),
    },
  });

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: "PAYROLL_LEDGER_BLOCKED",
      resourceType: "LedgerPostingBatch",
      resourceId: blocked.id,
      postingBatchId: blocked.id,
      message: input.message,
      metadata: safeJson({
        blockerCode: input.blockerCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        postingPurpose: input.postingPurpose,
        documentHash: input.documentHash ?? null,
      }),
    },
  });

  return blocked;
}

async function nextPayrollPaymentBatchNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  paymentDate: Date,
) {
  const prefix = `PAYB-${compactDate(paymentDate)}`;
  const count = await tx.payrollPaymentBatch.count({
    where: {
      organizationId,
      batchNumber: { startsWith: prefix },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function createPayrollPaymentLedgerPosting(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    periodId: string;
    payrollPaymentBatchId: string;
    batchNumber: string;
    paymentDate: Date;
    actorId: string;
    currency: string;
    method: PaymentMethod;
    documentHash: string;
    amount: Prisma.Decimal;
    metadata: Record<string, unknown>;
  },
): Promise<PayrollPaymentPostingStatus> {
  const rule = await getActivePostingRule(
    input.organizationId,
    {
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      effectiveAt: input.paymentDate,
    },
    tx,
  );

  if (!rule) {
    const ledgerBatch = await createPayrollLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "PAYROLL_PAYMENT_POSTING_RULE_MISSING",
      message:
        "Payroll payment release requires configured SYSCOHADA payroll payment posting rules.",
      metadata: safeJson(input.metadata),
    });

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "PAYROLL_PAYMENT_POSTING_RULE_MISSING",
      blockerMessage: ledgerBatch.errorMessage,
    };
  }

  const journalType =
    input.method === PaymentMethod.CASH ? JournalType.CASH : JournalType.BANK;
  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: journalType,
      isDefault: true,
      isActive: true,
    },
    select: { id: true, code: true },
  });

  if (!journal) {
    const message = `Payroll payment requires an active default ${journalType} journal.`;
    const ledgerBatch = await createPayrollLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "PAYROLL_PAYMENT_DEFAULT_JOURNAL_MISSING",
      message,
      metadata: safeJson({ ...input.metadata, journalType }),
    });

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "PAYROLL_PAYMENT_DEFAULT_JOURNAL_MISSING",
      blockerMessage: message,
    };
  }

  const mappingKeys = rule.lines
    .map((line) => normalizeMappingKey(line.mappingKey))
    .filter(Boolean) as string[];
  const mappedAccounts = mappingKeys.length
    ? await tx.chartOfAccount.findMany({
        where: {
          organizationId: input.organizationId,
          mappingKey: { in: Array.from(new Set(mappingKeys)) },
          deletedAt: null,
          isActive: true,
        },
        include: { _count: { select: { children: true } } },
      })
    : [];
  const accountByMapping = new Map(
    mappedAccounts.map((account) => [
      normalizeMappingKey(account.mappingKey),
      account,
    ]),
  );
  const amounts: PayrollPostingAmounts = {
    sourceAmount: input.amount,
    grossAmount: input.amount,
    netPayableAmount: input.amount,
    employeeDeductionAmount: new Prisma.Decimal(0),
    employerChargeAmount: new Prisma.Decimal(0),
  };

  const postingLines = rule.lines
    .filter((line) =>
      conditionMatches(line.condition, { paymentMethod: input.method }),
    )
    .map((line) => {
      const account =
        line.account ??
        accountByMapping.get(normalizeMappingKey(line.mappingKey));
      if (!account) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} line ${line.lineNumber} does not resolve to an account.`,
        );
      }
      if (!account.isActive || account.deletedAt) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} account ${account.code} is not active.`,
        );
      }
      const childCount =
        "_count" in account
          ? Number(
              (account as { _count?: { children?: number } })._count
                ?.children ?? 0,
            )
          : 0;
      if (childCount > 0) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} account ${account.code} must be a leaf account.`,
        );
      }

      const amount = amountForSource(line.amountSource, amounts)
        .times(new Prisma.Decimal(line.multiplier ?? 1))
        .toDecimalPlaces(2);
      if (amount.lt(0)) {
        throw new BusinessRuleError(
          `Payroll payment rule ${rule.code} line ${line.lineNumber} produced a negative amount.`,
        );
      }
      if (amount.eq(0)) return null;

      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description ?? `Payroll payment ${input.batchNumber}`,
        debit:
          line.side === PostingRuleLineSide.DEBIT
            ? amount
            : new Prisma.Decimal(0),
        credit:
          line.side === PostingRuleLineSide.CREDIT
            ? amount
            : new Prisma.Decimal(0),
        mappingKey: normalizeMappingKey(line.mappingKey),
        amountSource: line.amountSource,
      };
    })
    .filter(Boolean) as Array<{
    accountId: string;
    lineNumber: number;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    mappingKey: string | null;
    amountSource: PostingRuleAmountSource;
  }>;

  const debitTotal = postingLines
    .reduce((total, line) => total.plus(line.debit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  const creditTotal = postingLines
    .reduce((total, line) => total.plus(line.credit), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  if (postingLines.length === 0 || !debitTotal.eq(creditTotal)) {
    const message = `Payroll payment rule ${rule.code} is not balanced for ${input.method}: debit ${debitTotal.toFixed(2)} credit ${creditTotal.toFixed(2)}.`;
    const ledgerBatch = await createPayrollLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "PAYROLL_PAYMENT_POSTING_UNBALANCED",
      message,
      metadata: safeJson({
        ...input.metadata,
        method: input.method,
        ruleCode: rule.code,
      }),
    });

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "PAYROLL_PAYMENT_POSTING_UNBALANCED",
      blockerMessage: message,
    };
  }

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      idempotencyKey: `payroll-payment:${input.payrollPaymentBatchId}:posting`,
      metadata: safeJson({
        batchNumber: input.batchNumber,
        documentHash: input.documentHash,
        ...input.metadata,
      }),
    },
    tx,
  );

  const postedAt = new Date();
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.POSTED,
      postedAt,
      errorMessage: null,
    },
  });
  const componentRegisterProofHash = metadataString(
    input.metadata,
    "componentRegisterProofHash",
  );
  const componentRegisterProofStatus = metadataString(
    input.metadata,
    "componentRegisterProofStatus",
  );
  const payrollComponentMappingHash = metadataString(
    input.metadata,
    "payrollComponentMappingHash",
  );
  const payrollComponentMappingStatus = metadataString(
    input.metadata,
    "payrollComponentMappingStatus",
  );
  const paymentAdapterProofHash = metadataString(
    input.metadata,
    "paymentAdapterProofHash",
  );
  const paymentAdapterRegistryVersion =
    asRecord(input.metadata).paymentAdapterRegistryVersion ?? null;
  const paymentProviderAdapterContractHash = metadataString(
    input.metadata,
    "paymentProviderAdapterContractHash",
  );
  const paymentAdapterStatus = metadataString(
    input.metadata,
    "paymentAdapterStatus",
  );
  const paymentProviderAdapterKey = metadataString(
    input.metadata,
    "paymentProviderAdapterKey",
  );
  const paymentDisbursementFileHash = metadataString(
    input.metadata,
    "paymentDisbursementFileHash",
  );
  const providerCertificationHarnessHash = metadataString(
    input.metadata,
    "providerCertificationHarnessHash",
  );
  const adapterChaosReleaseGateHash = metadataString(
    input.metadata,
    "adapterChaosReleaseGateHash",
  );
  const providerSettlementProofRequired =
    asRecord(input.metadata).providerSettlementProofRequired === true;
  const productionPaymentAutomationSupported =
    asRecord(input.metadata).productionPaymentAutomationSupported === true;

  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: input.periodId,
      postingBatchId: postedBatch.id,
      entryNumber: await nextPayrollEntryNumber(
        tx,
        input.organizationId,
        input.paymentDate,
      ),
      entryDate: input.paymentDate,
      status: JournalEntryStatus.POSTED,
      currency: normalizeCurrency(input.currency),
      memo: `Payroll payment ${input.batchNumber}`,
      reference: input.batchNumber,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      postingPurpose: AccountingPostingPurpose.PAYROLL_PAYMENT,
      postedAt,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: postingLines.map((line) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: normalizeCurrency(input.currency),
          baseDebit: line.debit,
          baseCredit: line.credit,
          metadata: safeJson({
            mappingKey: line.mappingKey,
            amountSource: line.amountSource,
            payrollPaymentBatchId: input.payrollPaymentBatchId,
            componentRegisterProofHash,
            componentRegisterProofStatus,
            payrollComponentMappingHash,
            payrollComponentMappingStatus,
            paymentAdapterProofHash,
            paymentAdapterRegistryVersion,
            paymentProviderAdapterContractHash,
            paymentAdapterStatus,
            paymentProviderAdapterKey,
            paymentDisbursementFileHash,
            providerCertificationHarnessHash,
            adapterChaosReleaseGateHash,
            providerSettlementProofRequired,
            productionPaymentAutomationSupported,
          }),
        })),
      },
    },
    include: { lines: true },
  });

  const sourceLink = await linkAccountingSource(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: input.payrollPaymentBatchId,
      sourceNumber: input.batchNumber,
      sourceDate: input.paymentDate,
      metadata: safeJson({
        documentHash: input.documentHash,
        method: input.method,
        ...input.metadata,
      }),
    },
    tx,
  );

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "PAYROLL_PAYMENT_POSTED",
      resourceType: "PayrollPaymentBatch",
      resourceId: input.payrollPaymentBatchId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `Payroll payment ${input.batchNumber} posted`,
      metadata: safeJson({
        batchNumber: input.batchNumber,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
        ruleCode: rule.code,
        documentHash: input.documentHash,
        componentRegisterProofHash,
        componentRegisterProofStatus,
        payrollComponentMappingHash,
        payrollComponentMappingStatus,
        paymentAdapterProofHash,
        paymentAdapterRegistryVersion,
        paymentProviderAdapterContractHash,
        paymentAdapterStatus,
        paymentProviderAdapterKey,
        paymentDisbursementFileHash,
        providerCertificationHarnessHash,
        adapterChaosReleaseGateHash,
        providerSettlementProofRequired,
        productionPaymentAutomationSupported,
      }),
    },
  });

  return {
    ledgerBatch: postedBatch,
    ledgerStatus: "POSTED",
    journalEntryId: journalEntry.id,
    accountingSourceLinkId: sourceLink.id,
  };
}

async function queueOutboundPayrollPaymentReconciliation(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    payrollPaymentBatchId: string;
    batchNumber: string;
    payrollRunId: string;
    amount: Prisma.Decimal;
    currency: string;
    paymentDate: Date;
    method: PaymentMethod;
    ledgerPostingBatchId: string;
    ledgerStatus: PayrollPaymentPostingStatus["ledgerStatus"];
    evidenceHash?: string | null;
    documentHash?: string | null;
    proofMetadata: ReturnType<typeof payrollRunProofMetadata>;
    paymentAdapterMetadata: ReturnType<
      typeof payrollPaymentAdapterProofMetadata
    >;
  },
) {
  const idempotencyKey = `payroll-payment:${input.payrollPaymentBatchId}:outbound`;
  const payload = {
    payrollPaymentBatchId: input.payrollPaymentBatchId,
    batchNumber: input.batchNumber,
    payrollRunId: input.payrollRunId,
    amount: input.amount.toFixed(2),
    currency: input.currency,
    method: input.method,
    paymentDate: input.paymentDate.toISOString(),
    ledgerPostingBatchId: input.ledgerPostingBatchId,
    ledgerStatus: input.ledgerStatus,
    ...input.proofMetadata,
    ...input.paymentAdapterMetadata,
  };
  const payloadHash = prefixedHash(payload);

  const paymentTransaction =
    (await tx.paymentTransaction.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey,
      },
    })) ||
    (await tx.paymentTransaction.create({
      data: {
        organizationId: input.organizationId,
        ledgerPostingBatchId: input.ledgerPostingBatchId,
        direction: PaymentDirection.OUTBOUND,
        state:
          input.ledgerStatus === "POSTED"
            ? PaymentTransactionState.PENDING
            : PaymentTransactionState.SUSPENSE,
        amount: input.amount,
        currencyCode: normalizeCurrency(input.currency),
        providerReference: input.batchNumber,
        idempotencyKey,
        sourceType: "PAYROLL_PAYMENT",
        sourceId: input.payrollPaymentBatchId,
        payloadHash,
        occurredAt: input.paymentDate,
        metadata: safeJson({
          payrollRunId: input.payrollRunId,
          method: input.method,
          evidenceHash: input.evidenceHash ?? null,
          documentHash: input.documentHash ?? null,
          ledgerStatus: input.ledgerStatus,
          ...input.proofMetadata,
          ...input.paymentAdapterMetadata,
        }),
      },
    }));

  const exceptionType =
    input.ledgerStatus === "POSTED"
      ? PaymentExceptionType.MISSING_STATEMENT_LINE
      : PaymentExceptionType.SUSPENSE_POSTING_BLOCKED;
  const reconciliationStatus =
    input.ledgerStatus === "POSTED"
      ? "AWAITING_STATEMENT_MATCH"
      : "LEDGER_BLOCKED";

  const paymentException =
    (await tx.paymentException.findFirst({
      where: {
        organizationId: input.organizationId,
        paymentTransactionId: paymentTransaction.id,
        type: exceptionType,
        status: {
          notIn: [
            PaymentExceptionStatus.RESOLVED,
            PaymentExceptionStatus.DISMISSED,
          ],
        },
      },
    })) ||
    (await tx.paymentException.create({
      data: {
        organizationId: input.organizationId,
        paymentTransactionId: paymentTransaction.id,
        type: exceptionType,
        severity:
          input.ledgerStatus === "POSTED"
            ? ExceptionSeverity.MEDIUM
            : ExceptionSeverity.HIGH,
        status: PaymentExceptionStatus.OPEN,
        sourceType: "PAYROLL_PAYMENT",
        sourceId: input.payrollPaymentBatchId,
        evidence: safeJson(payload),
        correlationId: input.payrollPaymentBatchId,
        metadata: safeJson({
          reconciliationStatus,
          payrollRunId: input.payrollRunId,
          batchNumber: input.batchNumber,
          method: input.method,
          ledgerPostingBatchId: input.ledgerPostingBatchId,
          ...input.proofMetadata,
          ...input.paymentAdapterMetadata,
        }),
      },
    }));

  return {
    paymentTransaction,
    paymentException,
    reconciliationStatus,
    payloadHash,
  };
}

export async function createPayrollPeriod(
  input: CreatePayrollPeriodInput,
  client: DbClient = db,
) {
  const parsed = createPayrollPeriodInputSchema.parse(input);
  const periodStart = parseDate(parsed.periodStart);
  const periodEnd = parseDate(parsed.periodEnd);
  const payDate = parseDate(parsed.payDate);

  if (periodEnd < periodStart) {
    throw new BusinessRuleError(
      "Payroll period end date must be on or after the start date.",
    );
  }

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollPeriod.findFirst({
      where: {
        organizationId: parsed.organizationId,
        periodStart,
        periodEnd,
      },
    });
    if (existing) return { payrollPeriod: existing, created: false };

    const countryPack = await resolvePayrollCountryPackStatus(tx, {
      organizationId: parsed.organizationId,
      countryCode: parsed.countryCode,
      effectiveAt: payDate,
    });

    const payrollPeriod = await tx.payrollPeriod.create({
      data: {
        organizationId: parsed.organizationId,
        accountingPeriodId: parsed.accountingPeriodId ?? null,
        name: parsed.name,
        frequency: parsed.frequency,
        periodStart,
        periodEnd,
        payDate,
        status: PayrollPeriodStatus.OPEN,
        countryCode: countryPack.countryCode,
        countryPackVersion: countryPack.countryPackVersion,
        countryPackSchemaVersion: countryPack.countryPackSchemaVersion,
        countryPackResolutionHash: countryPack.countryPackResolutionHash,
        countryPackCapabilityStatus: countryPack.countryPackCapabilityStatus,
        metadata: safeJson({
          gate: "012-payroll-presence-engine",
          ruleProvenance: countryPack,
          roundingPolicy: countryPack.roundingPolicy,
          roundingPolicyHash: countryPack.roundingPolicyHash,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    });

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPeriod",
      entityId: payrollPeriod.id,
      action: "PAYROLL_PERIOD_CREATED",
      actorId: parsed.actorId,
      changes: safeJson({
        after: {
          name: payrollPeriod.name,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          countryPackVersion: countryPack.countryPackVersion,
          countryPackResolutionHash: countryPack.countryPackResolutionHash,
        },
      }),
    });

    return { payrollPeriod, created: true };
  });
}

export async function freezeAttendanceSnapshot(
  input: FreezeAttendanceSnapshotInput,
  client: DbClient = db,
) {
  const parsed = freezeAttendanceSnapshotInputSchema.parse(input);
  const sourceHash = prefixedHash({
    employeeId: parsed.employeeId,
    scheduledMinutes: parsed.scheduledMinutes,
    workedMinutes: parsed.workedMinutes,
    overtimeMinutes: parsed.overtimeMinutes,
    absenceMinutes: parsed.absenceMinutes,
    leaveMinutes: parsed.leaveMinutes,
    sourcePayload: parsed.sourcePayload,
  });

  return inTransaction(client, async (tx) => {
    const period = await tx.payrollPeriod.findFirst({
      where: {
        id: parsed.payrollPeriodId,
        organizationId: parsed.organizationId,
      },
    });
    if (!period) throw new NotFoundError("Payroll period not found");
    if (
      period.status === PayrollPeriodStatus.CLOSED ||
      period.status === PayrollPeriodStatus.POSTED
    ) {
      throw new BusinessRuleError(
        "Payroll attendance cannot be frozen for a closed or posted payroll period.",
      );
    }

    const employee = await tx.payrollEmployee.findFirst({
      where: {
        id: parsed.employeeId,
        organizationId: parsed.organizationId,
        status: PayrollEmployeeStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (!employee)
      throw new BusinessRuleError(
        "Attendance can only be frozen for an active payroll employee.",
      );

    const existing = await tx.payrollAttendanceSnapshot.findFirst({
      where: {
        organizationId: parsed.organizationId,
        payrollPeriodId: period.id,
        employeeId: parsed.employeeId,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
      },
    });
    if (existing) {
      if (existing.sourceHash !== sourceHash) {
        throw new ConflictError(
          "Attendance snapshot replay changed the source payload.",
        );
      }
      return {
        attendanceSnapshot: existing,
        created: false,
        businessEventId: null,
      };
    }

    const now = new Date();
    const attendanceSnapshot = await tx.payrollAttendanceSnapshot.create({
      data: {
        organizationId: parsed.organizationId,
        payrollPeriodId: period.id,
        employeeId: parsed.employeeId,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        scheduledMinutes: parsed.scheduledMinutes,
        workedMinutes: parsed.workedMinutes,
        overtimeMinutes: parsed.overtimeMinutes,
        absenceMinutes: parsed.absenceMinutes,
        leaveMinutes: parsed.leaveMinutes,
        sourceHash,
        frozenById: parsed.frozenById,
        frozenAt: now,
        metadata: safeJson({
          gate: "012-payroll-presence-engine",
          idempotencyKey: parsed.idempotencyKey ?? null,
          sourcePayload: parsed.sourcePayload,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    });

    await tx.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: PayrollPeriodStatus.INPUTS_LOCKED,
        inputLockedAt: period.inputLockedAt ?? now,
        inputLockedById: period.inputLockedById ?? parsed.frozenById,
      },
    });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "attendance.period.frozen",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey:
          parsed.idempotencyKey ?? `attendance-freeze:${attendanceSnapshot.id}`,
        payload: {
          payrollPeriodId: period.id,
          attendanceSnapshotId: attendanceSnapshot.id,
          employeeId: employee.id,
          sourceHash,
          scheduledMinutes: parsed.scheduledMinutes,
          workedMinutes: parsed.workedMinutes,
          overtimeMinutes: parsed.overtimeMinutes,
          absenceMinutes: parsed.absenceMinutes,
          leaveMinutes: parsed.leaveMinutes,
        },
        occurredAt: now,
        actorId: parsed.frozenById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: attendanceSnapshot.id,
        documentHash: sourceHash,
        metadata: {
          gate: "012-payroll-presence-engine",
          payrollPeriodId: period.id,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "attendance_snapshot.frozen",
            destination: "payroll",
            payload: {
              severity: "info",
              payrollPeriodId: period.id,
              attendanceSnapshotId: attendanceSnapshot.id,
              employeeId: employee.id,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollAttendanceSnapshot",
      entityId: attendanceSnapshot.id,
      action: "PAYROLL_ATTENDANCE_SNAPSHOT_FROZEN",
      actorId: parsed.frozenById,
      changes: safeJson({
        after: {
          payrollPeriodId: period.id,
          employeeId: employee.id,
          sourceHash,
          businessEventId: eventResult.event.id,
        },
      }),
    });

    return {
      attendanceSnapshot,
      created: true,
      businessEventId: eventResult.event.id,
    };
  });
}

export async function calculatePayrollRun(
  input: CalculatePayrollRunInput,
  client: DbClient = db,
) {
  const parsed = calculatePayrollRunInputSchema.parse(input);
  const runDate = parseDate(parsed.runDate);
  const idempotencyPayloadHash = prefixedHash({
    operation: "calculatePayrollRun",
    payrollPeriodId: parsed.payrollPeriodId,
    runType: parsed.runType,
    originalRunId: parsed.originalRunId ?? null,
    employeeIds: [...(parsed.employeeIds ?? [])].sort(),
  });

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollRun.findFirst({
      where: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
        deletedAt: null,
      },
      include: { lines: true },
    });
    if (existing) {
      assertIdempotencyPayloadMatches(
        existing.metadata,
        idempotencyPayloadHash,
        "Payroll run calculation idempotency key was reused with a different payload.",
      );
      return {
        payrollRun: existing,
        created: false,
        businessEventId: existing.postedBusinessEventId,
      };
    }

    const period = await tx.payrollPeriod.findFirst({
      where: {
        id: parsed.payrollPeriodId,
        organizationId: parsed.organizationId,
      },
    });
    if (!period) throw new NotFoundError("Payroll period not found");
    if (
      period.status !== PayrollPeriodStatus.OPEN &&
      period.status !== PayrollPeriodStatus.INPUTS_LOCKED &&
      period.status !== PayrollPeriodStatus.CALCULATED
    ) {
      throw new BusinessRuleError(
        "Payroll run can only be calculated for an open or input-locked period.",
      );
    }

    const isCorrectionRun = parsed.runType === PayrollRunType.CORRECTION;
    if (isCorrectionRun && !parsed.originalRunId) {
      throw new BusinessRuleError(
        "Payroll correction runs require an original payroll run.",
      );
    }
    if (!isCorrectionRun && parsed.originalRunId) {
      throw new BusinessRuleError(
        "Only payroll correction runs may reference an original payroll run.",
      );
    }
    if (isCorrectionRun && !parsed.employeeIds?.length) {
      throw new BusinessRuleError(
        "Payroll correction runs require explicit employeeIds to limit the correction scope.",
      );
    }

    const countryPack = await resolvePayrollCountryPackStatus(tx, {
      organizationId: parsed.organizationId,
      countryCode: period.countryCode,
      effectiveAt: period.payDate,
    });

    const originalRun = isCorrectionRun
      ? await tx.payrollRun.findFirst({
          where: {
            id: parsed.originalRunId,
            organizationId: parsed.organizationId,
            deletedAt: null,
          },
          include: { payrollPeriod: true, lines: true },
        })
      : null;
    if (isCorrectionRun && !originalRun) {
      throw new NotFoundError("Original payroll run not found");
    }
    if (
      originalRun &&
      originalRun.status !== PayrollRunStatus.POSTED &&
      originalRun.status !== PayrollRunStatus.PAID
    ) {
      throw new BusinessRuleError(
        "Payroll correction runs can only target posted or paid original payroll runs.",
      );
    }
    if (originalRun && originalRun.payrollPeriodId === period.id) {
      throw new BusinessRuleError(
        "Payroll correction runs must be calculated in a separate correction period.",
      );
    }
    if (originalRun && originalRun.countryCode !== countryPack.countryCode) {
      throw new BusinessRuleError(
        "Payroll correction run country must match the original payroll run country.",
      );
    }
    if (
      originalRun &&
      (!originalRun.documentHash ||
        !originalRun.evidenceHash ||
        !originalRun.calculationHash)
    ) {
      throw new BusinessRuleError(
        "Payroll correction runs require immutable original run document, evidence, and calculation hashes.",
      );
    }
    const statutoryScenarioCoverage =
      payrollStatutoryScenarioCoverageSnapshot(countryPack);
    const roundingPolicy = countryPack.roundingPolicy;

    const originalRunLineByEmployeeId = new Map(
      (originalRun?.lines ?? []).map((line) => [line.employeeId, line]),
    );
    if (originalRun) {
      const correctionEmployeeIds = parsed.employeeIds ?? [];
      const missingOriginalLineEmployeeIds = correctionEmployeeIds.filter(
        (employeeId) => !originalRunLineByEmployeeId.has(employeeId),
      );
      if (missingOriginalLineEmployeeIds.length > 0) {
        throw new BusinessRuleError(
          `Payroll correction runs require original run line proof for every corrected employee. Missing employeeIds: ${missingOriginalLineEmployeeIds.join(", ")}.`,
        );
      }
      const missingOriginalLineHashEmployeeIds = correctionEmployeeIds.filter(
        (employeeId) =>
          !originalRunLineByEmployeeId.get(employeeId)?.documentHash,
      );
      if (missingOriginalLineHashEmployeeIds.length > 0) {
        throw new BusinessRuleError(
          `Payroll correction runs require immutable original run line document hashes. Missing employeeIds: ${missingOriginalLineHashEmployeeIds.join(", ")}.`,
        );
      }
    }

    const employees = await tx.payrollEmployee.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: PayrollEmployeeStatus.ACTIVE,
        deletedAt: null,
        ...(parsed.employeeIds ? { id: { in: parsed.employeeIds } } : {}),
      },
      include: {
        contracts: {
          where: {
            organizationId: parsed.organizationId,
            status: "ACTIVE",
            deletedAt: null,
            effectiveFrom: { lte: period.periodEnd },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: period.periodStart } },
            ],
          },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
        attendanceSnapshots: {
          where: {
            organizationId: parsed.organizationId,
            payrollPeriodId: period.id,
            status: PayrollAttendanceSnapshotStatus.FROZEN,
          },
          orderBy: { frozenAt: "desc" },
          take: 1,
        },
        rubriqueAssignments: {
          where: {
            organizationId: parsed.organizationId,
            status: PayrollRubriqueAssignmentStatus.ACTIVE,
            deletedAt: null,
            effectiveFrom: { lte: period.periodEnd },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: period.periodStart } },
            ],
            rubrique: {
              status: PayrollRubriqueStatus.ACTIVE,
              deletedAt: null,
            },
          },
          include: { rubrique: true },
        },
      },
    });

    if (employees.length === 0) {
      throw new BusinessRuleError(
        "Payroll calculation requires at least one active employee.",
      );
    }

    const employeeIds = employees.map((employee) => employee.id);
    const priorYearToDateRuns = await tx.payrollRun.findMany({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
        payrollPeriod: {
          payDate: {
            gte: new Date(countryPack.yearToDatePolicy.periodStart),
            lt: period.payDate,
          },
        },
        lines: { some: { employeeId: { in: employeeIds } } },
      },
      include: {
        payrollPeriod: { select: { payDate: true } },
        lines: {
          where: { employeeId: { in: employeeIds } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    const priorYearToDateLinesByEmployeeId =
      payrollYearToDatePriorLinesByEmployeeId(
        priorYearToDateRuns as PayrollYearToDatePriorRun[],
        employeeIds,
      );

    const pensionRates = countryPack.pensionRates.value ?? {};
    const familyAllowanceRates = countryPack.familyAllowanceRates.value ?? {};
    const occupationalRiskRates = countryPack.occupationalRiskRates.value ?? {};
    const employeeRateBps = requireReviewedBpsRate(
      pensionRates.employee,
      "CNPS employee pension rate",
    );
    const employerPensionRateBps = requireReviewedBpsRate(
      pensionRates.employer,
      "CNPS employer pension rate",
    );
    const familyAllowanceRateBps = familyAllowanceRateForSector(
      familyAllowanceRates,
      countryPack.cnpsFamilyAllowanceSector,
    );
    const occupationalRiskRateBps = occupationalRiskRateForGroup(
      occupationalRiskRates,
      countryPack.cnpsOccupationalRiskGroup,
    );
    const monthlyCeiling = requirePositiveReviewedAmount(
      pensionRates.monthlyCeilingMinorUnits,
      "CNPS monthly pension ceiling",
    );

    let grossAmount = new Prisma.Decimal(0);
    let employeeDeductionAmount = new Prisma.Decimal(0);
    let employerChargeAmount = new Prisma.Decimal(0);
    const runLines = employees.map((employee) => {
      const contract = employee.contracts[0];
      const attendance = employee.attendanceSnapshots[0];
      if (!contract)
        throw new BusinessRuleError(
          `Employee ${employee.displayName} has no active payroll contract.`,
        );
      if (!attendance)
        throw new BusinessRuleError(
          `Employee ${employee.displayName} has no frozen attendance snapshot.`,
        );

      const baseSalary = decimal2(contract.baseSalary);
      if (baseSalary.lte(0))
        throw new BusinessRuleError(
          `Employee ${employee.displayName} has an invalid base salary.`,
        );

      const currency = normalizeCurrency(contract.currency);
      const scheduledMinutes = Math.max(
        0,
        Number(attendance.scheduledMinutes ?? 0),
      );
      const workedMinutes = Math.max(0, Number(attendance.workedMinutes ?? 0));
      const leaveMinutes = Math.max(0, Number(attendance.leaveMinutes ?? 0));
      const overtimeMinutes = Math.max(
        0,
        Number(attendance.overtimeMinutes ?? 0),
      );
      const attendanceCalculation = calculatePayrollAttendancePolicy({
        countryPack,
        payDate: period.payDate,
        baseSalary,
        scheduledMinutes,
        workedMinutes,
        leaveMinutes,
        overtimeMinutes,
      });
      const baseGrossAmount = baseSalary
        .times(attendanceCalculation.attendanceRatio)
        .toDecimalPlaces(2);
      const regularGrossAmount = baseGrossAmount
        .plus(attendanceCalculation.overtimePremiumAmount)
        .toDecimalPlaces(2);
      const rubriqueCalculation = calculatePayrollRubriqueComponents({
        assignments: (employee.rubriqueAssignments ??
          []) as PayrollCalculationRubriqueAssignment[],
        rateBaseAmount: regularGrossAmount,
        currency,
        countryPack,
        payDate: period.payDate,
      });
      const lineGross = regularGrossAmount
        .plus(rubriqueCalculation.grossAmount)
        .toDecimalPlaces(2);
      const taxableBaseRaw = baseGrossAmount
        .plus(attendanceCalculation.overtimeTaxableBaseAmount)
        .plus(rubriqueCalculation.taxableBaseAmount)
        .toDecimalPlaces(2);
      const taxableBaseAmount = taxableBaseRaw.lt(0)
        ? new Prisma.Decimal(0)
        : taxableBaseRaw;
      const socialBaseRaw = baseGrossAmount
        .plus(attendanceCalculation.overtimeSocialBaseAmount)
        .plus(rubriqueCalculation.socialBaseAmount)
        .toDecimalPlaces(2);
      const socialBaseUncapped = socialBaseRaw.lt(0)
        ? new Prisma.Decimal(0)
        : socialBaseRaw;
      const socialBase = socialBaseUncapped.gt(monthlyCeiling)
        ? monthlyCeiling
        : socialBaseUncapped;
      const employeePensionContribution = socialBase
        .times(employeeRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const employerPensionContribution = socialBase
        .times(employerPensionRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const familyAllowanceContribution = socialBase
        .times(familyAllowanceRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const occupationalRiskContribution = socialBase
        .times(occupationalRiskRateBps)
        .div(10000)
        .toDecimalPlaces(2);
      const incomeTaxEvaluation = evaluatePayrollTaxRule(
        countryPack.incomeTaxRules.value,
        {
          taxableBaseAmount,
          capabilityStatus: countryPack.incomeTaxRules.capabilityStatus,
          currency,
        },
      );
      const incomeTaxWithholdingAmount =
        incomeTaxEvaluation.taxAmount.toDecimalPlaces(2);
      const employeeDeduction = employeePensionContribution
        .plus(incomeTaxWithholdingAmount)
        .plus(rubriqueCalculation.employeeDeductionAmount)
        .toDecimalPlaces(2);
      const employerCharge = employerPensionContribution
        .plus(familyAllowanceContribution)
        .plus(occupationalRiskContribution)
        .plus(rubriqueCalculation.employerChargeAmount)
        .toDecimalPlaces(2);
      const netPayable = lineGross.minus(employeeDeduction).toDecimalPlaces(2);
      const statutoryPayable = employeePensionContribution
        .plus(incomeTaxWithholdingAmount)
        .plus(employerPensionContribution)
        .plus(familyAllowanceContribution)
        .plus(occupationalRiskContribution)
        .toDecimalPlaces(2);

      const originalLine = originalRunLineByEmployeeId.get(employee.id) ?? null;
      const originalSnapshot = componentSnapshotRecord(
        originalLine?.calculationSnapshot,
      );
      const originalAmountFor = (key: PayrollComponentProofAmountKey) =>
        componentSnapshotDecimal(originalSnapshot, key) ??
        new Prisma.Decimal(0);
      const originalComponentMapping = componentSnapshotRecord(
        originalSnapshot?.componentMapping,
      );
      const originalMappingAmountFor = (key: string) =>
        decimalFromUnknown(originalComponentMapping?.[key]) ??
        new Prisma.Decimal(0);
      const currentAmounts = {
        grossAmount: lineGross,
        taxableBaseAmount,
        socialBaseAmount: socialBase,
        employeePensionContributionAmount: employeePensionContribution,
        employerPensionContributionAmount: employerPensionContribution,
        familyAllowanceContributionAmount: familyAllowanceContribution,
        occupationalRiskContributionAmount: occupationalRiskContribution,
        incomeTaxWithholdingAmount,
        overtimePremiumAmount: attendanceCalculation.overtimePremiumAmount,
        payrollRubriqueGrossAmount: rubriqueCalculation.grossAmount,
        payrollRubriqueTaxableBaseAmount: rubriqueCalculation.taxableBaseAmount,
        payrollRubriqueSocialBaseAmount: rubriqueCalculation.socialBaseAmount,
        payrollRubriqueEmployeeDeductionAmount:
          rubriqueCalculation.employeeDeductionAmount,
        payrollRubriqueEmployerChargeAmount:
          rubriqueCalculation.employerChargeAmount,
        employeeDeductionAmount: employeeDeduction,
        employerChargeAmount: employerCharge,
        netPayableAmount: netPayable,
        statutoryPayableAmount: statutoryPayable,
      };
      const amountDelta = (
        current: Prisma.Decimal,
        key: PayrollComponentProofAmountKey,
      ) => current.minus(originalAmountFor(key)).toDecimalPlaces(2);
      const mappingDelta = (current: Prisma.Decimal, key: string) =>
        current.minus(originalMappingAmountFor(key)).toDecimalPlaces(2);
      const effectiveAmounts = originalRun
        ? {
            grossAmount: amountDelta(currentAmounts.grossAmount, "grossAmount"),
            taxableBaseAmount: amountDelta(
              currentAmounts.taxableBaseAmount,
              "taxableBaseAmount",
            ),
            socialBaseAmount: amountDelta(
              currentAmounts.socialBaseAmount,
              "socialBaseAmount",
            ),
            employeePensionContributionAmount: amountDelta(
              currentAmounts.employeePensionContributionAmount,
              "employeePensionContributionAmount",
            ),
            employerPensionContributionAmount: amountDelta(
              currentAmounts.employerPensionContributionAmount,
              "employerPensionContributionAmount",
            ),
            familyAllowanceContributionAmount: amountDelta(
              currentAmounts.familyAllowanceContributionAmount,
              "familyAllowanceContributionAmount",
            ),
            occupationalRiskContributionAmount: amountDelta(
              currentAmounts.occupationalRiskContributionAmount,
              "occupationalRiskContributionAmount",
            ),
            incomeTaxWithholdingAmount: amountDelta(
              currentAmounts.incomeTaxWithholdingAmount,
              "incomeTaxWithholdingAmount",
            ),
            overtimePremiumAmount: amountDelta(
              currentAmounts.overtimePremiumAmount,
              "overtimePremiumAmount",
            ),
            payrollRubriqueGrossAmount: amountDelta(
              currentAmounts.payrollRubriqueGrossAmount,
              "payrollRubriqueGrossAmount",
            ),
            payrollRubriqueTaxableBaseAmount: amountDelta(
              currentAmounts.payrollRubriqueTaxableBaseAmount,
              "payrollRubriqueTaxableBaseAmount",
            ),
            payrollRubriqueSocialBaseAmount: amountDelta(
              currentAmounts.payrollRubriqueSocialBaseAmount,
              "payrollRubriqueSocialBaseAmount",
            ),
            payrollRubriqueEmployeeDeductionAmount: amountDelta(
              currentAmounts.payrollRubriqueEmployeeDeductionAmount,
              "payrollRubriqueEmployeeDeductionAmount",
            ),
            payrollRubriqueEmployerChargeAmount: amountDelta(
              currentAmounts.payrollRubriqueEmployerChargeAmount,
              "payrollRubriqueEmployerChargeAmount",
            ),
            employeeDeductionAmount: amountDelta(
              currentAmounts.employeeDeductionAmount,
              "employeeDeductionAmount",
            ),
            employerChargeAmount: amountDelta(
              currentAmounts.employerChargeAmount,
              "employerChargeAmount",
            ),
            netPayableAmount: amountDelta(
              currentAmounts.netPayableAmount,
              "netPayableAmount",
            ),
            statutoryPayableAmount: mappingDelta(
              statutoryPayable,
              "statutoryPayableAmount",
            ),
          }
        : currentAmounts;
      const yearToDateProof = buildPayrollYearToDateAccumulatorProof({
        policy: countryPack.yearToDatePolicy,
        employeeId: employee.id,
        currency,
        currentPeriodId: period.id,
        currentPayDate: period.payDate,
        correctionRun: Boolean(originalRun),
        priorLines: priorYearToDateLinesByEmployeeId.get(employee.id) ?? [],
        currentAmounts: effectiveAmounts as PayrollYearToDateAmounts,
      });
      const correctionContext = originalRun
        ? {
            originalRunId: originalRun.id,
            originalRunNumber: originalRun.runNumber,
            originalRunStatus: originalRun.status,
            originalRunType: originalRun.runType,
            originalRunDocumentHash: originalRun.documentHash ?? null,
            originalRunEvidenceHash: originalRun.evidenceHash ?? null,
            originalCalculationHash: originalRun.calculationHash,
            originalLineId: originalLine?.id ?? null,
            originalLineDocumentHash: originalLine?.documentHash ?? null,
            originalPeriodId: originalRun.payrollPeriodId,
            originalPeriodStart:
              originalRun.payrollPeriod.periodStart.toISOString(),
            originalPeriodEnd:
              originalRun.payrollPeriod.periodEnd.toISOString(),
            originalPayDate: originalRun.payrollPeriod.payDate.toISOString(),
            correctedPeriodId: period.id,
            correctedPayDate: period.payDate.toISOString(),
            originalAmounts: Object.fromEntries(
              PAYROLL_COMPONENT_PROOF_AMOUNT_KEYS.map((key) => [
                key,
                originalAmountFor(key).toFixed(2),
              ]),
            ),
            correctedAmounts: {
              grossAmount: currentAmounts.grossAmount.toFixed(2),
              taxableBaseAmount: currentAmounts.taxableBaseAmount.toFixed(2),
              socialBaseAmount: currentAmounts.socialBaseAmount.toFixed(2),
              employeeDeductionAmount:
                currentAmounts.employeeDeductionAmount.toFixed(2),
              employerChargeAmount:
                currentAmounts.employerChargeAmount.toFixed(2),
              netPayableAmount: currentAmounts.netPayableAmount.toFixed(2),
              statutoryPayableAmount:
                currentAmounts.statutoryPayableAmount.toFixed(2),
            },
            deltaAmounts: {
              grossAmount: effectiveAmounts.grossAmount.toFixed(2),
              taxableBaseAmount: effectiveAmounts.taxableBaseAmount.toFixed(2),
              socialBaseAmount: effectiveAmounts.socialBaseAmount.toFixed(2),
              employeeDeductionAmount:
                effectiveAmounts.employeeDeductionAmount.toFixed(2),
              employerChargeAmount:
                effectiveAmounts.employerChargeAmount.toFixed(2),
              netPayableAmount: effectiveAmounts.netPayableAmount.toFixed(2),
              statutoryPayableAmount:
                effectiveAmounts.statutoryPayableAmount.toFixed(2),
            },
            correctionBasisHash: prefixedHash({
              originalRunId: originalRun.id,
              originalLineId: originalLine?.id ?? null,
              originalRunDocumentHash: originalRun.documentHash ?? null,
              originalLineDocumentHash: originalLine?.documentHash ?? null,
              correctedEmployeeId: employee.id,
              correctedPeriodId: period.id,
              correctedPayDate: period.payDate.toISOString(),
              deltaGrossAmount: effectiveAmounts.grossAmount.toFixed(2),
              deltaNetPayableAmount:
                effectiveAmounts.netPayableAmount.toFixed(2),
            }),
          }
        : null;

      grossAmount = grossAmount
        .plus(effectiveAmounts.grossAmount)
        .toDecimalPlaces(2);
      employeeDeductionAmount = employeeDeductionAmount
        .plus(effectiveAmounts.employeeDeductionAmount)
        .toDecimalPlaces(2);
      employerChargeAmount = employerChargeAmount
        .plus(effectiveAmounts.employerChargeAmount)
        .toDecimalPlaces(2);

      const anomalyFlags = [
        ...(employee.paymentDestinationHash
          ? []
          : ["PAYMENT_DESTINATION_MISSING"]),
        ...(asRecord(countryPack.employerRules.value)
          .payrollBaseRequiresCnpsReview
          ? ["PAYROLL_BASE_REQUIRES_CNPS_REVIEW"]
          : []),
      ];
      const legalProvenance = [
        ...countryPack.legalProvenance,
        ...attendanceCalculation.attendancePolicyProvenance,
        ...rubriqueCalculation.formulaPolicyProvenance,
      ];

      const payrollRubriqueComponents = rubriqueCalculation.components.map(
        (component) => ({
          assignmentId: component.assignmentId,
          rubriqueId: component.rubriqueId,
          code: component.code,
          label: component.label,
          kind: component.kind,
          valueType: component.valueType,
          amount: component.amount.toFixed(2),
          grossAmount: component.grossAmount.toFixed(2),
          taxableBaseAmount: component.taxableBaseAmount.toFixed(2),
          socialBaseAmount: component.socialBaseAmount.toFixed(2),
          employeeDeductionAmount: component.employeeDeductionAmount.toFixed(2),
          employerChargeAmount: component.employerChargeAmount.toFixed(2),
          netPayableImpactAmount: component.netPayableImpactAmount.toFixed(2),
          currency: component.currency,
          evidenceDocumentHashPresent: component.evidenceDocumentHashPresent,
          approvalBusinessEventId: component.approvalBusinessEventId,
          formulaTrace: component.formulaTrace,
        }),
      );
      const ruleProvenance = {
        countryCode: countryPack.countryCode,
        pensionRates: countryPack.pensionRates,
        familyAllowanceRates: countryPack.familyAllowanceRates,
        occupationalRiskRates: countryPack.occupationalRiskRates,
        employerRules: countryPack.employerRules,
        incomeTaxRules: countryPack.incomeTaxRules,
        attendancePolicyProvenance:
          attendanceCalculation.attendancePolicyProvenance,
        cnpsFamilyAllowanceSector: countryPack.cnpsFamilyAllowanceSector,
        cnpsOccupationalRiskGroup: countryPack.cnpsOccupationalRiskGroup,
        packVersion: countryPack.countryPackVersion,
        schemaVersion: countryPack.countryPackSchemaVersion,
        resolutionHash: countryPack.countryPackResolutionHash,
        roundingPolicy,
        roundingPolicyHash: roundingPolicy.roundingPolicyHash,
        yearToDatePolicy: countryPack.yearToDatePolicy,
        yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
        legalProvenance,
      };
      const countryPackProvenance = {
        kind: "AQSTOQFLOW_PAYROLL_LINE_COUNTRY_PACK_PROVENANCE",
        version: 1,
        countryCode: countryPack.countryCode,
        packVersion: countryPack.countryPackVersion,
        schemaVersion: countryPack.countryPackSchemaVersion,
        capabilityStatus: countryPack.countryPackCapabilityStatus,
        resolutionHash: countryPack.countryPackResolutionHash,
        statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
        statutoryScenarioCoverageStatus: statutoryScenarioCoverage.status,
        reviewEvidenceSourceHashes:
          statutoryScenarioCoverage.reviewEvidence.sourceEvidenceHashes,
        legalRefs: statutoryScenarioCoverage.reviewEvidence.legalRefs,
        roundingPolicyHash: roundingPolicy.roundingPolicyHash,
        yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
      };
      const calculationSnapshot = {
        employeeId: employee.id,
        contractId: contract.id,
        attendanceSnapshotId: attendance.id,
        baseSalary: baseSalary.toFixed(2),
        baseGrossAmount: baseGrossAmount.toFixed(2),
        attendanceRatio: attendanceCalculation.attendanceRatio,
        scheduledMinutes,
        workedMinutes,
        leaveMinutes,
        overtimeMinutes,
        paidMinutes: attendanceCalculation.paidMinutes,
        overtimePremiumAmount:
          effectiveAmounts.overtimePremiumAmount.toFixed(2),
        payrollRubriqueGrossAmount:
          effectiveAmounts.payrollRubriqueGrossAmount.toFixed(2),
        payrollRubriqueTaxableBaseAmount:
          effectiveAmounts.payrollRubriqueTaxableBaseAmount.toFixed(2),
        payrollRubriqueSocialBaseAmount:
          effectiveAmounts.payrollRubriqueSocialBaseAmount.toFixed(2),
        payrollRubriqueEmployeeDeductionAmount:
          effectiveAmounts.payrollRubriqueEmployeeDeductionAmount.toFixed(2),
        payrollRubriqueEmployerChargeAmount:
          effectiveAmounts.payrollRubriqueEmployerChargeAmount.toFixed(2),
        payrollRubriqueComponents,
        grossAmount: effectiveAmounts.grossAmount.toFixed(2),
        taxableBaseAmount: effectiveAmounts.taxableBaseAmount.toFixed(2),
        socialBaseAmount: effectiveAmounts.socialBaseAmount.toFixed(2),
        socialBaseUncappedAmount: originalRun
          ? effectiveAmounts.socialBaseAmount.toFixed(2)
          : socialBaseUncapped.toFixed(2),
        employeePensionContributionAmount:
          effectiveAmounts.employeePensionContributionAmount.toFixed(2),
        employerPensionContributionAmount:
          effectiveAmounts.employerPensionContributionAmount.toFixed(2),
        familyAllowanceContributionAmount:
          effectiveAmounts.familyAllowanceContributionAmount.toFixed(2),
        occupationalRiskContributionAmount:
          effectiveAmounts.occupationalRiskContributionAmount.toFixed(2),
        incomeTaxWithholdingAmount:
          incomeTaxEvaluation.applied || originalRun
            ? effectiveAmounts.incomeTaxWithholdingAmount.toFixed(2)
            : null,
        incomeTaxCalculationStatus: incomeTaxEvaluation.status,
        incomeTaxApplied: incomeTaxEvaluation.applied,
        incomeTaxRuleTrace: incomeTaxEvaluation.trace,
        componentMapping: {
          version: 1,
          reviewDefault: "BLOCK_UNTIL_REVIEWED_FIXTURES",
          reviewStatus: incomeTaxEvaluation.status.startsWith("BLOCKED")
            ? "BLOCKED_REQUIRES_EXPERT_REVIEW"
            : "REVIEWED",
          taxableBaseAmount: effectiveAmounts.taxableBaseAmount.toFixed(2),
          payrollRubriqueGrossAmount:
            effectiveAmounts.payrollRubriqueGrossAmount.toFixed(2),
          payrollRubriqueEmployeeDeductionAmount:
            effectiveAmounts.payrollRubriqueEmployeeDeductionAmount.toFixed(2),
          payrollRubriqueEmployerChargeAmount:
            effectiveAmounts.payrollRubriqueEmployerChargeAmount.toFixed(2),
          incomeTaxWithholdingAmount:
            incomeTaxEvaluation.applied || originalRun
              ? effectiveAmounts.incomeTaxWithholdingAmount.toFixed(2)
              : "0.00",
          statutoryPayableAmount:
            effectiveAmounts.statutoryPayableAmount.toFixed(2),
          declarationLiabilityAmount:
            effectiveAmounts.statutoryPayableAmount.toFixed(2),
          incomeTaxCalculationStatus: incomeTaxEvaluation.status,
          incomeTaxApplied: incomeTaxEvaluation.applied,
          incomeTaxWithholdingEnabled:
            incomeTaxEvaluation.applied &&
            !incomeTaxEvaluation.status.startsWith("BLOCKED"),
          roundingPolicyHash: roundingPolicy.roundingPolicyHash,
          yearToDateAccumulatorHash: yearToDateProof.ytdAccumulatorHash,
          requiredLedgerMappingKeys: [...PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS],
        },
        employeeDeductionAmount:
          effectiveAmounts.employeeDeductionAmount.toFixed(2),
        employerChargeAmount: effectiveAmounts.employerChargeAmount.toFixed(2),
        netPayableAmount: effectiveAmounts.netPayableAmount.toFixed(2),
        currency,
        countryCode: countryPack.countryCode,
        countryPackVersion: countryPack.countryPackVersion,
        countryPackSchemaVersion: countryPack.countryPackSchemaVersion,
        countryPackResolutionHash: countryPack.countryPackResolutionHash,
        countryPackCapabilityStatus: countryPack.countryPackCapabilityStatus,
        countryPackProvenance,
        countryPackProvenanceHash: prefixedHash(countryPackProvenance),
        roundingPolicy,
        roundingPolicyHash: roundingPolicy.roundingPolicyHash,
        yearToDatePolicy: countryPack.yearToDatePolicy,
        yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
        yearToDateProof,
        yearToDateAccumulatorHash: yearToDateProof.ytdAccumulatorHash,
        legalProvenance,
        correctionContext,
        anomalyFlags,
      };

      return {
        organizationId: parsed.organizationId,
        employeeId: employee.id,
        contractId: contract.id,
        attendanceSnapshotId: attendance.id,
        grossAmount: effectiveAmounts.grossAmount,
        taxableBaseAmount: effectiveAmounts.taxableBaseAmount,
        socialBaseAmount: effectiveAmounts.socialBaseAmount,
        employeeDeductionAmount: effectiveAmounts.employeeDeductionAmount,
        employerChargeAmount: effectiveAmounts.employerChargeAmount,
        netPayableAmount: effectiveAmounts.netPayableAmount,
        currency,
        calculationSnapshot: safeJson(calculationSnapshot),
        ruleProvenance: safeJson(ruleProvenance),
        anomalyFlags: anomalyFlags.length ? safeJson(anomalyFlags) : undefined,
        documentHash: prefixedHash(calculationSnapshot),
        metadata: safeJson({ gate: "012-payroll-presence-engine" }),
      };
    });
    const netPayableAmount = grossAmount
      .minus(employeeDeductionAmount)
      .toDecimalPlaces(2);
    const runNumber = await nextPayrollRunNumber(
      tx,
      parsed.organizationId,
      runDate,
    );
    const attendanceSnapshotHash = prefixedHash(
      runLines.map((line) => line.attendanceSnapshotId).sort(),
    );
    const calculationHash = prefixedHash(
      runLines.map((line) => line.calculationSnapshot),
    );
    const ruleSetHash = prefixedHash(
      runLines.map((line) => line.ruleProvenance),
    );
    const yearToDateAccumulatorHashes = runLines
      .map((line) =>
        metadataString(line.calculationSnapshot, "yearToDateAccumulatorHash"),
      )
      .filter((hash): hash is string => Boolean(hash))
      .sort();
    const correctionEvidenceHash = originalRun
      ? prefixedHash({
          originalRunId: originalRun.id,
          originalRunDocumentHash: originalRun.documentHash,
          originalRunEvidenceHash: originalRun.evidenceHash,
          originalCalculationHash: originalRun.calculationHash,
          correctedPayrollPeriodId: period.id,
          correctedEmployeeIds: [...(parsed.employeeIds ?? [])].sort(),
          correctionLineDocumentHashes: runLines
            .map((line) => line.documentHash)
            .sort(),
          calculationHash,
          ruleSetHash,
          attendanceSnapshotHash,
          statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
          statutoryScenarioReviewEvidenceSourceHashes:
            statutoryScenarioCoverage.reviewEvidence.sourceEvidenceHashes,
          roundingPolicyHash: roundingPolicy.roundingPolicyHash,
          yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
          yearToDateAccumulatorHashes,
        })
      : null;
    const documentHash = prefixedHash({
      runNumber,
      payrollPeriodId: period.id,
      runType: parsed.runType,
      originalRunId: originalRun?.id ?? null,
      originalRunDocumentHash: originalRun?.documentHash ?? null,
      originalRunEvidenceHash: originalRun?.evidenceHash ?? null,
      correctionEvidenceHash,
      grossAmount: grossAmount.toFixed(2),
      employeeDeductionAmount: employeeDeductionAmount.toFixed(2),
      employerChargeAmount: employerChargeAmount.toFixed(2),
      netPayableAmount: netPayableAmount.toFixed(2),
      calculationHash,
      ruleSetHash,
      attendanceSnapshotHash,
      statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
      roundingPolicyHash: roundingPolicy.roundingPolicyHash,
      yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
      yearToDateAccumulatorHashes,
    });

    const payrollRun = await tx.payrollRun.create({
      data: {
        organizationId: parsed.organizationId,
        payrollPeriodId: period.id,
        originalRunId: originalRun?.id ?? null,
        runNumber,
        runType: parsed.runType,
        status: PayrollRunStatus.CALCULATED,
        countryCode: countryPack.countryCode,
        countryPackVersion: countryPack.countryPackVersion,
        countryPackSchemaVersion: countryPack.countryPackSchemaVersion,
        countryPackResolutionHash: countryPack.countryPackResolutionHash,
        countryPackCapabilityStatus: countryPack.countryPackCapabilityStatus,
        ruleSetHash,
        calculationHash,
        attendanceSnapshotHash,
        grossAmount,
        employeeDeductionAmount,
        employerChargeAmount,
        netPayableAmount,
        currency: normalizeCurrency(runLines[0]?.currency),
        idempotencyKey: parsed.idempotencyKey,
        documentHash,
        evidenceHash: documentHash,
        preparedById: parsed.preparedById,
        metadata: safeJson({
          gate: "012-payroll-presence-engine",
          idempotencyPayloadHash,
          countryPackStatus: countryPack,
          statutoryScenarioCoverage,
          statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
          roundingPolicy,
          roundingPolicyHash: roundingPolicy.roundingPolicyHash,
          yearToDatePolicy: countryPack.yearToDatePolicy,
          yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
          yearToDateAccumulatorHashes,
          correction: originalRun
            ? {
                originalRunId: originalRun.id,
                originalRunNumber: originalRun.runNumber,
                originalRunStatus: originalRun.status,
                originalRunDocumentHash: originalRun.documentHash ?? null,
                originalRunEvidenceHash: originalRun.evidenceHash ?? null,
                originalCalculationHash: originalRun.calculationHash,
                statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
                statutoryScenarioReviewEvidenceSourceHashes:
                  statutoryScenarioCoverage.reviewEvidence.sourceEvidenceHashes,
                correctionEvidenceHash,
              }
            : null,
          requestedMetadata: parsed.metadata ?? null,
        }),
        lines: {
          create: runLines,
        },
      },
      include: { lines: true },
    });

    await tx.payrollPeriod.update({
      where: { id: period.id },
      data: { status: PayrollPeriodStatus.CALCULATED },
    });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.run.calculated",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: `payroll-run-calculated:${parsed.idempotencyKey}`,
        payload: {
          payrollRunId: payrollRun.id,
          payrollPeriodId: period.id,
          runNumber: payrollRun.runNumber,
          runType: parsed.runType,
          originalRunId: originalRun?.id ?? null,
          originalRunDocumentHash: originalRun?.documentHash ?? null,
          originalRunEvidenceHash: originalRun?.evidenceHash ?? null,
          correctionEvidenceHash,
          grossAmount: grossAmount.toFixed(2),
          employeeDeductionAmount: employeeDeductionAmount.toFixed(2),
          employerChargeAmount: employerChargeAmount.toFixed(2),
          netPayableAmount: netPayableAmount.toFixed(2),
          countryPackVersion: countryPack.countryPackVersion,
          countryPackResolutionHash: countryPack.countryPackResolutionHash,
          countryPackSchemaVersion: countryPack.countryPackSchemaVersion,
          countryPackCapabilityStatus: countryPack.countryPackCapabilityStatus,
          legalProvenanceHash: prefixedHash(countryPack.legalProvenance),
          legalProvenance: countryPack.legalProvenance,
          statutoryScenarioCoverageStatus: statutoryScenarioCoverage.status,
          statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
          statutoryScenarioReviewEvidence: statutoryScenarioCoverage.reviewEvidence,
          roundingPolicy,
          roundingPolicyHash: roundingPolicy.roundingPolicyHash,
          yearToDatePolicy: countryPack.yearToDatePolicy,
          yearToDatePolicyHash: countryPack.yearToDatePolicyHash,
          yearToDateAccumulatorHashes,
          calculationHash,
          attendanceSnapshotHash,
        },
        occurredAt: runDate,
        actorId: parsed.preparedById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: payrollRun.id,
        documentHash,
        metadata: {
          gate: "012-payroll-presence-engine",
          payrollPeriodId: period.id,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_run.calculated",
            destination: "payroll",
            payload: {
              severity: "warning",
              payrollRunId: payrollRun.id,
              payrollPeriodId: period.id,
              runNumber: payrollRun.runNumber,
              actionRequired: "REVIEW_AND_APPROVE",
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRun",
      entityId: payrollRun.id,
      action: "PAYROLL_RUN_CALCULATED",
      actorId: parsed.preparedById,
      changes: safeJson({
        after: {
          runNumber: payrollRun.runNumber,
          grossAmount: grossAmount.toFixed(2),
          netPayableAmount: netPayableAmount.toFixed(2),
          businessEventId: eventResult.event.id,
        },
      }),
    });

    return { payrollRun, created: true, businessEventId: eventResult.event.id };
  });
}

export async function approveAndPostPayrollRun(
  input: ApproveAndPostPayrollRunInput,
  client: DbClient = db,
) {
  const parsed = approveAndPostPayrollRunInputSchema.parse(input);
  const approvedAt = parseDate(parsed.now);
  const approvalPayloadHash = prefixedHash({
    operation: "approveAndPostPayrollRun",
    payrollRunId: parsed.payrollRunId,
    approvedById: parsed.approvedById,
  });

  return inTransaction(client, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: {
        id: parsed.payrollRunId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        payrollPeriod: true,
        lines: {
          include: {
            employee: true,
          },
          orderBy: { createdAt: "asc" },
        },
        payslips: true,
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");

    if (run.status === PayrollRunStatus.POSTED) {
      assertIdempotencyPayloadMatches(
        run.metadata,
        approvalPayloadHash,
        "Payroll run approval idempotency key was reused with a different payload.",
      );
      return {
        payrollRun: run,
        ledgerPostingBatchId: run.ledgerPostingBatchId,
        businessEventId: run.postedBusinessEventId,
        ledgerStatus: "IDEMPOTENT_REPLAY" as const,
      };
    }

    if (
      run.status !== PayrollRunStatus.CALCULATED &&
      run.status !== PayrollRunStatus.REVIEWED
    ) {
      throw new BusinessRuleError(
        "Only calculated or reviewed payroll runs can be approved and posted.",
      );
    }
    if (run.lines.length === 0)
      throw new BusinessRuleError(
        "Payroll run has no calculated employee lines.",
      );

    const correctionMetadata = payrollRunCorrectionMetadata(run);

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.run.approve",
      actorId: parsed.approvedById,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now: approvedAt,
      resourceType: "PayrollRun",
      resourceId: run.id,
      subjectActorId: run.preparedById,
      amount: run.netPayableAmount,
      currency: run.currency,
      metadata: {
        runNumber: run.runNumber,
        payrollPeriodId: run.payrollPeriodId,
        ...correctionMetadata,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const accountingPeriod = await getOpenPeriodForDate(
      parsed.organizationId,
      run.payrollPeriod.payDate,
      tx,
    );
    const legalProvenance = legalProvenanceFromMetadata(run.metadata);
    const legalProvenanceHash = prefixedHash(legalProvenance);
    const roundingPolicyMetadata = payrollRoundingPolicyProofMetadata(run.metadata);
    const yearToDateProofMetadata = payrollYearToDateProofMetadata(run.metadata);
    const documentHash =
      parsed.documentHash ??
      run.documentHash ??
      prefixedHash({
        payrollRunId: run.id,
        calculationHash: run.calculationHash,
      });
    const componentRegisterProof = buildPayrollComponentPostingProof({
      payrollRunId: run.id,
      runNumber: run.runNumber,
      lines: run.lines,
    });
    if (componentRegisterProof.status !== "MATCHED") {
      throw new BusinessRuleError(
        "Payroll posting requires matched statutory component register proof.",
      );
    }
    const payrollComponentMapping = buildPayrollComponentMapping({
      payrollRunId: run.id,
      runNumber: run.runNumber,
      currency: run.currency,
      lines: run.lines,
      componentProof: componentRegisterProof,
    });
    const componentRegisterProofMetadata = {
      componentRegisterProofHash: componentRegisterProof.proofHash,
      componentRegisterProofStatus: componentRegisterProof.status,
      componentRegisterProofLineCount: componentRegisterProof.lineCount,
      componentRegisterProofMatchedLineCount:
        componentRegisterProof.matchedLineCount,
      componentRegisterProofMissingLineCount:
        componentRegisterProof.missingLineCount,
      componentRegisterProofMismatchedLineCount:
        componentRegisterProof.mismatchedLineCount,
      blockedStatutoryComponentCount:
        componentRegisterProof.blockedStatutoryComponentCount,
      payrollComponentMappingHash: payrollComponentMapping.componentMappingHash,
      payrollComponentMappingStatus: payrollComponentMapping.reviewStatus,
      payrollComponentMapping,
    };

    const postingResult = await createPayrollLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: accountingPeriod.id,
      payrollRunId: run.id,
      runNumber: run.runNumber,
      entryDate: run.payrollPeriod.payDate,
      actorId: parsed.approvedById,
      currency: run.currency,
      documentHash,
      amounts: {
        sourceAmount: decimal2(run.netPayableAmount),
        grossAmount: decimal2(run.grossAmount),
        employeeDeductionAmount: decimal2(run.employeeDeductionAmount),
        employerChargeAmount: decimal2(run.employerChargeAmount),
        netPayableAmount: decimal2(run.netPayableAmount),
      },
      metadata: {
        payrollPeriodId: run.payrollPeriodId,
        runNumber: run.runNumber,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
        countryPackSchemaVersion: run.countryPackSchemaVersion,
        countryPackCapabilityStatus: run.countryPackCapabilityStatus,
        legalProvenanceHash,
        ...roundingPolicyMetadata,
        ...yearToDateProofMetadata,
        ...correctionMetadata,
        ...componentRegisterProofMetadata,
      },
    });

    const payslips = [];
    for (const [index, line] of run.lines.entries()) {
      const payslipNumber = `${run.runNumber}-${String(index + 1).padStart(4, "0")}`;
      const payslipHash = prefixedHash({
        payslipNumber,
        payrollRunId: run.id,
        runLineId: line.id,
        employeeId: line.employeeId,
        grossAmount: decimal2(line.grossAmount).toFixed(2),
        employeeDeductionAmount: decimal2(line.employeeDeductionAmount).toFixed(
          2,
        ),
        employerChargeAmount: decimal2(line.employerChargeAmount).toFixed(2),
        netPayableAmount: decimal2(line.netPayableAmount).toFixed(2),
        ruleSetHash: run.ruleSetHash,
        countryPackVersion: run.countryPackVersion,
        countryPackSchemaVersion: run.countryPackSchemaVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
        legalProvenanceHash,
        ...roundingPolicyMetadata,
        ...yearToDateProofMetadata,
        ...correctionMetadata,
      });
      const payslip = await tx.payrollPayslip.create({
        data: {
          organizationId: parsed.organizationId,
          payrollRunId: run.id,
          runLineId: line.id,
          employeeId: line.employeeId,
          payslipNumber,
          status: PayrollPayslipStatus.EMITTED,
          issuedAt: approvedAt,
          countryCode: run.countryCode,
          countryPackVersion: run.countryPackVersion,
          countryPackSchemaVersion: run.countryPackSchemaVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          ruleSetHash: run.ruleSetHash,
          grossAmount: line.grossAmount,
          employeeDeductionAmount: line.employeeDeductionAmount,
          employerChargeAmount: line.employerChargeAmount,
          netPayableAmount: line.netPayableAmount,
          currency: line.currency,
          documentHash: payslipHash,
          metadata: safeJson({
            gate: "012-payroll-presence-engine",
            payrollRunId: run.id,
            runLineId: line.id,
            employeeNumber: line.employee?.employeeNumber ?? null,
            countryPackCapabilityStatus: run.countryPackCapabilityStatus,
            legalProvenanceHash,
            legalProvenance,
            ...roundingPolicyMetadata,
            ...yearToDateProofMetadata,
            ...correctionMetadata,
          }),
          lines: {
            create: buildPayrollPayslipLines({
              organizationId: parsed.organizationId,
              runLineId: line.id,
              currency: line.currency,
              grossAmount: line.grossAmount,
              employeeDeductionAmount: line.employeeDeductionAmount,
              employerChargeAmount: line.employerChargeAmount,
              netPayableAmount: line.netPayableAmount,
              calculationSnapshot: line.calculationSnapshot,
            }),
          },
        },
      });
      payslips.push(payslip);
    }

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.run.posted",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: parsed.idempotencyKey ?? `payroll-run-posted:${run.id}`,
        payload: {
          payrollRunId: run.id,
          payrollPeriodId: run.payrollPeriodId,
          runNumber: run.runNumber,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          accountingSourceLinkId: postingResult.accountingSourceLinkId,
          payslipIds: payslips.map((payslip) => payslip.id),
          grossAmount: decimal2(run.grossAmount).toFixed(2),
          employeeDeductionAmount: decimal2(
            run.employeeDeductionAmount,
          ).toFixed(2),
          employerChargeAmount: decimal2(run.employerChargeAmount).toFixed(2),
          netPayableAmount: decimal2(run.netPayableAmount).toFixed(2),
          countryPackVersion: run.countryPackVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          countryPackSchemaVersion: run.countryPackSchemaVersion,
          countryPackCapabilityStatus: run.countryPackCapabilityStatus,
          legalProvenanceHash,
          legalProvenance,
          ...roundingPolicyMetadata,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...componentRegisterProofMetadata,
        },
        occurredAt: approvedAt,
        actorId: parsed.approvedById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: run.id,
        postingBatchId: postingResult.ledgerBatch.id,
        documentHash,
        metadata: {
          gate: "012-payroll-presence-engine",
          approvalPayloadHash,
          requestedMetadata: parsed.metadata ?? null,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_run.posted",
            destination: "accounting",
            payload: {
              severity: "info",
              payrollRunId: run.id,
              runNumber: run.runNumber,
              ledgerPostingBatchId: postingResult.ledgerBatch.id,
              journalEntryId: postingResult.journalEntry.id,
              ...correctionMetadata,
            },
          },
          {
            channel: "NOTIFICATION",
            eventName: "payslips.emitted",
            destination: "payroll",
            payload: {
              severity: "info",
              payrollRunId: run.id,
              payslipCount: payslips.length,
              ...correctionMetadata,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    const updatedRun = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: PayrollRunStatus.POSTED,
        approvedById: parsed.approvedById,
        emittedById: parsed.approvedById,
        postedById: parsed.approvedById,
        approvedAt,
        emittedAt: approvedAt,
        postedAt: approvedAt,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        journalEntryId: postingResult.journalEntry.id,
        accountingSourceLinkId: postingResult.accountingSourceLinkId,
        postedBusinessEventId: eventResult.event.id,
        documentHash,
        metadata: safeJson({
          ...asRecord(run.metadata),
          approvalPayloadHash,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          businessEventId: eventResult.event.id,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...componentRegisterProofMetadata,
          gate: "012-payroll-presence-engine",
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
      include: {
        lines: true,
        payslips: true,
      },
    });

    await tx.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: {
        status: PayrollPeriodStatus.POSTED,
        approvedAt,
        approvedById: parsed.approvedById,
      },
    });

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_RUN_POSTED",
        sourceId: run.id,
        periodId: accountingPeriod.id,
        periodStart: run.payrollPeriod.payDate,
        periodEnd: run.payrollPeriod.payDate,
        staleReason: "Payroll run posting changed certified close evidence.",
        newEvidenceHash: documentHash,
        correlationId: parsed.idempotencyKey ?? eventResult.event.id,
      },
      {
        actorId: parsed.approvedById,
        now: approvedAt,
      },
    );

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRun",
      entityId: run.id,
      action: "PAYROLL_RUN_APPROVED_AND_POSTED",
      actorId: parsed.approvedById,
      changes: safeJson({
        before: { status: run.status },
        after: {
          status: PayrollRunStatus.POSTED,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntry.id,
          businessEventId: eventResult.event.id,
          payslipCount: payslips.length,
          ...correctionMetadata,
        },
      }),
    });

    return {
      payrollRun: updatedRun,
      ledgerPostingBatchId: postingResult.ledgerBatch.id,
      businessEventId: eventResult.event.id,
      ledgerStatus: "POSTED" as const,
    };
  });
}

export async function releasePayrollPaymentBatch(
  input: ReleasePayrollPaymentBatchInput,
  client: DbClient = db,
) {
  const parsed = releasePayrollPaymentBatchInputSchema.parse(input);
  const paymentDate = parseDate(parsed.paymentDate);
  const releasedById = parsed.releasedById ?? parsed.approvedById;
  const method = parsed.method as PaymentMethod;
  const supportedMethods = new Set<PaymentMethod>([
    PaymentMethod.CASH,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.MOBILE_MONEY,
    PaymentMethod.CHEQUE,
  ]);
  if (!supportedMethods.has(method)) {
    throw new BusinessRuleError(
      "Payroll payment method is not configured for salary disbursement posting.",
    );
  }

  const idempotencyPayloadHash = prefixedHash({
    operation: "releasePayrollPaymentBatch",
    payrollRunId: parsed.payrollRunId,
    method,
    paymentDate: paymentDate.toISOString(),
    requestedById: parsed.requestedById,
    approvedById: parsed.approvedById,
    releasedById,
    bankFileHash: parsed.bankFileHash ?? null,
    documentHash: parsed.documentHash ?? null,
    allocations: [...parsed.allocations]
      .map((allocation) => ({
        payslipId: allocation.payslipId,
        employeeId: allocation.employeeId,
        amount: decimal2(allocation.amount).toFixed(2),
      }))
      .sort((left, right) => left.payslipId.localeCompare(right.payslipId)),
  });

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollPaymentBatch.findFirst({
      where: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
      },
      include: { allocations: true },
    });
    if (existing) {
      assertIdempotencyPayloadMatches(
        existing.metadata,
        idempotencyPayloadHash,
        "Payroll payment batch idempotency key was reused with a different payload.",
      );
      return {
        payrollPaymentBatch: existing,
        postingBatchId: existing.ledgerPostingBatchId,
        businessEventId: existing.postedBusinessEventId,
        ledgerStatus:
          metadataString(existing.metadata, "ledgerStatus") ??
          "IDEMPOTENT_REPLAY",
        paymentTransactionId: existing.paymentTransactionId,
        paymentExceptionId: existing.paymentExceptionId,
        reconciliationStatus: existing.reconciliationStatus,
      };
    }

    if (
      parsed.requestedById === parsed.approvedById ||
      parsed.requestedById === releasedById
    ) {
      throw new BusinessRuleError(
        "A separate approver and releaser are required before releasing payroll payments.",
      );
    }

    const run = await tx.payrollRun.findFirst({
      where: {
        id: parsed.payrollRunId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        payrollPeriod: true,
        payslips: {
          include: { employee: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (run.status === PayrollRunStatus.PAID) {
      throw new BusinessRuleError("Payroll run has already been paid.");
    }
    if (run.status !== PayrollRunStatus.POSTED) {
      throw new BusinessRuleError(
        "Payroll payments can only be released for posted payroll runs.",
      );
    }
    if (!run.ledgerPostingBatchId || !run.postedBusinessEventId) {
      throw new BusinessRuleError(
        "Payroll payment release requires posted payroll ledger and business-event evidence.",
      );
    }
    if (run.payslips.length === 0) {
      throw new BusinessRuleError(
        "Payroll payment release requires emitted payslips.",
      );
    }
    const legalProvenance = legalProvenanceFromMetadata(run.metadata);
    const legalProvenanceHash = prefixedHash(legalProvenance);
    const roundingPolicyMetadata = payrollRoundingPolicyProofMetadata(run.metadata);
    const yearToDateProofMetadata = payrollYearToDateProofMetadata(run.metadata);
    const runProofMetadata = payrollRunProofMetadata(run.metadata);
    const correctionMetadata = payrollRunCorrectionMetadata(run);
    if (
      correctionMetadata.correctionRun === true &&
      decimal2(run.netPayableAmount).lt(0)
    ) {
      throw new BusinessRuleError(
        "Negative payroll correction runs require employee receivable or refund workflow before payment release; payroll payment release cannot disburse a negative net payable.",
      );
    }
    const paymentAdapterMetadata = payrollPaymentAdapterProofMetadata({
      method,
      bankFileHash: parsed.bankFileHash ?? null,
      metadata: parsed.metadata,
    });

    const controlDecision = evaluateSensitiveAction({
      action: "payroll.payment.release",
      actorId: releasedById,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now: parseDate(parsed.now, paymentDate),
      resourceType: "PayrollRun",
      resourceId: run.id,
      subjectActorId: parsed.requestedById,
      amount: run.netPayableAmount,
      currency: run.currency,
      metadata: {
        runNumber: run.runNumber,
        payrollPeriodId: run.payrollPeriodId,
        ...yearToDateProofMetadata,
        ...correctionMetadata,
        ...runProofMetadata,
        ...paymentAdapterMetadata,
      },
    });
    await auditSensitiveActionDecision(tx, controlDecision);
    assertSensitiveActionAllowed(controlDecision);

    const payslipIds = parsed.allocations.map(
      (allocation) => allocation.payslipId,
    );
    if (payslipIds.length !== new Set(payslipIds).size) {
      throw new BusinessRuleError(
        "Payroll payment cannot contain duplicate payslip allocations.",
      );
    }

    const payslipById = new Map(
      run.payslips.map((payslip) => [payslip.id, payslip]),
    );
    const existingAllocations = payslipIds.length
      ? await tx.payrollPaymentAllocation.findMany({
          where: {
            organizationId: parsed.organizationId,
            payslipId: { in: payslipIds },
            payrollPaymentBatch: {
              status: {
                notIn: [
                  PayrollPaymentBatchStatus.CANCELLED,
                  PayrollPaymentBatchStatus.FAILED,
                ],
              },
            },
          },
        })
      : [];
    const paidByPayslip = new Map<string, Prisma.Decimal>();
    for (const allocation of existingAllocations) {
      paidByPayslip.set(
        allocation.payslipId,
        (paidByPayslip.get(allocation.payslipId) ?? new Prisma.Decimal(0))
          .plus(allocation.amount)
          .toDecimalPlaces(2),
      );
    }

    let totalPayment = new Prisma.Decimal(0);
    const allocationPlans = parsed.allocations.map((allocation) => {
      const payslip = payslipById.get(allocation.payslipId);
      if (!payslip || payslip.employeeId !== allocation.employeeId) {
        throw new BusinessRuleError(
          "Payroll payment allocation must reference an emitted payslip from the selected run.",
        );
      }
      if (payslip.status !== PayrollPayslipStatus.EMITTED) {
        throw new BusinessRuleError(
          "Payroll payments can only be released for emitted payslips.",
        );
      }
      if (!payslip.employee.paymentDestinationHash) {
        throw new BusinessRuleError(
          `Employee ${payslip.employee.displayName} has no approved payment destination evidence.`,
        );
      }
      const amount = decimal2(allocation.amount);
      if (amount.lte(0))
        throw new BusinessRuleError(
          "Payroll payment allocation amount must be greater than zero.",
        );
      const outstanding = decimal2(payslip.netPayableAmount)
        .minus(paidByPayslip.get(payslip.id) ?? new Prisma.Decimal(0))
        .toDecimalPlaces(2);
      if (amount.gt(outstanding)) {
        throw new BusinessRuleError(
          "Payroll payment allocation exceeds unpaid payslip net payable.",
        );
      }
      totalPayment = totalPayment.plus(amount).toDecimalPlaces(2);
      return { payslip, amount, outstanding };
    });

    for (const allocation of allocationPlans) {
      await assertApprovedPaymentDestinationEvidence(tx, {
        organizationId: parsed.organizationId,
        employeeId: allocation.payslip.employeeId,
      });
    }

    if (!totalPayment.eq(decimal2(run.netPayableAmount))) {
      throw new BusinessRuleError(
        "Payroll payment batch total must equal the posted payroll net payable amount.",
      );
    }

    const period = await getOpenPeriodForDate(
      parsed.organizationId,
      paymentDate,
      tx,
    );
    const batchNumber = await nextPayrollPaymentBatchNumber(
      tx,
      parsed.organizationId,
      paymentDate,
    );
    const evidencePayload = {
      payrollRunId: run.id,
      batchNumber,
      amount: totalPayment.toFixed(2),
      method,
      paymentDate: paymentDate.toISOString(),
      allocationIds: allocationPlans
        .map((allocation) => allocation.payslip.id)
        .sort(),
      bankFileHash: parsed.bankFileHash ?? null,
      ...yearToDateProofMetadata,
      ...correctionMetadata,
      ...runProofMetadata,
      ...paymentAdapterMetadata,
    };
    const documentHash = parsed.documentHash ?? prefixedHash(evidencePayload);
    const evidenceHash = prefixedHash({
      ...evidencePayload,
      destinationHashes: allocationPlans
        .map((allocation) => allocation.payslip.employee.paymentDestinationHash)
        .sort(),
    });

    const paymentBatch = await tx.payrollPaymentBatch.create({
      data: {
        organizationId: parsed.organizationId,
        payrollRunId: run.id,
        batchNumber,
        status: PayrollPaymentBatchStatus.DRAFT,
        method,
        amount: totalPayment,
        currency: normalizeCurrency(run.currency),
        paymentDate,
        idempotencyKey: parsed.idempotencyKey,
        bankFileHash: parsed.bankFileHash ?? null,
        documentHash,
        evidenceHash,
        requestedById: parsed.requestedById,
        approvedById: parsed.approvedById,
        releasedById,
        approvedAt: paymentDate,
        releasedAt: paymentDate,
        notes: parsed.notes ?? null,
        metadata: safeJson({
          gate: "012-payroll-presence-completion-gate",
          idempotencyPayloadHash,
          payrollRunDocumentHash: run.documentHash,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...runProofMetadata,
          ...paymentAdapterMetadata,
          requestedMetadata: parsed.metadata ?? null,
        }),
        allocations: {
          create: allocationPlans.map((allocation) => ({
            organizationId: parsed.organizationId,
            employeeId: allocation.payslip.employeeId,
            payslipId: allocation.payslip.id,
            amount: allocation.amount,
            currency: normalizeCurrency(allocation.payslip.currency),
            metadata: safeJson({
              payrollRunId: run.id,
              payslipNumber: allocation.payslip.payslipNumber,
              paymentDestinationHash:
                allocation.payslip.employee.paymentDestinationHash,
              ...yearToDateProofMetadata,
              ...correctionMetadata,
              ...runProofMetadata,
              ...paymentAdapterMetadata,
            }),
          })),
        },
      },
      include: { allocations: true },
    });

    const postingResult = await createPayrollPaymentLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: period.id,
      payrollPaymentBatchId: paymentBatch.id,
      batchNumber: paymentBatch.batchNumber,
      paymentDate,
      actorId: releasedById,
      currency: paymentBatch.currency,
      method,
      documentHash,
      amount: totalPayment,
      metadata: {
        payrollRunId: run.id,
        runNumber: run.runNumber,
        method,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
        countryPackSchemaVersion: run.countryPackSchemaVersion,
        countryPackCapabilityStatus: run.countryPackCapabilityStatus,
        legalProvenanceHash,
        ...roundingPolicyMetadata,
        ...yearToDateProofMetadata,
        ...correctionMetadata,
        ...runProofMetadata,
        ...paymentAdapterMetadata,
      },
    });

    const reconciliationResult =
      await queueOutboundPayrollPaymentReconciliation(tx, {
        organizationId: parsed.organizationId,
        payrollPaymentBatchId: paymentBatch.id,
        batchNumber: paymentBatch.batchNumber,
        payrollRunId: run.id,
        amount: totalPayment,
        currency: paymentBatch.currency,
        paymentDate,
        method,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        ledgerStatus: postingResult.ledgerStatus,
        evidenceHash,
        documentHash,
        proofMetadata: { ...runProofMetadata, ...yearToDateProofMetadata, ...correctionMetadata },
        paymentAdapterMetadata,
      });

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.payment_batch.released",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey: parsed.idempotencyKey,
        payload: {
          payrollPaymentBatchId: paymentBatch.id,
          payrollRunId: run.id,
          batchNumber: paymentBatch.batchNumber,
          amount: totalPayment.toFixed(2),
          method,
          allocationIds: paymentBatch.allocations.map(
            (allocation) => allocation.id,
          ),
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          journalEntryId: postingResult.journalEntryId ?? null,
          ledgerStatus: postingResult.ledgerStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...runProofMetadata,
          ...paymentAdapterMetadata,
        },
        occurredAt: paymentDate,
        actorId: releasedById,
        sourceType: AccountingSourceType.PAYROLL_PAYMENT,
        sourceId: paymentBatch.id,
        postingBatchId: postingResult.ledgerBatch.id,
        documentHash,
        metadata: {
          gate: "012-payroll-presence-completion-gate",
          ledgerStatus: postingResult.ledgerStatus,
          blockerCode: postingResult.blockerCode ?? null,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...runProofMetadata,
          ...paymentAdapterMetadata,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_payment_batch.released",
            destination: "accounting",
            payload: {
              severity:
                postingResult.ledgerStatus === "POSTED" ? "info" : "critical",
              payrollPaymentBatchId: paymentBatch.id,
              payrollRunId: run.id,
              amount: totalPayment.toFixed(2),
              ledgerStatus: postingResult.ledgerStatus,
              blockerCode: postingResult.blockerCode ?? null,
              componentRegisterProofHash:
                runProofMetadata.componentRegisterProofHash,
              payrollComponentMappingHash:
                runProofMetadata.payrollComponentMappingHash,
              paymentAdapterProofHash:
                paymentAdapterMetadata.paymentAdapterProofHash,
              ...yearToDateProofMetadata,
              ...correctionMetadata,
            },
          },
          {
            channel: "NOTIFICATION",
            eventName: "payroll_payment.reconciliation_required",
            destination: "reconciliation",
            payload: {
              severity: "warning",
              payrollPaymentBatchId: paymentBatch.id,
              batchNumber: paymentBatch.batchNumber,
              amount: totalPayment.toFixed(2),
              method,
              paymentTransactionId: reconciliationResult.paymentTransaction.id,
              paymentExceptionId: reconciliationResult.paymentException.id,
              reconciliationStatus: reconciliationResult.reconciliationStatus,
              componentRegisterProofHash:
                runProofMetadata.componentRegisterProofHash,
              payrollComponentMappingHash:
                runProofMetadata.payrollComponentMappingHash,
              paymentAdapterProofHash:
                paymentAdapterMetadata.paymentAdapterProofHash,
              ...yearToDateProofMetadata,
              ...correctionMetadata,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_PAYMENT_RELEASED",
        sourceId: paymentBatch.id,
        periodId: period.id,
        periodStart: paymentDate,
        periodEnd: paymentDate,
        staleReason:
          "Payroll payment release changed certified close evidence.",
        newEvidenceHash: evidenceHash,
        correlationId: parsed.idempotencyKey ?? eventResult.event.id,
      },
      {
        actorId: releasedById,
        now: paymentDate,
      },
    );
    const releasedBatch = await tx.payrollPaymentBatch.update({
      where: { id: paymentBatch.id },
      data: {
        status: PayrollPaymentBatchStatus.RELEASED,
        ledgerPostingBatchId: postingResult.ledgerBatch.id,
        postedBusinessEventId: eventResult.event.id,
        paymentTransactionId: reconciliationResult.paymentTransaction.id,
        paymentExceptionId: reconciliationResult.paymentException.id,
        reconciliationStatus: reconciliationResult.reconciliationStatus,
        metadata: safeJson({
          gate: "012-payroll-presence-completion-gate",
          idempotencyPayloadHash,
          ledgerStatus: postingResult.ledgerStatus,
          ledgerBlockerCode: postingResult.blockerCode ?? null,
          ledgerBlockerMessage: postingResult.blockerMessage ?? null,
          journalEntryId: postingResult.journalEntryId ?? null,
          accountingSourceLinkId: postingResult.accountingSourceLinkId ?? null,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationPayloadHash: reconciliationResult.payloadHash,
          payrollRunDocumentHash: run.documentHash,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...runProofMetadata,
          ...paymentAdapterMetadata,
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
      include: { allocations: true },
    });

    await tx.payrollRun.update({
      where: { id: run.id },
      data: { status: PayrollRunStatus.PAID },
    });
    await tx.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: { status: PayrollPeriodStatus.PAID },
    });

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPaymentBatch",
      entityId: paymentBatch.id,
      action: "PAYROLL_PAYMENT_BATCH_RELEASED",
      actorId: releasedById,
      changes: safeJson({
        after: {
          payrollRunId: run.id,
          amount: totalPayment.toFixed(2),
          batchNumber: paymentBatch.batchNumber,
          ledgerPostingBatchId: postingResult.ledgerBatch.id,
          businessEventId: eventResult.event.id,
          ledgerStatus: postingResult.ledgerStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          ...runProofMetadata,
          ...paymentAdapterMetadata,
        },
      }),
    });

    return {
      payrollPaymentBatch: releasedBatch,
      postingBatchId: postingResult.ledgerBatch.id,
      businessEventId: eventResult.event.id,
      ledgerStatus: postingResult.ledgerStatus,
      paymentTransactionId: reconciliationResult.paymentTransaction.id,
      paymentExceptionId: reconciliationResult.paymentException.id,
      reconciliationStatus: reconciliationResult.reconciliationStatus,
    };
  });
}

export async function preparePayrollDeclarations(
  input: PreparePayrollDeclarationsInput,
  client: DbClient = db,
) {
  const parsed = preparePayrollDeclarationsInputSchema.parse(input);

  return inTransaction(client, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: {
        id: parsed.payrollRunId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        payrollPeriod: true,
        declarations: true,
        lines: true,
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (
      run.status !== PayrollRunStatus.POSTED &&
      run.status !== PayrollRunStatus.PAID
    ) {
      throw new BusinessRuleError(
        "Payroll declarations can only be prepared for posted payroll runs.",
      );
    }
    const legalProvenance = legalProvenanceFromMetadata(run.metadata);
    const legalProvenanceHash = prefixedHash(legalProvenance);
    const roundingPolicyMetadata = payrollRoundingPolicyProofMetadata(run.metadata);
    const yearToDateProofMetadata = payrollYearToDateProofMetadata(run.metadata);
    const componentRegisterProof = buildPayrollComponentPostingProof({
      payrollRunId: run.id,
      runNumber: run.runNumber,
      lines: run.lines,
    });
    if (componentRegisterProof.status !== "MATCHED") {
      throw new BusinessRuleError(
        "Payroll declarations require matched statutory component register proof.",
      );
    }
    const countryPackRegisterProof = buildPayrollCountryPackRegisterProof({
      payrollRunId: run.id,
      runNumber: run.runNumber,
      countryCode: run.countryCode,
      countryPackVersion: run.countryPackVersion,
      countryPackSchemaVersion: run.countryPackSchemaVersion,
      countryPackResolutionHash: run.countryPackResolutionHash,
      countryPackCapabilityStatus: run.countryPackCapabilityStatus,
      metadata: run.metadata,
      lines: run.lines,
    });
    if (countryPackRegisterProof.status !== "MATCHED") {
      throw new BusinessRuleError(
        "Payroll declarations require matched country-pack register proof.",
      );
    }
    const countryPackRegisterProofMetadata = {
      countryPackRegisterProofHash: countryPackRegisterProof.proofHash,
      countryPackRegisterProofStatus: countryPackRegisterProof.status,
      countryPackRegisterProofLineCount: countryPackRegisterProof.lineCount,
      countryPackRegisterProofMatchedLineCount:
        countryPackRegisterProof.matchedLineCount,
      countryPackRegisterProofMissingLineCount:
        countryPackRegisterProof.missingLineCount,
      countryPackRegisterProofMismatchedLineCount:
        countryPackRegisterProof.mismatchedLineCount,
      countryPackLineProofHashes: countryPackRegisterProof.lineProofHashes,
      statutoryScenarioCoverageHash:
        countryPackRegisterProof.statutoryScenarioCoverageHash,
      countryPackReviewEvidenceSourceHashes:
        countryPackRegisterProof.reviewEvidenceSourceHashes,
      countryPackLegalRefs: countryPackRegisterProof.legalRefs,
    };
    const payrollComponentMapping = buildPayrollComponentMapping({
      payrollRunId: run.id,
      runNumber: run.runNumber,
      currency: run.currency,
      lines: run.lines,
      componentProof: componentRegisterProof,
    });
    const correctionMetadata = payrollRunCorrectionMetadata(run);
    const signedDeclarationLiabilityAmount = new Prisma.Decimal(
      payrollComponentMapping.declarationLiabilityAmount,
    ).toDecimalPlaces(2);
    const declarationCorrectionWorkflow = payrollDeclarationCorrectionWorkflow({
      correctionMetadata,
      declarationLiabilityAmount: signedDeclarationLiabilityAmount,
    });

    let declarationConfig: {
      authority: string;
      declarationType: string;
      dueDate?: string | null;
      expertReviewRequired: boolean;
      capabilityStatus: string;
      resolutionHash: string;
    }[] = [];
    let declarationResolutionError: string | null = null;
    try {
      const resolved = resolveRegulatoryParameter<{
        declarations?: Array<{
          authority?: string;
          declarationType?: string;
          dueDate?: string | null;
          capabilityStatus?: string;
        }>;
      }>("payroll.declarations.default", {
        countryCode: run.countryCode,
        date: run.payrollPeriod.payDate,
        pinnedPackVersion: run.countryPackVersion,
        purpose: "PAYROLL_DECLARATIONS",
        entityProfile: {
          countryCode: run.countryCode,
        },
      });
      declarationConfig = (resolved.value.declarations ?? [])
        .filter((entry) => entry.authority && entry.declarationType)
        .map((entry) => ({
          authority: String(entry.authority),
          declarationType: String(entry.declarationType),
          dueDate: entry.dueDate ?? null,
          expertReviewRequired: entry.capabilityStatus !== "SUPPORTED",
          capabilityStatus: entry.capabilityStatus ?? resolved.capabilityStatus,
          resolutionHash: resolved.resolutionHash,
        }));
    } catch (error) {
      declarationResolutionError =
        error instanceof Error
          ? error.message
          : "Payroll declaration country-pack resolution failed.";
    }

    if (parsed.declarationTypes?.length) {
      const requested = new Set(
        parsed.declarationTypes.map((value) => value.trim().toUpperCase()),
      );
      declarationConfig = declarationConfig.filter((entry) =>
        requested.has(entry.declarationType.toUpperCase()),
      );
    }

    if (declarationConfig.length === 0) {
      declarationConfig = [
        {
          authority: "INTERNAL_PAYROLL_CONTROL",
          declarationType: "PAYROLL_LIABILITY_REVIEW",
          dueDate: null,
          expertReviewRequired: true,
          capabilityStatus: "REQUIRES_COUNTRY_PACK_EXPANSION",
          resolutionHash: run.countryPackResolutionHash,
        },
      ];
    }

    const preparedDeclarations = [];
    for (const declaration of declarationConfig) {
      const existing = await tx.payrollDeclaration.findFirst({
        where: {
          organizationId: parsed.organizationId,
          payrollRunId: run.id,
          authority: declaration.authority,
          declarationType: declaration.declarationType,
        },
      });
      if (existing) {
        preparedDeclarations.push(existing);
        continue;
      }

      const amount = declarationCorrectionWorkflow.declarationAmount;
      const effectiveExpertReviewRequired =
        declaration.expertReviewRequired ||
        declarationCorrectionWorkflow.correctionExpertReviewRequired;
      const dueDate = declaration.dueDate
        ? parseDate(declaration.dueDate)
        : null;
      const payload = {
        payrollRunId: run.id,
        runNumber: run.runNumber,
        payrollPeriodId: run.payrollPeriodId,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        periodStart: run.payrollPeriod.periodStart.toISOString(),
        periodEnd: run.payrollPeriod.periodEnd.toISOString(),
        grossAmount: decimal2(run.grossAmount).toFixed(2),
        employeeDeductionAmount: decimal2(run.employeeDeductionAmount).toFixed(
          2,
        ),
        employerChargeAmount: decimal2(run.employerChargeAmount).toFixed(2),
        taxableBaseAmount: payrollComponentMapping.taxableBaseAmount,
        incomeTaxWithholdingAmount:
          payrollComponentMapping.incomeTaxWithholdingAmount,
        incomeTaxCalculationStatus:
          payrollComponentMapping.incomeTaxCalculationStatus,
        incomeTaxApplied: payrollComponentMapping.incomeTaxApplied,
        incomeTaxWithholdingEnabled:
          payrollComponentMapping.incomeTaxWithholdingEnabled,
        statutoryPayableAmount: payrollComponentMapping.statutoryPayableAmount,
        declarationLiabilityAmount:
          payrollComponentMapping.declarationLiabilityAmount,
        ...declarationCorrectionWorkflow.metadata,
        componentRegisterProofHash: componentRegisterProof.proofHash,
        ...countryPackRegisterProofMetadata,
        payrollComponentMappingHash:
          payrollComponentMapping.componentMappingHash,
        payrollComponentMappingStatus: payrollComponentMapping.reviewStatus,
        currency: run.currency,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
        countryPackSchemaVersion: run.countryPackSchemaVersion,
        countryPackCapabilityStatus: declaration.capabilityStatus,
        legalProvenanceHash,
        legalProvenance,
        ...yearToDateProofMetadata,
        ...correctionMetadata,
        expertReviewRequired: effectiveExpertReviewRequired,
        declarationResolutionError,
      };

      const created = await tx.payrollDeclaration.create({
        data: {
          organizationId: parsed.organizationId,
          payrollRunId: run.id,
          authority: declaration.authority,
          declarationType: declaration.declarationType,
          status: PayrollDeclarationStatus.PREPARED,
          periodStart: run.payrollPeriod.periodStart,
          periodEnd: run.payrollPeriod.periodEnd,
          dueDate,
          countryCode: run.countryCode,
          countryPackVersion: run.countryPackVersion,
          countryPackSchemaVersion: run.countryPackSchemaVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          amount,
          currency: normalizeCurrency(run.currency),
          payloadHash: prefixedHash(payload),
          metadata: safeJson({
            gate: "012-payroll-presence-completion-gate",
            payload,
            expertReviewRequired: effectiveExpertReviewRequired,
            capabilityStatus: declaration.capabilityStatus,
            declarationResolutionHash: declaration.resolutionHash,
            declarationResolutionError,
            componentRegisterProofHash: componentRegisterProof.proofHash,
          ...countryPackRegisterProofMetadata,
            payrollComponentMappingHash:
              payrollComponentMapping.componentMappingHash,
            payrollComponentMappingStatus: payrollComponentMapping.reviewStatus,
            payrollComponentMapping,
            legalProvenanceHash,
            legalProvenance,
            ...roundingPolicyMetadata,
            ...yearToDateProofMetadata,
            ...correctionMetadata,
            ...declarationCorrectionWorkflow.metadata,
            requestedMetadata: parsed.metadata ?? null,
          }),
        },
      });
      preparedDeclarations.push(created);
    }

    const expertReviewRequired = preparedDeclarations.some((declaration) =>
      Boolean(asRecord(declaration.metadata).expertReviewRequired),
    );

    const eventResult = await recordBusinessEventInTx(
      tx as unknown as BusinessEventTx,
      {
        organizationId: parsed.organizationId,
        eventType: "payroll.declaration.prepared",
        eventSource: "INTERNAL",
        schemaVersion: 1,
        idempotencyKey:
          parsed.idempotencyKey ?? `payroll-declaration-prepared:${run.id}`,
        payload: {
          payrollRunId: run.id,
          runNumber: run.runNumber,
          declarationIds: preparedDeclarations.map(
            (declaration) => declaration.id,
          ),
          declarationTypes: preparedDeclarations.map(
            (declaration) => declaration.declarationType,
          ),
          expertReviewRequired,
          countryPackVersion: run.countryPackVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          legalProvenanceHash,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          componentRegisterProofHash: componentRegisterProof.proofHash,
          ...countryPackRegisterProofMetadata,
          payrollComponentMappingHash:
            payrollComponentMapping.componentMappingHash,
          payrollComponentMappingStatus: payrollComponentMapping.reviewStatus,
          declarationLiabilityAmount:
            payrollComponentMapping.declarationLiabilityAmount,
          incomeTaxWithholdingEnabled:
            payrollComponentMapping.incomeTaxWithholdingEnabled,
          ...declarationCorrectionWorkflow.metadata,
        },
        occurredAt: new Date(),
        actorId: parsed.preparedById,
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: run.id,
        documentHash: prefixedHash(
          preparedDeclarations
            .map((declaration) => declaration.payloadHash)
            .sort(),
        ),
        metadata: {
          gate: "012-payroll-presence-completion-gate",
          declarationResolutionError,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payroll_declaration.prepared",
            destination: "payroll",
            payload: {
              severity: declarationResolutionError ? "warning" : "info",
              payrollRunId: run.id,
              declarationCount: preparedDeclarations.length,
              expertReviewRequired,
              ...yearToDateProofMetadata,
              ...correctionMetadata,
              ...declarationCorrectionWorkflow.metadata,
            },
          },
        ],
      },
    );
    await markBusinessEventAppliedInTx(
      tx as unknown as BusinessEventTx,
      parsed.organizationId,
      eventResult.event.id,
    );

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_DECLARATION_PREPARED",
        sourceId: run.id,
        periodStart: run.payrollPeriod.periodStart,
        periodEnd: run.payrollPeriod.periodEnd,
        staleReason:
          "Payroll declaration preparation changed certified close evidence.",
        newEvidenceHash: prefixedHash(
          preparedDeclarations
            .map((declaration) => declaration.payloadHash)
            .sort(),
        ),
        correlationId: parsed.idempotencyKey ?? eventResult.event.id,
      },
      {
        actorId: parsed.preparedById,
      },
    );
    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRun",
      entityId: run.id,
      action: "PAYROLL_DECLARATIONS_PREPARED",
      actorId: parsed.preparedById,
      changes: safeJson({
        after: {
          declarationIds: preparedDeclarations.map(
            (declaration) => declaration.id,
          ),
          businessEventId: eventResult.event.id,
          expertReviewRequired,
          countryPackVersion: run.countryPackVersion,
          countryPackResolutionHash: run.countryPackResolutionHash,
          legalProvenanceHash,
          ...yearToDateProofMetadata,
          ...correctionMetadata,
          componentRegisterProofHash: componentRegisterProof.proofHash,
          ...countryPackRegisterProofMetadata,
          payrollComponentMappingHash:
            payrollComponentMapping.componentMappingHash,
          payrollComponentMappingStatus: payrollComponentMapping.reviewStatus,
          declarationLiabilityAmount:
            payrollComponentMapping.declarationLiabilityAmount,
          incomeTaxWithholdingEnabled:
            payrollComponentMapping.incomeTaxWithholdingEnabled,
          ...declarationCorrectionWorkflow.metadata,
        },
      }),
    });

    return {
      payrollRunId: run.id,
      declarations: preparedDeclarations,
      businessEventId: eventResult.event.id,
      expertReviewRequired,
    };
  });
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function redactionPayload(decision: RedactionDecision) {
  return {
    allowed: decision.allowed,
    mode: decision.mode,
    reasonCode: decision.reasonCode,
    policy: decision.policy,
    replacement: decision.replacement,
    requiredPermissions: [...decision.requiredPermissions],
  };
}

async function writePayrollRunWorkbenchReadAudit(
  client: DbClient,
  input: {
    organizationId: string;
    actorId?: string | null;
    amountDecision: RedactionDecision;
    correctionProofDecision: RedactionDecision;
    returnedRunCount: number;
  },
) {
  return client.auditLog.create({
    data: {
      entityType: "PayrollRunWorkbench",
      entityId: input.organizationId,
      action: "PAYROLL_RUN_WORKBENCH_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        amountAccess: redactionPayload(input.amountDecision),
        correctionProofAccess: redactionPayload(input.correctionProofDecision),
        returnedRecordCounts: { runs: input.returnedRunCount },
      }),
    },
  });
}

function payrollRunNextActions(run: {
  id: string;
  status: PayrollRunStatus;
  runType: PayrollRunType;
  _count: { declarations: number; paymentBatches: number };
}) {
  const actions: PayrollRunWorkbenchData["runs"][number]["nextActions"] = [];

  if (run.status === PayrollRunStatus.DRAFT) {
    actions.push({
      id: "calculate",
      label: "Calculate payroll run",
      requiredPermission: "payroll.runs.calculate",
      requiresFreshAuth: false,
      requiresSeparateApprover: false,
      href: null,
    });
  }

  if (
    run.status === PayrollRunStatus.CALCULATED ||
    run.status === PayrollRunStatus.REVIEWED
  ) {
    actions.push({
      id: "approve-post",
      label: "Approve and post run",
      requiredPermission: "payroll.runs.approve",
      requiresFreshAuth: true,
      requiresSeparateApprover: true,
      href: null,
    });
  }

  if (run.status === PayrollRunStatus.POSTED && run._count.declarations === 0) {
    actions.push({
      id: "prepare-declarations",
      label: "Prepare statutory declarations",
      requiredPermission: "payroll.declarations.prepare",
      requiresFreshAuth: false,
      requiresSeparateApprover: false,
      href: "/dashboard/payroll/declarations",
    });
  }

  if (
    run.status === PayrollRunStatus.POSTED &&
    run._count.paymentBatches === 0
  ) {
    actions.push({
      id: "release-payments",
      label: "Release payroll payments",
      requiredPermission: "payroll.payments.release",
      requiresFreshAuth: true,
      requiresSeparateApprover: true,
      href: "/dashboard/payroll/payments",
    });
  }

  if (
    run.status === PayrollRunStatus.PAID ||
    run.status === PayrollRunStatus.POSTED
  ) {
    actions.push({
      id: "review-close",
      label: "Review accounting close readiness",
      requiredPermission: "accounting.close.read",
      requiresFreshAuth: false,
      requiresSeparateApprover: false,
      href: "/dashboard/accounting/close",
    });
  }

  return actions;
}

function payrollRunBlockers(input: {
  run: {
    runType: PayrollRunType;
    originalRunId: string | null;
    status: PayrollRunStatus;
    calculationHash: string;
    attendanceSnapshotHash: string;
    documentHash: string | null;
    evidenceHash: string | null;
    metadata: unknown;
    ledgerPostingBatchId: string | null;
    journalEntryId: string | null;
    accountingSourceLinkId: string | null;
    _count: {
      lines: number;
      payslips: number;
      declarations: number;
      paymentBatches: number;
    };
  };
  declarations: Array<{
    status: PayrollDeclarationStatus;
    payloadHash: string | null;
    evidenceItems: Array<{
      sourceRegisterHash: string | null;
    }>;
  }>;
  paymentBatches: Array<{
    status: PayrollPaymentBatchStatus;
    evidenceHash: string | null;
    ledgerPostingBatchId: string | null;
    reconciliationStatus: string | null;
    metadata: unknown;
  }>;
  ledgerBatches: Array<{
    status: LedgerPostingBatchStatus;
    errorMessage: string | null;
  }>;
}) {
  const blockers: PayrollRunWorkbenchData["runs"][number]["blockers"] = [];
  const lockedStatuses: readonly PayrollRunStatus[] = [
    PayrollRunStatus.POSTED,
    PayrollRunStatus.PAID,
    PayrollRunStatus.ARCHIVED,
  ];
  const lockedStatus = lockedStatuses.includes(input.run.status);
  const correctionMetadata = asRecord(asRecord(input.run.metadata).correction);
  const correctionEvidenceHash =
    metadataString(input.run.metadata, "correctionEvidenceHash") ??
    metadataString(correctionMetadata, "correctionEvidenceHash");

  if (!input.run.calculationHash || !input.run.attendanceSnapshotHash) {
    blockers.push({
      id: "PAYROLL_RUN_CALCULATION_PROOF_MISSING",
      severity: "critical",
      title: "Calculation proof is incomplete",
      detail:
        "A payroll run cannot be trusted without calculation and attendance snapshot hashes.",
      nextAction:
        "Recalculate from locked source data or repair the service-owned evidence chain.",
    });
  }

  if (input.run._count.lines === 0) {
    blockers.push({
      id: "PAYROLL_RUN_LINES_MISSING",
      severity: "high",
      title: "No employee run lines are attached",
      detail:
        "The run has no employee calculation lines, so payslip/register/payment totals cannot tie out.",
      nextAction:
        "Recalculate the run after employee, contract, compensation, and attendance inputs are ready.",
    });
  }

  if (lockedStatus && (!input.run.documentHash || !input.run.evidenceHash)) {
    blockers.push({
      id: "PAYROLL_RUN_REGISTER_PROOF_MISSING",
      severity: "high",
      title: "Locked run register proof is missing",
      detail:
        "Posted, paid, or archived runs require document and evidence hashes before close can trust payroll.",
      nextAction:
        "Regenerate or repair the locked payroll register proof through the payroll service.",
    });
  }

  if (
    lockedStatus &&
    (!input.run.ledgerPostingBatchId ||
      !input.run.journalEntryId ||
      !input.run.accountingSourceLinkId)
  ) {
    blockers.push({
      id: "PAYROLL_RUN_ACCOUNTING_PROOF_MISSING",
      severity: "high",
      title: "Accounting posting proof is missing",
      detail:
        "Locked payroll runs must tie to a ledger batch, journal entry, and accounting source link.",
      nextAction:
        "Resolve payroll posting rules and repost through the accounting-backed payroll service.",
    });
  }

  for (const batch of input.ledgerBatches) {
    if (batch.status === LedgerPostingBatchStatus.FAILED) {
      blockers.push({
        id: "PAYROLL_RUN_LEDGER_BATCH_FAILED",
        severity: "critical",
        title: "Ledger batch failed",
        detail: batch.errorMessage ?? "A payroll ledger posting batch failed.",
        nextAction:
          "Repair the accounting posting rule or source data before approving close readiness.",
      });
    }
  }

  if (
    input.run.runType === PayrollRunType.CORRECTION &&
    !input.run.originalRunId
  ) {
    blockers.push({
      id: "PAYROLL_CORRECTION_ORIGINAL_RUN_MISSING",
      severity: "critical",
      title: "Correction run is missing original run linkage",
      detail:
        "Correction payroll runs must link back to the original locked run.",
      nextAction:
        "Repair correction metadata and original-run proof before posting or closing.",
    });
  }

  if (
    lockedStatus &&
    input.run.runType === PayrollRunType.CORRECTION &&
    !correctionEvidenceHash
  ) {
    blockers.push({
      id: "PAYROLL_CORRECTION_EVIDENCE_HASH_MISSING",
      severity: "critical",
      title: "Correction evidence hash is missing",
      detail:
        "Locked correction runs must carry correction evidence proof that ties the original run, correction lines, calculation, and attendance snapshot together.",
      nextAction:
        "Recalculate or repair the correction run through the payroll service before close certification.",
    });
  }

  if (lockedStatus && input.run._count.payslips === 0) {
    blockers.push({
      id: "PAYROLL_RUN_PAYSLIPS_MISSING",
      severity: "high",
      title: "Payslip evidence is missing",
      detail:
        "A locked payroll run with no payslips cannot support employee self-service or payment proof.",
      nextAction:
        "Emit payslips from the locked register before payment or close certification.",
    });
  }

  if (lockedStatus && input.run._count.declarations === 0) {
    blockers.push({
      id: "PAYROLL_RUN_DECLARATIONS_MISSING",
      severity: "high",
      title: "Statutory declarations are missing",
      detail:
        "Posted payroll runs must prepare declarations before statutory liability and close readiness can be trusted.",
      nextAction: "Prepare declarations from the posted payroll register.",
    });
  }

  for (const declaration of input.declarations) {
    if (declaration.status === PayrollDeclarationStatus.REJECTED) {
      blockers.push({
        id: "PAYROLL_RUN_DECLARATION_REJECTED",
        severity: "critical",
        title: "Authority rejected a declaration",
        detail:
          "Rejected statutory declaration evidence blocks close readiness until correction or amendment proof exists.",
        nextAction:
          "Open the declaration evidence workbench and record correction or amendment evidence.",
      });
    }
    if (!declaration.payloadHash) {
      blockers.push({
        id: "PAYROLL_RUN_DECLARATION_PAYLOAD_PROOF_MISSING",
        severity: "high",
        title: "Declaration payload proof is missing",
        detail:
          "Declaration payload hashes must tie statutory amounts back to the payroll register.",
        nextAction:
          "Regenerate declarations from the service-owned payroll register.",
      });
    }
    const latestEvidence = declaration.evidenceItems[0] ?? null;
    if (latestEvidence && !latestEvidence.sourceRegisterHash) {
      blockers.push({
        id: "PAYROLL_RUN_DECLARATION_REGISTER_PROOF_MISSING",
        severity: "high",
        title: "Declaration lifecycle proof is missing register hash",
        detail:
          "Declaration lifecycle evidence must carry the source payroll register hash.",
        nextAction:
          "Record declaration evidence again with source register proof.",
      });
    }
  }

  for (const batch of input.paymentBatches) {
    if (batch.status === PayrollPaymentBatchStatus.FAILED) {
      blockers.push({
        id: "PAYROLL_RUN_PAYMENT_BATCH_FAILED",
        severity: "high",
        title: "Payroll payment batch failed",
        detail:
          "A payment batch tied to this payroll run failed and must be reconciled before close.",
        nextAction:
          "Open payroll payments and resolve provider, settlement, or ledger evidence.",
      });
    }
    if (
      (
        [
          PayrollPaymentBatchStatus.RELEASED,
          PayrollPaymentBatchStatus.SETTLED,
        ] as readonly PayrollPaymentBatchStatus[]
      ).includes(batch.status) &&
      (!batch.evidenceHash || !batch.ledgerPostingBatchId)
    ) {
      blockers.push({
        id: "PAYROLL_RUN_PAYMENT_PROOF_MISSING",
        severity: "high",
        title: "Payment proof is incomplete",
        detail:
          "Released or settled payroll payment batches require evidence and ledger posting proof.",
        nextAction:
          "Repair payment evidence and ledger posting proof through payroll payments.",
      });
    }
    if (
      (
        [
          PayrollPaymentBatchStatus.RELEASED,
          PayrollPaymentBatchStatus.SETTLED,
        ] as readonly PayrollPaymentBatchStatus[]
      ).includes(batch.status) &&
      !metadataString(batch.metadata, "latestSettlementSourceRegisterHash")
    ) {
      blockers.push({
        id: "PAYROLL_RUN_PAYMENT_REGISTER_PROOF_MISSING",
        severity: "high",
        title: "Payment settlement is missing register proof",
        detail:
          "Payment settlement evidence must propagate the source payroll register hash.",
        nextAction:
          "Record settlement evidence with the source payroll register hash before close certification.",
      });
    }
  }

  return blockers;
}

export async function getPayrollRunWorkbenchData(
  input: PayrollRunWorkbenchInput,
  client: DbClient = db,
): Promise<PayrollRunWorkbenchData> {
  const parsed = payrollRunWorkbenchInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const amountDecision = evaluateRedaction({
    field: "PayrollRunWorkbench.payrollAmounts",
    category: "payroll_person_amount",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  });
  const correctionProofPolicyDecision = evaluateRedaction({
    field: "PayrollRunWorkbench.correctionProofIdentifiers",
    category: "proof_hidden_identifier",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  });
  const correctionProofDecision: RedactionDecision =
    amountDecision.reasonCode === "MODULE_NOT_ENTITLED"
      ? {
          ...correctionProofPolicyDecision,
          allowed: false,
          mode: "redact",
          reasonCode: "MODULE_NOT_ENTITLED",
        }
      : amountDecision.allowed || correctionProofPolicyDecision.allowed
        ? {
            ...correctionProofPolicyDecision,
            allowed: true,
            mode: "allow",
            reasonCode: "ALLOWED",
            requiredPermissions: Array.from(
              new Set([
                ...correctionProofPolicyDecision.requiredPermissions,
                ...amountDecision.requiredPermissions,
              ]),
            ),
            safeMessage: "Payroll correction proof identifier access allowed.",
          }
        : correctionProofPolicyDecision;
  const correctionProofValue = (value: string | null) =>
    correctionProofDecision.allowed || !value
      ? value
      : correctionProofDecision.replacement;
  const baseWhere = {
    organizationId: parsed.organizationId,
    deletedAt: null,
    ...(parsed.status ? { status: parsed.status } : {}),
  };

  const [
    runs,
    totalRuns,
    activeRuns,
    postedRuns,
    correctionRuns,
    amountInScope,
    paymentRequesterUsers,
  ] = await Promise.all([
    client.payrollRun.findMany({
      where: baseWhere,
      orderBy: [{ createdAt: "desc" }],
      take: parsed.limit,
      include: {
        payrollPeriod: {
          select: {
            id: true,
            name: true,
            status: true,
            periodStart: true,
            periodEnd: true,
            payDate: true,
          },
        },
        originalRun: {
          select: {
            id: true,
            runNumber: true,
            status: true,
            documentHash: true,
            evidenceHash: true,
            calculationHash: true,
          },
        },
        _count: {
          select: {
            lines: true,
            payslips: true,
            declarations: true,
            paymentBatches: true,
            employeeBalanceCases: true,
            correctiveRuns: true,
          },
        },
        declarations: {
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            evidenceItems: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                evidenceHash: true,
                sourceRegisterHash: true,
                automationCapabilityStatus: true,
                productionSubmissionSupported: true,
              },
            },
          },
        },
        paymentBatches: {
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            batchNumber: true,
            status: true,
            method: true,
            amount: true,
            currency: true,
            paymentDate: true,
            ledgerPostingBatchId: true,
            postedBusinessEventId: true,
            evidenceHash: true,
            paymentTransactionId: true,
            paymentExceptionId: true,
            reconciliationStatus: true,
            metadata: true,
          },
        },
        payslips: {
          orderBy: { createdAt: "asc" },
          take: 250,
          select: {
            id: true,
            payslipNumber: true,
            employeeId: true,
            status: true,
            netPayableAmount: true,
            currency: true,
            employee: {
              select: {
                employeeNumber: true,
                displayName: true,
                paymentDestinationHash: true,
              },
            },
          },
        },
        employeeBalanceCases: {
          where: {
            status: {
              in: [
                PayrollEmployeeBalanceCaseStatus.OPEN,
                PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
              ],
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 4,
          select: {
            id: true,
            caseNumber: true,
            caseType: true,
            status: true,
            outstandingAmount: true,
            currency: true,
            evidenceHash: true,
            ledgerPostingBatchId: true,
          },
        },
      },
    }),
    client.payrollRun.count({ where: baseWhere }),
    client.payrollRun.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: {
          in: [
            PayrollRunStatus.DRAFT,
            PayrollRunStatus.CALCULATED,
            PayrollRunStatus.REVIEWED,
            PayrollRunStatus.APPROVED,
            PayrollRunStatus.EMITTED,
          ],
        },
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: { in: [PayrollRunStatus.POSTED, PayrollRunStatus.PAID] },
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        runType: PayrollRunType.CORRECTION,
      },
    }),
    client.payrollRun.aggregate({
      where: baseWhere,
      _sum: { netPayableAmount: true },
    }),
    client.user.findMany({
      where: {
        organizationId: parsed.organizationId,
        isActive: true,
        ...(parsed.actorId ? { id: { not: parsed.actorId } } : {}),
        roles: {
          some: {
            permissions: {
              hasSome: [...PAYROLL_PAYMENT_REQUESTER_CANDIDATE_PERMISSIONS],
            },
          },
        },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: PAYROLL_PAYMENT_REQUESTER_CANDIDATE_LIMIT,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        roles: {
          select: {
            code: true,
            nameEn: true,
            permissions: true,
          },
        },
      },
    }),
  ]);

  const runIds = runs.map((run) => run.id);
  const ledgerBatches = runIds.length
    ? await client.ledgerPostingBatch.findMany({
        where: {
          organizationId: parsed.organizationId,
          sourceType: AccountingSourceType.PAYROLL_RUN,
          sourceId: { in: runIds },
        },
        select: {
          id: true,
          sourceId: true,
          postingPurpose: true,
          status: true,
          errorMessage: true,
          postedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const ledgerByRun = new Map<string, typeof ledgerBatches>();
  for (const batch of ledgerBatches) {
    const entries = ledgerByRun.get(batch.sourceId) ?? [];
    entries.push(batch);
    ledgerByRun.set(batch.sourceId, entries);
  }

  const paymentRequesterCandidates = paymentRequesterUsers.map((user) => {
    const displayName =
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email;
    const matchedPermissions = Array.from(
      new Set(
        user.roles.flatMap((role) =>
          role.permissions.filter((permission) =>
            payrollPaymentRequesterCandidatePermissionSet.has(permission),
          ),
        ),
      ),
    ).sort();

    return {
      userId: user.id,
      displayName,
      email: user.email,
      roleLabels: user.roles.map((role) => role.nameEn || role.code).sort(),
      matchedPermissions,
    };
  });

  const rows = runs.map((run) => {
    const runLedgerBatches = ledgerByRun.get(run.id) ?? [];
    const blockers = payrollRunBlockers({
      run,
      declarations: run.declarations,
      paymentBatches: run.paymentBatches,
      ledgerBatches: runLedgerBatches,
    });
    const componentRegisterProofHash = metadataString(
      run.metadata,
      "componentRegisterProofHash",
    );
    const payrollComponentMappingHash = metadataString(
      run.metadata,
      "payrollComponentMappingHash",
    );
    const correctionMetadata = asRecord(asRecord(run.metadata).correction);
    const correctionMetadataString = (key: string) =>
      metadataString(run.metadata, key) ?? metadataString(correctionMetadata, key);

    return {
      id: run.id,
      runNumber: run.runNumber,
      runType: run.runType,
      status: run.status,
      version: run.version,
      period: {
        id: run.payrollPeriod.id,
        name: run.payrollPeriod.name,
        status: run.payrollPeriod.status,
        periodStart: run.payrollPeriod.periodStart.toISOString(),
        periodEnd: run.payrollPeriod.periodEnd.toISOString(),
        payDate: run.payrollPeriod.payDate.toISOString(),
      },
      amounts: {
        grossAmount: payrollAmountForReadModel(run.grossAmount, amountDecision),
        employeeDeductionAmount: payrollAmountForReadModel(
          run.employeeDeductionAmount,
          amountDecision,
        ),
        employerChargeAmount: payrollAmountForReadModel(
          run.employerChargeAmount,
          amountDecision,
        ),
        netPayableAmount: payrollAmountForReadModel(
          run.netPayableAmount,
          amountDecision,
        ),
        currency: run.currency,
      },
      country: {
        countryCode: run.countryCode,
        countryPackVersion: run.countryPackVersion,
        countryPackSchemaVersion: run.countryPackSchemaVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
        countryPackCapabilityStatus: run.countryPackCapabilityStatus,
        ruleSetHash: run.ruleSetHash,
      },
      proof: {
        calculationHash: run.calculationHash,
        attendanceSnapshotHash: run.attendanceSnapshotHash,
        documentHash: run.documentHash,
        evidenceHash: run.evidenceHash,
        componentRegisterProofHash,
        payrollComponentMappingHash,
        registerProofPresent: Boolean(
          run.calculationHash &&
          run.attendanceSnapshotHash &&
          run.documentHash &&
          run.evidenceHash,
        ),
        preparedById: run.preparedById,
        reviewedById: run.reviewedById,
        approvedById: run.approvedById,
        emittedById: run.emittedById,
        postedById: run.postedById,
        approvedAt: isoDate(run.approvedAt),
        emittedAt: isoDate(run.emittedAt),
        postedAt: isoDate(run.postedAt),
      },
      correction: {
        correctionRun: run.runType === PayrollRunType.CORRECTION,
        originalRunId: run.originalRunId,
        originalRunNumber:
          run.originalRun?.runNumber ??
          correctionMetadataString("originalRunNumber"),
        originalRunDocumentHash: correctionProofValue(
          correctionMetadataString("originalRunDocumentHash") ??
            run.originalRun?.documentHash ??
            null,
        ),
        originalRunEvidenceHash: correctionProofValue(
          correctionMetadataString("originalRunEvidenceHash") ??
            run.originalRun?.evidenceHash ??
            null,
        ),
        originalCalculationHash: correctionProofValue(
          correctionMetadataString("originalCalculationHash") ??
            run.originalRun?.calculationHash ??
            null,
        ),
        correctionEvidenceHash: correctionProofValue(
          correctionMetadataString("correctionEvidenceHash"),
        ),
        correctiveRunCount: run._count.correctiveRuns,
      },
      accounting: {
        ledgerPostingBatchId: run.ledgerPostingBatchId,
        postedBusinessEventId: run.postedBusinessEventId,
        journalEntryId: run.journalEntryId,
        accountingSourceLinkId: run.accountingSourceLinkId,
        ledgerBatches: runLedgerBatches.map((batch) => ({
          id: batch.id,
          postingPurpose: batch.postingPurpose,
          status: batch.status,
          errorMessage: batch.errorMessage,
          postedAt: isoDate(batch.postedAt),
          createdAt: batch.createdAt.toISOString(),
        })),
      },
      counts: {
        lines: run._count.lines,
        payslips: run._count.payslips,
        declarations: run._count.declarations,
        paymentBatches: run._count.paymentBatches,
        employeeBalanceCases: run._count.employeeBalanceCases,
        correctiveRuns: run._count.correctiveRuns,
      },
      declarations: run.declarations.map((declaration) => {
        const latestEvidence = declaration.evidenceItems[0] ?? null;
        return {
          id: declaration.id,
          authority: declaration.authority,
          declarationType: declaration.declarationType,
          status: declaration.status,
          amount: payrollAmountForReadModel(declaration.amount, amountDecision),
          currency: declaration.currency,
          dueDate: isoDate(declaration.dueDate),
          payloadHash: declaration.payloadHash,
          latestEvidenceHash: latestEvidence?.evidenceHash ?? null,
          sourceRegisterHash: latestEvidence?.sourceRegisterHash ?? null,
          automationCapabilityStatus:
            latestEvidence?.automationCapabilityStatus ?? null,
          productionSubmissionSupported:
            latestEvidence?.productionSubmissionSupported ?? false,
        };
      }),
      paymentBatches: run.paymentBatches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        method: batch.method,
        amount: payrollAmountForReadModel(batch.amount, amountDecision),
        currency: batch.currency,
        paymentDate: batch.paymentDate.toISOString(),
        ledgerPostingBatchId: batch.ledgerPostingBatchId,
        postedBusinessEventId: batch.postedBusinessEventId,
        evidenceHash: batch.evidenceHash,
        paymentTransactionId: batch.paymentTransactionId,
        paymentExceptionId: batch.paymentExceptionId,
        reconciliationStatus: batch.reconciliationStatus,
        latestSettlementSourceRegisterHash: metadataString(
          batch.metadata,
          "latestSettlementSourceRegisterHash",
        ),
      })),
      paymentAllocationCandidates: run.payslips.map((payslip) => ({
        payslipId: payslip.id,
        payslipNumber: payslip.payslipNumber,
        employeeId: payslip.employeeId,
        employeeNumber: payslip.employee.employeeNumber,
        employeeDisplayName: payslip.employee.displayName,
        amount: payrollAmountForReadModel(
          payslip.netPayableAmount,
          amountDecision,
        ),
        currency: payslip.currency,
        status: payslip.status,
        paymentDestinationProofPresent: Boolean(
          payslip.employee.paymentDestinationHash,
        ),
      })),
      employeeBalanceCases: run.employeeBalanceCases.map((balanceCase) => ({
        id: balanceCase.id,
        caseNumber: balanceCase.caseNumber,
        caseType: String(balanceCase.caseType),
        status: balanceCase.status,
        outstandingAmount: payrollAmountForReadModel(
          balanceCase.outstandingAmount,
          amountDecision,
        ),
        currency: balanceCase.currency,
        evidenceHash: balanceCase.evidenceHash,
        ledgerPostingBatchId: balanceCase.ledgerPostingBatchId,
      })),
      nextActions: payrollRunNextActions(run),
      blockers,
    };
  });

  await writePayrollRunWorkbenchReadAudit(client, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    amountDecision,
    correctionProofDecision,
    returnedRunCount: rows.length,
  });

  const accountingBlockedRuns = rows.filter((row) =>
    row.blockers.some(
      (blocker) =>
        blocker.id.includes("ACCOUNTING") || blocker.id.includes("LEDGER"),
    ),
  ).length;
  const paymentBlockedRuns = rows.filter((row) =>
    row.blockers.some((blocker) => blocker.id.includes("PAYMENT")),
  ).length;
  const declarationBlockedRuns = rows.filter((row) =>
    row.blockers.some((blocker) => blocker.id.includes("DECLARATION")),
  ).length;
  const registerProofMissingRuns = rows.filter(
    (row) => !row.proof.registerProofPresent,
  ).length;
  const blockedRuns = rows.filter((row) =>
    row.blockers.some(
      (blocker) =>
        blocker.severity === "high" || blocker.severity === "critical",
    ),
  ).length;

  return {
    organizationId: parsed.organizationId,
    asOf: now.toISOString(),
    statusFilter: parsed.status ?? null,
    redaction: {
      payrollAmounts: redactionPayload(amountDecision),
      correctionProofIdentifiers: redactionPayload(correctionProofDecision),
    },
    paymentRequesterCandidates,
    summary: {
      totalRuns,
      activeRuns,
      postedRuns,
      correctionRuns,
      returnedRuns: rows.length,
      blockedRuns,
      accountingBlockedRuns,
      paymentBlockedRuns,
      declarationBlockedRuns,
      registerProofMissingRuns,
      netPayableInScope: payrollAmountForReadModel(
        amountInScope._sum.netPayableAmount,
        amountDecision,
      ),
      coverageComplete: rows.length >= totalRuns,
    },
    runs: rows,
    sourceScope: {
      limit: parsed.limit,
      returned: rows.length,
      coverageComplete: rows.length >= totalRuns,
      sourceService: "services/payroll/payroll-control.service.ts",
    },
  };
}
export async function getPayrollWorkbenchData(
  input: PayrollWorkbenchReadInput,
  client: DbClient = db,
): Promise<PayrollWorkbenchData> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const amountDecision = evaluateRedaction({
    field: "PayrollWorkbench.payrollAmounts",
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions ?? [],
    moduleDecision: input.moduleDecision,
  });
  const [
    openPeriods,
    calculatedRuns,
    postedRuns,
    releasedPaymentBatches,
    openDeclarations,
    ledgerBlockers,
    reconciliationExceptions,
    recentRuns,
    paymentBatches,
    declarations,
    blockerRows,
  ] = await Promise.all([
    client.payrollPeriod.count({
      where: {
        organizationId: input.organizationId,
        status: {
          in: [PayrollPeriodStatus.OPEN, PayrollPeriodStatus.INPUTS_LOCKED],
        },
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        status: {
          in: [PayrollRunStatus.CALCULATED, PayrollRunStatus.REVIEWED],
        },
      },
    }),
    client.payrollRun.count({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        status: PayrollRunStatus.POSTED,
      },
    }),
    client.payrollPaymentBatch.count({
      where: {
        organizationId: input.organizationId,
        status: PayrollPaymentBatchStatus.RELEASED,
      },
    }),
    client.payrollDeclaration.count({
      where: {
        organizationId: input.organizationId,
        status: {
          in: [
            PayrollDeclarationStatus.PREPARED,
            PayrollDeclarationStatus.REJECTED,
            PayrollDeclarationStatus.PAYMENT_DUE,
          ],
        },
      },
    }),
    client.ledgerPostingBatch.count({
      where: {
        organizationId: input.organizationId,
        sourceType: {
          in: [
            AccountingSourceType.PAYROLL_RUN,
            AccountingSourceType.PAYROLL_PAYMENT,
          ],
        },
        status: LedgerPostingBatchStatus.FAILED,
      },
    }),
    client.paymentException.count({
      where: {
        organizationId: input.organizationId,
        sourceType: "PAYROLL_PAYMENT",
        status: {
          notIn: [
            PaymentExceptionStatus.RESOLVED,
            PaymentExceptionStatus.DISMISSED,
          ],
        },
      },
    }),
    client.payrollRun.findMany({
      where: { organizationId: input.organizationId, deletedAt: null },
      include: {
        payrollPeriod: true,
        _count: {
          select: { payslips: true, paymentBatches: true, declarations: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    client.payrollPaymentBatch.findMany({
      where: { organizationId: input.organizationId },
      include: { payrollRun: { select: { runNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    client.payrollDeclaration.findMany({
      where: { organizationId: input.organizationId },
      include: { payrollRun: { select: { runNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    client.ledgerPostingBatch.findMany({
      where: {
        organizationId: input.organizationId,
        sourceType: {
          in: [
            AccountingSourceType.PAYROLL_RUN,
            AccountingSourceType.PAYROLL_PAYMENT,
          ],
        },
        status: LedgerPostingBatchStatus.FAILED,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  await writePayrollWorkbenchReadAudit(client, {
    organizationId: input.organizationId,
    actorId: input.actorId,
    amountDecision,
    returnedRunCount: recentRuns.length,
    returnedPaymentBatchCount: paymentBatches.length,
    returnedDeclarationCount: declarations.length,
  });

  return {
    organizationId: input.organizationId,
    asOf: new Date().toISOString(),
    counts: {
      openPeriods,
      calculatedRuns,
      postedRuns,
      releasedPaymentBatches,
      openDeclarations,
      ledgerBlockers,
      reconciliationExceptions,
    },
    queues: {
      recentRuns: recentRuns.map((run) => ({
        id: run.id,
        runNumber: run.runNumber,
        periodName: run.payrollPeriod.name,
        status: run.status,
        netPayableAmount: payrollAmountForReadModel(
          run.netPayableAmount,
          amountDecision,
        ),
        currency: run.currency,
        payDate: run.payrollPeriod.payDate.toISOString(),
        ledgerPostingBatchId: run.ledgerPostingBatchId,
        postedBusinessEventId: run.postedBusinessEventId,
        payslipCount: run._count.payslips,
        paymentBatchCount: run._count.paymentBatches,
        declarationCount: run._count.declarations,
        countryPackVersion: run.countryPackVersion,
        countryPackResolutionHash: run.countryPackResolutionHash,
      })),
      paymentBatches: paymentBatches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        payrollRunId: batch.payrollRunId,
        runNumber: batch.payrollRun.runNumber,
        status: batch.status,
        amount: payrollAmountForReadModel(batch.amount, amountDecision),
        currency: batch.currency,
        method: batch.method,
        paymentDate: batch.paymentDate.toISOString(),
        ledgerPostingBatchId: batch.ledgerPostingBatchId,
        postedBusinessEventId: batch.postedBusinessEventId,
        paymentTransactionId: batch.paymentTransactionId,
        paymentExceptionId: batch.paymentExceptionId,
        reconciliationStatus: batch.reconciliationStatus,
        ledgerStatus: metadataString(batch.metadata, "ledgerStatus"),
        ledgerBlockerCode: metadataString(batch.metadata, "ledgerBlockerCode"),
        ledgerBlockerMessage: metadataString(
          batch.metadata,
          "ledgerBlockerMessage",
        ),
      })),
      declarations: declarations.map((declaration) => ({
        id: declaration.id,
        payrollRunId: declaration.payrollRunId,
        runNumber: declaration.payrollRun.runNumber,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        status: declaration.status,
        amount: payrollAmountForReadModel(declaration.amount, amountDecision),
        currency: declaration.currency,
        dueDate: declaration.dueDate?.toISOString() ?? null,
        countryPackVersion: declaration.countryPackVersion,
        countryPackResolutionHash: declaration.countryPackResolutionHash,
        expertReviewRequired: Boolean(
          asRecord(declaration.metadata).expertReviewRequired,
        ),
      })),
      ledgerBlockers: blockerRows.map((blocker) => ({
        id: blocker.id,
        sourceType: blocker.sourceType,
        sourceId: blocker.sourceId,
        postingPurpose: blocker.postingPurpose,
        status: blocker.status,
        errorMessage: blocker.errorMessage,
        createdAt: blocker.createdAt.toISOString(),
      })),
    },
  };
}
