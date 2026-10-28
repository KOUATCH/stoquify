import "server-only";

import {
  CloseRunStatus,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";
import {
  redactPayrollSetupRef,
} from "./payroll-setup-readiness.service";
import type { PayrollProofBackfillReconciliationCertificate } from "./payroll-proof-backfill-reconciliation.service";

type DbClient = typeof db | Prisma.TransactionClient;

const READ_PERMISSIONS = ["payroll.command.read"] as const;
const PROOF_BACKFILL_RECONCILIATION_ENTITY_TYPE =
  "PayrollProofBackfillReconciliationCertificate";
const PROOF_BACKFILL_RECONCILIATION_AUDIT_ACTION =
  "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED";
const PILOT_READY_RUN_STATUSES: readonly PayrollRunStatus[] = [
  PayrollRunStatus.POSTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.ARCHIVED,
];
const PILOT_READY_PAYSLIP_STATUSES: readonly PayrollPayslipStatus[] = [
  PayrollPayslipStatus.EMITTED,
  PayrollPayslipStatus.CORRECTED,
];
const PILOT_READY_DECLARATION_STATUSES: readonly PayrollDeclarationStatus[] = [
  PayrollDeclarationStatus.RECONCILED,
  PayrollDeclarationStatus.ARCHIVED,
];
const PILOT_READY_CLOSE_STATUSES: readonly CloseRunStatus[] = [
  CloseRunStatus.READY,
  CloseRunStatus.CERTIFIED,
];
const hashSchema = z.string().trim().regex(/^sha256:[A-Za-z0-9_.:-]+$/);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

const signoffSchema = z.object({
  approvedById: z.string().trim().min(1).optional().nullable(),
  approvedAt: dateInputSchema.optional().nullable(),
  evidenceHash: hashSchema.optional().nullable(),
});

export const payrollPilotCycleCertificationInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  payrollRunId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
  expectedSourceRegisterHash: hashSchema.optional().nullable(),
  expectedAdapterChaosReleaseGateHash: hashSchema.optional().nullable(),
  expectedProofBackfillCertificateHash: hashSchema.optional().nullable(),
  proofBackfillReconciliationCertificate:
    z.custom<PayrollProofBackfillReconciliationCertificate>().optional().nullable(),
  signoffBundle: z
    .object({
      payrollAdmin: signoffSchema.optional().nullable(),
      accountingController: signoffSchema.optional().nullable(),
      securityPrivacy: signoffSchema.optional().nullable(),
      operationsOwner: signoffSchema.optional().nullable(),
    })
    .optional()
    .nullable(),
  now: dateInputSchema.optional().nullable(),
  persistCertificate: z.boolean().optional().default(false),
});

export type PayrollPilotCycleCertificationInput = z.input<
  typeof payrollPilotCycleCertificationInputSchema
>;

export type PayrollPilotCycleCertificationStatus =
  | "BLOCKED"
  | "READY_FOR_SIGNOFF"
  | "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW";

export type PayrollPilotCycleCertificationBlocker = {
  code: string;
  severity: "critical" | "high" | "medium";
  domain:
    | "run"
    | "register"
    | "payslip"
    | "declaration"
    | "payment"
    | "close"
    | "backfill"
    | "signoff"
    | "tenant";
  message: string;
  evidence?: Record<string, string | number | boolean | null>;
};

export type PayrollPilotCycleCertificationCertificate = {
  kind: "AQSTOQFLOW_PAYROLL_CONTROLLED_PILOT_CYCLE_CERTIFICATE";
  version: 1;
  status: PayrollPilotCycleCertificationStatus;
  generatedAt: string;
  organizationRef: string;
  actorRef: string | null;
  payrollRun: {
    runRef: string;
    runNumber: string;
    status: PayrollRunStatus;
    periodRef: string;
    accountingPeriodRef: string | null;
    countryCode: string;
    countryPackVersion: string;
    countryPackResolutionHash: string;
    documentHash: string | null;
    evidenceHash: string | null;
    calculationHash: string;
    attendanceSnapshotHash: string;
    ledgerPostingBatchHashPresent: boolean;
    accountingSourceLinkPresent: boolean;
    journalEntryPresent: boolean;
    componentRegisterProofHash: string | null;
    componentRegisterProofStatus: string | null;
    payrollComponentMappingHash: string | null;
    payrollComponentMappingStatus: string | null;
  };
  pilotEvidence: {
    runLineCount: number;
    emittedPayslipCount: number;
    declarationCount: number;
    reconciledDeclarationCount: number;
    paymentBatchCount: number;
    settledPaymentBatchCount: number;
    openEmployeeBalanceCaseCount: number;
    closeRunStatus: CloseRunStatus | null;
    proofBackfillStatus: string | null;
  };
  proofContinuity: {
    expectedSourceRegisterHash: string | null;
    declarationSourceRegisterHashes: string[];
    paymentSourceRegisterHashes: string[];
    expectedAdapterChaosReleaseGateHash: string | null;
    declarationAdapterChaosReleaseGateHashes: string[];
    paymentAdapterChaosReleaseGateHashes: string[];
    proofBackfillAdapterChaosReleaseGateHash: string | null;
    proofBackfillAdapterChaosMatchesExpected: boolean;
  };
  signoff: {
    bundleHash: string | null;
    missingRoles: string[];
    payrollAdmin: RedactedSignoff;
    accountingController: RedactedSignoff;
    securityPrivacy: RedactedSignoff;
    operationsOwner: RedactedSignoff;
  };
  blockers: PayrollPilotCycleCertificationBlocker[];
  releaseGateRequirements: Array<{
    gate: string;
    command: string;
    status: "REQUIRED_EXTERNAL_GATE";
  }>;
  certificateHash: string;
  redaction: {
    policy: "payroll-controlled-pilot-cycle-certificate-redaction";
    rawPersonDataIncluded: false;
    rawSalaryIncluded: false;
    rawPaymentDestinationIncluded: false;
    rawProviderPayloadIncluded: false;
    rawAuthorityPayloadIncluded: false;
  };
  persistence: {
    requested: boolean;
    persisted: boolean;
    auditLogId: string | null;
    entityType: "PayrollPilotCycleCertification";
    auditAction: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED" | null;
  };
};

