jest.mock("server-only", () => ({}))

const tx = {
  branchDailyCloseRun: {
    findUnique: jest.fn(),
  },
  branchDailyCloseSignOff: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
}

jest.mock("@/prisma/db", () => ({
  db: {
    location: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}))

import { readFileSync } from "fs"
import { join } from "path"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import type { BranchDailyCloseSignOffStateInput } from "../branch-daily-close-sign-off-state-contracts"
import { getBranchDailyCloseSignOffState } from "../branch-daily-close-sign-off-state.service"

const mockResolveAccess = resolveOperatingAccessScope as jest.Mock
const mockDb = db as unknown as {
  location: { findFirst: jest.Mock }
  $transaction: jest.Mock
}

const now = new Date("2026-07-18T21:00:00.000Z")
const observedAt = new Date("2026-07-18T20:45:00.000Z")
const startedAt = new Date("2026-07-18T20:50:00.000Z")
const signedAt = new Date("2026-07-18T20:59:00.000Z")
const freshAuthAt = new Date("2026-07-18T20:58:00.000Z")
const readinessSourceHash = `sha256:${"a".repeat(64)}`
const evidenceHash = `sha256:${"b".repeat(64)}`

describe("branch daily-close sign-off state service", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockResolveAccess.mockResolvedValue(tenantAccess())
    mockDb.location.findFirst.mockResolvedValue(locationFixture())
    mockDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    )
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(runFixture())
    tx.branchDailyCloseSignOff.findMany.mockResolvedValue([])
    tx.branchDailyCloseSignOff.groupBy.mockResolvedValue([])
  })

  it("reports NOT_STARTED without reading orphan sign-off rows", async () => {
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(null)

    const result = await getBranchDailyCloseSignOffState(defaultInput())

    expect(result).toMatchObject({
      kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE",
      organizationId: "org-1",
      actorId: "viewer-1",
      businessDate: "2026-07-18",
      state: "NOT_STARTED",
      review: null,
      signOff: null,
      history: {
        totalCount: 0,
        activeCount: 0,
        revokedCount: 0,
        supersededCount: 0,
        terminalCount: 0,
        latestTerminalAt: null,
      },
    })
    expect(tx.branchDailyCloseSignOff.findMany).not.toHaveBeenCalled()
    expect(tx.branchDailyCloseSignOff.groupBy).not.toHaveBeenCalled()
  })

  it("reports AWAITING_SIGN_OFF from one valid in-review baseline", async () => {
    const result = await getBranchDailyCloseSignOffState(defaultInput())

    expect(result).toMatchObject({
      state: "AWAITING_SIGN_OFF",
      review: {
        id: "run-1",
        status: "IN_REVIEW",
        readinessState: "READY_FOR_REVIEW",
        evidenceCoverageState: "PARTIAL",
        supportedItemCount: 5,
        unsupportedItemCount: 2,
        blockerCount: 0,
        evidenceObservedAt: observedAt.toISOString(),
        readinessSourceHash,
        evidenceHash,
        startedById: "maker-1",
        startedAt: startedAt.toISOString(),
      },
      signOff: null,
    })
    expect(result.projectionHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result.projectionHash).not.toBe(readinessSourceHash)
    expect(result.controls).toEqual({
      projectionPurpose: "SIGN_OFF_STATE_ONLY",
      preSignReadinessSourceHashIncludesSignOff: false,
      readinessPromoted: false,
      finalCloseClaimed: false,
    })
    expect(mockDb.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "RepeatableRead",
    })
  })

  it("reports BLOCKED without making a blocked run signable", async () => {
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(
      runFixture({
        status: "BLOCKED",
        readinessState: "ACTION_REQUIRED",
        blockerCount: 1,
      }),
    )

    const result = await getBranchDailyCloseSignOffState(defaultInput())

    expect(result.state).toBe("BLOCKED")
    expect(result.review?.status).toBe("BLOCKED")
    expect(result.signOff).toBeNull()
  })

  it("reports SIGNED only for one exact active maker-checker signature", async () => {
    tx.branchDailyCloseSignOff.findMany.mockResolvedValue([signOffFixture()])
    tx.branchDailyCloseSignOff.groupBy.mockResolvedValue([
      lifecycleRow("ACTIVE", 1, null),
    ])

    const result = await getBranchDailyCloseSignOffState(defaultInput())

    expect(result).toMatchObject({
      state: "SIGNED",
      signOff: {
        id: "sign-off-1",
        status: "ACTIVE",
        signedReadinessSourceHash: readinessSourceHash,
        signedEvidenceHash: evidenceHash,
        signedEvidenceObservedAt: observedAt.toISOString(),
        signedById: "checker-1",
        signedAt: signedAt.toISOString(),
        authAssuranceLevel: "L1",
        freshAuthAt: freshAuthAt.toISOString(),
      },
      history: {
        totalCount: 1,
        activeCount: 1,
        terminalCount: 0,
      },
    })
    const activeSelect = tx.branchDailyCloseSignOff.findMany.mock.calls[0][0]
      .select
    expect(activeSelect).not.toHaveProperty("idempotencyKey")
    expect(activeSelect).not.toHaveProperty("requestHash")
    expect(activeSelect).not.toHaveProperty("correlationId")
    expect(forbiddenCredentialKeys(result)).toEqual([])
  })

  it("summarizes terminal-only history without reporting an active signature", async () => {
    tx.branchDailyCloseSignOff.groupBy.mockResolvedValue([
      lifecycleRow("REVOKED", 2, new Date("2026-07-18T20:57:00.000Z")),
      lifecycleRow(
        "SUPERSEDED",
        1,
        new Date("2026-07-18T20:58:00.000Z"),
      ),
    ])

    const result = await getBranchDailyCloseSignOffState(defaultInput())

    expect(result.state).toBe("AWAITING_SIGN_OFF")
    expect(result.signOff).toBeNull()
    expect(result.history).toEqual({
      totalCount: 3,
      activeCount: 0,
      revokedCount: 2,
      supersededCount: 1,
      terminalCount: 3,
      latestTerminalAt: "2026-07-18T20:58:00.000Z",
    })
  })

  it("establishes access and location authority before reading close records", async () => {
    await getBranchDailyCloseSignOffState(defaultInput())

    expect(mockResolveAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.location.findFirst.mock.invocationCallOrder[0],
    )
    expect(mockDb.location.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.$transaction.mock.invocationCallOrder[0],
    )
    expect(mockDb.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "location-1",
        organizationId: "org-1",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, organizationId: true, name: true, code: true },
    })
  })

  it("fails before close reads when operating access is denied", async () => {
    mockResolveAccess.mockResolvedValue({
      allowed: false,
      organizationId: "org-1",
      actorId: "viewer-1",
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
      reason: "MISSING_DAILY_TRUTH_PERMISSION",
      scope: null,
    })

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockDb.location.findFirst).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("fails before tenant record reads for an unmanaged location", async () => {
    mockResolveAccess.mockResolvedValue(managedAccess("location-managed"))

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockDb.location.findFirst).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("fails closed when the active tenant location is unavailable", async () => {
    mockDb.location.findFirst.mockResolvedValue(null)

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it.each([
    ["cross-tenant run", { organizationId: "org-other" }],
    [
      "cross-tenant maker",
      { startedBy: { id: "maker-1", organizationId: "org-other" } },
    ],
    ["cross-location run", { locationId: "location-other" }],
    ["malformed evidence hash", { evidenceHash: "not-a-hash" }],
    ["review status mismatch", { readinessState: "ACTION_REQUIRED" }],
    ["coverage mismatch", { unsupportedItemCount: 0 }],
  ])("fails closed for %s evidence", async (_name, overrides) => {
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(runFixture(overrides))

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(tx.branchDailyCloseSignOff.findMany).not.toHaveBeenCalled()
  })

  it.each([
    ["cross-tenant row", { organizationId: "org-other" }],
    ["cross-run row", { branchDailyCloseRunId: "run-other" }],
    ["readiness hash mismatch", { signedReadinessSourceHash: `sha256:${"c".repeat(64)}` }],
    ["evidence hash mismatch", { signedEvidenceHash: `sha256:${"d".repeat(64)}` }],
    ["cross-tenant signer", { signedBy: { id: "checker-1", organizationId: "org-other" } }],
    ["self approval", { signedById: "maker-1", signedBy: { id: "maker-1", organizationId: "org-1" } }],
    ["wrong assurance", { authAssuranceLevel: "L0" }],
    ["stale authentication", { freshAuthAt: new Date("2026-07-18T20:50:00.000Z") }],
    ["future signature", { signedAt: new Date("2026-07-18T21:01:00.000Z") }],
    ["empty signer", { signedById: "", signedBy: { id: "", organizationId: "org-1" } }],
    ["future update", { updatedAt: new Date("2026-07-18T21:01:00.000Z") }],
    ["active invalidation evidence", { invalidatedAt: signedAt }],
  ])("fails closed for an active sign-off with %s", async (_name, overrides) => {
    tx.branchDailyCloseSignOff.findMany.mockResolvedValue([
      signOffFixture(overrides),
    ])
    tx.branchDailyCloseSignOff.groupBy.mockResolvedValue([
      lifecycleRow("ACTIVE", 1, null),
    ])

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("fails closed for duplicate active evidence", async () => {
    tx.branchDailyCloseSignOff.findMany.mockResolvedValue([
      signOffFixture(),
      signOffFixture({ id: "sign-off-2" }),
    ])
    tx.branchDailyCloseSignOff.groupBy.mockResolvedValue([
      lifecycleRow("ACTIVE", 2, null),
    ])

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("fails closed if a blocked review has active sign-off evidence", async () => {
    tx.branchDailyCloseRun.findUnique.mockResolvedValue(
      runFixture({ status: "BLOCKED", readinessState: "ACTION_REQUIRED" }),
    )
    tx.branchDailyCloseSignOff.findMany.mockResolvedValue([signOffFixture()])
    tx.branchDailyCloseSignOff.groupBy.mockResolvedValue([
      lifecycleRow("ACTIVE", 1, null),
    ])

    await expect(
      getBranchDailyCloseSignOffState(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    [{ locationId: "" }, BusinessRuleError],
    [{ businessDate: "2026-02-30" }, BusinessRuleError],
    [{ now: "invalid" }, BusinessRuleError],
  ])("rejects malformed bounded input before access", async (override, error) => {
    await expect(
      getBranchDailyCloseSignOffState(defaultInput(override)),
    ).rejects.toBeInstanceOf(error)
    expect(mockResolveAccess).not.toHaveBeenCalled()
  })

  it("has no readiness, drift, action, route, delivery, AI, or WhatsApp dependency", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "services/end-of-day-close/branch-daily-close-sign-off-state.service.ts",
      ),
      "utf8",
    )

    expect(source).not.toMatch(/end-of-day-close-readiness/)
    expect(source).not.toMatch(/branch-daily-close-review-drift/)
    expect(source).not.toMatch(/@\/actions|app\/|components\//)
    expect(source).not.toMatch(/notification|whatsapp|certificate/i)
    expect(source).not.toMatch(/branchDailyCloseRun\.(update|upsert|create)/)
    expect(source).not.toMatch(/branchDailyCloseSignOff\.(update|upsert|create)/)
  })
})

function defaultInput(
  overrides: Partial<BranchDailyCloseSignOffStateInput> = {},
): BranchDailyCloseSignOffStateInput {
  return {
    accessContext: accessContext(),
    locationId: "location-1",
    businessDate: "2026-07-18",
    now,
    ...overrides,
  }
}

function accessContext(): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "viewer-1",
    roles: [
      {
        id: "role-admin",
        name: "Administrator",
        code: "admin",
        permissions: ["dashboard.read"],
      },
    ],
    permissions: ["dashboard.read"],
    isSuperUser: false,
  }
}

function tenantAccess() {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "viewer-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "admin",
    },
    scope: { kind: "TENANT", locationIds: null },
  }
}

function managedAccess(locationId: string) {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "viewer-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations: [
        { id: locationId, name: "Managed", code: "MANAGED" },
      ],
    },
    scope: { kind: "LOCATIONS", locationIds: [locationId] },
  }
}

function locationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "location-1",
    organizationId: "org-1",
    name: "Main Branch",
    code: "MAIN",
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
    evidenceCoverageState: "PARTIAL",
    supportedItemCount: 5,
    unsupportedItemCount: 2,
    blockerCount: 0,
    evidenceObservedAt: observedAt,
    readinessSourceHash,
    evidenceHash,
    startedById: "maker-1",
    startedAt,
    startedBy: { id: "maker-1", organizationId: "org-1" },
    ...overrides,
  }
}

function signOffFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "sign-off-1",
    organizationId: "org-1",
    branchDailyCloseRunId: "run-1",
    status: "ACTIVE",
    activeKey: "run-1",
    signedReadinessSourceHash: readinessSourceHash,
    signedEvidenceHash: evidenceHash,
    signedEvidenceObservedAt: observedAt,
    signedById: "checker-1",
    signedAt,
    authAssuranceLevel: "L1",
    freshAuthAt,
    invalidatedById: null,
    invalidatedAt: null,
    invalidationReason: null,
    supersedesSignOffId: null,
    createdAt: signedAt,
    updatedAt: signedAt,
    signedBy: { id: "checker-1", organizationId: "org-1" },
    ...overrides,
  }
}

function lifecycleRow(
  status: "ACTIVE" | "REVOKED" | "SUPERSEDED",
  count: number,
  invalidatedAt: Date | null,
) {
  return {
    status,
    _count: { _all: count },
    _max: { invalidatedAt },
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
      const matches = /token|password|secret|cookie|session|requestHash/i.test(
        key,
      )
        ? [nextPath.join(".")]
        : []
      return [...matches, ...forbiddenCredentialKeys(child, nextPath)]
    },
  )
}
