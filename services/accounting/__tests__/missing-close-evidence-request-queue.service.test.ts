jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    user: {
      findFirst: jest.fn(),
    },
    closeAssuranceFinding: {
      findMany: jest.fn(),
    },
  },
}));

import { db } from "@/prisma/db";

import { getClientMissingCloseEvidenceRequestQueue } from "../missing-close-evidence-request-queue.service";

const mockDb = db as unknown as {
  user: {
    findFirst: jest.Mock;
  };
  closeAssuranceFinding: {
    findMany: jest.Mock;
  };
};

const NOW = new Date("2026-08-02T12:00:00.000Z");
const INPUT = {
  organizationId: "org-1",
  actorId: "client-user-1",
  actorPermissions: ["accounting.close.read"],
} as const;

type FindingFixtureOverrides = {
  id?: string;
  dueAt?: string;
  createdAt?: string;
  authorId?: string | null;
  body?: string;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function findingFixture(overrides: FindingFixtureOverrides = {}) {
  const id = overrides.id ?? "finding-1";
  const correlationId =
    overrides.correlationId === undefined
      ? `correlation-${id}`
      : overrides.correlationId;
  const authorId =
    overrides.authorId === undefined ? "accountant-1" : overrides.authorId;
  const dueAt = overrides.dueAt ?? "2026-08-04T12:00:00.000Z";
  const metadata =
    overrides.metadata === undefined
      ? {
          requestType: "MISSING_CLOSE_EVIDENCE",
          requestedById: authorId,
          requestedFromId: INPUT.actorId,
          dueAt,
          correlationId,
          internalSecret: "must-not-leak",
        }
      : overrides.metadata;

  return {
    id,
    closeRunId: `close-run-${id}`,
    domain: "DATA_TRUST",
    severity: "HIGH",
    status: "ASSIGNED",
    title: `Missing proof for ${id}`,
    detail: "Provide the referenced source evidence.",
    dueAt: new Date(dueAt),
    createdAt: new Date(overrides.createdAt ?? "2026-08-01T08:00:00.000Z"),
    period: {
      id: "period 1",
      name: "August 2026",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-08-31T23:59:59.999Z"),
    },
    comments: [
      {
        id: `request-${id}`,
        authorId,
        body: overrides.body ?? "Upload the supplier statement.",
        correlationId,
        metadata,
        createdAt: new Date(overrides.createdAt ?? "2026-08-01T08:00:00.000Z"),
      },
    ],
  };
}

describe("client missing close evidence request queue service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockDb.user.findFirst.mockResolvedValue({ id: INPUT.actorId });
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fails closed on RBAC before reading tenant data", async () => {
    await expect(
      getClientMissingCloseEvidenceRequestQueue({
        ...INPUT,
        actorPermissions: [],
      }),
    ).rejects.toMatchObject({
      name: "ForbiddenError",
      code: "FORBIDDEN",
      message: "Missing-proof requests are not available.",
    });

    expect(mockDb.user.findFirst).not.toHaveBeenCalled();
    expect(mockDb.closeAssuranceFinding.findMany).not.toHaveBeenCalled();
  });

  it("requires an active actor in the requested organization", async () => {
    mockDb.user.findFirst.mockResolvedValue(null);

    await expect(
      getClientMissingCloseEvidenceRequestQueue(INPUT),
    ).rejects.toMatchObject({
      name: "ForbiddenError",
      code: "FORBIDDEN",
    });

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: INPUT.actorId,
        organizationId: INPUT.organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    expect(mockDb.closeAssuranceFinding.findMany).not.toHaveBeenCalled();
  });

  it("returns only recipient-owned active requests with service-clock urgency", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([
      findingFixture({
        id: "overdue",
        dueAt: "2026-08-02T11:00:00.000Z",
      }),
      findingFixture({
        id: "soon",
        dueAt: "2026-08-05T12:00:00.000Z",
      }),
      findingFixture({
        id: "scheduled",
        dueAt: "2026-08-06T12:00:00.000Z",
      }),
    ]);

    const result = await getClientMissingCloseEvidenceRequestQueue({
      ...INPUT,
      requestedFromId: "other-user",
      now: "1999-01-01T00:00:00.000Z",
    } as typeof INPUT);

    expect(result).toMatchObject({
      kind: "CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE",
      version: 1,
      organizationId: INPUT.organizationId,
      actorId: INPUT.actorId,
      generatedAt: NOW.toISOString(),
      controls: {
        actorIsRecipient: true,
        activeTenantActorRequired: true,
        readPermissionRequired: "accounting.close.read",
        serviceClockOwned: true,
        rawMetadataExposed: false,
        maxItems: 100,
      },
      summary: {
        total: 3,
        overdue: 1,
        dueWithin72Hours: 1,
        scheduled: 1,
        invalidEvidence: 0,
        truncated: false,
      },
    });
    expect(result.requests.map((request) => request.findingId)).toEqual([
      "overdue",
      "soon",
      "scheduled",
    ]);
    expect(result.requests[0]).toMatchObject({
      requestedFromId: INPUT.actorId,
      actionPath: "/dashboard/accounting/close/period%201?findingId=overdue",
      requiredPermission: "accounting.close.read",
    });
    expect(JSON.stringify(result)).not.toContain("internalSecret");

    expect(mockDb.closeAssuranceFinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: INPUT.organizationId,
          ownerId: INPUT.actorId,
          status: {
            in: ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"],
          },
          comments: {
            some: expect.objectContaining({
              organizationId: INPUT.organizationId,
              visibility: "CLIENT_ACTION_REQUIRED",
              AND: expect.arrayContaining([
                {
                  metadata: {
                    path: ["requestType"],
                    equals: "MISSING_CLOSE_EVIDENCE",
                  },
                },
                {
                  metadata: {
                    path: ["requestedFromId"],
                    equals: INPUT.actorId,
                  },
                },
              ]),
            }),
          },
        },
        take: 101,
      }),
    );
  });

  it("turns malformed stored evidence into a redacted blocker", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([
      findingFixture({
        id: "invalid",
        metadata: {
          requestType: "MISSING_CLOSE_EVIDENCE",
          requestedById: "different-author",
          requestedFromId: INPUT.actorId,
          dueAt: "not-a-date",
          correlationId: "correlation-invalid",
          internalSecret: "must-not-leak",
        },
      }),
    ]);

    const result = await getClientMissingCloseEvidenceRequestQueue(INPUT);

    expect(result.requests).toEqual([]);
    expect(result.summary).toMatchObject({
      total: 0,
      invalidEvidence: 1,
    });
    expect(result.blockers).toEqual([
      {
        id: "missing-close-evidence-request:request-invalid:invalid-evidence",
        findingId: "invalid",
        requestId: "request-invalid",
        reason: "INVALID_REQUEST_EVIDENCE",
        detail: "Stored missing-proof request evidence is incomplete.",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("different-author");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("bounds the queue and reports truncation truthfully", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) =>
        findingFixture({
          id: `finding-${String(index).padStart(3, "0")}`,
        }),
      ),
    );

    const result = await getClientMissingCloseEvidenceRequestQueue(INPUT);

    expect(result.requests).toHaveLength(100);
    expect(result.summary).toMatchObject({
      total: 100,
      invalidEvidence: 0,
      truncated: true,
    });
    expect(mockDb.closeAssuranceFinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 101 }),
    );
  });

  it("rejects blank tenant or actor identifiers before database access", async () => {
    await expect(
      getClientMissingCloseEvidenceRequestQueue({
        ...INPUT,
        organizationId: " ",
      }),
    ).rejects.toMatchObject({
      name: "BusinessRuleError",
      code: "BUSINESS_RULE_VIOLATION",
    });

    expect(mockDb.user.findFirst).not.toHaveBeenCalled();
    expect(mockDb.closeAssuranceFinding.findMany).not.toHaveBeenCalled();
  });
});
