import {
  createAssuranceSourceHash,
  type WorkflowAssuranceCounts,
  type WorkflowAssuranceDefinitionExecutionInput,
  type WorkflowAssuranceEvidenceLink,
  type WorkflowAssuranceResultStatus,
  type WorkflowAssuranceSeverity,
  type WorkflowAssuranceSourceFindingInput,
} from "@/services/assurance/assurance-registry-contracts";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
  type CashShortageBlockedEvaluation,
  type CashShortageEvidenceV1,
  type CashShortageEvaluation,
  type CashShortageTriggeredEvaluation,
} from "./pos-shift-cash-shortage-contracts";
import type {
  PosShiftCashShortageBatchItem,
  PosShiftCashShortageBatchResult,
} from "./pos-shift-cash-shortage-batch.service";

const ACTION_ROUTE = "/dashboard/manager-action-center";

const EMPTY_COUNTS: WorkflowAssuranceCounts = {
  scanned: 0,
  passed: 0,
  warning: 0,
  failed: 0,
  blocked: 0,
  skipped: 0,
  error: 0,
};

const STATUS_PRECEDENCE = {
  passed: 0,
  skipped: 1,
  warning: 2,
  failed: 3,
  blocked: 4,
  error: 5,
} as const satisfies Record<WorkflowAssuranceResultStatus, number>;

const SEVERITY_PRECEDENCE = {
  info: 0,
  warning: 1,
  high: 2,
  blocking: 3,
  compliance_critical: 4,
} as const satisfies Record<WorkflowAssuranceSeverity, number>;

export function createPosShiftCashShortageAssuranceOutput(
  batch: PosShiftCashShortageBatchResult,
): WorkflowAssuranceDefinitionExecutionInput {
  const findings = batch.items.map((item, index) =>
    toSourceFinding(item, index, batch.organizationId),
  );
  const counts = sumCounts(
    findings.map((finding) => finding.counts ?? {}),
  );
  const aggregateStatus = strongestStatus(findings);
  const aggregateSeverity = strongestSeverity(findings);

  return {
    aggregate: {
      status: aggregateStatus,
      severity: aggregateSeverity,
      sourceHash: createAssuranceSourceHash({
        checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
        definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
        organizationId: batch.organizationId,
        recordedFromInclusive: batch.recordedFromInclusive,
        recordedThroughExclusive: batch.recordedThroughExclusive,
        hasMore: batch.hasMore,
        nextCursor: batch.nextCursor,
        counts,
        findings: findings.map((finding) => ({
          ordinal: finding.ordinal,
          sourceType: finding.sourceType,
          sourceId: finding.sourceId,
          sourceHash: finding.sourceHash,
          status: finding.status,
          severity: finding.severity,
        })),
      }),
      message: aggregateMessage(counts),
      recommendedAction: aggregateRecommendedAction(counts),
      counts,
      evidenceLinks: [
        {
          sourceTable: "business_events",
          sourceType: "pos.shift.closed",
          sourceId: "cash_shortage_batch",
          label: "POS cash drawer close events",
          route: ACTION_ROUTE,
          metadata: {
            recordedFromInclusive: batch.recordedFromInclusive,
            recordedThroughExclusive: batch.recordedThroughExclusive,
            hasMore: batch.hasMore,
            nextCursor: batch.nextCursor,
          },
        },
      ],
      metadata: {
        adapter: "pos-shift-cash-shortage-assurance-adapter",
        dormantRegistryIntegration: true,
      },
    },
    findings,
  };
}

function toSourceFinding(
  item: PosShiftCashShortageBatchItem,
  ordinal: number,
  organizationId: string,
): WorkflowAssuranceSourceFindingInput {
  const evaluation = item.evaluation;
  if (evaluation.outcome === "blocked") {
    return blockedFinding(item, ordinal, organizationId, evaluation);
  }

  const evidence = evaluation.evidence;
  const triggered = evaluation.outcome === "triggered" ? evaluation : null;
  const status = statusForEvaluation(evaluation);
  const severity = severityForEvaluation(evaluation);
  const sourceHash = createAssuranceSourceHash({
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    eventId: evidence.eventId,
    sourceHash: evidence.sourceHash,
    outcome: evaluation.outcome,
    severity,
    amountAtRisk: evidence.normalized.amountAtRisk,
    policyHash: evidence.policy.policyHash,
  });

  return {
    ordinal,
    status,
    severity,
    sourceType: evidence.sourceType,
    sourceId: evidence.sourceId,
    sourceHash,
    message: evaluation.message,
    recommendedAction: triggered?.recommendedAction,
    counts: countsForStatus(status),
    evidenceLinks: evidenceLinksForEvidence(evidence, item.recordedAt),
    metadata: {
      eventId: evidence.eventId,
      recordedAt: item.recordedAt,
      outcome: evaluation.outcome,
      notTriggeredReason:
        evaluation.outcome === "not_triggered" ? evaluation.reason : undefined,
      amountAtRisk: evidence.normalized.amountAtRisk,
      currency: evidence.currency,
      locationId: evidence.locationId,
      terminalId: evidence.terminalId,
      cashDrawerId: evidence.cashDrawerId,
      cashierId: evidence.cashierId,
      closerId: evidence.closerId,
      policyId: evidence.policy.policyId,
      policyVersion: evidence.policy.version,
      policyMode: evidence.policy.mode,
      authorityMode: evidence.authorityMode,
    },
  };
}

