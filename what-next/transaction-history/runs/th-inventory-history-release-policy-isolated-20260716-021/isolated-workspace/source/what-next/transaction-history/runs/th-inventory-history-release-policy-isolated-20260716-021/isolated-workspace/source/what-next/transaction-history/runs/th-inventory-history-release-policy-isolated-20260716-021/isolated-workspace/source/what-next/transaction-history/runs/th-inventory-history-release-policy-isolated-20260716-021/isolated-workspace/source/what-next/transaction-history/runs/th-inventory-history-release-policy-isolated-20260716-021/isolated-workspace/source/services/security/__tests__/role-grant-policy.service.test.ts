import { adminPermissions } from "@/config/permissions"
import { evaluateRoleGrantPolicy } from "../role-grant-policy.service"

const grantAuthority = ["users.invite", "users.roles.assign"]

describe("role grant policy", () => {
  it("rejects actors without role-assignment authority", () => {
    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: ["users.invite", "dashboard.read"],
      targetRole: {
        organizationId: "org-1",
        permissions: ["dashboard.read"],
      },
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "MISSING_GRANT_AUTHORITY",
      risk: "crit",
      deniedPermissions: [{ permission: "users.roles.assign", risk: "crit" }],
    })
  })

  it("rejects target roles containing a wildcard", () => {
    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: [...grantAuthority, "dashboard.read"],
      targetRole: {
        organizationId: "org-1",
        permissions: ["dashboard.read", "*"],
      },
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "TARGET_ROLE_WILDCARD",
      deniedPermissions: [{ permission: "*", risk: "crit" }],
    })
  })

  it("rejects target permissions above the actor's explicit grant ceiling", () => {
    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: [...grantAuthority, "dashboard.read", "*"],
      targetRole: {
        organizationId: "org-1",
        permissions: ["dashboard.read", "accounting.period.close"],
      },
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "ACTOR_GRANT_CEILING_EXCEEDED",
      deniedPermissions: [{ permission: "accounting.period.close", risk: "crit" }],
    })
  })

  it("rejects a target role owned by another tenant", () => {
    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: [...grantAuthority, "dashboard.read"],
      targetRole: {
        organizationId: "org-2",
        permissions: ["dashboard.read"],
      },
    })

    expect(decision).toMatchObject({
      allowed: false,
      reasonCode: "CROSS_TENANT_ROLE",
      risk: "crit",
    })
  })

  it("allows a same-tenant role within the actor's explicit grant ceiling", () => {
    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: [...grantAuthority, "dashboard.read", "inventory.read"],
      targetRole: {
        organizationId: "org-1",
        permissions: ["dashboard.read", "inventory.read"],
      },
    })

    expect(decision).toEqual({
      allowed: true,
      reasonCode: "ROLE_GRANT_ALLOWED",
      risk: "crit",
      deniedPermissions: [],
      safeMessage: null,
    })
  })

  it("allows a new administrator template to grant a canonical non-wildcard role", () => {
    const administratorTemplatePermissions = ["*", ...adminPermissions]

    expect(administratorTemplatePermissions).toEqual(
      expect.arrayContaining(["*", "users.invite", "users.roles.assign"]),
    )

    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: administratorTemplatePermissions,
      targetRole: {
        organizationId: "org-1",
        permissions: ["dashboard.read", "users.invite", "users.roles.assign"],
      },
    })

    expect(decision).toMatchObject({
      allowed: true,
      reasonCode: "ROLE_GRANT_ALLOWED",
      deniedPermissions: [],
    })
  })
})
