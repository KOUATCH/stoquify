import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode, SVGProps } from "react"
import { CreateTransferModal } from "../CreateTransferModal"
import { createLocationTransfer } from "@/actions/inventory/inventoryMovementActions"
import { getInventoryLevels } from "@/actions/inventory/inventoryActions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

jest.mock("@/actions/inventory/transferLifecycleActions", () => ({ getTransferDetail: jest.fn() }))
let mockLocale = "en"
const mockNotifyError = jest.fn()
const mockFormError = jest.fn()
const mockFormSuccess = jest.fn()
jest.mock("lucide-react", () => {
  const icons = new Map<string, (props: SVGProps<SVGSVGElement>) => React.JSX.Element>()
  return new Proxy({ __esModule: true }, { get(target, key: string) {
    if (key in target) return target[key as keyof typeof target]
    if (!icons.has(key)) icons.set(key, (props: SVGProps<SVGSVGElement>) => <svg {...props} />)
    return icons.get(key)
  } })
})
jest.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string, values: Record<string, string | number> = {}) => {
  const messages = mockLocale === "fr" ? fr : en
  const copy = namespace === "moduleComposition.stop" ? messages.moduleComposition.stop : messages.inventoryTransferCreate
  return (copy as Record<string, string>)[key].replace(/\{(\w+)\}/g, (_, name) => String(values[name]))
} }))
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: () => ({ user: { id: "actor-1" } }) }))
jest.mock("@/hooks/useAllLocationsQueries", () => ({ useOrgLocationsNew: () => ({ data: { success: true, data: [{ id: "source", name: "Source location" }, { id: "destination", name: "Destination location" }, { id: "other", name: "Other location" }] } }) }))
jest.mock("@/actions/inventory/inventoryActions", () => ({ getInventoryLevels: jest.fn() }))
jest.mock("@/actions/inventory/inventoryMovementActions", () => ({ createLocationTransfer: jest.fn(), approveTransfer: jest.fn(), getTransfers: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ error: mockNotifyError, formError: mockFormError, formSuccess: mockFormSuccess }) }))
jest.mock("@/components/ui/date-picker", () => ({ DatePicker: () => null }))
// Native select adapters keep this check focused on real form state and mutation
// failure handling. The unchanged Radix controls are covered by the browser case.
jest.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children, disabled }: { value: string; onValueChange: (value: string) => void; children: ReactNode; disabled?: boolean }) => <select value={value} disabled={disabled} onChange={event => onValueChange(event.target.value)}><option value="" />{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, disabled, children }: { value: string; disabled?: boolean; children: ReactNode }) => <option value={value} disabled={disabled}>{children}</option>,
}))

beforeEach(() => {
  jest.clearAllMocks(); mockLocale = "en"
  ;(getInventoryLevels as jest.Mock).mockResolvedValue({ success: true, data: [{ itemId: "item-1", locationId: "source", quantityAvailable: 10, item: { id: "item-1", name: "Test item", sku: "ITEM" } }] })
})

it.each(["en", "fr"])("keeps the rejected draft and displays persistent %s feedback on the page", async locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).moduleComposition.stop
  const formCopy = (locale === "fr" ? fr : en).inventoryTransferCreate
  ;(createLocationTransfer as jest.Mock).mockResolvedValue({ success: false, error: { code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED", userMessage: "Forbidden" } })
  const onOpenChange = jest.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CreateTransferModal open onOpenChange={onOpenChange} organizationId="org-1" /></QueryClientProvider>)
  const dialog = screen.getByRole("region", { name: formCopy.title })
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument()
  await userEvent.selectOptions(within(dialog).getAllByRole("combobox")[0], "source")
  await userEvent.selectOptions(within(dialog).getAllByRole("combobox")[1], "destination")
  await screen.findByRole("option", { name: /Test item.*10/ })
  await userEvent.selectOptions(within(dialog).getAllByRole("combobox")[3], "item-1")
  await userEvent.type(within(dialog).getByPlaceholderText("0"), "2")
  await userEvent.click(within(dialog).getByRole("button", { name: formCopy.add }))
  await userEvent.type(within(dialog).getByPlaceholderText(formCopy.notesPlaceholder), "Keep this draft note")
  await userEvent.click(within(dialog).getByRole("button", { name: formCopy.create }))
  const alert = await within(dialog).findByRole("alert")
  expect(within(alert).getByText(copy.deniedTitle)).toBeVisible()
  expect(within(alert).getByText(copy.deniedMessage)).toBeVisible()
  expect(onOpenChange).not.toHaveBeenCalled()
  expect(within(dialog).getByPlaceholderText(formCopy.notesPlaceholder)).toHaveValue("Keep this draft note")
  expect(within(dialog).getByDisplayValue("2")).toHaveValue(2)
  expect(within(dialog).getAllByRole("combobox")[0]).toHaveValue("source")
  expect(within(dialog).getAllByRole("combobox")[1]).toHaveValue("destination")
  expect(within(dialog).getByRole("button", { name: formCopy.create })).toBeEnabled()
  expect(mockFormSuccess).not.toHaveBeenCalled()
  expect(mockNotifyError).not.toHaveBeenCalled()
  expect(mockFormError).not.toHaveBeenCalled()
  client.clear()
})

