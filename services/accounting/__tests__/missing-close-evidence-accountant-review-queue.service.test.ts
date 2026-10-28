jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    user: { findFirst: jest.fn() },
    closeAssuranceFinding: { findMany: jest.fn() },
    accountantComment: { findMany: jest.fn() },
  },
}))

jest.mock("@/services/accounting/accountant-access.service", () => ({
  resolveAccountantClientAccess: jest.fn(),
}))

import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveAccountantClientAccess } from "../accountant-access.service"
import { getAccountantMissingCloseEvidenceReviewQueue } from "../missing-close-evidence-accountant-review-queue.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  user: { findFirst: jest.Mock }
  closeAssuranceFinding: { findMany: jest.Mock }
  accountantComment: { findMany: jest.Mock }
}
const mockResolveAccountantClientAccess =
  resolveAccountantClientAccess as jest.Mock

const NOW = new Date("2026-08-08T10:00:00.000Z")
const INPUT = {
  homeOrganizationId: "firm-org",
  clientOrganizationId: "client-org",
  actorId: "accountant-1",
  actorPermissions: ["accounting.close.accountant.review"],
} as const

function findingFixture(
  overrides: Partial<{
    id: string
    ownerId: string | null
    createdAt: string
    severity: string
  }> = {},
) {
  const id = overrides.id ?? "finding-1"
  return {
    id,
    closeRunId: `close-run-${id}`,
    ownerId:
      overrides.ownerId === undefined ? "client-user-1" : overrides.ownerId,
    domain: "DATA_TRUST",
    severity: overrides.severity ?? "HIGH",
    status: "IN_REVIEW",
    title: `Missing proof for ${id}`,
    detail: "Review the submitted source evidence.",
    createdAt: new Date(overrides.createdAt ?? "2026-08-07T08:00:00.000Z"),
    period: {
      id: `period-${id}`,
      name: "August 2026",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-08-31T23:59:59.999Z"),
    },
  }
}

function requestFixture(
  overrides: Partial<{
    id: string
    findingId: string
    organizationId: string
    periodId: string
    closeRunId: string
    authorId: string | null
    body: string
    correlationId: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }> = {},
) {
  const findingId = overrides.findingId ?? "finding-1"
  const authorId =
    overrides.authorId === undefined ? "requesting-accountant" : overrides.authorId
  const correlationId =
    overrides.correlationId === undefined
      ? `request-correlation-${findingId}`
      : overrides.correlationId
  return {
    id: overrides.id ?? `request-${findingId}`,
    organizationId: overrides.organizationId ?? INPUT.clientOrganizationId,
    periodId: overrides.periodId ?? `period-${findingId}`,
    closeRunId: overrides.closeRunId ?? `close-run-${findingId}`,
    findingId,
    authorId,
    body: overrides.body ?? "Please provide the missing supplier statement.",
    correlationId,
    metadata:
      overrides.metadata === undefined
        ? {
            requestType: "MISSING_CLOSE_EVIDENCE",
            requestedById: authorId,
            requestedFromId: "client-user-1",
            dueAt: "2026-08-10T12:00:00.000Z",
            correlationId,
            privateRequestMetadata: "must-not-leak",
          }
        : overrides.metadata,
    createdAt: new Date(overrides.createdAt ?? "2026-08-07T09:00:00.000Z"),
  }
}

function responseFixture(
  overrides: Partial<{
    id: string
    findingId: string
    organizationId: string
    periodId: string
    closeRunId: string
    authorId: string | null
    body: string
    correlationId: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }> = {},
) {
  const findingId = overrides.findingId ?? "finding-1"
  const authorId =
    overrides.authorId === undefined ? "client-user-1" : overrides.authorId
  const correlationId =
    overrides.correlationId === undefined
      ? `response-correlation-${findingId}`
      : overrides.correlationId
  return {
    id: overrides.id ?? `response-${findingId}`,
    organizationId: overrides.organizationId ?? INPUT.clientOrganizationId,
    periodId: overrides.periodId ?? `period-${findingId}`,
    closeRunId: overrides.closeRunId ?? `close-run-${findingId}`,
    findingId,
    authorId,
    body: overrides.body ?? "The requested supplier statement is attached.",
    correlationId,
    metadata:
      overrides.metadata === undefined
        ? {
            responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE",
            requestId: `request-${findingId}`,
            requestCorrelationId: `request-correlation-${findingId}`,
            requestedById: "requesting-accountant",
            requestedFromId: "client-user-1",
            respondedById: authorId,
            correlationId,
            privateResponseMetadata: "must-not-leak",
          }
        : overrides.metadata,
    createdAt: new Date(overrides.createdAt ?? "2026-08-08T08:00:00.000Z"),
  }
}

