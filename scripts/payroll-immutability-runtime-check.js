#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")

const MODES = new Set(["report", "warn", "fail"])
const SAFE_DB_NAME = /(test|ci|local|sandbox|immutability)/i
const REQUIRED_TRIGGERS = [
  ["payroll_runs", "payroll_runs_prevent_finalized_mutation_trigger"],
  ["payroll_run_lines", "payroll_run_lines_prevent_posted_mutation_trigger"],
  ["payroll_payslips", "payroll_payslips_prevent_emitted_mutation_trigger"],
  ["payroll_payslip_lines", "payroll_payslip_lines_prevent_emitted_mutation_trigger"],
  ["payroll_payment_batches", "payroll_payment_batches_prevent_released_mutation_trigger"],
  ["payroll_payment_allocations", "payroll_payment_allocations_prevent_released_mutation_trigger"],
  ["payroll_declarations", "payroll_declarations_prevent_payload_mutation_trigger"],
  ["payroll_declaration_evidence", "payroll_declaration_evidence_prevent_mutation_trigger"],
]

function parseArgs(argv) {
  const args = { mode: "report", applyMigrations: true, out: null, jsonOut: null }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else if (arg === "--skip-migrate") args.applyMigrations = false
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/payroll-immutability-runtime-check.js [--mode report|warn|fail] [--skip-migrate] [--out file] [--json-out file]")
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  if (!MODES.has(args.mode)) throw new Error("--mode must be one of: report, warn, fail")
  return args
}

function safeDatabase() {
  const urlValue = process.env.PAYROLL_IMMUTABILITY_DATABASE_URL || process.env.TEST_DATABASE_URL || ""
  if (!urlValue) {
    throw new Error("Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL to a dedicated non-production PostgreSQL database.")
  }
  if (process.env.DATABASE_URL === urlValue && process.env.PAYROLL_IMMUTABILITY_ALLOW_SHARED_DATABASE !== "true") {
    throw new Error("Refusing to use DATABASE_URL directly. Use a dedicated payroll immutability test database URL.")
  }

  const parsed = new URL(urlValue)
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Payroll immutability runtime checks require PostgreSQL.")
  }
  const dbName = parsed.pathname.replace(/^\//, "")
  if (!SAFE_DB_NAME.test(dbName)) {
    throw new Error(`Refusing database "${dbName}". Database name must include test, ci, local, sandbox, or immutability.`)
  }
  return { urlValue, dbName, host: parsed.hostname }
}

function runMigrateDeploy(urlValue) {
  const command = "npx"
  const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: urlValue },
    encoding: "utf8",
    shell: process.platform === "win32",
  })
  return {
    exitCode: result.status ?? (result.error ? 1 : 1),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? `${result.error.code ?? result.error.name}: ${result.error.message}` : "",
  }
}

async function execute(tx, sql, ...params) {
  return tx.$executeRawUnsafe(sql, ...params)
}

async function query(tx, sql, ...params) {
  return tx.$queryRawUnsafe(sql, ...params)
}

function ids() {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  return {
    org: `payroll_immut_org_${suffix}`,
    employee: `payroll_immut_emp_${suffix}`,
    contract: `payroll_immut_contract_${suffix}`,
    period: `payroll_immut_period_${suffix}`,
    run: `payroll_immut_run_${suffix}`,
    runLine: `payroll_immut_run_line_${suffix}`,
    payslip: `payroll_immut_payslip_${suffix}`,
    payslipLine: `payroll_immut_payslip_line_${suffix}`,
    declaration: `payroll_immut_declaration_${suffix}`,
    declarationEvidence: `payroll_immut_declaration_evidence_${suffix}`,
    batch: `payroll_immut_batch_${suffix}`,
    allocation: `payroll_immut_allocation_${suffix}`,
  }
}

async function expectBlocked(tx, label, sql, ...params) {
  await execute(tx, `SAVEPOINT ${label}`)
  try {
    await execute(tx, sql, ...params)
  } catch (error) {
    await execute(tx, `ROLLBACK TO SAVEPOINT ${label}`)
    await execute(tx, `RELEASE SAVEPOINT ${label}`)
    const message = errorSummary(error).replace(/:\s*$/, "").trim()
    return { label, passed: true, message: message || "Database rejected mutation." }
  }
  await execute(tx, `ROLLBACK TO SAVEPOINT ${label}`)
  await execute(tx, `RELEASE SAVEPOINT ${label}`)
  return { label, passed: false, message: "Mutation unexpectedly succeeded." }
}

