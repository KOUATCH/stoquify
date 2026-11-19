import { adminPermissions } from "@/config/permissions"
import { evaluateRoleGrantPolicy } from "../role-grant-policy.service"

const grantAuthority = ["users.invite", "users.roles.assign"]

describe("role grant policy", () => {
  it.each(["roles.permissions.assign", "roles.permissions.remove", "admin.role.assign"])("cannot grant %s through user-role assignment's shared legacy alias", permission => {
    expect(evaluateRoleGrantPolicy({ actorOrganizationId: "org-1", actorPermissions: grantAuthority, targetRole: { code: "reader", organizationId: "org-1", permissions: [permission] } })).toMatchObject({ allowed: false, reasonCode: "ACTOR_GRANT_CEILING_EXCEEDED" })
  })
  it("cannot grant the broad legacy alias from a single canonical operation", () => {
    expect(evaluateRoleGrantPolicy({ actorOrganizationId: "org-1", actorPermissions: grantAuthority, targetRole: { code: "reader", organizationId: "org-1", permissions: ["ASSIGN_ROLES"] } })).toMatchObject({ allowed: false, reasonCode: "ACTOR_GRANT_CEILING_EXCEEDED" })
  })
  it("does not infer user-role assignment from permission editing authority", () => {
    expect(evaluateRoleGrantPolicy({ actorOrganizationId: "org-1", actorPermissions: ["users.invite", "roles.permissions.assign"], targetRole: { code: "reader", organizationId: "org-1", permissions: [] } })).toMatchObject({ allowed: false, reasonCode: "MISSING_GRANT_AUTHORITY" })
  })
  it("preserves an explicitly stored legacy role-management grant", () => {
    expect(evaluateRoleGrantPolicy({ actorOrganizationId: "org-1", actorPermissions: ["users.invite", "ASSIGN_ROLES"], targetRole: { code: "reader", organizationId: "org-1", permissions: ["roles.permissions.remove", "users.roles.assign"] } })).toMatchObject({ allowed: true })
  })
  it("rejects actors without role-assignment authority", () => {
    const decision = evaluateRoleGrantPolicy({
      actorOrganizationId: "org-1",
      actorPermissions: ["users.invite", "dashboard.read"],
      targetRole: { code: "reader",
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
      targetRole: { code: "reader",
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
      targetRole: { code: "reader",
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
      targetRole: { code: "reader",
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
      targetRole: { code: "reader",
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
      targetRole: { code: "reader",
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

it.each(["admin", " Administrator ", "super_admin"])("denies a latent reserved %s invitation to a limited issuer", code => {
  expect(evaluateRoleGrantPolicy({ actorOrganizationId: "org-1", actorPermissions: [...grantAuthority, "dashboard.read"], actorRoleCodes: ["manager"], targetRole: { code, organizationId: "org-1", permissions: [] } })).toMatchObject({ allowed: false, reasonCode: "OPERATING_SCOPE_CEILING_EXCEEDED" })
})
it("requires tenant-wide authority as well as explicit grant permission", () => {
  const input = { actorOrganizationId: "org-1", actorPermissions: [...grantAuthority, "dashboard.read"], actorRoleCodes: ["admin"], targetRole: { code: "administrator", organizationId: "org-1", permissions: ["dashboard.read"] } }
  expect(evaluateRoleGrantPolicy(input).allowed).toBe(true)
  expect(evaluateRoleGrantPolicy({ ...input, actorRoleCodes: ["manager"] }).allowed).toBe(false)
  expect(evaluateRoleGrantPolicy({ ...input, actorPermissions: grantAuthority }).allowed).toBe(false)
  expect(evaluateRoleGrantPolicy({ ...input, actorPermissions: ["*"] }).allowed).toBe(false)
})
