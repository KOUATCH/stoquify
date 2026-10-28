jest.mock("server-only", () => ({}))

jest.mock("../end-of-day-close-readiness.service", () => ({
  getEndOfDayCloseReadiness: jest.fn(),
}))

jest.mock("../branch-daily-close-sign-off-state.service", () => ({
  getBranchDailyCloseSignOffState: jest.fn(),
}))

import { readFileSync } from "fs"
import { join } from "path"

import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"

import type { BranchDailyCloseCompletionInput } from "../branch-daily-close-completion-contracts"
import { getBranchDailyCloseCompletion } from "../branch-daily-close-completion.service"
import type { BranchDailyCloseSignOffStateResult } from "../branch-daily-close-sign-off-state-contracts"
import { getBranchDailyCloseSignOffState } from "../branch-daily-close-sign-off-state.service"
import type { EndOfDayCloseReadinessResult } from "../end-of-day-close-readiness-contracts"
import { getEndOfDayCloseReadiness } from "../end-of-day-close-readiness.service"

const mockGetReadiness = getEndOfDayCloseReadiness as jest.Mock
const mockGetSignOffState = getBranchDailyCloseSignOffState as jest.Mock

const now = new Date("2026-07-18T21:00:00.000Z")
const observedAt = "2026-07-18T20:45:00.000Z"
const startedAt = "2026-07-18T20:50:00.000Z"
const signedAt = "2026-07-18T20:59:00.000Z"
const freshAuthAt = "2026-07-18T20:58:00.000Z"
const readinessSourceHash = `sha256:${"a".repeat(64)}`
const evidenceHash = `sha256:${"b".repeat(64)}`
const awaitingProjectionHash = `sha256:${"c".repeat(64)}`
const signedProjectionHash = `sha256:${"d".repeat(64)}`

