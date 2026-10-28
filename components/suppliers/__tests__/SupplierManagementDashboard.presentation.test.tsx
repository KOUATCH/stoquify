import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

import type { SupplierManagementRow } from "@/actions/suppliers/supplier-management-actions"
import {
  useCreateManagedSupplier,
  useDeleteManagedSupplier,
  useSupplierAnalyticsData,
  useSupplierManagementData,
  useUpdateManagedSupplier,
} from "@/hooks/useSupplierManagement"

import SupplierManagementDashboard from "../SupplierManagementDashboard"

const mockReplace = jest.fn()

jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("@/components/DataTableComponents/DataTable", () => ({
  __esModule: true,
  default: ({
    columns,
    data,
  }: {
    columns: Array<{
      id?: string
      cell?: (context: { row: { original: SupplierManagementRow } }) => ReactNode
    }>
    data: SupplierManagementRow[]
  }) => {
    const actionsColumn = columns.find((column) => column.id === "actions")

    return (
      <div data-testid="supplier-table">
        {data.map((row) => (
          <div key={row.id}>
            {actionsColumn?.cell?.({ row: { original: row } })}
          </div>
        ))}
      </div>
    )
  },
}))

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  DropdownMenuSeparator: () => <hr />,
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }),
}))

jest.mock("@/hooks/useSupplierManagement", () => ({
  useCreateManagedSupplier: jest.fn(),
  useDeleteManagedSupplier: jest.fn(),
  useSupplierAnalyticsData: jest.fn(),
  useSupplierManagementData: jest.fn(),
  useUpdateManagedSupplier: jest.fn(),
}))

jest.mock("@/actions/suppliers/supplier-management-actions", () => ({
  prepareSupplierManagementExport: jest.fn(),
}))

const mockUseSupplierManagementData = useSupplierManagementData as jest.Mock
const mockUseSupplierAnalyticsData = useSupplierAnalyticsData as jest.Mock
const mockUseCreateManagedSupplier = useCreateManagedSupplier as jest.Mock
const mockUseUpdateManagedSupplier = useUpdateManagedSupplier as jest.Mock
const mockUseDeleteManagedSupplier = useDeleteManagedSupplier as jest.Mock

const supplier = {
  id: "supplier-1",
  organizationId: "org-1",
  name: "Atlas Supplies",
  code: "ATL-001",
  contactPerson: "Ari",
  email: "ari@example.test",
  phone: "+237600000000",
  address: "Market road",
  city: "Douala",
  state: "Littoral",
  zipCode: null,
  country: "Cameroon",
  taxId: null,
  paymentTerms: 30,
  creditLimit: 5000,
  preferredLocale: "EN",
  notes: null,
  isActive: true,
  currentBalance: 1200,
  supplierItemsCount: 2,
  preferredItemsCount: 1,
  purchaseOrdersCount: 3,
  openPurchaseOrdersCount: 1,
  totalPurchaseValue: 9000,
  lastPurchaseDate: new Date("2026-08-09T10:00:00.000Z"),
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-09T10:00:00.000Z"),
} as SupplierManagementRow

const analytics = {
  supplier,
  purchaseOrders: [],
  ledgerEntries: [],
  linkedItems: [],
  apHistory: {
    rows: [],
    summary: {
      transactionCount: 0,
      invoiceCount: 0,
      paymentCount: 0,
      invoiceTotal: "0",
      paidTotal: "0",
      releasedPaymentTotal: "0",
      openPayable: "0",
      postedInvoiceCount: 0,
      releasedPaymentCount: 0,
      ledgerBlockerCount: 0,
      currency: "XAF",
    },
    snapshot: {
      timezone: "UTC",
      recordedThrough: "2026-08-09T10:00:00.000Z",
      generatedAt: "2026-08-09T10:05:00.000Z",
    },
    appliedFilters: { timezone: "UTC" },
    completeness: { state: "complete", sources: [] },
    pageInfo: { hasMore: false, nextCursor: null },
  },
}

