type ReferralDeliveryWorkerArguments = {
  organizationId: string
  workerId: string
  limit: number
  help: boolean
}

type WorkerEnvironment = Record<string, string | undefined>

type ReferralDeliveryWorkerDependencies = {
  runCustomerStatementDeliveryWorker: (input: {
    organizationId: string
    workerId: string
    limit: number
  }) => Promise<unknown>
  runAccountantClientInviteWorker: (input: {
    organizationId: string
    workerId: string
    limit: number
  }) => Promise<unknown>
}

const HELP = `Usage: referral-delivery-worker [options]

Options:
  --organization-id <id> Tenant queue scope (or STOQUIFY_REFERRAL_DELIVERY_ORGANIZATION_ID)
  --worker-id <id>       Stable worker identity (or STOQUIFY_REFERRAL_DELIVERY_WORKER_ID)
  --limit <count>        Maximum requests per queue (default: 25, maximum: 100)
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

export function parseReferralDeliveryWorkerArgs(
  argv: readonly string[],
  environment: WorkerEnvironment = process.env,
): ReferralDeliveryWorkerArguments {
  const result: ReferralDeliveryWorkerArguments = {
    organizationId:
      environment.STOQUIFY_REFERRAL_DELIVERY_ORGANIZATION_ID?.trim() ?? "",
    workerId:
      environment.STOQUIFY_REFERRAL_DELIVERY_WORKER_ID?.trim() ?? "",
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
      "--organization-id or STOQUIFY_REFERRAL_DELIVERY_ORGANIZATION_ID is required.",
    )
  }
  if (!result.help && !result.workerId) {
    throw new Error(
      "--worker-id or STOQUIFY_REFERRAL_DELIVERY_WORKER_ID is required.",
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

async function loadDependencies(): Promise<ReferralDeliveryWorkerDependencies> {
  const [statements, invitations] = await Promise.all([
    import("../services/communication/customer-statement-delivery-worker.service"),
    import("../services/communication/accountant-client-invite-worker.service"),
  ])
  return {
    runCustomerStatementDeliveryWorker:
      statements.runCustomerStatementDeliveryWorker,
    runAccountantClientInviteWorker:
      invitations.runAccountantClientInviteWorker,
  }
}

export async function executeReferralDeliveryWorker(
  arguments_: ReferralDeliveryWorkerArguments,
  dependencies?: ReferralDeliveryWorkerDependencies,
) {
  if (arguments_.help) {
    return { help: true, statements: [], accountantInvites: [] }
  }
  const service = dependencies ?? (await loadDependencies())
  const common = {
    organizationId: arguments_.organizationId,
    workerId: arguments_.workerId,
    limit: arguments_.limit,
  }
  const [statements, accountantInvites] = await Promise.all([
    service.runCustomerStatementDeliveryWorker(common),
    service.runAccountantClientInviteWorker(common),
  ])
  return { help: false, statements, accountantInvites }
}

async function main() {
  const arguments_ = parseReferralDeliveryWorkerArgs(process.argv.slice(2))
  if (arguments_.help) {
    process.stdout.write(HELP)
    return
  }
  const result = await executeReferralDeliveryWorker(arguments_)
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Referral delivery worker failed."
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