async function expectAllowed(tx, label, sql, ...params) {
  await execute(tx, `SAVEPOINT ${label}`)
  try {
    await execute(tx, sql, ...params)
    await execute(tx, `ROLLBACK TO SAVEPOINT ${label}`)
    await execute(tx, `RELEASE SAVEPOINT ${label}`)
    return { label, passed: true, message: "Allowed lifecycle metadata mutation succeeded." }
  } catch (error) {
    await execute(tx, `ROLLBACK TO SAVEPOINT ${label}`)
    await execute(tx, `RELEASE SAVEPOINT ${label}`)
    return { label, passed: false, message: String(error.message ?? error).split(/\r?\n/)[0] }
  }
}

async function verifyTriggerCatalog(tx) {
  const rows = []
  for (const [tableName, triggerName] of REQUIRED_TRIGGERS) {
    const result = await query(
      tx,
      `SELECT t.tgname
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       WHERE c.relname = $1
         AND t.tgname = $2
         AND NOT t.tgisinternal
         AND t.tgenabled <> 'D'
       LIMIT 1`,
      tableName,
      triggerName,
    )
    rows.push({ tableName, triggerName, present: result.length > 0 })
  }
  return rows
}

async function seed(tx, id) {
  await execute(tx, `INSERT INTO "organizations" ("id","name","slug","countryCode","createdAt","updatedAt") VALUES ($1,'Payroll Immutability Runtime Test',$2,'CM',NOW(),NOW())`, id.org, id.org)
  await execute(tx, `INSERT INTO "payroll_employees" ("id","organizationId","employeeNumber","displayName","status","hireDate","paymentMethod","paymentDestinationHash","createdAt","updatedAt") VALUES ($1,$2,'PIRT-001','Payroll Runtime Test Employee','ACTIVE',NOW(),'BANK_TRANSFER','dest_hash_runtime_test',NOW(),NOW())`, id.employee, id.org)
  await execute(tx, `INSERT INTO "payroll_contracts" ("id","organizationId","employeeId","contractNumber","type","status","effectiveFrom","baseSalary","currency","createdAt","updatedAt") VALUES ($1,$2,$3,'PIRT-C-001','CDI','ACTIVE',NOW(),100000,'XAF',NOW(),NOW())`, id.contract, id.org, id.employee)
  await execute(tx, `INSERT INTO "payroll_periods" ("id","organizationId","name","frequency","periodStart","periodEnd","payDate","status","countryCode","createdAt","updatedAt") VALUES ($1,$2,'Runtime Immutability Period','MONTHLY',DATE '2026-06-01',DATE '2026-06-30',DATE '2026-06-30','OPEN','CM',NOW(),NOW())`, id.period, id.org)
  await execute(tx, `INSERT INTO "payroll_runs" ("id","organizationId","payrollPeriodId","runNumber","runType","status","countryCode","countryPackVersion","countryPackSchemaVersion","countryPackResolutionHash","countryPackCapabilityStatus","ruleSetHash","calculationHash","attendanceSnapshotHash","grossAmount","employeeDeductionAmount","employerChargeAmount","netPayableAmount","currency","createdAt","updatedAt") VALUES ($1,$2,$3,'PIRT-RUN-001','ORDINARY','DRAFT','CM','runtime-test','runtime-test','runtime-resolution-hash','SUPPORTED','runtime-rule-hash','runtime-calculation-hash','runtime-attendance-hash',100000,10000,5000,90000,'XAF',NOW(),NOW())`, id.run, id.org, id.period)
  await execute(tx, `INSERT INTO "payroll_run_lines" ("id","organizationId","payrollRunId","employeeId","contractId","grossAmount","taxableBaseAmount","socialBaseAmount","employeeDeductionAmount","employerChargeAmount","netPayableAmount","currency","calculationSnapshot","ruleProvenance","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,100000,100000,100000,10000,5000,90000,'XAF','{"source":"runtime-test"}'::jsonb,'{"source":"runtime-test"}'::jsonb,NOW(),NOW())`, id.runLine, id.org, id.run, id.employee, id.contract)
  await execute(tx, `INSERT INTO "payroll_payslips" ("id","organizationId","payrollRunId","runLineId","employeeId","payslipNumber","status","issuedAt","countryCode","countryPackVersion","countryPackSchemaVersion","countryPackResolutionHash","ruleSetHash","grossAmount","employeeDeductionAmount","employerChargeAmount","netPayableAmount","currency","documentHash","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,'PIRT-PS-001','DRAFT',NOW(),'CM','runtime-test','runtime-test','runtime-resolution-hash','runtime-rule-hash',100000,10000,5000,90000,'XAF','runtime-doc-hash',NOW(),NOW())`, id.payslip, id.org, id.run, id.runLine, id.employee)
  await execute(tx, `INSERT INTO "payroll_payslip_lines" ("id","organizationId","payslipId","lineNumber","code","label","category","amount","currency","createdAt") VALUES ($1,$2,$3,1,'BASE','Base salary','EARNING',100000,'XAF',NOW())`, id.payslipLine, id.org, id.payslip)
  await execute(tx, `INSERT INTO "payroll_payment_batches" ("id","organizationId","payrollRunId","batchNumber","status","method","amount","currency","paymentDate","requestedById","createdAt","updatedAt") VALUES ($1,$2,$3,'PIRT-PB-001','DRAFT','BANK_TRANSFER',90000,'XAF',DATE '2026-06-30','runtime-test',NOW(),NOW())`, id.batch, id.org, id.run)
  await execute(tx, `INSERT INTO "payroll_payment_allocations" ("id","organizationId","payrollPaymentBatchId","employeeId","payslipId","amount","currency","createdAt") VALUES ($1,$2,$3,$4,$5,90000,'XAF',NOW())`, id.allocation, id.org, id.batch, id.employee, id.payslip)
  await execute(tx, `INSERT INTO "payroll_declarations" ("id","organizationId","payrollRunId","authority","declarationType","status","periodStart","periodEnd","countryCode","countryPackVersion","countryPackSchemaVersion","countryPackResolutionHash","amount","currency","payloadHash","createdAt","updatedAt") VALUES ($1,$2,$3,'RUNTIME_TEST_AUTHORITY','PAYROLL_RUNTIME_TEST','PREPARED',DATE '2026-06-01',DATE '2026-06-30','CM','runtime-test','runtime-test','runtime-resolution-hash',15000,'XAF','runtime-payload-hash',NOW(),NOW())`, id.declaration, id.org, id.run)
  await execute(tx, `INSERT INTO "payroll_declaration_evidence" ("id","organizationId","declarationId","transition","previousStatus","nextStatus","authority","declarationType","authorityChannel","authorityStatus","evidenceCapturedById","evidenceHash","countryPackResolutionHash","idempotencyKey","createdAt") VALUES ($1,$2,$3,'SUBMIT','PREPARED','SUBMITTED','RUNTIME_TEST_AUTHORITY','PAYROLL_RUNTIME_TEST','MANUAL_PORTAL','SUBMITTED','runtime-actor','runtime-evidence-hash','runtime-resolution-hash','runtime-evidence-key',NOW())`, id.declarationEvidence, id.org, id.declaration)
  await execute(tx, `UPDATE "payroll_runs" SET "status"='POSTED',"updatedAt"=NOW() WHERE "id"=$1`, id.run)
  await execute(tx, `UPDATE "payroll_payslips" SET "status"='EMITTED',"updatedAt"=NOW() WHERE "id"=$1`, id.payslip)
  await execute(tx, `UPDATE "payroll_payment_batches" SET "status"='RELEASED',"updatedAt"=NOW() WHERE "id"=$1`, id.batch)
}

