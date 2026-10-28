jest.mock("server-only", () => ({}))

const tx = {
  branchDailyCloseRun: {
    findUnique: jest.fn(),
  },
  branchDailyCloseSignOff: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  organization: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  businessEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock("@/prisma/db", () => ({
  db: {
    branchDailyCloseSignOff: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("../branch-daily-close-review-drift.service", () => ({
  getBranchDailyCloseReviewDrift: jest.fn(),
}))

jest.mock("../branch-daily-close-sign-off-control", () => {
  const actual = jest.requireActual("../branch-daily-close-sign-off-control")
  return {
    ...actual,
    evaluateBranchDailyCloseSignOffControl: jest.fn(
      actual.evaluateBranchDailyCloseSignOffControl,
    ),
  }
})

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"

import type { BranchDailyCloseReviewDriftResult } from "../branch-daily-close-review-drift-contracts"
import { getBranchDailyCloseReviewDrift } from "../branch-daily-close-review-drift.service"
import { evaluateBranchDailyCloseSignOffControl } from "../branch-daily-close-sign-off-control"
import type { SignBranchDailyCloseInput } from "../branch-daily-close-sign-off-contracts"
import { signBranchDailyClose } from "../branch-daily-close-sign-off.service"

const actualControl = jest.requireActual<
  typeof import("../branch-daily-close-sign-off-control")
>("../branch-daily-close-sign-off-control")
const mockGetDrift = getBranchDailyCloseReviewDrift as jest.Mock
const mockEvaluateControl = evaluateBranchDailyCloseSignOffControl as jest.Mock
const mockDb = db as unknown as {
  branchDailyCloseSignOff: { findFirst: jest.Mock }
  auditLog: { create: jest.Mock }
  $transaction: jest.Mock
}

const now = new Date("2026-07-18T21:00:00.000Z")
const freshAuthAt = new Date("2026-07-18T20:59:00.000Z")
const observedAt = new Date("2026-07-18T20:45:00.000Z")
const readinessSourceHash = `sha256:${"a".repeat(64)}`
const evidenceHash = `sha256:${"b".repeat(64)}`

describe("branch daily-close sign-off service", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockEvaluateControl.mockImplementation(
      actualControl.evaluateBranchDailyCloseSignOffControl,
    )
    mockGetDrift.mockResolvedValue(driftFixture())
    mockDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    )
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(runFixture())
    tx.organization.findFirst.mockResolvedValue({
      id: "org-1",
      requestedModules: ["dashboard"],
    })
    tx.branchDailyCloseSignOff.findUnique.mockResolvedValue(null)
    tx.branchDailyCloseSignOff.create.mockImplementation(async ({ data }) =>
      signOffFixture({
        ...data,
        requestHash: data.requestHash,
      }),
    )
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" })
    tx.businessEvent.findUnique.mockResolvedValue(null)
    tx.businessEvent.create.mockImplementation(async ({ data }) => ({
      id: "event-1",
      ...data,
      outboxMessages: data.outboxMessages.create,
    }))
    mockDb.branchDailyCloseSignOff.findFirst.mockResolvedValue(null)
    mockDb.auditLog.create.mockResolvedValue({ id: "conflict-audit-1" })
  })

  it("rejects actor and access-context mismatch before resolving drift", async () => {
    await expect(
      signBranchDailyClose(
        defaultInput({
          actorId: "another-actor",
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockGetDrift).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("propagates tenant/location access denial before opening a write transaction", async () => {
    mockGetDrift.mockRejectedValue(
      new ForbiddenError(
        "Branch daily-close readiness is not available for this location.",
      ),
    )

    await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
      ForbiddenError,
    )

    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
  })

  it("atomically signs the exact current review evidence with a distinct checker", async () => {
    const input = defaultInput()
    const result = await signBranchDailyClose(input)

    expect(mockGetDrift).toHaveBeenCalledWith({
      accessContext: input.accessContext,
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
      maxAgeMinutes: 1440,
    })
    expect(mockGetDrift.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.$transaction.mock.invocationCallOrder[0],
    )
    expect(mockDb.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "Serializable",
    })
    expect(mockEvaluateControl).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "checker-1",
        actorPermissions: ["dashboard.read", "branch.daily-close.sign"],
        subjectActorId: "maker-1",
        lastAuthAt: freshAuthAt,
        now,
        resourceType: "BranchDailyCloseRun",
        resourceId: "run-1",
        requestedModules: ["dashboard"],
      }),
    )

    const createData = tx.branchDailyCloseSignOff.create.mock.calls[0][0].data
    expect(createData).toMatchObject({
      organizationId: "org-1",
      branchDailyCloseRunId: "run-1",
      status: "ACTIVE",
      activeKey: "run-1",
      signedReadinessSourceHash: readinessSourceHash,
      signedEvidenceHash: evidenceHash,
      signedEvidenceObservedAt: observedAt,
      signedById: "checker-1",
      signedAt: now,
      authAssuranceLevel: "L1",
      freshAuthAt,
      idempotencyKey: "sign-off-1",
      correlationId: "correlation-1",
    })
    expect(createData.requestHash).toBe(expectedRequestHash(input))

    expect(tx.auditLog.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "BranchDailyCloseRun",
          entityId: "run-1",
          action: "BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL",
          organizationId: "org-1",
          userId: "checker-1",
        }),
      }),
    )
    expect(tx.auditLog.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "BranchDailyCloseSignOff",
          action: "BRANCH_DAILY_CLOSE_SIGNED",
          organizationId: "org-1",
          userId: "checker-1",
        }),
      }),
    )
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "branch.daily-close.signed",
          eventSource: "INTERNAL",
          idempotencyKey: "branch-daily-close-sign-off:sign-off-1",
          actorId: "checker-1",
          locationId: "location-1",
          sourceType: "MANUAL",
          sourceId: "sign-off-record-1",
          documentHash: evidenceHash,
          metadata: expect.objectContaining({
            sourceEntityType: "BranchDailyCloseSignOff",
          }),
          outboxMessages: { create: [] },
        }),
      }),
    )
    expect(
      tx.branchDailyCloseSignOff.create.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.businessEvent.create.mock.invocationCallOrder[0])
    expect(result).toEqual({
      kind: "BRANCH_DAILY_CLOSE_SIGN_OFF",
      created: true,
      replayed: false,
      signOff: expect.objectContaining({
        id: "sign-off-record-1",
        organizationId: "org-1",
        branchDailyCloseRunId: "run-1",
        status: "ACTIVE",
        signedReadinessSourceHash: readinessSourceHash,
        signedEvidenceHash: evidenceHash,
        signedById: "checker-1",
        authAssuranceLevel: "L1",
      }),
    })
    expect(forbiddenCredentialKeys(result)).toEqual([])
    expect(result.signOff).not.toHaveProperty("requestHash")
    expect(mockDb.auditLog.create).not.toHaveBeenCalled()
  })

  it("returns the original sign-off on an exact idempotent replay", async () => {
    const input = defaultInput()
    const existing = signOffFixture({
      requestHash: expectedRequestHash(input),
    })
    tx.branchDailyCloseSignOff.findUnique.mockResolvedValueOnce(existing)

    const result = await signBranchDailyClose(input)

    expect(result).toMatchObject({ created: false, replayed: true })
    expect(result.signOff.id).toBe(existing.id)
    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
  })

  it("fails closed when an exact replay resolves to another tenant", async () => {
    const input = defaultInput()
    tx.branchDailyCloseSignOff.findUnique.mockResolvedValueOnce(
      signOffFixture({
        organizationId: "org-other",
        requestHash: expectedRequestHash(input),
      }),
    )

    await expect(signBranchDailyClose(input)).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
  })

  it("rejects idempotency reuse with different evidence and audits the conflict", async () => {
    tx.branchDailyCloseSignOff.findUnique.mockResolvedValueOnce(
      signOffFixture({ requestHash: `sha256:${"c".repeat(64)}` }),
    )

    await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
      ConflictError,
    )

    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "BRANCH_DAILY_CLOSE_SIGN_OFF_CONFLICT",
          organizationId: "org-1",
          userId: "checker-1",
        }),
      }),
    )
  })

  it("rejects a second active sign-off for the same stored run", async () => {
    tx.branchDailyCloseSignOff.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(signOffFixture())

    await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
      ConflictError,
    )

    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
    expect(mockDb.auditLog.create.mock.calls[0][0].data.changes.after.reason).toBe(
      "ACTIVE_SIGN_OFF_ALREADY_EXISTS",
    )
  })

  it("recovers a concurrent unique race as an exact replay", async () => {
    const input = defaultInput()
    mockDb.$transaction.mockRejectedValue(prismaError("P2002"))
    mockDb.branchDailyCloseSignOff.findFirst.mockResolvedValue(
      signOffFixture({ requestHash: expectedRequestHash(input) }),
    )

    const result = await signBranchDailyClose(input)

    expect(result).toMatchObject({ created: false, replayed: true })
    expect(mockDb.auditLog.create).not.toHaveBeenCalled()
  })

  it("fails closed and audits a concurrent active-key conflict", async () => {
    mockDb.$transaction.mockRejectedValue(prismaError("P2002"))
    mockDb.branchDailyCloseSignOff.findFirst.mockResolvedValue(
      signOffFixture({
        idempotencyKey: "another-key",
        requestHash: `sha256:${"d".repeat(64)}`,
      }),
    )

    await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
      ConflictError,
    )
    expect(mockDb.auditLog.create.mock.calls[0][0].data.changes.after.reason).toBe(
      "CONCURRENT_SIGN_OFF_CONFLICT",
    )
  })

  it.each(["NOT_STARTED", "DRIFTED"] as const)(
    "rejects %s drift before opening a write transaction",
    async (state) => {
      mockGetDrift.mockResolvedValue(
        driftFixture({
          state,
          stored: state === "NOT_STARTED" ? null : driftFixture().stored,
          reasons:
            state === "DRIFTED" ? ["READINESS_SOURCE_HASH_CHANGED"] : [],
        }),
      )

      await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
        BusinessRuleError,
      )
      expect(mockDb.$transaction).not.toHaveBeenCalled()
    },
  )

  it("fails closed when a claimed CURRENT drift result is internally inconsistent", async () => {
    mockGetDrift.mockResolvedValue(
      driftFixture({
        current: {
          ...driftFixture().current,
          blockerCount: 1,
        },
      }),
    )

    await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects blocked, cross-tenant, and transaction-drifted stored runs", async () => {
    for (const run of [
      runFixture({ status: "BLOCKED" }),
      runFixture({ organizationId: "org-other" }),
      runFixture({ evidenceHash: `sha256:${"e".repeat(64)}` }),
    ]) {
      jest.clearAllMocks()
      mockEvaluateControl.mockImplementation(
        actualControl.evaluateBranchDailyCloseSignOffControl,
      )
      mockGetDrift.mockResolvedValue(driftFixture())
      mockDb.$transaction.mockImplementation(
        async (callback: (client: typeof tx) => unknown) => callback(tx),
      )
      tx.branchDailyCloseRun.findUnique.mockResolvedValue(run)

      await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
        run.organizationId === "org-other" ? ForbiddenError : BusinessRuleError,
      )
      expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
      expect(tx.businessEvent.create).not.toHaveBeenCalled()
    }
  })

  it.each([
    {
      name: "missing permission",
      input: defaultInput({
        accessContext: accessContext({ permissions: ["dashboard.read"] }),
      }),
      run: runFixture(),
      code: "MISSING_PERMISSION",
      error: BusinessRuleError,
    },
    {
      name: "stale authentication",
      input: defaultInput({
        lastAuthAt: new Date("2026-07-18T20:50:00.000Z"),
      }),
      run: runFixture(),
      code: "FRESH_AUTH_REQUIRED",
      error: BusinessRuleError,
    },
    {
      name: "self approval",
      input: defaultInput(),
      run: runFixture({ startedById: "checker-1" }),
      code: "SELF_APPROVAL_BLOCKED",
      error: BusinessRuleError,
    },
  ])("commits a denial audit for $name without sign-off evidence", async (testCase) => {
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(testCase.run)

    await expect(signBranchDailyClose(testCase.input)).rejects.toBeInstanceOf(
      testCase.error,
    )

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL_DENIED",
          changes: expect.objectContaining({ reasonCode: testCase.code }),
        }),
      }),
    )
    expect(tx.branchDailyCloseSignOff.findUnique).not.toHaveBeenCalled()
    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
  })

  it("commits a module-entitlement denial audit without creating sign-off evidence", async () => {
    mockEvaluateControl.mockImplementation((controlInput) => {
      const base = actualControl.evaluateBranchDailyCloseSignOffControl(
        controlInput,
      )
      return {
        ...base,
        allowed: false,
        moduleEntitlement: {
          ...base.moduleEntitlement,
          allowed: false,
          wouldBlock: true,
          result: "deny",
          reason: "Dashboard write access is suspended.",
        },
      }
    })

    await expect(signBranchDailyClose(defaultInput())).rejects.toBeInstanceOf(
      ForbiddenError,
    )

    const audit = tx.auditLog.create.mock.calls[0][0].data
    expect(audit).toMatchObject({
      action: "BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL_DENIED",
      organizationId: "org-1",
      userId: "checker-1",
      changes: {
        reasonCode: "MODULE_ENTITLEMENT_DENIED",
        allowed: false,
        moduleSlug: "dashboard",
        accessIntent: "write",
        entitlementResult: "deny",
      },
    })
    expect(tx.branchDailyCloseSignOff.create).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
  })

  it.each([
    ["persistence", () => tx.branchDailyCloseSignOff.create, new Error("write failed")],
    ["success audit", () => tx.auditLog.create, new Error("audit failed")],
    ["business event", () => tx.businessEvent.create, new Error("event failed")],
  ] as const)(
    "surfaces a safe typed %s failure from the one sign-off transaction",
    async (stage, mockFactory, error) => {
      if (stage === "success audit") {
        tx.auditLog.create
          .mockResolvedValueOnce({ id: "control-audit" })
          .mockRejectedValueOnce(error)
      } else {
        mockFactory().mockRejectedValue(error)
      }

      await expect(signBranchDailyClose(defaultInput())).rejects.toMatchObject({
        name: "BusinessRuleError",
        message: "Branch daily-close sign-off could not be completed safely.",
      })
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
      expect(mockDb.auditLog.create).not.toHaveBeenCalled()
      if (stage === "persistence") {
        expect(tx.businessEvent.create).not.toHaveBeenCalled()
      }
    },
  )
})

