type Arguments = { organizationId: string; workerId: string; limit: number; help: boolean }
const help = "Usage: close-evidence-notification-worker --organization-id <id> --worker-id <unique-id> [--limit <1..100>]\nPublishes retained Close evidence events to the in-app inbox. Uses the configured database. No migration, seed, schedule or external messages. Exit 1 means a failure/retry needs investigation; exit 0 is not proof of an empty queue."
export function parseCloseEvidenceNotificationArgs(argv: readonly string[]): Arguments {
  const args: Arguments = { organizationId: "", workerId: "", limit: 25, help: false }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === "--help") { args.help = true; continue }
    if (!["--organization-id", "--worker-id", "--limit"].includes(flag)) throw new Error("Unknown worker argument")
    const value = argv[++i]?.trim()
    if (!value || value.startsWith("--")) throw new Error("Missing worker argument value")
    if (flag === "--organization-id") args.organizationId = value
    if (flag === "--worker-id") args.workerId = value
    if (flag === "--limit") {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) throw new Error("Limit must be 1..100")
      args.limit = Number(value)
    }
  }
  if (!args.help && (!args.organizationId || args.organizationId.length > 128 || !args.workerId || args.workerId.length > 128)) throw new Error("Explicit tenant and worker identity required")
  return args
}
export async function executeCloseEvidenceNotificationWorker(args: Arguments) {
  if (args.help) return { exitCode: 0, help }
  const { runCloseEvidenceNotificationWorker } = await import("../services/accounting/close-evidence-notification.worker")
  const results = await runCloseEvidenceNotificationWorker({ organizationId: args.organizationId, workerId: args.workerId, limit: args.limit })
  return { exitCode: results.some(result => result.status !== "SENT") ? 1 : 0, results }
}
if (require.main === module) {
  void Promise.resolve().then(() => executeCloseEvidenceNotificationWorker(parseCloseEvidenceNotificationArgs(process.argv.slice(2))))
    .then(result => { process.stdout.write(JSON.stringify(result) + "\n"); process.exitCode = result.exitCode })
    .catch(() => { process.stderr.write("Close evidence publication failed. Inspect the tenant outbox and its retry backoff.\n"); process.exitCode = 1 })
    .finally(async () => { const { db } = await import("../prisma/db"); await db.$disconnect() })
}
