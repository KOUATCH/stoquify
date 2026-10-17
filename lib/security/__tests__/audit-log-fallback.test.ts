jest.mock("@/prisma/db", () => ({ db: { auditLog: { create: jest.fn() } } }))
import { db } from "@/prisma/db"
import { setLoggerSink } from "@/lib/logger"
import { logSecurityEvent, SecurityEventType } from "../audit-log"
const sink = jest.fn()
beforeEach(() => { jest.clearAllMocks(); setLoggerSink(sink) })
afterEach(() => setLoggerSink())
test("organization-less events reach the sink without private details", async () => {
  await logSecurityEvent({ type: SecurityEventType.LOGIN_FAILED, correlationId: "auth-1", details: { password: "private" } })
  expect(db.auditLog.create).not.toHaveBeenCalled()
  expect(sink).toHaveBeenCalledWith(expect.objectContaining({ level: "warn", context: expect.objectContaining({ type: "LOGIN_FAILED", correlationId: "auth-1" }) }))
  expect(JSON.stringify(sink.mock.calls)).not.toContain("private")
})
test("failed audit storage emits correlated safe evidence without throwing", async () => {
  jest.mocked(db.auditLog.create).mockRejectedValue(new Error("private-database-query"))
  await expect(logSecurityEvent({ type: SecurityEventType.PERMISSION_DENIED, organizationId: "org", correlationId: "auth-2" })).resolves.toBeUndefined()
  expect(sink).toHaveBeenCalledWith(expect.objectContaining({ level: "error", context: expect.objectContaining({ correlationId: "auth-2" }) }))
  expect(JSON.stringify(sink.mock.calls)).not.toContain("private-database-query")
})
test("successful audit writes preserve details and bind explicit correlation", async () => {
  jest.mocked(db.auditLog.create).mockResolvedValue({} as never)
  await logSecurityEvent({ type: SecurityEventType.PERMISSION_GRANTED, organizationId: "org", details: { permission: "read" }, correlationId: "auth-3" })
  expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ changes: { permission: "read", correlationId: "auth-3" } }) }))
  expect(sink).not.toHaveBeenCalled()
})
