import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { loadInvoiceCorrectionSources, loadInvoiceCorrectionHistory as history, previewInvoiceCorrection, confirmInvoiceCorrection } from "@/services/purchasing/invoice-correction.service"
import { loadInvoiceCorrection, loadInvoiceCorrectionHistory, reviewInvoiceCorrection, submitInvoiceCorrection } from "../invoice-correction.actions"
jest.mock("next/cache",()=>({revalidatePath:jest.fn()}))
jest.mock("@/lib/security/rbac",()=>({requirePermission:jest.fn()}))
jest.mock("@/lib/security/auth-session",()=>({requireSession:jest.fn()}))
jest.mock("@/services/purchasing/invoice-correction.service",()=>({loadInvoiceCorrectionSources:jest.fn(),loadInvoiceCorrectionHistory:jest.fn(),previewInvoiceCorrection:jest.fn(),confirmInvoiceCorrection:jest.fn()}))
const preparation={supplierId:"supplier",invoiceNumber:"INV-1",invoiceDate:"2026-08-10",currency:"XAF",documentReference:"https://example.invalid/source",documentSha256:"a".repeat(64),lines:[{goodsReceiptLineId:"receipt",description:"Goods",quantity:"1",unitCost:"2500",taxRate:"0"}]}
const draft={invoiceId:"invoice",reason:"Correct against the original supplier document",preparation},command={draft,expectedRevision:"a".repeat(64),idempotencyKey:"request-1"},scope={organizationId:"org",actorId:"actor",sessionId:"session",sessionToken:"private-test-token"}
beforeEach(()=>{jest.resetAllMocks();(requirePermission as jest.Mock).mockResolvedValue({orgId:scope.organizationId,userId:scope.actorId});(requireSession as jest.Mock).mockResolvedValue({claims:{tenantId:scope.organizationId,userId:scope.actorId,sessionId:scope.sessionId,sessionToken:scope.sessionToken}})})
test("read, preview and history use only server-derived identity",async()=>{await loadInvoiceCorrection({search:"INV"});await reviewInvoiceCorrection(draft);await loadInvoiceCorrectionHistory({invoiceId:"invoice"});expect(loadInvoiceCorrectionSources).toHaveBeenCalledWith({search:"INV"},scope);expect(previewInvoiceCorrection).toHaveBeenCalledWith(draft,scope);expect(history).toHaveBeenCalledWith({invoiceId:"invoice"},scope)})
test("session tenant mismatch cannot read source",async()=>{(requireSession as jest.Mock).mockResolvedValue({claims:{tenantId:"other",userId:"actor"}});expect((await loadInvoiceCorrection()).success).toBe(false);expect(loadInvoiceCorrectionSources).not.toHaveBeenCalled()})
test("permission denial prevents correction",async()=>{(requirePermission as jest.Mock).mockRejectedValue(new Error("denied"));expect((await submitInvoiceCorrection(command)).success).toBe(false);expect(confirmInvoiceCorrection).not.toHaveBeenCalled()})
test("client authority injection fails before service execution",async()=>{expect((await submitInvoiceCorrection({...command,actorId:"forged"} as typeof command)).success).toBe(false);expect(confirmInvoiceCorrection).not.toHaveBeenCalled()})
test("cache failure does not erase committed correction",async()=>{(confirmInvoiceCorrection as jest.Mock).mockResolvedValue({invoiceId:"invoice",sourceEventId:"proof",replayed:false});(revalidatePath as jest.Mock).mockImplementation(()=>{throw new Error("cache")});expect(await submitInvoiceCorrection(command)).toEqual({success:true,data:{invoiceId:"invoice",sourceEventId:"proof",replayed:false}})})
test.each(["INVOICE_EVIDENCE_REQUIRED","FRESH_AUTH_REQUIRED"] as const)("preserves actionable %s",async code=>{(confirmInvoiceCorrection as jest.Mock).mockRejectedValue(new BusinessRuleError("Review required",code));expect(await submitInvoiceCorrection(command)).toMatchObject({success:false,code})})
