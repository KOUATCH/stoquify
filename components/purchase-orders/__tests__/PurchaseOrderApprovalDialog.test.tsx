import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PurchaseOrderApprovalDialog, purchaseApprovalStorageKey } from "../PurchaseOrderApprovalDialog"
import { approvePurchaseOrder, previewPurchaseOrderApproval } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
let mockUnstableTranslations = false
const mockT = (key: string) => (mockLocale === "fr" ? fr : en).purchaseOrderApproval[key as keyof typeof en.purchaseOrderApproval]
jest.mock("next-intl", () => ({ useTranslations: () => mockUnstableTranslations ? (key: string) => mockT(key) : mockT, useLocale: () => mockLocale }))
jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({ approvePurchaseOrder: jest.fn(), previewPurchaseOrderApproval: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null }))
const preview = { organizationId: "org", actorId: "actor", orderId: "po", orderNumber: "PO-1", revision: "a".repeat(64), requester: "Requester", supplier: "Supplier", location: "Warehouse", currency: "XAF", total: "25000", orderDate: "2026-09-07T00:00:00.000Z", expectedDeliveryDate: null, paymentTerms: "Net 30", notes: "Reviewed terms", shippingCost: "0", taxAmount: "0", discount: "0", requiresFreshAuth: false, lines: [] }
const close = jest.fn(), confirmed = jest.fn()
const show = (orderId: string | null = "po") => render(<PurchaseOrderApprovalDialog orderId={orderId} organizationId="org" actorId="actor" onClose={close} onConfirmed={confirmed} />)
const key = purchaseApprovalStorageKey("org", "actor")
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); mockLocale = "en"; Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "approval-key-001" }); (previewPurchaseOrderApproval as jest.Mock).mockResolvedValue({ success: true, data: preview }); (approvePurchaseOrder as jest.Mock).mockImplementation(async (_id, _org, request) => ({ success: true, data: { id: "po", approvalReceipt: { requestReference: request.idempotencyKey, orderId: "po", reviewedRevision: request.expectedRevision, approvedById: "actor", approvedAt: "2026-09-07T00:00:00.000Z", replayed: false } } })) })
it.each(["en", "fr"] as const)("confirms only a verified matching receipt in %s", async locale => { mockLocale = locale; show(); fireEvent.click(await screen.findByRole("button", { name: mockT("approve") })); expect(await screen.findByText(mockT("recorded"))).toBeVisible(); expect(sessionStorage.getItem(key)).toBeNull(); expect(confirmed).not.toHaveBeenCalled(); fireEvent.click(screen.getAllByRole("button", { name: mockT("close") })[0]); expect(confirmed).toHaveBeenCalledTimes(1) })
it("retains an unknown request across remount and recovers exactly once", async () => { (approvePurchaseOrder as jest.Mock).mockRejectedValueOnce(new Error("Dropped response")); const view=show(); fireEvent.click(await screen.findByRole("button",{name:mockT("approve")})); expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); const request=JSON.parse(sessionStorage.getItem(key)!).request;view.unmount();show(null);fireEvent.click(await screen.findByRole("button",{name:mockT("recover")}));expect(await screen.findByText(mockT("recorded"))).toBeVisible();expect(approvePurchaseOrder).toHaveBeenLastCalledWith("po","org",request);expect(previewPurchaseOrderApproval).toHaveBeenCalledTimes(1) })
it("requires another review after a stale rejection",async()=>{(approvePurchaseOrder as jest.Mock).mockResolvedValue({success:false,code:"CONFLICT",data:null});show();fireEvent.click(await screen.findByRole("button",{name:mockT("approve")}));expect(await screen.findByRole("alert")).toHaveTextContent(mockT("stale"));expect(screen.queryByRole("button",{name:mockT("approve")})).toBeNull();expect(sessionStorage.getItem(key)).toBeNull();fireEvent.click(screen.getByRole("button",{name:mockT("reviewCurrent")}));expect(await screen.findByRole("button",{name:mockT("approve")})).toBeEnabled()})
it("never reports a mismatched receipt as success",async()=>{(approvePurchaseOrder as jest.Mock).mockResolvedValue({success:true,data:{approvalReceipt:{requestReference:"different-request"}}});show();fireEvent.click(await screen.findByRole("button",{name:mockT("approve")}));expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown"));expect(sessionStorage.getItem(key)).not.toBeNull();expect(confirmed).not.toHaveBeenCalled()})
it("verifies a stale session with the existing password action and excludes the password from storage",async()=>{(previewPurchaseOrderApproval as jest.Mock).mockResolvedValue({success:true,data:{...preview,requiresFreshAuth:true}});(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({success:true});show();const password=await screen.findByLabelText(mockT("password"));expect(screen.getByRole("button",{name:mockT("approve")})).toBeDisabled();fireEvent.change(password,{target:{value:"private-password"}});let resolve!: (value: unknown)=>void;(approvePurchaseOrder as jest.Mock).mockImplementation(()=>new Promise(r=>{resolve=r}));fireEvent.click(screen.getByRole("button",{name:mockT("approve")}));await waitFor(()=>expect(approvePurchaseOrder).toHaveBeenCalled());expect(sessionStorage.getItem(key)).not.toContain("private-password");expect(stepUpWithPasswordAction).toHaveBeenCalledWith({password:"private-password"});await act(async()=>resolve({success:false,code:"FORBIDDEN"}));expect(await screen.findByRole("alert")).toHaveTextContent(mockT("denied"))})
it("does not load another actor’s pending request",async()=>{sessionStorage.setItem(purchaseApprovalStorageKey("org","other"),JSON.stringify({orderId:"po-private",request:{expectedRevision:"a".repeat(64),idempotencyKey:"private-key"}}));show(null);await act(async()=>{});expect(screen.queryByRole("dialog")).toBeNull();expect(previewPurchaseOrderApproval).not.toHaveBeenCalled()})
it("does not display a previous actor’s delayed result after account context changes", async () => {
  let resolve!: (value: unknown) => void
  ;(approvePurchaseOrder as jest.Mock).mockImplementation(() => new Promise(r => { resolve = r }))
  const view = show()
  fireEvent.click(await screen.findByRole("button", { name: mockT("approve") }))
  await waitFor(() => expect(approvePurchaseOrder).toHaveBeenCalled())
  view.rerender(<PurchaseOrderApprovalDialog orderId={null} organizationId="org" actorId="other" onClose={close} onConfirmed={confirmed} />)
  await act(async () => resolve({ success: true, data: { approvalReceipt: { requestReference: "approval-key-001", orderId: "po", reviewedRevision: "a".repeat(64), approvedById: "actor", approvedAt: "2026-09-07T00:00:00.000Z", replayed: false } } }))
  expect(screen.queryByText(mockT("recorded"))).toBeNull()
  expect(sessionStorage.getItem(key)).not.toBeNull()
  expect(confirmed).not.toHaveBeenCalled()
})
it("keeps the reviewed state when the localization provider returns a new function", async () => {
  mockUnstableTranslations = true
  try {
    show()
    expect(await screen.findByRole("button", { name: mockT("approve") })).toBeEnabled()
    await act(async () => {})
    expect(previewPurchaseOrderApproval).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: mockT("approve") }))
    expect(await screen.findByText(mockT("recorded"))).toBeVisible()
    expect(previewPurchaseOrderApproval).toHaveBeenCalledTimes(1)
  } finally { mockUnstableTranslations = false }
})
