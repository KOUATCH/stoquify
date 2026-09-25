jest.mock("../payment-request-evidence",()=>({readVerifiedPaymentApproval:jest.fn()}))
import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readVerifiedPaymentApproval } from "../payment-request-evidence"
import { readVerifiedPaymentExecution, paymentExecutionKey } from "../payment-release-evidence"
import { paymentReleaseCommandSchema } from "../payment-release-contracts"
const command={draft:{paymentRequestId:"p",executionReference:"BANK/TXN-1",executedAt:"2026-09-08T12:01:00Z",evidenceUri:"https://example.invalid/executed",evidenceSha256:"a".repeat(64)},expectedRevision:"b".repeat(64),idempotencyKey:"record-1"}
const payment={id:"p",method:"BANK_TRANSFER",requestedById:"maker",approvedById:"checker",approvedAt:new Date("2026-09-08T12:00:00Z"),releasedById:"recorder",releasedAt:new Date("2026-09-08T12:02:00Z"),postedBusinessEventId:"release",ledgerPostingBatchId:"batch"}
const approvalEvent={id:"approval",payloadHash:"approval-hash"}
const tx={businessEvent:{findMany:jest.fn(),findFirst:jest.fn()}}
let payload:Record<string,unknown>,event:Record<string,unknown>,release:Record<string,unknown>
const check=()=>readVerifiedPaymentExecution(tx as unknown as Prisma.TransactionClient,"org","p")
function refresh(){event.payloadHash=hashBusinessPayload(payload);tx.businessEvent.findMany.mockResolvedValue([event]);tx.businessEvent.findFirst.mockResolvedValue(release)}
beforeEach(()=>{
  jest.clearAllMocks();jest.mocked(readVerifiedPaymentApproval).mockResolvedValue({payment:{...payment},approvalEvent,draft:{paymentDate:"2026-09-08"}} as never)
  const releasePayload={ledgerPostingBatchId:"batch",paymentTransactionId:"transaction"}
  release={id:"release",schemaVersion:1,eventSource:"INTERNAL",status:"APPLIED",processedAt:new Date(),actorId:"recorder",payload:releasePayload,payloadHash:hashBusinessPayload(releasePayload)}
  payload={version:1,...command.draft,actorId:"recorder",commandHash:hashBusinessPayload({command,actorId:"recorder"}),idempotencyKey:command.idempotencyKey,reviewedRevision:command.expectedRevision,recordedAt:payment.releasedAt.toISOString(),approvalEventId:approvalEvent.id,approvalEventHash:approvalEvent.payloadHash,releaseEventId:release.id,releaseEventHash:release.payloadHash,paymentTransactionId:"transaction"}
  event={id:"execution",schemaVersion:1,eventSource:"INTERNAL",status:"APPLIED",processedAt:new Date(),actorId:"recorder",occurredAt:payment.releasedAt,documentHash:`sha256:${command.draft.evidenceSha256}`,idempotencyKey:paymentExecutionKey(payment.method,command.draft.executionReference),payload};refresh()
})
it("verifies distinct request, approval, execution and recording evidence",async()=>{expect((await check()).command).toEqual(command);expect(readVerifiedPaymentApproval).toHaveBeenCalledWith(tx,"org","p")})
it.each(["executedAt","evidenceUri","evidenceSha256","idempotencyKey"])("rejects missing %s even with a recomputed event hash",async field=>{delete payload[field];refresh();await expect(check()).rejects.toMatchObject({code:"REVIEW_REQUIRED"})})
it.each(["approvalEventHash","approvalEventId","commandHash","releaseEventHash","paymentTransactionId"])("rejects a mismatched %s link",async field=>{payload[field]="changed";refresh();await expect(check()).rejects.toThrow("requires review")})
it("requires the document hash to match the execution evidence",async()=>{event.documentHash="sha256:"+"c".repeat(64);refresh();await expect(check()).rejects.toThrow("requires review")})
it("rejects duplicate execution records",async()=>{tx.businessEvent.findMany.mockResolvedValue([event,event]);await expect(check()).rejects.toThrow("requires review")})
it("propagates database failures rather than inventing missing evidence",async()=>{tx.businessEvent.findMany.mockRejectedValue(new Error("database failed"));await expect(check()).rejects.toThrow("database failed")})
it("does not accept caller identity or changed approved terms in the command",()=>{for(const extra of [{organizationId:"other"},{releasedById:"other"},{paymentDate:"2026-09-09"},{allocations:[]}])expect(paymentReleaseCommandSchema.safeParse({...command,...extra}).success).toBe(false)})
it("requires an offset-bearing execution timestamp and web evidence link",()=>{for(const patch of [{executedAt:"2026-09-08T12:01:00"},{evidenceUri:"file:///private/record"},{evidenceSha256:"unhashed"}])expect(paymentReleaseCommandSchema.safeParse({...command,draft:{...command.draft,...patch}}).success).toBe(false)})
