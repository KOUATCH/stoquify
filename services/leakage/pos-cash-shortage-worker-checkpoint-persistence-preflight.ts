import { POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY } from "./pos-cash-shortage-worker-checkpoint-contract";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_PREFLIGHT_VERSION = 1;
export const POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_MODEL =
  "PosCashShortageWorkerCheckpoint";

export const POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS = [
  "dedicated_checkpoint_model",
  "dedicated_checkpoint_table_mapping",
  "tenant_and_check_identity",
  "window_bounds",
  "cursor_payload",
  "lease_fields",
  "retry_and_dead_letter_fields",
  "checkpoint_audit_timestamps",
  "idempotent_window_identity",
  "ready_work_index",
  "lease_recovery_index",
] as const;

export type PosCashShortageCheckpointPersistenceRequirement =
  (typeof POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS)[number];

export type PosCashShortageCheckpointPersistencePreflightInput = {
  schemaText: string;
};

export type PosCashShortageCheckpointPersistencePreflightResult = {
  version: typeof POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  workerKey: typeof POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY;
  modelName: typeof POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_MODEL;
  status: "certified" | "blocked";
  workerCheckpointPersistenceCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageCheckpointPersistenceRequirement[];
  missingRequirements: PosCashShortageCheckpointPersistenceRequirement[];
};

export function evaluatePosCashShortageCheckpointPersistencePreflight(
  input: PosCashShortageCheckpointPersistencePreflightInput,
): PosCashShortageCheckpointPersistencePreflightResult {
  const modelBlock = extractModelBlock(
    input.schemaText,
    POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_MODEL,
  );
  const satisfiedRequirements: PosCashShortageCheckpointPersistenceRequirement[] = [];
  const missingRequirements: PosCashShortageCheckpointPersistenceRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, modelBlock)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    modelName: POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_MODEL,
    status: ready ? "certified" : "blocked",
    workerCheckpointPersistenceCertified: ready,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageCheckpointPersistenceRequirement,
  modelBlock: string | null,
): boolean {
  if (!modelBlock) return false;

  switch (requirement) {
    case "dedicated_checkpoint_model":
      return true;
    case "dedicated_checkpoint_table_mapping":
      return hasMap(modelBlock, "pos_cash_shortage_worker_checkpoints");
    case "tenant_and_check_identity":
      return hasFields(modelBlock, ["organizationId", "checkKey", "workerKey", "status"]);
    case "window_bounds":
      return hasFields(modelBlock, ["recordedFromInclusive", "recordedThroughExclusive"]);
    case "cursor_payload":
      return hasFields(modelBlock, ["cursor", "lastProcessedCursor"]);
    case "lease_fields":
      return hasFields(modelBlock, ["leaseOwnerId", "leaseToken", "leaseExpiresAt"]);
    case "retry_and_dead_letter_fields":
      return hasFields(modelBlock, [
        "attempt",
        "lastErrorCode",
        "lastErrorMessage",
        "nextAttemptAt",
        "completedAt",
        "deadLetteredAt",
        "deadLetterReason",
      ]);
    case "checkpoint_audit_timestamps":
      return hasFields(modelBlock, ["createdAt", "updatedAt"]);
    case "idempotent_window_identity":
      return hasUnique(modelBlock, [
        "organizationId",
        "checkKey",
        "workerKey",
        "recordedFromInclusive",
        "recordedThroughExclusive",
      ]);
    case "ready_work_index":
      return hasIndex(modelBlock, ["organizationId", "status", "nextAttemptAt"]);
    case "lease_recovery_index":
      return hasIndex(modelBlock, ["organizationId", "status", "leaseExpiresAt"]);
  }
}

function extractModelBlock(schemaText: string, modelName: string): string | null {
  const sanitizedSchemaText = stripSchemaComments(schemaText);
  const match = new RegExp(
    `^\\s*model\\s+${modelName}\\s+{([\\s\\S]*?)\\n\\s*}`,
    "m",
  ).exec(sanitizedSchemaText);
  return match ? match[1] : null;
}

function stripSchemaComments(schemaText: string): string {
  return schemaText
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function hasFields(modelBlock: string, fields: readonly string[]): boolean {
  const declaredFields = new Set(
    modelBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean),
  );

  return fields.every((field) => declaredFields.has(field));
}

function hasUnique(modelBlock: string, fields: readonly string[]): boolean {
  return hasAttribute(modelBlock, "@@unique", fields);
}

function hasIndex(modelBlock: string, fields: readonly string[]): boolean {
  return hasAttribute(modelBlock, "@@index", fields);
}

function hasMap(modelBlock: string, tableName: string): boolean {
  return modelBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === `@@map("${tableName}")`);
}

function hasAttribute(
  modelBlock: string,
  attribute: string,
  fields: readonly string[],
): boolean {
  const attributePattern = new RegExp(
    `${escapeRegExp(attribute)}\\s*\\(\\s*\\[([\\s\\S]*?)\\]`,
    "g",
  );
  const matches = modelBlock.matchAll(attributePattern);

  for (const match of matches) {
    const declaredFields = match[1]
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);

    if (
      declaredFields.length === fields.length &&
      fields.every((field, index) => declaredFields[index] === field)
    ) {
      return true;
    }
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