describe("branch daily-close completion composition", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockGetReadiness.mockResolvedValue(readinessFixture())
    mockGetSignOffState.mockResolvedValue(signOffStateFixture())
  })

  it("composes both service APIs with one normalized clock and preserves their results", async () => {
    const readiness = readinessFixture()
    const signOffState = signOffStateFixture()
    const input = defaultInput()
    mockGetReadiness.mockResolvedValue(readiness)
    mockGetSignOffState.mockResolvedValue(signOffState)

    const result = await getBranchDailyCloseCompletion(input)

    expect(mockGetReadiness).toHaveBeenCalledWith({
      accessContext: input.accessContext,
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
      maxAgeMinutes: 1440,
    })
    expect(mockGetSignOffState).toHaveBeenCalledWith({
      accessContext: input.accessContext,
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
    })
    expect(result.preSignReadiness).toBe(readiness)
    expect(result.postReviewSignOffState).toBe(signOffState)
    expect(result).toMatchObject({
      kind: "BRANCH_DAILY_CLOSE_COMPLETION",
      contractVersion: "1.0",
      organizationId: "org-1",
      actorId: "viewer-1",
      generatedAt: now.toISOString(),
      businessDate: "2026-07-18",
      state: "AWAITING_SIGN_OFF",
      alignment: {
        state: "CURRENT",
        reasons: [],
        preSignSourceHash: readinessSourceHash,
        postReviewProjectionHash: awaitingProjectionHash,
      },
      completion: {
        state: "AWAITING_SIGN_OFF",
        signOffSupported: true,
        activeSignOffPresent: false,
        completionSatisfied: false,
        reviewId: "run-1",
        signedOffAt: null,
        signedOffBy: null,
        reasonCode: "AWAITING_SIGN_OFF",
      },
    })
    expect(result.compositionHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  })

  it("reports NOT_STARTED while preserving operational readiness", async () => {
    mockGetSignOffState.mockResolvedValue(notStartedState())

    const result = await getBranchDailyCloseCompletion(defaultInput())

    expect(result.state).toBe("NOT_STARTED")
    expect(result.alignment.state).toBe("NOT_APPLICABLE")
    expect(result.completion).toMatchObject({
      completionSatisfied: false,
      activeSignOffPresent: false,
      reviewId: null,
      reasonCode: "NO_REVIEW",
    })
    expect(result.preSignReadiness.sourceHash).toBe(readinessSourceHash)
  })

  it("reports BLOCKED only when current readiness matches the blocked review", async () => {
    mockGetReadiness.mockResolvedValue(
      readinessFixture({
        readiness: "ACTION_REQUIRED",
        blockers: [blockerFixture()],
      }),
    )
    mockGetSignOffState.mockResolvedValue(blockedState())

    const result = await getBranchDailyCloseCompletion(defaultInput())

    expect(result.state).toBe("BLOCKED")
    expect(result.alignment.state).toBe("CURRENT")
    expect(result.completion).toMatchObject({
      completionSatisfied: false,
      activeSignOffPresent: false,
      reasonCode: "REVIEW_BLOCKED",
    })
  })

  it("reports SIGNED only for current reviewed and signed evidence", async () => {
    mockGetSignOffState.mockResolvedValue(signedState())

    const result = await getBranchDailyCloseCompletion(defaultInput())

    expect(result).toMatchObject({
      state: "SIGNED",
      alignment: {
        state: "CURRENT",
        reasons: [],
        preSignSourceHash: readinessSourceHash,
        postReviewProjectionHash: signedProjectionHash,
      },
      completion: {
        state: "SIGNED",
        signOffSupported: true,
        activeSignOffPresent: true,
        completionSatisfied: true,
        reviewId: "run-1",
        signedOffAt: signedAt,
        signedOffBy: "checker-1",
        reasonCode: "SIGNED_EVIDENCE_CURRENT",
      },
      controls: {
        compositionPurpose: "VERSIONED_COMPLETION_READ_MODEL",
        preSignReadinessPreserved: true,
        preSignSourceHashIncludesSignOff: false,
        readinessPromoted: false,
        paymentReconciliationClaimed: false,
        finalCloseClaimed: false,
      },
    })
  })

  it.each([
    [
      "READINESS_SOURCE_HASH_CHANGED",
      () => signOffStateFixture({
        review: reviewFixture({
          readinessSourceHash: `sha256:${"e".repeat(64)}`,
        }),
      }),
    ],
    [
      "READINESS_STATE_CHANGED",
      () => signOffStateFixture({
        review: reviewFixture({ readinessState: "NO_ACTIVITY" }),
      }),
    ],
    [
      "SUPPORTED_ITEM_COUNT_CHANGED",
      () => signOffStateFixture({
        review: reviewFixture({ supportedItemCount: 4 }),
      }),
    ],
    [
      "UNSUPPORTED_ITEM_COUNT_CHANGED",
      () => signOffStateFixture({
        review: reviewFixture({ unsupportedItemCount: 3 }),
      }),
    ],
    [
      "BLOCKER_COUNT_CHANGED",
      () => signOffStateFixture({
        review: reviewFixture({ blockerCount: 1 }),
      }),
    ],
  ] as const)("reports legitimate %s drift without corrupting pre-sign truth", async (reason, stateFactory) => {
    mockGetSignOffState.mockResolvedValue(stateFactory())

    const result = await getBranchDailyCloseCompletion(defaultInput())

    expect(result.state).toBe("EVIDENCE_DRIFTED")
    expect(result.alignment).toMatchObject({
      state: "DRIFTED",
      reasons: [reason],
      preSignSourceHash: readinessSourceHash,
    })
    expect(result.completion).toMatchObject({
      completionSatisfied: false,
      reasonCode: "REVIEW_EVIDENCE_DRIFTED",
    })
    expect(result.preSignReadiness.sourceHash).toBe(readinessSourceHash)
  })

  it("keeps an active signature visible but unsatisfied when evidence has drifted", async () => {
    mockGetSignOffState.mockResolvedValue(
      signedState({
        review: reviewFixture({ blockerCount: 1 }),
        signOff: signOffFixture(),
      }),
    )

    const result = await getBranchDailyCloseCompletion(defaultInput())

    expect(result.state).toBe("EVIDENCE_DRIFTED")
    expect(result.completion).toMatchObject({
      activeSignOffPresent: true,
      completionSatisfied: false,
      signedOffAt: signedAt,
      signedOffBy: "checker-1",
    })
  })

  it("keeps the exact pre-sign source hash stable before and after signature", async () => {
    const readiness = readinessFixture()
    mockGetReadiness.mockResolvedValue(readiness)
    mockGetSignOffState
      .mockResolvedValueOnce(signOffStateFixture())
      .mockResolvedValueOnce(signedState())

    const before = await getBranchDailyCloseCompletion(defaultInput())
    const after = await getBranchDailyCloseCompletion(defaultInput())

    expect(before.preSignReadiness).toBe(readiness)
    expect(after.preSignReadiness).toBe(readiness)
    expect(before.alignment.preSignSourceHash).toBe(readinessSourceHash)
    expect(after.alignment.preSignSourceHash).toBe(readinessSourceHash)
    expect(before.preSignReadiness.sourceHash).toBe(
      after.preSignReadiness.sourceHash,
    )
    expect(before.state).toBe("AWAITING_SIGN_OFF")
    expect(after.state).toBe("SIGNED")
    expect(before.compositionHash).not.toBe(after.compositionHash)
  })

  it.each([
    ["organization", { organizationId: "org-other" }],
    ["actor", { actorId: "viewer-other" }],
    ["clock", { generatedAt: "2026-07-18T20:59:00.000Z" }],
    ["business date", { businessDate: "2026-07-17" }],
    ["location id", { location: { id: "location-other", name: "Main Branch", code: "MAIN" } }],
    ["location name", { location: { id: "location-1", name: "Other", code: "MAIN" } }],
    [
      "authority",
      {
        authority: {
          kind: "TENANT_WIDE",
          basis: "RBAC_SUPER_USER",
        },
      },
    ],
  ])("fails closed for cross-result %s mismatch", async (_name, override) => {
    mockGetSignOffState.mockResolvedValue(signOffStateFixture(override))

    await expect(
      getBranchDailyCloseCompletion(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    ["readiness hash", { sourceHash: "invalid" }],
    [
      "legacy completion",
      {
        completion: {
          state: "NOT_AVAILABLE",
          signOffSupported: true,
          signedOff: false,
          signedOffAt: null,
          signedOffBy: null,
          reasonCode: "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE",
        },
      },
    ],
    [
      "manager sign-off claim",
      {
        checklist: checklistFixture({ managerSignOffStatus: "READY" }),
      },
    ],
    [
      "payment reconciliation claim",
      {
        checklist: checklistFixture({ paymentReconciliationStatus: "READY" }),
      },
    ],
    [
      "coverage count",
      {
        evidenceCoverage: {
          state: "PARTIAL",
          supportedItemCount: 4,
          unsupportedItemCount: 2,
          complete: false,
        },
      },
    ],
  ])("fails closed for invalid pre-sign %s evidence", async (_name, override) => {
    mockGetReadiness.mockResolvedValue(readinessFixture(override))

    await expect(
      getBranchDailyCloseCompletion(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    ["projection hash", { projectionHash: "invalid" }],
    [
      "self-drift control",
      {
        controls: {
          projectionPurpose: "SIGN_OFF_STATE_ONLY",
          preSignReadinessSourceHashIncludesSignOff: true,
          readinessPromoted: false,
          finalCloseClaimed: false,
        },
      },
    ],
    ["signed shape", { state: "SIGNED", signOff: null }],
    [
      "history count",
      {
        history: {
          totalCount: 2,
          activeCount: 0,
          revokedCount: 0,
          supersededCount: 0,
          terminalCount: 0,
          latestTerminalAt: null,
        },
      },
    ],
  ])("fails closed for invalid post-review %s evidence", async (_name, override) => {
    mockGetSignOffState.mockResolvedValue(signOffStateFixture(override))

    await expect(
      getBranchDailyCloseCompletion(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    [{ locationId: "" }, BusinessRuleError],
    [{ businessDate: "2026-02-30" }, BusinessRuleError],
    [{ now: "invalid" }, BusinessRuleError],
    [{ maxAgeMinutes: 0 }, BusinessRuleError],
  ])("rejects malformed composition input before service calls", async (override, error) => {
    await expect(
      getBranchDailyCloseCompletion(defaultInput(override)),
    ).rejects.toBeInstanceOf(error)
    expect(mockGetReadiness).not.toHaveBeenCalled()
    expect(mockGetSignOffState).not.toHaveBeenCalled()
  })

  it("propagates service denial without returning a partial composition", async () => {
    mockGetReadiness.mockRejectedValue(
      new ForbiddenError("Readiness is not available for this account."),
    )

    await expect(
      getBranchDailyCloseCompletion(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("returns no credential, request, correlation, profile, or delivery data", async () => {
    mockGetSignOffState.mockResolvedValue(signedState())

    const result = await getBranchDailyCloseCompletion(defaultInput())

    expect(forbiddenKeys(result)).toEqual([])
  })

  it("has no direct database, command, action, route, UI, delivery, AI, or WhatsApp dependency", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "services/end-of-day-close/branch-daily-close-completion.service.ts",
      ),
      "utf8",
    )

    expect(source).not.toMatch(/@\/prisma\/db|Prisma/)
    expect(source).not.toMatch(/branch-daily-close-sign-off\.service/)
    expect(source).not.toMatch(/@\/actions|app\/|components\//)
    expect(source).not.toMatch(/notification|whatsapp|certificate/i)
    expect(source).not.toMatch(/\.(create|update|upsert|delete)\(/)
  })
})

function defaultInput(
  overrides: Partial<BranchDailyCloseCompletionInput> = {},
): BranchDailyCloseCompletionInput {
  return {
    accessContext: accessContext(),
    locationId: "location-1",
    businessDate: "2026-07-18",
    now,
    maxAgeMinutes: 1440,
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

function readinessFixture(
  overrides: Record<string, unknown> = {},
): EndOfDayCloseReadinessResult {
  return {
    kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
    organizationId: "org-1",
    actorId: "viewer-1",
    generatedAt: now.toISOString(),
    businessDate: "2026-07-18",
    periodStart: "2026-07-18T00:00:00.000Z",
    periodEnd: "2026-07-18T23:59:59.999Z",
    authority: { kind: "TENANT_WIDE", basis: "RBAC_ROLE" },
    scope: { kind: "LOCATION", locationId: "location-1" },
    location: { id: "location-1", name: "Main Branch", code: "MAIN" },
    readiness: "READY_FOR_REVIEW",
    evidenceCoverage: {
      state: "PARTIAL",
      supportedItemCount: 5,
      unsupportedItemCount: 2,
      complete: false,
    },
    completion: {
      state: "NOT_AVAILABLE",
      signOffSupported: false,
      signedOff: false,
      signedOffAt: null,
      signedOffBy: null,
      reasonCode: "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE",
    },
    facts: {
      branchSnapshotStatus: "FRESH",
      posSessionCount: 1,
      closedOrReconciledSessionCount: 1,
      activeSessionCount: 0,
      suspendedSessionCount: 0,
      inconsistentSessionCount: 0,
      cashDrawerCount: 1,
      openCashDrawerCount: 0,
      attributedPaymentCount: 2,
      attributedPaymentStatusCounts: {},
      attributedPaymentMethodCounts: {},
    },
    checklist: checklistFixture(),
    blockers: [],
    sourceHash: readinessSourceHash,
    ...overrides,
  } as EndOfDayCloseReadinessResult
}

function checklistFixture(
  input: {
    managerSignOffStatus?: "READY" | "UNSUPPORTED"
    paymentReconciliationStatus?: "READY" | "UNSUPPORTED"
  } = {},
) {
  const supported = [
    ["LOCATION_ACTIVE", "LOCATION"],
    ["BRANCH_OPERATING_SNAPSHOT", "BRANCH_OPERATING_SNAPSHOT"],
    ["POS_SESSION_CLOSURE", "POS_SESSION"],
    ["CASH_DRAWER_CLOSURE", "CASH_DRAWER"],
    ["PAYMENT_CAPTURE_ATTRIBUTION", "PAYMENT_CAPTURE"],
  ].map(([key, sourceType], index) => ({
    key,
    status: "READY",
    title: key,
    detail: key,
    evidence: {
      sourceType,
      sourceIds: [`source-${index}`],
      sourceHash: `sha256:${String(index).repeat(64)}`,
      observedAt,
      freshness: null,
      evidenceGrade: "operational",
    },
  }))
  const unsupported = (
    key: string,
    sourceType: string,
    status: "READY" | "UNSUPPORTED",
  ) => ({
    key,
    status,
    title: key,
    detail: key,
    evidence: {
      sourceType,
      sourceIds: status === "UNSUPPORTED" ? [] : ["unexpected-source"],
      sourceHash:
        status === "UNSUPPORTED" ? null : `sha256:${"f".repeat(64)}`,
      observedAt: status === "UNSUPPORTED" ? null : observedAt,
      freshness: null,
      evidenceGrade: "operational",
    },
  })

  return [
    ...supported,
    unsupported(
      "PAYMENT_RECONCILIATION",
      "PAYMENT_RECONCILIATION",
      input.paymentReconciliationStatus ?? "UNSUPPORTED",
    ),
    unsupported(
      "MANAGER_SIGN_OFF",
      "MANAGER_SIGN_OFF",
      input.managerSignOffStatus ?? "UNSUPPORTED",
    ),
  ] as EndOfDayCloseReadinessResult["checklist"]
}

function blockerFixture() {
  return {
    code: "OPEN_POS_SESSION",
    severity: "high" as const,
    gate: "end_of_day.pos_session_closure",
    title: "POS session remains open",
    detail: "One session remains open.",
    sourceTables: ["pos_sessions"],
    nextAction: "Close the session.",
  }
}

function signOffStateFixture(
  overrides: Record<string, unknown> = {},
): BranchDailyCloseSignOffStateResult {
  return {
    kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE",
    organizationId: "org-1",
    actorId: "viewer-1",
    generatedAt: now.toISOString(),
    businessDate: "2026-07-18",
    authority: { kind: "TENANT_WIDE", basis: "RBAC_ROLE" },
    scope: { kind: "LOCATION", locationId: "location-1" },
    location: { id: "location-1", name: "Main Branch", code: "MAIN" },
    state: "AWAITING_SIGN_OFF",
    review: reviewFixture(),
    signOff: null,
    history: emptyHistory(),
    controls: {
      projectionPurpose: "SIGN_OFF_STATE_ONLY",
      preSignReadinessSourceHashIncludesSignOff: false,
      readinessPromoted: false,
      finalCloseClaimed: false,
    },
    projectionHash: awaitingProjectionHash,
    ...overrides,
  } as BranchDailyCloseSignOffStateResult
}

function notStartedState() {
  return signOffStateFixture({
    state: "NOT_STARTED",
    review: null,
    signOff: null,
    history: emptyHistory(),
  })
}

function blockedState() {
  return signOffStateFixture({
    state: "BLOCKED",
    review: reviewFixture({
      status: "BLOCKED",
      readinessState: "ACTION_REQUIRED",
      blockerCount: 1,
    }),
    signOff: null,
    history: emptyHistory(),
  })
}

function signedState(overrides: Record<string, unknown> = {}) {
  return signOffStateFixture({
    state: "SIGNED",
    review: reviewFixture(),
    signOff: signOffFixture(),
    history: {
      ...emptyHistory(),
      totalCount: 1,
      activeCount: 1,
    },
    projectionHash: signedProjectionHash,
    ...overrides,
  })
}

function reviewFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
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
    ...overrides,
  }
}

function signOffFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "sign-off-1",
    status: "ACTIVE",
    signedReadinessSourceHash: readinessSourceHash,
    signedEvidenceHash: evidenceHash,
    signedEvidenceObservedAt: observedAt,
    signedById: "checker-1",
    signedAt,
    authAssuranceLevel: "L1",
    freshAuthAt,
    ...overrides,
  }
}

function emptyHistory() {
  return {
    totalCount: 0,
    activeCount: 0 as const,
    revokedCount: 0,
    supersededCount: 0,
    terminalCount: 0,
    latestTerminalAt: null,
  }
}

function forbiddenKeys(value: unknown, path: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      forbiddenKeys(item, [...path, String(index)]),
    )
  }
  if (!value || typeof value !== "object") return []

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const nextPath = [...path, key]
      const matches =
        /token|password|secret|cookie|requestHash|idempotencyKey|correlationId|email|phone|firstName|lastName/i.test(
          key,
        ) || /(^session$|sessionId$)/i.test(key)
          ? [nextPath.join(".")]
          : []
      return [...matches, ...forbiddenKeys(child, nextPath)]
    },
  )
}
