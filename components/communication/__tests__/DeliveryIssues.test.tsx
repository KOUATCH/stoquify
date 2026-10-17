import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import DeliveryIssues from "../DeliveryIssues"
import { readDeliveryIssuesAction } from "@/actions/communication/delivery-issues.actions"
import type { DeliveryIssuesResult } from "@/services/communication/delivery-issues-contracts"
jest.mock("@/actions/communication/delivery-issues.actions", () => ({ readDeliveryIssuesAction: jest.fn() }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
const action = readDeliveryIssuesAction as jest.Mock
const data: DeliveryIssuesResult = { checkedAt: "2026-10-04T12:00:00Z", pages: [
  { source: "statements", availability: "ready", rows: [{ id: "delivery", reference: "ST-001", recipient: "c•••@•••", channel: "EMAIL", state: "unknown", attempts: 2, reason: "uncertain", recordedAt: "2026-10-01T12:00:00Z", checkedAt: "2026-10-04T12:00:00Z", sourceHref: "/dashboard/customers/customer" }], nextCursor: "delivery", windowLimited: false },
  { source: "invitations", availability: "ready", rows: [], nextCursor: null, windowLimited: false },
] }
beforeEach(() => { jest.resetAllMocks(); action.mockResolvedValue({ success: true, data }) })

it("shows source status and guarded handoffs without send or retry controls", async () => {
  render(<DeliveryIssues locale="en" />)
  await screen.findByText("ST-001")
  expect(screen.getByText("Unknown outcome", { selector: "span" })).toBeInTheDocument()
  expect(screen.getByText(/Invitation transport is currently disabled/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Open source workflow/ })).toHaveAttribute("href", "/en/dashboard/customers/customer")
  expect(screen.queryByRole("button", { name: /send|retry/i })).not.toBeInTheDocument()
  expect(action).toHaveBeenCalledTimes(1)
})
it("applies filters explicitly and resets pagination when they change", async () => {
  render(<DeliveryIssues locale="en" />)
  await screen.findByText("ST-001")
  fireEvent.click(screen.getByRole("button", { name: /Older records\s*:\s*Customer statements/ }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ statementCursor: "delivery" })))
  await screen.findByText("ST-001")
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "accepted" } })
  expect(action).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith({ source: "all", state: "accepted", channel: "all" }))
})
it("preserves partial failures and announces sparse scan windows", async () => {
  action.mockResolvedValue({ success: true, data: { ...data, pages: [
    { ...data.pages[0], rows: [], nextCursor: "last-scanned", windowLimited: true },
    { ...data.pages[1], availability: "unavailable" },
  ] } })
  render(<DeliveryIssues locale="en" />)
  expect(await screen.findByText(/More records remain to inspect/)).toBeInTheDocument()
  expect(screen.getByText(/This source is unavailable/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Older records\s*:\s*Customer statements/ })).toBeEnabled()
})
it("does not let an older request replace a newer filter response", async () => {
  let resolveOld!: (value: unknown) => void
  action.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  render(<DeliveryIssues locale="en" />)
  fireEvent.change(screen.getByLabelText("Source"), { target: { value: "invitations" } })
  action.mockResolvedValue({ success: true, data: { ...data, pages: [data.pages[1]] } })
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }))
  await screen.findByText(/Invitation transport is currently disabled/)
  await act(async () => resolveOld({ success: true, data }))
  expect(screen.queryByText("ST-001")).not.toBeInTheDocument()
})
it("renders French filters, explanations and links", async () => {
  render(<DeliveryIssues locale="fr" />)
  await screen.findByText("ST-001")
  expect(screen.getByRole("heading", { name: "Problèmes de livraison" })).toBeInTheDocument()
  expect(screen.getByLabelText("État")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Ouvrir le parcours source/ })).toHaveAttribute("href", "/fr/dashboard/customers/customer")
})
it("clears stale records on refresh and shows a recoverable failure", async () => {
  render(<DeliveryIssues locale="en" />)
  await screen.findByText("ST-001")
  action.mockRejectedValue(new Error("network"))
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
  await screen.findByRole("alert")
  expect(screen.queryByText("ST-001")).not.toBeInTheDocument()
})
