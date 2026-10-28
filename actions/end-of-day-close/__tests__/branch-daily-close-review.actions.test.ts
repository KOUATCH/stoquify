import { readFileSync } from "node:fs"
import { join } from "node:path"

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseReviewProtectOptions?: Record<string, unknown>
    }
    store.__branchDailyCloseReviewProtectOptions = options

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "manager-session",
        roles: [
          {
            id: "role-manager",
            name: "Manager",
            code: "manager",
            permissions: [
              "dashboard.read",
              "branch.daily-close.review",
            ],
          },
        ],
        permissions: ["dashboard.read", "branch.daily-close.review"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock(
  "@/services/end-of-day-close/end-of-day-close-review.service",
  () => ({
    startBranchDailyCloseReview: jest.fn(),
  }),
)

import { ForbiddenError } from "@/services/_shared/action-errors"
import type { StartBranchDailyCloseReviewResult } from "@/services/end-of-day-close/end-of-day-close-review-contracts"
import { startBranchDailyCloseReview } from "@/services/end-of-day-close/end-of-day-close-review.service"

import { startBranchDailyCloseReviewAction } from "../branch-daily-close-review.actions"

const mockStartReview = startBranchDailyCloseReview as jest.Mock

describe("branch daily-close review action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStartReview.mockResolvedValue(reviewFixture())
  })

  it("passes only normalized command input and trusted protected identity", async () => {
    await startBranchDailyCloseReviewAction({
      organizationId: "org-attacker",
      orgId: "org-attacker",
      userId: "user-attacker",
      actorId: "user-attacker",
      locationId: "  location-1  ",
      businessDate: "  2026-07-18  ",
      idempotencyKey: "  review-command-1  ",
      maxAgeMinutes: 60,
      now: "1900-01-01T00:00:00.000Z",
      correlationId: "caller-correlation",
    })

    expect(mockStartReview).toHaveBeenCalledWith({
      accessContext: {
        orgId: "org-session",
        userId: "manager-session",
        roles: [
          {
            id: "role-manager",
            name: "Manager",
            code: "manager",
            permissions: [
              "dashboard.read",
              "branch.daily-close.review",
            ],
          },
        ],
        permissions: ["dashboard.read", "branch.daily-close.review"],
        isSuperUser: false,
      },
      actorId: "manager-session",
      locationId: "location-1",
      businessDate: "2026-07-18",
      idempotencyKey: "review-command-1",
      maxAgeMinutes: 60,
    })
    expect(mockStartReview).toHaveBeenCalledTimes(1)
  })

  it("preserves a newly created service result without rebuilding evidence", async () => {
    const review = reviewFixture()
    mockStartReview.mockResolvedValue(review)

    const result = await startBranchDailyCloseReviewAction(validInput())

    expect(result).toEqual({
      success: true,
      data: review,
      error: null,
      status: 200,
    })
    expect(result.data).toBe(review)
    expect(result.data?.run).toBe(review.run)
  })

  it("preserves an idempotent replay result unchanged", async () => {
    const replay = reviewFixture({ created: false, replayed: true })
    mockStartReview.mockResolvedValue(replay)

    const result = await startBranchDailyCloseReviewAction(validInput())

    expect(result.data).toBe(replay)
    expect(result.data).toMatchObject({
      created: false,
      replayed: true,
    })
  })

  it("registers least-privilege write, audit, and enforced module metadata", () => {
    const store = globalThis as typeof globalThis & {
      __branchDailyCloseReviewProtectOptions?: Record<string, unknown>
    }

    expect(store.__branchDailyCloseReviewProtectOptions).toEqual({
      permission: "branch.daily-close.review",
      auditResource: "BranchDailyCloseRun",
      auditAllowed: true,
      module: {
        moduleSlug: "dashboard",
        surface:
          "actions/end-of-day-close/branch-daily-close-review.actions.ts",
        surfaceType: "action",
        accessIntent: "write",
        mode: "enforce",
        audit: true,
      },
    })
  })

  it("uses server-owned clock and correlation with null default snapshot age", async () => {
    await startBranchDailyCloseReviewAction({
      ...validInput(),
      now: "1900-01-01T00:00:00.000Z",
      correlationId: "caller-correlation",
    })

    const serviceInput = mockStartReview.mock.calls[0][0]
    expect(serviceInput.maxAgeMinutes).toBeNull()
    expect(serviceInput).not.toHaveProperty("now")
    expect(serviceInput).not.toHaveProperty("correlationId")
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
  ])("rejects %s before the review service is called", async (_name, input) => {
    await expect(startBranchDailyCloseReviewAction(input)).rejects.toThrow()
    expect(mockStartReview).not.toHaveBeenCalled()
  })

  it("propagates service denial without returning partial review evidence", async () => {
    const denial = new ForbiddenError(
      "Branch daily-close review is not available for this account.",
    )
    mockStartReview.mockRejectedValue(denial)

    await expect(
      startBranchDailyCloseReviewAction(validInput()),
    ).rejects.toBe(denial)
  })

  it("contains no database, sign-off, route, UI, delivery, AI, or WhatsApp behavior", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "actions/end-of-day-close/branch-daily-close-review.actions.ts",
      ),
      "utf8",
    )

    expect(source).not.toMatch(/@\/lib\/db|@\/prisma\/db|\bPrisma\b/)
    expect(source).not.toMatch(/\.create\(|\.update\(|\.delete\(|\.upsert\(/)
    expect(source).not.toMatch(/signBranchDailyClose|revoke|supersede/i)
    expect(source).not.toMatch(/@\/app|@\/components|notification|whatsapp|copilot|certificate/i)
    expect(source).toContain("startBranchDailyCloseReview")
  })
})

function validInput() {
  return {
    locationId: "location-1",
    businessDate: "2026-07-18",
    idempotencyKey: "review-command-1",
  }
}

function reviewFixture(
  overrides: Partial<Pick<StartBranchDailyCloseReviewResult, "created" | "replayed">> = {},
): StartBranchDailyCloseReviewResult {
  const run = Object.freeze({
    id: "run-1",
    organizationId: "org-session",
    locationId: "location-1",
    businessDate: "2026-07-18",
    periodStart: "2026-07-18T00:00:00.000Z",
    periodEnd: "2026-07-18T23:59:59.999Z",
    status: "IN_REVIEW" as const,
    readinessState: "READY_FOR_REVIEW" as const,
    evidenceCoverageState: "PARTIAL" as const,
    supportedItemCount: 5,
    unsupportedItemCount: 2,
    blockerCount: 0,
    evidenceObservedAt: "2026-07-18T20:59:00.000Z",
    readinessSourceHash: `sha256:${"a".repeat(64)}`,
    evidenceHash: `sha256:${"b".repeat(64)}`,
    startedById: "manager-session",
    startedAt: "2026-07-18T21:00:00.000Z",
    idempotencyKey: "review-command-1",
    correlationId: "server-correlation",
    createdAt: "2026-07-18T21:00:00.000Z",
    updatedAt: "2026-07-18T21:00:00.000Z",
  })

  return Object.freeze({
    kind: "BRANCH_DAILY_CLOSE_REVIEW",
    created: true,
    replayed: false,
    run,
    ...overrides,
  })
}
