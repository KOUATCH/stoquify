import fs from "fs";
import path from "path";

import { Prisma } from "@prisma/client";

jest.mock("server-only", () => ({}));

jest.mock("@/services/assurance/assurance-incident.service", () => ({
  resolveWorkflowAssuranceIncident: jest.fn(),
}));

import { resolveWorkflowAssuranceIncident } from "@/services/assurance/assurance-incident.service";
import type { WorkflowAssuranceIncidentDto } from "@/services/assurance/assurance-incident-contracts";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  evaluatePosCashShortageIdempotentResolutionCommandPreflight,
  POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS,
} from "../pos-cash-shortage-idempotent-resolution-command-preflight";
import {
  buildPosCashShortageResolutionIdempotencyKey,
  executePosCashShortageResolutionCommand,
  withPosCashShortageResolutionConcurrencyGuard,
} from "../pos-cash-shortage-resolution-command";
import type {
  CashShortagePolicyV1,
  PosShiftClosedEventV1,
  PosShiftClosedPayloadV1,
} from "../pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "../pos-shift-cash-shortage-evaluator";

const ROOT = process.cwd();
const mockResolve = resolveWorkflowAssuranceIncident as jest.Mock;

describe("POS cash-shortage resolution command wrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executes the generic resolver only after certified source recheck and command readiness", async () => {
    const fixture = commandFixture();
    mockResolve.mockResolvedValue(incident({ sourceHash: fixture.event.payloadHash, status: "resolved" }));

    const result = await executePosCashShortageResolutionCommand({
      incident: incident({ sourceHash: fixture.event.payloadHash }),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheckInput: {
        event: fixture.event,
        approvedPolicy: fixture.policy,
        expected: fixture.expected,
      },
      resolutionNote: "Manager reviewed the shortage and attached cash-count proof.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result.status).toBe("executed");
    expect(result.productSurfaceActivationAuthorized).toBe(false);
    expect(result.idempotencyKey).toContain(fixture.event.payloadHash);
    expect(result.commandReadiness.commandInput).toEqual(
      expect.objectContaining({
        incidentId: "incident-1",
        currentSourceHash: fixture.event.payloadHash,
        metadata: expect.objectContaining({
          resolutionEvidenceHash: "resolution-evidence-hash-1",
          reviewedSourceType: "POSSession",
          reviewedSourceId: "session-1",
        }),
      }),
    );
    expect(mockResolve).toHaveBeenCalledTimes(1);
    expect(mockResolve).toHaveBeenCalledWith(result.commandReadiness.commandInput);
  });

  it("blocks and does not call the resolver when source-owned recheck fails", async () => {
    const fixture = commandFixture();

    const result = await executePosCashShortageResolutionCommand({
      incident: incident({ sourceHash: fixture.event.payloadHash }),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheckInput: {
        event: fixture.event,
        approvedPolicy: fixture.policy,
        expected: {
          ...fixture.expected,
          evaluationHash: "f".repeat(64),
        },
      },
      resolutionNote: "Manager reviewed the shortage.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result.status).toBe("blocked");
    expect(result.sourceRecheckResult.missingRequirements).toEqual(
      expect.arrayContaining(["evaluation_hash_matches"]),
    );
    expect(result.commandReadiness.commandInput).toBeNull();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("blocks and does not call the resolver when maker-checker policy rejects the actor", async () => {
    const fixture = commandFixture();

    const result = await executePosCashShortageResolutionCommand({
      incident: incident({ sourceHash: fixture.event.payloadHash }),
      actorId: "cashier-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheckInput: {
        event: fixture.event,
        approvedPolicy: fixture.policy,
        expected: fixture.expected,
      },
      resolutionNote: "Self-reviewed shortage.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result.status).toBe("blocked");
    expect(result.blocker).toContain("independent reviewer");
    expect(result.commandReadiness.commandInput).toBeNull();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("builds stable idempotency keys bound to incident and current source hash", () => {
    const base = {
      organizationId: "org-1",
      incidentId: "incident-1",
      actorId: "manager-1",
      currentSourceHash: "source-hash-1",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    };

    expect(buildPosCashShortageResolutionIdempotencyKey(base)).toBe(
      buildPosCashShortageResolutionIdempotencyKey({ ...base }),
    );
    expect(
      buildPosCashShortageResolutionIdempotencyKey({
        ...base,
        currentSourceHash: "source-hash-2",
      }),
    ).not.toBe(buildPosCashShortageResolutionIdempotencyKey(base));
  });

  it("blocks the concurrency guard when prepared command input drifts", async () => {
    const fixture = commandFixture();
    const executed = await executePosCashShortageResolutionCommand({
      incident: incident({ sourceHash: fixture.event.payloadHash }),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheckInput: {
        event: fixture.event,
        approvedPolicy: fixture.policy,
        expected: fixture.expected,
      },
      resolutionNote: "Manager reviewed the shortage.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    await expect(
      withPosCashShortageResolutionConcurrencyGuard(
        {
          incidentId: "incident-1",
          currentSourceHash: "stale-source-hash",
          idempotencyKey: executed.idempotencyKey,
          commandReadiness: executed.commandReadiness,
        },
        async () => "unreachable",
      ),
    ).rejects.toThrow(/source changed before execution/i);
  });

  it("satisfies the Slice 40 idempotent command-wrapper preflight with the real wrapper source", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      genericIncidentServiceSourceText: read(
        "services/assurance/assurance-incident.service.ts",
      ),
      genericIncidentServiceTestSourceText: read(
        "services/assurance/__tests__/assurance-incident.service.test.ts",
      ),
      commandReadinessSourceText: read(
        "services/leakage/pos-cash-shortage-resolution-command-readiness.ts",
      ),
      protectedResolutionPreflightSourceText: read(
        "services/leakage/pos-cash-shortage-protected-resolution-execution-preflight.ts",
      ),
      posResolutionCommandSourceText: read(
        "services/leakage/pos-cash-shortage-resolution-command.ts",
      ),
    });

    expect(result).toEqual({
      version: 1,
      status: "certified",
      genericTransitionEvidenceCertified: true,
      posCommandWrapperCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("does not add routes, actions, workers, schedulers, or direct persistence", () => {
    const source = read("services/leakage/pos-cash-shortage-resolution-command.ts");

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/workflowAssuranceIncident\.(create|update|delete|upsert)/i);
    expect(source).not.toMatch(/workflowAssuranceIncidentEvent\.(create|update|delete|upsert)/i);
    expect(source).not.toMatch(/auditLog\.(create|update|delete|upsert)/i);
  });
});

function commandFixture() {
  const event = makeEvent();
  const policy = makePolicy();
  return {
    event,
    policy,
    expected: expectedFrom(event, policy),
  };
}

function varianceDirection(
  variance: Prisma.Decimal,
): PosShiftClosedPayloadV1["varianceDirection"] {
  if (variance.eq(0)) return "BALANCED";
  return variance.lt(0) ? "SHORTAGE" : "OVERAGE";
}

function documentHash(payload: PosShiftClosedPayloadV1) {
  return hashBusinessPayload({
    evidenceVersion: payload.evidenceVersion,
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
    actorId: payload.actorId,
    countedBalance: payload.countedBalance,
    explanation: payload.explanation,
  });
}

function withValidHashes(event: PosShiftClosedEventV1): PosShiftClosedEventV1 {
  return {
    ...event,
    payloadHash: hashBusinessPayload(event.payload),
    documentHash: documentHash(event.payload),
  };
}

function makeEvent(): PosShiftClosedEventV1 {
  const expected = new Prisma.Decimal("12000.00");
  const counted = new Prisma.Decimal("10000.00");
  const variance = counted.minus(expected);
  const payload: PosShiftClosedPayloadV1 = {
    evidenceVersion: 1,
    organizationId: "org-1",
    sessionId: "session-1",
    sessionNumber: "SHIFT-001",
    terminalId: "terminal-1",
    locationId: "location-1",
    cashDrawerId: "drawer-1",
    closingTransactionId: "drawer-transaction-1",
    actorId: "cashier-1",
    authorityMode: "SELF",
    openedAt: "2026-07-20T08:00:00.000Z",
    closedAt: "2026-07-20T10:00:00.000Z",
    currency: "XAF",
    openingBalance: "5000.00",
    expectedBalance: "12000.00",
    countedBalance: "10000.00",
    variance: variance.toFixed(2),
    varianceDirection: varianceDirection(variance),
    explanation: "Counted cash was below the expected balance.",
    totals: {
      sales: "7000.00",
      tax: "0.00",
      discount: "0.00",
      transactionCount: 4,
      cash: "7000.00",
      card: "0.00",
      mobileMoney: "0.00",
      bankTransfer: "0.00",
      credit: "0.00",
    },
  };

  return withValidHashes({
    id: "event-1",
    organizationId: payload.organizationId,
    eventType: "pos.shift.closed",
    eventSource: "POS",
    schemaVersion: 1,
    status: "RECORDED",
    idempotencyKey: "pos-shift-close:session-1",
    payloadHash: hashBusinessPayload(payload),
    payload,
    occurredAt: payload.closedAt,
    actorId: payload.actorId,
    locationId: payload.locationId,
    registerId: payload.terminalId,
    sourceType: "CASH_DRAWER_CLOSE",
    sourceId: payload.sessionId,
    documentHash: documentHash(payload),
  });
}

function makePolicy(): CashShortagePolicyV1 {
  return {
    kind: "cash_shortage_policy/v1",
    policyId: "cash-shortage-policy-xaf",
    version: 1,
    currency: "XAF",
    reviewThreshold: "2000",
    highThreshold: "10000",
    minorUnitScale: 0,
    roundingMode: "HALF_UP",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    approvalStatus: "approved",
    approvedAt: "2025-12-15T09:00:00.000Z",
    approvedById: "policy-approver-1",
    mode: "observe",
  };
}

function expectedFrom(event: PosShiftClosedEventV1, policy: CashShortagePolicyV1) {
  const evaluation = evaluatePosShiftCashShortage({ event, policy });
  if (evaluation.outcome !== "triggered") {
    throw new Error("Expected a triggered fixture.");
  }

  return {
    organizationId: event.organizationId,
    sourceType: "POSSession" as const,
    sourceId: event.sourceId,
    currentSourceHash: event.payloadHash,
    approvedPolicyHash: hashBusinessPayload(policy),
    evaluationHash: hashBusinessPayload(evaluation),
    amountAtRisk: evaluation.evidence.normalized.amountAtRisk,
    currency: evaluation.evidence.currency,
    policyId: evaluation.evidence.policy.policyId,
  };
}

function incident(
  overrides: Partial<WorkflowAssuranceIncidentDto> = {},
): WorkflowAssuranceIncidentDto {
  return {
    id: "incident-1",
    organizationId: "org-1",
    checkKey: "pos.closed_shift_cash_shortage.review",
    workflow: "pos",
    moduleSlug: "pos",
    sourceType: "POSSession",
    sourceId: "session-1",
    sourceLabel: "POS cash drawer close event",
    sourceHash: "source-hash-1",
    fingerprint: "fingerprint-1",
    title: "Cash shortage requiring review",
    detail: "Cash shortage meets the approved high-severity threshold.",
    severity: "high",
    status: "open",
    evidenceGrade: "blocked",
    actionRoute: "/dashboard/manager-action-center",
    ownerId: null,
    assignedRole: "branch_manager",
    dueAt: null,
    occurrenceCount: 1,
    firstDetectedAt: "2026-07-27T10:00:00.000Z",
    lastDetectedAt: "2026-07-27T10:00:00.000Z",
    resolvedAt: null,
    reopenedAt: null,
    suppressedAt: null,
    metadata: {
      resultMetadata: {
        eventId: "event-1",
        recordedAt: "2026-07-27T10:00:00.000Z",
        outcome: "triggered",
        amountAtRisk: "2000",
        currency: "XAF",
        locationId: "location-1",
        terminalId: "terminal-1",
        cashDrawerId: "drawer-1",
        cashierId: "cashier-1",
        closerId: "closer-1",
        policyId: "cash-shortage-policy-xaf",
        policyVersion: 1,
        policyMode: "observe",
        authorityMode: "SELF",
      },
    },
    sourceLinks: [],
    proofSubject: null,
    proofSummary: {
      evidenceGrade: "blocked",
      sourceHash: "source-hash-1",
      freshness: "blocked",
      proofSubject: null,
      actionRoute: "/dashboard/manager-action-center",
    },
    redactions: [],
    ...overrides,
  };
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
