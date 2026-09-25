type Arguments = { organizationId: string; workerId: string; scanId: string; maxPages: number; help: boolean }
type Dependencies = { runReconciliationAlertScan: (input: Omit<Arguments, "help">) => Promise<{ state: string; scanId: string }> }
const help = `Usage: reconciliation-alert-worker --organization-id <id> --worker-id <id> --scan-id <UUID> [--max-pages <1..100>]
Use a new scan UUID for a new observation pass; reuse it until COMPLETE after interruption or failure.
Exit 0: complete/help. Exit 2: more pages remain. Exit 1: failure. No external messages are sent.
The command uses the configured database; it does not install a schedule or migrate/seed data.
`
export function parseReconciliationAlertWorkerArgs(argv: readonly string[]): Arguments {
  const result: Arguments = { organizationId: "", workerId: "", scanId: "", maxPages: 10, help: false }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === "--help") { result.help = true; continue }
    if (!["--organization-id", "--worker-id", "--scan-id", "--max-pages"].includes(flag)) throw new Error("Unknown worker argument.")
    const value = argv[++i]?.trim()
    if (!value || value.startsWith("--")) throw new Error("Missing worker argument value.")
    if (flag === "--organization-id") result.organizationId = value
    if (flag === "--worker-id") result.workerId = value
    if (flag === "--scan-id") result.scanId = value
    if (flag === "--max-pages") {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) throw new Error("Page limit must be 1..100.")
      result.maxPages = Number(value)
    }
  }
  if (!result.help && (!result.organizationId || result.organizationId.length > 128 || !result.workerId || result.workerId.length > 128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(result.scanId))) throw new Error("Explicit tenant, worker and scan UUID are required.")
  return result
}
export async function executeReconciliationAlertWorker(args: Arguments, dependencies?: Dependencies) {
  if (args.help) return { exitCode: 0, help }
  const service = dependencies ?? await import("../services/reconciliation/payment-reconciliation-alert-scan.service")
  const input = { organizationId: args.organizationId, workerId: args.workerId, scanId: args.scanId, maxPages: args.maxPages }
  const result = await service.runReconciliationAlertScan(input)
  return { exitCode: result.state === "COMPLETE" ? 0 : 2, result }
}
if (require.main === module) {
  void Promise.resolve().then(() => executeReconciliationAlertWorker(parseReconciliationAlertWorkerArgs(process.argv.slice(2))))
    .then(result => { process.stdout.write(JSON.stringify(result) + "\n"); process.exitCode = result.exitCode })
    .catch(() => { process.stderr.write("Reconciliation alert scan failed. Inspect the tenant scan receipt and retry the same scan ID.\n"); process.exitCode = 1 })
    .finally(async () => { const { db } = await import("../prisma/db"); await db.$disconnect() })
}
