import type { ReactNode, SVGProps } from "react"
import { Component } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import PurchaseOrdersError from "@/app/[locale]/(dashboard)/dashboard/purchase-orders/error"
import { usePurchaseOrders } from "@/hooks/useRecentPurchaseOrderQueries"

import PurchaseOrderManagement from "../PurchaseOrderManagement"

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

jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

jest.mock("@/lib/notifications/notify", () => ({
  notify: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock("@/i18n/routing", () => ({
  getLocaleFromPathname: jest.fn(() => "en"),
  localizePath: jest.fn((href: string) => `/en${href}`),
}))

jest.mock("@/hooks/useRecentPurchaseOrderQueries", () => {
  const mutation = () => ({
    isPending: false,
    mutate: jest.fn(),
  })

  return {
    useApprovePurchaseOrder: jest.fn(mutation),
    useCancelPurchaseOrder: jest.fn(mutation),
    useDeletePurchaseOrder: jest.fn(mutation),
    usePurchaseOrders: jest.fn(),
    useReceiveItems: jest.fn(mutation),
  }
})

const mockUsePurchaseOrders = usePurchaseOrders as jest.Mock

class PurchaseOrdersRouteBoundary extends Component<
  { children: ReactNode; reset: () => void },
  { error: Error | null }
> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <PurchaseOrdersError error={this.state.error} reset={this.props.reset} />
    }

    return this.props.children
  }
}

describe("PurchaseOrderManagement error surface", () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleError.mockRestore()
    jest.clearAllMocks()
  })

  it("routes purchase-order query failures to the shared platform error page", () => {
    const reset = jest.fn()
    const queryError = new Error("raw supplier database token should stay out of the UI")

    mockUsePurchaseOrders.mockReturnValue({
      data: undefined,
      error: queryError,
      isLoading: false,
      refetch: jest.fn(),
    })

    render(
      <PurchaseOrdersRouteBoundary reset={reset}>
        <PurchaseOrderManagement
          title="Purchase orders"
          organizationId="org-1"
          initialPurchaseOrderData={[]}
          initialSupplierData={[]}
          initialLocationData={[]}
        />
      </PurchaseOrdersRouteBoundary>,
    )

    expect(screen.getByRole("heading", { name: "Purchase orders could not load" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(screen.queryByText(/supplier database token/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })
})