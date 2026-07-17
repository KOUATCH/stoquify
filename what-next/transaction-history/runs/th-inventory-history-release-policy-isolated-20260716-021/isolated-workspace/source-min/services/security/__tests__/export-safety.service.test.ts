import { Prisma } from "@prisma/client"

import {
  auditExportSafetyDecision,
  buildExportWatermark,
  evaluateExportSafety,
} from "../export-safety.service"

describe("Kontava export safety service", () => {
  it("requires fresh authentication before controlled accounting exports", () => {
    const decision = evaluateExportSafety({
      action: "accounting.export",
      actorId: "controller-1",
      organizationId: "org-1",
      actorPermissions: ["accounting.exports.create"],
      lastAuthAt: Date.now() - 301_000,
      now: Date.now(),
      exportContext: {
        scope: "TRIAL_BALANCE",
        filtersHash: "sha256:filters",
        rowCount: 128,
        fileType: "csv",
        sensitivity: "statutory",
        watermarkId: "wm-export-1",
      },
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "FRESH_AUTH_REQUIRED",
      safeMessage: "Fresh authentication required.",
    })
  })

  it("requires a supplied watermark before releasing controlled exports", () => {
    const decision = evaluateExportSafety({
      action: "payment.export",
      actorId: "treasury-1",
      organizationId: "org-1",
      actorPermissions: ["payments.export"],
      lastAuthAt: Date.now(),
      exportContext: {
        scope: "PAYMENT_RECONCILIATION",
        filtersHash: "sha256:payments",
        rowCount: 42,
        fileType: "xlsx",
        sensitivity: "financial",
      },
    })

    expect(decision.allowed).toBe(false)
    expect(decision.reasonCode).toBe("WATERMARK_REQUIRED")
    expect(decision.exportContext.watermarkId).toMatch(/^wm_[a-f0-9]{24}$/)
  })

  it("allows and audits watermarked controlled exports", async () => {
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-export-1" }),
      },
    } as unknown as Prisma.TransactionClient

    const watermarkId = buildExportWatermark({
      organizationId: "org-1",
      actorId: "controller-1",
      scope: "TRIAL_BALANCE",
      filtersHash: "sha256:filters",
      rowCount: 25,
      fileType: "csv",
      sensitivity: "statutory",
      issuedAt: "2026-06-20T00:00:00.000Z",
    })
    const decision = evaluateExportSafety({
      action: "accounting.export",
      actorId: "controller-1",
      organizationId: "org-1",
      actorPermissions: ["accounting.exports.create"],
      lastAuthAt: Date.now(),
      exportContext: {
        scope: "TRIAL_BALANCE",
        filtersHash: "sha256:filters",
        rowCount: 25,
        fileType: "csv",
        sensitivity: "statutory",
        watermarkId,
      },
    })

    await auditExportSafetyDecision(tx, decision)

    expect(decision.allowed).toBe(true)
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CONTROLLED_EXPORT_ALLOWED",
          organizationId: "org-1",
          userId: "controller-1",
          changes: expect.objectContaining({
            reasonCode: "ALLOWED",
            exportContext: expect.objectContaining({ watermarkId }),
          }),
        }),
      }),
    )
  })
})