function setCommentReads(
  requests: ReturnType<typeof requestFixture>[],
  responses: ReturnType<typeof responseFixture>[],
) {
  mockDb.accountantComment.findMany
    .mockResolvedValueOnce(requests)
    .mockResolvedValueOnce(responses)
}

describe("accountant missing-close-evidence review queue service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(NOW)
    mockDb.$transaction.mockImplementation(
      async (operation: (client: typeof mockDb) => Promise<unknown>) =>
        operation(mockDb),
    )
    mockDb.user.findFirst.mockResolvedValue({ id: INPUT.actorId })
    mockResolveAccountantClientAccess.mockResolvedValue({
      organizationId: INPUT.clientOrganizationId,
      mode: "DELEGATED_ACCOUNTANT",
      grant: { id: "grant-1", role: "REVIEWER" },
    })
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([])
    mockDb.accountantComment.findMany.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("fails closed on RBAC before opening a database transaction", async () => {
    await expect(
      getAccountantMissingCloseEvidenceReviewQueue({
        ...INPUT,
        actorPermissions: [],
      }),
    ).rejects.toMatchObject({ name: "ForbiddenError", code: "FORBIDDEN" })

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockResolveAccountantClientAccess).not.toHaveBeenCalled()
  })

  it("rejects a blank caller-supplied client organization before reads", async () => {
    await expect(
      getAccountantMissingCloseEvidenceReviewQueue({
        ...INPUT,
        clientOrganizationId: "   ",
      }),
    ).rejects.toThrow("Client organization must not be blank.")

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("requires an active actor in the protected home organization", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)

    await expect(
      getAccountantMissingCloseEvidenceReviewQueue(INPUT),
    ).rejects.toMatchObject({ name: "ForbiddenError", code: "FORBIDDEN" })

    expect(mockDb.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: INPUT.actorId,
        organizationId: INPUT.homeOrganizationId,
        isActive: true,
      },
      select: { id: true },
    })
    expect(mockResolveAccountantClientAccess).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.findMany).not.toHaveBeenCalled()
  })

  it.each([
    "read-only grant",
    "expired grant",
    "revoked grant",
    "wrong client grant",
    "missing grant",
  ])("stops after delegated access rejects a %s", async () => {
    mockResolveAccountantClientAccess.mockRejectedValue(
      new ForbiddenError("No active review grant."),
    )

    await expect(
      getAccountantMissingCloseEvidenceReviewQueue(INPUT),
    ).rejects.toMatchObject({ name: "ForbiddenError", code: "FORBIDDEN" })

    expect(mockDb.closeAssuranceFinding.findMany).not.toHaveBeenCalled()
    expect(mockDb.accountantComment.findMany).not.toHaveBeenCalled()
  })

  it("returns a delegated request-bound response with explicit authorized text exposure", async () => {
    const requestText = "Please provide the confidential supplier statement."
    const responseText = "The confidential supplier statement is attached."
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([findingFixture()])
    setCommentReads(
      [requestFixture({ body: requestText })],
      [responseFixture({ body: responseText })],
    )

    const result = await getAccountantMissingCloseEvidenceReviewQueue({
      ...INPUT,
      now: "1900-01-01T00:00:00.000Z",
      organizationId: "attacker-org",
    } as typeof INPUT)

    expect(result).toMatchObject({
      kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE",
      version: 1,
      homeOrganizationId: INPUT.homeOrganizationId,
      organizationId: INPUT.clientOrganizationId,
      actorId: INPUT.actorId,
      generatedAt: NOW.toISOString(),
      source: {
        organizationScoped: true,
        accessMode: "DELEGATED_ACCOUNTANT",
        redaction: "ACCOUNTANT_REVIEW_NO_RAW_METADATA",
      },
      controls: {
        activeHomeTenantActorRequired: true,
        targetOrganizationServiceResolved: true,
        delegatedReviewGrantRequired: true,
        readPermissionRequired: "accounting.close.accountant.review",
        serviceClockOwned: true,
        rawMetadataExposed: false,
        responseTextExposure: "AUTHORIZED_ACCOUNTANT_REVIEW_ONLY",
        failClosedOnTruncation: true,
        maxItems: 100,
      },
      summary: {
        total: 1,
        invalidEvidence: 0,
        invalidRequestEvidence: 0,
        invalidResponseEvidence: 0,
        truncatedEvidence: 0,
        truncated: false,
      },
    })
    expect(result.items).toEqual([
      expect.objectContaining({
        findingId: "finding-1",
        workflowState: "AWAITING_ACCOUNTANT_REVIEW",
        request: expect.objectContaining({
          requestId: "request-finding-1",
          requestText,
        }),
        response: expect.objectContaining({
          responseId: "response-finding-1",
          responseText,
          status: "SUBMITTED",
        }),
      }),
    ])
    expect(JSON.stringify(result)).not.toContain("privateRequestMetadata")
    expect(JSON.stringify(result)).not.toContain("privateResponseMetadata")
    expect(mockResolveAccountantClientAccess).toHaveBeenCalledWith({
      homeOrganizationId: INPUT.homeOrganizationId,
      clientOrganizationId: INPUT.clientOrganizationId,
      accountantUserId: INPUT.actorId,
      capability: "REVIEW",
      now: NOW,
      client: mockDb,
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "RepeatableRead" },
    )
  })

  it("supports same-tenant accountant review without caller target authority", async () => {
    mockResolveAccountantClientAccess.mockResolvedValue({
      organizationId: INPUT.homeOrganizationId,
      mode: "TENANT_MEMBER",
      grant: null,
    })

    const result = await getAccountantMissingCloseEvidenceReviewQueue({
      homeOrganizationId: INPUT.homeOrganizationId,
      actorId: INPUT.actorId,
      actorPermissions: INPUT.actorPermissions,
    })

    expect(result.source.accessMode).toBe("TENANT_MEMBER")
    expect(result.organizationId).toBe(INPUT.homeOrganizationId)
  })

  it.each([
    [
      "duplicate request evidence",
      [requestFixture(), requestFixture({ id: "request-duplicate" })],
    ],
    [
      "request author mismatch",
      [
        requestFixture({
          metadata: {
            ...requestFixture().metadata,
            requestedById: "other-accountant",
          },
        }),
      ],
    ],
    [
      "request owner mismatch",
      [requestFixture()],
    ],
  ])("blocks %s without exposing request text", async (_name, requests) => {
    const requestBody = "Sensitive malformed request text."
    const finding =
      _name === "request owner mismatch"
        ? findingFixture({ ownerId: "other-client-user" })
        : findingFixture()
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([finding])
    setCommentReads(
      requests.map((request) => ({ ...request, body: requestBody })),
      [responseFixture()],
    )

    const result = await getAccountantMissingCloseEvidenceReviewQueue(INPUT)

    expect(result.items).toEqual([])
    expect(result.blockers).toEqual([
      expect.objectContaining({
        findingId: "finding-1",
        reason: "INVALID_REQUEST_EVIDENCE",
        detail: "Stored missing-proof request evidence is incomplete.",
      }),
    ])
    expect(result.summary.invalidRequestEvidence).toBe(1)
    expect(JSON.stringify(result)).not.toContain(requestBody)
  })

  it.each([
    ["missing response evidence", []],
    [
      "duplicate response evidence",
      [responseFixture(), responseFixture({ id: "response-duplicate" })],
    ],
    [
      "mismatched response relationship",
      [
        responseFixture({
          metadata: {
            ...responseFixture().metadata,
            requestId: "other-request",
          },
        }),
      ],
    ],
  ])("blocks %s without exposing response text", async (_name, responses) => {
    const responseBody = "Sensitive malformed response text."
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([findingFixture()])
    setCommentReads(
      [requestFixture()],
      responses.map((response) => ({ ...response, body: responseBody })),
    )

    const result = await getAccountantMissingCloseEvidenceReviewQueue(INPUT)

    expect(result.items).toEqual([])
    expect(result.blockers).toEqual([
      expect.objectContaining({
        findingId: "finding-1",
        requestId: "request-finding-1",
        reason: "INVALID_RESPONSE_EVIDENCE",
        detail: "Stored missing-proof response evidence is incomplete.",
      }),
    ])
    expect(result.summary.invalidResponseEvidence).toBe(1)
    expect(JSON.stringify(result)).not.toContain(responseBody)
  })

  it("fails the whole queue closed when finding candidates exceed the bound", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) =>
        findingFixture({ id: `finding-${index}` }),
      ),
    )

    const result = await getAccountantMissingCloseEvidenceReviewQueue(INPUT)

    expect(result.items).toEqual([])
    expect(result.blockers).toEqual([
      expect.objectContaining({ reason: "TRUNCATED_EVIDENCE" }),
    ])
    expect(result.summary).toMatchObject({
      total: 0,
      invalidEvidence: 1,
      truncatedEvidence: 1,
      truncated: true,
    })
    expect(mockDb.accountantComment.findMany).not.toHaveBeenCalled()
  })

  it("fails the whole queue closed when comment candidates exceed the bound", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([findingFixture()])
    mockDb.accountantComment.findMany
      .mockResolvedValueOnce(
        Array.from({ length: 201 }, (_, index) =>
          requestFixture({ id: `request-${index}` }),
        ),
      )
      .mockResolvedValueOnce([responseFixture()])

    const result = await getAccountantMissingCloseEvidenceReviewQueue(INPUT)

    expect(result.items).toEqual([])
    expect(result.blockers).toEqual([
      expect.objectContaining({ reason: "TRUNCATED_EVIDENCE" }),
    ])
    expect(result.summary.truncated).toBe(true)
  })

  it("orders valid items by oldest submitted response then request id", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([
      findingFixture({ id: "late" }),
      findingFixture({ id: "early" }),
    ])
    setCommentReads(
      [requestFixture({ findingId: "late" }), requestFixture({ findingId: "early" })],
      [
        responseFixture({
          findingId: "late",
          createdAt: "2026-08-08T09:00:00.000Z",
        }),
        responseFixture({
          findingId: "early",
          createdAt: "2026-08-08T07:00:00.000Z",
        }),
      ],
    )

    const result = await getAccountantMissingCloseEvidenceReviewQueue(INPUT)

    expect(result.items.map((item) => item.findingId)).toEqual([
      "early",
      "late",
    ])
  })

  it("uses typed bounded queries instead of the broad close comment stream", async () => {
    mockDb.closeAssuranceFinding.findMany.mockResolvedValue([findingFixture()])
    setCommentReads([requestFixture()], [responseFixture()])

    await getAccountantMissingCloseEvidenceReviewQueue(INPUT)

    expect(mockDb.closeAssuranceFinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: INPUT.clientOrganizationId,
          status: "IN_REVIEW",
          comments: {
            some: {
              organizationId: INPUT.clientOrganizationId,
              visibility: "CLIENT_ACTION_REQUIRED",
              metadata: {
                path: ["requestType"],
                equals: "MISSING_CLOSE_EVIDENCE",
              },
            },
          },
        },
        take: 101,
      }),
    )
    expect(mockDb.accountantComment.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: INPUT.clientOrganizationId,
          visibility: "CLIENT_ACTION_REQUIRED",
          findingId: { in: ["finding-1"] },
        }),
        take: 201,
      }),
    )
    expect(mockDb.accountantComment.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: INPUT.clientOrganizationId,
          visibility: "CLIENT_RESPONSE_SUBMITTED",
          findingId: { in: ["finding-1"] },
        }),
        take: 201,
      }),
    )
  })
})
