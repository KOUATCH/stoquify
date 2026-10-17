import { resolveAccountantClientAccess } from "../accountant-access.service"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/events/business-event.service", () => ({ recordBusinessEventInTx: jest.fn() }))

const now = new Date("2026-10-13T10:00:00.000Z")
const grant = {
  id: "synthetic-grant", organizationId: "client-a", accountantUserId: "accountant-a",
  accountantFirmName: "Synthetic fixture", accountantFirmRegistrationNumber: null,
  role: "REVIEWER", status: "ACTIVE", activeScopeKey: "client-a:accountant-a",
  consentGrantedById: "owner-a", consentGrantedAt: now, consentEvidenceHash: "synthetic-hash",
  effectiveFrom: new Date("2026-10-01T00:00:00Z"), expiresAt: new Date("2026-11-01T00:00:00Z"),
  revokedById: null, revokedAt: null, revocationReason: null,
  organization: { isActive: true, deletedAt: null },
}

// Deliberately evaluate the actual query against two tenants/actors and grant states.
// This checks query construction, not PostgreSQL isolation or live session revocation.
function clientFor(records: Array<typeof grant>) {
  return { accountantAccessGrant: { findFirst: jest.fn(async ({ where }) => records.find((row) =>
    row.organizationId === where.organizationId && row.accountantUserId === where.accountantUserId &&
    row.status === where.status && row.activeScopeKey === where.activeScopeKey &&
    row.effectiveFrom <= where.effectiveFrom.lte && row.expiresAt > where.expiresAt.gt &&
    row.organization.isActive === where.organization.is.isActive &&
    row.organization.deletedAt === where.organization.is.deletedAt,
  ) ?? null) } }
}

function resolve(client: ReturnType<typeof clientFor>, capability: "READ" | "EXPORT" | "REVIEW" = "READ", target = "client-a") {
  return resolveAccountantClientAccess({ homeOrganizationId: "firm-a", clientOrganizationId: target,
    accountantUserId: "accountant-a", capability, now, client: client as never })
}

describe("P04 accountant consent boundary", () => {
  it("allows only the granted client and actor, with current active organization predicates", async () => {
    const client = clientFor([grant, { ...grant, organizationId: "client-b", accountantUserId: "accountant-b", activeScopeKey: "client-b:accountant-b" }])
    await expect(resolve(client)).resolves.toMatchObject({ organizationId: "client-a", mode: "DELEGATED_ACCOUNTANT" })
    await expect(resolve(client, "READ", "client-b")).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(client.accountantAccessGrant.findFirst).toHaveBeenLastCalledWith({ where: {
      organizationId: "client-b", accountantUserId: "accountant-a", status: "ACTIVE",
      effectiveFrom: { lte: now }, expiresAt: { gt: now }, activeScopeKey: "client-b:accountant-a",
      organization: { is: { isActive: true, deletedAt: null } },
    } })
  })

  it.each([
    ["revoked", { status: "REVOKED", activeScopeKey: null }],
    ["expired at the exact boundary", { expiresAt: now }],
    ["scheduled", { effectiveFrom: new Date(now.getTime() + 1) }],
    ["inactive client", { organization: { isActive: false, deletedAt: null } }],
    ["deleted client", { organization: { isActive: true, deletedAt: now } }],
  ])("rejects %s consent for every capability", async (_label, change) => {
    const client = clientFor([{ ...grant, ...change } as typeof grant])
    for (const capability of ["READ", "EXPORT", "REVIEW"] as const) {
      await expect(resolve(client, capability)).rejects.toMatchObject({ code: "FORBIDDEN" })
    }
  })

  it("rechecks the grant after revocation instead of reusing a previous allowed result", async () => {
    const records = [{ ...grant }]
    const client = clientFor(records)
    await expect(resolve(client, "EXPORT")).resolves.toMatchObject({ mode: "DELEGATED_ACCOUNTANT" })
    records[0].status = "REVOKED"
    await expect(resolve(client, "EXPORT")).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(client.accountantAccessGrant.findFirst).toHaveBeenCalledTimes(2)
  })

  it("permits read-only portal reads while denying export and review", async () => {
    const client = clientFor([{ ...grant, role: "READ_ONLY" }])
    await expect(resolve(client)).resolves.toMatchObject({ grant: { role: "READ_ONLY" } })
    await expect(resolve(client, "EXPORT")).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(resolve(client, "REVIEW")).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})
