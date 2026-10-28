import { BusinessRuleError } from "@/services/_shared/action-errors"

import {
  allocatePurchaseDocumentNumber,
  PURCHASE_DOCUMENT_TYPE,
} from "../purchase-document-number.service"

describe("purchase document number allocation", () => {
  it("allocates the first PO from one tenant-scoped atomic upsert", async () => {
    const tx = {
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextValue: 2 }),
      },
    }

    await expect(allocatePurchaseDocumentNumber(tx as never, {
      organizationId: "org-1",
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_ORDER,
    })).resolves.toBe("PO-000001")

    expect(tx.documentSequence.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_documentType_scopeKey: {
          organizationId: "org-1",
          documentType: "PURCHASE_ORDER",
          scopeKey: "GLOBAL",
        },
      },
      create: {
        organizationId: "org-1",
        documentType: "PURCHASE_ORDER",
        scopeKey: "GLOBAL",
        nextValue: 2,
      },
      update: {
        nextValue: { increment: 1 },
      },
      select: {
        nextValue: true,
      },
    })
  })

  it("formats the value returned by an existing GRN sequence", async () => {
    const tx = {
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextValue: 43 }),
      },
    }

    await expect(allocatePurchaseDocumentNumber(tx as never, {
      organizationId: "org-2",
      documentType: PURCHASE_DOCUMENT_TYPE.GOODS_RECEIPT,
    })).resolves.toBe("GR-000042")
  })

  it("allocates purchase return evidence from its own tenant sequence", async () => {
    const tx = {
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextValue: 8 }),
      },
    }

    await expect(allocatePurchaseDocumentNumber(tx as never, {
      organizationId: "org-1",
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_RETURN,
    })).resolves.toBe("PR-000007")
  })

  it("returns a typed business-rule failure when the persisted sequence is invalid", async () => {
    const tx = {
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextValue: 1 }),
      },
    }

    await expect(allocatePurchaseDocumentNumber(tx as never, {
      organizationId: "org-1",
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_ORDER,
    })).rejects.toBeInstanceOf(BusinessRuleError)
  })
})
