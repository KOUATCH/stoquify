import {
  FreshAuthRequiredError,
  requireFreshAuth,
} from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  configureCountryAdapterPilot,
  disableCountryAdapter,
  recordCountryAdapterReview,
  rotateCountryAdapterCredential,
} from "@/services/compliance/country-adapter-pilot.service"

import {
  configureCountryAdapterPilotAction,
  disableCountryAdapterAction,
  recordCountryAdapterReviewAction,
  rotateCountryAdapterCredentialAction,
} from "../country-adapter-pilot.actions"

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {}
  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    assertCanUseOrganization: jest.fn(),
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/compliance/country-adapter-pilot.service", () => ({
  configureCountryAdapterPilot: jest.fn(),
  disableCountryAdapter: jest.fn(),
  recordCountryAdapterReview: jest.fn(),
  rotateCountryAdapterCredential: jest.fn(),
}))

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockConfigurePilot = configureCountryAdapterPilot as jest.Mock
const mockDisableCountryAdapter = disableCountryAdapter as jest.Mock
const mockRecordReview = recordCountryAdapterReview as jest.Mock
const mockRotateCredential = rotateCountryAdapterCredential as jest.Mock

function expectComplianceModuleGate(surface: string, permission: string) {
  expect(mockObserveModuleAccess).toHaveBeenCalledWith({
    organizationId: "org-1",
    userId: "operator-1",
    actorPermissions: [permission],
    moduleSlug: "compliance",
    surfaceType: "action",
    surface,
    accessIntent: "write",
    mode: "enforce",
    audit: true,
  })
}

describe("country adapter pilot actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: Date.now() },
    })
    mockRequirePermission.mockImplementation(async (permission: string) => ({
      orgId: "org-1",
      userId: "operator-1",
      permissions: [permission],
    }))
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
  })

  it("returns a stable RBAC denial without calling the adapter service", async () => {
    mockRequirePermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    )

    const result = await disableCountryAdapterAction({
      adapterConfigId: "adapter-config-1",
      reason: "Authority outage containment",
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        errorCode: "FORBIDDEN",
      }),
    )
    expect(mockDisableCountryAdapter).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("maps fresh-auth denial to the Skill 015 step-up error", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await rotateCountryAdapterCredentialAction({
      adapterConfigId: "adapter-config-1",
      credentialReference: "vault://org-1/cm-dgi-sandbox-v2",
      reason: "Scheduled credential rotation",
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        ok: false,
        status: 403,
        code: "FRESH_AUTH_REQUIRED",
        errorCode: "STEP_UP_REQUIRED",
      }),
    )
    expect(mockRotateCredential).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("denies adapter actions when the compliance module is not entitled", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await disableCountryAdapterAction({
      adapterConfigId: "adapter-config-1",
      reason: "Authority outage containment",
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        errorCode: "FORBIDDEN",
      }),
    )
    expectComplianceModuleGate(
      "actions/compliance/country-adapter-pilot.actions.ts:disableCountryAdapterAction",
      "compliance.adapters.manage",
    )
    expect(mockDisableCountryAdapter).not.toHaveBeenCalled()
  })

  it("derives tenant and actor scope from the protected context", async () => {
    mockDisableCountryAdapter.mockResolvedValue({
      id: "adapter-config-1",
      organizationId: "org-1",
      status: "DISABLED",
    })

    const result = await disableCountryAdapterAction({
      organizationId: "spoofed-org",
      actorId: "spoofed-actor",
      adapterConfigId: "adapter-config-1",
      reason: "Authority outage containment",
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        ok: true,
      }),
    )
    expect(mockDisableCountryAdapter).toHaveBeenCalledWith({
      adapterConfigId: "adapter-config-1",
      reason: "Authority outage containment",
      organizationId: "org-1",
      actorId: "operator-1",
    })
    expectComplianceModuleGate(
      "actions/compliance/country-adapter-pilot.actions.ts:disableCountryAdapterAction",
      "compliance.adapters.manage",
    )
  })
  it("derives configure scope from the protected context", async () => {
    mockConfigurePilot.mockResolvedValue({
      id: "adapter-config-1",
      organizationId: "org-1",
      status: "ACTIVE",
    })

    const result = await configureCountryAdapterPilotAction({
      organizationId: "spoofed-org",
      actorId: "spoofed-actor",
    })

    expect(result).toEqual(expect.objectContaining({ success: true, ok: true }))
    expect(mockConfigurePilot).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "operator-1",
    })
    expectComplianceModuleGate(
      "actions/compliance/country-adapter-pilot.actions.ts:configureCountryAdapterPilotAction",
      "compliance.adapters.manage",
    )
  })

  it("derives credential-rotation scope from the protected context", async () => {
    mockRotateCredential.mockResolvedValue({
      id: "adapter-config-1",
      organizationId: "org-1",
      status: "ACTIVE",
    })

    const result = await rotateCountryAdapterCredentialAction({
      organizationId: "spoofed-org",
      actorId: "spoofed-actor",
      adapterConfigId: "adapter-config-1",
      credentialReference: "vault://org-1/cm-dgi-sandbox-v2",
      reason: "Scheduled credential rotation",
    })

    expect(result).toEqual(expect.objectContaining({ success: true, ok: true }))
    expect(mockRotateCredential).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "operator-1",
      adapterConfigId: "adapter-config-1",
      credentialReference: "vault://org-1/cm-dgi-sandbox-v2",
      reason: "Scheduled credential rotation",
    })
    expectComplianceModuleGate(
      "actions/compliance/country-adapter-pilot.actions.ts:rotateCountryAdapterCredentialAction",
      "compliance.adapters.credentials.rotate",
    )
  })

  it("derives independent-review scope from the protected context", async () => {
    mockRecordReview.mockResolvedValue({
      id: "adapter-config-1",
      organizationId: "org-1",
      status: "ACTIVE",
    })
    const reviewedAt = "2026-07-27T00:00:00.000Z"
    const reviewEvidenceHash = `sha256:${"d".repeat(64)}`

    const result = await recordCountryAdapterReviewAction({
      organizationId: "spoofed-org",
      actorId: "spoofed-actor",
      adapterConfigId: "adapter-config-1",
      reviewStatus: "EXPERT_APPROVED",
      reviewedAt,
      reviewerQualification: "Licensed tax and accounting reviewer",
      reviewerConflictDeclared: true,
      reviewEvidenceHash,
    })

    expect(result).toEqual(expect.objectContaining({ success: true, ok: true }))
    expect(mockRecordReview).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "operator-1",
      adapterConfigId: "adapter-config-1",
      reviewStatus: "EXPERT_APPROVED",
      reviewedAt: new Date(reviewedAt),
      reviewerQualification: "Licensed tax and accounting reviewer",
      reviewerConflictDeclared: true,
      reviewEvidenceHash,
    })
    expectComplianceModuleGate(
      "actions/compliance/country-adapter-pilot.actions.ts:recordCountryAdapterReviewAction",
      "compliance.adapters.approve",
    )
  })
})
