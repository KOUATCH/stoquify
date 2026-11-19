import {
  executeReferralDeliveryWorker,
  parseReferralDeliveryWorkerArgs,
  runReferralDeliveryWorkerCli,
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

describe("referral delivery worker process output", () => {
  let stdout: jest.SpyInstance
  let stderr: jest.SpyInstance

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
    stderr = jest.spyOn(process.stderr, "write").mockImplementation(() => true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function dependencies() {
    return {
      runCustomerStatementDeliveryWorker: jest.fn().mockResolvedValue([]),
      runAccountantClientInviteWorker: jest.fn().mockResolvedValue([]),
    }
  }

  it("prints help without calling either queue", async () => {
    const service = dependencies()

    await expect(runReferralDeliveryWorkerCli(["--help"], {}, service)).resolves.toBe(0)

    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Usage: referral-delivery-worker"))
    expect(stderr).not.toHaveBeenCalled()
    expect(service.runCustomerStatementDeliveryWorker).not.toHaveBeenCalled()
    expect(service.runAccountantClientInviteWorker).not.toHaveBeenCalled()
  })

  it.each([
    { label: "tenant and worker", argv: [] },
    { label: "worker", argv: ["--organization-id", "org-1"] },
  ])("refuses missing $label arguments before invoking queues", async ({ argv }) => {
    const service = dependencies()

    await expect(runReferralDeliveryWorkerCli(argv, {}, service)).resolves.toBe(1)

    expect(stdout).not.toHaveBeenCalled()
    expect(stderr).toHaveBeenCalledTimes(1)
    expect(service.runCustomerStatementDeliveryWorker).not.toHaveBeenCalled()
    expect(service.runAccountantClientInviteWorker).not.toHaveBeenCalled()
  })

  it("passes the explicit bounded scope and prints both queue results", async () => {
    const service = dependencies()

    await expect(runReferralDeliveryWorkerCli(
      ["--organization-id", "org-1", "--worker-id", "worker-1", "--limit", "40"],
      {},
      service,
    )).resolves.toBe(0)

    const scope = { organizationId: "org-1", workerId: "worker-1", limit: 40 }
    expect(service.runCustomerStatementDeliveryWorker).toHaveBeenCalledWith(scope)
    expect(service.runAccountantClientInviteWorker).toHaveBeenCalledWith(scope)
    expect(stdout).toHaveBeenCalledWith(JSON.stringify({ help: false, statements: [], accountantInvites: [] }) + "\n")
    expect(stderr).not.toHaveBeenCalled()
  })

  it.each(["0", "101", "not-a-limit"])("refuses an invalid limit without invoking queues: %s", async (limit) => {
    const service = dependencies()

    await expect(runReferralDeliveryWorkerCli(
      ["--organization-id", "org-1", "--worker-id", "worker-1", "--limit", limit],
      {},
      service,
    )).resolves.toBe(1)

    expect(stdout).not.toHaveBeenCalled()
    expect(service.runCustomerStatementDeliveryWorker).not.toHaveBeenCalled()
    expect(service.runAccountantClientInviteWorker).not.toHaveBeenCalled()
  })

  it("does not print secrets, provider responses or stacks from a failed service", async () => {
    const service = dependencies()
    const privateDetail = "postgresql://fixture:DO_NOT_PRINT@localhost/private?token=PRIVATE_PROVIDER_DETAIL"
    service.runCustomerStatementDeliveryWorker.mockRejectedValue(new Error(privateDetail))

    await expect(runReferralDeliveryWorkerCli(
      ["--organization-id", "org-1", "--worker-id", "worker-1"],
      {},
      service,
    )).resolves.toBe(1)

    expect(stdout).not.toHaveBeenCalled()
    expect(stderr).toHaveBeenCalledTimes(1)
    const output = String(stderr.mock.calls[0][0])
    expect(output).toMatch(/^Referral delivery worker failed\./)
    expect(output).not.toContain(privateDetail)
    expect(output).not.toMatch(/DO_NOT_PRINT|PRIVATE_PROVIDER_DETAIL|postgresql:|Error:|\bat /)
    expect(output.length).toBeLessThan(200)
  })

  it("does not echo an unknown argument into the process error output", async () => {
    const service = dependencies()
    const privateArgument = "PRIVATE_ARGUMENT_DO_NOT_PRINT"

    await expect(runReferralDeliveryWorkerCli([privateArgument], {}, service)).resolves.toBe(1)

    expect(stdout).not.toHaveBeenCalled()
    expect(String(stderr.mock.calls[0][0])).not.toContain(privateArgument)
    expect(service.runCustomerStatementDeliveryWorker).not.toHaveBeenCalled()
    expect(service.runAccountantClientInviteWorker).not.toHaveBeenCalled()
  })

  it.each(["statements", "accountantInvites"])("retains %s results and fails an unconfirmed batch", async (queue) => {
    const service = dependencies()
    const results = [{ requestId: "request-1", status: "UNCONFIRMED", error: "Review the retained request." }]
    const worker = queue === "statements"
      ? service.runCustomerStatementDeliveryWorker
      : service.runAccountantClientInviteWorker
    worker.mockResolvedValue(results)

    await expect(runReferralDeliveryWorkerCli(
      ["--organization-id", "org-1", "--worker-id", "worker-1"],
      {},
      service,
    )).resolves.toBe(1)

    expect(JSON.parse(String(stdout.mock.calls[0][0]))[queue]).toEqual(results)
    expect(stderr).toHaveBeenCalledTimes(1)
    expect(String(stderr.mock.calls[0][0])).toMatch(/unconfirmed.*Review retained requests/)
    expect(String(stderr.mock.calls[0][0]).length).toBeLessThan(200)
  })

  it.each([
    { label: "disabled provider", status: "DEFERRED", code: "PROVIDER_NOT_CONFIGURED" },
    { label: "operator review", status: "DEFERRED", code: "PROVIDER_OUTCOME_UNKNOWN" },
    { label: "in-flight reservation", status: "PROCESSING" },
    { label: "lost lease", status: "LEASE_LOST" },
  ])("preserves reported $label state without calling it an unconfirmed invocation", async ({ label: _label, ...result }) => {
    const service = dependencies()
    service.runAccountantClientInviteWorker.mockResolvedValue([{ requestId: "request-1", ...result }])

    await expect(runReferralDeliveryWorkerCli(
      ["--organization-id", "org-1", "--worker-id", "worker-1"],
      {},
      service,
    )).resolves.toBe(0)

    expect(JSON.parse(String(stdout.mock.calls[0][0])).accountantInvites[0]).toEqual({ requestId: "request-1", ...result })
    expect(stderr).not.toHaveBeenCalled()
  })
})
