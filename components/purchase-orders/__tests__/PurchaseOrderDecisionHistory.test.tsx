import { act, fireEvent, render, screen } from "@testing-library/react"
import { PurchaseOrderDecisionHistory } from "../PurchaseOrderDecisionHistory"
import { getPurchaseOrderDecisionHistory } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({ getPurchaseOrderDecisionHistory: jest.fn() }))
const mockT = (key: string) => key
jest.mock("next-intl", () => ({ useTranslations: () => mockT, useLocale: () => "fr" }))
const record = { organizationId: "org", actorId: "actor", orderId: "po", orderNumber: "PO-1", archived: true, hasEarlier: false, decisions: [{ requestReference: "request-001", kind: "archive", recordedAt: "2026-09-07T00:00:00.000Z", actorId: "actor", reason: null }] }
beforeEach(() => { jest.clearAllMocks(); (getPurchaseOrderDecisionHistory as jest.Mock).mockResolvedValue({ success: true, data: record }) })
it("finds retained history by an explicit reference and identifies its scope", async () => {
  render(<PurchaseOrderDecisionHistory organizationId="org" actorId="actor" />)
  expect(getPurchaseOrderDecisionHistory).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText("history.lookup"), { target: { value: "PO-1" } }); fireEvent.click(screen.getByRole("button", { name: "history.find" }))
  expect(await screen.findByText("history.archived")).toBeVisible(); expect(screen.getByText("history.scope")).toBeVisible(); expect(getPurchaseOrderDecisionHistory).toHaveBeenCalledWith("PO-1", "org")
})
it("does not turn a failed or unverified history query into an empty success", async () => {
  ;(getPurchaseOrderDecisionHistory as jest.Mock).mockResolvedValueOnce({ success: false, code: "CONFLICT", data: null })
  render(<PurchaseOrderDecisionHistory orderId="po" organizationId="org" actorId="actor" />)
  expect(await screen.findByRole("alert")).toHaveTextContent("history.unverified"); expect(screen.queryByText("history.empty")).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "history.retry" })); expect(await screen.findByText("PO-1")).toBeVisible()
})
it("does not display an old actor's late history after the account changes", async () => {
  let resolve!: (value: unknown) => void
  ;(getPurchaseOrderDecisionHistory as jest.Mock).mockImplementationOnce(() => new Promise(r => { resolve = r })).mockResolvedValue({ success: false, code: "FORBIDDEN" })
  const view = render(<PurchaseOrderDecisionHistory orderId="po" organizationId="org" actorId="actor" />)
  view.rerender(<PurchaseOrderDecisionHistory orderId="po" organizationId="org" actorId="other" />)
  await act(async () => resolve({ success: true, data: record })); expect(screen.queryByText("PO-1")).toBeNull(); expect(await screen.findByRole("alert")).toHaveTextContent("denied")
})
