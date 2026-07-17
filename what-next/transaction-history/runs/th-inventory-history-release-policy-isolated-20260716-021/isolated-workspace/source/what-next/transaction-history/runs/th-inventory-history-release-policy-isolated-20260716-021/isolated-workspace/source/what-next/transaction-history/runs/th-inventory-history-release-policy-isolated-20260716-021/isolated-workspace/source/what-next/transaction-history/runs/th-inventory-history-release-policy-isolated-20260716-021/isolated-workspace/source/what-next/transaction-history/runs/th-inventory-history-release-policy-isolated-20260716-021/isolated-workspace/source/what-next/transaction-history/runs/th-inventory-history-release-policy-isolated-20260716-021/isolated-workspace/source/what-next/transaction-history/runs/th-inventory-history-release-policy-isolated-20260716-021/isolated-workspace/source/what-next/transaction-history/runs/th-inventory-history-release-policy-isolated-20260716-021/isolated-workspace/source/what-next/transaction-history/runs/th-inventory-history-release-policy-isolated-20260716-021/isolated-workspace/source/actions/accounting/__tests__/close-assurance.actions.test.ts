const mockPermissions = [
  "accounting.close.read",
  "accounting.close.run",
  "accounting.close.finding.comment",
  "accounting.close.export",
  "accounting.close.certify",
]

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & { __closeAssuranceProtectOptions?: Array<Record<string, unknown>> }
    store.__closeAssuranceProtectOptions = store.__closeAssuranceProtectOptions ?? []
    store.__closeAssuranceProtectOptions.push(options)
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: mockPermissions,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/services/accounting/close-assurance.service", () => ({
  getCloseAssuranceDashboard: jest.fn(),
  runCloseAssurance: jest.fn(),
  getCloseEvidenceGraph: jest.fn(),
  assignCloseFinding: jest.fn(),
  commentOnCloseFinding: jest.fn(),
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
  getCloseAssuranceDashboard,
  runCloseAssurance,
} from "@/services/accounting/close-assurance.service"
import { exportClosePack } from "@/services/accounting/close-assurance-pack.service"
import {
  commentOnCloseFindingAction,
  exportCertifiedClosePackAction,
  exportDraftClosePackAction,
  getCloseAssuranceDashboardAction,
  runCloseAssuranceAction,
} from "../close-assurance.actions"

const mockGetCloseAssuranceDashboard = getCloseAssuranceDashboard as jest.Mock
const mockRunCloseAssurance = runCloseAssurance as jest.Mock
const mockCommentOnCloseFinding = commentOnCloseFinding as jest.Mock
const mockExportClosePack = exportClosePack as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

describe("close assurance actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCloseAssuranceDashboard.mockResolvedValue({ run: { status: "READY" } })
    mockRunCloseAssurance.mockResolvedValue({ period: { id: "period-1" }, run: { status: "READY" } })
    mockCommentOnCloseFinding.mockResolvedValue({ id: "comment-1" })
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

  it("registers certified close pack export behind fresh authentication", async () => {
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
    })

    expect(result.success).toBe(true)
    expect(mockExportClosePack).toHaveBeenCalledWith(
      "org-session",
      {
        closeRunId: "close-run-1",
        mode: "CERTIFIED",
        correlationId: "cert-corr-1",
      },
      expect.objectContaining({
        actorId: "user-session",
        actorPermissions: mockPermissions,
        lastAuthAt: expect.any(Date),
      }),
    )
  })
})
