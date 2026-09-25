import { db } from "@/prisma/db"
import { archiveTerminalForManagement } from "../terminal-management.service"
import { terminalConfigurationRevision } from "../terminal-configuration-revision"

jest.mock("@/prisma/db", () => ({ db: { pOSStation: { findFirst: jest.fn(), updateMany: jest.fn() } } }))

describe("terminal archive competing with shift opening", () => {
  const station = db.pOSStation as unknown as { findFirst: jest.Mock; updateMany: jest.Mock }
  const terminal = { id: "terminal-a", organizationId: "org-a", name: "Till", terminalNumber: "POS-1", locationId: "store-a", isActive: true, hasCashDrawer: false, updatedAt: new Date("2026-09-13T12:00:00Z"), currentSessionId: null, currentSession: null }
  const revision = terminalConfigurationRevision(terminal)
  beforeEach(() => {
    jest.resetAllMocks()
    station.findFirst.mockResolvedValue(terminal)
    station.updateMany.mockResolvedValue({ count: 1 })
  })
  it("rejects another tenant's terminal before any mutation", async () => {
    station.findFirst.mockResolvedValue(null)
    await expect(archiveTerminalForManagement("org-b", "terminal-a", revision)).rejects.toThrow("Terminal not found")
    expect(station.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "terminal-a", organizationId: "org-b" } }))
    expect(station.updateMany).not.toHaveBeenCalled()
  })
  it("rejects a shift opened after the initial availability read", async () => {
    station.updateMany.mockResolvedValue({ count: 0 })
    await expect(archiveTerminalForManagement("org-a", "terminal-a", revision)).rejects.toThrow("changed since")
    const { currentSession: _session, ...configuration } = terminal
    expect(station.updateMany).toHaveBeenCalledWith({ where: configuration, data: { isActive: false, updatedAt: expect.any(Date) } })
  })
  it("deactivates the reviewed version and rejects its stale replay", async () => {
    await expect(archiveTerminalForManagement("org-a", "terminal-a", revision)).resolves.toEqual({ id: "terminal-a" })
    station.findFirst.mockResolvedValue({ ...terminal, isActive: false })
    await expect(archiveTerminalForManagement("org-a", "terminal-a", revision)).rejects.toThrow("changed since")
    expect(station.updateMany).toHaveBeenCalledTimes(1)
  })
  it("rejects an already linked active shift", async () => {
    station.findFirst.mockResolvedValue({ ...terminal, currentSessionId: "shift-a", currentSession: { status: "ACTIVE" } })
    await expect(archiveTerminalForManagement("org-a", "terminal-a", revision)).rejects.toThrow("active session")
    expect(station.updateMany).not.toHaveBeenCalled()
  })
  it.each(["", "a".repeat(64)])("rejects missing or stale confirmation %s before mutation", async expectedRevision => {
    await expect(archiveTerminalForManagement("org-a", "terminal-a", expectedRevision)).rejects.toThrow("changed since")
    expect(station.updateMany).not.toHaveBeenCalled()
  })
})
