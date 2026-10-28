type WhatsAppReceiptWorkerArguments = {
  organizationId: string
  workerId: string
  limit: number
  help: boolean
}

type WorkerEnvironment = Record<string, string | undefined>

type WhatsAppReceiptWorkerDependencies = {
  runWhatsAppReceiptWorker: (input: {
    organizationId: string
    workerId: string
    limit: number
  }) => Promise<unknown>
}

const HELP = `Usage: whatsapp-receipt-worker [options]

Options:
  --organization-id <id> Tenant queue scope (or STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID)
  --worker-id <id>       Stable worker identity (or STOQUIFY_WHATSAPP_RECEIPT_WORKER_ID)
  --limit <count>        Maximum requests to claim (default: 25, maximum: 100)
  --help                 Show this help
`

function parseLimit(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error("--limit requires an integer.")
  }
  const parsed = Number(value)
  if (parsed < 1 || parsed > 100) {
    throw new Error("--limit must be between 1 and 100.")
  }
  return parsed
}

export function parseWhatsAppReceiptWorkerArgs(
  argv: readonly string[],
  environment: WorkerEnvironment = process.env,
): WhatsAppReceiptWorkerArguments {
  const result: WhatsAppReceiptWorkerArguments = {
    organizationId:
      environment.STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID?.trim() ?? "",
    workerId: environment.STOQUIFY_WHATSAPP_RECEIPT_WORKER_ID?.trim() ?? "",
    limit: 25,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help") {
      result.help = true
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
    if (argument === "--limit") {
      result.limit = parseLimit(argv[++index])
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }

  if (!result.help && !result.organizationId) {
    throw new Error(
      "--organization-id or STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID is required.",
    )
  }
  if (!result.help && !result.workerId) {
    throw new Error(
      "--worker-id or STOQUIFY_WHATSAPP_RECEIPT_WORKER_ID is required.",
    )
  }
  if (result.organizationId.length > 128) {
    throw new Error("Organization identity is too long.")
  }
  if (result.workerId.length > 128) {
    throw new Error("Worker identity is too long.")
  }

  return result
}

async function loadDependencies(): Promise<WhatsAppReceiptWorkerDependencies> {
  return import("../services/communication/whatsapp-receipt-worker.service")
}

export async function executeWhatsAppReceiptWorker(
  arguments_: WhatsAppReceiptWorkerArguments,
  dependencies?: WhatsAppReceiptWorkerDependencies,
) {
  if (arguments_.help) return { help: true, results: [] }
  const service = dependencies ?? (await loadDependencies())
  const results = await service.runWhatsAppReceiptWorker({
    organizationId: arguments_.organizationId,
    workerId: arguments_.workerId,
    limit: arguments_.limit,
  })
  return { help: false, results }
}

async function main() {
  const arguments_ = parseWhatsAppReceiptWorkerArgs(process.argv.slice(2))
  if (arguments_.help) {
    process.stdout.write(HELP)
    return
  }

  const result = await executeWhatsAppReceiptWorker(arguments_)
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "WhatsApp receipt worker failed."
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
