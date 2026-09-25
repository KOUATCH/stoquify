import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { RegisterV2Form } from "../RegisterV2Form"

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string) => href,
}))

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => (
      <svg data-testid={"icon-" + name} {...props} />
    )
    return Icon
  }
  return new Proxy({ __esModule: true }, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target]
      return createIcon(prop)
    },
  })
})

const mockPush = jest.fn()
const mockMutateAsync = jest.fn()
const mockWarning = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock("@/hooks/useRegisterWorkflow", () => ({
  RegistrationWorkflowError: class extends Error {},
  useRegisterWorkflow: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    warning: mockWarning,
  }),
}))

function hiddenInput(container: HTMLElement, name: string) {
  const input = container.querySelector<HTMLInputElement>(
    'input[name="' + name + '"]',
  )
  expect(input).not.toBeNull()
  return input!
}

describe("RegisterV2Form referral handoff", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it("uses labeled controls and a POST form while keeping French choices canonical", async () => {
    const { container } = render(<RegisterV2Form locale="fr" />)
    expect(container.querySelector("form")).toHaveAttribute("method", "post")
    expect(screen.getByLabelText("Pays de l’entreprise")).toHaveValue("Cameroon")
    expect(screen.getByRole("option", { name: "Commerce de détail" })).toHaveValue("Retail")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1")
    const buttons = screen.getAllByRole("button")
    expect(buttons.some(button => button.getAttribute("aria-current") === "step")).toBe(true)
  })

  it("preserves the account draft after a lost response and prevents duplicate pending creation", async () => {
    let reject!: (value: Error) => void
    mockMutateAsync.mockReturnValue(new Promise((_, failure) => { reject = failure }))
    const { container } = render(<RegisterV2Form locale="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Continue", exact: true })); await screen.findByText("Owner / manager")
    fireEvent.click(screen.getByRole("button", { name: "Continue", exact: true })); await screen.findByLabelText("Company name")
    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Synthetic Retail" } })
    fireEvent.click(screen.getByRole("button", { name: "Continue", exact: true })); await screen.findByLabelText("First name")
    for (const [label, value] of [["First name", "Synthetic"], ["Last name", "Owner"], ["Work email", "synthetic@example.invalid"], ["Phone number", "+237600000039"], ["Password", "Local!Credential-79"], ["Confirm password", "Local!Credential-79"]]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
    fireEvent.click(screen.getByLabelText("I agree to the terms and privacy policy"))
    fireEvent.click(screen.getByRole("button", { name: "Continue", exact: true })); await screen.findByText("Recommended setup")
    expect(mockMutateAsync).not.toHaveBeenCalled()
    fireEvent.submit(container.querySelector("form")!); fireEvent.submit(container.querySelector("form")!)
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1))
    await act(async () => reject(new Error("lost response")))
    expect(screen.getByRole("alert")).toHaveTextContent("outcome could not be confirmed")
    expect(screen.getByRole("alert")).toHaveFocus(); expect(mockPush).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Admin", exact: true }))
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("Local!Credential-79")
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password")
  })

  it("preserves a customer-statement referral code in the submitted form", () => {
    mockSearchParams = new URLSearchParams("ref=customer_ref_123")

    const { container } = render(<RegisterV2Form locale="en" />)

    expect(hiddenInput(container, "referralCode")).toHaveValue(
      "customer_ref_123",
    )
    expect(hiddenInput(container, "accountantInviteToken")).toHaveValue("")
  })

  it("preserves the accountant token and requires mandate acceptance", async () => {
    const inviteToken = "invite-token-" + "a".repeat(32)
    mockSearchParams = new URLSearchParams({
      ref: "accountant_ref_123",
      role: "accountant",
      invite: inviteToken,
    })

    const { container } = render(<RegisterV2Form locale="en" />)

    expect(hiddenInput(container, "referralCode")).toHaveValue(
      "accountant_ref_123",
    )
    expect(hiddenInput(container, "accountantInviteToken")).toHaveValue(
      inviteToken,
    )

    fireEvent.click(screen.getByRole("button", { name: /continue/i }))
    await screen.findByText("Owner / manager")
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))
    const companyName = await screen.findByPlaceholderText(
      "AqStoq Retail Group",
    )
    fireEvent.change(companyName, {
      target: { value: "Referral Accountant Workspace" },
    })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    expect(
      await screen.findByText(
        /accept the limited, time-bound, revocable client mandate/i,
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector('input[name="accountantInviteAccepted"]'),
    ).not.toBeNull()
  })
})
