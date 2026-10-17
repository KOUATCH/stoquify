const fs = require("fs"), path = require("path"), crypto = require("crypto")
const { Client } = require("pg"), { parse } = require("pg-connection-string"), dotenv = require("dotenv")
for (const file of [".env.local", ".env"]) if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true })
const hash = value => crypto.createHash("sha256").update(value).digest("hex")
const databaseName = "stoquify_restore_local_remediation_20260930_run01"
const save = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + "\n")
const execution = { startedAt: new Date().toISOString(), status: "NOT_STARTED", target: databaseName, sourceMutationAttempted: false,
  command: "node what-next/platform-remediation/2026-09-30-run-01/data-impact/restore/classify-and-certify-restored.cjs" }
const queries = {
  lineClassification: `SELECT COALESCE(j."sourceType"::text, 'UNCLASSIFIED') AS source_type,
    UPPER(TRIM(l.currency)) AS currency, l."exchangeRate" IS NOT NULL AS rate_present,
    l."exchangeRate" > 0 AS rate_positive, l."exchangeRate" = 1 AS rate_is_one,
    UPPER(TRIM(l.currency)) = UPPER(TRIM(s."baseCurrency")) AS denomination_matches_current_settings,
    COUNT(*)::text AS posted_or_reversed_lines, COUNT(DISTINCT j.id)::text AS journal_entry_denominator,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NULL OR l."baseCredit" IS NULL)::text AS missing_base_lines,
    COUNT(DISTINCT j.id) FILTER (WHERE l."baseDebit" IS NULL OR l."baseCredit" IS NULL)::text AS entries_with_missing_base,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NOT NULL AND l."baseCredit" IS NOT NULL)::text AS complete_base_lines,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NOT NULL AND l."baseCredit" IS NOT NULL AND
      (l."baseDebit" <> ROUND(l.debit * l."exchangeRate",2) OR l."baseCredit" <> ROUND(l.credit * l."exchangeRate",2)))::text AS conversion_candidates
    FROM public.journal_entry_lines l JOIN public.journal_entries j ON j.id=l."journalEntryId"
    LEFT JOIN public.organization_accounting_settings s ON s."organizationId"=j."organizationId"
    WHERE j.status::text IN ('POSTED','REVERSED')
    GROUP BY j."sourceType", UPPER(TRIM(l.currency)), l."exchangeRate" IS NOT NULL, l."exchangeRate">0, l."exchangeRate"=1,
      UPPER(TRIM(l.currency))=UPPER(TRIM(s."baseCurrency")) ORDER BY 1,2,3,4,5,6`,
  periodClassification: `WITH line_facts AS (SELECT "journalEntryId", BOOL_AND("exchangeRate" IS NOT NULL) AS rates_present,
      BOOL_AND("exchangeRate">0) AS rates_positive, BOOL_AND("exchangeRate"=1) AS all_rates_one
      FROM public.journal_entry_lines GROUP BY "journalEntryId")
    SELECT COALESCE(j."sourceType"::text,'UNCLASSIFIED') AS source_type, UPPER(TRIM(j.currency)) AS currency,
      l.rates_present,l.rates_positive,l.all_rates_one,
      UPPER(TRIM(j.currency))=UPPER(TRIM(s."baseCurrency")) AS denomination_matches_current_settings,
      COUNT(*)::text AS posted_or_reversed_entry_denominator,
      COUNT(*) FILTER(WHERE j."entryDate"<p."startDate")::text AS before_period_start,
      COUNT(*) FILTER(WHERE j."entryDate">p."endDate")::text AS after_period_end,
      COUNT(*) FILTER(WHERE j."entryDate">p."endDate" AND j."entryDate"::date=p."endDate"::date)::text AS after_end_same_calendar_date
    FROM public.journal_entries j JOIN public.accounting_periods p ON p.id=j."periodId"
    LEFT JOIN line_facts l ON l."journalEntryId"=j.id
    LEFT JOIN public.organization_accounting_settings s ON s."organizationId"=j."organizationId"
    WHERE j.status::text IN ('POSTED','REVERSED') GROUP BY j."sourceType", UPPER(TRIM(j.currency)), l.rates_present,l.rates_positive,l.all_rates_one,
      UPPER(TRIM(j.currency))=UPPER(TRIM(s."baseCurrency")) ORDER BY 1,2,3,4,5,6`,
}
const fixtureCountsSql = `SELECT
  (SELECT COUNT(*)::text FROM organizations WHERE id LIKE 'trust_cert_org_%') AS synthetic_organizations,
  (SELECT COUNT(*)::text FROM payroll_periods WHERE id LIKE 'trust_cert_period_%') AS synthetic_periods,
  (SELECT COUNT(*)::text FROM payroll_runs WHERE id LIKE 'trust_cert_run_%') AS synthetic_runs,
  (SELECT COUNT(*)::text FROM payroll_run_transitions WHERE "payrollRunId" LIKE 'trust_cert_run_%') AS synthetic_transitions,
  (SELECT COUNT(*)::text FROM organizations WHERE id NOT LIKE 'trust_cert_org_%') AS nonfixture_organizations,
  (SELECT COUNT(*)::text FROM payroll_runs WHERE id NOT LIKE 'trust_cert_run_%') AS nonfixture_payroll_runs,
  (SELECT COUNT(*)::text FROM journal_entries) AS journal_entries`

