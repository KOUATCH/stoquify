import type { PosCashShortageCheckpointPersistencePreflightResult } from "./pos-cash-shortage-worker-checkpoint-persistence-preflight";

export const POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_REQUIREMENTS = [
  "service_owned_command_module",
  "ensure_checkpoint_command",
  "lease_checkpoint_command",
  "advance_checkpoint_command",
  "failure_checkpoint_command",
  "durable_status_mapping",
  "lease_compare_and_set",
  "no_runtime_activation",
] as const;

export type PosCashShortageCheckpointCommandRequirement =
  (typeof POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_REQUIREMENTS)[number];

export type PosCashShortageCheckpointCommandPreflightInput = {
  serviceSourceText: string;
};

export type PosCashShortageCheckpointCommandPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  workerCheckpointPersistenceCommandsCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageCheckpointCommandRequirement[];
  missingRequirements: PosCashShortageCheckpointCommandRequirement[];
};

export type PosCashShortageCheckpointPersistenceActivationEvidence = {
  workerCheckpointPersistenceCertified: boolean;
  activationAuthorized: false;
  schemaPreflightCertified: boolean;
  commandPreflightCertified: boolean;
  missingRequirements: Array<"schema_preflight" | "command_preflight">;
};

export function evaluatePosCashShortageCheckpointCommandPreflight(
  input: PosCashShortageCheckpointCommandPreflightInput,
): PosCashShortageCheckpointCommandPreflightResult {
  const satisfiedRequirements: PosCashShortageCheckpointCommandRequirement[] = [];
  const missingRequirements: PosCashShortageCheckpointCommandRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input.serviceSourceText)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;
  return {
    version: POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_PREFLIGHT_VERSION,
    status: ready ? "certified" : "blocked",
    workerCheckpointPersistenceCommandsCertified: ready,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageCheckpointPersistenceActivationEvidence(input: {
  schemaPreflight: Pick<
    PosCashShortageCheckpointPersistencePreflightResult,
    "workerCheckpointPersistenceCertified" | "activationAuthorized"
  >;
  commandPreflight: Pick<
    PosCashShortageCheckpointCommandPreflightResult,
    "workerCheckpointPersistenceCommandsCertified" | "activationAuthorized"
  >;
}): PosCashShortageCheckpointPersistenceActivationEvidence {
  const schemaPreflightCertified =
    input.schemaPreflight.workerCheckpointPersistenceCertified &&
    input.schemaPreflight.activationAuthorized === false;
  const commandPreflightCertified =
    input.commandPreflight.workerCheckpointPersistenceCommandsCertified &&
    input.commandPreflight.activationAuthorized === false;
  const missingRequirements: PosCashShortageCheckpointPersistenceActivationEvidence["missingRequirements"] = [];

  if (!schemaPreflightCertified) missingRequirements.push("schema_preflight");
  if (!commandPreflightCertified) missingRequirements.push("command_preflight");

  return {
    workerCheckpointPersistenceCertified: missingRequirements.length === 0,
    activationAuthorized: false,
    schemaPreflightCertified,
    commandPreflightCertified,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageCheckpointCommandRequirement,
  source: string,
) {
  switch (requirement) {
    case "service_owned_command_module":
      return source.includes("posCashShortageWorkerCheckpoint");
    case "ensure_checkpoint_command":
      return hasExportedFunction(source, "ensurePosCashShortageWorkerCheckpoint");
    case "lease_checkpoint_command":
      return hasExportedFunction(source, "leaseNextPosCashShortageWorkerCheckpoint");
    case "advance_checkpoint_command":
      return hasExportedFunction(source, "advancePersistedPosCashShortageWorkerCheckpoint");
    case "failure_checkpoint_command":
      return hasExportedFunction(source, "recordPersistedPosCashShortageWorkerCheckpointFailure");
    case "durable_status_mapping":
      return [
        "PENDING",
        "LEASED",
        "RETRY_SCHEDULED",
        "COMPLETED",
        "DEAD_LETTERED",
        "dbStatusFromTransition",
      ].every((marker) => source.includes(marker));
    case "lease_compare_and_set":
      return ["updateMany", "leaseOwnerId", "leaseToken", "leaseExpiresAt"].every(
        (marker) => source.includes(marker),
      );
    case "no_runtime_activation":
      return !runtimeActivationPattern().test(source);
  }
}

function hasExportedFunction(source: string, functionName: string) {
  return new RegExp(`export\\s+async\\s+function\\s+${functionName}\\b`).test(source);
}

function runtimeActivationPattern() {
  return new RegExp(
    [
      "CHECK" + "_RUNNERS",
      "schedule" + "Workflow",
      "cron",
      "create" + "SafeAction",
      "record" + "WorkflowAssuranceIncident",
      "transition" + "WorkflowAssuranceIncident",
      "load" + "PosShiftCashShortageBatch",
      "run" + "DormantPosShiftCashShortage",
    ].join("|"),
    "i",
  );
}