type RedactedSignoff = {
  approvedByRef: string | null;
  approvedAt: string | null;
  evidenceHash: string | null;
  complete: boolean;
};

const pilotRunInclude = {
  payrollPeriod: {
    select: {
      id: true,
      name: true,
      accountingPeriodId: true,
      periodStart: true,
      periodEnd: true,
      payDate: true,
    },
  },
  lines: {
    select: {
      id: true,
      documentHash: true,
      metadata: true,
      payslip: {
        select: {
          id: true,
          status: true,
          documentHash: true,
          issuedAt: true,
        },
      },
    },
  },
  declarations: {
    select: {
      id: true,
      status: true,
      authority: true,
      declarationType: true,
      payloadHash: true,
      metadata: true,
      evidenceItems: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          evidenceHash: true,
          sourceRegisterHash: true,
          authorityResponseHash: true,
          portalReceiptHash: true,
          productionSubmissionSupported: true,
          automationCapabilityStatus: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  },
  paymentBatches: {
    select: {
      id: true,
      status: true,
      evidenceHash: true,
      bankFileHash: true,
      ledgerPostingBatchId: true,
      paymentTransactionId: true,
      reconciliationStatus: true,
      metadata: true,
      allocations: {
        select: {
          id: true,
          payslipId: true,
        },
      },
    },
  },
  employeeBalanceCases: {
    select: {
      id: true,
      status: true,
    },
  },
} satisfies Prisma.PayrollRunInclude;

type PilotRunRecord = Prisma.PayrollRunGetPayload<{
  include: typeof pilotRunInclude;
}>;

function assertReadAllowed(
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll module is not available for this tenant.");
  }
  if (!hasAnyRbacPermission(input.actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError(
      "Missing permission for payroll pilot-cycle certification.",
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" && entry.trim().length > 0
    ? entry.trim()
    : null;
}

function metadataBoolean(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "boolean" ? entry : false;
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function normalizeDate(value: Date | string | number | null | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function addBlocker(
  blockers: PayrollPilotCycleCertificationBlocker[],
  blocker: PayrollPilotCycleCertificationBlocker,
) {
  blockers.push(blocker);
}

function sortedUnique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b));
}

function signoff(
  input: z.output<typeof signoffSchema> | null | undefined,
  role: string,
  now: Date,
) {
  const approvedAt = input?.approvedAt
    ? normalizeDate(input.approvedAt, now).toISOString()
    : null;
  const approvedByRef = redactPayrollSetupRef(input?.approvedById);
  const evidenceHash = input?.evidenceHash ?? null;
  const complete = Boolean(approvedByRef && approvedAt && evidenceHash);

  return {
    role,
    value: {
      approvedByRef,
      approvedAt,
      evidenceHash,
      complete,
    },
  };
}

function buildSignoffBundle(
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
  now: Date,
) {
  const payrollAdmin = signoff(input.signoffBundle?.payrollAdmin, "payroll-admin", now);
  const accountingController = signoff(
    input.signoffBundle?.accountingController,
    "accounting-controller",
    now,
  );
  const securityPrivacy = signoff(
    input.signoffBundle?.securityPrivacy,
    "security-privacy",
    now,
  );
  const operationsOwner = signoff(
    input.signoffBundle?.operationsOwner,
    "operations-owner",
    now,
  );
  const roles = [
    payrollAdmin,
    accountingController,
    securityPrivacy,
    operationsOwner,
  ];
  const missingRoles = roles
    .filter((item) => !item.value.complete)
    .map((item) => item.role);
  const bundleHash = missingRoles.length === 0
    ? prefixedHash({
        payrollAdmin: payrollAdmin.value,
        accountingController: accountingController.value,
        securityPrivacy: securityPrivacy.value,
        operationsOwner: operationsOwner.value,
      })
    : null;

  return {
    bundleHash,
    missingRoles,
    payrollAdmin: payrollAdmin.value,
    accountingController: accountingController.value,
    securityPrivacy: securityPrivacy.value,
    operationsOwner: operationsOwner.value,
  };
}

function latestDeclarationEvidence(declaration: PilotRunRecord["declarations"][number]) {
  return declaration.evidenceItems[0] ?? null;
}

function paymentSourceRegisterHash(batch: PilotRunRecord["paymentBatches"][number]) {
  return (
    metadataString(batch.metadata, "latestSettlementSourceRegisterHash") ??
    metadataString(batch.metadata, "sourceRegisterHash")
  );
}

function paymentLifecycleHash(batch: PilotRunRecord["paymentBatches"][number]) {
  return (
    metadataString(batch.metadata, "latestSettlementLifecycleContractHash") ??
    metadataString(batch.metadata, "providerSettlementLifecycleContractHash")
  );
}

function paymentLifecycleStatus(batch: PilotRunRecord["paymentBatches"][number]) {
  return (
    metadataString(batch.metadata, "latestSettlementLifecycleStatus") ??
    metadataString(batch.metadata, "providerSettlementLifecycleStatus")
  );
}

function evaluateRunProof(run: PilotRunRecord, blockers: PayrollPilotCycleCertificationBlocker[]) {
  const runMetadata = asRecord(run.metadata);
  const componentRegisterProofHash = metadataString(runMetadata, "componentRegisterProofHash");
  const componentRegisterProofStatus = metadataString(runMetadata, "componentRegisterProofStatus");
  const payrollComponentMappingHash = metadataString(runMetadata, "payrollComponentMappingHash");
  const payrollComponentMappingStatus = metadataString(runMetadata, "payrollComponentMappingStatus");

  if (!PILOT_READY_RUN_STATUSES.includes(run.status)) {
    addBlocker(blockers, {
      code: "PILOT_RUN_NOT_POSTED_OR_PAID",
      severity: "critical",
      domain: "run",
      message: "Controlled pilot certification requires a posted, paid, or archived payroll run.",
      evidence: { status: run.status },
    });
  }
  if (!run.documentHash || !run.evidenceHash || !run.calculationHash || !run.attendanceSnapshotHash) {
    addBlocker(blockers, {
      code: "PILOT_RUN_PROOF_HASH_MISSING",
      severity: "critical",
      domain: "run",
      message: "Payroll run document, evidence, calculation, and attendance proof hashes must all be present.",
    });
  }
  if (!run.ledgerPostingBatchId || !run.journalEntryId || !run.accountingSourceLinkId) {
    addBlocker(blockers, {
      code: "PILOT_RUN_ACCOUNTING_SOURCE_LINK_MISSING",
      severity: "critical",
      domain: "close",
      message: "Payroll run must carry ledger batch, journal entry, and accounting source-link proof before pilot certification.",
    });
  }
  if (!componentRegisterProofHash || componentRegisterProofStatus !== "MATCHED") {
    addBlocker(blockers, {
      code: "PILOT_COMPONENT_REGISTER_PROOF_MISSING",
      severity: "critical",
      domain: "register",
      message: "Payroll run metadata must carry matched statutory component register proof.",
      evidence: {
        componentRegisterProofHashPresent: Boolean(componentRegisterProofHash),
        componentRegisterProofStatus,
      },
    });
  }
  if (!payrollComponentMappingHash || !payrollComponentMappingStatus) {
    addBlocker(blockers, {
      code: "PILOT_COMPONENT_MAPPING_PROOF_MISSING",
      severity: "critical",
      domain: "register",
      message: "Payroll run metadata must carry payroll component mapping proof.",
      evidence: {
        payrollComponentMappingHashPresent: Boolean(payrollComponentMappingHash),
        payrollComponentMappingStatus,
      },
    });
  } else if (payrollComponentMappingStatus !== "REVIEWED") {
    addBlocker(blockers, {
      code: "PILOT_COMPONENT_MAPPING_NOT_REVIEWED",
      severity: "critical",
      domain: "register",
      message: "Payroll component mapping proof must be reviewed before controlled pilot certification.",
      evidence: {
        payrollComponentMappingHashPresent: true,
        payrollComponentMappingStatus,
      },
    });
  }

  return {
    componentRegisterProofHash,
    componentRegisterProofStatus,
    payrollComponentMappingHash,
    payrollComponentMappingStatus,
  };
}

function evaluatePayslipProof(run: PilotRunRecord, blockers: PayrollPilotCycleCertificationBlocker[]) {
  if (run.lines.length === 0) {
    addBlocker(blockers, {
      code: "PILOT_RUN_LINES_MISSING",
      severity: "critical",
      domain: "register",
      message: "Controlled pilot certification requires payroll run lines.",
    });
  }

  const missingLineProof = run.lines.filter((line) => !line.documentHash).length;
  const emittedPayslips = run.lines.filter(
    (line) =>
      line.payslip &&
      PILOT_READY_PAYSLIP_STATUSES.includes(line.payslip.status) &&
      line.payslip.documentHash,
  ).length;

  if (missingLineProof > 0) {
    addBlocker(blockers, {
      code: "PILOT_RUN_LINE_PROOF_MISSING",
      severity: "critical",
      domain: "register",
      message: "All pilot payroll run lines must carry document proof.",
      evidence: { missingLineProof },
    });
  }
  if (emittedPayslips !== run.lines.length) {
    addBlocker(blockers, {
      code: "PILOT_PAYSLIP_TIEOUT_INCOMPLETE",
      severity: "critical",
      domain: "payslip",
      message: "Every pilot payroll line must tie out to an emitted/corrected payslip with a document hash.",
      evidence: {
        runLineCount: run.lines.length,
        emittedPayslipCount: emittedPayslips,
      },
    });
  }

  return { emittedPayslips };
}

function evaluateDeclarationProof(
  run: PilotRunRecord,
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
  blockers: PayrollPilotCycleCertificationBlocker[],
) {
  if (run.declarations.length === 0) {
    addBlocker(blockers, {
      code: "PILOT_DECLARATIONS_MISSING",
      severity: "high",
      domain: "declaration",
      message: "Controlled pilot certification requires statutory declaration evidence for the payroll run.",
    });
  }

  let reconciledDeclarationCount = 0;
  for (const declaration of run.declarations) {
    const latest = latestDeclarationEvidence(declaration);
    const latestMetadata = asRecord(latest?.metadata);
    const sourceRegisterHash = latest?.sourceRegisterHash ?? null;
    const adapterChaosReleaseGateHash = metadataString(
      latestMetadata,
      "adapterChaosReleaseGateHash",
    );

    if (!PILOT_READY_DECLARATION_STATUSES.includes(declaration.status)) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_NOT_RECONCILED",
        severity: "high",
        domain: "declaration",
        message: "Pilot declarations must be reconciled or archived before close-ready certification.",
        evidence: { status: declaration.status },
      });
    } else {
      reconciledDeclarationCount += 1;
    }
    if (!declaration.payloadHash || !latest?.evidenceHash) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_EVIDENCE_HASH_MISSING",
        severity: "high",
        domain: "declaration",
        message: "Pilot declarations must carry payload and latest lifecycle evidence hashes.",
      });
    }
    if (!sourceRegisterHash) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_SOURCE_REGISTER_HASH_MISSING",
        severity: "high",
        domain: "declaration",
        message: "Latest declaration evidence must carry source payroll register proof.",
      });
    }
    if (
      input.expectedSourceRegisterHash &&
      sourceRegisterHash &&
      sourceRegisterHash !== input.expectedSourceRegisterHash
    ) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_SOURCE_REGISTER_HASH_MISMATCH",
        severity: "high",
        domain: "declaration",
        message: "Latest declaration evidence source register proof does not match the expected pilot register hash.",
      });
    }
    if (
      !metadataString(latestMetadata, "authorityAdapterProofHash") ||
      !metadataString(latestMetadata, "authorityAdapterContractHash")
    ) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_AUTHORITY_ADAPTER_PROOF_MISSING",
        severity: "high",
        domain: "declaration",
        message: "Latest declaration evidence must carry authority adapter proof and contract hashes.",
      });
    }
    if (
      !metadataString(latestMetadata, "authorityLifecycleContractHash") ||
      !metadataString(latestMetadata, "authorityLifecycleStatus")
    ) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_LIFECYCLE_PROOF_MISSING",
        severity: "high",
        domain: "declaration",
        message: "Latest declaration evidence must carry authority lifecycle proof.",
      });
    }
    if (!adapterChaosReleaseGateHash) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_ADAPTER_CHAOS_HASH_MISSING",
        severity: "high",
        domain: "declaration",
        message: "Pilot declaration evidence must carry adapter chaos release-gate proof.",
      });
    }
    if (
      input.expectedAdapterChaosReleaseGateHash &&
      adapterChaosReleaseGateHash &&
      adapterChaosReleaseGateHash !== input.expectedAdapterChaosReleaseGateHash
    ) {
      addBlocker(blockers, {
        code: "PILOT_DECLARATION_ADAPTER_CHAOS_HASH_MISMATCH",
        severity: "high",
        domain: "declaration",
        message: "Pilot declaration adapter chaos proof does not match the expected release-gate hash.",
      });
    }
  }

  return { reconciledDeclarationCount };
}

