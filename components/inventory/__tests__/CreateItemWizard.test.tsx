import type { SVGProps } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CreateItemWizard } from "../CreateItemWizard"

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockBack = jest.fn()
const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  operationStart: jest.fn(() => "operation-1"),
  operationComplete: jest.fn(),
}

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


jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => mockNotifications,
}))

jest.mock("@/components/FormInputs/EnhancedImageUploadButton", () => ({
  __esModule: true,
  default: ({
    setImageUrl,
    onUploadStart,
    onUploadComplete,
  }: {
    setImageUrl: (url: string) => void
    onUploadStart?: () => void
    onUploadComplete?: () => void
  }) => (
    <>
      <button type="button" onClick={() => onUploadStart?.()}>
        Start test upload
      </button>
      <button
        type="button"
        onClick={() => {
          setImageUrl("https://example.com/item.png")
          onUploadComplete?.()
        }}
      >
        Complete test upload
      </button>
    </>
  ),
}))


async function reachPricingStep() {
  fireEvent.change(
    screen.getByLabelText(/Product Name \(English\)/),
    { target: { value: "Rice" } },
  )

  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Product Details" })

  fireEvent.change(
    screen.getByLabelText(/SKU \(Stock Keeping Unit\)/),
    { target: { value: "RICE-001" } },
  )

  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Pricing & Units" })
}

async function reachMediaStep() {
  await reachPricingStep()


  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Inventory Settings" })

  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Product Media" })
}

describe("CreateItemWizard money previews", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    { currency: "XAF", locale: "en" },
    { currency: "XOF", locale: "fr" },
  ])("formats $currency previews in $locale", async ({ currency, locale }) => {
    render(
      <CreateItemWizard
        action={jest.fn()}
        organizationId={"org-" + currency}
        currency={currency}
        locale={locale}
      />,
    )

    await reachPricingStep()
    const [costPriceInput, sellingPriceInput] = screen.getAllByRole("spinbutton")
    fireEvent.change(costPriceInput, { target: { value: "1200" } })
    fireEvent.change(sellingPriceInput, { target: { value: "1500" } })

    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    })

    const formattedCost = formatter.format(1200)
    const formattedPrice = formatter.format(1500)
    const formattedProfit = formatter.format(300) + " profit per unit"

    expect(screen.getAllByText((_, element) => element?.textContent === formattedCost)).not.toHaveLength(0)
    expect(screen.getAllByText((_, element) => element?.textContent === formattedPrice)).not.toHaveLength(0)
    expect(screen.getAllByText((_, element) => element?.textContent === formattedProfit)).not.toHaveLength(0)
  })
})

describe("CreateItemWizard submission boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not create on native form submission or image upload", async () => {
    const action = jest.fn().mockResolvedValue({
      success: true,
      redirect: "/dashboard/inventory/items",
    })

    render(
      <CreateItemWizard
        action={action}
        organizationId="org-1"
        currency="XAF"
        locale="en"
      />,
    )

    await reachMediaStep()

    const createButton = screen.getByRole("button", { name: "Create Product" })
    expect(createButton).toBeDisabled()

    const form = createButton.closest("form")
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)
    expect(action).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Start test upload" }))
    expect(createButton).toBeDisabled()
    fireEvent.click(createButton)
    expect(action).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Complete test upload" }))

    await waitFor(() => expect(createButton).toBeEnabled())
    expect(action).not.toHaveBeenCalled()
  })

  it("creates exactly once only after the explicit create click", async () => {
    let resolveAction: ((value: { success: boolean; redirect: string }) => void) | undefined
    const action = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveAction = resolve
    }))

    render(
      <CreateItemWizard
        action={action}
        organizationId="org-1"
        currency="XAF"
        locale="en"
      />,
    )

    await reachMediaStep()
    fireEvent.click(screen.getByRole("button", { name: "Start test upload" }))
    fireEvent.click(screen.getByRole("button", { name: "Complete test upload" }))

    const createButton = screen.getByRole("button", { name: "Create Product" })
    await waitFor(() => expect(createButton).toBeEnabled())

    fireEvent.click(createButton)
    fireEvent.click(createButton)

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const submitted = action.mock.calls[0][0] as FormData
    expect(submitted.get("imageUrls")).toBe("https://example.com/item.png")

    resolveAction?.({ success: true, redirect: "/dashboard/inventory/items" })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/inventory/items"))
  })
})
