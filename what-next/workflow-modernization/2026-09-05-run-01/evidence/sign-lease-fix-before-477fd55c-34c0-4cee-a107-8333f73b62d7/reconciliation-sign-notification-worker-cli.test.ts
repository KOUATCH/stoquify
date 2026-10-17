import { parseReconciliationSignNotificationArgs as parse, executeReconciliationSignNotificationWorker as execute } from "../reconciliation-sign-notification-worker"
const argv = ["--organization-id", "org-1", "--worker-id", "worker-1"]
it("help does not call the worker", async () => {
  const runReconciliationSignNotificationWorker = jest.fn()
  expect(await execute(parse(["--help"]), { runReconciliationSignNotificationWorker })).toMatchObject({ exitCode: 0 })
  expect(runReconciliationSignNotificationWorker).not.toHaveBeenCalled()
})
it.each([[], ["--unknown"], [...argv, "--limit", "101"], [...argv, "--limit", "1.5"], ["--organization-id", "org-1"]].map(args => ({ args })))("rejects invalid arguments", ({ args }) => {
  expect(() => parse(args)).toThrow()
})
it.each([["SENT", 0], ["FAILED", 1], ["DEAD_LETTER", 1]] as const)("reports %s honestly", async (status, exitCode) => {
  const runReconciliationSignNotificationWorker = jest.fn().mockResolvedValue([{ status }])
  expect(await execute(parse([...argv, "--limit", "3"]), { runReconciliationSignNotificationWorker })).toMatchObject({ exitCode })
  expect(runReconciliationSignNotificationWorker).toHaveBeenCalledWith({ organizationId: "org-1", workerId: "worker-1", limit: 3 })
})
