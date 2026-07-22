import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { signBranchDailyCloseAction } from "@/actions/end-of-day-close/branch-daily-close-sign-off.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/end-of-day-close/branch-daily-close-sign-off.actions", () => ({
  signBranchDailyCloseAction: jest.fn(),
}))

jest.mock("@/actions/security/step-up-auth.actions", () => ({
  stepUpWithPasswordAction: jest.fn(),
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

import { BranchDailyCloseSignOffCommand } from "../BranchDailyCloseSignOffCommand"

const mockStepUp = stepUpWithPasswordAction as jest.Mock
const mockSign = signBranchDailyCloseAction as jest.Mock

beforeEach(() => {
  mockStepUp.mockReset()
  mockSign.mockReset()
  mockRefresh.mockReset()
})

describe("BranchDailyCloseSignOffCommand", () => {
  it("sends the password only to step-up and a bounded trusted-scope request to sign-off", async () => {
    mockStepUp.mockResolvedValue(stepUpSuccess())
    mockSign.mockResolvedValue(signSuccess())
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    await waitFor(() => expect(mockStepUp).toHaveBeenCalledWith({ password: "CurrentPassword!1" }))
    await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(1))
    const input = mockSign.mock.calls[0][0]
    expect(input).toEqual({
      locationId: "location-central",
      businessDate: "2026-07-18",
      idempotencyKey: expect.stringMatching(/^daily-close-sign-ui:[A-Za-z0-9-]+$/),
    })
    expect(input.idempotencyKey.length).toBeLessThanOrEqual(200)
    expect(input).not.toHaveProperty("password")
    expect(input).not.toHaveProperty("organizationId")
    expect(input).not.toHaveProperty("actorId")
    expect(input).not.toHaveProperty("permissions")
    expect(input).not.toHaveProperty("freshAuth")
    expect(input).not.toHaveProperty("lastAuthAt")
    expect(input).not.toHaveProperty("status")
    expect(input).not.toHaveProperty("reviewId")
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("status")).toHaveTextContent("Daily close signed")
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Daily close signed" })).toBeDisabled()
    })
  })

  it("clears an invalid password and never calls sign-off", async () => {
    mockStepUp.mockResolvedValue(stepUpFailure("INVALID_CREDENTIALS"))
    renderCommand()

    openDialogAndEnterPassword("WrongPassword")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified")
    expect(screen.getByLabelText("Password")).toHaveValue("")
    expect(mockSign).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("shows a bounded rate-limit retry without calling sign-off", async () => {
    mockStepUp.mockResolvedValue(stepUpFailure("RATE_LIMITED", 37))
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("about 37 seconds")
    expect(screen.getByLabelText("Password")).toHaveValue("")
    expect(mockSign).not.toHaveBeenCalled()
  })

  it("refreshes on authentication loss without claiming sign-off", async () => {
    mockStepUp.mockResolvedValue(stepUpFailure("AUTH_REQUIRED"))
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("session is no longer available")
    expect(mockSign).not.toHaveBeenCalled()
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("retains the idempotency key when fresh authentication expires between the two actions", async () => {
    mockStepUp.mockResolvedValue(stepUpSuccess())
    mockSign
      .mockResolvedValueOnce(signFailure(403, "FRESH_AUTH_REQUIRED", "Fresh authentication required"))
      .mockResolvedValueOnce(signSuccess())
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Verify again to retry the same request")
    expect(screen.getByLabelText("Password")).toHaveValue("")
    const firstKey = mockSign.mock.calls[0][0].idempotencyKey

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "CurrentPassword!1" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(2))
    expect(mockSign.mock.calls[1][0].idempotencyKey).toBe(firstKey)
    expect(mockStepUp).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
  })

  it.each([401, 403])("refreshes capability after access or scope status %s", async (status) => {
    mockStepUp.mockResolvedValue(stepUpSuccess())
    mockSign.mockResolvedValue(signFailure(status, status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", "Forbidden"))
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("permission, session, or managed-location scope changed")
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("surfaces the server-safe maker-checker denial and refreshes completion truth", async () => {
    mockStepUp.mockResolvedValue(stepUpSuccess())
    mockSign.mockResolvedValue(signFailure(409, "BUSINESS_RULE_VIOLATION", "This action requires independent approval."))
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("This action requires independent approval.")
    expect(screen.getByRole("alert")).toHaveTextContent("act_409")
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("treats an idempotent replay as server-confirmed success", async () => {
    mockStepUp.mockResolvedValue(stepUpSuccess())
    mockSign.mockResolvedValue(signSuccess({ created: false, replayed: true }))
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("status")).toHaveTextContent("already recorded")
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("blocks double submission while password verification is in flight", async () => {
    let resolveStepUp: ((value: ReturnType<typeof stepUpSuccess>) => void) | undefined
    mockStepUp.mockReturnValue(new Promise((resolve) => { resolveStepUp = resolve }))
    mockSign.mockResolvedValue(signSuccess())
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    const submit = screen.getByRole("button", { name: "Verify and sign" })
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(mockStepUp).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Verifying and signing" })).toBeDisabled()

    await act(async () => {
      resolveStepUp?.(stepUpSuccess())
    })
    await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(1))
  })

  it("clears password material when the dialog is cancelled", () => {
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Sign daily close" }))
    expect(screen.getByLabelText("Password")).toHaveValue("")
  })

  it("reserves room for the dialog close control on narrow screens", () => {
    renderCommand()

    fireEvent.click(screen.getByRole("button", { name: "Sign daily close" }))
    const title = screen.getByRole("heading", { name: "Confirm daily-close sign-off" })

    expect(title.parentElement).toHaveClass("pr-8")
  })

  it("fails safely on a thrown transport error without exposing details", async () => {
    mockStepUp.mockRejectedValue(new Error("private transport detail"))
    renderCommand()

    openDialogAndEnterPassword("CurrentPassword!1")
    fireEvent.click(screen.getByRole("button", { name: "Verify and sign" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be signed safely")
    expect(screen.queryByText("private transport detail")).not.toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("renders localized operational copy in French", () => {
    render(
      <BranchDailyCloseSignOffCommand
        locale="fr"
        locationId="location-central"
        locationName="Depot Central"
        businessDate="2026-07-18"
      />,
    )

    expect(screen.getByRole("heading", { name: "Valider la cloture quotidienne" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Valider la cloture" })).toBeInTheDocument()
    expect(screen.getByText("Depot Central / 2026-07-18")).toBeInTheDocument()
  })

  it("contains no direct persistence, service, browser-storage, delivery, or lifecycle-invalidation behavior", () => {
    const source = readFileSync(
      join(process.cwd(), "components/manager-action-center/BranchDailyCloseSignOffCommand.tsx"),
      "utf8",
    )

    expect(source).toContain("stepUpWithPasswordAction")
    expect(source).toContain("signBranchDailyCloseAction")
    expect(source).not.toMatch(/@\/services\/|@\/lib\/db|@\/prisma|\bPrisma\b/)
    expect(source).not.toMatch(/localStorage|sessionStorage|URLSearchParams|console\./)
    expect(source).not.toMatch(/revoke|supersede|notification|whatsapp|copilot|certificate/i)
  })
})

function renderCommand() {
  return render(
    <BranchDailyCloseSignOffCommand
      locale="en"
      locationId="location-central"
      locationName="Central Store"
      businessDate="2026-07-18"
    />,
  )
}

function openDialogAndEnterPassword(password: string) {
  fireEvent.click(screen.getByRole("button", { name: "Sign daily close" }))
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } })
}

function stepUpSuccess() {
  return {
    success: true as const,
    data: { verifiedAt: "2026-07-18T18:30:00.000Z", method: "password" as const, assuranceLevel: 1 },
    error: null,
    code: null,
    retryAfterSeconds: null,
  }
}

function stepUpFailure(code: "VALIDATION_ERROR" | "INVALID_CREDENTIALS" | "RATE_LIMITED" | "AUTH_REQUIRED" | "INTERNAL_ERROR", retryAfterSeconds: number | null = null) {
  return {
    success: false as const,
    data: null,
    error: "Safe authentication failure",
    code,
    retryAfterSeconds,
  }
}

function signSuccess(overrides: { created?: boolean; replayed?: boolean } = {}) {
  return {
    success: true as const,
    data: {
      kind: "BRANCH_DAILY_CLOSE_SIGN_OFF",
      created: overrides.created ?? true,
      replayed: overrides.replayed ?? false,
      signOff: { id: "sign-off-1", status: "ACTIVE" },
    },
    error: null,
    status: 200 as const,
  }
}

function signFailure(status: number, code: string, error: string) {
  return {
    success: false as const,
    data: null,
    error,
    status,
    code,
    correlationId: `act_${status}`,
    category: "BUSINESS",
    severity: "ERROR",
    retryable: false,
  }
}
