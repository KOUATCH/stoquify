import {
  executeFiscalizationWorker,
  parseFiscalizationWorkerArgs,
} from "../fiscalization-worker"

describe("fiscalization worker CLI", () => {
  it("requires explicit tenant and worker identities", () => {
    expect(() => parseFiscalizationWorkerArgs([], {})).toThrow(
      /organization-id/i,
    )
  })

  it("parses a bounded one-shot worker invocation", () => {
    expect(
      parseFiscalizationWorkerArgs(
        [
          "--organization-id",
          "org-1",
          "--worker-id",
          "fiscal-worker-1",
          "--limit",
          "40",
        ],
        {},
      ),
    ).toEqual({
      organizationId: "org-1",
      workerId: "fiscal-worker-1",
      limit: 40,
      help: false,
    })
  })

  it("delegates one bounded tenant-scoped run to the service", async () => {
    const runFiscalizationWorker = jest.fn().mockResolvedValue([
      { requestId: "request-1", status: "SENT" },
    ])

    await expect(
      executeFiscalizationWorker(
        {
          organizationId: "org-1",
          workerId: "fiscal-worker-1",
          limit: 25,
          help: false,
        },
        { runFiscalizationWorker },
      ),
    ).resolves.toEqual({
      help: false,
      results: [{ requestId: "request-1", status: "SENT" }],
    })

    expect(runFiscalizationWorker).toHaveBeenCalledWith({
      organizationId: "org-1",
      workerId: "fiscal-worker-1",
      limit: 25,
    })
  })
})
