export const POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_REQUIREMENTS = [
  "runbook_identity",
  "engine_health_signals",
  "checkpoint_health_signals",
  "scheduler_health_signals",
  "alert_delivery_signals",
  "incident_evidence_signals",
  "stop_conditions",
  "verification_commands",
  "source_control_tower_health",
  "source_alert_delivery_health",
  "source_checkpoint_health",
  "source_scheduler_health",
  "production_preflight_observability_requirement",
] as const;

export type PosCashShortageObservabilityRunbookRequirement =
  (typeof POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_REQUIREMENTS)[number];

export type PosCashShortageObservabilityRunbookPreflightInput = {
  observabilityRunbookText: string;
  controlTowerSourceText: string;
  alertDeliverySourceText: string;
  checkpointPersistenceSourceText: string;
  schedulerPolicySourceText: string;
  productionActivationPreflightSourceText: string;
};

export type PosCashShortageObservabilityRunbookPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  observabilityRunbookCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageObservabilityRunbookRequirement[];
  missingRequirements: PosCashShortageObservabilityRunbookRequirement[];
};

export type PosCashShortageObservabilityRunbookActivationEvidence = {
  observabilityRunbookCertified: boolean;
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"observability_runbook_preflight">;
};

export function evaluatePosCashShortageObservabilityRunbookPreflight(
  input: PosCashShortageObservabilityRunbookPreflightInput,
): PosCashShortageObservabilityRunbookPreflightResult {
  const satisfiedRequirements: PosCashShortageObservabilityRunbookRequirement[] = [];
  const missingRequirements: PosCashShortageObservabilityRunbookRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_PREFLIGHT_VERSION,
    status: ready ? "certified" : "blocked",
    observabilityRunbookCertified: ready,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageObservabilityRunbookActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageObservabilityRunbookPreflightResult,
    "observabilityRunbookCertified" | "activationAuthorized"
  >;
}): PosCashShortageObservabilityRunbookActivationEvidence {
  const preflightCertified =
    input.preflight.observabilityRunbookCertified &&
    input.preflight.activationAuthorized === false;

  return {
    observabilityRunbookCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["observability_runbook_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageObservabilityRunbookRequirement,
  input: PosCashShortageObservabilityRunbookPreflightInput,
) {
  const runbook = input.observabilityRunbookText;

  switch (requirement) {
    case "runbook_identity":
      return [
        "pos.closed_shift_cash_shortage.review",
        "Runbook version: `pos-cash-shortage-observability-v1`",
        "observability evidence only",
      ].every((marker) => runbook.includes(marker));
    case "engine_health_signals":
      return [
        "recentRunCount",
        "staleRunningCount",
        "failedRunCount",
        "pendingAlertCount",
        "failedAlertCount",
        "lastRunAt",
        "state",
      ].every((marker) => runbook.includes(marker));
    case "checkpoint_health_signals":
      return [
        "PENDING",
        "LEASED",
        "RETRY_SCHEDULED",
        "COMPLETED",
        "DEAD_LETTERED",
        "leaseOwnerId",
        "leaseToken",
        "leaseExpiresAt",
        "deadLetterReason",
        "correlationId",
      ].every((marker) => runbook.includes(marker));
    case "scheduler_health_signals":
      return [
        "`executionMode` must be `scheduled_scan`",
        "`runType` must be `scheduled`",
        "Hot-path execution must remain disallowed",
        "Cursoring must be tenant-scoped",
        "Cursoring must require source hash",
        "`organizationId`, `sourceType`, `sourceId`, and `sourceHash`",
      ].every((marker) => runbook.includes(marker));
    case "alert_delivery_signals":
      return [
        "Transport readiness result",
        "Delivered count",
        "Retried count",
        "Failed count",
        "Dead-lettered count",
        "Retry delay",
        "Failure code and failure reason",
      ].every((marker) => runbook.includes(marker));
    case "incident_evidence_signals":
      return [
        "Active incident queue",
        "Blocking and compliance-critical incident counts",
        "Overdue incident count",
        "Redacted incident count",
        "Suppressed incident count",
        "Waived incident count",
        "Hidden-by-permission count",
        "Incident timeline",
        "Evidence grade",
        "Redactions",
      ].every((marker) => runbook.includes(marker));
    case "stop_conditions":
      return [
        "Engine health state is blocked",
        "Stale running runs exist",
        "Failed runs exist",
        "Failed or dead-letter alert deliveries exist",
        "Checkpoint leases expire repeatedly",
        "Dead-lettered checkpoints increase",
        "Active incidents grow without owner review",
      ].every((marker) => runbook.includes(marker));
    case "verification_commands":
      return [
        "assurance-control-tower.service.test.ts",
        "assurance-alert-delivery.service.test.ts",
        "pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts",
        "pos-cash-shortage-scheduler-policy-preflight.test.ts",
        "pos-cash-shortage-production-activation-preflight.test.ts",
        "npm run workflow:assurance:release-gate",
        "npm run workflow:assurance:runtime-check",
        "Activation scan",
      ].every((marker) => runbook.includes(marker));
    case "source_control_tower_health":
      return [
        "staleRunningCount",
        "failedRunCount",
        "pendingAlertCount",
        "failedAlertCount",
        "recentRunCount",
        "lastRunAt",
        "engineHealthState",
        "hiddenByPermission",
        "redactions",
      ].every((marker) => input.controlTowerSourceText.includes(marker));
    case "source_alert_delivery_health":
      return [
        "resolveAssuranceAlertTransportReadiness",
        "delivered",
        "retried",
        "failed",
        "deadLettered",
        "workflowAssuranceRetryDelayMs",
        "failureCode",
        "failureReason",
      ].every((marker) => input.alertDeliverySourceText.includes(marker));
    case "source_checkpoint_health":
      return [
        "PENDING",
        "LEASED",
        "RETRY_SCHEDULED",
        "COMPLETED",
        "DEAD_LETTERED",
        "leaseOwnerId",
        "leaseToken",
        "leaseExpiresAt",
        "attempt",
        "deadLetterReason",
      ].every((marker) => input.checkpointPersistenceSourceText.includes(marker));
    case "source_scheduler_health":
      return [
        "executionMode",
        "scheduled_scan",
        "runType",
        "scheduled",
        "hotPathAllowed",
        "tenantScoped",
        "sourceHashRequired",
        "cursorFields",
      ].every((marker) => input.schedulerPolicySourceText.includes(marker));
    case "production_preflight_observability_requirement":
      return [
        '"observability_runbook"',
        "observabilityRunbookCertified",
        "activationHold",
      ].every((marker) =>
        input.productionActivationPreflightSourceText.includes(marker),
      );
  }
}
