jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { db } from "@/prisma/db"
import { readInvitationRoleOptions } from "../user-invitation-options.service"
const transaction = db.$transaction as jest.Mock
const input = { actorId: "issuer", organizationId: "org-1", actorPermissions: ["users.invite", "users.roles.assign", "roles.read", "dashboard.read"], locale: "en" as const }
const role = (id: string, permissions: string[], organizationId = "org-1") => ({ id, permissions, organizationId, nameEn: "Reader", nameFr: "Lecteur", code: "reader" })
function setup(roles = [role("reader", ["dashboard.read"])]) {
  const tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1" }) }, role: { findMany: jest.fn().mockResolvedValue(roles) }, user: { findFirst: jest.fn().mockResolvedValue({ id: "issuer", isVerified: true, organization: { name: "Synthetic", isActive: true, deletedAt: null }, roles: [{ permissions: input.actorPermissions }] }) } }
  transaction.mockImplementation(async work => work(tx))
  return tx
}
beforeEach(() => { jest.clearAllMocks() })
it("does not enumerate role definitions for a directory-only reader", async () => {
  expect(await readInvitationRoleOptions({ ...input, actorPermissions: ["users.read", "roles.read"] })).toMatchObject({ state: "forbidden", roles: [] })
  expect(transaction).not.toHaveBeenCalled()
})
it("preserves the separate role-read permission", async () => {
  expect(await readInvitationRoleOptions({ ...input, actorPermissions: ["users.invite", "users.roles.assign"] })).toMatchObject({ state: "roles_read_required", roles: [] })
  expect(transaction).not.toHaveBeenCalled()
})
it.each(["en", "fr"] as const)("offers only same-tenant grantable roles in %s", async locale => {
  const tx = setup([role("reader", ["dashboard.read"]), role("wildcard", ["*"]), role("above-ceiling", ["accounting.period.close"]), role("foreign", [], "org-2")])
  expect(await readInvitationRoleOptions({ ...input, locale })).toMatchObject({ state: "ready", roles: [{ value: "reader", label: locale === "fr" ? "Lecteur" : "Reader" }] })
  expect(tx.role.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }))
})
it("does not interpret actor wildcard as an explicit unlimited grant ceiling", async () => {
  const tx = setup()
  tx.user.findFirst.mockResolvedValue({ id: "issuer", isVerified: true, organization: { name: "Synthetic", isActive: true }, roles: [{ permissions: ["*", "users.invite", "users.roles.assign", "roles.read"] }] })
  expect(await readInvitationRoleOptions({ ...input, actorPermissions: ["*", "users.invite", "users.roles.assign", "roles.read"] })).toMatchObject({ state: "empty", roles: [] })
})
it("requires explicit critical grant authority even for a wildcard actor", async () => {
  expect(await readInvitationRoleOptions({ ...input, actorPermissions: ["*"] })).toMatchObject({ state: "forbidden", roles: [] })
  expect(transaction).not.toHaveBeenCalled()
})
it("distinguishes unavailable organization and performs no role read", async () => {
  const tx = setup(); tx.organization.findFirst.mockResolvedValue(null)
  expect(await readInvitationRoleOptions(input)).toMatchObject({ state: "organization_unavailable", roles: [] })
  expect(tx.role.findMany).not.toHaveBeenCalled()
})
it("preserves read failures instead of claiming no eligible roles", async () => {
  const tx = setup(); tx.role.findMany.mockRejectedValue(new Error("offline"))
  await expect(readInvitationRoleOptions(input)).rejects.toThrow("offline")
})
it("rejects missing scope before reading", async () => {
  await expect(readInvitationRoleOptions({ ...input, organizationId: "" })).rejects.toThrow("Organization scope and current actor are required")
  expect(transaction).not.toHaveBeenCalled()
})
it("does not show permission-management roles through expanded request claims", async () => {
  const tx = setup([role("manager", ["roles.permissions.remove"]), role("reader", ["dashboard.read"])])
  expect(await readInvitationRoleOptions({ ...input, actorPermissions: [...input.actorPermissions, "ASSIGN_ROLES", "roles.permissions.remove"] })).toMatchObject({ roles: [{ value: "reader" }] })
  expect(tx.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "issuer", organizationId: "org-1", isActive: true } }))
})
it("does not enumerate roles after current stored assignment authority is revoked", async () => {
  const tx = setup()
  tx.user.findFirst.mockResolvedValue({ id: "issuer", isVerified: true, organization: { name: "Synthetic", isActive: true }, roles: [{ permissions: ["users.invite", "roles.read", "roles.permissions.assign"] }] })
  expect(await readInvitationRoleOptions(input)).toMatchObject({ state: "forbidden", roles: [] })
  expect(tx.role.findMany).not.toHaveBeenCalled()
})
