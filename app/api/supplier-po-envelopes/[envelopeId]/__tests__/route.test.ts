import { GET } from "../route"
import { POST } from "../proposals/route"
import { getPublicSupplierPoEnvelope, submitSupplierPoProposal } from "@/services/purchase-order/supplier-po-acknowledgement.service"
import { NotFoundError } from "@/services/_shared/action-errors"
jest.mock("next/server", () => ({ NextResponse: { json: (body: unknown, init?: { status: number }) => ({ status: init?.status ?? 200, headers: new Headers(), json: async () => body }) } }))
jest.mock("@/services/purchase-order/supplier-po-acknowledgement.service", () => ({ getPublicSupplierPoEnvelope: jest.fn(), submitSupplierPoProposal: jest.fn() }))
jest.mock("@/lib/error-handling/route-response", () => ({ jsonErrorEnvelopeResponse: (error: { status?: number; name?: string }) => ({ status: error.status ?? (error.name === "ZodError" ? 400 : 500), headers: new Headers(), json: async () => ({ success: false }) }) }))
const params = { params: Promise.resolve({ envelopeId: "envelope" }) }, command = { proposalType: "ACCEPT", quantityChanges: [], note: null, idempotencyKey: "supplier-request-1", correlationId: "supplier-correlation-1" }
const request = (body: unknown = command, token = "signed-token") => ({ url: "http://localhost/api/supplier-po-envelopes/envelope?token=" + token, headers: new Headers(), json: async () => body }) as Request
function privacy(response: { headers: Headers }) { expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0"); expect(response.headers.get("Referrer-Policy")).toBe("no-referrer"); expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff") }
beforeEach(() => { jest.clearAllMocks(); (getPublicSupplierPoEnvelope as jest.Mock).mockResolvedValue({ envelopeId: "envelope" }); (submitSupplierPoProposal as jest.Mock).mockResolvedValue({ proposalId: "proposal", replayed: false }) })
it("returns private success and replay responses", async () => {
  privacy(await GET(request(), params)); privacy(await POST(request(), params))
  ;(submitSupplierPoProposal as jest.Mock).mockResolvedValue({ proposalId: "proposal", replayed: true })
  const replay = await POST(request(), params); expect(replay.status).toBe(200); privacy(replay)
})
it("keeps missing and revoked token denials private", async () => {
  for (const handler of [GET, POST]) { const missing = await handler(request(command, ""), params); expect(missing.status).toBe(404); privacy(missing) }
  ;(getPublicSupplierPoEnvelope as jest.Mock).mockRejectedValue(new NotFoundError("Unavailable")); (submitSupplierPoProposal as jest.Mock).mockRejectedValue(new NotFoundError("Unavailable"))
  privacy(await GET(request(), params)); privacy(await POST(request(), params))
})
it("rejects injected scope and excess quantity precision before invoking the service", async () => {
  for (const body of [{ ...command, organizationId: "other" }, { ...command, token: "other" }, { ...command, proposalType: "REQUEST_CHANGE", quantityChanges: [{ purchaseOrderLineId: "line", requestedQuantity: "8.1234" }], note: "Quantity changed" }]) { const response = await POST(request(body), params); expect(response.status).toBe(400); privacy(response) }
  expect(submitSupplierPoProposal).not.toHaveBeenCalled()
})
it("preserves privacy for malformed JSON and query failure", async () => {
  privacy(await POST({ ...request(), json: async () => { throw new Error("bad JSON") } } as Request, params))
  ;(getPublicSupplierPoEnvelope as jest.Mock).mockRejectedValue(new Error("database unavailable"))
  const response = await GET(request(), params); expect(response.status).toBe(500); privacy(response)
  expect(await response.json()).toEqual({ success: false })
})
