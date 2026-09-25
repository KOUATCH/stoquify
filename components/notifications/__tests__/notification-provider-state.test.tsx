import { act, fireEvent, render, screen } from "@testing-library/react"
import { NotificationProvider, useNotifications } from "../NotificationProvider"

jest.unmock("@/components/notifications/NotificationProvider")
jest.mock("../NotificationSystem", () => ({ NotificationSystem: () => null }))
jest.mock("@/lib/error-handling/notification-integration", () => ({ setupErrorNotificationIntegration: () => ({ teardown: () => {} }) }))

function Probe() {
  const state = useNotifications()
  return <>
    <output data-testid="sound">{JSON.stringify({ value: state.soundEnabled, type: typeof state.soundEnabled })}</output>
    <output data-testid="messages">{JSON.stringify(state.notifications)}</output>
    <output data-testid="storage">{state.soundPreferenceStatus}</output>
    <button onClick={state.toggleSound}>Toggle</button>
    <button onClick={() => state.addNotification({ id: "external", title: "Delivery failed", message: "Retry through the delivery workflow.", type: "error", sound: false, channel: "email", deliveryState: "failed" })}>External notice</button>
    <button onClick={() => state.markAsRead("external")}>Read one</button>
    <button onClick={state.markAllAsRead}>Read all</button>
  </>
}
const mount = () => render(<NotificationProvider><Probe /></NotificationProvider>)
const sound = () => JSON.parse(screen.getByTestId("sound").textContent!)
const messages = () => JSON.parse(screen.getByTestId("messages").textContent!)
beforeEach(() => localStorage.clear())
afterEach(() => jest.restoreAllMocks())

it("loads an existing false preference without writing a transient true preference", () => {
  localStorage.setItem("notification-sound-enabled", "false")
  const write = jest.spyOn(Storage.prototype, "setItem")
  mount()
  expect(sound()).toEqual({ value: false, type: "boolean" })
  expect(write).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Toggle" }))
  expect(sound()).toEqual({ value: true, type: "boolean" })
  expect(localStorage.getItem("notification-sound-enabled")).toBe("true")
})

it.each(['"false"', 'null', '{}', '[]', '1'])("rejects the stored non-boolean %s", value => {
  localStorage.setItem("notification-sound-enabled", value)
  mount()
  expect(sound()).toEqual({ value: true, type: "boolean" })
})

it.each(["Read one", "Read all"])("%s acknowledges the local notice without inventing external recipient read evidence", action => {
  mount()
  fireEvent.click(screen.getByRole("button", { name: "External notice" }))
  fireEvent.click(screen.getByRole("button", { name: action }))
  expect(messages()[0].readAt).toEqual(expect.any(String))
  expect(messages()[0].deliveryState).toBe("failed")
})

it("keeps the tab usable and reports a failed save, then allows a successful retry", () => {
  mount()
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Unavailable", "QuotaExceededError") })
  fireEvent.click(screen.getByRole("button", { name: "Toggle" }))
  expect(sound()).toEqual({ value: false, type: "boolean" })
  expect(screen.getByTestId("storage")).toHaveTextContent("session_only")
  write.mockRestore()
  fireEvent.click(screen.getByRole("button", { name: "Toggle" }))
  expect(screen.getByTestId("storage")).toHaveTextContent("saved")
  expect(localStorage.getItem("notification-sound-enabled")).toBe("true")
})

it("handles denied reads without writing a default over an existing preference", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError") })
  const write = jest.spyOn(Storage.prototype, "setItem")
  mount()
  expect(sound()).toEqual({ value: true, type: "boolean" })
  expect(screen.getByTestId("storage")).toHaveTextContent("session_only")
  expect(write).not.toHaveBeenCalled()
})

it("adopts a valid preference change or removal from another tab without echoing a write", () => {
  mount()
  localStorage.setItem("notification-sound-enabled", "false")
  const write = jest.spyOn(Storage.prototype, "setItem")
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "notification-sound-enabled", newValue: "false" })))
  expect(sound()).toEqual({ value: false, type: "boolean" })
  localStorage.removeItem("notification-sound-enabled")
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "notification-sound-enabled", newValue: null })))
  expect(sound()).toEqual({ value: true, type: "boolean" })
  expect(screen.getByTestId("storage")).toHaveTextContent("default")
  expect(write).not.toHaveBeenCalled()
})
