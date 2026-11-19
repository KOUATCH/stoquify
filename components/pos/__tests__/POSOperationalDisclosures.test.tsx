import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OfflineSyncStatusStrip } from "../offline/OfflineSyncStatusStrip"
import { LocalOfflineRecovery } from "../offline/LocalOfflineRecovery"
import { useOfflineSyncDashboard, useFlushOfflinePOSQueue } from "@/hooks/posHooks/useOfflineSync"
import { inspectOfflineLocalQueues } from "@/lib/pos/offline-local-queue"

jest.mock("@/hooks/posHooks/useOfflineSync", () => ({ useOfflineSyncDashboard: jest.fn(), useFlushOfflinePOSQueue: jest.fn() }))
jest.mock("@/lib/pos/offline-local-queue", () => ({ inspectOfflineLocalQueues: jest.fn() }))
jest.mock("../offline/OfflineConflictReview", () => ({ OfflineConflictReview: () => <div>Original conflict evidence</div> }))

const access = { organizationId: "org", userId: "cashier", canRead: true, canReview: true }
const query = useOfflineSyncDashboard as jest.Mock
const inventory = inspectOfflineLocalQueues as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  inventory.mockResolvedValue([])
  ;(useFlushOfflinePOSQueue as jest.Mock).mockReturnValue({ isPending: false, isError: false, mutateAsync: jest.fn() })
})

it("keeps the close blocker and counts visible while collapsing conflict details", () => {
  const refetch = jest.fn()
  query.mockReturnValue({ isLoading: false, isError: false, refetch, data: {
    summary: { deviceCount: 1, openConflictCount: 1, pendingEventCount: 1, closeBlockerCount: 1, stalePolicyDeviceCount: 0 }, conflicts: [],
  } })
  render(<OfflineSyncStatusStrip access={access} locationId="location" terminalId="terminal" compact />)
  const details = screen.getByTestId("pos-offline-status")
  expect(details).not.toHaveAttribute("open")
  expect(details.querySelector("summary")).toHaveTextContent("Offline close blocked")
  expect(details.querySelector("summary")).toHaveTextContent("1 pending · 1 conflicts · 1 blockers")
  ;(details as HTMLDetailsElement).open = true
  expect(screen.getByText(/Shift close is blocked/)).toBeVisible()
  expect(screen.getByText(/do not take the payment again/)).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Review conflicts" }))
  expect(screen.getByText("Original conflict evidence")).toBeVisible()
  expect(refetch).not.toHaveBeenCalled()
})

it("does not describe an enrolled device as missing when there are no blockers", () => {
  query.mockReturnValue({ isLoading: false, isError: false, data: {
    summary: { deviceCount: 1, openConflictCount: 0, pendingEventCount: 0, closeBlockerCount: 0, stalePolicyDeviceCount: 0 }, conflicts: [],
  } })
  render(<OfflineSyncStatusStrip access={access} locationId="location" terminalId="terminal" compact />)
  expect(screen.getByTestId("pos-offline-status").querySelector("summary")).toHaveTextContent("Offline device enrolled")
  expect(screen.queryByText("No enrolled offline device for this terminal.")).not.toBeInTheDocument()
})

it("hides routine empty local evidence but keeps unconfirmed evidence expanded and retained", async () => {
  const props = { organizationId: "org", userId: "cashier", locationId: "location", terminalId: "terminal", sessionId: "session", canRead: true, canSend: true, locale: "en" as const, compact: true, hideEmpty: true }
  const { rerender } = render(<LocalOfflineRecovery {...props} />)
  await waitFor(() => expect(screen.queryByTestId("local-offline-recovery")).not.toBeInTheDocument())
  inventory.mockResolvedValue([{ config: { deviceId: "device", sessionId: "session" }, pendingCount: 1, uncertainCount: 1, conflictCount: 1, acknowledgedCount: 0 }])
  rerender(<LocalOfflineRecovery {...props} terminalId="other-terminal" />)
  const queue = await screen.findByTestId("local-offline-queue")
  expect(queue).toBeVisible()
  expect(queue).toHaveTextContent("unconfirmed attempts")
  expect(screen.getByRole("button", { name: "Send retained evidence" })).toBeDisabled()
  expect((useFlushOfflinePOSQueue as jest.Mock).mock.results.at(-1)?.value.mutateAsync).not.toHaveBeenCalled()
})
