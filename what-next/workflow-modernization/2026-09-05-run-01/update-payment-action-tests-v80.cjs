const fs=require('fs'),path=require('path'),assert=require('assert/strict'),file=path.resolve(__dirname,'../../../actions/purchasing/__tests__/ap-control.actions.test.ts');let text=fs.readFileSync(file,'utf8');
text='import { confirmPaymentRequestApproval } from "@/services/purchasing/payment-request.service"\njest.mock("@/services/purchasing/payment-request.service", () => ({ confirmPaymentRequestApproval: jest.fn() }))\n'+text;
const a=text.indexOf('  it("injects the approver ID for supplier payment approval"'),b=text.indexOf('  it("injects only the releaser ID',a);assert.ok(a>=0&&b>a);
text=text.slice(0,a)+`  it("rejects the former approval payload that supplied a requester", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("approver-1", ["purchasing.ap.payment.approve"]))
    const result = await approveSupplierPaymentAction({supplierId:"supplier-1",requestedById:"other",allocations:[]})
    expect(result.success).toBe(false)
    expect(confirmPaymentRequestApproval).not.toHaveBeenCalled()
    expect(mockApproveSupplierPaymentWithControls).not.toHaveBeenCalled()
  })
  it("binds approval to a retained request and the current verified session", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("approver-1", ["purchasing.ap.payment.approve"]))
    mockRequireFreshAuth.mockResolvedValue({claims:{sessionId:"session-1",sessionToken:"session-token",lastAuthAt:new Date().toISOString()}})
    ;(confirmPaymentRequestApproval as jest.Mock).mockResolvedValue({paymentRequestId:"p",status:"APPROVED",replayed:false})
    const command={paymentRequestId:"p",expectedRevision:"a".repeat(64),idempotencyKey:"approval-1"}
    expect((await approveSupplierPaymentAction(command)).success).toBe(true)
    expect(confirmPaymentRequestApproval).toHaveBeenCalledWith(command,{organizationId:"org-1",actorId:"approver-1",sessionId:"session-1",sessionToken:"session-token"})
    expect(mockRequireFreshAuth).toHaveBeenCalledTimes(1)
  })

`+text.slice(b);fs.writeFileSync(file,text);
