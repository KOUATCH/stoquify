import {
  CREDENTIAL_PROVIDER_ID,
  syncUserCredentialPassword,
  upsertCredentialAccount,
} from "@/lib/security/auth-credentials"

jest.mock("@/prisma/db", () => ({
  db: {
    account: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}))

describe("auth credential helpers", () => {
  function makeTx() {
    return {
      account: {
        upsert: jest.fn().mockResolvedValue({ id: "account_1" }),
      },
      user: {
        update: jest.fn().mockResolvedValue({ id: "user_1" }),
      },
      passwordHistory: {
        create: jest.fn().mockResolvedValue({ id: "history_1" }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      session: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    } as any
  }

  it("uses BetterAuth's credential account convention", async () => {
    const tx = makeTx()

    await upsertCredentialAccount(tx, {
      userId: "user_1",
      passwordHash: "$argon2id$hash",
    })

    expect(tx.account.upsert).toHaveBeenCalledWith({
      where: {
        providerId_accountId: {
          providerId: CREDENTIAL_PROVIDER_ID,
          accountId: "user_1",
        },
      },
      update: {
        userId: "user_1",
        password: "$argon2id$hash",
      },
      create: {
        accountId: "user_1",
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: "user_1",
        password: "$argon2id$hash",
      },
    })
  })

  it("syncs user password, credential account, history, and session revocation", async () => {
    const tx = makeTx()

    await syncUserCredentialPassword(tx, {
      userId: "user_1",
      passwordHash: "$argon2id$new",
      revokeSessions: true,
    })

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { password: "$argon2id$new" },
    })
    expect(tx.account.upsert).toHaveBeenCalled()
    expect(tx.passwordHistory.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        passwordHash: "$argon2id$new",
      },
    })
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    })
  })
})
