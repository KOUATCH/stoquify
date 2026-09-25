/** @jest-environment node */
import { executeReconciliationAlertWorker, parseReconciliationAlertWorkerArgs } from "../reconciliation-alert-worker"
const argv = ["--organization-id", "org-1", "--worker-id", "worker-1", "--scan-id", "c781b497-8491-46b9-bc94-e626b2c28816"]
it.each([[], ["--organization-id"], [...argv, "--max-pages", "0"], [...argv, "--max-pages", "101"], [...argv, "--unknown"]].map(input => ({ input })))("rejects invalid worker arguments before loading a service: $input", ({ input }) => {
  expect(() => parseReconciliationAlertWorkerArgs(input)).toThrow()
})
it("shows help without invoking processing", async () => {
  const runReconciliationAlertScan = jest.fn()
  expect(await executeReconciliationAlertWorker(parseReconciliationAlertWorkerArgs(["--help"]), { runReconciliationAlertScan })).toMatchObject({ exitCode: 0 })
  expect(runReconciliationAlertScan).not.toHaveBeenCalled()
})
it.each([["RUNNING", 2], ["COMPLETE", 0]])("returns a distinct exit status for %s", async (state, code) => {
  const input = parseReconciliationAlertWorkerArgs([...argv, "--max-pages", "1"]), runReconciliationAlertScan = jest.fn().mockResolvedValue({ state, scanId: input.scanId })
  expect(await executeReconciliationAlertWorker(input, { runReconciliationAlertScan })).toMatchObject({ exitCode: code })
  expect(runReconciliationAlertScan).toHaveBeenCalledWith({ organizationId: "org-1", workerId: "worker-1", scanId: input.scanId, maxPages: 1 })
})
it("propagates failure without substituting an empty successful result", async () => {
  await expect(executeReconciliationAlertWorker(parseReconciliationAlertWorkerArgs(argv), { runReconciliationAlertScan: jest.fn().mockRejectedValue(new Error("owned failure")) })).rejects.toThrow("owned failure")
})