function evaluatePaymentProof(
  run: PilotRunRecord,
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
  blockers: PayrollPilotCycleCertificationBlocker[],
) {
  if (run.paymentBatches.length === 0) {
    addBlocker(blockers, {
      code: "PILOT_PAYMENT_BATCHES_MISSING",
      severity: "high",
      domain: "payment",
      message: "Controlled pilot certification requires payroll payment batch evidence.",
    });
  }

  let settledPaymentBatchCount = 0;
  for (const batch of run.paymentBatches) {
    const sourceRegisterHash = paymentSourceRegisterHash(batch);
    const adapterChaosReleaseGateHash = metadataString(
      batch.metadata,
      "adapterChaosReleaseGateHash",
    );

    if (batch.status !== PayrollPaymentBatchStatus.SETTLED) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_BATCH_NOT_SETTLED",
        severity: "high",
        domain: "payment",
        message: "Pilot payment batches must be settled before controlled-cycle certification.",
        evidence: { status: batch.status },
      });
    } else {
      settledPaymentBatchCount += 1;
    }
    if (!batch.evidenceHash || !batch.paymentTransactionId || !batch.reconciliationStatus) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_RECONCILIATION_EVIDENCE_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment batches must carry settlement evidence, payment transaction, and reconciliation status.",
      });
    }
    if (!batch.ledgerPostingBatchId) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_LEDGER_POSTING_MISSING",
        severity: "critical",
        domain: "payment",
        message: "Pilot payment batches must carry payment clearing ledger posting proof.",
      });
    }
    if (batch.allocations.length === 0) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_ALLOCATIONS_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment batches must include payslip allocations for register tie-out.",
      });
    }
    if (!sourceRegisterHash) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_SOURCE_REGISTER_HASH_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment settlement evidence must carry source payroll register proof.",
      });
    }
    if (
      input.expectedSourceRegisterHash &&
      sourceRegisterHash &&
      sourceRegisterHash !== input.expectedSourceRegisterHash
    ) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_SOURCE_REGISTER_HASH_MISMATCH",
        severity: "high",
        domain: "payment",
        message: "Pilot payment settlement source register proof does not match the expected register hash.",
      });
    }
    if (
      !metadataString(batch.metadata, "componentRegisterProofHash") ||
      metadataString(batch.metadata, "componentRegisterProofStatus") !== "MATCHED" ||
      !metadataString(batch.metadata, "payrollComponentMappingHash") ||
      !metadataString(batch.metadata, "payrollComponentMappingStatus")
    ) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_COMPONENT_PROOF_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment settlement evidence must carry component-register and payroll component mapping proof.",
      });
    }
    if (
      !metadataString(batch.metadata, "paymentAdapterProofHash") ||
      !metadataString(batch.metadata, "paymentProviderAdapterContractHash") ||
      !metadataString(batch.metadata, "paymentAdapterStatus") ||
      !metadataString(batch.metadata, "paymentProviderAdapterKey")
    ) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_PROVIDER_ADAPTER_PROOF_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment settlement evidence must carry provider adapter proof and contract hashes.",
      });
    }
    if (!paymentLifecycleHash(batch) || !paymentLifecycleStatus(batch)) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_LIFECYCLE_PROOF_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment settlement evidence must carry provider settlement lifecycle proof.",
      });
    }
    if (!adapterChaosReleaseGateHash) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_ADAPTER_CHAOS_HASH_MISSING",
        severity: "high",
        domain: "payment",
        message: "Pilot payment evidence must carry adapter chaos release-gate proof.",
      });
    }
    if (
      input.expectedAdapterChaosReleaseGateHash &&
      adapterChaosReleaseGateHash &&
      adapterChaosReleaseGateHash !== input.expectedAdapterChaosReleaseGateHash
    ) {
      addBlocker(blockers, {
        code: "PILOT_PAYMENT_ADAPTER_CHAOS_HASH_MISMATCH",
        severity: "high",
        domain: "payment",
        message: "Pilot payment adapter chaos proof does not match the expected release-gate hash.",
      });
    }
  }

  return { settledPaymentBatchCount };
}