function defaultInput(
  overrides: Partial<SignBranchDailyCloseInput> = {},
): SignBranchDailyCloseInput {
  return {
    accessContext: accessContext(),
    actorId: "checker-1",
    locationId: "location-1",
    businessDate: "2026-07-18",
    idempotencyKey: "sign-off-1",
    correlationId: "correlation-1",
    lastAuthAt: freshAuthAt,
    now,
    maxAgeMinutes: 1440,
    ...overrides,
  }
}

function accessContext(
  overrides: Partial<OperatingAccessContext> = {},
): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "checker-1",
    roles: ["MANAGER"],
    permissions: ["dashboard.read", "branch.daily-close.sign"],
    isSuperUser: false,
    ...overrides,
  }
}

function driftFixture(
  overrides: Partial<BranchDailyCloseReviewDriftResult> = {},
): BranchDailyCloseReviewDriftResult {
  return {
    kind: "BRANCH_DAILY_CLOSE_REVIEW_DRIFT",
    organizationId: "org-1",
    actorId: "checker-1",
    generatedAt: now.toISOString(),
    businessDate: "2026-07-18",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "MANAGER",
    },
    scope: { kind: "LOCATION", locationId: "location-1" },
    location: { id: "location-1", name: "Main", code: "MAIN" },
    state: "CURRENT",
    reasons: [],
    stored: {
      sourceId: "run-1",
      observedAt: observedAt.toISOString(),
      readinessState: "READY_FOR_REVIEW",
      readinessSourceHash,
      evidenceHash,
      supportedItemCount: 5,
      unsupportedItemCount: 2,
      blockerCount: 0,
    },
    current: {
      observedAt: observedAt.toISOString(),
      readinessState: "READY_FOR_REVIEW",
      readinessSourceHash,
      supportedItemCount: 5,
      unsupportedItemCount: 2,
      blockerCount: 0,
    },
    ...overrides,
  }
}

function runFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    organizationId: "org-1",
    locationId: "location-1",
    businessDate: new Date("2026-07-18T00:00:00.000Z"),
    status: "IN_REVIEW",
    readinessState: "READY_FOR_REVIEW",
    supportedItemCount: 5,
    unsupportedItemCount: 2,
    blockerCount: 0,
    evidenceObservedAt: observedAt,
    readinessSourceHash,
    evidenceHash,
    startedById: "maker-1",
    ...overrides,
  }
}

function signOffFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "sign-off-record-1",
    organizationId: "org-1",
    branchDailyCloseRunId: "run-1",
    status: "ACTIVE",
    activeKey: "run-1",
    signedReadinessSourceHash: readinessSourceHash,
    signedEvidenceHash: evidenceHash,
    signedEvidenceObservedAt: observedAt,
    signedById: "checker-1",
    signedAt: now,
    authAssuranceLevel: "L1",
    freshAuthAt,
    idempotencyKey: "sign-off-1",
    requestHash: `sha256:${"f".repeat(64)}`,
    correlationId: "correlation-1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function expectedRequestHash(input: SignBranchDailyCloseInput) {
  return `sha256:${hashBusinessPayload({
    version: 1,
    command: "SIGN_BRANCH_DAILY_CLOSE",
    organizationId: input.accessContext.orgId,
    actorId: input.actorId,
    locationId: input.locationId,
    businessDate: input.businessDate,
    branchDailyCloseRunId: "run-1",
    readinessSourceHash,
    evidenceHash,
    idempotencyKey: input.idempotencyKey,
  })}`
}

function prismaError(code: string) {
  return {
    name: "PrismaClientKnownRequestError",
    code,
    clientVersion: "6.0.0",
  }
}

function forbiddenCredentialKeys(value: unknown, path: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      forbiddenCredentialKeys(item, [...path, String(index)]),
    )
  }
  if (!value || typeof value !== "object") return []

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const nextPath = [...path, key]
      const matches = /token|password|secret|cookie|session/i.test(key)
        ? [nextPath.join(".")]
        : []
      return [...matches, ...forbiddenCredentialKeys(child, nextPath)]
    },
  )
}