describe("SupplierManagementDashboard route-first presentation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSupplierManagementData.mockReturnValue({
      data: {
        suppliers: [supplier],
        summary: {},
        topByPurchases: [],
        topByBalance: [],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    })
    mockUseSupplierAnalyticsData.mockReturnValue({
      data: analytics,
      isLoading: false,
      isError: false,
      error: null,
    })
    mockUseCreateManagedSupplier.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    })
    mockUseUpdateManagedSupplier.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    })
    mockUseDeleteManagedSupplier.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    })
  })

  it("renders a direct create route as an inline page form", async () => {
    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        initialAction="create"
      />,
    )

    expect(
      screen.getByRole("heading", { level: 1, name: "Create supplier" }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("form", { name: "Create supplier" }),
    ).toBeVisible()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Suppliers dashboard")).not.toBeInTheDocument()
    expect(document.querySelector('[data-supplier-page-content="form"]')).toContainElement(
      screen.getByRole("form", { name: "Create supplier" }),
    )
  })

  it("links list actions to full supplier routes without duplicate edit actions", async () => {
    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        canEdit
      />,
    )

    expect(screen.getByRole("link", { name: "Create supplier" })).toHaveAttribute(
      "href",
      "/en/dashboard/purchases/suppliers/create",
    )

    expect(await screen.findByRole("link", { name: "View analytics" })).toHaveAttribute(
      "href",
      "/en/dashboard/purchases/suppliers/supplier-1",
    )
    expect(screen.getByRole("link", { name: "Edit supplier" })).toHaveAttribute(
      "href",
      "/en/dashboard/purchases/suppliers/supplier-1/edit",
    )
    expect(screen.queryByText("Open edit page")).not.toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Edit supplier" })).toHaveLength(1)
  })

  it("preserves the French locale in supplier action routes", async () => {
    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="fr"
        basePath="/fr/dashboard/purchases/suppliers"
        canEdit
      />,
    )

    expect(await screen.findByRole("link", { name: "Voir analyse" })).toHaveAttribute(
      "href",
      "/fr/dashboard/purchases/suppliers/supplier-1",
    )
    expect(screen.getByRole("link", { name: "Modifier fournisseur" })).toHaveAttribute(
      "href",
      "/fr/dashboard/purchases/suppliers/supplier-1/edit",
    )
  })

  it("keeps the direct create form mounted while routing to the saved supplier", async () => {
    const createdSupplier = { ...supplier, id: "supplier-created", name: "Created Supplier" }
    const mutateAsync = jest.fn().mockResolvedValue(createdSupplier)
    mockUseCreateManagedSupplier.mockReturnValue({
      isPending: false,
      mutateAsync,
    })

    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        initialAction="create"
      />,
    )

    const form = await screen.findByRole("form", { name: "Create supplier" })
    fireEvent.change(screen.getByLabelText(/Supplier name/), {
      target: { value: "Created Supplier" },
    })
    fireEvent.submit(form)

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Created Supplier" }),
      ),
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        "/en/dashboard/purchases/suppliers/supplier-created",
      ),
    )
    expect(form).toBeVisible()
  })

  it("renders a direct edit route with supplier context and stable back navigation", async () => {
    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        initialEditId="supplier-1"
      />,
    )

    expect(
      screen.getByRole("heading", { level: 1, name: "Atlas Supplies" }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("form", { name: "Edit supplier" }),
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Back to supplier" })).toHaveAttribute(
      "href",
      "/en/dashboard/purchases/suppliers/supplier-1",
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.querySelector('[data-supplier-page-content="form"]')).toContainElement(
      screen.getByRole("form", { name: "Edit supplier" }),
    )
  })

  it("shows a controlled full-page state when an edit-route supplier is missing", async () => {
    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        initialEditId="missing-supplier"
      />,
    )

    expect(await screen.findByRole("heading", { name: "Supplier not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to suppliers" })).toHaveAttribute(
      "href",
      "/en/dashboard/purchases/suppliers",
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("returns a successful supplier edit to the supplier detail route", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ ...supplier, name: "Atlas Updated" })
    mockUseUpdateManagedSupplier.mockReturnValue({
      isPending: false,
      mutateAsync,
    })

    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        initialEditId="supplier-1"
      />,
    )

    const form = await screen.findByRole("form", { name: "Edit supplier" })
    fireEvent.change(screen.getByLabelText(/Supplier name/), {
      target: { value: "Atlas Updated" },
    })
    fireEvent.submit(form)

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "supplier-1",
        data: expect.objectContaining({ name: "Atlas Updated" }),
      }),
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        "/en/dashboard/purchases/suppliers/supplier-1",
      ),
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders supplier details as a state-risk-action-proof workspace", async () => {
    render(
      <SupplierManagementDashboard
        organizationId="org-1"
        locale="en"
        basePath="/en/dashboard/purchases/suppliers"
        initialAnalyticsId="supplier-1"
        canEdit
      />,
    )

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Atlas Supplies" }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText("Credit exposure")).toBeInTheDocument()
    expect(
      screen.getAllByText("Operational AP history complete").length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "Edit supplier" })).toHaveAttribute(
      "href",
      "/en/dashboard/purchases/suppliers/supplier-1/edit",
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Suppliers dashboard")).not.toBeInTheDocument()
    expect(document.querySelector('[data-supplier-page-content="analytics"]')).toBeVisible()
  })
})
