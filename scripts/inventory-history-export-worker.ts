type WorkerArguments = {
  organizationId: string
  workerId: string
  jobId?: string
  maxJobs: number
  maxPagesPerLease: number
  expire: boolean
  help: boolean
}

type WorkerEnvironment = Record<string, string | undefined>

type WorkerResult = {
  claimed: boolean
  status: { jobId: string; status: string }
}

type WorkerDependencies = {
  expireInventoryHistoryBackgroundExports: (input: {
    organizationId: string
    workerId: string
  }) => Promise<{ expiredCount: number }>
  processInventoryHistoryBackgroundExportJob: (input: {
    organizationId: string
    jobId: string
    workerId: string
    maxPagesPerLease: number
  }) => Promise<WorkerResult>
  processNextInventoryHistoryBackgroundExportJob: (input: {
    organizationId: string
    workerId: string
    maxPagesPerLease: number
  }) => Promise<WorkerResult | null>
}

const HELP = `Usage: inventory-history-export-worker [options]

Options:
  --organization-id <id> Tenant queue scope (or STOQUIFY_INVENTORY_HISTORY_EXPORT_ORGANIZATION_ID)
  --worker-id <id>     Stable worker identity (or STOQUIFY_INVENTORY_HISTORY_EXPORT_WORKER_ID)
  --job-id <id>        Process one specific inventory-history export job
  --max-jobs <count>   Maximum queued jobs to claim (default: 1, maximum: 100)
  --max-pages <count>  Maximum pages per lease (default: 10, maximum: 100)
  --expire             Crypto-shred expired export artifacts before processing
  --help               Show this help
`

function parseInteger(value: string | undefined, flag: string, minimum: number, maximum: number) {
  if (!value || !/^\d+$/.test(value)) throw new Error(`${flag} requires an integer.`)
  const parsed = Number(value)
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${flag} must be between ${minimum} and ${maximum}.`)
  }
  return parsed
}

export function parseInventoryHistoryExportWorkerArgs(
  argv: readonly string[],
  env: WorkerEnvironment = process.env,
): WorkerArguments {
  const result: WorkerArguments = {
    organizationId: env.STOQUIFY_INVENTORY_HISTORY_EXPORT_ORGANIZATION_ID?.trim() ?? "",
    workerId: env.STOQUIFY_INVENTORY_HISTORY_EXPORT_WORKER_ID?.trim() ?? "",
    maxJobs: 1,
    maxPagesPerLease: 10,
    expire: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help") {
      result.help = true
      continue
    }
    if (argument === "--expire") {
      result.expire = true
      continue
    }
    if (argument === "--organization-id") {
      result.organizationId = argv[++index]?.trim() ?? ""
      continue
    }
    if (argument === "--worker-id") {
      result.workerId = argv[++index]?.trim() ?? ""
      continue
    }
    if (argument === "--job-id") {
      result.jobId = argv[++index]?.trim()
      if (!result.jobId) throw new Error("--job-id requires a value.")
      continue
    }
    if (argument === "--max-jobs") {
      result.maxJobs = parseInteger(argv[++index], "--max-jobs", 1, 100)
      continue
    }
    if (argument === "--max-pages") {
      result.maxPagesPerLease = parseInteger(argv[++index], "--max-pages", 1, 100)
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }

  if (!result.help && !result.organizationId) {
    throw new Error(
      "--organization-id or STOQUIFY_INVENTORY_HISTORY_EXPORT_ORGANIZATION_ID is required.",
    )
  }
  if (!result.help && !result.workerId) {
    throw new Error(
      "--worker-id or STOQUIFY_INVENTORY_HISTORY_EXPORT_WORKER_ID is required.",
    )
  }
  if (result.organizationId.length > 128) throw new Error("Organization identity is too long.")
  if (result.workerId.length > 128) throw new Error("Worker identity is too long.")
  if (result.jobId && result.maxJobs !== 1) {
    throw new Error("--max-jobs cannot be combined with --job-id.")
  }
  return result
}

async function loadDependencies(): Promise<WorkerDependencies> {
  return import("@/services/inventory/inventory-history-background-export.service")
}

export async function runInventoryHistoryExportWorker(
  args: WorkerArguments,
  dependencies?: WorkerDependencies,
) {
  if (args.help) return { help: true, expired: 0, processed: [] }
  const service = dependencies ?? await loadDependencies()
  const processed: Array<{ jobId: string; status: string; claimed: boolean }> = []
  const expired = args.expire
    ? (await service.expireInventoryHistoryBackgroundExports({
        organizationId: args.organizationId,
        workerId: args.workerId,
      })).expiredCount
    : 0

  if (args.jobId) {
    const result = await service.processInventoryHistoryBackgroundExportJob({
      organizationId: args.organizationId,
      jobId: args.jobId,
      workerId: args.workerId,
      maxPagesPerLease: args.maxPagesPerLease,
    })
    processed.push({
      jobId: result.status.jobId,
      status: result.status.status,
      claimed: result.claimed,
    })
    return { help: false, expired, processed }
  }

  for (let count = 0; count < args.maxJobs; count += 1) {
    const result = await service.processNextInventoryHistoryBackgroundExportJob({
      organizationId: args.organizationId,
      workerId: args.workerId,
      maxPagesPerLease: args.maxPagesPerLease,
    })
    if (!result) break
    processed.push({
      jobId: result.status.jobId,
      status: result.status.status,
      claimed: result.claimed,
    })
  }
  return { help: false, expired, processed }
}

async function main() {
  const args = parseInventoryHistoryExportWorkerArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(HELP)
    return
  }
  const result = await runInventoryHistoryExportWorker(args)
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Inventory history export worker failed."
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
