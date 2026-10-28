import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CustomerActionPage } from "@/components/customers/CustomerActionPage"
import {
  useCreateManagedCustomer,
  useManagedCustomer,
  useUpdateManagedCustomer,
} from "@/hooks/useCustomerManagement"

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock("@/hooks/useCustomerManagement", () => ({
  useManagedCustomer: jest.fn(),
  useCreateManagedCustomer: jest.fn(),
  useUpdateManagedCustomer: jest.fn(),
}))

const mockUseManagedCustomer = useManagedCustomer as jest.Mock
const mockUseCreateManagedCustomer = useCreateManagedCustomer as jest.Mock
const mockUseUpdateManagedCustomer = useUpdateManagedCustomer as jest.Mock

const customer = {
  id: "customer-1",
  organizationId: "org-1",
  name: "Acme Distribution",
  code: "CUST-0042",
  email: "billing@acme.test",
  phone: "+237600000000",
  address: "Douala, Cameroon",
  taxId: "M0123456789",
  creditLimit: 2000,
  currentBalance: 1000,
  paymentTerms: 30,
  notes: "Priority account",
  isActive: true,
  preferredLocale: "EN" as const,
  createdAt: new Date("2026-01-10T10:00:00.000Z"),
  updatedAt: new Date("2026-08-10T10:00:00.000Z"),
  salesOrdersCount: 3,
  openSalesOrdersCount: 2,
  unpaidSalesOrdersCount: 1,
  ledgerEntriesCount: 4,
  totalSalesValue: 4200,
  averageOrderValue: 1400,
  lastSalesOrderAt: new Date("2026-08-09T10:00:00.000Z"),
  lastLedgerEntryAt: new Date("2026-08-10T10:00:00.000Z"),
}

describe("CustomerActionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseManagedCustomer.mockReturnValue({
      data: customer,
      isLoading: false,
      isError: false,
      isSuccess: true,
    })
    mockUseCreateManagedCustomer.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    })
    mockUseUpdateManagedCustomer.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    })
  })

  it("stacks live action readiness above the edit workspace and tracks unsaved changes", async () => {
    render(
      <CustomerActionPage
        mode="edit"
        organizationId="org-1"
        locale="en"
        customerId="customer-1"
      />,
    )

    const readinessHeading = screen.getByRole("heading", { name: "Action readiness" })
    const editHeading = screen.getByText("Edit customer")

    expect(
      readinessHeading.compareDocumentPosition(editHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const identitySection = screen.getByRole("heading", { name: "Identity and contact" }).closest("section")
    const notesSection = screen.getByRole("heading", { name: "Operational notes" }).closest("section")
    const commercialSection = screen.getByRole("heading", { name: "Commercial controls" }).closest("section")
    const commercialColumn = commercialSection?.parentElement

    expect(commercialColumn).toContainElement(notesSection)
    expect(commercialColumn).not.toContainElement(identitySection)

    await waitFor(() => {
      expect(screen.getByText("100%")).toBeInTheDocument()
      expect(screen.getByText("50% used")).toBeInTheDocument()
      expect(screen.getAllByText("Current").length).toBeGreaterThan(0)
    })

    const saveButton = screen.getByRole("button", { name: "Save changes" })
    expect(saveButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Customer name/), {
      target: { value: "Acme Distribution Updated" },
    })

    await waitFor(() => {
      expect(screen.getAllByText("1 change").length).toBeGreaterThan(0)
      expect(saveButton).toBeEnabled()
    })
  })
})