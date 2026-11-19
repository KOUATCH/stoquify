jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
import { assertManagedAccountantAccess } from "../managed-accountant-access.service"
const at = new Date("2026-10-20T10:00:00Z")
function fixture() {
  const link = { engagementId: "e", firmOrganizationId: "firm", clientOrganizationId: "client", accountantUserId: "staff" }
  const engagement = { ...link, status: "ACTIVE", scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") }
  const assignment = { ...engagement, endedAt: null }
  const actor = { id: "staff", organizationId: "firm", isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null,
    organization: { id: "firm", isActive: true, deletedAt: null, requestedModules: ["accounting"] },
    roles: [{ organizationId: "firm", permissions: ["accounting.audit.read", "accounting.close.accountant.review", "accounting.exports.create", "accounting.close.evidence.request"] }] }
  const target = { id: "client", isActive: true, deletedAt: null, requestedModules: ["accounting", "close_assurance"] }
  const tx: any = {
    firmEngagementGrantLink: { findUnique: jest.fn(async () => link) },
    firmEngagement: { findUnique: jest.fn(async () => engagement) },
    firmEngagementAssignment: { findMany: jest.fn(async () => [assignment]) },
    user: { findFirst: jest.fn(async () => actor) }, organization: { findUnique: jest.fn(async () => target) },
    tenantModuleConfiguration: { findUnique: jest.fn(async () => null) },
    tenantModuleGrant: { findMany: jest.fn(async () => []) },
    tenantModuleConfigurationCommand: { count: jest.fn(async () => 0) },
  }
  const input = { homeOrganizationId: "firm", clientOrganizationId: "client", accountantUserId: "staff", grantId: "g",
    activeScopeKey: "managed:client:staff", capability: "READ" as const, now: at }
  return { tx, input, link, engagement, assignment, actor, target }
}
it.each(["READ", "REVIEW", "EXPORT"] as const)("allows the complete %s intersection", async capability => {
  const f = fixture()
  await expect(assertManagedAccountantAccess({ ...f.input, capability }, f.tx)).resolves.toBeUndefined()
})
it.each(["link-missing", "link-foreign", "engagement-missing", "draft", "suspended", "ended", "engagement-future", "engagement-expired",
  "assignment-missing", "assignment-future", "assignment-expired", "user-missing", "user-inactive", "home-inactive", "client-inactive",
  "role-missing", "foreign-role", "home-module", "client-module"] as const)("denies missing predicate %s", async kind => {
  const f = fixture()
  if (kind === "link-missing") f.tx.firmEngagementGrantLink.findUnique.mockResolvedValue(null)
  if (kind === "link-foreign") f.link.firmOrganizationId = "other"
  if (kind === "engagement-missing") f.tx.firmEngagement.findUnique.mockResolvedValue(null)
  if (["draft", "suspended", "ended"].includes(kind)) f.engagement.status = kind.toUpperCase()
  if (kind === "engagement-future") f.engagement.effectiveFrom = new Date("2098-01-01")
  if (kind === "engagement-expired") f.engagement.expiresAt = at
  if (kind === "assignment-missing") f.tx.firmEngagementAssignment.findMany.mockResolvedValue([])
  if (kind === "assignment-future") f.assignment.effectiveFrom = new Date("2098-01-01")
  if (kind === "assignment-expired") f.assignment.expiresAt = at
  if (kind === "user-missing") f.tx.user.findFirst.mockResolvedValue(null)
  if (kind === "user-inactive") f.actor.isActive = false
  if (kind === "home-inactive") f.actor.organization.isActive = false
  if (kind === "client-inactive") f.target.isActive = false
  if (kind === "role-missing") f.actor.roles = []
  if (kind === "foreign-role") f.actor.roles[0].organizationId = "other"
  if (kind === "home-module") f.actor.organization.requestedModules = ["inventory"]
  if (kind === "client-module") f.target.requestedModules = ["accounting"]
  await expect(assertManagedAccountantAccess(f.input, f.tx)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it.each(["engagement", "assignment"] as const)("enforces the %s read-only ceiling", async name => {
  const f = fixture(); f[name].scope = "READ_ONLY"
  await expect(assertManagedAccountantAccess(f.input, f.tx)).resolves.toBeUndefined()
  await expect(assertManagedAccountantAccess({ ...f.input, capability: "REVIEW" }, f.tx)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(assertManagedAccountantAccess({ ...f.input, capability: "EXPORT" }, f.tx)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("keeps request permission distinct from review permission", async () => {
  const f = fixture(); f.actor.roles[0].permissions = ["accounting.close.evidence.request"]
  await expect(assertManagedAccountantAccess({ ...f.input, capability: "REVIEW", permission: "accounting.close.evidence.request" }, f.tx)).resolves.toBeUndefined()
  await expect(assertManagedAccountantAccess({ ...f.input, capability: "REVIEW" }, f.tx)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("propagates link lookup failure and preserves unlinked legacy behavior", async () => {
  const f = fixture()
  f.tx.firmEngagementGrantLink.findUnique.mockRejectedValueOnce(Error("storage unavailable"))
  await expect(assertManagedAccountantAccess(f.input, f.tx)).rejects.toThrow("storage unavailable")
  f.tx.firmEngagementGrantLink.findUnique.mockResolvedValue(null)
  await expect(assertManagedAccountantAccess({ ...f.input, activeScopeKey: "client:staff" }, f.tx)).resolves.toBeUndefined()
  expect(f.tx.user.findFirst).not.toHaveBeenCalled()
})
