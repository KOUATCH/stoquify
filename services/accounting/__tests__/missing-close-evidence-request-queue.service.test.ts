jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    user: {
      findFirst: jest.fn(),
    },
    accountantComment: {
      findMany: jest.fn(),
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
  accountantComment: {
    findMany: jest.Mock;
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
  status?: string;
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
    status: overrides.status ?? "ASSIGNED",
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

type ResponseFixtureOverrides = {
  id?: string;
  findingId?: string;
  organizationId?: string;
  periodId?: string;
  closeRunId?: string;
  authorId?: string | null;
  body?: string;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

function responseFixture(overrides: ResponseFixtureOverrides = {}) {
  const findingId = overrides.findingId ?? "finding-1";
  const correlationId =
    overrides.correlationId === undefined
      ? `response-correlation-${findingId}`
      : overrides.correlationId;
  const authorId =
    overrides.authorId === undefined ? INPUT.actorId : overrides.authorId;
  const metadata =
    overrides.metadata === undefined
      ? {
          responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
          requestId: `request-${findingId}`,
          requestCorrelationId: `correlation-${findingId}`,
          requestedById: "accountant-1",
          requestedFromId: INPUT.actorId,
          respondedById: authorId,
          correlationId,
          internalResponseSecret: "must-not-leak",
        }
      : overrides.metadata;

  return {
    id: overrides.id ?? `response-${findingId}`,
    organizationId: overrides.organizationId ?? INPUT.organizationId,
    periodId: overrides.periodId ?? "period 1",
    closeRunId: overrides.closeRunId ?? `close-run-${findingId}`,
    findingId,
    authorId,
    body: overrides.body ?? "The supplier statement has been uploaded.",
    correlationId,
    metadata,
    createdAt: new Date(overrides.createdAt ?? "2026-08-02T10:30:00.000Z"),
  };
}

describe("client missing close evidence request queue service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockDb.user.findFirst.mockResolvedValue({ id: INPUT.actorId });
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([]);
    mockDb.accountantComment.findMany.mockResolvedValue([]);
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
      version: 2,
      organizationId: INPUT.organizationId,
      actorId: INPUT.actorId,
      generatedAt: NOW.toISOString(),
      controls: {
        actorIsRecipient: true,
        activeTenantActorRequired: true,
        readPermissionRequired: "accounting.close.read",
        serviceClockOwned: true,
        rawMetadataExposed: false,
        responseBodyExposed: false,
        responseStateServiceOwned: true,
        maxItems: 100,
      },
      summary: {
        total: 3,
        awaitingResponse: 3,
        responseSubmitted: 0,
        overdue: 1,
        dueWithin72Hours: 1,
        scheduled: 1,
        invalidEvidence: 0,
        invalidRequestEvidence: 0,
        invalidResponseEvidence: 0,
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
      workflowState: "AWAITING_RECIPIENT_RESPONSE",
      response: null,
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
    expect(mockDb.accountantComment.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: INPUT.organizationId,
        findingId: { in: ["overdue", "soon", "scheduled"] },
        visibility: "CLIENT_RESPONSE_SUBMITTED",
        metadata: {
          path: ["responseType"],
          equals: "MISSING_CLOSE_EVIDENCE_RESPONSE",
        },
      },
      select: {
        id: true,
        organizationId: true,
        periodId: true,
        closeRunId: true,
        findingId: true,
        authorId: true,
        body: true,
        correlationId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: [
        { findingId: "asc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 201,
    });
  });

  it("projects one relationship-validated response without exposing its body or metadata", async () => {
    const responseBody = "The supplier statement contains private account notes.";
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([
      findingFixture({ status: "IN_REVIEW" }),
    ]);
    mockDb.accountantComment.findMany.mockResolvedValue([
      responseFixture({ body: responseBody }),
    ]);

    const result = await getClientMissingCloseEvidenceRequestQueue(INPUT);

    expect(result.requests).toEqual([
      expect.objectContaining({
        requestId: "request-finding-1",
        workflowState: "RESPONSE_SUBMITTED",
        response: {
          responseId: "response-finding-1",
          correlationId: "response-correlation-finding-1",
          respondedById: INPUT.actorId,
          submittedAt: "2026-08-02T10:30:00.000Z",
          status: "SUBMITTED",
        },
        finding: expect.objectContaining({ status: "IN_REVIEW" }),
      }),
    ]);
    expect(result.summary).toMatchObject({
      total: 1,
      awaitingResponse: 0,
      responseSubmitted: 1,
      overdue: 0,
      dueWithin72Hours: 0,
      scheduled: 0,
      invalidEvidence: 0,
      invalidRequestEvidence: 0,
      invalidResponseEvidence: 0,
    });
    expect(JSON.stringify(result)).not.toContain(responseBody);
    expect(JSON.stringify(result)).not.toContain("internalResponseSecret");
  });

  it.each([
    ["an in-review finding without response evidence", [], "IN_REVIEW"],
    [
      "a response with mismatched request relationship evidence",
      [
        responseFixture({
          metadata: {
            ...responseFixture().metadata,
            requestId: "other-request",
          },
        }),
      ],
      "IN_REVIEW",
    ],
    [
      "duplicate response evidence",
      [responseFixture(), responseFixture({ id: "response-duplicate" })],
      "IN_REVIEW",
    ],
    [
      "response evidence on an awaiting finding",
      [responseFixture()],
      "ASSIGNED",
    ],
  ])("blocks %s without leaking evidence", async (_name, responses, status) => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([
      findingFixture({ status }),
    ]);
    mockDb.accountantComment.findMany.mockResolvedValue(responses);

    const result = await getClientMissingCloseEvidenceRequestQueue(INPUT);

    expect(result.requests).toEqual([]);
    expect(result.blockers).toEqual([
      {
        id: "missing-close-evidence-request:request-finding-1:invalid-response-evidence",
        findingId: "finding-1",
        requestId: "request-finding-1",
        reason: "INVALID_RESPONSE_EVIDENCE",
        detail: "Stored missing-proof response evidence is incomplete.",
      },
    ]);
    expect(result.summary).toMatchObject({
      total: 0,
      invalidEvidence: 1,
      invalidRequestEvidence: 0,
      invalidResponseEvidence: 1,
    });
    expect(JSON.stringify(result)).not.toContain("other-request");
    expect(JSON.stringify(result)).not.toContain("internalResponseSecret");
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
      awaitingResponse: 0,
      responseSubmitted: 0,
      invalidEvidence: 1,
      invalidRequestEvidence: 1,
      invalidResponseEvidence: 0,
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
      awaitingResponse: 100,
      responseSubmitted: 0,
      invalidEvidence: 0,
      invalidRequestEvidence: 0,
      invalidResponseEvidence: 0,
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
