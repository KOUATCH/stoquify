import { webcrypto } from "node:crypto"
import { TextEncoder } from "node:util"
import { emptyStatementResponse, prepareStatementResponse, readStatementResponse, statementResponseStorageKey, writeStatementResponse } from "../statement-recipient-request"

beforeEach(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true })
  Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder, configurable: true })
})
const draft = { actionType: "DISPUTE" as const, requestedAmount: "12.00", customerReceivableDocumentId: "document-1", promisedFor: "", note: "Disputed quantity" }
it("accepts a French decimal comma without accepting thousands or excess precision", () => {
  expect(prepareStatementResponse({ ...draft, requestedAmount: "12,50" }).requestedAmount).toBe("12.50")
  expect(() => prepareStatementResponse({ ...draft, requestedAmount: "1,000" })).toThrow()
})
it("scopes recovery to both statement and issued token without retaining the token", async () => {
  const key = await statementResponseStorageKey("statement-1", "private-link-one")
  expect(key).not.toContain("private-link-one")
  expect(key).not.toBe(await statementResponseStorageKey("statement-1", "private-link-two"))
  expect(key).not.toBe(await statementResponseStorageKey("statement-2", "private-link-one"))
})
it("restores exact command details even when the separate draft was altered", () => {
  const command = prepareStatementResponse(draft)
  const retained = readStatementResponse({ getItem: () => JSON.stringify({ version: 1, command, draft: { ...draft, requestedAmount: "99.00" } }) }, "scope")
  expect(retained.command).toEqual(command)
  expect(retained.draft.requestedAmount).toBe("12.00")
})
it("does not discard corrupt pending evidence or silently create another identity", () => {
  expect(() => readStatementResponse({ getItem: () => "corrupt" }, "scope")).toThrow()
  expect(() => readStatementResponse({ getItem: () => JSON.stringify({ ...emptyStatementResponse(), command: {} }) }, "scope")).toThrow()
})
it("reports a persistence failure before submission can proceed", () => {
  const value = { version: 1 as const, draft, command: prepareStatementResponse(draft) }
  expect(() => writeStatementResponse({ setItem: () => { throw new Error("Storage unavailable") } }, "scope", value)).toThrow("Storage unavailable")
})
