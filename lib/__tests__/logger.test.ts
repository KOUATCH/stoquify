import { logger, setLoggerSink } from "../logger"
afterEach(() => { setLoggerSink(); jest.restoreAllMocks() })
test("default sink emits structured records, and resetting restores it", () => {
  const output = jest.spyOn(console, "warn").mockImplementation(() => {})
  setLoggerSink(() => {}); setLoggerSink()
  logger.warn("test event", { correlationId: "act-test", code: "FORBIDDEN" })
  expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({ level: "warn", message: "test event", context: { correlationId: "act-test", code: "FORBIDDEN" }, timestamp: expect.any(String) })
})
test("redacts nested credentials, personal data and raw error contents before any sink", () => {
  const sink = jest.fn(); setLoggerSink(sink)
  logger.error("Bearer raw-secret person@example.com", { correlationId: "act-1", password: "private-password", nested: { sessionToken: "private-session", email: "private-email", rawPayload: "private-payload" }, err: new Error("private-sql"), url: "postgresql://user:private-db@host/db" })
  const output = JSON.stringify(sink.mock.calls)
  for (const secret of ["raw-secret", "person@example.com", "private-password", "private-session", "private-email", "private-payload", "private-sql", "private-db"]) expect(output).not.toContain(secret)
  expect(output).toContain("act-1")
})
test("bounded cycles and bigint are serializable", () => {
  const sink = jest.fn(); setLoggerSink(sink)
  const context: Record<string, unknown> = { count: BigInt(1) }; context.self = context
  logger.info("bounded", context)
  expect(() => JSON.stringify(sink.mock.calls)).not.toThrow()
  expect(JSON.stringify(sink.mock.calls)).toContain("[TRUNCATED]")
})
test.each([false, true])("sink failure falls back safely (async=%s)", async asynchronous => {
  const output = jest.spyOn(console, "error").mockImplementation(() => {})
  setLoggerSink(() => { if (asynchronous) return Promise.reject(new Error("private")); throw new Error("private") })
  expect(() => logger.error("operation failed", { correlationId: "act-safe" })).not.toThrow()
  await Promise.resolve(); await Promise.resolve()
  expect(JSON.parse(output.mock.calls[0][0]).context).toEqual({ correlationId: "act-safe", logSinkFailed: true })
})
test("unreadable context and unavailable console cannot throw", () => {
  const context = Object.defineProperty({}, "broken", { enumerable: true, get() { throw new Error("private") } })
  jest.spyOn(console, "error").mockImplementation(() => { throw new Error("sink unavailable") })
  expect(() => logger.error("event", context)).not.toThrow()
})
