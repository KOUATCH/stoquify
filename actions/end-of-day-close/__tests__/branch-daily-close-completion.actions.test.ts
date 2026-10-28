import { readFileSync } from "node:fs"
import { join } from "node:path"

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseCompletionProtectOptions?: Record<string, unknown>
    }
    store.__branchDailyCloseCompletionProtectOptions = options

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "viewer-session",
        roles: [
          {
            id: "role-manager",
            name: "Manager",
            code: "manager",
            permissions: ["dashboard.read"],
          },
        ],
        permissions: ["dashboard.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock(
  "@/services/end-of-day-close/branch-daily-close-completion.service",
  () => ({
    getBranchDailyCloseCompletion: jest.fn(),
  }),
)

import { ForbiddenError } from "@/services/_shared/action-errors"
import type { BranchDailyCloseCompletionResult } from "@/services/end-of-day-close/branch-daily-close-completion-contracts"
import { getBranchDailyCloseCompletion } from "@/services/end-of-day-close/branch-daily-close-completion.service"

import { getBranchDailyCloseCompletionAction } from "../branch-daily-close-completion.actions"

const mockGetCompletion = getBranchDailyCloseCompletion as jest.Mock

describe("branch daily-close completion action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCompletion.mockResolvedValue(completionFixture())
  })

  it("passes only normalized input and the trusted protected context to the service", async () => {
    await getBranchDailyCloseCompletionAction({
      organizationId: "org-attacker",
      orgId: "org-attacker",
      userId: "viewer-attacker",
      actorId: "viewer-attacker",
      locationId: "  location-1  ",
      businessDate: "  2026-07-18  ",
      maxAgeMinutes: 60,
      now: "1900-01-01T00:00:00.000Z",
    })

    expect(mockGetCompletion).toHaveBeenCalledWith({
      accessContext: {
        orgId: "org-session",
        userId: "viewer-session",
        roles: [
          {
            id: "role-manager",
            name: "Manager",
            code: "manager",
            permissions: ["dashboard.read"],
          },
        ],
        permissions: ["dashboard.read"],
        isSuperUser: false,
      },
      locationId: "location-1",
      businessDate: "2026-07-18",
      maxAgeMinutes: 60,
    })
    expect(mockGetCompletion).toHaveBeenCalledTimes(1)
  })

  it("preserves the complete versioned service result without flattening it", async () => {
    const completion = completionFixture()
    mockGetCompletion.mockResolvedValue(completion)

    const result = await getBranchDailyCloseCompletionAction(validInput())

    expect(result).toEqual({
      success: true,
      data: completion,
      error: null,
      status: 200,
    })
    expect(result.data).toBe(completion)
    expect(result.data?.preSignReadiness).toBe(
      completion.preSignReadiness,
    )
    expect(result.data?.postReviewSignOffState).toBe(
      completion.postReviewSignOffState,
    )
  })

  it("registers the read surface behind RBAC, audit, and dashboard entitlement metadata", () => {
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseCompletionProtectOptions?: Record<string, unknown>
    }

    expect(store.__branchDailyCloseCompletionProtectOptions).toEqual({
      permission: "dashboard.read",
      auditResource: "BranchDailyCloseCompletion",
      auditAllowed: true,
      module: {
        moduleSlug: "dashboard",
        surface:
          "actions/end-of-day-close/branch-daily-close-completion.actions.ts",
        accessIntent: "read",
        mode: "observe",
      },
    })
  })

  it("uses a null default snapshot age without accepting a caller clock", async () => {
    await getBranchDailyCloseCompletionAction({
      locationId: "location-1",
      businessDate: "2026-07-18",
      now: "1900-01-01T00:00:00.000Z",
    })

    expect(mockGetCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        maxAgeMinutes: null,
      }),
    )
    expect(mockGetCompletion.mock.calls[0][0]).not.toHaveProperty("now")
  })

  it.each([
    ["missing input", undefined],
    ["missing location", { businessDate: "2026-07-18" }],
    ["blank location", { ...validInput(), locationId: "  " }],
    ["oversized location", { ...validInput(), locationId: "x".repeat(241) }],
    ["wrong date format", { ...validInput(), businessDate: "18-07-2026" }],
    ["impossible date", { ...validInput(), businessDate: "2026-02-30" }],
    ["zero snapshot age", { ...validInput(), maxAgeMinutes: 0 }],
    ["fractional snapshot age", { ...validInput(), maxAgeMinutes: 1.5 }],
    [
      "oversized snapshot age",
      { ...validInput(), maxAgeMinutes: 60 * 24 * 31 + 1 },
    ],
  ])("rejects %s before the completion service is called", async (_name, input) => {
    await expect(
      getBranchDailyCloseCompletionAction(input),
    ).rejects.toThrow()
    expect(mockGetCompletion).not.toHaveBeenCalled()
  })

  it("propagates service denial without returning partial completion evidence", async () => {
    const denial = new ForbiddenError(
      "Branch daily-close completion evidence is inconsistent.",
    )
    mockGetCompletion.mockRejectedValue(denial)

    await expect(
      getBranchDailyCloseCompletionAction(validInput()),
    ).rejects.toBe(denial)
  })

  it("contains no database, write command, route, UI, delivery, AI, or WhatsApp behavior", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "actions/end-of-day-close/branch-daily-close-completion.actions.ts",
      ),
      "utf8",
    )

    expect(source).not.toMatch(/@\/lib\/db|@\/prisma\/db|\bPrisma\b/)
    expect(source).not.toMatch(/\.create\(|\.update\(|\.delete\(|\.upsert\(/)
    expect(source).not.toMatch(/startBranchDailyCloseReview|signOffBranchDailyClose/)
    expect(source).not.toMatch(/@\/app|@\/components|notification|whatsapp|copilot|certificate/i)
    expect(source).toContain("getBranchDailyCloseCompletion")
  })
})

function validInput() {
  return {
    locationId: "location-1",
    businessDate: "2026-07-18",
  }
}

function completionFixture() {
  const preSignReadiness = Object.freeze({
    kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
    sourceHash: `sha256:${"a".repeat(64)}`,
  })
  const postReviewSignOffState = Object.freeze({
    kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE",
    projectionHash: `sha256:${"b".repeat(64)}`,
  })

  return Object.freeze({
    kind: "BRANCH_DAILY_CLOSE_COMPLETION",
    contractVersion: "1.0",
    state: "AWAITING_SIGN_OFF",
    preSignReadiness,
    postReviewSignOffState,
    compositionHash: `sha256:${"c".repeat(64)}`,
  }) as unknown as BranchDailyCloseCompletionResult
}