async function readOnlyTarget(target, work) {
  const client = new Client({ ...parse(target), connectionTimeoutMillis: 12000, query_timeout: 18000,
    options: "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=2000" })
  await client.connect()
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const session = (await client.query("SELECT current_database() AS database_name, transaction_timestamp() AS as_of, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation, current_setting('TimeZone') AS timezone")).rows[0]
    if (session.database_name !== databaseName || session.read_only !== "on" || session.isolation !== "repeatable read") throw new Error("ACTUAL_DATABASE_GUARD_FAILED")
    return await work(client, session)
  } finally { await client.query("ROLLBACK").catch(() => {}); await client.end() }
}

async function run() {
  try {
    const restored = JSON.parse(fs.readFileSync(path.join(__dirname,"execution.json"),"utf8"))
    if (restored.status !== "RESTORE_REHEARSAL_READY" || !restored.databaseCreatedByThisRun || !restored.databaseRetained || restored.databaseName !== databaseName) throw new Error("VERIFIED_OWN_RESTORE_REQUIRED")
    const source = (process.env.DATABASE_URL || process.env.DIRECT_URL || "").replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,(_,key)=>process.env[key]||"").replace(/^['"]|['"]$/g,"").trim()
    const parsed = parse(source), url = new URL(source)
    const normalized = host => String(host||"").toLowerCase().replace(/^\[|\]$/g,"")
    const local = host => ["localhost","127.0.0.1","::1"].includes(normalized(host))
    if (!local(url.hostname) || !local(parsed.host) || hash(`${normalized(parsed.host)}:${parsed.port||"5432"}/${parsed.database||""}`)!==restored.sourceFingerprint) throw new Error("SOURCE_CONFIGURATION_GUARD_FAILED")
    url.pathname = `/${databaseName}`
    url.searchParams.set("options", "-c default_transaction_read_only=off -c statement_timeout=30000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000")
    const target = url.toString(), effective = parse(target)
    if (effective.database !== databaseName || !local(effective.host)) throw new Error("EFFECTIVE_TARGET_GUARD_FAILED")
    const classification = { capturedAt:new Date().toISOString(), source:"verified retained restored local copy", target:databaseName,
      schemaSha256:hash(fs.readFileSync("prisma/schema.prisma")), checks:[], recordIdentifiersEmitted:false }
    await readOnlyTarget(target, async (client, session) => {
      classification.snapshot = session
      for (const [name,sql] of Object.entries(queries)) {
        await client.query("SAVEPOINT classification_check")
        try { classification.checks.push({name,status:"EXECUTED",sql,rows:(await client.query(sql)).rows}) }
        catch(error) { await client.query("ROLLBACK TO SAVEPOINT classification_check"); classification.checks.push({name,status:"FAILED",errorCode:error.code}) }
        await client.query("RELEASE SAVEPOINT classification_check")
      }
      execution.fixtureCountsBefore = (await client.query(fixtureCountsSql)).rows[0]
    })
    save("candidate-classification.json",classification)
    if(classification.checks.some(check=>check.status!=="EXECUTED")) throw new Error("CLASSIFICATION_INCOMPLETE")
    const modulePath = path.join(process.cwd(),"scripts/payroll-trust-spine-postgres-certification.js")
    execution.certificateModuleSha256 = hash(fs.readFileSync(modulePath))
    const certificate = require(modulePath)
    const previous = process.env.PAYROLL_IMMUTABILITY_DATABASE_URL
    let checks
    try {
      // Explicit dedicated target; the certificate's TEST_DATABASE_URL fallback is never used.
      process.env.PAYROLL_IMMUTABILITY_DATABASE_URL = target
      const safety = certificate.safeDatabase(process.env)
      if (safety.database !== databaseName || !local(safety.host)) throw new Error("CERTIFICATE_TARGET_GUARD_FAILED")
      const started = Date.now()
      checks = await certificate.runCertification(safety)
      execution.certificateElapsedMs = Date.now()-started
    } finally {
      if (previous === undefined) delete process.env.PAYROLL_IMMUTABILITY_DATABASE_URL
      else process.env.PAYROLL_IMMUTABILITY_DATABASE_URL = previous
    }
    await readOnlyTarget(target,async client=>{ execution.fixtureCountsAfter = (await client.query(fixtureCountsSql)).rows[0] })
    const report = { generatedAt:new Date().toISOString(), ready:checks.every(check=>check.passed),
      target:{database:databaseName,scope:"ISOLATED_LOCAL_RESTORED_COPY"}, checks,
      scope:"SQL concurrency/rollback evidence; not application workflow, payroll calculation, country qualification or production certification.",
      fixtureLifecycle:"Synthetic trust_cert_* seed and winning transaction evidence are retained on this disposable clone. Failed/duplicate transactions were rolled back. Existing restored rows were not targeted. No source writes or reset/prepare wrappers.",
      fixtureCountsBefore:execution.fixtureCountsBefore,fixtureCountsAfter:execution.fixtureCountsAfter }
    save("payroll-trust-spine-postgres.json",report)
    fs.writeFileSync(path.join(__dirname,"payroll-trust-spine-postgres.md"),[
      "# Payroll trust spine — restored local PostgreSQL evidence","",`Result: ${report.ready?"PASS":"BLOCKED"}`,
      `Target: ${databaseName}`,"",...checks.map(check=>`- ${check.passed?"PASS":"FAIL"}: ${check.name}`),"",report.scope,"",report.fixtureLifecycle,"",
    ].join("\n"))
    execution.status = report.ready?"CLASSIFICATION_AND_PAYROLL_PROOF_COMPLETE":"PAYROLL_PROOF_BLOCKED"
    if(!report.ready) process.exitCode=1
    console.log(JSON.stringify({status:execution.status, classification:classification.checks.map(({name,rows})=>({name,rows})), checks,fixtureCountsBefore:execution.fixtureCountsBefore,fixtureCountsAfter:execution.fixtureCountsAfter},null,2))
  } catch(error) {
    execution.status="BLOCKED"
    execution.errorCode=/^[A-Z0-9_]+$/.test(error.message||"")?error.message:error.code||"GUARDED_STAGE_FAILED"
    process.exitCode=1
    console.log(JSON.stringify({status:execution.status,errorCode:execution.errorCode}))
  } finally { execution.completedAt=new Date().toISOString(); save("classification-and-payroll-execution.json",execution) }
}
run().catch(()=>{process.exitCode=1})
