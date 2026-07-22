import { readFileSync } from "node:fs"
import { join } from "node:path"

jest.mock("@/lib/security/auth-session", () => {
  class FreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError,
    SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 },
  }
})

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseSignOffProtectOptions?: Record<string, unknown>
      __branchDailyCloseSignOffContextOverride?: Record<string, unknown>
    }
    store.__branchDailyCloseSignOffProtectOptions = options

    return async (input: unknown) => {
      const lastAuthAt = new Date("2026-07-18T20:59:00.000Z")
      const baseContext = {
        orgId: "org-session",
        userId: "checker-session",
        roles: [
          {
            id: "role-manager",
            name: "Manager",
            code: "manager",
            permissions: [
              "dashboard.read",
              "branch.daily-close.sign",
            ],
          },
        ],
        permissions: ["dashboard.read", "branch.daily-close.sign"],
        isSuperUser: false,
        freshAuth: {
          claims: {
            sessionId: "session-private",
            sessionToken: "token-private",
            userId: "checker-session",
            tenantId: "org-session",
            membershipId: "org-session:checker-session",
            roles: ["manager"],
            permissions: [
              "dashboard.read",
              "branch.daily-close.sign",
            ],
            branchIds: [],
            modulesEnabled: ["dashboard"],
            permsFetchedAt: lastAuthAt.getTime(),
            assuranceMethod: "password",
            assuranceOrganizationId: "org-session",
            assuranceLevel: 1,
            lastAuthAt: lastAuthAt.getTime(),
          },
          lastAuthAt,
        },
      }
      const context = {
        ...baseContext,
        ...(store.__branchDailyCloseSignOffContextOverride ?? {}),
      }
      const data = await handler(input, context)

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock(
  "@/services/end-of-day-close/branch-daily-close-sign-off.service",
  () => ({
    signBranchDailyClose: jest.fn(),
  }),
)

import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { ForbiddenError } from "@/services/_shared/action-errors"
import type { SignBranchDailyCloseResult } from "@/services/end-of-day-close/branch-daily-close-sign-off-contracts"
import { signBranchDailyClose } from "@/services/end-of-day-close/branch-daily-close-sign-off.service"

import { signBranchDailyCloseAction } from "../branch-daily-close-sign-off.actions"

const mockSignBranchDailyClose = signBranchDailyClose as jest.Mock

describe("branch daily-close sign-off action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseSignOffContextOverride?: Record<string, unknown>
    }
    delete store.__branchDailyCloseSignOffContextOverride
    mockSignBranchDailyClose.mockResolvedValue(signOffFixture())
  })

  it("passes sanitized protected identity and verified fresh-auth time only", async () => {
    await signBranchDailyCloseAction({
      organizationId: "org-attacker",
      orgId: "org-attacker",
      userId: "user-attacker",
      actorId: "user-attacker",
      locationId: "  location-1  ",
      businessDate: "  2026-07-18  ",
      idempotencyKey: "  sign-command-1  ",
      maxAgeMinutes: 60,
      now: "1900-01-01T00:00:00.000Z",
      correlationId: "caller-correlation",
      lastAuthAt: "1900-01-01T00:00:00.000Z",
      authAssuranceLevel: "L4",
      sessionToken: "caller-token",
    })

    expect(mockSignBranchDailyClose).toHaveBeenCalledWith({
      accessContext: {
        orgId: "org-session",
        userId: "checker-session",
        roles: [
          {
            id: "role-manager",
            name: "Manager",
            code: "manager",
            permissions: [
              "dashboard.read",
              "branch.daily-close.sign",
            ],
          },
        ],
        permissions: ["dashboard.read", "branch.daily-close.sign"],
        isSuperUser: false,
      },
      actorId: "checker-session",
      locationId: "location-1",
      businessDate: "2026-07-18",
      idempotencyKey: "sign-command-1",
      maxAgeMinutes: 60,
      lastAuthAt: new Date("2026-07-18T20:59:00.000Z"),
    })
    expect(mockSignBranchDailyClose).toHaveBeenCalledTimes(1)

    const serialized = JSON.stringify(mockSignBranchDailyClose.mock.calls[0][0])
    expect(serialized).not.toMatch(/session-private|token-private|caller-token/)
    expect(serialized).not.toMatch(/assuranceMethod|authAssuranceLevel/)
  })

  it("preserves a newly created sign-off result without rebuilding evidence", async () => {
    const signOff = signOffFixture()
    mockSignBranchDailyClose.mockResolvedValue(signOff)

    const result = await signBranchDailyCloseAction(validInput())

    expect(result).toEqual({
      success: true,
      data: signOff,
      error: null,
      status: 200,
    })
    expect(result.data).toBe(signOff)
    expect(result.data?.signOff).toBe(signOff.signOff)
  })

  it("preserves an exact idempotent replay result unchanged", async () => {
    const replay = signOffFixture({ created: false, replayed: true })
    mockSignBranchDailyClose.mockResolvedValue(replay)

    const result = await signBranchDailyCloseAction(validInput())

    expect(result.data).toBe(replay)
    expect(result.data).toMatchObject({ created: false, replayed: true })
  })

  it("registers critical permission, fresh auth, audit, and module enforcement", () => {
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseSignOffProtectOptions?: Record<string, unknown>
    }

    expect(store.__branchDailyCloseSignOffProtectOptions).toEqual({
      permission: "branch.daily-close.sign",
      auditResource: "BranchDailyCloseSignOff",
      auditAllowed: true,
      freshAuth: { maxAgeSeconds: 300 },
      module: {
        moduleSlug: "dashboard",
        surface:
          "actions/end-of-day-close/branch-daily-close-sign-off.actions.ts",
        surfaceType: "action",
        accessIntent: "write",
        mode: "enforce",
        audit: true,
      },
    })
  })

  it("uses server-owned clock and correlation with null default snapshot age", async () => {
    await signBranchDailyCloseAction({
      ...validInput(),
      now: "1900-01-01T00:00:00.000Z",
      correlationId: "caller-correlation",
    })

    const serviceInput = mockSignBranchDailyClose.mock.calls[0][0]
    expect(serviceInput.maxAgeMinutes).toBeNull()
    expect(serviceInput).not.toHaveProperty("now")
    expect(serviceInput).not.toHaveProperty("correlationId")
  })

  it("fails closed before the service when protected fresh auth is missing", async () => {
    setContextOverride({ freshAuth: undefined })

    await expect(signBranchDailyCloseAction(validInput())).rejects.toBeInstanceOf(
      FreshAuthRequiredError,
    )
    expect(mockSignBranchDailyClose).not.toHaveBeenCalled()
  })

  it.each([
    ["actor", freshAuthFixture({ userId: "checker-other" })],
    ["tenant", freshAuthFixture({ tenantId: "org-other" })],
    [
      "assurance tenant",
      freshAuthFixture({ assuranceOrganizationId: "org-other" }),
    ],
    ["assurance level", freshAuthFixture({ assuranceLevel: 0 })],
    [
      "auth timestamp",
      freshAuthFixture({ lastAuthAt: new Date("2026-07-18T20:58:00.000Z") }),
    ],
  ])("fails closed for cross-context %s mismatch", async (_name, freshAuth) => {
    setContextOverride({ freshAuth })

    await expect(signBranchDailyCloseAction(validInput())).rejects.toBeInstanceOf(
      FreshAuthRequiredError,
    )
    expect(mockSignBranchDailyClose).not.toHaveBeenCalled()
  })

  it.each([
    ["missing input", undefined],
    ["missing location", { ...validInput(), locationId: undefined }],
    ["blank location", { ...validInput(), locationId: "  " }],
    ["oversized location", { ...validInput(), locationId: "x".repeat(241) }],
    ["wrong date format", { ...validInput(), businessDate: "18-07-2026" }],
    ["impossible date", { ...validInput(), businessDate: "2026-02-30" }],
    ["missing idempotency key", { ...validInput(), idempotencyKey: undefined }],
    ["blank idempotency key", { ...validInput(), idempotencyKey: "  " }],
    [
      "oversized idempotency key",
      { ...validInput(), idempotencyKey: "x".repeat(201) },
    ],
    ["zero snapshot age", { ...validInput(), maxAgeMinutes: 0 }],
    ["fractional snapshot age", { ...validInput(), maxAgeMinutes: 1.5 }],
    [
      "oversized snapshot age",
      { ...validInput(), maxAgeMinutes: 60 * 24 * 31 + 1 },
    ],
  ])("rejects %s before the sign-off service is called", async (_name, input) => {
    await expect(signBranchDailyCloseAction(input)).rejects.toThrow()
    expect(mockSignBranchDailyClose).not.toHaveBeenCalled()
  })

  it("propagates service denial without returning partial signature evidence", async () => {
    const denial = new ForbiddenError(
      "Branch daily-close sign-off is not available for this account.",
    )
    mockSignBranchDailyClose.mockRejectedValue(denial)

    await expect(signBranchDailyCloseAction(validInput())).rejects.toBe(denial)
  })

  it("contains no database, revocation, route, UI, delivery, AI, or WhatsApp behavior", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "actions/end-of-day-close/branch-daily-close-sign-off.actions.ts",
      ),
      "utf8",
    )

    expect(source).not.toMatch(/@\/lib\/db|@\/prisma\/db|\bPrisma\b/)
    expect(source).not.toMatch(/\.create\(|\.update\(|\.delete\(|\.upsert\(/)
    expect(source).not.toMatch(/revoke|supersede/i)
    expect(source).not.toMatch(/@\/app|@\/components|notification|whatsapp|copilot|certificate/i)
    expect(source).toContain("signBranchDailyClose")
  })
})

