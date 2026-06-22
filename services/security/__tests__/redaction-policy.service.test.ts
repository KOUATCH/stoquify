import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"

import {
  applyFieldRedactions,
  evaluateRedaction,
} from "../redaction-policy.service"

const payrollWouldBlockDecision: ModuleEntitlementDecision = {
  organizationId: "org-1",
  userId: "owner-1",
  moduleSlug: "payroll",
  surfaceType: "page",
  surface: "/dashboard/payroll",
  accessIntent: "read",
  mode: "observe",
  result: "would_block",
  allowed: true,
  wouldBlock: true,
  reason: "Tenant is not entitled to this module in observe mode.",
  entitlement: null,
  missingDependencies: [],
  rbacWildcardPresent: true,
  rbacWildcardBypassedEntitlement: false,
  hardEnforcementEnabled: false,
  evaluatedAt: "2026-06-20T00:00:00.000Z",
}

describe("Kontava redaction policy service", () => {
  it("redacts payroll person-level amounts when the payroll module is not entitled even for wildcard RBAC", () => {
    const decision = evaluateRedaction({
      field: "netPay",
      category: "payroll_person_amount",
      actorPermissions: ["*"],
      moduleDecision: payrollWouldBlockDecision,
    })

    expect(decision).toMatchObject({
      allowed: false,
      mode: "redact",
      reasonCode: "MODULE_NOT_ENTITLED",
      replacement: "[REDACTED:PAYROLL]",
    })
  })

  it("requires fresh auth before exposing supplier bank details", () => {
    const stale = evaluateRedaction({
      field: "supplier.bank.iban",
      category: "supplier_bank_detail",
      actorPermissions: ["purchasing.supplier.bank.approve"],
      hasFreshAuth: false,
    })
    const fresh = evaluateRedaction({
      field: "supplier.bank.iban",
      category: "supplier_bank_detail",
      actorPermissions: ["purchasing.supplier.bank.approve"],
      hasFreshAuth: true,
    })

    expect(stale.reasonCode).toBe("FRESH_AUTH_REQUIRED")
    expect(stale.mode).toBe("redact")
    expect(fresh.allowed).toBe(true)
  })

  it("masks provider references instead of leaking raw identifiers without reconciliation authority", () => {
    const decision = evaluateRedaction({
      field: "provider.reference",
      category: "payment_provider_reference",
      actorPermissions: ["dashboard.read"],
    })

    const result = applyFieldRedactions(
      { provider: { reference: "MTN-MOMO-REF-123456789" }, amount: 25_000 },
      [decision],
    )

    expect(decision.reasonCode).toBe("MISSING_PERMISSION")
    expect(result.data.provider).toEqual({ reference: expect.stringMatching(/^\*+6789$/) })
    expect(result.redactions).toEqual([
      expect.objectContaining({
        field: "provider.reference",
        mode: "mask",
        policy: "kontava-payment-provider-reference-mask-policy",
      }),
    ])
  })

  it("redacts raw fiscal authority payloads from default assurance projections", () => {
    const decision = evaluateRedaction({
      field: "metadata.authorityResponse",
      category: "fiscal_authority_payload",
      actorPermissions: ["dashboard.read"],
    })

    expect(decision).toMatchObject({
      allowed: false,
      mode: "redact",
      reasonCode: "MISSING_PERMISSION",
      replacement: "[REDACTED:FISCAL]",
      policy: "kontava-fiscal-authority-payload-redaction-policy",
    })
  })
})
