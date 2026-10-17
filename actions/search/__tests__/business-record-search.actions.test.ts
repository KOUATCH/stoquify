jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn() }))
jest.mock("@/services/search/business-record-search.service", () => ({ searchBusinessRecords: jest.fn() }))
import { requireRbacContext } from "@/lib/security/rbac"
import { searchBusinessRecords } from "@/services/search/business-record-search.service"
import { searchBusinessRecordsAction } from "../business-record-search.actions"

beforeEach(() => jest.clearAllMocks())
it("derives authority from the current server session", async () => {
  const actor = { orgId: "org-a", userId: "actor" }
  ;(requireRbacContext as jest.Mock).mockResolvedValue(actor)
  ;(searchBusinessRecords as jest.Mock).mockResolvedValue({ query: "sku", hits: [], partialDomains: [] })
  await searchBusinessRecordsAction("sku", "fr")
  expect(searchBusinessRecords).toHaveBeenCalledWith(actor, "sku", "fr")
})
it("does not query records for an expired session or expose its error", async () => {
  ;(requireRbacContext as jest.Mock).mockRejectedValue(new Error("private auth failure"))
  expect(await searchBusinessRecordsAction("sku", "en")).toEqual({ success: false })
  expect(searchBusinessRecords).not.toHaveBeenCalled()
})
