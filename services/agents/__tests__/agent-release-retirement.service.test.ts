jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: mockPrismaClient() }));

function mockPrismaClient() {
  const tx = {
    agentActivationPackage: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  return {
    $transaction: jest.fn((handler) => handler(tx)),
    tx,
  };
}

import { db } from "@/prisma/db";

import {
  AgentReleaseControlError,
  retireCommandAgentRelease,
} from "../agent-release-control.service";

const mockDb = db as unknown as ReturnType<typeof mockPrismaClient>;
const now = new Date("2026-07-24T12:00:00.000Z");

describe("agent release retirement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((handler) => handler(mockDb.tx));
    mockDb.tx.user.count.mockResolvedValue(1);
    mockDb.tx.agentActivationPackage.updateMany.mockResolvedValue({ count: 1 });
    mockDb.tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("retires a suspended tenant release with immutable audit evidence", async () => {
    const release = releaseFixture();
    const retired = {
      ...release,
      state: "RETIRED",
      version: 8,
      retiredAt: now,
      retiredById: "owner-1",
      retirementReason: "Pilot release superseded after verification.",
    };
    mockDb.tx.agentActivationPackage.findFirst.mockResolvedValue(release);
    mockDb.tx.agentActivationPackage.findUniqueOrThrow.mockResolvedValue(
      retired,
    );

    const result = await retireCommandAgentRelease({
      packageId: "release-1",
      organizationId: "org-1",
      actorId: "owner-1",
      expectedVersion: 7,
      reason: "  Pilot release superseded after verification.  ",
      now,
    });

    expect(result).toBe(retired);
    expect(mockDb.tx.agentActivationPackage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "release-1", organizationId: "org-1" },
      }),
    );
    expect(mockDb.tx.agentActivationPackage.updateMany).toHaveBeenCalledWith({
      where: {
        id: "release-1",
        version: 7,
        state: "SUSPENDED",
      },
      data: {
        state: "RETIRED",
        retiredAt: now,
        retiredById: "owner-1",
        retirementReason: "Pilot release superseded after verification.",
        version: { increment: 1 },
      },
    });
    expect(mockDb.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          entityId: "release-1",
          action: "AGENT_RELEASE_RETIRED",
          userId: "owner-1",
        }),
      }),
    );
  });

  it("rejects retirement unless the release is suspended", async () => {
    mockDb.tx.agentActivationPackage.findFirst.mockResolvedValue(
      releaseFixture({ state: "ACTIVE_INTERNAL" }),
    );

    await expect(
      retireCommandAgentRelease({
        packageId: "release-1",
        organizationId: "org-1",
        actorId: "owner-1",
        expectedVersion: 7,
        reason: "Release must be suspended first.",
        now,
      }),
    ).rejects.toMatchObject<Partial<AgentReleaseControlError>>({
      code: "RELEASE_STATE_INVALID",
    });
    expect(
      mockDb.tx.agentActivationPackage.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("rejects a stale retirement version", async () => {
    mockDb.tx.agentActivationPackage.findFirst.mockResolvedValue(
      releaseFixture({ version: 8 }),
    );

    await expect(
      retireCommandAgentRelease({
        packageId: "release-1",
        organizationId: "org-1",
        actorId: "owner-1",
        expectedVersion: 7,
        reason: "Release must be retired once.",
        now,
      }),
    ).rejects.toMatchObject<Partial<AgentReleaseControlError>>({
      code: "RELEASE_VERSION_CONFLICT",
    });
  });
});

function releaseFixture(input?: {
  state?: "SUSPENDED" | "ACTIVE_INTERNAL";
  version?: number;
}) {
  return {
    id: "release-1",
    organizationId: "org-1",
    agentKey: "command-agent",
    releaseVersion: "2026.07.24.2",
    environment: "pilot",
    commitSha: "abcdef1234567890",
    manifestHash: `sha256:${"a".repeat(64)}`,
    manifest: {},
    modelProviderPolicy: {},
    allowedRoleCodes: ["manager"],
    activationStartsAt: now,
    activationEndsAt: new Date(now.getTime() + 60_000),
    residualRisks: null,
    state: input?.state ?? "SUSPENDED",
    version: input?.version ?? 7,
    requestedById: "requester-1",
    activatedById: null,
    activatedAt: null,
    suspendedAt: now,
    suspensionReason: "Controlled suspension.",
    retiredAt: null,
    retiredById: null,
    retirementReason: null,
    lastReconciledAt: now,
    reconciliationState: "PASSED",
    alertTransportReady: true,
    createdAt: now,
    updatedAt: now,
    approvals: [],
    owners: [],
    certifications: [],
  };
}