function validInput() {
  return {
    locationId: "location-1",
    businessDate: "2026-07-18",
    idempotencyKey: "sign-command-1",
  }
}

function setContextOverride(override: Record<string, unknown>) {
  const store = globalThis as typeof globalThis & {
    __branchDailyCloseSignOffContextOverride?: Record<string, unknown>
  }
  store.__branchDailyCloseSignOffContextOverride = override
}

function freshAuthFixture(
  overrides: Record<string, unknown> = {},
) {
  const lastAuthAt = new Date("2026-07-18T20:59:00.000Z")
  const claimsLastAuthAt =
    overrides.lastAuthAt instanceof Date
      ? lastAuthAt.getTime()
      : lastAuthAt.getTime()

  return {
    claims: {
      sessionId: "session-private",
      sessionToken: "token-private",
      userId: "checker-session",
      tenantId: "org-session",
      membershipId: "org-session:checker-session",
      roles: ["manager"],
      permissions: ["dashboard.read", "branch.daily-close.sign"],
      branchIds: [],
      modulesEnabled: ["dashboard"],
      permsFetchedAt: lastAuthAt.getTime(),
      assuranceMethod: "password",
      assuranceOrganizationId: "org-session",
      assuranceLevel: 1,
      lastAuthAt: claimsLastAuthAt,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([key]) => key !== "lastAuthAt"),
      ),
    },
    lastAuthAt:
      overrides.lastAuthAt instanceof Date
        ? overrides.lastAuthAt
        : lastAuthAt,
  }
}

function signOffFixture(
  overrides: Partial<Pick<SignBranchDailyCloseResult, "created" | "replayed">> = {},
): SignBranchDailyCloseResult {
  const signOff = Object.freeze({
    id: "sign-off-1",
    organizationId: "org-session",
    branchDailyCloseRunId: "run-1",
    status: "ACTIVE" as const,
    signedReadinessSourceHash: `sha256:${"a".repeat(64)}`,
    signedEvidenceHash: `sha256:${"b".repeat(64)}`,
    signedEvidenceObservedAt: "2026-07-18T20:58:00.000Z",
    signedById: "checker-session",
    signedAt: "2026-07-18T21:00:00.000Z",
    authAssuranceLevel: "L1" as const,
    freshAuthAt: "2026-07-18T20:59:00.000Z",
    idempotencyKey: "sign-command-1",
    correlationId: "server-correlation",
    createdAt: "2026-07-18T21:00:00.000Z",
    updatedAt: "2026-07-18T21:00:00.000Z",
  })

  return Object.freeze({
    kind: "BRANCH_DAILY_CLOSE_SIGN_OFF",
    created: true,
    replayed: false,
    signOff,
    ...overrides,
  })
}
