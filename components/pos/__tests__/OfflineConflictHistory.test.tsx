import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { OfflineConflictHistory } from "../offline/OfflineConflictHistory"
import { listOfflineConflictHistoryAction } from "@/actions/pos/offline-review.actions"
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }))
jest.mock("@/actions/pos/offline-review.actions", () => ({ listOfflineConflictHistoryAction: jest.fn(), listOfflineConflictTimelineAction: jest.fn() }))
const list = listOfflineConflictHistoryAction as jest.Mock, at = "2026-09-13T10:00:00.000Z"
const data = { items: [{ id: "first", status: "RESOLVED", device: "Terminal", createdAt: at }], total: 2, nextCursor: { at, id: "first" }, observedAt: at }
const access = { organizationId: "org", userId: "reviewer", canRead: true, canReview: false }
function mount() { const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const onSelect = jest.fn(); render(<QueryClientProvider client={queryClient}><OfflineConflictHistory access={access} locationId="location" terminalId="terminal" onSelect={onSelect} disabled={false} /></QueryClientProvider>); return onSelect }
beforeEach(() => { jest.clearAllMocks(); list.mockResolvedValue({ success: true, data }) })
it("passes only scoped filters and cursor, and opens the selected record for a reader", async () => {
  const selected = mount(); fireEvent.click(await screen.findByRole("button", { name: "open · first" })); expect(selected).toHaveBeenCalledWith("first")
  expect(list).toHaveBeenCalledWith({ locationId: "location", terminalId: "terminal", status: "OPEN", reference: "", cursor: null })
  list.mockResolvedValue({ success: true, data: { ...data, items: [{ ...data.items[0], id: "second" }], nextCursor: null } })
  fireEvent.click(screen.getByRole("button", { name: "olderHistory" })); await screen.findByRole("button", { name: "open · second" })
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: data.nextCursor })); expect(screen.getByRole("button", { name: "olderHistory" })).toBeDisabled()
})
it("does not present failed record loading as an empty result and offers retry", async () => {
  list.mockResolvedValue({ success: false, code: "DATABASE_UNAVAILABLE" }); mount(); await screen.findByText("historyFailed")
  expect(screen.queryByText("historyEmpty")).not.toBeInTheDocument(); list.mockResolvedValue({ success: true, data }); fireEvent.click(screen.getByRole("button", { name: "retryHistory" })); await screen.findByRole("button", { name: "open · first" })
})
it("changes status and exact reference without carrying the old page cursor", async () => {
  mount(); await screen.findByRole("button", { name: "open · first" }); fireEvent.change(screen.getByLabelText("historyFilter"), { target: { value: "CLOSED" } }); await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: "CLOSED", cursor: null })))
  fireEvent.change(screen.getByLabelText("historyReference"), { target: { value: "exact-reference" } }); fireEvent.click(screen.getByRole("button", { name: "searchHistory" })); await screen.findByRole("button", { name: "open · first" })
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: "CLOSED", reference: "exact-reference", cursor: null })))
})
