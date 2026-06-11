import { Prisma } from "@prisma/client"

import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
  evaluateSensitiveAction,
} from "../sensitive-action.service"

describe("sensitive action fraud-control backbone", () => {
  it("blocks self-approval for critical reconciliation sign-off", () => {
    const decision = evaluateSensitiveAction({
      action: "payment.reconciliation.sign",
      actorId: "user-1",
      organizationId: "org-1",
      actorPermissions: ["payments.reconciliation.sign"],
      subjectActorId: "user-1",
      lastAuthAt: Date.now(),
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "SELF_APPROVAL_BLOCKED",
    })
  })

  it("requires fresh authentication for critical actions", () => {
    const decision = evaluateSensitiveAction({
      action: "accounting.period.close",
      actorId: "controller-1",
      organizationId: "org-1",
      actorPermissions: ["accounting.period.close"],
      lastAuthAt: Date.now() - 301_000,
      now: Date.now(),
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "FRESH_AUTH_REQUIRED",
    })
    expect(() => assertSensitiveActionAllowed(decision)).toThrow("Fresh authentication required")
  })

  it("audits denied attempts in the caller transaction with detector inputs", async () => {
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    } as unknown as Prisma.TransactionClient

    const decision = await evaluateAndAuditSensitiveAction(tx, {
      action: "pos.refund.process",
      actorId: "cashier-1",
      organizationId: "org-1",
      actorPermissions: ["pos.transactions.refund"],
      subjectActorId: "cashier-1",
      resourceType: "SalesOrder",
      resourceId: "sale-1",
      amount: new Prisma.Decimal(25_000),
      currency: "XAF",
      lastAuthAt: Date.now(),
    })

    expect(decision.allowed).toBe(false)
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "SalesOrder",
          entityId: "sale-1",
          action: "POS_REFUND_CONTROL_DENIED",
          organizationId: "org-1",
          userId: "cashier-1",
          changes: expect.objectContaining({
            reasonCode: "SELF_APPROVAL_BLOCKED",
            allowed: false,
            detectorInputs: expect.objectContaining({
              detectorSignals: expect.arrayContaining(["refund_spike", "refund_own_sale"]),
            }),
          }),
        }),
      }),
    )
  })

  it("gates and logs sensitive exports with watermark evidence", async () => {
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-export-1" }),
      },
    } as unknown as Prisma.TransactionClient

    const decision = await evaluateAndAuditSensitiveAction(tx, {
      action: "accounting.export",
      actorId: "controller-1",
      organizationId: "org-1",
      actorPermissions: ["accounting.exports.create"],
      lastAuthAt: Date.now(),
      exportContext: {
        scope: "TRIAL_BALANCE",
        filtersHash: "sha256:filters",
        rowCount: 125,
        fileType: "csv",
        sensitivity: "statutory",
        watermarkId: "wm-1",
      },
    })

    expect(decision.allowed).toBe(true)
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_EXPORT_CONTROL",
          changes: expect.objectContaining({
            exportControl: true,
            exportContext: expect.objectContaining({
              filtersHash: "sha256:filters",
              rowCount: 125,
              watermarkId: "wm-1",
            }),
          }),
        }),
      }),
    )
  })
})
