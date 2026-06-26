jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & { __evidenceProtectOptions?: Array<Record<string, unknown>> }
    store.__evidenceProtectOptions = store.__evidenceProtectOptions ?? []
    store.__evidenceProtectOptions.push(options)
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["accounting.journal.read", "payments.reconciliation.read", "accounting.close.read"],
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/evidence/proof-trail.service", () => ({
  getProofTrail: jest.fn(),
}))

import { getProofTrail } from "@/services/evidence/proof-trail.service"

import { getProofTrailAction } from "../proof-trail.actions"

const mockGetProofTrail = getProofTrail as jest.Mock

describe("proof trail actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProofTrail.mockResolvedValue({ evidenceGrade: "posted" })
  })

  it("derives tenant and actor from RBAC context instead of input", async () => {
    const result = await getProofTrailAction({
      organizationId: "attacker-org",
      subjectType: "journal.entry",
      subjectId: "je-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetProofTrail).toHaveBeenCalledWith({
      organizationId: "org-session",
      subjectType: "journal.entry",
      subjectId: "je-1",
      actorId: "user-session",
    })
  })


  it("dispatches payment transaction proof through tenant-scoped RBAC context", async () => {
    const result = await getProofTrailAction({
      organizationId: "attacker-org",
      subjectType: "payment.transaction",
      subjectId: "pt-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetProofTrail).toHaveBeenCalledWith({
      organizationId: "org-session",
      subjectType: "payment.transaction",
      subjectId: "pt-1",
      actorId: "user-session",
    })
  })
  it("registers subject-specific permissions on protected wrappers", () => {
    const store = globalThis as typeof globalThis & { __evidenceProtectOptions?: Array<Record<string, unknown>> }
    expect(store.__evidenceProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "accounting.journal.read" }),
        expect.objectContaining({ permission: "payments.reconciliation.read" }),
        expect.objectContaining({ permission: "accounting.close.read" }),
      ]),
    )
  })
})
