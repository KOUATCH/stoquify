import { pendingSaleKey, readPendingSale, removePendingSale, savePendingSale, type PendingSale } from "../pending-sale"

const pending: PendingSale = { version: 1, organizationId: "org-1", actorId: "cashier-1", request: { clientCommitId: "original-1", salesOrderId: "sale-1", locationId: "loc-1", terminalId: "till-1", sessionId: "shift-1", tenders: [{ method: "CASH", amount: 100 }] } }
beforeEach(() => sessionStorage.clear())
it("retains the original request across reads and isolates tenant/cashier scopes", () => {
  const input: PendingSale = JSON.parse(JSON.stringify(pending))
  savePendingSale(sessionStorage, input)
  input.request.tenders[0].amount = 500
  expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).toEqual(pending)
  expect(readPendingSale(sessionStorage, "org-2", "cashier-1")).toBeNull()
  expect(readPendingSale(sessionStorage, "org-1", "cashier-2")).toBeNull()
  removePendingSale(sessionStorage, "org-1", "cashier-2")
  expect(readPendingSale(sessionStorage, "org-1", "cashier-1")).toEqual(pending)
})
it("does not silently drop malformed or mis-scoped recovery records", () => {
  const key = pendingSaleKey("org-1", "cashier-1")
  for (const raw of ["broken", JSON.stringify({ ...pending, actorId: "other" }), JSON.stringify({ ...pending, request: {} })]) {
    sessionStorage.setItem(key, raw)
    expect(() => readPendingSale(sessionStorage, "org-1", "cashier-1")).toThrow()
    expect(sessionStorage.getItem(key)).toBe(raw)
  }
})
it("rejects an unconfirmed write before a caller submits", () => {
  const storage = { setItem: jest.fn(), getItem: jest.fn(() => null) } as unknown as Storage
  expect(() => savePendingSale(storage, pending)).toThrow("could not be retained")
})
