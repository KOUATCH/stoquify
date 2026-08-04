const mockPermissions = [
  "accounting.close.read",
  "accounting.close.run",
  "accounting.close.finding.comment",
  "accounting.close.evidence.request",
  "accounting.close.export",
  "accounting.close.certify",
  "accounting.close.waiver.approve",
]

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {
    constructor() {
      super("Fresh authentication required")
      this.name = "FreshAuthRequiredError"
    }
  },
  SESSION_ASSURANCE_LEVEL: {
    NONE: 0,
    PASSWORD: 1,
  },
}))

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & { __closeAssuranceProtectOptions?: Array<Record<string, unknown>> }
    store.__closeAssuranceProtectOptions = store.__closeAssuranceProtectOptions ?? []
    store.__closeAssuranceProtectOptions.push(options)
    return async (input: unknown) => {
      const lastAuthAt = new Date("2026-08-02T08:30:00.000Z")
      const baseContext = {
        orgId: "org-session",
        userId: "user-session",
        permissions: mockPermissions,
        freshAuth: {
          lastAuthAt,
          claims: {
            userId: "user-session",
            tenantId: "org-session",
            assuranceOrganizationId: "org-session",
            assuranceLevel: 1,
            lastAuthAt: lastAuthAt.getTime(),
          },
        },
      }
      const contextOverride = (
        globalThis as typeof globalThis & {
          __closeAssuranceActionContextOverride?: Record<string, unknown>
        }
      ).__closeAssuranceActionContextOverride
      const data = await handler(input, { ...baseContext, ...contextOverride })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

function setCloseAssuranceActionContextOverride(
  value: Record<string, unknown> | undefined,
) {
  const store = globalThis as typeof globalThis & {
    __closeAssuranceActionContextOverride?: Record<string, unknown>
  }
  if (value) store.__closeAssuranceActionContextOverride = value
  else delete store.__closeAssuranceActionContextOverride
}

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/services/accounting/close-assurance.service", () => ({
  getCloseAssuranceDashboard: jest.fn(),
  runCloseAssurance: jest.fn(),
  getCloseEvidenceGraph: jest.fn(),
  assignCloseFinding: jest.fn(),
  commentOnCloseFinding: jest.fn(),
  requestMissingCloseEvidence: jest.fn(),
  requestCloseWaiver: jest.fn(),
  approveCloseWaiver: jest.fn(),
  updateAccountantReview: jest.fn(),
}))

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  exportClosePack: jest.fn(),
}))

import { revalidatePath } from "next/cache"

import {
  commentOnCloseFinding,
  requestMissingCloseEvidence,
  approveCloseWaiver,
  getCloseAssuranceDashboard,
  runCloseAssurance,
} from "@/services/accounting/close-assurance.service"
import { exportClosePack } from "@/services/accounting/close-assurance-pack.service"
import {
  commentOnCloseFindingAction,
  requestMissingCloseEvidenceAction,
  approveCloseWaiverAction,
  exportCertifiedClosePackAction,
  exportDraftClosePackAction,
  getCloseAssuranceDashboardAction,
  runCloseAssuranceAction,
} from "../close-assurance.actions"

const mockGetCloseAssuranceDashboard = getCloseAssuranceDashboard as jest.Mock
const mockRunCloseAssurance = runCloseAssurance as jest.Mock
const mockCommentOnCloseFinding = commentOnCloseFinding as jest.Mock
const mockRequestMissingCloseEvidence = requestMissingCloseEvidence as jest.Mock
const mockApproveCloseWaiver = approveCloseWaiver as jest.Mock
const mockExportClosePack = exportClosePack as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

