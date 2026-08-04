import { BusinessRuleError } from "@/services/_shared/action-errors";
import {
  resolveWorkflowAssuranceIncident,
} from "@/services/assurance/assurance-incident.service";
import type {
  ResolveWorkflowAssuranceIncidentInput,
  WorkflowAssuranceIncidentDto,
} from "@/services/assurance/assurance-incident-contracts";

import {
  preparePosCashShortageResolutionCommandReadiness,
  type PosCashShortageResolutionCommandReadinessResult,
} from "./pos-cash-shortage-resolution-command-readiness";
import {
  recheckPosCashShortageResolutionSource as evaluatePosCashShortageResolutionSourceRecheck,
  type PosCashShortageResolutionSourceRecheckInput,
  type PosCashShortageResolutionSourceRecheckResult,
} from "./pos-cash-shortage-resolution-source-recheck";

export type ExecutePosCashShortageResolutionCommandInput = {
  incident: WorkflowAssuranceIncidentDto;
  actorId: string;
  actorPermissions: readonly string[];
  sourceRecheckInput: PosCashShortageResolutionSourceRecheckInput;
  resolutionNote: string;
  resolutionEvidenceHash: string;
};

export type PosCashShortageResolutionCommandBlockedResult = {
  status: "blocked";
  productSurfaceActivationAuthorized: false;
  idempotencyKey: string;
  incident: null;
  sourceRecheckResult: PosCashShortageResolutionSourceRecheckResult;
  commandReadiness: PosCashShortageResolutionCommandReadinessResult;
  blocker: string;
};

export type PosCashShortageResolutionCommandExecutedResult = {
  status: "executed";
  productSurfaceActivationAuthorized: false;
  idempotencyKey: string;
  incident: WorkflowAssuranceIncidentDto;
  sourceRecheckResult: PosCashShortageResolutionSourceRecheckResult;
  commandReadiness: PosCashShortageResolutionCommandReadinessResult;
  blocker: null;
};

export type PosCashShortageResolutionCommandResult =
  | PosCashShortageResolutionCommandBlockedResult
  | PosCashShortageResolutionCommandExecutedResult;

export function buildPosCashShortageResolutionIdempotencyKey(input: {
  organizationId: string;
  incidentId: string;
  actorId: string;
  currentSourceHash: string;
  resolutionEvidenceHash: string;
}) {
  return [
    "pos-cash-shortage-resolution",
    input.organizationId,
    input.incidentId,
    input.currentSourceHash,
    input.actorId,
    input.resolutionEvidenceHash.trim(),
  ].join(":");
}

export async function executePosCashShortageResolutionCommand(
  input: ExecutePosCashShortageResolutionCommandInput,
): Promise<PosCashShortageResolutionCommandResult> {
  const sourceRecheckResult =
    evaluatePosCashShortageResolutionSourceRecheck(input.sourceRecheckInput);
  const idempotencyKey = buildPosCashShortageResolutionIdempotencyKey({
    organizationId: input.incident.organizationId,
    incidentId: input.incident.id,
    actorId: input.actorId,
    currentSourceHash: sourceRecheckResult.currentSourceHash,
    resolutionEvidenceHash: input.resolutionEvidenceHash,
  });
  const commandReadiness = preparePosCashShortageResolutionCommandReadiness({
    incident: input.incident,
    actorId: input.actorId,
    actorPermissions: input.actorPermissions,
    sourceRecheck: sourceRecheckResult,
    resolutionNote: input.resolutionNote,
    resolutionEvidenceHash: input.resolutionEvidenceHash,
  });

  if (!commandReadiness.commandInput) {
    return {
      status: "blocked",
      productSurfaceActivationAuthorized: false,
      idempotencyKey,
      incident: null,
      sourceRecheckResult,
      commandReadiness,
      blocker:
        commandReadiness.policyBlocker ??
        commandReadiness.missingRequirements.join(", "),
    };
  }
  assertCommandInputReady(commandReadiness);

  return withPosCashShortageResolutionConcurrencyGuard(
    {
      incidentId: input.incident.id,
      currentSourceHash: sourceRecheckResult.currentSourceHash,
      idempotencyKey,
      commandReadiness,
    },
    async () => {
      const incident = await resolveWorkflowAssuranceIncident(commandReadiness.commandInput);
      return {
        status: "executed",
        productSurfaceActivationAuthorized: false,
        idempotencyKey,
        incident,
        sourceRecheckResult,
        commandReadiness,
        blocker: null,
      };
    },
  );
}

function assertCommandInputReady(
  commandReadiness: PosCashShortageResolutionCommandReadinessResult,
): asserts commandReadiness is PosCashShortageResolutionCommandReadinessResult & {
  commandInput: ResolveWorkflowAssuranceIncidentInput;
} {
  if (!commandReadiness.commandInput) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution command readiness is required.",
    );
  }
}

export async function withPosCashShortageResolutionConcurrencyGuard<T>(
  input: {
    incidentId: string;
    currentSourceHash: string;
    idempotencyKey: string;
    commandReadiness: PosCashShortageResolutionCommandReadinessResult;
  },
  callback: () => Promise<T>,
) {
  const commandInput = input.commandReadiness.commandInput;
  if (!commandInput) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution command readiness is required.",
    );
  }
  if (commandInput.incidentId !== input.incidentId) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution command incident changed before execution.",
    );
  }
  if (commandInput.currentSourceHash !== input.currentSourceHash) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution command source changed before execution.",
    );
  }
  if (!input.idempotencyKey.includes(input.incidentId)) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution command idempotency key is not incident-bound.",
    );
  }
  if (!input.idempotencyKey.includes(input.currentSourceHash)) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution command idempotency key is not source-bound.",
    );
  }

  return callback();
}
