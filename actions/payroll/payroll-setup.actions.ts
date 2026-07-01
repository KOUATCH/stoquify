"use server";

import { protect } from "@/services/_shared/protect";
import {
  getPayrollSetupEvidenceReadModel,
  type PayrollSetupEvidenceReadModel,
} from "@/services/payroll/payroll-setup-evidence.service";
import {
  getPayrollSetupReadiness,
  type PayrollEmployeeSourceMode,
  type PayrollSetupReadinessInput,
  type PayrollSetupReadinessResult,
} from "@/services/payroll/payroll-setup-readiness.service";
import {
  preparePayrollProofBackfillExecution,
  type PayrollProofBackfillExecutionCertificate,
  type PayrollProofBackfillExecutionMode,
  type PayrollProofBackfillSignoffBundle,
} from "@/services/payroll/payroll-proof-backfill-executor.service";
import {
  reconcilePayrollProofBackfillCertificate,
  type PayrollProofBackfillReconciliationCertificate,
} from "@/services/payroll/payroll-proof-backfill-reconciliation.service";
import {
  generatePayrollSeedBackfillDryRunPlan,
  type PayrollSeedBackfillDryRunPlan,
} from "@/services/payroll/payroll-seed-backfill-plan.service";

export type {
  PayrollProofBackfillExecutionCertificate,
  PayrollProofBackfillReconciliationCertificate,
  PayrollSeedBackfillDryRunPlan,
  PayrollSetupEvidenceReadModel,
  PayrollSetupReadinessResult,
};

const PAYROLL_SETUP_PERMISSION = "payroll.runs.calculate";
const employeeSourceModes = new Set<PayrollEmployeeSourceMode>([
  "users",
  "csv",
  "external",
  "manual-plan",
]);
const proofBackfillExecutionModes = new Set<PayrollProofBackfillExecutionMode>([
  "validate",
  "execute",
]);

type ProtectedPayrollContext = {
  orgId: string;
  userId: string;
  permissions: readonly string[];
};

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: unknown) {
  const raw = firstValue(value);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function numberValue(value: unknown) {
  const raw = firstValue(value);
  const parsed =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function employeeSourceMode(
  value: unknown,
): PayrollEmployeeSourceMode | undefined {
  const raw = stringValue(value);
  return raw && employeeSourceModes.has(raw as PayrollEmployeeSourceMode)
    ? (raw as PayrollEmployeeSourceMode)
    : undefined;
}

function proofBackfillExecutionMode(
  value: unknown,
): PayrollProofBackfillExecutionMode | undefined {
  const raw = stringValue(value);
  return raw &&
    proofBackfillExecutionModes.has(raw as PayrollProofBackfillExecutionMode)
    ? (raw as PayrollProofBackfillExecutionMode)
    : undefined;
}

function signoffBundle(
  value: unknown,
): PayrollProofBackfillSignoffBundle | undefined {
  const raw = asRecord(firstValue(value));
  if (Object.keys(raw).length === 0) return undefined;

  return {
    dryRunEvidenceHash: stringValue(raw.dryRunEvidenceHash),
    approvalTokenHash: stringValue(raw.approvalTokenHash),
    payrollAdminApprovedById: stringValue(raw.payrollAdminApprovedById),
    accountingControllerApprovedById: stringValue(
      raw.accountingControllerApprovedById,
    ),
    securityPrivacyApprovedById: stringValue(raw.securityPrivacyApprovedById),
    operationsOwnerApprovedById: stringValue(raw.operationsOwnerApprovedById),
    approvedAt: stringValue(raw.approvedAt),
    approvalNotes: stringValue(raw.approvalNotes),
  };
}

function dryRunValue(value: unknown) {
  const raw = firstValue(value);
  return !(raw === false || raw === "false");
}

function booleanValue(value: unknown) {
  const raw = firstValue(value);
  return raw === true || raw === "true";
}

function proofBackfillExecutionInput(
  input: unknown,
  ctx: ProtectedPayrollContext,
  overrides: {
    executionMode?: PayrollProofBackfillExecutionMode;
    executionMutationApproved?: boolean;
    lastAuthAt?: Date;
  } = {},
) {
  const raw = asRecord(input);

  return {
    ...setupInput(input, ctx),
    executionMode:
      overrides.executionMode ??
      proofBackfillExecutionMode(raw.executionMode) ??
      "validate",
    executionMutationApproved:
      overrides.executionMutationApproved ??
      booleanValue(raw.executionMutationApproved),
    lastAuthAt: overrides.lastAuthAt,
    expectedDryRunEvidenceHash: stringValue(
      raw.expectedDryRunEvidenceHash ?? raw.dryRunEvidenceHash,
    ),
    adapterChaosReleaseGateHash: stringValue(raw.adapterChaosReleaseGateHash),
    idempotencyKey: stringValue(raw.idempotencyKey),
    now: stringValue(raw.now),
    persistCertificate: booleanValue(raw.persistCertificate),
    signoffBundle: signoffBundle(raw.signoffBundle),
  };
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultPayrollSetupWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 0));

  return {
    periodStart: isoDate(periodStart),
    periodEnd: isoDate(periodEnd),
    payDate: isoDate(periodEnd),
  };
}

