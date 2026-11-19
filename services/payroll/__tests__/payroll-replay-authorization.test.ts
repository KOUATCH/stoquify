import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { reviewPayrollRun, approvePayrollRun, emitPayrollPayslips, postPayrollRun, approveAndPostPayrollRun,
  requestPayrollPaymentBatch, approvePayrollPaymentBatch, releasePayrollPaymentBatch } from "../payroll-control.service"

const now = "2026-10-24T10:01:00Z"
const hash = (value: unknown) => `sha256:${hashBusinessPayload(value)}`
const originalSwitch = process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED
afterAll(() => { if(originalSwitch === undefined) delete process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED; else process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED=originalSwitch })

const cases = [
  ["review", reviewPayrollRun, "REVIEWED", "payroll.runs.review", "reviewPayrollRun"],
  ["approve", approvePayrollRun, "APPROVED", "payroll.runs.approve", "approvePayrollRun"],
  ["emit", emitPayrollPayslips, "EMITTED", "payroll.payslips.emit", "emitPayrollPayslips"],
  ["post", postPayrollRun, "POSTED", "payroll.runs.post", "postPayrollRun"],
  ["legacy", approveAndPostPayrollRun, "POSTED", "payroll.runs.approve", "approveAndPostPayrollRun"],
  ["request payment", requestPayrollPaymentBatch, "DRAFT", "payroll.payments.request", "requestPayrollPaymentBatch"],
  ["approve payment", approvePayrollPaymentBatch, "APPROVED", "payroll.payments.approve", "approvePayrollPaymentBatch"],
  ["release payment", releasePayrollPaymentBatch, "RELEASED", "payroll.payments.release", "releasePayrollPaymentBatch"],
] as const

describe.each(cases)("retained %s authority", (name, action, status, permission, operation) => {
  it.each(["authorized", "revoked", "stale"])("handles %s retry without a new payroll effect", async mode => {
    process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = name === "legacy" ? "false" : "true"
    const input = {organizationId:"org-1",payrollRunId:"run-1",payrollPaymentBatchId:"batch-1",expectedVersion:1,idempotencyKey:"synthetic-replay-key",
      actorId:"actor-1",approvedById:"actor-1",requestedById:"actor-1",releasedById:"actor-1",
      actorPermissions:mode === "revoked" ? [] : [permission],now,lastAuthAt:mode === "stale" ? "2026-10-24T09:00:00Z" : now,
      method:"BANK_TRANSFER",paymentDate:"2026-10-24T00:00:00Z",allocations:[{payslipId:"slip-1",employeeId:"employee-1",amount:100}],}
    let identity: Record<string,unknown> = {operation,payrollRunId:input.payrollRunId,expectedVersion:1,actorId:input.actorId}
    if(name === "review") identity.evidenceHash=null
    else if(name === "approve") Object.assign(identity,{evidenceHash:null,documentHash:null,correlationId:null,metadata:null})
    else identity.documentHash=null
    if(name === "legacy") identity={operation,payrollRunId:"run-1",approvedById:"actor-1"}
    if(name === "request payment") identity={operation,payrollRunId:"run-1",method:input.method,paymentDate:new Date(input.paymentDate).toISOString(),requestedById:"actor-1",bankFileHash:null,documentHash:null,allocations:[{payslipId:"slip-1",employeeId:"employee-1",amount:"100.00"}]}
    if(name === "approve payment" || name === "release payment") identity={operation,payrollPaymentBatchId:"batch-1",[name === "approve payment" ? "approvedById" : "releasedById"]:"actor-1",idempotencyKey:input.idempotencyKey}
    const payloadHash=hash(identity)
    const run={id:"run-1",organizationId:"org-1",runNumber:"synthetic",payrollPeriodId:"period-1",status,version:5,currency:"XAF",netPayableAmount:new Prisma.Decimal(100),
      preparedById:"maker",approvedById:"independent-approver",emittedBusinessEventId:"event-1",ledgerPostingBatchId:"ledger-1",payslips:[],lines:[],metadata:{approvalPayloadHash:payloadHash}}
    const batch={id:"batch-1",status,amount:new Prisma.Decimal(100),currency:"XAF",requestedById:"maker",approvedById:"independent-approver",allocations:[],payrollRun:run,
      metadata:{requestPayloadHash:payloadHash,approvalPayloadHash:payloadHash,releasePayloadHash:payloadHash}}
    const tx={payrollRunTransition:{findUnique:jest.fn().mockResolvedValue({payrollRunId:"run-1",toStatus:status,payloadHash,businessEventId:"event-1"})},
      payrollRun:{findFirst:jest.fn().mockResolvedValue(run),update:jest.fn()},payrollPaymentBatch:{findFirst:jest.fn().mockResolvedValue(batch),create:jest.fn()},auditLog:{create:jest.fn().mockResolvedValue({id:"audit-1"})}}
    const call=()=>action(input as never,tx as never)
    if(mode === "authorized") await expect(call()).resolves.toBeDefined()
    else if(mode === "stale") await expect(call()).rejects.toMatchObject({code:"FRESH_AUTH_REQUIRED"})
    else await expect(call()).rejects.toThrow("not allowed")
    expect(tx.payrollRun.update).not.toHaveBeenCalled()
    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled()
  })
})
