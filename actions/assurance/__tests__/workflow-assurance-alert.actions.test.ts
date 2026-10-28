jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __workflowAssuranceAlertProtectOptions?: Array<Record<string, unknown>>;
    };
    store.__workflowAssuranceAlertProtectOptions =
      store.__workflowAssuranceAlertProtectOptions ?? [];
    store.__workflowAssuranceAlertProtectOptions.push(options);

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "operator-session",
        permissions: ["controls.manage"],
        isSuperUser: false,
      });
      return { success: true, data, error: null, status: 200 };
    };
  }),
}));

jest.mock("@/services/assurance/assurance-alert-recovery.service", () => ({
  recoverWorkflowAssuranceDeadLetter: jest.fn(),
}));

import { recoverWorkflowAssuranceDeadLetter } from "@/services/assurance/assurance-alert-recovery.service";

import { recoverWorkflowAssuranceDeadLetterAction } from "../workflow-assurance-alert.actions";

const mockRecover = recoverWorkflowAssuranceDeadLetter as jest.Mock;

describe("workflow assurance alert actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecover.mockResolvedValue({
      sourceDeliveryId: "delivery-dead",
      recoveryDeliveryId: "delivery-recovery",
      status: "PENDING",
      requestHash: "sha256-request",
      replayed: false,
    });
  });

  it("derives tenant and actor scope for dead-letter recovery", async () => {
    const result = await recoverWorkflowAssuranceDeadLetterAction({
      deliveryId: "delivery-dead",
      reason: "Retry after alert transport recovery.",
      idempotencyKey: "recovery-request-1",
      organizationId: "attacker-org",
    } as never);

    expect(result.success).toBe(true);
    expect(mockRecover).toHaveBeenCalledWith({
      deliveryId: "delivery-dead",
      reason: "Retry after alert transport recovery.",
      idempotencyKey: "recovery-request-1",
      organizationId: "org-session",
      actorId: "operator-session",
    });
  });

  it("requires controls.manage, fresh auth, audit, and handler-derived tenant scope", () => {
    const store = globalThis as typeof globalThis & {
      __workflowAssuranceAlertProtectOptions?: Array<Record<string, unknown>>;
    };
    expect(store.__workflowAssuranceAlertProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "controls.manage",
          auditResource: "WorkflowAssuranceAlertDelivery",
          auditAllowed: true,
          freshAuth: { maxAgeSeconds: 300 },
          tenantGuard: "handler-derived",
        }),
      ]),
    );
  });
});
