import { render, screen } from "@testing-library/react"

import { getBranchDailyCloseCompletionAction } from "@/actions/end-of-day-close/branch-daily-close-completion.actions"
import { BranchDailyCloseWorkspace } from "@/components/manager-action-center/BranchDailyCloseWorkspace"
import { canUsePermission, RbacError, requirePermission } from "@/lib/security/rbac"

import BranchDailyClosePage from "../page"

jest.mock("@/actions/end-of-day-close/branch-daily-close-completion.actions", () => ({
  getBranchDailyCloseCompletionAction: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_LOCKED" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    requirePermission: jest.fn(),
    canUsePermission: jest.fn(),
  }
})

jest.mock("@/i18n/routing", () => ({
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

jest.mock("@/components/manager-action-center/BranchDailyCloseWorkspace", () => ({
  BranchDailyCloseWorkspace: jest.fn(({ model }) => <div data-testid="workspace-model">{model.kind}</div>),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockCanUsePermission = canUsePermission as jest.Mock
const mockGetCompletion = getBranchDailyCloseCompletionAction as jest.Mock
const mockWorkspace = BranchDailyCloseWorkspace as jest.Mock

const context = {
  orgId: "org-1",
  userId: "manager-1",
  permissions: ["dashboard.read"],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue(context)
  mockCanUsePermission.mockReturnValue(false)
})

describe("BranchDailyClosePage", () => {
  it("fails closed before parsing branch input when dashboard access is denied", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await renderPage({ locale: "en", locationId: "location-1", businessDate: "2026-07-18" }))

    expect(screen.getByTestId("workspace-model")).toHaveTextContent("ACCESS_DENIED")
    expect(mockGetCompletion).not.toHaveBeenCalled()
    expect(mockWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "en",
        model: { kind: "ACCESS_DENIED" },
        workspaceHref: "/en/dashboard/manager-action-center/daily-close",
        backHref: "/en/dashboard/manager-action-center",
      }),
      undefined,
    )
  })

  it("requires an authorized location entry before loading completion evidence", async () => {
    render(await renderPage({ locale: "en" }))

    expect(screen.getByTestId("workspace-model")).toHaveTextContent("SELECT_LOCATION")
    expect(mockGetCompletion).not.toHaveBeenCalled()
  })

  it("requires an explicit business date and does not infer one", async () => {
    render(await renderPage({ locale: "fr", locationId: "location-1" }))

    expect(screen.getByTestId("workspace-model")).toHaveTextContent("SELECT_DATE")
    expect(mockGetCompletion).not.toHaveBeenCalled()
    expect(mockWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "fr",
        model: { kind: "SELECT_DATE", locationId: "location-1" },
      }),
      undefined,
    )
  })

  it.each(["2026-02-30", "18-07-2026", "2026-7-18"])("rejects invalid calendar date %s without calling the action", async (businessDate) => {
    render(await renderPage({ locale: "en", locationId: "location-1", businessDate }))

    expect(screen.getByTestId("workspace-model")).toHaveTextContent("INVALID_DATE")
    expect(mockGetCompletion).not.toHaveBeenCalled()
  })

  it("loads completion only through the protected action with bounded branch/day input", async () => {
    const completion = { kind: "BRANCH_DAILY_CLOSE_COMPLETION", contractVersion: "1.0" }
    mockGetCompletion.mockResolvedValue({ success: true, data: completion, error: null, status: 200 })

    render(await renderPage({ locale: "en", locationId: [" location-1 ", "ignored"], businessDate: "2026-07-18" }))

    expect(mockGetCompletion).toHaveBeenCalledWith({ locationId: "location-1", businessDate: "2026-07-18" })
    expect(mockGetCompletion).toHaveBeenCalledTimes(1)
    expect(mockWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ model: { kind: "READY", data: completion, canStartReview: false, canSign: false } }),
      undefined,
    )
    expect(mockCanUsePermission).toHaveBeenCalledWith(context, "branch.daily-close.review")
    expect(mockCanUsePermission).toHaveBeenCalledWith(context, "branch.daily-close.sign")
    expect(mockCanUsePermission).toHaveBeenCalledTimes(2)
  })

  it("derives review capability only from the trusted guarded RBAC context", async () => {
    const completion = {
      kind: "BRANCH_DAILY_CLOSE_COMPLETION",
      contractVersion: "1.0",
      state: "NOT_STARTED",
    }
    mockCanUsePermission.mockImplementation((_ctx, permission) => permission === "branch.daily-close.review")
    mockGetCompletion.mockResolvedValue({ success: true, data: completion, error: null, status: 200 })

    render(await renderPage({ locale: "en", locationId: "location-1", businessDate: "2026-07-18" }))

    expect(mockCanUsePermission).toHaveBeenCalledWith(context, "branch.daily-close.review")
    expect(mockCanUsePermission).toHaveBeenCalledWith(context, "branch.daily-close.sign")
    expect(mockWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        model: {
          kind: "READY",
          data: completion,
          canStartReview: true,
          canSign: false,
        },
      }),
      undefined,
    )
  })

  it("derives sign capability only from the trusted guarded RBAC context", async () => {
    const completion = {
      kind: "BRANCH_DAILY_CLOSE_COMPLETION",
      contractVersion: "1.0",
      state: "AWAITING_SIGN_OFF",
    }
    mockCanUsePermission.mockImplementation((_ctx, permission) => permission === "branch.daily-close.sign")
    mockGetCompletion.mockResolvedValue({ success: true, data: completion, error: null, status: 200 })

    render(await renderPage({ locale: "en", locationId: "caller-location", businessDate: "2026-07-18" }))

    expect(mockCanUsePermission).toHaveBeenCalledWith(context, "branch.daily-close.review")
    expect(mockCanUsePermission).toHaveBeenCalledWith(context, "branch.daily-close.sign")
    expect(mockCanUsePermission).toHaveBeenCalledTimes(2)
    expect(mockWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        model: {
          kind: "READY",
          data: completion,
          canStartReview: false,
          canSign: true,
        },
      }),
      undefined,
    )
  })

  it.each([
    [403, "ACCESS_OR_SCOPE"],
    [500, "UNAVAILABLE"],
  ])("maps action status %s to a safe %s workspace state", async (status, errorKind) => {
    mockGetCompletion.mockResolvedValue({
      success: false,
      data: null,
      error: "Safe action failure",
      status,
      code: status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
    })

    render(await renderPage({ locale: "en", locationId: "location-1", businessDate: "2026-07-18" }))

    expect(mockWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          kind: "ERROR",
          errorKind,
          locationId: "location-1",
          businessDate: "2026-07-18",
        }),
      }),
      undefined,
    )
    expect(mockCanUsePermission).not.toHaveBeenCalled()
  })
})

async function renderPage({
  locale,
  locationId,
  businessDate,
}: {
  locale: string
  locationId?: string | string[]
  businessDate?: string | string[]
}) {
  return BranchDailyClosePage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve({ locationId, businessDate }),
  })
}
