import { db } from "@/prisma/db"
import { createTerminalForManagement, updateTerminalForManagement } from "../terminal-management.service"
import { terminalConfigurationRevision } from "../terminal-configuration-revision"

jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(),
  location: { findFirst: jest.fn() },
  pOSStation: { findFirst: jest.fn(), findMany: jest.fn() },
} }))

const terminal = {
  id: "terminal-a", organizationId: "org-a", name: "Till", terminalNumber: "POS-1", locationId: "store-a",
  isActive: true, hasCashDrawer: false, updatedAt: new Date("2026-09-13T12:00:00Z"), createdAt: new Date("2026-09-13T12:00:00Z"),
  currentSessionId: null, currentSession: null, cashDrawers: [],
  location: { name: "Store", code: "STORE", type: "STORE" },
  _count: { sessions: 0, salesOrders: 0, cashDrawers: 0 },
}
const input = { name: "Till", terminalNumber: "POS-1", locationId: "store-a", isActive: true, hasCashDrawer: false }
const tx = {
  location: { findFirst: jest.fn() },
  pOSStation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
}
let reachedCommit: boolean

beforeEach(() => {
  jest.resetAllMocks()
  reachedCommit = false
  ;(db.location.findFirst as jest.Mock).mockResolvedValue({ id: "store-a", code: "STORE" })
  ;(db.pOSStation.findFirst as jest.Mock).mockResolvedValue(null)
  tx.location.findFirst.mockResolvedValue({ id: "store-a", code: "STORE" })
  tx.pOSStation.findFirst.mockResolvedValueOnce(terminal).mockResolvedValue(null)
  tx.pOSStation.create.mockResolvedValue(terminal)
  tx.pOSStation.update.mockResolvedValue(terminal)
  tx.pOSStation.findMany.mockResolvedValue([terminal])
  ;(db.$transaction as jest.Mock).mockImplementation(async handler => {
    const result = await handler(tx)
    reachedCommit = true
    return result
  })
})

it.each(["create", "update"])("hydrates the %s result before the transaction callback completes", async operation => {
  const result = operation === "create"
    ? await createTerminalForManagement("org-a", input)
    : await updateTerminalForManagement("org-a", "terminal-a", { ...input, expectedRevision: terminalConfigurationRevision(terminal) })
  expect(result).toMatchObject({ id: "terminal-a", organizationId: "org-a" })
  expect(tx.pOSStation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "terminal-a", organizationId: "org-a" } }))
  expect(db.pOSStation.findMany).not.toHaveBeenCalled()
  expect(reachedCommit).toBe(true)
})

it.each(["create", "update"])("does not reach the %s commit boundary when result hydration fails", async operation => {
  tx.pOSStation.findMany.mockRejectedValue(new Error("Read unavailable"))
  const result = operation === "create"
    ? createTerminalForManagement("org-a", input)
    : updateTerminalForManagement("org-a", "terminal-a", { ...input, expectedRevision: terminalConfigurationRevision(terminal) })
  await expect(result).rejects.toThrow("Read unavailable")
  expect(reachedCommit).toBe(false)
  expect(db.pOSStation.findMany).not.toHaveBeenCalled()
})
