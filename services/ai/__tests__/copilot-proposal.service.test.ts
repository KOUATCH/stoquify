jest.mock("server-only", () => ({}))

const tx = {
  aiActionProposal: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
}

jest.mock("@/prisma/db", () => ({
  db: {
    agentRun: { findFirst: jest.fn() },
    agentPolicyIncident: { create: jest.fn() },
    aiActionProposal: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx)),
  },
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value) =>
    require("node:crypto")
      .createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex"),
  ),
  recordBusinessEventInTx: jest.fn(),
}))

import { db } from "@/prisma/db"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"

import {
  createCopilotProposal,
  decideCopilotProposal,
} from "../copilot-proposal.service"

const mockDb = db as jest.Mocked<typeof db>
const mockRecordBusinessEvent = recordBusinessEventInTx as jest.Mock

const now = new Date("2026-07-27T12:00:00.000Z")
const input = {
  runId: "cm00000000000000000000001",
  proposalType: "NAVIGATE_TO_WORKFLOW" as const,
  targetRoute: "/dashboard/manager-action-center",
  requiredPermission: "dashboard.read",
  title: "Review operational exception",
  detail: "Open the existing workflow and review the cited evidence.",
  evidence: [
    {
      id: "evidence-1",
      subjectType: "daily-habit.digest",
      subjectId: "org-1:manager-run-sheet:period",
      sourceModule: "dashboard",
      sourceHash: "sha256:source",
      evidenceGrade: "operational" as const,
      freshness: "fresh" as const,
      available: true,
    },
  ],
  periodStart: new Date("2026-07-27T00:00:00.000Z"),
  periodEnd: new Date("2026-07-27T23:59:59.999Z"),
  asOf: now,
  expiresAt: new Date("2026-07-28T12:00:00.000Z"),
  idempotencyKey: "proposal:run-1:risk-1",
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "cm00000000000000000000002",
    organizationId: "org-1",
    runId: input.runId,
    createdById: "user-1",
    proposalType: input.proposalType,
    targetRoute: input.targetRoute,
    requiredPermission: input.requiredPermission,
    title: input.title,
    detail: input.detail,
    evidenceRefs: input.evidence,
    sourceHash: "a".repeat(64),
    requestHash: "b".repeat(64),
    idempotencyKey: input.idempotencyKey,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    asOf: input.asOf,
    expiresAt: input.expiresAt,
    status: "DRAFT",
    decidedById: null,
    decidedAt: null,
    decisionReason: null,
    createdAt: now,
    ...overrides,
  }
}

