jest.mock("server-only", () => ({}))

import { db } from "@/prisma/db"
import { logSecurityEvent } from "@/lib/security/audit-log"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { deactivateUserForOrganization } from "../user-lifecycle.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: {
    USER_DELETED: "USER_DELETED",
  },
  logSecurityEvent: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
}
const mockLogSecurityEvent = logSecurityEvent as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe("user-lifecycle.service immutability", () => {
  it("rejects self deactivation before opening a transaction", async () => {
    await expect(
      deactivateUserForOrganization({
        organizationId: "org-1",
        targetUserId: "user-1",
        actorId: "user-1",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects unknown users without mutating invites or users", async () => {
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      invite: {
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    await expect(
      deactivateUserForOrganization({
        organizationId: "org-1",
        targetUserId: "user-2",
        actorId: "admin-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(tx.invite.updateMany).not.toHaveBeenCalled()
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it("cancels pending invites, deactivates the user, and records audit evidence", async () => {
    const deactivatedUser = {
      id: "user-2",
      email: "user@example.com",
      emailVerified: true,
      firstName: "User",
      lastName: "Two",
      phone: null,
      image: null,
      jobTitle: null,
      isActive: false,
      isVerified: true,
      preferredLocale: "EN",
      organizationId: "org-1",
      createdAt: new Date("2026-06-17T09:00:00Z"),
      updatedAt: new Date("2026-06-17T10:00:00Z"),
      roles: [],
    }
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: "user-2",
          email: "user@example.com",
          isActive: true,
        }),
        update: jest.fn().mockResolvedValue(deactivatedUser),
      },
      invite: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    const result = await deactivateUserForOrganization({
      organizationId: "org-1",
      targetUserId: "user-2",
      actorId: "admin-1",
    })

    expect(result).toEqual(deactivatedUser)
    expect(tx.invite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: "user@example.com",
          organizationId: "org-1",
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      }),
    )
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-2" },
        data: expect.objectContaining({
          isActive: false,
          isLocked: true,
        }),
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "admin-1",
          entityType: "User",
          entityId: "user-2",
          action: "DEACTIVATE_USER",
          changes: expect.objectContaining({
            after: expect.objectContaining({
              pendingInvitesCancelled: 1,
            }),
          }),
        }),
      }),
    )
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "USER_DELETED",
        userId: "admin-1",
        organizationId: "org-1",
        resource: "user-2",
        details: { deactivatedEmail: "user@example.com" },
      }),
    )
  })
})
