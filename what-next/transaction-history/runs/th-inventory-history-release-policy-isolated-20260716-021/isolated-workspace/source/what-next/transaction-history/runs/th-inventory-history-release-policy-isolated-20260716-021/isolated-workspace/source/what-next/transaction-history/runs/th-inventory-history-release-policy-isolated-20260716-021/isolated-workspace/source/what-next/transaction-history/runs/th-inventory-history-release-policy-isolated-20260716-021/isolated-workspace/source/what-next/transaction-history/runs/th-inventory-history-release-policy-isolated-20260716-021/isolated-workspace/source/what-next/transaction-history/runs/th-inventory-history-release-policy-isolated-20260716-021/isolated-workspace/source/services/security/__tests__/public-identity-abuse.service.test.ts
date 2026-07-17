jest.mock("server-only", () => ({}))

import { db } from "@/prisma/db"

import {
  enforcePublicIdentityAbuseLimits,
  evaluatePublicIdentityAbuseBucket,
  hashPublicIdentityAbuseSubject,
} from "../public-identity-abuse.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
}

const policy = {
  maxRequests: 3,
  windowSeconds: 900,
  blockSeconds: 1800,
}

describe("public identity abuse service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PUBLIC_IDENTITY_ABUSE_HASH_SECRET = "test-public-identity-abuse-secret-123456789"
  })

  afterAll(() => {
    delete process.env.PUBLIC_IDENTITY_ABUSE_HASH_SECRET
  })

  it("uses stable HMAC hashes without retaining the raw public identifier", () => {
    const first = hashPublicIdentityAbuseSubject("password_reset_request:subject", "owner@example.com")
    const second = hashPublicIdentityAbuseSubject("password_reset_request:subject", "owner@example.com")

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).not.toContain("owner@example.com")
  })

  it("starts a new window and blocks the first request above the policy maximum", () => {
    const now = new Date("2026-07-11T12:00:00.000Z")
    const allowed = evaluatePublicIdentityAbuseBucket({
      bucket: null,
      policy,
      now,
    })
    const blocked = evaluatePublicIdentityAbuseBucket({
      bucket: {
        id: "bucket-1",
        windowStartedAt: new Date("2026-07-11T11:55:00.000Z"),
        requestCount: 3,
        blockedUntil: null,
      },
      policy,
      now,
    })

    expect(allowed).toMatchObject({ allowed: true, requestCount: 1, persist: true })
    expect(blocked).toMatchObject({
      allowed: false,
      requestCount: 4,
      retryAfterSeconds: 1800,
      persist: true,
    })
  })

  it("preserves an active block without extending it", () => {
    const now = new Date("2026-07-11T12:00:00.000Z")
    const blockedUntil = new Date("2026-07-11T12:05:00.000Z")

    expect(evaluatePublicIdentityAbuseBucket({
      bucket: {
        id: "bucket-1",
        windowStartedAt: new Date("2026-07-11T11:55:00.000Z"),
        requestCount: 4,
        blockedUntil,
      },
      policy,
      now,
    })).toMatchObject({
      allowed: false,
      blockedUntil,
      retryAfterSeconds: 300,
      persist: false,
    })
  })

  it("persists only hashed subject and IP dimensions in serializable transactions", async () => {
    const tx = {
      publicIdentityAbuseBucket: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "bucket-1" }),
        update: jest.fn(),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    const result = await enforcePublicIdentityAbuseLimits({
      operation: "password_reset_request",
      subject: "owner@example.com",
      requestContext: { ipAddress: "203.0.113.10" },
      now: new Date("2026-07-11T12:00:00.000Z"),
    })

    expect(result).toEqual({
      allowed: true,
      operation: "password_reset_request",
      retryAfterSeconds: 0,
    })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
    expect(tx.publicIdentityAbuseBucket.create).toHaveBeenCalledTimes(2)
    for (const call of tx.publicIdentityAbuseBucket.create.mock.calls) {
      const data = call[0].data
      expect(data.subjectHash).toMatch(/^[a-f0-9]{64}$/)
      expect(JSON.stringify(data)).not.toContain("owner@example.com")
      expect(JSON.stringify(data)).not.toContain("203.0.113.10")
    }
  })

  it("normalizes an exhausted serialization conflict without exposing Prisma details", async () => {
    mockDb.$transaction.mockRejectedValue({
      code: "P2034",
      clientVersion: "test",
      message: "sensitive transaction detail",
    })

    await expect(enforcePublicIdentityAbuseLimits({
      operation: "registration",
      subject: "owner@example.com",
    })).rejects.toMatchObject({
      code: "DATABASE_CONFLICT",
      message: "Public identity abuse protection could not resolve a concurrent request",
      status: 503,
      expose: false,
    })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(3)
  })

  it("fails closed with a non-exposing error when persistence is unavailable", async () => {
    mockDb.$transaction.mockRejectedValue(new Error("sensitive database detail"))

    await expect(enforcePublicIdentityAbuseLimits({
      operation: "registration",
      subject: "owner@example.com",
    })).rejects.toMatchObject({
      code: "DATABASE_UNAVAILABLE",
      message: "Public identity abuse protection is temporarily unavailable",
      status: 503,
      expose: false,
    })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
  })
})
