import {
  executeWhatsAppReceiptWorker,
  parseWhatsAppReceiptWorkerArgs,
} from "../whatsapp-receipt-worker"

describe("WhatsApp receipt worker CLI", () => {
  it("requires explicit tenant and worker identities", () => {
    expect(() => parseWhatsAppReceiptWorkerArgs([], {})).toThrow(
      /organization-id/i,
    )
  })

  it("parses a bounded one-shot worker invocation", () => {
    expect(
      parseWhatsAppReceiptWorkerArgs(
        [
          "--organization-id",
          "org-1",
          "--worker-id",
          "whatsapp-worker-1",
          "--limit",
          "40",
        ],
        {},
      ),
    ).toEqual({
      organizationId: "org-1",
      workerId: "whatsapp-worker-1",
      limit: 40,
      help: false,
    })
  })

  it("delegates one bounded tenant-scoped run to the service", async () => {
    const runWhatsAppReceiptWorker = jest.fn().mockResolvedValue([
      { requestId: "request-1", status: "SENT" },
    ])

    await expect(
      executeWhatsAppReceiptWorker(
        {
          organizationId: "org-1",
          workerId: "whatsapp-worker-1",
          limit: 25,
          help: false,
        },
        { runWhatsAppReceiptWorker },
      ),
    ).resolves.toEqual({
      help: false,
      results: [{ requestId: "request-1", status: "SENT" }],
    })

    expect(runWhatsAppReceiptWorker).toHaveBeenCalledWith({
      organizationId: "org-1",
      workerId: "whatsapp-worker-1",
      limit: 25,
    })
  })
})
