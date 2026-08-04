import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { startBranchDailyCloseReviewAction } from "@/actions/end-of-day-close/branch-daily-close-review.actions"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/end-of-day-close/branch-daily-close-review.actions", () => ({
  startBranchDailyCloseReviewAction: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

import { BranchDailyCloseReviewCommand } from "../BranchDailyCloseReviewCommand"

const mockStartReview = startBranchDailyCloseReviewAction as jest.Mock

beforeEach(() => {
  mockStartReview.mockReset()
  mockRefresh.mockReset()
})

describe("BranchDailyCloseReviewCommand", () => {
  it("sends only branch, date, and a bounded per-attempt idempotency key", async () => {
    mockStartReview.mockResolvedValue(successResponse())
    renderCommand()

    fireEvent.click(screen.getByRole("button", { name: "Start review" }))

    await waitFor(() => expect(mockStartReview).toHaveBeenCalledTimes(1))
    const input = mockStartReview.mock.calls[0][0]
    expect(input).toEqual({
      locationId: "location-central",
      businessDate: "2026-07-18",
      idempotencyKey: expect.stringMatching(/^daily-close-review-ui:[A-Za-z0-9-]+$/),
    })
    expect(input.idempotencyKey.length).toBeLessThanOrEqual(200)
    expect(input).not.toHaveProperty("organizationId")
    expect(input).not.toHaveProperty("actorId")
    expect(input).not.toHaveProperty("status")
    expect(input).not.toHaveProperty("now")
    expect(input).not.toHaveProperty("correlationId")
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("status")).toHaveTextContent("Review started. Refreshing completion evidence.")
    expect(await screen.findByRole("button", { name: "Review started" })).toBeDisabled()
  })

  it("treats an idempotent replay as server-confirmed success and refreshes truth", async () => {
    mockStartReview.mockResolvedValue(successResponse({ created: false, replayed: true }))
    renderCommand()

    fireEvent.click(screen.getByRole("button", { name: "Start review" }))

    expect(await screen.findByRole("status")).toHaveTextContent("already recorded")
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole("button", { name: "Review started" })).toBeDisabled()
  })

  it("retains the same idempotency key across a safe retry", async () => {
    mockStartReview
      .mockResolvedValueOnce(failureResponse(500, "Review service unavailable"))
      .mockResolvedValueOnce(successResponse())
    renderCommand()

    fireEvent.click(screen.getByRole("button", { name: "Start review" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Review service unavailable")
    expect(mockRefresh).not.toHaveBeenCalled()
    const firstKey = mockStartReview.mock.calls[0][0].idempotencyKey

    fireEvent.click(await screen.findByRole("button", { name: "Start review" }))

    await waitFor(() => expect(mockStartReview).toHaveBeenCalledTimes(2))
    expect(mockStartReview.mock.calls[1][0].idempotencyKey).toBe(firstKey)
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
  })

  it.each([401, 403])("refreshes capability after access or scope status %s without claiming success", async (status) => {
    mockStartReview.mockResolvedValue(failureResponse(status, "Forbidden"))
    renderCommand()

    fireEvent.click(screen.getByRole("button", { name: "Start review" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("permission or managed-location scope changed")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("blocks double submission while the first command is in flight", async () => {
    let resolveResponse: ((value: ReturnType<typeof successResponse>) => void) | undefined
    mockStartReview.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve }))
    renderCommand()

    const button = screen.getByRole("button", { name: "Start review" })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(mockStartReview).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Starting review" })).toBeDisabled()

    await act(async () => {
      resolveResponse?.(successResponse())
    })
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
  })

  it("fails safely on a thrown transport error without refreshing completion", async () => {
    mockStartReview.mockRejectedValue(new Error("network detail"))
    renderCommand()

    fireEvent.click(screen.getByRole("button", { name: "Start review" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be started safely")
    expect(screen.queryByText("network detail")).not.toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("renders localized operational copy in French", () => {
    render(
      <BranchDailyCloseReviewCommand
        locale="fr"
        locationId="location-central"
        locationName="Depot Central"
        businessDate="2026-07-18"
      />,
    )

    expect(screen.getByRole("heading", { name: "Demarrer la revue de cloture" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Demarrer la revue" })).toBeInTheDocument()
    expect(screen.getByText("Depot Central / 2026-07-18")).toBeInTheDocument()
  })

  it("contains no direct persistence, service, sign-off, step-up, AI, or delivery behavior", () => {
    const source = readFileSync(
      join(process.cwd(), "components/manager-action-center/BranchDailyCloseReviewCommand.tsx"),
      "utf8",
    )

    expect(source).toContain("startBranchDailyCloseReviewAction")
    expect(source).not.toMatch(/@\/services\/end-of-day-close|@\/lib\/db|@\/prisma|\bPrisma\b/)
    expect(source).not.toMatch(/signBranchDailyClose|freshAuth|password|revoke|supersede/i)
    expect(source).not.toMatch(/notification|whatsapp|copilot|certificate/i)
  })
})

function renderCommand() {
  return render(
    <BranchDailyCloseReviewCommand
      locale="en"
      locationId="location-central"
      locationName="Central Store"
      businessDate="2026-07-18"
    />,
  )
}

function successResponse(overrides: { created?: boolean; replayed?: boolean } = {}) {
  return {
    success: true as const,
    data: {
      kind: "BRANCH_DAILY_CLOSE_REVIEW",
      created: overrides.created ?? true,
      replayed: overrides.replayed ?? false,
      run: { id: "run-1" },
    },
    error: null,
    status: 200 as const,
  }
}

function failureResponse(status: number, error: string) {
  return {
    success: false as const,
    data: null,
    error,
    status,
    code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
    correlationId: `act_${status}`,
    category: "SYSTEM",
    severity: "ERROR",
    retryable: status >= 500,
  }
}
