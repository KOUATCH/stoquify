import {
  executeReferralDeliveryWorker,
  parseReferralDeliveryWorkerArgs,
} from "../referral-delivery-worker"

describe("referral delivery worker CLI", () => {
  it("requires explicit tenant and worker identities", () => {
    expect(() => parseReferralDeliveryWorkerArgs([], {})).toThrow(
      /organization-id/i,
    )
  })

  it("parses one bounded tenant-scoped invocation", () => {
    expect(
      parseReferralDeliveryWorkerArgs(
        [
          "--organization-id",
          "org-1",
          "--worker-id",
          "referral-worker-1",
          "--limit",
          "40",
        ],
        {},
      ),
    ).toEqual({
      organizationId: "org-1",
      workerId: "referral-worker-1",
      limit: 40,
      help: false,
    })
  })

  it("runs both referral delivery queues with the same bounded scope", async () => {
    const dependencies = {
      runCustomerStatementDeliveryWorker: jest.fn().mockResolvedValue([
        { requestId: "statement-1", status: "SENT" },
      ]),
      runAccountantClientInviteWorker: jest.fn().mockResolvedValue([
        { requestId: "invite-1", status: "SENT" },
      ]),
    }
    const input = {
      organizationId: "org-1",
      workerId: "referral-worker-1",
      limit: 25,
      help: false,
    }

    await expect(
      executeReferralDeliveryWorker(input, dependencies),
    ).resolves.toEqual({
      help: false,
      statements: [{ requestId: "statement-1", status: "SENT" }],
      accountantInvites: [{ requestId: "invite-1", status: "SENT" }],
    })
    const expectedScope = {
      organizationId: "org-1",
      workerId: "referral-worker-1",
      limit: 25,
    }
    expect(
      dependencies.runCustomerStatementDeliveryWorker,
    ).toHaveBeenCalledWith(expectedScope)
    expect(
      dependencies.runAccountantClientInviteWorker,
    ).toHaveBeenCalledWith(expectedScope)
  })
})
