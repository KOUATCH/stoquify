import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

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