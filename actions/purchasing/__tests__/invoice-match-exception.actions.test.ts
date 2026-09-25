import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { loadInvoiceMatchExceptionSources, previewInvoiceMatchException, confirmInvoiceMatchException, loadInvoiceMatchExceptionHistory as history } from "@/services/purchasing/invoice-match-exception.service"
import { loadInvoiceMatchException, reviewInvoiceMatchException, submitInvoiceMatchException, loadInvoiceMatchExceptionHistory } from "../invoice-match-exception.actions"
jest.mock("next/cache",()=>({revalidatePath:jest.fn()}))
jest.mock("@/lib/security/rbac",()=>({requirePermission:jest.fn()}))
jest.mock("@/lib/security/auth-session",()=>({requireSession:jest.fn()}))
jest.mock("@/services/purchasing/invoice-match-exception.service",()=>({loadInvoiceMatchExceptionSources:jest.fn(),previewInvoiceMatchException:jest.fn(),confirmInvoiceMatchException:jest.fn(),loadInvoiceMatchExceptionHistory:jest.fn()}))
const draft={kind:"request" as const,invoiceId:"invoice",reason:"Supplier correction",evidenceReference:"https://example.invalid/proof",expiresAt:"2026-10-01T10:00:00Z"},command={draft,expectedRevision:"a".repeat(64),idempotencyKey:"request-1"},scope={organizationId:"org",actorId:"actor",sessionId:"session",sessionToken:"private-test-token"}
beforeEach(()=>{jest.resetAllMocks();(requirePermission as jest.Mock).mockResolvedValue({orgId:"org",userId:"actor"});(requireSession as jest.Mock).mockResolvedValue({claims:{tenantId:"org",userId:"actor",sessionId:"session",sessionToken:"private-test-token"}})})
test("uses server identity for request preview",async()=>{await reviewInvoiceMatchException(draft);expect(previewInvoiceMatchException).toHaveBeenCalledWith(draft,scope);expect(requirePermission).toHaveBeenCalledWith("purchasing.ap.invoice.post",expect.anything())})
test("uses dedicated reviewer permission",async()=>{await loadInvoiceMatchException({kind:"review"});expect(requirePermission).toHaveBeenCalledWith("purchasing.ap.match.review",expect.anything());expect(loadInvoiceMatchExceptionSources).toHaveBeenCalledWith({kind:"review",search:""},scope)})
test("rejects mismatched session scope",async()=>{(requireSession as jest.Mock).mockResolvedValue({claims:{tenantId:"other",userId:"actor"}});expect((await submitInvoiceMatchException(command)).success).toBe(false);expect(confirmInvoiceMatchException).not.toHaveBeenCalled()})
test("rejects injected authority before service invocation",async()=>{expect((await reviewInvoiceMatchException({...draft,organizationId:"other"} as typeof draft)).success).toBe(false);expect(previewInvoiceMatchException).not.toHaveBeenCalled()})
test("reads history through current authority",async()=>{await loadInvoiceMatchExceptionHistory({kind:"request",invoiceId:"invoice"});expect(history).toHaveBeenCalledWith({kind:"request",invoiceId:"invoice"},scope)})
test("cache failure preserves committed result",async()=>{(confirmInvoiceMatchException as jest.Mock).mockResolvedValue({status:"OPEN"});(revalidatePath as jest.Mock).mockImplementation(()=>{throw new Error("cache")});expect(await submitInvoiceMatchException(command)).toEqual({success:true,data:{status:"OPEN"}})})
test.each(["INVOICE_EVIDENCE_REQUIRED","FRESH_AUTH_REQUIRED"] as const)("preserves actionable %s",async code=>{(confirmInvoiceMatchException as jest.Mock).mockRejectedValue(new BusinessRuleError("Review required",code));expect(await submitInvoiceMatchException(command)).toMatchObject({success:false,code})})
