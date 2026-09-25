/** @jest-environment node */
import { readAPHistorySourceRevision, type APHistoryRevisionClient } from "../ap-history-revision"
const models=['supplierInvoice','supplierPayment','supplier','supplierBankAccount','supplierPaymentAllocation','supplierCreditNote','supplierLedgerEntry'] as const
function client() { return Object.fromEntries(models.map(model=>[model,{findMany:jest.fn().mockResolvedValue([{id:'one',updatedAt:new Date('2026-08-01'),amount:'1.25'}])}])) as unknown as APHistoryRevisionClient }
it("binds all seven source families to the trusted tenant without date/status filters that hide moved records", async()=>{
 const c=client(),first=await readAPHistorySourceRevision(c,'org-1');expect(first).toMatch(/^[a-f0-9]{64}$/);expect(await readAPHistorySourceRevision(c,'org-1')).toBe(first)
 for(const model of models)expect(c[model].findMany).toHaveBeenCalledWith(expect.objectContaining({where:{organizationId:'org-1'},orderBy:{id:'asc'}}))
})
it.each(models)('changes its revision when %s changes even without a parent timestamp',async model=>{
 const c=client(),first=await readAPHistorySourceRevision(c,'org-1');(c[model].findMany as jest.Mock).mockResolvedValue([{id:'one',updatedAt:new Date('2026-08-01'),amount:'2.50'}]);expect(await readAPHistorySourceRevision(c,'org-1')).not.toBe(first)
})
it('detects deletion and does not turn a failed source read into a valid revision',async()=>{
 const c=client(),first=await readAPHistorySourceRevision(c,'org-1');(c.supplierInvoice.findMany as jest.Mock).mockResolvedValue([]);expect(await readAPHistorySourceRevision(c,'org-1')).not.toBe(first);(c.supplierLedgerEntry.findMany as jest.Mock).mockRejectedValue(new Error('ledger read unavailable'));await expect(readAPHistorySourceRevision(c,'org-1')).rejects.toThrow('ledger read unavailable')
})
