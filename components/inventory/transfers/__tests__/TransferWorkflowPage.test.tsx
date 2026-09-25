import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TransferWorkflowPage } from "../TransferWorkflowPage"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

jest.mock("lucide-react", () => ({ ArrowLeft: () => null, ArrowRight: () => null, CheckCircle2: () => null, RefreshCw: () => null, Truck: () => null }))
jest.mock("@/i18n/routing", () => ({ pickLocale: (locale: string) => locale, localizePath: (path: string, locale: string) => "/" + locale + path }))
let mockLocale = "en"
const mockMutate = jest.fn()
let mockQuery: any
jest.mock("@/hooks/useTransferLifecycle", () => ({
  useTransferWorkflow: () => mockQuery,
  useTransferCommand: () => ({ mutateAsync: mockMutate, reset: jest.fn(), isPending: false, isError: false }),
}))
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: () => {
    const lookup = (key: string) => key.split(".").reduce((value: any, part) => value?.[part], (mockLocale === "fr" ? fr : en).inventoryTransferLifecycle)
    const translate = (key: string, values: Record<string, string | number> = {}) => String(lookup(key)).replace(/\{(\w+)\}/g, (_, name) => String(values[name]))
    translate.has = (key: string) => Boolean(lookup(key))
    return translate
  },
}))
beforeEach(() => {
  jest.clearAllMocks(); mockLocale = "en"; mockMutate.mockResolvedValue({})
  mockQuery = { refetch: jest.fn(), data: { allowedOperations: ["RECEIVE"], history: [], transfer: {
    id: "transfer", organizationId: "org", status: "IN_TRANSIT", transferNumber: "TR-1",
    fromLocationId: "source", toLocationId: "destination", fromLocation: { name: "Warehouse" }, toLocation: { name: "Shop" },
    createdAt: "2026-09-12T10:00:00Z", updatedAt: "2026-09-12T10:01:00Z",
    lines: [{ id: "line", item: { name: "Test item", sku: "SKU" }, requestedQuantity: 5, shippedQuantity: 5, receivedQuantity: 2 }],
  } } }
})
it.each(["en", "fr"])("renders a routed %s receiving form and requires actual quantities and destination confirmation", async locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).inventoryTransferLifecycle
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: copy.operation.RECEIVE }))
  const form = screen.getByRole("region", { name: copy.operation.RECEIVE })
  const save = within(form).getByRole("button", { name: copy.operation.RECEIVE })
  const input = within(form).getByRole("spinbutton")
  expect(save).toBeDisabled()
  await userEvent.type(input, "2")
  expect(save).toBeDisabled()
  await userEvent.click(within(form).getByRole("checkbox"))
  expect(save).toBeEnabled()
  await userEvent.click(save)
  await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
    operation: "RECEIVE", locationId: "destination", lines: [{ lineId: "line", quantity: 2 }],
    expectedUpdatedAt: "2026-09-12T10:01:00.000Z",
  })))
})
it.each(["4", "-1", "0.0001"])("blocks invalid quantity %s", async quantity => {
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  await userEvent.click(screen.getByRole("button", { name: "Record receipt" }))
  const form = screen.getByRole("region", { name: "Record receipt" })
  await userEvent.type(within(form).getByRole("spinbutton"), quantity)
  await userEvent.click(within(form).getByRole("checkbox"))
  expect(within(form).getByRole("button", { name: "Record receipt" })).toBeDisabled()
  expect(within(form).getByRole("alert")).toBeInTheDocument()
  expect(mockMutate).not.toHaveBeenCalled()
})
it("retains receipt quantities when saving fails", async () => {
  mockMutate.mockRejectedValue(new Error("Connection lost"))
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  await userEvent.click(screen.getByRole("button", { name: "Record receipt" }))
  const form = screen.getByRole("region", { name: "Record receipt" })
  await userEvent.type(within(form).getByRole("spinbutton"), "2")
  await userEvent.click(within(form).getByRole("checkbox"))
  await userEvent.click(within(form).getByRole("button", { name: "Record receipt" }))
  await waitFor(() => expect(mockMutate).toHaveBeenCalled())
  expect(within(form).getByRole("spinbutton")).toHaveValue(2)
})
it("shows a retryable error instead of an endless loading state", async () => {
  mockQuery = { isError: true, error: new Error("Transfer not found"), refetch: jest.fn() }
  render(<TransferWorkflowPage organizationId="org" transferId="missing" />)
  expect(screen.getByRole("alert")).toHaveTextContent("Transfer not found")
  await userEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(mockQuery.refetch).toHaveBeenCalled()
})
it("does not expose actions when the server grants none", () => {
  mockQuery.data.allowedOperations = []
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  expect(screen.queryByRole("button", { name: "Record receipt" })).not.toBeInTheDocument()
})

