"use server";

import { protect } from "@/services/_shared/protect";
import {
  certifyPayrollPilotCycle,
  type PayrollPilotCycleCertificationCertificate,
} from "@/services/payroll/payroll-pilot-cycle-certification.service";

type ProtectedPayrollContext = {
  orgId: string;
  userId: string;
  permissions: readonly string[];
};

type SignoffRole =
  | "payrollAdmin"
  | "accountingController"
  | "securityPrivacy"
  | "operationsOwner";

export type { PayrollPilotCycleCertificationCertificate };

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

function booleanValue(value: unknown) {
  const raw = firstValue(value);
  return raw === true || raw === "true";
}

function signoff(
  raw: Record<string, unknown>,
  role: SignoffRole,
  flatPrefix: string,
) {
  const bundle = asRecord(raw.signoffBundle);
  const nested = asRecord(bundle[role]);

  return {
    approvedById: stringValue(
      nested.approvedById ?? raw[`${flatPrefix}ApprovedById`],
    ),
    approvedAt: stringValue(nested.approvedAt ?? raw[`${flatPrefix}ApprovedAt`]),
    evidenceHash: stringValue(nested.evidenceHash ?? raw[`${flatPrefix}EvidenceHash`]),
  };
}

function signoffBundle(raw: Record<string, unknown>) {
  return {
    payrollAdmin: signoff(raw, "payrollAdmin", "payrollAdmin"),
    accountingController: signoff(
      raw,
      "accountingController",
      "accountingController",
    ),
    securityPrivacy: signoff(raw, "securityPrivacy", "securityPrivacy"),
    operationsOwner: signoff(raw, "operationsOwner", "operationsOwner"),
  };
}

function certificationInput(
  input: unknown,
  ctx: ProtectedPayrollContext,
  persistCertificate: boolean,
) {
  const raw = asRecord(input);

  return {
    organizationId: ctx.orgId,
    payrollRunId: stringValue(raw.payrollRunId ?? raw.runId) ?? "",
    actorId: ctx.userId,
    actorPermissions: [...ctx.permissions],
    expectedSourceRegisterHash: stringValue(raw.expectedSourceRegisterHash),
    expectedAdapterChaosReleaseGateHash: stringValue(
      raw.expectedAdapterChaosReleaseGateHash ?? raw.adapterChaosReleaseGateHash,
    ),
    expectedProofBackfillCertificateHash: stringValue(
      raw.expectedProofBackfillCertificateHash ?? raw.proofBackfillCertificateHash,
    ),
    signoffBundle: signoffBundle(raw),
    now: stringValue(raw.now),
    persistCertificate,
  };
}

const evaluatePilotCertification = protect<
  unknown,
  PayrollPilotCycleCertificationCertificate
>(
  {
    permission: "payroll.command.read",
    auditResource: "PayrollPilotCycleCertification",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.pilot_cycle.certify",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    certifyPayrollPilotCycle(certificationInput(input, ctx, false)),
);

const persistPilotCertification = protect<
  unknown,
  PayrollPilotCycleCertificationCertificate
>(
  {
    permission: "payroll.command.read",
    auditResource: "PayrollPilotCycleCertification",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.pilot_cycle.certify",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    certifyPayrollPilotCycle(certificationInput(input, ctx, true)),
);

export async function certifyPayrollPilotCycleAction(input: unknown = {}) {
  const raw = asRecord(input);
  return booleanValue(raw.persistCertificate)
    ? persistPilotCertification(input)
    : evaluatePilotCertification(input);
}