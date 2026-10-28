import { PayrollRunStatus } from "@prisma/client";

import {
  classifyPayrollTransitionEvidence,
  type PayrollTransitionEvidenceClassification,
  type PayrollTransitionEvidenceRow,
} from "./payroll-transition-evidence";

export type PayrollRunLifecycleAction = {
  id: "calculate" | "review" | "approve" | "emit" | "post";
  label: string;
  requiredPermission: string;
  requiresFreshAuth: boolean;
  requiresSeparateApprover: boolean;
  href: "/dashboard/payroll/runs";
};

export type PayrollRunLifecycleStageEvidence = {
  stage: PayrollRunStatus;
  completed: boolean;
  actorPresent: boolean;
  transitionedAt: string | null;
  businessEventId: string | null;
  fromVersion: number | null;
  toVersion: number | null;
  origin: string | null;
  evidenceStatus: string | null;
};

export type PayrollRunLifecycleReadModel = {
  status: PayrollRunStatus;
  version: number;
  transitionEvidence: PayrollTransitionEvidenceClassification;
  writeEnabled: boolean;
  complete: boolean;
  blockerCodes: string[];
  nextAction: PayrollRunLifecycleAction | null;
  stages: PayrollRunLifecycleStageEvidence[];
};

const transitionStages = [
  PayrollRunStatus.REVIEWED,
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.EMITTED,
  PayrollRunStatus.POSTED,
] as const;

const completeStatuses: readonly PayrollRunStatus[] = [
  PayrollRunStatus.POSTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.ARCHIVED,
];

const actionByStatus: Partial<
  Record<PayrollRunStatus, PayrollRunLifecycleAction>
> = {
  [PayrollRunStatus.DRAFT]: {
    id: "calculate",
    label: "Calculate draft payroll run",
    requiredPermission: "payroll.runs.calculate",
    requiresFreshAuth: false,
    requiresSeparateApprover: false,
    href: "/dashboard/payroll/runs",
  },
  [PayrollRunStatus.CALCULATED]: {
    id: "review",
    label: "Review calculated payroll run",
    requiredPermission: "payroll.runs.review",
    requiresFreshAuth: true,
    requiresSeparateApprover: true,
    href: "/dashboard/payroll/runs",
  },
  [PayrollRunStatus.REVIEWED]: {
    id: "approve",
    label: "Approve reviewed payroll run",
    requiredPermission: "payroll.runs.approve",
    requiresFreshAuth: true,
    requiresSeparateApprover: true,
    href: "/dashboard/payroll/runs",
  },
  [PayrollRunStatus.APPROVED]: {
    id: "emit",
    label: "Emit approved payslips",
    requiredPermission: "payroll.payslips.emit",
    requiresFreshAuth: true,
    requiresSeparateApprover: true,
    href: "/dashboard/payroll/runs",
  },
  [PayrollRunStatus.EMITTED]: {
    id: "post",
    label: "Post emitted payroll run",
    requiredPermission: "payroll.runs.post",
    requiresFreshAuth: true,
    requiresSeparateApprover: true,
    href: "/dashboard/payroll/runs",
  },
};

export function buildPayrollRunLifecycleReadModel(input: {
  status: PayrollRunStatus;
  version: number;
  transitions?: readonly PayrollTransitionEvidenceRow[];
  writeEnabled: boolean;
}): PayrollRunLifecycleReadModel {
  const transitions = input.transitions ?? [];
  const transitionEvidence = classifyPayrollTransitionEvidence({
    status: input.status,
    transitions,
  });
  const nextAction = actionByStatus[input.status] ?? null;
  const blockerCodes: string[] = [];

  if (transitionEvidence === "MISSING_POST_CUTOVER") {
    blockerCodes.push("PAYROLL_TRANSITION_PROOF_MISSING");
  } else if (transitionEvidence === "LEGACY_PARTIAL") {
    blockerCodes.push("PAYROLL_TRANSITION_PROOF_LEGACY_PARTIAL");
  }
  if (nextAction && !input.writeEnabled) {
    blockerCodes.push("PAYROLL_TRUST_SPINE_WRITES_DISABLED");
  }

  const byStage = new Map(transitions.map((row) => [row.toStatus, row]));
  const stages = transitionStages.map((stage) => {
    const row = byStage.get(stage) ?? null;
    return {
      stage,
      completed: Boolean(row),
      actorPresent: Boolean(row?.actorId),
      transitionedAt: row?.transitionedAt?.toISOString() ?? null,
      businessEventId: row?.businessEventId ?? null,
      fromVersion: row?.fromVersion ?? null,
      toVersion: row?.toVersion ?? null,
      origin: row?.origin ?? null,
      evidenceStatus: row?.evidenceStatus ?? null,
    };
  });

  return {
    status: input.status,
    version: input.version,
    transitionEvidence,
    writeEnabled: input.writeEnabled,
    complete:
      completeStatuses.includes(input.status) &&
      transitionEvidence === "VERIFIED",
    blockerCodes,
    nextAction,
    stages,
  };
}