function renderTransfer() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onOpenChange = jest.fn()
  render(<QueryClientProvider client={client}><CreateTransferModal open onOpenChange={onOpenChange} organizationId="org-1" /></QueryClientProvider>)
  return { client, onOpenChange }
}

it("lists source stock beyond ten items, filters by SKU, and clears lines when source changes", async () => {
  const rows = Array.from({ length: 15 }, (_, index) => ({ itemId: `item-${index}`, locationId: "source", quantityAvailable: 10, item: { id: `item-${index}`, name: `Product ${index}`, sku: `SKU-${index}` } }))
  ;(getInventoryLevels as jest.Mock).mockImplementation(async ({ filters }) => ({ success: true, data: filters.locationId === "source" ? rows : [] }))
  const { client } = renderTransfer()
  expect(getInventoryLevels).not.toHaveBeenCalled()
  expect(screen.getByText(en.inventoryTransferCreate.selectSource)).toBeVisible()
  await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "source")
  await screen.findByRole("option", { name: /Product 14/ })
  expect(getInventoryLevels).toHaveBeenCalledWith({ organizationId: "org-1", filters: { locationId: "source", transferEligible: true } })
  await userEvent.type(screen.getByPlaceholderText(en.inventoryTransferCreate.searchPlaceholder), "SKU-14")
  expect(screen.queryByRole("option", { name: /Product 0 / })).not.toBeInTheDocument()
  await userEvent.selectOptions(screen.getAllByRole("combobox")[3], "item-14")
  await userEvent.type(screen.getByPlaceholderText("0"), "2")
  await userEvent.click(screen.getByRole("button", { name: "Add" }))
  expect(screen.getByText("Items to Transfer")).toBeVisible()
  await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "other")
  await screen.findByText(en.inventoryTransferCreate.itemsEmpty)
  expect(screen.queryByText("Items to Transfer")).not.toBeInTheDocument()
  expect(screen.getByPlaceholderText("0")).toHaveValue(null)
  expect(screen.getByRole("button", { name: "Create Transfer" })).toBeDisabled()
  client.clear()
})

it("shows action failures as errors with retry rather than empty stock", async () => {
  ;(getInventoryLevels as jest.Mock).mockResolvedValueOnce({ success: false, error: { message: "internal detail" } })
  const { client } = renderTransfer()
  await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "source")
  expect(await screen.findByRole("alert")).toHaveTextContent(en.inventoryTransferCreate.itemsError)
  expect(screen.queryByText(en.inventoryTransferCreate.itemsEmpty)).not.toBeInTheDocument()
  expect(screen.queryByText("internal detail")).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: "Retry" }))
  await screen.findByRole("option", { name: /Test item/ })
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  client.clear()
})

it("announces loading and distinguishes an unsuccessful search from empty source stock", async () => {
  let resolveStock!: (value: unknown) => void
  ;(getInventoryLevels as jest.Mock).mockReturnValueOnce(new Promise(resolve => { resolveStock = resolve }))
  const { client } = renderTransfer()
  await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "source")
  expect(await screen.findByText(en.inventoryTransferCreate.itemsLoading)).toBeVisible()
  expect(screen.getAllByRole("combobox")[3]).toBeDisabled()
  resolveStock({ success: true, data: [{ itemId: "item-1", locationId: "source", quantityAvailable: 10, item: { id: "item-1", name: "Test item", sku: "ITEM" } }] })
  await screen.findByRole("option", { name: /Test item/ })
  await userEvent.type(screen.getByPlaceholderText(en.inventoryTransferCreate.searchPlaceholder), "missing SKU")
  expect(screen.getByText(en.inventoryTransferCreate.noResults)).toBeVisible()
  expect(screen.queryByText(en.inventoryTransferCreate.itemsEmpty)).not.toBeInTheDocument()
  client.clear()
})

it("does not mutate a line after rejecting an excessive total, and submits the original quantity", async () => {
  ;(createLocationTransfer as jest.Mock).mockResolvedValue({ success: true, data: { message: "Created" } })
  const { client, onOpenChange } = renderTransfer()
  await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "source")
  await userEvent.selectOptions(screen.getAllByRole("combobox")[1], "destination")
  await screen.findByRole("option", { name: /Test item/ })
  for (const quantity of ["8", "5"]) {
    await userEvent.selectOptions(screen.getAllByRole("combobox")[3], "item-1")
    await userEvent.type(screen.getByPlaceholderText("0"), quantity)
    await userEvent.click(screen.getByRole("button", { name: "Add" }))
  }
  expect(screen.getByLabelText("Qty")).toHaveValue(8)
  await userEvent.click(screen.getByRole("button", { name: "Create Transfer" }))
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  expect(createLocationTransfer).toHaveBeenCalledWith({ data: expect.objectContaining({ fromLocationId: "source", toLocationId: "destination", lines: [{ itemId: "item-1", requestedQuantity: 8, notes: undefined }] }) })
  client.clear()
})