function evaluateBackfillProof(
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
  blockers: PayrollPilotCycleCertificationBlocker[],
) {
  const certificate = input.proofBackfillReconciliationCertificate ?? null;
  if (!certificate) {
    addBlocker(blockers, {
      code: "PILOT_PROOF_BACKFILL_CERTIFICATE_MISSING",
      severity: "high",
      domain: "backfill",
      message: "Controlled pilot certification requires a proof-backfill reconciliation certificate.",
    });
    return {
      proofBackfillStatus: null,
      proofBackfillAdapterChaosReleaseGateHash: null,
      proofBackfillAdapterChaosMatchesExpected: false,
    };
  }

  if (certificate.status !== "READY_FOR_CLOSE_RECHECK") {
    addBlocker(blockers, {
      code: "PILOT_PROOF_BACKFILL_NOT_READY_FOR_CLOSE_RECHECK",
      severity: "high",
      domain: "backfill",
      message: "Proof-backfill reconciliation must be ready for close recheck before pilot certification.",
      evidence: { status: certificate.status },
    });
  }
  if (certificate.dataTrustProofGate.status !== "READY") {
    addBlocker(blockers, {
      code: "PILOT_BACKFILL_DATA_TRUST_PROOF_GATE_BLOCKED",
      severity: "high",
      domain: "backfill",
      message: "Proof-backfill data-trust proof gate still has blockers.",
      evidence: {
        blockerCount: certificate.dataTrustProofGate.blockerIds.length,
      },
    });
  }
  if (!certificate.sourceCertificate.adapterChaosReleaseGateHash) {
    addBlocker(blockers, {
      code: "PILOT_BACKFILL_ADAPTER_CHAOS_HASH_MISSING",
      severity: "high",
      domain: "backfill",
      message: "Proof-backfill source certificate must carry adapter chaos release-gate proof.",
    });
  }
  if (!certificate.sourceCertificate.adapterChaosReleaseGateHashMatches) {
    addBlocker(blockers, {
      code: "PILOT_BACKFILL_ADAPTER_CHAOS_HASH_MISMATCH",
      severity: "high",
      domain: "backfill",
      message: "Proof-backfill source adapter chaos proof must match the expected release-gate hash.",
    });
  }
  if (
    input.expectedProofBackfillCertificateHash &&
    certificate.certificateHash !== input.expectedProofBackfillCertificateHash
  ) {
    addBlocker(blockers, {
      code: "PILOT_BACKFILL_CERTIFICATE_HASH_MISMATCH",
      severity: "high",
      domain: "backfill",
      message: "Proof-backfill reconciliation certificate hash does not match the expected pilot pack hash.",
    });
  }

  return {
    proofBackfillStatus: certificate.status,
    proofBackfillAdapterChaosReleaseGateHash:
      certificate.sourceCertificate.adapterChaosReleaseGateHash,
    proofBackfillAdapterChaosMatchesExpected:
      certificate.sourceCertificate.adapterChaosReleaseGateHashMatches,
  };
}