async function verifyMutations(tx, id) {
  const blocked = [
    await expectBlocked(tx, "block_run_update", `UPDATE "payroll_runs" SET "grossAmount"=100001 WHERE "id"=$1`, id.run),
    await expectBlocked(tx, "block_run_delete", `DELETE FROM "payroll_runs" WHERE "id"=$1`, id.run),
    await expectBlocked(tx, "block_run_line_update", `UPDATE "payroll_run_lines" SET "grossAmount"=100001 WHERE "id"=$1`, id.runLine),
    await expectBlocked(tx, "block_payslip_update", `UPDATE "payroll_payslips" SET "netPayableAmount"=89999 WHERE "id"=$1`, id.payslip),
    await expectBlocked(tx, "block_payslip_line_update", `UPDATE "payroll_payslip_lines" SET "amount"=99999 WHERE "id"=$1`, id.payslipLine),
    await expectBlocked(tx, "block_payment_batch_update", `UPDATE "payroll_payment_batches" SET "amount"=89999 WHERE "id"=$1`, id.batch),
    await expectBlocked(tx, "block_payment_batch_status_reversal", `UPDATE "payroll_payment_batches" SET "status"='DRAFT' WHERE "id"=$1`, id.batch),
    await expectBlocked(tx, "block_payment_allocation_update", `UPDATE "payroll_payment_allocations" SET "amount"=89999 WHERE "id"=$1`, id.allocation),
    await expectBlocked(tx, "block_declaration_update", `UPDATE "payroll_declarations" SET "amount"=15001 WHERE "id"=$1`, id.declaration),
    await expectBlocked(tx, "block_declaration_delete", `DELETE FROM "payroll_declarations" WHERE "id"=$1`, id.declaration),
    await expectBlocked(tx, "block_declaration_evidence_update", `UPDATE "payroll_declaration_evidence" SET "authorityStatus"='ACCEPTED' WHERE "id"=$1`, id.declarationEvidence),
    await expectBlocked(tx, "block_declaration_evidence_delete", `DELETE FROM "payroll_declaration_evidence" WHERE "id"=$1`, id.declarationEvidence),
  ]
  const allowed = [
    await expectAllowed(tx, "allow_run_metadata", `UPDATE "payroll_runs" SET "metadata"='{"runtimeCheck":true}'::jsonb WHERE "id"=$1`, id.run),
    await expectAllowed(tx, "allow_declaration_status", `UPDATE "payroll_declarations" SET "status"='SUBMITTED' WHERE "id"=$1`, id.declaration),
    await expectAllowed(tx, "allow_payment_reconciliation_status", `UPDATE "payroll_payment_batches" SET "status"='SETTLED',"reconciliationStatus"='RUNTIME_CHECKED_SETTLED' WHERE "id"=$1`, id.batch),
  ]
  return { blocked, allowed }
}