function setupInput(
  input: unknown,
  ctx: ProtectedPayrollContext,
): PayrollSetupReadinessInput {
  const raw = asRecord(input);
  const defaults = defaultPayrollSetupWindow();

  return {
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
    countryCode: stringValue(raw.countryCode ?? raw.country),
    periodStart: stringValue(raw.periodStart) ?? defaults.periodStart,
    periodEnd: stringValue(raw.periodEnd) ?? defaults.periodEnd,
    payDate: stringValue(raw.payDate) ?? defaults.payDate,
    employeeSourceMode: employeeSourceMode(raw.employeeSourceMode) ?? "users",
    maxRows: numberValue(raw.maxRows) ?? 100,
  };
}

const getSetupReadiness = protect<unknown, PayrollSetupReadinessResult>(
  {
    permission: PAYROLL_SETUP_PERMISSION,
    auditResource: "PayrollSetupReadiness",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.setup.readiness",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => getPayrollSetupReadiness(setupInput(input, ctx)),
);

export async function getPayrollSetupReadinessAction(input: unknown = {}) {
  return getSetupReadiness(input);
}

const generateDryRunPlan = protect<unknown, PayrollSeedBackfillDryRunPlan>(
  {
    permission: PAYROLL_SETUP_PERMISSION,
    auditResource: "PayrollSeedBackfillDryRunPlan",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.setup.dry_run",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input);

    return generatePayrollSeedBackfillDryRunPlan({
      ...setupInput(input, ctx),
      dryRun: dryRunValue(raw.dryRun),
    });
  },
);

export async function generatePayrollSeedBackfillDryRunPlanAction(
  input: unknown = {},
) {
  return generateDryRunPlan(input);
}

const getSetupEvidenceReadModel = protect<
  unknown,
  PayrollSetupEvidenceReadModel
>(
  {
    permission: PAYROLL_SETUP_PERMISSION,
    auditResource: "PayrollSetupEvidenceReadModel",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.setup.evidence",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    getPayrollSetupEvidenceReadModel(setupInput(input, ctx)),
);

export async function getPayrollSetupEvidenceReadModelAction(
  input: unknown = {},
) {
  return getSetupEvidenceReadModel(input);
}

const validateProofBackfillExecution = protect<
  unknown,
  PayrollProofBackfillExecutionCertificate
>(
  {
    permission: PAYROLL_SETUP_PERMISSION,
    auditResource: "PayrollProofBackfillExecutionCertificate",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.setup.proof_backfill_execution",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    preparePayrollProofBackfillExecution(
      proofBackfillExecutionInput(input, ctx, {
        executionMode: "validate",
        executionMutationApproved: false,
      }),
    ),
);

const executeProofBackfillExecution = protect<
  unknown,
  PayrollProofBackfillExecutionCertificate
>(
  {
    permission: PAYROLL_SETUP_PERMISSION,
    auditResource: "PayrollProofBackfillExecutionCertificate",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.setup.proof_backfill_execution",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    preparePayrollProofBackfillExecution(
      proofBackfillExecutionInput(input, ctx, {
        executionMode: "execute",
        executionMutationApproved: booleanValue(
          asRecord(input).executionMutationApproved,
        ),
        lastAuthAt: ctx.freshAuth?.lastAuthAt,
      }),
    ),
);

export async function preparePayrollProofBackfillExecutionAction(
  input: unknown = {},
) {
  const raw = asRecord(input);
  const mode = proofBackfillExecutionMode(raw.executionMode) ?? "validate";
  return mode === "execute"
    ? executeProofBackfillExecution(input)
    : validateProofBackfillExecution(input);
}

const reconcileProofBackfillCertificate = protect<
  unknown,
  PayrollProofBackfillReconciliationCertificate
>(
  {
    permission: PAYROLL_SETUP_PERMISSION,
    auditResource: "PayrollProofBackfillReconciliationCertificate",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.setup.proof_backfill_reconciliation",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input);

    return reconcilePayrollProofBackfillCertificate({
      ...setupInput(input, ctx),
      sourceCertificateAuditLogId: stringValue(
        raw.sourceCertificateAuditLogId ?? raw.auditLogId,
      ),
      sourceCertificateLedgerKey: stringValue(
        raw.sourceCertificateLedgerKey ?? raw.ledgerKey,
      ),
      expectedSourceCertificateHash: stringValue(
        raw.expectedSourceCertificateHash ?? raw.certificateHash,
      ),
      expectedSourceDryRunEvidenceHash: stringValue(
        raw.expectedSourceDryRunEvidenceHash ?? raw.dryRunEvidenceHash,
      ),
      now: stringValue(raw.now),
      persistCertificate: booleanValue(raw.persistCertificate),
    });
  },
);

export async function reconcilePayrollProofBackfillCertificateAction(
  input: unknown = {},
) {
  return reconcileProofBackfillCertificate(input);
}
