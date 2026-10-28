import { Prisma } from "@prisma/client"

import {
  auditMoatGuardDecision,
  evaluateMoatGuard,
} from "../moat-guard.service"

describe("Kontava moat guard service", () => {
  it("does not let wildcard RBAC bypass enforced module entitlement rules", () => {
    const decision = evaluateMoatGuard({
      organizationId: "org-1",
      userId: "admin-1",
      actorPermissions: ["*"],
      moduleSlug: "payroll",
      requestedModules: ["Inventory", "POS"],
      moduleMode: "enforce",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      accessIntent: "read",
    })

    expect(decision.allowed).toBe(false)
    expect(decision.result).toBe("deny")
    expect(decision.actions).toContain("require_entitlement")
    expect(decision.rbacWildcardPresent).toBe(true)
    expect(decision.rbacWildcardBypassedEntitlement).toBe(false)
  })

  it("does not let wildcard RBAC bypass partner consent", () => {
    const decision = evaluateMoatGuard({
      organizationId: "org-1",
      userId: "admin-1",
      actorPermissions: ["*"],
      surfaceType: "export",
      surface: "partner.evidence.export",
      accessIntent: "export",
      requiresConsent: true,
      consent: { granted: false, scope: "partner:evidence" },
    })

    expect(decision.allowed).toBe(false)
    expect(decision.actions).toContain("require_consent")
    expect(decision.consent).toMatchObject({
      required: true,
      granted: false,
      scope: "partner:evidence",
    })
  })

  it("keeps maker-checker denial from sensitive actions inside the composite guard", () => {
    const decision = evaluateMoatGuard({
      organizationId: "org-1",
      userId: "payroll-1",
      actorPermissions: ["payroll.runs.approve"],
      surfaceType: "action",
      surface: "payroll.run.approve",
      accessIntent: "write",
      sensitiveAction: "payroll.run.approve",
      subjectActorId: "payroll-1",
      lastAuthAt: Date.now(),
    })

    expect(decision.allowed).toBe(false)
    expect(decision.actions).toContain("require_maker_checker")
    expect(decision.sensitiveActionDecision).toMatchObject({
      allowed: false,
      reasonCode: "SELF_APPROVAL_BLOCKED",
    })
  })

  it("allows access with protected-field redaction instead of returning hidden raw values", () => {
    const decision = evaluateMoatGuard({
      organizationId: "org-1",
      userId: "operator-1",
      actorPermissions: ["dashboard.read"],
      moduleSlug: "payment_reconciliation",
      requestedModules: ["Payment reconciliation", "Accounting", "Finance"],
      surfaceType: "page",
      surface: "/dashboard/finance/reconciliation",
      accessIntent: "read",
      redactionRequests: [
        {
          field: "provider.reference",
          category: "payment_provider_reference",
        },
      ],
    })

    expect(decision.allowed).toBe(true)
    expect(decision.result).toBe("redacted")
    expect(decision.actions).toContain("mask")
    expect(decision.redactionDecisions[0]).toMatchObject({
      allowed: false,
      mode: "mask",
      reasonCode: "MISSING_PERMISSION",
    })
  })

  it("audits denied composite guard decisions without raw sensitive payloads", async () => {
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-guard-1" }),
      },
    } as unknown as Prisma.TransactionClient

    const decision = evaluateMoatGuard({
      organizationId: "org-1",
      userId: "treasury-1",
      actorPermissions: ["payments.export"],
      surfaceType: "export",
      surface: "payment.export",
      accessIntent: "export",
      exportRequest: {
        action: "payment.export",
        resourceType: "PaymentExport",
        resourceId: "export-1",
        exportContext: {
          scope: "PAYMENT_RECONCILIATION",
          filtersHash: "sha256:payments",
          rowCount: 42,
          fileType: "xlsx",
          sensitivity: "financial",
        },
      },
      lastAuthAt: Date.now(),
    })

    await auditMoatGuardDecision(tx, decision)

    expect(decision.reasonCode).toBeUndefined()
    expect(decision.allowed).toBe(false)
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MOAT_SECURITY_GUARD_DENIED",
          changes: expect.objectContaining({
            exportReasonCode: "WATERMARK_REQUIRED",
            actions: expect.arrayContaining(["require_watermark"]),
            rbacWildcardBypassedEntitlement: false,
          }),
        }),
      }),
    )
  })
})
