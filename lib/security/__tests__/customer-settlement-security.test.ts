import {
  hasRbacPermission,
  isKnownPermission,
  permissionRisk,
} from "@/lib/security/rbac-permissions"
import {
  evaluateSensitiveAction,
  getSensitiveActionPolicy,
} from "@/services/controls/sensitive-action.service"

const NOW = new Date("2026-08-08T10:00:00.000Z")

describe("customer settlement collection security", () => {
  it("maps the canonical collection permission to the legacy customer-payment capability", () => {
    expect(isKnownPermission("finance.receivables.collect")).toBe(true)
    expect(
      hasRbacPermission(
        ["CUSTOMER_PAYMENTS_PROCESS"],
        "finance.receivables.collect",
      ),
    ).toBe(true)
  })

  it("classifies collection as critical and denies implicit wildcard authority", () => {
    expect(permissionRisk("finance.receivables.collect")).toBe("crit")
    expect(hasRbacPermission(["*"], "finance.receivables.collect")).toBe(false)
    expect(
      hasRbacPermission(
        ["*", "finance.receivables.collect"],
        "finance.receivables.collect",
      ),
    ).toBe(true)
  })

  it("requires explicit permission and five-minute fresh authentication", () => {
    expect(getSensitiveActionPolicy("customer.settlement.collect")).toMatchObject({
      permission: "finance.receivables.collect",
      riskTier: "critical",
      requiredAssurance: "L1",
      freshAuthMaxAgeSeconds: 300,
    })

    expect(
      evaluateSensitiveAction({
        action: "customer.settlement.collect",
        organizationId: "org-1",
        actorId: "actor-1",
        actorPermissions: [],
        lastAuthAt: NOW,
        now: NOW,
      }),
    ).toMatchObject({ allowed: false, reasonCode: "MISSING_PERMISSION" })

    expect(
      evaluateSensitiveAction({
        action: "customer.settlement.collect",
        organizationId: "org-1",
        actorId: "actor-1",
        actorPermissions: ["finance.receivables.collect"],
        lastAuthAt: new Date("2026-08-08T09:54:59.000Z"),
        now: NOW,
      }),
    ).toMatchObject({ allowed: false, reasonCode: "FRESH_AUTH_REQUIRED" })

    expect(
      evaluateSensitiveAction({
        action: "customer.settlement.collect",
        organizationId: "org-1",
        actorId: "actor-1",
        actorPermissions: ["finance.receivables.collect"],
        lastAuthAt: new Date("2026-08-08T09:55:00.000Z"),
        now: NOW,
      }),
    ).toMatchObject({ allowed: true, reasonCode: "ALLOWED" })
  })
})

describe("customer settlement reversal security", () => {
  it("requires an explicit critical permission without the collection alias", () => {
    expect(isKnownPermission("finance.receivables.reverse")).toBe(true)
    expect(permissionRisk("finance.receivables.reverse")).toBe("crit")
    expect(
      hasRbacPermission(
        ["CUSTOMER_PAYMENTS_PROCESS"],
        "finance.receivables.reverse",
      ),
    ).toBe(false)
    expect(hasRbacPermission(["*"], "finance.receivables.reverse")).toBe(false)
    expect(
      hasRbacPermission(
        ["finance.receivables.reverse"],
        "finance.receivables.reverse",
      ),
    ).toBe(true)
  })

  it("requires L1 freshness and independent approval", () => {
    expect(getSensitiveActionPolicy("customer.settlement.reverse")).toMatchObject({
      permission: "finance.receivables.reverse",
      riskTier: "critical",
      requiredAssurance: "L1",
      freshAuthMaxAgeSeconds: 300,
      blockSelfApproval: true,
    })

    const base = {
      action: "customer.settlement.reverse" as const,
      organizationId: "org-1",
      actorId: "reviewer-1",
      actorPermissions: ["finance.receivables.reverse"],
      now: NOW,
    }

    expect(
      evaluateSensitiveAction({
        ...base,
        subjectActorId: "reviewer-1",
        lastAuthAt: NOW,
      }),
    ).toMatchObject({ allowed: false, reasonCode: "SELF_APPROVAL_BLOCKED" })
    expect(
      evaluateSensitiveAction({
        ...base,
        subjectActorId: "collector-1",
        lastAuthAt: new Date("2026-08-08T09:54:59.999Z"),
      }),
    ).toMatchObject({ allowed: false, reasonCode: "FRESH_AUTH_REQUIRED" })
    expect(
      evaluateSensitiveAction({
        ...base,
        subjectActorId: "collector-1",
        lastAuthAt: new Date("2026-08-08T10:00:00.001Z"),
      }),
    ).toMatchObject({ allowed: false, reasonCode: "FRESH_AUTH_REQUIRED" })
    expect(
      evaluateSensitiveAction({
        ...base,
        subjectActorId: "collector-1",
        lastAuthAt: new Date("2026-08-08T09:55:00.000Z"),
      }),
    ).toMatchObject({ allowed: true, reasonCode: "ALLOWED" })
  })
})
