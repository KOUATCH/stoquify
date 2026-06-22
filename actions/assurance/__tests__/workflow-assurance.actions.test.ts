jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __workflowAssuranceProtectOptions?: Array<Record<string, unknown>>
    }
    store.__workflowAssuranceProtectOptions = store.__workflowAssuranceProtectOptions ?? []
    store.__workflowAssuranceProtectOptions.push(options)

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["controls.audit.read", "accounting.audit.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/assurance/assurance-registry.service", () => ({
  runWorkflowAssuranceRegistry: jest.fn(),
}))

import { runWorkflowAssuranceRegistry } from "@/services/assurance/assurance-registry.service"

import { runWorkflowAssuranceChecksAction } from "../workflow-assurance.actions"

const mockRunWorkflowAssuranceRegistry = runWorkflowAssuranceRegistry as jest.Mock

describe("workflow assurance actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRunWorkflowAssuranceRegistry.mockResolvedValue({
      organizationId: "org-session",
      runType: "manual",
      generatedAt: "2026-06-21T08:00:00.000Z",
      summary: {
        total: 0,
        passed: 0,
        warning: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        error: 0,
        observeMode: true,
      },
      runs: [],
    })
  })

  it("derives tenant and actor context from protect instead of caller input", async () => {
    const result = await runWorkflowAssuranceChecksAction({
      organizationId: "attacker-org",
      checkKey: "ledger.posted_source_link.required",
    } as never)

    expect(result.success).toBe(true)
    expect(mockRunWorkflowAssuranceRegistry).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        actorId: "user-session",
        actorPermissions: ["controls.audit.read", "accounting.audit.read"],
        checkKey: "ledger.posted_source_link.required",
        runType: "manual",
      }),
    )
    expect(mockRunWorkflowAssuranceRegistry.mock.calls[0][0]).not.toHaveProperty("organizationId", "attacker-org")
  })

  it("registers the manual runner behind controls.audit.read with audit enabled", async () => {
    await runWorkflowAssuranceChecksAction()

    const store = globalThis as typeof globalThis & {
      __workflowAssuranceProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__workflowAssuranceProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "controls.audit.read",
          auditResource: "WorkflowAssuranceCheckRun",
          auditAllowed: true,
          tenantGuard: false,
        }),
      ]),
    )
  })
})
