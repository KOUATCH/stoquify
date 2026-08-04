import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors";
import type { WorkflowAssuranceIncidentDto } from "@/services/assurance/assurance-incident-contracts";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import { resolveApprovedCashShortagePolicy } from "./cash-shortage-policy.service";
import {
  posShiftClosedEventV1Schema,
  type PosShiftClosedEventV1,
} from "./pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "./pos-shift-cash-shortage-evaluator";
import type { PosCashShortageResolutionSourceRecheckInput } from "./pos-cash-shortage-resolution-source-recheck";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_RESOLUTION_SOURCE_LOADER_VERSION = 1;

const loadPosCashShortageResolutionSourceInputSchema = z
  .object({
    incident: z.custom<WorkflowAssuranceIncidentDto>(),
    currentSourceHash: z.string().trim().min(1),
  })
  .strict();

const BUSINESS_EVENT_SELECT = {
  id: true,
  organizationId: true,
  eventType: true,
  eventSource: true,
  schemaVersion: true,
  status: true,
  idempotencyKey: true,
  payloadHash: true,
  payload: true,
  occurredAt: true,
  actorId: true,
  locationId: true,
  registerId: true,
  sourceType: true,
  sourceId: true,
  documentHash: true,
} as const satisfies Prisma.BusinessEventSelect;

type BusinessEventRow = Prisma.BusinessEventGetPayload<{
  select: typeof BUSINESS_EVENT_SELECT;
}>;

export type LoadPosCashShortageResolutionSourceInput = z.input<
  typeof loadPosCashShortageResolutionSourceInputSchema
>;

export type PosCashShortageResolutionSourceLoaderResult = {
  version: typeof POS_CASH_SHORTAGE_RESOLUTION_SOURCE_LOADER_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  activationAuthorized: false;
  sourceRecheckInput: PosCashShortageResolutionSourceRecheckInput;
};

export async function loadPosCashShortageResolutionSourceForIncident(
  input: LoadPosCashShortageResolutionSourceInput,
): Promise<PosCashShortageResolutionSourceLoaderResult> {
  const parsed = loadPosCashShortageResolutionSourceInputSchema.parse(input);
  const incident = parsed.incident;

  assertIncidentSource(incident, parsed.currentSourceHash);
  const event = await loadAppliedPosShiftClosedEvent(incident);
  if (event.payloadHash !== parsed.currentSourceHash) {
    throw new ConflictError(
      "POS cash-shortage source changed before resolution.",
    );
  }

  const approvedPolicy = await resolveApprovedCashShortagePolicy({
    organizationId: incident.organizationId,
    currency: event.payload.currency,
    effectiveAt: new Date(event.payload.closedAt),
  });
  if (!approvedPolicy) {
    throw new ConflictError(
      "Approved cash-shortage policy is required before resolution.",
    );
  }

  const evaluation = evaluatePosShiftCashShortage({
    event,
    policy: approvedPolicy,
  });
  if (evaluation.outcome !== "triggered") {
    throw new ConflictError(
      "POS cash-shortage source no longer requires terminal resolution.",
    );
  }

  return {
    version: POS_CASH_SHORTAGE_RESOLUTION_SOURCE_LOADER_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    activationAuthorized: false,
    sourceRecheckInput: {
      event,
      approvedPolicy,
      expected: {
        organizationId: incident.organizationId,
        sourceType: "POSSession",
        sourceId: incident.sourceId,
        currentSourceHash: parsed.currentSourceHash,
        approvedPolicyHash: hashBusinessPayload(approvedPolicy),
        evaluationHash: hashBusinessPayload(evaluation),
        amountAtRisk: evaluation.evidence.normalized.amountAtRisk,
        currency: evaluation.evidence.currency,
        policyId: evaluation.evidence.policy.policyId,
      },
    },
  };
}

function assertIncidentSource(
  incident: WorkflowAssuranceIncidentDto,
  currentSourceHash: string,
) {
  if (
    incident.checkKey !== POS_SHIFT_CASH_SHORTAGE_CHECK_KEY ||
    incident.workflow !== "pos" ||
    incident.moduleSlug !== "pos" ||
    incident.organizationId.trim() === "" ||
    incident.sourceType !== "POSSession" ||
    incident.sourceId.trim() === "" ||
    incident.sourceHash !== currentSourceHash
  ) {
    throw new ConflictError(
      "POS cash-shortage incident source evidence is not resolution-ready.",
    );
  }
}

async function loadAppliedPosShiftClosedEvent(
  incident: WorkflowAssuranceIncidentDto,
): Promise<PosShiftClosedEventV1> {
  const row = (await db.businessEvent.findFirst({
    where: {
      organizationId: incident.organizationId,
      eventType: "pos.shift.closed",
      eventSource: "POS",
      schemaVersion: 1,
      status: "APPLIED",
      sourceType: "CASH_DRAWER_CLOSE",
      sourceId: incident.sourceId,
      payloadHash: incident.sourceHash,
    },
    orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
    select: BUSINESS_EVENT_SELECT,
  })) as BusinessEventRow | null;

  if (!row) {
    throw new NotFoundError("POS cash-shortage source event not found.");
  }

  const event = posShiftClosedEventV1Schema.parse({
    id: row.id,
    organizationId: row.organizationId,
    eventType: row.eventType,
    eventSource: row.eventSource,
    schemaVersion: row.schemaVersion,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    payloadHash: row.payloadHash,
    payload: row.payload,
    occurredAt: row.occurredAt.toISOString(),
    actorId: row.actorId,
    locationId: row.locationId,
    registerId: row.registerId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    documentHash: row.documentHash,
  });

  if (hashBusinessPayload(event.payload) !== event.payloadHash) {
    throw new ConflictError(
      "POS cash-shortage source payload hash verification failed.",
    );
  }

  return event;
}
