import {
  parseInventoryHistoryExportWorkerArgs,
  runInventoryHistoryExportWorker,
} from "../inventory-history-export-worker"

function dependencies() {
  return {
    expireInventoryHistoryBackgroundExports: jest.fn().mockResolvedValue({ expiredCount: 2 }),
    processInventoryHistoryBackgroundExportJob: jest.fn().mockResolvedValue({
      claimed: true,
      status: { jobId: "job-specific", status: "SENT" },
    }),
    processNextInventoryHistoryBackgroundExportJob: jest
      .fn()
      .mockResolvedValueOnce({
        claimed: true,
        status: { jobId: "job-1", status: "PENDING" },
      })
      .mockResolvedValueOnce({
        claimed: true,
        status: { jobId: "job-2", status: "SENT" },
      })
      .mockResolvedValue(null),
  }
}

describe("inventory history export worker", () => {
  it("parses bounded worker options and environment identity", () => {
    expect(parseInventoryHistoryExportWorkerArgs(
      ["--max-jobs", "3", "--max-pages", "5", "--expire"],
      {
        STOQUIFY_INVENTORY_HISTORY_EXPORT_ORGANIZATION_ID: "org-1",
        STOQUIFY_INVENTORY_HISTORY_EXPORT_WORKER_ID: "worker-a",
      },
    )).toEqual({
      organizationId: "org-1",
      workerId: "worker-a",
      maxJobs: 3,
      maxPagesPerLease: 5,
      expire: true,
      help: false,
    })
  })

  it("rejects missing identity, unknown flags, and unsafe bounds", () => {
    expect(() => parseInventoryHistoryExportWorkerArgs([], {})).toThrow(
      "--organization-id or STOQUIFY_INVENTORY_HISTORY_EXPORT_ORGANIZATION_ID is required.",
    )
    expect(() => parseInventoryHistoryExportWorkerArgs(
      ["--organization-id", "org-1", "--worker-id", "worker-a", "--unknown"],
      {},
    )).toThrow("Unknown argument: --unknown")
    expect(() => parseInventoryHistoryExportWorkerArgs(
      ["--organization-id", "org-1", "--worker-id", "worker-a", "--max-pages", "101"],
      {},
    )).toThrow("--max-pages must be between 1 and 100.")
    expect(() => parseInventoryHistoryExportWorkerArgs(
      ["--organization-id", "org-1", "--worker-id", "worker-a", "--job-id", "job-1", "--max-jobs", "2"],
      {},
    )).toThrow("--max-jobs cannot be combined with --job-id.")
  })

  it("allows help without loading secrets or requiring a worker identity", async () => {
    const args = parseInventoryHistoryExportWorkerArgs(["--help"], {})
    const service = dependencies()

    const result = await runInventoryHistoryExportWorker(args, service)

    expect(result).toEqual({ help: true, expired: 0, processed: [] })
    expect(service.expireInventoryHistoryBackgroundExports).not.toHaveBeenCalled()
    expect(service.processNextInventoryHistoryBackgroundExportJob).not.toHaveBeenCalled()
  })

  it("processes one explicit job without scanning the shared queue", async () => {
    const args = parseInventoryHistoryExportWorkerArgs(
      ["--organization-id", "org-1", "--worker-id", "worker-a", "--job-id", "job-specific", "--max-pages", "4"],
      {},
    )
    const service = dependencies()

    const result = await runInventoryHistoryExportWorker(args, service)

    expect(service.processInventoryHistoryBackgroundExportJob).toHaveBeenCalledWith({
      organizationId: "org-1",
      jobId: "job-specific",
      workerId: "worker-a",
      maxPagesPerLease: 4,
    })
    expect(service.processNextInventoryHistoryBackgroundExportJob).not.toHaveBeenCalled()
    expect(result.processed).toEqual([
      { jobId: "job-specific", status: "SENT", claimed: true },
    ])
  })

  it("expires artifacts and processes only the bounded number of queued jobs", async () => {
    const args = parseInventoryHistoryExportWorkerArgs(
      ["--organization-id", "org-1", "--worker-id", "worker-a", "--max-jobs", "2", "--max-pages", "6", "--expire"],
      {},
    )
    const service = dependencies()

    const result = await runInventoryHistoryExportWorker(args, service)

    expect(service.expireInventoryHistoryBackgroundExports).toHaveBeenCalledWith({
      organizationId: "org-1",
      workerId: "worker-a",
    })
    expect(service.processNextInventoryHistoryBackgroundExportJob).toHaveBeenCalledTimes(2)
    expect(service.processNextInventoryHistoryBackgroundExportJob).toHaveBeenCalledWith({
      organizationId: "org-1",
      workerId: "worker-a",
      maxPagesPerLease: 6,
    })
    expect(result).toEqual({
      help: false,
      expired: 2,
      processed: [
        { jobId: "job-1", status: "PENDING", claimed: true },
        { jobId: "job-2", status: "SENT", claimed: true },
      ],
    })
  })
})