describe("close assurance actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setCloseAssuranceActionContextOverride(undefined)
    mockGetCloseAssuranceDashboard.mockResolvedValue({ run: { status: "READY" } })
    mockRunCloseAssurance.mockResolvedValue({ period: { id: "period-1" }, run: { status: "READY" } })
    mockCommentOnCloseFinding.mockResolvedValue({ id: "comment-1" })
    mockApproveCloseWaiver.mockResolvedValue({ id: "finding-1", status: "WAIVED_WITH_APPROVAL" })
    mockRequestMissingCloseEvidence.mockResolvedValue({
      id: "request-1",
      organizationId: "client-org",
      periodId: "period-1",
      findingId: "finding-1",
      requestedFromId: "client-user-1",
      status: "OPEN",
    })
    mockExportClosePack.mockResolvedValue({
      exportId: "export-1",
      periodId: "period-1",
      contentHash: "sha256:close-pack",
    })
  })

  it("derives close dashboard tenant scope from the RBAC context", async () => {
    const result = await getCloseAssuranceDashboardAction({
      organizationId: "attacker-org",
      periodId: "period-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetCloseAssuranceDashboard).toHaveBeenCalledWith("org-session", "period-1")
  })

  it("passes actor and permission context when running a close assessment", async () => {
    const result = await runCloseAssuranceAction({
      organizationId: "attacker-org",
      periodId: "period-1",
      correlationId: "corr-1",
    })

    expect(result.success).toBe(true)
    expect(mockRunCloseAssurance).toHaveBeenCalledWith(
      "org-session",
      { periodId: "period-1", correlationId: "corr-1" },
      {
        actorId: "user-session",
        actorPermissions: mockPermissions,
      },
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/accounting/close", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/accounting/close/period-1", "page")
  })

  it("passes accountant comments through the protected action envelope", async () => {
    const result = await commentOnCloseFindingAction({
      findingId: "finding-1",
      body: "Reviewed with accountant and linked supporting evidence.",
    })

    expect(result.success).toBe(true)
    expect(mockCommentOnCloseFinding).toHaveBeenCalledWith(
      "org-session",
      {
        findingId: "finding-1",
        body: "Reviewed with accountant and linked supporting evidence.",
      },
      {
        actorId: "user-session",
        actorPermissions: mockPermissions,
      },
    )
  })

  it("requests missing proof through dedicated protected tenant and actor authority", async () => {
    const store = globalThis as typeof globalThis & {
      __closeAssuranceProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__closeAssuranceProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "accounting.close.evidence.request",
          auditResource: "AccountantComment",
          auditAllowed: true,
        }),
      ]),
    )

    const result = await requestMissingCloseEvidenceAction({
      clientOrganizationId: "client-org",
      findingId: "finding-1",
      requestedFromId: "client-user-1",
      requestText: "Please attach the missing signed bank statement.",
      dueAt: "2026-08-05T12:00:00.000Z",
      correlationId: "missing-proof-corr-1",
      organizationId: "attacker-org",
      actorId: "attacker-user",
      permissions: ["*"],
      accessMode: "TENANT_MEMBER",
    })

    expect(result.success).toBe(true)
    expect(mockRequestMissingCloseEvidence).toHaveBeenCalledWith(
      "org-session",
      {
        clientOrganizationId: "client-org",
        findingId: "finding-1",
        requestedFromId: "client-user-1",
        requestText: "Please attach the missing signed bank statement.",
        dueAt: new Date("2026-08-05T12:00:00.000Z"),
        correlationId: "missing-proof-corr-1",
      },
      {
        actorId: "user-session",
        actorPermissions: mockPermissions,
      },
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/accounting/close/period-1",
      "page",
    )
  })

  it("exports draft close packs with tenant and actor context", async () => {
    const result = await exportDraftClosePackAction({
      closeRunId: "close-run-1",
      mode: "CERTIFIED",
      correlationId: "export-corr-1",
    })

    expect(result.success).toBe(true)
    expect(mockExportClosePack).toHaveBeenCalledWith(
      "org-session",
      {
        closeRunId: "close-run-1",
        mode: "DRAFT_NOT_CERTIFIED",
        correlationId: "export-corr-1",
      },
      {
        actorId: "user-session",
        actorPermissions: mockPermissions,
      },
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/accounting/close/period-1", "page")
  })

  it("approves close waiver with verified fresh-auth evidence", async () => {
    const store = globalThis as typeof globalThis & {
      __closeAssuranceProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__closeAssuranceProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "accounting.close.waiver.approve",
          auditResource: "CloseAssuranceFinding",
          freshAuth: { maxAgeSeconds: 300 },
        }),
      ]),
    )

    const result = await approveCloseWaiverAction({
      findingId: "finding-1",
      correlationId: "waiver-corr-1",
      organizationId: "attacker-org",
      actorId: "attacker-user",
      lastAuthAt: "1900-01-01T00:00:00.000Z",
      now: "1900-01-01T00:00:00.000Z",
      freshAuth: { lastAuthAt: "1900-01-01T00:00:00.000Z" },
    })

    expect(result.success).toBe(true)
    expect(mockApproveCloseWaiver).toHaveBeenCalledWith(
      "org-session",
      {
        findingId: "finding-1",
        correlationId: "waiver-corr-1",
      },
      {
        actorId: "user-session",
        actorPermissions: mockPermissions,
        freshAuth: {
          actorId: "user-session",
          organizationId: "org-session",
          lastAuthAt: new Date("2026-08-02T08:30:00.000Z"),
        },
      },
    )
  })

  it.each([
    ["missing evidence", undefined],
    ["tenant identity", freshAuthFixture({ tenantId: "org-other" })],
    [
      "authentication timestamp",
      freshAuthFixture({ lastAuthAt: Date.parse("2026-08-02T08:29:00.000Z") }),
    ],
  ])("fails closed for waiver approval %s mismatch", async (_name, freshAuth) => {
    setCloseAssuranceActionContextOverride({ freshAuth })

    await expect(
      approveCloseWaiverAction({ findingId: "finding-1" }),
    ).rejects.toThrow("Fresh authentication required")

    expect(mockApproveCloseWaiver).not.toHaveBeenCalled()
  })

  it("checks waiver fresh authentication before parsing malformed input", async () => {
    setCloseAssuranceActionContextOverride({ freshAuth: undefined })

    await expect(
      approveCloseWaiverAction({ findingId: 42 }),
    ).rejects.toThrow("Fresh authentication required")

    expect(mockApproveCloseWaiver).not.toHaveBeenCalled()
  })

  it("registers certified close pack export behind verified fresh authentication", async () => {
    const store = globalThis as typeof globalThis & { __closeAssuranceProtectOptions?: Array<Record<string, unknown>> }
    expect(store.__closeAssuranceProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "accounting.close.certify",
          auditResource: "ClosePackExport",
          freshAuth: { maxAgeSeconds: 300 },
        }),
      ]),
    )

    const result = await exportCertifiedClosePackAction({
      closeRunId: "close-run-1",
      correlationId: "cert-corr-1",
      lastAuthAt: "1900-01-01T00:00:00.000Z",
      freshAuth: { lastAuthAt: "1900-01-01T00:00:00.000Z" },
    })

    expect(result.success).toBe(true)
    expect(mockExportClosePack).toHaveBeenCalledWith(
      "org-session",
      {
        closeRunId: "close-run-1",
        mode: "CERTIFIED",
        correlationId: "cert-corr-1",
      },
      {
        actorId: "user-session",
        actorPermissions: mockPermissions,
        lastAuthAt: new Date("2026-08-02T08:30:00.000Z"),
      },
    )
  })

  it.each([
    ["missing evidence", undefined],
    ["user identity", freshAuthFixture({ userId: "user-other" })],
    ["tenant identity", freshAuthFixture({ tenantId: "org-other" })],
    [
      "assurance organization",
      freshAuthFixture({ assuranceOrganizationId: "org-other" }),
    ],
    ["assurance level", freshAuthFixture({ assuranceLevel: 0 })],
    ["missing assurance level", freshAuthFixture({ assuranceLevel: undefined })],
    ["nonnumeric assurance level", freshAuthFixture({ assuranceLevel: "1" })],
    [
      "authentication timestamp",
      freshAuthFixture({ lastAuthAt: Date.parse("2026-08-02T08:29:00.000Z") }),
    ],
  ])("fails closed for certified export %s mismatch", async (_name, freshAuth) => {
    setCloseAssuranceActionContextOverride({ freshAuth })

    await expect(
      exportCertifiedClosePackAction({ closeRunId: "close-run-1" }),
    ).rejects.toThrow("Fresh authentication required")

    expect(mockExportClosePack).not.toHaveBeenCalled()
  })
  it("checks fresh authentication before parsing malformed client input", async () => {
    setCloseAssuranceActionContextOverride({ freshAuth: undefined })

    await expect(
      exportCertifiedClosePackAction({ closeRunId: 42 }),
    ).rejects.toThrow("Fresh authentication required")

    expect(mockExportClosePack).not.toHaveBeenCalled()
  })

})

function freshAuthFixture(claimOverrides: Record<string, unknown> = {}) {
  const lastAuthAt = new Date("2026-08-02T08:30:00.000Z")
  return {
    lastAuthAt,
    claims: {
      userId: "user-session",
      tenantId: "org-session",
      assuranceOrganizationId: "org-session",
      assuranceLevel: 1,
      lastAuthAt: lastAuthAt.getTime(),
      ...claimOverrides,
    },
  }
}