it("keeps the reviewed revision when a background refresh arrives during receipt entry", async () => {
  const view = render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  await userEvent.click(screen.getByRole("button", { name: "Record receipt" }))
  const form = screen.getByRole("region", { name: "Record receipt" })
  await userEvent.type(within(form).getByRole("spinbutton"), "1")
  await userEvent.click(within(form).getByRole("checkbox"))
  mockQuery.data.transfer.updatedAt = "2026-09-12T10:05:00Z"
  view.rerender(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  await userEvent.click(within(form).getByRole("button", { name: "Record receipt" }))
  await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: "2026-09-12T10:01:00.000Z" })))
})

it.each(["en", "fr"])("shows reviewed draft correction instead of a broken dispatch action in %s", async locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).inventoryTransferLifecycle
  mockQuery.data.transfer.status = "APPROVED"
  mockQuery.data.transfer.lines[0].receivedQuantity = 0
  mockQuery.data.blockingIssue = "RECORDED_QUANTITIES"
  mockQuery.data.allowedOperations = ["RETURN_TO_DRAFT"]
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  expect(screen.getAllByText(copy.needsCorrection)).toHaveLength(2)
  expect(screen.queryByRole("button", { name: copy.operation.DISPATCH })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: copy.operation.RETURN_TO_DRAFT }))
  const form = screen.getByRole("region", { name: copy.operation.RETURN_TO_DRAFT })
  const save = within(form).getByRole("button", { name: copy.operation.RETURN_TO_DRAFT })
  expect(save).toBeDisabled()
  await userEvent.click(within(form).getByRole("checkbox"))
  expect(save).toBeDisabled()
  await userEvent.type(within(form).getByRole("textbox"), "No goods left; seed error")
  await userEvent.click(save)
  expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ operation: "RETURN_TO_DRAFT", confirmNoMovement: true, notes: "No goods left; seed error" }))
})
it("requires a fresh review after an explicit refresh", async () => {
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  await userEvent.click(screen.getByRole("button", { name: "Record receipt" }))
  await userEvent.click(screen.getByRole("button", { name: "Refresh transfer" }))
  expect(screen.queryByRole("region", { name: "Record receipt" })).not.toBeInTheDocument()
  expect(mockQuery.refetch).toHaveBeenCalled()
  mockQuery.data.transfer.updatedAt = "2026-09-12T10:05:00Z"
  await userEvent.click(screen.getByRole("button", { name: "Record receipt" }))
  const form = screen.getByRole("region", { name: "Record receipt" })
  await userEvent.type(within(form).getByRole("spinbutton"), "1")
  await userEvent.click(within(form).getByRole("checkbox"))
  await userEvent.click(within(form).getByRole("button", { name: "Record receipt" }))
  expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: "2026-09-12T10:05:00.000Z" }))
})
it("submits valid dispatch with the reviewed revision and source confirmation", async () => {
  mockQuery.data.transfer.status = "APPROVED"
  mockQuery.data.allowedOperations = ["DISPATCH", "CANCEL"]
  mockQuery.data.transfer.lines[0].shippedQuantity = 0
  mockQuery.data.transfer.lines[0].receivedQuantity = 0
  render(<TransferWorkflowPage organizationId="org" transferId="transfer" />)
  await userEvent.click(screen.getByRole("button", { name: "Dispatch items" }))
  const form = screen.getByRole("region", { name: "Dispatch items" })
  const save = within(form).getByRole("button", { name: "Dispatch items" })
  expect(save).toBeDisabled()
  await userEvent.click(within(form).getByRole("checkbox"))
  await userEvent.click(save)
  expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ operation: "DISPATCH", locationId: "source", expectedUpdatedAt: "2026-09-12T10:01:00.000Z" }))
})
