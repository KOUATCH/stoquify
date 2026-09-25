import { getTerminalManagementErrorMessage } from "../useTerminalManagement"
jest.mock("@/actions/pos/terminal-management.actions", () => ({}))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: jest.fn() }))

describe("terminal recovery copy", () => {
  it("explains current-session denial in French", () => {
    expect(getTerminalManagementErrorMessage(new Error("Cannot deactivate terminal with an active session"), "fr")).toBe("Clôturez la session active avant de désactiver ce terminal.")
  })
  it("does not tell the user an unknown outcome was a confirmed failure", () => {
    expect(getTerminalManagementErrorMessage(new Error("private transport detail"), "en")).toContain("could not be confirmed")
    expect(getTerminalManagementErrorMessage(new Error("private transport detail"), "fr")).not.toContain("private transport detail")
  })
  it("distinguishes an already saved change from a rejected edit", () => {
    expect(getTerminalManagementErrorMessage(new Error("Terminal was created but could not be reloaded"), "en")).toContain("was saved")
    expect(getTerminalManagementErrorMessage(new Error("Cannot move terminal with operating history; create a terminal at the new location"), "fr")).toContain("historique")
  })
})
