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
  decideCopilotProposal, listCopilotProposals,
} from "@/services/ai/copilot-proposal.service"

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

describe("Audit probes: current limitations, synthetic records only", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (mockDb.$transaction as jest.Mock).mockImplementation(callback => callback(tx));
    (require("@/services/events/business-event.service").hashBusinessPayload as jest.Mock).mockImplementation(value => require("node:crypto").createHash("sha256").update(JSON.stringify(value)).digest("hex"));
    (mockDb.agentRun.findFirst as jest.Mock).mockResolvedValue({ id:input.runId, periodStart:input.periodStart, periodEnd:input.periodEnd, completedAt:now, evidenceLinks:input.evidence.map(e=>({...e, freshness:"STALE"})) });
    tx.aiActionProposal.findUnique.mockResolvedValue(null);
    tx.aiActionProposal.create.mockImplementation(async ({data}) => proposal(data));
  });
  it("reproduces client-controlled trust grade and unrelated recommendation text", async () => {
    const forged = {...input, title:"Unrelated conclusion asserted by client", targetRoute:"/dashboard/accounting", evidence:input.evidence.map(e=>({...e,evidenceGrade:"certified" as const,freshness:"fresh" as const}))};
    const result=await createCopilotProposal("org-1","user-1",["dashboard.read"],forged,now);
    expect(result.title).toBe(forged.title);
    expect(result.targetRoute).toBe(forged.targetRoute);
    expect(tx.aiActionProposal.create.mock.calls[0][0].data.evidenceRefs[0]).toMatchObject({evidenceGrade:"certified",freshness:"fresh"});
  });
  it("reproduces creation from a thirty-day-old completed run with a new expiry", async () => {
    const oldTime=new Date(now.getTime()-30*86400000);
    const oldStart=new Date(input.periodStart.getTime()-30*86400000);
    const oldEnd=new Date(input.periodEnd.getTime()-30*86400000);
    (mockDb.agentRun.findFirst as jest.Mock).mockResolvedValue({periodStart:oldStart,periodEnd:oldEnd,completedAt:oldTime,evidenceLinks:input.evidence});
    const result=await createCopilotProposal("org-1","user-1",["dashboard.read"],{...input,periodStart:oldStart,periodEnd:oldEnd,asOf:oldTime},now);
    expect(result.asOf).toBe(oldTime.toISOString());
  });
  it("reproduces retry conflict when UI retains key but recomputes expiry", async () => {
    await createCopilotProposal("org-1","user-1",["dashboard.read"],input,now);
    tx.aiActionProposal.findUnique.mockResolvedValue(proposal(tx.aiActionProposal.create.mock.calls[0][0].data));
    await expect(createCopilotProposal("org-1","user-1",["dashboard.read"],{...input,expiresAt:new Date(input.expiresAt.getTime()+1000)},new Date(now.getTime()+1000))).rejects.toMatchObject({code:"CONFLICT"});
  });
  it("reproduces tenant-wide listing without per-proposal permissions or creator scope", async () => {
    (mockDb.aiActionProposal.findMany as jest.Mock).mockResolvedValue([proposal({createdById:"different-actor",requiredPermission:"payroll.read",title:"Synthetic restricted payroll detail"})]);
    const result=await listCopilotProposals("org-1");
    expect(result[0].title).toBe("Synthetic restricted payroll detail");
    expect(mockDb.aiActionProposal.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{organizationId:"org-1"}}));
  });
});
