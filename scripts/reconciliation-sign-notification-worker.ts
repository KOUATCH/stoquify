type Arguments = { organizationId: string; workerId: string; limit: number; help: boolean }
type Dependencies = { runReconciliationSignNotificationWorker: (input: Omit<Arguments, "help">) => Promise<Array<{ status: string }>> }
const help = `Usage: reconciliation-sign-notification-worker --organization-id <id> --worker-id <unique-worker-id> [--limit <1..100>]
Publishes validated signature observations to the workspace reconciliation inbox.
Uses the configured database. No migration, seed, schedule or external message.
Exit 0: batch completed/help (not proof of an empty queue). Exit 1: failure/retry required.
Failed delivery follows the existing outbox backoff and maximum-attempt controls.
`
export function parseReconciliationSignNotificationArgs(argv: readonly string[]): Arguments {
  const args: Arguments = { organizationId: "", workerId: "", limit: 25, help: false }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === "--help") { args.help = true; continue }
    if (!["--organization-id", "--worker-id", "--limit"].includes(flag)) throw new Error("Unknown worker argument.")
    const value = argv[++i]?.trim()
    if (!value || value.startsWith("--")) throw new Error("Missing worker argument value.")
    if (flag === "--organization-id") args.organizationId = value
    if (flag === "--worker-id") args.workerId = value
    if (flag === "--limit") {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) throw new Error("Limit must be 1..100.")
      args.limit = Number(value)
    }
  }
  if (!args.help && (!args.organizationId || args.organizationId.length > 128 || !args.workerId || args.workerId.length > 128))
    throw new Error("Explicit tenant and unique worker identity are required.")
  return args
}
export async function executeReconciliationSignNotificationWorker(args: Arguments, dependencies?: Dependencies) {
  if (args.help) return { exitCode: 0, help }
  const service = dependencies ?? await import("../services/reconciliation/reconciliation-sign-notification.worker")
  const results = await service.runReconciliationSignNotificationWorker({ organizationId: args.organizationId, workerId: args.workerId, limit: args.limit })
  return { exitCode: results.some(result => result.status !== "SENT") ? 1 : 0, results }
}
if (require.main === module) {
  void Promise.resolve().then(() => executeReconciliationSignNotificationWorker(parseReconciliationSignNotificationArgs(process.argv.slice(2))))
    .then(result => { process.stdout.write(JSON.stringify(result) + "\n"); process.exitCode = result.exitCode })
    .catch(() => { process.stderr.write("Reconciliation signature notification failed. Inspect the scoped outbox status and retry according to its backoff.\n"); process.exitCode = 1 })
    .finally(async () => { const { db } = await import("../prisma/db"); await db.$disconnect() })
}
