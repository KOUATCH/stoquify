import { mkdir, writeFile } from "fs/promises"
import { dirname, resolve } from "path"

import { db } from "../prisma/db"
import {
  formatPayrollSeedBackfillDryRunReport,
  generatePayrollSeedBackfillDryRunPlan,
  type PayrollSeedBackfillDryRunInput,
} from "../services/payroll/payroll-seed-backfill-plan.service"

function readArgs(argv: string[]) {
  const args = new Map<string, string | boolean>()
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith("--")) continue

    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith("--")) {
      args.set(key, true)
      continue
    }

    args.set(key, next)
    index += 1
  }
  return args
}

function stringArg(args: Map<string, string | boolean>, key: string) {
  const value = args.get(key)
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function requiredArg(args: Map<string, string | boolean>, key: string) {
  const value = stringArg(args, key)
  if (!value) throw new Error(`Missing required --${key}.`)
  return value
}

function numberArg(args: Map<string, string | boolean>, key: string) {
  const value = stringArg(args, key)
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`--${key} must be a positive number.`)
  return parsed
}

export async function runPayrollSeedBackfillDryRunCli(argv = process.argv.slice(2)) {
  const args = readArgs(argv)
  const input: PayrollSeedBackfillDryRunInput = {
    organizationId: requiredArg(args, "organization-id"),
    actorId: stringArg(args, "actor-id"),
    countryCode: stringArg(args, "country-code"),
    periodStart: requiredArg(args, "period-start"),
    periodEnd: requiredArg(args, "period-end"),
    payDate: requiredArg(args, "pay-date"),
    employeeSourceMode: (stringArg(args, "employee-source-mode") ?? "users") as PayrollSeedBackfillDryRunInput["employeeSourceMode"],
    maxRows: numberArg(args, "max-rows"),
    dryRun: stringArg(args, "dry-run") !== "false" && args.get("mutation") !== true,
  }

  const plan = await generatePayrollSeedBackfillDryRunPlan(input)
  const report = formatPayrollSeedBackfillDryRunReport(plan)
  const out = stringArg(args, "out")

  if (out) {
    const target = resolve(out)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, report, "utf8")
    console.log(`Redacted payroll dry-run report saved to ${target}`)
    return
  }

  console.log(report)
}

if (require.main === module) {
  runPayrollSeedBackfillDryRunCli()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(async () => {
      await db.$disconnect()
    })
}