function blockedFinding(
  item: PosShiftCashShortageBatchItem,
  ordinal: number,
  organizationId: string,
  evaluation: CashShortageBlockedEvaluation,
): WorkflowAssuranceSourceFindingInput {
  const sourceId = item.sourceId ?? item.eventId;
  const sourceHash = createAssuranceSourceHash({
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    organizationId,
    eventId: item.eventId,
    sourceId,
    recordedAt: item.recordedAt,
    outcome: evaluation.outcome,
    code: evaluation.code,
  });

  return {
    ordinal,
    status: "blocked",
    severity: "blocking",
    sourceType: "BusinessEvent",
    sourceId,
    sourceHash,
    message: evaluation.message,
    recommendedAction:
      "Repair the blocked POS close event or policy prerequisite before this cash-shortage check is allowed to persist incidents.",
    counts: countsForStatus("blocked"),
    evidenceLinks: [
      {
        sourceTable: "business_events",
        sourceType: "pos.shift.closed",
        sourceId: item.eventId,
        sourceHash,
        label: "Blocked POS cash drawer close event",
        route: ACTION_ROUTE,
        metadata: {
          recordedAt: item.recordedAt,
          sourceId: item.sourceId,
          blockCode: evaluation.code,
        },
      },
    ],
    metadata: {
      eventId: item.eventId,
      recordedAt: item.recordedAt,
      outcome: evaluation.outcome,
      blockCode: evaluation.code,
      organizationId,
    },
  };
}

function statusForEvaluation(
  evaluation: CashShortageEvaluation,
): WorkflowAssuranceResultStatus {
  if (evaluation.outcome === "blocked") return "blocked";
  if (evaluation.outcome === "not_triggered") return "passed";
  return evaluation.severity === "high" ? "failed" : "warning";
}

function severityForEvaluation(
  evaluation: CashShortageEvaluation,
): WorkflowAssuranceSeverity {
  if (evaluation.outcome === "blocked") return "blocking";
  if (evaluation.outcome === "not_triggered") return "info";
  return evaluation.severity;
}

function countsForStatus(status: WorkflowAssuranceResultStatus): WorkflowAssuranceCounts {
  return {
    ...EMPTY_COUNTS,
    scanned: 1,
    [status]: 1,
  };
}

function sumCounts(countsList: readonly Partial<WorkflowAssuranceCounts>[]): WorkflowAssuranceCounts {
  return countsList.reduce<WorkflowAssuranceCounts>(
    (total, counts) => ({
      scanned: total.scanned + (counts.scanned ?? 0),
      passed: total.passed + (counts.passed ?? 0),
      warning: total.warning + (counts.warning ?? 0),
      failed: total.failed + (counts.failed ?? 0),
      blocked: total.blocked + (counts.blocked ?? 0),
      skipped: total.skipped + (counts.skipped ?? 0),
      error: total.error + (counts.error ?? 0),
    }),
    { ...EMPTY_COUNTS },
  );
}

function strongestStatus(
  findings: readonly WorkflowAssuranceSourceFindingInput[],
): WorkflowAssuranceResultStatus {
  return findings.reduce<WorkflowAssuranceResultStatus>(
    (status, finding) =>
      STATUS_PRECEDENCE[finding.status] > STATUS_PRECEDENCE[status]
        ? finding.status
        : status,
    "passed",
  );
}

function strongestSeverity(
  findings: readonly WorkflowAssuranceSourceFindingInput[],
): WorkflowAssuranceSeverity {
  return findings.reduce<WorkflowAssuranceSeverity>(
    (severity, finding) =>
      SEVERITY_PRECEDENCE[finding.severity ?? "info"] >
      SEVERITY_PRECEDENCE[severity]
        ? finding.severity ?? "info"
        : severity,
    "info",
  );
}

function aggregateMessage(counts: WorkflowAssuranceCounts): string {
  if (counts.blocked > 0) {
    return "One or more POS cash-shortage evaluations are blocked by source or policy prerequisites.";
  }
  if (counts.failed > 0) {
    return "High POS cash shortages require management review.";
  }
  if (counts.warning > 0) {
    return "POS cash shortages require review.";
  }
  return "POS cash drawer close events are inside the cash-shortage review policy.";
}

function aggregateRecommendedAction(counts: WorkflowAssuranceCounts) {
  if (counts.blocked > 0) {
    return "Resolve blocked source or policy evidence before enabling POS cash-shortage incident persistence.";
  }
  if (counts.failed > 0 || counts.warning > 0) {
    return "Review the affected cash drawer close events with the cashier, closer, and store manager.";
  }
  return undefined;
}

function evidenceLinksForEvidence(
  evidence: CashShortageEvidenceV1,
  recordedAt: string,
): WorkflowAssuranceEvidenceLink[] {
  return [
    {
      sourceTable: "business_events",
      sourceType: "pos.shift.closed",
      sourceId: evidence.eventId,
      sourceHash: evidence.sourceHash,
      label: "POS cash drawer close event",
      route: ACTION_ROUTE,
      metadata: {
        recordedAt,
        sourceType: evidence.sourceType,
        posSessionId: evidence.sourceId,
        locationId: evidence.locationId,
        terminalId: evidence.terminalId,
        cashDrawerId: evidence.cashDrawerId,
        closingTransactionId: evidence.closingTransactionId,
      },
    },
    {
      sourceTable: "cash_shortage_policies",
      sourceType: "cash_shortage_policy",
      sourceId: evidence.policy.policyId,
      sourceHash: evidence.policy.policyHash,
      label: "Approved cash-shortage observe policy",
      route: ACTION_ROUTE,
      metadata: {
        version: evidence.policy.version,
        currency: evidence.policy.currency,
        reviewThreshold: evidence.policy.reviewThreshold,
        highThreshold: evidence.policy.highThreshold,
        effectiveFrom: evidence.policy.effectiveFrom,
        effectiveTo: evidence.policy.effectiveTo,
      },
    },
  ];
}
