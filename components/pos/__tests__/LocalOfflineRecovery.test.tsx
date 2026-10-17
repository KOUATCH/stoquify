import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { LocalOfflineRecovery } from "../offline/LocalOfflineRecovery"
import { inspectOfflineLocalQueues } from "@/lib/pos/offline-local-queue"
import { useFlushOfflinePOSQueue } from "@/hooks/posHooks/useOfflineSync"
jest.mock("@/lib/pos/offline-local-queue", () => ({ inspectOfflineLocalQueues: jest.fn() }))
jest.mock("@/hooks/posHooks/useOfflineSync", () => ({ useFlushOfflinePOSQueue: jest.fn() }))
const inspect = inspectOfflineLocalQueues as jest.Mock
const flush = jest.fn()
const props = { organizationId: "org", userId: "cashier", locationId: "location", terminalId: "terminal", sessionId: "session", canRead: true, canSend: true, locale: "en" as const }
const queue = { config: { organizationKey: "org", deviceId: "retained-device", locationId: "location", terminalId: "terminal", sessionId: "session" }, pendingCount: 1, acknowledgedCount: 0, uncertainCount: 1, conflictCount: 0 }
beforeEach(() => {
  jest.clearAllMocks()
  inspect.mockResolvedValue([queue]); flush.mockResolvedValue({})
  ;(useFlushOfflinePOSQueue as jest.Mock).mockReturnValue({ mutateAsync: flush, isPending: false, isError: false })
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true })
})
it("discovers unsent evidence by authenticated organization/station and sends the retained queue", async () => {
  render(<LocalOfflineRecovery {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "Send retained evidence" }))
  await waitFor(() => expect(flush).toHaveBeenCalledTimes(1))
  expect(inspect).toHaveBeenCalledWith({ organizationKey: "org", locationId: "location", terminalId: "terminal" })
  expect(useFlushOfflinePOSQueue).toHaveBeenCalledWith(queue.config, "en")
  expect(screen.getByText(/1 awaiting server acknowledgement/)).toBeInTheDocument()
})
it("shows recovery rather than zero when storage cannot be read", async () => {
  inspect.mockRejectedValue(new Error("storage denied"))
  render(<LocalOfflineRecovery {...props} />)
  expect(await screen.findByRole("alert")).toHaveTextContent("cannot be verified")
  expect(screen.queryByText(/No pending evidence found/)).not.toBeInTheDocument()
})
it.each(["offline", "other session", "denied", "conflict"])("retains evidence and disables sending for %s", async state => {
  if (state === "offline") Object.defineProperty(navigator, "onLine", { configurable: true, value: false })
  if (state === "conflict") inspect.mockResolvedValue([{ ...queue, conflictCount: 1 }])
  render(<LocalOfflineRecovery {...props} sessionId={state === "other session" ? "other" : "session"} canSend={state !== "denied"} />)
  expect(await screen.findByRole("button", { name: "Send retained evidence" })).toBeDisabled()
  expect(flush).not.toHaveBeenCalled()
})
it("does not read local records without current transaction access", () => {
  render(<LocalOfflineRecovery {...props} canRead={false} />)
  expect(inspect).not.toHaveBeenCalled()
})
it("distinguishes a loading session from a known different session", async () => {
  render(<LocalOfflineRecovery {...props} sessionId={undefined} />)
  expect(await screen.findByText(/Waiting for the original cashier session/)).toBeInTheDocument()
  expect(screen.getByTestId("local-offline-recovery")).toHaveClass("dashboard-landing-theme", "dark")
  expect(screen.queryByText(/Return to the original cashier session/)).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Send retained evidence" })).toBeDisabled()
})
it("never labels acknowledged evidence as a confirmed payment", async () => {
  inspect.mockResolvedValue([{ ...queue, pendingCount: 0, acknowledgedCount: 1 }])
  render(<LocalOfflineRecovery {...props} />)
  expect(await screen.findByText(/not a confirmed sale or payment/)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Send retained evidence" })).not.toBeInTheDocument()
})
it("renders French recovery and safe errors without exposing transport text", async () => {
  ;(useFlushOfflinePOSQueue as jest.Mock).mockReturnValue({ mutateAsync: flush, isPending: false, isError: true, error: new Error("sensitive") })
  render(<LocalOfflineRecovery {...props} locale="fr" />)
  expect(await screen.findByRole("alert")).toHaveTextContent("Les preuves sont conservées")
  expect(screen.queryByText("sensitive")).not.toBeInTheDocument()
})
it("drops the previous organization's counts immediately on scope change", async () => {
  const view = render(<LocalOfflineRecovery {...props} />)
  await screen.findByText("retained-device")
  inspect.mockReturnValue(new Promise(() => {}))
  view.rerender(<LocalOfflineRecovery {...props} organizationId="other-org" />)
  expect(screen.queryByText("retained-device")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent("Checking")
})
