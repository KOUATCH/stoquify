export const POS_CASH_SHORTAGE_ROLLBACK_PLAN_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_ROLLBACK_PLAN_REQUIREMENTS = [
  "runbook_identity",
  "activation_disable_path",
  "scheduler_worker_stop_path",
  "checkpoint_recovery_path",
  "evidence_preservation_path",
  "incident_alert_handling_path",
  "owner_security_stop_condition",
  "verification_commands",
  "source_activation_hold_ratchet",
  "source_scheduler_hold",
  "source_checkpoint_recovery_controls",
  "production_preflight_rollback_requirement",
] as const;

export type PosCashShortageRollbackPlanRequirement =
  (typeof POS_CASH_SHORTAGE_ROLLBACK_PLAN_REQUIREMENTS)[number];

export type PosCashShortageRollbackPlanPreflightInput = {
  rollbackRunbookText: string;
  registryContractsSourceText: string;
  schedulerPolicySourceText: string;
  checkpointPersistenceSourceText: string;
  productionActivationPreflightSourceText: string;
};

export type PosCashShortageRollbackPlanPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_ROLLBACK_PLAN_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  rollbackPlanCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageRollbackPlanRequirement[];
  missingRequirements: PosCashShortageRollbackPlanRequirement[];
};

export type PosCashShortageRollbackPlanActivationEvidence = {
  rollbackPlanCertified: boolean;
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"rollback_plan_preflight">;
};

export function evaluatePosCashShortageRollbackPlanPreflight(
  input: PosCashShortageRollbackPlanPreflightInput,
): PosCashShortageRollbackPlanPreflightResult {
  const satisfiedRequirements: PosCashShortageRollbackPlanRequirement[] = [];
  const missingRequirements: PosCashShortageRollbackPlanRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_ROLLBACK_PLAN_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_ROLLBACK_PLAN_PREFLIGHT_VERSION,
    status: ready ? "certified" : "blocked",
    rollbackPlanCertified: ready,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageRollbackPlanActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageRollbackPlanPreflightResult,
    "rollbackPlanCertified" | "activationAuthorized"
  >;
}): PosCashShortageRollbackPlanActivationEvidence {
  const preflightCertified =
    input.preflight.rollbackPlanCertified &&
    input.preflight.activationAuthorized === false;

  return {
    rollbackPlanCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified ? [] : ["rollback_plan_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageRollbackPlanRequirement,
  input: PosCashShortageRollbackPlanPreflightInput,
) {
  const runbook = input.rollbackRunbookText;

  switch (requirement) {
    case "runbook_identity":
      return [
        "pos.closed_shift_cash_shortage.review",
        "Runbook version: `pos-cash-shortage-rollback-v1`",
        "does not authorize production activation",
      ].every((marker) => runbook.includes(marker));
    case "activation_disable_path":
      return [
        "enabled: false",
        "enforceMode: false",
        "metadata.productionActivationCertified: false",
        "metadata.activationHold",
        "Workflow Assurance release gate",
      ].every((marker) => runbook.includes(marker));
    case "scheduler_worker_stop_path":
      return [
        "Stop any external scheduler or job runner",
        "Do not create new POS cash-shortage worker checkpoints",
        "Let in-flight checkpoint leases expire naturally",
        "Do not execute `load" + "PosShiftCashShortageBatch`",
        "no hot-path execution",
      ].every((marker) => runbook.includes(marker));
    case "checkpoint_recovery_path":
      return [
        "Do not delete `PosCashShortageWorkerCheckpoint` rows",
        "PENDING",
        "LEASED",
        "RETRY_SCHEDULED",
        "COMPLETED",
        "DEAD_LETTERED",
        "leaseOwnerId",
        "leaseToken",
        "leaseExpiresAt",
        "deadLetterReason",
      ].every((marker) => runbook.includes(marker));
    case "evidence_preservation_path":
      return [
        "Do not delete or rewrite `BusinessEvent`",
        "WorkflowAssuranceIncident",
        "WorkflowAssuranceIncidentEvent",
        "WorkflowAssuranceAlertDelivery",
        "AuditLog",
        "POSSession",
        "Do not mutate source hashes",
      ].every((marker) => runbook.includes(marker));
    case "incident_alert_handling_path":
      return [
        "Open incidents remain reviewable evidence",
        "Alert deliveries remain auditable delivery evidence",
        "generic dead-letter recovery command",
        "active tenant operator validation",
        "event history",
        "audit history",
      ].every((marker) => runbook.includes(marker));
    case "owner_security_stop_condition":
      return [
        "Product owner decision reference",
        "Security owner decision reference",
        "Operations owner acknowledgement",
        "Product and security owners must be distinct",
      ].every((marker) => runbook.includes(marker));
    case "verification_commands":
      return [
        "npm run workflow:assurance:release-gate",
        "npm run workflow:assurance:runtime-check",
        "pos-cash-shortage-production-activation-preflight.test.ts",
        "pos-cash-shortage-scheduler-policy-preflight.test.ts",
        "pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts",
        "Activation scan",
      ].every((marker) => runbook.includes(marker));
    case "source_activation_hold_ratchet":
      return [
        "productionActivationCertified",
        "activationHold",
        "definition.enabled",
        "definition.metadata.productionActivationCertified !== true",
      ].every((marker) => input.registryContractsSourceText.includes(marker));
    case "source_scheduler_hold":
      return [
        "definition_must_remain_activation_held",
        "hotPathAllowed",
        "tenantScoped",
        "sourceHashRequired",
        "activationAuthorized: false",
      ].every((marker) => input.schedulerPolicySourceText.includes(marker));
    case "source_checkpoint_recovery_controls":
      return [
        "leaseOwnerId",
        "leaseToken",
        "leaseExpiresAt",
        "RETRY_SCHEDULED",
        "DEAD_LETTERED",
        "deadLetterReason",
        "updateMany",
      ].every((marker) => input.checkpointPersistenceSourceText.includes(marker));
    case "production_preflight_rollback_requirement":
      return [
        '"rollback_plan"',
        "rollbackPlanCertified",
        "activationHold",
      ].every((marker) =>
        input.productionActivationPreflightSourceText.includes(marker),
      );
  }
}