describe("copilot proposal service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockDb.agentRun.findFirst as jest.Mock).mockResolvedValue({
      id: input.runId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      completedAt: now,
      evidenceLinks: [
        {
          subjectType: input.evidence[0].subjectType,
          subjectId: input.evidence[0].subjectId,
          sourceModule: input.evidence[0].sourceModule,
          sourceHash: input.evidence[0].sourceHash,
          evidenceGrade: "operational",
          freshness: "FRESH",
          available: true,
        },
      ],
    })
    tx.aiActionProposal.findUnique.mockResolvedValue(null)
    tx.aiActionProposal.create.mockResolvedValue(proposal())
    tx.aiActionProposal.updateMany.mockResolvedValue({ count: 1 })
  })

  it("creates an idempotent evidence-bound proposal without execution authority", async () => {
    const result = await createCopilotProposal(
      "org-1",
      "user-1",
      ["dashboard.read"],
      input,
      now,
    )

    expect(mockDb.agentRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          actorId: "user-1",
          status: "COMPLETED",
        }),
      }),
    )
    expect(result.executionAuthority).toBe("NONE")
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "AI_ACTION_PROPOSAL_CREATED",
        organizationId: "org-1",
      }),
    )
  })

  it("blocks and audits a request for autonomous posting", async () => {
    await expect(
      createCopilotProposal(
        "org-1",
        "user-1",
        ["dashboard.read"],
        {
          ...input,
          title: "Post journal entry",
          detail: "Post the ledger entry without waiting for a reviewer.",
        },
        now,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    expect(mockDb.agentPolicyIncident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        incidentType: "UNSAFE_ACTION_PROPOSAL_BLOCKED",
        severity: "HIGH",
      }),
    })
    expect(tx.aiActionProposal.create).not.toHaveBeenCalled()
  })

  it("rejects cross-tenant or foreign-actor run references", async () => {
    ;(mockDb.agentRun.findFirst as jest.Mock).mockResolvedValueOnce(null)

    await expect(
      createCopilotProposal(
        "org-other",
        "user-other",
        ["dashboard.read"],
        input,
        now,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects an unbound evidence citation", async () => {
    ;(mockDb.agentRun.findFirst as jest.Mock).mockResolvedValueOnce({
      id: input.runId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      completedAt: now,
      evidenceLinks: [],
    })

    await expect(
      createCopilotProposal(
        "org-1",
        "user-1",
        ["dashboard.read"],
        input,
        now,
      ),
    ).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  })

  it("records human acceptance without invoking any target workflow", async () => {
    tx.aiActionProposal.findFirst
      .mockResolvedValueOnce(proposal())
      .mockResolvedValueOnce(
        proposal({
          status: "ACCEPTED",
          decidedById: "reviewer-1",
          decidedAt: now,
          decisionReason: "Accepted after human review.",
        }),
      )

    const result = await decideCopilotProposal(
      "org-1",
      "reviewer-1",
      ["dashboard.read"],
      {
        proposalId: "cm00000000000000000000002",
        decision: "ACCEPTED",
        reason: "Accepted after human review.",
      },
      now,
    )

    expect(result.status).toBe("ACCEPTED")
    expect(result.executionAuthority).toBe("NONE")
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "AI_ACTION_PROPOSAL_ACCEPTED",
      }),
    )
  })

  it("fails closed when a proposal is expired", async () => {
    tx.aiActionProposal.findFirst.mockResolvedValueOnce(
      proposal({ expiresAt: new Date("2026-07-27T11:59:59.000Z") }),
    )

    await expect(
      decideCopilotProposal(
        "org-1",
        "reviewer-1",
        ["dashboard.read"],
        {
          proposalId: "cm00000000000000000000002",
          decision: "REJECTED",
          reason: "Rejected after expiry review.",
        },
        now,
      ),
    ).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(tx.aiActionProposal.updateMany).not.toHaveBeenCalled()
  })

  it("rejects a period that does not match the governed agent run", async () => {
    await expect(
      createCopilotProposal(
        "org-1",
        "user-1",
        ["dashboard.read"],
        {
          ...input,
          periodStart: new Date("2026-07-26T00:00:00.000Z"),
        },
        now,
      ),
    ).rejects.toThrow("governed agent run")

    expect(tx.aiActionProposal.create).not.toHaveBeenCalled()
  })

  it.each([
    ["missing completion time", null],
    ["as-of after completion", new Date("2026-07-27T11:59:59.999Z")],
  ])("rejects an invalid run completion boundary: %s", async (_case, completedAt) => {
    ;(mockDb.agentRun.findFirst as jest.Mock).mockResolvedValueOnce({
      id: input.runId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      completedAt,
      evidenceLinks: [],
    })

    await expect(
      createCopilotProposal(
        "org-1",
        "user-1",
        ["dashboard.read"],
        input,
        now,
      ),
    ).rejects.toThrow("governed window")

    expect(tx.aiActionProposal.create).not.toHaveBeenCalled()
  })

  it.each([
    [
      "already expired",
      {
        asOf: new Date("2026-07-27T11:00:00.000Z"),
        expiresAt: new Date("2026-07-27T11:59:59.000Z"),
      },
    ],
    [
      "longer than the maximum TTL",
      { expiresAt: new Date("2026-07-28T12:00:00.001Z") },
    ],
    [
      "future as-of",
      { asOf: new Date("2026-07-27T12:00:00.001Z") },
    ],
  ])("rejects provenance outside the governed window: %s", async (_case, override) => {
    await expect(
      createCopilotProposal(
        "org-1",
        "user-1",
        ["dashboard.read"],
        { ...input, ...override },
        now,
      ),
    ).rejects.toThrow("governed window")

    expect(tx.aiActionProposal.create).not.toHaveBeenCalled()
  })
})
