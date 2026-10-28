import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
  requireFreshAuth,
  requireSession,
} from "@/lib/security/auth-session"
import { requireRbacContext } from "@/lib/security/rbac"
import { db } from "@/prisma/db"

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}))

jest.mock("@/prisma/db", () => ({
  db: {
    session: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    requireRbacContext: jest.fn(),
  }
})

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: { AUTH_SESSION_REVOKED: "AUTH_SESSION_REVOKED" },
  logSecurityEvent: jest.fn(),
}))

const NOW = new Date("2026-07-14T20:30:00.000Z")
const SESSION_ID = "session-1"
const SESSION_TOKEN = "token-1"
const USER_ID = "user-1"
const ORGANIZATION_ID = "org-1"

const mockHeaders = headers as jest.Mock
const mockGetSession = auth.api.getSession as jest.Mock
const mockFindSession = db.session.findFirst as jest.Mock
const mockRequireRbacContext = requireRbacContext as jest.Mock

function rawSession() {
  return {
    session: {
      id: SESSION_ID,
      token: SESSION_TOKEN,
      createdAt: new Date(NOW.getTime() - 1_000),
    },
    user: { id: USER_ID },
  }
}

function rbacContext(overrides: { userId?: string; orgId?: string } = {}) {
  const userId = overrides.userId ?? USER_ID
  const orgId = overrides.orgId ?? ORGANIZATION_ID
  return {
    user: {
      id: userId,
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "",
      roles: [],
      permissions: ["*"],
      organizationId: orgId,
      organizationName: "Org 1",
    },
    userId,
    orgId,
    organizationName: "Org 1",
    roles: [],
    permissions: ["*"],
    isSuperUser: true,
    source: "better-auth",
    fetchedAt: NOW.getTime(),
  }
}

function assuranceEvidence(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    assuranceVerifiedAt: new Date(NOW.getTime() - 60_000),
    assuranceMethod: "password",
    assuranceOrganizationId: ORGANIZATION_ID,
    assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD,
    ...overrides,
  }
}

describe("auth session assurance", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    jest.clearAllMocks()
    mockHeaders.mockResolvedValue({})
    mockGetSession.mockResolvedValue(rawSession())
    mockFindSession.mockResolvedValue(assuranceEvidence())
    mockRequireRbacContext.mockResolvedValue(rbacContext())
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("binds the exact session id, token, and user and reads assurance from the database row", async () => {
    const result = await requireSession()

    expect(mockFindSession).toHaveBeenCalledWith({
      where: {
        id: SESSION_ID,
        token: SESSION_TOKEN,
        userId: USER_ID,
        expiresAt: { gt: NOW },
      },
      select: {
        id: true,
        assuranceVerifiedAt: true,
        assuranceMethod: true,
        assuranceOrganizationId: true,
        assuranceLevel: true,
      },
    })
    expect(result.claims).toMatchObject({
      sessionId: SESSION_ID,
      sessionToken: SESSION_TOKEN,
      userId: USER_ID,
      tenantId: ORGANIZATION_ID,
      assuranceMethod: "password",
      assuranceOrganizationId: ORGANIZATION_ID,
      assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD,
      lastAuthAt: NOW.getTime() - 60_000,
    })
  })

  it("rejects a revoked or mismatched session row", async () => {
    mockFindSession.mockResolvedValue(null)

    await expect(requireSession()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    })
    expect(mockRequireRbacContext).not.toHaveBeenCalled()
  })

  it("rejects an RBAC identity that differs from the bound session user", async () => {
    mockRequireRbacContext.mockResolvedValue(rbacContext({ userId: "user-2" }))

    await expect(requireSession()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    })
  })

  it("uses zero when assurance is missing instead of session createdAt or Date.now", async () => {
    mockFindSession.mockResolvedValue(assuranceEvidence({
      assuranceVerifiedAt: null,
      assuranceMethod: null,
      assuranceOrganizationId: null,
      assuranceLevel: SESSION_ASSURANCE_LEVEL.NONE,
    }))

    const result = await requireSession()

    expect(result.claims.lastAuthAt).toBe(0)
    expect(result.claims.lastAuthAt).not.toBe(rawSession().session.createdAt.getTime())
    expect(result.claims.lastAuthAt).not.toBe(NOW.getTime())
  })

  it.each([
    ["missing", { assuranceVerifiedAt: null }],
    ["stale", { assuranceVerifiedAt: new Date(NOW.getTime() - 301_000) }],
    ["future-dated", { assuranceVerifiedAt: new Date(NOW.getTime() + 1) }],
    ["wrong-tenant", { assuranceOrganizationId: "org-2" }],
    ["below-level", { assuranceLevel: SESSION_ASSURANCE_LEVEL.NONE }],
  ])("fails closed for %s assurance evidence", async (_case, overrides) => {
    mockFindSession.mockResolvedValue(assuranceEvidence(overrides))

    await expect(requireFreshAuth(300)).rejects.toBeInstanceOf(FreshAuthRequiredError)
  })

  it("accepts recent tenant-bound password assurance at the required level", async () => {
    await expect(requireFreshAuth(300)).resolves.toMatchObject({
      claims: {
        assuranceMethod: "password",
        assuranceOrganizationId: ORGANIZATION_ID,
        assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD,
      },
    })
  })
})
