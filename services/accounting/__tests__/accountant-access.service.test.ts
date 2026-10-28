jest.mock("@/prisma/db", () => {
  const tx = {
    accountantAccessGrant: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    closeRun: { findFirst: jest.fn() },
  }
  return {
    db: {
      ...tx,
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    },
  }
})

import {
  AccountantAccessRole,
  AccountantAccessStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  getAccountantPortfolio,
  grantAccountantAccess,
  resolveAccountantClientAccess,
  revokeAccountantAccess,
} from "../accountant-access.service"

const mockDb = db as unknown as {
  user: { findUnique: jest.Mock }
  accountantAccessGrant: {
    findFirst: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
  }
  businessEvent: {
    findUnique: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  auditLog: { create: jest.Mock }
  closeRun: { findFirst: jest.Mock }
  $transaction: jest.Mock
}

const now = new Date("2026-07-27T10:00:00.000Z")
const baseGrant = {
  id: "grant-1",
  organizationId: "client-org",
  accountantUserId: "accountant-1",
  accountantFirmName: "Trusted Ledger LLP",
  accountantFirmRegistrationNumber: "REG-100",
  role: AccountantAccessRole.REVIEWER,
  status: AccountantAccessStatus.ACTIVE,
  activeScopeKey: "client-org:accountant-1",
  consentGrantedById: "client-owner",
  consentGrantedAt: now,
  consentEvidenceHash: `sha256:${"a".repeat(64)}`,
  effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
  expiresAt: new Date("2026-12-31T23:59:59.000Z"),
  revokedById: null,
  revokedAt: null,
  revocationReason: null,
  correlationId: null,
  metadata: null,
  createdAt: now,
  updatedAt: now,
}

describe("accountant access service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
    mockDb.businessEvent.findUnique.mockResolvedValue(null)
    mockDb.businessEvent.create.mockImplementation(({ data }) => ({
      id: "event-1",
      ...data,
      outboxMessages: [],
    }))
    mockDb.accountantAccessGrant.updateMany.mockResolvedValue({ count: 1 })
  })

  it("creates an explicit, expiring grant and emits ACCOUNTANT_ACCESS_GRANTED", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "accountant-1", isActive: true })
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(null)
    mockDb.accountantAccessGrant.create.mockResolvedValue(baseGrant)

    const result = await grantAccountantAccess(
      "client-org",
      "client-owner",
      {
        accountantEmail: "accountant@example.test",
        accountantFirmName: "Trusted Ledger LLP",
        accountantFirmRegistrationNumber: "REG-100",
        role: "REVIEWER",
        consentEvidenceHash: `sha256:${"a".repeat(64)}`,
        expiresAt: baseGrant.expiresAt,
        effectiveFrom: baseGrant.effectiveFrom,
        correlationId: null,
      },
      now,
    )

    expect(result.status).toBe("ACTIVE")
    expect(mockDb.accountantAccessGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activeScopeKey: "client-org:accountant-1",
          consentEvidenceHash: `sha256:${"a".repeat(64)}`,
        }),
      }),
    )
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "ACCOUNTANT_ACCESS_GRANTED" }),
      }),
    )
  })

  it("reports a valid future-effective grant as scheduled", async () => {
    const effectiveFrom = new Date("2026-08-01T10:00:00.000Z")
    const expiresAt = new Date("2026-12-31T23:59:59.000Z")
    mockDb.user.findUnique.mockResolvedValue({ id: "accountant-1", isActive: true })
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(null)
    mockDb.accountantAccessGrant.create.mockResolvedValue({
      ...baseGrant,
      effectiveFrom,
      expiresAt,
    })

    const result = await grantAccountantAccess(
      "client-org",
      "client-owner",
      {
        accountantEmail: "accountant@example.test",
        accountantFirmName: "Trusted Ledger LLP",
        accountantFirmRegistrationNumber: "REG-100",
        role: "REVIEWER",
        consentEvidenceHash: `sha256:${"b".repeat(64)}`,
        effectiveFrom,
        expiresAt,
        correlationId: null,
      },
      now,
    )

    expect(result.status).toBe("SCHEDULED")
    expect(mockDb.accountantAccessGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ effectiveFrom, expiresAt }),
      }),
    )
  })

  it("rejects a consent window expired exactly at now before database work", async () => {
    await expect(
      grantAccountantAccess(
        "client-org",
        "client-owner",
        {
          accountantEmail: "accountant@example.test",
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: "REG-100",
          role: "REVIEWER",
          consentEvidenceHash: `sha256:${"b".repeat(64)}`,
          effectiveFrom: new Date("2026-07-27T09:00:00.000Z"),
          expiresAt: now,
          correlationId: null,
        },
        now,
      ),
    ).rejects.toMatchObject({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Accountant access expiry must be in the future.",
    })

    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.accountantAccessGrant.create).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("rejects an unexpired reserved scope without mutating grant state", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "accountant-1", isActive: true })
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(baseGrant)

    await expect(
      grantAccountantAccess(
        "client-org",
        "client-owner",
        {
          accountantEmail: "accountant@example.test",
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: "REG-100",
          role: "REVIEWER",
          consentEvidenceHash: `sha256:${"b".repeat(64)}`,
          expiresAt: new Date("2027-12-31T23:59:59.000Z"),
          effectiveFrom: now,
          correlationId: null,
        },
        now,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This accountant already has an active or scheduled client access grant.",
    })

    expect(mockDb.accountantAccessGrant.update).not.toHaveBeenCalled()
    expect(mockDb.accountantAccessGrant.create).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("retires an exactly expired scope before recording a replacement grant", async () => {
    const consentEvidenceHash = `sha256:${"b".repeat(64)}`
    const replacementExpiresAt = new Date("2027-12-31T23:59:59.000Z")
    const expiredGrant = { ...baseGrant, expiresAt: now }
    const replacementGrant = {
      ...baseGrant,
      id: "grant-2",
      consentEvidenceHash,
      effectiveFrom: now,
      expiresAt: replacementExpiresAt,
    }
    mockDb.user.findUnique.mockResolvedValue({ id: "accountant-1", isActive: true })
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(expiredGrant)
    mockDb.accountantAccessGrant.update.mockResolvedValue({
      ...expiredGrant,
      activeScopeKey: null,
    })
    mockDb.accountantAccessGrant.create.mockResolvedValue(replacementGrant)

    const result = await grantAccountantAccess(
      "client-org",
      "client-owner",
      {
        accountantEmail: "accountant@example.test",
        accountantFirmName: "Trusted Ledger LLP",
        accountantFirmRegistrationNumber: "REG-100",
        role: "REVIEWER",
        consentEvidenceHash,
        expiresAt: replacementExpiresAt,
        effectiveFrom: now,
        correlationId: null,
      },
      now,
    )

    expect(result).toMatchObject({ id: "grant-2", status: "ACTIVE" })
    expect(mockDb.accountantAccessGrant.update).toHaveBeenCalledWith({
      where: { id: "grant-1" },
      data: { activeScopeKey: null },
    })
    expect(mockDb.accountantAccessGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activeScopeKey: "client-org:accountant-1",
          consentEvidenceHash,
        }),
      }),
    )
    expect(
      mockDb.businessEvent.create.mock.calls.map(([args]) => args.data.eventType),
    ).toEqual(["ACCOUNTANT_ACCESS_EXPIRED", "ACCOUNTANT_ACCESS_GRANTED"])
    expect(mockDb.businessEvent.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "ACCOUNTANT_ACCESS_EXPIRED",
          occurredAt: now,
          payload: expect.objectContaining({
            grantId: "grant-1",
            expiresAt: now.toISOString(),
            reason: "CONSENT_WINDOW_ELAPSED",
          }),
        }),
      }),
    )
    expect(
      mockDb.accountantAccessGrant.update.mock.invocationCallOrder[0],
    ).toBeLessThan(mockDb.businessEvent.create.mock.invocationCallOrder[0])
    expect(mockDb.businessEvent.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.accountantAccessGrant.create.mock.invocationCallOrder[0],
    )
    expect(
      mockDb.accountantAccessGrant.create.mock.invocationCallOrder[0],
    ).toBeLessThan(mockDb.businessEvent.create.mock.invocationCallOrder[1])
  })

  it("maps a concurrent active-scope unique race to the canonical conflict", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "accountant-1", isActive: true })
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(null)
    mockDb.accountantAccessGrant.create.mockRejectedValue({
      code: "P2002",
      meta: { target: ["activeScopeKey"] },
    })

    await expect(
      grantAccountantAccess(
        "client-org",
        "client-owner",
        {
          accountantEmail: "accountant@example.test",
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: "REG-100",
          role: "REVIEWER",
          consentEvidenceHash: `sha256:${"b".repeat(64)}`,
          expiresAt: new Date("2027-12-31T23:59:59.000Z"),
          effectiveFrom: now,
          correlationId: null,
        },
        now,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This accountant already has an active or scheduled client access grant.",
    })

    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("normalizes unrelated Prisma uniqueness errors as unexposed internal failures", async () => {
    const unrelatedUniqueError = {
      code: "P2002",
      meta: { target: ["anotherUniqueField"] },
    }
    mockDb.user.findUnique.mockResolvedValue({ id: "accountant-1", isActive: true })
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(null)
    mockDb.accountantAccessGrant.create.mockRejectedValue(unrelatedUniqueError)

    await expect(
      grantAccountantAccess(
        "client-org",
        "client-owner",
        {
          accountantEmail: "accountant@example.test",
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: "REG-100",
          role: "REVIEWER",
          consentEvidenceHash: `sha256:${"b".repeat(64)}`,
          expiresAt: new Date("2027-12-31T23:59:59.000Z"),
          effectiveFrom: now,
          correlationId: null,
        },
        now,
      ),
    ).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      expose: false,
    })
  })

  it("denies a cross-client read when no active consent exists", async () => {
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(null)

    await expect(
      resolveAccountantClientAccess({
        homeOrganizationId: "firm-org",
        clientOrganizationId: "client-org",
        accountantUserId: "accountant-1",
        capability: "READ",
        now,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("allows delegated reads but denies exports for a READ_ONLY role", async () => {
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue({
      ...baseGrant,
      role: AccountantAccessRole.READ_ONLY,
    })

    await expect(
      resolveAccountantClientAccess({
        homeOrganizationId: "firm-org",
        clientOrganizationId: "client-org",
        accountantUserId: "accountant-1",
        capability: "READ",
        now,
      }),
    ).resolves.toMatchObject({
      organizationId: "client-org",
      mode: "DELEGATED_ACCOUNTANT",
    })

    await expect(
      resolveAccountantClientAccess({
        homeOrganizationId: "firm-org",
        clientOrganizationId: "client-org",
        accountantUserId: "accountant-1",
        capability: "EXPORT",
        now,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(mockDb.accountantAccessGrant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "client-org",
          accountantUserId: "accountant-1",
          organization: {
            is: { isActive: true, deletedAt: null },
          },
        }),
      }),
    )
  })

  it("denies delegated review for READ_ONLY grants and allows REVIEWER grants", async () => {
    mockDb.accountantAccessGrant.findFirst
      .mockResolvedValueOnce({
        ...baseGrant,
        role: AccountantAccessRole.READ_ONLY,
      })
      .mockResolvedValueOnce({
        ...baseGrant,
        role: AccountantAccessRole.REVIEWER,
      })

    await expect(
      resolveAccountantClientAccess({
        homeOrganizationId: "firm-org",
        clientOrganizationId: "client-org",
        accountantUserId: "accountant-1",
        capability: "REVIEW",
        now,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    await expect(
      resolveAccountantClientAccess({
        homeOrganizationId: "firm-org",
        clientOrganizationId: "client-org",
        accountantUserId: "accountant-1",
        capability: "REVIEW",
        now,
      }),
    ).resolves.toMatchObject({
      organizationId: "client-org",
      mode: "DELEGATED_ACCOUNTANT",
      grant: expect.objectContaining({ role: AccountantAccessRole.REVIEWER }),
    })
  })

  it("preserves expiry when revocation is requested after the window elapsed", async () => {
    const expiredGrant = { ...baseGrant, expiresAt: now }
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(expiredGrant)
    mockDb.accountantAccessGrant.update.mockResolvedValue({
      ...expiredGrant,
      activeScopeKey: null,
    })

    const result = await revokeAccountantAccess(
      "client-org",
      "client-owner",
      { grantId: "grant-1", reason: "Engagement ended", correlationId: null },
      now,
    )

    expect(result.status).toBe("EXPIRED")
    expect(mockDb.accountantAccessGrant.update).toHaveBeenCalledWith({
      where: { id: "grant-1" },
      data: { activeScopeKey: null },
    })
    expect(
      mockDb.businessEvent.create.mock.calls.map(([args]) => args.data.eventType),
    ).toEqual(["ACCOUNTANT_ACCESS_EXPIRED"])
    expect(mockDb.accountantAccessGrant.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AccountantAccessStatus.REVOKED }),
      }),
    )
  })

  it("reports legacy post-expiry revocation rows as expired", async () => {
    const expiresAt = new Date("2026-07-27T09:00:00.000Z")
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue({
      ...baseGrant,
      status: AccountantAccessStatus.REVOKED,
      activeScopeKey: null,
      expiresAt,
      revokedById: "legacy-actor",
      revokedAt: now,
      revocationReason: "Legacy post-expiry revocation",
    })

    const result = await revokeAccountantAccess(
      "client-org",
      "client-owner",
      { grantId: "grant-1", reason: "Engagement ended", correlationId: null },
      now,
    )

    expect(result.status).toBe("EXPIRED")
    expect(mockDb.accountantAccessGrant.updateMany).not.toHaveBeenCalled()
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("preserves first-writer revocation attribution when a concurrent revoke wins", async () => {
    const firstRevocation = {
      ...baseGrant,
      status: AccountantAccessStatus.REVOKED,
      activeScopeKey: null,
      revokedById: "first-actor",
      revokedAt: new Date("2026-07-27T09:59:59.000Z"),
      revocationReason: "First revocation",
    }
    mockDb.accountantAccessGrant.findFirst
      .mockResolvedValueOnce(baseGrant)
      .mockResolvedValueOnce(firstRevocation)
    mockDb.accountantAccessGrant.updateMany.mockResolvedValue({ count: 0 })

    const result = await revokeAccountantAccess(
      "client-org",
      "second-actor",
      { grantId: "grant-1", reason: "Second revocation", correlationId: null },
      now,
    )

    expect(result).toMatchObject({
      status: "REVOKED",
      revokedById: "first-actor",
      revocationReason: "First revocation",
    })
    expect(mockDb.accountantAccessGrant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "grant-1",
          organizationId: "client-org",
          status: AccountantAccessStatus.ACTIVE,
          activeScopeKey: "client-org:accountant-1",
          expiresAt: { gt: now },
        }),
      }),
    )
    expect(mockDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("revokes only a grant belonging to the current client tenant", async () => {
    mockDb.accountantAccessGrant.findFirst.mockResolvedValue(baseGrant)

    const result = await revokeAccountantAccess(
      "client-org",
      "client-owner",
      { grantId: "grant-1", reason: "Engagement ended", correlationId: null },
      now,
    )

    expect(result.status).toBe("REVOKED")
    expect(mockDb.accountantAccessGrant.findFirst).toHaveBeenCalledWith({
      where: { id: "grant-1", organizationId: "client-org" },
    })
    expect(mockDb.accountantAccessGrant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "grant-1",
          organizationId: "client-org",
          status: AccountantAccessStatus.ACTIVE,
          activeScopeKey: "client-org:accountant-1",
          expiresAt: { gt: now },
        }),
      }),
    )
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "ACCOUNTANT_ACCESS_REVOKED" }),
      }),
    )
  })

  it("builds a portfolio only from active, effective, unexpired grants", async () => {
    mockDb.accountantAccessGrant.findMany.mockResolvedValue([
      {
        ...baseGrant,
        organization: {
          id: "client-org",
          name: "Client One",
          countryCode: "CM",
          currency: "XAF",
        },
      },
    ])
    mockDb.closeRun.findFirst.mockResolvedValue({
      periodId: "period-1",
      status: "READY_FOR_REVIEW",
      readinessScore: 92,
      criticalBlockerCount: 0,
      highBlockerCount: 1,
      asOf: now,
    })

    const result = await getAccountantPortfolio("accountant-1", now)

    expect(result.clientCount).toBe(1)
    expect(result.clients[0].close?.blockerCount).toBe(1)
    expect(mockDb.accountantAccessGrant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountantUserId: "accountant-1",
          status: AccountantAccessStatus.ACTIVE,
          effectiveFrom: { lte: now },
          expiresAt: { gt: now },
          organization: {
            is: { isActive: true, deletedAt: null },
          },
        }),
      }),
    )
  })
})