async function runRuntimeProof() {
  const { PrismaClient } = require("@prisma/client")
  const prisma = new PrismaClient()
  const id = ids()
  try {
    return await prisma.$transaction(async (tx) => {
      const triggers = await verifyTriggerCatalog(tx)
      await seed(tx, id)
      const mutations = await verifyMutations(tx, id)
      throw { rollbackOnly: true, triggers, mutations }
    }, { timeout: 30000, maxWait: 10000 })
  } catch (error) {
    if (error && error.rollbackOnly) return { triggers: error.triggers, mutations: error.mutations }
    throw error
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

function errorSummary(error) {
  if (!error) return ""
  const parts = []
  if (error.code) parts.push(error.code)
  if (error.name) parts.push(error.name)
  if (error.message) parts.push(error.message)
  if (error.meta) {
    try {
      parts.push(JSON.stringify(error.meta))
    } catch {
      parts.push(String(error.meta))
    }
  }
  if (parts.length === 0) parts.push(String(error))
  return parts.join(": ").split(/\r?\n/)[0]
}
function buildReport(args, safety, migration, runtime, error) {
  const triggers = runtime?.triggers ?? []
  const blockedChecks = runtime?.mutations?.blocked ?? []
  const allowedChecks = runtime?.mutations?.allowed ?? []
  const blockers = []
  if (migration && migration.exitCode !== 0) blockers.push({ area: "migration_deploy", detail: (migration.stderr || migration.stdout || migration.error || `exit ${migration.exitCode}`).trim().split(/\r?\n/)[0] })
  if (error) blockers.push({ area: "runtime_query", detail: errorSummary(error) })
  for (const trigger of triggers.filter((trigger) => !trigger.present)) blockers.push({ area: "missing_trigger", detail: `${trigger.tableName}.${trigger.triggerName}` })
  for (const check of blockedChecks.filter((check) => !check.passed)) blockers.push({ area: "mutation_not_blocked", detail: check.label })
  for (const check of allowedChecks.filter((check) => !check.passed)) blockers.push({ area: "allowed_metadata_blocked", detail: `${check.label}: ${check.message}` })

  return {
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    status: blockers.length === 0 ? "ready" : "blocked",
    safety: {
      dbName: safety.dbName,
      host: safety.host,
    },
    migration: migration ? { applied: args.applyMigrations, exitCode: migration.exitCode } : { applied: false, exitCode: null },
    summary: {
      presentTriggers: triggers.filter((trigger) => trigger.present).length,
      requiredTriggers: REQUIRED_TRIGGERS.length,
      blockedMutations: blockedChecks.filter((check) => check.passed).length,
      expectedBlockedMutations: blockedChecks.length,
      allowedLifecycleMutations: allowedChecks.filter((check) => check.passed).length,
      expectedAllowedLifecycleMutations: allowedChecks.length,
      blockerCount: blockers.length,
    },
    triggers,
    blockedChecks,
    allowedChecks,
    blockers,
  }
}

function render(report) {
  const lines = []
  lines.push("# Payroll Immutability Runtime Check")
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Mode: \`${report.mode}\``)
  lines.push(`Status: \`${report.status}\``)
  lines.push("")
  lines.push("## Safety")
  lines.push("")
  lines.push(`- Database: \`${report.safety.dbName}\``)
  lines.push(`- Host: \`${report.safety.host}\``)
  lines.push("- Secret URL values are not printed.")
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Required triggers present: ${report.summary.presentTriggers}/${report.summary.requiredTriggers}`)
  lines.push(`- Forbidden mutation checks blocked: ${report.summary.blockedMutations}/${report.summary.expectedBlockedMutations}`)
  lines.push(`- Allowed lifecycle checks passed: ${report.summary.allowedLifecycleMutations}/${report.summary.expectedAllowedLifecycleMutations}`)
  lines.push(`- Blockers: ${report.summary.blockerCount}`)
  lines.push("")
  lines.push("## Trigger Catalog")
  lines.push("")
  for (const trigger of report.triggers) lines.push(`- ${trigger.present ? "present" : "missing"}: ${trigger.tableName}.${trigger.triggerName}`)
  lines.push("")
  lines.push("## Forbidden Mutation Checks")
  lines.push("")
  for (const check of report.blockedChecks) lines.push(`- ${check.passed ? "blocked" : "not blocked"}: ${check.label} - ${check.message}`)
  lines.push("")
  lines.push("## Allowed Lifecycle Checks")
  lines.push("")
  for (const check of report.allowedChecks) lines.push(`- ${check.passed ? "allowed" : "blocked"}: ${check.label} - ${check.message}`)
  lines.push("")
  lines.push("## Blockers")
  lines.push("")
  if (report.blockers.length === 0) lines.push("No payroll immutability runtime blockers detected.")
  else for (const blocker of report.blockers) lines.push(`- ${blocker.area}: ${blocker.detail}`)
  lines.push("")
  lines.push("## Safety Notes")
  lines.push("")
  lines.push("- Requires a dedicated non-production DB URL.")
  lines.push("- Applies Prisma migrations to the selected DB unless `--skip-migrate` is supplied.")
  lines.push("- Creates synthetic payroll rows inside a transaction that is deliberately rolled back.")
  return lines.join(os.EOL)
}

function exitCodeForReport(args, report) {
  return args.mode === "fail" && report.summary.blockerCount > 0 ? 1 : 0
}

function writeOutputs(report, args) {
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true })
    fs.writeFileSync(args.out, `${render(report)}${os.EOL}`, "utf8")
  }
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}${os.EOL}`, "utf8")
  }
}

async function main(argv = process.argv) {
  const args = parseArgs(argv)
  const safety = safeDatabase()
  process.env.DATABASE_URL = safety.urlValue
  let migration = null
  if (args.applyMigrations) {
    migration = runMigrateDeploy(safety.urlValue)
    if (migration.exitCode !== 0) {
      const report = buildReport(args, safety, migration, null, null)
      writeOutputs(report, args)
      console.log(render(report))
      return exitCodeForReport(args, report)
    }
  }

  let runtime = null
  let error = null
  try {
    runtime = await runRuntimeProof()
  } catch (caught) {
    error = caught
  }
  const report = buildReport(args, safety, migration, runtime, error)
  writeOutputs(report, args)
  console.log(render(report))
  return exitCodeForReport(args, report)
}

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code
  }).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = { REQUIRED_TRIGGERS, parseArgs, safeDatabase, buildReport, exitCodeForReport }

