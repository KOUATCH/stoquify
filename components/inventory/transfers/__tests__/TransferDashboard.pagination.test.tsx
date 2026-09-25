import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TransferDashboard } from "../TransferDashboard"
import en from "@/messages/en.json"

let mockLocale = "en"
const mockRequests = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: (namespace: string) => (key: string) => (en as any)[namespace]?.[key] ?? key }))
jest.mock("@/i18n/routing", () => ({ pickLocale: (value: string) => value, localizePath: (path: string) => path }))
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: () => ({ organizationId: "org", isLoading: false }) }))
jest.mock("@/hooks/useAllLocationsQueries", () => ({ useOrgLocationsNew: () => ({ data: { data: [] } }) }))
jest.mock("@/hooks/useTransferQueries", () => ({ useTransfers: (_org: string, filters: any) => {
  mockRequests(filters)
  const total = filters.awaitingReceipt ? 2 : 25
  return { data: [], pagination: { total, totalPages: Math.ceil(total / filters.limit) }, isLoading: false, isFetching: false, refetch: jest.fn() }
} }))
jest.mock("lucide-react", () => Object.fromEntries(["ArrowRight", "Calendar", "CheckCircle", "Clock", "MapPin", "Package", "Plus", "Search", "Truck", "User", "XCircle"].map(name => [name, () => null])))
// Keep the shared pagination and TanStack state real; only simplify Radix's popup for jsdom.
jest.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}))
beforeEach(() => { jest.clearAllMocks(); mockLocale = "en" })
it("uses server totals for last/first page and resets on page-size and reception-filter changes", async () => {
  render(<TransferDashboard />)
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Go to previous page" })).toBeDisabled()
  await userEvent.click(screen.getByRole("button", { name: "Go to last page" }))
  expect(mockRequests).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, limit: 10 }))
  expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled()
  const footer = screen.getByText("Rows per page").closest("fieldset")!
  await userEvent.selectOptions(within(footer).getByRole("combobox"), "20")
  expect(mockRequests).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20 }))
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: "Go to next page" }))
  await userEvent.click(screen.getByRole("button", { name: "Awaiting reception" }))
  await waitFor(() => expect(mockRequests).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20, awaitingReceipt: true })))
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument()
  await userEvent.click(screen.getByRole("tab", { name: "Transfer Analytics" }))
  expect(screen.queryByText("Rows per page")).not.toBeInTheDocument()
})
it("uses the shared French pagination labels", () => {
  mockLocale = "fr"
  render(<TransferDashboard />)
  expect(screen.getByText("Lignes par page")).toBeInTheDocument()
  expect(screen.getByText("Page 1 sur 3")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Aller à la dernière page" })).toBeInTheDocument()
})