function releaseGateRequirements() {
  return [
    {
      gate: "payroll-pilot-cycle-certification",
      command:
        "npm test -- --runTestsByPath services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts --runInBand",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
    {
      gate: "payroll-proof-backfill-reconciliation",
      command:
        "npm test -- --runTestsByPath services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
    {
      gate: "accounting-data-trust-close-readiness",
      command:
        "npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
    {
      gate: "policy-and-immutability",
      command: "npm run policy:gates",
      status: "REQUIRED_EXTERNAL_GATE" as const,
    },
  ];
}

function statusFor(
  blockers: PayrollPilotCycleCertificationBlocker[],
  missingSignoffs: string[],
): PayrollPilotCycleCertificationStatus {
  if (blockers.length > 0) return "BLOCKED";
  if (missingSignoffs.length > 0) return "READY_FOR_SIGNOFF";
  return "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW";
}

function auditPayload(certificate: PayrollPilotCycleCertificationCertificate) {
  return {
    kind: certificate.kind,
    version: certificate.version,
    status: certificate.status,
    generatedAt: certificate.generatedAt,
    organizationRef: certificate.organizationRef,
    actorRef: certificate.actorRef,
    payrollRun: certificate.payrollRun,
    pilotEvidence: certificate.pilotEvidence,
    proofContinuity: certificate.proofContinuity,
    signoff: certificate.signoff,
    blockers: certificate.blockers,
    certificateHash: certificate.certificateHash,
    redaction: certificate.redaction,
  };
}

async function persistCertificate(
  certificate: PayrollPilotCycleCertificationCertificate,
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
  client: DbClient,
) {
  const audit = await client.auditLog.create({
    data: {
      entityType: "PayrollPilotCycleCertification",
      entityId: input.payrollRunId,
      action: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson(auditPayload(certificate)),
    },
  });

  return {
    ...certificate,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: audit.id,
      entityType: "PayrollPilotCycleCertification" as const,
      auditAction: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED" as const,
    },
  };
}

function proofBackfillCertificateFromAuditLog(row: {
  id: string;
  changes: Prisma.JsonValue | null;
}): PayrollProofBackfillReconciliationCertificate | null {
  const changes = asRecord(row.changes);
  const after = asRecord(changes.after);
  if (Object.keys(after).length === 0) return null;

  return {
    ...after,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: row.id,
      entityType: PROOF_BACKFILL_RECONCILIATION_ENTITY_TYPE,
      auditAction: PROOF_BACKFILL_RECONCILIATION_AUDIT_ACTION,
    },
  } as unknown as PayrollProofBackfillReconciliationCertificate;
}

async function resolveProofBackfillReconciliationCertificate(
  input: z.output<typeof payrollPilotCycleCertificationInputSchema>,
  client: DbClient,
) {
  if (input.proofBackfillReconciliationCertificate) {
    return input.proofBackfillReconciliationCertificate;
  }

  const latest = await client.auditLog.findFirst({
    where: {
      organizationId: input.organizationId,
      entityType: PROOF_BACKFILL_RECONCILIATION_ENTITY_TYPE,
      action: PROOF_BACKFILL_RECONCILIATION_AUDIT_ACTION,
    },
    orderBy: { createdAt: "desc" },
  });

  return latest ? proofBackfillCertificateFromAuditLog(latest) : null;
}

export async function certifyPayrollPilotCycle(
  input: PayrollPilotCycleCertificationInput,
  client: DbClient = db,
): Promise<PayrollPilotCycleCertificationCertificate> {
  const parsed = payrollPilotCycleCertificationInputSchema.parse(input);
  assertReadAllowed(parsed);

  const now = normalizeDate(parsed.now, new Date());
  const run = await client.payrollRun.findFirst({
    where: {
      organizationId: parsed.organizationId,
      id: parsed.payrollRunId,
      deletedAt: null,
    },
    include: pilotRunInclude,
  });

  if (!run) {
    throw new NotFoundError("Payroll pilot-cycle run was not found.");
  }

  const certificationInput = {
    ...parsed,
    proofBackfillReconciliationCertificate:
      await resolveProofBackfillReconciliationCertificate(parsed, client),
  };

  const blockers: PayrollPilotCycleCertificationBlocker[] = [];
  const runProof = evaluateRunProof(run, blockers);
  const payslipProof = evaluatePayslipProof(run, blockers);
  const declarationProof = evaluateDeclarationProof(run, parsed, blockers);
  const paymentProof = evaluatePaymentProof(run, parsed, blockers);
  const backfillProof = evaluateBackfillProof(certificationInput, blockers);

  const openEmployeeBalanceCaseCount = run.employeeBalanceCases.filter(
    (item) => item.status === "OPEN" || item.status === "PARTIALLY_SETTLED",
  ).length;
  if (openEmployeeBalanceCaseCount > 0) {
    addBlocker(blockers, {
      code: "PILOT_EMPLOYEE_BALANCE_CASES_OPEN",
      severity: "high",
      domain: "payment",
      message: "Employee balance recovery cases must be settled or closed before pilot certification.",
      evidence: { openEmployeeBalanceCaseCount },
    });
  }

  const closeRun = run.payrollPeriod.accountingPeriodId
    ? await client.closeRun.findFirst({
        where: {
          organizationId: parsed.organizationId,
          periodId: run.payrollPeriod.accountingPeriodId,
          voidedAt: null,
        },
        orderBy: { asOf: "desc" },
        select: { id: true, status: true },
      })
    : null;

  if (!run.payrollPeriod.accountingPeriodId) {
    addBlocker(blockers, {
      code: "PILOT_ACCOUNTING_PERIOD_LINK_MISSING",
      severity: "critical",
      domain: "close",
      message: "Pilot payroll period must be linked to an accounting period for close assurance.",
    });
  } else if (!closeRun) {
    addBlocker(blockers, {
      code: "PILOT_CLOSE_RUN_MISSING",
      severity: "critical",
      domain: "close",
      message: "Pilot certification requires a close assurance run for the payroll accounting period.",
    });
  } else if (!PILOT_READY_CLOSE_STATUSES.includes(closeRun.status)) {
    addBlocker(blockers, {
      code: "PILOT_CLOSE_RUN_NOT_READY",
      severity: "critical",
      domain: "close",
      message: "Close assurance must be ready or certified before pilot-cycle certification.",
      evidence: { closeRunStatus: closeRun.status },
    });
  }

  if (!parsed.expectedAdapterChaosReleaseGateHash) {
    addBlocker(blockers, {
      code: "PILOT_EXPECTED_ADAPTER_CHAOS_HASH_MISSING",
      severity: "high",
      domain: "tenant",
      message: "Pilot certification requires the expected adapter chaos release-gate hash for proof continuity.",
    });
  }

  const signoff = buildSignoffBundle(parsed, now);
  const status = statusFor(blockers, signoff.missingRoles);
  const declarationSourceRegisterHashes = sortedUnique(
    run.declarations.map((declaration) => latestDeclarationEvidence(declaration)?.sourceRegisterHash),
  );
  const declarationAdapterChaosReleaseGateHashes = sortedUnique(
    run.declarations.map((declaration) =>
      metadataString(latestDeclarationEvidence(declaration)?.metadata, "adapterChaosReleaseGateHash"),
    ),
  );
  const paymentSourceRegisterHashes = sortedUnique(
    run.paymentBatches.map((batch) => paymentSourceRegisterHash(batch)),
  );
  const paymentAdapterChaosReleaseGateHashes = sortedUnique(
    run.paymentBatches.map((batch) => metadataString(batch.metadata, "adapterChaosReleaseGateHash")),
  );

  const certificateWithoutHash = {
    kind: "AQSTOQFLOW_PAYROLL_CONTROLLED_PILOT_CYCLE_CERTIFICATE" as const,
    version: 1 as const,
    status,
    generatedAt: now.toISOString(),
    organizationRef: redactPayrollSetupRef(parsed.organizationId) ?? "redacted:unknown",
    actorRef: redactPayrollSetupRef(parsed.actorId),
    payrollRun: {
      runRef: redactPayrollSetupRef(run.id) ?? "redacted:unknown",
      runNumber: run.runNumber,
      status: run.status,
      periodRef: redactPayrollSetupRef(run.payrollPeriodId) ?? "redacted:unknown",
      accountingPeriodRef: redactPayrollSetupRef(run.payrollPeriod.accountingPeriodId),
      countryCode: run.countryCode,
      countryPackVersion: run.countryPackVersion,
      countryPackResolutionHash: run.countryPackResolutionHash,
      documentHash: run.documentHash,
      evidenceHash: run.evidenceHash,
      calculationHash: run.calculationHash,
      attendanceSnapshotHash: run.attendanceSnapshotHash,
      ledgerPostingBatchHashPresent: Boolean(run.ledgerPostingBatchId),
      accountingSourceLinkPresent: Boolean(run.accountingSourceLinkId),
      journalEntryPresent: Boolean(run.journalEntryId),
      componentRegisterProofHash: runProof.componentRegisterProofHash,
      componentRegisterProofStatus: runProof.componentRegisterProofStatus,
      payrollComponentMappingHash: runProof.payrollComponentMappingHash,
      payrollComponentMappingStatus: runProof.payrollComponentMappingStatus,
    },
    pilotEvidence: {
      runLineCount: run.lines.length,
      emittedPayslipCount: payslipProof.emittedPayslips,
      declarationCount: run.declarations.length,
      reconciledDeclarationCount: declarationProof.reconciledDeclarationCount,
      paymentBatchCount: run.paymentBatches.length,
      settledPaymentBatchCount: paymentProof.settledPaymentBatchCount,
      openEmployeeBalanceCaseCount,
      closeRunStatus: closeRun?.status ?? null,
      proofBackfillStatus: backfillProof.proofBackfillStatus,
    },
    proofContinuity: {
      expectedSourceRegisterHash: parsed.expectedSourceRegisterHash ?? null,
      declarationSourceRegisterHashes,
      paymentSourceRegisterHashes,
      expectedAdapterChaosReleaseGateHash:
        parsed.expectedAdapterChaosReleaseGateHash ?? null,
      declarationAdapterChaosReleaseGateHashes,
      paymentAdapterChaosReleaseGateHashes,
      proofBackfillAdapterChaosReleaseGateHash:
        backfillProof.proofBackfillAdapterChaosReleaseGateHash,
      proofBackfillAdapterChaosMatchesExpected:
        backfillProof.proofBackfillAdapterChaosMatchesExpected,
    },
    signoff,
    blockers,
    releaseGateRequirements: releaseGateRequirements(),
    redaction: {
      policy: "payroll-controlled-pilot-cycle-certificate-redaction" as const,
      rawPersonDataIncluded: false as const,
      rawSalaryIncluded: false as const,
      rawPaymentDestinationIncluded: false as const,
      rawProviderPayloadIncluded: false as const,
      rawAuthorityPayloadIncluded: false as const,
    },
  };

  const certificate: PayrollPilotCycleCertificationCertificate = {
    ...certificateWithoutHash,
    certificateHash: prefixedHash(certificateWithoutHash),
    persistence: {
      requested: Boolean(parsed.persistCertificate),
      persisted: false,
      auditLogId: null,
      entityType: "PayrollPilotCycleCertification",
      auditAction: null,
    },
  };

  if (parsed.persistCertificate) {
    return persistCertificate(certificate, parsed, client);
  }

  return certificate;
}

export function formatPayrollPilotCycleCertificationCertificate(
  certificate: PayrollPilotCycleCertificationCertificate,
) {
  const blockers = certificate.blockers.length
    ? certificate.blockers
        .map((blocker) => `- ${blocker.code}: ${blocker.message}`)
        .join("\n")
    : "- None.";
  const missingSignoffs = certificate.signoff.missingRoles.length
    ? certificate.signoff.missingRoles.map((role) => `- ${role}`).join("\n")
    : "- None.";
  const gates = certificate.releaseGateRequirements
    .map((item) => `- ${item.gate}: ${item.command}`)
    .join("\n");

  return `# Payroll Controlled Pilot Cycle Certificate

Generated: ${certificate.generatedAt}
Status: ${certificate.status}
Certificate hash: ${certificate.certificateHash}
Run: ${certificate.payrollRun.runNumber} (${certificate.payrollRun.status})
Register evidence hash: ${certificate.payrollRun.evidenceHash ?? "missing"}
Component proof: ${certificate.payrollRun.componentRegisterProofStatus ?? "missing"} / ${certificate.payrollRun.componentRegisterProofHash ?? "missing"}
Component mapping: ${certificate.payrollRun.payrollComponentMappingStatus ?? "missing"} / ${certificate.payrollRun.payrollComponentMappingHash ?? "missing"}
Close run status: ${certificate.pilotEvidence.closeRunStatus ?? "missing"}
Proof-backfill status: ${certificate.pilotEvidence.proofBackfillStatus ?? "missing"}
Adapter chaos expected: ${certificate.proofContinuity.expectedAdapterChaosReleaseGateHash ?? "missing"}
Audit persistence: ${certificate.persistence.persisted ? `yes (${certificate.persistence.auditLogId})` : "no"}

## Pilot Evidence

| Evidence | Count |
| --- | ---: |
| Run lines | ${certificate.pilotEvidence.runLineCount} |
| Emitted/corrected payslips | ${certificate.pilotEvidence.emittedPayslipCount} |
| Declarations | ${certificate.pilotEvidence.declarationCount} |
| Reconciled declarations | ${certificate.pilotEvidence.reconciledDeclarationCount} |
| Payment batches | ${certificate.pilotEvidence.paymentBatchCount} |
| Settled payment batches | ${certificate.pilotEvidence.settledPaymentBatchCount} |
| Open employee balance cases | ${certificate.pilotEvidence.openEmployeeBalanceCaseCount} |

## Blockers

${blockers}

## Missing Signoffs

${missingSignoffs}

## Required Release Gates

${gates}

## Redaction

- Raw person data included: ${certificate.redaction.rawPersonDataIncluded}
- Raw salary included: ${certificate.redaction.rawSalaryIncluded}
- Raw payment destination included: ${certificate.redaction.rawPaymentDestinationIncluded}
- Raw provider payload included: ${certificate.redaction.rawProviderPayloadIncluded}
- Raw authority payload included: ${certificate.redaction.rawAuthorityPayloadIncluded}
`;
}
