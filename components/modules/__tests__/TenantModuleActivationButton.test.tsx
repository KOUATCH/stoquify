import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { activateTenantModuleAction } from "@/actions/modules/module-control.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

import { TenantModuleActivationButton } from "../TenantModuleActivationButton"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/modules/module-control.actions", () => ({
  activateTenantModuleAction: jest.fn(),
}))

jest.mock("@/actions/security/step-up-auth.actions", () => ({
  stepUpWithPasswordAction: jest.fn(),
}))

const mockActivate = activateTenantModuleAction as jest.Mock
const mockStepUp = stepUpWithPasswordAction as jest.Mock

const labels = {
  button: "Enable reconciliation",
  pending: "Enabling…",
  confirm: "Confirm activation?",
  success: "Reconciliation enabled.",
  error: "Activation failed.",
  freshAuthRequired: "Confirm your current password.",
  passwordLabel: "Current password",
  verifyAndEnable: "Verify and enable",
}

describe("TenantModuleActivationButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("uses password step-up before retrying stale-session activation", async () => {
    mockActivate
      .mockResolvedValueOnce({
        success: false,
        data: null,
        error: "Fresh authentication required",
        code: "FRESH_AUTH_REQUIRED",
      })
      .mockResolvedValueOnce({
        success: true,
        data: { moduleSlug: "payment_reconciliation" },
        error: null,
        status: 200,
      })
    mockStepUp.mockResolvedValue({
      success: true,
      data: { method: "password" },
      error: null,
      code: null,
    })

    render(
      <TenantModuleActivationButton
        moduleSlug="payment_reconciliation"
        labels={labels}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Enable reconciliation" }))

    const password = await screen.findByLabelText("Current password")
    fireEvent.change(password, { target: { value: "correct-password" } })
    fireEvent.click(await screen.findByRole("button", { name: "Verify and enable" }))

    await waitFor(() => {
      expect(mockStepUp).toHaveBeenCalledWith({ password: "correct-password" })
      expect(mockActivate).toHaveBeenCalledTimes(2)
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
