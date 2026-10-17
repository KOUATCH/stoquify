import { calculateDraftInvoiceTotals, draftInvoiceRepairBlockers } from "../systematic-reseed-financial-repair";

describe("synthetic draft invoice repair", () => {
  const safe = {
    id: "rds_org_001_supplier_invoice_001", status: "DRAFT",
    hasPostedOrApprovedEvidence: false, hasHistoricalDerivatives: false,
    hasReceiptsOrApprovalEvidence: false, paymentStatuses: ["DRAFT"],
    pendingAllocatedAmount: "1017", correctedTotal: "1118.70",
  };
  it("uses Decimal arithmetic for fractional quantities and rounds tax per line", () => {
    const result = calculateDraftInvoiceTotals([{ id: "line", quantity: "1.1", unitCost: "1017", taxRate: "19.25" }], "0");
    expect(result.subtotal.toFixed(2)).toBe("1118.70");
    expect(result.taxAmount.toFixed(2)).toBe("215.35");
    expect(result.total.toFixed(2)).toBe("1334.05");
  });
  it("rejects impossible quantity and excessive discounts", () => {
    expect(() => calculateDraftInvoiceTotals([{id:"x",quantity:0,unitCost:2,taxRate:0}],0)).toThrow();
    expect(() => calculateDraftInvoiceTotals([{id:"x",quantity:1,unitCost:2,taxRate:0}],3)).toThrow();
  });
  it("allows an unreleased partial payment plan below corrected total", () => {
    expect(draftInvoiceRepairBlockers(safe)).toEqual([]);
  });
  it.each([
    [{id:"customer-real-invoice"},"NOT_IDENTIFIED_SYNTHETIC_INVOICE"],
    [{status:"POSTED"},"NOT_DRAFT"],
    [{hasPostedOrApprovedEvidence:true},"POSTED_OR_APPROVED_EVIDENCE"],
    [{hasHistoricalDerivatives:true},"HISTORICAL_DERIVATIVES"],
    [{hasReceiptsOrApprovalEvidence:true},"RECEIPT_OR_MATCH_APPROVAL_EVIDENCE"],
    [{paymentStatuses:["RELEASED"]},"NON_DRAFT_PAYMENT_ALLOCATION"],
    [{pendingAllocatedAmount:"2000"},"PENDING_ALLOCATIONS_EXCEED_CORRECTED_TOTAL"],
  ])("fails closed for protected financial evidence %o", (override, blocker) => {
    expect(draftInvoiceRepairBlockers({...safe,...override})).toContain(blocker);
  });
});
